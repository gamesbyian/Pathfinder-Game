# Solver optimization: current priority queue

> **Status:** canonical live entry point for optimizing existing solver techniques.
> **Reconciled:** 2026-08-21 through solver-authority consolidation and `STRATEGY_REPAIR_LATE_PROBE` promotion.
> **Scope:** improve cold, level-blind solve count or machine-independent work without losing solves. Exact-level history may label research, never control production solves.

Chronology: [`archive/snapshots/solver-optimization-current-queue-2026-08-20.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20.md), [`archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md). Deferred ideas: [`solver-future-work.md`](solver-future-work.md). Default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Method: [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Evidence reset

2026-08-20 technique census: each technique got 50M nodes over 879 then-unsolved Corpus-2 levels.

- isolated-technique union **246/879**; **111** within 1M nodes;
- plain repair **119/879**, with **750/879** exhausting 50M unsolved;
- repair-family variants had much more unique capability than admissible-order variants.

Failure classes: **routing** (capable technique gets too little relevant work); **search quality** (full/substantial budget still fails); **representation/retention** (viable material generated then lost); **regression** (comparable production solve lost); **provenance/instrumentation** (evidence cannot establish the comparison).

Beam routing produced **+20 net Corpus-2 (828→848; 21 gained / 1 understood loss)**; a perimeter-beam follow-up recovered all 29 newly routed local targets. `STRATEGY_REPAIR_LATE_PROBE` promoted default-ON 2026-08-21 after same-commit deterministic A/B (GHA 32453248184 vs 32459711208, `main@e5034e8c`): Corpus-1 **95→96**, Corpus-2 **863→881**, **+19 net**, zero regressions.

Recent fixes include work accounting/concurrent isolation, retry proxying, adaptive gate weighting, lifecycle telemetry, repair/late-probe budgeting, canonical attempt/result telemetry, stage identity, and stage/budget planning. Older counts belong to their recorded commits; rerun matched baselines when current code touches the measured path.

## Ranked queue

Priority numbers remain citeable; CLOSED/GATE COMPLETE rows are dispositions.

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Regression/provenance re-derivation | **EVIDENCE REPAIR COMPLETE 2026-08-21 (`c4569ef`); 73-ID node-budget population bisected/accepted 2026-08-22** | No open gate; re-open only if a new capability run surfaces an unexplained loss population. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED 2026-08-20** | Plain repair mostly fails even with isolated 50M; original form rejected. |
| 2 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Held-out family-namespaced K-vs-2K/descriptor tests at equal surrounding policy. |
| 3 | Canonical-inclusive family-boundary retest | **GATE COMPLETE 2026-08-15** | Use reproduced boundaries to nominate mechanisms; do not rerun unchanged. |
| 4 | CP-SAT-anchored deep repair editing | **ACTIVE RESEARCH** | Expand feasible/infeasible retreat boundaries; edit deeper only when depth becomes predictably state-conditioned. |
| 5 | State-conditioned must-cross anchoring | **ACTIVE RESEARCH** | Read-only prefix diagnostics; require recurrence across unrelated levels/families before scoring changes. |
| 6 | Mechanics-conditioned admissible-order routing | **CLOSED NEGATIVE 2026-08-20** | Too little unique isolated capability for meaningful reserve. |
| 7 | Cheap isolated-technique wins the ladder misses | **LATE PROBE PROMOTED 2026-08-21; ARCHETYPE-ROUTING FIXES VALIDATED + MERGED 2026-08-22 (`#1436`)** | 104/151 census gap levels (>2M isolated nodes) not yet mined; two must-cross diverse-beam gaps (`R02299`/`R02159`) still blocked on reserve-slot budget — see [`solver-future-work.md`](solver-future-work.md). |

## 0. Regression and provenance integrity

Late 2026-08-20 findings:

- four beam-only losses bisect to `dd001dd5c`, the beam-dedup key-width correctness fix; accept search-order collateral, do not restore broken identity;
- `R02516`: sound `PRUNE_MC_RESERVED_WALL`, `PRUNE_MC_FORCED_NEIGHBOR`, `PRUNE_MC_FORCED_FIRST_MOVE` jointly remove its old branch;
- `R00632`: false regression; stored win force-enabled default-OFF `STRATEGY_REPAIR_TURN_BIAS`;
- `R02900`: attribution bug; solver ID did not prove full `solveLevel()` ladder use, and default `Solver.solve(level,{})` at the recorded-good commit still failed after hundreds of millions of nodes;
- `R03205`: same artifact; fixed gate/forcing/seed and identical `nodesExpanded:6792911` across five commits match forced replay. At `86bdd133`, unconstrained `Solver.solve(level,{})` failed 3× at ~20M nodes;
- `R03329`: likewise non-regression; forced-replay repair signature plus isolated-census admissible-order wins;
- `R02424`, `R01229`: plausible residual beam losses matching corrected key-width behavior, not independently bisected.

Re-mine regressions under repaired stage/invocation telemetry before designing recovery for old aggregate categories.

**73-ID node-budget population, bisected 2026-08-22:** [`../reports/2026-08-22-corpus2-node-budget-losses.md`](../reports/2026-08-22-corpus2-node-budget-losses.md) lists 73 Corpus-2 IDs solved on capability run `32459711208` (commit `e5034e8c`) but node-budget-exhausted on `32526927206` (commit `ce4fc98a`, post solver-authority-consolidation). Worktree bisection against 20/73 IDs (5 "extreme margin" + a 15-ID spread sample) at reduced matched budget isolates the cause to `6f00baf` (the `buildDistMap` gates/geese/false-goal fix) — all 20 flip from solved to `node-budget-reached` at exactly that commit; `d21b4fb` (trap-search fix) and `0b2da5f` (LATE_PROBE promotion, also cleared directly via its own same-commit flag A/B) are not the cause. `6f00baf` is independently proven safe/beneficial on the published corpus (160/160 identical, nodes down 4.1%) and this population is itself net +17 on Corpus-2 (90 gained/73 lost) — same disposition as the `dd001dd5c` beam-dedup case: accept as sound search-order collateral from a correctness fix, do not revert. A genuine recovery would mean teaching `scoring.ts`'s move-ordering guidance to use `distMap` differently than `lower-bounds.ts`'s pruning does (tightening a bound is safety-monotonic; tightening a guidance heuristic is not) — logged in [`solver-future-work.md`](solver-future-work.md), not pursued as a quick fix. This population is separate from and not reconciled with the `R02516`/`R02900`/`R03205`/`R03329`/`R02424`/`R01229` items above.

Full chronology: [`archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md).

## 1. Failure-conditioned late-tier allocation

**Closed.** Full 50M isolated repair leaves 750/879 unsolved. Future repair work must change search quality/operators/representation or address demonstrated routing gaps, not merely add budget.

## 2. Beam score and representation

Exact-prefix work found higher-ranked exact-dead material while lower-ranked material stayed exact-live. Test retention/representation rather than universal width; use family-separated held-out cases at equal work and require recurrence across unrelated parents.

## 3. Family-boundary gate

**Complete.** Canonical/sibling comparisons remain diagnostic; do not repeat the gate unchanged. The off-main trove in [`variant-level-research.md`](variant-level-research.md) is research data, not production rotate/retry policy.

## 4. Repair depth and operators

Blind rollout/escape proxies are closed. Expand exact CP-SAT retreat-feasibility labels before deeper prefix editing.

## 5. State-conditioned must-cross anchoring

Unconditional attraction is closed. Open form: use live prefix state for target/defer/second-approach behavior; require cross-family recurrence before scoring changes.

## 6. Admissible-order routing

**Closed negative for measured reserve/density forms.** Isolated `ida:*` adds little unique capability vs repair/beam; reserve meaningful work only with new evidence.

## 7. Unrouted cheap capability

Confirmed: beam-routing **+20 net Corpus-2**; perimeter-beam recovered all 29 local targets; `STRATEGY_REPAIR_LATE_PROBE` promoted with **+19 net**, zero regressions. Remaining cheap beam wins span high-intersection and must-cross-heavy archetypes with no broadly covering config. Investigate rule-specific routing instead of appending generic beams.

**2026-08-22 archetype-routing fixes (branch `claude/corpus-regression-solve-count-c9ewdo`, commits `7ad7cd2e`/`53fe5f41`):** cross-referenced the 2026-08-20 census against the 2026-08-21 capability run (`32526927206`, 880/1700) to find 151 Corpus-2 levels an isolated T1 technique solves within budget that the production ladder still misses — 47 of them cheaply (≤2M isolated nodes). Traced through `getAttemptConfigs()` directly (not inferred): 46/47 were never offered the winning config at all, concentrated in `high-intersection-burden`'s four sub-rules (35) and `must-cross-heavy`'s (6); `portal-heavy` had zero gaps (already fully covered by earlier fixes). Added the missing configs as trailing, `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`-protected additions — same placement discipline as every prior beam-added-here fix in `attempts.ts` (leading placement measured +94% wall time on the published corpus in earlier work; never repeated).

- `high-intersection-burden` (all 4 sub-rules: near-Hamiltonian, very-high-reqInt ×2, medium-high-reqInt catch-all): added `beam:objectiveFirst@WIDE`/`intersectionHarvest@WIDE` and perimeter beams/DFS where missing. GHA-validated at production 50M node budget: **14/47 targeted gap levels recovered** (vs 6/47 at an earlier under-budgeted 10M test — the late-reserve fraction needs real budget headroom to pay off).
- `must-cross-heavy` (3 of 4 sub-rules: flipper-heavy, must-pass-heavy, default catch-all): added the missing perimeter beam/DFS direction each was missing relative to its siblings. Locally validated at 50M: **3/4 targeted gap levels recovered** (the 4th, R02162, needs 23.5M nodes even in isolation and still exhausts budget within the full ladder).
- Two must-cross gaps left open (diverse-WIDE-beam misses on the must-pass-heavy and default rules) — not threshold-gated, genuinely never offered, but both rules' reserve window is already fully spent on the validated perimeter fix; see [`solver-future-work.md`](solver-future-work.md).
- Regression check: `solver:bench --check` 160/160 published corpus, no regressions; a 40-level local sample of already-solving Corpus-2 levels found zero regressions (all 6 "unsolved-within-5M-test-budget" cases match levels already known to need 4.7M–70M nodes, not new slowdowns).
- **Validated: net Corpus-2 gain, zero regressions.** The originally-planned full-population A/B (control `32544545256` vs treatment `32544546461`, high-intersection-burden fix only) was superseded before its treatment arm started: built a general archetype-stratified sample-A/B workflow (`solver-archetype-sample-ab.yml` + `scripts/stress/select-archetype-sample.mjs`) instead of waiting on a second full-1700 sweep, cancelled the zero-progress pending treatment run, and cross-referenced the completed control run's full per-level Corpus-1/Corpus-2 results against a fast stratified-sample run (`32548927324`, HEAD `4960f3c7c`, both fixes together) covering all of Corpus 1 (102), a deterministic seeded sample of 300 archetype-eligible + 60 control (non-eligible-archetype) Corpus-2 levels, and all published levels — same seed, same 50M node budget, same deterministic/no-persist protocol as the control. Result over the 462 Corpus-1+Corpus-2-sample levels comparable to control: **7 gains, 0 losses** (`R02375`, `R02484`, `R02497`, `R02624`, `R02735`, `R02874`, `R03226`), 285 unchanged-solved, 170 unchanged-unsolved; the 60-level non-eligible-archetype control group had zero changes in either direction, confirming the routing change stayed scoped to the intended archetypes. Published-corpus sample (160/160) solved, consistent with `solver:bench --check`. Both fixes promoted from "targeted-validated" to production-confirmed; no full-1700 sweep required.

## Promotion contract

Production-facing treatments must obey [`solver-level-blindness.md`](solver-level-blindness.md); freeze protocol/commit; use non-binding deadlines for deterministic budget comparisons; compare `workSpent`, nodes, solves, paired gains/losses, technique reach, errors, deadline truncation; include Corpus 1/2 and published transfer/cost evidence where relevant; separate exploratory from decision-bearing evidence; update queue/ledger/report when disposition changes.

## Closed forms

Do not repeat unchanged: universal beam widening; unconditional must-cross attraction/horizon; static repair-fallback reserve; blind late-tier carve-outs; plain extra plateaued-repair budget; main-loop-badness allocation; adaptive-shrink recovery; CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; repair turn bias; admissible-order LDS; admissible-order density/profile reserve; broad cold-start portfolio scheduler.

A descendant is new only if mechanism or information boundary materially changes.

## Evidence map

- [`archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md): late regression/provenance chronology and routing notes.
- [`archive/snapshots/solver-optimization-current-queue-2026-08-20.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20.md): earlier chronology.
- [`../reports/2026-08-20-technique-census-reconciliation.md`](../reports/2026-08-20-technique-census-reconciliation.md), [`../reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/): census.
- [`../reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): regression/beam history.
- [`solver-winning-lineage-survival-analysis.md`](solver-winning-lineage-survival-analysis.md): lineage observation.
- [`../reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md): exact repair-retreat evidence.
- [`variant-level-research.md`](variant-level-research.md): family/variant research.
- [`solver-research-operating-model.md`](solver-research-operating-model.md): method/evidence routing.
