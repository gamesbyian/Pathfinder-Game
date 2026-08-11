# Solver opt-in experiment disposition ledger

This document is the **authoritative status ledger for solver mechanisms that still exist in code but are production-default-OFF or otherwise directly invokable only for experiments**. It complements [`future-work.md`](future-work.md): `future-work.md` remains the broad priority queue, while this file answers the narrower question **“does this existing switch still have a promotion decision outstanding?”**

Do not infer status from the fact that a flag or parameter still exists. A default-off mechanism may be an open promotion candidate, a preserved negative result, or historical experimental infrastructure retained to prevent the same idea being rebuilt later.

When this ledger conflicts with stale wording in an older dated report, the dated report remains authoritative for the experiment it actually ran, but **this ledger is authoritative for the current disposition of the current implementation**. Update both when practical; never silently reinterpret an old A/B as though it tested later wiring.

Last reconciled: **2026-08-11**.

## Current production-default-OFF ablation flags

| Flag | Current disposition | Evidence already complete | Decision-bearing next action |
|---|---|---|---|
| `PRUNE_MC_NEIGHBOR_BUDGET` | **OPEN — revised implementation needs a fresh population verdict** | The original wiring was sound on 97,812 stored-valid paths / 8.5M replayed steps, caught 19 oracle-atlas dead branches uniquely, and moved Corpus-2 from 725/1700 to 739/1700 (+14 net, 42 gained / 28 lost). After that A/B, commit `a113d47` changed the implementation so the prune no longer changes repair's seeded random `takePly` survivor list; DFS/beam and deterministic repair sub-searches still use it. | **Run a fresh deterministic full Corpus-2 ON/OFF A/B of the revised wiring.** The old 725→739 result is evidence for the rule and the pre-`a113d47` wiring, not a promotion verdict for the current implementation. A local 68-affected-level follow-up was mentioned as in progress in `a113d47`, but no committed result/report was found during this reconciliation, so do not assume it completed. |
| `STRATEGY_MAIN_LOOP_LATE_RESERVE` | **OPEN — promotion A/B pending** | Starvation census found 34/975 unsolved levels with a historically matched zero-node attempt, 14 of them hard deterministic matches. The implemented reserve-not-reorder treatment activated every beneficiary in the mechanism pilot and recovered 1/14 hard matches at the tested arm without attempt errors. | Run the frozen fresh-control, deterministic matched-budget full-population A/B in [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md). This is the acceptance population; the 14-level cohort is only a mechanism check. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS` | **CLOSED FOR PROMOTION IN ITS CURRENT FORM — preserved opt-in negative** | Sound and mechanistically real, but the current constants lost one solve in the dedicated 20-level equal-budget test: ON 4/20 vs OFF 5/20, with a confirmed displacement caused by consuming repair's shared node budget. See [`../reports/2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md). | **Do not spend a full Corpus-2 A/B on the unchanged current constants merely because the old report said population testing would eventually be required.** Reopen only after a materially cheaper/more selective variant first clears a small equal-work retest. If a revised variant becomes non-negative with attributable upside, *then* buy the population A/B as a new experiment. |
| `STRATEGY_REPAIR_TURN_BIAS` | **CLOSED NEGATIVE — do not promote** | Clean deterministic Corpus-2 rerun after the sparse-ablation confound fix reproduced baseline 725/1700 vs ON 718/1700: **net −7, 5 gained / 12 lost**, byte-identical to the earlier result. Disabling the nogood cache gave −8 and falsified the proposed interaction explanation. | None. Reopen only with materially new mechanism evidence, not another repeat of the existing flag. See [`../reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md`](../reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md). |
| `PRUNE_PORTAL_PARITY_ENVELOPE` | **CLOSED NEGLIGIBLE — do not promote** | Sound stored-solution reasoning and live A/B, but its reject condition fired **zero times** across roughly 240M searched nodes on 40 relevant portal levels; every level's node count was unchanged. | None. Reopen only for a materially stronger parity formulation with new evidence. See [`../reports/2026-08-08-portal-parity-envelope.md`](../reports/2026-08-08-portal-parity-envelope.md). |

## Default-off repair-search parameters that are not ablation-registry promotion candidates

These parameters remain callable inside `repair-search.ts`, but their existence is **not** a dangling request to run Corpus-2 on each one.

| Parameter | Disposition | Why no promotion gate is pending |
|---|---|---|
| `enablePlateauPenalty` | **Closed as built** | Equal-work follow-up confirmed that the mechanism really reshapes search, but it produced no solved-count gain and mixed/misleading near-miss movement. The attempted near-solved guard failed because the harm occurs during descent before the near-solved state. |
| `enableRecombination` | **Closed/superseded as built** | Complementarity-guided soft recombination did produce the investigation's first extra solve (2/16 vs 1/16), but it also produced severe regressions in near-miss quality. Later work identified flat cell identity as the shared discrimination failure and moved to selective turn-aware/descent-aware reasoning. Do not run a population A/B of this unchanged prototype just because it remains callable. |
| `enableRelink` | **Closed structural dead end** | The real anchor-splice relinking operator fired but produced zero solve/badness effect; exact copied suffixes quickly become illegal under a different prefix state. Soft attraction outperformed rigid transplantation. |
| `enableTurnBias` | **Closed through the production-gated experiment** | This underlying repair parameter is what `STRATEGY_REPAIR_TURN_BIAS` ultimately exercised. The clean full Corpus-2 result above is the promotion verdict. |

The canonical historical synthesis for these repair mechanisms is [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md). Its remaining research direction is descent-aware probing / genuinely different prefix-editing capability, not population-testing every retained prototype.

## Other retained opt-in modes that are already closed

- **Admissible-order LDS (`AttemptConfig.admissibleOrderLds`)**: tested against all 117 validated admissible-order solves; it used more nodes on every common solve and regressed 9/117 into timeout. Retained only as a documented negative and standalone probe mode. No production promotion gate remains.
- **Fast portfolio scheduler (`schedulerMode: 'portfolio-experiment'`)**: the measured variants were slower than legacy on the published corpus; the broader historical validation target was explicitly cancelled on 2026-08-07. Retained offline as historical experimental infrastructure, not as pending production work.

## Already promoted/default-on items that should not be mistaken for dangling experiments

- **`STRATEGY_REPAIR_NOGOOD_CACHE`** shipped default-on. Its 20-level repair test was +1 with zero regressions and material node reductions; the later full Corpus-2 refresh produced a byte-identical solved-ID set at the current 36M-node budget. It is implemented current behavior, not awaiting promotion.
- **Admissible-order node reserve (`ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25`)** is already implemented/default behavior for finite-node-budget offline runs. The dedicated A/B was +21 net on the 141 target levels and +2 net on the deliberately high-risk solved control after noise reconciliation. Do not confuse its override knob with the separate default-off **main-loop late reserve** experiment.
- **Attraction-diversity, repair fallback/probe, admissible-order search, and the ordinary repair must-turn-biased attempt** are production strategies with ordinary ablation switches. Their presence in `FEATURES` is for ablation, not evidence of an unresolved promotion decision.

## Promotion-state hygiene rules

1. **`OPT_IN_FEATURES` means default polarity, not “open tasks.”** Never enumerate that set and assume every member needs an A/B.
2. **An A/B belongs to the exact wiring it tested.** If code later changes the mechanism's participation, budget, ordering, random-candidate set, or applicability, explicitly decide whether the old A/B still answers the promotion question. For `PRUNE_MC_NEIGHBOR_BUDGET`, `a113d47` changed exactly that, so a fresh population verdict is required.
3. **A negative small test can close the current form without buying a huge run.** Elite-prefix DFS is the standing example: unchanged current constants are not worth a Corpus-2 run merely to make a negative sample more expensive. A materially revised mechanism starts a new evidence chain.
4. **Preserved prototype code is not a queue.** `enablePlateauPenalty`, `enableRecombination`, `enableRelink`, and admissible-order LDS are kept because their negative/mechanistic findings are useful and rebuilding them would waste time.
5. **When a gate closes, update both the dated report and this ledger, plus `future-work.md` if it is queued there.** When a materially revised implementation reopens a gate, record why the previous evidence no longer directly decides promotion.
6. Before creating another solver-wide experiment, check this ledger, [`future-work.md`](future-work.md), and the relevant dated report so completed work is not repeated under a new name.
