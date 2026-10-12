import { createContext, useContext } from 'react';

/** What people can do to a message where the story is drawn. */
export interface MessageActions {
  /** Whether the message can be retried: it came from an actor that takes turns. */
  readonly canRetry: (messageId: string) => boolean;
  /** Takes the message and everything after it back, and lets its author answer again. */
  readonly retry: (messageId: string) => void;
  /** An actor is writing, so nothing can be retried right now. */
  readonly busy: boolean;
}

export const MessageActionsContext = createContext<MessageActions | null>(null);

export const useMessageActions = () => useContext(MessageActionsContext);
