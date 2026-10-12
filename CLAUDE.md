# Working on Virtuocity

Read `docs/architecture.md` before changing code. These rules exist to keep the
codebase modular and free of duplication; CI enforces most of them.

## Rules

- Run `npm run check` before every commit. It must pass.
- New behaviour goes into a module (a package under `packages/`) that plugs
  into a registry. Do not add features to `core` unless it is a new concept or
  extension point every module needs.
- A module may import only `@virtuocity/core`, `@virtuocity/ui` and contract
  packages (`@virtuocity/contract-*`). Modules talk to each other via events
  (`defineEvent`), registries and contract actions, never imports.
- What a skill offers to others is a contract. Skills of the same kind share a
  contract (or extend one) so they stay interchangeable; every implementation runs
  its contract's conformance suite in its tests.
- Before writing a helper, search for an existing one (`rg`). If two modules
  need the same logic, it belongs in `core` or in a shared module, not in two copies.
- No `any`, no non-null assertions, no disabling lint rules or skipping tests to get green.
- Keep files under 300 lines and functions under 60 lines; split rather than grow.
- Every core change and every code-backed skill comes with tests (`*.test.ts` next to the source).
- Every change merged to `main` is one build: add an entry with the next build number at the top of
  `packages/app/src/changelog.ts`, describing what changed for the user (version = build / 1000).
- Inject side effects (fetch, randomness, time, ids) so code stays testable.

## Commands

- `npm run dev`: start the web app
- `npm run check`: typecheck, lint, boundaries, duplication, format, tests
- Every push to `main` deploys the app to GitHub Pages (`.github/workflows/deploy.yml`).
