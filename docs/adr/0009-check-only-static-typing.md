# ADR 0009: Check-only static typing (JSDoc + `tsc --checkJs`), no build step

**Status:** **Being superseded by [ADR 0011](0011-full-typescript-migration.md)** (full TypeScript
migration, started 2026-06-26). The check-only JSDoc model below remains in force for the
not-yet-converted `.js` files during the transition; it is fully superseded once the module graph is
`.ts`. Original context retained below.

> Accepted (modernization-plan §5 **Done**). The typed surface spanned the full pure logic core +
> the logic/boundary/state layers (66 modules); the DOM adapter/controller/integration layer was a
> deliberate, documented scope boundary (see "Completion criterion & scope boundary" below).

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

## Completion criterion & scope boundary
§5 is **complete** when every layer where `tsc` adds real correctness value is type-checked, and the
remainder is a *deliberate, documented* boundary rather than an accidental gap. That criterion is met:

**Typed (66 modules) — the logic + boundary + state layers:**
- The entire **pure logic core**: all of `modules/domain/`, all of `modules/runtime/`, and all of
  `modules/solver/` (except the two Web Worker host files — `Worker`/`postMessage` globals, exempt
  from `check:domain-purity`).
- The **theme normalization chain** (`theme-engine` + `theme-normalizer` + `theme-registry`), the
  whole **`modules/editor/`** directory, the entire **ENGINE state layer** (`state-slices` +
  `state.js` + the `state-actions` barrel + all 11 `state/actions/*` mutation helpers), three
  **persistence repositories**, `scripts/ablation-config.mjs`, the data/util **shims** (`Solver`,
  `data`, `debug`), and `engine/win-controller` (whose pure `computeWinEffects` core is typed).

**Deliberately outside the typed surface — the DOM adapter/controller/integration layer:**
`modules/render/*` (canvas/draw), most of `modules/ui/*` (DOM construction/manipulation),
`modules/input/*` (pointer/gamepad/keyboard event handlers), the remaining `modules/engine/*`
sub-controllers, the DOM-touching persistence (`firebase-client`/`local-session-store`/
`progress-store`), and the top-level integration roots (`app`/`boot`/`engine`/`editor`/`ui`/
`renderer`/`persistence`/`themes`/`levelutils`/`loader`).

**Why this is the right boundary (not a shortcut):** these modules orchestrate the **`any`-typed
ENGINE tree** (`createEngineState` returns `any`) and **`any`-typed injected deps**, so a `tsc` pass
over them is overwhelmingly `@param {any}` annotations that document nothing and provide no safety —
while imposing real maintenance cost (every new param needs a JSDoc tag). Their correctness is
already gated by purpose-built checks: `check:engine-state-boundary` (all ENGINE mutations route
through the typed state-actions), `check:domain-purity` (the pure core can't import the adapter
layer), `check:modal-a11y`, and the Playwright `e2e`/`visual`/`theme-coverage` suites. Pure decision
cores extracted into these controllers (`computeWinEffects` [typed], `computeJumpScareEffects`,
`planResetCheat`, `planSubmissionAdvance`) are unit-tested per plan §2.

**Future tightening path (single high-leverage move):** type the ENGINE tree itself — give
`createEngineState` a real `EngineState` return type (the per-slice `@typedef`s already exist in
`state-slices.js`). Because the entire state-mutation layer is *already* under `// @ts-check`, that
one change immediately type-checks every mutation site for free, and makes typing the adapter layer
genuinely valuable (no longer all-`any`). That is the natural next increment if/when desired, and it
is unblocked by this §5 work — not a prerequisite for calling §5 done.

## Consequences
- Contributors get real autocomplete/type errors on the typed modules; the type checker is a CI gate.
- The typed surface is explicit (the `tsconfig.json` `include` list) — untyped areas are not
  accidental gaps but a documented backlog (see `docs/typing.md` for priority order).
- No runtime/serving change: annotations are comments; `// @ts-check` is inert at runtime.
- Next priorities (§5 Phase 2/3): a shared `NormalizedLevel` typedef (unblocks `portal-utils`,
  `game-rules`, `path-state`, much of `solver/`), `EngineState`/slice typedefs, persistence DTOs,
  and runtime validation of external boundaries (Firestore docs, worker messages, storage payloads,
  URL/debug params).
