import { directorContract } from '@virtuocity/contract-director';
import type { Actor, Flow, FlowContext, Skill, VirtuocityModule } from '@virtuocity/core';
import { CAST, castDoc, defineFlow, pausedIds, rivalFor, serves, z } from '@virtuocity/core';

export type TurnTakingInput =
  { readonly kind: 'pass' } | { readonly kind: 'choose'; readonly actorId: string };

/** Whether one of the actor's skills serves `director@1`. */
export function directs(actor: Actor, skills: readonly Skill[]): boolean {
  return serves(actor, skills, directorContract);
}

/**
 * A session has at most one director. Returns the director already among
 * `actors` that `actor` would be a second one to, if any.
 */
export function rivalDirector(
  actor: Actor,
  actors: readonly Actor[],
  skills: readonly Skill[],
): Actor | undefined {
  return rivalFor(directorContract, actor, actors, skills);
}

/**
 * Asks the session's director (the one actor serving `director@1`) who goes
 * next. Without a director, or when it hands the turn to a person, nobody does.
 * Actors paused in the session are not offered: the director never sees them.
 */
async function directorsPick(ctx: FlowContext): Promise<string | undefined> {
  const director = ctx.actors.find((a) => ctx.serves(a.id, directorContract));
  const paused = pausedIds(ctx.state.read(CAST, castDoc));
  const cast = ctx.cast().filter((a) => !paused.has(a.id));
  if (!director || cast.length === 0) return undefined;
  const candidates = cast.map((a) => ({
    id: a.id,
    name: a.personality.name,
    person: a.controller === 'human',
  }));
  const { next } = await ctx.invoke(director.id, directorContract, 'next', { candidates });
  const picked = cast.find((a) => a.id === next);
  return picked?.controller === 'ai' ? picked.id : undefined;
}

/**
 * The default flow: a person passes (the director picks who speaks, if the
 * session has one) or chooses who speaks. At most one actor speaks, then the
 * session pauses.
 */
export const turnTakingFlow = defineFlow<TurnTakingInput>({
  id: 'turn-taking',
  name: 'Turn taking',
  description: 'One actor answers, then the session pauses for you.',
  input: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('pass') }),
    z.object({ kind: z.literal('choose'), actorId: z.string() }),
  ]),
  run: async (ctx, input) => {
    const next = input.kind === 'choose' ? input.actorId : await directorsPick(ctx);
    if (next !== undefined) await ctx.runTurn(next);
  },
});

export const turnTakingModule: VirtuocityModule = {
  id: 'turn-taking',
  register: (host) => {
    host.contracts.register(directorContract);
    host.flows.register(turnTakingFlow as Flow);
  },
};
