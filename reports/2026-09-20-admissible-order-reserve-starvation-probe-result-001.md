# Admissible-order reserve-starvation probe result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — GHA run `35530061224` (method-probe-sweep.yml, shard_count=40, `admissible-order|tieBreak=default|lds=off`, 300,000,000-node ceiling), full frozen population, `research:analyze-reserve-starvation` applied.
> **Decision:** **2/40 independent parents show a genuine reserve-starvation opportunity** (solved between the current 75M reserve and the 300M total envelope). Per the preflight's frozen decision rule (`>=2` opportunities), recurrence is large enough to justify designing the smallest matched-total-work reserve-fraction A/B. This is nomination evidence, not a production change.
> **Remaining gate:** design (not yet dispatch) the smallest matched-total-work `admissibleOrderNodeReserveFractionOverride` A/B, predeclaring candidate fractions from the observed cost curve below and including explicit earlier-stage loss controls, per the preflight's own non-authorization list.
> **Evidence role:** confirmation probe outcome, per `reports/2026-09-19-admissible-order-reserve-starvation-prospective-preflight-001.md`'s frozen precommitment; no reserve-fraction change is authorized by this result alone.
> **Research question:** `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`
> **Population identity:** the frozen 40-parent sample, `reports/stress/failure-evidence/reserve-starvation-default-profile-sample-2026-09-19.json` (deterministic draw, R00044/R01000/R02974 excluded by design).

## Canary

The Stage-0 R00044 execution-family canary (this same preflight) initially appeared to fail (GHA run `35465899667` reported 0/1 observed) due to an unrelated infrastructure bug: `method-probe-sweep.yml`'s combine job silently lost results when exactly one shard artifact was downloaded (files land flat rather than in a per-artifact subdirectory). Fixed in PR #1926 (`scripts/method-probe-staging-lib.mjs`); the harvester's independent `gh run download` path had already confirmed R00044 solved at `nodesExpanded=219,802,423`, byte-identical to the originally reported cost. Re-dispatched canary (GHA runs `35466615959`, `35467098808`) confirmed clean after the fix. The same PR also fixed this workflow's experiment-contract writer to set `experiment.resolvedSha` (previously always missing, so every prior run of this workflow published `decisionBearing=false` regardless of population completeness) — this is why the Stage-1 run below was able to auto-persist its full decision-bearing evidence via `harvest-solver-evidence.yml`'s existing generic mechanism, with no bespoke retrieval needed.

## Stage 1: 40-parent probe

Complete, decision-valid population: 40/40 observed, 0 missing/unexpected/duplicate, single protocol/solver identity (`solverRef=5ef9146b...`).

| Outcome | Count |
|---|---:|
| Solved | 4 |
| Node-limited (censored at 300M) | 36 |

### The 4 solves

| Parent | `nodesExpanded` | Bucket |
|---|---:|---|
| R01132 | 73,548,703 | solved-within-current-reserve (<=75M) |
| R02622 | 37,411,185 | solved-within-current-reserve (<=75M) |
| **R01154** | **179,026,618** | **reserve-starvation-opportunity** |
| **R03270** | **172,663,501** | **reserve-starvation-opportunity** |

Per the preflight's frozen definition (`solved AND 75,000,000 < nodesExpanded <= 300,000,000`), **R01154 and R03270 are genuine reserve-starvation opportunities**: the isolated default admissible-order-fallback profile finds a solution well above the current 25% (75M) node reserve, but comfortably inside the existing 300M total node envelope — exactly the R00044 mechanism, now recurring on 2 independent parents beyond the original discovery row.

### Decision-rule application

Per the preflight's frozen rule:

- 0 opportunities -> close negative
- 1 opportunity -> inconclusive, need a second disjoint sample
- **>=2 opportunities -> recurrence is large enough to justify designing the smallest matched-total-work reserve-fraction A/B**

**2/40 opportunities clears the `>=2` bar.** This is a genuine, if modest (5% of the independent 40-parent sample, 3/42 including R00044 across all evidence to date), recurring allocation-order mechanism — not a one-off artifact of R00044 specifically.

## New hints persisted (not a production-solve claim)

This isolated single-technique probe produced referee-valid solved paths for all 4 solved rows, which the standard hint harvester persisted to `data/stress/hints-random/{R01132,R01154,R02622,R03270}.json`. Per this workstream's standing rule, an isolated-technique solve is not itself a production solve: the production ladder runs multiple techniques under one shared, competing budget, and this probe ran `admissible-order-fallback` alone at the full 300M ceiling with no other stage competing for that budget. Whether reallocating the existing 300M production budget would actually let R01154/R03270 reach this route without starving an earlier stage that currently needs it is exactly the open question the nominated A/B must answer -- it is not settled by this probe.

## What this does not authorize

Per the preflight's explicit non-authorization list, this result does not:

- change `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`;
- reopen the closed-negative broad 4x total-budget escalation question;
- treat isolated method-probe success as production success;
- pick a new reserve fraction from these confirmation outcomes (any candidate fraction must be predeclared from the cost curve, not fit to R01154/R03270's exact costs);
- authorize dispatch of the reserve-fraction A/B itself -- only its design.

## Candidate fraction sizing (for the next preflight, not decided here)

For context only: R01154 needed 179.0M nodes (59.7% of the 300M total), R03270 needed 172.7M (57.6%). Both comfortably exceed even a doubled reserve (50%, 150M) but would fit inside e.g. a 60-65% reserve. Any actual candidate-fraction predeclaration must also model expected loss to earlier stages that currently rely on the un-reserved 75%-of-budget share, which this report does not attempt.

## Artifacts

- GHA run `35530061224` (Stage 1, 40 shards)
- `reports/stress/experiment-evidence/35530061224__run-35530061224__attempt-1/` (auto-persisted decision-bearing bundle: compact failure-response, full result, manifest)
- `reports/stress/failure-evidence/reserve-starvation-analysis-2026-09-20.json` (full per-row analysis)
