import { z } from 'zod';
import type { DocType } from './doc-type';
import type { Operation } from './oplog';
import type { CallStats } from './stats';
import { callStatsSchema } from './stats';

/** Everything needed to bring a session back: the whole log and what it cost. */
export interface SavedSession {
  readonly format: 'virtuocity.session';
  readonly formatVersion: 1;
  readonly savedAt: number;
  readonly head: string | null;
  /** Every operation on every branch. */
  readonly operations: readonly Operation[];
  readonly spent: readonly CallStats[];
}

const operation = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  docId: z.string(),
  docType: z.string(),
  docVersion: z.number().int(),
  actorId: z.string(),
  payload: z.unknown(),
  audience: z.array(z.string()).optional(),
  at: z.number(),
});

const savedSession = z.object({
  format: z.literal('virtuocity.session'),
  formatVersion: z.literal(1),
  savedAt: z.number(),
  head: z.string().nullable(),
  operations: z.array(operation),
  spent: z.array(callStatsSchema),
});

/** Checks the shape of untrusted saved data (a file, storage) before it is used. */
export function parseSavedSession(data: unknown): SavedSession {
  const result = savedSession.safeParse(data);
  if (!result.success) throw new Error(`Not a Virtuocity session: ${result.error.message}`);
  return result.data as SavedSession;
}

/**
 * Brings operations saved by older document type versions up to date and
 * validates them. Operations of document types that are not installed are
 * kept untouched, so reinstalling the module brings their documents back.
 */
export function migrateOperations(
  operations: readonly Operation[],
  docTypes: (id: string) => DocType | undefined,
): Operation[] {
  return operations.map((op) => {
    const type = docTypes(op.docType);
    if (!type || op.docVersion === type.version) return op;
    if (op.docVersion > type.version) {
      throw new Error(
        `This session uses "${op.docType}" version ${op.docVersion}, but only version ${type.version} is installed`,
      );
    }
    if (!type.migrate) {
      throw new Error(`"${op.docType}" cannot upgrade operations from version ${op.docVersion}`);
    }
    const payload = type.migrate(op.payload, op.docVersion);
    const parsed = type.op.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Migrated "${op.docType}" operation is invalid: ${parsed.error.message}`);
    }
    return { ...op, payload, docVersion: type.version };
  });
}
