import { writerContract } from '@virtuocity/contract-writing';
import { conformanceSuite, conformanceTarget, scriptedProvider } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { writePrompt, writerSkill } from './index';

describe('writer skill conforms to writer', () => {
  const provider = scriptedProvider(() => '  The house had been waiting for her.  ');
  const target = conformanceTarget(writerContract, { skills: [writerSkill], provider });
  for (const testCase of conformanceSuite(writerContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('writePrompt', () => {
  it('includes the previous draft and notes only when revising', () => {
    const actor = {
      id: 'w',
      controller: 'ai' as const,
      personality: { name: 'Ada', description: 'Spare prose.' },
      skillIds: [],
    };
    const fresh = writePrompt(actor, { brief: 'Chapter one' })[1]?.content ?? '';
    expect(fresh).not.toMatch(/previous draft/);
    const revision =
      writePrompt(actor, { brief: 'Chapter one', previousDraft: 'Draft', notes: ['Slower'] })[1]
        ?.content ?? '';
    expect(revision).toMatch(/previous draft[\s\S]*Draft[\s\S]*- Slower/);
  });
});

describe('target length', () => {
  it('asks for the configured number of words', () => {
    const ada = {
      id: 'ada',
      controller: 'ai' as const,
      personality: { name: 'Ada', description: '' },
      skillIds: [],
    };
    expect(writePrompt(ada, { brief: 'x' }, 250)[0]?.content).toContain('about 250 words');
  });
});
