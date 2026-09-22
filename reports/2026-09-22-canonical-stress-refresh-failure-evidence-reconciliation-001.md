# Canonical stress refresh and failure-evidence reconciliation 001

> **Status:** current stress-refresh reconciliation; census-side broad reconciliation still pending.
> **Date:** 2026-09-22.
> **Stress run:** GHA `35687363645`, solver ref `39d14d49023aa09cb680053b975ef786eeae9b01`.
> **Companion census:** GHA `35687337464` from the same solver ref; still in progress at this reconciliation.
> **Evidence role:** current production boundary + compact failure/lifecycle evidence; no scheduler-policy change authorized here.

## Result

The canonical 60-shard stress refresh completed successfully.

Current production capability remains:

- Corpus 1: **101/102 solved**;
- Corpus 2: **1,169/1,700 solved**;
- combined residual: **532/1,802 parents unsolved**.

This reproduces the previous canonical solve-count boundary rather than revealing a new batch of production solves. The scientific value of this run is therefore primarily the refreshed execution identity plus the much richer failure/lifecycle denominator.

The refresh consumed:

- Corpus 1: 1,128,658,786 nodes / 1,532,429,927 canonical work;
- Corpus 2: 166,608,236,656 nodes / 207,030,206,477 canonical work.

## Compact failure-response coverage

The emitted compact failure-response resource is unusually complete:

- **1,802/1,802 parents observed**;
- **56,906 attempts**;
- zero missing parent rows;
- zero malformed/unknown/error rows in the decision-valid population;
- all attempts have normalized action identity;
- all attempts have `workSpent`;
- **532 node-limited parents**, exactly matching the current unsolved parent count;
- **1,270 solved parents**;
- **1,010 solved parents contain at least one failed attempt**.

The last point matters for interpretation. Failure-response fields are not intrinsically adverse phenotypes. Censoring/cap contact is common among successful solve histories too:

- 877/1,270 solved parents contain at least one attempt that reaches its node ceiling;
- 925/1,270 solved parents contain at least one deadline/censor-like failed attempt;
- all 532 unsolved parents contain both.

Therefore the fresh corpus should be analyzed **contrastively at the parent level**, with solved-parent failed attempts as controls. Raw counts of censored attempts, capped attempts, or a named stage are not failure prevalence and should not be promoted directly into a queue item.

## Stage evidence

The run supplies a full current denominator for existing allocation questions. Selected stage totals include:

| Stage | Attempts | Solving attempts | Canonical work |
| --- | ---: | ---: | ---: |
| main-search | 10,643 | 709 | 33,620,600,885 |
| guidance-goal-distance-retry | 7,096 | 10 | 31,336,096,491 |
| late-repair-multiseed-retry | 1,370 | 33 | 22,831,523,687 |
| early-repair-search | 2,713 | 212 | 20,763,527,812 |
| connectivity-axis-prune-disabled-retry | 7,585 | 4 | 16,939,729,558 |
| portal-coarse-state-merge-dead-last-retry | 4,372 | 122 | 16,189,840,355 |
| must-cross-neighbor-prune-disabled-retry | 3,955 | 12 | 16,177,906,483 |
| admissible-order-fallback | 822 | 44 | 12,091,364,955 |
| admissible-order-alternate-tiebreak-retry | 761 | 31 | 11,329,872,193 |
| coarse-state-near-tie-retention-disabled-retry | 8,018 | 17 | 11,322,272,971 |

These are descriptive current-run totals, not marginal-value estimates. A stage with few direct wins can still be prerequisite or capability-protecting; removal still needs a controlled substitutability/removable-work question.

## Contrastive solved-control digest

The obvious next cheap analysis was run against the fresh compact resource: compare the 532 unsolved parents with the **1,010 solved parents that themselves contain failed attempts**.

A raw stage-reach comparison looks dramatic because every current miss falls through many late portfolio stages while successful parents stop when they solve. That is sequence/outcome conditioning, not a mechanism diagnosis. The useful control is therefore narrower: among parents that reached a stage **and that stage itself failed**, compare work/cap behavior between eventually-unsolved parents and eventually-solved parents.

That conditioning removes most apparent separation.

Examples:

| Failed stage | Unsolved parents | Solved-parent failed controls | Median work, unsolved | Median work, solved controls | Node-cap rate, unsolved | Node-cap rate, solved controls |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| main-search | 532 | 349 | 29.23M | 30.33M | 70.5% | 71.9% |
| early-repair-search | 383 | 510 | 23.01M | 22.88M | 100% | 100% |
| connectivity-axis-prune-disabled-retry | 532 | 194 | 23.24M | 23.33M | 100% | 100% |
| admissible-order-fallback | 532 | 246 | 14.35M | 15.18M | 100% | 100% |
| admissible-order-alternate-tiebreak-retry | 532 | 198 | 14.47M | 15.50M | 100% | 100% |
| coarse-state-near-tie-retention-disabled-retry | 532 | 229 | 14.41M | 14.40M | 100% | 100% |
| guidance-goal-distance-retry | 532 | 155 | 42.20M | 49.63M | 48.7% | 50.3% |
| late-repair-multiseed-retry | 149 | 33 | 126.83M | 126.91M | 100% | 100% |

The compact layer therefore does its intended job here: it cheaply rules out the idea that current residuals are broadly distinguished by a simple stage-level work/censor/cap signature. The 532 misses are not a visibly separate species at this resolution; successful solve histories commonly traverse the same failed/capped regimes before a later success.

This changes the follow-up:

- do **not** spend another broad run collecting more of the same compact fields;
- do **not** turn stage reach into a causal phenotype, because it is heavily conditioned by earlier failure/success;
- keep narrow allocation questions already supported by independent evidence (repair deadline, admissible-order reserve) under their existing owners;
- for the broader capability-invention question, the next information purchase should move **one rung richer**: mechanically sampled first-loss / operational-divergence evidence outside the capability-selected Class-3 cohort, using the compact resource to freeze/stratify the sample and preserve solved controls;
- exact/reference work should remain downstream of that richer sample rather than being sprayed across all 532 misses.

This is a useful negative result: the new failure corpus narrows the search for explanatory structure instead of merely enlarging the archive.

## Frozen WS1 challenge

The same refresh replayed the already-frozen WS1 legal-signal model without refitting it.

Across the combined retained validation population:

- 391 solved validation levels;
- 21,508,259,349 pre-winner work;
- 2,097,886,124 work nominated by the frozen model;
- **9.754% captured pre-winner work**;
- **0 endangered winner levels**;
- 96.48% of nominated work is same-stage continuation;
- 85.94% of nominated work follows a censored prior response.

C2 alone is 9.908% captured pre-winner work with zero observed winner endangerment; C1 remains effectively zero-signal. This is another temporal/current-boundary replication of the frozen signal, not independent-population confirmation. The preflighted fresh-parent confirmation remains the correct WS1 next gate.

## Immediate research implications

1. **Do not launch another generic failure-data acquisition.** The present compact denominator is already complete enough to support cheap current-parent joins.
2. **Contrastive compact digest complete:** after conditioning on the same stage failing, work/cap profiles are broadly similar between current misses and solved-parent failed controls. Treat this compact rung as exhausted for a generic discriminator and advance the broader capability-invention question to mechanically sampled first-loss / operational-divergence evidence rather than collecting more of the same compact telemetry.
3. **Use this run as the fresh production-side input to the maintained broad-evidence reconciliation consumer once census `35687337464` finishes and its canonical second-order outputs exist.**
4. **Do not revise census depth, scheduler policy, or stage removal from the stress run alone.** The planned T1/EW1 side is still required for isolated-capability and cheap-pricing comparisons.
5. **Preserve the distinction between invocation-level node limitation and mechanism-specific underdose.** Every current miss is node-limited at the parent outcome layer, but many solved parents also encounter capped attempts. Mechanism claims require action-specific dose/reach comparisons.
6. **Prioritize joins over new instrumentation.** This run supplies exactly the kind of denominator the failure-evidence plan was designed to exploit: participation, action identity, work, censoring and solved controls across the entire current production population.

## Census dependency

Technique-census run `35687337464` was dispatched from the same solver ref with T1 plus the bounded EW1 60×10M tranche. At the time of this report, 119/120 census shards had completed successfully and shard 117 remained in progress; the combine/analyze phase had therefore not run.

Do not derive final T1 churn, EW1 pricing, technique niches, or broad-evidence nominations from partial shard artifacts. Finalize the broad-run closeout only from the canonical combined/analyzed census output.

## Queue disposition

The old queue gate “run one stress refresh + one technique census” is now half-complete:

- stress refresh: **COMPLETE / RECONCILED HERE**;
- technique census: **IN PROGRESS**;
- machine broad-evidence reconciliation: **BLOCKED ONLY ON CENSUS COMBINE/ANALYSIS**.

No active solver premise is closed or promoted by this report alone.
