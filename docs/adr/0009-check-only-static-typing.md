# ADR 0009: Check-only static typing (JSDoc + `tsc --checkJs`), no build step

**Status:** Accepted (modernization-plan §5 underway). Initial typed surface landed; allowlist grows incrementally.

## Context
The codebase is plain ES modules with contracts enforced by convention/tests/runtime validation.
§5 wants implicit contracts made explicit and machine-checked. ADR 0001 forbids a build step for
serving — the browser must keep loading the `.js` directly.

## Decision
Adopt **check-only** static typing: `// @ts-check` + JSDoc type annotations in `.js`, verified by
`tsc --noEmit` over a **curated allowlist** (`tsconfig.json` `include`). There is **no emit / no
build step** — TypeScript is a dev-only devDependency used purely as a type checker.

- `check:types` (`tsc --noEmit -p tsconfig.json`) runs in the default `check` CI group, so contract
  violations fail the build.
- `tsconfig.json` uses `strict: true` (incl. `noImplicitAny`) over the allowlist, so every annotated
  function documents real parameter/return types. `noEmit` + `allowJs` + `checkJs`.
- The allowlist starts with pure, import-light leaf modules and **grows file-by-file**: a module
  joins only once it's `// @ts-check`'d and passes strict. Files needing a shared `Level` /
  `EngineState` typedef wait until those typedefs exist (§5 Phase 2).

## Initial typed surface (this increment)
`modules/domain/cell-key.js`, `geometry.js`, `move-context.js`; `modules/runtime/actions.js`
(`Action` typedef + factories), `effects.js` (`Effect` typedef + factories), `state-machine.js`.
This covers the **core domain encoding/geometry** and the **runtime command/effect vocabulary** —
two of the completion-spec's named surfaces.

## Consequences
- Contributors get real autocomplete/type errors on the typed modules; the type checker is a CI gate.
- The typed surface is explicit (the `tsconfig.json` `include` list) — untyped areas are not
  accidental gaps but a documented backlog (see `docs/typing.md` for priority order).
- No runtime/serving change: annotations are comments; `// @ts-check` is inert at runtime.
- Next priorities (§5 Phase 2/3): a shared `NormalizedLevel` typedef (unblocks `portal-utils`,
  `game-rules`, `path-state`, much of `solver/`), `EngineState`/slice typedefs, persistence DTOs,
  and runtime validation of external boundaries (Firestore docs, worker messages, storage payloads,
  URL/debug params).
