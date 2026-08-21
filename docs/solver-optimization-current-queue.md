# Solver optimization: current priority queue

> **Status:** canonical live entry point for tuning and optimizing existing solver techniques.
> **Last reconciled:** 2026-08-21, through PR #1399 (completed the work-accounting/concurrency/proxy/telemetry fixes PR #1398 only started) and the `STRATEGY_REPAIR_LATE_PROBE` promotion that followed it.
> **Scope:** improve cold, level-blind solve count or reduce machine-independent work without losing solved levels. Exact-level history may label research data but may not control a production solve.

This page answers **what solver work is live now**. It is intentionally compact. Detailed experiment chronology is preserved in dated reports and two same-directory queue snapshots:

- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md): the queue before the final 2026-08-20 regression/provenance work;
- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md): the exact queue merged by PR #1398, including its full late-session chronology.

Use [`future-work.md`](future-work.md) for broader deferred/reopen ideas, [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) for retained default-off mechanisms, and [`solver-research-operating-model.md`](solver-research-operating-model.md) for research method. Those are not competing queues.

## Current evidence reset

The 2026-08-20 technique census gave each technique its own 50,000,000-node budget over 879 then-unsolved Corpus-2 levels. Its main results remain useful:

- at least one isolated technique solved **246/879** levels;
- **111** oracle-union solves occurred within 1,000,000 nodes;
- plain repair solved **119/879** and hit its isolated 50M cap without solving on **750/879**;
- repair-family variants contributed far more unique capability than admissible-order variants.

That evidence separates several failure classes that must not be collapsed into “starvation”:

1. **routing:** a capable technique is not offered to the level;
2. **search quality:** a technique is tried with substantial/full budget and still fails;
3. **representation/retention:** viable search material is generated but lost through score, deduplication, width, or related policy;
4. **regression:** a genuinely comparable production solve used to succeed and no longer does;
5. **provenance/instrumentation:** the stored evidence does not actually establish the comparison being claimed.

The first beam-routing expansion produced a population result of **+20 net Corpus-2 solves (828→848; 21 gained / 1 understood loss)**. A follow-up perimeter-beam expansion recovered all 29 of its newly routed local targets (population confirmation still pending — see Priority 7). `STRATEGY_REPAIR_LATE_PROBE` recovered 20 of 94 locally targeted gate-excluded repair winners, was confirmed at population scale (GHA run 32418694112, Corpus-2 828 → 868, **+20 gained / 0 lost**), and was **promoted to production default-ON 2026-08-20/21** — see [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).

**Current-HEAD accounting status (resolved 2026-08-21):** PR #1398 started, and PR #1399 completed, a set of fixes to solver work accounting, concurrent solve-state isolation, retry-tier flag proxying, adaptive gate weighting, lifecycle telemetry, and repair/late-probe budget handling (`prep._workCap` staleness, an ablated-`repairConfigs` eligibility gate equivalence bug). Population counts recorded **before** PR #1399 landed are evidence about their recorded commits, not current HEAD, and any *new* promotion or population delta that depends on these paths should obtain a fresh matched current-HEAD baseline. The one exception already checked: `STRATEGY_REPAIR_LATE_PROBE`'s own confirming GHA run (32418694112) predates PR #1399, but its dispatch config (a generous 24h non-binding deadline, 50,000,000-node cap, no `STRATEGY_REPAIR_FALLBACK` ablation) means neither fix could have altered that specific run's outcome — see the ledger entry for the full reasoning.

## Ranked queue

Stable priority numbers are retained so reports can cite them. A CLOSED or gate-complete row is a disposition, not active work.

| Priority | Opportunity | State | Next decision-bearing step |
|---:|---|---|---|
| 0 | Regression/provenance re-derivation | **ACTIVE / EVIDENCE REPAIR** | Make provenance distinguish full-ladder production solves from isolated-technique tooling and account for force-enabled default-OFF experiments; then re-derive the residual regression population before building any recovery mechanism. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED 2026-08-20** | None in the original form. Plain repair mostly fails even with a full isolated 50M-node budget. A repair search-quality change is a separate question. |
| 2 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Run held-out, family-namespaced K-vs-2K/descriptor tests across confirmed extinction cases at equal surrounding policy. |
| 3 | Canonical-inclusive family-boundary retest | **GATE COMPLETE 2026-08-15** | Use reproduced family boundaries only to nominate mechanism-specific work; do not rerun the gate unchanged. |
| 4 | CP-SAT-anchored deep repair editing | **ACTIVE RESEARCH** | Expand exact feasible/infeasible retreat boundaries; prototype deeper rollback/rebuild only after retreat depth is predictably state-conditioned. |
| 5 | State-conditioned must-cross anchoring | **ACTIVE RESEARCH** | Continue read-only prefix diagnostics; require repeated separation across unrelated levels/families before changing scoring. |
| 6 | Mechanics-conditioned admissible-order routing | **CLOSED NEGATIVE 2026-08-20** | None. The isolated census found too little unique admissible-order capability to justify a meaningful reserve. |
| 7 | Cheap isolated-technique wins the ladder does not route to | **ACTIVE / SHIPPING GATE** | `STRATEGY_REPAIR_LATE_PROBE` promoted 2026-08-20/21 (population-confirmed +20/0). Reconfirm the perimeter-beam expansion on current HEAD; investigate remaining high-intersection/must-cross-heavy beam gaps per archetype rather than adding broad configs indiscriminately. |

## 0. Regression and provenance integrity

The late 2026-08-20 regression investigation materially changed the population it was studying.

What is now established:

- four beam-only losses were independently bisected to `dd001dd5c`, the beam-dedup key-width correctness fix; they are accepted search-order collateral, not a reason to restore the broken key;
- `R02516` is also closed as explained: three individually sound must-cross forced-structure prunes (`PRUNE_MC_RESERVED_WALL`, `PRUNE_MC_FORCED_NEIGHBOR`, `PRUNE_MC_FORCED_FIRST_MOVE`) jointly remove its former winning branch;
- `R00632` was a false positive because its stored historical win used `STRATEGY_REPAIR_TURN_BIAS`, which is default-OFF and not reachable by the normal production ladder;
- `R02900` exposed a broader provenance ambiguity: `classifyProvenanceSource` treats a solver ID as “production-solver” without proving the call came through the full `solveLevel()` ladder. At its historically recorded-good commit, a real default `Solver.solve(level,{})` still failed after hundreds of millions of nodes, making the recorded small isolated repair win unsuitable as regression evidence;
- `R03205` and `R03329` may share that attribution problem but were not individually settled in the recorded work;
- `R02424` and `R01229` remain plausible beam residuals and also match the corrected beam-key-width signature, but that explanation was not independently bisected for them.

Therefore the next action is **not** “root-cause the four repair regressions.” That category is no longer trustworthy. First repair the evidence contract so a historical find records enough invocation context to distinguish full production ladder, isolated technique tooling, and force-enabled experimental flags. Then re-mine.

Full chronology: [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md).

## 1. Failure-conditioned late-tier allocation

**Closed as originally framed.** The technique census showed that giving plain repair the entire isolated 50M budget still leaves 750/879 levels capped and unsolved. Historical ladder starvation is real telemetry, but it does not imply that more of the same repair search will solve the level.

Route future repair work toward search quality, operators, representation, or genuine routing gaps rather than another flat reserve.

## 2. Beam score and representation

Exact-prefix work has repeatedly found cases where higher-ranked material is exact-dead while lower-ranked material remains exact-live. This supports a representation/retention question, not universal beam widening.

Use family-separated held-out cases and compare at equal work. Candidate changes should demonstrate repeated feasibility separation across unrelated parent families rather than winning on one fragile level.

## 3. Family-boundary gate

**Complete.** Controlled canonical/sibling comparisons remain useful diagnostics, but the original gate does not need repeating. The much larger off-main variant trove is documented in [`variant-level-research.md`](variant-level-research.md); use it as a research population, not as production rotate/retry behavior.

## 4. Repair depth and operators

Blind rollout/escape proxies are closed. The useful evidence is exact CP-SAT-backed retreat feasibility. Expand those labels before engineering a genuinely deeper prefix-edit operator.

## 5. State-conditioned must-cross anchoring

The unconditional attraction form is closed. The narrower open question uses live prefix state to decide target/defer/second-approach behavior. Start with diagnostics and require cross-level/family recurrence before production scoring changes.

## 6. Admissible-order routing

**Closed negative for the measured reserve/density forms.** Across the isolated census, all `ida:*` variants together contributed only a very small unique-solve population compared with repair and beam. Do not spend meaningful ladder reserve chasing that measured population without new capability evidence.

## 7. Unrouted cheap capability

This remains the strongest production-facing opportunity from the census, but it now has two different shapes.

**Shipping/confirmation work:**

- the first beam-routing expansion already population-confirmed +20 net solves;
- the follow-up perimeter-beam expansion recovered all 29 local newly routed targets but needs a decision-bearing population result on a current, correctly-accounted baseline;
- `STRATEGY_REPAIR_LATE_PROBE` was **promoted to production default-ON 2026-08-20/21**: population-confirmed via GHA run 32418694112, Corpus-2 828 → 868 (+20 gained / 0 lost). The `prep._workCap` staleness and ablated-`repairConfigs` eligibility fixes that directly touch this path landed in PR #1399 after that run; they were checked and found unable to change its outcome (see [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) for the full reasoning), so the evidence stands without needing a rerun.

**Next research population:** remaining cheap unrouted beam wins are concentrated in high-intersection-burden and must-cross-heavy levels spread across several existing archetype rules. Those rules already have calibrated beam choices; no one missing config covers more than a handful. Treat this as a fresh per-rule routing investigation, not another broad “append every useful beam config” pass.

## Promotion contract

Every production-facing treatment must:

- obey [`solver-level-blindness.md`](solver-level-blindness.md);
- freeze the protocol and persistent commit before execution;
- use non-binding wall deadlines when deterministic budget comparison matters;
- compare machine-independent `workSpent` alongside nodes and solve count;
- report paired gains, losses, technique reach, errors, and deadline truncation;
- include Corpus 1 and Corpus 2 plus published transfer/cost evidence where appropriate;
- distinguish exploratory diagnostics from decision-bearing population evidence;
- update this queue and the relevant ledger/report when disposition changes.

## Closed forms that must stay visible

Do not repeat unchanged: universal beam widening; unconditional must-cross attraction/horizon; static repair-fallback reserve; blind late-tier carve-outs; plain extra repair budget for plateaued repair; main-loop-badness-gated allocation; adaptive-shrink recovery; CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; repair turn bias; admissible-order LDS; admissible-order density/profile reserve; and the broad cold-start portfolio scheduler.

A nearby idea is new only when its mechanism or information boundary materially changes. State that distinction explicitly.

## Evidence map

- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md): exact latest-main queue before this compaction; strongest source for the late regression/provenance chronology and routing notes.
- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md): earlier 2026-08-20 queue chronology.
- [`../reports/2026-08-20-technique-census-reconciliation.md`](../reports/2026-08-20-technique-census-reconciliation.md): population census reconciliation.
- [`../reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/): generated census artifacts.
- [`../reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): regression/beam threshold history.
- [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md): lineage observation contract.
- [`../reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md): exact repair-retreat evidence.
- [`variant-level-research.md`](variant-level-research.md): family/variant trove and research discipline.
- [`solver-research-operating-model.md`](solver-research-operating-model.md): research method and evidence routing.
