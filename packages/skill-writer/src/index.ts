import { writerContract } from '@virtuocity/contract-writing';
import type { Actor, ChatMessage, Skill, VirtuocityModule } from '@virtuocity/core';
import { implement } from '@virtuocity/core';

export interface WriteRequest {
  readonly brief: string;
  readonly context?: string | undefined;
  readonly previousDraft?: string | undefined;
  readonly notes?: readonly string[] | undefined;
}

/** The writer's instructions, in the writer actor's own voice. */
export function writePrompt(actor: Actor, request: WriteRequest): ChatMessage[] {
  const system = [
    `You are ${actor.personality.name}, a writer.`,
    actor.personality.description,
    'Write only the requested prose: no title, no commentary, no notes to the reader.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const parts = [
    request.context && `Context:\n${request.context}`,
    `Brief:\n${request.brief}`,
    request.previousDraft && `Your previous draft:\n"""\n${request.previousDraft}\n"""`,
    request.notes?.length && `Revise it to address these notes:\n- ${request.notes.join('\n- ')}`,
  ];
  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.filter(Boolean).join('\n\n') },
  ];
}

/** LLM-backed prose writer implementing `writer@1`. */
export const writerSkill: Skill = {
  id: 'writer',
  name: 'Writer',
  backing: 'llm',
  implements: [
    implement(writerContract, {
      write: async (input, ctx) => {
        const result = await ctx.complete({
          modality: 'text',
          messages: writePrompt(ctx.actor, input),
        });
        return { text: result.text.trim() };
      },
    }),
  ],
};

export const writerModule: VirtuocityModule = {
  id: 'skill-writer',
  register: (host) => {
    host.contracts.register(writerContract);
    host.skills.register(writerSkill);
  },
};
