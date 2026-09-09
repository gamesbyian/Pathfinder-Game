# Routing predicate composition and capability risk 001

> **Status:** concluded-positive as descriptive risk stratification
> **Last evidence:** 2026-09-08 — current 975/1,700 production boundary joined to the 2026-09-03 isolated capability map
> **Decision:** retain compositional predicate overlap for cohort selection and telemetry. Do not change production action order from this result alone; first identify a repeatable action, propagation, or allocation benefit inside the high-risk cohort.
> **Evidence role:** whole-population observational discovery with deterministic parity replication; Corpus-1 transfer is underpowered

## Finding

The current first-match routing regime hides an important interaction. Independently evaluating the existing static eligibility predicates for intersection-heavy, must-cross-heavy, and multi-portal levels isolates a 396-level triple-overlap cohort with a 29.8% current production solve rate.

| Matching predicates | Levels | Production solved | Solve rate | No isolated T1 winner |
|---|---:|---:|---:|---:|
| None | 65 | 56 | 86.2% | 6 |
| Exactly one | 502 | 363 | 72.3% | 118 |
| Exactly two | 737 | 438 | 59.4% | 268 |
| All three | 396 | 118 | 29.8% | 251 |

The 396 triple-overlap levels contain 278 of the 725 current production misses (38.3%) and 242 of the 604 current production misses without an isolated T1 winner (40.1%). Because first-match classification names every triple member `intersection-heavy`, the current regime field erases the multi-mechanic interaction.

## Exact predicate combinations

| Combination | Levels | Production solved | Solve rate | No isolated T1 winner |
|---|---:|---:|---:|---:|
| Intersection + must-cross + multi-portal | 396 | 118 | 29.8% | 251 |
| Intersection + must-cross | 338 | 247 | 73.1% | 93 |
| Intersection + multi-portal | 288 | 133 | 46.2% | 133 |
| Must-cross + multi-portal | 111 | 58 | 52.3% | 42 |
| Intersection only | 280 | 213 | 76.1% | 49 |
| Must-cross only | 63 | 56 | 88.9% | 6 |
| Multi-portal only | 159 | 94 | 59.1% | 63 |
| None | 65 | 56 | 86.2% | 6 |

The triple interaction is not a generic “more predicates means harder” tautology: intersection + must-cross without multi-portal remains 73.1% solved, while adding multi-portal to the joint constraint coincides with a much harder population.

## Stability checks

| Triple-overlap split | Levels | Production solve rate | No-isolated-winner rate |
|---|---:|---:|---:|
| Even IDs | 201 | 32.8% | 61.7% |
| Odd IDs | 195 | 26.7% | 65.1% |

The direction and magnitude are stable across the deterministic parity halves. Corpus 1 contains only five triple-overlap levels (four production-solved, one without an isolated T1 winner), so it is not a meaningful transfer confirmation.

## Interpretation boundary

This is a high-yield **risk cohort**, not an action selector. It shows where current capability collapses, but does not show that an existing repair, beam, DFS, or admissible-order action wins there under matched work. Previous isolated-rescuer and multi-portal routing analyses remain closed where they lacked production exposure/benefit or lost broad A/Bs.

The safe immediate uses are:

- record all matching predicates, or a predicate-count/bitset, in research telemetry instead of relying only on the first-match name;
- use the triple-overlap cohort to select existing traces, exact counterexamples, and lifecycle failures for mechanism analysis;
- test an intervention only after it has a specific causal premise and a Workstream-2-compatible equal-work allocation contract.

## Next mechanism question

The cohort supports a narrower propagation question: are native dead branches repeatedly violating a joint interface among intersection demand, must-cross approach direction, and portal transitions before the existing independent bounds detect failure? The evidence and implementation gates are in [`2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md`](2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).
