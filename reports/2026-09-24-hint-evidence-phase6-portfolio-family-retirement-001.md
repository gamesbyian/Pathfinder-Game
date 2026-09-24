# Hint evidence consolidation — Phase 6 portfolio family retirement — 001

> **Status:** portfolio-family retirement remains valid; Phase-6-wide closure claim superseded by PR #2072 hostile audit
> **Last evidence:** 2026-09-24 — this batch correctly retired direct persistence for the two portfolio workflows, but the hostile completion audit later found residual direct canonical Hint writers in CP-SAT, solver diagnostics and technique census plus stale physical-Hint staging in already-migrated workflows.
> **Decision:** Treat the portfolio-family result below as valid family-specific evidence, not proof that Phase 6 as a whole was closed. PR #2072 subsequently retired the remaining workflow writers and added a fail-closed central-persistence guard.
> **Remaining gate:** current whole-program authority is `reports/2026-09-24-hint-evidence-hostile-completion-audit-001.md`; exact-head hostile/closeout validation remains blocking.
>
> **Date:** 2026-09-24
>
> **Batch:** proves real dual-path parity for the history-aware `portfolio-solve-sweep.mjs` family
> (`harvest-portfolio-solve-sweep-reports.mjs`, added by the folded-in PR #2042) at report-file
> granularity, then retires `--save-hints` from both remaining dual-write workflows
> (`solver-production-replay-baseline.yml`, `solver-highbudget-unsolved-sweep.yml`).
>
> **Base commit:** `bd79bdba`.
>
> **Retrospective correction:** "the remaining workflows" was derived from the implementation's
> working inventory rather than a mechanically complete workflow/persistence census. The strengthened
> plan now requires the maintained workflow population to be derived from lifecycle, harvester,
> workflow and entrypoint authorities and requires unclassified persistence routes to fail closed.

## 1. Why this was the last piece of ordinary Phase 6

The prior scope-correction report
([`2026-09-24-hint-evidence-phase6-remaining-families-scope-correction-001.md`](2026-09-24-hint-evidence-phase6-remaining-families-scope-correction-001.md))
established that these two workflows are genuinely different from the level-blind family: they read
existing hints as policy input (baseline/prime-winner), and the level-blind harvester's report walker
explicitly excludes anything with `levelBlind !== true`, so it was never reconstructing their evidence.
Since that report, PR #2042 (folded into this branch earlier) closed exactly this gap: it made
`portfolio-solve-sweep.mjs`'s reports self-describing (`levelRevision`, `discoveryObservedAt`,
per-level `workBudget`, `staticPortfolioArm`) and added `harvest-portfolio-solve-sweep-reports.mjs`,
already wired into `harvest-solver-evidence.yml` unconditionally for both workflows, with a real
function-level proof (`portfolio-solve-sweep-cli-node-test.mjs`'s `deepEqual` assertion between a real
CLI run's direct-persisted provenance and the report-reconstructed provenance for the same solve).

What remained was the same step already applied to `solver-stress-refresh.yml`: prove parity at
**report-file** granularity (not just one function call) against a real, multi-level sweep, then
retire the redundant direct write.

## 2. Real dual-path proof

**Corpus-1** (`data/stress/stress-levels.json`, production defaults: `--work-budget=67000000
--node-budget=50000000 --budget-ms=20000 --baseline=logs/stress-corpus1-baseline.json
--prime-winner`): ran a real 20-level sweep. `Result: solved=20/20` (all primed hits, real re-solves
under the current commit). Saved the direct-write output, reverted, ran the harvester against the raw
report (`source-run-id=888890`):

```
Portfolio evidence harvest: 1 report(s), 20 candidate(s), 20 eligible, 20 referee-accepted,
20 semantic change(s), 0 path / 20 provenance-event / 20 occurrence addition(s), 20 file(s) changed,
0 pending.
```

Field-level comparison (via the shared `decodeHintArtifact`, representation-agnostic, excluding
`foundAt`/`occurrences` bookkeeping per this program's established policy): **0 path mismatches, 0
field mismatches across 25,686 provenance-field comparisons.** Reharvest with the same source-run-id
produced `0 semantic change(s)` — idempotent.

**Corpus-2** (`data/stress/stress-levels-random.json`, production defaults:
`--work-budget=26800000 --node-budget=50000000 --budget-ms=8000 --baseline=logs/stress-corpus2-
baseline.json --prime-winner`): attempted a 5-level sample. Only 1/5 levels (R00001) had a known
baseline winner to prime; the other 4 required a full, unprimed ladder search and — matching this
session's own already-documented corpus-2 timing lesson — ran far longer than a quick canary
justifies. Stopped after ~2 minutes rather than repeat that mistake. The one real completed row
(R00001, a genuine primed re-solve, 830ms/219,375 nodes) was still harvested and compared: **0
mismatches across 386 provenance fields.**

This is a smaller corpus-2 sample than corpus-1's, for the same reason recorded in the level-blind
family's own corpus-2 batch: the harvester's reconstruction logic is corpus-agnostic (no corpus-
specific branching in `harvest-portfolio-solve-sweep-reports.mjs` beyond which of the two allow-listed
corpus paths a report declares), so corpus-1's exhaustive 20-level/25,686-field proof plus corpus-2's
smaller real confirmation is treated as sufficient, consistent with how the level-blind family's
retirement was justified.

## 3. Cleanup

Restored `data/stress/hints/` (20 files) and `data/stress/hints-random/R00001.json` to their real
direct-write-only state, discarding the throwaway `888890`/`888891` occurrence records the parity
proofs produced. No scratch selection-manifest artifact is produced by this harvester (unlike the
level-blind one) — confirmed nothing extra was left behind.

## 4. The retirement edit

In both `.github/workflows/solver-production-replay-baseline.yml` and
`.github/workflows/solver-highbudget-unsolved-sweep.yml`:

- Removed `--save-hints` from both corpus-1 and corpus-2 `portfolio-solve-sweep.mjs` invocations (4
  invocations total across the two files), each with a comment citing this report.
- Removed the now-dead `data/stress/hints/ data/stress/hints-random/` from the final persist steps'
  `git add` lines. In `solver-highbudget-unsolved-sweep.yml`, this also simplified a two-branch
  gap-fill/full-run conditional whose gap-fill branch previously existed solely to add hint paths
  (now removed) into a single `if [ -z "$GAP_FILL..." ]` guard around the one thing that branch still
  needs to do differently (aggregate-report files).
- Left the still-present shard-level hint-staging loops in `solver-highbudget-unsolved-sweep.yml`'s
  "Stage this shard's changed files" step untouched — like `solver-stress-refresh.yml`'s analogous
  loop, it is now a harmless no-op with nothing left under `data/stress/hints*` to find changed.

As with the level-blind family, `harvest-solver-evidence.yml` needed no change: its unconditional call
to `harvest-portfolio-solve-sweep-reports.mjs` (added by PR #2042, not gated to a specific
`SOURCE_WORKFLOW`) already covers both of these workflows' completions.

## 5. Verification

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,586 tests, all pass.
- `npm run test:node` — full suite pass (see commit message for the exact count at commit time).
- `npm run check:workflow-actions` — clean.
- `python3 -c "import yaml; ..."` — both edited workflow files parse as valid YAML.

## 6. What this batch does not do

- Does not touch `harvest-solver-evidence.yml` — already correctly wired by PR #2042.
- Does not attempt an exhaustive corpus-2 proof, for the timing reasons in section 2 — the same
  reasoning already accepted for the level-blind family's own corpus-2 batch.
- Does not touch `solver-diagnostics.yml`, `cpsat-hint-harvest-sweep.yml`, or the isolated-report
  family — those already went through their own dual-path proof/shadow-parity gates in earlier
  batches this session and PR #2011/#2042's own work, and are out of scope here.

## 7. Plan status after this batch

Every ordinary GHA solver-discovery workflow now has its hint/provenance evidence reconstructed
exclusively by a central harvester, with the corresponding direct `--save-hints` write retired:
`solver-stress-refresh.yml` (level-blind, this session's earlier batch), `solver-production-replay-
baseline.yml` and `solver-highbudget-unsolved-sweep.yml` (history-aware portfolio, this batch). This
satisfies Phase 6's own exit criterion — "modern GHA solver discovery has one canonical persistence
authority and no maintained workflow needs physical hint-store knowledge" — for every workflow this
plan's dependency graph names, closing Phase 6.

With Phase 6 (and Phase 7, closed earlier this session) done, Phase 8 (v4 codec — landed via PR #2042,
live for new writes, lazy-migrating existing data on next touch) and Phase 10 (bounded level cleanup —
PR #2042 added a measurement-only sparse-serialization benchmark, not yet a real cleanup pass) are no
longer gated. Remaining plan work: decide and execute a real, bounded Phase 10 cleanup pass using that
benchmark's findings, and decide whether Phase 8's lazy per-write v4 upgrade should instead become an
explicit one-time bulk migration (the plan's own phrasing: "migrate canonical stores in a data-focused
change") now that Phase 6/7 are both closed.
