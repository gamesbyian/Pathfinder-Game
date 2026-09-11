# Known-solution hard-prune soundness audit

> **Status:** concluded-negative for generic default-prune unsoundness
> **Date:** 2026-09-11
> **Evidence run:** GitHub Actions `34561615468`
> **Solver ref:** `44a88d3622743e640ab8313a746a6499946b7ad2`
> **Production behavior:** unchanged
> **Decision:** demote a broad shared hard-prune false-positive bug as an explanation for the current frontier. Keep first-loss, missing-inference and residual-feasibility work active. Reopen prune soundness only for a concrete newly introduced rule, an untested opt-in rule, or a known-live counterexample.

## Question

DFS, beam and substantial parts of repair share move/state machinery and hard-prune logic. A sufficiently deep false-positive prune could therefore make several apparently different techniques fail for the same reason.

The audit asks a one-sided correctness question:

> Does the current default hard-prune stack ever reject a state lying on any stored referee-valid complete solution in corpus 1 or corpus 2?

A single rejection is a soundness failure. Zero rejections does not prove universal soundness outside the replayed population, but a large and mechanically diverse known-live population can substantially weaken the generic-common-bug hypothesis.

## Method

`scripts/stress/known-solution-hard-prune-soundness-check.mjs`:

1. loads every stored stress witness and saved hint and deduplicates identical paths per level;
2. requires each path to pass the canonical candidate referee before it contributes evidence;
3. reconstructs production search state by replaying every step with the real `applyMove` machinery;
4. invokes the real shared `evaluatePrunedMove` pipeline after every move;
5. forces the connectivity check on every step, rather than using DFS/beam's throttled production schedule, so false positives are easier rather than harder to expose;
6. separately checks `PRUNE_MC_FORCED_FIRST_MOVE`, which lives before `evaluatePrunedMove`, through the search module's test seam;
7. records per-prune reach counts and fails on any known-live rejection, premature solution verdict, final non-solution verdict, referee disagreement, or known first move removed by move generation / forced-first filtering.

This is observer-only. No production solver policy or implementation is changed.

## Population result

### Corpus 2

- selected levels: **1,700 / 1,700**
- levels with a known path: **1,700 / 1,700**
- distinct referee-valid stored paths replayed: **174,090**
- path steps replayed: **17,386,396**
- violations: **0**

Known-live reach counts for enabled/default prune rules:

| Prune | Known-live states reached |
|---|---:|
| `PRUNE_DISTANCE_BOUND` | 17,212,306 |
| `PRUNE_INTERSECTION_DEFICIT` | 17,212,306 |
| `PRUNE_CONNECTIVITY` | 17,212,306 |
| `PRUNE_MUST_PASS_LB` | 11,979,449 |
| `PRUNE_PARITY` | 9,558,303 |
| `PRUNE_MC_CEILING` | 5,786,501 |
| `PRUNE_MUST_CROSS_LB` | 5,786,501 |
| `PRUNE_MC_FORCED_NEIGHBOR` | 5,786,501 |
| `PRUNE_MC_NEIGHBOR_BUDGET` | 5,786,501 |
| `PRUNE_ADJ_TURN_LB` | 5,392,398 |
| `PRUNE_MUST_TURN_DEADLOCK` | 4,422,262 |
| `PRUNE_SURROUND_LB` | 4,392,296 |
| `PRUNE_MC_FORCED_FIRST_MOVE` | 7,811 root checks |

### Corpus 1

- selected levels: **102 / 102**
- levels with a known path: **102 / 102**
- distinct referee-valid stored paths replayed: **33,810**
- path steps replayed: **2,741,101**
- violations: **0**

Known-live reach counts:

| Prune | Known-live states reached |
|---|---:|
| `PRUNE_DISTANCE_BOUND` | 2,707,291 |
| `PRUNE_INTERSECTION_DEFICIT` | 2,707,291 |
| `PRUNE_CONNECTIVITY` | 2,707,291 |
| `PRUNE_MUST_PASS_LB` | 1,911,027 |
| `PRUNE_PARITY` | 1,638,949 |
| `PRUNE_MC_CEILING` | 563,461 |
| `PRUNE_MUST_CROSS_LB` | 563,461 |
| `PRUNE_MC_FORCED_NEIGHBOR` | 563,461 |
| `PRUNE_MC_NEIGHBOR_BUDGET` | 563,461 |
| `PRUNE_MUST_TURN_DEADLOCK` | 462,658 |
| `PRUNE_ADJ_TURN_LB` | 383,191 |
| `PRUNE_SURROUND_LB` | 315,633 |
| `PRUNE_MC_FORCED_FIRST_MOVE` | 822 root checks |

### Combined

- referee-valid stored paths: **207,900**
- replayed path steps: **20,127,497**
- violations: **0**
- forced-first root checks reaching the rule: **8,633**

The high reach counts matter. This is not merely a large path count dominated by rules that never activate: every default shared prune represented above was exercised on substantial known-live state populations, with the more general rules receiving tens of millions of opportunities to fail.

## Explicit coverage boundary

`PRUNE_PORTAL_PARITY_ENVELOPE` received zero reach in this run because it is opt-in in the audited production head: `evaluatePrunedMove` requires an explicit config with `PRUNE_PORTAL_PARITY_ENVELOPE === true`, while the soundness replay deliberately uses `cfg = null` to test current default behavior.

Therefore this audit makes **no new population-wide soundness claim** about that opt-in rule. Its direct unit/regression evidence remains separate. Likewise, experimental rules on branches not contained in solver ref `44a88d3` are outside this result and must be adjudicated on their own branch evidence.

## Interpretation

The result materially weakens the hypothesis that the present frontier is mainly caused by a broad, already-enabled false-positive hard prune shared across native search families.

It does **not** weaken several nearby hypotheses:

- the solver may fail to derive a fact that would safely prune dead futures;
- a sound lower bound may simply be too weak;
- scoring or retention may lose live lineages before a prune matters;
- repair or beam may have family-specific reachability/representation failures;
- a newly introduced or opt-in prune can still be unsound;
- stored known solutions do not enumerate every legal live state, so a state-shape-specific false positive remains possible until a counterexample-focused test addresses it.

The practical consequence is to stop spending broad diagnostic effort on generic shared-prune soundness unless new evidence nominates a specific rule. The all-known-basin first-loss and residual-feasibility program remains the more informative route for class-5 frontier work because it can distinguish **missing inference**, **allocation/rank loss**, and **action-local capability failure** rather than merely falsifying false-positive pruning.

## Reuse rule

Keep the replay script as a cheap correctness gate for future hard-prune changes. It is especially appropriate when a new rule is promoted toward default behavior: run the rule enabled over the known-solution population before interpreting solve-rate gains. Do not turn this into a routine expensive CI step; it is a targeted research/correctness diagnostic.
