# Hint evidence consolidation — Phase 2 reproducibility-mode classification — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive (classification owner only, not yet wired into any producer)
>
> **Date:** 2026-09-23
>
> **Batch:** first sub-piece of "integrate raced-backend/reproducibility semantics into the
> execution-protocol layer" (plan section 3.3/K), the last open item from
> [`2026-09-23-hint-evidence-pr2002-reconciliation-001.md`](2026-09-23-hint-evidence-pr2002-reconciliation-001.md)'s
> "next work" list.
>
> **Base commit:** `f8d489e`.

## 1. Why this is split into its own small batch first

Investigated wiring `reproducibilityMode` all the way into `hashExecutionProtocol()`'s canonical
execution-protocol identity (the natural-seeming next step, since that function already exists and
already folds in `execution.reproducibilityExpected`). Two real obstacles surfaced:

1. `docs/solver-experiment-result.schema.json`'s `execution` object has `"additionalProperties":
   false` and is a real, GHA-committed, schema-validated shape (`EXPERIMENT_SCHEMA_VERSION = 3`,
   `check-solver-sweep-result-contract.mjs`). Adding a field there is a schema migration, not a small
   addition, and deserves its own careful batch rather than being bundled into a "just add a
   classification function" change.
2. No current contract-building call site (`publish-solver-sweep-result.mjs`,
   `hint-discovery-process.mjs`, `write-solver-experiment-contract.mjs`) has a "backend" concept at
   all — none of them currently know or record whether direct/webWorker/raced/external dispatch was
   used. `portfolio-solve-sweep.mjs` (the only file that can actually race) doesn't build a full
   decision-grade experiment contract in the first place; it only emits the bare
   `solverRequestProjection`/`solverRequestIdentity` pair. Wiring a real, meaningful `backend` value
   into `hashExecutionProtocol` therefore requires deciding, per producer, where that value comes from
   — separate design work per call site, not one mechanical change.

Building the classification rule as its own standalone, fully-tested owner first — deferring the
schema/wiring work to its own later batch(es) — matches plan section 14.3.A's own instruction to split
by "one main compatibility owner," and avoids inventing the vocabulary under time pressure inside a
larger, schema-risking change.

## 2. Vocabulary decision

Added `modules/solver/reproducibility-mode.mjs`, exporting `EXECUTION_BACKENDS` (`direct`, `webWorker`,
`raced`, `external`) and `REPRODUCIBILITY_MODES` (`deterministic-work`, `first-success-race`,
`historical-wall-clock-sensitive`, `externally-determined`, `unknown`), plus
`classifyReproducibilityMode({schedulerMode, backend})`.

The plan's own suggested placeholder list additionally named `seeded-deterministic`. Investigated
whether that belongs at this layer and concluded it does not: whether a specific technique invoked a
recorded random seed is a **per-attempt** fact (already correctly modeled by
`effectiveSolverInputIdentityStatus()`'s own `randomSeed`/`seedSalt` fields, built in an earlier Phase-2
batch), not a **run-wide** execution-protocol fact. Folding it in here would duplicate a distinction
that already has a correct, more specific owner at the right layer — exactly the "second identity
concept overlapping with the first" the plan's section N warns against. `deterministic-work` therefore
covers both seeded and unseeded direct/webWorker execution at this layer; the seed question is answered
one layer down, per attempt, where it already lives.

`backend` needed its own vocabulary because `first-success-race` and `externally-determined` cannot be
derived from `schedulerMode` alone: `race.mjs` only ever races the `'production'` scheduler ladder (its
own `toRaceLevelOpts` throws otherwise), so a raced and an ordinary sequential `'production'` execution
are indistinguishable by `schedulerMode` alone. `direct` and `webWorker` are classified identically
(`deterministic-work`) because both run the identical `solveLevel()` orchestration — structured-clone
only relocates execution to another thread, per `solver-worker-client.ts`'s own established parity
work from this plan's Phase 1.

Per this plan's historical-missingness doctrine (section 10.2), an absent `backend` classifies as
`unknown`, never defaulted to `deterministic-work` — no current producer records this brand-new
dimension yet, so absence is genuinely unknown, not provably deterministic.

## 3. Verification

7 new tests in `modules/solver/reproducibility-mode.test.ts`, covering every classification branch
(including the two branches that specifically require `backend` because `schedulerMode` alone is
ambiguous), the `unknown` fallback for absent/unrecognized input, and a closing test asserting every
example input's output is a real member of the frozen `REPRODUCIBILITY_MODES` set.

`npm run check:types`/`check:types:tests` and full `npx vitest run` (146 files / 1557 tests) — all
green.

## 4. What this does not do

- Does not wire `backend` or `reproducibilityMode` into `hashExecutionProtocol()`,
  `docs/solver-experiment-result.schema.json`, or any producer. This is a pure, standalone
  classification owner with zero current callers — by design, so the wiring decision (schema version
  bump, per-producer backend-value plumbing) can be made deliberately in its own batch(es) rather than
  bundled here.
- Does not attempt to classify `deterministic-work` vs a hypothetical `seeded-deterministic` at this
  layer (see section 2).

## 5. Next work

Wire this classifier into the execution-protocol layer, in roughly this order:
1. Add `backend`/`reproducibilityMode` as new, additive (not `additionalProperties: false`-breaking —
   requires a schema update either way) fields to `docs/solver-experiment-result.schema.json`'s
   `execution` object, with a plan for whether this needs `EXPERIMENT_SCHEMA_VERSION` bump or can be
   optional-additive within the current version.
2. Extend `hashExecutionProtocol(contract, {arm})` to accept a `backend` option and fold
   `classifyReproducibilityMode()`'s result into its hash input.
3. Thread a real `backend` value from `portfolio-solve-sweep.mjs` (the only producer that can race) —
   this likely means giving that file its own lightweight execution-protocol emission alongside its
   existing bare request-projection dual-write, since it does not build a full decision-grade
   experiment contract today.
4. Decide whether `publish-solver-sweep-result.mjs` and `hint-discovery-process.mjs` should also start
   declaring `backend` (likely `direct` for both, today) or leave it `unknown` until a real
   raced/webWorker producer actually calls them.
