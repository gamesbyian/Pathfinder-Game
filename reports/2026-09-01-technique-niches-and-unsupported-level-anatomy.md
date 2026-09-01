# Technique niches and unsupported-level anatomy

> **Status:** active
> **Last evidence:** 2026-09-01 — deterministic frozen-census/static-feature join plus corrected EW1 and post-976 reconciliation
> **Decision:** preserve the current workstream order. Use corrected EW1/current-production work evidence for Workstream 2, and continue mining the existing census/current evidence before any production-shaped selector A/B. Do not reopen a closed mechanism or launch a larger census.
> **Remaining gate:** exact-current-head lifecycle/`workSpent` join against corrected EW1, followed by deeper per-technique/relative-advantage and unsupported-residual analysis; a fixed-work selector shadow/A-B is earned only if that work leaves actionable static-routing headroom.

## 1. Executive summary

The reconciled 50M-node census covers 1,962 levels and 41 operational action keys. Its isolated oracle union is **1,313/1,962 (66.9%)**; **649 (33.1%)** have no observed T1 winner. On the frozen production split, **253/888 (28.5%)** misses are isolated-solvable and **635 (71.5%)** are not. Of those 253 boundary solves, **161 (63.6%)** have only one or two winners. These are development/oracle bounds, not cold routing results.

Beam, repair, IDA, and ordinary DFS have genuinely complementary capability; every profile name does not. Repair is the largest deep specialist (59 canonical-repair singleton wins), directional 2K beams are cheap specialists, `ida:none` is distinct, and ordinary DFS has a smaller residual. Ordinary DFS score profiles and informed IDA profiles are mostly substitutes (best Jaccards .90-.94). Width, retention, admissible tie-break, and repair flags retain outcome inversions.

Static structure discriminates the risk of having **no frozen T1 census winner**, not current-solver unsupportedness, exact technique, or cost. Levels with no frozen T1 winner have higher combined constrained-object load (standardized difference **1.23**), turn/constraint load (**.92**), required length (**.84**), constrained density (**.79**), portals (**.76**), required-path coverage (**.75**), and must-turn count (**.70**). Prior held-out models explain only 14.7% of production successful-cost variance and 25.9% of census-minimum cost variance. Geometry, placement, topology, and within-search telemetry remain missing explanatory classes.

The highest-value immediate gate is already authorized: join exact-current-head lifecycle/`workSpent` evidence to corrected EW1. After that, continue the deeper niche/residual analysis before deciding whether a selector shadow/A-B is actually earned. The important no-new-sweep question is whether the 73 currently unoffered and 57 starved misses survive canonical-work normalization.

## 2. Data sources and evidence roles

* **Frozen T1 census 32240161854:** 76,614 unique isolated cells after 48 duplicates; observational development evidence with a common node ceiling, not common heterogeneous cost.
* **Second-order analysis:** authoritative compound-cell winner attribution, missingness, multiplicity, inversion, and censoring reconciliation.
* **Corrected EW1 33156541827:** 60 frozen-gap levels, 34 actions, 2,015 eligible cells, 10M canonical work/cell; bounded equal-work pricing evidence.
* **Post-976 production rejoin:** cross-revision development join on 724 current misses; exposure/starvation triage, not causal production comparison.
* **Feature/node-cost/clustering/repair-classifier evidence:** observational nominations with held-out limitations.
* **Variant families:** not newly joined. The 2.5GB owning dataset is absent from current `main`; stale snapshots cannot be forced through current identity reconciliation.

The resumption suite and current solver regression passed before artifact use. The regression baseline was stale, so the solve-set check is valid but its cost delta is not decision-bearing.

## 3. Technique/action universe and identity reconciliation

Exact canonical action keys are preserved and grouped into beam, DFS, IDA/admissible-order, and repair. A profile name is a scoring vector unless another operational layer changes. Width, mechanic-bucket retention, coarse-state/near-tie retention, admissible tie-break, structural bias, prune flags, repair seed/restart semantics, and retry context are not collapsed.

Compound cells use reconciled `level-technique-coverage.json` attribution; crediting every member of a successful pair creates false solves. Historical stage labels are not used. The former eight “admissible-order” production wins remain corrected to later mechanic-bucket-retention beam retries.

## 4. Capability matrix overview

| population | levels | isolated solved | zero | singleton | doubleton |
|---|---:|---:|---:|---:|---:|
| all | 1,962 | 1,313 | 649 | 181 | 96 |
| frozen production-unsolved | 888 | 253 | 635 | 119 | 42 |
| frozen production-solved | 1,074 | 1,060 | 14 | 62 | 54 |

The median supported production miss has two winners and a cheapest observed solve at 2.36M nodes; the production-solved median has 14 winners and 106K cheapest nodes. This is capability-margin evidence, not heterogeneous cost comparison.

## 5. Technique-family niches

* **Beam:** cheap natural exhaustion and shallow frontier. EW1 beams solve 8/12 oracle-union levels and own six family-exclusive levels; all self-exhaust below 10M work.
* **Repair:** strongest deep complement. Canonical repair solves 787 census levels, 121 frozen production misses, and 59 singleton levels; failures usually consume the cap.
* **IDA/admissible-order:** deep complement. `ida:none` solves 458 levels with 15 singleton wins; informed profiles overlap heavily. EW1 retains two IDA-family exclusives.
* **Ordinary DFS:** redundant score-profile cluster but not dispensable; EW1 retains one DFS-family exclusive and structural directions invert.

## 6. Per-configuration niches where evidence is sufficient

Largest exact-action singleton counts are canonical repair 59, turn-biased repair 17, `ida:none` 15, must-turn-biased repair 14, perimeter CCW beam 13, wide diverse objective beam 11, perimeter CW beam 11, wide diverse intersection beam 9, and the two near-tie-retention-off beams 8 and 5. Partial repair variants have only 968 eligible levels, so their rates are not full-population comparisons. Bias names remain configurations, not new algorithms.

## 7. Rare/exclusive capability

The 277 singleton/doubleton levels are the thin boundary; 161 occur among 253 frozen production-miss solves. Preserve them as regression-sensitive development cohorts. IDs remain offline replay keys only and must never become runtime steering inputs.

## 8. Substitution and complementarity

Closest substitutes are `ida:default`/`ida:mustCrossFirst` (Jaccard .936; 29 disagreements), `dfs:harvestThenFinish`/`dfs:portalFirstTransfer` (.932; 27), and several same-family pairs above .90. They nominate competing/delayed deep continuations, not deletion.

Cross-engine complementarity is clearer: production-unsolved phenotypes include repair-only 90, beam-only 51, IDA-only 17, and DFS-only 12 levels. EW1 confirms the architecture in canonical work.

## 9. Work/depth economics

The frozen perfect-router curve rises from 24 gap solves at 100K nodes to 108 at 500K, 171 at 10M, and 253 at 50M. Thus 108/253 (42.7%) of demonstrated gap capability is shallow by the within-technique 500K diagnostic, while 82/253 (32.4%) appears only after 10M. DFS/IDA/repair failures are cap-censored; beams usually exhaust. EW1 supplies the cross-technique statement: cheap beam screens first, then competing DFS/IDA work with protected repair. Wall time measures implementation speed.

## 10. Structural features associated with frozen T1 support

Strongest frozen-T1-supported versus no-frozen-T1-winner standardized differences are constrained objects 1.23, turn/constraint load .92, required length .84, constrained density .79, portals .76, coverage .75, must-turn .70, surround .55, and blocks .55. Intersection-heavy is 69.9% of the corpus and 81.2% of unsupported: enrichment only **1.16x**. Multi-portal is nearly neutral at 1.03x; general is depleted at .14x. Portal x constraint load, MustCross x flippers, and coverage x turn burden are nominations, not established effects.

## 11. Important configuration inversions

On 888 gap levels, objective 2K/5K is 1 left-only/20 right-only and intersection 2K/5K is 4/14. Plain/diverse wide beams are 7/18 and 3/17. CW/CCW beam is 14/13 and DFS 8/6. IDA no-tie-break and informed forms also invert. Wider/retentive arms cannot losslessly replace siblings, but these small selected cohorts do not justify universal widening. Near-tie-retention-off differences lack grouped lineage/extinction evidence; Workstream 4 stays closed.

## 12. Production-unsolved but isolated-solvable population

The latest post-976 decomposition is most actionable: among 724 current misses, 139 (19.2%) have a comparable observed base winner—73 not offered (10.1%), 57 offered but starved (7.9%), and 9 adequately deep but non-reproducing (1.2%). The remaining 585 (80.8%) have no observed base winner. Sequence/predecessor/revision ambiguity is confined to the nine diagnostic rows until same-revision paired traces say otherwise. These denominators differ deliberately from the full frozen 253/888 result.

## 13. Thin-boundary singleton/doubleton population

Thin capability is 277/1,313 (21.1%) of all oracle-solved levels and 161/253 (63.6%) of oracle-solved frozen production misses. It is the required rare-capability reporting and scheduler-loss stratum.

## 14. No-frozen-T1-winner population

The comparable frozen T1 matrix leaves 649 levels with no observed winner. **This is not a `no-current-technique` class:** 14 of the 649 were production-solved in the frozen production join, while 635 were production misses. The 14 are direct evidence that absence of a T1 winner cannot be equated with absence of solver capability. Of the 635 misses, 631 show beam exhaustion plus DFS, IDA, and repair node-cap termination; four show repair exhaustion too. This separates finite beam failure from censored deep failure but proves neither infinite cost nor missing algorithm.

The residue combines high coverage, more obligations, portals, and geometry. It is not one mechanic: intersection-heavy enrichment is modest and multi-portal neutral. Static labels cannot yet distinguish scale, ordering pathology, beam extinction, or reconstruction limits.

## 15. Frozen-T1-supported vs no-winner feature analysis

Earlier findings survive: combined constraint and portal load are broad risk markers; area, intersections, and individual mechanics are inconsistent cost predictors. Held-out ridge fits explain 14.7% of successful production log-cost and 25.9% of census-minimum log-cost. The best repair single-feature rule (`mustCross >= 2`) reaches F1 .471 versus .412 always-repair, with 237 false positives and policy/eligibility confounding. Use descriptors for stratification and shadows, not precise allocations.

## 16. Family/near-twin evidence

No new family join is claimed. Current `main` lacks the owning payload, which requires `family:index` conflict reconciliation per logical variant. Existing rotation/direction inversions nominate grouped mirror diagnostics but are not symmetry evidence. The future independent unit is parent; forcing filename precedence would be invalid.

## 17. Missing explanatory variables / candidate structural descriptors

The modest held-out fit establishes an explanatory gap. The smallest extension should test static graph topology and placement: gate-goal distance, obligation distances/order, articulation/bottleneck count, corridor-width distribution, portal endpoint region graph, and constraint clustering. Test incremental parent-grouped value offline first; stop if unstable. Only legal level-blind features can advance. Witnesses, identity, winners, and historical cost are illegal cold inputs.

## 18. Implications for Workstream 2

Do not change its order. Complete budget ownership, then exact-current-head lifecycle/`workSpent` joining against EW1. Price naturally exhausting beams first; protect repair; make overlapping DFS/IDA continuations compete. Audit all experiments on the 161 thin gap cases. Treat the 585 no-base-winner current misses as lacking **comparable demonstrated base-action capability in the current rejoin evidence**, not as proof that the current solver repertoire cannot solve them and not as scheduler waste.

## 19. Implications for Workstream 1

Shadow-test a deterministic selector using coverage, constraint load/density, portal load, turn burden, routing regime, and a small operationally distinct menu. Report oracle headroom, `workSpent`, and rare-capability recall. Static advantage prediction is modest; natural exhaustion, badness progress, frontier novelty/extinction, and repeated repair attractors may eventually be needed. Do not treat frozen-census no-winner membership as a runtime class or proof of current unsupportedness; never use replay identity.

## 20. Implications for Workstreams 0, 3, 4, 5, 6, 7, and 8

* **0:** no new restart/randomization premise; keep tested forms closed.
* **3:** stratify by support class, load, portal burden, and parent; report thin-boundary retention. Census/Corpus 2 are development evidence.
* **4:** fixed-width quota/bucketing and universal widening remain closed; no recurrent extinction evidence.
* **5:** exact work only for a prioritized matched boundary/no-winner feasibility or prune question.
* **6:** repair uniqueness recurs, but limitation classes do not; four known reconstructions span operator-incapable, cheap, and expensive. No large destroy/reconstruction project is earned.
* **7:** profile beam generation on cheap-screen workloads and deep kernels on thin expensive workloads; separate logical work and speed.
* **8:** remains subsumed by Workstream 1; 73/57/9 is selector input, not a permanent tail.

No queue-level gap is established: topology supports Workstream 1 diagnosis, exact labels 5, repair 6, and kernels 7.

## 21. Ranked concrete next research/experimental gates

1. Run the specified exact-current-head EW1/production reach-work join with `--check`.
2. Deepen the existing offline analysis before promoting a selector experiment: per-technique structural niches, matched wins/failures, pairwise relative advantage between close substitutes, interactions, and subtyping of the no-frozen-T1-winner production-miss residue.
3. Offline-test the small topology/placement bundle for incremental grouped value; stop on no stable gain.
4. With the variant dataset correctly mounted, run parent-grouped direction/placement analysis on prespecified inversions.
5. Use paired operational traces only for a surviving substitution/inversion or unsupported-residual mechanism question.
6. Only if the preceding work shows actionable legal static-routing headroom, prespecify a fixed-total-work production-shaped selector shadow/A-B with cold solves, total work, and thin-boundary losses as outcomes.

## 22. Negative findings and avenues that should remain closed

Do not reopen universal beam widening, tested quota/bucketing, global two-DFS suppression, generic repair-budget increases, W=150M restart split, cross-level connectivity certificates, learned repair routing, generic exact-matrix expansion, symmetry retries, or larger EW1. Names are not algorithms; failure counts are not enrichment; nodes are not heterogeneous work.

## 23. Limitations, censoring, selection bias, and generalization boundaries

The census is old-revision, mined development data. `no frozen T1 winner` means only that the frozen isolated matrix observed no winner; it is not a current-technique or current-solver impossibility label. Deep failures are right-censored while beams often exhaust. Partial samples undercount capability. Production joins cross revisions/contexts. Static effects correlate. Exact IDs and inversions were outcome-selected. Siblings are not independent families. No causal or cross-distribution claim is made.

## 24. Reproduction commands

```bash
npm run test:solver-research-resumption
npm run solver:regression -- --check
npm run test:analyze-technique-niches
node scripts/analyze-technique-niches.mjs
npm run check:documentation-links
```

## 25. Machine-readable artifact references

[`reports/stress/technique-niches/2026-09-01/level-capability.json`](stress/technique-niches/2026-09-01/level-capability.json) records input SHA-256 identities, effect/action tables, and each corpus-level's separate frozen-T1 and production support state, exact solving keys, families, depth observations, censoring, descriptors, and available family keys. It omits a timestamp for deterministic output.

## Plain answers to the 18 decision questions

1. Distinct niches: beam, repair, IDA, and a smaller DFS residual; directional beams, `ida:none`, repair, and behavior-changing retention configurations have exclusives.
2. Mostly substitutes: ordinary DFS scores and informed IDA profiles; wide-beam siblings are strong but not lossless substitutes.
3. Best support predictors: constraint load/density, portals, coverage, required length, and turn burden.
4. Family prediction: coarse features identify risk, but repair/technique advantage is not reliably statically predictable.
5. Advantage is modestly predictable at best; held-out cost/repair results reject precise static routing.
6. Current exposure/allocation headroom: 139/724 (19.2%); 73 unoffered, 57 starved, 9 non-replaying.
7. Explicit more-work capability: 57/724 (7.9%); the frozen curve shows a deeper tail but not current canonical cost.
8. No comparable observed base winner in the current rejoin: 585/724 (80.8%); no frozen T1 winner among frozen production misses: 635/888 (71.5%). Neither figure proves current-technique impossibility.
9. Residue: composed constraints, coverage, portals, turns, and scale.
10. Differences are interactions/load plus unmeasured geometry/topology, not a single count.
11. Recurring priority signal: cheap beams plus protected distinct deep engines; no new causal class.
12. Workstream 2 should complete its current join, not change direction.
13. Workstream 1 should shadow a small legal selector and report work plus rare recall.
14. Workstream 6 still lacks recurrence for one limitation.
15. No closed workstream should reopen.
16. Keep section 22 avenues closed.
17. Highest-value next gate: current-head work join, then deeper offline niche/residual analysis; fixed-work selector evaluation only if that analysis earns it.
18. Without a sweep: test current headroom under canonical pricing, deepen per-technique/relative-advantage analysis, and test topology/placement features offline.
