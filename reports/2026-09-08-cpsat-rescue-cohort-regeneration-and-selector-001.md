# CP-SAT rescue cohort regeneration and selector characterization 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-08 — deterministic current-production join over all 1,700 Corpus-2 levels
> **Decision:** concluded-positive for evidence integrity, exploratory-positive for a narrow acquisition selector. The quarantined cohorts are repaired. Keep Workstream 5 on demand; use the 12 current production-unsolved/no-isolated-winner rescues as exact-reference counterexamples, and acquire new CP-SAT labels only for a prespecified future question or temporal holdout. Do not put CP-SAT in production.
> **Remaining gate:** none for evidence integrity; the narrow acquisition selector needs a prespecified temporal/new-label holdout before any use.
> **Evidence role:** observational evidence repair plus internally split discovery; not an independent selector confirmation

## Result

The no-dispatch regeneration completed with source hashes and membership assertions in [`stress/cpsat-rescue-cohorts-2026-09-08.json`](stress/cpsat-rescue-cohorts-2026-09-08.json).

| Cohort | Current count |
|---|---:|
| Corpus-2 levels with retained solved `cpsat-full-probe` provenance | 280 / 1,700 |
| Also unsolved by the current production run | 26 / 725 |
| Also without an isolated T1 winner | 13 / 643 |
| Both production-unsolved and without an isolated T1 winner | 12 / 604 |

The 12 strongest current counterexamples are:

`R00044, R00720, R00860, R02059, R02194, R02452, R02464, R02718, R02862, R03092, R03115, R03201`

The artifact asserts that all three joined populations cover the same 1,700 IDs, all cohort arrays are sorted and duplicate-free, every member satisfies its production/T1 predicate, and all 898 matching provenance records terminate as `solved` with non-empty retained paths. The production boundary is the 975/1,700 run at solver commit `045bbe904a567929ef4ed3aeeded110bd13b5491`; the isolated T1 boundary is the 2026-09-03 capability map.

## Why the old count and list disagreed

The old printed no-T1 list had 15 entries and 14 unique IDs because `R00860` appeared twice. It also contained `R00537`, which the refreshed capability map now supports with an isolated T1 winner. Removing the duplicate and applying the current T1 predicate leaves the regenerated 13-level cohort; `R00720` remains a valid member.

The old production-unsolved count of 45 came from an older production boundary embedded in the capability artifact (819 solves). Joining the same retained CP-SAT evidence to the current 975-solve production report leaves 26. One of the 13 no-T1 rescues, `R02474`, is now production-solved, producing the 12-level combined residual.

## Selector characterization

Among the 725 current production misses, CP-SAT rescues are concentrated in smaller native residuals: mean required path length is 83.7 versus 105.0 for other misses, area is 136.8 versus 170.0, and constrained-object count is 22.8 versus 29.8.

The smallest interpretable rule found in the existing static fields was:

`requiredPathLength <= 89 && constrainedObjects <= 29`

| Split | CP-SAT rescues / selected | Precision | Lift over split base rate | Rescue recall |
|---|---:|---:|---:|---:|
| Even level IDs | 10 / 53 | 18.9% | 4.67x | 66.7% |
| Odd level IDs | 8 / 46 | 17.4% | 5.60x | 72.7% |
| Combined | 18 / 99 | 18.2% | 5.07x | 69.2% |

The direction survives the deterministic parity split, but the threshold was explored on this same 26-positive population. It is a nomination rule for a future prespecified label-acquisition cohort, not independent validation and not a production routing rule.

Within the stricter 604-level current production-unsolved/no-T1 population, the same rule contains 9 of 12 CP-SAT rescues in 62 selected levels (14.5% precision, 7.31x lift, 75% recall). That slice is more decision-relevant but too small for stronger claims.

## Static topology/placement follow-up

[`stress/static-topology-placement-2026-09-08.json`](stress/static-topology-placement-2026-09-08.json) tests 18 legal static descriptors: gate/goal distances, a deliberately relaxed portal-distance descriptor, articulation and bridge density, degree-two corridors, obligation clustering and endpoint distances, and portal span/region crossing. Deterministic even/odd cross-fitting compares them with the existing seven-field structural baseline.

| Outcome | Baseline AUC | Topology-only AUC | Combined AUC | Increment |
|---|---:|---:|---:|---:|
| Current production failure | 0.845 | 0.753 | 0.842 | -0.003 |
| No isolated T1 winner among production misses | 0.701 | 0.635 | 0.710 | +0.009 |
| CP-SAT rescue among production misses | 0.928 | 0.782 | 0.884 | -0.045 |

Portal span and obligation clustering are individually associated with production difficulty in both parity halves, but add no material held-out value beyond the coarse features. CP-SAT topology effects change substantially between halves, and the combined model is worse. Close this static bundle as a current selector extension; retain the feature artifact for future mechanism-specific questions.

The relaxed portal distance must not be reused as a legality bound: it intentionally adds portal pairs as unconstrained graph edges and is only an offline descriptor.

## Workstream consequence

- Workstream 5's integrity gate is satisfied.
- Retained exact paths on the 12 combined residuals are useful counterexamples for native propagation, trace, and reconstruction work.
- The simple size/load rule is strong enough to prespecify on a future temporal or newly acquired exact-label holdout, but not strong enough to justify new broad CP-SAT compute now.
- Production CP-SAT remains out of scope.

## Reproduction

```bash
node scripts/analyze-cpsat-rescue-cohorts.mjs
node scripts/analyze-static-topology-placement.mjs
npm run check:level-data-validity
```

