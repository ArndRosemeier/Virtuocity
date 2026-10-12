# Architecture

Virtuocity is a small core plus modules. The core defines the concepts and the
extension points; everything with behaviour (skills, game modes, providers,
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
| `@virtuocity/app`                | Vite + React web app. Decides which modules are installed.             |

New skills, game modes and providers are new packages under `packages/`. New
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
  `gameModes`, `providers`, `directors`, `renderers`, `panels`.
- **EventBus / defineEvent** (`events.ts`): everything that happens is an
  event. Modules declare their own typed events with `defineEvent`.
- **Actor, Personality, Seat** (`actor.ts`): human or AI. An actor's abilities
  come only from its skills; any actor can take any seat.
- **Skill** (`skill.ts`): one interface, backed by `llm`, `code` or `hybrid`.
  `onEvent` for reacting (silent and support actors), `takeTurn` for actors that
  speak. Conversation is just a skill with `takeTurn`.
- **Models** (`models.ts`): `resolveModel` picks skill override, then actor
  override, then the core default for the modality.
- **ModelProvider** (`provider.ts`): runs calls and returns `CallStats`;
  `listModels` returns its catalog (`ModelInfo`: modalities, context, price).
- **Modalities** (`host.modalities`): the modalities the app offers a default
  model for. `coreModule` registers text, image and audio; modules add more.
- **Workspace** (`workspace.ts`, `oplog.ts`, `doc-type.ts`): all shared state.
  See [State](#state) below.
- **Transcript** (`transcript.ts`): the conversation as one document type.
  Messages carry optional `CallStats`; `runtime.allStats()` counts every AI call,
  including ones on discarded branches.
- **Renderers** (`output.ts`): every output kind has one active renderer,
  mostly plain code; skills can `replace` it.
- **Director** (`turns.ts`): picks the next speaker when the human passes.
  The default (`least-recent`) is registered by `coreModule`.
- **Flows** (`flow.ts`, `flow-runner.ts`): see [Flows](#flows) below.
- **SessionRuntime** (`runtime.ts`): a running session. Actors `join` and
  `leave` at any time; `post` adds a message; `pass` lets the director pick one
  AI turn; `runTurn` lets a chosen actor speak. Each call runs at most one AI
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
- **Perspective.** An operation may name an `audience`. `workspace.read(docId,
type, actorId)` folds only the operations that actor may see (their own, and
  those without an audience or with them in it). Skills get `ctx.state`, a view
  from their actor's perspective, and `ctx.transcript`, the transcript as their
  actor sees it. The UI reads the transcript from the human's perspective.
- **Permissions.** Every `WritePolicy` in `host.policies` must allow a change.
- **Cast** (`cast.ts`): who is in the session is a document too, so joining and
  leaving rewind, branch and save with everything else.
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
  other actor's turn in a background job and posts the picture.

## Turn flow in the app

After every turn the session pauses. The human can **Act** (post, then the
director picks one actor to answer), **Pass** (the director picks one
actor), or press an actor's name to let exactly that one speak.

## Not built yet

See the roadmap in the project's design notes. The book room (draft, review,
approve chapters with a writer, a reviewer and you as editor) is the first
walking skeleton. Audio generation has the plumbing (parts, renderer) but no
provider support yet. Next up: context assembly, profiles and skill settings. The app autosaves one session; a
session library comes with blueprints.
