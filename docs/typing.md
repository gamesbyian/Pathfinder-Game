# Static Typing (check-only)

> **Status:** **complete** — the full TypeScript migration (ADR 0011 / codebase-quality-review #7)
> is done. Every file under `modules/` is now `.ts` and strict-checked by `tsc --noEmit`, **except**
> the two solver **Web Worker host** files (`solver/worker.js`, `solver/solver-worker-client.js`),
> which stay `.js` at the Worker boundary. There is no longer a curated allowlist — `tsconfig.json`
> `include` is just `modules/**/*.ts` (+ `scripts/ablation-config.mjs`, imported by the solver graph).

## How it works
- All source is TypeScript (`.ts`), compiled by **Vite** at build time (ADR 0010). The browser loads
  the bundled output, never raw `.ts`.
- `npm run check:types` runs `tsc --noEmit -p tsconfig.json` over `modules/**/*.ts` under `strict`
  (incl. `noImplicitAny`). It's in the default `check` CI group, so type-contract violations fail the
  build. `tsc` itself emits nothing — Vite owns emit.
- Import specifiers stay `.js` (e.g. `import { x } from './foo.js'`); tsc/Vite/tsx all resolve
  `.js`→`.ts`. The plain-`node` CLI tools that import the module graph run under **tsx**.
- `.ts` files are linted by **typescript-eslint** (`tseslint.configs.recommended`, scoped to
  `modules/**/*.ts`). `no-explicit-any` is **off**: the DOM/adapter boundary is deliberately
  `any`-typed (see below).

## Typing depth: two regimes, by design
The migration converted every layer, but the *depth* of typing varies by what the code touches:

- **Pure logic core — real types.** `domain/`, `runtime/`, and `solver/` (minus the 2 Worker files)
  carry genuine `interface`/`type` contracts: `NormalizedLevel`, `MoveState`, `SolverSearchState`,
  `PrepLevel`, `AttemptConfig`, `ScoringProfile`, `Effect`/`Action`, etc. These catch real
  type-contract violations.
- **State core — real types (Initiative A, landed).** The single mutable runtime tree is no longer
  `any`. `createEngineState` returns a named `EngineState` interface composed of per-slice interfaces
  (`NavigationState`, `HinterState`, `HazardState`, …) in `state-slices.ts`; `createState` returns
  `{ ENGINE: EngineState }`. Every mutation routes through `modules/state/actions/*.ts`, whose
  `resolveEngineState` now returns `EngineState` — so a wrong field name or wrong-typed write in any
  state action fails `check:types`. The `modules/state/` + `modules/state/actions/` surface carries
  **zero** `: any`/`as any`, and a compile-time guard in `state-slices.ts` (`IsAny<…>`) fails the build
  if `EngineState` ever collapses back to `any`.
- **DOM/adapter/integration boundary — typed at the `any` line.** `render/`, `ui/`, `input/`,
  `engine/` controllers, the DOM-touching persistence clients, and the top-level integration roots
  (`app`/`boot`/`engine`/`editor`/`ui`/`renderer`/`persistence`/`themes`/`levelutils`/`loader`)
  orchestrate the now-typed ENGINE tree and `any`-typed injected deps. A controller that consumes
  `state` *may* now annotate it `EngineState` without a cast; their DOM-query results
  (`document.getElementById(...) as any`) and injected sub-system deps stay `any` by design — strict-
  passing without false precision. They remain gated by `check:engine-state-boundary`,
  `check:domain-purity`, `check:modal-a11y`, and the Playwright `e2e`/`visual`/`theme-coverage` suites.

**The highest-leverage deepening — typing the `EngineState` core — has landed** (Initiative A,
see above and `docs/codebase-strengthening-plan.md`), **and the adapter-layer follow-up has now
landed too** (see `docs/codebase-quality-followup-plan.md` §2): every controller/factory dependency
bundle types its `state` carrier via the shared `ControllerDeps` type (`{ state: AppState; [k:
string]: any }` in `modules/state.ts`), so `state.ENGINE.<field>` accesses are checked end-to-end
while injected subsystem handles (`core`/`ui`/`engine`/…) stay `any` by design. The `computeStep`
runtime port, `path-navigator`, and `computeWinEffects` carry real `EngineState`/slice types as well.
What remains `any` by design: DOM query handles, third-party SDK objects, the two Worker files, the
dual-form `engineState.nav ?? engineState` helpers in `engine.ts`/`editor.ts`, and params that hold a
core-constant value rather than a domain object.

## Adding / changing a module
- New modules are `.ts` from the start; they're picked up by the `modules/**/*.ts` glob automatically
  (no `tsconfig` edit needed).
- Keep `npm run check:types` clean — annotate, don't `// @ts-ignore`, unless there's a documented
  reason. Prefer real types in the logic core; `any` is acceptable at the DOM/deps boundary.

> **`checkJs`/`allowJs` note:** these remain on so the two Worker `.js` files (and any imported `.js`)
> still resolve, but every first-class source file is `.ts`.

## Known typing-surfaced oddities
Both items surfaced while typing have since been **fixed**:
- `path-validator.js` used to pass a visit-**count** map as `cellUsage` to `isValidMove` (which
  expects an `{h,v}` axis-usage map), so the edge-reuse check was a no-op on the referee path. The
  validator now builds a real per-cell axis-usage map (`markAxis`), so the referee enforces the
  no-edge-reuse rule. Verified: all 156 baked hints + solver solutions still validate.
- `policy.js`'s vestigial `antiDeadCorridorWeight` (defined in every profile, never read by
  `scoreMove`) was removed from the profiles, the `ScoringProfile` typedef, and the policy test.
