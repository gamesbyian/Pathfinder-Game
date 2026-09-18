# Lane A: frozen legal-prefix Stage 1 canary

> **Status:** concluded-positive
> **Last evidence:** 2026-09-18 — local, zero-GHA population construction: the generic `production-search-frontier-sampler.mjs` run on all 118 balanced-interface Class-5 levels (`reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json`), current HEAD. Bounded solver compute (beam search paused at 30% of required length, width 5000), no exact/CP-SAT queries.
> **Decision:** the Lane A dynamic-interface-contract preflight's "earned experiment" (`docs/solver-separator-dynamic-interface-contract-preflight.md`) is population-feasible: **106/118 (89.8%)** balanced-interface levels produce at least one legal production-search prefix that genuinely crosses one of their own balanced interfaces, yielding **2,012 crossing (level, interface, prefix) rows** across **485 distinct (level, interface) pairs**, of which **446 pairs already have >=2 independent crossing prefixes** (collision-discovery eligible) from only 5 picks/level. This clears the preflight's own population-construction step at negligible cost, before any exact label or C0-C4 signature is computed.
> **Remaining gate:** exact whole-prefix LIVE/DEAD labelling (CP-SAT, GHA-scale) and the C0-C4 nested-contract signature construction/collision analysis are not started. This report only establishes that a sufficient, independently-distributed crossing population exists to justify that investment.
> **Evidence role:** population-construction / feasibility canary, per the preflight's own "Frozen population" section. No exact label, no C0-C4 signature beyond bare interface identity, no solver treatment.
> **Population identity:** all 390 current Class-5 residual levels with >=1 balanced interface (118, from `class5-separator-decomposition-census-2026-09-18-with-geometry.json`), 5 frontier picks per level at depth-fraction 0.3, seed `lane-a-stage1-canary-v1`, current commit.

## Why this ran

Per this session's `WS2-WORK-LADDER-ECONOMICS` and Lane A geometry-extension work running in parallel on GHA, this pass looked for evidence obtainable **without any additional GHA dispatch** -- i.e., work cheap enough to run locally. Lane A's next experiment (a signature-collision falsifier on frozen production-search prefixes crossing a balanced interface) has two population-construction prerequisites that are both cheap: the interface geometry (already extended in a zero-new-compute census re-run) and a frozen prefix sample from the existing generic frontier sampler. Composing the two locally, before committing to the expensive exact-labelling stage, follows the same "prefer the cheapest information-value test" / "size the population before dispatching" discipline used throughout this program (e.g., D1's own case-volume count before its GHA dispatch).

## What was built

**`scripts/stress/lane-a-frozen-prefix-population.mjs`** (new): for each balanced-interface level, shells out to the unmodified `production-search-frontier-sampler.mjs` for a handful of frozen legal prefixes, then checks each prefix against every one of that level's balanced interfaces (`cutCells`/`gateSideCells`/`remainderSideCells` from the geometry-extended census) for a genuine side crossing.

**Crossing definition and an empirical correction.** The initial approach checked whether a prefix explicitly visited one of the interface's recorded `cutCells`. On a hand-inspected level (R00046), this under-detected: 4/5 sampled prefixes transitioned from `gateSideCells` to `remainderSideCells` membership without ever visiting either of that interface's two recorded cut cells, even for a plain (non-mechanic, non-portal) interface. The frontier sampler's `prefix` records one waypoint per beam search *move*, and a move can be a multi-cell run whose interior cells -- possibly including the literal cut cell -- are never recorded as a separate waypoint. The script instead uses **side-membership transition** (visits a `gateSideCells` member and, at any point, a `remainderSideCells` member) as the primary crossing signal, keeping the explicit cut-cell hit only as a secondary diagnostic field (`firstCutIndex`, often `-1` even on a genuine crossing). A vertex min-cut on the plain graph guarantees any such transition passes through a cut cell in reality; the correction only stops requiring that cell to be an explicit sampler waypoint.

## Result

| | |
|---|---:|
| Levels with a balanced interface (population) | 118 |
| Levels sampled successfully (no exhaustion before checkpoint, no sampler error) | 118/118 |
| Levels with >=1 crossing prefix | 106 (89.8%) |
| Total crossing (level, interface, prefix) rows | 2,012 |
| Distinct (level, interface) pairs crossed | 485 |
| ...with >=2 independent crossing prefixes (collision-discovery eligible) | 446 |
| Crossings on a mechanic-aware interface | 768 (38.2%) |
| Crossings on a portal-mediated interface | 3 (0.15%, consistent with the census's own near-zero portal-mediation finding) |

Breakdown by target type: goal 150, mustPass 1,423, mustCross 439.

Artifact: `reports/stress/lane-a-frozen-prefix-population-2026-09-18.json` (1.4MB; includes full prefixes, crossing indices, and per-level sampling status for all 118 levels, including the 12 that produced zero crossings).

## What this does and does not establish

This is population feasibility, not a signature-collision result. No exact LIVE/DEAD label has been computed for any row; no C0-C4 signature has been constructed beyond bare interface target/key identity (which is already visible in the geometry artifact). The 12 levels with zero crossings at this depth-fraction/pick count are not shown to be infeasible -- a different depth-fraction or more picks may still find a crossing; this canary did not tune per-level parameters to maximize yield, since the preflight's own selection contract requires freezing sampler parameters before observing which levels respond.

## Handoff

- The next Lane A step is exact whole-prefix LIVE/DEAD labelling on a subset of the 2,012 crossing rows (or a smaller precommitted slice of them), reusing the D1 program's GHA exact-annotation seam (`cpsat-explicit-prefix-reference.yml`) if its case-shape can accept a full prefix rather than a single-cell pin, or a purpose-built prefix-completion CP-SAT probe otherwise -- this is GHA-scale work and is deliberately not started in this pass.
- Once exact labels exist for a precommitted sub-slice, C0 (interface identity + side) is already fully available from this artifact and the geometry census; C1-C4 require additional per-waypoint state extraction (direction/heading, length/intersections/obligations remaining, mechanic history, bounded topology) not yet implemented.
- Freeze the exact sub-slice and sampler parameters used for labelling *before* any label is inspected, per the preflight's own selection contract, the same way this session's D1 and work-ladder slices were precommitted.
