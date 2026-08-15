# Solver future work

This is the detailed live evidence and disposition record. Historical reports remain authoritative for what they actually measured; this file preserves the current interpretation, experiment history, and closed boundaries.

> **Canonical short queue:** start with [Solver optimization: current priority queue](solver-optimization-current-queue.md). It ranks the current implementation/experiment lanes and is the handoff for agents choosing optimization work. This file retains the full evidence and historical numbering; where its older order conflicts with the short queue, the short queue wins.

Canonical measurement contract: [`solver-level-blindness.md`](solver-level-blindness.md). A solver-capability result must treat every level as unseen and may not use exact-level history such as saved winning configs/seeds, prior solutions/hints, previous solved status, or attempt caches. Saved artifacts remain research outputs and labels, not solve inputs.

Last reconciled: **2026-08-15**, through the matched 36M/50M capability pair, full-corpus lifecycle failure map, ETT-028 family-boundary analysis, flipping-filter CP-SAT support, and the latest repair-retreat probes. The ranked disposition is summarized in [the canonical solver-optimization queue](solver-optimization-current-queue.md).

## Current capability evidence

**Current level-blind capability (run #39, `31772083174`, 2026-08-14, commit `d425532ba`):**

- **Corpus 2: 731/1700** (55,089,123,267 nodes / 68,721,621,532 canonical work);
- **Corpus 1: 94/102** (804,866,761 nodes / 1,223,851,344 work);
- protocol: production defaults with blank `enable_flags` (all promoted flags at their real ON defaults), **50M node budget on both corpora**, 2 workers, `deterministic=true`, `persist_hints=false`, 24h non-binding deadline;
- full coverage (1700/1700 and 102/102), all 21 jobs succeeded, artifact-only (`solver-stress-refresh-combined`, ID `9209391122`).

This is the highest level-blind Corpus-2 figure recorded, and it resolves the open question left by the 635 sweep below: that drop was **not** a bad promotion. Raising Corpus-2's node ceiling from 36M to 50M more than recovered it, which is consistent with the budget-reallocation mechanism proposed in [`../reports/2026-08-12-main-loop-late-reserve-population-ab.md`](../reports/2026-08-12-main-loop-late-reserve-population-ab.md).

**It is a reference point, not a controlled delta.** Against the 635 sweep it changes node budget (36M→50M), worker count (1→2), and two days of `main`; against the 665 arm it additionally includes three flag promotions and the repair-probe wall-clock fix. Isolating the budget effect needs a matched 36M-vs-50M pair at one SHA — worth running, since it would say whether raising the ceiling further keeps paying.

**Matched pair, run (2026-08-15, run #41 `31852197672` @ `8865365` [50M] vs. run #42 `31855334991` @ `6065881` [36M]).** The two commits differ only in `scripts/stress/cpsat-full-probe.py` and `scripts/stress/repair-plateau-rollout-classifier.mjs` (offline research tooling, never invoked by the solve workflow) — verified zero drift in `modules/`, `scripts/` affecting the workflow, or `data/config/` via `git diff --stat` between the two SHAs, so this is a genuine matched pair despite not being literally the same commit. Both runs used the same protocol otherwise (2 workers, `deterministic=true`, `persist_hints=false`, `lifecycle_telemetry=true`).

| node budget | Corpus 2 solved | Corpus 2 nodes spent | Corpus 2 work spent | Corpus 1 solved |
|---|---:|---:|---:|---:|
| 50M (run #41) | 731/1700 (43.0%) | 55,089,123,267 | 68,721,621,532 | 94/102 |
| 36M (run #42) | 684/1700 (40.2%) | 41,274,098,638 | 57,447,568,354 | 94/102 |
| **delta** | **-47 (-6.4% relative)** | -25.1% | -16.4% | **0 (identical)** |

Raising the ceiling keeps paying: a 28% budget cut (50M→36M) costs 47 real solves, not a plateau — the ceiling is still binding on a meaningful slice of Corpus 2's hardest levels rather than most unsolved levels being genuinely stuck regardless of budget. Corpus 1 is unaffected in both directions (only `corpus2_node_budget` was varied), confirming clean isolation with no cross-corpus contamination. Consistent with the lifecycle failure map's own read at 50M (run #41): 0% `exhausted` on either corpus, meaning no unsolved level anywhere runs its search to natural completion — every failure is still budget-bound in some form (`capped` or `starved`), so there was no a priori reason to expect a shrunk ceiling to be free, and it wasn't. This does not by itself say whether pushing *past* 50M would keep paying at the same rate — that would need its own matched pair at a higher ceiling, not measured here.

**Corpus 1's 95→94 is diagnosed** (2026-08-14): `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`, promoted default-ON 2026-08-13, costs exactly one Corpus-1 level. A matched level-blind A/B at one SHA over all 102 levels gives 93/102 with the flag on and 94/102 with it off; `R00408` solves only with it off, and nothing solves only with it on. Mechanism: `R00408`'s ordinary probe tier reports `bestBadness = 13`, so the controller scales the biased tier to `max(0.35, 6/13) = 0.46`, cutting it from 6,000,000 to ~2,769,231 nodes — and the biased must-turn attempt (`dfs:repair:repair(mustTurnBiased)`) is precisely the configuration that solves the level. It then exhausts the full 50M ceiling instead of solving in 9.97M. Neither the flag nor the gate 10→6 change was ever evaluated on Corpus 1: both A/B workflows hardcode `stress-levels-random.json`, and the published corpus has zero eligible levels. Full writeup, including the corrected 5-of-12 shrink table: [`../reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md`](../reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md).

### Prior decision-bearing A/B (flag comparison, superseded as a capability figure)

The decision-bearing level-blind Corpus-2 A/B at 36M nodes / 48.24M canonical work per level, non-binding wall deadline, was:

- control: **611/1700**;
- revised `PRUNE_MC_NEIGHBOR_BUDGET`: **665/1700**;
- **+54 net, 59 gained / 5 lost**;
- Corpus 1: **94/102 in both arms**;
- treatment used ~3.94% fewer C2 nodes and ~5.33% less canonical work;
- zero attempt errors and zero deadline-truncated C2 rows.

The historical `725/1700` figure is **not** the capability baseline. It used exact-level `--prime-winner` replay. It remains useful as historical re-verification evidence only. Of the 114 levels present in that 725 result but absent from the 611 control, 112 had been `solvedByPrime`.

## Ready / next

> **Historical detail, not the ranked handoff.** Item numbers and completed gates are preserved for links and provenance. Use [the current optimization queue](solver-optimization-current-queue.md) for what to pick up next.

### 1. ~~Diagnose the five revised neighbor-budget losses and close the integration decision~~ — DONE, PROMOTED (2026-08-12)

**Status: complete.** `PRUNE_MC_NEIGHBOR_BUDGET` is now default-on. See [`../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`](../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md) for the full diagnosis and [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)'s updated row.

Four of five losses (`R00635`, `R02119`, `R02422`, `R02867`) share a clean mechanism: the same deterministic diverse-beam attempt that wins under OFF is still tried under ON, runs to a comparable node count, and fails — plausibly a bounded-width top-K retention effect (removing a genuinely-dead candidate from a fixed-width beam bucket's competition can displace a different, non-provably-dead candidate that was actually on the path to the true solution), mechanistically distinct from the already-fixed repair-seed-reindexing issue. `R02823` could not be reliably reproduced locally (see item below) and remains undiagnosed.

Promoted to default-on given: 0 regressions on the published 160-level corpus and corpus-1, a 7.4:1+ gained:lost ratio on corpus-2 (net +54/1700), and a residual cost that is now understood and bounded rather than open-ended. Optional, non-blocking follow-up: implement and validate a beam-width-scoped exclusion (analogous to the existing repair fix) to chase the remaining five losses — its own project with its own population A/B, not required for the promotion already made.

### 1b. Investigate worker-count solve-outcome sensitivity — RESOLVED, one gap accepted (2026-08-13)

**Status: fully resolved.** See [`../reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`](../reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md)'s "Corpus-scale directionality, resolved" and "Still open" sections (the originating report, [`../reports/2026-08-12-worker-count-solve-outcome-sensitivity.md`](../reports/2026-08-12-worker-count-solve-outcome-sensitivity.md), now carries a pointer to this resolution rather than restating it).

Originally a single-level oddity: `R02823` (one of the five neighbor-budget losses) failed to reproduce locally under both `--workers=4` and `--workers=1` sequential, yet solved cleanly when run completely alone. ~~That has now been confirmed as a corpus-wide, directional effect, not a fluke~~ — that framing is now known to be wrong. The corpus-wide 48-level gap (`STRATEGY_MAIN_LOOP_LATE_RESERVE` A/B's `workers=1` control run, 91/102 617/1700, vs. a same-code `workers=2` run the day before, 94/102 665/1700) was traced via the two runs' actual invoked commands (GitHub Actions job logs) to an **ablation-flag confound, not worker count**: the 665 run explicitly passed `--enable-flags=PRUNE_MC_NEIGHBOR_BUDGET`; the 617 run left `enable_flags` blank, reasonably but incorrectly assuming that flag's registry-only "promotion" (removing it from `OPT_IN_FEATURES`, with the runtime read site's opt-in convention left unfixed) already meant it defaulted on in production. It didn't — `normalizeAblationConfig(null)` short-circuits before ever consulting `OPT_IN_FEATURES`. This is the exact same wiring-gap class of bug documented in `docs/solver-opt-in-experiment-ledger.md`'s `STRATEGY_MAIN_LOOP_LATE_RESERVE` entry, not a new mechanism.

**A genuine, separate worker-count/contention bug was also found and fixed**: `runRepairProbe`'s wall-clock trip-wire was hardcoded to 30000ms, which a contended host could trip well before the probe's real node-budget-bound worst case — `REPAIR_PROBE_ATTEMPT_MS_CAP` (now `1_200_000`, `modules/solver/orchestration.ts`) fixes this and is already on `main`. This is real and worker-count-sensitive, but it was not the corpus-scale gap's cause.

**`R02823`'s single-level non-reproducibility — resolved (2026-08-13)**: it was this same wall-clock cap bug, not an execution-context/Node-version difference as originally speculated. Direct controlled test in the same sandbox that had previously always failed to reproduce the solve: current code (`REPAIR_PROBE_ATTEMPT_MS_CAP = 1_200_000`) solves it reliably and deterministically alone, byte-identical to the originating report's own figure (`9,308,917` nodes, `dfs:repair:repair(mustTurnBiased)`, two runs). Restoring *only* the old `30000`ms value flips the outcome to `node-budget-reached` (`36,000,066` nodes) in the exact same sandbox — a clean single-variable demonstration. The earlier local reproduction attempts in the wallclock report predate the fix, which is why they uniformly failed regardless of worker count or contention: the 30-second cap could bind even fully uncontended on a sandbox whose raw throughput happened to be below what it was implicitly tuned against. Full detail: the wallclock report's "Still open" item 1.

**Accepted gap, not pursued (2026-08-13, explicit project-owner direction)**: whether worker count has ANY measurable effect on corpus-scale solved-count once the ablation-flag confound is controlled for (same commit, same explicit `--enable-flags`/`--disable-flags` on both arms, workers as the only declared difference) remains an untested, well-posed question. Every A/B in this codebase that produced a real decision already pins the same `workers=N` across both compared arms, so nothing is blocked on this — it's accepted as permanently open rather than scheduled.

This still matters as a practice going forward: every solved-count figure in this codebase's solver research should record and match worker count as carefully as commit/flags/budget — not because worker count is confirmed to matter at corpus scale, but because it was never actually tested cleanly (every comparison that looked like that test turned out to also differ in ablation flags).

### 2. Expand exact CP-SAT labels around real score/width extinctions

**First batch complete:** 12 previous atlas abstentions → **7 dead / 1 live / 4 abstain**, with zero correctness/input alarms. All four abstentions are R00039 `unsupported-mechanics`; the one live R00001 witness is referee-valid.

The result strengthens the score-representation diagnosis: at least one R00001 sibling ranked first by the beam is CP-SAT-proven dead despite a known-valid continuation from the same parent.

Next: build a bounded informative same-parent sibling set adjacent to actual winning-lineage score/width extinctions and run it through `.github/workflows/cpsat-explicit-prefix-oracle.yml`. Keep `live`, `dead`, and `abstain` distinct. Use labels to test neutral future-opportunity descriptors before changing the production score or selection policy.

Do **not** rerun the original 12 unchanged.

**Second batch complete (2026-08-12):** 15 real score/width extinction decision points (10 A / 3 B / 2 D class, all distinct from the first batch) → 32 cases, 9 live / 2 dead / 21 abstain, zero correctness/input alarms after fixing an under-constrained multi-gate CP-SAT encoding bug found along the way (`cpsat-full-probe.py`). The mis-ranking pattern reproduced independently at 2 more A-class parents (S00001, R00104); it did **not** reproduce at any of 3 usable B-class rows (both branches exact-feasible there — a different failure shape); D-class got zero usable data. Coverage was bottlenecked by flipping-filter support in the CP-SAT model (9/15 levels abstained solely for that reason). See [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md). Justifies starting neutral future-opportunity descriptor work scoped to the A-class regime; B/D classes need more exact labels — **unblocked 2026-08-15**: flipping filters are now encoded in `cpsat-full-probe.py` (see [`reports/2026-08-15-cpsat-flipping-filter-support.md`](../reports/2026-08-15-cpsat-flipping-filter-support.md)), so the 9 previously-abstained rows can be re-run through the same pipeline — not yet done, next step for whoever picks up B/D-class exact labeling. (`mustCross` count was never a separate coverage limit — see that report's correction to the repair-retreat report's earlier "`mustCross >= 2`" framing.)

### 3. Exact repair-retreat CP-SAT checks — FIRST PASS + BROADENING BOTH COMPLETE (2026-08-12/13); mixed, population-dependent result

**Status: two rounds run, conclusion is that the answer depends heavily on which elites are sampled — not settled either direction.**

First pass (2026-08-12, [`reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md)): 3 resolvable elites (2 levels, large demonstrated rollback ~62-81 steps, diverge early from known solutions) all showed **zero exact slack** — the true minimum rollback equaled the demonstrated (known-trajectory) rollback exactly every time. Once a repair elite's trajectory diverges from every known solution, CP-SAT proved no exact completion exists even one step later.

Broadened sample (2026-08-13, same report's "Broadened sample" section): deliberately targeted the population the first pass explicitly flagged as untested — smaller demonstrated-rollback elites with `reqInt`/must-cross-heavy profiles. 2 of 4 candidates abstained (`unsupported-mechanics`, both `mustCross ≥ 2` — a real CP-SAT model coverage gap distinct from the known flipping-filter one). The other 2 resolved to the **opposite** finding: real, large exact slack (true minimum rollback of 1-2 steps vs. a demonstrated rollback of 27-29 steps — the heuristic proxy overestimated by ~25-27x on both).

**So the zero-slack finding does not generalize** — it was specific to the large-demonstrated-rollback population the first pass happened to sample. Elites selected by *small* demonstrated rollback appear to correlate with real, large slack near their own end (2/2 resolved cases), a directly opposite profile. n is still small (2 resolved each direction), so neither "always zero slack" nor "small-rollback elites always have slack" is established — the honest state is that this measures a real property that varies by elite/level characteristics, not a uniform constant.

**Decision-bearing next action**: none. The follow-on idea this raised — gating `closeLengthGap` on small demonstrated rollback — turned out not to be buildable (demonstrated rollback needs hints, which a live solve can't use under `solver-level-blindness.md`) and, more importantly, was tested directly anyway and found not to be the bottleneck: on `R00648` (one of the two real-slack cases above), `closeLengthGap` still fails to find the CP-SAT-proven completion even with unrestricted backtrack floor and a 500x node budget (2,000,000 vs. its production 4,000). 2,000 independent randomized rollouts from the same verified-feasible point also found 0/2000 solved, dying almost immediately every time. The diagnosis: this specific residual is a needle-in-a-haystack combinatorial pocket that neither of repair-search's own technique classes (randomized rollout, deterministic heuristic-ordered backtrack) is suited to — not a triggering, floor, or budget defect in the existing mechanism. See `reports/2026-08-12-repair-retreat-cpsat.md`'s "Why closeLengthGap doesn't already close R00648's gap" section. No further action queued on this specific thread.

**Follow-up, validated at population scale (2026-08-13): board obstacle density predicts repair-vs-admissible-order.** R03176 (repair-solvable) vs. R00648 (admissible-order-solvable, in only 223 nodes vs. repair's 1.86M) differed structurally: R00648 has 14 blocks and 0 must-cross; R03176 has 0 blocks and 5 must-cross — mechanically *more* loaded, yet *easier* for repair. Mining cold (non-hint-guided) hint provenance across Corpus-2 found 97 admissible-order/`'default'`-won levels and 205 repair-won levels — real population samples, no new solves needed. Admissible-order winners have a much higher `blocksFraction` (median 0.174 vs. 0.124 repair; 0.174 vs. 0.102 even isolated to the `mustCross=0` subset, removing the already-known must-cross-heavy routing confound) and almost never win on block-free levels (1% vs. 5% for repair). The hypothesis holds at population scale: board obstacle density, not raw mechanic count or overall difficulty, measurably predicts which technique class wins. Observational correlation, not a controlled intervention — see `reports/2026-08-12-repair-retreat-cpsat.md`'s "Testing the topology hypothesis at population scale" section for the full analysis. No solver-policy change proposed or implied.

### 4. Main-loop late-reserve full population A/B — RUN, CONFOUNDED, promoted anyway; direct sweep came back lower than expected (2026-08-12)

**Status: promoted to production default-ON at fraction 0.15. The A/B evidence was found confounded after the fact, and the direct full-corpus follow-up sweep came back lower than any individual reference point — plausible mechanism identified (a same-day repair-probe budget-timing fix interacting with node-budget-constrained batch solving), not yet confirmed.**

The frozen full-population level-blind A/B ran (all 4 arms `workers=1`, `deterministic=true`, full 1700/1700 C2 + 102/102 C1 coverage confirmed each arm): Corpus-2 solved control 617 → 0.05: 687 → 0.10: 692 → 0.15: 694. This initially looked like a clean win, but the control-vs-treatment comparison was later found confounded: the control arm's blank `enable_flags` left `PRUNE_MC_NEIGHBOR_BUDGET` OFF under its then-unfixed opt-in read site, while every treatment arm's non-null ablation object read it ON via the Proxy default-fallback — mixing a large share of that flag's own already-known +54 Corpus-2 effect into the gap. The unconfounded 687→692→694 treatment-vs-treatment trend still supports a real, smaller effect.

**Follow-up sweep (run #38, id `31630124558`, commit `ba5630978`), both flags genuinely default-on together**: Corpus-1 95/102, **Corpus-2 635/1700** — lower than the confounded 0.15 treatment (694) *and* the original neighbor-budget-only run (665, at `workers=2`), despite intending the same "both flags ON" configuration as the confounded 0.15 arm. The commit diff between that arm and this sweep isn't purely ablation bookkeeping — it also includes `2bfefc660` (a same-day repair-probe wall-clock fix, merged from `origin/main`) which lets a contended repair-probe attempt spend its full intended node budget instead of truncating early. Under the sweep tool's hard cumulative per-level `nodeBudget`, that plausibly leaves less shared budget for later tiers (including the late-reserve mechanism's own slice) — consistent with Corpus-1 (a more generous per-level budget) ticking up instead of down. Not confirmed as the actual cause. Full analysis: [`../reports/2026-08-12-main-loop-late-reserve-population-ab.md`](../reports/2026-08-12-main-loop-late-reserve-population-ab.md).

`scripts/ablation-config.mjs` no longer lists `STRATEGY_MAIN_LOOP_LATE_RESERVE` in `OPT_IN_FEATURES`; `MAIN_LOOP_LATE_RESERVE_FRACTION` in `modules/solver/orchestration.ts` is `0.15`. The mechanism remains a strict no-op without a finite `nodeBudget`, so this only affects offline batch tooling, not interactive Play/Editor/Review solves. **Open**: whether 635 is a stable production-capability figure or a budget-allocation-timing artifact from three same-day changes landing together; no dedicated follow-up dispatched yet.

**Follow-up (2026-08-12): the "repair-probe eats into the reserved slices" mechanism above is now known to be FALSE as stated.** Tracing `solveLevel`'s actual code shows both the admissible-order reserve and the main-loop late reserve are carved out of `nodeBudget` *before* `runRepairProbe` ever runs, and the probe's own external node ceiling (`mainLoopEarlyNodeBudget`) already excludes both — it is structurally incapable of spending into either reserve. What IS real, and directly confirmed on a local 12-level repair-gated Corpus-2 sample: the probe and the *early* (pre-late-reserve) main-loop configs share one **unprotected** pool, `mainLoopEarlyNodeBudget`, with the probe going first and taking whatever it needs (up to ~10,000,000 nodes with one biased tier) before early configs get a single node — on 7/12 sample levels the probe alone consumed the entire pool. A naive static shrink of the probe's budget is a real but zero-sum lever (1 gain, 1 loss on the sample: recovers a level whose winning config was an early main-loop one, breaks a level whose own solution required the probe's full budget). A live-signal-conditioned version — `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` (opt-in, default OFF, landed on `claude/repair-probe-starvation-diagnosis-963k6h`), which shrinks only the biased repair-probe tier's budget when the ordinary tier's own live `bestBadness` evidence shows no sign repair is close — gets a clean +1 on the same sample (1 gained, 0 lost), correctly leaving the probe-needs-full-budget level untouched. This is a single-signal, single-recipient pilot instance of online failure-conditioned allocation (see the "Online failure-conditioned control" note below), calibrated from n=12 (n=1 for the positive case) — needs its own population A/B before promotion. Full writeup: [`../reports/2026-08-12-repair-probe-early-main-loop-starvation.md`](../reports/2026-08-12-repair-probe-early-main-loop-starvation.md). The original 635-vs-694 corpus-scale gap remains only partially explained; this fixes a related, real, but distinct mechanism from the one originally hypothesized.

**Confirmed at larger scale (2026-08-13):** a 300-level stratified level-blind GHA A/B (250 of the 512 eligible + 50 control, real 50,000,000-node production budget — `.github/workflows/solver-repair-probe-adaptive-sample-ab.yml`, new workflow) reproduced the same zero-loss shape at 25x the sample size: control 108/300, treatment 109/300, net +1 (1 gained: `R02719`, 0 lost), nodes -1.5%, work -9.0%. Still short of a full-corpus A/B (the usual promotion bar), but real, positive, larger-scale supporting evidence rather than just the original small pilot. See the report's own follow-up section for the exact run ids and per-arm breakdown.

**Promoted to production default-ON (2026-08-13)** on this evidence, at the project owner's explicit direction — a deliberate exception to the full-population-A/B bar, recorded as such rather than glossed over. Registry + `orchestration.ts` read-site convention fix landed together (learning from the wiring-gap lesson `PRUNE_MC_NEIGHBOR_BUDGET`/`STRATEGY_MAIN_LOOP_LATE_RESERVE` both required above), with three new regression tests confirming activation under a genuinely-omitted ablation config. `solver:bench --check` is byte-identical on the published 160-level corpus (zero eligible levels there), so this has no effect on any interactive Play/Editor/Review solve — only offline batch tooling with a finite `nodeBudget`. See `docs/solver-opt-in-experiment-ledger.md`'s entry for the full record.

### 4b. Recalibrate repair-probe adaptive constants from tagged telemetry — PROMOTED (2026-08-13): BADNESS_GATE narrowed 10→6

The promoted adaptive controller kept all 12 direct repair wins, added a later beam solve on R02719, and reduced aggregate search work in the matched full-ladder A/B. The saved-artifact audit also found a strong yield gradient: 18.4% of levels with baseline `badness <= 5` were direct repair wins, compared with 1.6% at `16-20` and 0% above 20.

The next bounded experiment should keep `MIN_SCALE=0.35` fixed and compare `BADNESS_GATE` values 10, 8, and 6 against the promoted controller. Use explicit `repairProbe` attempt tags, the same immutable corpus, level-blind rules, and full-ladder outcomes. The historical replay nominates those gates; it does not validate them. See [Existing solve-data tuning opportunities](../reports/2026-08-13-existing-solve-data-tuning-opportunities.md) and the [repair-probe report](../reports/2026-08-12-repair-probe-early-main-loop-starvation.md).

**Local pilot run (n=12, `--node-budget=30000000`, same "repair-gated AND has mustTurn" eligible population the original mechanism's own A/B used):** zero flips at gate=8 and gate=6 vs. the gate=10 baseline (7/12 solved in all three arms), with a real, monotonic cost reduction as the gate lowers — nodes −1.1%/−2.2%, work −3.2%/−5.9% at gate=8/gate=6 respectively. An earlier n=30 attempt at `--node-budget=8000000` came back byte-identical across all three arms and was discarded as invalidated by its own budget: the probe's own worst case (~10,000,000 nodes) exceeded the external ceiling, so the *external* budget was the binding constraint everywhere, masking the gate's effect entirely — worth remembering for any future pilot on this mechanism.

`SolveOpts.repairProbeAdaptiveBiasedBadnessGateOverride`/`_MinScaleOverride` (`modules/solver/orchestration.ts`) and matching `--repair-probe-adaptive-badness-gate`/`--repair-probe-adaptive-min-scale` flags on `scripts/level-blind-capability-sweep.mjs` now exist so this sweep never needs to edit the production constant to test a candidate value. `.github/workflows/solver-repair-probe-adaptive-sample-ab.yml` gained matching dispatch inputs, reusing its existing eligible-population sampler.

**GHA A/B (2026-08-13), same 300-level stratified sample the original mechanism's own promotion used:** baseline (gate=10) 88/300 solved; gate=8 and gate=6 both 89/300 — the identical gain (`R02663`) over baseline, zero losses at either gate. Gate=6 strictly dominates gate=8 on cost: nodes −0.7%/work −4.1% vs. baseline, compared to gate=8's −0.5%/−2.1%. Full detail and run ids: the repair-probe report's "Gate/min-scale recalibration: GHA A/B" section.

**Promoted (2026-08-13)**: `REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE` narrowed from 10 to 6 in `modules/solver/orchestration.ts` (`MIN_SCALE=0.35` unchanged), at the project owner's explicit direction, on the same evidentiary bar (sample size, real production node budget) the mechanism's own on/off promotion used. `solver:bench --check` confirms zero effect on the published corpus (no eligible levels there) — only offline batch tooling with a finite `nodeBudget` is affected. No further action queued.

## Parallel observational work that remains valid

These do not need to wait for the late-reserve promotion decision provided they remain observation/offline only:

- winning-lineage analysis and exact-label expansion;
- dynamic crossing-slack / resource-frontier observation;
- family/variant boundary analysis;
- producer/receptor interoperability measurements;
- repair-retreat exact oracle work;
- symmetry diagnosis;
- solution-family and provenance analysis.

The preliminary [saved-data audit](../reports/2026-08-13-existing-solve-data-tuning-opportunities.md) turns this into a concrete queue. First fix the family reporter's bare-ID collision by keying `(parentCorpus, parentId, variantId)`; then run the deterministic report and current-main retest R00526, R01407, R01875, and R01675. Do not treat the historical siblings as proof that current main misses the same behavior.

Correlation is still not permission to prune or to alter the score. Any live policy must clear its own level-blind equal-work evaluation.

## Current research interpretation

### Score representation remains a stronger beam lead than tie handling or wider beam

Winning-lineage forensics found 15 failed score/width final extinctions: 10 clearly mis-ranked, 3 weak-margin, 0 exact-tie/stable-order, 2 width-saturation. The first CP-SAT labels now provide direct feasibility evidence for the same story. Continue exact labeling before implementing a secondary family reservoir/quota or a new score component.

### Dynamic future opportunity remains the main pruning/bounds gap

Static must-cross geometry added essentially no predictive power. `crossingSlack = freeInt - forcedFutureNeighbourRevisits` passed its read-only smoke with zero negative-slack soundness alarms. If this lane advances, prefer conservative state-conditioned completion interfaces over another static descriptor pile.

### State-conditioned must-cross anchoring remains open

The old `must-cross-horizon` attempt tested an unconditional form: give every must-cross level an extra `mustCrossFirst` pass with stronger urgency and satisfy the landmarks earlier. Disable-one ablation across 47 levels found zero contribution, so that attempt was removed. High-intersection evidence also shows why a universal rule is unsafe: some winning paths must initially move away from must-cross cells while constructing the geometry needed for later intersections. Do not revive the unchanged horizon pass or apply another global must-cross urgency increase.

A narrower question remains untested: during a cold solve, can current-invocation state decide which pending must-cross cell should serve as the next soft anchor, which should be deliberately deferred, and when guidance should switch from the cell to its perpendicular second-crossing approach interface? Candidate signals must be derived from the live puzzle/search state, such as remaining-step slack, crossing slack, visit/axis state, approach reachability, competing obligations, and bounded local completion patterns. Saved hints or historical must-cross orders may label offline diagnostics but may never choose the live target.

Start with a read-only or experiment-only diagnostic that compares the proposed target/defer decision with existing `mustCrossFirst`, `intersectionHarvest`, and default scoring on selected path prefixes. Escalate only if the distinction recurs across unrelated levels or held-out parent families, then test through the full level-blind ladder at matched total work. See [State-conditioned must-cross anchoring](solver-heuristic-capability-gap-analysis.md#state-conditioned-must-cross-anchoring-open-unconditional-form-closed) for the precise closed/open boundary.

### Repair still lacks a genuinely deep prefix-edit capability

Plateau penalty, soft recombination, exact relinking, and turn bias are closed in their current forms. The next repair question is exact retreat depth, not another append-only attraction tweak.

**CP-SAT-free rollout-escape proxy for "narrow trap vs. wide plateau" — closed negative (2026-08-15).** Tried to extend `reports/2026-08-12-repair-retreat-cpsat.md`'s R00648-vs-R03176 forgivingness finding to population scale without a CP-SAT oracle: a backoff ladder of blind rollouts from each level's own repair-elite dead ends (`scripts/stress/repair-plateau-rollout-classifier.mjs`). Sanity check against the same two levels (6 elites each, 150 trials/depth) found no reliable discrimination at 4 of 5 tested backoff depths — at the depth closest to the actual dead end, both levels show the same shape (most elites read near-zero escape, one high-outlier elite each), meaning the signal is dominated by which specific dead-end trajectory you sample, not level identity. See [`reports/2026-08-15-repair-plateau-rollout-proxy-negative.md`](../reports/2026-08-15-repair-plateau-rollout-proxy-negative.md). **Do not repeat this at population scale with the current CP-SAT-free method** — the tool is kept as infrastructure for a future version anchored on real CP-SAT-verified prefixes, which is real cost, not a shortcut past it.

### Online failure-conditioned control is still distinct from the closed cold-start portfolio scheduler

A bespoke ladder/scheduler should answer “given what this solve has already observed, where is the next unit of work most valuable?” It must use only current-invocation evidence, never exact-level historical winners. Do not revive the old broad cold-start portfolio unchanged.

## Closed / do not repeat unchanged

- original neighbor-budget wiring A/B: historical evidence only; superseded by revised wiring;
- revised neighbor-budget full population A/B: **complete**;
- first 12 explicit-prefix CP-SAT abstentions: **complete**;
- repair elite-prefix DFS current constants: closed negative (4/20 vs 5/20 equal-budget);
- repair turn bias: closed negative;
- portal parity envelope: closed negligible, zero rejects in ~240M nodes;
- plateau penalty: closed as built;
- recombination: closed/superseded as built;
- exact relinking: structural dead end as built;
- admissible-order LDS: closed negative;
- `must-cross-horizon` / unconditional early must-cross urgency: closed zero-contribution; this does not close state-conditioned target/defer guidance;
- old fast portfolio scheduler / broad cold-start variants: closed;
- residual-interface substitution lane: demoted after the cross-level inspection; do not build an operator without new independent mechanic-conditioned evidence.

## Infrastructure / hygiene

- `.github/workflows/solver-stress-refresh.yml` is now the canonical **level-blind capability** workflow.
- `scripts/level-blind-capability-sweep.mjs` projects source levels into a mechanics-only allowlist and structurally refuses exact-level historical inputs.
- `scripts/level-blind-capability-worker.mjs` receives no permanent level ID, corpus position, hint artifact, baseline, or prior-result input.
- Actions solve/combine jobs pin `github.sha`; never accept a mutable-branch checkout for a scientific A/B.
- Schema-v2 experiment manifests still compare the full workflow input set, but `prime_winner` is no longer a workflow dimension because the capability workflow forbids it.
- `persist_hints=false` + `deterministic=true` remains the correct matched-arm setting when multiple A/B arms must execute the same immutable SHA.
- The current malformed `logs/stress-corpus2-baseline.json` is not a solver input. The next complete non-deterministic level-blind refresh will regenerate it from a valid capability run.
- Historical emitter SHAs in older observational artifacts remain a provenance blemish; do not falsify them by rewriting to later commits.

## Remote execution order

> **Superseded sequencing record.** The list that previously lived here predated the 2026-08-15 lifecycle map and several completed gates. Use [Solver optimization: current priority queue](solver-optimization-current-queue.md#ranked-queue) for current ordering.

The highest-value remote production experiment is now a matched, equal-total-budget test of **failure-conditioned late-tier allocation**, informed by lifecycle telemetry and current-invocation signals rather than a static reserve. Exact-label work (the nine newly unblocked beam B/D rows and CP-SAT repair-retreat boundaries) and the ETT-028 canonical-inclusive cold retest can proceed independently. Serialize population promotion experiments whenever one result changes the production configuration used as the next control.

## Older loose-thread triage (2026-08-07)

Compatibility anchor for historical documents that linked to this section before the 2026-08-11 queue rewrite. The old loose-thread list has been fully reconciled into the current sections above and the opt-in experiment ledger. **Do not treat this heading as an additional backlog.** Follow the current queue and closed/do-not-repeat list in this file instead.

### Existing-technique tuning campaign (2026-08-13 follow-up)

> **Historical checkpoint; validity wording superseded by the 2026-08-14 audit immediately below.** In particular, ETT-010/011 are targeted diagnostics, not independently verifiable preregistrations or decision-bearing evidence.

The [current-main empirical campaign](../reports/2026-08-13-existing-technique-tuning-experimental-campaign.md) completed 23 of 24 arms and preserved 484 level rows / 1,877 internal attempt rows. Production admissible-order versus OFF produced three gains and one loss across 60 exploratory published levels. More importantly for allocation, reserve 0.15 solved 27/40 versus production 0.25's 26/40 across two disjoint slices while using 8.2% less work. A subsequently pre-registered mechanics-enriched pilot (`ETT-010`, protocol committed before execution) preserved 19/20 solves and reduced total work 12.6% at reserve 0.15 versus 0.25, but only 1/20 levels reached admissible order; it satisfies its escalation rule while remaining far too reach-sparse for promotion. A second pre-registered hard Corpus-2 pilot (`ETT-011`) reached admissible order on 20/20 levels but solved 0/20 in both arms; reserve 0.15 increased work 7.7% versus 0.25 and failed its escalation rule. This closes immediate 0.15 promotion and shows the response is population-dependent. **Protocol audit:** the manifest was reconstructed/extended after execution, so ETT-001–009 are not decision-bearing despite cold mechanics-only solves. ETT-010 and ETT-011 are decision-bearing pilots; their opposed cost results block promotion. The paired audit identifies repair-stack eligibility as the leading interaction: 19/20 hard levels routed released nodes into repair and work worsened on 20/20. Next, pre-register equal repair-eligible and repair-ineligible mechanics strata and require the work-effect sign to differ before considering a conditional reserve. Commit and hash the sample and protocol before dispatch. Explicit eligible/reached/starved/exhausted telemetry remains prerequisite for more routing work. Family boundary identity is now fixed to `(parentCorpus,parentId,variantId)` with an ambiguity failure and collision regression; regenerate/audit the wide report before more family solves. Do not spend a larger cap on the measured 0/20 hard slice until generic best-progress telemetry can distinguish slow progress from representation failure.

### 2026-08-14 campaign validity correction

The ETT-010/011 short protocol SHAs were not preserved on a persistent GitHub ref after PR #1372, so
those runs are targeted level-blind diagnostics, not independently verifiable preregistrations.
ETT-011 was node-budget matched, not protected by an enforced equal total-work ceiling: 19/20 rows per
arm exceeded the declared 1,333,333 units because repair/additive tiers sit outside the main-loop work
pool. See the campaign report's post-merge correction. Do not run another generic admissible-reserve
slice. First finish explicit reach/progress lifecycle telemetry and test the new experiment-only strict
whole-solve work cap; only then consider the matched repair-eligibility interaction. Future
decision-bearing protocols require a persistent GitHub ref, full SHA/permalink, hashes, commands,
timestamps, environment, and artifact digest before execution.

#### Lifecycle telemetry checkpoint (2026-08-14)

The level-blind sweep now has opt-in `--lifecycle-telemetry` with explicit eligibility, reach, skip,
starvation, exhaustion, deadline, allocation, node, and badness fields. The analyzer fails incomplete
telemetry-enabled artifacts. Run one 8–12-level no-treatment dry run before another routing/budget
comparison. Per-attempt canonical work remains intentionally unavailable (`actualWork: null`) and is
the next instrumentation task if the dry run shows it is needed for classification.

#### Lifecycle work-meter validation (2026-08-14)

ETT-016 closed the remaining telemetry gap: on 8/8 rows, per-attempt canonical work summed exactly to
per-technique lifecycle work and whole-level work. ETT-014–016 are one instrumentation-validation
family, not three tuning results. Small reach-enriched diagnostics may now use these fields, but any
equal-work claim must explicitly enable `strictTotalWorkBudget`; legacy additive scheduling exceeded
the nominal pool on 4/8 validation rows.

#### Zero-work dispatch classification (2026-08-14)

ETT-016 exposed one repair-fallback dispatch with a positive node allowance but zero inherited work;
it performed no search and was previously labelled timed-out. Zero-cap dispatches are now explicitly
budget-starved even though the technique was reached. Do not equate attempt presence with productive
reach; use actual work/nodes and starvation together.

#### Mass-weighted lifecycle failure map + canonical workflow wiring (2026-08-14)

`scripts/stress/lifecycle-failure-map.mjs` (`npm run stress:lifecycle-failure-map`) turns one or more
`--lifecycle-telemetry` capability artifacts into a corpus-wide allocation map: every unsolved row is
bucketed into exactly one of `starved` (a runnable technique never received a node), `capped` (reached
but neither starved nor exhausted its space), `exhausted` (every reached technique ran its space out),
`deadline-truncated`, or `attempt-error`, ranked by node/work mass rather than level count. A separate
per-technique census (instantiated/reached/starved/exhausted counts plus node/work share, computed only
over the unsolved population — solved rows stop the ladder early and so carry no starvation signal)
answers "which lane deserves the next unit of work" directly, rather than by proxy through the
per-attempt heuristics `cluster-unsolved-failures.mjs` infers (a different, complementary tool — this
one reads the explicit `techniqueLifecycle` record ETT-014–016 validated, not attempt-shape guesses).
It also reports the solved population's node-cost quantiles against the run's `nodeBudget`, as a
one-run *estimate* of budget elasticity (how many solves sit near the ceiling) — explicitly not a
substitute for a matched two-budget A/B, since internal reserves (main-loop late reserve,
admissible-order reserve, repair-probe adaptive shrink) are fractions of `nodeBudget` itself, so a
lower-ceiling run is not a prefix of a higher one.

`.github/workflows/solver-stress-refresh.yml` gained a `lifecycle_telemetry` dispatch input (default
`false`, matching the flag's existing opt-in convention): when true, both corpus solves add
`--lifecycle-telemetry` and the combine job runs the failure map against each combined benchmark file
separately (`reports/stress/capability-runs/<run-id>/lifecycle-failure-map-corpus{1,2}(-summary.md)`),
uploaded through the existing `reports/stress/` artifact glob — no new upload target needed. Corpus 1
and 2 are mapped separately rather than combined, since their `node_budget` inputs are independent and
the tool refuses to mix artifacts with different budgets (a per-corpus map is also what the allocation
question actually needs — the two corpora aren't one population).

The doc's own prescribed 8–12-level no-treatment dry run (above) is done: 12 Corpus-2 levels sampled
across the full id range, production defaults, 50,000,000-node budget, `--lifecycle-telemetry`, local
4-worker run. 3/12 solved; `techniqueLifecycle` populated and internally consistent on every row
(`repair-fallback`/`attraction-diversity` starved on every unsolved row that reached `repair-probe`,
consistent with the probe-eats-the-shared-pool mechanism `reports/2026-08-12-repair-probe-early-main-loop-starvation.md`
already documented). This was infrastructure validation at n=12, not a capability or allocation
finding on its own — superseded by the full-corpus run below.

**Full-corpus mass-weighted map — run (run #41, `31852197672`, 2026-08-15, commit `8865365`,
production defaults, 50M node budget, 2 workers, `deterministic=true`/`persist_hints=false`,
artifact-only).** The finding the dry run couldn't produce at n=12:

- **Corpus 2 (969 unsolved of 1700): 863 (89.1%) `starved`, 106 (6.2%) `capped`, 0 `exhausted`, 0
  `deadline-truncated`, 0 `attempt-error`.** Every unsolved corpus-2 level either has a mechanically-
  eligible technique that never received a single node, or ran without exhausting its search space —
  none genuinely ran out of things to try. `repair-fallback` is node-starved on 515/603 instantiated
  (85%); `attraction-diversity` is starved on 863/969 (89%) — both late-tier techniques essentially
  never run, because earlier tiers (`main-ladder`, `repair-probe`, `admissible-order` — all reached on
  100% of instantiated rows) consume the shared node budget first. 515 levels have both
  `repair-fallback`+`attraction-diversity` starved simultaneously; 26 have all three
  (+`admissible-order`, which is otherwise never starved but is *work*-starved on exactly those 26) —
  the genuine worst case. Solve-cost tail is heavy: of 731 solves, 109 cost >50% of the 50M budget, 62
  cost >75%, 13 cost >90% (vs. 0/94 above 90% on Corpus 1) — consistent with the already-documented
  36M→50M budget-raise recovery, corpus-2 solvability still meaningfully tracks the node ceiling.
- **Corpus 1 (8 unsolved of 102): 8 (100%) `starved`**, same shape at much smaller scale
  (`repair-fallback` starved 7/8, `attraction-diversity` starved 8/8). Solve-cost tail is much lighter
  (p95 19.9M/50M, 0 solves above 90%) — Corpus 1's ceiling is not the binding constraint the way
  Corpus 2's is.

**Reading this**: the corpus's current solve-rate ceiling on Corpus 2 is dominated by *which*
technique gets to run, not by search quality within techniques that do get to run — the "genuinely
searched and failed" population (`exhausted`) is empty. This directly names the next allocation
question (give `repair-fallback`/`attraction-diversity` a real, non-zero shot on more of the 515/863
starved population) as more promising than further tuning within `main-ladder`/`admissible-order`/
`repair-probe`, which already run everywhere they're eligible. **Not acted on here** — this is the
map, not a policy change; any live routing change still needs its own level-blind population A/B
(the exact bar `reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md`'s three-arm A/B
demonstrated is not optional, including checking Corpus 1 alongside Corpus 2 from the start this
time). Full per-corpus data:
`reports/stress/capability-runs/31852197672/lifecycle-failure-map-corpus{1,2}(-summary.md)` (GitHub
Actions artifact `solver-stress-refresh-combined`, run 31852197672 — not persisted to `main`, since
this run used `persist_hints=false`/`deterministic=true` as an artifact-only reference point).

#### Beam-extinction mechanics audit (ETT-017, offline observational)

All 19 existing score/width forensic rows were joined to mechanics. No mechanics tag predicted the
14 clearly-mis-ranked cases strongly enough to justify routing. Portal/crossing/large-grid tags were
instead enriched in the heterogeneous five-row weak-margin/width group, which is too small and lacks
parent-family identity. Next: a held-out, family-namespaced 8–12-level extinction-local cohort;
separate weak-margin and width-saturation, then test K versus 2K only at the observed boundary.

#### Corrected strict-work diagnostic (ETT-019)

On the targeted 8-level affected cohort, strict enforcement preserved 4/8 solves while reducing work
52.1% and nodes 33.6%; all meaningful cuts occurred on failures, mainly admissible-order. Maximum
checkpoint overshoot was 1,072 units, below the validator's conservative 4,096-unit tolerance. This
shows the experiment mode is active, not that it is solve-safe. Next strict-work test must be held-out
and balanced across later-tier winners and earlier-tier controls, with symmetric losses primary and a
persistent GitHub protocol ref. No production change.

#### Strict-cap winner-retention disposition (ETT-020)

The required phase-balanced diagnostic found a concrete solve-safety failure: at a 400,000-unit total
cap, strict mode retained 6/8 versus legacy 8/8 and lost two of three selected admissible-order
winners. It cut work 28.5%, but that saving removed productive late-tier work. Close this cap form and
do not escalate it to population scale. Before any different strict cap is tested, estimate the
representative legacy total-work distribution and predeclare a cost-matched ceiling under a
persistent GitHub protocol ref; otherwise the comparison confounds accounting semantics with a large
resource reduction.


#### Family-boundary identity restoration gate (ETT-021–023)

ETT-022's filename-only conclusion is invalid: a schema census found 63 family-result documents and 911 rows. The real blocker is that 0/911 rows has complete namespaced identity, and the largest 477-row artifact references an untracked combined source corpus. Do not spend compute on more variants. Build an auditable manifest/context migration with matched, unmatched, and ambiguous counts, require `(parentCorpus,parentId,variantId)` for every used row, then regenerate the boundary report. ETT-021 (ENOBUFS) and ETT-022 (filename false negative) remain invalidated; ETT-023 is the corrected audit.


#### Family identity migration result (ETT-024)

The corrected manifest join resolves 911/911 detected result rows uniquely (0 ambiguous/unmatched).
Next emit source-preserving namespaced rows and audit repeated edge measurements by commit/budget/run.
Only an explicitly selected, internally comparable row per edge may enter the boundary report. This is
input recovery, not family capability evidence, and does not justify more solver runs.


#### Source-preserving family migration (ETT-025)

The 911 observations represent 886 edges in 51 parent families; 25 edges repeat twice. One repeated
edge flips solve status across a 60s standalone run and a 20s later-commit run, demonstrating that
last-write/pooling is invalid. Define and record an internally comparable source-selection view before
boundary aggregation; retain all excluded rows and cluster results by parent family. No new solve is
justified by this migration alone.


#### Corrected Phase-C sibling boundary (ETT-026/027)

ETT-026 was invalidated because absent canonical rows were treated as canonical failures. ETT-027
kept canonical status unknown and found historical solve-status disagreement in 8/11 symmetry parent
families at one 20s source run. Strongest sibling rates were R02795 5/7, R00156 and R02960 4/7, and
R02248 3/7. Treat these as four parent-family nominations, not independent sibling wins. A cold
current-main retest requires canonical plus all siblings, one persistent protocol ref, and no
production orientation retry proposal.
