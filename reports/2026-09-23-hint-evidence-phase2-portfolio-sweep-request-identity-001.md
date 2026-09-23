# Hint evidence consolidation — Phase 2 second producer dual-write — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** second representative-producer migration, following
> [`2026-09-23-hint-evidence-phase2-level-blind-sweep-request-identity-001.md`](2026-09-23-hint-evidence-phase2-level-blind-sweep-request-identity-001.md).
>
> **Base commit:** `7e2d41c`.

## 1. Scope

`scripts/portfolio-solve-sweep.mjs` now emits `solverRequestProjection`/`solverRequestIdentity`
alongside its existing legacy `effectiveConfig`/`effectiveConfigDigest` pair, same dual-write
discipline as the level-blind sweep batch. This closes the second (and last currently-named) producer
in the mechanical-migration-audit's "Producer-local `effectiveConfig` dialect" table.

## 2. A real architectural question this file raised that level-blind did not

`portfolio-solve-sweep.mjs`'s legacy `effectiveConfig` is built from `effectiveSolveOpts`, which is
the base `solveOpts` object with one exception: `legacyLatencyPortfolioExperiment` is passed through
`serializePortfolioExperiment()` first, converting its `pass2Configs`/`pass3Configs`/
`conditionalPasses[].configs` fields from `Set`s to plain arrays (JSON can't serialize a `Set`).

Checked whether the canonical projection needed the same treatment before calling it. It does not:
`buildCanonicalSolverRequestProjection`'s own `canonicalLegacyLatencyExperiment()` already does
`[...experiment.pass2Configs].sort()` internally, which works identically whether the input is a `Set`
or already an array (spreading either produces an array). So the canonical call uses the **raw** base
`solveOpts` (never `effectiveSolveOpts`), letting the projection's own normalization own that
conversion rather than duplicating it at the call site.

Also confirmed `solveOptsFor(baseOpts, id)` (the per-level adaptive-budget/prime-winner override
layer) always returns a fresh spread object and never mutates `baseOpts` in place, so the base
`solveOpts` reference stays a stable, unmutated run-wide value for the whole sweep — exactly the
input the projection needs (level-specific overrides like `primeAttempt` are per-level and correctly
excluded from run-wide request identity by the projection's own design).

## 3. Implementation

- Imported `buildCanonicalSolverRequestProjection` and `solverRequestIdentityFromProjection`.
- Computed both from the raw base `solveOpts`, immediately after the existing
  `effectiveConfigDigest` computation.
- Added both fields to the written `summary` object, next to `effectiveConfig`/`effectiveConfigDigest`.

## 4. New test: no pre-existing CLI-level test covered this file

Unlike `level-blind-capability-sweep.mjs`, this file had no end-to-end CLI regression test (only
`test:portfolio-solve-sweep-lib` for its library functions and `test:portfolio-solve-sweep-worker` for
its raced-worker dispatch — neither exercises the CLI's own report-writing). Added
`scripts/portfolio-solve-sweep-cli-node-test.mjs`, matching the established real-bundled-CLI pattern
(`node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- ...` against a tiny solvable
fixture level, the same convention every workflow uses for this tool). Wired into `package.json` as
`test:portfolio-solve-sweep-cli` and added to the `test:node` aggregate.

The test proves value transport, not just shape: a `--node-budget=12345` sentinel must reach
`solverRequestProjection.resourceEnvelope.nodeBudget` unchanged, the persisted identity must match a
fresh recomputation from the persisted projection, and the canonical identity must be provably distinct
from the legacy `effectiveConfigDigest`.

## 5. Verification

- `node --check` and `npm run check:types` / `check:types:tests` — clean.
- New `scripts/portfolio-solve-sweep-cli-node-test.mjs` — passes, including the transport-proof
  assertions.
- `npx vitest run` — 145 files / 1550 tests, all pass.
- `npm run test:node` — full 180-package aggregate (179 + this batch's new test), all pass.

## 6. What this does not do

- Does not consolidate the raced-backend (`--race-pool-size`) `poolSize`/`overallBudgetMs` fields into
  any identity layer — those remain execution-protocol scope (plan section 3.3/V), not yet built.
- Does not change `check-effective-config-agreement.mjs` or `combine-solver-sweep-reports.mjs` to
  prefer canonical identity — same deferred consumer-migration item named in the level-blind batch's
  own report.
- Does not retire the legacy `effectiveConfig`/`effectiveConfigDigest` pair, for the same
  demonstrated-parity reason given in the level-blind batch.

## 7. Next work

Both producers named in the mechanical-migration-audit's table now dual-write canonical solver-request
identity. The remaining Phase 2 items (per the reconciliation report's "next work" section) are:
teach the two legacy-pair consumers to prefer canonical identity when present; define the per-level
effective-input projection; integrate raced-backend semantics into the execution-protocol layer;
consolidate the source-run envelope duplicates; and resolve the TypeScript-runtime-vs-plain-Node
bridge question for producers that are not already bundled.
