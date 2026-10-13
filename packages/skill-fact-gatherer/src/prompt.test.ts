import { describe, expect, it } from 'vitest';
import { gatherPrompt } from './prompt';

describe('gatherPrompt', () => {
  it('says when nothing has happened yet', () => {
    const [, user] = gatherPrompt('Gather.', '', []);
    expect(user?.content).toContain('(nothing has happened yet)');
    expect(user?.content).not.toContain('gathered before');
  });

  it('leaves out earlier facts that are not words', () => {
    const [, user] = gatherPrompt('Gather.', 'A: hi', [{ kind: 'image', data: { assetId: 'x' } }]);
    expect(user?.content).not.toContain('gathered before');
  });
});
