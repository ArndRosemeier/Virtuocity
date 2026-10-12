import { CHAT_VIEW, renderContract } from '@virtuocity/contract-render';
import type { ChatView } from '@virtuocity/contract-render';
import { conformanceSuite, conformanceTarget } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { RICH_TEXT, roleplayRendererActor, roleplayViewSkill } from './index';

describe('roleplay view conforms to render', () => {
  const target = conformanceTarget(renderContract, { skills: [roleplayViewSkill] });
  for (const testCase of conformanceSuite(renderContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }

  it('formats text messages and leaves other kinds as they are', async () => {
    const text = '*nods* <hidden>plan</hidden>';
    const messages = [
      { id: '1', actorId: 'n', kind: 'text', data: text, text, createdAt: 0 },
      {
        id: '2',
        actorId: 'n',
        kind: 'image',
        data: { assetId: 'a' },
        text: 'A gate',
        createdAt: 1,
      },
    ];
    const { parts } = await target.invoke('render', { messages });
    expect(parts.map((p) => p.kind)).toEqual([CHAT_VIEW]);
    const [first, second] = (parts[0]?.data as ChatView).entries;
    expect(first?.part.kind).toBe(RICH_TEXT);
    expect(second?.part).toEqual({ kind: 'image', data: { assetId: 'a' } });
  });
});

describe('the Roleplay renderer actor', () => {
  it('holds the system prompt and the view, with the hidden-notes prompt set', () => {
    expect(roleplayRendererActor.skillIds).toEqual(['system-prompt', 'roleplay-view']);
    expect(JSON.stringify(roleplayRendererActor.settings)).toContain('<hidden>');
  });
});
