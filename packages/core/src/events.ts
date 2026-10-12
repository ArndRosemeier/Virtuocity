/** Everything that happens in a session is an event on the bus. */
export interface VEvent<P = unknown> {
  readonly type: string;
  readonly payload: P;
  /** Id of the actor or skill that emitted the event, if any. */
  readonly source?: string;
  readonly at: number;
}

export type EventHandler<P = unknown> = (event: VEvent<P>) => void | Promise<void>;

/**
 * A typed event definition. Modules declare their own events with
 * `defineEvent` instead of extending a central enum.
 */
export interface EventDef<P> {
  readonly type: string;
  create(payload: P, source?: string): VEvent<P>;
  is(event: VEvent): event is VEvent<P>;
}

export function defineEvent<P>(type: string): EventDef<P> {
  return {
    type,
    create: (payload, source) => ({
      type,
      payload,
      at: Date.now(),
      ...(source === undefined ? {} : { source }),
    }),
    is: (event): event is VEvent<P> => event.type === type,
  };
}

const ANY = '*';

export class EventBus {
  readonly #handlers = new Map<string, Set<EventHandler>>();

  /** Subscribes to one event type, or to all events with `'*'`. Returns an unsubscribe function. */
  on<P>(type: EventDef<P> | string, handler: EventHandler<P>): () => void {
    const key = typeof type === 'string' ? type : type.type;
    const set = this.#handlers.get(key) ?? new Set();
    set.add(handler as EventHandler);
    this.#handlers.set(key, set);
    return () => set.delete(handler as EventHandler);
  }

  /** Delivers the event to every matching handler and waits for all of them. */
  async emit(event: VEvent): Promise<void> {
    const targets = [...(this.#handlers.get(event.type) ?? []), ...(this.#handlers.get(ANY) ?? [])];
    await Promise.all(targets.map((handler) => handler(event)));
  }
}
