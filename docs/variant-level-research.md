# Variant-level research resource

Canonical reference for controlled level-family/variant research.

> **Current role:** family data supports scheduler/configuration discovery, causal search diagnosis, invariance/equivariance testing, and held-out generalization. It is **not** a reason to generate more variants by default and is never a runtime lookup table.

## Existing trove

The bulk dataset is off `main` on branch `claude/variant-levels-solver-insights-tpk4qg`, roughly 2.5 GB under `data/families/`, `logs/family-census/`, and `reports/families/`. One audited artifact contains 1,962 parents, 72,965 variants, 36,622 cold solves, and 78,429 attempt records; other campaigns bring the collection to roughly 96,000 variants.

That is already enough data that **new bulk generation has a presumption against it**. Before generating another large campaign, query the existing trove and state the unanswered question, why current families cannot answer it, the planned analysis, and the pilot size. Prefer small pilot -> analysis -> targeted expansion.

Historical solver outcomes are nomination evidence until rechecked on current code. Cite the specific campaign/artifact rather than treating all variants as one homogeneous table.

## Access

Use current `main` code/instructions and the trove branch as read-only historical data, preferably through a separate worktree:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
```

Run current tools against the sibling data root. If a tool assumes in-tree family data, add/use a data-root argument rather than executing historical branch code.

Build/query the disposable index with:

```bash
npm run family:index -- --trove-root=../pathfinder-variant-research
npm run family:show -- --trove-root=../pathfinder-variant-research --variant-id=F00110-01
npm run family:query -- --trove-root=../pathfinder-variant-research --corpus=corpus2 --mode=symmetry
npm run family:coverage -- --trove-root=../pathfinder-variant-research --corpus=corpus2
```

`.cache/family-index.json` is deterministic/disposable. Extend the family index rather than creating investigation-specific indexes.

## Scientific unit and independence

The scientific unit is:

> **parent + controlled transformation + solver-behavior change**

Sibling rows are correlated. Large row count does not create independent evidence, and a parent with 200 variants must not silently count 200 times more than a parent with two variants when the claim is about generalization across levels/families.

Rules:

1. report both row count and **unique parent-family count**;
2. split training/tuning/confirmation by whole parent family;
3. never scatter siblings across folds and call the result held out;
4. for population summaries, state whether rows or parents are weighted and justify the choice;
5. use parent-clustered/grouped uncertainty or parent-level summaries when inference treats families as the independent unit;
6. guard against overly specific geometry/fingerprints acting as family identifiers;
7. re-run decision-bearing historical cliffs on current code;
8. preserve full `(parentCorpus, parentId, variantId)` identity and generation/evaluation provenance.

A thousand near-duplicate siblings can be excellent causal evidence for one parent and terrible evidence that a rule generalizes to a thousand unrelated puzzles. Keep those uses separate.

## Discovery, confirmation, transfer

Family research uses explicit evidence roles:

- **discovery/tuning families:** may be inspected freely to find boundaries, choose descriptors, fit thresholds, or select configurations;
- **confirmation families:** held out while the candidate rule/configuration is chosen;
- **transfer/challenge data:** unrelated material from a meaningfully different parent/source/construction distribution used for claims beyond the family resource. A new seed from the same overall generator is sample-independent confirmation, not automatically cross-distribution transfer.

A rule that generalizes across siblings but fails on unrelated parents is family memorization. A rule that survives held-out parents but was tuned repeatedly on the same overall stress distribution is still not proof of universal Pathfinder generalization.

Once exact outcomes from a holdout family/block have influenced design, reclassify that unit as development data for descendants. Untouched blocks/parent families remain usable; do not discard an entire locked pool merely because one block was consumed. Where tooling permits, prefer aggregate holdout results during iteration and defer exact failure inspection until the treatment/decision is frozen. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

## What variants are for

| Question | Useful evidence |
|---|---|
| Orientation sensitivity | Rotation/reflection solve/work cliffs used to diagnose search bias. |
| Canonical failure | Close solved/unsolved relatives isolating a structural boundary. |
| Scheduler/configuration discovery | Controlled feature changes that flip action value or useful budget depth. |
| Beam retention | Parent/sibling boundary + lineage/first-divergence/frontier trace. |
| Repair behavior | Seed/operator/badness/retreat changes across close relatives. |
| Open-space/density effects | Controlled re-embedding rather than unrelated-level correlation. |
| Invariant/equivariant falsification | Symmetry/local-mutant counterexamples locating the first decision that fails to transform as expected. |
| Exact/oracle targeting | Families that bracket feasible/infeasible prefixes or reduced instances. |
| Generalization tests | Whole-parent held-out confirmation, followed by unrelated transfer data. |

Variants are especially useful for **causal nomination** because a controlled transformation can isolate what changed. They are weaker as raw bulk statistics because siblings share ancestry and generation machinery.

## Scheduler and automatic-configuration use

Family data can help discover legal generic descriptors for action selection, but the final policy must not depend on family identity/outcomes.

Good questions include:

- what structural change flips beam vs repair value;
- when useful budget depth changes after density/re-embedding;
- which transformations expose orientation-sensitive ordering/retention;
- whether a scoring-profile/ordering-bias/beam-width/seed configuration remains valuable across held-out parents;
- whether an apparent predictor survives after removing family-specific geometry.

For configuration search, use whole-parent splits and racing/successive elimination. Do not give every candidate every sibling merely because the data exist. Optimize marginal portfolio value at fixed `workSpent`, not total wins over correlated rows.

If a configuration wins because one prolific family contributes dozens of sibling successes, report that concentration. Require held-out-parent value before treating it as a general scheduler action.

See [`solver-scheduling-policy.md`](solver-scheduling-policy.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Orientation and symmetry policy

Rotation/reflection dependence is usually evidence about **finite-budget representation bias or diversification**, not a product feature to exploit with production rotate/retry loops.

Keep two symmetry questions separate:

1. **redundant symmetric states inside one search**, where canonicalization/symmetry pruning may avoid repeated equivalent exploration;
2. **representation dependence across isomorphic orientations**, where the question is whether scoring, ordering, retention, randomness, or truncation behaves differently for arbitrary encoding reasons.

For the second question, the key theoretical distinction is:

> **heuristic invariance is not search equivariance.**

Corresponding rotated/reflected states can receive identical heuristic values while successor order, secondary ties, coordinate-derived ordering, beam truncation, dedup, stable-sort fallbacks, or PRNG-consumption order produce different finite-budget traces.

For randomized search, use a second distinction:

> **same raw seed is not semantic random coupling.**

If transformed executions enumerate branches in a different order, they can consume the same PRNG stream at different semantic decisions. Three experimental questions require different randomness designs:

- **independent randomness** tests whether outcome/runtime distributions are transformation-invariant;
- **same raw seed/stream** controls only execution-order random draws and can lose correspondence after the first ordering divergence;
- **equivariant coupling** assigns corresponding random variates to corresponding transformed state/action events and is the right control when diagnosing pathwise first divergence.

Counter-based/stateless RNG can make semantic random keys addressable and reproducible, but it does not itself make the whole search equivariant. Every scoring, legality, ordering, retention and key-mapping step still has to transform consistently. Common-random-number coupling is an experimental variance-reduction device, not a correctness guarantee.

The current technique census already shows real directional inversions but **balanced aggregate beam/DFS discordance**, with no simple shared static predictor. That argues against assuming a universal CW/CCW defect or building a global directional correction from aggregate means.

For selected current-code symmetry cliffs, align traces through the inverse transform and locate the **first non-equivariant decision**:

1. legal successor set differs -> semantic/correctness issue;
2. corresponding hard-prune or heuristic value differs unexpectedly -> representation/heuristic issue;
3. values agree but rank/order differs -> tie-break/ordering issue;
4. ranks agree but retained beam set differs -> retention/dedup/truncation issue;
5. deterministic structure agrees but random trajectory diverges -> distinguish semantic random-key mismatch from ordinary PRNG-consumption-order mismatch before attributing the cause.

Then ask whether that same mechanism recurs across unrelated parents. Classify outcomes as:

- harmless trace difference;
- useful diversification;
- arbitrary representation bias;
- systematic harmful bias.

A rotate/mirror production retry requires a separate fixed-work scheduler case; it is not the default response to discovering a symmetry cliff. Likewise, broad graph/state canonicalization is not justified merely because orientation outcomes differ; it mainly addresses redundant orbit exploration and does not automatically make search representation-equivariant.

Do not overinterpret perfect puzzle isomorphism as a requirement that finite-budget heuristic search take identical paths. The research target is **recurring harmful arbitrary bias**, not cosmetic trace symmetry. If balanced directional differences provide complementary coverage, they may be useful diversification and should be valued through the scheduler rather than “fixed” on principle.

See [`../reports/heuristic-symmetry-deep-research-report.md`](../reports/heuristic-symmetry-deep-research-report.md), [`../reports/censored-continuation-symmetry-randomization-deep-research.md`](../reports/censored-continuation-symmetry-randomization-deep-research.md), and [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md).

## Generation gate

Before a new family campaign larger than a small pilot, record:

1. the precise unanswered question;
2. existing trove queries showing the gap;
3. transformation/operator needed;
4. independent unit and intended number of **parents** as well as rows;
5. analysis to be run before expansion;
6. stop criterion if the pilot is uninformative;
7. expansion rule if the pilot is informative;
8. how confirmation families will remain untouched during tuning;
9. how parent weighting/pseudo-replication will be handled.

Do not generate tens of thousands of variants merely to “have more data.” Do not expand a campaign because the first few interesting cliffs make additional data emotionally tempting; expansion should answer a prespecified uncertainty or mechanism question.

## Evaluation-run provenance

Decision-bearing family solver runs use the shared experiment-manifest system and record solver commit/ref/dirty state, tool/workflow, corpus/family selection, trove identity, solver config/flags, work/node/wall budgets, strict-total-work mode, seeds, shard identity, timestamps, outputs, and source-generation artifacts.

The family index checks shard completeness and attaches provenance to evidence. Historical artifacts remain readable but missing fields remain unknown; do not infer a uniform invocation contract retroactively.

Generation provenance does not make old solver results current. A current re-evaluation of selected historical cliffs should record how those cliffs were selected; it is forensic/confirmation evidence for the mechanism, not an unbiased estimate of cliff prevalence.

## Tools

| Need | Entry point |
|---|---|
| Generate a justified pilot | `npm run family:generate` |
| Build/query index | `family:index`, `family:show`, `family:query`, `family:coverage` |
| Join solve/mutation effects | `npm run family:analyze` |
| Boundary synthesis | `npm run family:boundary-report` |
| Parent/variant divergence | `npm run stress:family-pair-divergence` |
| Parent hint replay | `npm run family:parent-hint-replay` |
| Known-solution behavior | `npm run stress:solution-profile-compare` |
| Family-conditioned winners | `npm run solver:winning-attempts` |
| Technique probe | `scripts/method-probe.mjs` / `method-probe-sweep.yml` |
| Reduce a pathological level | `npm run stress:reduce-level` |
| Historical large campaign | `.github/workflows/family-wide-trove.yml` — **not a default next step** |

Start with [`tooling-catalog.md`](tooling-catalog.md) and the existing trove before adding tooling or data.

## Research priority

The trove is **evidence, not backlog**. Current family work should support ranked questions from [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md), especially:

1. held-out validation for scheduler/configuration rules;
2. beam extinction/retention boundaries;
3. first-divergence diagnosis for symmetry cliffs, with semantic RNG coupling only when randomness is part of the question;
4. exact/reference labels around causal boundaries;
5. repair/restart/operator behavior across controlled relatives.

Bulk census-generation for its own sake is deprioritized. If family analysis is no longer changing a ranked decision, stop mining it merely because the trove is large.