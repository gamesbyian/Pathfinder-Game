# Technique budget-cap efficiency from the census

> **Status:** scheduler input / production-change nomination; not production policy
> **Evidence:** re-derived technique census `32240161854` (`76,614` unique eligible T1 cells) plus its second-order analysis
> **Decision:** do **not** globally lower deep-search caps. Treat cheap self-exhausting beams as screens, preserve a protected deep repair continuation, and make deep ordinary DFS/IDA continuations compete for residual budget because much of their measured capability is substitutable.
> **Remaining gate:** extend the rebuildable census analysis with per-technique cap-retention/tranche economics for all techniques, then test a current-code level-blind scheduler under a strict shared work envelope.

This report answers a narrower question than the general scheduling program in [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md): **are current search techniques receiving budgets far beyond the depth at which they ever succeed?**

The answer is mixed. The frozen census does not support a universal "wins early or never" rule on the hard residual population. It does expose a strong difference between cheap self-exhausting beams, genuinely deep repair, and deep DFS/IDA work whose marginal capability is often duplicated elsewhere.

## 1. The easy population really does win early

On the 1,074 levels the frozen production baseline solved, median isolated winning depths are low:

- beams: roughly **90K–250K nodes**;
- IDA: roughly **210K–270K**;
- ordinary DFS: roughly **0.6M–1.4M**;
- plain repair: roughly **0.38M**.

This is the familiar "if it works, it works quickly" regime. It is a poor basis for setting the hard-residual budget, however, because the 888 frozen production-unsolved levels have very different solve-depth distributions.

## 2. The hard residual population contains real deep wins

Among the frozen production-unsolved levels, median winning depth is approximately:

| family/example | hard-gap median winning nodes |
|---|---:|
| plain repair | 9.32M |
| repair turn-biased | 8.35M |
| repair must-turn-biased | 10.22M |
| ordinary DFS profiles | commonly 20M–35M |
| IDA profiles | commonly 25M–31M |
| 2K/5K beams | commonly 0.10M–0.30M |

The perfect-router curve makes the same distinction. Of 253 frozen-gap levels with any T1 isolated winner:

| per-technique cap | oracle solves retained |
|---:|---:|
| 100K | 24 / 253 |
| 250K | 73 / 253 |
| 500K | 108 / 253 |
| 1M | 116 / 253 |
| 2M | 124 / 253 |
| 5M | 141 / 253 |
| 10M | 171 / 253 |
| 20M | 202 / 253 |
| 50M | 253 / 253 |

A global 10M cap would therefore discard at least 82 isolated-oracle gap solves; even a 20M cap would discard 51. The 50M census ceiling is not irrational merely because most ordinary levels solve much sooner.

## 3. Beams are cheap screens, not 50M consumers

The nominal 50M census ceiling is mostly irrelevant to beam cost because beams naturally exhaust their frontier. Median exhausted frontier sizes on the gap population were about:

- 2K objective/intersection beams: **124K nodes**;
- 5K objective/intersection beams: **314K–317K**;
- diverse 5K beams: roughly **336K–340K**;
- perimeter 2K beams: roughly **147K**.

All solves in the currently emitted hazard curves occur by 1M nodes, and most by 500K:

| beam action | full hard-gap solves | solves by 250K | by 500K | by 1M |
|---|---:|---:|---:|---:|
| objectiveFirst 5K diverse | 40 | 10 | 37 | 40 |
| intersectionHarvest 5K diverse | 37 | 10 | 36 | 37 |
| objectiveFirst 5K, dedup-near-tie off | 31 | 13 | 31 | 31 |
| objectiveFirst 5K | 29 | 12 | 28 | 29 |
| perimeter CCW 2K | 28 | 27 | 28 | 28 |
| perimeter CW 2K | 27 | 27 | 27 | 27 |

This argues for **early beam screens**, not necessarily artificial beam caps. Their search already knows when it is finished. The major scheduling waste is running expensive searches before these small frontiers when the beam still has residual value.

The conditional-value analysis repeatedly found exactly that pattern: a perimeter beam costing only about 150K mean nodes still solves roughly 3% of the residual population after a failed deep DFS/IDA attempt. Reversing that order is a natural matched-work experiment.

## 4. Plain repair genuinely earns a deep continuation

Plain repair is the clearest counterexample to a simplistic early cutoff. Its 121 frozen-gap solves are distributed across the full 50M range:

| cumulative cap | repair solves retained | share of its 121 full-budget solves |
|---:|---:|---:|
| 100K | 9 | 7.4% |
| 250K | 11 | 9.1% |
| 500K | 14 | 11.6% |
| 1M | 18 | 14.9% |
| 2M | 27 | 22.3% |
| 5M | 42 | 34.7% |
| 10M | 64 | 52.9% |
| 20M | 84 | 69.4% |
| 50M | 121 | 100% |

Its censored conditional solve hazard also does not decay monotonically:

| repair tranche | at risk at tranche start | solves in tranche | conditional solve hazard |
|---|---:|---:|---:|
| 0–100K | 888 | 9 | 1.0% |
| 100K–250K | 879 | 2 | 0.2% |
| 250K–500K | 877 | 3 | 0.3% |
| 500K–1M | 874 | 4 | 0.5% |
| 1M–2M | 870 | 9 | 1.0% |
| 2M–5M | 861 | 15 | 1.7% |
| 5M–10M | 846 | 22 | 2.6% |
| 10M–20M | 824 | 20 | 2.4% |
| 20M–50M | 804 | 37 | **4.6%** |

So **37/121 repair wins, 30.6%, occur only after 20M nodes**, and **57/121, 47.1%, occur after 10M**. A hard repair cutoff in the usual "a few million" range would destroy much of repair's distinct hard-level capability.

Deep repair is expensive, though. A deliberately conservative upper-bound exposure calculation, treating every still-at-risk attempt as if it consumed the entire next tranche, gives:

| tranche | maximum tranche exposure | solves | max exposure / solve |
|---|---:|---:|---:|
| 0–100K | 88.8M | 9 | 9.9M |
| 100K–250K | 131.9M | 2 | 65.9M |
| 250K–500K | 219.3M | 3 | 73.1M |
| 500K–1M | 437M | 4 | 109.3M |
| 1M–2M | 870M | 9 | 96.7M |
| 2M–5M | 2.583B | 15 | 172.2M |
| 5M–10M | 4.230B | 22 | 192.3M |
| 10M–20M | 8.240B | 20 | 412M |
| 20M–50M | 24.120B | 37 | 651.9M |

These are **upper bounds**, not actual measured tranche costs: successful/exhausted runs leave the risk set inside a tranche, and raw nodes are not the cross-technique production work currency. They nevertheless show the correct scheduler shape: deep repair has real yield, but its tail should be a **protected continuation for a residual population**, not something placed casually ahead of cheap screens.

## 5. The strongest irrational-allocation signal is deep ordinary DFS/IDA redundancy

The second-order substitutability screen asks whether each gap solve is reproduced by *some* technique with a lower mean isolated attempt cost. It is not a production-removal proof, but the magnitude is striking.

The generated table currently contains the following deep ordinary DFS rows at 100% substitution:

| technique | gap solves | mean attempt nodes | substituted by cheaper-mean technique |
|---|---:|---:|---:|
| `dfs:closureCommitment` | 10 | 49.77M | 10 / 10 |
| `dfs:nearClosureRescue` | 11 | 49.76M | 11 / 11 |
| `dfs:mustCrossFirst` | 11 | 49.75M | 11 / 11 |
| `dfs:portalFirstTransfer` | 10 | 49.75M | 10 / 10 |
| `dfs:portalCommitted` | 10 | 49.74M | 10 / 10 |
| `dfs:intersectionHarvest` | 12 | 49.73M | 12 / 12 |
| `dfs:harvestThenFinish` | 12 | 49.72M | 12 / 12 |
| `dfs:perimeterSweep` | 11 | 49.71M | 11 / 11 |
| `dfs:objectiveFirst` | 11 | 49.69M | 11 / 11 |
| `dfs:default` | 11 | 49.65M | 11 / 11 |

Two cautions matter here:

1. The current high-level second-order doc summarizes this as **nine** ordinary DFS profiles, while the generated table visibly contains ten 100%-substituted DFS rows. Reconcile that counting/classification convention before publishing a formal removal list.
2. "Substituted by any cheaper-mean technique" is not the same as "redundant after the exact production predecessors." The cost-weighted greedy cover can still select a globally substitutable technique late because its substitutes may themselves have been displaced by earlier choices. This is precisely why the scheduler must optimize **conditional residual value**, not delete rows from a global-overlap table.

Still, the signal is too large to ignore. Spending near-50M mean isolated nodes on a family whose measured gap wins are all reproducible elsewhere is a much stronger budget concern than repair's expensive but genuinely distinctive tail.

Two near-total cases reinforce it:

- `dfs:perimeterSweep/perimeterCW`: **23/24** gap solves substituted;
- `ida:mustCrossFirst`: **22/23** substituted.

## 6. Equal deep budgets for admissible-order profiles deserve immediate scrutiny

Current orchestration runs each `ADMISSIBLE_ORDER_PROFILES` entry as its own sequential sub-pass with a full, unshared budget slice. The source comments explicitly say the profiles are ordered by historical yield and that lower-yield profiles have not been individually budget-tuned.

The isolated census does not make all profiles look equally valuable. On the frozen gap population:

- `ida:none` vs `ida:default`: **13 none-only** wins, **8 default-only**, 9 both;
- `ida:default` consumed **107.4M more total isolated nodes** than `ida:none` across the 888 gap levels;
- the cost-weighted cover selects `ida:none` before other IDA profiles and never selects `ida:default` or `ida:nearClosureRescue` in its path to the complete-technique union;
- `ida:mustCrossFirst` is nearly entirely substitutable in the simple screen despite being somewhat cheaper overall than `ida:none` in their direct comparison.

This nominates per-profile budgeting and ordering very strongly. It does **not** justify simply removing `default` or shrinking every admissible-order profile to a tiny cap. Historical reverse-oracle analysis found eight real admissible-order stage wins that do not reproduce from fresh isolated preparation even at enormous budgets; preceding ladder activity or equivalent context matters. Any admissible-order budget change must therefore be tested through the real sequential ladder, not inferred from independent cells alone.

## 7. Cost-weighted portfolio evidence says "screens first, deep specialists later"

On the 37 techniques fully sampled across all 888 frozen-gap levels, the cost-weighted greedy cover reaches its first **105** oracle solves using twelve beam actions before adding plain repair. Plain repair then adds **77** residual solves in one step, taking the cumulative total to 182. Deep IDA/DFS profiles supply the remaining thin tail.

This should not be copied literally into production, but the shape is informative:

1. cheap, naturally bounded beam screens have exceptional solve/work value;
2. plain repair remains a major distinct capability source despite its cost;
3. the remaining deep DFS/IDA portfolio is long and thin, with many profiles contributing only 1–4 residual solves in that particular greedy ordering.

That is almost exactly the architecture proposed in `solver-scheduling-policy.md`: cheap screens, protected deep searches, and then residual deep actions competing for a fixed envelope instead of each receiving an inherited full allowance.

## 8. Recommended action classes

### Cheap/self-exhausting screen

**Beams.** Run early when eligible. Let natural frontier exhaustion terminate them. For the beam actions represented in the current hazard output, all measured gap wins occur by <=1M and most by <=500K.

### Protected deep capability

**Plain repair.** Preserve a meaningful deep continuation. A sensible scheduler representation is multiple actions rather than one monolithic entitlement, for example:

- repair probe through ~2M;
- medium continuation 2M–10M;
- deep continuation 10M–20M;
- protected tail 20M–50M.

Those are evidence-analysis bands, **not proposed production constants**. The scheduler can decide whether each next tranche still outranks other residual actions.

### Deep continuation requiring stronger justification

**Ordinary DFS and admissible-order/IDA profiles.** Their own hard wins are often genuinely deep, so a low universal cutoff is unsafe. But their overlap and residual contribution are weak enough that each deep continuation should earn its place against alternative actions rather than automatically inheriting a full 50M-equivalent opportunity.

## 9. What to implement/test next

Do not change production caps directly from this frozen-node analysis. The next production-shaped experiment should be the first scheduler tranche test:

1. **Extend `scripts/technique-census-second-order.mjs`** to emit the cap-retention curve for every fully sampled technique at `100K/250K/500K/1M/2M/5M/10M/20M/30M/40M/50M`, including:
   - solves retained and lost at each cap;
   - simulated capped node spend (`sum(min(observedNodes, cap))`) versus full observed spend;
   - tranche solve hazard and at-risk count;
   - exclusive/marginal solves under clearly stated comparator rules;
   - provenance/freshness and partial-sampling warnings.
2. **Join current production lifecycle reach.** Frozen isolated efficiency matters only where current production actually reaches the action. Measure current residual work spent before/inside each relevant stage.
3. **Build a static bounded scheduler arm** that:
   - schedules cheap self-exhausting beams before expensive searches when evidence supports both;
   - protects deep repair capability;
   - makes deep DFS/IDA continuations compete for remaining work by current residual value;
   - keeps sequence dependencies explicit.
4. **Shadow first, then matched-work A/B.** Use `workSpent`, not raw nodes, as the cross-technique allocation currency, and enforce `strictTotalWorkBudget` so a gain cannot be purchased by silently growing the tail.
5. **Audit losses as capability boundaries.** Any action delayed/capped by the scheduler that was formerly essential becomes a generic regression case to explain; never special-case its level identity.

## Bottom line

The census does identify likely irrational allocation, but **not primarily as one obviously absurd numeric cap**.

- **Beam budget:** effectively self-limiting and cheap. The problem is often that beams run too late.
- **Repair budget:** expensive but demonstrably productive deep into 20M–50M. Preserve it selectively.
- **Ordinary DFS/IDA budget:** individual deep wins exist, but the portfolio contains strong redundancy and very thin marginal tails. This is the best target for scheduler-driven withholding/delay of deep tranches.

The right optimization is therefore **budget entitlement by residual value**, not a universal lower cap.