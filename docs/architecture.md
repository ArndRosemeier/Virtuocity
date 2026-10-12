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
- **MessageTree** (`session.ts`): history as a tree. Every message is editable;
  `rewindTo` removes everything below by default or keeps it as a branch.
  Messages carry optional `CallStats`.
- **Renderers** (`output.ts`): every output kind has one active renderer,
  mostly plain code; skills can `replace` it.
- **Director** (`turns.ts`): picks the next speaker when the human passes.
  The default (`least-recent`) is registered by `coreModule`.
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

## Turn flow in the app

After every turn the session pauses. The human can **Act** (post, then the
director picks one character to answer), **Pass** (the director picks one
character), or press a character's name to let exactly that one speak.

## Not built yet

See the roadmap in the project's design notes. Next up: one operation log for
all shared state (with branching, perspectives and persistence), then flows,
which will also show human tasks as forms in the UI.
