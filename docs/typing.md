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
- **DOM/adapter/integration boundary — typed at the `any` line.** `render/`, `ui/`, `input/`,
  `engine/` controllers, the DOM-touching persistence clients, and the top-level integration roots
  (`app`/`boot`/`engine`/`editor`/`ui`/`renderer`/`persistence`/`themes`/`levelutils`/`loader`)
  orchestrate the `any`-typed ENGINE tree (`createEngineState` returns `any`) and `any`-typed injected
  deps. Their parameters and DOM-query results (`document.getElementById(...) as any`) are typed `any`
  — strict-passing without false precision. They remain gated by `check:engine-state-boundary`,
  `check:domain-purity`, `check:modal-a11y`, and the Playwright `e2e`/`visual`/`theme-coverage` suites.

**The single high-leverage way to deepen this:** give `createEngineState` a real `EngineState` return
type (the per-slice shapes already exist in `state-slices.ts`). Because the entire state-mutation
layer routes through `state-actions`, that one change would start type-checking every mutation site
and make tightening the adapter layer's `any`s worthwhile. Out of scope for #7; a future enhancement.

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
  `scoreMoveV2`) was removed from the profiles, the `ScoringProfile` typedef, and the policy test.
