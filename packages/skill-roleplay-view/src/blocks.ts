import { inline } from './inline';
import type { Block, Span } from './rich-text';

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^>\s?(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

type Open =
  | { readonly type: 'paragraph' | 'quote'; readonly lines: string[] }
  | { readonly type: 'list'; readonly ordered: boolean; readonly items: Span[][] };

/** What one line of markdown is. */
type Line =
  | { readonly type: 'blank' | 'rule' }
  | { readonly type: 'heading'; readonly level: number; readonly text: string }
  | { readonly type: 'paragraph' | 'quote'; readonly text: string }
  | { readonly type: 'item'; readonly ordered: boolean; readonly text: string };

/** Line patterns in the order they are tried; the first match decides. */
const PATTERNS: readonly (readonly [RegExp, (m: RegExpExecArray) => Line])[] = [
  [RULE, () => ({ type: 'rule' })],
  [HEADING, (m) => ({ type: 'heading', level: m[1]?.length ?? 1, text: m[2] ?? '' })],
  [QUOTE, (m) => ({ type: 'quote', text: m[1] ?? '' })],
  [BULLET, (m) => ({ type: 'item', ordered: false, text: m[1] ?? '' })],
  [NUMBERED, (m) => ({ type: 'item', ordered: true, text: m[1] ?? '' })],
];

function classify(line: string): Line {
  if (!line.trim()) return { type: 'blank' };
  for (const [pattern, read] of PATTERNS) {
    const match = pattern.exec(line);
    if (match) return read(match);
  }
  return { type: 'paragraph', text: line };
}

/** Markdown blocks: paragraphs, headings, quotes, lists and rules. Single line breaks stay. */
export function blocks(text: string): Block[] {
  const out: Block[] = [];
  let open: Open | undefined;
  const close = () => {
    if (open?.type === 'list') out.push({ type: 'list', ordered: open.ordered, items: open.items });
    else if (open) out.push({ type: open.type, spans: inline(open.lines.join('\n')) });
    open = undefined;
  };
  const add = (line: Line) => {
    if (line.type === 'paragraph' || line.type === 'quote') {
      if (open?.type === line.type) open.lines.push(line.text);
      else {
        close();
        open = { type: line.type, lines: [line.text] };
      }
    } else if (line.type === 'item') {
      if (open?.type === 'list' && open.ordered === line.ordered)
        open.items.push(inline(line.text));
      else {
        close();
        open = { type: 'list', ordered: line.ordered, items: [inline(line.text)] };
      }
    } else {
      close();
      if (line.type === 'rule') out.push({ type: 'rule' });
      if (line.type === 'heading') {
        out.push({ type: 'heading', level: line.level, spans: inline(line.text) });
      }
    }
  };
  for (const line of text.split('\n')) add(classify(line));
  close();
  return out;
}
