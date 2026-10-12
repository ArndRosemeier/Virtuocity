import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { leastRecentDirector } from './turns';

const actor = (id: string, controller: Actor['controller'] = 'ai'): Actor => ({
  id,
  controller,
  personality: { name: id, description: '' },
  skillIds: ['conversation'],
});

describe('leastRecentDirector', () => {
  it('picks the AI actor who spoke least recently and never the human', async () => {
    const transcript = ['bard', 'rogue', 'user'].map((actorId, i) => ({
      id: `m${i}`,
      actorId,
      kind: 'text',
      data: '',
      text: '',
      createdAt: i,
    }));
    const next = await leastRecentDirector.pickNext({
      candidates: [actor('user', 'human'), actor('rogue'), actor('bard')],
      transcript,
    });
    expect(next?.id).toBe('bard');
  });
});
