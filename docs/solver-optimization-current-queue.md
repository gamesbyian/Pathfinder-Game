# Solver optimization: current priority queue

> **Status:** canonical live entry point for tuning and optimizing existing solver techniques.
> **Last reconciled:** 2026-08-15, through the full-corpus lifecycle failure map, the matched 36M/50M capability pair, ETT-028 family-boundary analysis, flipping-filter CP-SAT support, and the latest repair-retreat probes.
> **Scope:** improve cold, level-blind solve count or reduce machine-independent work without losing solved levels. Exact-level history may label research data but may not control a production solve.

This page answers **what optimization work is most worth doing now**. Detailed evidence, experiment history, and compatibility anchors remain in [Solver future work](future-work.md); experiment dispositions remain in the [opt-in experiment ledger](solver-opt-in-experiment-ledger.md). Those longer records are evidence stores, not competing priority lists.

## Why optimization remains a first-class opportunity

The current 50M reference solves **731/1700 Corpus-2** and **94/102 Corpus-1** levels. A matched 36M arm solved only **684/1700 Corpus-2**, losing 47 solves while Corpus 1 stayed unchanged. More importantly, the 50M lifecycle map classifies **863/969 (89.1%) unsolved Corpus-2 levels as starved**, **106 as capped**, and **zero as exhausted**.

That does not prove that any particular late technique will solve those levels. It does establish that the current ceiling is still allocation-bound: the ladder usually spends the shared pool before every mechanically eligible technique receives a meaningful search. In particular:

- repair fallback is node-starved on **515/603** eligible unsolved Corpus-2 levels;
- attraction diversity is node-starved on **863/969** unsolved Corpus-2 levels;
- 515 levels starve both;
- 109 of 731 Corpus-2 solves use more than half the 50M budget, including 62 above 75% and 13 above 90%.

The practical implication is not “raise every cap” or “reserve a fixed slice for every late tier.” Both have expensive failure modes. The high-value question is how to route a fixed budget using mechanics and evidence produced by the **current invocation**.

## Ranked queue

| Priority | Opportunity | Next decision-bearing step | Success signal |
|---:|---|---|---|
| 1 | Failure-conditioned late-tier allocation | Design a state-informed, equal-total-budget treatment that gives repair fallback and/or attraction diversity nonzero work only when earlier-tier evidence predicts low marginal value; run matched full-ladder A/B on Corpus 1 and 2. | Net level-blind solve gain with no material regression and acceptable work; report reached/starved mass by technique, not only totals. |
| 2 | Beam score/retention at proven extinction boundaries | **Re-run done (2026-08-15, run `31858783552`): 25 live / 4 dead / 3 abstain, 0 alarms — 2 new R00001-pattern instances, both D-class (`S00030`, `S00048`).** Next: assemble the held-out, family-namespaced K-vs-2K test scoped to A-class *and* D-class (not A-class only). | Recurrent exact-live/exact-dead separation across unrelated parents; a scorer change must beat widening at equal work. |
| 3 | Canonical-inclusive family-boundary retest | **Canonical-only half done (2026-08-15): 5/8 solve cleanly on current main (not failures at all); only `R00156`, `R02248`, `R02960` are genuine `node-budget-reached` failures.** Next: cold-run those 3 parents' nominated siblings only, at the same frozen protocol, then replay/ablate around any reproduced disagreement. | Reproduced, parent-clustered solver boundary that identifies a generic technique or representation change. |
| 4 | CP-SAT-anchored deep repair editing | Use verified feasible/infeasible retreat boundaries and the existing retreat-file mode to classify real repair prefixes; prototype bounded rollback/rebuild only after the label recurs. | A state feature predicts required retreat depth, followed by equal-budget full-ladder gains. |
| 5 | State-conditioned must-cross anchoring | Add a read-only prefix diagnostic for target/defer/second-approach decisions using live slack, axis/visit state, reachability, and competing obligations. | The distinction repeats across unrelated levels or held-out parent families before any production scoring change. |
| 6 | Mechanics-conditioned technique routing | Confirm the observed block-density split between admissible-order and repair winners and measure its interaction with repair eligibility and admissible reserve. | A mechanics-only rule improves a matched population A/B; no exact-level winner lookup. |

These lanes are deliberately small-to-medium until a repeated signal justifies a full population run. Priority 1 is the main production-facing optimization question; priorities 2–6 build better routing or search representations rather than spending more blindly.

## How to execute the queue

### 1. Failure-conditioned late-tier allocation

Start from the full lifecycle artifact, not a hand-picked list of failures. Build cohorts from fields available during the solve: technique eligibility, actual work received, termination reason, recent improvement rate, repair best-badness trajectory, unique-state growth, beam extinction/retention summaries, and remaining budget. Historical hints, prior winning configurations, saved solve status, and permanent level IDs are labels only.

A useful first treatment should be narrow:

1. keep the total node/work budget and main config count fixed;
2. define one transparent trigger from current-invocation evidence;
3. transfer work to **one** starved late tier, rather than simultaneously changing the whole ladder;
4. record lifecycle telemetry in both arms;
5. evaluate Corpus 1 and Corpus 2 together from the first population gate.

Do not interpret the lifecycle map as support for the old unconditional reserve mechanisms. The static repair-fallback reserve produced no fallback wins on its tested population, and naive late-reserve changes have caused regressions. The remaining hypothesis is conditional routing, not a renamed fixed carve-out.

### 2. Beam score and representation

Existing lineage work says generic widening is a weak lead: some winning families disappear because the score ranks an exact-dead child above an exact-live sibling. Flipping-filter support removed the main abstention blocker for nine B/D cases.

**Re-run complete (2026-08-15).** All 32 cases from `winning-lineage-extinction-adjacent-cases-2026-08-12.json` re-ran through `cpsat-explicit-prefix-oracle.yml` (run [`31858783552`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/31858783552)): 25 live / 4 dead / 3 abstain (up from 9/2/21), 0 correctness/input alarms, 0 remaining `unsupported-mechanics` abstentions. The label pattern reproduced twice more — `S00030` and `S00048`, both D-class (width-saturation) — bringing confirmed R00001-pattern instances to 4 (previously A-class-only: `S00001`, `R00104`). Full table: [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md#follow-up-2026-08-15-the-9-abstained-rows-re-run-flipping-filters-now-supported).

Next: assemble a held-out, family-namespaced set of roughly 8–12 extinction boundaries **spanning both A-class and D-class** (not A-class only, now that D-class has confirmed evidence) and compare K versus 2K at equal surrounding policy. Collect descriptor values for both live and dead siblings. Promote a score feature only if it separates feasibility across unrelated parent families and survives a full-ladder matched-budget test. Do not infer a global width increase from a few local rescues.

### 3. Canonical-inclusive family-boundary retest

ETT-028 repaired the identity/source-selection problem and produced an 886-edge, 51-parent, 123-family view with zero missing variant rows. Historical baselines contain no canonical parent outcomes, so it supports **nomination**, not rescue or robustness claims.

The current cold-test cohort is: **R02795, R00156, R02248, R02960, R00548, R01465, R02239, and R02452**. Treat parents as the independent units. Use sibling disagreements to find representation-sensitive failures, then connect a reproduced boundary to beam ranking, technique reach, or repair behavior. Do not count sibling rows as independent solver wins.

**Canonical-only cold-solve done (2026-08-15).** Production protocol (50M nodes, 1 worker, commit `4efc2d1`, same commit as the 36M/50M budget pair with zero solver-code drift verified): `R00548`, `R01465`, `R02239`, `R02452`, `R02795` all solve cleanly, well under budget — not canonical failures at all. Only `R00156`, `R02248`, `R02960` hit `node-budget-reached` at the full 50M ceiling. Full table: [variant corpus research plan](variant-corpus-solver-research-plan.md#canonical-only-cold-retest-all-eight-parents-2026-08-15). This narrows the sibling half of the gate to those 3 parents only — comparing a solved canonical parent against its siblings isn't the symmetry-pathology question this lane exists to answer.

### 4. Repair depth and operators

The blind rollout-escape proxy is closed: elite-specific noise overwhelmed the hoped-for level-level signal. CP-SAT-verified prefixes are therefore a necessary label source, not optional overhead. The latest boundary work gives concrete anchors: **R00630** has a feasible depth at 36 and infeasible at 37; **R02449** is referee-verified feasible at 19 and infeasible at 37, with the middle transition still unresolved.

Use the existing CP-SAT retreat-file mode to resolve and expand such boundaries. Only then test a bounded deep prefix edit or rollback/rebuild operator. Do not retry extra flat repair nodes, adaptive shrink recovery, blind rollout population scaling, plateau penalty, soft recombination, exact relinking, or turn bias unchanged.

### 5. Must-cross anchors

The unconditional `must-cross-horizon` pass contributed zero solves and was removed. The remaining idea is narrower and still open: choose or defer the next must-cross landmark from the live state, and switch guidance to the perpendicular second-crossing approach when appropriate. Saved hint orders may score the diagnostic offline but may not pick the live anchor.

Start in shadow/read-only mode. Compare decisions against `mustCrossFirst`, `intersectionHarvest`, and default scoring at selected prefixes. See [the precise open/closed boundary](solver-heuristic-capability-gap-analysis.md#state-conditioned-must-cross-anchoring-open-unconditional-form-closed).

### 6. Technique routing from mechanics

Existing solve data shows a real observational split: admissible-order winners have higher block density than repair winners, including within the `mustCross=0` subset. This is useful because board mechanics are legal level-blind inputs. It is not yet causal.

The next test should cross block-density strata with repair eligibility and admissible-order reach/reserve, predeclare the rule, and run an equal-budget full-ladder A/B. Keep the rule generic and mechanics-derived; never encode the historically winning technique for an exact level.

## Supporting measurement, not the first policy change

A matched ceiling above 50M would measure remaining budget elasticity. The 36M→50M comparison proves that more budget still buys solves, but not whether the marginal rate persists past 50M. Run this only when remote capacity is available and preferably after the allocation treatment is fixed, so a larger ceiling does not conceal an avoidable scheduling defect.

## Promotion contract

Every production-facing treatment must:

- obey [solver level-blindness](solver-level-blindness.md);
- freeze the protocol at a persistent commit before execution;
- compare at equal total node/work budget with a non-binding wall deadline;
- use machine-independent `workSpent` alongside solve count and nodes;
- report paired gains, losses, technique reach/starvation, errors, and deadline truncation;
- include Corpus 1 and Corpus 2, plus a published transfer slice when appropriate;
- distinguish exploratory diagnostics from decision-bearing population evidence;
- update this queue, [future work](future-work.md), and the [experiment ledger](solver-opt-in-experiment-ledger.md) with the resulting disposition.

## Closed forms that must stay visible

Do not repeat unchanged: universal beam widening; the unconditional must-cross horizon; static repair-fallback reserve; blind late-tier carve-outs; repair-probe badness-gate tuning; adaptive-shrink recovery; the CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; turn bias; admissible-order LDS; and the broad cold-start portfolio scheduler.

A nearby idea may remain open when it changes the information boundary—for example, current-invocation conditional allocation remains open even though static reserves are closed. State the distinction explicitly in every new protocol.

## Evidence map

- [Solver future work](future-work.md): detailed current evidence, historical dispositions, and closed list.
- [Existing-technique tuning campaign](../reports/2026-08-13-existing-technique-tuning-experimental-campaign.md): ETT-001–028 methods, results, and audit limits.
- [ETT-028 family-boundary report](../reports/experiments/2026-08-13-technique-tuning/ett-028-family-boundary.md): source-selected family nominations.
- [Variant corpus research plan](variant-corpus-solver-research-plan.md): family experiment rules and canonical transfer gates.
- [Beam lineage survival analysis](winning-lineage-survival-analysis.md) and [heuristic capability gaps](solver-heuristic-capability-gap-analysis.md): representation and must-cross hypotheses.
- [Repair retreat evidence](../reports/2026-08-12-repair-retreat-cpsat.md) and [negative rollout proxy](../reports/2026-08-15-repair-plateau-rollout-proxy-negative.md): exact-prefix boundary and rejected shortcut.
- [Research operating model](solver-research-operating-model.md): how observations become shadow tests, A/Bs, and promotion decisions.
