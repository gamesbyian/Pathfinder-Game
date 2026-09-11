# Post-1029 residual priority refresh 001

> **Status:** ready
> **Last evidence:** 2026-09-10 — production capability run `34531412380`: Corpus 1 99/102, Corpus 2 1,029/1,700, zero errors and zero deadline truncation; Corpus 2 is +54/-0 against the pre-restoration solved set.
> **Decision:** refresh the residual boundary before further family sizing, elevate portal coarse-state-merge salvage from a low-priority closed promotion to a high-value constrained research target, and keep bounded admissible-order repricing/resumable-portfolio work available in parallel.
> **Remaining gate:** execute the existing residual joins against the 671-level post-restoration miss set and use those results to choose the next production-changing experiment.
> **Evidence role:** research prioritization / preflight

## Why this refresh is necessary

The live Corpus-2 boundary moved materially after portal restoration: 975/1,700 to 1,029/1,700, leaving **671 misses**. The +54 is a clean full-population reproduction of the two promoted portal restorations' matched-work effects (+52 must-cross neighbour-budget propagation and +2 connectivity volume). Any residual-family counts or shares derived at the 975/1,700 boundary are therefore historical sizing evidence, not current population counts.

In particular, do **not** carry the old `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort forward as a current denominator. Its structural definition remains useful, but membership/solve status must be recomputed at the 1,029 boundary before it drives priority.

The refreshed WS1 lifecycle classification already covers one axis of the new residual: 671 unsolved levels, including 551 that do not reach `goal-attraction-disabled-retry`, 290 structurally skipped by `must-cross-neighbor-prune-disabled-retry`, 51 mechanically eligible but unreached by `repair-fallback`, and 169 `admissible-order-fallback` rows whose apparent work-starvation is a telemetry artifact despite substantial real work. That evidence separates some exposure/allocation failures from exposed-and-failed capability failures, but it does not replace the broader isolated-T1-winner join.

## Post-restoration residual atlas: use existing tooling

Do not add another overlapping analysis framework. Reuse the existing scripts and canonical assets.

Primary missing-exposure join:

```bash
node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- \
  --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json \
  --census=reports/stress/technique-census/32240161854/combined-cells.json \
  --out=tmp/post-1029-missing-attempt-exposure.json
```

This script already defines the relevant question correctly: among **current production misses**, which exact normalized base-T1 attempt identities are absent from the production menu despite frozen isolated evidence that they solve the level? Its output is development evidence, not same-revision causal proof.

Join that result with the already-retained post-restoration lifecycle classification (`reports/2026-09-10-ws1-existing-data-exposure-classification-001.md`) and current structural/fingerprint data. The atlas should classify each current miss, without forcing exclusivity, along these axes:

1. **known isolated winner / no known isolated winner**;
2. **winner offered / winner not offered** in the current production menu;
3. **mechanically eligible but unreached / reached and failed** from lifecycle telemetry;
4. **portal topology**, must-cross burden, intersection burden, flippers/other obligations, routing regime, and existing fingerprints/family labels;
5. **repair-close / repair-far or other retained search-progress evidence** where instrumentation is trustworthy;
6. **specialist status**, especially a sole isolated winner or unusually low winner multiplicity.

Do not use `cluster-unsolved-failures.mjs`'s `beam-collapse` tag as a capability signal: that script documents the instrumentation gap that makes timed-out beam `nodesExpanded` structurally misleading. Reuse its trustworthy repair/DFS classifications only where the current input schema supports them.

The output needed for prioritization is small: current counts for (a) missing exposure with a known rescuer, (b) exposed-and-failed with a known rescuer, (c) no-known-rescuer residuals, plus the largest structural overlaps inside each bucket and a protected specialist list. No new solving is required for this refresh.

## Elevate portal coarse-state-merge salvage

`STRATEGY_PORTAL_COARSE_STATE_MERGE` remains correctly **default-OFF**. Its global promotion failed the specialist-retention gate: the frozen 954-level portal A/B produced **158 gains / 12 losses (net +146)**, and `R01273`'s sole isolated beam winner still failed under treatment at 10x the matched-work envelope. That is a real capability regression, not a budget/order artifact.

However, a mechanism with 158 referee-valid gross gains is too large to classify as low-value merely because the unconditional form is unsafe. The next question is now **salvage**, not promotion:

- use the frozen 158-gain / 12-loss flip set as the development population;
- characterize which state-pair/property causes the treatment to discard the needed lower-scoring state on the loss cohort, with `R01273` as a mandatory sentinel;
- seek the smallest **level-blind, state-local** discriminator or bounded-retention rule that protects specialist states without simply disabling the merge on all portal levels;
- stored hints, level IDs, family IDs and same-level provenance may diagnose the loss but may not become production routing inputs;
- first gate: matched-work loss-cohort validation must recover every protected specialist case with no new loss;
- second gate: rerun the frozen 954-level portal population and require zero specialist-capability regressions while retaining a meaningful fraction of the original 158 gross gains; measure work/time cost, not only solve count.

A conditional salvage that retains only a modest fraction of the original upside can still dominate many current micro-repricing opportunities. Conversely, if every safe discriminator collapses to "do not merge on portals," close the salvage line cleanly.

## Relationship to current 2B work

The admissible-order retry `1.0 -> 0.18` confirmation is now architecturally meaningful because the per-tier work-cap enforcement prerequisite landed on 2026-09-10. It remains a valid bounded experiment. It should not, however, be used as a substitute for refreshing the residual boundary or for investigating the much larger coarse-state salvage opportunity.

The resumable portfolio development A/B also remains high-value: continuation infrastructure is now validated and directly attacks allocation inefficiency without rebuilding promising state. It can proceed independently of the residual atlas.

Recommended near-term order:

1. **offline post-1,029 residual atlas** — no solver compute, fixes the current target map;
2. **portal coarse-state salvage diagnosis/preflight** — high upside, no production change until specialist-safe;
3. **resumable fixed-work portfolio A/B** — independent allocation line;
4. **bounded admissible-order repricing confirmation** — useful efficiency work, but lower expected solve-count leverage unless the refreshed atlas says otherwise.

This ordering is deliberately evidence-responsive rather than permanent. The atlas can move item 3 or 4 upward if it shows the remaining 671 are dominated by allocation/exposure rather than representation/search-policy failures.
