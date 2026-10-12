# Lantern: the Virtuocity design language

Lamp light on a dark table: deep ink surfaces, parchment text and one warm
amber accent. Stories are set in a book serif; everything around them is a
quiet UI sans. Dark is the default; a parchment light theme mirrors it.

Everything lives in `@virtuocity/ui`. Any module that contributes UI (panels,
renderers, dialogs) uses its tokens and components, never raw colors or sizes.

## Tokens (`packages/ui/src/styles/tokens.css`)

| Group      | Tokens                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| Surfaces   | `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border(-strong)`                   |
| Text       | `--text`, `--text-muted`, `--text-faint`                                                 |
| Accent     | `--accent`, `--accent-hover`, `--accent-contrast`, `--accent-soft`, `--accent-glow`      |
| Status     | `--danger(-soft)`, `--success`                                                           |
| Characters | `--hue-0` … `--hue-7`, picked per name by `hueIndex`                                     |
| Type       | `--font-ui` (Inter), `--font-story` (Literata), `--font-mono`, `--text-xs` … `--text-xl` |
| Space      | `--space-1` … `--space-7` on a 4px grid                                                  |
| Shape      | `--radius-sm/md/lg/pill`, `--shadow-1/2`                                                 |
| Motion     | `--ease`, `--dur-fast`, `--dur`                                                          |

The theme is chosen in Settings (System, Dark, Light); the app resolves it and
sets `data-theme` on `<html>`.

## Rules

- **One accent.** Amber marks the primary action, focus, selection and cost.
  Never use it for decoration.
- **Story text is serif**, at `--text-lg` with `--leading-story`. UI text is sans.
- **Characters are colored by name**, consistently: avatar, chips, cast list.
- **Human lines** get a surface card with an accent rule; AI lines sit on the page.
- **Metadata is quiet**: model, tokens and cost are small pills that brighten on hover.
- **Dialogs are native `<dialog>`** via `Modal`, with a header, scrolling body and footer.
- **Every icon button has a label** (`IconButton` requires one).

## Components

`Button` (primary, secondary, ghost, danger; md and sm), `IconButton`, `Icon`,
`Field` + `TextInput` / `TextArea` / `SecretInput`, `Pill`, `Avatar`, `Modal`,
`Tabs` + `Section`, `EmptyState`, `ModelPicker`, `ModelLayerEditor`.

### Model pickers

`ModelPicker` picks one model for one modality: searchable, with context size
and price, and a typed custom id as the fallback. `ModelLayerEditor` shows one
picker per modality for one layer of the model stack. Every layer uses it:

- Settings: core defaults (`inheritLabel="Not set"`).
- Characters: actor overrides (`inheritLabel="Use the default"`).
- Skills: skill overrides, which beat the actor's.
