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

**The highest-leverage deepenings have landed.** (1) The `EngineState` core is typed (Initiative A,
see above and `docs/archive/codebase-strengthening-plan.md`): every controller/factory dependency bundle
types its `state` carrier via `ControllerDeps` (`modules/state.ts`), so `state.ENGINE.<field>`
accesses are checked end-to-end. (2) The **domain-object-bearing dependency bags are typed** via
`modules/ports.ts` — `LevelUtils`, `DataService`, `SolverApi` — so level objects, raw level data,
and solver results stay typed at every call site instead of being laundered back to `any` through
the DI boundary. Construction is piecemeal, so those bags are optional on `ControllerDeps` and each
factory declares the subset it uses via `RequireDeps<'levelUtils' | …>`. The `computeStep` runtime
port, `path-navigator`, and `computeWinEffects` carry real `EngineState`/slice types as well, and the
clean DOM handler/element params (`KeyboardEvent`/`PointerEvent`/`MouseEvent`, `HTMLElement`) are typed.

What remains `any` **by design** (the genuinely-dynamic adapter glue): the DOM/controller subsystem
handles (`core`/`ui`/`engine`/`editor`/`renderer`/`persistence`/`themes`/`debug`) that arrive via the
`ControllerDeps` index signature, `document.getElementById(...) as any` query handles, third-party SDK
objects, the two Worker files, the dual-form `engineState.nav ?? engineState` helpers, `catch (e)`
clauses, ad-hoc local shapes, and params that hold a core-constant or the solver's `NormalizedLevel`
(distinct from `EngineLevel`) rather than an engine level. `ports.ts` interface *params* likewise stay
`any` where dynamic — only the domain-object *returns* are typed.

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
