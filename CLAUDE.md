# Working on Virtuocity

Read `docs/architecture.md` before changing code. These rules exist to keep the
codebase modular and free of duplication; CI enforces most of them.

## Rules

- Run `npm run check` before every commit. It must pass.
- New behaviour goes into a module (a package under `packages/`) that plugs
  into a registry. Do not add features to `core` unless it is a new concept or
  extension point every module needs.
- A module may import only `@virtuocity/core`. Modules talk to each other via
  events (`defineEvent`) and registries, never imports.
- Before writing a helper, search for an existing one (`rg`). If two modules
  need the same logic, it belongs in `core` or in a shared module, not in two copies.
- No `any`, no non-null assertions, no disabling lint rules or skipping tests to get green.
- Keep files under 300 lines and functions under 60 lines; split rather than grow.
- Every core change and every code-backed skill comes with tests (`*.test.ts` next to the source).
- Inject side effects (fetch, randomness, time, ids) so code stays testable.

## Commands

- `npm run dev`: start the web app
- `npm run check`: typecheck, lint, boundaries, duplication, format, tests
