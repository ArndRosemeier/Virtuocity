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
  /** Actors who may not see this change, e.g. the people, for something only AI actors know. */
  readonly hiddenFrom?: readonly string[];
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

  /** Replaces an operation's payload; it keeps its place, id and time. */
  rewrite(id: string, payload: unknown): Operation {
    const op = { ...this.get(id), payload };
    this.#ops.set(id, op);
    return op;
  }

  /** Takes one operation out of the history; what followed it now follows its parent. */
  excise(id: string): void {
    const { parentId } = this.get(id);
    for (const child of this.children(id)) this.#ops.set(child.id, { ...child, parentId });
    this.#ops.delete(id);
    if (this.#head === id) this.#head = parentId;
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

  /** Replaces the whole log, e.g. with a loaded session. Every parent must be present. */
  replace(ops: readonly Operation[], head: string | null): void {
    const byId = new Map(ops.map((op) => [op.id, op]));
    for (const op of ops) {
      if (op.parentId !== null && !byId.has(op.parentId)) {
        throw new Error(`Operation "${op.id}" follows unknown operation "${op.parentId}"`);
      }
    }
    if (head !== null && !byId.has(head)) throw new Error(`Unknown head operation "${head}"`);
    this.#ops.clear();
    for (const [id, op] of byId) this.#ops.set(id, op);
    this.#head = head;
  }

  #remove(id: string): void {
    for (const child of this.children(id)) this.#remove(child.id);
    this.#ops.delete(id);
  }
}
