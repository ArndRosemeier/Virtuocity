import type { Span } from './rich-text';

type Style = Omit<Span, 'text'>;

/** Inline markdown, earliest match first: code, strong, strike, emphasis. */
const INLINE =
  /`([^`\n]+)`|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*([^*\s](?:[^*]*?[^*\s])?)\*|(?<!\w)_([^_\s](?:[^_]*?[^_\s])?)_(?!\w)/;

function styleOf(match: RegExpExecArray): { style: Style; inner: string } {
  const [, code, strong1, strong2, strike, em1, em2] = match;
  if (code !== undefined) return { style: { code: true }, inner: code };
  if (strong1 !== undefined || strong2 !== undefined) {
    return { style: { strong: true }, inner: strong1 ?? strong2 ?? '' };
  }
  if (strike !== undefined) return { style: { strike: true }, inner: strike };
  return { style: { em: true }, inner: em1 ?? em2 ?? '' };
}

/** Markdown emphasis, strong, strike-through and code, nested where markdown nests them. */
function emphasis(text: string, base: Style = {}): Span[] {
  const spans: Span[] = [];
  let rest = text;
  for (let match = INLINE.exec(rest); match; match = INLINE.exec(rest)) {
    if (match.index > 0) spans.push({ ...base, text: rest.slice(0, match.index) });
    const { style, inner } = styleOf(match);
    const styled = { ...base, ...style };
    if (style.code) spans.push({ ...styled, text: inner });
    else spans.push(...emphasis(inner, styled));
    rest = rest.slice(match.index + match[0].length);
  }
  if (rest) spans.push({ ...base, text: rest });
  return spans;
}

const OPENS = new Set(['“', '«', '„']);
const CLOSES = new Set(['”', '»']);

/**
 * Marks direct speech: everything between quotation marks, quotes included.
 * Speech may run across emphasis (`"Run, *now*!"`); it never runs past the
 * text it was given, so an unclosed quote ends with its paragraph.
 */
function speech(spans: readonly Span[]): Span[] {
  const out: Span[] = [];
  let inside = false;
  for (const span of spans) {
    if (span.code) {
      out.push(span);
      continue;
    }
    let run = '';
    const flush = (speaking: boolean) => {
      if (run) out.push({ ...span, text: run, ...(speaking ? { speech: true } : {}) });
      run = '';
    };
    for (const char of span.text) {
      const opens = OPENS.has(char) || (char === '"' && !inside);
      const closes = CLOSES.has(char) || (char === '"' && inside);
      if (opens && !inside) {
        flush(false);
        inside = true;
        run = char;
      } else if (closes && inside) {
        run += char;
        flush(true);
        inside = false;
      } else run += char;
    }
    flush(inside);
  }
  return out;
}

/** One paragraph's worth of inline markdown, with direct speech marked. */
export function inline(text: string): Span[] {
  return speech(emphasis(text));
}
