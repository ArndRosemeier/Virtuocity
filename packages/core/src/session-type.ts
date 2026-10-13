import { z } from 'zod';
import type { Actor } from './actor';
import { action, defineContract } from './contract';
import { check } from './conformance-check';
import { tryParseRef } from './contract-version';
import { defineEvent } from './events';
import type { Skill } from './skill';
import { serves } from './skill';

const role = z.object({
  label: z.string().min(1).describe('What the guide calls the role, e.g. "A narrator"'),
  hint: z.string().describe('One line on what the role adds; may be empty'),
  cast: z
    .boolean()
    .describe("The actor in this role is cast: it serves one of the type's cast contracts"),
  needs: z
    .array(z.string())
    .describe('Contracts the actor in this role must serve, as "name@major.minor"'),
  optional: z.boolean().describe('The session works without this role'),
});

export type SessionRole = z.output<typeof role>;

const description = z.object({
  castContracts: z
    .array(z.string())
    .describe(
      'The contracts that make an actor cast, as "name@major.minor", in order; on its turn an actor acts with its skill serving the first it serves',
    ),
  roles: z.array(role).describe('The parts a session of this type usually casts, in order'),
  panels: z
    .array(z.string())
    .describe('The panels the session shows, by id, in order; empty shows every panel'),
});

export type SessionTypeDescription = z.output<typeof description>;

/**
 * What kind of session this is: Roleplay, Book room, an image workflow. Every
 * session the app keeps has exactly one actor serving it. It decides who is
 * cast (actors serving one of its cast contracts; everyone else is support), which
 * panels the session shows and which roles its guide suggests. It never adds
 * actors itself; the person does.
 */
export const sessionTypeContract = defineContract({
  name: 'session-type',
  version: '3.0',
  description: 'Says who is cast, how a session looks and which roles it suggests.',
  actions: {
    describe: action({
      description: 'The cast contracts, panels and suggested roles of this kind of session.',
      input: z.object({}),
      output: description,
    }),
  },
  conformance: [
    {
      name: 'names its needs as contract references',
      run: async (t) => {
        const { roles } = await t.invoke('describe', {});
        for (const r of roles) {
          for (const need of r.needs) {
            check(isRef(need), `"${need}" in "${r.label}" is not a contract reference`);
          }
        }
      },
    },
    {
      name: 'names its cast contracts as contract references',
      run: async (t) => {
        const { castContracts } = await t.invoke('describe', {});
        for (const c of castContracts) check(isRef(c), `cast contract "${c}" is not a reference`);
      },
    },
    {
      name: 'describes the same way when asked twice',
      run: async (t) => {
        const first = await t.invoke('describe', {});
        const second = await t.invoke('describe', {});
        check(
          JSON.stringify(first) === JSON.stringify(second),
          'the description changed between two calls',
        );
      },
    },
  ],
});

const isRef = (text: string): boolean => tryParseRef(text) !== undefined;

/** Whether the actor is a session type (Roleplay, Book room...). */
export function isSessionType(actor: Actor, skills: readonly Skill[]): boolean {
  return serves(actor, skills, sessionTypeContract);
}

/** The session's type: the one actor among `actors` serving `session-type@3`, if any. */
export function sessionTypeOf(
  actors: readonly Actor[],
  skills: readonly Skill[],
): Actor | undefined {
  return actors.find((a) => isSessionType(a, skills));
}

/** What the type said last, and about which version of the type actor. */
export interface DescribedType {
  readonly actor: Actor;
  readonly description: SessionTypeDescription;
}

/** A key that changes whenever the type actor could describe itself differently. */
export const typeKey = (actor: Actor): string =>
  `${actor.id} ${actor.skillIds.join()} ${JSON.stringify(actor.settings ?? {})}`;

/** The session type has (re)described itself; views redraw, the cast may have changed. */
export const sessionTypeDescribed = defineEvent<{ readonly actorId: string }>(
  'session-type.described',
);

interface TrackerDeps {
  readonly ask: (actor: Actor) => Promise<SessionTypeDescription>;
  readonly announce: (actor: Actor) => Promise<void>;
}

/**
 * Keeps what a session's type last said about itself, so the cast can be read
 * at once. It asks again whenever the type actor changes (joined, edited in
 * the library, loaded with the session); until the answer is in, the last one
 * about the same actor stands.
 */
export class TypeTracker {
  #described: DescribedType | undefined;
  #asking: string | undefined;

  constructor(private readonly deps: TrackerDeps) {}

  /** The type's last description, asking again (without waiting) when it is out of date. */
  current(type: Actor | undefined): DescribedType | undefined {
    if (!type) return undefined;
    if (!this.#upToDate(type) && this.#asking !== typeKey(type)) void this.settle(type);
    return this.#described?.actor.id === type.id ? this.#described : undefined;
  }

  /** Asks the type to describe itself when what it said last is out of date, and waits. */
  async settle(type: Actor | undefined): Promise<void> {
    if (!type) {
      this.#described = undefined;
      return;
    }
    if (this.#upToDate(type)) return;
    const key = typeKey(type);
    this.#asking = key;
    try {
      const description = await this.deps.ask(type);
      if (this.#asking !== key) return;
      this.#described = { actor: type, description };
      await this.deps.announce(type);
    } catch (error) {
      console.error(`${type.personality.name} could not describe the session type.`, error);
    } finally {
      if (this.#asking === key) this.#asking = undefined;
    }
  }

  #upToDate(type: Actor): boolean {
    return this.#described !== undefined && typeKey(this.#described.actor) === typeKey(type);
  }
}
