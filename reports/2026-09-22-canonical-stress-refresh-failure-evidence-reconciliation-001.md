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
2. **Run a contrastive failure-response digest before richer first-loss work.** Compare current unsolved parents against solved parents that also experienced failed/capped attempts, stratified by normalized action/stage and protocol. Look for parent-level response patterns that discriminate current residuals instead of merely identifying common solver behavior.
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
