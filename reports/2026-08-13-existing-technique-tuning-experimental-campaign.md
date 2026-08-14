# Existing-technique tuning experimental campaign (2026-08-13)

> **Status:** exploratory campaign complete; no production policy change; **two pre-registered decision-bearing pilots completed**. **Evidence:** 12 experiments / 23 arm-runs attempted, 22 arms complete, 1 invalidated, 0 abandoned; 480 level solves and 1,844 recorded internal attempts. Machine-readable protocols and raw rows are in the [machine-readable manifest](experiments/2026-08-13-technique-tuning/manifest.json); per-arm technique reach/win/cost denominators are in the [derived aggregate](experiments/2026-08-13-technique-tuning/aggregate.json).

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

The manifest reconstructs the question, non-duplication rationale, arms, selection, budget, primary/secondary outcomes, and stopping rule for ETT-001–012. It was created after the first runs and subsequently extended after follow-ups; therefore it does **not** prove that these protocols were frozen before execution. ETT-001–009 are classified as exploratory targeted diagnostics, even though their solver invocations respected the level-blind input boundary; ETT-010 and ETT-011 are the pre-registered decision-bearing pilots. ETT-001 is a three-arm budget curve. ETT-002–004 are matched full-ladder ablations against its 300k arm. ETT-005 is a hard-slice budget/saturation test; ETT-006 repairs the family-identity validity blocker; ETT-007 is the disjoint admissible allocation confirmation; ETT-008 is its second disjoint validation; ETT-009 is a medium disjoint population check. ETT-010 and ETT-011 had decision-bearing protocols committed before execution; ETT-012 had a targeted-diagnostic protocol committed before execution. Sparse ablations were checked against the current proxy semantics; only the named flag differed.

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
* the retrospective 0.15 reserve signal cannot support promotion; ETT-010 and ETT-011 provide the separately pre-registered positive-cost and negative-cost evidence described below; and
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

### Pre-registered mechanics-enriched pilot (ETT-010)

Unlike ETT-001–009, the complete protocol and mechanics-only sample rule were committed at
`4923802b` before execution. From the previously unused published positions 1–60, it ranked levels
by `reqInt*100 + mustCrossCount*30 + mustPassCount*10 + reqLen`, froze the top 20 and their hash,
and compared reserve 0.15 with production 0.25 at the same 300k-node/400k-work budget. Both arms
solved 19/20 with identical solved IDs. Reserve 0.15 used 433,538 nodes / 890,202 work; production
used 433,566 / 1,018,487, so 0.15 preserved solves and reduced total work 12.6%. However, only P00049
reached admissible order (one attempt, zero direct wins per arm); on that level 0.15 reduced work from
685,116 to 556,831 (−18.7%) while both remained unsolved. This satisfies the frozen escalation rule
(no net solve loss and at least 5% work reduction among reached levels), but the denominator is one
reached level. It justifies the pre-registered reach-enriched confirmation already recommended, not
a production change.

### Pre-registered hard reach pilot (ETT-011)

The protocol was committed at `7dd35d9f` before execution. A mechanics-only rule selected 20 unused
Corpus-2 levels with high intersection/obligation load. Every level reached admissible order in both
arms, so this fixes ETT-010's reach-censoring defect. Both arms solved 0/20 and every level consumed
about 1M nodes. Reserve 0.15 spent 64,081,562 work versus production's 59,491,054 (**+7.7%**, worse),
even though its admissible attempts used 3,000,320 versus 5,002,240 nodes. Neither arm had an
admissible direct win. Thus released admissible nodes were consumed less efficiently by earlier
techniques and did not improve progress as exposed by current telemetry. The frozen escalation rule
was not met. This is a decision-bearing negative for 0.15 on this hard mechanics-enriched population
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
