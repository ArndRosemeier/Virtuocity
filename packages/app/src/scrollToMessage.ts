/** Where messages are drawn, e.g. the document; narrowed for tests. */
export interface MessageRoot {
  querySelectorAll(selector: string): Iterable<Element>;
}

/** The attribute that tells which message an element of the session view draws. */
export const MESSAGE_ID_ATTRIBUTE = 'data-message-id';

/** The attribute that tells which marker a line of the session view draws (`markerKey`). */
export const MARKER_ATTRIBUTE = 'data-marker';

/** Names a marker by the message it follows and the actor that placed it. */
export const markerKey = (afterId: string, actorId: string) => `${afterId} ${actorId}`;

/** Brings the element with this attribute value into view and lets it light up briefly. */
function scrollTo(
  attribute: string,
  value: string,
  root: MessageRoot,
  block: ScrollLogicalPosition,
): boolean {
  const all = [...root.querySelectorAll(`[${attribute}]`)];
  const element = all.find((e) => e.getAttribute(attribute) === value);
  if (!element) return false;
  element.scrollIntoView({ block, behavior: 'smooth' });
  element.animate([{ backgroundColor: 'var(--accent-soft)' }, { backgroundColor: 'transparent' }], {
    duration: 1500,
  });
  return true;
}

/**
 * Brings a message of the session into view and lets it light up briefly.
 * Returns whether the message is drawn at all (a hidden one is not).
 */
export const scrollToMessage = (messageId: string, root: MessageRoot = document) =>
  scrollTo(MESSAGE_ID_ATTRIBUTE, messageId, root, 'start');

/** Brings a marker of the session into view, e.g. a chronicler's "Summarized". */
export const scrollToMarker = (afterId: string, actorId: string, root: MessageRoot = document) =>
  scrollTo(MARKER_ATTRIBUTE, markerKey(afterId, actorId), root, 'center');
