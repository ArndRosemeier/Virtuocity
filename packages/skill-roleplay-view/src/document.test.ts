import { describe, expect, it } from 'vitest';
import { blocks } from './blocks';
import { richText } from './document';

describe('blocks', () => {
  it('reads headings, paragraphs, quotes, lists and rules', () => {
    const text = '# Inn\nRain.\nWind.\n\n> Old sign\n- one\n- two\n1. first\n---';
    expect(blocks(text)).toEqual([
      { type: 'heading', level: 1, spans: [{ text: 'Inn' }] },
      { type: 'paragraph', spans: [{ text: 'Rain.\nWind.' }] },
      { type: 'quote', spans: [{ text: 'Old sign' }] },
      { type: 'list', ordered: false, items: [[{ text: 'one' }], [{ text: 'two' }]] },
      { type: 'list', ordered: true, items: [[{ text: 'first' }]] },
      { type: 'rule' },
    ]);
  });

  it('keeps actions in asterisks as emphasis, not as a list', () => {
    expect(blocks('*grins* Fine.')).toEqual([
      { type: 'paragraph', spans: [{ text: 'grins', em: true }, { text: ' Fine.' }] },
    ]);
  });
});

describe('richText', () => {
  it('folds every element, hidden ones folded from the start', () => {
    const { blocks: shown } = richText('Hello.\n<hidden>Mara lies.</hidden>\n<mood>tense</mood>');
    expect(shown).toEqual([
      { type: 'paragraph', spans: [{ text: 'Hello.' }] },
      {
        type: 'fold',
        tag: 'hidden',
        folded: true,
        blocks: [{ type: 'paragraph', spans: [{ text: 'Mara lies.' }] }],
      },
      {
        type: 'fold',
        tag: 'mood',
        folded: false,
        blocks: [{ type: 'paragraph', spans: [{ text: 'tense' }] }],
      },
    ]);
  });
});
