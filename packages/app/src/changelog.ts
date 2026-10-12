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
