import { describe, expect, it } from 'vitest';
import { coreModule } from './core-module';
import { keptParts } from './kept-parts';
import { ModuleHost, loadModules } from './module';
import type { OutputPart } from './output';
import { SessionRuntime } from './runtime';
import type { Skill, SkillContext } from './skill';

const notes = keptParts('notes', 'Notes kept by each note taker.');
const note = (data: string): OutputPart => ({ kind: 'text', data });

/** Runs `act` as each actor's request, so a test can use a real skill context. */
async function session(act: (ctx: SkillContext) => Promise<void>) {
  const taker: Skill = { id: 'taker', name: 'Taker', backing: 'code', onRequest: act };
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.docTypes.register(notes.doc);
  host.skills.register(taker);
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({}) });
  for (const id of ['a', 'b']) {
    await runtime.join({
      id,
      controller: 'ai',
      personality: { name: id, description: '' },
      skillIds: ['taker'],
    });
  }
  return runtime;
}

describe('keptParts', () => {
  it('keeps the latest parts of each actor apart', async () => {
    const shown: Record<string, OutputPart[]> = {};
    const runtime = await session(async (ctx) => {
      await notes.keep(ctx, [note(`by ${ctx.actor.id}`)]);
      shown[ctx.actor.id] = notes.shown(ctx).parts;
    });
    await runtime.runTurn('a');
    await runtime.runTurn('b');
    await runtime.runTurn('a');
    expect(shown).toEqual({ a: [note('by a')], b: [note('by b')] });
  });

  it('gives a space that shows, discards and redoes the kept parts', async () => {
    let written = 0;
    const refresh = async (ctx: SkillContext) => {
      written += 1;
      await notes.keep(ctx, [note(`Note ${written}`)]);
    };
    const seen: OutputPart[][] = [];
    const space = notes.space(refresh);
    const runtime = await session(async (ctx) => {
      seen.push((await space.redo({}, ctx)).parts);
      seen.push((await space.discard({}, ctx)).parts);
      seen.push((await space.fill({}, ctx)).parts);
    });
    await runtime.runTurn('a');
    expect(seen).toEqual([[note('Note 1')], [], []]);
  });
});
