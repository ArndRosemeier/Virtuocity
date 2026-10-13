import { createContext, useContext } from 'react';

/** What people can do to a message where the story is drawn. */
export interface MessageActions {
  /** Whether the message can be retried: it came from an actor that takes turns. */
  readonly canRetry: (messageId: string) => boolean;
  /** Lets the message's author answer again; the old answer stays as an earlier version. */
  readonly retry: (messageId: string) => void;
  /** Which version of a retried message is shown, and how many there are. */
  readonly versions: (messageId: string) => { index: number; count: number } | undefined;
  /** Shows another version of a message, with everything that followed it. */
  readonly showVersion: (messageId: string, index: number) => void;
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
