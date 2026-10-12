import type { Release } from './changelog-earlier';
import { EARLIER_RELEASES } from './changelog-earlier';

export type { Release } from './changelog-earlier';

/**
 * One entry per build, newest first. Every change that ships to main adds an
 * entry with the next build number; the version shown is build / 1000.
 */
export const RELEASES: readonly Release[] = [
  {
    build: 33,
    date: '2026-10-12',
    changes: [
      'Each time a Chronicler updates its summary, it leaves a short note in the chat, such as "Updated the story so far (240 words)". Only you see the note; the other actors read the summary itself.',
    ],
  },
  {
    build: 32,
    date: '2026-10-12',
    changes: [
      'The roleplay renderer shows markdown in colors: italics blue, bold rose, headings purple, quotes green, code teal, and speech stays amber. Struck-through text is greyed out.',
      'Everything the roleplay renderer draws (lists, quotes, hidden notes, headings) uses the same story size as the plain view; headings are larger.',
    ],
  },
  {
    build: 31,
    date: '2026-10-12',
    changes: [
      'A Stop button sits next to whoever is writing. It cancels a stuck or unwanted answer right away, keeps nothing of it, and the session waits for you again. It works for retries too.',
    ],
  },
  {
    build: 30,
    date: '2026-10-12',
    changes: [
      'Every AI response has a retry button. It takes that response and everything after it back, and the same actor answers again. On an older response, everything below it goes away.',
    ],
  },
  {
    build: 29,
    date: '2026-10-12',
    changes: [
      'The roleplay renderer shows paragraphs apart again: there is a blank line between them, as the model wrote it, instead of a thin gap that made them run together.',
    ],
  },
  {
    build: 28,
    date: '2026-10-12',
    changes: [
      'A Premise actor has a "Show the premise in the chat" setting. Turn it off and the premise stays hidden from you: only the AI actors see it, so the narrator knows the setup and you discover it as you play.',
    ],
  },
  {
    build: 27,
    date: '2026-10-12',
    changes: [
      'Both sidebars can be resized: drag their inner edge (or focus it and use the arrow keys). The width is remembered in this browser; double-click the edge to go back to the default.',
    ],
  },
  {
    build: 26,
    date: '2026-10-12',
    changes: [
      'Actors now read the whole story by default, so nothing is cut from what they remember. You can still set a memory limit per actor in Edit actor › Conversation; leave it empty for no limit.',
      'Chroniclers no longer have a summary length. They write as much as the story needs and keep every detail that may still matter, so long sessions keep their history.',
    ],
  },
  {
    build: 25,
    date: '2026-10-12',
    changes: [
      'One premise skill, now just called "Premise": you write the opening yourself, and Transform by AI turns a few words into a full premise. "Premise (from a prompt)" is gone; actors that used it now use Premise, with what you had asked for as their premise text.',
      'A new actor starts with no skills, so the editor asks only for what the skills you pick need. Before, every new actor had Conversation ticked, so a new Chronicler also talked and showed personality and appearance fields it does not use.',
      'Number settings such as a chronicler\'s summary words are plain fields you type into, without up and down arrows. Typing works now: before, a number outside the allowed range while typing (like "3" on the way to "300") snapped back to the default. Values outside the range are kept within it.',
    ],
  },
  {
    build: 24,
    date: '2026-10-12',
    changes: [
      'Removing an actor from the Cast panel only takes it out quietly if it has not done anything in the session yet. Once it has, removing it warns you and deletes the session, so no message is ever left without its author. The actor stays in your Library.',
    ],
  },
  {
    build: 23,
    date: '2026-10-12',
    changes: [
      'Transform by AI: text fields that hold more than a few words (personality, appearance, a premise, a system prompt, an illustration style…) have a Transform by AI button. Write a few words like "grumpy teen" and the default text model turns them into a fuller text. Undo brings your words back.',
      'Deleting an actor that is in the session now warns you and deletes the session with it. No more "remove from the session" choice.',
    ],
  },
  {
    build: 22,
    date: '2026-10-12',
    changes: [
      'One actor, one identity: adding an actor puts that very actor in the session, not a copy. Editing it anywhere changes it everywhere; the edit dialog says so.',
      'Names are unique. Copying an actor asks for a new name, and saving a name another actor has is refused.',
      'No built-in characters any more. The Narrator, Wren and the others are ordinary actors added to your Library once, on the first start; edit or delete them freely.',
      'Setups no longer add actors. Starting Roleplay opens an empty session with a guide in the Cast panel: a narrator is the usual start; AI players, a premise, an illustrator and a chronicler are options. It ticks off as you add actors. Hide it per session, or turn it off in Settings › Appearance.',
      'Deleting an actor that is in the session asks whether to remove it from the session or start a new session.',
      'Loading a session file adds its actors to your Library. If a name is already taken by a different actor, you choose: keep yours or use the loaded one.',
      'A premise added to an empty session now opens it right away.',
      'The main panel is now called Session instead of Story, since a session can be anything, not only a story.',
    ],
  },
  {
    build: 21,
    date: '2026-10-12',
    changes: [
      'The Library is wider, with actors and setups side by side.',
      'Filter the Library by skill: tags at the top list the skills your actors and setups use. Pick one or more to see only the items that have all of them. Your pick is remembered for the next time you open the Library.',
      'Add actor now opens the Library to pick from: Add puts the actor in the scene and closes it. New actor is there too.',
      'The Library has a New actor button: in the Library it saves the new actor for reuse; from Add actor it also adds it to the scene.',
    ],
  },
  ...EARLIER_RELEASES,
];

export function formatVersion(build: number): string {
  return (build / 1000).toFixed(3);
}

export function currentRelease(releases: readonly Release[] = RELEASES): Release {
  const [latest] = releases;
  if (!latest) throw new Error('The changelog is empty');
  return latest;
}

/** Releases newer than the build the user last saw, newest first. */
export function unseen(lastSeen: number, releases: readonly Release[] = RELEASES): Release[] {
  return releases.filter((r) => r.build > lastSeen);
}
