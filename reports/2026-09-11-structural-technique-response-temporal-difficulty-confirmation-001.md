# Structural technique-response temporal + difficulty-stratified confirmation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — executed `scripts/analyze-technique-niche-stability.mjs` and `scripts/analyze-difficulty-stratified-relative-advantage.mjs`, the two analyzers `2026-09-11-structural-technique-response-extension-audit-001.md` added but had not yet run in a full checkout.
> **Decision:** two of the eight frozen relative-advantage pairs clear both the temporal-persistence and difficulty-stratification filters and earn escalation to stage 3 (existing variant-family boundary flips): `beam:objectiveFirst@5000 plain vs mechanic-buckets` (persistent `portals`, the same leading feature across both censuses, recurring in all 5/5 eligible burden bands) and `beam:intersectionHarvest@5000 plain vs mechanic-buckets` (persistent `requiredIntersections` leading feature, recurring in 3 eligible bands). The other six pairs either show no persistent top-eight effect, or have too few eligible burden strata to interpret — stay descriptive, do not escalate.
> **Remaining gate:** stage 3 of the extension audit's ladder — query the existing variant-family dataset (`claude/variant-levels-solver-insights-tpk4qg`) for controlled portal/intersection transforms that flip plain-vs-mechanic-buckets response on these two pairs' parents, without generating new variants.
> **Evidence role:** discovery/nomination-strength confirmation. Still correlational; not yet family, solution-space, or operational-mechanism evidence.

## What ran

Both scripts were already committed but their outputs were not yet generated/committed (the audit's own stated blocker). Ran both against the existing frozen Sep-1/Sep-3 census snapshots — no new solver dispatch, no new census.

- `reports/stress/technique-niches/2026-09-03/relative-advantage-temporal-stability.{json,md}`
- `reports/stress/technique-niches/2026-09-03/difficulty-stratified-relative-advantage.{json,md}`

## Results

**Temporal persistence** (same-direction, |standardized diff| >= 0.30 in both the Sep-1 and Sep-3 snapshots): 5/8 pairs retain at least one persistent separator in the stored top-eight effects, extending the earlier Sep-5 finding that 5/8 pairs changed their single *leading* feature — persistence can survive even when the top-ranked feature itself changes. 3/8 (`intersectionHarvest` 2K-vs-5K, perimeter beam CW-vs-CCW, DFS perimeter CW-vs-CCW) show no persistent top-eight effect at all.

**Difficulty-stratified recurrence** (5 equal-count generic-burden bands, interpretation-eligible only with >=5 exclusive wins per side per band): of the 5 temporally-persistent pairs, 2 recur strongly across most/all eligible bands (`objectiveFirst@5000` plain-vs-mechanic-buckets: `portals` in 5/5 eligible bands; `intersectionHarvest@5000` plain-vs-mechanic-buckets: `portals`/`requiredIntersections` in 2-3 of 3 eligible bands). The admissible-order pair has only 1 eligible band with nothing recurring; the DFS `harvestThenFinish` vs `portalFirstTransfer` pair has **0 eligible bands** (denominator inadequacy, not a null result — do not interpret as difficulty-confounded, per the audit's own instruction to check denominator adequacy first); the `objectiveFirst` 2K-vs-5K width pair recurs on secondary features (`turnConstraintLoad`, `nonNavigableDensity`) but not its original temporal leader.

This exactly confirms the extension audit's provisional triage, which had flagged these same two plain-vs-mechanic-buckets pairs as the "strongest current candidate" and "strong candidate" from discovery-only evidence — now independently supported by both new filters.

## Disposition per pair

| pair | temporal | difficulty-stratified | disposition |
|---|---|---|---|
| `objectiveFirst@5000` plain vs mechanic-buckets | persistent, same leader (`portals`) | 5/5 eligible bands | **escalate to stage 3** |
| `intersectionHarvest@5000` plain vs mechanic-buckets | persistent, same leader (`requiredIntersections`) | 3/3 eligible bands (`portals`, `requiredIntersections`) | **escalate to stage 3** |
| `objectiveFirst` 2000 vs 5000 (width) | persistent, but leader itself changed (`navigableArea` -> `turnConstraintLoad`) | 3 eligible bands, different recurring features than the temporal leader | mechanism-localization candidate (retention/dose), not a routing niche; do not treat as a static-feature story |
| DFS `harvestThenFinish` vs `portalFirstTransfer` | persistent (`flippingFilters`, `mustCross`, `requiredIntersections`) | **0 eligible bands** | denominator-inadequate; recompute from base capability artifacts before any decision, do not classify as difficulty-confounded |
| admissible-order default vs `mustCrossFirst` | persistent (`requiredIntersections`) | 1 eligible band, nothing recurs | weak; do not escalate |
| `intersectionHarvest` 2000 vs 5000 (width) | no persistent top-eight effect | 3 eligible bands (secondary features only) | structurally opaque; treat as search-mechanism question, not routing |
| perimeter beam CW vs CCW | no persistent top-eight effect | 4 eligible bands (weak secondary features) | structurally opaque; symmetry/family trace only |
| DFS perimeter CW vs CCW | no persistent top-eight effect | 2 eligible bands | structurally opaque; symmetry/family trace only |

## Next step

Per the extension audit's ladder step 4: query the existing off-`main` variant-family dataset (branch `claude/variant-levels-solver-insights-tpk4qg`, `npm run family:index`/`family:coverage`) for parents of levels in the two escalated pairs' disagreement populations where a controlled portal-count or intersection-count transform exists, and check whether plain-vs-mechanic-buckets response flips across that transform. Use whole parents as the independent unit. Do not generate new variants — the audit's own instruction, and this session's standing research-discipline rule, both require using the existing resource first.
