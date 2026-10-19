# Architecture

Virtuocity is a small core plus modules. The core defines the concepts and the
extension points; everything with behaviour (skills, session types, providers,
renderers, panels) is a module that plugs in through a registry. What the
product is, and why that shapes every change, is in [vision.md](vision.md).

## Packages

| Package                               | Role                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `@virtuocity/core`                    | Concepts and extension points. No UI, no network, no other packages.                   |
| `@virtuocity/contract-dice`           | `dice-roller@1` contract.                                                              |
| `@virtuocity/contract-critique`       | `critic@1` and `reviewer@1` (extends `critic@1`) contracts.                            |
| `@virtuocity/openai-api`              | `ModelProvider`s for OpenRouter and OpenAI (same chat API).                            |
| `@virtuocity/anthropic`               | `ModelProvider` for Anthropic's Messages API (Claude).                                 |
| `@virtuocity/contract-speaker`        | `speaker@1.0` contract: says the actor's part in the session.                          |
| `@virtuocity/skill-conversation`      | Conversation skill: implements `speaker@1.0` with a text model.                        |
| `@virtuocity/skill-dice`              | Code-only skill implementing `dice-roller@1`.                                          |
| `@virtuocity/skill-reviewer`          | LLM skill implementing `reviewer@1` (and so `critic@1`).                               |
| `@virtuocity/contract-writing`        | `writer@1` contract.                                                                   |
| `@virtuocity/skill-writer`            | LLM skill implementing `writer@1`.                                                     |
| `@virtuocity/contract-visual`         | `illustrator@1` and `picture-source@1.0` contracts.                                    |
| `@virtuocity/skill-illustrator`       | Image-model skill implementing `illustrator@1`; illustrates turns.                     |
| `@virtuocity/skill-gallery`           | Gallery: every picture in a space; serves `picture-source@1.0` (the current picture).  |
| `@virtuocity/contract-facts`          | `fact-gatherer@1.0` contract: the facts a session has established.                     |
| `@virtuocity/skill-fact-gatherer`     | LLM skill implementing `fact-gatherer@1.0`; shows facts in its space.                  |
| `@virtuocity/contract-analytics`      | `session-analytics@1.0` contract and the `session-outline` output kind.                |
| `@virtuocity/skill-session-analytics` | Code skill implementing `session-analytics@1.0`: an outline of the posts in its space. |
| `@virtuocity/book-room`               | Walking skeleton: `manuscript` document and `book-pipeline` flow.                      |
| `@virtuocity/contract-director`       | `director@1.0` contract: picks who takes the next turn.                                |
| `@virtuocity/skill-session-type`      | "Session type": cast contracts, roles, panels in the actor's settings; the Open type.  |
| `@virtuocity/skill-director`          | Code and decision-model skills implementing `director@1.0`.                            |
| `@virtuocity/turn-taking`             | `turn-taking` flow: pass (the director picks) or choose who speaks.                    |
| `@virtuocity/roleplay`                | Roleplay session type and its starter actors (narrator, players...).                   |
| `@virtuocity/image-workflow`          | Image workflow and Guided illustrations session types, Painter, Prompt refiner.        |
| `@virtuocity/contract-automation`     | `automation@1.0` contract: runs an automation and returns one message.                 |
| `@virtuocity/skill-automation`        | Automation skill: a tiny script language of model calls implementing `automation@1.0`. |
| `@virtuocity/app`                     | Vite + React web app. Decides which modules are installed.                             |

New skills, session types and providers are new packages under `packages/`. New
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
  `starters`, `providers`, `flows`, `renderers`, `panels` and more.
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
  picks it). Conversation is just a skill with `takeTurn` that serves `speaker@1.0`. A skill that takes over
  a removed one lists it in `replaces`; `upgradeActor` (`skill-upgrade.ts`)
  moves actors onto it, and the app's `Library` applies that to stored actors
  and to every actor it adopts, sessions' casts included.
- **Models** (`models.ts`): `resolveModel` picks skill override, then actor
  override, then the core default for the modality. A model is stored as a
  reference `provider:model` (`parseModelRef`); the runtime hands each call to
  the provider it names. `qualifyModel` upgrades ids saved before there were
  several providers (they belong to OpenRouter).
- **Assist** (`runtime.assist`): a model call made for the person, not an actor
  (e.g. "Transform by AI" on long text fields, `LongText` in `ui`), with the
  default model; traced and counted like any call.
- **ModelProvider** (`provider.ts`): runs calls and returns `CallStats`;
  `listModels` returns its catalog (`ModelInfo`: modalities, context, price);
  `name` and `ready()` (its key is set) drive the two-step provider/model
  pickers (`ProviderModelPicker` in `ui`). Keys live in the browser, so every
  provider is called straight from it.
  The OpenRouter provider asks an image model for exactly the outputs its
  catalog entry lists (pictures only, or pictures and text), and does the same
  for a text call to a model that can also paint. Pictures in a call reach
  only models whose catalog lists image input; others get their descriptions.
- **Modalities** (`host.modalities`): the modalities the app offers a default
  model for. `coreModule` registers text, image, audio and decisions; modules add more.
- **Workspace** (`workspace.ts`, `oplog.ts`, `doc-type.ts`): all shared state.
  See [State](#state) below.
- **Transcript** (`transcript.ts`): the story as one document type: a
  collection of messages. A message can hold anything (`kind` and `data`, like
  an output part) but always has a string form in `text`, which prompts,
  summaries and exports read (`Content`, `contentSchema`, `textContent` in
  `output.ts`). Messages carry optional `CallStats`; `runtime.allStats()` counts
  every AI call, including ones on discarded branches. Version 1 messages held
  several parts and are migrated on load (`transcript-migrate.ts`).
  A message lives only in the operation that posted it: `edit` and `remove`
  are amending operations (`DocType.amends`), so the workspace rewrites or
  takes out that posting operation instead of appending a step. Rewinding past
  later messages (a retry) therefore keeps edits and deletions.
- **Renderers** (`output.ts`): every output kind has one active renderer,
  mostly plain code; skills can `replace` it.
- **Flows** (`flow.ts`, `flow-runner.ts`): see [Flows](#flows) below.
- **SessionRuntime** (`runtime.ts`): a running session. Actors `join` and
  `leave` at any time (the app only lets an actor leave while `hasActed` in
  `cast.ts` is false; removing one that acted deletes the session); `post` adds a message;
  `runTurn` lets a chosen actor speak; `retryMessage` (`retry.ts`)
  rewinds to before an actor's message, keeping the old answer and what
  followed as a branch, and lets that actor speak again. Those sibling
  branches are the message's versions (`versions.ts`: `messageVersions`,
  `showVersion` moves the head to the newest end of the picked branch, so the
  whole branch comes back); the app shows a "‹ 2/3 ›" picker on the message;
  `editMessage` rewrites one message in place (the app's pencil button, for
  text messages), leaving everything after it; `removeMessage` takes one
  message out (the trash button on every message), leaving everything after it. `stop`
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
  leaving rewind, branch and save with everything else. Membership is in the
  log; an actor's details are not, unless the session owns the actor. `join`
  keeps an actor the session owns in the operation (the person, the story
  view); an actor that `SessionConfig.actors` finds (the app passes
  `library.actor`) is recorded as an `include` of its id instead. A session never
  holds a copy of a library actor, so a library edit shows in every session at
  once, and rewinding or retrying never brings back older details.
  `includeKnownActors` (`cast-refs.ts`) turns copies a loaded session holds (a
  file, or a session saved before 0.059) into includes; `withActorsWritten`
  does the reverse for a file, which has to stand alone. `runtime.cast()` (and
  `ctx.cast`, `ContextRequest.cast`) is the cast proper: people and the actors
  serving one of the session type's cast contracts (`SessionCast`, see
  [Session types](#session-types)). Everyone else is support (an illustrator
  in a roleplay, a chronicler, the story view); prompts name only the cast as
  being in the scene.
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
`invoke`, `state`, `cast`, `serves`) and returns, which pauses the session.

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
- **Turn-taking** (`turn-taking` package) is the default flow: pass (the
  director picks) or choose a speaker, one turn, pause. See [Directors](#directors).
- Flows see the `cast()` and whether an actor `serves(actorId, contract)`.

## Model calls

- **Decisions** (`decisions.ts`, `decision-call.ts`): decision models (the
  `decisions` modality, e.g. TypeSafe's Jev on OpenRouter) answer typed
  questions about a state (`choice`, `noul` for yes or no, `score`) with
  probabilities instead of writing text. Skills call `ctx.decide`; the runtime
  resolves the decisions model like any other and hands the call to its
  provider's `decide`. Decision calls are traced and counted like model calls.
  The app uses Jev until another decisions model is picked.

- **One call shape** (`provider.ts`): messages (system, user, assistant with tool
  calls, tool results), optional `tools`, `toolChoice`, `responseSchema` and an
  `onText` callback for streaming. Providers that cannot stream call `onText`
  once with the whole answer. Skills call `ctx.complete(request)`; the runtime
  picks the model.
- **Structured answers** (`structured.ts`): `completeStructured(ctx.complete,
request, schema)` asks for JSON matching a zod schema, then shows the model
  what was wrong and asks again (twice by default). Use it instead of parsing
  replies by hand.
- **Pictures in calls** (`provider.ts`, `pictures.ts`): a user message's
  content is text or a list of parts, `text` and `image` (asset id, mime, alt).
  The runtime fills each picture's `url` from the asset store before the call
  (`withPictureUrls`), so providers stay free of storage; a provider that
  cannot show a picture sends its `alt` (`chatText`, `withoutPictures`).
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
- **Current picture** (`picture-source@1.0` in `contract-visual`,
  `skill-gallery`): a session has at most one picture source, which names the
  picture everyone works on. The Gallery serves it: its space shows every
  picture of the story, the current one in view, and a person steps through
  them (`browse`). The pick is a `gallery` document in the log, so it rewinds
  and branches with the story; it holds until a newer picture arrives, which
  then is current. Conversation (`skill-conversation/pictures.ts`) shows the
  model the current picture itself, after the story, and every other picture
  as a numbered label (`[Picture 2: alt]`); pictures a talking model returns
  are posted as image messages, described by what it said.

## Settings and profiles

- **Skill settings** (`settings.ts`): a skill declares `settings` with
  `defineSettings` (every field has a default). Values are stored per actor in
  `actor.settings[skillId]`; skills read them with
  `readSettings(schema, ctx.settings)`, which fills defaults and drops invalid
  values. The app renders a form for each chosen skill from the schema.
- **Checking settings**: a skill may add `checkSettings(stored)`, returning
  what is wrong beyond the schema (one line each), e.g. a script that cannot
  run. `settingsProblems(skills, settings)` collects them; the actor dialog
  shows them under the skill's form and refuses to save until they are fixed.
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

## Session types

A session type (Roleplay, Book room, Image workflow, Open) is not built into
the app: it is an **actor** whose skill serves `session-type@3.0`
(`sessionTypeContract` in `core/src/session-type.ts`; in core because the
runtime's cast depends on it). **Every session the app keeps has exactly
one**: New session requires one, the type can't be removed from a session or
swapped (`rivalFor` blocks a second), stored sessions without one are deleted
when they would open, and files without one are refused (`switcher.ts`,
`UntypedSessionError`). An actor's session-type status is fixed: an edit that
adds or removes the skill is refused, so no session loses its type by an
edit. Its `describe` action returns:

- `castContracts`: contract references, in order. AI actors serving one are
  **cast**; all others are support. On its turn an actor acts with its skill
  serving the first of these it serves (`castCapable` in `skill.ts`; the
  skill's `takeTurn`, or `onRequest` for a skill like the illustrator). So an
  illustrator that can also talk paints in an image workflow
  (`['illustrator@1.0']`) and talks in a roleplay (`['speaker@1.0']`). Casting
  goes by what an actor promises, never by a skill's name: any skill serving
  `speaker@1.0` takes turns wherever speakers are cast. Nothing is tied to
  what a model can output; the order decides. The runtime keeps the
  type's last description (`TypeTracker`), settled after every join, leave
  and load and refreshed when the type actor changes, so `cast()` stays
  synchronous; `sessionTypeDescribed` tells views to redraw. A bare runtime
  without a type (tests) casts actors with `takeTurn`.
- `panels`: the panel contributions the session shows, in order, across all
  slots (`arrangeSlot` in core; empty shows everything). The app shows several
  `main` views as tabs. Book room shows only the manuscript and no composer;
  Roleplay shows the spaces, the session and the composer.
- `roles`: what the setup guide suggests adding. A role names what an actor
  must be able to do (`cast`: one of the cast contracts, and `needs` as contract
  references), never a skill. The app's guide (`guideLines` in `app/src/sessionType.ts`) matches
  the cast to the roles, each actor filling the first open role it fits, and
  shows it at the top of the Cast panel until it is hidden (`hideGuide`, kept
  in the `setup` document) or turned off.

`skill-session-type` ships the plain implementation, "Session type": roles
and panels written in the actor's settings, so people make or change a
session type in the actor editor (copy Roleplay, drop the director role, add
a dice roller). Its settings use `choice('cast-skills')`, `choice('contracts')` and
`choice('panels')` (core `settings.ts`), which the app's settings form shows as pickers
(`ChoicesContext` in `ui`). Other skills can serve the contract differently,
e.g. one that proposes roles with a model. The Open type (in `skill-session-type`)
shows every panel, casts talking actors and suggests nothing. New session lists
the library's session types; starting one (`startSession`) joins only that
actor, the person adds the rest. Saved setups are gone; session templates
cover them.

## Starters

Modules offer ready-made actors through `host.starters` (`Starter` in
`core/src/starter.ts`): the Open, Roleplay, Book room and Image workflow
session types and their usual casts (Narrator, Wren, Quill, Marlow...). A starter says what the actor
needs (`speaks`, `needs`) and never which skill; `castStarter` gives it the
first installed skill for every need. The app (`seed.ts`) adds each starter
to the library once, remembering offered starter ids, so deleted actors never
come back while starters from newer versions are still offered. From then on
they are ordinary library actors.

## Channels

A channel (`defineChannel`, `host.channels`) is a continuous output: something
that stays showing or playing, such as background music,
instead of a message in the story. It names the part kinds it `accepts`.
`showOnChannel(state, channel, part)` replaces what a channel shows; the
contents live in the `channels` document, so they rewind, branch and save with
the story. Channels shared by several modules belong in a contract package. The app's "Now showing" panel
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
the contract's conformance suite. A chronicler also places a "Summarized"
marker (`marker@1.0`) after the last message its summary covers, and has an
on-demand space showing the summary, which opens when the marker is clicked.
Summaries have no length setting: the
summarizer writes as much as it needs to keep every detail that may matter.

## Facts

`contract-facts` defines `fact-gatherer@1.0`: `gather` reads the whole session
from its actor's point of view and returns the facts it has established, as
output parts of any kind. `skill-fact-gatherer` ships one implementation, "Fact
gatherer", which asks the text model with the actor's `prompt` setting (a
sensible default, editable), the whole session and the facts gathered before.
It refreshes by invoking the contract on its own actor (also on Retry in its space), keeps the result in the
`facts` document and shows it in its space, where a person can correct it; the
next gathering keeps their corrections. Like the Illustrator it is support: it
gathers when a person asks it (`onRequest`), and after other actors' turns only
with its `automatic` setting on (off by default).

Skills that keep the latest output parts of each of their actors for a space
(facts, analyses) use core's `keptParts`: one log document per skill, plus
the space's `fill`, `discard` and `redo`.

## Session analytics

`contract-analytics` defines `session-analytics@1.0`: `analyze` looks at the
whole session and returns output parts of any kind. It also holds the
`session-outline` output kind: one row per post (message id, post type,
hover title), with a fixed set of post types (person, ai, picture, sound,
tool, hidden, other, marker): markers any actor places (`marker@1.0`) follow the post they come after, naming the placing actor in `markerOf`. The `session-figures` kind holds groups of labeled figures (label and value as text). `skill-session-analytics` ships "Session analytics",
plain code that counts the session's length (posts, words and characters of text posts, `estimateTokens` over everything, words per speaker, marker counts per label) and classifies the posts it sees (hidden from a person in the
session counts as hidden), keeps the outline (`keptParts`) and shows it in its
space; it updates on request, and after every `message.posted` and `job.ended` only with its
`automatic` setting on (off by default). A ready-made "Analytics" actor is
offered. The app draws the outline as thin colored lines with a legend;
clicking one scrolls the session to that message (`scrollToMessage`, which
finds the element the chat view marks with `data-message-id`); a marker line scrolls to the chat view's marker (`data-marker`) and opens the placing actor's space. Hidden posts
are not drawn in the session, so their lines do nothing.

## Directors

Who speaks next is a contract like everything else. `contract-director`
defines `director@1.0`: `next` gets the cast as candidates (id, name, whether
it is a person) and returns the id of who takes the next turn. Picking a person
hands the turn back, so the session waits for them. A session has at most one
director: the app refuses to add a second one, or to give a second actor in the
session a director skill (`rivalDirector` in `turn-taking`). The turn-taking
flow asks that director; a human can direct
too (they get a task). Without a director, passing picks nobody: people click
who speaks, and the app shows Pass only when the session has a director.

`skill-director` ships two implementations. "Director" is plain code: the AI
in the cast who spoke least recently goes next. "Director (decision model)"
asks the decisions model (Jev by default) a choice question about the newest
part of the session and what its actor knows; the actor's personality says how
it directs. The Roleplay session type lists a director as an optional role, and a
"Director" starter with the code skill is offered in the library.

## Premise

`sessionStarted` (core) fires once when a session is started (`startSession`,
with its session type) and its cast has joined, never when a saved session loads
(`isStarting` tells whether that cast is still joining). `firstStep` (core)
fires right before the session's first step, while it is still empty: before
the first post, turn or flow run (`beginIfEmpty`), and again if the session is
rewound to empty. What its listeners post does not fire it again, and if one
fails the step does not happen.
`contract-premise` defines `premise@2.0`, which returns messages of any
kind, so a premise may be text, a picture or sound. `skill-premise` listens for
`firstStep`, invokes the premise contract on its own actor and posts the result
as the opening. Nothing is stored before then, so a premise is always the one
its actor has when the session begins, also in a session made from a template. One implementation ships, "Premise": a text
written in the actor's settings (Transform by AI turns a few words into one).
It replaced "Premise (from a prompt)", whose prompt becomes the text. With
"shown" off, the premise is posted hidden from the people in the session, so
only AI actors (the narrator) know the setup.

## Automation

`contract-automation` defines `automation@1.0`: `run` runs the automation once
and returns one message of any kind. `skill-automation` ships "Automation",
which runs a script written in the actor's settings. A script is a list of
model calls, one per line (a prompt may span lines): `name = LLM("...")` keeps
the answer in a variable, a bare `LLM("...")` adds it to the message, a plain
`"..."` is text without a model call (kept with `name = "..."` or posted), `[name]`
puts a value into a prompt (`[[` is a plain `[`, `\"` a quote), and `//` starts
a comment. `[context]` is the story so far as the actor sees it
(`sessionText`). Variables run fresh every time, except those starting with
`_`: they are kept per actor in the `automation-variables` document, so they
rewind and branch with the session (empty in a new one). `parseScript` reads a
script or lists what is wrong with it by line (syntax, a variable read before
an earlier line sets it, a reserved name, nothing to post); `checkSettings`
uses it so a broken script is refused when the actor is saved. Like an
illustrator, it runs when a person asks; with `automatic` on it also runs in
the background after every `every` messages from others. It calls the actor's
text model, so the model can be overridden per actor.

## Spaces

Some actors get their own space on screen, in the app's left slot.
`contract-space` defines `space@1.2`: `fill` returns what the space shows now
as output parts of any kind (it must be quick), and since 1.2 optionally
several `items` with the `current` one, which a person steps through with the
optional `browse` (the app shows "‹ 2/5 ›" in the header, and when maximized a
gallery: the current item takes half the screen, thumbnails the rest). The optional `edit` takes
what a person changed. `discard` throws away what the space shows and every
space must offer it (the general rule since 1.1: whatever a space shows, a
person can get rid of); the optional `redo` makes it again. They are the app's
trash and retry buttons in the space's header. The canvas and the fact gatherer
empty their space, the chronicler forgets its summary, the gallery takes the
current picture out of the story. (Illustrators have no space: their pictures
are messages in the session, and a gallery browses them.) The app's Spaces panel shows one space per actor whose
skills implement the contract, asks for it again whenever the session's state
moves, offers editing for spaces that provide `edit` and hold text, and can
maximize any space to full screen, where its content stretches to fit. The
Illustrator shows its latest picture; `skill-canvas` is a blank canvas kept in
its own `canvas` document. Each space is a third of the sidebar's height and
scrolls inside. Every space has a close button; a closed space leaves a "Show"
button behind. A `fill` answering `onDemand: true` stays hidden until opened
(clicking the actor's story marker) and leaves nothing behind when closed;
which spaces are open or closed is screen state only (`openSpaces.ts`), never
in the session.

## Instructions

`instructions@1.0` (`instructionsContract` in `core/src/instructions.ts`; in
core because the runtime asks it) gives standing instructions the runtime adds
to every text-model call of every actor (`withInstructions`, ahead of the
call's own system prompt), so no skill has to opt in. Before each text call the
runtime asks every AI actor serving it, in cast order; calls made by a skill
serving it get none, so a source is never asked on its own behalf. Image and
audio calls are left alone. `skill-system-prompt` is the first implementation:
a silent support skill whose `prompt` setting is added for everyone.

## Story view

How the story looks is a contract too. `contract-render` defines `render@1.0`:
`render` takes the story's messages and returns the view as output parts,
which the app draws with its renderers, so a view can be a chat, a page of
prose or a storyboard. It also holds the shared `chat-view` output kind
(`chatView`, with an optional per-message `partOf`). `render` also receives
markers: small labeled lines that actors implementing `marker@1.0` (same
package) place after a message, e.g. a chronicler's "Summarized". They are not
messages, so no prompt sees them; `chatView` attaches them to the entry they
follow, and the app draws each as a clickable line that opens the placing
actor's space. Every story has exactly
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

`Library` keeps the actors, in an injected `KeyValueStore`
(IndexedDB in the app). Items are validated on read, so a bad entry is skipped.

- **One name, one actor.** This is the core rule (Arnd), and it is unusual, so
  it is also in the user manual (`packages/app/src/manual.md`). An actor's name
  is its identity; the id underneath only lets renaming be one edit. Nowhere
  (no session, no template) is there a second actor or a copy with
  that name: sessions refer to library actors by id (see Cast in
  [State](#state)), and editing an actor (`saveEverywhere` only saves to the
  library) changes it everywhere. A variation is an explicit copy with a new
  name. The only copies outside the library are in files, because a file must
  work in another browser; loading one moves them into the library at once.
  Guarded twice: by type, a `LibraryActor` (what the library hands out) is not
  an `OwnActor`, the only kind a cast `join` can keep; and by the app's
  `oneActor.test.ts`, which runs the flows that touch actors (adding, editing,
  retrying, templates, files, old sessions) and fails if any stored session
  holds a copy of a library actor by id or name (`actorCopies`).
- **Names are unique** (`nameKey` ignores case and extra spaces); `saveActor`
  throws `NameTakenError`. The id stays hidden underneath, so renaming is one edit.
- **Adopting.** `adopt(actors, resolve)` makes the library hold incoming actors
  under their own ids, e.g. a loaded session's cast (the app's `syncCast`) or
  an imported library file. New names are added, identical actors linked, and
  names taken by different actors go to `resolve` (keep or replace); the choice
  holds everywhere. Only a session or library loaded from a file asks the
  person, and only when the details differ; a session saved before 0.059
  still holds copies and settles with `keepLibrary` (the library wins) once,
  then refers to its actors like any other.
- **Deleting** an actor the session uses deletes that session too, after a
  warning, so nothing refers to a deleted actor.
- `migrate` brings older libraries up to date (matching ids, unique names) and
  deletes items that are no longer actors (the saved setups of older versions).

## Turn flow in the app

After every turn the session pauses. The human can **Act** (post, then the
director picks one actor to answer), **Pass** (the director picks one
actor), or press an actor's name to let exactly that one speak.

## Not built yet

See the roadmap in the project's design notes. The book room (draft, review,
approve chapters with a writer, a reviewer and you as editor) is the first
walking skeleton. Audio generation has the plumbing (parts, renderer) but no
provider support yet. Session types, the library, views and controls per slot, and channels exist;
next up is hardening the walking skeletons (milestone 7).

## Sessions in the app

The app stores many named sessions (`sessions.ts`: `SessionCatalog`, one
IndexedDB entry per session holding name, template flag and saved state) but
shows one at a time. `SessionSwitcher` (`switcher.ts`) loads the open session
into the page's one runtime and autosaves it under its id. A template is a
session with the flag set; using one starts a new session from a copy.
Deleting a library actor deletes every stored session that has it.
