# Variant-library evidence audit

**Status:** first evidence-system pass complete; machine audit added for reproducible whole-library execution.

## Question

The historical variant-family resource is large enough to be treated as a research instrument rather than a bag of generated levels. This audit asks the same kinds of questions that recently improved hint provenance: what are the real semantic entities, which identities are trustworthy, which records support which kinds of inference, where dependence or missing context can masquerade as evidence, and what useful solver signal is already present but underused?

The goal is solver capability. Data hygiene matters only insofar as it prevents false conclusions, wasted compute, or missed opportunities to increase cold stress-corpus solves.

## Bottom line

The library is scientifically useful, but it is not one homogeneous dataset and should never be analyzed as one. At minimum it contains two different research regimes sharing storage: small designed mechanistic family experiments and later bulk family/census campaigns. Those regimes differ in parent selection, transformation intent, solver era, evaluation protocol, and inferential purpose.

The most important findings are:

1. **Record identity and puzzle identity are different layers.** The repository already experienced a real cross-corpus bare-ID collision (`R02000`) that caused family solve evidence to overwrite another corpus's result. Current indexing protects many record joins, but generation manifests also retain exact parent/variant content hashes that were not being used as an evidence-integrity surface. The new audit exposes exact-content convergence, no-op variants, conflicting logical variants, and family-ID collisions without assuming any is automatically a bug.
2. **Historical evaluation evidence has purpose-dependent value.** Modern run manifests preserve solver commit, policy, budget, selection, seeds and shard identity; much older family evidence does not. Missing context must remain unknown. Historical solves are valid historical capability evidence and strong nomination evidence, but do not establish current solver capability without current-code recheck.
3. **Family row count is an especially dangerous denominator.** Siblings share a parent and generator. Campaigns also selected parents for different reasons. A prevalence claim over raw variant rows can combine pseudo-replication with selection bias. Any population claim needs an eligible-parent denominator and campaign-selection model.
4. **Naive perturbation rescue is now empirically known to be confounded.** The current class-5 comparison found constrained shuffles rescue roughly three times as many parents as targeted swaps, and many unrelated swaps independently rescue the same parent. The mechanic-composition pilot independently found general-difficulty loosening. Solved/unsolved sibling differences are useful causal nominations only after showing that the transformation isolates the intended cause.
5. **Stored solution multiplicity is heavily derivative.** Variant-to-parent replay created very large numbers of referee-valid parent hints, and later provenance analysis found most stored hints in the relevant pool were cross-variant replays. A replayed solution is valuable evidence that the target puzzle accepts the path, but it is not an independent solver-discovery event.
6. **The historical census discarded information that current research now wants.** The September 11 structural-response work could not answer a per-technique family question because the old family census retained only the whole-ladder winning configuration per variant. This is information loss, not a null result.
7. **Conflicting historical/current observations are potentially useful signal.** The current family index correctly preserves differing observations for the same logical variant rather than flattening them. Those disagreements can nominate temporal-instability or budget-sensitivity studies once solver/run context is accounted for.

## Semantic model

The library contains several entities that must not be collapsed:

- **parent puzzle**: the canonical source level;
- **generation event / family**: one invocation or campaign producing relatives from a parent;
- **variant puzzle**: concrete generated puzzle content;
- **transformation relation**: the claimed structural relationship between parent and variant;
- **evaluation run**: solver code, policy, budget, seed and selection context;
- **solver attempt/result**: an observation about one puzzle under one evaluation context;
- **accepted solution**: a referee-valid path for a puzzle;
- **replay/transfer event**: application of an existing solution to another puzzle;
- **aggregate/report**: a copied or summarized representation of lower-level evidence;
- **derived claim**: a research conclusion made from one or more of the above.

Useful edges are `generatedFrom`, `transformedBy`, `evaluatedIn`, `solvedBy`, `replayedTo`, `selectedBecauseOf`, and `summarizedInto`. A future query layer should prefer these semantic relations over filename proximity.

## Identity ladder

There are at least five materially different identities:

1. **record identity**: corpus + parent + mode + variant ID;
2. **puzzle-content identity**: normalized puzzle content, represented in modern generation manifests by `parentContentHash` / `variantContentHash`;
3. **transformation identity**: parent plus the semantic operation that produced the variant;
4. **evaluation identity**: puzzle plus solver commit/configuration/budget/seed/run;
5. **evidence identity**: the underlying observation even when copied into multiple aggregate files or reports.

The `R02000` incident proves this distinction is operational, not theoretical. Two different puzzles shared a bare ID; flat family solve paths keyed only by that ID allowed one corpus's attempt to overwrite the other. A related branch-state mismatch later caused the renamed level to be silently skipped during parent replay. Those failures motivated corpus-qualified storage and joins.

Current family indexing is substantially safer: duplicate bare variant IDs are not joined unless the available context disambiguates them, and mixed-era aggregate snapshots reconcile by logical identity plus normalized evidence payload. Historical-only rows survive partial canonical coverage; contradictory rows survive as conflicts.

The remaining dormant integrity surface is exact content. Modern manifests preserve content hashes, so the new `scripts/variant-library-evidence-audit.mjs` reports:

- one exact parent content hash attached to multiple logical parent identities;
- one exact variant content hash attached to multiple logical variant identities;
- variant hash exactly equal to parent hash;
- duplicate logical variant identities, including conflicting content hashes;
- one family ID attached to multiple family identities;
- missing parent/variant content hashes.

These are **classification candidates**, not automatic errors. A symmetry fixed point can legitimately produce a no-op. Two transformations can legitimately converge on identical puzzle content. The important property is that such relationships become visible before row counts or family labels are interpreted as independent evidence.

## Purpose-specific evidence policy

The audit adds an explicit policy table to its machine output. The important distinctions are:

| Purpose | Admissibility rule |
|---|---|
| Generation lineage | Generation manifest is directly useful when parent, variant and relation identity are explicit. |
| Structural relation | Transform label alone is nomination evidence; decision-bearing causal use should reconstruct or content-check the claimed edit. |
| Historical solver capability | Valid for the recorded solver context. Missing historical fields remain unknown. |
| Current solver capability | Historical outcome nominates; current code/budget must recheck decision-bearing cliffs. |
| Within-parent causal nomination | Useful with transformation semantics and confound review; siblings remain correlated. |
| Cross-parent mechanism generalization | Requires whole-parent inference and campaign/selection conditioning. |
| Prevalence estimation | Requires explicit eligible-parent denominator and selection model. Raw row prevalence is insufficient. |
| Scheduler/config discovery | Whole-parent grouping and fixed-work comparison; family identity/outcomes never become runtime features. |
| Confirmatory holdout | Whole untouched parent units, with treatment frozen before exact failures are inspected. |
| Transfer/generalization | Requires unrelated parent/source/construction distribution beyond development families. |
| Solution transfer | Referee validation proves the path on the target; replay provenance remains derivative rather than independent discovery. |

This mirrors the lesson from hint provenance: the same record may be strong evidence for one question and unsafe for another.

## Population and selection effects

The resource was accumulated through different campaigns, not sampled once from a stable population.

The original July family work was deliberately small and mechanistic. It selected parents to study symmetry/orientation, repair behavior and particular solver cliffs. Later campaigns expanded broadly, including a fragile/robust census selected from levels unsolved under a then-current baseline and stratified by turn load. Still later wide-trove collection evaluated much larger families and additional transform modes.

Consequences:

- raw variant count is never an independent sample size;
- parent count is a better first denominator, but can still be selected/conditional;
- a parent that received many variants must not outweigh a parent with few variants by accident;
- transformation modes have different acceptance processes and different meanings;
- historical "unsolved parent" cohorts are conditional on the solver baseline that created them;
- revisiting an interesting family changes its status from clean confirmation material to development material;
- corpus-specific mechanisms must survive cross-corpus checks before being generalized.

The symmetry history is a useful warning. A particular orientation looked consistently harmful across the small published-corpus repair-gated cohort, then failed to replicate across stress-corpus families. The mechanism of orientation sensitivity was real; the universal orientation rule was not.

## Transformation confounding

The strongest current warning comes from the class-5 residual work.

A population-scale comparison of `swap` versus constrained-shuffle families found the larger, less targeted perturbation rescued far more parents than the smaller targeted edit. Inspection also found multiple unrelated single-object swaps independently rescuing the same parent without a shared feature separating solved from unsolved variants. The separate portal-terminal mechanic-composition pilot also encountered general-difficulty confounds.

Therefore:

- "a nearby variant solved" does not establish that the changed feature caused the rescue;
- larger or freer edits can simply make a puzzle generically easier;
- transform families are excellent for **causal nomination**, but causal attribution needs a decoupled or matched control;
- rescue rate itself can be a property of the generator's amount of difficulty relaxation.

This should be treated as a standing negative control for future family analyses.

## Evaluation provenance and mixed eras

Modern family evaluation manifests are strong. They record solver commit/ref/dirty state, invocation, selection, dataset identity, policy, budgets, seeds, shard identity, timestamps, outputs and source generation artifacts. The family index validates cross-shard agreement and completeness.

Historical artifacts predate that contract. They remain evidence, but their missing fields cannot be filled from modern defaults. The new audit measures evaluation rows with and without solver commit, run identity and recorded budget context, and includes the existing mixed-era conflict diagnostics.

A useful interpretation ladder for same-logical-variant disagreement is:

1. same solver/config/budget/seed identity and different result: possible nondeterminism or evidence corruption;
2. same solver family but different budget: possible budget cliff;
3. different solver commit: temporal capability drift nomination;
4. missing context: ambiguity, not instability evidence;
5. copied aggregate representations of one observation: dependence, not replication.

Only the first class should immediately nominate determinism replay.

## Solution and hint dependence

The variant library became a powerful solution source. Parent replay checked hundreds of thousands of variant hints and accepted very large fractions after referee validation; hundreds of corpus-2 parents gained their first known parent hint this way. That is a genuine capability-relevant result because it proves those canonical puzzles have valid solutions reachable through related generated instances.

It also changes how solution multiplicity must be interpreted. A later provenance census found that most stored hints in the relevant stress pool were cross-variant replays. One solver discovery can therefore produce multiple accepted records across related puzzles and then flow back to a parent. Counts of hints, provenance rows or solved relatives are not automatically counts of independent discovery events.

The right use is relational: which transformation exposed a path the canonical search missed, whether the transferred path is structurally informative, and whether the responsible search mechanism can be generalized without using historical identity at runtime.

## Information loss discovered

The family census currently cannot answer every question the historical compute appears to have "covered." The clearest example is the September 11 structural technique-response investigation: old family evidence retained the single whole-ladder winning configuration for each variant, but not isolated outcomes for each technique/configuration. The desired plain-vs-mechanic-buckets counterfactual was therefore absent and required a bounded current-code resolve.

This suggests a general rule for future family collection: preserve the smallest sufficient attempt-level result needed for plausible later counterfactuals, but do not explode storage merely to anticipate every question. Important retained dimensions are solver/config identity, work/budget, success/failure, seed/randomness semantics where relevant, and explicit generation relation. Detailed traces should remain mechanism-specific and earned.

## Dependency audit

Current decision-bearing family uses are mostly disciplined:

- `docs/variant-level-research.md` already requires whole-parent independence, current-code rechecks for decision-bearing historical cliffs, and conflict-safe mixed-era indexing.
- Workstream 1's recent structural-response extension used family flips only as an intermediate gate; it did not promote a selector from two parents, and the line closed when later stages did not justify generalization.
- Workstream 2's class-5 family/reference line explicitly closed naive perturbation rescue as confound-dominated rather than converting family rescue rate into a solver treatment.
- The current workstream authority treats family evidence as offline selection/diagnostic evidence and forbids IDs/outcomes/family labels as production routing inputs.

The main remaining dependency risk is **scratch analysis outside the shared index**. Any analysis that rejoins historical family aggregates by raw variant ID, silently prefers one filename era, weights rows as independent, or reports rescue prevalence without the campaign denominator can recreate already-solved evidence problems. The common index and the new audit should remain the front door.

## Newly exposed research opportunities

### Tier A: directly relevant to current residual solves

1. **Mixed-era conflict mining.** Use conflicting same-logical-variant observations to nominate a small set of temporal/budget cliffs, then current-code recheck only those with enough context to interpret. This turns reconciliation fallout into mechanism candidates rather than treating it solely as dirty data.
2. **Difficulty-neutral family controls for class 5.** Before generating new bulk variants, query existing siblings for transformations matched on broad difficulty proxies but differing in the candidate structural property. If no existing family can supply a decoupled control, specify exactly the minimal new pilot needed. This is the cleanest route to rehabilitating family evidence for the current capability-acquisition problem.
3. **Technique-specific rechecks on information-rich families.** Historical whole-ladder outcomes can nominate families where action/config value flips. Resolve only the exact technique pairs required by a current WS1/WS2 hypothesis, grouped by parent, rather than rerunning the trove.
4. **Solution-transfer mechanism analysis.** Separate witness-preserving transforms from transforms that materially alter obligations, then ask which solver families discover parent-valid paths through each class. This may expose representation/search failures that can be repaired generically.

### Tier B: evidence quality that may produce new hypotheses

5. **Effective unique-puzzle census.** Execute the exact-content audit on the full research branch. Quantify how many nominal variant rows collapse onto identical puzzle content, by transform mode and parent. This gives an empirical pseudo-replication measure rather than relying only on family counts.
6. **Campaign denominator map.** Reconstruct each major campaign's eligible population and selection rule, then attach a population label to derived analyses. This makes it possible to distinguish "prevalence among then-unsolved high-turn-load parents" from an accidental all-corpus claim.
7. **Generation rejection as evidence.** Where rejection/failure metadata survives, test whether inability to construct a requested controlled edit is itself structurally concentrated. This can reveal where a transform operator's apparent coverage is selective.

### Tier C: deliberately not earned

- another broad variant-generation campaign;
- a global scheduler rule from raw family rescue rate;
- a universal orientation correction;
- post-hoc scalar feature fishing over thousands of correlated siblings;
- treating replay-derived hint multiplicity as solver multiplicity.

## Durable guardrail added

`scripts/variant-library-evidence-audit.mjs` is a reusable whole-library audit over a `--variant-family-dataset-root`. It uses the current family index for evaluation evidence and independently reads generation manifests for content identity that the index does not currently expose.

It emits:

- semantic evidence-purpose policy;
- family/variant/parent counts;
- missing content hashes;
- exact parent/variant content collisions;
- parent-equal variant content;
- duplicate/conflicting logical variants;
- family-ID collisions;
- transform-mode parent/row shape;
- evaluation rows with/missing solver commit, run identity and budget context;
- existing family-index parse, run-manifest and mixed-era reconciliation diagnostics;
- bounded examples for forensic follow-up.

`variant-library-evidence-audit-unit-tests.mjs` exercises the key distinction: the same fixture contains a legitimate-looking exact-content convergence, a parent-equal variant, a conflicting logical variant, a family-ID collision and provenance-poor historical evaluation evidence. The audit surfaces each without declaring the content collisions bugs.

A full run against the 2.5 GB research checkout should be committed only if its output becomes a decision-bearing research artifact; the audit itself remains deterministic/re-runnable and should normally write to `tmp/` during exploration.

## What remains genuinely unanswerable from existing evidence

Some questions need new evidence rather than cleverer joins:

- per-technique outcomes for historical variants where only the whole-ladder winner was retained;
- current capability for historical cliffs not rerun under current code;
- pathwise first-divergence mechanism where no trace was collected;
- causal effect of a transform whose existing siblings simultaneously alter multiple difficulty-relevant properties and provide no matched control;
- unbiased prevalence outside campaigns whose original eligible population/selection rule cannot be reconstructed;
- semantic random coupling questions when historical runs record neither the necessary random-event mapping nor sufficient trace identity.

For these, the correct response is a bounded new measurement tied to a current decision, not bulk regeneration.

## Disposition

The variant library remains a high-value solver-research asset. Its best role is **relational and mechanistic**: nominate controlled boundaries, expose search asymmetries, recover transferable solutions, test configuration response across whole parents, and provide held-out challenges. Its weakest role is raw bulk prevalence.

The immediate research recommendation is to run the machine audit over the historical branch, classify any exact-content/identity anomalies, then use the resulting conflict and uniqueness strata to choose a small number of current residual families for one of the Tier-A analyses above. No new broad generation is earned by this audit.
