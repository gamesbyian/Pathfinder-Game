# Technique census refresh: direct analytical rejoin and remaining parity work

> **Status:** active evidence refresh
> **Last evidence:** 2026-09-04 — direct re-analysis of `reports/stress/technique-niches/2026-09-03/level-capability.json`, generated from technique census run `33717910218`
> **Decision:** the refreshed census materially changes individual support identities and thin-boundary membership, but the broad structural unsupported-risk picture survives. Current capability-dependent work should use the 2026-09-03 artifact. Full analytical parity with the August census still requires rebuilding the second-order census outputs and relative-advantage artifact against run `33717910218`; those are execution/tooling tasks, not reasons for another census.
> **Evidence role:** observational-development re-analysis of already-collected census evidence

## Why this report exists

Run `33717910218` refreshed the expensive technique × level matrix and `2026-09-03-technique-census-refresh-001-rejoin.md` rebuilt the basic capability map and old-vs-new class delta. That refresh did not automatically regenerate every analytical layer later built around the August census. This report records what can already be refreshed directly from the current capability artifact and identifies the remaining derived outputs that should be rebuilt from the fresh cells.

## Current top line

The current `level-capability.json` covers 1,962 levels:

| metric | current |
|---|---:|
| production solved | 1,074 |
| production unsolved | 888 |
| isolated-oracle solved | 1,316 |
| no isolated T1 winner | 646 |
| production miss + no isolated T1 winner | 611 |
| production solved + no isolated T1 winner | 35 |
| production miss + isolated T1 winner | 277 |
| singleton | 175 |
| doubleton | 94 |

The refresh report already records the important historical delta: 229 levels changed support class, 25 newly entered the production-solved/no-isolated-winner class, 81 production misses gained isolated support, singleton count moved 181→175, and doubleton 96→94.

## Structural unsupported-risk signal: refreshed

The strongest current standardized differences between T1-supported and no-T1-winner levels are:

| feature | current standardized difference | Sep-1 synthesis | reading |
|---|---:|---:|---|
| constrained objects | 1.276 | 1.23 | stable / slightly stronger |
| turn-constraint load | 0.971 | 0.92 | stable / slightly stronger |
| constrained-object density | 0.838 | 0.79 | stable / slightly stronger |
| required path length | 0.828 | 0.84 | essentially unchanged |
| portals | 0.789 | 0.76 | stable |
| required-path coverage | 0.760 | 0.75 | essentially unchanged |
| must-turn count | 0.656 | 0.70 | modestly weaker, still material |
| surround count | 0.603 | 0.55 | modestly stronger |
| blocks | 0.577 | 0.55 | stable |

This is a useful survival result: the September-1 conclusion that unsupported-risk is associated with **combined obligation/load/topology burden rather than one mechanic** remains supported after substantial solver drift. The refreshed census changed many exact winners but did not erase the coarse structural anatomy.

Routing-regime enrichment is also broadly stable:

- `intersection-heavy`: 528/1,371 no-winner, enrichment **1.170x**;
- `multi-portal`: 63/174, enrichment **1.100x**;
- `must-cross-heavy`: 49/222, enrichment **0.670x**;
- `general`: 6/149, enrichment **0.122x**;
- `sparse-low-intersection`: 0/46.

The one directional change worth noting is `multi-portal`: the September-1 synthesis called it nearly neutral (~1.03x), whereas the fresh map puts it at ~1.10x. That is still a weak enrichment compared with combined constraint/load effects and does not by itself earn a portal-specific intervention.

## Admissible-order rare capability: refreshed

Current per-profile rows are:

| profile | solved | singleton exclusive | doubleton participation | production-miss wins | successful-node median | successful-node p90 |
|---|---:|---:|---:|---:|---:|---:|
| `tieBreak=default` | 456 | 1 | 6 | 31 | 429,071 | 19,076,423 |
| `tieBreak=intersectionHarvest` | 454 | 1 | 4 | 30 | 427,598 | 19,818,742 |
| `tieBreak=mustCrossFirst` | 452 | 1 | 4 | 35 | 434,524 | 20,077,843 |
| `tieBreak=nearClosureRescue` | 444 | 2 | 4 | 34 | 412,234 | 20,077,843 |
| `tieBreak=none` | 490 | **17** | **24** | **38** | 365,381 | 21,785,688 |

The scheduler-facing conclusion survives the refresh: the alternate admissible-order profiles are not interchangeable dead weight. `tieBreak=none` in particular still owns a large rare-capability footprint, while the three named non-default profiles each retain smaller but non-zero singleton capability. This reinforces the current `admissible-order-alternate-tiebreak-retry` disposition: large repricing headroom is plausible, but wholesale suppression would need a stronger rare-capability argument than the 40-level zero-hit pilot.

## Selected beam capability rows relevant to current scheduler work

The refreshed map also preserves the importance of the intersection-harvest beam family:

| action | solved | singleton exclusive | doubleton participation | production-miss wins |
|---|---:|---:|---:|---:|
| intersectionHarvest, width 2K, plain | 499 | 4 | 5 | 19 |
| intersectionHarvest, width 5K, plain | 614 | 2 | 5 | 26 |
| intersectionHarvest, width 5K, mechanic-buckets | 713 | **11** | **22** | **51** |

This is consistent with the production-vs-static-portfolio A/B attribution: the 5K intersection-harvest searches are not generic redundant tail; they carry substantial demonstrated capability and some of the static portfolio's production losses were dose truncations of these exact configurations.

## What is already refreshed versus still stale

Already current:

- raw combined census cells and level-technique coverage from run `33717910218`;
- first-order capability summary / pair-synergy / flag-sensitivity outputs emitted with that run;
- `reports/stress/technique-niches/2026-09-03/level-capability.json`;
- old-vs-new support-class/singleton/doubleton delta digest;
- the direct structural-risk and selected current action summaries in this report.

Still requiring regeneration from the fresh matrix to match the analytical layers built around the August census:

1. **Full second-order census analysis** via `scripts/analyze-technique-census.mjs` against `reports/stress/technique-census/33717910218/`: phenotype/multiplicity, cover/oracle frontiers, pairwise substitutability, conditional success/cost, parameter inversions, cap-retention curves, censored tranche economics, `techniqueBudgetCurves`, and any comparable production joins.
2. **Fresh compact relative-advantage artifact** using the same prespecified pair set as `reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json`, so old-vs-new disagreement counts and structural effects can be compared without pair reselection.
3. **Fresh portfolio-18 rare-capability join** against the 2026-09-03 capability map, reproducing the old 144/151 singleton-retention audit with current singleton/doubleton memberships and per-dropped-technique losses.
4. **Fresh production-boundary/exposure join** replacing the superseded 73-not-offered / 57-starved / 9-non-reproducing counts with current census + current comparable production reach/work evidence.
5. **Fresh anatomy of the 35 production-solved/no-isolated-winner levels**, because this cohort grew from 14 to 35 and is now large enough to reassess how often live production capability comes from retry context, additive actions, sequence effects, or action identities absent from the isolated census.
6. **Delta-of-conclusions synthesis:** compare the regenerated outputs to the September-1 synthesis and explicitly classify conclusions as survived, strengthened, weakened, reversed, or superseded.

## Execution priority

The highest-value order is:

1. regenerate second-order outputs;
2. regenerate the fixed-pair relative-advantage artifact;
3. refresh portfolio rare-capability retention;
4. rebuild the current production-boundary/exposure join;
5. analyze the 35 production-solved/no-isolated-winner cases;
6. write a concise conclusion-delta synthesis and update queue assumptions only where evidence actually moved.

None of this requires another expensive census. It is extraction, joining, and interpretation of evidence already collected.
