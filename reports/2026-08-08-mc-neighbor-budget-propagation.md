# Must-cross neighbor-budget propagation

> **Status:** revised population A/B complete; integration/promotion decision still open
> **Current capability evidence:** 2026-08-11 level-blind C2 **611→665 (+54 net, 59 gained / 5 lost)**; C1 94→94
> **Decision:** do not rerun the same full A/B; diagnose the five losses and choose a generic equal-work integration
> **Canonical reconciliation:** [`2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md)

`PRUNE_MC_NEIGHBOR_BUDGET` is a sound, default-off must-cross prune that reasons about future intersections forced by already-visited neighbours of pending must-cross interfaces.

This report keeps the complete evidence chain for the mechanism while correcting two historical interpretation issues:

1. the original full-population 725→739 run tested older caller wiring and used exact-level `--prime-winner` replay, so it is historical re-verification evidence, not the current capability verdict;
2. the revised caller policy has now received its own full **level-blind** population A/B, so the previously pending gate is closed.

## Derivation

Existing checks already reserve one future intersection for each pending must-cross cell and catch hard-wall neighbour failures. The missing soft case is an open must-cross axis whose required neighbour has already been visited. Completing that axis later necessarily requires revisiting that neighbour, consuming an additional future intersection beyond the must-cross cell's own reserved second entry.

The rule counts **distinct forced neighbour cells** and compares them with:

```text
freeInt = reqInt - state.ints - popcount(mustCrossMask)
```

Key soundness exclusions remain:

- a required neighbour that is itself a pending must-cross cell is not double-counted;
- flipper neighbours are excluded because their dynamic axis state is not represented by this proof;
- the original formulation abstains on portal levels.

Implementation: `mustCrossNeighborBudgetDeadlocked` / `computeMcNeighborBudget` in the solver lower-bound path.

## Shadow/oracle evidence

Against the oracle-labelled atlas used during development:

- 397 levels;
- 5,518 labelled branches;
- 19 unique dead-branch catches beyond the existing prune gauntlet;
- zero applicable alive false rejects.

That made it the strongest unique-catch candidate in that shadow-evaluation round.

## Stored-solution soundness replay

The production predicate was replayed along known valid paths across all three real corpora:

- **97,812 valid paths**;
- **8,546,457 replayed steps**;
- **0 violations**.

This remains the main soundness evidence. Later live losses are search-allocation effects, not evidence that the rule rejects a stored valid solution.

## First live sample

On 30 unsolved, portal-free, must-cross-bearing Corpus-2 levels under matched work:

- OFF: 5/30;
- ON: 16/30;
- **+11, 11 gained / 0 lost**;
- all ON solutions referee-valid.

The sample justified buying the population run but, correctly, was not treated as a population effect estimate.

## Historical original-wiring population A/B

The 2026-08-08 workflow runs #28/#29 reported:

- C1 96/102 both arms;
- C2 725→739;
- +14 net, 42 gained / 28 lost.

This still matters, but its scope is narrower than originally stated.

### Wiring scope

That result used the original participation policy, including repair's seeded-random `takePly` candidate list.

### Measurement scope

The workflow also supplied exact-level `--prime-winner` replay. The lower-level tool explicitly defines that mode as re-verification-only. Therefore 725/739 must not be used as unseen-level capability numbers.

## 2026-08-11 churn diagnosis and caller-policy fix

Commit `a113d47ab33a8856a1a8fcd327f28379ff65e0e2` identified a specific source of the 28-loss churn.

Repair `takePly` interprets a seeded random draw as an index into the surviving candidate array. Removing a proved-dead candidate can therefore reindex the same random draw onto a different live move and alter the entire repair trajectory. That is not a soundness failure; it is a stochastic-selection coupling.

The revised policy suppresses `PRUNE_MC_NEIGHBOR_BUDGET` only for stochastic repair `takePly`, while retaining it for:

- DFS;
- beam;
- deterministic repair sub-searches.

A later diagnostics refactor accidentally erased that caller policy by replacing the old positional boolean with a diagnostics argument. PR #1357 restored it through named `PruneEvaluationOptions`, with targeted tests proving stochastic selection preserves the candidate while deterministic gauntlet evaluation still rejects/attributes the dead branch.

## Revised level-blind full population A/B (2026-08-11)

Runs:

- control #32 / `31537140410`;
- treatment #33 / `31537474435`.

Both arms' actual shard reports record solver SHA:

```text
c86ba8f86192801176b1e6c5fece3b120850df44
```

The dispatch metadata initially differed because the old workflow checked out a mutable branch ref. All actual shards nevertheless converged on the same SHA. The capability workflow is now hardened to pin `github.sha` so future runs cannot drift this way.

### Results

| arm | Corpus 1 | Corpus 2 | C2 nodes | C2 canonical work |
|---|---:|---:|---:|---:|
| OFF | 94/102 | 611/1700 | 43,017,428,195 | 59,668,825,637 |
| ON | 94/102 | **665/1700** | **41,320,735,149** | **56,486,598,535** |
| delta | 0 | **+54** | **-3.94%** | **-5.33%** |

Churn:

- **59 gained**;
- **5 lost**: `R00635`, `R02119`, `R02422`, `R02823`, `R02867`.

Both C2 arms had:

- 1700/1700 completed;
- zero attempt-error rows;
- zero deadline-truncated rows.

Treatment gains are referee-valid.

## Interpretation

The revised caller policy substantially validates the random-index diagnosis:

- losses fell from historical 28 to 5;
- gains increased from historical 42 to 59 under the level-blind measurement;
- aggregate nodes and canonical work both decreased while solved count increased.

This is strong evidence that the prune is genuinely useful. It is **not yet a strict-superset integration**, because five control solves disappear when the flag is globally enabled.

The population sample size is no longer the question. Another identical 1700-level A/B would add essentially no decision value.

## Next decision-bearing work

1. Diagnose the five losses under the actual revised wiring.
2. Determine whether they share one generic deterministic frontier/order/budget mechanism.
3. If global default-on cannot preserve them, test a complementary/fallback placement under the **same total canonical-work envelope**.
4. Decide default-on vs complementary integration vs remain opt-in.

Any recovery must be level-blind. Do not use per-ID special cases, old winning configs/seeds, or saved solutions as current-solve guidance.

The broader dynamic-resource interpretation remains in `2026-08-11-dynamic-resource-frontier-synthesis.md`: static must-cross descriptors were weak, while state-conditioned destruction of future completion opportunity remains a promising general frontier.
