import type { Release } from './changelog-earlier';
import { EARLIER_RELEASES } from './changelog-earlier';

export type { Release } from './changelog-earlier';

/**
 * One entry per build, newest first. Every change that ships to main adds an
 * entry with the next build number; the version shown is build / 1000.
 */
export const RELEASES: readonly Release[] = [
  {
    build: 64,
    date: '2026-10-13',
    changes: [
      'New session type Guided illustrations: say what you want, a Prompt refiner turns it into a detailed image prompt, and an illustrator (like Ink) paints it on its own. Ask for changes and the refiner rewrites the prompt for the next picture. A ready-made Prompt refiner comes with it.',
    ],
  },
  {
    build: 63,
    date: '2026-10-13',
    changes: [
      'Session types now decide who is in the cast. Each lists its cast skills: actors with one of them take turns, everyone else is support. An actor acts with the first cast skill it has, so an illustrator that can also talk paints in an image workflow and talks in a roleplay.',
      'New session type Image workflow: describe what you want to see and an illustrator paints it. A ready-made Painter, which paints only when it is its turn, comes with it. Add a director to have it answer every prompt on its own.',
      'Every session now has exactly one session type, chosen when you start it and kept for good. The new Open type (every panel, no suggestions) replaces Empty. Sessions from older versions without a type are deleted, and files without one are refused.',
      'Saved setups are gone from the Library; session templates do the same job.',
    ],
  },
  {
    build: 62,
    date: '2026-10-13',
    changes: [
      'The Manual now starts with what Virtuocity is: you and a cast of actors (language models, code, image models) working together, with roleplay and the book room as two session types among many. It then walks through getting started, the screen, making actors and session types, turns, and saving.',
    ],
  },
  {
    build: 61,
    date: '2026-10-13',
    changes: [
      'Session types: Roleplay and Book room are now actors in your Library with the new Session type skill. New session lists them, and the one you pick joins the session and decides which panels it shows and which roles its guide suggests.',
      'Make your own session type in the actor editor: copy Roleplay and change its roles (what each must be able to do, picked from the installed contracts) and its panels. A roleplay with dice, without a director or with only players is just another session type.',
      'Actors without a personality (support actors) now have a short description, shown in lists such as New session.',
      'Ready-made actors from newer versions are offered in your Library once, without bringing back the ones you deleted.',
    ],
  },
  {
    build: 60,
    date: '2026-10-13',
    changes: [
      'Behind the scenes: the "one name, one actor" rule is now guarded automatically. Every change to the app is checked for actor copies in sessions, so the rule cannot quietly break again.',
    ],
  },
  {
    build: 59,
    date: '2026-10-13',
    changes: [
      'One name, one actor, now all the way down: sessions and templates no longer keep their own copies of actors, only which Library actors take part. Editing an actor changes it in every session at once, and retrying or going back to an earlier version never brings back older details. Sessions you already have are converted when you open them.',
      'A session saved to a file still carries its actors, so it works in another browser. Loading it asks about an actor only when your Library has that name with different details.',
      'New: a Manual in the header. It starts with the ideas that work differently from other apps, above all "one name, one actor".',
    ],
  },
  {
    build: 58,
    date: '2026-10-13',
    changes: [
      'Fixed: reloading the page or opening a session no longer asks about "Actors with the same name" when an actor was only edited in your library since the session was last open. Your own sessions always use the library\'s current version of each actor; the question only comes up when you load a file.',
    ],
  },
  {
    build: 57,
    date: '2026-10-13',
    changes: [
      'Sessions can be renamed: open the session list from the header and click the pencil next to a session or template. Names stay unique.',
      'Text in the left sidebar spaces is now smaller by default, the same size as the other small text in the sidebars.',
    ],
  },
  {
    build: 56,
    date: '2026-10-13',
    changes: [
      'Retrying an answer keeps the old one. A retried message shows "‹ 2/2 ›": step back to an earlier version and everything that followed it comes back with it; the newest version is shown by default. Anything new you write then continues from the version you picked.',
    ],
  },
  {
    build: 55,
    date: '2026-10-13',
    changes: [
      'Every space in the left sidebar can now be closed and its content deleted, as a general rule for all spaces. A closed space leaves a "Show" button so you can bring it back. Deleting empties the Fact gatherer\'s list and a canvas, and makes a Chronicler forget its summary (it writes a fresh one from the whole story at its next update).',
      "The Fact gatherer's space has a Retry button that gathers the facts again right away.",
    ],
  },
  {
    build: 54,
    date: '2026-10-13',
    changes: [
      'Drag the bottom edge of a space in the left sidebar to make it taller or shorter; double-click the edge to go back to a third of the sidebar. Each space remembers its height in this browser.',
    ],
  },
  {
    build: 53,
    date: '2026-10-13',
    changes: [
      'Editing a message keeps your change when you click elsewhere; there is no Save button any more. Revert (or Escape) drops the change.',
      'Fixed: retrying an answer after editing or deleting an earlier message brought the old message back. An edit now changes the message itself instead of being a later step, so nothing can undo it by going back in time.',
    ],
  },
  {
    build: 52,
    date: '2026-10-13',
    changes: [
      'New skill "Fact gatherer": reads the whole session and keeps a list of the facts it has established (people, places, things, relationships, events, open threads) in its own space. Like the Illustrator it acts only when you click it under "or ask:", unless you turn on "automatic" to have it gather after every turn. Its prompt is editable in the actor\'s settings and starts with a sensible default. You can correct the list in its space, and the next gathering keeps your corrections.',
    ],
  },
  {
    build: 51,
    date: '2026-10-13',
    changes: [
      'Chroniclers summarize less often and leave more of the story as it is: by default they keep the newest 8000 tokens out of the summary (was 2000) and update it once 6000 tokens of older story are new (was 1500). Chroniclers whose settings you never changed get the new values; ones you edited keep theirs.',
    ],
  },
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
