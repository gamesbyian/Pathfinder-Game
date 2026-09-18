# Lane A: C0 signature-collision experiment preflight

> **Status:** active
> **Last evidence:** 2026-09-18 — zero-new-compute re-analysis of the already-frozen crossing population (`reports/stress/lane-a-frozen-prefix-population-2026-09-18.json`) against the geometry census, current HEAD.
> **Decision:** not yet reached. This precommits the population, query volume, and decision rule for Lane A's C0 signature-collision falsifier (`docs/solver-separator-dynamic-interface-contract-preflight.md`) before any exact label at this scale is inspected, sized so it is ready to dispatch as soon as GHA capacity is free.
> **Remaining gate:** dispatch the exact-labelling batch (local or GHA, sized below) and run the existing `signature-collision-analysis-lib.mjs` primitive against the resulting labelled rows.
> **Evidence role:** population sizing / precommitment. No new exact labels are computed in this pass.
> **Population identity:** derived from `reports/stress/lane-a-frozen-prefix-population-2026-09-18.json` (2,012 crossing rows, 118 levels, frozen 2026-09-18) and `reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json`. No new frontier sampling in this pass.

## Why this ran

The prior pipeline-validation pass (`reports/2026-09-18-lane-a-local-exact-labeling-pipeline-validation-001.md`) found its own ad hoc test groups were **redundant**: grouping crossing rows by `(levelId, interfaceTarget, interfaceTargetKey)` over-counts, because two differently-*named* targets (e.g. a level's `goal` and a `mustPass` cell that happen to sit on the same side of the same chokepoint) can share **identical** `cutCells` -- the same geometric interface -- and therefore the same crossing prefixes. Testing the same prefix under two target labels is not two independent signature groups. This pass re-groups by the interface's actual `cutCells` identity (the true C0 signature) before sizing the real experiment, so the eventual query batch does not pay for that redundancy.

## Corrected population sizing

Grouping the 2,012 already-frozen crossing rows by `(levelId, sorted cutCells)` instead of `(levelId, target, targetKey)`:

| | Count |
|---|---:|
| Distinct geometric cuts with >=1 crossing prefix | 164 |
| ...with >=2 distinct crossing prefixes (collision-eligible) | 144 (98 distinct levels) |
| Total distinct (cut, prefix) pairs across the 144 eligible groups | 581 |

This is a materially smaller and more accurate number than the prior report's "485 (level, interface) pairs" -- that count conflated multiple target labels sharing one real cut. 581 queries, at the per-query costs already observed locally (0.5s-45s, board-size/mechanic-density dependent; a rough 10-15s/query average), is on the order of 1.5-2.5 CPU-hours total: small enough for a single bounded GHA dispatch, and not obviously too large for a local batch either, if sandbox wall-clock time allows. Reproducible via `scripts/stress/lane-a-c0-collision-population-size.mjs`.

## Precommitted design

**Population:** all 144 distinct-cut groups with >=2 crossing prefixes, using every crossing prefix already frozen for that cut (no further selection; using fewer than all available prefixes per group would be an unjustified narrowing of an already-frozen population). Total: 581 (cut, prefix) queries. The 20 groups with exactly 1 crossing prefix are excluded (a single-member group cannot show mixing or repetition and is not informative for the collision stop rule); they remain available for a future confirmation pass if 144 groups prove insufficient.

**Instrument:** `scripts/stress/cpsat-reference-probe.py --prefix=<[x,y] pairs>` (validated end-to-end locally against real crossing prefixes in the pipeline-validation report), fed via `unpackPackedCell` coordinate conversion from the frozen population's packed prefixes. A 45s per-query time limit is recommended (matches the slowest locally-observed real resolution; queries that do not resolve within it are recorded `UNKNOWN`, never forced to a label).

**Signature (C0 only, this pass):** the geometric cut identity itself (`levelId` + sorted `cutCells`) plus side (`gate`/`remainder`, though by construction every row here is a genuine crossing). This is the minimal candidate from the preflight's nested-contract order; C1-C4 signature fields are not computed in this pass.

**Analysis:** feed the labelled rows to the existing `summarizeSignatureCollisions` (`scripts/signature-collision-analysis-lib.mjs`) with `signature = levelId + sorted cutCells`, `label = exact outcome (LIVE/DEAD)`, `independentUnit = levelId`, exactly as the preflight specifies ("use the shared signature-collision analysis primitive"). `UNKNOWN` rows are reported separately and excluded from the mixed/pure classification per this program's standing abstention convention.

**Decision rule, fixed before dispatch (per the preflight's own stop rules):**

- **C0 mixed on a non-trivial number of soundly-labelled rows, reproducing across multiple independent parents:** stop C0 as insufficient (expected outcome, per the preflight's own prior evidence review -- "Existing evidence makes sufficiency unlikely"). Proceed to precommit C1 (boundary kinematics) as a separate follow-on pass over the same frozen prefixes, adding direction/heading and portal-jump-boundary fields -- not re-sampling.
- **C0 pure (no mixing) on a non-trivial number of rows across multiple independent parents, with repeated signatures:** a genuine, unexpected bounded-positive candidate at the *weakest* contract layer. Do not promote directly to a consumer; re-verify on an independent confirmation slice before treating it as more than a nomination, per this program's confirmation/development role discipline.
- **Support too sparse / too many UNKNOWN:** per the preflight's own stop condition, do not force a verdict; report the abstention rate and stop without concluding C0 either way.

No outcome has been inspected before this precommitment.

## Handoff

- Dispatch is deliberately deferred: as of this report, a work-ladder economics GHA run is already in flight for a separate WS2 gate, and this session's standing instruction is not to stack additional concurrent GHA dispatches on top of what is already running.
- Once dispatched (GHA or a sized local batch) and labelled, run `signature-collision-analysis-lib.mjs` per the analysis section above and report the result as its own dated report, per this program's evidence-role conventions.
- If C0 is mixed (the expected outcome), the next precommitted step is C1, reusing this same frozen prefix/cut population -- no new frontier sampling needed unless C1's own analysis calls for more independent parents than the current 144 groups / ~100+ levels provide.
