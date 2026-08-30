# ADR 0011: Full TypeScript migration (supersedes 0009)

**Status:** Accepted — **migration complete** (2026-06-26). Supersedes
[ADR 0009](0009-check-only-static-typing.md) (check-only JSDoc typing). Every `modules/` file is now
`.ts` and strict-checked by `tsc --noEmit`, except the two solver Web Worker host files
(`solver/worker.js`, `solver/solver-worker-client.js`), kept `.js` at the Worker boundary. The logic
core (`domain`/`runtime`/`solver`) carries real `interface`/`type` contracts; the DOM/adapter/
integration layer is strict-passing but typed at the `any` line (DOM-query results cast to `any`,
`createEngineState` still returns `any`). See [docs/typing.md](../typing.md).

## Context
ADR 0009 adopted **check-only** typing: `// @ts-check` + JSDoc over a curated allowlist of `.js`
files, type-checked by `tsc --noEmit`, with **no build step**. That was the right call under ADR
0001 (no build), but it's a half-measure: it can only grow bottom-up, the JSDoc is verbose, and it
never types the DOM/adapter boundaries well. ADR 0010 introduced a **Vite build**, which removes the
blocker — Vite compiles real `.ts`. The owner committed to a full TypeScript migration
(codebase-quality-review #7).

## Decision
Convert `modules/**/*.js` → `.ts`, compiled by Vite, type-checked strictly by `tsc --noEmit`.
Promote JSDoc `@typedef`s to exported `interface`/`type`. Done **incrementally, leaf-first** — each
module is converted only once its dependencies are typed — in small commits that stay green at every
gate (`check:types`, `check:domain-purity`, `vite build`, `test:unit`, `test:node`, `test:e2e`).

### Conversion order (leaf → root)
`domain/` → `runtime/` → `solver/` (primitives → hot core → orchestration) → `state/` → adapters
(`render`, `persistence`, `input`, `ui`) → `engine`, `app`, `boot`.

### Toolchain (the load-bearing decisions)
- **Import specifiers stay `.js`.** Renaming `foo.js` → `foo.ts` keeps every `import './foo.js'`
  unchanged — `tsc` (`moduleResolution: bundler`), Vite, Vitest, and tsx all resolve the `.js`
  specifier to the `.ts` source. So a conversion is a `git mv` + type annotations, not a sweep of
  every importer.
- **`tsconfig` includes `modules/**/*.ts`** (every `.ts` is strict-checked) alongside the shrinking
  `.js` allowlist. As a file converts, its `.js` allowlist entry is removed.
- **Plain-`node` tooling runs under `tsx`.** The validators/dev-tools that import the module graph
  outside Vite (`validate-bundled-levels`, `loader`, `data-asset-runtime-smoke`, `editor-validation`,
  `validate-hint-paths`, `solver:direct`, `ablation:*`) can't load `.ts` under plain `node`, so they run
  via `tsx` (devDep), which resolves `.js`→`.ts` and strips types. Pure text-reading checks and
  graph-free scripts (`startup-smoke`, `firestore-rules`, most `check:*` gates) stay on `node`.
- **Vitest** already compiles `.ts` via Vite — no change needed for the unit suites.
- The convention checkers that scan source (`check-domain-purity`, `check-engine-state-boundary`)
  now glob `.ts` as well as `.js`.
- **ESLint** lints `.ts` via `typescript-eslint` (`recommended`, scoped to `modules/**/*.ts`);
  `no-explicit-any` is off (intentional boundary `any`s) and `no-unused-vars` uses the TS-aware rule
  with the `^_` ignore convention.

## Consequences
- Files migrate in place under `modules/`; renaming the unit suites to `*.test.ts` is folded into
  this work (codebase-quality-review #6 left them `.mjs`).
- ADR 0009's check-only model remains in force for the **not-yet-converted `.js`** files during the
  transition; it is fully superseded once the graph is `.ts`.

## Scope decisions (deliberate — not "unfinished")
These were evaluated and settled; do not re-open them as TODOs.

- **Typing scope: domain-object seams + DOM wins done; full adapter-layer typing DEFERRED.** The logic
  core (`domain`/`runtime`/`solver`/`state`) is typed, the injected dependency bags that carry domain
  objects are typed (`modules/ports.ts` — `LevelUtils`/`DataService`/`SolverApi`, so level objects, raw
  data, and solver results are typed at call sites), and the clean DOM handler/element params are typed.
  The remaining ~700 `any` are the genuinely-dynamic DOM/controller glue (the `ui`/`engine`/`renderer`
  bags via the `ControllerDeps` index signature, `getElementById(...) as any`, SDK objects, the
  dual-shaped `engineState.nav ?? engineState` helpers, `catch (e)`, and `NormalizedLevel`-typed params —
  a different type from `EngineLevel`). Driving these to zero is **not planned**: high-churn, low-value,
  and `tsc` already type-checks the whole tree. See `docs/typing.md`.
- **Type-aware lint scope: adopt promise-safety only.** `@typescript-eslint/no-floating-promises` and
  `no-misused-promises` (checksVoidReturn:false) are **on** — a real bug class in the async solver/
  persistence/controller code — wired via `projectService` on non-test source in `eslint.config.mjs`.
  The rest of `recommended-type-checked` (especially the `no-unsafe-*` family) is **rejected**: it would
  fire on every intentional adapter `any`, producing thousands of false positives given the scope above.

## Known follow-ups (tracked)
- Porting JSDoc-heavy modules to idiomatic TS interfaces (esp. the shared `types.ts` contracts) is the
  remaining idiomatic-TS cleanup — distinct from the adapter-boundary `any`, which is deferred by
  decision above.
