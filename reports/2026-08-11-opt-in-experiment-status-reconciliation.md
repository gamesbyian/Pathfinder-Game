# Retained solver opt-in experiment status reconciliation (2026-08-11)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-11 — repository-wide reconciliation of current default-off surfaces against their dated reports and later implementation commits
> **Decision:** use `docs/solver-opt-in-experiment-ledger.md` for current promotion/disposition state; retained opt-in code is not itself an open task
> **Remaining gate:** none for this reconciliation; individual open mechanisms retain their own gates in the ledger

## Purpose

This is a **documentation/state reconciliation**, not a solver experiment. No new solving was run and no historical A/B result is being altered. The goal is to stop three recurring hygiene failures:

1. treating every production-default-OFF flag as though it still awaits promotion;
2. treating preserved prototype parameters as an implicit backlog; and
3. carrying an old promotion verdict across a later material wiring change without stating that the implementation under decision has changed.

The new canonical disposition ledger is [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md). `scripts/ablation-config.mjs` now explicitly says that `OPT_IN_FEATURES` records production polarity, not queue state, and its five default-off descriptions summarize whether each flag is open or closed.

## Reconciled current dispositions

### `PRUNE_MC_NEIGHBOR_BUDGET`: open again for the **revised wiring**

The original implementation has an unusually strong evidence chain:

- 19 unique dead-branch catches beyond the existing gauntlet in the oracle-labelled atlas;
- zero false rejects in its applicable alive sample;
- zero violations across 97,812 stored-valid paths / roughly 8.5M replayed steps;
- +11/30 with zero losses in the first live pilot; and
- full deterministic Corpus-2 A/B: 725/1700 OFF → 739/1700 ON, +14 net, made of 42 gained / 28 lost.

That full A/B remains valid historical evidence for the rule and the implementation that actually ran it.

However, commit `a113d47ab33a8856a1a8fcd327f28379ff65e0e2` was made **after** that A/B. It identified a specific churn mechanism in repair-search: `takePly` chooses by indexing a seeded random draw into the surviving candidate array, so removing one dead candidate reindexes the same draw onto a different move and changes the entire randomized trajectory. The commit therefore changed `evaluatePrunedMove` participation so the neighbor-budget prune is skipped only for repair's random `takePly` candidate selection, while remaining active for DFS, beam, and deterministic repair sub-searches.

That is a material behavioral change to the mechanism under promotion. Therefore the old 725→739 A/B **cannot be called the promotion verdict for the current wiring**. A fresh deterministic full-population ON/OFF A/B is the current decision-bearing gate.

The `a113d47` commit message says a local sweep of the 68 previously affected Corpus-2 levels was in progress before a new full-corpus run. No committed result/report for that follow-up was found during this reconciliation. It must therefore be treated as **not completed for repository-truth purposes**, regardless of whether an uncommitted/local run may once have happened.

This corrects stale wording in older descriptions that still called the *first* live A/B pending, and narrows `future-work.md`'s older churn language: the immediate question is now the revised wiring's population result, not merely re-diagnosing the already-identified repair random-index mechanism.

### `STRATEGY_MAIN_LOOP_LATE_RESERVE`: genuinely open

This remains a real promotion candidate. The mechanism pilot is complete; the frozen matched-budget full-population experiment remains pending. No change to its evidence or gate was needed beyond making it explicit in the ledger.

### `STRATEGY_REPAIR_ELITE_PREFIX_DFS`: current form closed, not waiting for an expensive confirmation

The dedicated report measured the existing constants on the intended repair-close/repair-far population at equal budget:

- OFF: 5/20 solved
- ON: 4/20 solved
- one direct displacement reproduced because the operator consumed budget ordinary repair needed.

The report historically listed a full population-scale A/B as something that would be required *before promotion*. Read literally, that can sound like an unfinished mandatory run. It is not decision-efficient to buy that run for an **unchanged implementation already negative on its targeted sample**.

Current disposition is therefore:

- **promotion of the existing constants/wiring is closed**;
- the code remains opt-in because it is sound, mechanistically real, and useful experimental infrastructure;
- a materially cheaper or more selective descendant may be explored, but it must first clear a small equal-work retest;
- only a revised variant that becomes non-negative with attributable upside earns a new full Corpus-2 promotion gate.

This preserves the historical report's evidence without turning its conditional “would need population testing before promotion” statement into an unconditional backlog item.

### `STRATEGY_REPAIR_TURN_BIAS`: closed negative

The sparse-ablation bug was real and fixed, but the clean deterministic rerun after the fix reproduced the same Corpus-2 result byte-for-byte: 725/1700 baseline vs 718/1700 ON, net −7 (5 gained / 12 lost). The proposed nogood-cache interaction was separately falsified. No promotion gate remains.

### `PRUNE_PORTAL_PARITY_ENVELOPE`: closed negligible

Sound, but the measured live condition never fired across roughly 240M searched nodes on the 40-level relevant sample. No promotion gate remains unless a materially stronger formulation is derived.

## Non-registry retained prototypes

The audit also checked default-false experimental parameters that can be invoked directly from `repair-search.ts` and similar specialist tooling. Their existence is **not** an invitation to run full-corpus A/Bs:

- `enablePlateauPenalty`: closed as built; real but mixed misdirection, no solve gain.
- `enableRecombination`: closed/superseded as built; one small-sample solve gain, but severe mixed effects and later diagnosis redirected the research toward selective/descent-aware mechanisms.
- `enableRelink`: closed structural dead end; exact-copy suffixes collapse under prefix-dependent legality.
- `enableTurnBias`: its production-gated form received the clean full Corpus-2 negative verdict above.
- admissible-order LDS: closed negative after testing all 117 validated admissible-order solves.
- `schedulerMode: 'portfolio-experiment'`: historical experiment explicitly closed/cancelled for production after measured variants were slower than legacy on the published corpus.

Conversely, `STRATEGY_REPAIR_NOGOOD_CACHE` and the admissible-order node reserve are already promoted/default behavior in their applicable paths and must not be described as dangling opt-ins merely because override/ablation controls still exist.

## Hygiene changes made from this reconciliation

1. Added [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md) as the authoritative narrow disposition table for retained/default-off solver experiments.
2. Updated `scripts/ablation-config.mjs` so `OPT_IN_FEATURES` explicitly means **default polarity only**, and each of its five current opt-ins carries a concise open/closed disposition rather than stale “pending” language.
3. Updated [`../docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md) with two standing rules:
   - an A/B belongs to the exact implementation it tested; materially changed participation/budget/order/random-candidate behavior requires an explicit relevance decision;
   - retained opt-in code is not automatically active work, and current solver opt-in disposition must be reconciled through the ledger.
4. Added the same checks to the investigation closing checklist so this drift is less likely to recur.

## Standing instruction for future agents

Before proposing a run for an existing default-off solver flag or retained prototype:

1. check `scripts/ablation-config.mjs` to identify the actual current surface;
2. check [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md) for current disposition;
3. read the linked dated report for the evidence;
4. inspect later commits that changed the mechanism after that evidence;
5. run only the smallest experiment that can change the current decision.

A retained switch is an experimental instrument, not a to-do checkbox.
