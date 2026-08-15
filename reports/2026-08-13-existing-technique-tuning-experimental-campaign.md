# Existing-technique tuning experimental campaign (2026-08-13)

> **Status (2026-08-14):** exploratory/targeted campaign; no production policy change and no independently verifiable decision-bearing experiment. **Evidence:** 28 experiment IDs, 33 arm-runs (32 complete and one partial), 556 level invocations, 2,500 recorded internal attempts, 164 unique levels, and 21 independent hypothesis families. Invalidated and partially invalidated runs remain in the totals. Machine-readable protocols and raw rows are in the [machine-readable manifest](experiments/2026-08-13-technique-tuning/manifest.json); per-arm technique reach/win/cost denominators are in the [derived aggregate](experiments/2026-08-13-technique-tuning/aggregate.json).

> **Current action handoff (2026-08-15):** this report remains the evidence ledger for ETT-001–028, not the active ordering. Use [Solver optimization: current priority queue](../docs/solver-optimization-current-queue.md), which incorporates the later full-corpus lifecycle map, matched 36M/50M run, CP-SAT coverage fixes, and repair-boundary results.

## Scope and evidence rules

I reconciled current main (`d8522b50`) with the architecture, level-blindness contract, opt-in ledger, future-work queue, variant plan, existing-data audit, recent merge history, and current orchestration/attempt/family/lineage/manifest tooling. All live runs used `level-blind-capability-sweep.mjs`: mechanics-only inputs, no IDs in workers, no hints, priming, cache, baseline, or saved status; one worker and a fixed deterministic policy. The published slice is a small population pilot, while Corpus-2 positions 1–20 are a fixed hard slice, not a population estimate. No repair badness-gate experiment was repeated.

## Current ladder and knob census

| Tier (order) | Eligibility / allocation | Profiles and principal constants | Telemetry | Current evidence and open question |
|---|---|---|---|---|
| repair probe | only policies carrying repair configs; before main loop | ordinary 2M nodes × salts `[0,1]`; biased total 6M; adaptive gate **6**, floor **0.35**, predicted split 75/25 | `repairProbe`, bias tags, nodes, badness, termination | Gate calibrated/promoted; do not reopen. Remaining question is trajectory/basin diagnostics, not a larger flat cap. |
| main DFS/beam | feature-policy first match; early pool plus 15% late reserve | hand-read archetype thresholds; beams 2k/5k; templates plus 12 profiles | config/profile/template/width, nodes/work/outcome | Ordering is explicitly hand-tuned. Winning-lineage evidence favors ranking/representation diagnosis over universal widening. |
| repair fallback | eligible repair configs after main loop | randomized repair, extra pass; optional 15% fallback reserve closed | repair/bias tags, badness, nodes | More flat reserve was safe but produced 0/146 fallback wins; plateau/operator question remains. |
| attraction diversity | eligible main configs late | full extra-budget fraction 1.0; optional 15% reserve closed | disabled-feature/config tags, nodes | Reserve pilot barely changed reach; reopen only with a reach-qualified population. |
| admissible-order | always has configs when tier enabled; protected 25% of total nodes | fraction 1.0 per profile; order default→none→mustCrossFirst→intersectionHarvest→nearClosureRescue; profile reserve prototype 15% is closed double-edged | `admissibleOrder`, profile, termination, nodes | Production tier is genuinely marginal in this pilot; profile allocation remains under-tested but must balance default and non-default winners. |

Constants deliberately calibrated include the repair adaptive gate/floor, the 15% late reserve, and promoted neighbor-budget prune. Historical/hand-tuned items include archetype thresholds, profile order, 2k/5k widths, many scoring weights, repair seed counts/splits, and the admissible profile sequence. The source comments document several narrow calibrations, but there is no population response surface for those historical values.

## Experiment inventory and methods

The manifest reconstructs the question, non-duplication rationale, arms, selection, budget, primary/secondary outcomes, and stopping rule for ETT-001–013. It was created after the first runs and subsequently extended after follow-ups; therefore it does **not** prove that these protocols were frozen before execution. ETT-001–009 are classified as exploratory targeted diagnostics, even though their solver invocations respected the level-blind input boundary; ETT-010 and ETT-011 were initially described as pre-registered decision-bearing pilots, but the post-merge audit below supersedes that description: their protocol commits are not independently resolvable. ETT-001 is a three-arm budget curve. ETT-002–004 are matched full-ladder ablations against its 300k arm. ETT-005 is a hard-slice budget/saturation test; ETT-006 repairs the family-identity validity blocker; ETT-007 is the disjoint admissible allocation confirmation; ETT-008 is its second disjoint validation; ETT-009 is a medium disjoint population check. ETT-010 through ETT-013 had local protocols committed before execution, but none has the persistent GitHub ref/permalink needed for independent verification. Sparse ablations were checked against the current proxy semantics; only the named flag differed.

`scripts/analyze-technique-campaign.mjs` reproducibly derives, for every arm, total levels, solves,
nodes, work, attempt count, and technique-specific attempts, levels reached, direct wins, nodes,
elapsed time, and win rate given reach. This avoids quoting winner counts without their reach
denominator and keeps the committed raw JSON compact (one JSON document per file, not pretty-printed
thousands of lines).

## Protocol-validity limitation

The original campaign manifest was not committed or cryptographically frozen before the live runs.
Statements such as “fixed before run” are operator recollections, not independently auditable
pre-registration evidence. The positional published slices are also convenience samples, not
mechanics-stratified population samples. Consequently:

* all ETT-001–009 results are exploratory targeted diagnostics;
* their cold mechanics-only invocation establishes that hints/history did not enter each solve, but
  level blindness alone does not make sample selection or hypotheses decision-bearing;
* the retrospective 0.15 reserve signal cannot support promotion; ETT-010 and ETT-011 provide targeted positive-cost and negative-cost mechanism evidence described below; and
* the next medium-scale run must commit a manifest before execution, hash the mechanics-selected sample, and keep
  workers, budgets, unrelated flags, and stopping rules frozen.

## Exact results

| Experiment / arm | Levels complete | Solved | Internal attempts | Total nodes | Median level nodes | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| ETT-001 100k | 20/20 | 20/20 | 76 | 471,714 | 11,612 | same solved set, lowest measured nodes |
| ETT-001 300k | 20/20 | 20/20 | 55 | 898,483 | 14,269 | control for ablations |
| ETT-001 900k | 20/20 | 20/20 | 32 | 1,318,999 | 10,673 | fewer attempts but 2.80× 100k total nodes |
| ETT-002 diverse beam OFF | 20/20 | 20/20 | 55 | 898,483 | 14,269 | byte-equivalent aggregates; technique not reached/marginal here |
| ETT-003 repair probe OFF | 20/20 | 20/20 | 55 | 898,483 | 14,269 | byte-equivalent aggregates; technique not reached/eligible here |
| ETT-004 admissible order OFF | 20/20 | 18/20 | 55 | 1,018,415 | 14,269 | loses P00106 and P00110; both control winners `ida:default` |
| ETT-005 500k | 20/20 | 0/20 | 105 | 10,002,980 | 500,188 | every row exhausted; no evidence of usefulness at this scale |
| ETT-005 1m | 20/20 | 0/20 | 105 | 20,002,181 | 1,000,117 | complete; doubling budget added no solve |
| ETT-005 2m | 16/20 | 0/16 | 85 | 32,002,886 | 2,000,226 | invalid for paired curve (incomplete); same exhaustion signature |

ETT-001's counterintuitive cost curve is allocation-sensitive: a larger ceiling changes attempt caps and lets earlier attempts spend more, even though every arm solves the same 20 levels. It does **not** establish that 100k is globally preferable; the slice is easy and all 20 are censored by success. It does establish a useful low-budget control population and warns that “fewer attempts” is not “less work.”

ETT-004 is the clearest mechanism result: the admissible tier contributes 2/20 marginal solves at 300k (P00106 and P00110), and removing it increases aggregate nodes by 119,932 (+13.4%) despite solving fewer levels. This is evidence of complementarity, not proof that its 25% reserve or default profile is optimally sized. Both wins are `ida:default`, so this sample says nothing favorable about reserving nodes for later admissible profiles.

### Held-out admissible-order confirmation and reserve curve (ETT-007)

The disjoint published positions 121–140 were reported as fixed before this follow-up, but that
timing was not independently frozen. All four arms held the
300k-node/400k-work budget, 120s deadline, worker count, and unrelated flags constant:

| Reserve / tier arm | Solved | Total nodes | Total work | Admissible attempts | Admissible direct wins |
|---|---:|---:|---:|---:|---:|
| tier OFF | 14/20 | 2,146,407 | 3,387,606 | 0 | 0 |
| 0.15 | 14/20 | 2,305,270 | 4,588,694 | 6 | 0 |
| **0.25 production** | 13/20 | 2,391,152 | 5,134,284 | 7 | 0 |
| 0.35 | 13/20 | 2,391,286 | 5,419,634 | 7 | 0 |

The only solve flip was **P00136**, gained by OFF and 0.15 but lost by production 0.25 and 0.35.
At production allocation it spends 191,250 probe-repair nodes and 33,750 repair-fallback nodes,
then exhausts the remaining 75,008-node admissible reserve without solving. Reducing/removing the
reserve leaves enough earlier-tier capacity for a cold full-ladder solve. This is the required
counterexample to ETT-004: admissible-order is complementary on two discovery levels yet its flat
reserve is harmful on one held-out level. Across the combined 40 published levels, production solves
33/40 and OFF solves 32/40 (2 gains / 1 loss), too small and deliberately selected to justify either
policy. The response saturates between 0.25 and 0.35 in solved set while work worsens, making values
above 0.25 unattractive in this regime; 0.15 remains the most justified population comparator.

ETT-008 then validated the allocation sensitivity on published positions 141–160. OFF solved 12/20
(2,196,647 nodes; 2,839,776 work), while both 0.15 and production 0.25 solved 13/20. The shared gain,
P00156, was a direct `ida:default` win after 642 nodes. The 0.15 arm used 2,451,741 nodes / 4,538,279
work versus production's 2,422,306 / 4,804,971: the same solved set, with 0.15 spending 5.5% less
work but 1.2% more nodes. Across the two disjoint reserve-curve slices (40 levels), 0.15 solves 27/40
versus production's 26/40 and uses 9,126,973 versus 9,939,255 work (−8.2%). Across all 60 levels
where production and OFF were compared, production solves 46/60 versus OFF 44/60, with three gains
and one loss. These remain exploratory published-corpus pilots, but nominate a properly pre-registered, medium-scale
parent-clustered 0.15-versus-0.25 confirmation more strongly than an OFF arm.

ETT-009 broadened that comparison to a disjoint 40-level slice (positions 61–100), but all 40 levels
solved in both arms and only two admissible attempts ran per arm. Production used 1,219,109 nodes /
2,665,130 work versus 0.15's 1,249,193 / 2,710,631. This is an inconclusive success-censored null:
it neither confirms the earlier 0.15 advantage nor supplies evidence against it, because 38/40 levels
never reached the affected tier. It strengthens the sampling requirement: a medium confirmation must
select on mechanics that predict tier reach, then remain level-blind during solving.

### Mechanics-enriched targeted pilot (ETT-010; preregistration claim superseded)

Unlike ETT-001–009, a local protocol and mechanics-only sample rule were committed at
`4923802b` before execution; the post-merge audit could not verify that commit through a persistent GitHub ref, so this remains targeted evidence. From the previously unused published positions 1–60, it ranked levels
by `reqInt*100 + mustCrossCount*30 + mustPassCount*10 + reqLen`, froze the top 20 and their hash,
and compared reserve 0.15 with production 0.25 at the same 300k-node/400k-work budget. Both arms
solved 19/20 with identical solved IDs. Reserve 0.15 used 433,538 nodes / 890,202 work; production
used 433,566 / 1,018,487, so 0.15 preserved solves and reduced total work 12.6%. However, only P00049
reached admissible order (one attempt, zero direct wins per arm); on that level 0.15 reduced work from
685,116 to 556,831 (−18.7%) while both remained unsolved. This satisfies the frozen escalation rule
(no net solve loss and at least 5% work reduction among reached levels), but the denominator is one
reached level. It nominated the later reach-enriched diagnostic, not a production change.

### Hard reach targeted pilot (ETT-011; preregistration claim superseded)

The protocol was committed at `7dd35d9f` before execution. A mechanics-only rule selected 20 unused
Corpus-2 levels with high intersection/obligation load. Every level reached admissible order in both
arms, so this fixes ETT-010's reach-censoring defect. Both arms solved 0/20 and every level consumed
about 1M nodes. Reserve 0.15 spent 64,081,562 work versus production's 59,491,054 (**+7.7%**, worse),
even though its admissible attempts used 3,000,320 versus 5,002,240 nodes. Neither arm had an
admissible direct win. Thus released admissible nodes were consumed less efficiently by earlier
techniques and did not improve progress as exposed by current telemetry. The frozen escalation rule
was not met. This is targeted negative mechanism evidence for 0.15 on this hard mechanics-enriched population
and closes immediate population promotion of 0.15; it does not establish that 0.25 is globally
optimal.

The paired transfer audit makes the mechanism unusually clear. Reducing the reserve removed
2,001,920 admissible-order nodes. On 19/20 levels, almost exactly 100k nodes per level moved to the
repair stack: +1,615,052 repair-probe nodes and +284,968 repair-fallback nodes in aggregate. Work
worsened on **20/20** levels, by 4,590,508 total; the per-level increase ranged from 53,427 to
333,790. This is not a stochastic solve flip or one outlier: in this population the flat transfer
systematically exchanges relatively cheap admissible nodes for more expensive plateau-prone repair
work. Compact paired rows are preserved in
[`ett-011-transfer.json`](experiments/2026-08-13-technique-tuning/ett-011-transfer.json).

### Current-main family-parent persistence retest (ETT-012)

A targeted protocol was committed at `51a606ca` before execution. Historical family evidence selected
R00526, R01407, R01875 and R01675, but each solver invocation was cold and mechanics-only. At a fixed
5M-node/6.7M-work diagnostic ceiling, all **0/4** canonical parents remained unsolved and exhausted
the node ceiling. Every row ran three repair attempts plus one admissible-order attempt. Minimum
recorded badness was 15, 13, 14 and 10 respectively; none reached a shallow near-zero basin. This
confirms that all four historical pathology candidates persist on current main at this bounded budget
and therefore remain eligible for regenerated namespaced sibling/boundary analysis. It is a targeted
mechanism diagnostic, not a population solve-rate estimate, and does not establish failure at the
50M production capability budget.

ETT-013 then closed that budget ambiguity with a protocol committed at `3043e0c3`. At the real 50M
node / 67M work capability ceiling, all **0/4** again failed and exhausted the node budget. Most
importantly, their minimum recorded badness values were **identical** to the 5M run: 15, 13, 14 and
10. Giving each level another 45M nodes changed attempt reach/count but produced no improvement in
the best repair basin signature. This is strong targeted evidence of saturation/representation or
operator limits rather than simple budget starvation. All four advance to regenerated symmetry
sibling divergence; none merits another unchanged flat-budget increase.

## Findings by technique

* **Admissible order:** ETT-011 is the strongest result: on 20/20 reached hard levels, 0.15 produced no solves and increased work 7.7%, closing immediate promotion. Exploratory published results remain double-edged: production versus OFF yields three gains and one loss across 60 levels, while 0.15 beats production 27/40 versus 26/40 across the two reserve slices with 8.2% less work. The paired transfer audit identifies repair-stack eligibility as the leading interaction; confirm it on held-out mechanics strata before considering a conditional reserve.
* **Diverse beam and repair probe:** zero marginal effect and identical work on this easy slice because relevant late/eligible attempts were not reached. This is a population-routing null, not evidence against the techniques.
* **Main profiles:** all 20 published levels solve at 100k. Increasing budget reduces recorded attempt count (76→55→32) but increases total nodes. Several early profiles therefore consume additional allowance without changing outcomes on this slice.
* **Hard random slice:** 40 completed observations across two caps produced 0 solves and almost exact cap exhaustion. Doubling the cap did not produce partial outcome telemetry in the persisted row, so the experiment cannot distinguish slow progress from representation failure.
* **Repair:** existing closed reserve/stagnation evidence still dominates this campaign; no closed repair operator was repeated.

## Starvation, redundancy, complementarity, representation

The admissible-order gain/loss set demonstrates real complementarity after earlier attempts fail and
real displacement when its reserve withholds too much earlier capacity. ETT-002/003 demonstrate
contextual redundancy only: on this slice the flags change neither attempt rows nor cost. ETT-005
shows cap saturation, but missing best-progress/plateau summaries outside repair prevents classifying
the failure. Existing lineage artifacts (15/17 extinctions at score/width retention; 10 clear
mis-rankings versus 2 width saturations) remain the stronger representation evidence.

## Instrumentation validity and gaps

Attempt outcome, nodes, elapsed time, winning config, and sequences were present. Important gaps remain:

1. eligibility/skipped/starved/exhausted are inferred rather than explicit per technique;
2. attempt rows lack a uniform `configKey` and work/budget fields for every technique;
3. no generic best-progress curve exists for ETT-005, so budget saturation is ambiguous;
4. wall-clock `timedOut` labels can coexist with the cumulative node ceiling and need clearer termination naming;
5. **family result identity was unsafe and is now repaired for future runs**: boundary aggregation,
   pair divergence, and parent-hint replay use namespaced `(parentCorpus,parentId,variantId)` lookup;
   a namespaced row cannot fall through to another parent, legacy bare IDs resolve only when unique,
   and duplicate/ambiguous rows fail loudly. Collision and cross-parent fixtures cover these rules.
   Historical reports are not retroactively certified; regenerate them with the corrected join.

## Invalidated and inconclusive work

ETT-005's 2m arm stopped at 16/20 due the bounded local execution/session window, so it is observational only and excluded from paired conclusions. The 2m interruption also satisfied the predeclared rule not to spend further local compute after 0/20 at 500k. ETT-002/003 are inconclusive about productive eligible populations because this sample does not reach them.

## Ranked next experiments

1. **Confirm repair-stack eligibility as the reserve-transfer interaction:** ETT-010's saving population had no repair attempts, while 19/20 ETT-011 levels routed released nodes into repair and worsened work on 20/20. Pre-register a 60-level mechanics-stratified diagnostic with equal repair-eligible and repair-ineligible strata, compare 0.15/0.25, and require the work-effect sign to differ by stratum before considering a mechanics-conditioned reserve. Keep solve gains/losses primary and aggregate variants by parent family. Do not repeat an unconditioned broad sweep.
2. **Add reach-state telemetry before more routing tests:** explicit eligible/reached/skipped/starved/exhausted plus per-attempt allocated node/work caps. Regression-test omitted overrides and sparse ablations.
3. **Beam extinction diagnostics:** 8–12 unrelated labelled extinctions, width K and 2K only around the extinction depth; persist winning-child rank/margin and score-term contributions. Escalate only if the same term recurs across at least three parent families.
4. **Repair basin diagnostic:** 12–20 repair-eligible failures, persist best-badness-over-nodes, plateau-entry node, elite signature similarity, descent count and restart endpoint family at production and 2× isolated caps; recheck any isolated solve through a matched full ladder.
5. **Regenerate boundary report then retest:** the triple identity fix and collision test are complete; run the wide boundary join, audit unmatched/legacy rows, then cold-retest R00526, R01407, R01875 and R01675 families on current main. No orientation-retry proposal.
6. **Hard-slice progress curve:** rerun ETT-005 only after generic progress telemetry exists; otherwise a larger cap merely records another zero.

ETT-011 falsified the immediate 0.15 promotion case on a fully reached hard sample: 0/20 in both arms and work +7.7%. No result supports a production change. Reopen reserve calibration only with a mechanics-conditioned allocation hypothesis that explains both ETT-010 and ETT-011, and pre-register it.

## Directions closed against unchanged repetition

Do not repeat unchanged: repair plateau penalty, recombination/relinking, turn bias, fallback reserve, beam seed, repair badness gates 10/8/6, portal parity envelope, universal wide beam, attraction-diversity reserve without reach evidence, admissible LDS, or a one-sided admissible profile reserve sample. The 2k/5k beam question remains open only as extinction-local retention analysis, not a global widening sweep.

## Questions still lacking evidence

No adequate current telemetry answers profile-level eligibility/starvation rates, repair elite diversity and rollback depth, generic best-progress curves, beam score-term margins at extinction, cost per marginal solve by parent family, or whether later admissible profiles help enough to offset default-profile losses. Family-wide conclusions now require regeneration and unmatched-row audit with the corrected identity key rather than more solver runs first.

## 2026-08-14 post-merge validity correction

This section supersedes the earlier “pre-registered” and equal-work-budget wording for ETT-010
through ETT-012. The recorded abbreviated protocol commits (`4923802b`, `7dd35d9f`, and `51a606ca`)
remain in this checkout's pre-merge ancestry, but no artifact recorded a full commit, persistent
GitHub ref, or permalink. The user independently confirmed that the abbreviations do not resolve on
GitHub after PR #1372 merged. A network attempt from this environment failed with HTTP CONNECT 403,
so the exact remote event cannot be independently reconstructed here. The evidence is consistent
with a squash or rebase merge followed by source-branch deletion; local objects cannot distinguish
those cases. ETT-010 and ETT-011 are therefore downgraded to **targeted level-blind diagnostics**, not
independently verifiable preregistrations or decision-bearing experiments. ETT-012 (and the same
pattern found for ETT-013) remains targeted diagnostic evidence only.

The work-budget audit also corrects ETT-011's resource description. Both arms were matched at a
1,000,000-node ceiling, one worker, and the same deadline. They were **not** matched under an enforced
1,333,333-unit whole-solve work ceiling: 19/20 rows in each arm exceeded the declared value. Total
work was 64,081,562 (mean 3,204,078.1) at reserve 0.15 and 59,491,054 (mean 2,974,552.7) at production
0.25. Code inspection reproduces the reason: `workBudget` is divided by the ordinary main-loop
allocator, but the fixed-node repair probe runs before that allocator installs `_workCap`; repair
fallback and admissible-order use additive time/node passes without installing a fresh work share;
and attraction-diversity reuses the main allocator's whole-solve accounting. Thus the documented
“total WORK this solve may spend” contract did not match production scheduling. ETT-011 should be
read as node-budget-matched with work measured as an outcome. Its useful mechanism observation is
unchanged: 0.15 redirected roughly two million nodes from admissible-order into repair and increased
canonical work by 7.7% on this deliberately repair-heavy sample.

An experiment-only `strictTotalWorkBudget` option now installs one immutable whole-solve work cap;
it is false when omitted, so production scheduling is unchanged. Attempt telemetry now records the
node and work ceiling visible at dispatch. A focused controlled-dispatch regression reaches repair
probe, repair fallback, attraction-diversity, and admissible-order and verifies that all four see the
strict cap; it also reproduces the legacy uncapped repair probe. At this audit checkpoint no strict-cap solve-rate experiment had run. ETT-018–020 below supersede that timing statement; their targeted results also do not support production strict enforcement.

The campaign analyzer is now a validity checker rather than only a totalizer. It audits manifest
artifact existence, duplicates, completeness, sample hashes, exact paired ID order, common settings,
undeclared treatment differences, budget overruns, deadlines/errors, and protocol verification. It
emits paired gained/lost/retained/jointly-unsolved sets; per-level node/work/time/attempt deltas and
technique-reach transitions; and separate unique-level, invocation, arm-run, and hypothesis-family
counts. Invalid pair order exits nonzero. Existing missing corpus hashes and explicit lifecycle states
remain gaps rather than being synthesized after the fact.

A subsequent aggregate audit found that ETT-018/019 listed legacy before strict, while the analyzer
historically treated the first artifact as treatment. Their solve sets were equal, so headline outcomes
did not change, but node/work delta signs and labels were inverted. The post-run manifest now declares
legacy as control and strict as treatment explicitly; the analyzer accepts explicit protocol or manifest
roles, fails incomplete role declarations, and regression-tests all three strict comparisons. Future
paired protocols should declare artifact roles rather than relying on list order.

### Gates before further campaign runs

1. Do not extend the generic admissible-reserve lane. The next reserve experiment, if any, is the
   predeclared matched repair-eligibility interaction after strict-work semantics are understood.
2. Do not run more disable or broad-budget arms until mechanically eligible / instantiated / reached /
   earlier-solved / node-starved / work-starved / routing-skipped / exhausted / deadline telemetry and
   progress-over-work are persisted explicitly.
3. Every future decision-bearing protocol must be pushed on a persistent GitHub ref before execution
   and record a full 40-character SHA, permalink, solver/content/sample hashes, commands,
   configuration, environment, start/completion times, and artifact SHA-256. The validator rejects a
   decision-bearing label when that proof is absent.
4. After those gates, prioritize beam-extinction and repair-basin diagnostics, then regenerate family
   boundaries with namespaced identity. No current result is strong enough for a population-scale A/B.

## 2026-08-14 lifecycle-telemetry follow-up

The reach/progress gate now has an opt-in implementation rather than relying only on post-hoc
attempt presence. `--lifecycle-telemetry` persists, for the main ladder, repair probe, repair
fallback, attraction-diversity, and admissible-order: mechanics eligibility, instantiation, reach,
earlier-solve skip, node/work starvation, routing/config skip, exhaustion, deadline stop, allocated
node/work ceilings, actual nodes, attempt count, and available badness snapshots. Per-attempt work is
not yet metered independently, so `actualWork` is deliberately `null` rather than a fabricated
allocation; whole-level canonical work remains valid. The analyzer rejects a telemetry-enabled row
when any required lifecycle field is absent. Omission leaves production behavior and result shape
unchanged.

This closes the instrumentation prerequisite for **small telemetry pilots**, not for the matched
repair-eligibility A/B itself. The next bounded action should be an 8–12-level mechanics-only dry run
with lifecycle telemetry and no policy treatment, used solely to verify classifications and measure
how often `actualWork: null` blocks interpretation. Only after that audit should per-attempt work
meter deltas be added and the matched interaction protocol frozen on a persistent GitHub ref.

### ETT-014 lifecycle dry run (invalidated)

The frozen 8-level no-treatment dry run completed 8/8 rows (4 solved, 4 node-budget-reached; 59
attempts) and proved that all required fields survived worker/report serialization. It also did what
the dry run was intended to do: exposed a classification defect before any treatment experiment.
The lifecycle order listed the main ladder before the actually earlier repair probe, and
`skippedBecauseSolvedEarlier` was not gated by eligibility. Consequently some solved rows received
contradictory skip attribution. ETT-014 is retained but invalidated for lifecycle conclusions. The
ordering and eligibility gates were corrected; the identical cohort must be rerun as a validation,
not pooled with ETT-014.

### ETT-015 corrected lifecycle validation

The exact ETT-014 cohort was rerun once after the classification fix: 8/8 completed, 4 solved and 4
node-budget-reached, with 59 attempts. Validation found zero missing lifecycle objects and zero
contradictions. Reach denominators were: repair probe 3/3 eligible, main ladder 6/8 eligible (the
other 2 solved in the earlier probe), repair fallback 1/3 eligible, attraction-diversity 1/8
eligible, and admissible-order 4/8 eligible. Four solved rows skipped admissible-order; three unsolved
rows reached the early node ceiling before attraction-diversity. This is instrumentation validation,
not a population estimate or technique comparison.

ETT-015 also confirmed that `actualWork: null` was the last material schema gap. Per-attempt canonical
work deltas are now captured under the same opt-in telemetry gate and summed per technique. This is
production-inert. A final same-cohort serialization check is justified before using work-starvation or
cost-per-reach fields in an experiment; it must remain an instrumentation validation, not a third
independent sample.

### ETT-016 per-attempt work validation

The final same-cohort instrumentation validation completed 8/8 with the same 4 solved / 4
node-budget-reached statuses and node outcomes as ETT-015. On all 8 rows, every reached technique had
non-null canonical `actualWork`; the sum of attempt work equaled the sum of technique lifecycle work
and the whole-level `workSpent` exactly. This closes the per-attempt work-accounting gap for opt-in
telemetry. It also independently reproduced the legacy whole-solve discrepancy on this small cohort:
4/8 rows exceeded the nominal 400,000-unit main-loop pool, reinforcing that strict-work experiments
must opt into `strictTotalWorkBudget` and must not compare legacy arms as equal-work enforced.

No solver policy treatment was run in ETT-014–016. These three IDs are one instrumentation hypothesis
family: one invalidated discovery, one corrected lifecycle confirmation, and one required work-meter
confirmation. They must not be counted as three independent tuning results.

A final code review separated mechanical eligibility from routing enablement and limited a deadline
stop to the last active technique rather than every technique previously reached. These distinctions
do not change ETT-015/016 because their arms used production routing and had no deadline truncation;
they prevent future ablations and deadline rows from receiving contradictory lifecycle labels.

### ETT-016 starvation-label follow-up

A per-technique cost audit found a sharper legacy-cap failure on P00145: repair fallback was dispatched
with 12,686 nodes and a 720,000ms allowance but inherited **zero work**, performed 0 nodes / 0 work,
and was labelled `timed-out` rather than work-starved. Thus ETT-016's exact work-accounting primary
result remains valid, but that row's starvation/termination classification is invalidated. The
telemetry now treats a zero dispatch-time node or work allowance as `budget-starved`, and lifecycle
starvation may coexist with `reached` when a technique was dispatched but could do no work. A focused
regression pins this distinction.

On this intentionally tiny validation cohort, aggregate work was repair probe 428,481; main ladder
886,728; attraction-diversity 17,631; and admissible-order 2,118,905 units. Repair fallback contributed
0 despite being dispatched once. These are targeted instrumentation denominators, not population
productivity estimates, but they demonstrate why “attempt exists” is not an adequate reach metric and
why a stale cap can masquerade as a technique timeout.

## ETT-017 offline beam-extinction mechanics audit

This offline observational analysis joined all 19 existing score/width-forensics rows to their live
level mechanics; it did not rerun the solver or feed labels into search. The clearly-mis-ranked group
contained 14/19 rows (4 solved controls), versus 5/19 heterogeneous weak-margin/width rows (0 solved).
Median score margin was 11.28 versus 0.99; median candidate pool was 164 versus 230. Median mechanics
were broadly similar: reqLen 88 versus 87, reqInt 5.5 versus 7, nav density 0.586 versus 0.537, and
predicted challenge 0.878 versus 0.826.

Four tags met the predeclared twofold-prevalence/support screen, but all were more common in the small
**other** group rather than clearly mis-ranked: crossing-rich 5/5 versus 5/14, high-intersection-burden
4/5 versus 3/14, large-grid 4/5 versus 5/14, and portals 4/5 versus 4/14. This does not nominate a
mis-ranking router. At most it suggests that crowded weak-margin/width extinctions may be enriched for
portal/crossing/large-grid structure. The comparison is underpowered (other n=5), mixes extinction
subclasses, includes incomplete surviving labels, and the lineage artifact lacks parent-family IDs;
therefore it cannot support a production policy, score perturbation, or population A/B.

The exact next beam experiment remains extinction-local: add parent-family identity to a held-out
8–12-level labelled set, separate weak-margin from width-saturation before analysis, and compare K
versus 2K only at observed extinctions. Generic widening remains closed.

## ETT-018 strict-work affected-cohort diagnostic (invalidated)

The matched 8-level legacy/strict run produced byte-identical solutions, nodes, work, attempts, and
reach—but this was an instrumentation failure, not evidence that strict enforcement is inert. The
strict arm exceeded its 400,000-unit ceiling on 4/8 rows by 95,414 to 1,126,392 units. Attempt traces
isolated the defect to admissible-order: its main DFS loop checked time and nodes every 256 iterations
but never consulted the experiment-only strict work cap. A zero-cap admissible dispatch alone spent
205,742 work on P00145 and 1,139,626 on P00147.

ETT-018 is retained and invalidated. Strict enforcement now checks before admissible search and at its
existing 256-iteration checkpoint, only when `_strictWorkCap` is present; legacy production scheduling
is unchanged. The campaign validator now rejects any non-invalidated strict artifact with work above
its declared ceiling. The affected cohort requires one clean matched rerun before strict-work results
can be interpreted.

## ETT-019 corrected strict-work diagnostic

The clean matched rerun solved 4/8 in both arms with no gains or losses. Strict enforcement reduced
total work from 3,451,745 to 1,653,882 (−52.1%) and nodes from 1,234,376 to 819,656 (−33.6%). The four
quick solves were byte-identical in work/nodes. On four failures, strict cut 94,342–1,125,894 work;
P00145 and P00147 changed from node-budget-reached to work-budget-reached. Admissible-order bore the
reduction: P00145 205,742→0 work, P00147 1,139,626→13,732, P00141 401,968→30,083, and P00142
371,569→277,227.

Strict rows ended 298–1,072 units above the nominal ceiling because primitives debit canonical work
between bounded checkpoints. The validator permits at most 4,096 units (one conservative checkpoint
quantum) and rejects larger excess; ETT-019's maximum was 1,072. This is bounded enforcement, not an
exact per-operation counter stop, and reports must state that caveat.

This targeted, success-censored cohort demonstrates that strict mode now materially changes the
intended resource semantics without losing these four easy solves. It does **not** establish solve-set
safety: all levels where strict removed substantial work were unsolved in both arms. The predeclared
escalation condition is therefore not met. Before any promotion discussion, run a held-out balanced
cohort containing later-tier historical winners and earlier-tier controls, under a persistently
verifiable protocol; measure symmetric losses as primary. No production scheduling change is made.

## ETT-020 strict-work winner-retention diagnostic

This cold, targeted diagnostic selected eight historical winners to balance three admissible-order
wins (P00085, P00099, P00156), three earlier main-ladder controls (P00094, P00096, P00138), and two
repair-probe controls (P00144, P00146). Historical outcomes selected the sample but were not supplied
to either mechanics-only solver arm. The locally frozen protocol and phase-enriched sample make this a
mechanism test, not a population estimate or independently verifiable preregistration. Its frozen
sample IDs/order were correct, but the protocol hash used JSON-array rather than the validator's newline convention and was corrected after execution; this audit defect reinforces that status.

Legacy scheduling retained 8/8 winners; strict whole-solve enforcement retained 6/8, with **two
symmetric losses and no gains**. P00085 changed from an admissible-order solve at 1,003,155 work to
work-budget-reached at 401,788; its admissible attempt was dispatched with zero remaining work.
P00099 changed from an admissible-order solve at 530,177 work to node-budget-reached at 400,707;
admissible work fell from 205,383 to 75,913. P00156's earlier admissible solve remained unchanged at
269,592 work, and all five main/repair controls were exactly retained.

Across 8/8 paired rows, strict reduced total work 2,560,486→1,829,649 (−28.5%), nodes
1,112,710→967,217 (−13.1%), and elapsed time 3,419→2,692ms, while increasing attempt count 83→96.
Maximum strict checkpoint overshoot was 1,788 work, within the pre-existing 4,096 validation
tolerance. The cost reduction is therefore real, but it was purchased by removing the late work that
produced 2/3 selected admissible-order wins. The predeclared no-loss escalation rule fails.

This sharply closes **the current 400,000-unit strict-cap form** as a candidate production semantic:
it is not solve-safe for historically productive additive tiers. It does not prove that global work
accounting is useless, nor compare alternative caps. The next justified work is analytical: derive an
externally comparable total-work distribution on a representative cold sample and predeclare a cap
that matches production cost rather than truncating known late winners. Do not run another strict
versus legacy capability A/B until that cap-selection question has a persistently verifiable protocol.


## ETT-021–023 family-boundary input availability audit

ETT-021 attempted the repository-wide input census but was invalidated before producing an artifact:
`git log --all --name-only` exceeded Node's default 1 MiB synchronous child-process buffer. Corrected
ETT-022 raised only that buffer to 64 MiB, but its **filename-only** detector was also invalid: it
reported zero candidates while `reports/stress/phase-c-family-variant-results.json` is a tracked
counterexample containing 477 family results. Both failures are retained; neither invoked the solver.

ETT-023 replaced filename inference with schema inspection of every tracked reports/logs JSON document.
It found **63 family-result documents and 911 F-prefixed result rows**, so the earlier artifact-absence
claim is withdrawn. However, **0/911 rows** carries the complete `(parentCorpus,parentId,variantId)`
identity required for collision-safe aggregation. One document declares an unavailable source corpus:
the 477-row Phase-C artifact points to `data/families/phaseB/combined-corpus.json`, which is not tracked.

The blocker is therefore narrower and actionable: outcomes exist, but identity/provenance must be
reconstructed from family manifests, per-file context, or restored source corpora before aggregation.
Do not regenerate a boundary report through ambiguous bare-ID fallback, and do not solve more variants.
First build an auditable migration table that reports matched, unmatched, and ambiguous rows; require
all 911 rows used by an analysis to resolve to `(parentCorpus,parentId,variantId)`, and parent-cluster
all rates. The schema census does not recognize non-`F<digits>` IDs and local history cannot inspect
deleted remote-only refs, so those remain explicit limitations.


## ETT-024 manifest identity migration audit

A frozen offline exact-ID join tested whether the 911 schema-detected result rows can be namespaced from
the 161 tracked family manifests without filename heuristics. Those manifests contain 1,237 distinct
variant IDs. **All 911/911 result rows matched exactly one manifest edge; 0 were ambiguous and 0 were
unmatched.** Thus embedded identity is absent, but a mechanical migration is possible for this tracked
subset.

This does not resurrect the historical seven wide Corpus-1 chunks, certify the missing Phase-C combined
corpus, or permit pooling repeated outcomes from different result documents. The next offline step is to
emit a source-preserving migration table and quantify duplicate edge measurements by solver commit,
budget, and run. Select one explicitly justified contemporaneous result per edge before passing rows to
the boundary reporter; never last-write across runs. No additional family solve is justified yet.


## ETT-025 source-preserving family-result migration

The lossless migration retained all 911 observations with namespaced edge, source file, commit,
timestamp, budget, status, nodes, work, time, and winning configuration. They cover **886 unique edges
across 51 parent families**. Twenty-five edges have two observations each (50 repeated rows); no edge
has more than two.

One repeated edge has a solve-status conflict: `(stress-levels-random.json, R02248,
F02248-sym-02)` solved by repair under commit `8419ee1` in the 60s family run (150,557,694 nodes), but
timed out under commit `b43e6dd` in the 20s Phase-C run (4,497,715 nodes). This is expected
resource/version sensitivity, not symmetry noise, and proves that last-write or pooled-edge aggregation
would be invalid. No repeated edge had different winning configurations among multiple solved rows.

The remaining repeated sets are 16 P00110 density variants measured under legacy versus portfolio
experiment, seven R02248 symmetry variants measured in standalone versus Phase-C runs, and two R03015
symmetry variants with original/retry artifacts. The exact next step is a declared dataset view—not a
solver run—selecting internally comparable sources by research question. Boundary rates must publish
the selection rule and retain excluded observations in the migration artifact.


## ETT-026/027 Phase-C family-boundary audit

ETT-026 joined all 477 Phase-C rows to 66 relation families (11 parents) with zero missing variants,
but its boundary artifact was invalidated. The supplied historical Corpus-2 baseline contains zero
canonical rows, and the reporter incorrectly treated `canonicalSolved:null` as a canonical failure for
non-symmetry rescue/robust labels and mutation rescue rates. The invalid artifact is retained. The fix
requires `canonicalSolved === false` for parent-failure claims and preserves null rescue/evidence when
the canonical row is absent.

Corrected ETT-027 retained the same rows/manifests and produced no canonical rescue/robust claims. It
found sibling solve-status disagreement in **8/11 symmetry families**: R02795 solved 5/7 orientations;
R00156 and R02960 4/7 each; R02248 3/7; and R00548, R01465, R02239, and R02452 2/7 each. R00059,
R00440, and R02579 solved 0/7. Within each mixed family the winning configuration was perfectly
concentrated in this scheduler-censored run: closureCommitment for R02795, sideCommitment for R00156,
intersectionHarvest beam for R01465/R02248, and repair for the other four.

These are historical 20-second sibling pathologies, not current-main capability or independent config
probabilities. They support extinction/trajectory diagnostics and a small current-main cold family
retest, but only after a persistently verifiable protocol and canonical parents are included. The top
new parent-family candidates are R02795, R00156, R02960, and R02248; use symmetric gains/losses and
parent-clustered counts, not 28 solved siblings as independent observations.


## ETT-028 source-selected family-boundary report

The completed source view retains the sole observation for every edge measured once and makes all
25 repeated-edge choices explicit. It selects the portfolio arm for P00110, the complete standalone
60-second family run for R02248, and the complete original seven-orientation run for R03015. The 25
unselected observations remain embedded in the view with reasons; no row is pooled or selected by
file order. Two duplicate manifest definitions are likewise resolved to the manifest matching the
selected source cohort.

The resulting **886-edge, 51-parent view** joins without loss across **123 relation families** and
reports zero missing variant rows. Neither historical baseline contains one of these canonical parent
rows, so canonical state remains unknown throughout: the report emits no canonical-rescue, robust,
mutation-rescue, or cost-cliff claims.

Sibling solve-status disagreement nominates eight parents at zero new solve cost: **R02795 (5/7),
R00156 (4/7), R02248 (4/7), R02960 (4/7), R00548 (2/7), R01465 (2/7), R02239 (2/7), and R02452
(2/7)**. R02248 changes from the Phase-C-only 3/7 to 4/7 because ETT-028 deliberately uses its
complete 60-second standalone run. The other 71 queue rows are scheduler-censored configuration
concentrations and are descriptive only. These eight parents may seed a future canonical-inclusive,
current-main cold protocol; this offline report itself does not justify a solver or scheduler change.
