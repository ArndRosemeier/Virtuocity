import type { Actor } from './actor';
import type { ChatMessage } from './provider';
import type { Identified } from './registry';

/** Who a model call is for. */
export interface InstructionRequest {
  readonly actor: Actor;
  readonly actors: readonly Actor[];
  readonly cast: readonly Actor[];
}

/**
 * Standing instructions for every text-model call of every actor, e.g. a
 * system prompt the person wrote. Unlike context contributors, which skills
 * ask for, these are added by the runtime, so no skill has to opt in.
 */
export interface InstructionSource extends Identified {
  instructions(request: InstructionRequest): readonly string[];
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
