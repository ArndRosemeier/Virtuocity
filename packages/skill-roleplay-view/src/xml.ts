/** Text with XML-like elements picked out, e.g. `<hidden>…</hidden>`. */
export type Segment =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'element'; readonly tag: string; readonly children: readonly Segment[] };

interface Frame {
  readonly tag: string;
  readonly open: string;
  readonly children: Segment[];
}

const TAG = /<(\/?)([A-Za-z][\w.-]*)(?:\s[^<>]*)?>/g;

function addText(children: Segment[], text: string): void {
  if (!text) return;
  const last = children.at(-1);
  if (last?.type === 'text')
    children[children.length - 1] = { type: 'text', text: last.text + text };
  else children.push({ type: 'text', text });
}

function addAll(children: Segment[], segments: readonly Segment[]): void {
  for (const s of segments) {
    if (s.type === 'text') addText(children, s.text);
    else children.push(s);
  }
}

/** Puts an element that never closed back as plain text into its parent. */
function unwind(stack: Frame[]): void {
  const frame = stack.pop();
  const parent = stack.at(-1);
  if (!frame || !parent) return;
  addText(parent.children, frame.open);
  addAll(parent.children, frame.children);
}

/** Opens or closes an element; a closing tag nothing opened stays text. */
function onTag(stack: Frame[], raw: string, closing: boolean, tag: string): void {
  if (!closing) {
    stack.push({ tag, open: raw, children: [] });
    return;
  }
  const depth = stack.findLastIndex((f, i) => i > 0 && f.tag === tag);
  if (depth < 0) {
    const top = stack.at(-1);
    if (top) addText(top.children, raw);
    return;
  }
  while (stack.length > depth + 1) unwind(stack);
  const closed = stack.pop();
  if (closed) stack.at(-1)?.children.push({ type: 'element', tag, children: closed.children });
}

/**
 * Splits text into plain text and elements. Elements nest; a closing tag
 * without an opening one, and an element that never closes, stay plain text.
 */
export function segment(text: string): Segment[] {
  const stack: Frame[] = [{ tag: '', open: '', children: [] }];
  let at = 0;
  for (const match of text.matchAll(TAG)) {
    const [raw, slash, tag = ''] = match;
    addText(stack.at(-1)?.children ?? [], text.slice(at, match.index));
    at = match.index + raw.length;
    onTag(stack, raw, slash === '/', tag);
  }
  addText(stack.at(-1)?.children ?? [], text.slice(at));
  while (stack.length > 1) unwind(stack);
  return stack[0]?.children ?? [];
}
