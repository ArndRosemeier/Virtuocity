import type { z } from 'zod';
import type { Identified } from './registry';

export interface OpMeta {
  readonly opId: string;
  readonly actorId: string;
  readonly at: number;
  /** Actors the operation is hidden from, if any. */
  readonly hiddenFrom?: readonly string[];
}

/** How a correcting operation rewrites the earlier operation it targets. */
export interface Amendment<O> {
  /** Whether `earlier` (an operation of the same document) is the one corrected. */
  targets(earlier: O): boolean;
  /** The corrected operation, or `null` to take it out of the history. */
  rewrite(earlier: O): O | null;
}

/**
 * A kind of shared document (a transcript, an outline, a scene, an inventory)
 * declared by a module. Its state is the fold of its operations.
 *
 * Operations should describe intent against stable ids ("edit message m7",
 * "insert after node n3"), never positions, so they stay meaningful when other
 * operations are hidden from a perspective or merged from another writer.
 */
export interface DocType<S = unknown, O = unknown> extends Identified {
  /** Bumped when the operation format changes; recorded on every operation. */
  readonly version: number;
  readonly description: string;
  /** Validates operation payloads before they enter the log. */
  readonly op: z.ZodType;
  initial(): S;
  /**
   * Pure: returns the next state without mutating `state`. Must ignore
   * operations that refer to things the state lacks; they may have been
   * hidden from the perspective being folded.
   */
  apply(state: S, op: O, meta: OpMeta): S;
  /**
   * Upgrades an operation payload saved by an older `version` to the current
   * one. Needed as soon as `version` is bumped, so old sessions keep loading.
   */
  migrate?(payload: unknown, fromVersion: number): unknown;
  /**
   * Marks operations that correct an earlier operation instead of adding a
   * step, e.g. editing or deleting a posted message. The workspace rewrites
   * the earlier operation in place, so the correction lives where the
   * original did: rewinding past later steps (a retry) keeps it, and there is
   * never a second copy to fall back to.
   */
  amends?(op: O): Amendment<O> | undefined;
}

export function defineDocType<S, O>(spec: DocType<S, O>): DocType<S, O> {
  if (!/^[a-z][a-z0-9-]*$/.test(spec.id)) throw new Error(`Invalid document type id "${spec.id}"`);
  return spec;
}
