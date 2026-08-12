# Solver opt-in experiment disposition ledger

This is the authoritative disposition ledger for solver mechanisms that remain production-default-OFF or are otherwise explicitly invokable for experiments. `docs/future-work.md` is the broader priority queue; this file answers: **does this existing mechanism still have a promotion decision outstanding?**

Capability decisions must obey [`solver-level-blindness.md`](solver-level-blindness.md). Exact-level history may be used for replay/research, but never to produce a headline capability verdict.

Last reconciled: **2026-08-11**, after the revised neighbor-budget level-blind A/B and explicit-prefix CP-SAT run.

## Current production-default-OFF ablation flags

| Flag | Current disposition | Evidence complete | Decision-bearing next action |
|---|---|---|---|
| `PRUNE_MC_NEIGHBOR_BUDGET` | **OPEN FOR INTEGRATION/PROMOTION; population A/B itself COMPLETE** | Soundness: 97,812 stored-valid paths / 8.5M replay steps, zero violations; 19 unique oracle-atlas catches beyond the existing gauntlet. Original wiring historical A/B: +14 with 42 gained / 28 lost, but that workflow used exact-level winner priming and is not a capability baseline. Revised caller policy suppresses the prune only from stochastic repair `takePly`. **2026-08-11 level-blind full C2 A/B: 611→665 (+54 net, 59 gained / 5 lost); C1 94→94; C2 nodes -3.94%, canonical work -5.33%; zero attempt errors/deadline truncations.** | Do **not** repeat the population A/B unchanged. Diagnose the five losses (`R00635`, `R02119`, `R02422`, `R02823`, `R02867`) and test a generic equal-work integration that preserves the upside without capability regression if possible. Then decide default-on vs complementary lane vs remain opt-in. |
| `STRATEGY_MAIN_LOOP_LATE_RESERVE` | **OPEN — promotion A/B pending** | Starvation census found 34/975 historically unsolved levels with a historically matched zero-node attempt, 14 hard deterministic matches. Mechanism pilot activated beneficiaries and recovered 1/14 hard matches. | Run the frozen full-population **level-blind** A/B after workflow hardening. Control + 5/10/15% treatments, config count 4 in every arm. Exact-level priming is forbidden and no longer a workflow input. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS` | **CLOSED FOR PROMOTION IN CURRENT FORM** | Equal-budget dedicated test: ON 4/20 vs OFF 5/20, with confirmed displacement from consuming repair's shared node budget. | None. Reopen only after a materially cheaper/more selective variant clears a small equal-work retest. |
| `STRATEGY_REPAIR_TURN_BIAS` | **CLOSED NEGATIVE** | Historical matched C2 run reproduced 725→718 (-7, 5 gained / 12 lost) and disabling nogood cache did not rescue it. That historical population used the old re-verification harness, so do not quote 725 as capability; the negative is still enough to close the unchanged mechanism. | None unless materially new mechanism evidence appears. Do not rerun the unchanged flag merely to translate the old negative into the new capability harness. |
| `PRUNE_PORTAL_PARITY_ENVELOPE` | **CLOSED NEGLIGIBLE** | Sound stored-solution reasoning and live test; reject condition fired zero times across roughly 240M searched nodes on relevant portal levels. | None. Reopen only for a materially stronger formulation. |

## Default-off repair parameters that are not promotion candidates

- `enablePlateauPenalty`: **closed as built**. It reshapes search but produced no solve gain and mixed/misleading near-miss movement.
- `enableRecombination`: **closed/superseded as built**. Soft recombination found one extra solve in its small test but produced severe regressions; later work identified the broader discrimination problem.
- `enableRelink`: **closed structural dead end**. Exact suffix transplantation fired but produced no solve/badness benefit because copied suffixes quickly become illegal under changed prefix state.
- `enableTurnBias`: closed through `STRATEGY_REPAIR_TURN_BIAS` above.

The remaining repair research direction is exact retreat/deep prefix editing, not population-testing retained prototypes.

## Other retained modes already closed

- Admissible-order LDS: closed negative; it used more nodes on every common solve and regressed 9/117 to timeout.
- Fast portfolio scheduler / broad cold-start variants: closed; measured variants were slower than the legacy ladder. Do not confuse this with **online failure-conditioned control**, which remains a different research question and must use current-invocation evidence only.

## Already promoted/default-on items

- `STRATEGY_REPAIR_NOGOOD_CACHE`: shipped default-on after positive repair evidence and population compatibility.
- Admissible-order node reserve (`0.25`): shipped/default behavior after its dedicated positive A/B.
- Attraction-diversity, repair fallback/probe, admissible-order search, and the ordinary repair must-turn-biased attempt are production strategies with ablation controls; their flags are not dangling promotion tasks.

## Experiment interpretation rules

1. **`OPT_IN_FEATURES` means polarity, not backlog.** Never enumerate flags and assume every default-off switch needs another A/B.
2. **A/B evidence belongs to the exact wiring and measurement regime tested.** The revised neighbor-budget caller policy required a fresh A/B; that A/B is now complete.
3. **Capability means level-blind.** A result using `primeAttempt`, `--prime-winner`, saved hints as guidance, previous level status for scheduling/budgeting, or exact-level caches is re-verification/research evidence, not solver capability.
4. **Historical re-verification results remain useful but must be labeled.** The old 725 C2 figure is not erased; it simply must not masquerade as an unseen-level score.
5. **Negative small tests can close a current form without buying a huge run.** Do not make a negative experiment more expensive just to make it feel official.
6. **Preserved prototype code is not a queue.** Reopen only with materially new mechanism evidence.
7. **Promotion should optimize the actual goal.** More total level-blind solves or less work without unacceptable regressions. A complementary/fallback integration must be judged at matched total work, not by granting itself an extra full solve budget.
8. **Saved solutions are outputs, not exact-level solver inputs.** They may label research and inspire generic policy, but the final policy must solve from the level itself.

## 2026-08-11 neighbor-budget disposition note

The earlier stochastic-repair exclusion was accidentally erased during prune-diagnostics refactoring and restored through named `PruneEvaluationOptions`. The subsequent level-blind population A/B is now the decision-bearing evidence for that restored implementation.

Result: **611/1700 OFF → 665/1700 ON**, 59 gains / 5 losses, with lower aggregate nodes and work. The old 42/28 churn diagnosis is therefore substantially validated: removing the prune from indexed random move selection eliminated most losses. The remaining five losses now define the integration problem; another identical 1700-level A/B would add no new information.
