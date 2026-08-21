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
| 0 | **`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression class — residual population now measured (2026-08-19): 14 confirmed genuine regressions out of 609 freshly-mined candidates, not covered by either shipped recovery tier** | **Fresh, broader mining pass (2026-08-19) superseded the original connectivity-axis-specific 195-candidate list (whose exact contents no longer exist).** Generalized the methodology beyond one flag: mined all cold, `classifyProvenanceSource === 'production-solver'` hint entries across all 4 techniques (dfs/beam/repair/admissible-order) for (level, config) pairs found ≥3 times with ≤5% node-count spread — 609 "real-tier" (≥50,000 median nodes) candidates. Re-testing each in isolation against current HEAD found 199 raw failures, but 87 were a script bug (the beam config-key builder silently dropped the `template` field, testing the wrong search) — not real. Of the remaining 189 distinct failed levels, cross-referencing against the already-computed population baseline (run `32224200709`, corpus2 828/1700 solved) showed **175 are still solved** (recovered by other ladder tiers/techniques — exactly what the shipped recovery tiers are for). The remaining **14 were directly re-tested through the full production `solveLevel()` ladder** (production defaults, both shipped recovery tiers active) at generous budget (40–60M nodes, 4–14× their historical median): **all 14 confirmed unsolved** (`nodeBudgetReached: true` for every one — budget-truncated, not exhaustively proven unsolvable, but well beyond what used to suffice). Breakdown: 9 beam-only (`R01151`/`R01229`/`R02050`/`R02422`/`R02424`/`R02516`/`R02543`/`R02691`/`R02760`), 4 repair-only (`R00632`/`R02900`/`R03205`/`R03329`), 1 both (`R02546`) — `R02422` matches this session's earlier isolated finding that it doesn't reproduce. Repair-technique members carry an extra caveat (repair's search isn't fully deterministic even at `randomSeed: null`, per this session's `seedSalt` finding), but the beam-only 9 are not subject to that confound (all `template: null`, genuinely deterministic). **Partially root-caused (same day): 5 of the 9 beam-only cases (`R01229`/`R02424`/`R02516`/`R02546`/`R02760`, all portal+must-cross-bearing) implicate two prune flags from the same must-cross forced-structure research sequence — `PRUNE_MC_RESERVED_WALL` (`d87338d0f`) and `PRUNE_MC_FORCED_NEIGHBOR` (`63270f5d5`) — but the combined effect is non-monotonic: only 2/5 (`R02760`, `R02546`) fully recover, each via a DIFFERENT flag combination, and disabling both flags together makes `R02760` worse than disabling one.** Same threshold-fragility signature as `R02248`'s own root cause (section 0 above), not a clean single-cause fix. **The other 4 beam-only cases root-caused (2026-08-20, see section 0 below): NOT a bug — confirmed via two independent `git bisect` runs to be accepted, documented collateral of a genuine soundness fix (`dd001dd5c`, beam dedup's key-overflow correction), closed as explained rather than actionable.** `R02424`/`R01229` (2 of the remaining 3 non-monotonic cases) plausibly share this same mechanism as an unconfirmed third factor. **`R02516` fully root-caused (2026-08-20, see section 0 below): a third stacked prune from the same sequence (`PRUNE_MC_FORCED_FIRST_MOVE`, `fb6f042f1`) — all three flags off fully recovers it; explicitly checked and does NOT also explain `R02424`/`R01229`. Closed as explained, not actionable (three individually soundness-verified prunes jointly eliminating one level's one winning branch, never caught by `solver:bench --check` since it only covers the published corpus).** **All 4 repair-only cases now doubtful as real regressions (2026-08-20, see section 0 below) — two independent classification blind spots found, not just level-specific issues.** `R00632`'s only recorded win used the opt-in, default-OFF `STRATEGY_REPAIR_TURN_BIAS` flag, never reachable by the default production solver. More consequentially, `R02900` — tested directly with `Solver.solve(level, {})` (the real production entry point, default options) at its own historically-recorded-good commit — **still fails after 623.9M nodes / 509s**, three orders of magnitude beyond its recorded 4.17M-node cost, because `classifyProvenanceSource`'s `'production-solver'` label (the predicate the original 609-candidate mining pass filtered on) only checks `solver.id`, never whether the call actually went through the full `solveLevel()` ladder vs. an isolated technique call from offline tooling — the two are indistinguishable in current provenance. **This casts doubt on "repair-only regression" as a real category for this population, not just on these 4 levels specifically** — a trustworthy re-derivation needs a new way to tell a full-ladder win from an isolated-technique win, which the current schema cannot do. | A provenance-schema or classification fix distinguishing full-ladder finds from isolated-technique finds, confirmation (or refutation) that `R03205`/`R03329` share `R02900`'s pattern, and/or a root cause for whichever of the 4 turn out to be real. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED as originally framed (2026-08-20, see section 1 below).** The 2026-08-19 local pilot found participation, not starvation, was the real story at 10M-class budget; the 2026-08-20 technique census (run `32240161854`) settled it at population scale: `dfs:repair:repair` still hits the 50,000,000-node cap on 85.3% (750/879) of currently-unsolved levels even with the FULL budget to itself, converting only 13.5%. That is a genuine capability ceiling, not an allocation problem — more ladder budget for repair cannot fix a technique that already failed with the entire budget alone. | N/A — closed. A repair search-quality change (not a budget-allocation change) would be a new, separate research question. |
| 2 | Beam score/retention at proven extinction boundaries | **Re-run done (2026-08-15, run `31858783552`): 25 live / 4 dead / 3 abstain, 0 alarms — 2 new R00001-pattern instances, both D-class (`S00030`, `S00048`).** Next: assemble the held-out, family-namespaced K-vs-2K test scoped to A-class *and* D-class (not A-class only). | Recurrent exact-live/exact-dead separation across unrelated parents; a scorer change must beat widening at equal work. |
| 3 | Canonical-inclusive family-boundary retest | **Gate complete (2026-08-15).** `R02248`: 7/7 siblings solve, canonical fails — traced to the Priority 0 regression, not a scoring boundary (superseded framing, see that row). `R00156`/`R02960`: 4/7 and 3/7 siblings solve — budget-allocation-flavored, feeds Priority 1. See the [variant corpus plan](variant-corpus-solver-research-plan.md#sibling-cold-solve-all-3-confirmed-failures-2026-08-15). | Reproduced, parent-clustered solver boundary that identifies a generic technique or representation change. |
| 4 | CP-SAT-anchored deep repair editing | Use verified feasible/infeasible retreat boundaries and the existing retreat-file mode to classify real repair prefixes; prototype bounded rollback/rebuild only after the label recurs. | A state feature predicts required retreat depth, followed by equal-budget full-ladder gains. |
| 5 | State-conditioned must-cross anchoring | Add a read-only prefix diagnostic for target/defer/second-approach decisions using live slack, axis/visit state, reachability, and competing obligations. | The distinction repeats across unrelated levels or held-out parent families before any production scoring change. |
| 6 | Mechanics-conditioned technique routing | **CLOSED negative (2026-08-20, see section 6 below).** The density split (repair-only median 0.077 vs admissible-order-only median 0.124) is real, but the 2026-08-20 technique census shows admissible-order's total edge over the rest of the technique roster is thin regardless of density: only 6 of 879 currently-unsolved levels are uniquely solved by any `ida:*` config at the full isolated 50M-node budget, vs 76 for repair — a density-conditioned reserve would be chasing a near-empty population. | N/A — closed. |
| 7 | **Repair-fallback eligibility gate too narrow — `STRATEGY_REPAIR_LATE_PROBE` implemented and locally validated (2026-08-20), opt-in/default-OFF, GHA confirmation still pending (see section 7 below)** | `needsRepairFallback` structurally excludes 94 of 158 currently-unsolved levels where repair wins in the census. Rather than widen that gate (rejected — no clean feature predicts the winning subset), built a new dead-last, flat-2,000,000-node-capped repair tier, independently gated, that only ever reaches levels the rest of the ladder already failed. Local end-to-end validation against the real ladder: **20 net new recoveries of 94 (21.3%)**, referee-valid, zero marginal cost on control levels, `solver:bench --check` byte-identical. A real budget-cap bug (unenforced at `nodeBudget: Infinity`, the production case) was found and fixed before this number was treated as final. Next: population-scale GHA confirmation before promotion. | Population-scale confirmation via `solver-stress-refresh.yml`, then promotion to default-ON if the corpus-2 delta and cost hold — the same bar every other shipped mechanism this session met. |

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
already spot-checked as unaffected by the fix, but the *why* wasn't traced). The "verify the remaining
~175 unverified provenance candidates" item that used to sit here is now resolved by the 2026-08-19
fresh mining pass below (its own scope, methodology, and vocabulary superseded the original
connectivity-axis-specific 195-candidate list, whose exact contents no longer exist) — see "Residual
population, re-measured" below rather than treating this paragraph's number as current. Full detail:
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
`STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` — built, locally validated 1 of 2 targets recovered, then
PROMOTED to default-ON the same day on a clean population A/B (GHA run `32224200709`: corpus1
95/102 identical solved set, corpus2 819→828, **+9, zero regressions**; cost corpus1 nodes +22.5%/
work +12.4%, corpus2 nodes +23.0%/work +16.5% — comparable to the connectivity tier's own promoted
cost below) — but the durable process result from building it is the DEFECT it exposed in the four
tiers that came before it.** That prune shipped
default-ON on 611/1700 → 665/1700 (59 gained / **5 lost**), explicitly accepting its five losses
because nothing then existed to recover them. Three of the five have since been recovered by
unrelated work; `R02119`/`R02422` remain unsolved at the 819 baseline and were reported (at this
point in the investigation) to **both recover at HEAD with the prune off**, referee-valid, via
exactly the configs
[`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`](../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md)
named — **`R02422`'s own recovery does not reproduce; see the correction note in
[`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)'s `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY`
section, added 2026-08-19.** The tier as first written — a faithful copy of the connectivity tier — recovered
**neither**, and raising its reserve 4.5× changed only how long its *first* config ran (12.7s → 77.1s).

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
50M level-blind protocol. `R02422` still fails; the "needs 50,333,677 nodes alone" explanation
recorded here at the time does not reproduce under later re-verification (see the ledger's own
correction note) — its non-recovery is not a budget-starvation story after all.

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

**Residual population, re-measured (2026-08-19).** The original 195-candidate provenance mining
(above) was scoped to the connectivity-axis regression specifically and its exact candidate list no
longer exists as a scratchpad artifact. Rather than try to reconstruct it, ran a fresh, deliberately
broader pass: mine hint provenance for ANY (level, technique+config) pair that was cold-found by the
production solver (`classifyProvenanceSource === 'production-solver'`, `isColdCapabilityEvidence`) at
least 3 times with tight (≤5%) node-count agreement, across all 4 techniques (dfs/beam/repair/
admissible-order), not just beam. This found 781 total groups (172 "trivial", <50,000 median nodes;
**609 "real-tier"**, ≥50,000 median nodes — the scale comparable to `R02248`'s own shape). Directly
re-tested each real-tier candidate in isolation against current HEAD (production defaults, generous
1.5×-historical-median node budget): 199 raw failures.

**87 of those 199 were a script bug, not a regression**: the verify script's config-key builder
included the `template` field for `dfs` configs (correctly) but silently dropped it for `beam` configs
— so 87 `perimeterSweep`-with-`perimeterCW`/`perimeterCCW` candidates were re-tested against the WRONG
search (the template-less base profile) rather than the one that actually found the historical
solution. Excluding those, the remaining failures span 189 distinct levels. Cross-referencing all 189
against the already-computed population baseline (run `32224200709`, corpus2 828/1700 solved) found
**175 are still in the solved set** — i.e. some other technique/gate in the full `solveLevel()` ladder
recovers them today, which is exactly the job `STRATEGY_DEDUP_NEAR_TIE_RETRY` and
`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` were built for. This single cross-reference (no fresh
solving needed — the baseline was already computed) answers most of the original "residual population"
question directly: the shipped fixes generalize far beyond the 4 originally-named levels.

**The remaining 14 do NOT reduce to the script bug or ladder-recovery, and were confirmed via a second,
independent method.** Re-ran each through the actual `solveLevel()` entry point (not an isolated
config) at production defaults with a generous 40–60M node ceiling (4–14× the historical median that
used to suffice) — this is a strictly stronger test than the isolated-config probe, since it lets every
technique, gate, and both promoted recovery tiers compete for the win, the same way a real Play/Editor/
hint-discovery solve would. **All 14 still came back unsolved**, every one `nodeBudgetReached: true`
(budget-truncated at a very generous ceiling, not exhaustively proven mathematically unsolvable, but
well past what historically sufficed). Breakdown by originally-flagged technique: 9 beam-only
(`R01151`, `R01229`, `R02050`, `R02422`, `R02424`, `R02516`, `R02543`, `R02691`, `R02760` — all
`template: null`, so not subject to the script bug above, and beam is fully deterministic, so not
subject to repair's stochastic-search caveat either), 4 repair-only (`R00632`, `R02900`, `R03205`,
`R03329` — repair's search isn't fully deterministic even at `randomSeed: null`, per this session's
`seedSalt` finding, so these carry an extra grain of caution), and 1 both (`R02546`, flagged
independently by a beam config AND a repair config — the strongest single case). `R02422` matches this
session's earlier isolated single-config finding that it doesn't reproduce, now confirmed at the
population/full-ladder level too, not just in isolation.

**Partially root-caused (2026-08-19, same day): 5 of the 9 beam-only cases bisect to
`d87338d0f` ("Include portal levels in the reserved-intersection wall"), but a second, uncaptured
compounding factor remains.** Bisected `R02516` (10 historical finds) with `git bisect run` against an
isolated-config probe, using the exact commit SHA each historical find recorded in its own
`solver.version` field as the known-good starting point (no need to guess a range) — 567 commits, ~10
steps. First bad commit: [`d87338d0f`](https://github.com/gamesbyian/Pathfinder-Game/commit/d87338d0fbf9a5703264b0850d5453082d84e569)
(2026-07-31), which removed a `level.portalMap.size === 0` exclusion from `topology.ts`'s
`PRUNE_MC_RESERVED_WALL` reserved-intersection-wall check — intentionally, to close a real coverage
gap on portal-bearing must-cross levels (see the commit's own message). `R02516` is exactly the
targeted population: 10 portal pairs, 4 must-cross cells. Checked the other 8 beam-only cases for the
same shape (portals > 0 AND mustCross > 0): 4 more match (`R01229`, `R02424`, `R02546`, `R02760`); the
other 4 (`R01151`, `R02050`, `R02543`, `R02691`) have zero portals, zero must-cross, or one-but-not-
the-other, so this commit cannot be their cause — they need separate investigation. Directly toggling
`PRUNE_MC_RESERVED_WALL` off (production's own existing ablation flag, not a new mechanism) at HEAD on
all 5 matching levels **consistently moved node counts toward the historical value in every case**
(e.g. `R02546`: 300,564 → 313,436 vs. a historical 314,643 — within 0.4%) **but never fully reached
it, and none of the 5 solved.** That rules out "just disable the flag" as a fix.

**Second compounding factor found, and the combined picture is non-monotonic — NOT a clean two-flag
fix.** Re-bisected `R02516` a second time over the same range, this time with `PRUNE_MC_RESERVED_WALL`
forced off throughout (via the isolated probe's ablation config) to cancel out the first cause and
isolate the remainder. First bad commit: [`63270f5d5`](https://github.com/gamesbyian/Pathfinder-Game/commit/63270f5d5626cea00e42eac79b08328e9acda35e)
(2026-08-05), "Must-cross forced-neighbor deadlock" — step 2 of the same must-cross forced-structure
research sequence step 1 (`d87338d0f`'s reserved wall) belongs to, shipping `PRUNE_MC_FORCED_NEIGHBOR`
(default ON). Tested both flags, alone and together, on all 5 portal+must-cross beam-only cases:

| Level | baseline | wallOff | forcedNeighborOff | bothOff | historical |
|---|---:|---:|---:|---:|---:|
| `R02516` | 453,577 ✗ | 532,632 ✗ | 479,270 ✗ | 540,106 ✗ | 597,036 |
| `R02424` | 478,200 ✗ | 490,516 ✗ | 455,575 ✗ | 490,895 ✗ | 515,703 |
| `R02760` | 279,693 ✗ | 316,273 ✗ | **332,004 ✓ (exact)** | 341,580 ✗ | 332,004 |
| `R02546` | 300,564 ✗ | 313,436 ✗ | 265,168 ✗ | **308,259 ✓** | 314,643 |
| `R01229` | 206,794 ✗ | 243,974 ✗ | 217,080 ✗ | 246,227 ✗ | 285,212 |

Two of five (`R02760`, `R02546`) fully recover — but via *different* combinations (`R02760` only with
`forcedNeighborOff` ALONE, actually solving worse with both flags off than with one; `R02546` only with
BOTH off). The other three (`R02516`, `R02424`, `R01229`) don't recover under any combination tested —
a third factor remains for those. This non-monotonic, combination-sensitive pattern has the same
signature as `R02248`'s own root cause above (a beam fixed-threshold dedup/cull fragile to small
candidate-count perturbations in either direction) — plausibly the same underlying fragility, not a
new mechanism, but not confirmed. **Conclusion: no clean recovery-tier fix is apparent from this data**
(unlike `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`'s single-flag, monotonic recovery) — a retry tier
that tries flag combinations dead-last could recover 2/5 today but the pattern doesn't generalize
cleanly, and building one on this evidence alone would be premature given the threshold-fragility
precedent's own lesson (falsify against many stored solutions before trusting a derivation, not a
small hand-built sample).

**The 4 remaining beam-only cases root-caused (2026-08-20): NOT an accidental regression — accepted, documented collateral of a genuine soundness fix, not something to build a recovery tier for.** `R01151`, `R02050`, `R02543`, `R02691` (zero portals, so outside the portal+must-cross population above) were independently `git bisect`-confirmed (two full bisections, `R01151` and `R02543`, ~9 steps each against a 552-commit range, both landing on the *identical* commit) to trace to [`dd001dd5c`](https://github.com/gamesbyian/Pathfinder-Game/commit/dd001dd5c454af2d6f37648016c871f2ca11fa20) ("Fix beam dedup's key width instead of removing the mechanism", 2026-08-06) — a deliberate fix to a real bit-packing overflow in beam state-dedup's key (`search.ts`'s `sc`): the old key packed each constraint mask into a fixed, unmasked 4-bit shift slot, so any level with a must-pass/must-cross/flipper *count* over 4 (needing a wider mask to represent which of those cells are set) silently overflowed into the adjacent field, corrupting both. Confirmed structural, not theoretical, on 671 real stress-corpus-2 levels at the time. The fix replaces the packed integer with a delimited string key (`` `${key}|${sc}` ``), collision-free regardless of cardinality — and its own commit message already reports the expected cost: "3 previously-unsolved levels now solving... and 1 single-level flip attributable to normal search-order sensitivity rather than a systematic regression" on its 75-level validation sample. All 4 of these cases have at least one must-pass/must-cross/flipper count strictly over 4 (`R01151` mustPass=8; `R02050` mustPass=7 + flippers=6; `R02543` mustPass=5 + mustCross=7; `R02691` mustCross=3 + flippers=7) — exactly the population this fix's own key-width correction targets, and the two independent bisections confirm causation, not just a matching mechanic-count correlation. **Reverting or patching around this would reintroduce the real, confirmed overflow bug** (a strictly worse trade for an occasional lost solve to normal search-order sensitivity) — this population is closed as "explained, not actionable," not left open.

**Bonus finding: this same mechanism is a plausible, not-yet-confirmed THIRD factor for 2 of the 3 remaining portal+must-cross cases (`R02424` mustPass=6 + flippers=5; `R01229` mustPass=7 + mustCross=5 — both over 4) that neither `PRUNE_MC_RESERVED_WALL` nor `PRUNE_MC_FORCED_NEIGHBOR` (alone or together) recovers above** — both also exceed the dedup-key overflow threshold on a field independent of the two already-tested prune flags, a candidate for the "third factor" that section already flagged as missing. `R02516` (mustCross=4 exactly, not over) does **not** match this signature, consistent with staying unexplained by it. Not bisection-confirmed for `R02424`/`R01229` specifically — the two confirmed bisections were both on the zero-portal population, so this is a hypothesis from a matching signature, not yet independently verified the same rigorous way. The 4 repair-only cases (`R00632`, `R02900`, `R03205`, `R03329`) are unaffected by this specific finding — `dd001dd5c` only touches `beamSearchFromGate`, never repair's own search path — and remain fully un-root-caused, still carrying the stochastic-search caveat.

**`R02516` fully root-caused and closed (2026-08-20): a THIRD stacked prune, not a new mechanism — the same must-cross forced-structure sequence's step 3.** The "third factor" the two-flag table above left open for `R02516` turned out to be a third member of the *same* research sequence `d87338d0f`/`63270f5d5` belong to. Re-bisected `R02516` a third time using a full-ladder `Solver.solve()` probe (not the isolated-config probe the first two bisections used — see methodology note below) over `63270f5d5..HEAD` with both already-implicated flags (`PRUNE_MC_RESERVED_WALL`, `PRUNE_MC_FORCED_NEIGHBOR`) forced off throughout, to isolate the remainder. First bad commit: [`fb6f042f1`](https://github.com/gamesbyian/Pathfinder-Game/commit/fb6f042f1e58b74809fd5c7d696da89c8f9b2225) (2026-08-05), "Must-cross forced-first-move" — step 3 of the sequence, shipping `PRUNE_MC_FORCED_FIRST_MOVE` (default ON): when a gate is orthogonally adjacent to exactly one must-cross cell, the first move out of it is forced onto that cell (precomputed as `prep.gateForcedFirstStepKey`). `R02516` is single-gate, matching the mechanism's precondition exactly. Disabling all three flags together at HEAD fully recovers the byte-close solve (1,026,080 nodes vs. the historical 597,036-for-just-this-technique/1,025,028-total-ladder baseline — the ~1,000-node drift is unrelated commits between the original baseline and HEAD, not these three flags). Verified at the isolating commit (`63270f5d5` itself) too: all three off there also fully recovers, confirming the causal chain cleanly rather than relying on the HEAD reading alone. **Checked whether this third flag also explains the two other unresolved portal+must-cross cases (`R02424`, `R01229`, both also single-gate) — it does not**: all three flags off leaves both still failing (`R02424`: 7,500,141 nodes, `R01229`: 7,500,020 nodes, both budget-truncated), consistent with the existing separate `dd001dd5c` dedup-overflow hypothesis for those two (both exceed the mustPass/mustCross>4 threshold that hypothesis targets) rather than this mechanism. **Conclusion: `R02516` is not a bug** — three independently-shipped, individually soundness-verified must-cross forced-structure prunes (each passed its own soundness replay against stored solutions and `solver:bench --check`, which only covers the *published* corpus — `R02516` is stress-corpus-2, so this combination never surfaced there) stack together and jointly eliminate this level's one winning branch. Not something to build a recovery tier for on this single instance alone; closed as explained, matching the disposition already given to the 4 `dd001dd5c` cases above. **Methodology note**: the first two `R02516` bisections (recorded above) used an isolated-single-attempt-config probe, which turned out not to reliably reproduce the historical node counts even at confirmed-good commits (470,887 nodes vs. a historical 597,036, both with and without the ablation override) — because the provenance-recorded node count is the attempt's own contribution partway through the full ladder, not what an isolated replay of that one technique produces from a cold prep. The isolated probe still happened to find valid first/second bad commits (later confirmed identical to what the full-ladder probe would have found), but this was not guaranteed and should not be relied on again — **use a full `Solver.solve()`/`solveLevel()` probe for any future bisection**, never an isolated single-attempt-config replay, even though it's slower per step.

**The 4 repair-only cases: `R00632` found to be a false positive (2026-08-20), NOT a regression — a methodology gap in the capability-classification predicate itself, not just this one level.** Investigation began by mining each of the 4 levels' (`R00632`/`R02900`/`R03205`/`R03329`) full repair-technique provenance history — all showed near-zero-spread node counts across dozens of historical commits, confirming (consistent with this session's earlier `seedSalt` finding) that plain repair with no explicit seed is fully deterministic here too, same as beam. But `R00632`'s only recorded win used `solver.forcing.repairTurnBiased: true` — and `repairTurnBiasedAttempt()` (`attempts.ts`) is gated behind `STRATEGY_REPAIR_TURN_BIAS`, an opt-in, **default-OFF, "pending corpus-2 validation"** flag, per its own doc comment. `getAttemptConfigs(level)` for `R00632` at HEAD confirms this: the standard ladder's `repairConfigs` list contains only the plain and `repairMustTurnBiased` variants — `repairTurnBiased` never appears, because the flag that would add it is off by default. **The provenance schema has no field recording "an opt-in flag was force-enabled for this search"** — `HintSolverForcing.disabledFeatures` only tracks the opposite direction (default-on features deliberately disabled), so a find made by force-enabling a default-off experimental flag is indistinguishable, from stored provenance alone, from a genuine default-config cold find. `R00632`'s win was almost certainly produced by whatever offline exploration tooling was gathering the "pending corpus-2 validation" evidence `STRATEGY_REPAIR_TURN_BIAS`'s own doc comment references — never reachable by the default production solver, so its absence today is not a regression at all. **This same blind spot lives in the canonical `isColdCapabilityEvidence`/`classifyProvenanceClass` predicate** (`scripts/stress/provenance-classes.mjs`) that CLAUDE.md's Provenance section directs all capability-population work to use instead of hand-rolling a filter: it classifies an entry as `cold-capability` whenever `hintGuided`/`usedExistingHints`/inherited-witness are all false, with **no check for opt-in ablation-flag usage at all** — so any entry found under a force-enabled experimental flag currently passes as legitimate default-solver capability evidence. This is a broader finding than just `R00632`: any "regression" surfaced by comparing current HEAD against provenance-recorded history (the same technique this entire section 0 investigation uses) can produce a false positive whenever the historical find used an opt-in flag now default-off — worth a dedicated pass re-checking the 14-level Priority-0 population (and any future one built the same way) against `solver.forcing`/attempt-config fields that only exist behind opt-in flags, not just re-testing node counts. **`R02900`/`R03205`/`R03329`: a SECOND, more consequential classification blind spot found — likely never reachable via the real production entry point at all, at any commit.** Their most recent provenance entries use only default-reachable configs (plain repair, or `repairMustTurnBiased` on the two with must-turn landmarks), so they don't share `R00632`'s opt-in-flag explanation. But testing `R02900` at its own historically-recorded-good commit (`c96f57c853a13e96a565105995719e23cc95bd87`, where provenance shows a clean 4,173,171-node plain-repair win) via `Solver.solve(level, {})` — literally default production options, the actual public entry point, not an isolated technique call — **still fails after 623,952,854 nodes and 509 seconds**, three orders of magnitude beyond the recorded cost. Root cause: `classifyProvenanceSource` (`scripts/stress/solution-profile-lib.mjs`), the predicate CLAUDE.md's own Provenance section names as authoritative and which the original 609-candidate mining pass filtered on (`=== 'production-solver'`), classifies an entry as `'production-solver'` **whenever `entry.solver?.id === SOLVER_ID`** — a constant identifying "the real solver code produced this," completely independent of whether the call went through the full `solveLevel()` ladder or was an offline tool invoking one technique in isolation (e.g. a census/exploration script calling `runAttempt`/`repairSearchFromGate` directly). Both share the same `solver.id`. On a `needsRepairFallback`-eligible level — by construction, one where ordinary DFS/beam techniques have already proven insufficient — the main-loop tiers ahead of repair in the real ladder can each run to their own natural exhaustion under a generous/unbounded budget, and empirically do: 600M+ nodes of dead search before repair would even get a turn. An isolated call straight to the repair technique never pays that cost, which is almost certainly how `R02900`'s recorded 4.17M-node "production-solver" win was actually produced. **This is a more consequential gap than the opt-in-flag one**: it applies to any repair-fallback-gated level (not just ones exercising an experimental flag), and it means the "confirmed genuine regression" language for `R02900`/`R03205`/`R03329` (and by extension any repair-technique member of the wider 14-level population, or any future population built the same way) is unsupported until someone confirms the recorded win actually came from a full-ladder call — which for `R02900` it demonstrably did not. Not yet confirmed for `R03205`/`R03329` specifically (same mechanism plausible by the shared `needsRepairFallback`/repair-technique-provenance shape, not individually tested — the `R02900` check alone cost ~8.5 minutes of wall time, so budget accordingly before repeating it 2 more times). **This calls into question whether "repair-only" was ever a real regression category for this session's 14-level population** — worth flagging prominently before anyone builds a recovery mechanism targeting it. A trustworthy re-derivation would need `classifyProvenanceSource` (or a new predicate) to distinguish a full-ladder invocation from an isolated technique call — no such distinguishing field exists in the current schema, so this may require a new provenance field (e.g. recording whether the search was reached via `solveLevel()`'s own tier dispatch vs. a direct `runAttempt` call) rather than a read-side fix.

Scratch scripts (`scripts/tmp-stale-solve-mine.mjs`, `scripts/tmp-stale-solve-verify.mjs`, and all four bisections' probe scripts) were deleted after use, not committed — their logic and full results are captured here and in the local scratchpad. **Bisection methodology note, worth recording since it cost real time to discover**: the first `R01151` bisection attempt was silently corrupted by confirming the "good" endpoint via `git checkout <commit> -- .` (a partial working-tree update) rather than a full `git checkout <commit>` — that left newer untracked helper files (`scripts/attempt-config-key.mjs`, added in a later commit) mixed into the older checkout, producing a false-positive "solves fine" reading built on an inconsistent hybrid state, and the resulting `git bisect run` landed on a commit that provably touches zero solver source (a pure baseline-data regeneration commit) — a red flag that should have been caught sooner by checking `git show --stat` for `modules/`/`scripts/` changes before trusting a bisect result. Redone with clean full checkouts and a probe script with no dependency on any file added after the bisection's "good" starting commit (hardcoding the `AttemptConfig` object instead of importing the newer key-parser), which is what actually found `dd001dd5c`.

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

**Local pilot (2026-08-19, 30-level sample, before building any trigger): the starvation premise this lane leans on did not hold at the scale tested, and the participation that DID happen converted to zero solves.** Before designing a conditional trigger, checked whether the obvious free signal (`finalBadness`, already computed by `dfsFromGate`/`beamSearchFromGate` on budget-timeout, currently unused for allocation) actually correlates with repair-fallback's/diversity's own eventual promise — a prerequisite for a badness-conditioned trigger to be worth building at all. Sampled 30 currently-unsolved Corpus-2 levels (deterministic spread across the unsolved population) through `Solver.solve()` at a 10M nominal node budget (`deterministic: true`; actual total often ran to ~20M once the default-on last-resort retry tiers' additive extensions are counted, since those extend past the declared `nodeBudget` by design — see the retry-tier gotchas above). Results: **0/30 solved**; repair fallback got at least one attempt on **22/30 (73%)** — not the near-universal starvation an initial 4-level check suggested; attraction diversity ran on only **1/30**, matching the already-closed "flat participation" finding. Critically, **repair's own `bestBadness` was often far lower than the main loop's** (several single digits: 2, 4, 4, 8) — it gets close, then plateaus, matching this session's already-closed "plateau signature" characterization, not a signature of being cut off early. Because outcome had zero variance (no solves in the sample either way), no correlation between main-loop badness and repair's/diversity's promise could be measured — the question is moot on this sample: **participation isn't the bottleneck when 73% of levels already get a repair attempt and still convert none of them.** This argues against building the originally-conceived main-loop-badness-gated trigger, at least at this budget scale. Caveat: this is a 30-level local pilot at a 10M-class budget, well below the 50M reference this doc's own starvation numbers (515/603 repair-starved) are computed at — it does not by itself overturn that larger-scale figure.

**Technique census landed (2026-08-20, run `32240161854`, full detail in [`reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/)) and resolves the population-scale question the local pilot above deferred.** The census runs every technique in true isolation — its OWN full 50,000,000-node budget, no ladder, no shared pool — against all 879 currently-unsolved Corpus-2 levels, which is exactly the "budget starvation cannot be the explanation" control this lane needed. Result: even at the full isolated budget, `dfs:repair:repair` still hits the node cap on **750/879 (85.3%)** of unsolved levels without solving, converting only **13.5% (119/879)**. That is not a starvation signature — it is a genuine capability ceiling: giving repair MORE ladder budget cannot fix a technique that already had the entire 50M-node budget to itself and still failed 85% of the time. This directly corroborates the local pilot's "participation isn't the bottleneck" reading and extends it: the bottleneck isn't allocation at all, at any budget scale tested so far, it's repair's own search running out of room on this population. **Conclusion: close this lane's original "conditionally reserve more budget for repair-fallback" framing as not viable** — the lever that could still matter is a repair-search-quality change (a different technique inside repair, not more of the same one), which is a different, larger research question than budget allocation and outside this lane's scope as originally framed. Scratch diagnostic (`scripts/tmp-late-tier-badness-diag.mjs`) was deleted after use, not committed — its logic and full 30-row result are captured here and in the local scratchpad.

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

**Re-measured 2026-08-19** (local-only, no GHA spend — dispatched while two other GHA runs occupied the account's runner capacity): mined cold-only, production-solver-only hint provenance (`isColdCapabilityEvidence` + `classifyProvenanceSource==='production-solver'`, per CLAUDE.md's provenance-source discipline) across corpus-1 + corpus-2's 1,005 levels carrying at least one cold solver win, cross-referenced against TRUE repair eligibility (read directly off `getAttemptConfigs`'s own generated config list — `needsRepairFallback`'s real two-clause gate, not a hand-reimplemented `mustCross`/`mustPass` proxy, which undercounted eligibility by half by missing the mechanism-free high-`reqInt` clause and diluted the signal on a first pass).

**The split is real, not just a repair-eligibility confound, and sharper than the prior framing suggested.** Among the 550 TRUE repair-eligible levels: levels where `repair` is the ONLY cold-winning technique (215) have block-density median 0.077, with 33.5% below density 0.05; levels where `admissible-order` is the ONLY cold winner (35) have median 0.124, with only 5.7% below density 0.05. This asymmetry is NOT a ladder-race artifact in the `admissible-order`-only direction specifically: `repairAttempt()` is appended to the config list, and the admissible-order tier runs, strictly BEFORE the admissible-order tier in `solveLevel()`'s own ordering (repair always gets tried first on an eligible level) — so an `admissible-order`-only win is real evidence repair genuinely failed there in that run (repair was tried first and didn't short-circuit the later tier), not evidence admissible-order merely got there first. (The reverse, `repair`-only, is NOT symmetric evidence against admissible-order — repair winning first means admissible-order was never reached in that run, so its own distribution shows where repair succeeds, not where admissible-order would fail.)

**Proposed testable rule, predeclared before any A/B**: on a repair-eligible level with block density below ~0.05, do not change routing (repair already looks like the right first attempt there). On a repair-eligible level with block density above roughly the corpus's repair-only q3 (~0.12), give the admissible-order tier a larger/earlier share of budget relative to repair — e.g. an additive node reserve for admissible-order carved out BEFORE repair's own allocation, gated on `density > 0.12 && needsRepairFallback`, mirroring this session's own established "additive reserve, never subtracted from an unrelated tier's slice" pattern rather than reordering the ladder outright (reordering risks exactly the kind of budget-starvation regression this session's retry-tier work has repeatedly found). Keep the rule generic and mechanics-derived (density + eligibility only); never encode an exact winning level.

**Direct-tracing sanity check (2026-08-19, same day, local-only) found the reserve mechanism's case is weaker than the population correlation alone suggested — worth recording before anyone spends engineering time building it.** Before writing any new orchestration.ts reserve, three of the "admissible-order-only, repair-eligible, density≥0.12" levels from the measurement above were re-solved fresh through the real `solveLevel()` ladder (50M-node protocol, level-blind) to see whether they're actually starved:

- `R02434`: solves (`ok: true`, 62.66M total nodes) — but wastefully. 37.5M nodes are already spent by earlier tiers before the admissible-order tier even starts; its `default` profile then burns another 12.5M nodes and times out; only then does `none` solve it in a mere 157,457 nodes. This IS a real, concrete cost inefficiency (a near-instant solve arrives only after ~50M nodes of avoidable upstream spend) — but it is not a missed solve, since the level already solves under current production defaults.
- `R01251`: solves (`ok: true`, 7.65M total nodes) via an earlier tier entirely — the admissible-order tier never runs at all (`!result.solution` never triggers). This contradicts the stored corpus's own admissible-order-only classification for this level, the same kind of provenance/HEAD drift the `R02422` correction elsewhere in this session already found — not evidence of anything about admissible-order's current capability.
- `R00050`: solves (`ok: true`, 47.5M total nodes) via `default` succeeding cleanly within its own existing budget share (9,995,380 of roughly a 12.5M slice) — no starvation, no problem.

**Revised assessment: 1 of 3 direct traces shows a real cost-inefficiency signal, 1 shows stale corpus data, 1 shows no issue at all.** That is not strong enough evidence to justify writing a new production reserve mechanism yet — the sample is too small, and where the effect IS real (`R02434`), it currently looks like a **wasted-cost** story (an already-solved level spending far more than it needs to) rather than a **missed-solve** story. Do not build `STRATEGY_ADMISSIBLE_ORDER_DENSITY_RESERVE`-shaped code on the strength of this alone.

**Technique census landed (2026-08-20, run `32240161854`) and answers the deferred question directly — CLOSING this lane negative.** At the full isolated 50,000,000-node budget (no ladder, no shared pool, no ordering bias — the exact control the direct-tracing check above was missing), `admissible-order`'s entire contribution across all five `ida:*` configs is **6 uniquely-solved levels out of 879 currently-unsolved** (`ida:none` 5, `ida:intersectionHarvest` 1, the other three 0 — "unique" meaning no other of the 34 T1 techniques solves that level either, so these counts cannot overlap by construction). `repair`'s three configs uniquely solve **76** over the same population — roughly 13x more. The T3 pair-synergy data corroborates this from a different angle: `dfs:mustCrossFirst+ida:mustCrossFirst` (the most directly comparable head-to-head pairing) solves 48/200 sampled cells with **zero** "neither alone" — every one of those 48 was already reachable by at least one of the two techniques individually, so pairing them adds nothing a routing rule could capture. **Conclusion: even a full, uncontested 50M-node budget gives admissible-order almost nothing repair (or some other technique) doesn't already reach — the density-conditioned reserve this lane was built around would be routing budget toward a technique with a genuinely thin capability edge on this population, not a starved one.** Do not build `STRATEGY_ADMISSIBLE_ORDER_DENSITY_RESERVE`. See [`reports/stress/technique-census/32240161854/technique-capability-summary.md`](../reports/stress/technique-census/32240161854/technique-capability-summary.md) and [`pair-synergy.md`](../reports/stress/technique-census/32240161854/pair-synergy.md) for the full tables.

### 7. Cheap oracle-union solves the full ladder currently misses

The technique census's own headline "oracle union" stat — 246 of 879 currently-unsolved Corpus-2 levels solved by *some* isolated T1 technique at the full 50,000,000-node budget — undersells how actionable this population actually is, because it treats a level that needs the full 50M nodes the same as one that solves almost instantly. Splitting the 246 by the cheapest winning technique's node count (from [`combined-cells.json`](../reports/stress/technique-census/32240161854/combined-cells.json), restricted to the genuinely-previously-unsolved population per [`level-technique-coverage.json`](../reports/stress/technique-census/32240161854/level-technique-coverage.json)):

| solves within (nodes) | oracle-union levels (any technique) | …via a technique the ladder currently ROUTES to that level | …via a technique the ladder currently does NOT route there |
|---:|---:|---:|---:|
| 100,000 | 22 | 1 | 22 |
| 250,000 | 68 | 2 | 68 |
| 500,000 | 103 | 2 | 103 |
| 1,000,000 | 111 | 2 | 111 |
| 2,000,000 | 118 | 4 | 117 |
| 5,000,000 | 134 | 22 | 125 |
| 10,000,000 | 164 | 41 | 145 |
| 20,000,000 | 195 | 67 | 164 |
| 50,000,000 (all) | 246 | 112 | 190 |

("Routes"/"doesn't route" checked per (level, exact technique key) via `getAttemptConfigs(level, null)` — the same live-ladder-generator eligibility check the repair-specific finding below already used, generalized to all 34 T1 technique keys. A level can appear in both the routed and not-routed columns at a given threshold if it has independent winning configs on both sides.)

**111 of the 246 — 45% of the whole oracle union — solve in under 1,000,000 nodes, and at every threshold up to 1M the ladder-doesn't-route-this-technique column is essentially the WHOLE story** (111 of 111, vs. only 2 reachable through a technique the ladder already tries). This directly confirms the queue's own prediction: the cheap tail is overwhelmingly a *routing* gap, not a budget-starvation or search-quality gap — the winning technique needs a rounding error of any reasonable node budget, it just never gets invoked. The routed column only starts contributing meaningfully past 5,000,000 nodes (22 there, climbing to 112 at the full 50M) — that slower-growing column is almost entirely `dfs:repair:repair` running to completion inside its own eligible population (see the repair-specific breakdown below), a genuinely different, already-partially-working mechanism from the near-instant not-routed wins dominating the cheap end.

**Per-technique breakdown (from [`combined-cells.json`](../reports/stress/technique-census/32240161854/combined-cells.json)) identifies a SECOND, larger cheap-recovery layer distinct from repair: beam search at width 2000/5000 is never generated at all for a large chunk of the oracle union.** Splitting the winning techniques out individually: at ≤250,000 nodes the near-entire cheap tail is `beam:*@beam2000`/`beam:*@beam5000` configs (`perimeterCCW@beam2000` 27, `perimeterCW@beam2000` 27, `objectiveFirst@beam5000` 14, `intersectionHarvest@beam5000` 14, `harvestThenFinish@beam2000` 16, `mustCrossFirst@beam2000` 13, …) — `dfs:repair:repair` itself only reaches 11 levels by that threshold, well behind several individual beam configs. Checking `getAttemptConfigs(level, null)` directly against the ATTEMPT_POLICY source confirms why: **69 of the 246 oracle-union levels get ZERO beam configs of ANY width from the ladder, period** — the `f.mustPass === 0` "default, no must-pass" rule (`attempts.ts` line ~375) and the final catch-all `when: () => true` rule (line ~384) both build their attempt list purely from DFS templates + `PROFILE_ORDER` DFS profiles, with no `beam(...)` entry at all; a level only ever gets a beam attempt if it matches one of the earlier, narrower archetype rules (near-Hamiltonian, very-high-reqInt, must-cross-heavy, medium-high-reqInt, portal-heavy). Of those 69 zero-beam levels, **47 are solved within 1,000,000 nodes by some beam config** — 43 of them specifically by a not-routed beam technique. That is **47 of the 111 cheap oracle-union solves (42%) explained by this one specific, narrowly-defined gap**: a `mustPass === 0` (or otherwise non-archetype-matching) level with no must-cross/high-reqInt/portal signature simply never gets offered a beam search, even though beam is disproportionately effective on exactly this kind of open, unconstrained level. The remaining ~64 not-routed-but-cheap wins are mostly levels that DO get *some* beam config from their matched archetype rule, but not the specific width/profile that actually wins (e.g. a rule offers `beam:mustCrossFirst@beam2000` but the census winner was `beam:objectiveFirst@beam5000`, a WIDE-tier beam only ever added by the very-high-reqInt/must-cross-flipper-heavy rules). **This beam-routing gap is a separate, and on this evidence larger and cheaper, mechanism from the repair-eligibility gap below — worth its own follow-up (a `beam:objectiveFirst`/`beam:intersectionHarvest` probe added cheaply to the two beam-less default rules) once the repair work below is validated and shipped or shelved.** Not yet designed or tested; recorded here as the next queue candidate, not a shipped or in-flight change.

**SHIPPED (2026-08-20): `beam:objectiveFirst@beam5000` + `beam:intersectionHarvest@beam5000` added to all three beam-less rules — the two default rules above AND `portal-heavy` (`attempts.ts` line ~334, discovered as the DOMINANT contributor once investigated: 43 of the 69 zero-beam levels, via the same beam-less `profilesFirst()` helper, vs. 26 across the two default rules).** Two real implementation bugs surfaced and were fixed during validation, both worth recording since the failure mode in each case was silent (tests passed, only a live end-to-end `solveLevel()` run caught it):
- **Placement matters — the naive placements failed silently.** Appending beam right after the existing DFS templates left it completely unreached on hard levels: a template DFS attempt can burn its full ~20-30s allocated time slice (multiple millions of nodes) without concluding, and with only ~4 such attempts ahead of it the main loop's shared early-tier budget was already exhausted before index 4-5 — confirmed via a full attempt-by-attempt trace (0/25 sampled recoveries). Moving beam to lead the whole list fixed recovery (19/69) but introduced a new, serious cost regression: on the **published corpus**, beam now ran (and paid its own ~1-6 second cost) on every level matching these archetypes even when a template/profile would have solved it in single-digit milliseconds — measured directly (genuine same-commit worktree comparison, not the committed `solver-bench` baseline, which was 90 commits stale): 54.7s→106.3s (+94% wall time) with 66 of 160 published levels measurably slower, some by 6+ seconds, for zero change in the solved set.
- **The fix: place beam LAST, not first.** `orchestration.ts`'s `mainLoopLateReserve` mechanism (`MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`, currently 4) already reserves a protected node-budget slice for the *trailing* N configs of the attempt list, independent of what earlier configs consume — exactly the "guaranteed share regardless of what came before" property beam needed. Putting the two beam configs as the final entries of each rule's `build()` gets that protection on hard levels (still recovers previously-unsolved levels) while costing *nothing* on already-solving levels, since the main loop exits on first success and never reaches trailing configs at all. Re-validated after the fix: same-commit worktree comparison came back 54.7s→42.1s (published corpus, if anything faster, well within run-to-run noise) with 160/160 still solved, and the oracle-union recovery held at 20/69 (unchanged from the leading-beam version, confirming the reordering cost nothing in capability).
- **Full validation before commit**: `npx tsc --noEmit` clean; full `modules/solver` Vitest suite 402/402 passing (four pre-existing tests updated to assert the new — first template-only, then beam-last — ordering, since they previously encoded the old no-beam/beam-position behavior); `solver:bench --check` PASS (160/160, no regressions) plus the same-commit worktree cost comparison above; end-to-end `Solver.solveLevel()` (not just the isolated census attempt) run against all 69 previously-zero-beam oracle-union levels, 20 recovered through the real production ladder.

**Population-scale confirmation (2026-08-20, same day): full corpus-2 GHA refresh (`solver-stress-refresh.yml` run `32393579449`, dispatched on `main` @ `e021378b6` after merge) — net +20 (828→848/1700), matching the local 20/69 figure exactly, with the 1 loss root-caused, not left mysterious.** 21 gained (all 21 are among the local 20 plus one more the local end-to-end sample didn't happen to cover), 1 lost (`R02495`, a `portal-heavy` level, previously solved via `dfs:perimeterSweep/cornerHarvest`). Corpus-1 unchanged (95/102, exactly as expected — the fix is corpus-2-specific by construction). **The single loss traced (worktree A/B, `dd0243f08` vs. `e021378b6`, same generous settings both sides) to a real, understood side effect of the fix itself, not unrelated drift or noise**: `cornerHarvest` used to be one of `mainLoopLateReserve`'s protected last-4 `mainConfigs` (portal-heavy's pre-fix list ended in exactly the 4 DFS templates) and won cheaply (67,682 of its own nodes) once its guaranteed slice arrived; post-fix, the 2 new trailing beam configs push `cornerHarvest` two slots earlier, out of the fixed-size protected window, so it now competes in the unprotected early-tier pool alongside 12 other attempts and never gets reached before the budget is spent (100,000,152 nodes, still unsolved even at the workflow's generous 50M-declared/24h-non-binding settings). This is the same "adding a config silently un-protects whatever used to occupy the tail of a fixed-size reserve window" risk this codebase's own history already surfaced once (`STRATEGY_RETRY_TIER_NODE_STAIRCASE`'s "giving the first config the whole reserve is load-bearing" lesson in section 0 above), just at the opposite end of the list. **Accepted, not reverted or patched further**: `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` is a single global constant shared by every archetype rule, so growing it to avoid this one displacement would touch every other rule's scheduling too — far outside this fix's scope for a single-level trade-off — and a net +20 (21 gained / 1 lost) is a clean, understood win by this project's own established bar for population-scale changes (multiple prior mechanisms in section 0 were promoted on comparable or worse gain/loss ratios). Hints persisted for all levels touched (`persist_hints: true`, the workflow default).

**Follow-up SHIPPED same day: `beam:perimeterSweep/perimeterCW@beam2000` + `perimeterCCW@beam2000` added to the same three rules — a bigger opportunity than the original fix, found by re-mining the census for what the original fix still left unrouted.** Checking which cheap beam-technique census winners remained un-routed after the first fix found `beam:perimeterSweep/perimeterCW(CCW)@beam2000` alone accounted for 34 of the oracle union's not-yet-routed cheap wins — more than either WIDE config individually — with 29 of those 34 in the SAME three rules already patched (19 in the two default rules, 10 in `portal-heavy`; the remaining 9 `high-intersection-burden` + 3 `must-cross-heavy` cases are in different, untouched rules — recorded but out of scope for this pass). Added at the same trailing position, after the existing WIDE pair, so the reserve window is now 4 beam configs deep for these three rules (`objectiveFirst@5000`, `intersectionHarvest@5000`, `perimeterSweep/perimeterCW@2000`, `perimeterSweep/perimeterCCW@2000`).

**Validated with the same rigor as the original fix**: `npx tsc --noEmit` clean; full `modules/solver` suite 402/402 passing (4 tests updated — 2-config to 4-config trailing-slice assertions, since the fix genuinely changed which configs occupy the tail); `solver:bench --check` PASS (160/160, no regressions, cost if anything slightly better — 51,239,903 nodes vs. the prior 51,549,151); live end-to-end `Solver.solveLevel()` against all 29 newly-routed oracle-union levels: **29/29 recovered (100%)**. Not yet population-confirmed via GHA at time of writing — dispatched, result pending (this section will be updated once it lands). Given the original fix's own displacement precedent (a config exiting the protected reserve window when new configs are appended), a similar small collateral loss on corpus-2 is plausible here too and should be checked for, not assumed absent, once the population run completes.

**Next candidate identified but NOT started — meaningfully harder than the two fixes above, deliberately not rushed.** Re-mining the census after the follow-up fix shows the remaining unrouted cheap beam wins have shifted almost entirely to `high-intersection-burden` (spread across `beam:objectiveFirst@beam5000(diverse)` 12, `beam:objectiveFirst@beam5000` 12, `beam:harvestThenFinish@beam2000` 10, and several smaller techniques — 46 levels total) and `must-cross-heavy`. Unlike the two shipped fixes (three rules with literally zero beam, one clean gap), this population spans **four different existing archetype rules** (near-Hamiltonian, both very-high-reqInt variants, medium-high-reqInt), each of which already offers *some* beam configs — just not the specific winning variant on a level-by-level basis, and each level in the sample needs a different missing technique (checked individually: no single config addition covers more than a handful). These four rules also already encode specific, stress-corpus-derived tuning from this project's own history (e.g. near-Hamiltonian's beam-collapses-on-dense-walks finding, the diverse-beam-only-solves-must-cross-threading finding) — broadening them risks disturbing calibration that was earned the hard way, not a clean additive change like the zero-beam gap was. Needs its own from-scratch investigation (which rule, which specific configs, individually validated) rather than reusing this fix's pattern verbatim. Recorded here as the next lead, not started this session.

**Local verification (2026-08-20): 30/30 sampled cheap oracle-union levels confirmed missed by the full production ladder, 0 recovered.** The full planned sample (the 30 cheapest oracle-union levels, each ≤~116,000 isolated nodes) was run against the real `solveLevel()` ladder at current defaults with a 20,000,000-node declared budget — extended to 40–60M by the default-on retry tiers' additive extensions, so this is not a budget-size artifact. Every single one came back `ok: false` — a clean 100% miss rate with zero counterexamples across the whole sample, not just a majority pattern.

**Root cause identified for the dominant mechanism: `needsRepairFallback`'s eligibility heuristic is too narrow, not budget starvation.** Tracing individual misses found the ladder's own `getAttemptConfigs()` never includes ANY repair-family config for these levels in the first place — `needsRepairFallback` requires `mustCross ≥ 2 AND mustPass ≥ 3` (both, not either — a stricter reading than an earlier casual restatement of this rule elsewhere) or `isHighInt && reqInt ≥ 7`, and the sampled misses (`R00347`, `R01020`, `R02816`, `R03122`, `R03245`, …) satisfy neither clause. Quantified directly against the census data (no further live solving needed): of **158 currently-unsolved Corpus-2 levels where a repair-family config is a T1 winner**, **94 (59%) are not ladder-eligible for repair at all** under `needsRepairFallback` — the ladder structurally never tries repair there, regardless of budget or ordering. Of those 94, **18 solve in ≤1,000,000 nodes** (as low as 7,232 for `R00347`), confirming this is not a "repair would still fail slowly" population — these are cheap, clean wins the eligibility gate is simply excluding. (Admissible-order's own analogous gap — `ida:mustCrossFirst` solving `R01129` in 159 nodes — traced to the SAME shape of issue at the individual-profile level inside the admissible-order tier, but Priority 6 already established admissible-order's total addressable population is tiny (6 unique solves corpus-wide) — not worth pursuing separately from this repair-eligibility finding, which is ~13x larger.)

**Reproducibility checked and resolved (2026-08-20, same day): these are reliable, deterministic finds, not stochastic luck.** Extended from an initial 5-level spot check to a broad cross-repeat across the full 94-level gap population, cheapest-first, each re-run 3 times via its own isolated winning repair config (`dfs:repair:repair` or `dfs:repair:repair(mustTurnBiased)`) with no explicit seed override: **60 of 94 completed with every trial byte-identical (same node count, same solution) — zero mismatches** before the run was deliberately stopped rather than run to completion, because the remaining ~34 levels skew toward the most expensive in the population (up to the full 50,000,000-node cap; at repair's ~30,000 nodes/sec this means up to ~28 minutes per trial, ~84 minutes for one level's 3 trials) and would have cost several more hours of wall time for marginal additional confidence on top of an already-clean 60-level sample plus the original 5-level check (65 levels total, 100% clean). This is also expected on structural grounds, not just empirically: plain repair (no biased-variant, no multi-seed probe retry) never reads `Math.random()` or wall-clock time on this path (`repair-search.ts`'s own documented invariant), so byte-identical repeats are the predicted outcome, not a coincidence. The `seedSalt` stochasticity this session flagged elsewhere applies specifically to the repair-*probe* retry tiers' multi-seed widening, not an ordinary single repair attempt. The reproducibility caveat is closed for practical purposes; the untested ~34-level tail is not expected to differ but was not directly confirmed.

**Cost side is NOT yet resolved, and a naive threshold guess is the wrong next step.** `needsRepairFallback` is already true for 61.9% of the full 1,700-level corpus (1,053 levels) — repair eligibility is not rare today. The 94-level gap population is NOT cleanly characterized by mustCross/mustPass alone: many of the cheapest ineligible wins (`R01020`, `R02816`, `R03122`, `R03245`) have `mustCross = 0, mustPass = 0` — the SAME shape as thousands of other, non-repair-winning levels already correctly excluded — so a simple threshold widening (e.g. `mustCross ≥ 2` alone, or `mustCross ≥ 1 OR mustPass ≥ 1`) would sweep in a large population with no known relationship to repair's actual win rate there, diluting the signal and risking exactly the cost regression `needsRepairFallback`'s narrow gate exists to prevent (census: repair still hits the 50M-node cap on 85.3% of the broader isolated-unsolved population without solving — Priority 1's own finding).

**Matched-comparison feature analysis (2026-08-20, same day): a real but weak tendency, not a usable predictor — do not build a rule from this alone.** Compared the 94-level gap population (currently repair-ineligible, wins via repair in the census) against a matched control group — the 220 currently-ineligible Corpus-2 levels that do NOT win via repair — across `reqLen`/`reqInt`/grid-area/block-density/`mustCross`/`mustPass`/portal-count. Medians looked like a clean signal at first (`mustPass` 0 vs 5), but both groups turn out to share the same bimodal `mustPass` distribution (a cluster at 0, another at 5–8, no middle — likely an artifact of the stress corpus's own generation, the same shape portal-count already showed) and the actual separation is weak: 53.2% of the win group has `mustPass ≤ 1` vs. 47.7% of the control group — real but far too thin a margin to threshold on. Every other field (`reqLen`, `reqInt`, grid area, density, `mustCross`, portals) showed no meaningful separation at all between the two groups. **Conclusion: no single feature, or obvious pair, distinguishes "repair will win cheaply here" from the much larger population of currently-excluded levels where it won't** — this needs either a joint/multi-feature model (logistic regression or similar across the full feature set, not manual threshold-hunting) or a direct population-scale A/B on a broadened rule with real cost measurement, rather than more manual feature archaeology. Recorded here so a future pass doesn't have to re-derive that the obvious single-feature candidates don't work. **Do not widen `needsRepairFallback` on this evidence** — the eligibility gap (94/158, 18 cheap) is real and worth pursuing, but the "which levels specifically" question remains open.

**Architecture discovery (2026-08-20): production already has a cheap, bounded repair *probe* — but it shares `needsRepairFallback`'s single gate with the expensive 50,000,000-node fallback, and it is structurally the wrong shape to widen naively.** `orchestration.ts`'s `runRepairProbe` runs a fixed, node-capped repair attempt (`REPAIR_PROBE_ORDINARY_NODE_BUDGET` = 2,000,000, doubled to 4,000,000 via `REPAIR_PROBE_ORDINARY_SEED_SALTS`'s two salts; up to `REPAIR_PROBE_BIASED_NODE_BUDGET` = 6,000,000 more on must-turn levels) — exactly the kind of "small, bounded repair probe" this investigation was asked to evaluate. But it only ever runs when `repairConfigs.length > 0` (`orchestration.ts` ~line 2795), and `repairConfigs` is filtered straight out of `getAttemptConfigs()`'s output, which only contains a repair entry when `needsRepairFallback(f)` is already true — so the probe is invisible to the entire 94-level gap population, gated by the identical narrow rule as the furnace it's supposed to be a cheap alternative to. Simply widening that shared gate to make the probe reach more levels would repeat a regression this exact mechanism already shipped and had to fix: the probe runs *early*, before the main DFS/beam loop, **unconditionally on every solve of an eligible level, win or lose** — on a level where repair never succeeds, the probe still burns its full budget as "pure dead search every single solve" (the code's own words), confirmed on `R02401` costing ~10.7s of unconditional overhead per solve regardless of `repairBudgetFractionOverride: 0` (`reports/2026-07-17-attraction-diversity-dose-response.md`, fixed the same day). Widening the probe's *existing* early-position gate would import that same tax onto every newly-eligible level's *every* solve, not just its failures — the wrong place to add reach.

**Quantified cost/benefit of a LATE-position bounded probe instead (2026-08-20, no live solving — reused from the same T1 census cells, corpus-2's full population): the honest, full-population hit rate is modest, not a dramatic recovery, but the cost is structurally bounded to levels that are already failing.** A probe appended at the very END of the ladder — only reached after every other technique has already failed — has a fundamentally different cost profile from the existing early probe: a level that already solves via any other technique never reaches it, so it can never regress a level a player currently wins, regardless of budget size or how broadly it's gated. Measuring against the true target population (not just the 94 already-known repair winners, but literally every currently-unsolved, repair-ineligible Corpus-2 level — 314 of the 872 unsolved, the other 558 already being repair-eligible today) using each level's own isolated `dfs:repair:repair` T1 census cell as a stand-in for "what a late probe capped at this budget would do":

| cap | recovered (of 314 ineligible-and-unsolved) | pure dead search (full cap burned, no solve) |
|---:|---:|---:|
| 100,000 | 9 (2.9%) | — |
| 500,000 | 13 (4.1%) | — |
| 1,000,000 | 17 (5.4%) | — |
| 2,000,000 | 26 (8.3%) | 288 (91.7%) |
| 5,000,000 | 37 (11.8%) | 277 (88.2%) |
| 10,000,000 | 47 (15.0%) | — |

Restricted to just the 94 already-known repair-winning levels (the cherry-picked subset used everywhere else in this section), the same caps look far more favorable — 32/94 (34%) at 2M, 44/94 (47%) at 5M — but that framing quietly excludes the 220 ineligible levels repair never wins on at all, which is most of the true target population. **The honest, full-population number is an ~8–15% recovery rate for a 2–10M cap**, with the large majority of newly-probed levels paying the full node cost for nothing. Because of the late-tail placement, that "nothing" cost lands only on levels that were already reporting `unsolved` — a batch/regression-timing cost (a few extra seconds × up to 314 levels on a full corpus-2 sweep), not a player-facing regression on any level currently winnable — but it is a real, non-trivial cost that must be measured directly (not assumed away) before shipping, per this doc's own promotion contract.

**IMPLEMENTED (2026-08-20): `STRATEGY_REPAIR_LATE_PROBE`, a new opt-in/default-OFF last-resort tier (`orchestration.ts`), following the recommendation above exactly.** Appended dead-last — after `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY`, the current true end of the ladder — a single plain repair attempt (`repairAttempt()`, now exported from `attempts.ts`) is tried only when `repairConfigs.length === 0` (i.e. `needsRepairFallback` structurally excluded this level, the exact target population), capped at a flat `REPAIR_LATE_PROBE_NODE_BUDGET = 2,000,000` nodes — a per-attempt constant, not a fraction of `nodeBudget`/`timeBudgetMs` like the five whole-ladder-rerun tiers before it, matching `runRepairProbe`'s own existing flat-budget shape rather than the fractional-reserve shape those tiers use.

**A real budget-cap bug found and fixed before validation counted as final.** The first implementation derived the per-attempt node ceiling purely from the stacked-ceiling chain (`repairLateProbeNodeCeiling - nodesExpanded`) — sound when `nodeBudget` is finite and the preceding tier spent its whole reserve, but wrong otherwise: unused headroom left over by the preceding tier bled into "remaining room" (caught locally: one level's attempt spent 2,498,406 nodes against the declared 2,000,000 cap), and — more seriously — every ceiling in the stack collapses to `Infinity` when the caller's `nodeBudget` is `Infinity`, the actual production/interactive default, which would have left this tier's own cap **completely unenforced** in real use — precisely the "open the furnace" risk this design was built to avoid. Fixed by tracking the tier's own flat spend independently of the outer ceiling (`repairLateProbeEntryNodes`, `remainingNodeBudget = min(ownBudgetRemaining, outerCeilingRemaining)`), so the 2,000,000 cap now holds regardless of whether the overall `nodeBudget` is finite or `Infinity`.

**Validated end-to-end against the real production ladder, corrected-cap version:**
- `npx tsc --noEmit` clean; full `modules/solver` Vitest suite 402/402 passing.
- `solver:bench --check`: 160/160, byte-identical node count to the pre-repair-probe HEAD (51,549,151 nodes both times) — the tier is a confirmed strict no-op under production defaults (opt-in, never enabled).
- All 94 gate-excluded repair winners tested via `Solver.solve()` (not the isolated census attempt) with the flag on, at a generous non-binding `timeBudgetMs` (see the determinism note below for why that matters): **15/94 already solved by other tiers regardless of the flag; 20 net new recoveries (21.3%) specifically from this tier** (the 21st candidate found in an uncorrected pre-fix run, needing 2,498,406 nodes, now correctly fails under the enforced 2,000,000 cap — the intended behavior, not a regression). Every recovery referee-valid (`validateCandidatePath`). Spot-checked after the cap fix: the 4 re-tested recoveries came back byte-identical to their pre-fix node counts (confirming the fix changes nothing for attempts already well under the cap), and the one cap-violation case now stops at 2,000,019 nodes (a few nodes over from periodic budget-check granularity, not a fresh bug) and correctly fails.
- Zero marginal cost confirmed on repair-eligible control levels: isolating the flag's own effect (comparing `{}` vs `{STRATEGY_REPAIR_LATE_PROBE: true}`, not `null` vs non-null — see the determinism note) showed byte-identical `nodesExpanded` and `lateProbeRan: false` on every control level checked.

**A genuine, pre-existing solver non-determinism was hit and correctly diagnosed during validation — not a new bug.** An early control-level check showed non-reproducible `nodesExpanded` across identical calls; traced to the validation script's own gap (omitting `timeBudgetMs`, defaulting to the tight 30s value, which becomes the *binding* constraint ahead of a large `nodeBudget` on a slow level) rather than a solver defect — confirmed directly: 3 repeated calls with the default tight budget returned 3 different node counts, while 3 repeated calls with a generous non-binding `timeBudgetMs` (24h) came back byte-identical. This is the exact, already-exhaustively-documented mechanism in [`docs/solver-budget-determinism.md`](solver-budget-determinism.md) (3,713 mined repeat-run groups, 84.2% non-reproducing under a binding clock, up to 99,822× variance) — not a new finding, just a fresh instance of a known trap, caught and routed around in this validation's own scripts rather than requiring further investigation.

**Not yet done**: population-scale GHA confirmation (the local 94-level check is the complete target population for this specific tier, so 20 is expected to be close to the eventual `solver-stress-refresh.yml` corpus-2 delta, but — per this doc's own promotion contract — needs the same live dispatch-and-confirm cycle the beam-routing-gap fix went through before any promotion decision, or even before treating the local number as final). Still opt-in/default-OFF; zero production risk in its current state.

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
