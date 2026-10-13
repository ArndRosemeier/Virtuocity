import type { Message, StateView } from '@virtuocity/core';
import { IMAGE_PART, MAIN_TRANSCRIPT, defineDocType, transcriptDoc, z } from '@virtuocity/core';

/** A picture a person picked in a gallery, and the newest picture there was then. */
export interface Choice {
  readonly messageId: string;
  readonly newest: string;
}

export interface GalleryState {
  /** The picture each gallery shows, by the gallery actor's id; none means the newest. */
  readonly chosen: Readonly<Record<string, Choice>>;
}

export type GalleryOp = Choice;

/** Which picture each gallery shows. In the log, so it rewinds, branches and saves with the story. */
export const galleryDoc = defineDocType<GalleryState, GalleryOp>({
  id: 'gallery',
  version: 1,
  description: 'The picture each gallery shows, as a person picked it.',
  op: z.object({ messageId: z.string(), newest: z.string() }),
  initial: () => ({ chosen: {} }),
  apply: (state, op, meta) => ({ chosen: { ...state.chosen, [meta.actorId]: op } }),
});

/** The document id of a session's galleries. */
export const GALLERY = 'gallery';

/** Every picture in the story, oldest first. */
export function pictures(state: Pick<StateView, 'read'>): Message[] {
  return state.read(MAIN_TRANSCRIPT, transcriptDoc).messages.filter((m) => m.kind === IMAGE_PART);
}

/**
 * Which of `shown` is current: the one the person picked, until a newer
 * picture arrives, which then is current; the newest when nothing was picked
 * or the picked one is gone. -1 without pictures.
 */
export function currentIndex(shown: readonly Message[], choice: Choice | undefined): number {
  const at = (id: string | undefined) => shown.findIndex((m) => m.id === id);
  const picked = at(choice?.messageId);
  const newer = at(choice?.newest) < shown.length - 1 && at(choice?.newest) >= 0;
  return picked >= 0 && !newer ? picked : shown.length - 1;
}

/** What one gallery shows: every picture, and which is current. */
export function galleryOf(state: Pick<StateView, 'read'>, galleryId: string) {
  const shown = pictures(state);
  const current = currentIndex(shown, state.read(GALLERY, galleryDoc).chosen[galleryId]);
  return { shown, current };
}
