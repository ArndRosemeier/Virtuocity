import type { ReactNode } from 'react';
import type { Block, RichText, Span } from '@virtuocity/skill-roleplay-view';

/** One run of text, wrapped in the elements its formatting asks for. */
function SpanView({ span }: { span: Span }) {
  let node: ReactNode = span.text;
  if (span.code) node = <code>{node}</code>;
  if (span.em) node = <em>{node}</em>;
  if (span.strong) node = <strong>{node}</strong>;
  if (span.strike) node = <s>{node}</s>;
  if (span.speech) node = <span className="speech">{node}</span>;
  return node;
}

const spans = (list: readonly Span[]) => list.map((s, i) => <SpanView key={i} span={s} />);

function Heading({ level, children }: { level: number; children: ReactNode }) {
  if (level <= 2) return <h4 className="rich__heading">{children}</h4>;
  return <h5 className="rich__heading">{children}</h5>;
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="story-text">{spans(block.spans)}</p>;
    case 'heading':
      return <Heading level={block.level}>{spans(block.spans)}</Heading>;
    case 'quote':
      return <blockquote className="story-text">{spans(block.spans)}</blockquote>;
    case 'rule':
      return <hr />;
    case 'list': {
      const items = block.items.map((item, i) => <li key={i}>{spans(item)}</li>);
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case 'fold':
      return (
        <details className="fold" data-tag={block.tag} open={!block.folded}>
          <summary>{block.tag}</summary>
          <Blocks blocks={block.blocks} />
        </details>
      );
  }
}

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return blocks.map((b, i) => <BlockView key={i} block={b} />);
}

/** Formatted text: markdown, highlighted speech, and foldable sections. */
export function RichTextView({ text }: { text: RichText }) {
  return (
    <div className="rich">
      <Blocks blocks={text.blocks} />
    </div>
  );
}
