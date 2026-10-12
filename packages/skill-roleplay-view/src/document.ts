import { blocks } from './blocks';
import type { Block, RichText } from './rich-text';
import type { Segment } from './xml';
import { segment } from './xml';

/** Elements with these tags start folded. */
export const FOLDED_TAGS: ReadonlySet<string> = new Set(['hidden']);

function toBlocks(segments: readonly Segment[]): Block[] {
  return segments.flatMap((s): Block[] =>
    s.type === 'text'
      ? blocks(s.text)
      : [
          {
            type: 'fold',
            tag: s.tag,
            folded: FOLDED_TAGS.has(s.tag),
            blocks: toBlocks(s.children),
          },
        ],
  );
}

/** Formatted text: every XML element becomes a fold, the rest is markdown with speech marked. */
export function richText(text: string): RichText {
  return { blocks: toBlocks(segment(text)) };
}
