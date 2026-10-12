# Architecture

Virtuocity is a small core plus modules. The core defines the concepts and the
extension points; everything with behaviour (skills, game modes, providers,
renderers, panels) is a module that plugs in through a registry. The product
vision behind this lives in [vision.md](vision.md).

## Packages

| Package                  | Role                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `@virtuocity/core`       | Concepts and extension points. No UI, no network, no other packages. |
| `@virtuocity/openrouter` | `ModelProvider` for OpenRouter, reports model, tokens and cost.      |
| `@virtuocity/skill-dice` | Example code-only skill (dice notation, `dice.requested` event).     |
| `@virtuocity/app`        | Vite + React web app. Decides which modules are installed.           |

New skills, game modes and providers are new packages under `packages/`.

## Dependency rules (enforced by `npm run boundaries`)

```
app ──► any module ──► core
```

- `core` depends on no other Virtuocity package.
- A module depends only on `core`, never on another module or on `app`.
- Modules cooperate through **events** on the bus and through **registries**, not imports.
- No circular imports anywhere.

## Core concepts

- **Registry** (`registry.ts`): typed, id-keyed plugin collection. Duplicate ids
  throw; `replace` swaps an entry on purpose.
- **ModuleHost / VirtuocityModule** (`module.ts`): a module's `register(host)`
  adds things to the host's registries: `skills`, `gameModes`, `providers`,
  `directors`, `renderers`, `panels`.
- **EventBus / defineEvent** (`events.ts`): everything that happens is an
  event. Modules declare their own typed events with `defineEvent`.
- **Actor, Personality, Seat** (`actor.ts`): human or AI. An actor's abilities
  come only from its skills; any actor can take any seat.
- **Skill** (`skill.ts`): one interface, backed by `llm`, `code` or `hybrid`.
  `onEvent` for reacting (silent and support actors), `takeTurn` for actors that
  speak. Conversation is just a skill with `takeTurn`.
- **Models** (`models.ts`): `resolveModel` picks skill override, then actor
  override, then the core default for the modality.
- **ModelProvider** (`provider.ts`): runs calls and returns `CallStats`.
- **MessageTree** (`session.ts`): history as a tree. Every message is editable;
  `rewindTo` removes everything below by default or keeps it as a branch.
  Messages carry optional `CallStats`.
- **Renderers** (`output.ts`): every output kind has one active renderer,
  mostly plain code; skills can `replace` it.
- **Director** (`turns.ts`): picks the next speaker when the human passes.
- **Panels**: UI slots that modules fill; the core layout is a feed plus slots.

The core is UI-agnostic: `ModuleHost<R, C>` is generic over the render type and
component type. The app fixes them to React (`packages/app/src/types.ts`).

## Not built yet

The turn loop (pause after every turn, act / pass / choose), the conversation
and summarizer skills, game modes, session save/load and file export.
