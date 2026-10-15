/** Where messages are drawn, e.g. the document; narrowed for tests. */
export interface MessageRoot {
  querySelectorAll(selector: string): Iterable<Element>;
}

/** The attribute that tells which message an element of the session view draws. */
export const MESSAGE_ID_ATTRIBUTE = 'data-message-id';

/**
 * Brings a message of the session into view and lets it light up briefly.
 * Returns whether the message is drawn at all (a hidden one is not).
 */
export function scrollToMessage(messageId: string, root: MessageRoot = document): boolean {
  const all = [...root.querySelectorAll(`[${MESSAGE_ID_ATTRIBUTE}]`)];
  const element = all.find((e) => e.getAttribute(MESSAGE_ID_ATTRIBUTE) === messageId);
  if (!element) return false;
  element.scrollIntoView({ block: 'start', behavior: 'smooth' });
  element.animate([{ backgroundColor: 'var(--accent-soft)' }, { backgroundColor: 'transparent' }], {
    duration: 1500,
  });
  return true;
}
