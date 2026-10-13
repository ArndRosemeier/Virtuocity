import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { action, defineContract } from './contract';
import { coreModule } from './core-module';
import { implement } from './implementation';
import { arrangeSlot } from './layout';
import { ModuleHost, loadModules } from './module';
import { SessionRuntime } from './runtime';
import { SETUP, hideGuide, sessionStarted, setupDoc, startSavedSetup, startSession } from './setup';
import type { Skill } from './skill';
import { rivalFor, serves } from './skill';
import type { Starter } from './starter';
import { castStarter, starterNeeds } from './starter';

const painter = defineContract({
  name: 'painter',
  version: '1.0',
  description: 'Paints',
  actions: { paint: action({ description: 'Paint', input: z.object({}), output: z.string() }) },
});

const talk: Skill = { id: 'talk', name: 'Talk', backing: 'llm', takeTurn: () => Promise.resolve() };
const paint: Skill = {
  id: 'paint',
  name: 'Paint',
  backing: 'llm',
  implements: [implement(painter, { paint: () => Promise.resolve('a picture') })],
};

const person = (name: string) => ({ name, description: `${name} is here.` });
const narrator: Starter = {
  id: 'narrator',
  personality: person('Narrator'),
  speaks: true,
  settings: { talk: { a: 1 } },
};
const painting: Starter = { id: 'painter', personality: person('Painter'), needs: [painter] };

describe('layouts', () => {
  const items = [
    { id: 'feed', slot: 'main' },
    { id: 'book', slot: 'main' },
    { id: 'cast', slot: 'side' },
  ];

  it('shows the named panels in their order, and nothing else of any slot', () => {
    const panels = ['book', 'feed', 'missing'];
    expect(arrangeSlot(items, 'main', panels).map((i) => i.id)).toEqual(['book', 'feed']);
    expect(arrangeSlot(items, 'side', panels)).toEqual([]);
  });

  it('shows everything when no panels are named', () => {
    expect(arrangeSlot(items, 'side').map((i) => i.id)).toEqual(['cast']);
    expect(arrangeSlot(items, 'main', []).map((i) => i.id)).toEqual(['feed', 'book']);
  });
});

describe('starters', () => {
  it('list what they need and which skills can do it', () => {
    expect(starterNeeds(narrator, [talk, paint]).map((n) => [n.id, n.options.length])).toEqual([
      ['speaks', 1],
    ]);
    expect(starterNeeds(painting, [talk]).map((n) => [n.id, n.options.length])).toEqual([
      ['painter@1.0', 0],
    ]);
  });

  it('become actors with the first skill for every need', () => {
    expect(castStarter(narrator, [paint, talk])).toEqual({
      id: 'narrator',
      controller: 'ai',
      personality: person('Narrator'),
      skillIds: ['talk'],
      settings: { talk: { a: 1 } },
    });
  });

  it('are left out when a need has no skill', () => {
    expect(castStarter(painting, [talk])).toBeUndefined();
  });
});

describe('one per session', () => {
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: person(id),
    skillIds,
  });

  it('finds the actor already serving a contract a session has one of', () => {
    const first = actor('a', ['paint']);
    const second = actor('b', ['paint']);
    expect(serves(first, [paint], painter)).toBe(true);
    expect(rivalFor(painter, second, [first], [paint])?.id).toBe('a');
    expect(rivalFor(painter, first, [first], [paint])).toBeUndefined();
    expect(rivalFor(painter, actor('c', ['talk']), [first], [paint, talk])).toBeUndefined();
  });
});

describe('starting sessions', () => {
  it('casts the actors, then announces the start once', async () => {
    const session = stageSession();
    const started: unknown[] = [];
    session.bus.on(sessionStarted, (e) => void started.push(e.payload));
    const cast = castStarter(narrator, [talk]);
    await startSession(session, cast ? [cast] : []);
    expect(session.actors.map((a) => a.id)).toEqual(['narrator']);
    expect(started).toEqual([{}]);
    await session.load(session.save());
    expect(started).toHaveLength(1);
  });

  it('starts a saved setup with the library actors still there', async () => {
    const session = stageSession();
    const cast = castStarter(narrator, [talk]);
    const setup = {
      kind: 'setup',
      id: 's',
      savedAt: 0,
      name: 'Mine',
      description: '',
      actorIds: ['narrator', 'deleted'],
    } as const;
    await startSavedSetup(session, setup, cast ? [cast] : []);
    expect(session.actors.map((a) => a.id)).toEqual(['narrator']);
  });

  it('remembers a hidden guide, and ignores blueprints recorded by older versions', async () => {
    const session = stageSession();
    await session.workspace.change({
      actorId: 'blueprint:old',
      docId: SETUP,
      docType: setupDoc,
      payload: { type: 'use-blueprint', blueprintId: 'old' },
    });
    expect(session.workspace.read(SETUP, setupDoc)).toEqual({});
    await hideGuide(session);
    expect(session.workspace.read(SETUP, setupDoc)).toEqual({ guideHidden: true });
  });
});

function stageSession() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(talk);
  return new SessionRuntime({ host, modelDefaults: () => ({}) });
}
