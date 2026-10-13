import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { CAST } from './cast';
import { includeKnownActors, withActorsWritten } from './cast-refs';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { SessionRuntime } from './runtime';

const host = loadModules(new ModuleHost(), [coreModule]);
const wren: Actor = {
  id: 'wren',
  controller: 'ai',
  personality: { name: 'Wren', description: 'Quiet.' },
  skillIds: [],
};
const you: Actor = {
  ...wren,
  id: 'you',
  controller: 'human',
  personality: { name: 'You', description: '' },
};

/** A session whose lookup stands in for the library. */
function setup() {
  const library = new Map<string, Actor>();
  const session = new SessionRuntime({
    host,
    modelDefaults: () => ({}),
    actors: (id) => library.get(id),
  });
  return { library, session };
}
const castPayloads = (session: SessionRuntime) =>
  session.workspace.log
    .all()
    .filter((op) => op.docId === CAST)
    .map((op) => op.payload);

describe('library actors in a session', () => {
  it('includes an actor the lookup knows by id, and keeps any other one', async () => {
    const { library, session } = setup();
    library.set('wren', wren);
    await session.join(wren);
    await session.join(you);
    expect(castPayloads(session)).toEqual([
      { type: 'include', actorId: 'wren' },
      { type: 'join', actor: you },
    ]);
    expect(session.actors).toEqual([wren, you]);
  });

  it('shows an included actor as the library has it now, also after rewinding', async () => {
    const { library, session } = setup();
    library.set('wren', wren);
    await session.join(wren);
    const hello = await session.post('you', textContent('hello'));
    const loud = { ...wren, personality: { name: 'Wren', description: 'Loud.' } };
    library.set('wren', loud);
    expect(session.actors).toEqual([loud]);
    await session.rewindToMessage(hello.id, { before: true });
    expect(session.actors).toEqual([loud]);
  });

  it('turns held copies into includes once the library knows them', async () => {
    const { library, session } = setup();
    await session.join(wren);
    library.set('wren', wren);
    await includeKnownActors(session);
    expect(castPayloads(session)).toEqual([{ type: 'include', actorId: 'wren' }]);
  });

  it('writes the included actors into a saved session for a file', async () => {
    const { library, session } = setup();
    library.set('wren', wren);
    await session.join(wren);
    const saved = withActorsWritten(session.save(), session.lookup);
    expect(saved.operations.map((op) => op.payload)).toEqual([{ type: 'join', actor: wren }]);
  });
});
