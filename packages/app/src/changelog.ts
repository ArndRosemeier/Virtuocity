/**
 * One entry per build, newest first. Every change that ships to main adds an
 * entry with the next build number; the version shown is build / 1000.
 */
export interface Release {
  readonly build: number;
  /** ISO date, e.g. `2026-10-12`. */
  readonly date: string;
  readonly changes: readonly string[];
}

export const RELEASES: readonly Release[] = [
  {
    build: 17,
    date: '2026-10-12',
    changes: [
      'A story is now a collection of messages, and a message can be anything (text, a picture, a tool call) as long as it also reads as text. Prompts and summaries read that text, so a picture counts with its caption.',
      'How the story looks is now up to a story view. The standard Chat view looks exactly as before; future views (prose, storyboard) can draw the same messages differently.',
      'Pick the view for new stories in Settings › Appearance, and change it for the current story at the bottom of the Cast panel.',
      'A turn with tool calls now posts each call as its own message before the reply. Older stories are converted when they load.',
    ],
  },
  {
    build: 16,
    date: '2026-10-12',
    changes: [
      'The actor dialog is wider, with two columns, so it rarely needs scrolling.',
      'It only asks for what the chosen skills use: Personality for skills that voice a character (Conversation, Writer, Reviewer), Appearance for characters, and models only for the kinds of output the skills produce. A Canvas or Dice roller actor now needs just a name.',
      'The Illustrator takes its look from its Style setting instead of its personality; the Roleplay illustrator Ink paints in loose, warm watercolour as before.',
    ],
  },
  {
    build: 15,
    date: '2026-10-12',
    changes: [
      'A new left sidebar gives some actors their own space on screen. Actors whose skills offer a space show it there; the rest get none. The Illustrator shows its latest picture in its space.',
      'A new Canvas skill gives any actor a blank space you can write in. Add it to an actor in the Edit dialog.',
      'Every space has a maximize button to show it full screen for a while (Escape or the button brings it back). Pictures and other content stretch to fill whatever room the space gets.',
      'The story now uses all the room between the two sidebars.',
    ],
  },
  {
    build: 14,
    date: '2026-10-12',
    changes: [
      'Roleplay can open with a premise. The new Premise actor never speaks; it only sets up where the story begins, as the first message, when a session starts.',
      "Two kinds of premise, interchangeable because both fill the same premise contract: a fixed text you write yourself, or a fresh one a model writes from your prompt. Set either in the Premise actor's settings.",
    ],
  },
  {
    build: 13,
    date: '2026-10-12',
    changes: [
      'Fixed: image-only models (such as Muse Image) failed with "Use the /api/v1/images endpoint instead". Virtuocity now sends them to OpenRouter\'s image endpoint, with cost shown as usual.',
    ],
  },
  {
    build: 12,
    date: '2026-10-12',
    changes: [
      'Roleplay gets a Chronicler who remembers the story. Once the story grows longer than the actors can read, it writes a summary of the older part, and every actor reads that summary before the recent messages. The story itself is never shortened.',
      'Two chroniclers to choose from, interchangeable because both fill the same summarizer contract: a differential one that folds new events into the last summary, and a full one that rereads the whole story each time.',
      'A new Memory panel shows each summary. Edit it to correct what the actors remember, or rebuild it from scratch after the next turn.',
    ],
  },
  {
    build: 11,
    date: '2026-10-12',
    changes: [
      'The Library now shows everything: the built-in setups (Roleplay, Book room) and their actors, marked built-in, next to the ones you saved. Add any of them to the scene.',
      'Copy any actor to make a variation: in the Library a copy is saved and opens for editing, and in the cast the copy joins the scene. Built-in actors stay protected; your saved actors can now be edited.',
    ],
  },
  {
    build: 10,
    date: '2026-10-12',
    changes: [
      'Fixed: switching to the Manuscript tab no longer crashes the app in newer browsers.',
      'Virtuocity now has its lantern as the browser tab icon.',
    ],
  },
  {
    build: 9,
    date: '2026-10-12',
    changes: [
      'Now showing: the latest picture of the scene stays up beside the story and is replaced as the story moves on.',
      'The Illustrator can paint only the scene and keep the story free of pictures: turn off "In story" in its settings.',
    ],
  },
  {
    build: 8,
    date: '2026-10-12',
    changes: [
      'Book room opens on the Manuscript: every chapter with its brief, status and latest draft, laid out to read like a book.',
      'Each setup decides its main view and controls: the book room drops the chat box it never used, and roleplay stays a story with a composer.',
      'Sessions without a setup show tabs to switch between the Story and the Manuscript.',
    ],
  },
  {
    build: 7,
    date: '2026-10-12',
    changes: [
      'Library: save an actor with the bookmark next to their name, then add them to any later session from the Library.',
      'Save the whole cast as your own setup in the Library, and start it again from New session.',
      'Export and import the Library as a file to keep it safe or share it.',
    ],
  },
  {
    build: 6,
    date: '2026-10-12',
    changes: [
      'Ready-made setups: New session lets you start a Roleplay (a narrator, a companion and an illustrator) or a Book room (a writer and a reviewer), or start empty.',
      'When more than one skill can fill a role, pick which one before you start. Optional roles, like the illustrator, can be left out.',
      'Each setup shows the panels it needs: the Book panel appears only in the book room.',
    ],
  },
  {
    build: 5,
    date: '2026-10-12',
    changes: [
      "Actors now know who else is here and how they look, and what the book contains, without seeing each other's private personality notes.",
      'Long stories no longer overflow the model: each actor reads the newest part of the story that fits its memory, set per actor under Conversation settings.',
    ],
  },
  {
    build: 4,
    date: '2026-10-12',
    changes: [
      'Edit actors: the pencil next to an actor changes their name, personality, skills, settings and models.',
      "Skill settings: how long Conversation replies are, how many words the Writer aims for, how strict the Reviewer is, and the Illustrator's style and how often it paints.",
      'Appearance: describe how an actor looks, and the Illustrator draws them that way whenever they are named in a scene.',
    ],
  },
  {
    build: 3,
    date: '2026-10-12',
    changes: [
      'Illustrator: add an actor with the Illustrator skill and it paints each turn of the story. Pick an image model under Settings, Models.',
      'Background panel: see what is being worked on beside the story, stop it, and see why something failed.',
      'Pictures are saved with the session and included when you save to a file.',
    ],
  },
  {
    build: 2,
    date: '2026-10-12',
    changes: [
      'Replies stream in word by word as the actor writes them.',
      'Actors use their other skills while speaking: an actor with Conversation and Dice can roll dice mid-reply, and the roll shows in the message.',
      'Model calls: a new button in the header lists recent calls with the full prompt, answer, time, tokens and cost.',
      'Reviewers that answer in the wrong format are shown their mistake and asked again.',
    ],
  },
  {
    build: 1,
    date: '2026-10-12',
    changes: [
      'Version number and this "What\'s new" history.',
      '"Characters" are now called actors: anyone or anything taking part, such as a writer, a reviewer or a story character.',
      'Book room: add chapters, let a writer draft them and a reviewer give notes, then approve or send them back.',
      'Choose which skills each actor has.',
      'Your tasks: answer requests from the story, such as approving a chapter, in a form.',
      'Sessions save automatically; save to or load from a file, or start a new session.',
      'Stop a running turn at any time.',
      'Roleplay chat with several characters, model choice per actor, and cost tracking.',
    ],
  },
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
