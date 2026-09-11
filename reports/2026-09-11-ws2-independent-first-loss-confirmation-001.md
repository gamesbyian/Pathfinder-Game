# WS2 independent first-loss confirmation 001

> **Status:** concluded-positive (recurrence confirmed; cross-action recurrence still not established)
> **Last evidence:** 2026-09-11 — a second, independent 14-level sample (7 class-4 + 7 class-5), disjoint from both the dev sample and the `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` excluded gains, run through the identical beam known-solution-prefix survival + DFS-greedy rank cross-check pipeline as [`2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md`](2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md).
> **Decision:** the `rank-retention-loss` phenotype (beam score-width cull, width-insensitive, DFS-falsified shared-scorer hypothesis) recurs 14/14 on the independent sample, identical in shape to the dev sample. This is now a **doubled, sample-independent result** (28/28 across two disjoint samples). Cross-action recurrence remains not established — DFS and beam still share too much machinery to count as materially distinct actions per the operational taxonomy. Repair coverage is addressed separately ([`2026-09-11-repair-side-first-loss-exposure-001.md`](2026-09-11-repair-side-first-loss-exposure-001.md)).
> **Remaining gate:** cross-action recurrence needs a materially distinct action (repair) or a materially new bounded retention mechanism before WS4 reopens. Do not re-run this same design a third time absent a new premise.
> **Evidence role:** confirmation (sample-independent, selection fixed before execution) — the dev sample was development/tuning data; this sample was untouched until this run.
> **Selection:** stratified by reject-rate tertile within class, deterministic seeded draw (`ws2-independent-confirmation-sample-001`, mulberry32/FNV-1a per-tertile Fisher-Yates, repo convention), drawn from the joint-obligation observer pilot's own 206-level population (`reports/stress/joint-obligation-observer-pilot-001.json`), excluding the 21 `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`-rescued ids and the 14 dev-sample ids. Frozen manifest: [`first-loss-confirmation-sample-manifest-001.json`](stress/first-loss-confirmation-sample-manifest-001.json).

## Why now

The dev-sample phenotyping report's own remaining gate: "Independent confirmation on a fresh sample before any WS4 reopening decision." `solver-optimization-workstreams.md` names this as WS2's next gate after the joint-obligation promotion. This report answers it.

## Prespecification (recorded before running)

- **Population:** the joint-obligation observer pilot's 86-class-4/120-class-5 real-search population (206 total), minus the 21 already-rescued ids, minus the 14 dev-sample ids (171 remaining candidates).
- **Sample:** 7 class-4 + 7 class-5, reject-rate-tertile-stratified, deterministic seeded draw (no manual curation) — chosen ids: class-4 `R02438, R02590, R02897, R03223, R00786, R03083, R01023`; class-5 `R00139, R02801, R02170, R02210, R02025, R01290, R02324`. All 14 confirmed to carry referee-valid stored hints before running.
- **Evidence role:** confirmation, not development. The selection rule (tertile-stratified deterministic draw) was fixed and executed once; no case was substituted after seeing its own result.
- **Exact phenotype under test:** does known-live support disappear via `score-width-culled` (beam simultaneous-frontier competition) rather than hard-prune/coarse-state-merge, at both production beam widths, with width-insensitive loss depth, and does a DFS-greedy rank cross-check under 5 scoring profiles still show near-top local ranking at the same depth (falsifying a shared-scorer explanation)?
- **Stop/escalation:** if the phenotype does not recur, treat the dev-sample finding as sample-specific and stop escalating WS4. If it recurs but DFS again falsifies a shared-scorer story, cross-action recurrence remains unestablished — stay at WS1/WS4 technique level, per the capability map's claim boundary. Only a materially distinct action (repair) showing the same signature would earn escalation.

## Step 1: beam known-solution-prefix survival, both production widths

`scripts/stress/collect-known-solution-prefix-survival.mjs`, identical config to the dev-sample run (`--beam-width=2000 --node-budget=3000000` / `--beam-width=5000 --node-budget=6000000`).

| width | outcome |
|---|---|
| 2000 | 14/14 lose all known-live support via `score-width-culled`, depth 11-41 (normalized 9.2%-55.4%) |
| 5000 | 14/14 still lose via `score-width-culled`; loss depth moves out by only 1-5 steps |

Full results: [`width=2000`](stress/first-loss-confirmation-beam-width2000-001.json), [`width=5000`](stress/first-loss-confirmation-beam-width5000-001.json). `summary.correctnessAlarms: 0`, `behaviorIdentical: 14/14` in both runs — identical shape to the dev sample: 2.5x width buys only a handful of extra steps, not proportional headroom.

| id | depth@2000 | depth@5000 | Δ |
|---|---:|---:|---:|
| R02438 | 17 | 19 | 2 |
| R02590 | 22 | 22 | 0 |
| R02897 | 41 | 41 | 0 |
| R03223 | 14 | 15 | 1 |
| R00786 | 21 | 22 | 1 |
| R03083 | 11 | 12 | 1 |
| R01023 | 16 | 18 | 2 |
| R00139 | 14 | 20 | 6 |
| R02801 | 12 | 14 | 2 |
| R02170 | 18 | 19 | 1 |
| R02210 | 13 | 13 | 0 |
| R02025 | 16 | 16 | 0 |
| R01290 | 11 | 13 | 2 |
| R02324 | 12 | 16 | 4 |

## Step 2: DFS-greedy rank cross-check, 5 scoring profiles

`scripts/stress/first-loss-dfs-rank-crosscheck.mjs`, against the width-2000 survival file, under `default`, `objectiveFirst`, `intersectionHarvest`, `mustCrossFirst`, `perimeterSweep`.

| profile | mean rank at cull depth | mean max-step rank | range |
|---|---:|---:|---|
| default | 0.61 | 2.54 | 1.8-3.0 |
| objectiveFirst | 0.61 | 2.56 | 2.0-3.0 |
| intersectionHarvest | 0.61 | 2.56 | 2.0-3.0 |
| mustCrossFirst | 0.61 | 2.49 | 2.0-3.0 |
| perimeterSweep | 0.61 | 2.54 | 1.8-3.0 |

Near-top local ranking throughout every traced path, under every profile, including specifically at the depth of beam's own score-width cull (mean rank ~0.6) — DFS would follow essentially the entire known-live path by greedy local choice. This reproduces the dev sample's falsification of the shared-scorer hypothesis exactly (dev sample: mean max-step rank 2-3, cull-depth rank 0-2).

## Interpretation

Combining both samples (28 levels total, two disjoint draws):

- **Recurrence: 28/28.** Every level in both samples loses known-live support exclusively via `score-width-culled`, never hard-prune or coarse-state-merge. Zero correctness alarms across 28 levels.
- **Width-insensitivity: 28/28.** 2.5x width bought 0-13 extra steps in the dev sample, 0-6 in the confirmation sample — never proportional headroom. This argues against plain under-provisioning as the mechanism in both samples independently.
- **Shared-scorer hypothesis falsified: 5/5 profiles x 2 samples.** DFS-greedy per-step ranking stays near-optimal (mean max-step rank 2-3) at and around the exact cull depth in both samples, under every tested profile.
- **Cross-action recurrence: still not established.** DFS and beam remain operationally too similar (same `scoreMove()`/`scoreAndSort()` vocabulary, differ only in retention) to count as independent evidence per the capability map's claim boundary (criterion 1). This is now sample-independently confirmed to be **beam-specific `rank-retention-loss`**, not a broader shared-capability gap, pending a materially distinct action.

## Disposition

- **Role assignment (confirmed, sample-independent):** `rank-retention-loss`, 28/28 across two disjoint samples, both classes, multiple routing regimes and reject-rate strata.
- **Do not** widen production beam width from this evidence — same standing conclusion as the dev-sample report, now doubly supported.
- **WS4 reopening:** still not earned. The phenotype is real and recurring, but recurrence across *configurations of one engine* (2000 vs 5000, sample A vs sample B) is not the same evidence class as cross-*action* recurrence. Repair is the one materially distinct production action; see [`2026-09-11-repair-side-first-loss-exposure-001.md`](2026-09-11-repair-side-first-loss-exposure-001.md) for that coverage.
- **What this does not establish:** population prevalence beyond 28/671 rows; whether a targeted beam retention change would net-positive at matched work; whether the same phenotype recurs on transfer/challenge (cross-generator) material — not attempted here, and not warranted absent a mechanism earning that scale.

## Artifacts

- [`reports/stress/first-loss-confirmation-sample-manifest-001.json`](stress/first-loss-confirmation-sample-manifest-001.json) — frozen 14-id independent sample with selection provenance.
- [`reports/stress/first-loss-confirmation-beam-width2000-001.json`](stress/first-loss-confirmation-beam-width2000-001.json), [`...-width5000-001.json`](stress/first-loss-confirmation-beam-width5000-001.json).
- `reports/stress/first-loss-confirmation-dfs-rank-crosscheck-{default,objectiveFirst,intersectionHarvest,mustCrossFirst,perimeterSweep}-001.json`.
- No new tooling: reused `collect-known-solution-prefix-survival.mjs` and `first-loss-dfs-rank-crosscheck.mjs` unmodified.
