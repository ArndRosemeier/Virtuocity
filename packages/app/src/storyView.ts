import { renderContract } from '@virtuocity/contract-render';
import type { Actor, SessionRuntime } from '@virtuocity/core';
import { fulfils } from '@virtuocity/core';
import type { Setting } from './settings';
import { readSetting } from './settings';
import type { AppHost } from './types';

/**
 * The actor that draws the story. Every story has exactly one: a copy of a
 * ready-made renderer actor (whose skills include a render skill), kept in
 * the cast under this fixed id. Choosing another view swaps it.
 */
export const STORY_VIEW = 'story-view';

/** The renderer actor new stories start with; each story can pick its own. */
export const RENDERER: Setting = { key: 'virtuocity.renderer', fallback: 'chat-view' };

/** Ready-made actors that can draw a story. */
export function rendererActors(host: AppHost): Actor[] {
  const renders = (skillId: string) =>
    (host.skills.find(skillId)?.implements ?? []).some((i) => fulfils(i.contract, renderContract));
  return host.actors.list().filter((a) => a.skillIds.some(renders));
}

/** This story's view, if it has one. */
export function storyView(session: SessionRuntime): Actor | undefined {
  return session.actors.find((a) => a.id === STORY_VIEW);
}

const sameSkills = (a: Actor, b: Actor) =>
  [...a.skillIds].sort().join() === [...b.skillIds].sort().join();

/** The ready-made renderer this story's view was made from, if it still has the same skills. */
export function rendererOf(host: AppHost, session: SessionRuntime): Actor | undefined {
  const view = storyView(session);
  return view && rendererActors(host).find((a) => sameSkills(a, view));
}

/** Draws this story with another renderer actor. */
export function setRenderer(session: SessionRuntime, renderer: Actor): Promise<void> {
  return session.join({ ...renderer, id: STORY_VIEW });
}

/** Gives the story the default view if it has none, e.g. when it starts or loads. */
export async function ensureStoryView(host: AppHost, session: SessionRuntime): Promise<void> {
  if (storyView(session)) return;
  const actors = rendererActors(host);
  const renderer = actors.find((a) => a.id === readSetting(RENDERER)) ?? actors[0];
  if (renderer) await setRenderer(session, renderer);
}
