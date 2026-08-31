# Static typing

All first-class source under `modules/` is TypeScript and strict-checked, except the solver Web Worker host boundary `modules/solver/worker.js`. `modules/solver/solver-worker-client.ts` is TypeScript. Vite owns emit; `tsc` is check-only.

## Contract

- `npm run check:types` runs `tsc --noEmit -p tsconfig.json` over `modules/**/*.ts` under `strict`; it is part of `npm run check`.
- Source imports keep `.js` specifiers (`import './foo.js'`); tsc/Vite/tsx resolve them to `.ts` source.
- Documentation names actual repository source paths (`.ts`) rather than their `.js` import specifiers.
- Module-graph CLI tools that need source loading use `tsx` unless their hot solver path is deliberately bundled through `scripts/run-bundled.mjs`.
- TypeScript ESLint applies to `modules/**/*.ts`. `no-explicit-any` is intentionally off because adapter/DOM boundaries use explicit `any` where precise typing would be false confidence.

## Typing depth

| Layer | Policy |
|---|---|
| `domain/`, `runtime/`, `solver/` | Real domain/search types; avoid `any`. |
| State core | `EngineState` plus typed slice interfaces; state actions are typed end to end. |
| Domain-bearing ports | `modules/ports.ts` types `DataService`, `SolverApi`, and domain-object results; former utility-facade responsibilities now use their owning domain/input/editor modules directly. |
| UI/render/input/controllers/persistence integration | Typed state/domain values, but dynamic DOM handles, subsystem dependencies, third-party SDK objects, and other adapter glue may use `any`. |
| Worker boundary | `modules/solver/worker.js` remains intentionally outside the normal `.ts` surface. |

`state-slices.ts` contains a compile-time guard against `EngineState` collapsing to `any`. `engineState` writes must still flow through state actions; typing complements rather than replaces architecture checks.

## Adding or changing code

- New source modules are `.ts`; the glob picks them up automatically.
- Keep `npm run check:types` clean. Prefer real types in pure logic and domain-bearing interfaces.
- Use `any` only at genuinely dynamic adapter boundaries; do not spread it back into the logic core.
- Avoid `// @ts-ignore` unless the exception is documented and unavoidable.
- `checkJs`/`allowJs` remain enabled for the Worker boundary and imported JavaScript.

Historical TypeScript migration details and typing-surfaced bug stories are implementation history, not current typing rules; use git/archive history when needed.
