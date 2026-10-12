import { z } from 'zod';
import { defineDocType } from './doc-type';
import type { OutputPart } from './output';
import type { OpLog, Operation } from './oplog';
import type { CallStats } from './stats';

export interface Message {
  readonly id: string;
  readonly actorId: string;
  readonly parts: readonly OutputPart[];
  /** Present when producing the message involved AI calls. */
  readonly stats?: readonly CallStats[];
  readonly createdAt: number;
}

export type TranscriptOp =
  | { readonly type: 'append'; readonly message: Message }
  | { readonly type: 'edit'; readonly messageId: string; readonly parts: readonly OutputPart[] };

export interface Transcript {
  readonly messages: readonly Message[];
}

const part = z.object({ kind: z.string(), data: z.unknown() });
const stats = z.object({
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  costUsd: z.number().optional(),
});

/**
 * The conversation as a shared document. Branching, rewinding and editing all
 * happen in the operation log, so the transcript moves together with every
 * other document of the session.
 */
export const transcriptDoc = defineDocType<Transcript, TranscriptOp>({
  id: 'transcript',
  version: 1,
  description: 'Messages in the order they were posted.',
  op: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('append'),
      message: z.object({
        id: z.string(),
        actorId: z.string(),
        parts: z.array(part),
        stats: z.array(stats).optional(),
        createdAt: z.number(),
      }),
    }),
    z.object({ type: z.literal('edit'), messageId: z.string(), parts: z.array(part) }),
  ]),
  initial: () => ({ messages: [] }),
  apply: (state, op) => {
    if (op.type === 'append') {
      if (state.messages.some((m) => m.id === op.message.id)) return state;
      return { messages: [...state.messages, op.message] };
    }
    if (!state.messages.some((m) => m.id === op.messageId)) return state;
    return {
      messages: state.messages.map((m) => (m.id === op.messageId ? { ...m, parts: op.parts } : m)),
    };
  },
});

/** The document id of a session's main transcript. */
export const MAIN_TRANSCRIPT = 'transcript';

const isAppendOf = (op: Operation, messageId: string) =>
  op.docId === MAIN_TRANSCRIPT &&
  (op.payload as TranscriptOp).type === 'append' &&
  (op.payload as Extract<TranscriptOp, { type: 'append' }>).message.id === messageId;

/** The operation on the current path that posted a message. */
export function postingOperation(log: OpLog, messageId: string): Operation {
  const op = log.path().find((o) => isAppendOf(o, messageId));
  if (!op) throw new Error(`Message "${messageId}" is not on the current path`);
  return op;
}
