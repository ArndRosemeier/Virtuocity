# What Virtuocity is

Read this before working on anything. Virtuocity is easy to mistake for a
roleplay chat app, and code written with that picture in mind is wrong for it.

## A collaboration framework

Virtuocity is a platform where **zero or one human and any number of
automated actors** work together in a **session**. An actor is anything that
can keep a clear promise to the others: a language model playing a character,
plain code (a dice roller, a director), an image model, later sound or 3D.
Actors cooperate through **contracts**, so any actor that fulfils a contract
can stand in for any other, and a human can fulfil one too.

Everything a person experiences is an **application** of this framework, not
part of it:

- **Roleplay** (narrator, AI players, director, premise, illustrator,
  chronicler) is one session type.
- **Book room** (writer, reviewer, you as editor, a manuscript instead of a
  chat) is another.
- **Image workflow** (you describe, illustrators paint; illustrators are its
  cast) and **Open** (every panel, no suggestions) are two more.
- Planned or imagined: a pen-and-paper RPG with dice and a GM (or no GM, or
  only players), a 3D walk-through where a
  renderer and some actors drive a scene. Each should take little more than
  new skills, actors and a session type.

The app grows in every direction at once through a growing number of
contracts, skills and actors. A feature is good when every session type can
use it; a feature that only makes sense for roleplay belongs in a skill or a
session type, never in the core or the generic UI.

## The building blocks

| Concept      | What it is                                                                                                                         | Who makes it           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Contract     | A versioned promise (`director@1.0`, `session-type@2.0`): actions with schemas and a conformance suite.                            | Code (packages)        |
| Skill        | An implementation of contracts and/or turn-taking, backed by an LLM, code or both. Fixed.                                          | Code (packages)        |
| Actor        | A name, a description or personality, skills and their settings. Mutable, lives in the Library.                                    | The person             |
| Session type | An actor serving `session-type@2.0`: who is cast, the panels a session shows, the roles its guide suggests. Every session has one. | The person             |
| Session      | What happened: messages, pictures, summaries, facts. Refers to Library actors by id.                                               | The person             |
| Renderer     | How an output kind or a whole session is drawn; replaceable.                                                                       | Code, chosen by person |

Starter actors (Roleplay, Book room, Narrator, Quill...) are offered once on a
fresh start and are then the person's to change or delete. Nothing that
looks like content is built in.

## Principles (decided with Arnd)

- **Content neutral.** Contracts and the core assume nothing about text unless
  a contract is inherently about text. A premise may be a picture; a space may
  hold anything.
- **No hardcoded specialties.** Never special-case a skill or actor in the app.
  If one skill needs UI behaviour, add a contract (or an optional field) any
  skill could use (markers, spaces and session types came about this way).
- **One name, one actor.** An actor's name is its identity. No copy of an
  actor exists anywhere but the Library; only exported files carry copies.
- **Pure, simple state.** Prefer the model without exceptions, even when it
  causes collateral damage after a warning (deleting an actor deletes the
  sessions that use it).
- **Everything is user editable.** Actors, and therefore session types, are
  data the person shapes; code supplies skills, contracts and renderers.
- **The browser is the runtime for now.** Keys stay in the browser, providers
  must be callable from it, and the runtime stays location-agnostic so it can
  move to a server for multiplayer later.

## Where it stands

The base (contracts, the operation log, flows, providers, context assembly,
the Library, session types) is built. Roleplay and Book room are the walking
skeletons. Long memory (chronicler, fact gatherer), pictures and directors
exist. Not built yet: audio providers, a pen-and-paper session type with
rules, networked multiplayer, and the 3D walk-through (a real 3D world, not a
text adventure).

## For agents

- Before building, ask which framework concept the request belongs to: a new
  contract, a new skill, a new starter actor or session type, a renderer, or
  genuinely a core extension point. Most requests are not core changes.
- When a request names a session type ("in the roleplay..."), check whether
  the right change is generic first.
- When a feature is underspecified, ask Arnd instead of inventing its meaning.
- Technical details: [architecture.md](architecture.md). Coding rules:
  [CLAUDE.md](../CLAUDE.md). The person-facing explanation is the in-app
  Manual (`packages/app/src/manual.md`); keep both in step.
