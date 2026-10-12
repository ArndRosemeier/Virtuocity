/**
 * Output kind for formatted text: markdown blocks, speech and foldable
 * sections. Its data is a `RichText`; the app draws it.
 */
export const RICH_TEXT = 'rich-text';

/** A run of text with its formatting. */
export interface Span {
  readonly text: string;
  readonly strong?: boolean;
  readonly em?: boolean;
  readonly strike?: boolean;
  readonly code?: boolean;
  /** Direct speech, inside quotation marks. */
  readonly speech?: boolean;
}

export type Block =
  | { readonly type: 'paragraph'; readonly spans: readonly Span[] }
  | { readonly type: 'heading'; readonly level: number; readonly spans: readonly Span[] }
  | { readonly type: 'quote'; readonly spans: readonly Span[] }
  | { readonly type: 'list'; readonly ordered: boolean; readonly items: readonly Span[][] }
  | { readonly type: 'rule' }
  | {
      readonly type: 'fold';
      readonly tag: string;
      /** Starts folded; people can unfold it. */
      readonly folded: boolean;
      readonly blocks: readonly Block[];
    };

export interface RichText {
  readonly blocks: readonly Block[];
}
