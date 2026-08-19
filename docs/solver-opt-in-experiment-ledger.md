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
| `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` | **CLOSED — validated safe, not promoted; root cause identified** | 300-level stratified GHA A/B (250 repair-gated + 50 control, production 50M node budget, deterministic): 132/300 solved in both arms, byte-identical solved-id set — zero regressions, matching the local pilot. Fallback-loop participation rose 7x as designed (20/300 → 146/300 levels got ≥1 attempt), but **zero levels in either arm were solved BY the fallback loop specifically** (0/20 control, 0/146 treatment). A follow-up 30-level local slice with per-attempt telemetry explains why: 26/26 fallback attempts burned their entire allotted node ceiling (~337.5k nodes each, near-identical across levels) while stalled at `bestBadness` 10-43 — a plateau signature, not a starvation signature. This matches `docs/repair-search-stagnation-escape-plan.md`'s own multi-stage finding that plain `repairSearchFromGate` restarts "converge fast to a near-miss and then plateau for 85-99% of the entire budget" — a structural property of the technique, independent of how much node budget it's handed. That doc's four stages of dedicated fixes for this exact plateau (signature-conditioned penalties, path-relinking, exact-copy relinking, turn-aware biasing) already found no bounded local-search operator crosses it; the one that reduces badness meaningfully (`STRATEGY_REPAIR_TURN_BIAS`) still stalls at badness 2-5 and was itself separately closed negative (-7/1700 corpus-2). | None. The reserve mechanism is sound and safe (fixes real starvation, zero regressions) but the population it targets is bottlenecked by the plateau, not by budget — do not reopen without new evidence the plateau itself has moved (e.g. a working descent-aware probe per the stagnation-escape doc's one untried lever). |
| `STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE` | **CLOSED — validated safe, no local evidence of benefit; not promoted, no GHA spend** | Landed same day as and directly motivated by the repair-fallback reserve's close-out (protects the attraction-diversity pass, a full deterministic DFS/beam rerun, FROM the repair-fallback loop specifically — a priori more promising than that closed receptor since it isn't a plateau-prone randomized search). A 20-level local repair-gated sample was run at TWO budget scales (5M and 25M nodes) across 4 arms (neither flag / diversity-reserve alone / repair-fallback-reserve alone / both): solved sets were byte-identical in every arm at every scale (4/20 at 5M, 8/20 at 25M) — zero regressions, confirming the mechanism is sound. But diversity-pass participation stayed flat at 1/20 across both budget scales and both flag combinations (0/20 with the flag off), with zero diversity-attributable wins anywhere. Unlike the repair-fallback reserve's own pilot (which showed a stark 0→6 participation shift before its GHA run), this pilot showed almost no movement at two different scales — a real negative signal, not just insufficient budget. | None. Did not proceed to a GHA A/B: the local evidence doesn't support the starvation premise being the binding constraint for this population (most sampled levels appear to solve or fail well before ever reaching the diversity pass's own ceiling check, regardless of budget). Reopen only with evidence that identifies levels which actually reach the diversity pass's gate with room to spare yet still don't benefit, or a differently-targeted sample. |
| `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` | **CLOSED NEGATIVE, population-validated (2026-08-19)** | Targeted the documented R03148 starvation precedent (`reports/2026-07-30-admissible-order-node-reserve.md` §4: `'default'` runs first in the admissible-order tier and can consume the tier's entire reserve before `'none'`/`'mustCrossFirst'`/`'intersectionHarvest'`/`'nearClosureRescue'` ever get a node). Direct single-level tests on R03148 (20M nodes, matching the original report) confirmed the mechanism genuinely works: OFF reproduces the starvation exactly (`'none'` never runs); at the shipped starting fraction (0.15) `'none'` gets only 750K of the ~1.9-2M it needs and still fails; at fraction 0.40 `'none'` gets 1.91M and solves, matching the original report's own 1.97M figure. A targeted hunt for the OPPOSITE case — a level where `'default'` itself wins, drawn from 384 hint-provenance-identified `admissible-order`/`'default'` winners — found a real regression on the FIRST candidate tried: R02644 at 60M nodes needs `'default'` to spend 13.2M of its 15M undivided share to solve; at fraction 0.15, `'default'`'s ceiling shrinks to 12.75M and the level goes from SOLVED to unsolved, with the withheld 2.25M going to `'none'` (which does not solve it either) — a clean net loss. **The full-corpus GHA A/B this double-edged evidence called for was run 2026-08-19 (`32252988428`, `enable_flags=STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE`, fraction 0.15, vs the `32224200709` baseline): corpus1 95/102 unchanged; corpus2 828→824, 0 gained / 4 lost (`R00059`/`R01504`/`R02623`/`R03266`) — a clean net negative, settling the question the two single-level cases alone couldn't.** Neither `R03148` nor `R02644` appears in the actual flip set: `R03148` was already solved and `R02644` was already unsolved at this baseline independent of the flag, so both single-level findings, while real, don't directly explain the population result — the 4 real losses are a different, previously-unexamined part of the same double-edged population. Node/work cost essentially flat (-0.02%/-0.05%, noise) — this is not a cost story, just a pure solve-count loss. | None. Zero gains at population scale means there is nothing to build a recovery mechanism for (unlike this session's `STRATEGY_*_RETRY` tiers, each of which had real net gains worth protecting). The fix is simply staying default-OFF, which was already the case throughout — this A/B changed no production behavior, only the disposition of an already-opt-in flag. Reopen only with a materially different fraction or formulation, not a re-run at 0.15. |
| `STRATEGY_REPAIR_BEAM_SEED` | **CLOSED — sound and safe, but the apparent capability gain was an isolated-test artifact; no full-ladder benefit found** | The first genuine producer→receptor candidate/handoff mechanism this session (not a node-budget reserve): seeds repair's initial elite pool from a small, cheap beam search's surviving frontier, motivated by the 2026-08-13 stratified beam/repair producer-population pilot (25 levels, zero exact-prefix / zero metric-projection overlap — see `reports/2026-08-11-beam-repair-producer-population-pilot.md`). An isolated `repairSearchFromGate` counterfactual (n=13 plateaued repair-gated levels, matched 2,000,000-node budget, bypassing the full ladder) found what looked like a real win: 1 solve gained (R00701: stuck at badness 2 without, fully solved with), 0 solve losses, mixed badness elsewhere (4 better, 8 worse). Wired into the live ladder (`STRATEGY_REPAIR_BEAM_SEED`, `attempt-dispatch.ts`) and re-tested through the real `solveLevel()` ladder on the SAME 13-level sample at production-realistic budget (25M nodes): **R00701 was already solved by ordinary repair fallback with the flag OFF** — the isolated test's 2,000,000-node direct budget was far more constrained than the effective budget ordinary repair actually gets inside the full ladder (`REPAIR_EXTRA_BUDGET_FRACTION=6.0` plus unused main-loop room), so the "gain" never existed at the level that matters. Full-ladder result: 2/13 solved in both arms, byte-identical solved-id set, +3.5% total nodes for zero benefit. Badness data on the remaining unsolved levels was mostly unavailable and what little existed was mixed, no reliable signal. | None. Sound (zero regressions, well-tested: soundness/determinism/off-identical/mechanism-verification/budget-accounting all pass) but no capability benefit demonstrated at the resource envelope that actually matters. A concrete lesson for future producer→receptor work in this codebase: an isolated-technique counterfactual can look like a real win purely because it constrains the receptor's OWN budget more tightly than the real ladder ever would — always re-test through `solveLevel()` before trusting an isolated result, the same discipline the admissible-order-profile-reserve closure established from the opposite direction. Reopen only with a full-ladder-level positive signal, not an isolated one. |

## `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` (NEW, 2026-08-19 — PROMOTED same day)

**Disposition: PROMOTED to production default-ON (2026-08-19), the same day it was built.** GHA run `32224200709` (vs the `31918095910` baseline): corpus1 95/102 identical solved-ID set (zero change), corpus2 819→828 (**+9, zero regressions**) — `R02119`, `R02128`, `R02132`, `R02401`, `R02512`, `R02783`, `R02835`, `R02947`, `R03361`. Cost: corpus1 nodes +22.5%/work +12.4%, corpus2 nodes +23.0%/work +16.5% — comparable to (cheaper on corpus2 than) `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`'s own promoted cost. `R02422` did **not** recover in this population run. Re-verified directly (2026-08-19, post-promotion, see the correction note after the table below): the isolated-recovery claim in this section's own pre-promotion history does not reproduce at HEAD — it is not a shared-budget starvation issue. See `scripts/ablation-config.mjs`'s own comment for the same numbers. The rest of this section is the pre-promotion design/validation history, preserved as written except for that one correction note.

The fifth application of the "run dead last, additive-only budget" retry-tier pattern, and the fourth distinct double-edged mechanism it has been pointed at. Target: `PRUNE_MC_NEIGHBOR_BUDGET`, promoted default-ON 2026-08-12 on a strong level-blind population result (**611/1700 OFF → 665/1700 ON, 59 gained / 5 lost**) that explicitly accepted its five losses as "a small, bounded, already-understood cost" — because at the time no mechanism existed to recover them without giving back the 59 gains.

**Why the five losses are the right receptor.** [`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`](../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md) diagnosed four of the five to one clean mechanism: the exact deterministic beam attempt that wins under OFF is still tried under ON, runs to a similar node count, and fails — a bounded-width diverse-beam retention effect, not budget exhaustion and not the already-fixed repair-seed reindexing issue.

**What is confirmed at HEAD (2026-08-19).** Three of the five (`R00635`, `R02823`, `R02867`) have since been recovered by unrelated solver work and are solved at the 2026-08-16 capability baseline (run `31918095910`, 819/1700). The remaining two are still unsolved there, and **both recover at HEAD with the prune disabled**, level-blind, referee-valid, at the production 50M-node protocol — via exactly the winning configs the 2026-08-12 diagnosis named:

| level | winning config | nodes | work | referee |
|---|---|---:|---:|---|
| `R02119` | `beam:mustCrossFirst@beam2000` | 25,863,058 | 17,979,254 | valid |
| `R02422` | `beam:intersectionHarvest@beam5000(diverse)` | 50,333,677 | 63,440,947 | valid |

So the diagnosed mechanism still reproduces 8 days and ~95 Corpus-2 solves later, on levels the current ladder cannot otherwise reach.

**CORRECTION (2026-08-19, post-promotion): the `R02422` row above does not reproduce at HEAD, discovered while investigating why the promoted tier's own population A/B did not recover it.** A fresh isolated re-run of `beam:intersectionHarvest@beam5000(diverse)` against `R02422` with `PRUNE_MC_NEIGHBOR_BUDGET` explicitly disabled exhausts its own frontier naturally at 304,635 nodes (not 50,333,677) — and a direct trace of the same config running inside the actual promoted retry tier shows the same exhaustion point (304,932 nodes). The two numbers are functionally identical, which rules out the population A/B's own non-recovery being a shared-budget-starvation artifact: the config was never budget-constrained here, it simply does not solve this level from this state under current code. Whether the original 50M-node figure was a documentation/attribution error at the time, or a real fact that has since drifted because of unrelated solver changes made later in the same session, was not determined — it does not change the promotion decision, which rests on the independently-verified population A/B (run `32224200709`, +9/0 regressions), not on this one level's backstory. `R02119`'s own row is unaffected and separately corroborated by that same population A/B actually recovering it.

**Why the 59 gains are not at risk.** Structurally protected exactly as `R02644` was for `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` and `R03248` for `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`: a level that benefits from the prune already solves via the normal flag-on ladder, so the tier's own `!result.solution` guard skips it entirely. This tier never runs on a level that solved.

**The one structural difference from its four predecessors: a soundness-based eligibility gate.** `prune-gauntlet.ts` reaches `PRUNE_MC_NEIGHBOR_BUDGET` only when `state.mustCrossMask !== 0`. On a level with `prep.initialMustCrossMask === 0` the prune rejected exactly zero moves, so rerunning the ladder with it disabled is provably **bit-identical** to the ladder that already failed — waste, not a second chance. Gating on that is a soundness argument rather than a heuristic predictor, costs one field read at prep time, and skips **389 of the 881 unsolved Corpus-2 levels (44%)** outright.

This matters because the pattern's returns are decaying while its cost compounds: the four prior applications landed **+40, +45, +10, and 0** solves, and the third alone cost **+28.2% Corpus-2 nodes / +22.1% work**, because each tier stacks another additive ceiling on the last (at `nodeBudget` 50M a failing level already runs to 100M). The three shipped tiers each pay their full cost on every unsolved level, unconditionally. If this gate holds up at population scale, the same soundness-gate treatment is the obvious follow-up for reclaiming part of the cost those three already charge.

### The tier's first build was defective, and finding out why is the more valuable result

The tier as first written — a byte-faithful copy of `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` — **recovered neither target**. Both still failed at the tier's own 150M ceiling. Raising the reserve 4.5× changed nothing except how long the tier's *first* config ran (12.7s → 77.1s), which ruled out under-provisioning and pointed at budget division.

**The defect, measured.** `runGateSerialAttempts`/`runInterleavedAttempts` divide budget *between* configs in **work** units (`attemptBudgetShare` over `workBudget`), but treat the node ceiling as a single shared **absolute** cap with no per-config subdivision (`earlyConfigNodeBudget` defaults to `nodeBudget`, which switches the staircase off). Every ladder-rerun tier sizes its fresh work budget as `timeBudgetMs × fraction × DEFAULT_WORK_PER_MS` — and under the capability protocol `timeBudgetMs` is a deliberately **non-binding** 24h deadline (`deterministic=true`, [`solver-budget-determinism.md`](solver-budget-determinism.md)). The work pool is therefore ~2.9e11 units, the work-based division never bites, and the **first config runs until the tier's absolute node ceiling is gone**.

Per-attempt elapsed ms inside each tier on `R02119` (probe at `nodeBudget` 10M), before the fix:

| tier | per-attempt ms | configs given real time |
|---|---|---:|
| main loop | `10782, 473, 496, 482, 1561` | 5 / 5 |
| attraction-diversity | `685, 0, 0, 0, 0, 0, 0, 0` | 1 / 8 |
| `STRATEGY_DEDUP_NEAR_TIE_RETRY` | `10896, 0, 0, 0, 0, 0, 0, 0` | 1 / 8 |
| `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` | `21319, 0, 0, 0, 0, 0, 0, 0` | 1 / 8 |
| this tier (before fix) | `39602, 0, 0, 0, 0, 0, 0, 0` | 1 / 8 |

The main loop divides correctly only because it passes the **external, binding** work budget rather than a deadline-derived one.

**This is the same trap `CLAUDE.md` already documents for the admissible-order tier** — "those `timeBudgetMs` fractions are denominated in TIME, but what actually stops a level in a batch run is `nodeBudget`" — resurfacing at a different call site, in tiers written after that note.

**The fix (scoped to this tier).** Reuse the staircase the main loop's own late-reserve wiring already provides: `lateConfigStart = 0` makes every config a staircase step, and `earlyConfigNodeBudget` set to the cumulative node count at tier entry gives config *i* the cumulative cap `entry + reserve × (i+1)/N`. A config that has already blown past its step is skipped rather than starving the rest of the ladder. On `R02119` the tier's per-attempt profile became `5134, 5199, 2094` and the level **solved via `beam:mustCrossFirst@beam2000`** — the exact config the 2026-08-12 diagnosis named.

### Local validation result: 1 of 2 targets recovered

| level | protocol | result | winner | nodes | referee |
|---|---|---|---|---:|---|
| `R02119` | 50M node budget, level-blind, `deterministic` | **SOLVED** | `beam:mustCrossFirst@beam2000` | 112,613,177 | valid |
| `R02422` | same | still unsolved | — | 150,000,121 (ceiling) | — |

`R02422` was believed understood at this point in the investigation — its winning attempt reportedly needed **50,333,677 nodes in a single attempt** in the from-scratch prune-off solve, which a fair 8-way staircase over a 50M reserve could not have granted config #3 (~18.75M only). **That premise does not hold at HEAD — see the correction note above the results table earlier in this section, added 2026-08-19 after the population A/B's own non-recovery prompted a direct re-check.** The staircase-budget reasoning below was sound given the (incorrect) premise; it was never acted on regardless (the staircase was tried in general form and closed negative — see `STRATEGY_RETRY_TIER_NODE_STAIRCASE` below), so nothing built on this paragraph needs unwinding.

**That gate is now cleared** — see the promotion summary at the top of this section for the full-corpus A/B result. The reserve fraction (0.5) is calibrated to `R02119`, not re-tuned against the A/B; the population result above is what that fraction actually produces at scale.

### The follow-up this opened, and its closure

Generalizing the fix to the three **promoted** tiers and the attraction-diversity pass looked like the highest-value follow-up: they each pay a full ladder-rerun node reserve to rerun **one config**, so fixing their division would redistribute budget rather than add it. It was built as `STRATEGY_RETRY_TIER_NODE_STAIRCASE` and tested. **It is closed negative — see that flag's own entry below.** The short version: the "defect" turns out to be load-bearing.

## `STRATEGY_RETRY_TIER_NODE_STAIRCASE` (NEW, 2026-08-19 — CLOSED NEGATIVE, same day)

**Disposition: CLOSED NEGATIVE.** Opt-in, production default-OFF, retained for the record. Do not reopen in this form.

Applies `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY`'s per-config node staircase to the attraction-diversity pass and the two promoted whole-ladder retry tiers, so a non-terminating first config cannot consume the tier's entire node reserve.

**The mechanism works exactly as designed.** On a 14-level random sample of unsolved Corpus-2 levels (20M node budget, level-blind, `deterministic`), starvation was eliminated outright — `connRetry` coverage went `1/16 → 16/16`, `1/7 → 7/7`, `5/6 → 6/6`, and the sample-wide starvation rate went **21–29% → 0%**.

**The outcome is decisively negative anyway.**

| arm | population | result |
|---|---|---|
| gain | 14 random unsolved Corpus-2 levels | **0 solves gained** (0 → 0) |
| risk | **all 9** Corpus-2 levels whose retry-tier win came from config #1 | **8 of 9 LOST** — only `R02680` survived, at 50,261,345 nodes, byte-identical to run `31918095910` |
| cost | the 14-level gain sample | **+72.7% wall time** (1,918s → 3,312s) at **−1.4% nodes** |

The risk arm is the complete at-risk population, not a sample: 55 solved Corpus-2 levels used a genuine ladder rerun, and exactly 9 of them won on config #1. Eight of those nine now fail.

**Why: giving the first config the whole reserve is not an accident to be fixed — it is what produces these tiers' wins.** In these ladders config #1 is `dfs:perimeterSweep/cornerHarvest` (or `beam:perimeterSweep/perimeterCW@beam2000`), the single highest-value config, and the levels it rescues need 50–96M nodes to do it. A uniform staircase caps it at reserve/N and it fails; nothing later recovers the level. The +40/+45/+10 those tiers delivered came *through* the behavior this change removes. So the division defect is real as a mechanism and simultaneously load-bearing in effect — the two are not in tension, and measuring only the mechanism (coverage `1/16 → 16/16`) would have been badly misleading.

**The cost line is its own lesson**, and a textbook instance of `CLAUDE.md`'s standing warning that node/work counts are blind to what an operation *costs*: nodes fell 1.4% while wall time rose 72.7%, because the redistributed budget buys beam attempts instead of one long DFS. A node-only or work-only comparison would have scored this change as free.

**No promotion path in this form.** A variant that guarantees later configs a floor *without* capping config #1 would need a strictly larger reserve — i.e. more budget, not redistribution — which forfeits the only property that made this attractive.

**Consequence for `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` (above), stated plainly:** that tier applies the same staircase *unconditionally*, and this result says the staircase is neither free nor generally beneficial. It is kept there because without it that tier recovers **nothing** (both targets verified failing), and with it it recovers `R02119` — the difference between a useless tier and a working one. But its population A/B must price the same trade this closure measured: later-config rescues bought at the price of config-#1 rescues, plus a wall-time cost that node counts will not show.

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

**Post-promotion population evidence (2026-08-14): KEEP DEFAULT-ON — better evidenced than at promotion.** A three-arm A/B over the entire eligible Corpus-2 population (512 eligible + 50 control) measured turning this flag OFF at **190/562 vs 192 baseline: net −2** (gained `R02961`; lost `R02258`, `R02663`, `R02719`) and **+15.02% work**. Three levels depend on the flag, including both previously-claimed gains (`R02719` from the 300-level promotion A/B, `R02663` from the gate 10→6 sweep) plus `R02258`, which no earlier evidence had identified — now confirmed over essentially the whole affected population rather than a subsample. The correct disposition is to keep the flag and accept `R00408` as a known cost. **The Corpus-1 counter-evidence below stands as a real, fully-traced single-level loss, but the "just revert the flag" alternative it originally suggested is falsified.**

  Original Corpus-1 counter-evidence (2026-08-14): this flag costs one Corpus-1 solve. A matched
level-blind A/B at one SHA over all 102 Corpus-1 levels (50M nodes, non-binding deadline) gives
93/102 ON versus **94/102 OFF** — `R00408` solves only with the flag disabled, and no level solves
only with it enabled. The mechanism is traced end to end: `R00408`'s ordinary probe tier reports
`bestBadness = 13`, so the controller scales the biased tier to `max(0.35, 6/13) = 0.46`, cutting it
from 6,000,000 to ~2,769,231 nodes — and `dfs:repair:repair(mustTurnBiased)`, the biased attempt
itself, is the winning configuration. The prediction "high ordinary badness means the biased tier
will not help" is self-fulfilling here, because acting on it withdraws the budget that would have
falsified it; the level then burns the full 50M ceiling instead of solving in 9.97M. This does not
by itself make the flag net-negative — its Corpus-2 evidence is a real +1 — but the population
picture is now mixed (+1 on 300 sampled Corpus-2 levels, −1 across all of Corpus 1), and **Corpus 1
was never in any arm of this promotion or of the gate recalibration**: both A/B workflows hardcode
`--corpus=data/stress/stress-levels-random.json`, and `solver:bench --check`'s published corpus has
zero eligible levels. Corpus 1 has 12. See
[`../reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md`](../reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md).

- `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY`: **NEW, opt-in, default OFF (2026-08-14)** — the repair for
  the entry above. Re-runs each shrunk biased probe config at its FULL budget, but only after the
  main loop, repair fallback and attraction-diversity pass have all failed, so levels that solve
  elsewhere keep the shrink's saving and the recovery's cost lands only on levels already burning
  their whole ceiling. Confirmed on `R00408`: the recovery attempt consumed **5,965,490** nodes —
  byte-identical to the winning attempt's count in the flag-OFF A/B arm — and solved with
  `dfs:repair:repair(mustTurnBiased)`, finishing at 37,840,699 total nodes instead of exhausting
  50,000,224. Default-OFF is byte-identical to pre-change (`R00408` FAILED at exactly 50,000,171
  nodes), so the budget restructure is a strict no-op for every production path and existing A/B arm.
  **CLOSED NEGATIVE (2026-08-14).** Three-arm Corpus-2 A/B over the ENTIRE eligible population (all 512 repair-gated + must-turn levels, plus a 50-level ineligible control; 562/562 coverage, 492 producing a biased tier, deterministic, one SHA): **191/562 vs baseline 192 — 0 gained, `R00094` LOST, work +13.14%.** The loss is the predicted failure mode: the reserve withholds nodes from the main loop on every eligible level, and `R00094` needed them. Across both corpora it nets to zero solves (+1 `R00408` on Corpus 1, −1 `R00094` on Corpus 2) for +2.00% and +13.14% work. Do not promote; do not reopen by re-tuning the reserve — restoring budget is not the fix, the `repairSearchFromGate` plateau is (same closure reasoning as `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` above). Earlier per-corpus detail: Corpus 1 (all 102): 93→94, **+1 gained
  (`R00408`), 0 lost**, nodes −1.24% (the gain pays for itself: `R00408` finishes at 37.8M instead of
  exhausting 50M), work +2.00%. Corpus 2 (13 nominated levels): **7/13 both arms, 0 gained, 0 lost,
  work +18.9%** — the tier fired on all 6 failing levels at the full 6,000,000-node budget and none
  solved. Control reproduced the pre-change run byte-identically across all 102 Corpus-1 levels.
  So the mechanism is safe and correctly targeted, but gains exactly the one level it was designed
  against, and gains nothing on the Corpus-2 population chosen to be maximally favourable to it —
  consistent with the same `repairSearchFromGate` plateau that closed
  `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE`: a near-miss badness does not close just because the tier
  is handed more nodes. Promotion rules 2 (held-out family test) and 6 (full-corpus gained/lost IDs;
  13 of 1,700 is not a population) are unmet, and rule 4 is arguable — work rose in both populations
  for one solve. **A simpler alternative reaches the same Corpus-1 number**: turning
  `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` back off also gives 94/102, with no new mechanism
  and no added work; the recovery's only edge is preserving that flag's own Corpus-2 gain (`R02719`,
  300-level sample), which is unmeasured at population scale. Candidate population from run #40's corrected diagnostic: 13 Corpus-2 levels where the shrink
  fired and the biased TIER then missed within `biasedBestBadness <= 3` — note that is the tier
  failing, not the level: measured at 50M with the recovery off, 7 of the 13 already solve by other
  tiers, so only 6 are gain candidates and the other 7 are regression candidates.

A post-promotion [saved-artifact audit](../reports/2026-08-13-existing-solve-data-tuning-opportunities.md) found that direct repair yield falls from 18.4% at baseline `badness <= 5` to 0% above 20. It nominated a current-main matched sweep of `BADNESS_GATE=10,8,6` with `MIN_SCALE=0.35` fixed and explicit `repairProbe` tags. This is a calibration follow-up to the promoted adaptive controller, not a reopening of its default-on disposition.

**Resolved (2026-08-13)**: the nominated sweep ran as a 300-level stratified GHA A/B, the same sample/seed/budget the mechanism's own on/off promotion used. `BADNESS_GATE=8` and `=6` both gained the identical level (`R02663`) over the `=10` baseline with zero losses; `=6` strictly dominated `=8` on cost (nodes −0.7%/work −4.1% vs. baseline, vs. `=8`'s −0.5%/−2.1%). `REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE` promoted from 10 to 6 in `modules/solver/orchestration.ts` (`MIN_SCALE=0.35` unchanged) at the project owner's explicit direction. See [`reports/2026-08-12-repair-probe-early-main-loop-starvation.md`](../reports/2026-08-12-repair-probe-early-main-loop-starvation.md)'s "Gate/min-scale recalibration: GHA A/B" section for the full breakdown.

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

## 2026-08-13 existing-technique tuning campaign follow-up

> **Historical checkpoint; validity wording superseded by the 2026-08-14 audit immediately below.** In particular, ETT-010/011 are targeted diagnostics, not independently verifiable preregistrations or decision-bearing evidence.

A current-main level-blind campaign measured 23 complete arms plus one interrupted arm (484 level invocations / 1,877 internal attempts). Production admissible-order versus OFF finished 46/60 versus 44/60 across three disjoint exploratory published slices (three gains / one loss), demonstrating both complementarity and displacement on those samples. Two reserve-curve slices then put 0.15 at 27/40 versus production 0.25 at 26/40 with 8.2% less work; 0.35 had already matched 0.25's solved set at higher work.  A subsequently pre-registered mechanics-enriched pilot (`ETT-010`, protocol committed before execution) preserved 19/20 solves and reduced total work 12.6% at reserve 0.15 versus 0.25, but only 1/20 levels reached admissible order; it satisfies its escalation rule while remaining far too reach-sparse for promotion. A second pre-registered hard Corpus-2 pilot (`ETT-011`) reached admissible order on 20/20 levels but solved 0/20 in both arms; reserve 0.15 increased work 7.7% versus 0.25 and failed its escalation rule. This closes immediate 0.15 promotion and shows the response is population-dependent. **Validity/disposition:** the original ETT-001–009 manifest was reconstructed after execution, so those arms are targeted diagnostics, not decision-bearing A/B evidence. ETT-010 and ETT-011 were separately committed before execution and are decision-bearing pilots; their opposed cost results leave the disposition unchanged/double-edged. Do not run an unchanged broad 0.15/0.25 A/B next: the paired audit now identifies repair-stack eligibility as the leading interaction: 19/20 hard levels routed released nodes into repair and work worsened on 20/20. Confirm the sign reversal on pre-registered repair-eligible versus repair-ineligible mechanics strata before considering a conditional reserve; no immediate production change. Diverse-beam and repair-probe ablations remained reach-context nulls. See [`reports/2026-08-13-existing-technique-tuning-experimental-campaign.md`](../reports/2026-08-13-existing-technique-tuning-experimental-campaign.md).

### 2026-08-14 ETT protocol/work-budget audit

Post-merge audit downgrades ETT-010/011 from decision-bearing: their abbreviated protocol commits were
not preserved by a persistent GitHub ref/permalink. ETT-011 is also reclassified as node-budget
matched with work as an outcome, not equal-work enforced (19/20 levels in each arm exceeded the
nominal work value). The +7.7% work and repair-node transfer remain a useful targeted mechanism result,
but no promotion inference follows. Production remains unchanged; strict whole-solve work enforcement
is experiment-only. Generic reserve sweeps are paused pending explicit reach/progress telemetry and a
properly persisted matched repair-eligibility protocol.

#### Lifecycle telemetry checkpoint (2026-08-14)

`--lifecycle-telemetry` is now an opt-in, production-inert capability-sweep diagnostic. It records
technique eligibility/reach and explicit stop/skip/starvation states plus allocated ceilings and
available progress snapshots; the campaign validator rejects missing lifecycle fields. No treatment
arm was run in this batch. Validate the schema on a small no-treatment dry run before reopening any
routing or reserve comparison.

#### Lifecycle work accounting validated (ETT-014–016)

ETT-014 was invalidated by an ordering/eligibility classification defect; ETT-015 confirmed the fix;
ETT-016 confirmed that attempt work, lifecycle work, and level work agree exactly on 8/8 rows. Treat
all three as one instrumentation hypothesis family. No policy treatment or promotion evidence was
produced. Legacy work exceeded the declared pool on 4/8 rows, so future equal-work experiments must
use the opt-in strict whole-solve cap.

#### Strict whole-solve work diagnostics (ETT-018/019)

ETT-018 was invalidated: admissible-order did not check the experiment-only cap inside its DFS loop,
so strict and legacy were byte-identical while strict exceeded its nominal ceiling by up to 1.13M
work. After an opt-in-only admissible check and regression test, ETT-019 preserved 4/8 solves and cut
work 52.1% / nodes 33.6%; the substantial cuts were all on failures and mainly admissible-order.
Checkpoint overshoot was 298–1,072 units (validator tolerance 4,096). This validates the diagnostic
mode, not solve safety. No production change; next test must be held-out and balance later-tier winners
against earlier-tier controls under a persistent GitHub protocol ref.

#### Strict-cap winner retention (ETT-020, 2026-08-14)

A cold targeted phase-balanced diagnostic retained 8/8 historical winners under legacy scheduling but
only 6/8 under the experiment-only 400,000-work strict cap. Both losses (P00085, P00099) were
admissible-order winners; five early/repair controls and the cheaper admissible P00156 were retained.
Strict reduced work 28.5% and nodes 13.1%, with maximum checkpoint overshoot 1,788, but fails its
predeclared no-loss escalation rule. Close the current cap form; do not promote or run a population
A/B. The protocol was only locally frozen, so this remains targeted diagnostic evidence.


#### Comparison-role audit (2026-08-14)

The campaign aggregate formerly inferred treatment/control from artifact list order. That inverted the
ETT-018/019 strict-work labels (without changing their equal solved sets). Their post-run manifest
entries now explicitly identify legacy control and strict treatment, and the analyzer regression suite
pins direction for ETT-018 through ETT-020. New paired work must declare roles; never interpret delta
signs from filename/list order.


#### Corrected Phase-C sibling boundary (ETT-026/027)

ETT-026 was invalidated because absent canonical rows were treated as canonical failures. ETT-027
kept canonical status unknown and found historical solve-status disagreement in 8/11 symmetry parent
families at one 20s source run. Strongest sibling rates were R02795 5/7, R00156 and R02960 4/7, and
R02248 3/7. Treat these as four parent-family nominations, not independent sibling wins. A cold
current-main retest requires canonical plus all siblings, one persistent protocol ref, and no
production orientation retry proposal.
