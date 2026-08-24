# Variant-level research resource

Canonical reference for controlled level-family/variant research.

> **Current role:** family data supports scheduler/configuration discovery, causal search diagnosis, invariance testing, and held-out generalization. It is **not** a reason to generate more variants by default and is never a runtime lookup table.

## Existing trove

The bulk dataset is off `main` on branch `claude/variant-levels-solver-insights-tpk4qg`, roughly 2.5 GB under `data/families/`, `logs/family-census/`, and `reports/families/`. One audited artifact contains 1,962 parents, 72,965 variants, 36,622 cold solves, and 78,429 attempt records; other campaigns bring the collection to roughly 96,000 variants.

That is already enough data that **new bulk generation has a presumption against it**. Before generating another large campaign, query the existing trove and state the unanswered question, why current families cannot answer it, the planned analysis, and the pilot size. Prefer small pilot → analysis → targeted expansion.

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

Sibling rows are correlated. Large row count does not create independent evidence.

Rules:

1. report both row count and parent-family count;
2. split training/tuning/confirmation by **whole parent family**;
3. never scatter siblings across folds and call the result held out;
4. guard against overly specific geometry/fingerprints acting as family identifiers;
5. re-run decision-bearing historical cliffs on current code;
6. preserve full `(parentCorpus, parentId, variantId)` identity and generation/evaluation provenance.

## Discovery, confirmation, transfer

Family research now uses explicit evidence roles:

- **discovery/tuning families:** may be inspected freely to find boundaries, choose descriptors, fit thresholds, or select configurations;
- **confirmation families:** held out while the candidate rule/configuration is chosen;
- **transfer/challenge data:** unrelated fresh/locked canonical or generated levels used for claims beyond the family resource.

A rule that generalizes across siblings but fails on unrelated parents is family memorization. A rule that survives held-out parents but was tuned repeatedly on the same overall stress distribution is still not proof of universal Pathfinder generalization.

Once exact outcomes from a holdout have repeatedly influenced design, reclassify it as development data and replenish/replace the holdout.

## What variants are for

| Question | Useful evidence |
|---|---|
| Orientation sensitivity | Rotation/reflection solve/work cliffs used to diagnose search bias. |
| Canonical failure | Close solved/unsolved relatives isolating a structural boundary. |
| Scheduler/configuration discovery | Controlled feature changes that flip action value or useful budget depth. |
| Beam retention | Parent/sibling boundary + lineage/first-divergence/frontier trace. |
| Repair behavior | Seed/operator/badness/retreat changes across close relatives. |
| Open-space/density effects | Controlled re-embedding rather than unrelated-level correlation. |
| Invariant falsification | Symmetry/local-mutant counterexamples. |
| Exact/oracle targeting | Families that bracket feasible/infeasible prefixes or reduced instances. |
| Generalization tests | Whole-parent held-out confirmation, followed by unrelated transfer data. |

Variants are especially useful for **causal nomination** because a controlled transformation can isolate what changed. They are weaker as raw bulk statistics because siblings share ancestry and generation machinery.

## Scheduler and automatic-configuration use

Family data can help discover legal generic descriptors for action selection, but the final policy must not depend on family identity/outcomes.

Good questions include:

- what structural change flips beam vs repair value;
- when useful budget depth changes after density/re-embedding;
- which transformations expose orientation-sensitive ordering/retention;
- whether a scoring/template/width/seed configuration remains valuable across held-out parents;
- whether an apparent predictor survives after removing family-specific geometry.

For configuration search, use whole-parent splits and racing/successive elimination. Do not give every candidate every sibling merely because the data exist. Optimize marginal portfolio value at fixed `workSpent`, not total wins over correlated rows.

See [`solver-scheduling-policy.md`](solver-scheduling-policy.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Orientation and symmetry policy

Rotation/reflection dependence is usually evidence of solver search bias, not a product feature to exploit with production rotate/retry loops.

Use symmetric families to locate:

- first ordering divergence;
- tie-break asymmetry;
- retention/dedup asymmetry;
- geometry encoding bias;
- direction/template dependence.

A rotate/mirror production retry requires a separate fixed-work scheduler case; it is not the default response to discovering a symmetry cliff.

## Generation gate

Before a new family campaign larger than a small pilot, record:

1. the precise unanswered question;
2. existing trove queries showing the gap;
3. transformation/operator needed;
4. independent unit and intended sample size;
5. analysis to be run before expansion;
6. stop criterion if the pilot is uninformative;
7. how confirmation families will remain untouched during tuning.

Do not generate tens of thousands of variants merely to “have more data.”

## Evaluation-run provenance

Decision-bearing family solver runs use the shared experiment-manifest system and record solver commit/ref/dirty state, tool/workflow, corpus/family selection, trove identity, solver config/flags, work/node/wall budgets, strict-total-work mode, seeds, shard identity, timestamps, outputs, and source-generation artifacts.

The family index checks shard completeness and attaches provenance to evidence. Historical artifacts remain readable but missing fields remain unknown; do not infer a uniform invocation contract retroactively.

Generation provenance does not make old solver results current.

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

The trove is **evidence, not backlog**. Current family work should support ranked questions from [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md), especially:

1. held-out validation for scheduler/configuration rules;
2. beam extinction/retention boundaries;
3. search-bias diagnosis for symmetry cliffs;
4. exact/reference labels around causal boundaries;
5. repair/restart/operator behavior across controlled relatives.

Bulk census-generation for its own sake is deprioritized.
