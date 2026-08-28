# Post-976 portfolio exposure rejoin

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — [`post-promotion residual targeted sweep`](2026-08-28-post-promotion-residual-targeted-sweep.md): after `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`'s promotion (and everything else merged since), a level-blind re-sweep of this exact 724-level residual found 3 new solves (`R02151`, `R00817`, `R02010`); 721/724 still unsolved at a 50,000,000-node budget. Confirms this residual is still overwhelmingly open — this report's own "prioritize one cheap missing-exposure beam pilot" recommendation stands unchanged.
> **Decision:** substantial existing-menu capability still sits behind production exposure and per-action depth. Among the 724 current misses, 139 have at least one observed unablated singleton T1 census solver; the actionable residual is dominated by actions that are not offered in their known-winning form or are offered below their historical solve depth. Prioritize one cheap missing-exposure beam pilot before richer selector machinery or broad new search families.
> **Remaining gate:** after the already-earned scheduler confirmation resolves, freeze one same-revision fixed-envelope development treatment that broadens exactly one cheap missing-exposure beam action without changing its search semantics; require no solve regression and positive fixed-work value before any broader portfolio construction. Keep the restart equal-work harness as the next independent execution-readiness item.
> **Evidence role:** development / mined residual analysis, not independent confirmation
> **Selection:** post-hoc on the 724 failures of run `32835403128`, using a census that predates the current solver revision

## Inputs and conservative join

Current production evidence comes from the 60 Corpus-2 batch artifacts in refresh `32835403128`. They contain all 1,700 level rows and the actual attempt/action/gate histories used by the 976-solve run.

Isolated capability comes from `reports/stress/technique-census/32240161854/combined-cells.json`. The combined table contains 78,553 cells, no missing shards, and one historically partial shard (`technique-census-shard-85`). This analysis uses only **observed positive cells**, so that partial shard can hide capability but cannot create a false isolated solve.

To avoid the earlier invalid join between plain and modified search identities, the primary census slice is deliberately narrow:

- `corpus2` only;
- tier `T1`;
- exactly one `techniqueKey`;
- no ablation;
- no flag experiment;
- no pair label;
- referee-valid successful cells only when claiming isolated capability.

Modified retry actions are not silently equated with their plain base configuration. For the production side, a base DFS/beam census action is considered comparably offered only by the ordinary main loop; repair uses the same repair configuration and salt-0 trajectory in its repair stages; admissible actions use their admissible-order stages. The known isolated `winningGate` must also match.

`nodesExpanded` is used only for this within-technique depth comparison. It is **not** treated as a cross-technique cost currency; `workSpent` remains the repository-wide allocation currency.

## Residual capability map

The latest production sweep leaves **724/1700** Corpus-2 levels unsolved.

The frozen unablated singleton census contains at least one isolated solver for **139** of those 724 current misses. There are 291 successful level-action cells across those 139 levels.

Classifying each current miss by its most actionable observed seam gives:

| residual class | levels | share of 724 misses | interpretation |
|---|---:|---:|---|
| known solver **not offered exactly** | **73** | 10.1% | at least one observed isolated-winning base action is absent in production for that level/gate |
| known solver **offered but starved** | **57** | 7.9% | all observed isolated winners are exposed, but at least one matching action/gate receives fewer nodes than its historical solve depth |
| known solver **offered adequately but fails** | **9** | 1.2% | matching current action/gate reaches or exceeds historical solve depth but no longer reproduces the older isolated success |
| **no observed base isolated solver** | **585** | 80.8% | this census does not establish existing-menu headroom |

The level classes are mutually exclusive in the order shown: any missing known winner takes precedence over starvation; starvation takes precedence over adequate-but-failed replay. This is an actionability classification, not a claim that the first listed cause is the only reason a level fails.

At cell level, the 291 observed winning opportunities divide into 147 not-offered, 117 starved, and 27 adequate-but-failed cells. A level can contribute cells to more than one category.

## Missing exposure is still real after the 976 routing gains

The 73 not-offered levels are not mostly technicalities caused by matching a base action against a modified retry variant:

- 142/147 not-offered winning cells use a configuration that production never executes in the comparable base form on that level;
- only 5/147 are cases where the same configuration appears solely through a behavior-changing retry form;
- every one of the 73 levels has at least one observed winner whose comparable base configuration is never attempted.

**59/73** not-offered levels have a non-IDA isolated winner. The cheap end is especially attractive:

- **14** levels have an unoffered non-IDA solver at or below 250k isolated nodes;
- **21** at or below 500k;
- **23** at or below 1M.

This is residual evidence after the earlier routing work already delivered 41 of the latest 96 gains. Exposure was not a one-time cleanup; it remains a measurable capability seam.

### Beam exposure economics

For each beam identity below, the table asks a deliberately simple development question: among current failures where production does **not** offer that base beam at all, what did the old isolated census observe if that one beam was run? Failed cells are charged, not discarded.

| missing base beam | current misses lacking it | isolated solves | total census nodes on absent population | census nodes / observed solve |
|---|---:|---:|---:|---:|
| `beam:intersectionHarvest@beam5000` | 62 | 2 | 16.0M | **8.00M** |
| `beam:intersectionHarvest@beam5000(diverse)` | 390 | **10** | 133.6M | **13.36M** |
| `beam:intersectionHarvest@beam2000` | 529 | 5 | 70.1M | 14.03M |
| `beam:objectiveFirst@beam5000` | 62 | 1 | 15.7M | 15.70M |
| `beam:harvestThenFinish@beam2000` | 696 | 5 | 91.5M | 18.31M |
| `beam:knotBuilder@beam2000` | 696 | 4 | 91.7M | 22.93M |
| `beam:mustCrossFirst@beam2000` | 692 | 3 | 91.8M | 30.59M |
| `beam:objectiveFirst@beam5000(diverse)` | 396 | 4 | 132.7M | 33.17M |

These numbers are **within-beam census diagnostics**, not canonical-work ROI estimates and not same-revision causal effects. They are still useful for racing candidate actions before investing in selector complexity.

The standout by absolute residual coverage is `beam:intersectionHarvest@beam5000(diverse)`: ten current failures have an observed isolated solution while production never offers that base action to them, and all ten historical solves occurred below 1M nodes. The plain wide intersection-harvest beam has less absolute headroom but the lowest observed nodes-per-solve on its much smaller absent population.

Across all missing beam identities, the observed isolated-success union is **21 current failures**. A richer portfolio is therefore not needed to establish value of information: one missing-action exposure pilot can be evaluated first.

## Starvation is a second, distinct seam

There are 117 winning census cells where production reaches the same base action and known-winning gate but gives the matching attempt less node depth than the historical isolated solve consumed.

Across those starved cells, the median current-depth / isolated-solve-depth ratio is only **0.30**. So most starvation is not a tiny off-by-one budget effect; many actions are materially shallower in production.

There is, however, a useful near-boundary subset:

- **21** starved winning cells on **18** levels are already within 10% of their historical isolated solve depth;
- **19/21** of those cells are beam actions;
- the remaining 2 are ordinary repair.

Examples include current attempts reaching 99.9% and 99.6% of the older isolated solve depth for wide objective/intersection beams. This makes narrowly repriced beam depth a plausible later development test, but it should follow the still-cheaper missing-exposure question rather than justify universal beam widening.

## Adequate-depth non-replay is small and diagnostic

Only nine current misses fall into the residual class where every observed winner is already offered and at least one matching action/gate reaches or exceeds its older isolated solve depth.

Several repair examples are particularly useful diagnostics: current and census attempts can share the same repair configuration, gate, and derived random seed while the current run expands more nodes and still fails. Because the census and current sweep are different solver revisions and the production action occurs after a different prefix history, this does **not** establish cross-stage semantic contamination or a correctness bug.

Treat these nine as a bounded replay/context-drift diagnostic set only after exposure and starvation headroom is addressed. If a same-revision fresh-versus-preceded discrepancy survives, use the repository's paired deterministic trace contract rather than reviving the retired admissible-stage archaeology.

## Priority consequences

1. **#0 scheduler / #1 confirmation stay first.** The static two-action suppression is already frozen and is currently consuming the reserved independent confirmation lifecycle. Do not alter it in response to this mined rejoin.
2. **#2 portfolio construction is now evidence-positive rather than merely exploratory.** The first execution question should remain simple: expose one already-existing cheap beam identity to a broader feature-defined residual population under a fixed envelope, rather than build a learned/dynamic selector.
3. **Race missing actions before tuning them.** The census supports a small beam menu with cheap natural exhaustion; broad DFS or repair-turn-biased exposure is much more expensive on failures and should not be promoted merely because it has isolated wins.
4. **Starvation becomes the next #2 sub-question after exposure.** The 18 near-boundary levels justify a narrow same-family depth/repricing test, not universal beam widening.
5. **#3 restart remains well motivated but still needs its canonical-work arm cap.** The large repair contribution to the starved set reinforces allocation/continuation-value research, but additive or node-equated seed retries still do not answer the fixed-work restart question.
6. **No new broad search machinery is earned here.** 585 current misses have no observed base isolated solver in this census, but the cheaper existing-menu seams should be exhausted before interpreting that remainder as a requirement for a new algorithm family.

## Interpretation boundary

This is deliberately a development join across revisions. It identifies **where to buy the next bit of information**, not what production policy to ship.

A census success can disappear after solver changes; a failed census cell can hide later capability; node counts do not substitute for canonical work; the partial shard can only make this analysis undercount observed capability; and the current 724 failures are themselves a mined residual population.

Any execution treatment selected from this report needs a same-revision fixed-envelope A/B and, if selected for promotion, fresh confirmation under the repository's existing cohort protocol.
