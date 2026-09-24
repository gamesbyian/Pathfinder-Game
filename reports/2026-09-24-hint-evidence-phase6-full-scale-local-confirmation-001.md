# Hint evidence consolidation — Phase 6 full-scale local confirmation — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-24
>
> **Batch:** proves the `harvest-level-blind-report-hints.mjs` central-harvester reconstruction is
> byte-identical to the direct-write path (`level-blind-capability-sweep.mjs --save-hints`) at real
> full corpus-1 scale (all 102 levels), superseding a live `solver-stress-refresh.yml` GHA dispatch that
> was already running but could not actually validate this session's fix. Also fixes a real
> parallel-test race condition discovered while re-running the full validation suite.
>
> **Base commit:** `6c975b3`.

## 1. Why this batch exists instead of the live GHA run

Following the prior batch's family-retirement canary
([`2026-09-24-hint-evidence-phase6-level-blind-family-retirement-001.md`](2026-09-24-hint-evidence-phase6-level-blind-family-retirement-001.md),
a 3-level canary), the plan's own Phase 6 retirement gate asks for a real full-scale confirmation
before `solver-stress-refresh.yml`'s shards can safely drop `--save-hints`. `solver-stress-refresh.yml`
has no cheap-trial dispatch input, so a real run takes 2.5–5.5 hours across 20 shards, and one was
dispatched (run `35944989969`).

Directly challenged mid-wait: *"Is this full run truly required to gain whatever understanding it will
provide? there's no faster way to accomplish the same thing?"* This was correct, for two independent
reasons:

1. The shard/combine GHA machinery itself is not in question — it is already proven by 71 prior
   production runs. What is in question is only the harvester-vs-direct-write reconstruction logic,
   which is fully reproducible locally, at any scale, without GHA.
2. `harvest-solver-evidence.yml` (the job the dispatched run would have triggered) hardcodes
   `ref: main` for its own checkout and always pushes to `main` — meaning it would have run
   **pre-session, unfixed** harvester code, never exercising the `workBudget`/projection fix this
   session made. Waiting on it would have produced zero verification value for the fix in question.

The already-dispatched run was left running (not canceled) since it remains independently useful
production data for the project, but this batch stopped treating it as a gate and instead ran the
equivalent proof locally, in about 20–25 minutes total.

## 2. Full-scale local dual-path proof

Ran a real, full corpus-1 (`data/stress/stress-levels.json`, all 102 levels, `--levels=all`) sweep in
the background (`level-blind-capability-sweep.mjs --budget-ms=15000 --save-hints`):

- **Result:** `solved=100/102; requested=102; levelBlind=true` (2 genuine `work-budget-reached`
  levels: R01014, R01195 — not solver bugs, just budget-bounded misses at this budget).
- Saved the real direct-write output, reverted `data/stress/hints/` to its pre-sweep committed state,
  then ran the **fixed** central harvester (`harvest-level-blind-report-hints.mjs`) against the
  sweep's raw report with a throwaway `source-run-id=888888`:
  `1 report(s), 1 merged, 102 source row(s), 100 solved row(s), 100 referee-accepted row(s), 100 new
  hint/provenance record change(s), 0 pending record(s)`.
- **Field-level comparison**, direct-write output vs. central-harvester reconstruction, across all 102
  files: **0 path mismatches**, **95,328 provenance-field comparisons, 0 mismatches**.
- **Reharvest idempotency**: re-ran the same staged report with the same run id — `0 new hint/provenance
  record change(s)`, confirming the harvester does not double-append on rediscovery.
- **Technique diversity**: the raw sweep report exercised **20 distinct winning configs** (beam/dfs/
  admissible-order-fallback variants), confirming this is a real, varied production-shaped workload, not
  a narrow synthetic case.
- **Confirmed the `workBudget` fix is genuinely exercised at this scale**: `summary.workBudget` is
  `None` (no explicit CLI override, the exact previously-broken case) while
  `summary.solverRequestProjection.resourceEnvelope.baseWorkBudget` correctly resolves to `50250000` —
  this is the derived value the harvester now reads instead of the always-null legacy field.

## 3. Cleanup

Restored `data/stress/hints/` to the real direct-write-only state (discarding every `888888`
throwaway-run-id occurrence record the parity/reharvest proof produced) and removed the harvester's
scratch selection-manifest artifact (`reports/stress/hint-harvest-selection/run-888888.json`) —
matching the same class of cleanup already done for run ids `777001`/`777002` in the prior batch. The
100 real level-blind rediscoveries this canary produced (new provenance entries and, where applicable,
new paths for these 100 already-partially-known levels) are retained, since they are genuine solver
output, not throwaway proof state.

## 4. A real bug found while re-validating: parallel-test race on a shared fixture file

Re-running the full validation suite (`npm run test:node`) surfaced a real, pre-existing, nondeterministic
failure in `test:harvest-solver-diagnostics-reports`:

```
AssertionError [ERR_ASSERTION]: expected a reconstructed provenance entry with cumulativeElapsedMs=777
from the report's timeMs field; got entries: [null,null,null]
```

Root cause: `harvest-cpsat-discovery-reports-node-test.mjs` and `harvest-solver-diagnostics-reports-
node-test.mjs` (both added in this session's earlier `86e0cf6` batch) each snapshot, mutate, and restore
the **same real tracked file**, `data/hints/P00001.json`, for their real-row fixture. `test:node` runs
its package tests concurrently via `run-scripts-parallel.mjs`; when both tests' processes overlapped in
time, one test's write and/or restore raced the other's, corrupting the in-flight state the other test
was asserting against. This was invisible in every prior individual run of either test in isolation, and
even invisible in some full `test:node` runs, since it only manifests when the two processes' file
I/O actually overlaps — confirmed by reproducing it locally: running one copy of each test concurrently,
repeated, failed nondeterministically before the fix and passed 8/8 trials after.

**Fix:** changed `harvest-cpsat-discovery-reports-node-test.mjs`'s real-row fixture to use a different
real published level, **P00002** (which independently satisfies the same fixture precondition — an
already-known hint with a recorded `levelRevision` — verified directly), leaving
`harvest-solver-diagnostics-reports-node-test.mjs` on P00001. The two tests no longer touch the same
file, eliminating the race at its root rather than serializing or retrying around it.

**Verification:**
- Ran 8 trials of one copy of each test launched concurrently: 8/8 both exit 0 (previously
  nondeterministic).
- Ran the full `npm run test:node` suite twice after the fix: **197/197 packages pass**, 0 failures,
  both times.
- Confirmed the real tracked fixture files (`data/hints/P00001.json`, `data/hints/P00002.json`) are
  byte-identical to their committed state after all of the above test runs (`git status` clean on both).

## 5. Full validation

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,580 tests, all pass.
- `npm run test:node` — **197/197 packages pass** (0 failures), confirmed on two independent full runs
  after the race fix.
- `npm run check:workflow-actions` — clean.
- `npm run check:audit-artifacts` — clean.
- `node scripts/stress/hint-occurrence-acceptance-audit.mjs` — `"acceptance": "pass"`, zero violations.
  Occurrence-lineage totals unchanged from the prior Phase 7 batch (`occurrenceRecords: 41`,
  `eventsWithOccurrences: 30`) since this batch's 100 real corpus-1 rediscoveries are new provenance
  events without yet-independently-observed occurrence lineage of their own, not new occurrences on
  existing events.

## 6. Does this constitute sufficient evidence to retire `--save-hints` from `solver-stress-refresh.yml`?

**Not in this batch.** This batch proves the harvester-vs-direct-write reconstruction is exact at full
corpus-1 scale for the level-blind family. It deliberately does not yet:

- Prove the same for corpus-2 (`data/stress/stress-levels-random.json`, ~1,700 levels) at full scale —
  only a 3-level canary from the prior batch touched that corpus.
- Edit `.github/workflows/solver-stress-refresh.yml` itself. Removing `--save-hints` from live workflow
  YAML is a distinct, higher-blast-radius change (it changes what every future dispatch of this
  workflow actually commits) from a local proof-of-equivalence, and per this program's own discipline
  of small, single-compatibility-owner batches, it is deliberately left as its own explicit follow-up
  rather than bundled here.

Recommended next step: run the equivalent full-scale local proof against corpus-2, then make the
`solver-stress-refresh.yml` edit as its own batch once both corpora are confirmed.

## 7. What this batch does not do

- Does not edit any GitHub Actions workflow file.
- Does not cancel the still-running GHA run `35944989969` — left running as independently useful
  production data, no longer treated as blocking this program's verification.
- Does not touch corpus-2 (`data/stress/hints-random/`) or the September-9 rescue cohort
  (`data/stress/hints-random/`'s Phase-7 enrichment from the prior batch is untouched).

## 8. Next work

Full-scale corpus-1 confirmation for the level-blind family is now complete and verified, with a real
test-infrastructure race bug found and fixed along the way. Remaining plan work: the equivalent
corpus-2 full-scale proof, the `solver-stress-refresh.yml` `--save-hints` retirement edit itself (once
both corpora are confirmed), the other still-dual-path families
(`solver-production-replay-baseline.yml`, `solver-highbudget-unsolved-sweep.yml`), then Phase 8 (v4
schema) and Phase 10 (level cleanup), both still explicitly deferred per the plan's own guidance.
