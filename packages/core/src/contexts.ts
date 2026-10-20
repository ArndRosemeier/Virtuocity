import type { Actor } from './actor';
import type { AssetStore } from './assets';
import type { ActorLookup } from './cast';
import { everyone } from './cast-refs';
import type { ContextContributor } from './context-assembly';
import { assembleContext } from './context-assembly';
import type { Contract } from './contract';
import type { EventBus } from './events';
import type { JobQueue } from './jobs';
import type { Content } from './output';
import type { Decide } from './decisions';
import type { Complete } from './provider';
import type { Skill } from './skill';
import type { InvokeAction, SkillContext } from './skill-context';
import { skillTools } from './skill-tools';
import type { CallStats } from './stats';
import type { Message } from './transcript';
import type { ChangeOptions, Workspace } from './workspace';

/** The parts of a session a skill context is built from. */
export interface ContextSource {
  readonly bus: EventBus;
  readonly workspace: Workspace;
  readonly jobs: JobQueue;
  readonly assets: AssetStore;
  readonly actors: readonly Actor[];
  readonly lookup: ActorLookup;
  cast(): readonly Actor[];
  readonly invoke: InvokeAction;
  implementationFor(actorId: string, contract: Contract): unknown;
  transcript(perspective?: string): readonly Message[];
  post(
    actorId: string,
    content: Content,
    stats?: readonly CallStats[],
    options?: ChangeOptions,
  ): Promise<Message>;
}

/** Everything one skill of one actor may touch while it runs. */
export function createSkillContext(
  source: ContextSource,
  actor: Actor,
  skill: Skill,
  extras: {
    readonly complete: Complete;
    readonly decide: Decide;
    readonly skills: readonly Skill[];
    readonly contributors: readonly ContextContributor[];
  },
): SkillContext {
  const call = (contract: Contract, action: string, input: unknown) =>
    source.invoke(actor.id, contract, action, input as never);
  const transcript = source.transcript(actor.id);
  const cast = source.cast();
  const state = source.workspace.view(actor.id);
  const context = (budget: number) => {
    const request = { actor, actors: source.actors, cast, state, transcript };
    const pieces = extras.contributors.flatMap((c) => c.contribute(request));
    return assembleContext(pieces, budget);
  };
  return {
    actor,
    context,
    settings: actor.settings?.[skill.id],
    bus: source.bus,
    transcript,
    state,
    actors: source.actors,
    everyone: everyone(source),
    cast,
    assets: source.assets,
    post: (content, stats, options) => source.post(actor.id, content, stats, options),
    invoke: source.invoke,
    serves: (actorId, contract) => source.implementationFor(actorId, contract) !== undefined,
    complete: extras.complete,
    decide: extras.decide,
    tools: skillTools(extras.skills, skill, call),
    startJob: (label, run) => void source.jobs.start({ actorId: actor.id, label }, run),
  };
}
