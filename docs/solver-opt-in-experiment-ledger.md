# Solver opt-in experiment disposition ledger

This is the authoritative disposition ledger for solver mechanisms that remain production-default-OFF or are otherwise explicitly invokable for experiments. `docs/future-work.md` is the broader priority queue; this file answers: **does this existing mechanism still have a promotion decision outstanding?**

Capability decisions must obey [`solver-level-blindness.md`](solver-level-blindness.md). Exact-level history may be used for replay/research, but never to produce a headline capability verdict.

Last reconciled: **2026-08-13**, after promoting `PRUNE_MC_NEIGHBOR_BUDGET`, `STRATEGY_MAIN_LOOP_LATE_RESERVE` (both 2026-08-12), and `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` (2026-08-13) — see "Already promoted/default-on items" and the disposition notes below.

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
- `STRATEGY_MAIN_LOOP_LATE_RESERVE`: promoted to default-on at fraction `0.15` 2026-08-12 — see
  `reports/2026-08-12-main-loop-late-reserve-population-ab.md` and the disposition note below.
  Learning directly from the neighbor-budget wiring gap above, the registry change and the matching
  `orchestration.ts` read-site convention fix were made together in the same commit, with a
  regression test confirming the rule activates under a genuinely-omitted ablation config. The
  mechanism itself remains a strict no-op without a finite `nodeBudget`
  (`mainLoopLateReserveEligible` requires `earlyTierNodeBudget !== Infinity`), so this changed no
  interactive Play/Editor/Review solve behavior — only offline batch tooling that sets a node budget.
  **The frozen A/B's control-vs-treatment comparison was found confounded after the fact** — see
  the disposition note below for the mechanism. Kept promoted rather than reverted; a single full
  corpus-1+corpus-2 sweep with everything correctly default-on is the follow-up evidence (not a
  matched-control A/B). **That sweep came back at 635/1700, lower than expected; the mechanism
  first suspected (the repair probe eating into this flag's own reserved slice) was traced against
  the actual code and found FALSE — the reserve is carved out and protected before the probe ever
  runs. A related but distinct real mechanism (the probe and the pre-reserve "early" main-loop
  configs sharing one unprotected pool) was found and given a pilot fix,
  `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` (own entry below) — see
  `reports/2026-08-12-repair-probe-early-main-loop-starvation.md`.**
- `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`: promoted to production default-ON 2026-08-13.
  Registry change (`scripts/ablation-config.mjs`) and the `orchestration.ts` read-site convention
  fix (opt-in `cfg && cfg.FLAG === true` → standard `!cfg || cfg.FLAG`) landed together in the same
  commit, learning directly from the wiring-gap lesson both entries above already document, with
  three regression tests (`modules/solver/orchestration.test.ts`) confirming: (1) the mechanism
  activates under a genuinely-omitted ablation config specifically, not just an explicit
  `{ FLAG: true }` object; (2) it correctly leaves the biased tier's budget untouched when live
  evidence already looks promising; (3) an explicit `{ FLAG: false }` still fully disables it.
  **Evidence at promotion time: a local n=12 pilot (net +1, 1 gained / 0 lost) plus a 300-level
  stratified level-blind GHA A/B at the real 50,000,000-node production budget (250 of the 512
  eligible levels + 50 control) — control 108/300, treatment 109/300, net +1 (1 gained: `R02719`,
  0 lost), nodes -1.5%, work -9.0%.** Promoted on the project owner's explicit direction; this is a
  **deliberate deviation from this ledger's usual bar** (a dedicated full-population Corpus-2 A/B)
  — 300/1700 stratified is strong supporting evidence, not the full-population result the bar
  normally requires, and is recorded as such rather than glossed over. `solver:bench --check`
  (published 160-level corpus) is byte-identical (0 levels there are eligible: none are both
  repair-gated and carry a must-turn cell), so this promotion has zero effect on any interactive
  Play/Editor/Review solve today; it only changes offline batch-tooling behavior on levels that set
  a finite `nodeBudget` and happen to be eligible. See
  `reports/2026-08-12-repair-probe-early-main-loop-starvation.md` for the full record, including the
  `BADNESS_GATE`/`MIN_SCALE` constants' own re-calibration caveat (still derived from the original
  n=12, not re-derived at the larger sample size).

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

## 2026-08-12 main-loop late-reserve full-population A/B: run, found confounded, promoted anyway pending a direct sweep

The frozen 4-arm level-blind A/B ran (all `workers=1`, `deterministic=true`): Corpus-2 solved
control 617 → 0.05: 687 (+70) → 0.10: 692 (+5) → 0.15: 694 (+2); Corpus-1 saturating at 94/102 from
0.05 onward; aggregate nodes/work decreasing monotonically across all four arms despite more levels
solving. `orchestration.ts`'s read site (`mainLoopLateReserveEnabled`) was converted from the
opt-in convention to the standard convention in the same commit as the `OPT_IN_FEATURES` removal,
learning directly from the neighbor-budget wiring-gap lesson above.

**The control-vs-treatment comparison was found confounded**, discovered while merging this work
with the neighbor-budget wiring-gap fix. The control arm left `enable_flags` blank, so
`ablation=null` throughout — at that point in the branch's history, `PRUNE_MC_NEIGHBOR_BUDGET`'s
own read site (in `prune-gauntlet.ts`) was *still* gated the opt-in way (unfixed on this branch
until the same-day merge from `origin/main`), so `cfg=null` made it read OFF. Every treatment arm,
by contrast, passed `enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE`, producing a **non-null** sparse
ablation object — and `normalizeAblationConfig`'s `Proxy` resolves any *unset* key to
`!OPT_IN_FEATURES.has(key)`, which was already `true` for `PRUNE_MC_NEIGHBOR_BUDGET` (removed from
that set earlier the same session). So the control arm had `PRUNE_MC_NEIGHBOR_BUDGET` off while
every treatment arm had it on, purely as a side effect of passing any non-null ablation object —
mixing a large, unknown-exact-size share of that flag's own already-known +54 Corpus-2 effect into
the 617-vs-687/692/694 gap. Full mechanism: `reports/2026-08-12-main-loop-late-reserve-population-ab.md`.

**What survives**: the 687→692→694 treatment-vs-treatment trend is *not* confounded
(`PRUNE_MC_NEIGHBOR_BUDGET` was constant ON across all three treatment arms), so the monotonic,
diminishing-returns shape as the reserve fraction grows is real evidence the mechanism has *some*
positive effect. The earlier mechanism pilot's narrower finding (1/14 hard historical matches
recovered) is unaffected.

**Decision**: kept the flag promoted (did not revert to opt-in) — the read-site fix stands on its
own merits regardless of the confound, and the treatment-vs-treatment trend plus the mechanism
pilot still support a real effect. Rather than a matched-control re-run, the chosen follow-up was a
single full corpus-1+corpus-2 sweep with everything correctly default-on (both flags' read sites
fixed, genuinely blank `enable_flags`).

**Sweep result (run #38, id `31630124558`, commit `ba5630978`): Corpus-1 95/102, Corpus-2
635/1700.** Lower than expected — lower than both the confounded 0.15 treatment (694) and the
original neighbor-budget-only run (665, at `workers=2`). The commit diff between the confounded
0.15 run and this sweep is not purely ablation-registry bookkeeping: it also includes `2bfefc660`
("Fix runRepairProbe's wall-clock trip-wire silently binding under CPU contention," merged same
day from `origin/main`), which intentionally lets a contended repair-probe attempt spend its full
intended node budget instead of being silently truncated early. Under
`level-blind-capability-sweep.mjs`'s hard cumulative `nodeBudget` ceiling, that means less of a
level's shared budget survives to reach later tiers (including this flag's own reserved slice) —
plausible, not confirmed, and specific to Corpus-2's tighter per-level budget (Corpus-1, with a
more generous budget, ticked up slightly instead: 94→95). Full analysis:
`reports/2026-08-12-main-loop-late-reserve-population-ab.md`'s "Follow-up" section. Not yet
resolved whether 635 is a stable production-capability figure or an artifact of budget-allocation
timing between three separately-justified, same-day changes landing together.

**Lesson, distinct from the read-site lesson above**: even after both halves of *one* flag's
promotion are correctly wired, a batch tool that constructs a sparse `--enable-flags` ablation
object can silently change *other* flags' effective state too, whenever those other flags' registry
membership has changed but their own read sites haven't been fixed yet. Any A/B run during a window
when another flag's promotion is only half-done is at risk of exactly this cross-contamination.
