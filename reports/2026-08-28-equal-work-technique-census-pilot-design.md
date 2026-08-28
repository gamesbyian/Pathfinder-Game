# First equal-work technique-census pilot design

> **Status:** EXECUTED / CONCLUDED. Corrected canonical result: [EW1 equal-work technique census pilot](2026-08-28-ew1-equal-work-technique-census-pilot.md), run 33156541827.
> **Date:** 2026-08-28
> **Queue:** solver optimization #2, equal-work evidence substrate.
> **Evidence role:** development/value-of-information.
> **Decision:** the first decision-bearing equal-work census should be a bounded hard-residual sample at one 10,000,000-work cap, not a second full 76K-cell census and not a sweep of many arbitrary work caps.

## Question

The frozen T1 census is excellent within-technique depth evidence but allocates 50,000,000 **nodes** to every technique. That makes its solve-depth curves useful inside one search family while leaving cross-family scheduler pricing partly confounded: beam, DFS, IDA and repair do not spend the same canonical work per node.

The new `cell.workBudget` execution path can answer the smallest missing question:

> On the hard population that matters to scheduler repricing, which existing single actions still have useful and/or exclusive capability when every action receives the same canonical work?

## Population

Use a deterministic **60-level sample** from the frozen T1 production-unsolved population used by census `32240161854`:

- Corpus 1 + Corpus 2 levels marked unsolved by that census's frozen capability baseline;
- no technique/outcome/feature selection inside that gap population;
- deterministic seed `20260828`;
- parent/family metadata is not used for runtime steering; this is offline development evidence.

Keeping the frozen T1 gap population makes the equal-work rows directly joinable to the existing node-depth census. Sixty levels matches the scale that already proved useful for the first strict-work scheduler repricing sample without pretending to be promotion evidence.

## Action set

Run every **base single-technique key** in the live-derived T1 action universe that is mechanically eligible on the sampled level.

Do not include:

- technique pairs;
- retry/wrapper stages that have no meaning as isolated actions;
- newly selected ablation variants;
- the queue #1 standard-IH exposure candidate as a special arm.

This is an action-pricing pilot, not another configuration search.

## Budget

Each cell gets:

- `workBudget = 10,000,000`;
- canonical work as the only binding search-effort currency;
- the existing 600,000 ms per-attempt value as a wall-safety deadline;
- nodes retained only as diagnostics.

One 10M cap is enough for the first pilot. Successful rows expose their actual `workSpent`, so cumulative solve thresholds below 10M can be reconstructed without rerunning 0.5M/2M/5M cells. Unsolved rows are right-censored at 10M unless the technique naturally exhausts earlier.

Why 10M:

- the existing node census says beam wins are overwhelmingly sub-1M-node and normally self-exhausting;
- plain repair has meaningful yield through the 2M-10M region;
- ordinary DFS/IDA often need much deeper search, so a 10M-work pilot intentionally measures whether they earn **early/medium** scheduler entitlement rather than trying to reproduce their entire 50M-node capability.

The work cap is not asserted to equal 10M nodes for any family.

## Outputs

For each action, report:

- mechanically eligible cells;
- natural exhaustions vs `work-budget-reached` vs deadline truncations;
- solves by <=0.5M, <=2M, <=5M and <=10M measured work;
- mean/median failed work;
- unique and marginal solves within the sampled equal-work matrix;
- overlap with cheaper/self-exhausting actions;
- corresponding frozen T1 node result for the same level/action where available.

Then build a simple equal-work greedy cover only as an **oracle diagnostic**. It must not become a production scheduler.

## Success / stop gate

**Expand** equal-work census work only if the 60-level pilot changes a decision that the node census currently leaves ambiguous, for example:

- action-family ranking changes materially under equal work;
- a supposedly redundant deep family supplies genuine <=10M-work exclusives;
- a supposedly cheap screen turns out expensive in canonical work;
- repair's early/medium residual value differs enough to move its proposed tranche position.

**Stop after the pilot** if it merely reproduces the already-strong qualitative ordering of naturally bounded beams first, repair as a distinct protected continuation, and thin/redundant ordinary DFS/IDA early value. **This stop condition was met by corrected EW1: do not expand the matrix for symmetry or smoother rankings.** In that case the existing node census plus this cross-currency calibration is sufficient; do not build a full equal-work mirror census for symmetry's sake.

If expansion is earned, the next scale is a larger sample and/or a deeper 20M-work cap chosen from the observed censoring/unique-win boundary. Do not jump straight to 50M work across the full population.

## Implementation shape

Extend the existing census plan/execution/combine plumbing rather than create a parallel census system:

1. add an opt-in equal-work plan tier with a distinct label (do not recycle retired `T2`);
2. default its sample size to zero so ordinary census runs remain byte-for-byte unchanged in plan shape;
3. populate `cell.workBudget` and leave node depth diagnostic-only for those cells;
4. teach the combine step to emit a compact equal-work action table and to count `work-budget-reached` / `deadline-truncated` explicitly;
5. run the 60-level pilot as a separate bounded workflow/plan, not as a surprise addition to the expensive canonical T1 refresh.

This is the smallest plan that converts the already-landed execution primitive into decision-bearing scheduler evidence without accidentally commissioning another giant census.
