import { z } from 'zod';
import type { Actor } from './actor';
import { action, defineContract } from './contract';
import { check } from './conformance-check';
import type { ChatMessage } from './provider';
import type { Skill } from './skill';
import { serves } from './skill';

/**
 * Standing instructions for every text-model call of every actor, e.g. a
 * system prompt the person wrote. Unlike context contributors, which skills
 * ask for, these are added by the runtime, so no skill has to opt in. Every AI
 * actor serving it is asked before each text call, so it must answer quickly.
 * Calls made by a skill serving it get no instructions, so no source is ever
 * asked on behalf of itself.
 */
export const instructionsContract = defineContract({
  name: 'instructions',
  version: '1.0',
  description: 'Gives standing instructions to every text-model call in the session.',
  actions: {
    instructions: action({
      description: 'The instructions for a text-model call made for an actor; empty for none.',
      input: z.object({ actorId: z.string().describe('The actor the call is made for') }),
      output: z.object({ text: z.string().describe('The instructions, as plain text') }),
    }),
  },
  conformance: [
    {
      name: 'gives the same instructions when asked twice',
      run: async (t) => {
        const first = await t.invoke('instructions', { actorId: 'someone' });
        const second = await t.invoke('instructions', { actorId: 'someone' });
        check(first.text === second.text, 'the instructions changed between two calls');
      },
    },
  ],
});

/**
 * The instructions of every AI actor serving `instructions@1`, in cast order,
 * each asked through `ask`.
 */
export async function standingInstructions(
  actors: readonly Actor[],
  skills: readonly Skill[],
  ask: (sourceId: string) => Promise<{ readonly text: string }>,
): Promise<string[]> {
  const sources = actors.filter(
    (a) => a.controller === 'ai' && serves(a, skills, instructionsContract),
  );
  const answers = await Promise.all(sources.map((a) => ask(a.id)));
  return answers.map((a) => a.text);
}

/** Puts instructions ahead of the call's own system prompt, combined in order. */
export function withInstructions(
  messages: readonly ChatMessage[],
  instructions: readonly string[],
): readonly ChatMessage[] {
  const text = instructions
    .map((i) => i.trim())
    .filter(Boolean)
    .join('\n\n');
  if (!text) return messages;
  const [first, ...rest] = messages;
  if (first?.role === 'system') {
    return [{ role: 'system', content: `${text}\n\n${first.content}` }, ...rest];
  }
  return [{ role: 'system', content: text }, ...messages];
}
