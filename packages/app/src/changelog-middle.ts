import type { Release } from './changelog-earlier';

/** Builds 34 to 54, newest first; kept apart so the changelog stays short. */
export const MIDDLE_RELEASES: readonly Release[] = [
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
];
