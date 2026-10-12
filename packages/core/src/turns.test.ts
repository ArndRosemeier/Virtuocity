import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { MessageTree } from './session';
import { leastRecentDirector } from './turns';

const actor = (id: string, controller: Actor['controller'] = 'ai'): Actor => ({
  id,
  controller,
  personality: { name: id, description: '' },
  skillIds: ['conversation'],
});

describe('leastRecentDirector', () => {
  it('picks the AI actor who spoke least recently and never the human', async () => {
    const messages = new MessageTree();
    for (const id of ['bard', 'rogue', 'user']) messages.append({ actorId: id, parts: [] });
    const next = await leastRecentDirector.pickNext({
      candidates: [actor('user', 'human'), actor('rogue'), actor('bard')],
      messages,
    });
    expect(next?.id).toBe('bard');
  });
});
