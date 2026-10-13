import type { Release } from './changelog-earlier';
import { EARLIER_RELEASES } from './changelog-earlier';

export type { Release } from './changelog-earlier';

/**
 * One entry per build, newest first. Every change that ships to main adds an
 * entry with the next build number; the version shown is build / 1000.
 */
export const RELEASES: readonly Release[] = [
  {
    build: 50,
    date: '2026-10-13',
    changes: [
      'The Director skill is now plain code, with no model involved: the AI who spoke least recently answers next. Your Director actors keep working and become this one.',
      'New skill "Director (decision model)": asks a decision model who should speak next, given the session and the actor\'s description of how to direct. It uses Jev from TypeSafe by default (through your OpenRouter key; very cheap). Settings > Models has a new "Decisions" choice to pick another decision model.',
    ],
  },
  {
    build: 49,
    date: '2026-10-13',
    changes: [
      'A session has one director at most. Once a director is in the session, other directors in the Library show "a director is here" instead of Add, and an actor in the session can\'t be given a director skill while another one directs.',
    ],
  },
  {
    build: 48,
    date: '2026-10-13',
    changes: [
      'Directors: who speaks next is now up to a director actor. The new Director skill reads the session and picks the next speaker, or hands the turn back to you. A "Director" actor is offered in the Library on a fresh start and listed as an option in the Roleplay setup guide.',
      'Without a director in the session, nobody answers on their own: after you act, click who should speak. Pass shows only when the session has a director. Add a Director to a session to get automatic answers back.',
    ],
  },
  {
    build: 47,
    date: '2026-10-12',
    changes: [
      'The story stays scrolled to its end when a reply finishes, also when the roleplay view folds away hidden parts. If you scrolled up to read, it leaves you there.',
    ],
  },
  {
    build: 46,
    date: '2026-10-12',
    changes: [
      'WIRO is gone again: its API refuses calls from web pages, and a proxy per user was not worth the trouble. Pictures come from OpenRouter or OpenAI. A model you had picked from WIRO shows as "wiro (no key)"; pick another one there.',
    ],
  },
  {
    build: 45,
    date: '2026-10-12',
    changes: [
      'WIRO works from the browser again: its API refuses calls from web pages, so Settings > Connection > WIRO now takes a proxy URL next to the key. A link there gives you a tiny proxy script to deploy once as a free Cloudflare Worker. WIRO shows up in the pickers once both are set.',
    ],
  },
  {
    build: 44,
    date: '2026-10-12',
    changes: [
      'More providers: besides OpenRouter you can now use OpenAI and Anthropic directly for text (and OpenAI for pictures), and WIRO for pictures. Settings > Connection has one key field per provider; every key stays in this browser.',
      'Every model picker has two steps: first the provider, then its model. A provider shows up once its key is set.',
      'Your existing model choices keep working as OpenRouter models, and your OpenRouter key is kept. Save all never includes any API key.',
    ],
  },
  {
    build: 43,
    date: '2026-10-12',
    changes: [
      'When an AI answer is done, the cursor is back in the input line, so you can type your next move right away. It stays put while you are editing a message or typing in a dialog.',
    ],
  },
  {
    build: 42,
    date: '2026-10-12',
    changes: [
      'Sessions have names and stay: New session asks for a name and keeps the one you had. The session name at the top opens your session list, where you switch between sessions and delete them.',
      'Templates: tick Template on a session to list it under Templates. Using a template asks for a name and starts a new session from a copy; the template stays as it is.',
      'Loading a session from a file adds it as a new named session.',
      'Deleting an actor deletes every saved session that has it, templates included, after a warning that names them.',
    ],
  },
  {
    build: 41,
    date: '2026-10-12',
    changes: [
      'Hover over an actor to see what it is: whether a person plays it, its skills, and the start of its description. This works in the Library, the Cast panel, the "let speak" and "ask" buttons, and on the names and pictures above messages.',
    ],
  },
  {
    build: 40,
    date: '2026-10-12',
    changes: [
      'The Memory panel is gone from the sidebar. A chronicler\'s summary now shows through the "Summarized" marker in the story: click it to open the summary.',
    ],
  },
  {
    build: 39,
    date: '2026-10-12',
    changes: [
      'Settings has a new "Save & load" tab. Save all writes everything (the session, the whole Library, all pictures and all settings) into one zip file you pick. Your OpenRouter key is never included.',
      'Load all reads such a zip file and, after a warning, replaces everything with what is in it. Nothing of the old state is kept except your OpenRouter key.',
      'The header buttons that save and load a single session now say so in their tooltips.',
    ],
  },
  {
    build: 38,
    date: '2026-10-12',
    changes: [
      'Image models that only draw, such as Grok Imagine, work now. Each image model is asked for exactly what it can output: pictures only, or pictures and text.',
    ],
  },
  {
    build: 37,
    date: '2026-10-12',
    changes: [
      'Every message has a Delete button (trash). It takes only that message out of the story; everything after it stays.',
      "An illustrator's space has Retry and Delete buttons. Retry paints the picture again from the same description and replaces it in the space and in the story. Delete removes it from both, and the space falls back to the previous picture.",
      'Retry on a picture in the story works like any retry: it drops that picture and everything after it, then paints again.',
    ],
  },
  {
    build: 36,
    date: '2026-10-12',
    changes: [
      'A Chronicler no longer writes a note into the chat. Instead, a small "Summarized" line appears after the last message its summary covers. Click it to open the summary in the left sidebar; close it with the X.',
      "Any actor can place such lines in the story (a new marker contract), and both renderers draw them. Clicking one opens that actor's space.",
      'Each space in the left sidebar takes a third of its height and scrolls inside, so three fit without scrolling the sidebar.',
    ],
  },
  {
    build: 35,
    date: '2026-10-12',
    changes: [
      "Edit any text message, yours or an actor's: click the pencil next to its name, change the text and Save (Ctrl+Enter), or Cancel (Esc). Only that message changes; everything after it stays. Use Retry if you want the rest redone.",
    ],
  },
  {
    build: 34,
    date: '2026-10-12',
    changes: [
      'Illustrators have a new setting, "Paint on its own after other actors\' turns". Turn it off and an illustrator only paints when you click it under "or ask:" next to the speakers. It paints the newest message, so write what you want to see first, then click it.',
      'Clicking an illustrator works with the setting on too, for an extra picture of the newest message. Retry and Stop work for these pictures as well.',
    ],
  },
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
