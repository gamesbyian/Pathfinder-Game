# Static Typing (check-only)

> **Status:** current-state reference. modernization-plan §5 / ADR 0009. TypeScript is a dev-only
> type checker — **there is no build step**; the browser loads the `.js` directly (ADR 0001).

## How it works
- Modules opt in with a `// @ts-check` pragma and JSDoc type annotations.
- `npm run check:types` runs `tsc --noEmit -p tsconfig.json` against a **curated allowlist**
  (`tsconfig.json` `include`), under `strict` (incl. `noImplicitAny`). It's in the default `check`
  CI group, so type-contract violations fail the build.
- Nothing is emitted/compiled. The annotations are inert at runtime.

## Currently typed (the allowlist)
Keep this in sync with `tsconfig.json` `include`:
- `modules/domain/cell-key.js` — `PackedKey` encoding (`PACK`/`UNPACK`/`inBounds`).
- `modules/domain/geometry.js` — variant coordinate/axis transforms.
- `modules/domain/move-context.js` — `MoveContext` presets.
- `modules/runtime/actions.js` — `Action` typedef + `ActionType`/`Actions` factories.
- `modules/runtime/effects.js` — `Effect` typedef + `EffectType`/`Effects` factories.
- `modules/runtime/state-machine.js` — `VALID_LOGIC_TRANSITIONS` + `isValidLogicTransition`.

## Adding a module to the typed surface
1. Add `// @ts-check` at the top and JSDoc types to its exports (params/returns; `@typedef` for
   shared shapes).
2. Add the path to `tsconfig.json` `include`.
3. `npm run check:types` until clean — annotate, don't `// @ts-ignore`, unless there's a documented
   reason.

## Untyped backlog (priority order — intentional, not accidental)
1. **Shared `NormalizedLevel` typedef** (the engine's internal level shape: `grid`, `gateKeys`,
   `goalKey`, `blockSet`, `portalMap`, `flippingFilterMap`, masks, …). This is the keystone — it
   unblocks `modules/domain/portal-utils.js`, `move-rules.js`, `path-validator.js`,
   `runtime/game-rules.js`, `runtime/path-state.js`, and much of `modules/solver/`.
2. **`EngineState` + slice typedefs** (`modules/state-slices.js` already has JSDoc `@typedef`s per
   slice; promote them to `// @ts-check`'d contracts and type the state-action helpers).
3. **Persistence DTOs** (`SubmissionRecord`, `ProgressRecord`, session payload) + **runtime
   validation** of external boundaries: Firestore docs, solver worker messages, local/session
   storage payloads, URL/debug params (§5 Phase 3).
4. **Controller ports** (`EditorRuntimePort` is already a typedef in `modules/app.js`; add
   `RendererPort`/`UiPort`/… as the seams formalize).

The pure layers (`domain`/`runtime`/`solver`) are the highest-value next targets because they're
already browser-free (`check:domain-purity`) and carry the correctness-critical logic.
