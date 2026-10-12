import { textContent } from '@virtuocity/core';
import { summarizerContract } from '@virtuocity/contract-memory';
import type { CompletionRequest, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  jobEnded,
  loadModules,
  scriptedProvider,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { chroniclerModule, differentialChroniclerSkill, fullChroniclerSkill } from './index';
import { chronicles } from './memory';

const summaryReply = (request: CompletionRequest) =>
  request.messages.at(-1)?.content.includes('The summary so far') ? 'Updated.' : 'From scratch.';

for (const skill of [differentialChroniclerSkill, fullChroniclerSkill]) {
  describe(`${skill.name} conforms to summarizer`, () => {
    const provider = scriptedProvider(summaryReply);
    const target = conformanceTarget(summarizerContract, { skills: [skill], provider });
    for (const testCase of conformanceSuite(summarizerContract)) {
      it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
    }
  });
}

/** Posts a long paragraph each turn and remembers what it was told it knows. */
function narrator(known: string[]): Skill {
  return {
    id: 'narrator',
    name: 'Narrator',
    backing: 'code',
    takeTurn: async (ctx) => {
      known.push(ctx.context(1000).text);
      await ctx.post(textContent('The rain keeps falling on the inn. '.repeat(30)));
    },
  };
}

async function play(skillId: string, turns: number) {
  const known: string[] = [];
  const host = loadModules(new ModuleHost(), [coreModule, chroniclerModule]);
  host.skills.register(narrator(known));
  host.providers.register(scriptedProvider(summaryReply));
  const runtime = new SessionRuntime({
    host,
    providerId: 'scripted',
    directorId: 'least-recent',
    modelDefaults: () => ({ text: 'text-model' }),
  });
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('narrator', ['narrator']));
  const settings = { [skillId]: { keepRecent: 500, updateAfter: 200 } };
  await runtime.join({ ...actor('chronicler', [skillId]), settings });
  for (let i = 0; i < turns; i++) {
    const ended = new Promise((resolve) => runtime.bus.on(jobEnded, resolve));
    await runtime.runTurn('narrator');
    if (i > 0) await ended;
  }
  const memory = chronicles(runtime.workspace.view('narrator'));
  const prompts = runtime.calls.list().map((c) => c.request.messages.at(-1)?.content ?? '');
  return { runtime, known, memory, prompts };
}

describe('chronicling a story', () => {
  it('summarizes older story in the background and never shortens the story', async () => {
    const { runtime, known, memory } = await play('differential-chronicler', 4);
    expect(runtime.transcript()).toHaveLength(4);
    expect(memory.chronicler?.summary).toBe('Updated.');
    expect(memory.chronicler?.upTo).toBe(runtime.transcript()[2]?.id);
    expect(known.at(-1)).toContain('The story so far');
  });

  it('folds new story into the last summary when differential', async () => {
    const { prompts } = await play('differential-chronicler', 4);
    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toContain('The story so far:');
    expect(prompts[1]).toContain('The summary so far:\n"""\nFrom scratch.');
  });

  it('re-reads the whole story when full', async () => {
    const { prompts, memory } = await play('full-chronicler', 4);
    expect(prompts.every((p) => p.startsWith('The story so far:'))).toBe(true);
    expect(memory.chronicler?.summary).toBe('From scratch.');
  });
});
