import { directorContract } from '@virtuocity/contract-director';
import type { Actor, ChatMessage } from '@virtuocity/core';
import { conformanceSuite, conformanceTarget, scriptedProvider } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { directorPrompt, directorSkill } from './index';

describe('director skill conforms to director', () => {
  const provider = scriptedProvider(() => '```json\n{"next": "Mira"}\n```');
  const target = conformanceTarget(directorContract, { skills: [directorSkill], provider });
  for (const testCase of conformanceSuite(directorContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('director skill', () => {
  it('asks again when the model names someone who is not a candidate', async () => {
    const asked: (readonly ChatMessage[])[] = [];
    const replies = ['{"next": "Gandalf"}', '{"next": "Tobin"}'];
    const provider = scriptedProvider((request) => {
      asked.push(request.messages);
      return replies[asked.length - 1] ?? '';
    });
    const target = conformanceTarget(directorContract, { skills: [directorSkill], provider });
    const candidates = [
      { id: 'you', name: 'You', person: true },
      { id: 't', name: 'Tobin', person: false },
    ];
    expect(await target.invoke('next', { candidates })).toEqual({ next: 't' });
    expect(asked).toHaveLength(2);
  });

  it('shows the candidates, which of them are people, and the session so far', () => {
    const director: Actor = {
      id: 'd',
      controller: 'ai',
      personality: { name: 'Director', description: 'Keep the narrator at the centre.' },
      skillIds: ['director'],
    };
    const bard: Actor = { ...director, id: 'bard', personality: { name: 'Bard', description: '' } };
    const said = {
      id: 'm',
      actorId: 'bard',
      kind: 'text',
      data: 'Hello',
      text: 'Hello',
      createdAt: 0,
    };
    const [system, user] = directorPrompt(
      director,
      [
        { id: 'you', name: 'You', person: true },
        { id: 'bard', name: 'Bard', person: false },
      ],
      { transcript: [said], actors: [director, bard] },
    );
    expect(system?.content).toContain('Keep the narrator at the centre.');
    expect(system?.content).toContain('- You (a person)\n- Bard');
    expect(user?.content).toContain('Bard: Hello');
  });
});
