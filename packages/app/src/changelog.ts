import type { Release } from './changelog-earlier';
import { EARLIER_RELEASES } from './changelog-earlier';
import { MIDDLE_RELEASES } from './changelog-middle';

export type { Release } from './changelog-earlier';

/**
 * One entry per build, newest first. Every change that ships to main adds an
 * entry with the next build number; the version shown is build / 1000.
 */
export const RELEASES: readonly Release[] = [
  {
    build: 91,
    date: '2026-10-20',
    changes: [
      'Conversation has an "automatic" setting, on by default. Switch it off in the actor editor and the director never picks that actor; it speaks only when you click it under "Let speak". Unlike pausing in the Cast panel, this belongs to the actor, so it holds in every session the actor is in.',
    ],
  },
  {
    build: 90,
    date: '2026-10-20',
    changes: [
      'Removing an actor from a session no longer deletes the session. The actor stops taking part, and what it already did stays under its name, so you can swap a narrator, director, chronicler or any other actor mid-session by removing it and adding another. Going back to before it left brings it back. The session still counts as using it, so deleting it from the Library still deletes the session (that warning now also finds sessions where it appears only in an older retry version).',
    ],
  },
  {
    build: 89,
    date: '2026-10-19',
    changes: [
      'Automation scripts can now use plain text as well as AI calls: a line with just "..." adds that text to the message, with [variables] filled in and no AI call, and name = "..." keeps such a text in a variable. So a script can end with "Mood: [mood]" instead of another AI call.',
    ],
  },
  {
    build: 88,
    date: '2026-10-19',
    changes: [
      'Automation: a new skill that runs a small script of AI calls written in its settings and posts the result as one message. name = LLM("...") keeps an answer in a variable, a bare LLM("...") adds its answer to the message, [name] puts a variable into a prompt and [context] is the story so far. Variables starting with _ keep their value between runs. The actor editor checks the script and names the line that is wrong. It runs when you click it under "or ask", or on its own with "automatic" on.',
    ],
  },
  {
    build: 87,
    date: '2026-10-18',
    changes: [
      'Prompt log: Settings > Connection > "Show prompt log" shows the last 5 model calls exactly as they were sent to the provider and what came back, raw and unparsed. It is always on, covers every provider (text, picture and decision models), keeps nothing after a reload and never shows your keys.',
    ],
  },
  {
    build: 86,
    date: '2026-10-15',
    changes: [
      'Pause an actor: the pause button next to a cast actor in the Cast panel hides it from the director, so it is not picked until you click play again. You can still let it speak yourself. Pausing is part of the session, not the actor, so it is not paused anywhere else.',
    ],
  },
  {
    build: 85,
    date: '2026-10-15',
    changes: [
      'Clear session: the eraser in the header empties the open session after a warning. Everything that happened goes, every version included; who is in it stays. The next step starts it afresh, so a premise opens it again with its current text.',
    ],
  },
  {
    build: 84,
    date: '2026-10-15',
    changes: [
      'A premise now opens the session right before its first step (your first message, or the first actor acting), not when the session is made. So editing the premise actor before anything has happened still counts, and a template always starts from its premise as it is now. Until then the chat stays empty.',
    ],
  },
  {
    build: 83,
    date: '2026-10-15',
    changes: [
      'Analytics counts markers too: how many there are in all, and how many of each kind (for example Summarized), under its length figures.',
    ],
  },
  {
    build: 82,
    date: '2026-10-15',
    changes: [
      'Analytics now also shows how long the session is, above its strip of posts: posts, words, characters, an estimate of the tokens a model reads for all of it, words per text post, pictures, and words per speaker.',
    ],
  },
  {
    build: 81,
    date: '2026-10-15',
    changes: [
      'Session analytics now shows markers too: a thin red divider between the posts wherever an actor placed one, such as a chronicler\'s "Summarized", so you see at a glance where the last summary is. Clicking it jumps to the marker in the session and opens that actor\'s space.',
      'With "automatic" on, Analytics also updates when a background job finishes, so a new summary shows up right away.',
    ],
  },
  {
    build: 80,
    date: '2026-10-15',
    changes: [
      'New: Session analytics. The ready-made actor Analytics shows the whole session in its space as thin colored lines, one per post (your text, AI text, pictures, sound, tool use, hidden posts, anything else; a legend names the colors). Click a line to jump to that post.',
      'It updates when you click it under "or ask:" or press Retry in its space. Switch on "automatic" in the actor editor to have it update after every post. More analyses can join it later.',
    ],
  },
  {
    build: 79,
    date: '2026-10-14',
    changes: [
      'Illustrators now start with "Paint on its own" off, since pictures cost money and are optional: they paint when you click them under "or ask:". Switch it on in the actor editor to have one paint after every turn. Summarizers still work on their own.',
      'This applies at once to every illustrator whose setting you never changed, Ink included. The new ready-made illustrator Brush paints on its own, for Guided illustrations, which needs that.',
      'Illustrators no longer have a space of their own: every picture goes into the session, so "Also post into the story" is gone. Add a Gallery to browse the pictures, with Copy and Save.',
      'The Cast panel checklist of what a session can use is switched on or off in New session now ("Show a checklist…", remembered for next time), no longer in Settings › Appearance.',
    ],
  },
  {
    build: 78,
    date: '2026-10-13',
    changes: [
      'A new answer scrolls the session all the way to its end again, also when the view folds parts of it. Only scrolling up yourself stops the session from following new text.',
    ],
  },
  {
    build: 77,
    date: '2026-10-13',
    changes: [
      'You have a name now: the small field next to Act (User until you change it). The AI actors see your lines as "Name: …", where they used to see "You: …" and could take your lines for their own. A new session starts with the name you gave last; it must not be an actor\'s name.',
      "Talking actors are told that every line by someone else starts with its speaker's name, so sessions with several AI actors keep who said what apart.",
    ],
  },
  {
    build: 76,
    date: '2026-10-13',
    changes: [
      "Tabletop games. New skills PF2E GM, PF2E Player, D&D 5 classic GM and D&D 5 classic Player (2014 rules): give one to a talking actor and it knows that system's rules and its part at the table, and rolls real checks with the outcome by the rules (Pathfinder's degrees of success, D&D advantage and critical hits), finds DCs and works out proficiency. Each has a House rules field.",
      'New session types Pathfinder 2e and D&D 5e, with ready-made actors: a Game Master and the fighter Kira for Pathfinder, a Dungeon Master and the rogue Bram for D&D. They appear in your Library on the next load.',
    ],
  },
  {
    build: 75,
    date: '2026-10-13',
    changes: [
      'Spaces that show a picture (the Gallery, an illustrator) have Copy and Save buttons. Copy puts the picture on the clipboard; Save asks where to save it, where the browser can, and otherwise downloads it, named after its description.',
    ],
  },
  {
    build: 74,
    date: '2026-10-13',
    changes: [
      'Settings › Save & load has "Update default actors": it sets the ready-made session types and actors (Roleplay, Narrator, Director, …) back to how this version ships them, and adds back the ones you deleted. Use it to get what a new build adds to them, such as the wizard questions. Your changes to them are lost; your own actors and renamed copies stay.',
    ],
  },
  {
    build: 73,
    date: '2026-10-13',
    changes: [
      'New session has a setup wizard ("Guide me", on by default). After the name and session type it asks one question per role, such as "Who tells the story?", says how much the role matters and what you miss without it, and lets you pick an actor from your Library, choose nobody, or make a new one with the right skills already ticked. Start opens the session with everyone you picked.',
      'Session types say how much each role matters (needed, recommended, optional), what a session lacks without it, and what the wizard asks. Edit them in the actor editor. Roleplay, Book room, Image workflow and Guided illustrations come with all of it filled in.',
      'A Library made before this build keeps its old Roleplay and other session types, without questions; Settings › Save & load › Update default actors brings them up to date.',
    ],
  },
  {
    build: 72,
    date: '2026-10-13',
    changes: [
      'The Cast panel shows the session type the way it shows the session view: in a field of its own below the actors, with an edit button, instead of as a support actor. Every session has exactly one of each.',
    ],
  },
  {
    build: 71,
    date: '2026-10-13',
    changes: [
      'Starting from a template fills in a free name (the template\'s, numbered, e.g. "Dungeon 2"), selected so you can type over it. Session names you are asked for start selected too.',
    ],
  },
  {
    build: 70,
    date: '2026-10-13',
    changes: [
      'Removing an actor right after it acted no longer deletes the session: as long as nobody has acted after it, what it did goes with it. E.g. add a premise, see it posted, remove it, and the session is as before.',
    ],
  },
  {
    build: 69,
    date: '2026-10-13',
    changes: [
      'Hidden premises are kept secret on purpose: AI actors now get a hidden line marked as hidden from you, and are told to build on it without giving it away, instead of reading it as a stray remark.',
    ],
  },
  {
    build: 68,
    date: '2026-10-13',
    changes: [
      'Gallery: a new support actor whose space shows every picture of the session. Step back and forth with "‹ 2/5 ›"; maximized, the current picture takes half the screen and the others line up as thumbnails. The picture in view is the current picture, and a new one becomes current when it arrives. Image workflow and Guided illustrations offer it as an optional role.',
      'Talking models see pictures: Conversation shows the model the current picture, and every other picture as a numbered line like "[Picture 2: a fox]". Models that cannot see pictures get the descriptions.',
      'Talking image models (like Nano Banana) need only Conversation: the pictures they draw while talking are posted as pictures.',
    ],
  },
  {
    build: 67,
    date: '2026-10-13',
    changes: [
      'New session fills in a name for you: the picked session type\'s name, numbered when it is taken (e.g. "Roleplay 2"). Picking another type changes it, until you type a name of your own.',
      'Behind the scenes: every ready-made session type is now checked to be fillable by the ready-made actors, e.g. the Painter fills the illustrator role of an image workflow.',
    ],
  },
  {
    build: 66,
    date: '2026-10-13',
    changes: [
      'Every skill now keeps a contract: Conversation serves speaker@1.0 and System prompt serves instructions@1.0.',
      'Session types pick their cast by contract instead of by skill: the "Cast skills" setting is now "Cast contracts" (Roleplay, Book room and Guided illustrations cast speakers, Image workflow casts illustrators). Any skill that can speak is cast wherever speakers are.',
    ],
  },
  {
    build: 65,
    date: '2026-10-13',
    changes: [
      'The actor editor lists skills by name only; hover a skill to see its contracts ("Contracts: ...").',
    ],
  },
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
  ...MIDDLE_RELEASES,
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
