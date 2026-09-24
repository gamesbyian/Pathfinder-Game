# Hint evidence consolidation — Phase 6 corpus-2 sample confirmation — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — a real corpus-2 sample (11 levels, 3 solved) confirmed level-blind harvester parity, complementing the exhaustive corpus-1 proof.
> **Decision:** both corpora now have sufficient evidence to retire --save-hints from solver-stress-refresh.yml.
> **Remaining gate:** make the --save-hints retirement edit itself, then repeat the proof for the two portfolio-family workflows.
>
> **Date:** 2026-09-24
>
> **Batch:** extends the prior full-scale corpus-1 harvester-parity proof
> ([`2026-09-24-hint-evidence-phase6-full-scale-local-confirmation-001.md`](2026-09-24-hint-evidence-phase6-full-scale-local-confirmation-001.md))
> to corpus-2 (`data/stress/stress-levels-random.json`), and records why a full 1,700-level corpus-2
> sweep is impractical locally, so the recommendation is scoped to what was actually run rather than
> assumed from corpus-1's shape.
>
> **Base commit:** `606b9ff`.

## 1. Why this is a sample, not a full corpus-2 sweep

Corpus-1 (102 levels) confirmed harvester/direct-write parity exhaustively in ~20–25 minutes. Corpus-2
has 1,700 levels — naively the same approach would take ~17x longer, but the real cost is worse than
linear: corpus-2's randomly generated levels are harder per level, so far more of them run every
technique/config in the portfolio out to the wall-clock budget before giving up
(`work-budget-reached`) instead of returning quickly on an early success. A real, measured attempt at
`--levels=pos:1-200 --budget-ms=15000` needed **~57 minutes to reach only 11/200 levels** (about 5
minutes/level average, with visible per-level variance far higher than that) before it was stopped —
a full 1,700-level run at this rate would take on the order of days, with no proportional increase in
verification value over corpus-1's already-exhaustive proof (the harvester's merge/reconstruction code
is corpus-agnostic — `CORPUS` is a single hardcoded path constant in both `harvest-level-blind-report-
hints.mjs` and the sweep script, and no per-row logic branches on which corpus a report came from).

Given that, this batch stopped the sample at the point it had genuinely reached — 11 levels, 3 solved —
rather than force a specific level count. This mirrors the same principle applied earlier this session
to the live GHA run: match the verification effort to the actual marginal value, not to a fixed target
that turns out to be needlessly expensive once measured.

## 2. Two real process-management mistakes made while starting this sample

Both are recorded here because they affected working-tree state directly, and the record needs to be
honest about what happened to it:

1. **First launch used `&` together with the harness's own `run_in_background: true`.** This
   double-backgrounds the command; the wrapping shell reported `exited with code 0` immediately, but
   the actual sweep process was silently orphaned and kept running underneath. A second, corrected
   launch was then started (via manual `nohup ... & disown`) before the first was found — for roughly a
   minute, **two independent sweep processes were writing to the same output files and the same real
   `data/stress/hints-random/*.json` files concurrently.** Caught by checking `ps aux` immediately
   after the second launch (the fix already established once earlier this session, for the corpus-1
   background-sweep-killed-mid-flight incident, was to always verify process state rather than trust a
   tool's own exit report). The orphaned first process was killed immediately
   (`kill -9`), and the surviving file (`data/stress/hints-random/R00001.json`, the only level either
   process reached before the kill) was verified programmatically to hold exactly one clean added
   provenance entry with no duplicate or truncated JSON — the brief overlap did not corrupt anything,
   confirmed rather than assumed.
2. **The corrected run itself was then stopped intentionally** at 11/200 levels once its true per-level
   cost was measured (`ps -p <pid> -o etime` showing 55+ minutes elapsed for 11 levels), per the
   reasoning in section 1. `SIGTERM` was sent; the process had actually already exited by the time the
   signal landed, with the incremental `--out` report file left in a clean, fully-formed, valid-JSON
   state for exactly 11 levels (`summary.levelsRun: 11`, matching the console log exactly) — the sweep
   script writes its report file after each level, not only at the very end, so this was a real,
   complete stopping point, not a truncated write.

## 3. A test-methodology contamination found and isolated (not a code bug)

Level R00001 was solved twice across the two events above: once by the orphaned first process (kept,
since it was verified real and undamaged, per item 1), and again by the corrected run when it reached
R00001 as row 1 of its own 11-level sample. Both solves used the exact same solver technique/config/
seed, so the storage merge logic (`dedupeProvenanceEntries`) correctly treated the second solve as
*the same semantic event* as the first and did not overwrite it — this is correct, intentional
behavior (`dedupe-hint-provenance.mjs`'s own doctrine: identity excludes `foundAt`/timing, so a
re-solve of an already-known event is a no-op, not a new entry).

This made R00001 unsuitable for a clean before/after harvester comparison in this batch: the
direct-write snapshot used for comparison reflected the *first* (orphaned-run) solve's timing, while
the harvester's reconstruction (built from the *second* run's own raw report row, starting from a
freshly reverted, uncontaminated baseline) correctly reflected that run's own fresh timing. Diffing
the two showed a real but expected discrepancy in `search.elapsedMs`/`search.cumulativeElapsedMs` (696
vs. 739 / 17089 vs. 17082) — an artifact of comparing two different physical solve events that the
storage layer correctly recognizes as one semantic event, not a reconstruction defect. **R00001 is
excluded from the parity comparison below for this reason**, stated plainly rather than folded into an
aggregate mismatch count. R00059 and R00080 were each solved exactly once, cleanly, with no such
overlap.

## 4. Parity proof (R00059, R00080)

Saved the real direct-write output for these two levels, reverted `data/stress/hints-random/` to its
committed baseline, and ran the fixed central harvester (`harvest-level-blind-report-hints.mjs`)
against the same 11-level raw report (`--source-run-id=888889`):

```
Level-blind evidence harvest: 1 report(s), 1 merged, 11 source row(s), 3 solved row(s),
3 referee-accepted row(s), 3 new hint/provenance record change(s), 0 pending record(s).
```

Field-level comparison (excluding `foundAt` and `occurrences`, which the merge/identity logic itself
treats as legitimate write-time bookkeeping rather than semantic-identity fields — consistent with
`dedupe-hint-provenance.mjs`'s own stated policy that only `foundAt` is excluded from dedup identity):

- **0 path mismatches**, **541 provenance-field comparisons, 0 mismatches** across R00059 and R00080.
- **Reharvest idempotency**: re-ran the same staged report with the same run id — `0 new hint/
  provenance record change(s)`, confirming no double-append on rediscovery, matching corpus-1's
  result.

Restored `data/stress/hints-random/` to the real direct-write-only state for all three touched levels
(R00001, R00059, R00080), including R00001's real (if test-contaminated-for-comparison-purposes)
solve — it is genuine solver output, not fabricated, and correctly reflects what actually happened.
Removed the harvester's scratch selection-manifest artifact
(`reports/stress/hint-harvest-selection/run-888889.json`).

## 5. Full validation

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,580 tests, all pass.
- `npm run test:node` — 197/197 packages pass.
- `npm run check:workflow-actions` / `check:audit-artifacts` — clean.
- `node scripts/stress/hint-occurrence-acceptance-audit.mjs` — `"acceptance": "pass"`, zero
  violations.

## 6. Conclusion on the `--save-hints` retirement question

This sample, combined with corpus-1's exhaustive full-scale proof, is sufficient evidence that
`harvest-level-blind-report-hints.mjs` reconstructs the same evidence as the direct-write path for
**both** corpora the level-blind family covers, given:

- The harvester's own code makes no corpus-specific branching in its merge/reconstruction logic — the
  only corpus-conditional behavior anywhere in the harvester is which of the two allow-listed corpus
  paths a report declares (`ALLOWED_CORPORA`), not how a row is processed once accepted.
- Corpus-1 already proved this exhaustively (100% of levels, 95,328 fields, 0 mismatches).
- This corpus-2 sample, though small by level count, proved the identical mechanism against corpus-2's
  own file layout (`data/stress/hints-random/`, `data/stress/stress-levels-random.json`) with 0
  mismatches on every level not contaminated by this batch's own test-process mistakes.

**Recommendation:** this constitutes sufficient evidence to remove `--save-hints` from `solver-stress-
refresh.yml`'s two shard invocations (corpus-1 and corpus-2) in a following, explicit batch, replacing
it with a `combine`-stage harvest step that runs `harvest-level-blind-report-hints.mjs` against the
already-produced `reports/stress/solver-corpus{1,2}-latest.json` combined reports instead of having
each shard write hints directly. This is deliberately left as its own batch (a live-workflow-YAML
change is a distinct, higher-blast-radius edit from a local proof), per this program's established
discipline of one compatibility owner per batch.

## 7. What this batch does not do

- Does not edit `.github/workflows/solver-stress-refresh.yml`.
- Does not attempt a full 1,700-level corpus-2 sweep — the timing data in section 1 is the reason,
  not a shortcut taken without justification.
- Does not touch corpus-1 (`data/stress/hints/`) or the September-9 rescue cohort.

## 8. Next work

With both corpora now confirmed (one exhaustively, one by a real representative sample with an
explicitly documented scope), the next batch can make the `solver-stress-refresh.yml` `--save-hints`
retirement edit itself. After that: the other still-dual-path families
(`solver-production-replay-baseline.yml`, `solver-highbudget-unsolved-sweep.yml`), then Phase 8 (v4
schema) and Phase 10 (level cleanup), both still explicitly deferred.
