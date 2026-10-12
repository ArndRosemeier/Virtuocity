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
    build: 26,
    date: '2026-10-12',
    changes: [
      'A Premise actor has a "Show the premise in the chat" setting. Turn it off and the premise stays hidden from you: only the AI actors see it, so the narrator knows the setup and you discover it as you play.',
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
  {
    build: 20,
    date: '2026-10-12',
    changes: [
      'The story view is now an actor you pick, so a view can bring its own skills. Pick it in Settings › Appearance (for new stories) or at the bottom of the Cast panel (for this story); the pencil next to it edits it, e.g. its system prompt.',
      'New Roleplay renderer: it tells every text model it may keep <hidden> notes and use markdown, and draws the story with markdown, direct speech highlighted, and every XML section foldable. Hidden notes start folded.',
    ],
  },
  {
    build: 19,
    date: '2026-10-12',
    changes: [
      'A new System prompt skill: write instructions once (a style, a format, house rules) and every actor that uses a text model follows them. Add it to a support actor in the Add actor dialog.',
      'With several System prompt actors, their prompts are combined in the order the actors joined, ahead of each actor’s own instructions. Pictures and sound are not affected.',
    ],
  },
  {
    build: 18,
    date: '2026-10-12',
    changes: [
      'Only people and actors who talk make up the cast. Actors without a talking skill, like the Illustrator, the Chronicler or the Premise, are support: the Cast panel lists them separately, and talking actors no longer think they are in the scene.',
    ],
  },
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
