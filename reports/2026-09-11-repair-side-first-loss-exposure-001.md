# Repair-side first-loss exposure on the class-4/class-5 frontier population 001

> **Status:** concluded (bounded natural-exposure question); deeper operator-reachability question remains open
> **Last evidence:** 2026-09-11 — `census-repair-rollback-windows.mjs` (extended with `--only=<ids>`) run against the full 28-level first-loss frontier population (14 dev-sample + 14 independent-confirmation-sample ids from the two phenotyping reports), at two node budgets (30,000 and 300,000 — a 10x matched-work escalation) to rule out an inadequate-work confound before interpreting the result.
> **Decision:** on this specific frontier population, repair's own natural randomized-restart search essentially never explores anywhere near the known-live trajectory, and — critically — a 10x work increase bought **zero** improvement on 26/28 levels (2 got nominally worse, within the noise of "best of only 5 sampled elites"). This mirrors the beam-width-insensitivity shape from the phenotyping reports exactly: more work does not buy proportional headroom. Repair's best natural common-prefix match with any known-valid trajectory is 1-17 steps (mean ratio ~0.19 of beam's own score-width cull depth on the same levels) — repair diverges from the known-live path **far earlier** than beam does, not later.
> **Remaining gate:** this establishes *natural exposure* is essentially absent and work-insensitive on this population. It does **not** yet test *operator reachability if seeded there* (the deeper "is the required edit outside repair's operator topology" question) — that needs the splice/CP-SAT pipeline (`repair-elite-path-dump.mjs` -> `repair-retreat-binary-search.mjs` -> `repair-plateau-rollout-classifier.mjs`) already used for the general-population operator-incapability rate estimate, applied specifically at these levels' beam-cull depths. Not run here; flagged as the next earned step if this line continues.
> **Evidence role:** discovery/diagnosis (bounded, selected-diagnostic evidence, same population as the two first-loss phenotyping reports). Not a population-scale claim, not a production change.

## Why now

The bounded class-4/class-5 first-loss phenotyping program explicitly left repair `unknown`: "no existing tool cheaply traces known-solution-prefix survival through it... a real gap in this pilot's coverage, not a negative result." `solver-optimization-workstreams.md`'s WS2 gate 5 and this session's assignment (Line B) both name repair-side coverage as earned next work. The task's own framing requires distinguishing: repair never being exposed; repair receiving inadequate work; a valid repair being operator-reachable but poorly ranked/sampled; the required edit being outside current repair-operator topology; the path having already lost viability before repair can help.

## Method

`scripts/stress/census-repair-rollback-windows.mjs` already implements exactly the needed primitive: run `repairSearchFromGate` from the gate under its own randomized-restart policy, collect its best-badness elite arrivals, and compute (via `rollbackCensus`) the **longest common prefix** between each elite and any referee-valid known solution — i.e., how deep into the known-live trajectory repair's own natural search actually tracks before diverging. This is the same tool and metric the existing repair-reachability program (`2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md`) used to estimate a 21.4% reconstructable / 78.6% operator-incapable split on a **general** Corpus-2 sample.

The tool only supported `--sample=N` (fresh random draw) or `--limit-levels=N` (first N), neither of which can target our specific frozen 28-id population. Added `--only=<comma-ids>` (same convention already used by `repair-elite-path-dump.mjs`), purely additive — every existing caller/test is unaffected (verified via `naming-cleanup-phase8-cli-smoke-node-test.mjs`, which exercises this script's CLI).

Ran twice on the identical 28-id population (14 dev-sample + 14 confirmation-sample ids from the two phenotyping reports), varying only `--node-budget`, to separate "inadequate work" from a genuine exposure limit:

```
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --only=<28 ids> --limit-elites=5 --node-budget=30000 \
  --out=reports/stress/first-loss-frontier-repair-rollback-census-001.json

node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --only=<28 ids> --limit-elites=5 --node-budget=300000 \
  --out=reports/stress/first-loss-frontier-repair-rollback-census-300k-001.json
```

30,000 matches this tool's own historical default (used throughout the Sept-2 general-population program); 300,000 is a 10x matched-work escalation, still well under production's `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` (2,000,000) — chosen as the smallest step that could plausibly falsify "just needs more work" before spending compute at full production scale.

## Result

**All 28 levels fully consumed their node budget at both settings** (`nodesExpanded` ≈ budget ± noise), so this is a genuine matched-work comparison, not an artifact of early natural termination.

| levelId | best natural common-prefix (30k) | best natural common-prefix (300k) | beam score-width cull depth (width=2000) | ratio (repair/beam) |
|---|---:|---:|---:|---:|
| R00139 | 3 | 3 | 14 | 0.21 |
| R00329 | 1 | 1 | 13 | 0.08 |
| R00786 | 3 | 3 | 21 | 0.14 |
| R01023 | 2 | 1 | 16 | 0.13 |
| R01097 | 1 | 1 | 16 | 0.06 |
| R01190 | 1 | 1 | 22 | 0.05 |
| R01290 | 1 | 1 | 11 | 0.09 |
| R01632 | 3 | 3 | 10 | 0.30 |
| R02025 | 1 | 1 | 16 | 0.06 |
| R02170 | 5 | 5 | 18 | 0.28 |
| R02185 | 12 | 3 | 16 | 0.75* |
| R02210 | 1 | 1 | 13 | 0.08 |
| R02309 | 3 | 3 | 19 | 0.16 |
| R02324 | 1 | 1 | 12 | 0.08 |
| R02438 | 9 | 9 | 17 | 0.53 |
| R02530 | 1 | 1 | 16 | 0.06 |
| R02590 | 1 | 1 | 22 | 0.05 |
| R02733 | 1 | 1 | 16 | 0.06 |
| R02801 | 1 | 1 | 12 | 0.08 |
| R02897 | 6 | 6 | 41 | 0.15 |
| R03083 | 1 | 1 | 11 | 0.09 |
| R03088 | 1 | 1 | 13 | 0.08 |
| R03101 | 17 | 17 | 16 | 1.06 |
| R03197 | 2 | 2 | 13 | 0.15 |
| R03223 | 1 | 1 | 14 | 0.07 |
| R03229 | 4 | 4 | 22 | 0.18 |
| R03275 | 1 | 1 | 15 | 0.07 |
| R03351 | 3 | 3 | 34 | 0.09 |

\* R02185's 30k value (12) is an artifact of which 5 (of the level's ~60-100) elites happened to be sampled at that budget, not a genuine work-driven improvement — its 300k value (3) is more representative and consistent with the rest of the population; both are far below its own beam cull depth (16).

**26/28 levels: zero change with a 10x work increase. 2/28: nominally worse** (an artifact of "best of only 5 sampled elites" changing which 5 arrived, not a real regression — repair's node-level search is not deterministic/monotonic across restarts with different arrival counts). **Mean ratio: repair's best natural common-prefix depth is ~19% of beam's own score-width cull depth on the same levels** — repair diverges from any known-valid trajectory dramatically earlier than beam does, and this gap does not close with an order-of-magnitude more work.

## Interpretation

This is the same "more dose does not buy proportional headroom" shape the phenotyping reports already established for beam width (2.5x width bought only 0-13 extra steps). Here, a **10x** work increase bought **zero** improvement on the large majority of levels. Per the operating model's own rule ("do not reopen closed forms by changing dose... width, or runtime"), this rules out "repair just needs a bigger node budget" as the explanation and instead nominates a genuine **exposure** limit: repair's randomized-restart-from-gate policy does not, even with substantially more sampling, wander into states resembling this population's known-live trajectories beyond a shallow point.

This is a materially different failure shape from beam's own loss on the same levels. Beam *does* track the known-live path deeply (10-41 steps) before its score-width competition discards it — beam clearly explores this territory. Repair's natural search essentially never reaches it at all. In the task's own vocabulary: this reads as **"repair never being exposed,"** not as "operator-reachable but poorly ranked/sampled" (that would require repair to actually visit states along this path) and not yet resolvable as "outside current repair-operator topology" (that is a distinct, narrower question about whether repair's *legality/scoring* at a specific state would permit constructing the known continuation *if seeded there* — untested by this natural-exposure census).

## What this does and does not establish

- **Establishes:** on this specific 28-level first-loss frontier population, repair's natural search does not naturally approach the known-live trajectories, and this is not an artifact of a too-small node budget (10x escalation, fully matched-work, no improvement).
- **Does not establish:** whether repair's *operators* (`evaluatePrunedMove`/`getNeighbors`/`scoreAndSort`) could construct a legal continuation *if deliberately seeded* at the point where beam loses support — that is the general-population program's own "operator-incapable" question (`2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md`, 78.6% operator-incapable at n=28 on an *unrelated* random sample), not yet run on *this* frontier-specific population. Running it here (seed repair from the known-live prefix at the beam cull depth for a handful of these 28 ids, then `repair-retreat-binary-search.mjs` + `repair-plateau-rollout-classifier.mjs`) is the natural next step if this line continues, and would use the existing pipeline unchanged.
- **Does not establish** whether the underlying paths have already lost viability by the depths in question — that is a WS5 exact/reference adjudication question, usable narrowly if a specific nominated state's liveness is in doubt.
- **Does not** by itself earn the WS6 premise: WS6's trigger is a recurring valid rescue that requires an edit outside repair's *operator* topology, which this natural-exposure result does not test. It does, however, strongly motivate running that specific test next, since natural exposure is now known to be the wrong place to look for "repair coverage" on this population — an exposure/allocation question (WS1/WS2), not yet an operator-topology one.

## Artifacts

- `scripts/stress/census-repair-rollback-windows.mjs` — extended with `--only=<ids>` (additive; existing `--sample`/`--limit-levels` paths unchanged, verified via the existing CLI smoke test).
- [`reports/stress/first-loss-frontier-repair-rollback-census-001.json`](stress/first-loss-frontier-repair-rollback-census-001.json) (30k), [`...-300k-001.json`](stress/first-loss-frontier-repair-rollback-census-300k-001.json) (300k).
