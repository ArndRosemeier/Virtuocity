import { directorContract } from '@virtuocity/contract-director';
import type { Actor, DecisionRequest, Message, ModelProvider } from '@virtuocity/core';
import { conformanceSuite, conformanceTarget } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { decisionDirectorSkill, directorSkill, leastRecent, nextQuestion } from './index';

const asked: DecisionRequest[] = [];
/** A decision model that picks the option named `pick`, or the first one. */
const decider = (pick: string): ModelProvider => ({
  id: 'fake',
  name: 'Fake',
  ready: () => true,
  complete: () => Promise.reject(new Error('not a chat model')),
  decide: (request) => {
    asked.push(request);
    const options = Object.keys(request.questions.next?.criteria ?? {});
    const choice = options.includes(pick) ? pick : (options[0] ?? '');
    return Promise.resolve({
      answers: { next: { type: 'choice', choice } },
      stats: { model: request.model, promptTokens: 1, completionTokens: 0 },
    });
  },
});
const modelDefaults = { decisions: 'jev' };

describe('director skills conform to director', () => {
  const targets = {
    director: conformanceTarget(directorContract, { skills: [directorSkill] }),
    'decision director': conformanceTarget(directorContract, {
      skills: [decisionDirectorSkill],
      provider: decider('Mira'),
      modelDefaults,
    }),
  };
  for (const [name, target] of Object.entries(targets)) {
    for (const testCase of conformanceSuite(directorContract)) {
      it(`${name}: ${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
    }
  }
});

const said = (actorId: string, i: number): Message => ({
  id: `m${i}`,
  actorId,
  kind: 'text',
  data: 'Hi',
  text: 'Hi',
  createdAt: i,
});
const you = { id: 'you', name: 'You', person: true };
const mira = { id: 'mira', name: 'Mira', person: false };
const tobin = { id: 'tobin', name: 'Tobin', person: false };

describe('director (code)', () => {
  it('lets the AI who spoke least recently go next, one who never spoke first', () => {
    expect(leastRecent([you, mira, tobin], [said('mira', 0), said('you', 1)])?.id).toBe('tobin');
    const all = [said('tobin', 0), said('mira', 1), said('you', 2)];
    expect(leastRecent([you, mira, tobin], all)?.id).toBe('tobin');
  });

  it('hands the turn to a person when no AI is in the cast', () => {
    expect(leastRecent([you], [said('you', 0)])?.id).toBe('you');
  });
});

describe('director (decision model)', () => {
  it('asks the decisions model, by name, with the session as state', async () => {
    const target = conformanceTarget(directorContract, {
      skills: [decisionDirectorSkill],
      provider: decider('Tobin'),
      modelDefaults,
    });
    asked.length = 0;
    expect(await target.invoke('next', { candidates: [you, mira, tobin] })).toEqual({
      next: 'tobin',
    });
    expect(asked[0]?.model).toBe('jev');
    expect(Object.keys(asked[0]?.questions.next?.criteria ?? {})).toEqual(['You', 'Mira', 'Tobin']);
  });

  it('puts how the actor directs into the question, and says who is a person', () => {
    const director: Actor = {
      id: 'd',
      controller: 'ai',
      personality: { name: 'Director', description: 'Keep the narrator at the centre.' },
      skillIds: ['decision-director'],
    };
    const question = nextQuestion(director, [you, mira], []);
    expect(question.instructions).toContain('Keep the narrator at the centre.');
    expect(question.type === 'choice' && question.criteria.You).toMatch(/A person/);
  });

  it('uses ids as options when two candidates share a name', () => {
    const twin = { ...mira, id: 'mira-2' };
    const question = nextQuestion(
      { id: 'd', controller: 'ai', personality: { name: 'D', description: '' }, skillIds: [] },
      [mira, twin],
      [],
    );
    expect(question.type === 'choice' && Object.keys(question.criteria)).toEqual([
      'mira',
      'mira-2',
    ]);
  });
});
