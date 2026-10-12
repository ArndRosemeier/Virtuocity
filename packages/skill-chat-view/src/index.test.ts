import { CHAT_VIEW, renderContract } from '@virtuocity/contract-render';
import { conformanceSuite, conformanceTarget } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { chatViewSkill } from './index';

describe('chat view conforms to render', () => {
  const target = conformanceTarget(renderContract, { skills: [chatViewSkill] });
  for (const testCase of conformanceSuite(renderContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }

  it('draws the story as one chat', async () => {
    const message = { id: 'm1', actorId: 'x', kind: 'text', data: 'Hi', text: 'Hi', createdAt: 0 };
    const { parts } = await target.invoke('render', { messages: [message] });
    expect(parts.map((p) => p.kind)).toEqual([CHAT_VIEW]);
  });
});
