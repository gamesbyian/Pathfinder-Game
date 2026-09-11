# Post-1029 residual priority refresh 001

> **Status:** active
> **Last evidence:** 2026-09-10 — production capability run `34531412380`: Corpus 1 99/102, Corpus 2 1,029/1,700, zero errors and zero deadline truncation; Corpus 2 is +54/-0 against the pre-restoration solved set. Current complete isolated-technique census asset is `33717910218`.
> **Decision:** refresh the residual boundary before further family sizing, pursue portal coarse-state-merge salvage as a high-value constrained research target, and keep resumable-portfolio/repricing work behind explicit participation and telemetry gates.
> **Remaining gate:** execute the existing residual joins against the 671-level post-restoration miss set, reconcile T1 census gaps against provenance/history, and use the resulting failure-role counts to choose the next production-changing experiment.
> **Evidence role:** research prioritization / preflight

## Why this refresh is necessary

The live Corpus-2 boundary moved materially after portal restoration: 975/1,700 to 1,029/1,700, leaving **671 misses**. The +54 is a clean full-population reproduction of the two promoted portal restorations' matched-work effects (+52 must-cross neighbour-budget propagation and +2 connectivity volume). Any residual-family counts or shares derived at the 975/1,700 boundary are therefore historical sizing evidence, not current population counts.

In particular, do **not** carry the old `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort forward as a current denominator. Its structural definition remains useful, but membership/solve status must be recomputed at the 1,029 boundary before it drives priority.

The refreshed WS1 lifecycle classification already covers one axis of the new residual: 671 unsolved levels, including 551 that do not reach `goal-attraction-disabled-retry`, 290 structurally skipped by `must-cross-neighbor-prune-disabled-retry`, 51 mechanically eligible but unreached by `repair-fallback`, and 169 `admissible-order-fallback` rows whose apparent work-starvation is a telemetry artifact despite substantial real work. That evidence separates some exposure/allocation failures from exposed-and-failed capability failures, but it does not replace the broader isolated-T1/cross-evidence join.

## Post-restoration residual atlas: use current assets and existing tooling

Do not add another overlapping analysis framework. Reuse the existing scripts and canonical assets.

Primary missing-exposure join:

```bash
node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- \
  --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --out=tmp/post-1029-missing-attempt-exposure.json
```

`33717910218` is the current registered technique-census asset and is complete at its own frozen boundary: 78,505 unique cells, no missing or partial shards. It remains development evidence from an earlier solver revision. The script's older default census path must therefore not be relied on implicitly for this pass; use the explicit path above.

This script defines one important question correctly: among **current production misses**, which exact normalized base-T1 attempt identities are absent from the current production menu despite frozen isolated evidence that they solve the level? Its output is nomination/development evidence, not same-revision causal proof.

### Do not equate `no T1 census winner` with `no known rescuer`

Earlier cross-evidence work already found a material coverage caveat: of 35 production-solved levels that appeared to have zero T1 isolated winners in `33717910218`, 25 had a genuine isolated-technique solve already present in hint-provenance history. The remaining 10 included production-context/retry capabilities outside the plain T1 cell definition. Therefore a zero-winner census row is **not** a sufficient certificate of absent known capability.

For every current miss with zero T1 winners, rejoin hint provenance / historical isolated-technique evidence before assigning a `no-known-rescuer` label. Preserve the distinction between:

- no winner in the current frozen T1 matrix;
- a known historical/provenance rescuer absent from that matrix;
- a known production-context/retry rescuer outside the base-T1 definition;
- no known rescuer after the available cross-evidence is exhausted.

This prevents census coverage gaps from being mistaken for a need to invent a new solving capability.

### Minimum atlas output contract

Join the missing-exposure result with the retained post-restoration lifecycle classification (`reports/2026-09-10-ws1-existing-data-exposure-classification-001.md`), current structural/fingerprint data, and provenance/history. The per-level working table should retain enough evidence to audit each classification, at minimum:

- `id` and current production result/run identity;
- portal topology and other existing structural descriptors/fingerprint/family identifiers;
- routing regime;
- normalized base-T1 winner count and winner identities from `33717910218`;
- whether each known rescuer is in the current production menu;
- lifecycle reached/unreached and comparable work/participation for the relevant stage/action where available;
- presence and identity of historical isolated-technique/provenance rescuers not represented by the current T1 matrix;
- any known production-context/retry rescuer outside base T1;
- specialist/low-multiplicity status **after** cross-evidence reconciliation, not from a stale census row alone;
- a non-exclusive failure-role classification.

The summary needed for prioritization is deliberately small. Count current misses in these evidence classes:

1. **known rescuer not offered**;
2. **known rescuer offered but not reached / materially starved**;
3. **known rescuer reached with comparable work but failed**;
4. **no T1 census winner but another provenance/history rescuer exists**;
5. **no known rescuer after cross-evidence reconciliation**.

Within each class, report the largest structural overlaps, especially portal topology, must-cross burden and intersection burden, plus the current specialist/low-multiplicity set. These classes need not be forced mutually exclusive when multiple rescuers tell different stories; retain the evidence needed to explain overlap.

Do not use `cluster-unsolved-failures.mjs`'s `beam-collapse` tag as a capability signal: that script documents the instrumentation gap that makes timed-out beam `nodesExpanded` structurally misleading. Reuse its trustworthy repair/DFS classifications only where the current input schema supports them.

No new solving is required for this atlas refresh.

## Elevate portal coarse-state-merge salvage, with the corrected causal story

`STRATEGY_PORTAL_COARSE_STATE_MERGE` remains correctly **default-OFF**. Its global promotion failed its retention gate: the frozen 954-level portal A/B produced **158 gains / 12 losses (net +146)** and `R01273` remained a real treatment regression even with a much larger treatment envelope. The unconditional form is therefore unsafe.

The later local root-cause reproduction corrected an important attribution error from the initial retention analysis. `R01273` is **not** currently demonstrated to depend on the census-named sole isolated beam winner; that isolated configuration failed to solve the level under either flag state when reproduced. The real control win came from the `must-cross-neighbor-prune-disabled-retry` stage, whose second attempt solved at 404,434 nodes under control while comparable treatment attempts all failed. The result still demonstrates a merge-induced capability/trajectory loss, but the old isolated-specialist label is stale.

Accordingly, the reusable regression cohort is the frozen set of all 12 treatment losses:

- [`data/stress/portal-coarse-state-merge-loss-salvage-001-ids.txt`](../data/stress/portal-coarse-state-merge-loss-salvage-001-ids.txt)

Do not preserve a six-ID `specialist` cohort derived from the older census attribution. Recompute specialist/low-multiplicity status using the current atlas and provenance cross-evidence.

The original 158 treatment gains remain frozen at [`data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt`](../data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt).

Source-level forensic review now narrows the salvage question substantially: [`portal coarse-state salvage source diagnosis`](2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md).

Key implications:

- the portal-pair identity defect is already fixed because `usedPortalPairs` is part of the portal merge key;
- the remaining merge is intentionally approximate and omits path/edge state that can affect future reachability;
- the existing beam research observer already records every coarse-merge removal with the removed/kept paths, scores and merge key, so new collision instrumentation is not the first step;
- first reproduce the exact control-winning retry attempt for `R01273`, locate the earliest treatment collision that kills all known-live continuation, and diff only state omitted from the key;
- seek the smallest **level-blind, state-local** retention distinction that protects the 12-loss cohort without erasing the merge's useful compression.

First validation gate for a candidate salvage is the 12-loss cohort at matched work: retain all 12 known control solves before paying for the full 954-level population. Then verify that a meaningful share of the 158 gross gains remains. Only after those cheap gates should the full portal population run again, with current specialist/low-multiplicity retention checked from reconciled evidence.

A conditional salvage that retains only a modest fraction of the original upside can still dominate many current micro-repricing opportunities. Conversely, if every safe discriminator collapses to effectively disabling merge on portal levels, close the salvage line cleanly.

## Relationship to current 2B work

The admissible-order retry `1.0 -> 0.18` confirmation is now architecturally meaningful because the per-tier work-cap enforcement prerequisite landed on 2026-09-10. It remains a valid bounded experiment. It should not, however, substitute for refreshing the residual boundary or for investigating the much larger coarse-state salvage opportunity.

The resumable portfolio mechanism has passed its solver-internal production-width continuation feasibility gate, but the batch A/B path is **not yet fully runnable**. Source review found two external-tooling gaps after the implementation landed:

1. `portfolio-solve-sweep`'s persisted attempt projection dropped `resumableResidualTranche`, and its row projection dropped result-level `resumableResidualPass` accounting. This PR now preserves both and adds contract tests.
2. the `portfolio-solve-sweep` CLI does not currently expose a switch that sets `staticPortfolio.resumableResidualPass`, so the normal batch runner cannot yet activate treatment explicitly.

The remaining engineering gate belongs with the coding/runtime handoff because it touches the monolithic batch CLI and should be verified through its sequential and worker execution contracts, not inserted as an unexercised argument parse: add one explicit CLI treatment switch, thread it into `staticPortfolioConfig`, cover sequential and worker activation, and record the arm in the output summary. Do not dispatch the development A/B until the runner proves treatment participation rather than merely accepting a nominal arm label.

## Recommended near-term order

1. **offline post-1,029 residual atlas** — no solver compute, fixes the current target map and specialist labels;
2. **portal coarse-state salvage forensic reproduction** — start with the existing observer and 12-loss cohort, not a new full-pop run;
3. **resumable batch-runner wiring**, then the fixed-work development A/B;
4. **bounded admissible-order repricing confirmation** — useful efficiency work, but lower expected solve-count leverage unless the refreshed atlas says otherwise.

This ordering is evidence-responsive rather than permanent. The atlas can move items 2–4 if it shows the remaining 671 are dominated by a different failure role.