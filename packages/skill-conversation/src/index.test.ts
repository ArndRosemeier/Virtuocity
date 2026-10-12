import { describe, expect, it } from 'vitest';
import type { Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  TOOL_USE,
  action,
  coreModule,
  defineContract,
  implement,
  loadModules,
  scriptedProvider,
  z,
} from '@virtuocity/core';
import { conversationSkill } from './index';
import { messageText } from './prompt';

const coin = defineContract({
  name: 'coin',
  version: '1.0',
  description: 'Flips a coin',
  actions: {
    flip: action({
      description: 'Flip a coin',
      input: z.object({}),
      output: z.enum(['heads', 'tails']),
    }),
  },
});
const coinSkill: Skill = {
  id: 'coin',
  name: 'Coin',
  backing: 'code',
  implements: [implement(coin, { flip: () => Promise.resolve('heads' as const) })],
};

describe('conversation skill', () => {
  it('uses the actor’s other skills as tools and shows the calls in its message', async () => {
    const host = loadModules(new ModuleHost(), [coreModule]);
    host.skills.register(conversationSkill);
    host.skills.register(coinSkill);
    host.providers.register(
      scriptedProvider([
        { toolCalls: [{ id: 'f', name: 'coin_flip', arguments: '{}' }] },
        ' Heads, I win. ',
      ]),
    );
    const session = new SessionRuntime({
      host,
      providerId: 'scripted',
      directorId: 'least-recent',
      modelDefaults: () => ({ text: 'm' }),
    });
    await session.join({
      id: 'vex',
      controller: 'ai',
      personality: { name: 'Vex', description: 'A gambler.' },
      skillIds: ['conversation', 'coin'],
    });
    await session.runTurn('vex');
    const message = session.transcript().at(-1);
    expect(message?.parts).toEqual([
      { kind: TOOL_USE, data: { tool: 'coin_flip', input: {}, output: 'heads' } },
      { kind: 'text', data: 'Heads, I win.' },
    ]);
    expect(message?.stats).toHaveLength(2);
    expect(message && messageText(message)).toBe('[coin_flip {} → "heads"]\nHeads, I win.');
  });
});
