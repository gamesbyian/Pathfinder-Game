# Campaign 1 diagnosis: `repair-close`/`repair-far` is a more severe version of the known batch-B discrepancy pattern (2026-07-17)

## Context

With the probe-starvation bug fixed and its impact measured (this population is genuinely hard,
not budget-starved — see the two prior reports today), the next step per the roadmap's own
methodology is differential diagnosis: replay each level's withheld witness through the real
search-core primitives and see where/how it diverges from what the solver's own scoring would
pick greedily. This is the exact technique that previously explained the batch-B cluster
(`data/stress/README.md`'s witness-trace deep dive on S033/S042).

## Method

`scripts/stress/witness-divergence.mjs` against the full 621-level `repair-close`+`repair-far`
population (`data/stress/stress-levels-random.json`). Pure replay against `POLICY_PROFILES.default`
— no search, no backtracking, cheap. Reports, per level: `cumulativeDiscrepancy` (sum over every
witness step of that move's rank among scored candidates; 0 = greedy-best), `maxStepRank`,
`meanStepRank`, and step count.

## Results

**Zero errors, zero invalid witness steps, all 621 witnesses replay legally and reach the true
solution state** — the pruning/legality logic itself is sound for this population (same clean
result the original batch-B investigation found).

**Top 30 by cumulative discrepancy** (hardest-looking): discrepancy ranges 65–86, over paths of
125–163 steps, mean per-step rank 0.60–0.80. Notably, `maxStepRank` across every one of these 30
is only **2 or 3** — no single witness move ever needs more than the *third*-best greedy
candidate. This is not a single "wall" (one catastrophically bad required move); it's many small,
consistent deviations compounding over a long path.

**Grid/path-scale context for the full 621-level population**: median grid 13×13, median `reqLen`
102 (path uses ~60% of all cells on a 13×13 grid), median `reqInt` 7, median `navDensity` 0.76.

## Comparison to the known batch-B reference

`data/stress/README.md`'s own witness-trace deep dive on S033/S042 (the levels that motivated
building `repair-search.ts` in the first place) found:

| Level | Steps | Cumulative discrepancy | Discrepancy per step |
|---|---:|---:|---:|
| S033 | 70 | 22 | 0.31 |
| S042 | 93 | 35 | 0.38 |
| `repair-close`/`repair-far` top 30 (this report) | 125–163 | 65–86 | **0.60–0.80** |

That prior investigation concluded (its own words): "genuine combinatorial hardness in the
must-cross × flipper × high-mustPass interaction, not a shallow policy/ladder gap... What's left
is either a materially better admissible lower bound... or a different search paradigm for this
regime (e.g. constraint propagation... or local-search repair from a near-miss)." Local-search
repair (`repair-search.ts`) was built and does handle the S033/S042-scale version of this pattern
(both are in the published corpus's own `needsRepairFallback` gate and solve routinely today).

**The `repair-close`/`repair-far` population sits at roughly double the discrepancy density of
the levels repair-search was proven against — and this session's own node-budget testing (prior
report) already showed repair-search, even with 2.5x generous budget and full pipeline access,
does not close that gap on a 30-level sample (0/30 solved).**

## Interpretation

This is not a new failure mode requiring new diagnosis machinery — it's the *same* cumulative-
discrepancy pattern already characterized for batch-B, at a more severe density that the existing
remedy (iterated local-search repair) was not built or calibrated to handle. Two candidate
explanations, not mutually exclusive:

1. **Scale, not kind**: repair-search's iterated local search (restarts + elite-splice pool) may
   simply need proportionally more restart budget or a deeper mutation/splice strategy as
   discrepancy density and path length grow — the same restart machinery that closes a
   ~30-step gap (batch-B) may need fundamentally more than 2.5x the node budget to close a
   ~130-step-scale gap with double the per-step deviation rate, not because the technique is wrong
   in kind, just because the search space it needs to cover grows much faster than linearly with
   discrepancy density.
2. **A materially better admissible lower bound** (the other option the batch-B report itself
   named) could shrink the effective search tree enough for either DFS/beam or repair to exhaust
   it within budget — untested here, and a substantial, open-ended research direction in its own
   right (same caveat the original report gave: "not attempted this session").

Both are real research directions, not scoped policy tweaks — consistent with the batch-B report's
own framing that this class of finding is "substantial, open-ended research."

## Recommendation for Campaign 1's continuation

- **Don't treat this population as a near-miss rescue target** (the "badness ≤ 5" framing that
  originally motivated Campaign 1's priority order) — that framing was built on probe-only
  telemetry (prior report) and this diagnosis shows the underlying difficulty is structurally
  closer to a harder version of `dfs-plain`'s genuine-exhaustion character than to a
  few-moves-short near-miss.
- **Immediate next step, low-cost**: test whether repair-search's restart count / elite-pool size
  scales its success rate meaningfully with a much larger budget than tested here (this session
  tested up to 25,000,000 nodes; the batch-B calibration levels solve in well under 1,000,000) —
  a clean, cheap way to distinguish "scale, not kind" from "fundamentally stuck regardless of
  budget" before investing in new lower-bound research.
- **Longer-term**: if scale alone doesn't close it, this is a genuine candidate for the "different
  search paradigm" the batch-B report flagged as open (constraint propagation over the
  must-cross/mustPass/intersection budget) — substantial, cross-cutting work, appropriately scoped
  as its own future campaign rather than folded into this one.
- Re-classifying this population against honest full-pipeline telemetry (the prior report's
  recommendation: raise the batch workflow's `node_budget` and re-run corpus-2) remains valuable
  regardless of which direction is pursued next — it would separate any genuinely rescuable
  near-misses (if some exist) from the structurally-hard majority this diagnosis suggests
  dominates the population.

## Verification

Pure-replay diagnostic tool, no solver changes made or needed for this report — read-only
investigation using already-built tooling (`witness-divergence.mjs`).
