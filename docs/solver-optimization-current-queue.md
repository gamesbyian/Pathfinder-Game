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
| 7 | Cheap isolated-technique wins the ladder misses | **LATE PROBE PROMOTED 2026-08-21; ARCHETYPE-ROUTING FIXES MERGED 2026-08-22 (`#1436`); FOLLOW-UP MINING PASS LOCALLY VALIDATED 2026-08-22 (+3 Corpus-2: R02299/R02159/R02858)** | 55-row repair-family gate-widening gap (`portal-heavy` + parts of `high-intersection-burden`) and ~28 thin-coverage non-repair rows left open — see [`solver-future-work.md`](solver-future-work.md). |

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

**2026-08-22 follow-up mining pass (same branch, commit range after `#1436`/`#1440`):** re-derived the census gap population from the corrected technique census (`948bd40b`/PR #1440 fixed a false-positive duplicate-conflict bug in the dedup step; corpus-wide "unsolved at frozen baseline" moved 879->888, oracle union 246->253) cross-referenced against the pre-both-archetype-fix control run (`corpus-regression-control-9egaf7`, run `32544545256`, 880/1700). This reproduces the documented 151-level gap population almost exactly (152: 243 raw corrected-census rows minus 92 already solved at the control baseline). Filtering the `solvedByT1` technique lists to drop ablation-variant labels (e.g. `beam:objectiveFirst@beam5000+dedup-near-tie-retention-off` — a census flag-sensitivity testing artifact, never a real production `attemptConfigKey()`) and tracing every remaining row's `getAttemptConfigs()` against current (post-`#1436`/`#1440`) code directly found **90 genuine routing gaps** — the isolated technique is not offered by production at all, not merely under-budgeted. 55 of the 90 want a `dfs:repair:repair*` config that the level's archetype sub-rule's `needsRepairFallback` gate excludes outright (`portal-heavy`, 18/22 of its own rows, plus most of `high-intersection-burden`'s medium-reqInt/near-Hamiltonian sub-rules) — left open, see below. The remaining 35 are non-repair beam/DFS gaps, spread thin across 7 sub-rules with no single missing technique covering more than 3 levels.

- **Landed:** `hi:near-hamiltonian` was missing `dfs:perimeterSweep/sideCommitment` entirely (neither DFS nor beam form), the best-coverage candidate found (3 targeted rows: R02858, R03226, R02903). Direct verification at production 50M node budget: **R02858 newly solved, via the exact new config** (`dfs:perimeterSweep/sideCommitment`). R03226 also solves, but via a pre-existing config (`beam:objectiveFirst@beam5000`) — it was already among the 7 sample-A/B gains recorded above, not a new recovery from this fix. R02903 still exhausts even at an extended 30-minute local wall-clock allowance (see the methodological finding below) — offered but not sufficient within budget for this specific level, a search-quality/allocation limit rather than a routing one. Net: **1 confirmed new Corpus-2 recovery locally** (R02858).
- **Investigated and reverted:** `hi:portal-dense-veryhigh` was similarly missing `dfs:perimeterSweep/cornerHarvest` (best-coverage candidate: R00975, R02843). Added it, then direct-verified both targets at production 50M budget (retested at an extended 30-minute local deadline specifically to rule out wall-clock truncation, not just node-budget exhaustion) — **both still failed** (100M+ cumulative nodes each, no solve). Traced the cause: `cornerHarvest` lands as the LAST config in this rule's now-6-item list, and an earlier, also-protected sibling in the same reserve window (`dfs:objectiveFirst`, 29M nodes on one gate alone) can consume most of the shared reserve before `cornerHarvest` ever gets a turn — "protected" only guarantees the window collectively gets first claim on the reserve, not an even split within it, so a config placed last in an already-crowded window is still exposed to its own protected siblings. Reverted this addition (code now matches pre-session `attempts.ts` for this rule) rather than keep an unvalidated change; the underlying technique-family/sibling-starvation distinction is worth remembering for future trailing-config additions to rules whose existing protected window already contains a node-hungry unbounded DFS.
- **Methodological finding:** local verification at a fixed `--node-budget` needs a genuinely non-binding `--budget-ms` to match what production's 24h-non-binding deadline actually tests — an initial pass at 120,000–300,000ms produced misleading reads on hard levels (a slow-per-node early attempt can exhaust its wall-clock share without completing, before the cumulative node counter is anywhere near the nominal cap) on levels running under CPU contention from concurrent sweeps; re-testing the disputed R00975/R02843/R02903 cases at 1,800,000ms in isolation gave the same outcome as the tighter test in every case (all node-budget-exhausted, not wall-clock-truncated), so in this instance the extra time didn't change the verdict — but it was necessary to be sure. Also confirmed a recurring artifact: a genuinely-unsolved level's actual `nodesExpanded` regularly overshoots the nominal `--node-budget` by roughly 1.5-2.6x, because the cumulative check is enforced between attempts, not preemptively mid-attempt.
- **Not pursued (thin coverage):** the remaining ~28 non-repair beam/DFS rows (`hi:medium-high-catchall`, `hi:non-portal-veryhigh`, a couple more) each have no single missing technique covering more than 1-2 levels, and every rule already spent its one bonus 5th-reserve-slot from the `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` increase below (or, for `hi:medium-high-catchall`, would need real reserve-window analysis since it already carries 2 trailing WIDE beams from the earlier fix). One promising lead for a future pass: `hi:medium-high-catchall`'s R02637 wants the same `dfs:perimeterSweep/sideCommitment` config just confirmed to work on `hi:near-hamiltonian` — not implemented this pass, not yet directly verified against current code.
- **Repair-family gate widening left open, not a quick fix:** unlike a beam/DFS trailing-config addition, the 55 repair-family rows can't be scoped to one rule's own reserved slot — `needsRepairFallback` (`attempts.ts`) is a single global predicate gating a completely separate budget mechanism (the early repair probe plus the `REPAIR_EXTRA_BUDGET_FRACTION` fallback loop), not one more `build()` entry. `stage-budget.ts`'s own comment on `REPAIR_PROBE_ORDINARY_NODE_BUDGET` documents that the CURRENT (narrower) gate already taxes far more levels than it helps (a full-corpus scan found 48 levels matching the gate that solve fast via the ordinary main loop, against only 13 that actually needed repair) — widening the gate to cover `portal-heavy` and more of `high-intersection-burden` risks a much larger version of the same tax on an unmeasured population. Needs a population-scale (or large stratified-sample) wall-time check before landing, not the `solver:bench --check`-only bar a trailing-config addition gets. Logged in [`solver-future-work.md`](solver-future-work.md).

**2026-08-22 must-cross diverse-beam gaps (R02299/R02159), resolved — `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` raised 4->5:** both rules' 4-slot trailing reserve was already fully spent on the validated perimeter-direction fix above, blocking the missing diverse-WIDE-beam config each rule genuinely never offers (not threshold-gated — `mcDiverseThread`/`POLICY.HIGHINT_MC_DIVERSE` isn't used by either rule at all). Since the reserve is a FRACTION of `earlyTierNodeBudget` (`MAIN_LOOP_LATE_RESERVE_FRACTION`, unchanged), not a fixed per-config amount, widening the protected window to 5 spreads the SAME reserve pool one slot thinner rather than growing it — confirmed strictly a no-op on the published corpus with no rule content changed (160/160 identical solved set, byte-identical `nodesExpanded` per level, count=4 vs count=5, both at node-budget 50,000,000, local `portfolio-solve-sweep.mjs` comparison). Added `beam:objectiveFirst@beam5000(diverse)` to the must-pass-heavy rule (R02299) and `beam:intersectionHarvest@beam5000(diverse)` to the default catch-all (R02159), each landing in the newly-available 5th slot without evicting anything protected before this session's changes. Direct verification: **both now solve at production 50M node budget** (R02299: 36.7M nodes/108s; R02159: 35.1M nodes/27s). Regression check: a random 30-level sample of already-solving `mc:must-pass-heavy`/`mc:default-catchall` Corpus-2 levels at the same 50M budget — **30/30 still solved, zero collateral loss**; a separate 25-level sample of already-solving `hi:near-hamiltonian` levels (covering the sideCommitment addition above) — **25/25 still solved**. `solver:bench --check`: 160/160, no regressions, cost within noise of this session's own pre-edit baseline (53.4s/47.4M nodes -> 54.9s/45.9M nodes after all final edits).

**Validation strength for this follow-up pass:** local only (`solver:bench --check` + local `portfolio-solve-sweep.mjs` targeted/regression samples at production node budget) — no GHA dispatch this round. Net confirmed local gain: **3 Corpus-2 levels** (R02299, R02159, R02858), zero confirmed local losses across 55 already-solving levels sampled (30 must-cross-heavy + 25 near-Hamiltonian). This is a smaller, more targeted result than the prior GHA-validated round; a full-population or stratified-sample GHA run would strengthen it further but wasn't run this pass.

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
