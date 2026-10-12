import { describe, expect, it } from 'vitest';
import { textContent } from './output';
import { TOOL_USE } from './tools';
import { transcriptDoc } from './transcript';
import { migrateTranscriptOp, partsToContent } from './transcript-migrate';

const meta = { opId: 'o', actorId: 'a', at: 0 };
const message = { id: 'm1', actorId: 'a', createdAt: 0, ...textContent('Rain.') };

describe('transcriptDoc', () => {
  it('appends messages once and edits their content', () => {
    let state = transcriptDoc.initial();
    state = transcriptDoc.apply(state, { type: 'append', message }, meta);
    state = transcriptDoc.apply(state, { type: 'append', message }, meta);
    const picture = { kind: 'image', data: { assetId: 'x' }, text: 'A gate' };
    state = transcriptDoc.apply(state, { type: 'edit', messageId: 'm1', content: picture }, meta);
    expect(state.messages).toEqual([{ ...message, ...picture }]);
  });

  it('accepts a message of any kind, but only with its text form', () => {
    const op = (extra: object) => ({ type: 'append', message: { ...message, ...extra } });
    expect(transcriptDoc.op.safeParse(op({ kind: 'dice', data: { total: 7 } })).success).toBe(true);
    const missing = { type: 'append', message: { ...message, text: undefined } };
    expect(transcriptDoc.op.safeParse(missing).success).toBe(false);
  });
});

describe('migrating version 1 messages', () => {
  it('keeps a lone part and gives it a text form', () => {
    expect(partsToContent([{ kind: 'text', data: 'Hi' }])).toEqual(textContent('Hi'));
    const picture = { kind: 'image', data: { assetId: 'x', alt: 'A gate' } };
    expect(partsToContent([picture])).toEqual({ ...picture, text: 'A gate' });
  });

  it('turns several parts into one text message that reads like them', () => {
    const run = { tool: 'dice_roll', input: { sides: 6 }, output: 4 };
    const content = partsToContent([
      { kind: TOOL_USE, data: run },
      { kind: 'text', data: 'A four.' },
    ]);
    expect(content).toEqual(textContent('[dice_roll {"sides":6} → 4]\nA four.'));
  });

  it('upgrades appends and edits, and leaves current operations alone', () => {
    const parts = [{ kind: 'text', data: 'Hi' }];
    expect(migrateTranscriptOp({ type: 'append', message: { id: 'm', parts } }, 1)).toEqual({
      type: 'append',
      message: { id: 'm', ...textContent('Hi') },
    });
    expect(migrateTranscriptOp({ type: 'edit', messageId: 'm', parts }, 1)).toEqual({
      type: 'edit',
      messageId: 'm',
      content: textContent('Hi'),
    });
    const current = { type: 'append', message };
    expect(migrateTranscriptOp(current, 2)).toBe(current);
  });
});
