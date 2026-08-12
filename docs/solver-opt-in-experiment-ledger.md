# Solver opt-in experiment disposition ledger

This is the authoritative disposition ledger for solver mechanisms that remain production-default-OFF or are otherwise explicitly invokable for experiments. `docs/future-work.md` is the broader priority queue; this file answers: **does this existing mechanism still have a promotion decision outstanding?**

Capability decisions must obey [`solver-level-blindness.md`](solver-level-blindness.md). Exact-level history may be used for replay/research, but never to produce a headline capability verdict.

Last reconciled: **2026-08-12**, after promoting `PRUNE_MC_NEIGHBOR_BUDGET` and `STRATEGY_MAIN_LOOP_LATE_RESERVE` (see "Already promoted/default-on items" and the disposition notes below).

## Current production-default-OFF ablation flags

| Flag | Current disposition | Evidence complete | Decision-bearing next action |
|---|---|---|---|
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
- `PRUNE_MC_NEIGHBOR_BUDGET`: promoted to default-on 2026-08-12 after the population evidence below
  and a five-loss diagnosis (4 of 5 losses share a diverse-beam bounded-width displacement
  mechanism, mechanistically distinct from the already-fixed repair-seed issue; the fifth,
  `R02823`, is separately tracked as a not-yet-understood local execution-context sensitivity —
  see `reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`). **The initial
  promotion attempt (removing the flag from `OPT_IN_FEATURES` alone) was incomplete and had zero
  runtime effect anywhere, including production**: `prune-gauntlet.ts`'s read site still used the
  opt-in convention (`cfg && cfg.FLAG === true`, defaults OFF whenever no ablation object is
  passed — which is what every production caller and any CLI run without `--enable-flags` does),
  not the standard convention (`!cfg || cfg.FLAG`) every other promoted flag uses. Fixed alongside
  the registry change this time, with a regression test
  (`modules/solver/lower-bounds.test.ts`) verifying the rule fires under a genuinely-omitted
  ablation config specifically, not just under an overall gauntlet verdict (which can be
  misleadingly satisfied by an unrelated rule).
- `STRATEGY_MAIN_LOOP_LATE_RESERVE`: promoted to default-on at fraction `0.15` 2026-08-12 after the
  frozen level-blind full-population A/B — see `reports/2026-08-12-main-loop-late-reserve-population-ab.md`
  and the disposition note below. Learning directly from the neighbor-budget wiring gap above, the
  registry change and the matching `orchestration.ts` read-site convention fix were made together
  in the same commit, with a regression test confirming the rule activates under a genuinely-omitted
  ablation config. The mechanism itself remains a strict no-op without a finite `nodeBudget`
  (`mainLoopLateReserveEligible` requires `earlyTierNodeBudget !== Infinity`), so this changed no
  interactive Play/Editor/Review solve behavior — only offline batch tooling that sets a node budget.

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

## 2026-08-12 neighbor-budget promotion, and a wiring gap it exposed

Promoted to default-on (see "Already promoted/default-on items"). While investigating an unrelated
worker-count solve-outcome sensitivity report, a corpus-scale comparison between two CI runs that
were believed to differ only by `--workers` turned out to actually differ by this flag: one run
explicitly passed `--enable-flags=PRUNE_MC_NEIGHBOR_BUDGET`, the other left `enable_flags` blank
and (incorrectly) assumed the recent registry-only promotion meant the flag would default on. It
didn't — `normalizeAblationConfig(undefined)` returns `null` before ever consulting
`OPT_IN_FEATURES`, and `prune-gauntlet.ts`'s read site was still gated the opt-in way. That run's
617/1700 (vs. the other's 665/1700) is best read as a near-exact re-measurement of the 611→665 gap
above, not a worker-count effect. Both interactive production callers (`solver-controller.ts`,
`review-controller.ts`) also never set `.ablation`, so the promotion had zero real-world effect
anywhere until the read-site convention was fixed alongside this note. Full account:
`reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`.

**Lesson for any future promotion**: removing a flag from `OPT_IN_FEATURES` is necessary but not
sufficient. The flag's own read site(s) must also be checked/changed from the opt-in convention
(`cfg && cfg.FLAG === true`) to the standard convention (`!cfg || cfg.FLAG`) — search for the
flag's name across `modules/solver/*.ts` and confirm every read site uses the convention matching
its new `OPT_IN_FEATURES` membership before considering a promotion complete.

## 2026-08-12 main-loop late-reserve full-population A/B and promotion

Result: **frozen 4-arm level-blind A/B, all `workers=1`, `deterministic=true`**. Corpus-2 solved
control 617 → 0.05: 687 (+70) → 0.10: 692 (+5) → 0.15: 694 (+2); Corpus-1 saturating at 94/102 from
0.05 onward. Aggregate nodes/work decreased monotonically across all four arms despite more levels
solving — 0.15 is a strict win on every measured axis with no reversal. Full table and discussion:
`reports/2026-08-12-main-loop-late-reserve-population-ab.md`.

This promotion was made **after** the neighbor-budget wiring-gap lesson above had already surfaced,
so the `orchestration.ts` read site (`mainLoopLateReserveEnabled`) was converted from the opt-in
convention to the standard convention in the same commit as the `OPT_IN_FEATURES` removal, with a
regression test confirming the rule activates through the real `normalizeAblationConfig(undefined)`
path (given a finite `nodeBudget`) rather than relying on a `solver:bench`-style check — `solver:bench`
never sets a `nodeBudget`, so it cannot exercise this particular mechanism regardless of the read-site
convention, and would have passed identically whether or not the wiring gap existed.

**Caveat carried over from the neighbor-budget investigation**: the A/B's control arm left
`enable_flags` blank (so its ablation config was `null` throughout, correctly yielding the flag OFF
by construction regardless of the read-site convention) while all three treatment arms explicitly
passed `enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE` (so the flag was genuinely ON in each,
independent of the read-site bug). The A/B's own result is therefore unaffected by the wiring gap —
only the *subsequent* promotion (making the flag apply to callers that omit `.ablation` entirely)
depended on fixing the read site, which was done here rather than deferred.
