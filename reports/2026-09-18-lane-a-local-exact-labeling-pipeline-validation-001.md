# Lane A: local exact-labeling pipeline validation (no GHA)

> **Status:** concluded-positive
> **Last evidence:** 2026-09-18 — 39 local CP-SAT whole-prefix feasibility queries (`scripts/stress/cpsat-reference-probe.py --prefix=`) against real crossing prefixes from `reports/stress/lane-a-frozen-prefix-population-2026-09-18.json`, current HEAD. `ortools` available in-sandbox; no GHA dispatch.
> **Decision:** the full Lane A pipeline -- production-frontier sampling -> interface-geometry crossing detection -> packed-cell-to-raw-coordinate conversion -> exact whole-prefix CP-SAT feasibility query -> LIVE/DEAD/UNKNOWN label -- now runs end-to-end entirely locally, with per-query cost small enough (0.5s-45s observed, board-size/mechanic-density dependent) that a modest pilot is affordable without GHA. Obtained **32 DEAD, 1 LIVE, 6 UNKNOWN (timeout at 30s)** across 39 queries on 2 levels. This is a pipeline-validation and cost-characterization result, **not** a valid C0 signature-collision test: see "What this does not establish" below.
> **Remaining gate:** a properly designed C0-C4 signature-collision population (non-redundant across interfaces, enough independent levels and prefixes per signature to see genuine contrast) is unstarted. Given the population is 485 (level, interface) pairs across 118 levels and per-query cost is nontrivial at larger boards, that population-scale run is GHA work, deliberately not dispatched here per this session's "do not stack additional GHA runs on what's already running" constraint.
> **Evidence role:** tooling/pipeline validation and cost characterization. The 39 individual labels are real exact evidence and are retained, but the specific sampling here was not designed to test the C0 collision question and should not be read as an answer to it.
> **Population identity:** two ad hoc samples, both drawn from `reports/stress/lane-a-frozen-prefix-population-2026-09-18.json` (itself frozen before any label was inspected): (a) 9 prefixes, one per row, stride-sampled across all 2,012 crossing rows for level/interface diversity; (b) 30 prefixes = all 5 sampled prefixes x 3 balanced interfaces, each, on 2 levels (`R00046`, `R00088`) chosen only because they were among the first 6 (level, interface) pairs with >=2 crossings in file order -- not selected on any inspected label.

## Why this ran

With the 600M-node work-ladder GHA run and PR #1889/#1890 CI already in flight, this checked whether Lane A's *next* gate (exact labelling) could also make real progress without a third concurrent GHA dispatch. `cpsat-reference-probe.py` already supports `--prefix=<json [[x,y],...]>`, documented as pinning the first k positions and asking "does any valid completion exist" -- exactly the "whole-prefix completion LIVE/DEAD" primary label the Lane A preflight (`docs/solver-separator-dynamic-interface-contract-preflight.md`) specifies, and `ortools` was already installed in this sandbox from the D1 program earlier this session.

## What was validated

- **Coordinate conversion.** `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs`'s existing `unpackPackedCell` (packed 0-based solver key -> raw 1-based `[x,y]`) converts a frozen-population `prefix` (packed cell keys) directly into the probe's expected `--prefix=` shape. No new conversion code was needed.
- **Non-adjacent waypoints are portal jumps, not a bug.** A sampled `prefix` can contain consecutive waypoints that are far apart on the board (e.g. `[3,1] -> [6,9]`); this is a real portal jump recorded in the solver's own path representation, which the CP-SAT model is documented to encode -- not a defect in the frontier sampler or the crossing-detection script from the prior report.
- **Real, fast exact answers on the small level.** All 15 queries against `R00046` (11x11 board) resolved in 1.0s-3.1s, all `INFEASIBLE`.
- **Real answers, sometimes indeterminate, on a larger level.** `R00088` (14x14, 5 portal pairs) queries took 19s-30s; 9/15 resolved `INFEASIBLE` inside 30s, 6/15 hit the 30s cap `UNKNOWN` (indeterminate, not DEAD -- per this program's standing convention, an unresolved query is abstained, never forced to a label).
- **A genuine LIVE example exists in this population.** A separate 9-row diversity sample (different levels/interfaces) found one `OPTIMAL` (feasible/LIVE) result (`R02525`, 23.8s), alongside 8 `INFEASIBLE`. The crossing population is not uniformly DEAD.

## What this does not establish

This is **not** a C0 signature-collision result. Two problems, both by construction of an intentionally cheap, non-precommitted feasibility check rather than a designed experiment:

1. **Redundant grouping.** `R00046`'s three "interfaces" (`goal:65546`, `mustPass:1`, `mustPass:65545`) were populated by the *same* 5 crossing prefixes (two of the three share identical `cutCells`, and the third's crossing prefixes happened to coincide). Testing the same 5 raw prefixes three times under three interface labels is not three independent signature groups -- whole-prefix feasibility is a property of the prefix, not of which interface motivated selecting it. The resulting "0 mixing" is trivial, not evidence toward C0's stop rule.
2. **No contrast within a genuine group yet.** No single true (level, interface, side) signature group in this pilot contains both a LIVE and a DEAD outcome, so nothing here bears on whether C0 (bare interface identity) is sufficient or insufficient -- the preflight's actual question.

## Handoff

- Population-construction and exact-labelling are both now proven cheap and correct at small scale. The blocking gap is **designing a non-redundant, adequately-sized signature-collision batch** from the 485 (level, interface) pairs / 2,012 crossing rows already frozen, then dispatching its exact-labelling at whatever scale (local vs. GHA) its total estimated cost warrants -- likely GHA, given 485 pairs x a handful of queries each x up to ~45s/query at the larger boards.
- Do not reuse this report's specific 39 labels as C0 evidence; they are retained here only as pipeline/cost validation. A future signature-collision pass should freeze its own population and query the frozen-prefix artifact for genuinely independent same-signature groups before any label is inspected, per the preflight's own selection contract.
- Raw results: `reports/stress/lane-a-local-exact-label-pilot-2026-09-18.json`.
