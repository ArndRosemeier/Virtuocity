import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { implement } from './implementation';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { SessionRuntime } from './runtime';
import { sessionTypeContract, sessionTypeDescribed } from './session-type';
import type { Skill } from './skill';
import { stubContract, stubImplementation } from './testing';

const talking = stubContract('talking');
const painting = stubContract('painting');

const talk: Skill = {
  id: 'talk',
  name: 'Talk',
  backing: 'llm',
  implements: [stubImplementation(talking)],
  takeTurn: async (ctx) => {
    await ctx.post(textContent('words'));
  },
};
const paint: Skill = {
  id: 'paint',
  name: 'Paint',
  backing: 'llm',
  implements: [stubImplementation(painting)],
  onRequest: async (ctx) => {
    await ctx.post(textContent('a picture'));
  },
};
const typeSkill: Skill = {
  id: 'type',
  name: 'Type',
  backing: 'code',
  implements: [
    implement(sessionTypeContract, {
      describe: (_input, ctx) =>
        Promise.resolve({
          castContracts: (ctx.actor.settings?.type as { cast: string[] }).cast,
          roles: [],
          panels: [],
        }),
    }),
  ],
};
const host = loadModules(new ModuleHost(), [coreModule]);
[talk, paint, typeSkill].forEach((s) => host.skills.register(s));

const actor = (id: string, skillIds: string[], cast?: string[]): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: '' },
  skillIds,
  ...(cast ? { settings: { type: { cast } } } : {}),
});
const mira = actor('mira', ['talk', 'paint']);
const brush = actor('brush', ['paint']);
const ids = (actors: readonly Actor[]) => actors.map((a) => a.id);

async function session(cast: string[], library = new Map<string, Actor>()) {
  const room = actor('room', ['type'], cast);
  library.set(room.id, room);
  const runtime = new SessionRuntime({
    host,
    modelDefaults: () => ({}),
    actors: (id) => library.get(id),
  });
  await runtime.join(room);
  await runtime.join(mira);
  await runtime.join(brush);
  return runtime;
}

describe('session types', () => {
  it('decide the cast: actors serving a cast contract, everyone else is support', async () => {
    const roleplay = await session([talking.id]);
    expect(ids(roleplay.speakers())).toEqual(['mira']);
    expect(ids(roleplay.askable())).toEqual(['brush']);
    const images = await session([painting.id]);
    expect(ids(images.speakers())).toEqual(['mira', 'brush']);
    expect(images.askable()).toEqual([]);
  });

  it('let an actor act with its skill serving the first cast contract, in the type’s order', async () => {
    const images = await session([painting.id, talking.id]);
    await images.runTurn('mira');
    const roleplay = await session([talking.id, painting.id]);
    await roleplay.runTurn('mira');
    expect(images.transcript().map((m) => m.text)).toEqual(['a picture']);
    expect(roleplay.transcript().map((m) => m.text)).toEqual(['words']);
  });

  it('follow the type when it is edited in the library', async () => {
    const library = new Map<string, Actor>();
    const runtime = await session([talking.id], library);
    library.set('room', actor('room', ['type'], [painting.id]));
    const described = new Promise((resolve) => runtime.bus.on(sessionTypeDescribed, resolve));
    expect(ids(runtime.speakers())).toEqual(['mira']);
    await described;
    expect(ids(runtime.speakers())).toEqual(['mira', 'brush']);
  });
});
