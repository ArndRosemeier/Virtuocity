import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Blueprint } from './blueprint';
import {
  blueprintProblems,
  castBlueprint,
  defaultChoices,
  defineBlueprint,
  roleNeeds,
} from './blueprint';
import { action, defineContract } from './contract';
import { coreModule } from './core-module';
import { implement } from './implementation';
import { ModuleHost, loadModules } from './module';
import { SessionRuntime } from './runtime';
import { currentBlueprint, startBlueprint, startSavedSetup } from './setup';
import type { Skill } from './skill';

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
const stage = defineBlueprint({
  id: 'stage',
  name: 'Stage',
  description: 'A narrator and a painter.',
  roles: [
    { id: 'narrator', personality: person('Narrator'), speaks: true, settings: { talk: { a: 1 } } },
    { id: 'painter', personality: person('Painter'), needs: [painter], optional: true },
  ],
  layout: { panels: ['cast'] },
});

describe('blueprints', () => {
  it('rejects two roles with one id', () => {
    const role = { id: 'a', personality: person('A') };
    expect(() => defineBlueprint({ ...stage, roles: [role, role] })).toThrow('two roles');
  });

  it('lists what each role needs and which skills can do it', () => {
    const [narrator, painting] = stage.roles.map((r) => roleNeeds(r, [talk, paint]));
    expect(narrator?.map((n) => [n.id, n.options.map((s) => s.id)])).toEqual([
      ['speaks', ['talk']],
    ]);
    expect(painting?.map((n) => [n.id, n.options.map((s) => s.id)])).toEqual([
      ['painter@1.0', ['paint']],
    ]);
  });

  it('picks the first skill for each need and casts the actors', () => {
    const choices = defaultChoices(stage, [talk, paint]);
    expect(choices).toEqual({
      narrator: { included: true, skillIds: ['talk'] },
      painter: { included: true, skillIds: ['paint'] },
    });
    const [narrator, painting] = castBlueprint(stage, choices);
    expect(narrator).toEqual({
      id: 'narrator',
      controller: 'ai',
      personality: person('Narrator'),
      skillIds: ['talk'],
      settings: { talk: { a: 1 } },
    });
    expect(painting?.skillIds).toEqual(['paint']);
  });

  it('leaves out optional roles nobody can fill, and roles the user dropped', () => {
    expect(defaultChoices(stage, [talk]).painter?.included).toBe(false);
    expect(blueprintProblems(stage, [talk])).toEqual([]);
    const dropped = {
      ...defaultChoices(stage, [talk, paint]),
      narrator: { included: false, skillIds: [] },
    };
    expect(castBlueprint(stage, dropped).map((a) => a.id)).toEqual(['painter']);
  });

  it('explains why a required role cannot be filled', () => {
    expect(blueprintProblems(stage, [paint])).toEqual([
      'No installed skill can fill "speaks" for Narrator.',
    ]);
  });

  it('records the blueprint in the session and casts its actors', async () => {
    const { host, session } = stageSession();
    expect(currentBlueprint(session, host.blueprints)).toBeUndefined();
    const blueprint: Blueprint = stage;
    await startBlueprint(session, blueprint, castBlueprint(stage, defaultChoices(stage, [talk])));
    expect(currentBlueprint(session, host.blueprints)?.id).toBe('stage');
    expect(session.actors.map((a) => a.id)).toEqual(['narrator']);
    const saved = session.save();
    await session.workspace.load([], null);
    expect(currentBlueprint(session, host.blueprints)).toBeUndefined();
    await session.load(saved);
    expect(currentBlueprint(session, host.blueprints)?.id).toBe('stage');
  });

  it('starts a saved setup with the layout of its blueprint, if installed', async () => {
    const { host, session } = stageSession();
    const actors = castBlueprint(stage, defaultChoices(stage, [talk]));
    const setup = {
      kind: 'setup',
      id: 's',
      savedAt: 0,
      name: 'Mine',
      description: '',
      actors,
    } as const;
    await startSavedSetup(session, { ...setup, blueprintId: 'stage' }, host.blueprints);
    expect(currentBlueprint(session, host.blueprints)?.id).toBe('stage');
    await session.workspace.load([], null);
    await startSavedSetup(session, { ...setup, blueprintId: 'gone' }, host.blueprints);
    expect(currentBlueprint(session, host.blueprints)).toBeUndefined();
    expect(session.actors.map((a) => a.id)).toEqual(['narrator']);
  });
});

function stageSession() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(talk);
  host.blueprints.register(stage);
  const session = new SessionRuntime({
    host,
    providerId: 'none',
    directorId: 'least-recent',
    modelDefaults: () => ({}),
  });
  return { host, session };
}
