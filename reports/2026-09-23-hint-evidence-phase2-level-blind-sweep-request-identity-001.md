# Hint evidence consolidation — Phase 2 first producer dual-write — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** first representative-producer migration named in both the reconciled #2002 work's own
> "next work" section and this branch's reconciliation report
> ([`2026-09-23-hint-evidence-pr2002-reconciliation-001.md`](2026-09-23-hint-evidence-pr2002-reconciliation-001.md)).
>
> **Base commit:** `8a7dcb7` (reconciliation batch head).

## 1. Scope

`scripts/level-blind-capability-sweep.mjs` now emits the canonical `solverRequestProjection` /
`solverRequestIdentity` pair (`modules/solver/solver-request-projection.ts` +
`scripts/solver-request-identity-lib.mjs`, both from the reconciled #2002 work) in its report
`summary`, **dual-written alongside** the existing legacy `effectiveConfig`/`effectiveConfigDigest`
pair rather than replacing it, per plan section 14.1's migration discipline ("add the new owner beside
the old path... before destructive replacement") and the mechanical-migration-audit's own explicit
disposition for this exact file ("Dual-write the PR #2002 canonical request projection at the
invocation boundary; retain this legacy envelope through a compatibility period").

This is the smallest real migration step: one producer, additive only, no consumer changed to require
the new fields, no legacy field removed.

## 2. Why this file first

- It is the file the mechanical-migration-audit itself flagged as the clearest example of the "one
  giant identity hash" anti-pattern plan section 3 rejects: its existing `effectiveConfig` mixes the
  literal solve-relevant `SolveOpts` fields with `corpusSha256` (population identity) and
  `levelBlind: true` (an execution-protocol-shaped marker), in one object.
- It already computes its legacy pair from the literal `solveOpts` object handed to the solver at the
  real invocation boundary, which is exactly the doctrine `buildCanonicalSolverRequestProjection` also
  follows — so the new call can consume the exact same `solveOpts` value with no re-derivation.
- It already imports TypeScript solver modules directly (`../modules/solver/ablation-config.js`,
  `../modules/solver/stage-budget.js`), confirming it is only ever invoked through the bundled
  execution topology (`scripts/run-bundled.mjs`), so importing
  `modules/solver/solver-request-projection.ts` needs no new bridge work.
- It already has a real CLI regression test that runs the actual bundled tool end-to-end
  (`level-blind-capability-sweep-cli-node-test.mjs`), giving this batch a pre-existing value-transport
  proof surface rather than requiring a new one.

## 3. Implementation

- Imported `buildCanonicalSolverRequestProjection` and `solverRequestIdentityFromProjection`.
- Computed `solverRequestProjection`/`solverRequestIdentity` from the same literal `solveOpts` object
  the legacy pair already uses, immediately next to that existing computation.
- Added both fields to the written `summary` object, next to `effectiveConfig`/`effectiveConfigDigest`.

No other file's read path was changed. `scripts/check-effective-config-agreement.mjs` and
`scripts/combine-solver-sweep-reports.mjs` (the two existing legacy-pair consumers) continue to read
only the fields they already knew about; the new fields are additive and inert to them, verified by
running both node-test suites unchanged and green.

## 4. Verification

- `level-blind-capability-sweep-cli-node-test.mjs` (the real bundled-CLI regression test) extended with
  assertions that specifically prove **value transport**, not just field presence (plan section
  14.3.F): `--budget-ms=5000` reaches `solverRequestProjection.resourceEnvelope.timeBudgetMs` unchanged;
  `solverRequestProjection.scheduler.mode` is `'production'`; the persisted `solverRequestIdentity`
  matches a **fresh recomputation** from the persisted projection via
  `solverRequestIdentityFromProjection()` (a dual-owner parity proof — the write side and a
  hypothetical read side agree); and the canonical identity is provably distinct from the legacy
  `effectiveConfigDigest` (they must not accidentally collapse to the same value).
- `node --check` and `npm run check:types` — clean.
- `check-effective-config-agreement-node-test.mjs` (9/9) and `combine-solver-sweep-reports-node-test.mjs`
  (all) — unaffected, confirming the dual-write is non-breaking to existing legacy-pair consumers.
- `npx vitest run` — 145 files / 1550 tests, all pass.
- `npm run test:node` — full 179-package aggregate, all pass.

## 5. What this does not do

- Does not migrate `scripts/portfolio-solve-sweep.mjs` (the other producer named in the
  mechanical-migration-audit's table) — its `effectiveConfig` also carries backend/pool/cache fields
  outside solver-request scope, making it a distinct, slightly larger migration; left for its own batch.
- Does not change `check-effective-config-agreement.mjs` or `combine-solver-sweep-reports.mjs` to
  prefer the canonical identity when both are present — that consumer-side migration is explicitly the
  audit's "later disposition" for those files, not this batch's.
- Does not retire the legacy `effectiveConfig`/`effectiveConfigDigest` pair. Per plan section 14.1 item
  8 ("retire the old path only after demonstrated parity"), that requires the consumer migration above
  plus a compatibility-period observation window this single-producer batch does not by itself satisfy.

## 6. Next work

- Same dual-write treatment for `scripts/portfolio-solve-sweep.mjs`.
- Teach `scripts/check-effective-config-agreement.mjs` and `scripts/combine-solver-sweep-reports.mjs`
  to prefer canonical identity when present (via `solver-request-identity-compat.mjs`'s
  `solverRequestIdentityAvailability()`) while still validating legacy-only reports, per the
  mechanical-migration-audit's disposition for both files.
