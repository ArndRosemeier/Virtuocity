import { describe, expect, it } from 'vitest';
import { segment } from './xml';

describe('segment', () => {
  it('picks out nested elements and keeps the text around them', () => {
    expect(segment('She nods. <hidden>Plan: <npc>Mara</npc> lies.</hidden> Done.')).toEqual([
      { type: 'text', text: 'She nods. ' },
      {
        type: 'element',
        tag: 'hidden',
        children: [
          { type: 'text', text: 'Plan: ' },
          { type: 'element', tag: 'npc', children: [{ type: 'text', text: 'Mara' }] },
          { type: 'text', text: ' lies.' },
        ],
      },
      { type: 'text', text: ' Done.' },
    ]);
  });

  it('accepts attributes and leaves stray or unclosed tags as text', () => {
    expect(segment('<note who="Mara">x</note>')).toEqual([
      { type: 'element', tag: 'note', children: [{ type: 'text', text: 'x' }] },
    ]);
    expect(segment('a </b> c <3 <grin> d')).toEqual([
      { type: 'text', text: 'a </b> c <3 <grin> d' },
    ]);
  });

  it('closes an outer element even when an inner one never closed', () => {
    expect(segment('<hidden>a <b>c</hidden>')).toEqual([
      { type: 'element', tag: 'hidden', children: [{ type: 'text', text: 'a <b>c' }] },
    ]);
  });
});
