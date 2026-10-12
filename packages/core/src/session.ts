import type { OutputPart } from './output';
import type { CallStats } from './stats';

export interface Message {
  readonly id: string;
  readonly parentId: string | null;
  readonly actorId: string;
  readonly parts: readonly OutputPart[];
  /** Present when producing the message involved AI calls. */
  readonly stats?: readonly CallStats[];
  readonly createdAt: number;
}

export type NewMessage = Omit<Message, 'id' | 'parentId' | 'createdAt'>;

export interface RewindOptions {
  /** Keep the messages below as an alternate branch instead of deleting them. */
  readonly keepBranch?: boolean;
}

/**
 * The session history as a tree, so any point can be rewound to and branched
 * from. The active path (root to active leaf) is what the story shows.
 */
export class MessageTree {
  readonly #messages = new Map<string, Message>();
  #leafId: string | null = null;

  constructor(private readonly newId: () => string = () => crypto.randomUUID()) {}

  get leafId(): string | null {
    return this.#leafId;
  }

  get(id: string): Message {
    const message = this.#messages.get(id);
    if (!message) throw new Error(`Unknown message "${id}"`);
    return message;
  }

  /** Appends below the active leaf and makes the new message the active leaf. */
  append(message: NewMessage): Message {
    const full: Message = {
      ...message,
      id: this.newId(),
      parentId: this.#leafId,
      createdAt: Date.now(),
    };
    this.#messages.set(full.id, full);
    this.#leafId = full.id;
    return full;
  }

  /** Every message can be edited in place. */
  edit(id: string, parts: readonly OutputPart[]): Message {
    const edited: Message = { ...this.get(id), parts };
    this.#messages.set(id, edited);
    return edited;
  }

  children(id: string | null): Message[] {
    return [...this.#messages.values()].filter((m) => m.parentId === id);
  }

  /** Root-to-leaf path that is currently shown. */
  activePath(): Message[] {
    const path: Message[] = [];
    for (let id = this.#leafId; id !== null; id = this.get(id).parentId) {
      path.unshift(this.get(id));
    }
    return path;
  }

  /**
   * Makes `id` the active leaf so the next message continues from there.
   * By default everything below is removed; pass `keepBranch` to keep it.
   */
  rewindTo(id: string | null, options: RewindOptions = {}): void {
    if (id !== null) this.get(id);
    if (!options.keepBranch) {
      for (const child of this.children(id)) this.#remove(child.id);
    }
    this.#leafId = id;
  }

  /** Switches the active path to another existing branch. */
  switchTo(leafId: string): void {
    this.#leafId = this.get(leafId).id;
  }

  allStats(): CallStats[] {
    return [...this.#messages.values()].flatMap((m) => m.stats ?? []);
  }

  #remove(id: string): void {
    for (const child of this.children(id)) this.#remove(child.id);
    this.#messages.delete(id);
  }
}
