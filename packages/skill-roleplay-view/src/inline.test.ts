import { describe, expect, it } from 'vitest';
import { inline } from './inline';

describe('inline', () => {
  it('reads markdown emphasis, strong, strike-through and code, nested', () => {
    expect(inline('a **b *c* d** ~~d~~ `*e*` _f_ snake_case')).toEqual([
      { text: 'a ' },
      { text: 'b ', strong: true },
      { text: 'c', strong: true, em: true },
      { text: ' d', strong: true },
      { text: ' ' },
      { text: 'd', strike: true },
      { text: ' ' },
      { text: '*e*', code: true },
      { text: ' ' },
      { text: 'f', em: true },
      { text: ' snake_case' },
    ]);
  });

  it('marks direct speech, quotes included, even across emphasis', () => {
    expect(inline('He says "Run, *now*!" and “go”.')).toEqual([
      { text: 'He says ' },
      { text: '"Run, ', speech: true },
      { text: 'now', em: true, speech: true },
      { text: '!"', speech: true },
      { text: ' and ' },
      { text: '“go”', speech: true },
      { text: '.' },
    ]);
  });

  it('ends an unclosed quote with the text', () => {
    expect(inline('"Wait')).toEqual([{ text: '"Wait', speech: true }]);
  });
});
