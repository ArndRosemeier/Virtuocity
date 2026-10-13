import { z } from 'zod';
import { defineDocType } from './doc-type';
import type { Content } from './output';
import { contentSchema } from './output';
import type { OpLog, Operation } from './oplog';
import type { CallStats } from './stats';
import { callStatsSchema } from './stats';
import { migrateTranscriptOp } from './transcript-migrate';

/**
 * One message of the story. It can hold anything (text, a picture, a tool
 * call, a dice roll) but always has a string representation in `text`.
 */
export interface Message extends Content {
  readonly id: string;
  readonly actorId: string;
  /** Present when producing the message involved AI calls. */
  readonly stats?: readonly CallStats[];
  readonly createdAt: number;
}

export type TranscriptOp =
  | { readonly type: 'append'; readonly message: Message }
  | { readonly type: 'edit'; readonly messageId: string; readonly content: Content }
  | { readonly type: 'remove'; readonly messageId: string };

export interface Transcript {
  readonly messages: readonly Message[];
}

/** Validates a message, e.g. when a contract takes the story as input. */
export const messageSchema = contentSchema.extend({
  id: z.string(),
  actorId: z.string(),
  stats: z.array(callStatsSchema).readonly().optional(),
  createdAt: z.number(),
});

/**
 * The conversation as a shared document: a collection of messages. Branching
 * and rewinding happen in the operation log, so the transcript moves together
 * with every other document of the session. A message lives in exactly one
 * place, the operation that posted it: editing rewrites that operation and
 * deleting takes it out, so rewinding (e.g. a retry) never brings an old
 * version back.
 */
export const transcriptDoc = defineDocType<Transcript, TranscriptOp>({
  id: 'transcript',
  version: 2,
  description: 'Messages in the order they were posted.',
  op: z.discriminatedUnion('type', [
    z.object({ type: z.literal('append'), message: messageSchema }),
    z.object({ type: z.literal('edit'), messageId: z.string(), content: contentSchema }),
    z.object({ type: z.literal('remove'), messageId: z.string() }),
  ]),
  initial: () => ({ messages: [] }),
  apply: (state, op) => {
    if (op.type === 'append') {
      if (state.messages.some((m) => m.id === op.message.id)) return state;
      return { messages: [...state.messages, op.message] };
    }
    if (!state.messages.some((m) => m.id === op.messageId)) return state;
    if (op.type === 'remove')
      return { messages: state.messages.filter((m) => m.id !== op.messageId) };
    const { kind, data, text } = op.content;
    return {
      messages: state.messages.map((m) => (m.id === op.messageId ? { ...m, kind, data, text } : m)),
    };
  },
  migrate: migrateTranscriptOp,
  amends: (op) => {
    if (op.type === 'append') return undefined;
    return {
      targets: (earlier) => earlier.type === 'append' && earlier.message.id === op.messageId,
      rewrite: (earlier) => {
        if (op.type === 'remove' || earlier.type !== 'append') return null;
        const { kind, data, text } = op.content;
        return { type: 'append', message: { ...earlier.message, kind, data, text } };
      },
    };
  },
});

/** The document id of a session's main transcript. */
export const MAIN_TRANSCRIPT = 'transcript';

const isAppendOf = (op: Operation, messageId: string) =>
  op.docId === MAIN_TRANSCRIPT &&
  (op.payload as TranscriptOp).type === 'append' &&
  (op.payload as Extract<TranscriptOp, { type: 'append' }>).message.id === messageId;

/** The operation on the current path that posted a message, if it is on the path. */
export function findPostingOperation(log: OpLog, messageId: string): Operation | undefined {
  return log.path().find((o) => isAppendOf(o, messageId));
}

/** The operation on the current path that posted a message. */
export function postingOperation(log: OpLog, messageId: string): Operation {
  const op = findPostingOperation(log, messageId);
  if (!op) throw new Error(`Message "${messageId}" is not on the current path`);
  return op;
}
