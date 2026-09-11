# Post-1029 residual priority refresh 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — Gate 1 (the post-restoration residual atlas) is done; see [`2026-09-11-post-1029-residual-atlas-001.md`](2026-09-11-post-1029-residual-atlas-001.md) for the executed five-class per-level breakdown. Production capability run `34531412380`: Corpus 1 99/102, Corpus 2 1,029/1,700, zero errors/truncation. Current complete isolated-technique census asset: `33717910218`. The portfolio-18 same-policy resumable-tranche development A/B subsequently closed NULL at 52/120 vs 52/120 with real continuation participation.
> **Decision:** the atlas confirms portal coarse-state-merge salvage (gate 2) as the highest-upside next target and finds allocation/exposure a minority failure mode, so bounded admissible-order repricing (gate 3) stays lower priority until gate 2 resolves. Resumable same-policy tranche salvage is no longer active queue work.
> **Remaining gate:** none for this handoff; gate 2 (portal coarse-state salvage) and gate 3 (conditional repricing) are tracked directly in `docs/solver-optimization-workstreams.md`.
> **Evidence role:** research prioritization / preflight (superseded by the executed atlas for Gate 1's own findings)

## Current boundary

Portal restoration moved Corpus 2 from 975/1,700 to **1,029/1,700**, leaving **671 misses**. The +54 Corpus-2 change is a clean full-population reproduction of the two promoted portal restorations' matched-work effects (+52 must-cross neighbour-budget propagation and +2 connectivity volume).

Do not carry old 975-boundary family counts forward as current population sizes. In particular, the former `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing only until recomputed at the 1,029 boundary.

The refreshed WS1 lifecycle classification already covers one axis of the residual: 551/671 misses do not reach `goal-attraction-disabled-retry`, 290 are structurally skipped by `must-cross-neighbor-prune-disabled-retry`, 51 are mechanically eligible but unreached by `repair-fallback`, and 169 `admissible-order-fallback` rows carry a misleading work-starved label despite substantial real work. This separates some exposure failures from exposed-and-failed cases, but it does not replace the broader capability join.

## Gate 1: post-restoration residual atlas

Do not create another overlapping framework. Use the existing tooling and current assets.

```bash
node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- \
  --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --out=tmp/post-1029-missing-attempt-exposure.json
```

`33717910218` is complete at its frozen boundary (78,505 unique cells, no missing/partial shards), but it is development evidence from an earlier solver revision. Use it explicitly rather than relying on the script's older default path.

### Cross-evidence rule

Do **not** equate `no T1 census winner` with `no known rescuer`. Earlier cross-evidence found that 25/35 production-solved levels which appeared to have zero T1 isolated winners already had genuine isolated-technique provenance outside that matrix; the remaining cases included production-context/retry capabilities outside the base-T1 definition.

For every current miss, preserve these distinctions:

1. known rescuer not offered by production;
2. known rescuer offered but not reached or materially starved;
3. known rescuer reached with comparable work but failed;
4. no T1 winner but a provenance/history rescuer exists;
5. no known rescuer after available cross-evidence is exhausted.

The per-level working table should retain current production result/run identity, structural/fingerprint/family descriptors, routing regime, T1 winner identities/count, production-menu presence, lifecycle reach/participation/work where trustworthy, historical/provenance rescuers, production-context/retry rescuers, and reconciled low-multiplicity status.

Summarize counts for the five evidence classes above and the largest structural overlaps within them, especially portal topology, must-cross burden, intersection burden and current low-multiplicity capability. Classes need not be mutually exclusive when multiple rescuers tell different stories.

Do not use `cluster-unsolved-failures.mjs`'s `beam-collapse` tag as capability evidence; its timed-out beam `nodesExpanded` field is structurally misleading. Reuse only trustworthy classifications from that tool.

**No new solving is required for this gate.**

## Gate 2: portal coarse-state-merge salvage

`STRATEGY_PORTAL_COARSE_STATE_MERGE` remains correctly **default-OFF**. The frozen 954-level portal A/B produced **158 gains / 12 losses (net +146)**, all gains referee-valid, but `R01273` is a real treatment regression. Unconditional promotion therefore remains closed.

The later local reproduction corrected the original stale attribution. `R01273` is not currently demonstrated to depend on the census-named isolated beam cell. Its real control win comes from the **`must-cross-neighbor-prune-disabled-retry`** stage, whose second attempt solves at 404,434 nodes under control while comparable treatment attempts fail.

Reusable cohorts:

- 12 treatment losses: [`data/stress/portal-coarse-state-merge-loss-salvage-001-ids.txt`](../data/stress/portal-coarse-state-merge-loss-salvage-001-ids.txt)
- 158 treatment gains: [`data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt`](../data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt)

Do not preserve the former six-ID `specialist` cohort. Recompute low-multiplicity status from the current atlas plus provenance/history.

The source-level diagnosis is already narrow: [`portal coarse-state salvage source diagnosis`](2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md).

Key facts:

- `usedPortalPairs` is already represented in the portal merge key, so the old portal-pair aliasing defect is not the remaining problem;
- the approximate merge omits path/edge state that can change future reachability;
- the existing beam research observer already records every coarse-merge removal with removed/kept paths, scores, merge key, and phase/depth/work context;
- the next step is the exact `R01273` control-winning retry, not new instrumentation or another full portal sweep.

Diagnostic sequence:

1. reproduce the exact control-winning retry attempt with merge off/on;
2. enumerate treatment-side coarse-merge removals using the existing observer;
3. locate the earliest collision after which all known-live continuation disappears;
4. reconstruct removed/kept full search state and first diff state omitted from the key, especially visited-cell identity, per-cell edge usage, crossing detail and remaining-neighbour masks;
5. look for the same low-cardinality distinction on other frozen losses;
6. implement only the smallest level-blind state-local retention/subkey rule justified by that evidence.

Validation must stay cheap-first: deterministic forensic reproduction, then **12/12 frozen control losses retained**, then the 158-gain cohort or a representative subset, and only then another 954-level portal run. If every safe rule effectively disables the merge, close salvage instead of hiding the negative behind complexity.

## Gate 3: bounded admissible-order repricing, conditional on atlas

The `admissible-order` non-default retry `1.0 -> 0.18` confirmation is now architecturally meaningful because tier-scoped work-cap enforcement has landed. It remains a valid bounded matched-work experiment.

Do not automatically spend the next population-scale run on it. First use the atlas to decide whether allocation remains the dominant actionable failure mode. If so, run the real enforcement-enabled confirmation and prove treatment participation before interpreting results. If representation/search-policy failures dominate, follow those instead.

Remember that the 169 nominally `work-starved` `admissible-order-fallback` rows are a telemetry-label artifact, not evidence that simply adding budget will help.

## Closed since this handoff was first written: resumable same-policy tranche

The external runner/telemetry gaps identified in the first version of this report were repaired. `portfolio-solve-sweep.mjs` now exposes `--resumable-residual-pass`, persists attempt-level `resumableResidualTranche`, and records result-level continuation accounting.

The resulting fresh 120-level fixed-work A/B under the portfolio-18-tranche-v2 67M envelope produced **52/120 control vs 52/120 treatment**, zero losses and zero treatment-exclusive gains, despite real participation: 120/120 levels eligible, 64 continuation dispatches, zero errors/truncation.

Per the prespecified rule, this simple salvage form is **CLOSED NULL**. Do not retry by changing tranche sizes, beam policies, or portfolio menu absent a materially new premise. See [`preflight`](2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md) and [`result`](portfolio/resumable-tranche-development-ab-001/result.md).

## Recommended order

1. **offline post-1,029 residual atlas**;
2. **R01273 coarse-state forensic and 12-loss salvage gate**;
3. **bounded admissible-order repricing only if the atlas still makes allocation the best next lever**.

WS1 existing-data routing analysis can run in parallel with these gates. Repair reachability's new static-block-count signal remains supporting discovery evidence only; its fresh confirmation is non-cheap and should be bought only if the current residual map makes that question materially relevant.