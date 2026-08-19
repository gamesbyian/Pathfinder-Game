# Solver optimization: current priority queue

> **Status:** canonical live entry point for tuning and optimizing existing solver techniques.
> **Last reconciled:** 2026-08-15, through the full-corpus lifecycle failure map, the matched 36M/50M capability pair, ETT-028 family-boundary analysis, flipping-filter CP-SAT support, the latest repair-retreat probes, and the confirmed `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression (Priority 0).
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
| 0 | **`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression (new, 2026-08-15)** | **Mechanism confirmed; first fix attempt (unconditional dedup) tried and reverted** — doesn't recover `R02248` (a deeper, flag-independent dedup-heuristic loss at depth 12, not just threshold timing) and costs +13.4% nodes/+47.5% time on the published corpus for no benefit. Confirmed on `R02248`, `R02114`, `R00592`; ruled out as universal by `R03248`. Next real fix target: dedup's retention rule (keep >1 scorer per collision key), not when it runs. See [`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md). | A cost-validated dedup retention-rule change (not a timing/trigger change) that recovers the regressed population without losing `R03248`-shaped cases or regressing published-corpus cost. |
| 1 | Failure-conditioned late-tier allocation | Design a state-informed, equal-total-budget treatment that gives repair fallback and/or attraction diversity nonzero work only when earlier-tier evidence predicts low marginal value; run matched full-ladder A/B on Corpus 1 and 2. | Net level-blind solve gain with no material regression and acceptable work; report reached/starved mass by technique, not only totals. |
| 2 | Beam score/retention at proven extinction boundaries | **Re-run done (2026-08-15, run `31858783552`): 25 live / 4 dead / 3 abstain, 0 alarms — 2 new R00001-pattern instances, both D-class (`S00030`, `S00048`).** Next: assemble the held-out, family-namespaced K-vs-2K test scoped to A-class *and* D-class (not A-class only). | Recurrent exact-live/exact-dead separation across unrelated parents; a scorer change must beat widening at equal work. |
| 3 | Canonical-inclusive family-boundary retest | **Gate complete (2026-08-15).** `R02248`: 7/7 siblings solve, canonical fails — traced to the Priority 0 regression, not a scoring boundary (superseded framing, see that row). `R00156`/`R02960`: 4/7 and 3/7 siblings solve — budget-allocation-flavored, feeds Priority 1. See the [variant corpus plan](variant-corpus-solver-research-plan.md#sibling-cold-solve-all-3-confirmed-failures-2026-08-15). | Reproduced, parent-clustered solver boundary that identifies a generic technique or representation change. |
| 4 | CP-SAT-anchored deep repair editing | Use verified feasible/infeasible retreat boundaries and the existing retreat-file mode to classify real repair prefixes; prototype bounded rollback/rebuild only after the label recurs. | A state feature predicts required retreat depth, followed by equal-budget full-ladder gains. |
| 5 | State-conditioned must-cross anchoring | Add a read-only prefix diagnostic for target/defer/second-approach decisions using live slack, axis/visit state, reachability, and competing obligations. | The distinction repeats across unrelated levels or held-out parent families before any production scoring change. |
| 6 | Mechanics-conditioned technique routing | Confirm the observed block-density split between admissible-order and repair winners and measure its interaction with repair eligibility and admissible reserve. | A mechanics-only rule improves a matched population A/B; no exact-level winner lookup. |

These lanes are deliberately small-to-medium until a repeated signal justifies a full population run. Priority 1 is the main production-facing optimization question; priorities 2–6 build better routing or search representations rather than spending more blindly.

## How to execute the queue

### 0. `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression

Discovered as a side effect of Priority 3's `R02248` sibling work, not by design — worth stating
plainly because it changes this queue's priority ordering: a **confirmed, referee-validated,
causally-isolated regression**, not a hypothesis. `beam:intersectionHarvest@beam5000` cold-solved
canonical `R02248` reliably 11 times (182,923–184,005 nodes, deterministic) through 2026-07-31, then
never again in provenance. Bisected to [`80a5706`](https://github.com/gamesbyian/Pathfinder-Game/commit/80a57068103d46a20beefc4a405f2f8cd012eb7e)
(`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`, 2026-07-31) and confirmed via direct ablation at HEAD:
disabling just that flag restores the exact historical solve. Mining hint provenance for the same
shape (repeatedly, deterministically, cold-found, then not found since) surfaced 195 more candidate
configs; a 20-level spot-check confirmed 2 more regressions (`R02114`, `R00592`) and, critically,
**one case where the flag's default-ON state is what succeeds** (`R03248`) — ruling out a blanket
"just disable it" fix. `isConnected` was independently verified sound on `R02248`'s own recovered
winning path (never rejects it, pre- or post-move) — the regression runs through a downstream
mechanism, not a direct false-reject.

**Mechanism confirmed (2026-08-15, same day)**: beam-frontier instrumentation
(`prep._beamResearchObserver`) traced the exact failure to a **beam-width-threshold timing artifact**,
not a soundness bug. At depth 16, the flag's small, legitimately-correct rejection of a few extra
axis-exhausted revisits lands the candidate pool at 4,948 — just *under* the 5,000 `beamWidth`
threshold that triggers dedup/cull — while the flag-off pool lands at 5,239, just *over* it. That
one-generation difference in whether the cull fires defers the flag-on collapse to depth 17, where the
uncollapsed pool has since more than doubled (10,801 vs. a would-be ~5,239), producing a far larger,
more collision-prone cull — 47x more state-dedup collisions at one key (30) than the flag-off run
gets (0) — in which the eventual winning lineage's own candidate loses to a competitor it would never
have had to compete against had the cull landed a generation earlier. This is a **generic fragility of
the beam search's fixed-threshold dedup/cull design**, not a defect specific to this flag — any small
perturbation to candidate counts near the threshold can trigger it, in either direction, which is
exactly why the population signature is scattered (`R03248` almost certainly the same phenomenon
landing the other way). Full trace: [`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md).

**First fix attempt tried and reverted (2026-08-15, same day): unconditional dedup is not the answer.**
Decoupling state dedup from the width-cull trigger (run dedup every generation, not just when
`cands.length > beamWidth`) was implemented and tested. It does **not** recover `R02248`: with dedup
now consistent, the winning lineage instead collides with a genuinely higher-scoring competitor at
depth 12 — *identically in both flag-on and flag-off runs* (scores 462.0591 vs. 462.3672, byte-equal
both ways) — and loses. That's not a threshold artifact; it's dedup's own greedy "keep only the top
scorer" heuristic making a locally-correct, globally-wrong call. The old threshold-gated behavior was,
for this level, **accidentally protective** — this exact comparison simply never ran under the
original code, since the pool never crossed `beamWidth` at that generation. The fix also cost
**+13.4% nodes / +47.5% wall time on the published corpus** (`solver:bench --check`, 160/160, no
solved/failed regression, but a real cost regression) for zero solve benefit there. Reverted, not
merged.

**Second fix attempt validated and shipped (2026-08-15, same day): near-tie dedup retention.**
Instead of changing *when* dedup runs, changed dedup's own retention rule: when a collision's loser
is within a small relative score margin of its winner (`DEDUP_NEAR_TIE_MARGIN = 0.01`,
`modules/solver/search.ts`), keep it alongside the winner in the next frontier as a runner-up, rather
than discarding it outright — a targeted widening (one extra slot, gated to near-ties only) rather
than the first attempt's global "always keep top-N" change. Recovers `R02248` (250,617 nodes,
referee-validated via `Solver.validateCandidatePath`) at **+0.3% nodes / +1.8% wall time** on the
full published-corpus regression check (160/160, no solved/failed change) — a small fraction of the
first attempt's cost. Cross-checked against a 20-level mined-regression sample (exactly 1 outcome
changes — `R02248` — 19 unchanged) and a 112-level Corpus-2 sample (identical solved set, +0.0001%
nodes). Does **not** recover `R02114`/`R00592`, the other two confirmed regressions in the same
family — their blocking collision is evidently a different depth/shape a single runner-up slot
doesn't reach. A first implementation of this idea (storing `BeamNode | BeamNode[]` in one map)
separately surfaced a real ~30% V8-monomorphism performance trap unrelated to the retention logic
itself — fixed by using two single-typed maps instead; see the report for detail, since this class of
"perf regression traced to a data-shape change with no attempt-count difference" is subtle and worth
recognizing again elsewhere. Full validation detail: [`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md).

**CORRECTION (2026-08-15, same day): a real full-corpus GHA A/B (50M node budget, both corpora)
overturned the "112-level sample, zero regressions" read above.** That sample was badness-stratified
toward hard levels, and every level this margin actually flips turns out to be easy/medium (solves in
4-35M of the 50M ceiling either way, nowhere near exhaustion on its own) — exactly the population the
sample excluded by construction. The real effect: **net -7 on Corpus 2 (731 → 724): 27 gained
(`R02248` among them) / 34 lost**, every flip in either direction sharing the identical
`beam:intersectionHarvest@beam5000`/`beam:objectiveFirst@beam5000` signature. Kept default-ON anyway
— reverting would forfeit the 27 gains for no improvement on the loss side either.

**Recovery mechanism built, locally validated, and now population-validated — works on target, but
net-negative overall due to a reserve-design flaw.** `STRATEGY_DEDUP_NEAR_TIE_RETRY` (opt-in, default
OFF, `modules/solver/orchestration.ts`) is a last-resort retry pass mirroring the attraction-diversity
pass's own pattern — reruns the main ladder once more with retention disabled, only after the main
loop and repair fallback fail, in its own reserved node/work budget. Two real budget bugs were found
and fixed before any GHA spend (a floor-based reserve that's a no-op once an earlier tier spends the
whole budget; a separate work-budget starvation once the node reserve alone was fixed).

**CORRECTION (2026-08-15, same day): a full-corpus GHA A/B (`enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY`,
run `31895631847`) confirms the mechanism hits its target but is a net loss overall.** 33 of the 34
original losses recovered, `R02110` fails exactly as its own 12.5M-reserve sizing predicted, all 27
gains intact, +15 bonus new solves — but **65 previously-unrelated Corpus-2 levels (solved both
with and without the original fix) now fail**, because `dedupRetryNodeReserve` is withheld from every
level's main-loop node ceiling the instant the flag is globally on, not just the 34 that need the
rescue. Net: **707/1700, down from the 724 baseline and below the original 731 no-fix count.** Stays
opt-in/default-OFF (unchanged), so production is unaffected. Full breakdown:
[`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md#the-retry-pass-at-population-scale-a-net--17-not-a-recovery).

**Redesigned twice more the same day, now locally re-validated.** REVISION 2: made the reserve
ADDITIVE instead of subtractive — `earlyTierNodeBudget` no longer references it at all (every earlier
tier keeps the full, unshrunk `nodeBudget`), and the retry tier alone gets an extended ceiling
(`nodeBudget + reserve`), safe by construction in production where `nodeBudget` is always `Infinity`.
REVISION 3: local testing of REVISION 2 against 3 of the 65 collateral levels (all solved via
`ida:default`, the admissible-order tier) found them *still* failing — the retry tier ran BEFORE the
admissible-order tier, and its extended ceiling let it burn the shared cumulative node counter past
`nodeBudget` on every level that doesn't need it, tripping the admissible-order tier's own
(unextended-aware) entry guard before its turn ever came. Fixed by moving the retry tier to run dead
last, after repair-probe-shrink-recovery and the admissible-order tier — no earlier tier's ceiling
references it at all now. Local re-validation (6-level sample): target recovery intact (`R00180`/
`R00901` recover, `R02110` still fails exactly as predicted), and all 3 collateral levels now solve at
node counts **bit-identical to the original with-fix baseline** (e.g. `R00050`: 47,495,401 nodes both
before and after).

**CONFIRMED at population scale (2026-08-15, same day): a second full-corpus GHA A/B
(`enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY`, run `31902837955`, dispatched on `main` @ `c79180ef`,
the merged REVISION 2 + REVISION 3 fix) shows the additive-reserve + run-last design fully resolves the
collateral damage.** Result: **764/1700, +40 vs. the 724 baseline, with ZERO levels lost relative to
baseline** — 33/34 target losses recovered (same as before, unaffected by either fix), all 27 gains
intact, +7 bonus solves, and the 65-level collateral damage from the first design is gone entirely
(`lost_vs_withfix` is the empty set). Corpus 1 also exactly matches the with-fix baseline (95/102).
`STRATEGY_DEDUP_NEAR_TIE_RETRY` is now a genuinely usable, population-validated recovery mechanism for
the `DEDUP_NEAR_TIE_MARGIN` regression.

**PROMOTED to production default-ON (2026-08-15, same day).** On the strength of the clean
population result (a strict superset of the with-fix baseline's solved set — zero levels lost, not
merely a positive net count), changed the tier's run-condition from the opt-in `cfg && cfg.FLAG ===
true` convention to the standard default-on `!cfg || cfg.FLAG` convention and removed it from
`OPT_IN_FEATURES`. Both interactive solve UIs (`solver-controller.ts`/`review-controller.ts`) are
unaffected — `disableExtraBudgetPasses: true` still zeroes this tier's budget fraction regardless of
the ablation default. Promoting a default-on last-resort tier broke 11 pre-existing
`orchestration.test.ts` tests whose exact node-budget arithmetic assumed no other tier fires without
explicit opt-in (the same maintenance pattern already established when the admissible-order tier was
added) — fixed by isolating each with `dedupNearTieRetryBudgetFractionOverride: 0`. Verified clean:
`tsc`, 381/381 solver unit tests, `npm run check`, `npm run test:node`, `npm run test:coverage`
(1163/1164 — the one failure a confirmed pre-existing timing flake, reproduced passing standalone),
and `solver:bench --check` (160/160 published levels, no regressions, +0.3% nodes). Still open:
investigate why `R02114`/`R00592` don't respond to the fix; verify `R03248` (does its own divergence
share `R02248`'s depth-12 flag-independent-loss shape, or is it a genuine threshold-timing case —
already spot-checked as unaffected by the fix, but the *why* wasn't traced); verify the remaining
~175 unverified provenance candidates. Full detail:
[`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md).

**The same "run dead last, additive budget" pattern applied to a second double-edged mechanism,
`STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` — built, validated, and PROMOTED to default-ON, all the
same day (2026-08-15/16).** Targets `ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION`'s own known
double-edged shape (recovers `R03148` via `'none'`, but shrinking `'default'`'s ceiling to make room
turns `R02644` from SOLVED to unsolved at the same fraction). Instead of shrinking `'default'`'s
ceiling in the admissible-order tier's own unreserved pass, this tier reruns ONLY the non-`'default'`
profiles afterward, dead last (after even `STRATEGY_DEDUP_NEAR_TIE_RETRY`), with a fresh additive node
ceiling and a fresh additive `prep._workCap` override. Local validation surfaced a real, unrelated
finding: the mechanism's founding evidence (a 2026-07-30 report) had decayed — `'default'` now needs
~7x more nodes than 16 days ago (confirmed unrelated to this change), which made the first reserve
fraction (0.25) useless; corrected to 0.5 before any GHA spend. Population-scale GHA A/B (run
`31910836458`, against the `764/1700` baseline): **809/1700, +45, ZERO levels lost relative to
baseline** — on the FIRST population attempt, no revision cycle needed (unlike
`STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own two-revision history). Promoted to default-ON the same day.
Both interactive solve UIs unaffected (`disableExtraBudgetPasses: true` already zeroes this tier's
budget fraction). Full detail:
[`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md#applying-the-pattern-elsewhere-strategyadmissibleordernondefaultretry).

**Applied a THIRD time (2026-08-16), directly to `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` itself — the root
flag this whole investigation started from — as `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`, built,
validated, and PROMOTED to default-ON, all the same day.** Targets `R02114`/`R00592`, the two
originally-confirmed regressions `STRATEGY_DEDUP_NEAR_TIE_RETRY` doesn't reach (a single-attempt-config
test already showed disabling this flag recovers both, referee-valid, while `R03248` goes the other
way — structurally protected here the same way `R02644` was for the second tier). Local testing found
and fixed a NEW variant of the same starvation bug class: as the THIRD stacked retry tier, its ceiling
at the same 0.5 fraction as the tier before it computed to the identical absolute value, so the
preceding tier maxing out gave it zero real headroom regardless of its own fraction — fixed by
stacking this tier's ceiling on the PRECEDING tier's own ceiling instead of restarting from
`nodeBudget`. Both targets recovered referee-valid after the fix (winning-attempt node counts matching
the original single-attempt-config evidence almost exactly); `R03248`/`R02248` confirmed unaffected.
Population-scale GHA A/B (run `31918095910`, against the `809/1700` baseline): **corpus1 95/95
identical solved-ID set (zero change); corpus2 819/1700, +10, ZERO regressions** — both targets
recovered plus 8 bonus solves. Unlike the two prior tiers, cost rose meaningfully (corpus1 nodes
+18.7%/work +12.2%, corpus2 nodes +28.2%/work +22.1%), reflecting that this flag gates a much hotter
code path (every connectivity check across every search technique) — promoted anyway since the
ladder's bar is solved-count gain plus zero regressions, not cost neutrality. Full detail:
[`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md#population-scale-confirmation-and-promotion-strategyconnectivityaxisexhaustedretry).

**Applied a FOURTH time (2026-08-16/19) to a DIFFERENT known double-edged mechanism —
`STRATEGY_REPAIR_ELITE_PREFIX_DFS` (`reports/2026-08-07-repair-elite-prefix-dfs.md`) — as
`STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY`. CLOSED, not promoted: negative result.** That mechanism
is sound and mechanistically real but net-negative in its own 20-level A/B due to a confirmed
shared-node-budget displacement (`R02239` solves via ordinary repair with it off, exhausts the SAME
repair call's own budget with it on). This tier reruns `repairConfigs` (not `mainConfigs`) and
**enables** the flag via Proxy override (the opposite polarity from the three tiers above),
structurally eliminating the displacement: the ordinary repair fallback loop always runs first,
unaffected, at its own untouched budget. Validated on the original 20-level sample at TWO retry
budgets (7.5M and the full 15M matching the original report's own scale, run sharded across 10
parallel GHA jobs rather than one near-hour-long sequential job): **zero recoveries at either
budget** — doubling the budget changed nothing, ruling out under-provisioning. Confirms the
mechanism's real limitation was never budget competition (now structurally removed) but that
`elitePrefixDfsRepair` itself lacks the power to close these gaps at these budgets; the original
report's own evidence (badness improving 4→3) was always intermediate progress, never an actual
extra solve, so this is consistent with, not a reversal of, that report's own findings. Kept in the
codebase (opt-in, zero production risk) but not a promotion candidate without a materially
different approach to the underlying operator. Full detail:
[`reports/2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md#follow-up-2026-08-19-a-dedicated-retry-tier-tested-and-negative).

**A FIFTH application (2026-08-19) targeted `PRUNE_MC_NEIGHBOR_BUDGET` as
`STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` — built, opt-in, 1 of 2 targets recovered — but the durable
result is the DEFECT it exposed in the four tiers that came before it.** That prune shipped
default-ON on 611/1700 → 665/1700 (59 gained / **5 lost**), explicitly accepting its five losses
because nothing then existed to recover them. Three of the five have since been recovered by
unrelated work; `R02119`/`R02422` remain unsolved at the 819 baseline and **both recover at HEAD
with the prune off**, referee-valid, via exactly the configs
[`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`](../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md)
named. The tier as first written — a faithful copy of the connectivity tier — recovered **neither**,
and raising its reserve 4.5× changed only how long its *first* config ran (12.7s → 77.1s).

**The defect: every ladder-rerun tier gives its first config the entire node reserve and the other
seven exactly 0ms.** These tiers divide budget between configs in WORK units but treat the node
ceiling as one shared absolute cap with no per-config subdivision, and they size their fresh work
budget from `timeBudgetMs`, which under the capability protocol is a deliberately NON-BINDING 24h
deadline — so the division never bites. Measured per-attempt ms on `R02119`: main loop
`10782, 473, 496, 482, 1561` (divides correctly — it passes the external, binding work budget);
attraction-diversity `685, 0×7`; `STRATEGY_DEDUP_NEAR_TIE_RETRY` `10896, 0×7`;
`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` `21319, 0×7`. This is the same "fractions are
denominated in TIME but what stops a level is `nodeBudget`" trap `CLAUDE.md` already documents for
the admissible-order tier, recurring at a new call site in tiers written after that note.

Fixed for the new tier only (per-config node staircase via `lateConfigStart = 0`): its profile became
`5134, 5199, 2094` and `R02119` solved via `beam:mustCrossFirst@beam2000`, referee-valid, at the full
50M level-blind protocol. `R02422` still fails and is understood — its winning attempt needs
50,333,677 nodes alone, more than a fair 8-way split of the reserve can grant.

**That follow-up was then built and CLOSED NEGATIVE the same day** as
`STRATEGY_RETRY_TIER_NODE_STAIRCASE` (opt-in, default OFF, retained for the record). Generalizing the
staircase to the two promoted tiers and the diversity pass **eliminated starvation completely**
(sample-wide 21–29% → 0%; `connRetry` coverage `1/16 → 16/16`) and was still decisively negative:
**0 solves gained** on 14 random unsolved levels, **8 of 9 LOST** on the *complete* at-risk population
(all Corpus-2 levels whose retry-tier win came from config #1 — 9 of the 55 solved levels that use a
genuine ladder rerun), at **+72.7% wall time on −1.4% nodes**.

**Giving the first config the whole reserve is load-bearing, not a bug in effect.** In these ladders
config #1 is `dfs:perimeterSweep/cornerHarvest`, the highest-value config, and the levels it rescues
need 50–96M nodes to do it; capped at reserve/N it fails and nothing later recovers them. The
+40/+45/+10 came *through* the behavior a staircase removes. Two transferable lessons: a mechanism can
be genuinely defective and simultaneously load-bearing (coverage `1/16 → 16/16` looked like a clean
win and was not), and node/work counts are blind to what an operation COSTS — a node-only comparison
scored a +72.7% wall-time change as free, exactly as `CLAUDE.md` warns. No promotion path in this
form: guaranteeing later configs a floor without capping config #1 needs a strictly LARGER reserve,
i.e. more budget rather than redistribution, forfeiting the only property that made it attractive.
Full data: [experiment ledger](solver-opt-in-experiment-ledger.md).

### 1. Failure-conditioned late-tier allocation

Start from the full lifecycle artifact, not a hand-picked list of failures. Build cohorts from fields available during the solve: technique eligibility, actual work received, termination reason, recent improvement rate, repair best-badness trajectory, unique-state growth, beam extinction/retention summaries, and remaining budget. Historical hints, prior winning configurations, saved solve status, and permanent level IDs are labels only.

A useful first treatment should be narrow:

1. keep the total node/work budget and main config count fixed;
2. define one transparent trigger from current-invocation evidence;
3. transfer work to **one** starved late tier, rather than simultaneously changing the whole ladder;
4. record lifecycle telemetry in both arms;
5. evaluate Corpus 1 and Corpus 2 together from the first population gate.

Do not interpret the lifecycle map as support for the old unconditional reserve mechanisms. The static repair-fallback reserve produced no fallback wins on its tested population, and naive late-reserve changes have caused regressions. The remaining hypothesis is conditional routing, not a renamed fixed carve-out.

Concrete anchor (2026-08-15): `R00156`/`R02960`'s Priority 3 sibling comparison found the eventual winning technique tried on canonical too, but cut off at a node allocation smaller than what it needed to succeed on a symmetric sibling — see [Priority 3](#3-canonical-inclusive-family-boundary-retest) below and the [variant corpus plan](variant-corpus-solver-research-plan.md#sibling-cold-solve-all-3-confirmed-failures-2026-08-15). Suggestive of an allocation defect specifically on these two, not proof (a longer per-attempt budget on canonical was not directly tested) — a useful concrete pair to validate any trigger design against, not yet a general result.

### 2. Beam score and representation

Existing lineage work says generic widening is a weak lead: some winning families disappear because the score ranks an exact-dead child above an exact-live sibling. Flipping-filter support removed the main abstention blocker for nine B/D cases.

**Re-run complete (2026-08-15).** All 32 cases from `winning-lineage-extinction-adjacent-cases-2026-08-12.json` re-ran through `cpsat-explicit-prefix-oracle.yml` (run [`31858783552`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/31858783552)): 25 live / 4 dead / 3 abstain (up from 9/2/21), 0 correctness/input alarms, 0 remaining `unsupported-mechanics` abstentions. The label pattern reproduced twice more — `S00030` and `S00048`, both D-class (width-saturation) — bringing confirmed R00001-pattern instances to 4 (previously A-class-only: `S00001`, `R00104`). Full table: [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md#follow-up-2026-08-15-the-9-abstained-rows-re-run-flipping-filters-now-supported).

Next: assemble a held-out, family-namespaced set of roughly 8–12 extinction boundaries **spanning both A-class and D-class** (not A-class only, now that D-class has confirmed evidence) and compare K versus 2K at equal surrounding policy. Collect descriptor values for both live and dead siblings. Promote a score feature only if it separates feasibility across unrelated parent families and survives a full-ladder matched-budget test. Do not infer a global width increase from a few local rescues.

A third, independent boundary is now available (2026-08-15, from Priority 3): `R02248`'s canonical orientation exhausts `beam:intersectionHarvest@beam5000`/`beam:objectiveFirst@beam5000` cleanly at ~200K nodes with no solution, while all 7 symmetric siblings solve with the exact same configs at ~4.2–4.4M nodes each — mechanic-free (no mustCross/portals/flippers), so this isn't an axis-geometry artifact.

**Update, same day: this is NOT beam-scoring orientation bias — it's a confirmed solver regression.** `R02248`'s own hint provenance showed the exact winning config cold-solved canonical `R02248` reliably 11 times through 2026-07-31, then never again. Git-bisected and causally confirmed (direct ablation at HEAD) to [`80a5706`](https://github.com/gamesbyian/Pathfinder-Game/commit/80a57068103d46a20beefc4a405f2f8cd012eb7e), `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`. Population-scale provenance mining found 195 more candidates with the same shape; a 20-level sample confirmed 2 more regressions and 1 opposite-direction case (the flag helps there) — not a blanket fix. Full report: [`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md). **This makes `R02248` a poor held-out case for the K-vs-2K descriptor test below** — it's explained by a prune regression, not a scoring/width tradeoff, so it doesn't test the same hypothesis. Use `S00030`/`S00048` (Priority 2's other two confirmed instances) instead, or find a fresh held-out case not confounded by this regression.

### 3. Canonical-inclusive family-boundary retest

ETT-028 repaired the identity/source-selection problem and produced an 886-edge, 51-parent, 123-family view with zero missing variant rows. Historical baselines contain no canonical parent outcomes, so it supports **nomination**, not rescue or robustness claims.

The current cold-test cohort is: **R02795, R00156, R02248, R02960, R00548, R01465, R02239, and R02452**. Treat parents as the independent units. Use sibling disagreements to find representation-sensitive failures, then connect a reproduced boundary to beam ranking, technique reach, or repair behavior. Do not count sibling rows as independent solver wins.

**Canonical-only cold-solve done (2026-08-15).** Production protocol (50M nodes, 1 worker, commit `4efc2d1`, same commit as the 36M/50M budget pair with zero solver-code drift verified): `R00548`, `R01465`, `R02239`, `R02452`, `R02795` all solve cleanly, well under budget — not canonical failures at all. Only `R00156`, `R02248`, `R02960` hit `node-budget-reached` at the full 50M ceiling. Full table: [variant corpus research plan](variant-corpus-solver-research-plan.md#canonical-only-cold-retest-all-eight-parents-2026-08-15). This narrowed the sibling half of the gate to those 3 parents only.

**Sibling cold-solve done (2026-08-15).** Generated symmetry families for `R00156`/`R02960` (matching `R02248`'s existing manifest) and cold-solved all 21 siblings at the identical protocol. `R02248`: **7/7 siblings solve, canonical alone fails** — every sibling wins via `beam:intersectionHarvest@beam5000` or `beam:objectiveFirst@beam5000` (4.17M–4.38M nodes), and canonical tried the *exact same two configs*, which both **exhausted** cleanly at only 205K/166K nodes — not a timeout, a completed search that didn't contain the answer. The level has zero mustCross/portals/flipping-filters, ruling out an axis-geometry explanation — this is a clean, reproduced beam-scoring/retention boundary, ready to feed Priority 2's K-vs-2K test directly. `R00156` (4/7) and `R02960` (3/7) show a different shape: the eventual winning technique is tried on canonical too but gets cut off at a smaller node allocation than what it needed to succeed on the siblings — allocation-flavored, not scoring-flavored, so this evidence belongs to Priority 1 instead. Full writeup: [variant corpus research plan](variant-corpus-solver-research-plan.md#sibling-cold-solve-all-3-confirmed-failures-2026-08-15).

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
- [`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): confirmed capability regression, bisection, and population-scale provenance mining (Priority 0).
- [Beam lineage survival analysis](winning-lineage-survival-analysis.md) and [heuristic capability gaps](solver-heuristic-capability-gap-analysis.md): representation and must-cross hypotheses.
- [Repair retreat evidence](../reports/2026-08-12-repair-retreat-cpsat.md) and [negative rollout proxy](../reports/2026-08-15-repair-plateau-rollout-proxy-negative.md): exact-prefix boundary and rejected shortcut.
- [Research operating model](solver-research-operating-model.md): how observations become shadow tests, A/Bs, and promotion decisions.
