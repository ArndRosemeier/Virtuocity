import type { Amendment, DocType } from './doc-type';
import type { EventBus } from './events';
import { defineEvent } from './events';
import type { Operation, RewindOptions } from './oplog';
import { OpLog } from './oplog';
import type { Identified } from './registry';

export const stateChanged = defineEvent<{ readonly docId: string; readonly opId: string }>(
  'state.changed',
);
/** The head moved without a new operation: rewind, undo, redo or a branch switch. */
export const headMoved = defineEvent<{ readonly head: string | null }>('state.head-moved');

/** A change to one document, made by one actor. */
export interface Change<O = unknown> extends ChangeOptions {
  readonly actorId: string;
  readonly docId: string;
  readonly docType: DocType<unknown, O>;
  readonly payload: O;
}

/** A change someone wants to make, as seen by write policies. */
export type ProposedChange = Change<unknown> & { readonly docType: DocType };

/** Decides who may change what. Every registered policy must allow a change. */
export interface WritePolicy extends Identified {
  /** Returns a reason to refuse, or `undefined` to allow. */
  check(change: ProposedChange): string | undefined;
}

export interface ChangeOptions {
  /** Actors who may see the change. Absent means everyone. */
  readonly audience?: readonly string[];
  /** Actors who may not see the change. */
  readonly hiddenFrom?: readonly string[];
}

export interface WorkspaceOptions {
  readonly bus: EventBus;
  readonly policies?: () => readonly WritePolicy[];
  readonly newId?: () => string;
  readonly now?: () => number;
}

/** The documents as one actor sees them, with that actor as the author of changes. */
export interface StateView {
  read<S>(docId: string, docType: DocType<S>): S;
  change<O>(
    docId: string,
    docType: DocType<unknown, O>,
    payload: O,
    options?: ChangeOptions,
  ): Promise<Operation>;
}

/** An omniscient perspective sees every operation. */
const ALL = '\u0000all';

/**
 * All shared state of a session: documents folded from one operation log.
 * Reads take a perspective, so an actor only sees operations meant for them.
 */
export class Workspace {
  readonly log: OpLog;
  readonly #cache = new Map<string, unknown>();
  #redo: string[] = [];

  constructor(private readonly options: WorkspaceOptions) {
    this.log = new OpLog(options.newId, options.now);
  }

  /** Appends a validated, permitted change and announces it. */
  async change<O>(change: Change<O>): Promise<Operation> {
    const { actorId, docId, docType, payload, audience, hiddenFrom } = change;
    const existing = this.log.path().find((op) => op.docId === docId);
    if (existing && existing.docType !== docType.id) {
      throw new Error(`Document "${docId}" is a "${existing.docType}", not a "${docType.id}"`);
    }
    const parsed = docType.op.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid ${docType.id} operation: ${parsed.error.message}`, {
        cause: parsed.error,
      });
    }
    const proposed = change as ProposedChange;
    for (const policy of this.options.policies?.() ?? []) {
      const refusal = policy.check(proposed);
      if (refusal !== undefined) throw new Error(`Change refused by ${policy.id}: ${refusal}`);
    }
    const amendment = docType.amends?.(payload);
    if (amendment) return this.#amend(change, amendment);
    const op = this.log.append({
      docId,
      docType: docType.id,
      docVersion: docType.version,
      actorId,
      payload,
      ...(audience ? { audience } : {}),
      ...(hiddenFrom ? { hiddenFrom } : {}),
    });
    this.#redo = [];
    await this.options.bus.emit(stateChanged.create({ docId, opId: op.id }, actorId));
    return op;
  }

  /**
   * Rewrites the earlier operation an amending change targets (or takes it
   * out), so the history holds the corrected version in the original's place.
   */
  async #amend<O>({ actorId, docId, docType }: Change<O>, amendment: Amendment<O>) {
    const target = this.log
      .path()
      .reverse()
      .find((op) => op.docId === docId && amendment.targets(op.payload as O));
    if (!target) throw new Error(`Nothing in "${docId}" to change`);
    const next = amendment.rewrite(target.payload as O);
    if (next === null) this.log.excise(target.id);
    else docType.op.parse(next);
    const op = next === null ? target : this.log.rewrite(target.id, next);
    this.#cache.clear();
    this.#redo = [];
    await this.options.bus.emit(stateChanged.create({ docId, opId: op.id }, actorId));
    return op;
  }

  /** A document's state at the head, from `perspective` (an actor id) or omnisciently. */
  read<S>(docId: string, docType: DocType<S>, perspective?: string): S {
    const visible = this.log.path().filter((op) => op.docId === docId && canSee(op, perspective));
    const key = (op: Operation) => `${perspective ?? ALL}|${op.id}`;
    let start = visible.length;
    while (start > 0 && !this.#cache.has(key(visible[start - 1] as Operation))) start--;
    let state =
      start > 0 ? (this.#cache.get(key(visible[start - 1] as Operation)) as S) : docType.initial();
    for (const op of visible.slice(start)) {
      const { id: opId, actorId, at, hiddenFrom } = op;
      state = docType.apply(state, op.payload, {
        opId,
        actorId,
        at,
        ...(hiddenFrom && { hiddenFrom }),
      });
      this.#cache.set(key(op), state);
    }
    return state;
  }

  /** Ids and types of the documents that exist at the head, from a perspective. */
  documents(perspective?: string): { readonly docId: string; readonly docType: string }[] {
    const found = new Map<string, string>();
    for (const op of this.log.path()) if (canSee(op, perspective)) found.set(op.docId, op.docType);
    return [...found].map(([docId, docType]) => ({ docId, docType }));
  }

  view(actorId: string): StateView {
    return {
      read: (docId, docType) => this.read(docId, docType, actorId),
      change: (docId, docType, payload, options = {}) =>
        this.change({ ...options, actorId, docId, docType, payload }),
    };
  }

  /** Moves every document back to just after `opId` (or to empty with `null`). */
  async rewindTo(opId: string | null, options: RewindOptions = {}): Promise<void> {
    this.log.rewindTo(opId, options);
    this.#redo = [];
    await this.#moved();
  }

  /** Replaces all state with a saved log (see `persistence.ts`). */
  async load(ops: readonly Operation[], head: string | null): Promise<void> {
    this.log.replace(ops, head);
    this.#cache.clear();
    this.#redo = [];
    await this.#moved();
  }

  async switchTo(opId: string): Promise<void> {
    this.log.switchTo(opId);
    this.#redo = [];
    await this.#moved();
  }

  /** Steps back one operation, keeping it so `redo` can restore it. */
  async undo(): Promise<boolean> {
    const head = this.log.head;
    if (head === null) return false;
    this.log.rewindTo(this.log.get(head).parentId, { keepBranch: true });
    this.#redo.push(head);
    await this.#moved();
    return true;
  }

  async redo(): Promise<boolean> {
    const next = this.#redo.pop();
    if (next === undefined) return false;
    this.log.switchTo(next);
    await this.#moved();
    return true;
  }

  async #moved(): Promise<void> {
    await this.options.bus.emit(headMoved.create({ head: this.log.head }));
  }
}

/**
 * Actors always see their own operations; others only when in the audience
 * (if there is one) and not hidden from.
 */
export function canSee(op: Operation, perspective: string | undefined): boolean {
  if (perspective === undefined || op.actorId === perspective) return true;
  if (op.hiddenFrom?.includes(perspective)) return false;
  return op.audience === undefined || op.audience.includes(perspective);
}
