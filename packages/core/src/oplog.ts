/**
 * One change to one document. Every change to shared state, in every
 * document, is an operation in a single log, so rewinding or branching moves
 * all state together.
 */
export interface Operation {
  readonly id: string;
  /** The operation this one follows; the log is a tree of branches. */
  readonly parentId: string | null;
  readonly docId: string;
  readonly docType: string;
  readonly docVersion: number;
  readonly actorId: string;
  readonly payload: unknown;
  /** Actors who may see this change. Absent means everyone. */
  readonly audience?: readonly string[];
  readonly at: number;
}

export type NewOperation = Omit<Operation, 'id' | 'parentId' | 'at'>;

export interface RewindOptions {
  /** Keep the operations below as an alternate branch instead of deleting them. */
  readonly keepBranch?: boolean;
}

/**
 * The session history as a tree of operations. The path from the root to the
 * head is the current state; other leaves are alternate branches.
 */
export class OpLog {
  readonly #ops = new Map<string, Operation>();
  #head: string | null = null;

  constructor(
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = Date.now,
  ) {}

  get head(): string | null {
    return this.#head;
  }

  get(id: string): Operation {
    const op = this.#ops.get(id);
    if (!op) throw new Error(`Unknown operation "${id}"`);
    return op;
  }

  /** Appends below the head and makes the new operation the head. */
  append(op: NewOperation): Operation {
    const full: Operation = { ...op, id: this.newId(), parentId: this.#head, at: this.now() };
    this.#ops.set(full.id, full);
    this.#head = full.id;
    return full;
  }

  children(id: string | null): Operation[] {
    return this.all().filter((op) => op.parentId === id);
  }

  /** Root-to-`leaf` path; the current state when `leaf` is the head. */
  path(leaf: string | null = this.#head): Operation[] {
    const path: Operation[] = [];
    for (let id = leaf; id !== null; id = this.get(id).parentId) path.push(this.get(id));
    return path.reverse();
  }

  /**
   * Makes `id` the head so the next operation continues from there. By default
   * everything below is removed; pass `keepBranch` to keep it as a branch.
   */
  rewindTo(id: string | null, options: RewindOptions = {}): void {
    if (id !== null) this.get(id);
    if (!options.keepBranch) {
      for (const child of this.children(id)) this.#remove(child.id);
    }
    this.#head = id;
  }

  /** Moves the head to any existing operation, e.g. the leaf of another branch. */
  switchTo(id: string): void {
    this.#head = this.get(id).id;
  }

  /** Ends of all branches. */
  leaves(): Operation[] {
    const parents = new Set(this.all().map((op) => op.parentId));
    return this.all().filter((op) => !parents.has(op.id));
  }

  /** Every operation on every branch, oldest first. */
  all(): Operation[] {
    return [...this.#ops.values()];
  }

  #remove(id: string): void {
    for (const child of this.children(id)) this.#remove(child.id);
    this.#ops.delete(id);
  }
}
