import { createContext, useContext } from 'react';

/** What people can do to a message where the story is drawn. */
export interface MessageActions {
  /** Whether the message can be retried: it came from an actor that takes turns. */
  readonly canRetry: (messageId: string) => boolean;
  /** Takes the message and everything after it back, and lets its author answer again. */
  readonly retry: (messageId: string) => void;
  /** The message's text when it can be edited (a text message), else `undefined`. */
  readonly editableText: (messageId: string) => string | undefined;
  /** Rewrites the message in place; everything after it stays. */
  readonly edit: (messageId: string, text: string) => void;
  /** Takes the message out of the story; everything after it stays. */
  readonly remove: (messageId: string) => void;
  /** An actor is writing, so nothing can be retried or edited right now. */
  readonly busy: boolean;
}

export const MessageActionsContext = createContext<MessageActions | null>(null);

export const useMessageActions = () => useContext(MessageActionsContext);
