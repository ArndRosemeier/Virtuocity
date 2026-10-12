import { renderContract } from '@virtuocity/contract-render';
import type { Actor, SessionRuntime, Skill } from '@virtuocity/core';
import { fulfils } from '@virtuocity/core';
import type { Setting } from './settings';
import { readSetting } from './settings';
import type { AppHost } from './types';

/**
 * The actor that draws the story. Every story has exactly one: it is a fixed
 * member of the cast, and choosing another look swaps its render skill.
 */
export const STORY_VIEW = 'story-view';

/** The render skill new stories start with; each story can pick its own. */
export const RENDERER: Setting = { key: 'virtuocity.renderer', fallback: 'chat-view' };

/** Skills that can draw a story. */
export function renderSkills(host: AppHost): Skill[] {
  return host.skills
    .list()
    .filter((s) => (s.implements ?? []).some((i) => fulfils(i.contract, renderContract)));
}

const storyView = (skillId: string): Actor => ({
  id: STORY_VIEW,
  controller: 'ai',
  personality: { name: 'Story view', description: 'Draws the story.' },
  skillIds: [skillId],
});

/** The render skill this story uses, if it has a story view yet. */
export function currentRenderer(session: SessionRuntime): string | undefined {
  return session.actors.find((a) => a.id === STORY_VIEW)?.skillIds[0];
}

/** Gives the story the default story view if it has none, e.g. when it starts or loads. */
export async function ensureStoryView(session: SessionRuntime): Promise<void> {
  if (currentRenderer(session) === undefined) await setRenderer(session, readSetting(RENDERER));
}

/** Draws this story with another render skill. */
export function setRenderer(session: SessionRuntime, skillId: string): Promise<void> {
  return session.join(storyView(skillId));
}
