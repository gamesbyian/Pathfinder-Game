# Bounded class-4/class-5 first-loss phenotyping 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — 14-level provenance-diverse class-4/class-5 sample drawn from the joint-obligation observer pilot's own 206-level population (excluding the 21 levels the newly promoted `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` already rescues), beam known-solution-prefix survival at both production beam widths (STANDARD 2000, WIDE 5000), and a DFS-greedy per-step rank cross-check under five scoring profiles.
> **Decision:** cross-action recurrence is not established in this sample — close that question negative. Known-live material is instead lost through an ordinary beam score-width cull (`rank-retention-loss`), a positive phenotype identification but not a shared cross-action future-feasibility gap. DFS-style local move ranking stays near-optimal (mean max-step rank 2-3) throughout every traced path under every tested production scoring profile, at and around the exact depth where beam permanently discards the same labels. Per the capability map's cross-action rule, this stays **technique/configuration research (WS1/WS4)**, not a WS2 shared-capability escalation.
> **Remaining gate:** repair (the one genuinely distinct production paradigm) is untested by this pilot — `unknown` for that action. Independent confirmation on a fresh sample before any WS4 reopening decision.
> **Evidence role:** discovery/diagnosis — bounded, selected-diagnostic evidence. Not a population-scale claim; not a production change.
> **Selection:** 7 class-4 + 7 class-5 levels, stratified by joint-obligation reject-rate tertile and routing regime, drawn from the joint-obligation observer pilot's already-executed 206-level opportunity population (reuses that evidence rather than resampling), excluding the 21 ids the `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` A/B already solves. All 14 have referee-valid stored hints (`data/stress/hints-random/<id>.json`), used as observation-only known-live labels per the operating model's forbidden-steering boundary.

## Why now

`solver-optimization-workstreams.md` names bounded class-4/class-5 first-loss phenotyping as the active next gate following `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s promotion. The [`algorithmic frontier execution handoff`](2026-09-11-algorithmic-frontier-execution-handoff-001.md) specifies the missing minimum: locate the earliest point where all known-live representative basins disappear, assign a [`capability-map`](2026-09-11-future-feasibility-capability-map-001.md) evidence role, and test cross-action recurrence before treating any residual as a shared-capability candidate.

## Sample

Drawn from the joint-obligation observer pilot's own 86-class-4/120-class-5 real-search population (`reports/stress/joint-obligation-observer-pilot-001.json`) rather than resampling the atlas independently — this reuses already-computed reject-rate/cluster-count evidence for the cross-reference step below. Stratified by reject-rate tertile within each class and by routing regime (intersection-heavy dominant; must-cross-heavy and multi-portal included), excluding the 21 ids `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s A/B already solves (frozen list: `data/stress/joint-obligation-mc-portal-ab-001-ids.txt`). Full selection with per-level metadata: [`reports/stress/first-loss-pilot-sample-manifest-001.json`](stress/first-loss-pilot-sample-manifest-001.json).

| class | ids |
|---|---|
| 4 | R03101, R00329, R03275, R02530, R02309, R03351, R01190 |
| 5 | R01632, R03088, R01097, R03229, R03197, R02185, R02733 |

For each level, the known-live label pool is the densest-first-move ("gate") group of referee-validated stored hints, mirroring `collect-known-solution-prefix-survival.mjs`'s own selection discipline (one representative basin per level, not a bulk-label average). `structuralWinningFamilies` in the score-width forensic output confirms these groups are mostly one structural family (1, occasionally up to 6) — this pilot characterizes one representative known-live basin per level, not independent-basin diversity within a level.

## Step 1: where does known-live support disappear? (beam, both production widths)

Ran `scripts/stress/collect-known-solution-prefix-survival.mjs` at both current production beam widths (`BEAM.STANDARD=2000`, `BEAM.WIDE=5000` from `modules/solver/attempts.ts`) under the `default` scoring profile (the only profile this existing tool exercises).

| width | outcome |
|---|---|
| 2000 | 14/14 lose all known-live support via `score-width-culled`, depth 10-34 (normalized 8.5%-28.6% of required length) |
| 5000 | 14/14 still lose via `score-width-culled`; loss depth moves out by only 0-13 steps (median +2-3) |

Full per-level results: [`width=2000`](stress/first-loss-pilot-beam-width2000-001.json), [`width=5000`](stress/first-loss-pilot-beam-width5000-001.json). Zero correctness alarms in either run (`summary.correctnessAlarms: 0`), and `behaviorIdentical: 14/14` (the observer changed no decision) — the known-live path is never hard-pruned or coarse-state-merged away here; it is discarded purely by score-width competition against other beam survivors.

`scoreWidthForensics` classifies 13/14 as `A-clearly-mis-ranked` (best known rank ~2000-3700 out of a 2700-4500 candidate pool at the cull depth — deep in the bottom half, not a near-miss) and 1/14 as `D-diversity-width-saturation`. **2.5x the width bought only a handful of extra steps, not proportional headroom** — this argues against plain under-provisioning/exposure as the primary explanation and for a genuine, width-insensitive competitive disadvantage.

## Step 2: is this a shared-scorer/cross-action mechanism, or beam-specific?

If the scorer's per-move vocabulary itself devalued these moves, DFS (which commits greedily to the top-ranked move at each step, sharing the identical `scoreMove()`/`scoreAndSort()` vocabulary with beam per `solver-technique-operational-taxonomy.md`) should show the same moves ranked poorly at the same depths. Wrote `scripts/stress/first-loss-dfs-rank-crosscheck.mjs`, reusing `divergence-lib.mjs`'s existing `tracePathRanks` primitive (already used by `hint-divergence.mjs`/`witness-divergence.mjs`), to compute the DFS-greedy local rank of the same known-live labels at every step, under five profiles (`default`, `objectiveFirst`, `intersectionHarvest`, `mustCrossFirst`, `perimeterSweep`).

**Result: near-perfect local ranking everywhere, under every profile.** Mean max-step rank across the entire path is **2-3** for all 14 levels under all 5 profiles (`reports/stress/first-loss-dfs-rank-crosscheck-{default,objectiveFirst,intersectionHarvest,mustCrossFirst,perimeterSweep}-001.json`), including specifically at the depth of beam's own score-width cull (mean rank 0-2 there too). DFS would follow essentially the entire known-live path by greedy local choice; nothing in the per-move scoring vocabulary disfavors these moves.

This localizes the loss mechanism precisely: **beam's simultaneous multi-path width competition** discards a path that is locally well-ordered at every step but accumulates a lower total score than ~2000-4500 other candidate branches active at that depth (very high branching, consistent with these levels' intersection-heavy/must-cross-heavy structure) — not a scorer bias against the move type, and not resolved by moderately increasing width. This is the `rank-retention-loss` role from the capability map, squarely WS4/beam-configuration territory, distinct from R01273's coarse-state-merge/key-collision mechanism (this is ordinary score-width truncation among genuinely distinct, non-merged candidates).

## Step 3: cross-action recurrence verdict

Per the capability map's claim boundary (criterion 1: cross-action recurrence across *materially operationally distinct* actions, not nearby configs of one engine): DFS and beam share the same scoring vocabulary and differ only in retention (`solver-technique-operational-taxonomy.md`'s "Ordinary DFS scoring profile" / "Beam scoring profile" rows), so they are not independent evidence of a deeper shared gap — and here DFS's local ordering is fine, which is itself a **falsification** of the "the scorer doesn't value these moves" hypothesis, not a confirmation of recurrence. **Verdict: this residual's known-live loss does not recur across materially distinct actions in this sample.** It stays technique/configuration research (WS1 routing/WS4 retention), not a WS2 shared-capability escalation, consistent with the task's standing instruction to keep action-specific failures at the technique level.

**Repair is untested.** It is the one paradigm in current production that is genuinely operationally distinct (seeded randomized restart/elite/splice, not a retained/ordered frontier at all), and no existing tool cheaply traces known-solution-prefix survival through it. This is a real gap in this pilot's coverage, not a negative result — mark repair `unknown` for this cohort rather than inferring it also fails cleanly at the same boundary.

## Cross-reference with the joint-obligation observer

All 14 levels have live joint-obligation clusters (reject rate 0.2%-35.5%, cluster count 1-3, drawn from the observer pilot's own real-search firing data). Correlation between reject rate and normalized loss depth is moderate and positive (r=0.54, n=14): levels where joint-obligation fires more often tend to lose known-live support *slightly later*, plausibly because the joint-obligation hard-prune removes more competing candidates from the field before the score-width cull point, not because it threatens the known-live path itself — consistent with zero correctness alarms throughout. This is a small-sample observational note, not a claim; do not extrapolate beyond it.

## Disposition

- **Role assignment:** `rank-retention-loss` (beam score-width competition), 14/14, both classes, multiple routing regimes and reject-rate strata. Not `joint-feasibility-unrepresented`, not `state-equivalence-loss` (0 coarse-state-merge losses, 0 correctness alarms), not `correctness-unsound`.
- **Cross-action recurrence:** not established in this sample (DFS falsifies the shared-scorer story; repair untested/`unknown`). Per the capability map and this task's standing instruction, keep this **action-specific — technique/configuration research**, not a new shared-capability framework.
- **Do not** widen production beam width as a blanket fix from this evidence alone: the 2000→5000 delta bought only a handful of extra steps, not resolution, and width is already a competed resource under the standing fixed-work-envelope rule.
- **Candidate next gate (not yet earned):** if an independent confirmation sample reproduces the same width-insensitive, DFS-falsified score-width phenotype, that would be a materially new bounded mechanism distinct from R01273's coarse-state-merge form and could nominate a narrow WS4 premise (e.g., a diversity-aware retention rule for high-branching depths) — but this single 14-level pilot alone does not clear the "materially new mechanism, independently confirmed" bar `solver-optimization-workstreams.md` sets for reopening WS4. Do not reopen WS4 from this report alone.
- **What this does not establish:** population prevalence (14/671 rows only); whether repair rescues any of these 14; whether a targeted retention change would net-positive at matched work (soundness of a change is not the same question as its survivor-effect risk, per `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s own promotion discipline).

## Artifacts

- `scripts/stress/first-loss-dfs-rank-crosscheck.mjs` — new, reuses `divergence-lib.mjs::tracePathRanks`; no behavior change to production code.
- [`reports/stress/first-loss-pilot-sample-manifest-001.json`](stress/first-loss-pilot-sample-manifest-001.json) — frozen 14-id sample with reject-rate/cluster/regime/provenance metadata.
- [`reports/stress/first-loss-pilot-beam-width2000-001.json`](stress/first-loss-pilot-beam-width2000-001.json), [`...-width5000-001.json`](stress/first-loss-pilot-beam-width5000-001.json) — beam known-solution-prefix survival at both production widths.
- `reports/stress/first-loss-dfs-rank-crosscheck-{default,objectiveFirst,intersectionHarvest,mustCrossFirst,perimeterSweep}-001.json` — DFS-greedy rank cross-check per profile.
