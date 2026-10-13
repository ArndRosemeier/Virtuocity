import { describe, expect, it } from 'vitest';
import { dnd5e } from './dnd5e';
import { rollCheck } from './engine';
import { pf2e } from './pf2e';
import { tableInstructions } from './roles';

/** A d20 that shows `faces` in turn. */
const dice = (...faces: number[]) => {
  let i = 0;
  return () => ((faces[i++ % faces.length] ?? 1) - 1) / 20;
};

describe('Pathfinder 2e', () => {
  it('grades by ±10 and moves a degree on a natural 20 or 1', () => {
    expect(pf2e.judge(12, 30, 20, false)).toBe('critical success');
    expect(pf2e.judge(12, 20, 20, false)).toBe('success');
    expect(pf2e.judge(12, 19, 20, false)).toBe('failure');
    expect(pf2e.judge(2, 10, 20, false)).toBe('critical failure');
    expect(pf2e.judge(20, 25, 30, false)).toBe('success');
    expect(pf2e.judge(1, 22, 20, false)).toBe('failure');
    expect(pf2e.judge(20, 40, 20, false)).toBe('critical success');
  });

  it('sets DCs by level and proficiency by level and rank', () => {
    expect(pf2e.difficulty('standard', 5)).toBe(20);
    expect(pf2e.difficulty('hard', 1)).toBe(17);
    expect(pf2e.difficulty('standard', undefined)).toBe(15);
    expect(pf2e.proficiency(3, 'expert')).toBe(7);
    expect(pf2e.proficiency(3, 'untrained')).toBe(0);
  });
});

describe('D&D 5e', () => {
  it('succeeds on meeting the DC; 20 and 1 decide only attacks', () => {
    expect(dnd5e.judge(10, 15, 15, false)).toBe('success');
    expect(dnd5e.judge(20, 22, 25, false)).toBe('failure');
    expect(dnd5e.judge(20, 22, 25, true)).toBe('critical success');
    expect(dnd5e.judge(1, 30, 15, true)).toBe('critical failure');
  });

  it('uses the fixed DCs and the proficiency bonus by level, doubled for expertise', () => {
    expect(dnd5e.difficulty('standard', 9)).toBe(15);
    expect(dnd5e.proficiency(1, 'trained')).toBe(2);
    expect(dnd5e.proficiency(5, 'trained')).toBe(3);
    expect(dnd5e.proficiency(17, 'expert')).toBe(12);
  });
});

describe('a check', () => {
  it('keeps the higher d20 with advantage and the lower with disadvantage', () => {
    expect(rollCheck(dnd5e, { bonus: 3, edge: 'advantage' }, dice(4, 17))).toEqual({
      rolls: [4, 17],
      natural: 17,
      total: 20,
    });
    const check = rollCheck(pf2e, { bonus: 3, dc: 15, edge: 'disadvantage' }, dice(4, 17));
    expect(check).toMatchObject({ natural: 4, total: 7, outcome: 'failure' });
  });
});

describe('table instructions', () => {
  it('put house rules after the rules, and leave them out when empty', () => {
    expect(tableInstructions('GM', 'Rules', ' ')).toBe('GM\n\nRules');
    expect(tableInstructions('GM', 'Rules', 'Flanking gives +2')).toContain(
      'House rules, which win over the rules above:\nFlanking gives +2',
    );
  });
});
