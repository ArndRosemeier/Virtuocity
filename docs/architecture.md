# Architecture

Virtuocity is a small core plus modules. The core defines the concepts and the
extension points; everything with behaviour (skills, blueprints, providers,
renderers, panels) is a module that plugs in through a registry. The product
vision behind this lives in [vision.md](vision.md).

## Packages

| Package                          | Role                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| `@virtuocity/core`               | Concepts and extension points. No UI, no network, no other packages.   |
| `@virtuocity/contract-dice`      | `dice-roller@1` contract.                                              |
| `@virtuocity/contract-critique`  | `critic@1` and `reviewer@1` (extends `critic@1`) contracts.            |
| `@virtuocity/openrouter`         | `ModelProvider` for OpenRouter, reports model, tokens and cost.        |
| `@virtuocity/skill-conversation` | Conversation skill: lets an actor speak in character via a text model. |
| `@virtuocity/skill-dice`         | Code-only skill implementing `dice-roller@1`.                          |
| `@virtuocity/skill-reviewer`     | LLM skill implementing `reviewer@1` (and so `critic@1`).               |
| `@virtuocity/contract-writing`   | `writer@1` contract.                                                   |
| `@virtuocity/skill-writer`       | LLM skill implementing `writer@1`.                                     |
| `@virtuocity/contract-visual`    | `illustrator@1` contract.                                              |
| `@virtuocity/skill-illustrator`  | Image-model skill implementing `illustrator@1`; illustrates turns.     |
| `@virtuocity/book-room`          | Walking skeleton: `manuscript` document and `book-pipeline` flow.      |
| `@virtuocity/roleplay`           | `roleplay` blueprint: a narrator, plus optional players and support.   |
| `@virtuocity/app`                | Vite + React web app. Decides which modules are installed.             |

New skills, blueprints and providers are new packages under `packages/`. New
contracts are `contract-*` packages.

## Dependency rules (enforced by `npm run boundaries`)

```
app ──► any module ──► ui ──────────► core
                  └──► contract-* ──► core
```

- `core` depends on no other Virtuocity package.
- `ui` depends only on `core`.
- A `contract-*` package depends only on `core` and on other contract packages
  (for parent contracts).
- A module depends only on `core`, `ui` and contract packages, never on another
  module or on `app`.
- Modules cooperate through **events** on the bus and through **registries**, not imports.
- No circular imports anywhere.

## Core concepts

- **Contracts** (`contract.ts`, `contract-version.ts`, `contract-registry.ts`):
  the shared promise that makes skills of the same kind interchangeable. See
  [Contracts](#contracts) below.
- **Registry** (`registry.ts`): typed, id-keyed plugin collection. Duplicate ids
  throw; `replace` swaps an entry on purpose.
- **ModuleHost / VirtuocityModule** (`module.ts`): a module's `register(host)`
  adds things to the host's registries: `contracts`, `adapters`, `skills`,
  `blueprints`, `providers`, `directors`, `renderers`, `panels` and more.
  A panel contribution names a slot: `main` (views such as the story feed or
  the manuscript), `input` (controls such as the composer) or `side`.
- **EventBus / defineEvent** (`events.ts`): everything that happens is an
  event. Modules declare their own typed events with `defineEvent`.
- **Actor, Personality** (`actor.ts`): human or AI. An actor's abilities
  come only from its skills; any actor can take any seat.
- **Skill** (`skill.ts`): one interface, backed by `llm`, `code` or `hybrid`.
  `onEvent` for reacting (silent and support actors), `takeTurn` for actors that
  speak, `onRequest` for support actors a person can ask to act (`runtime.askable()`,
  "or ask:" in the composer; `runTurn` runs it like a turn, the director never
  picks it). Conversation is just a skill with `takeTurn`. A skill that takes over
  a removed one lists it in `replaces`; `upgradeActor` (`skill-upgrade.ts`)
  moves actors onto it, and the app's `Library` applies that to stored actors
  and to every actor it adopts, sessions' casts included.
- **Models** (`models.ts`): `resolveModel` picks skill override, then actor
  override, then the core default for the modality.
- **Assist** (`runtime.assist`): a model call made for the person, not an actor
  (e.g. "Transform by AI" on long text fields, `LongText` in `ui`), with the
  default model; traced and counted like any call.
- **ModelProvider** (`provider.ts`): runs calls and returns `CallStats`;
  `listModels` returns its catalog (`ModelInfo`: modalities, context, price).
- **Modalities** (`host.modalities`): the modalities the app offers a default
  model for. `coreModule` registers text, image and audio; modules add more.
- **Workspace** (`workspace.ts`, `oplog.ts`, `doc-type.ts`): all shared state.
  See [State](#state) below.
- **Transcript** (`transcript.ts`): the story as one document type: a
  collection of messages. A message can hold anything (`kind` and `data`, like
  an output part) but always has a string form in `text`, which prompts,
  summaries and exports read (`Content`, `contentSchema`, `textContent` in
  `output.ts`). Messages carry optional `CallStats`; `runtime.allStats()` counts
  every AI call, including ones on discarded branches. Version 1 messages held
  several parts and are migrated on load (`transcript-migrate.ts`).
- **Renderers** (`output.ts`): every output kind has one active renderer,
  mostly plain code; skills can `replace` it.
- **Director** (`turns.ts`): picks the next speaker when the human passes.
  The default (`least-recent`) is registered by `coreModule`.
- **Flows** (`flow.ts`, `flow-runner.ts`): see [Flows](#flows) below.
- **SessionRuntime** (`runtime.ts`): a running session. Actors `join` and
  `leave` at any time (the app only lets an actor leave while `hasActed` in
  `cast.ts` is false; removing one that acted deletes the session); `post` adds a message; `pass` lets the director pick one
  AI turn; `runTurn` lets a chosen actor speak; `retryMessage` (`retry.ts`)
  rewinds to before an actor's message and lets that actor speak again;
  `editMessage` rewrites one message in place (the app's pencil button, for
  text messages), leaving everything after it. `stop`
  aborts the current turn's model calls and the running flow; a stopped turn
  ends quietly. Each call runs at most one AI
  turn, then the session pauses. `turn.started` / `turn.ended` events and
  `speaking` tell the UI who is writing. Every event is delivered to the `onEvent` of
  each skill whose `listensTo` names it.
- **Panels**: UI slots that modules fill; the core layout is a feed plus slots.

The core is UI-agnostic: `ModuleHost<R, C>` is generic over the render type and
component type. The app fixes them to React (`packages/app/src/types.ts`).

## Contracts

A contract (`defineContract`) has a name and a `major.minor` version, and its
`id` is `name@major.minor`. It declares typed **actions** (zod input and output
schemas, built with `action` or `optionalAction`), plus the events it emits and
listens to and the output kinds it produces. Schemas must be representable as
JSON Schema, so one definition drives validation, LLM tool calls and human forms.

- **Inheritance.** `extends: [parent, ...]` inherits every action, event and
  output. A child may only add; redefining an inherited action, or inheriting two
  different definitions of one action, throws. Contracts are pure interfaces:
  skills share code through ordinary helpers, not through the contract tree.
- **Substitution.** `fulfils(contract, ref)` is true when the contract or any
  ancestor satisfies the reference (same name and major, minor at least the one
  asked for). A slot asking for `critic@1` accepts a `reviewer@1` skill.
- **Implementing.** A skill lists `implements: [implement(contract, handlers)]`.
  `implement` type-checks the handlers and throws if a required action is missing.
- **Invoking.** `runtime.invoke(actorId, contract, action, input)` (and
  `ctx.invoke` inside skills) validates the input, runs the handler and validates
  the output. Failures are `ContractError`s with a `code`. AI actors are served by
  their skills; **human actors get a `HumanTask`** in `runtime.tasks`, with JSON
  Schemas for a form, and the call resolves when the person submits valid output.
- **Versions.** A minor version may only add actions (the `ContractRegistry`
  rejects a minor that drops one). Across majors, a `ContractAdapter`
  (`defineAdapter`) lets an implementation of one contract serve another, so old
  sessions keep working.
- **Conformance.** A contract carries conformance cases. `conformanceSuite`
  collects a contract's cases and all its ancestors' cases, and
  `conformanceTarget` runs them against a skill. Every implementation runs its
  suite in its tests, using `scriptedProvider` or `replayProvider` (and
  `seededRandom`) to stay deterministic.

## State

Every change to shared state, in every document, is an **operation** in one
`OpLog`. The log is a tree: the path from the root to the head is the current
state, and other leaves are branches. Rewind, branch, undo and redo move the
head, so all documents (transcript, outline, inventory, scene) move together.

- **Document types** (`defineDocType`, registered in `host.docTypes`): a pure
  reducer `apply(state, op)` plus a zod validator for operations and a version.
  Operations must address stable ids, not positions, and reducers must ignore
  operations about things they don't have, because those may be hidden.
- **Perspective.** An operation may name an `audience` and actors it is
  `hiddenFrom`. `workspace.read(docId, type, actorId)` folds only the
  operations that actor may see (their own, and others when they are not hidden
  from them and there is no audience or they are in it). Skills get `ctx.state`, a view
  from their actor's perspective, and `ctx.transcript`, the transcript as their
  actor sees it. The UI reads the transcript from the human's perspective.
- **Permissions.** Every `WritePolicy` in `host.policies` must allow a change.
- **Cast** (`cast.ts`): who is in the session is a document too, so joining and
  leaving rewind, branch and save with everything else. `runtime.cast()` (and
  `ctx.cast`, `ContextRequest.cast`) is the cast proper: people and the actors
  with a turn-taking skill. Everyone else is support (an illustrator, a
  chronicler, the story view); prompts name only the cast as being in the scene.
- **Persistence** (`persistence.ts`, `storage.ts`, `assets.ts`, `bundle.ts`):
  `runtime.save()` returns the whole log (every branch), the head and the cost
  ledger; `runtime.load(data)` validates it and upgrades operations of older
  document type versions through `DocType.migrate`. Operations of document types
  that aren't installed are kept untouched. Storage is a `KeyValueStore` the app
  injects (IndexedDB in the browser, `memoryStore` in tests). Binary content goes
  into a content-addressed `AssetStore` and operations hold its `sha256-…` id.
  `exportBundle` / `importBundle` turn a session and its assets into one file.
- **Caching.** Folded states are cached per operation and perspective. Operations
  never change, so the cache can't go stale.

## Flows

A flow (`defineFlow`, registered in `host.flows`) orchestrates a session:
turn-taking, a writing pipeline, a game loop. `runtime.flows.run(flowId, input)`
starts one run; the run does some steps through its `FlowContext` (`runTurn`,
`invoke`, `state`, `pickNext`) and returns, which pauses the session.

- **Steps and limits.** Every turn and contract action is a step. A run stops
  with `step-limit` when it reaches `maxSteps` (default 20), so autonomous loops
  can't run away. Only one run happens at a time.
- **Interrupt.** `flows.interrupt()` aborts the run: no further steps, model calls
  made during the run are cancelled through its `AbortSignal`, and open human
  tasks are cancelled.
- **Humans in the loop.** A flow that invokes an action on a human actor simply
  waits; the app shows the `HumanTask` as a form generated from its JSON Schema
  (`SchemaField` in the UI kit) in the "Your tasks" panel.
- **No hidden state.** Flows keep nothing between runs; they read documents to
  decide what comes next, so rewinding, branching and loading also move the flow.
- **Turn-taking** (`turn-taking.ts`) is the default flow: pass (the director
  picks) or choose a speaker, one turn, pause.

## Model calls

- **One call shape** (`provider.ts`): messages (system, user, assistant with tool
  calls, tool results), optional `tools`, `toolChoice`, `responseSchema` and an
  `onText` callback for streaming. Providers that cannot stream call `onText`
  once with the whole answer. Skills call `ctx.complete(request)`; the runtime
  picks the model.
- **Structured answers** (`structured.ts`): `completeStructured(ctx.complete,
request, schema)` asks for JSON matching a zod schema, then shows the model
  what was wrong and asks again (twice by default). Use it instead of parsing
  replies by hand.
- **Tools** (`tools.ts`, `skill-tools.ts`): `defineTool` turns a zod schema and
  a function into a tool; `completeWithTools` runs the call-tools-answer loop
  and reports failed calls back to the model. `ctx.tools` holds the actor's
  other abilities: every action of every contract its other skills implement
  (an actor with conversation and dice can roll while speaking). Tool calls can
  be shown in messages as `tool-use` parts (`toolUseParts`).
- **Tracing** (`calls.ts`): every call goes through `runtime.calls`, which keeps
  the request, the streamed text, tool calls, stats or error of recent calls in
  memory and emits `call.started`, `call.progressed` and `call.ended`. The app
  streams the speaking actor's text from it and lists calls under "Model calls".

## Media and background jobs

- **Media** (`media.ts`): image and audio calls return `media` (mime and bytes).
  `storeMedia(ctx.assets, media)` keeps them in the session's content-addressed
  asset store and returns `image` or `audio` parts that hold only the asset id,
  so the operation log stays small and exports carry the files.
- **Jobs** (`jobs.ts`): `ctx.startJob(label, run)` starts work beside the story
  and returns at once; `runtime.jobs` lists jobs, reports progress and cancels
  them through `control.signal` (pass it to model calls). A failed job never
  throws; its error is shown in the app's "Background" panel. Skills reacting to
  events should start a job for anything slow, because event delivery is awaited.
- **Illustrator** (`contract-visual`, `skill-illustrator`): `illustrator@1`
  draws a picture from a description. As an actor, the illustrator draws each
  other actor's turn in a background job and posts the picture. Asked by a
  person (`onRequest`), it paints the newest message right away; with its
  `automatic` setting off, that is the only time it paints.

## Settings and profiles

- **Skill settings** (`settings.ts`): a skill declares `settings` with
  `defineSettings` (every field has a default). Values are stored per actor in
  `actor.settings[skillId]`; skills read them with
  `readSettings(schema, ctx.settings)`, which fills defaults and drops invalid
  values. The app renders a form for each chosen skill from the schema.
- **Profile fields**: modules register `ProfileField`s in `host.profileFields`
  (the illustrator adds `appearance`). Values live in `actor.profile[fieldId]`
  and any skill reads them with `profileValue(actor, field)`. Settings belong to
  one skill; profile fields describe the actor for everyone.
- **What a skill uses of its actor**: a skill declares `persona` (it voices the
  actor's personality), `character` (the actor is a character, so profile
  fields apply) and `modalities` (which models it calls). `actorUse(skills)`
  combines them; the actor dialog asks only for what the chosen skills use.

## Context assembly

- Modules register `ContextContributor`s in `host.contextContributors`. Each
  returns `ContextPiece`s (title, text, priority) built from the reading actor's
  perspective: its view of the state and the transcript it may see.
- `ctx.context(budget)` gathers every contributor and keeps the highest-priority
  pieces that fit the token budget (`assembleContext`, ~4 characters per token).
  `fitNewest` trims a history to a budget, keeping the newest items.
- Built in: `cast` (who is here and their profile fields, never their private
  personality). The book room adds `manuscript` (the outline with each
  chapter's status). Conversation's `memory` setting is unlimited by default
  (the whole story and all context); when set, a quarter goes to context and
  the rest to the newest lines of the story.

## Blueprints

A blueprint (`defineBlueprint`, `host.blueprints`) is a ready-made setup such
as Roleplay or Book room: the layout it asks for and the roles it suggests.
Starting one adds no actors; the user adds actors from the library.

- A role names what an actor must be able to do: `speaks` (takes turns) and
  `needs` (contracts). It never names a skill. `roleNeeds` lists the installed
  skills that can fill each need. `label` and `hint` describe the role in the
  setup guide; `optional` roles are listed as options.
- `setupGuide` matches the session's actors to the roles (each actor fills the
  first open role it `fitsRole`). The app shows it at the top of the Cast panel
  until it is hidden (`hideGuide`, kept in the `setup` document) or turned off.
- A role's personality, settings, profile and models describe its default
  actor: `defaultActors` casts them with fresh ids (`castBlueprint`,
  `defaultChoices`), and the app adds them to the library once, on the first start.
- `startBlueprint` records the blueprint in the `setup` document;
  `currentBlueprint` reads it back, so the layout survives saving and loading.
- `layout` names, per slot, the contributions to show and their order
  (`arrangeSlot`); a slot it leaves out shows everything. The app shows
  several `main` views as tabs. Book room shows only the manuscript and no
  composer; Roleplay shows the session and the composer.

## Channels

A channel (`defineChannel`, `host.channels`) is a continuous output: something
that stays showing or playing, such as the scene picture or background music,
instead of a message in the story. It names the part kinds it `accepts`.
`showOnChannel(state, channel, part)` replaces what a channel shows; the
contents live in the `channels` document, so they rewind, branch and save with
the story. Channels shared by several modules belong in a contract package
(`sceneChannel` is in `contract-visual`, with the `sceneChanged` event that
asks visualizers to picture a new scene; flows can emit it with `ctx.emit`). The app's "Now showing" panel
renders every channel through the renderer registry.

## Memory

The story is never shortened: the transcript and every view of it stay
complete. Remembering more than a model can read is a separate layer that only
model calls see. `contract-memory` defines `summarizer@1.0` (`summarize` lines,
optionally building on a `previous` summary). `skill-chronicler` keeps a
`memory` document with one summary per chronicler actor, contributes the latest
one to every actor's context as "The story so far", and brings it up to date
after turns once enough story lies beyond the newest `keepRecent` tokens. It gets
the summary by invoking the summarizer contract on its own actor, so any
implementation can stand in. Two ship: the differential chronicler folds new
lines into the last summary, the full chronicler rereads everything. Both run
the contract's conformance suite. After each update the chronicler posts a
short note ("Updated the story so far (N words).") hidden from every non-human
actor, so people see it in the chat while prompts never do; it leaves its own
notes out of what it summarizes. Summaries have no length setting: the
summarizer writes as much as it needs to keep every detail that may matter. The app's Memory panel shows, edits and
forgets summaries (a forgotten one is rebuilt after the next turn).

## Premise

`sessionStarted` (core) fires once when a session is started from a blueprint
or saved setup and its cast has joined, never when a saved session loads
(`isStarting` tells whether that cast is still joining).
`contract-premise` defines `premise@2.0`, which returns messages of any
kind, so a premise may be text, a picture or sound. `skill-premise` listens for
`sessionStarted`, and for its own `actorJoined` outside a start, and while the
session is still empty invokes the premise contract on its own actor and posts
the result as the opening. One implementation ships, "Premise": a text
written in the actor's settings (Transform by AI turns a few words into one).
It replaced "Premise (from a prompt)", whose prompt becomes the text. With
"shown" off, the premise is posted hidden from the people in the session, so
only AI actors (the narrator) know the setup.

## Spaces

Some actors get their own space on screen, in the app's left slot.
`contract-space` defines `space@1.0`: `fill` returns what the space shows now
as output parts of any kind (it must be quick), and the optional `edit` takes
what a person changed. The app's Spaces panel shows one space per actor whose
skills implement the contract, asks for it again whenever the session's state
moves, offers editing for spaces that provide `edit` and hold text, and can
maximize any space to full screen, where its content stretches to fit. The
Illustrator shows its latest picture; `skill-canvas` is a blank canvas kept in
its own `canvas` document.

## Instructions

`host.instructions` holds `InstructionSource`s: standing instructions the
runtime adds to every text-model call of every actor (`withInstructions`, ahead
of the call's own system prompt), so no skill has to opt in. Image and audio
calls are left alone. `skill-system-prompt` is the first source: a silent
support skill whose `prompt` setting is added for everyone; several such actors
are combined in the order they joined.

## Story view

How the story looks is a contract too. `contract-render` defines `render@1.0`:
`render` takes the story's messages and returns the view as output parts,
which the app draws with its renderers, so a view can be a chat, a page of
prose or a storyboard. It also holds the shared `chat-view` output kind
(`chatView`, with an optional per-message `partOf`). Every story has exactly
one story view: a copy, under the fixed id `story-view`, of a ready-made
renderer actor (`host.actors`) whose skills include a render skill, so a view
can bring other skills such as a system prompt. The app adds the default one
(Settings › Appearance) when a story starts or loads; the Cast panel swaps or
edits it, and does not list it as a cast member.

- `skill-chat-view`: the Chat view actor, the plain chat.
- `skill-roleplay-view`: the Roleplay renderer actor, a System prompt about
  `<hidden>` notes and markdown plus the Roleplay view, which turns text
  messages into `rich-text` parts (markdown blocks, highlighted speech, every
  XML element a fold, `<hidden>` folded).

## Library

`Library` keeps the actors and setups, in an injected `KeyValueStore`
(IndexedDB in the app). Items are validated on read, so a bad entry is skipped.

- **One actor, one identity.** A library actor's id is its actor id, and the
  session uses that very actor: adding joins it as is, and editing saves it to
  the library and the session alike (the app's `saveEverywhere`). A variation
  is an explicit copy with a new name.
- **Names are unique** (`nameKey` ignores case and extra spaces); `saveActor`
  throws `NameTakenError`. The id stays hidden underneath, so renaming is one edit.
- **Adopting.** `adopt(actors, resolve)` makes the library hold incoming actors
  under their own ids, e.g. a loaded session's cast (the app's `syncCast`) or
  an imported library file. New names are added, identical actors linked, and
  names taken by different actors go to `resolve` (keep or replace).
- **Deleting** an actor the session uses deletes that session too, after a
  warning, so nothing refers to a deleted actor.
- A saved setup lists actor ids and the blueprint it came from;
  `startSavedSetup` joins those actors with that blueprint's layout.
- `migrate` brings older libraries up to date (matching ids, unique names,
  setups that refer to actors instead of holding copies).

## Turn flow in the app

After every turn the session pauses. The human can **Act** (post, then the
director picks one actor to answer), **Pass** (the director picks one
actor), or press an actor's name to let exactly that one speak.

## Not built yet

See the roadmap in the project's design notes. The book room (draft, review,
approve chapters with a writer, a reviewer and you as editor) is the first
walking skeleton. Audio generation has the plumbing (parts, renderer) but no
provider support yet. Blueprints, the library, views and controls per slot, and channels exist;
next up is hardening the walking skeletons (milestone 7). The
app autosaves one session.
