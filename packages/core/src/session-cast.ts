import type { Actor } from './actor';
import type { DescribedType, SessionTypeDescription } from './session-type';
import { TypeTracker, sessionTypeOf } from './session-type';
import type { Skill } from './skill';

interface CastDeps {
  readonly actors: () => readonly Actor[];
  /** All installed skills. */
  readonly skills: () => readonly Skill[];
  /** The installed skills of one actor. */
  readonly skillsOf: (actor: Actor) => Skill[];
  readonly ask: (type: Actor) => Promise<SessionTypeDescription>;
  readonly announce: (type: Actor) => Promise<void>;
}

/**
 * Who is cast in a session and with which skill they act, as its session
 * type says: AI actors holding one of the type's cast skills are cast and act
 * with the first of them they have, in the type's order. Everyone else (an
 * illustrator in a roleplay, a chronicler, the type itself) is support. A
 * session without a type (a bare runtime, e.g. in tests) casts the actors
 * that can take turns.
 */
export class SessionCast {
  readonly #deps: CastDeps;
  readonly #types: TypeTracker;

  constructor(deps: CastDeps) {
    this.#deps = deps;
    this.#types = new TypeTracker({ ask: deps.ask, announce: deps.announce });
  }

  /** The type as it last described itself; undefined without a type, or until it first answers. */
  type(): DescribedType | undefined {
    return this.#types.current(this.#typeActor());
  }

  /** Asks the type again when the cast changed; waits for the answer. */
  settle(): Promise<void> {
    return this.#types.settle(this.#typeActor());
  }

  /** People, and the AI actors holding a cast skill. */
  cast(): Actor[] {
    return this.#deps
      .actors()
      .filter((a) => a.controller === 'human' || this.castSkill(a) !== undefined);
  }

  /** AI actors in the cast. */
  speakers(): Actor[] {
    return this.#deps.actors().filter((a) => a.controller === 'ai' && this.castSkill(a));
  }

  /** AI support actors a person can ask to act (`onRequest`); a director never picks them. */
  askable(): Actor[] {
    return this.#deps
      .actors()
      .filter((a) => a.controller === 'ai' && !this.castSkill(a) && this.#requestSkill(a));
  }

  /** The skill an actor acts with when it is its turn or it is asked. */
  actingSkill(actor: Actor): Skill | undefined {
    return this.castSkill(actor) ?? this.#requestSkill(actor);
  }

  /** The skill an actor acts with on its turn: the first of the type's cast skills it has. */
  castSkill(actor: Actor): Skill | undefined {
    const skills = this.#deps.skillsOf(actor);
    if (!this.#typeActor()) return skills.find((s) => s.takeTurn);
    const castSkills = this.type()?.description.castSkills ?? [];
    return castSkills
      .flatMap((id) => skills.find((s) => s.id === id) ?? [])
      .find((s) => s.takeTurn !== undefined || s.onRequest !== undefined);
  }

  #requestSkill(actor: Actor): Skill | undefined {
    return this.#deps.skillsOf(actor).find((s) => s.onRequest);
  }

  #typeActor(): Actor | undefined {
    return sessionTypeOf(this.#deps.actors(), this.#deps.skills());
  }
}
