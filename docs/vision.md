# Virtuocity: first iteration brainstorm

Status: draft, from the brainstorm with Arnd on 2026-10-12.

## Fixed decisions

- TypeScript web app.
- Model access goes through providers the user holds keys for: OpenRouter, OpenAI, Anthropic and WIRO.
- Modular from day one: the core is small, and everything else plugs in through registries.

## Core concepts

### Actors

An actor is a **personality** plus a set of **skills**. Actors can be human or AI. An actor with no conversation skill is **silent**: it never speaks, and only acts behind the scenes (scribe, rules keeper, visualizer, composer).

### Skills

- A skill is the single unit of capability. Even **conversation** is a skill.
- One interface, three possible backings: an LLM, plain code, or a hybrid. The core treats them all the same.
- A skill declares the events it listens to, the actions it can take, and the outputs it produces.
- Examples:
  - Conversation
  - D&D GM narration
  - D&D player
  - Dice roller (code)
  - Initiative tracker (code)
  - Memory summarizer
  - Lore lookup
  - Visualizer
  - Composer

### Seats and roles

- A session has seats (GM, player, support, and so on).
- Roles are fully flexible: any actor, human or AI, can take any seat and switch during a session.

### Turns and the director

- Speaking actors take turns, and the app pauses after each turn.
- The user can act, pass, or name the next speaker.
- When the user passes, a **director** picks the next speaker. The director is a skill too, so it can be swapped out.
- Support and silent actors don't take turns. They react to events.
- Status: this is still Arnd's idea to explore, not a fixed decision.

### Event bus

Everything that happens (a message, a dice roll, a state change, a scene change) is an event. Skills subscribe to events and emit new ones.

### Output pipeline

- Every output type (story text, images, audio, character sheets, dice logs) has a **default renderer**. Most renderers are plain code.
- Any renderer can be swapped or decorated by a skill, for example a new text-rendering agent.

### UI as slots

- The layout is a story feed plus open panel areas.
- Modules contribute panels, so support output (image gallery, music player, character sheet, map) never needs changes to the core UI.

## Game modes

A game mode is a module that bundles skills, state schemas (HP, inventory, and so on) and mechanics.

- **Free form:** no rules engine.
- **D&D 5e:** rules come from the SRD 5.1 (CC-BY). Branded content is excluded.
- **Pathfinder 2e:** rules come under the ORC license. Branded content is excluded.

## Engineering guardrails (anti vibe coding)

- Strict TypeScript.
- Lint rules enforce module boundaries, for example game modes can't import each other.
- A duplication checker (such as jscpd) runs in CI and fails the build when it finds copied code.
- Tests cover the core: event bus, turn loop and registries.
- A short conventions file (CLAUDE.md) that every coding agent must follow.

## Memory and knowledge

All of these are optional skills.

- **Summarizer**, in two variants:
  - **Full:** re-summarizes everything from scratch.
  - **Differential:** takes the last summary plus the new messages.
- **Key facts:** a separate optional skill.
- **Lore book:** a separate optional skill.

## Joining and leaving

- Actors can join or leave a session at any time.
- Networked multiplayer over a server is a later goal, not part of the first iteration.

## Model selection (layered)

1. The core sets a default model for each modality (text, image, music, and so on).
2. An actor can override the default.
3. A skill can override it too, and a skill override wins over an actor override.

The resolution order is: skill, then actor, then core default.

## Sessions

- Save and load sessions.
- "Save all" to a file, using the browser's file picker where it's available.
- Every message can be edited.
- Branching: when you rewind, edit or regenerate, everything below that point is removed by default. You can choose to keep it as a branch instead.

## Not in the first iteration

- Character card import (Tavern/SillyTavern). Leaving it out avoids constraining our own format. Maybe later.
- Networked multiplayer.

## Cost and model stats

- Every message produced with an AI call carries optional stats: the model used, token counts and cost (taken from the provider's usage data, where it reports cost).
- Session totals are shown.
- No built-in spending limits. Limits are left to whoever creates the provider keys.

## Open questions

- None left in the brainstorm. Next step: architecture and repo setup.
