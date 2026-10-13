import type { Actor } from '@virtuocity/core';
import { castStarter, isSessionType } from '@virtuocity/core';
import { describeSettings } from '@virtuocity/skill-session-type';
import { describe, expect, it } from 'vitest';
import { createHost } from './host';
import { guideLines } from './sessionType';

const host = createHost();
const skills = host.skills.list();
const starters = host.starters.list().flatMap((s) => castStarter(s, skills) ?? []);
const types = starters.filter((a) => isSessionType(a, skills));
const describe_ = (type: Actor) => describeSettings(type.settings?.['session-type']);

describe('the starter session types', () => {
  it('can each be filled with the starter actors: every role is available', () => {
    const missing = types.flatMap((type) =>
      guideLines(describe_(type), skills, starters)
        .filter((line) => !line.available)
        .map((line) => `${type.personality.name}: ${line.role.label}`),
    );
    expect(missing).toEqual([]);
  });

  it('guide the setup wizard: every role asks a question and says what is missing without it', () => {
    const bare = types.flatMap((type) =>
      describe_(type)
        .roles.filter((r) => r.question.trim() === '' || r.without.trim() === '')
        .map((r) => `${type.personality.name}: ${r.label}`),
    );
    expect(bare).toEqual([]);
  });

  it('cast the Painter in an image workflow, so its guide ticks the illustrator', () => {
    const type = types.find((t) => t.id === 'image-workflow');
    const painter = starters.find((a) => a.id === 'painter');
    expect(type && painter).toBeDefined();
    if (!type || !painter) return;
    const [illustrator] = guideLines(describe_(type), skills, [type, painter]);
    expect(illustrator?.actor?.id).toBe('painter');
  });
});
