# Variant-library evidence audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — hostile second pass clarified variant/observation identity, generation selectivity, append-run counter loss, and observation-vs-attachment counting.
> **Decision:** keep the existing variant-family library as a high-value research instrument, but route decision-bearing use through explicit identity/provenance/selection semantics; do not launch another bulk generation campaign from this audit.
> **Remaining gate:** run the machine audit against the full historical variant-family checkout when whole-library collision/selectivity counts become decision-bearing; otherwise pursue only ranked solver questions that the existing library can answer cleanly.

## Question

The historical variant-family resource is large enough to be treated as a research instrument rather than a bag of generated levels. This audit applies the same posture that recently improved hint provenance: identify the real semantic entities, distinguish identities, classify evidence by purpose, expose dependence and missing context, and look for solver-relevant signal that data plumbing has obscured.

The goal is still solves. Data hygiene matters only when it prevents false conclusions, wasted compute, or missed capability.

## Bottom line

The library is scientifically useful, but it is not one homogeneous dataset. It contains at least two research regimes sharing storage: small designed mechanistic family experiments and later bulk family/census campaigns. Those regimes differ in parent selection, transformation intent, solver era, evaluation protocol, and inferential purpose.

The strongest findings are:

1. **Generated variant identity, puzzle-content identity, transformation context, aggregate-observation identity, and solver-evaluation identity are distinct.** The historical `R02000` collision demonstrated the operational cost of collapsing them. Current tooling is much safer, but the canonical documentation itself still blurred record identity with an aggregate reconciliation key; this audit repaired that distinction.
2. **Historical evaluation evidence is purpose-dependent.** Modern run manifests preserve solver code, policy, budget, selection, seeds and shard identity. Older evidence often does not. Missing context stays unknown. Historical solves establish historical capability and nominate current cliffs; they do not establish current capability without recheck.
3. **Raw family rows are a dangerous denominator.** Siblings share parents and generation machinery; campaigns selected parents for different reasons. Population claims require parent/campaign denominators, not row counts.
4. **Generation is itself a selection process.** A generated row has already passed operator eligibility, placement attempts, witness/referee checks and deduplication. Accepted variants are therefore a selected subset of attempted operator outcomes, not an unbiased sample of all possible edits.
5. **Appendable generation manifests lose a useful per-run denominator.** On a multi-run family, top-level `acceptedCount` is cumulative while `requestedCount`, `generationAttempts` and `attemptBudget` describe the latest invocation. `generationRuns` retains per-run variant IDs but not those counters. Historical acceptance-rate reconstruction is therefore ambiguous after append. The machine audit refuses to compute such rates for multi-run families.
6. **Naive perturbation rescue is empirically confounded.** Recent class-5 work found constrained shuffles rescue far more parents than targeted swaps, and unrelated swaps can independently rescue the same parent. The mechanic-composition pilot also found generic loosening. A solved sibling is strong causal nomination, not automatic proof that the named edit caused the rescue.
7. **Stored solution multiplicity is heavily derivative.** Variant-to-parent replay generated many referee-valid parent hints. Those prove target validity and can expose useful search mechanisms, but replay-derived records are not independent solver discoveries.
8. **Historical family compute discarded some counterfactuals current research now wants.** The recent structural-response investigation could not recover per-technique outcomes because the old family census retained only each variant's whole-ladder winning configuration. That is information loss, not a negative scientific result.
9. **Conflicting mixed-era observations can be useful signal.** Once solver/run/budget context is sufficient, differing observations for the same logical variant can nominate temporal capability drift, budget cliffs or true instability instead of being flattened away.

## Semantic model

The evidence system contains at least these entities:

- **parent puzzle**: source level;
- **generation event/family**: invocation or campaign producing relatives;
- **generated variant record**: one named relative under a parent;
- **puzzle content**: normalized structural puzzle identity;
- **transformation context**: family mode, relation and mutation description;
- **aggregate observation**: a historical or canonical stored solver result before it is joined back to a generated record;
- **evaluation run**: solver code, policy, budget, seed, selection and shard context;
- **solver attempt/result**: observation about one puzzle under one evaluation context;
- **accepted solution**: referee-valid path;
- **replay/transfer event**: application of an existing solution to another puzzle;
- **aggregate/report**: copied or summarized evidence;
- **derived claim**: research conclusion using one or more of the above.

Useful relationships are `generatedFrom`, `transformedBy`, `evaluatedIn`, `solvedBy`, `replayedTo`, `selectedBecauseOf`, and `summarizedInto`. Future analysis should prefer these relations over filename proximity.

## Identity ladder

The second pass resolved an important ambiguity in the live family authority:

1. **parent record identity:** `(parentCorpus, parentId)`;
2. **generated variant record identity:** `(parentCorpus, parentId, variantId)`;
3. **puzzle-content identity:** normalized puzzle content, represented in modern manifests by `parentContentHash` / `variantContentHash`;
4. **generation/transformation context:** `familyId`, `familyMode`, relation and mutation semantics;
5. **aggregate observation key:** historical aggregate reconciliation may temporarily use `(corpus, parentId, mode, variantId)` so observations from different recorded modes do not collapse before joining to generated records;
6. **evaluation identity:** puzzle + solver/configuration/budget/seed/run;
7. **evidence identity:** the underlying observation even when copied into multiple aggregate files or attached to multiple indexed records.

`mode` is therefore not part of canonical generated puzzle identity. It is transformation/provenance context and, where necessary, part of the historical aggregate-observation key. `docs/variant-level-research.md` now says this explicitly.

The machine audit also distinguishes **evidence observations** from **evidence attachments**. If one indexed observation is attached to duplicate generated records, that is dependence rather than replication and must not inflate provenance-coverage statistics.

## Exact-content integrity surface

Modern generation manifests preserve content hashes that were underused as a research-integrity surface. `scripts/variant-library-evidence-audit.mjs` reports:

- exact parent content shared by multiple parent identities;
- exact variant content shared by multiple variant identities;
- variant content identical to parent content;
- duplicate logical variant identities;
- conflicting content under one logical variant identity;
- cross-mode reuse of one logical variant identity;
- one family ID attached to multiple family identities;
- missing parent/variant content hashes.

These are **classification candidates**, not automatic corruption. Symmetry fixed points can legitimately produce parent-equal variants, and independent transforms can converge on the same puzzle. The important property is visibility before row counts or family labels are interpreted as independent evidence.

## Purpose-specific evidence policy

The same record can be strong evidence for one question and unsafe for another.

| Purpose | Admissibility rule |
|---|---|
| Generation lineage | Directly useful when parent, variant and relation identity are explicit. |
| Structural relation | Transform label alone is nomination evidence; causal use should reconstruct/content-check the edit. |
| Historical solver capability | Valid for the recorded solver context; missing context remains unknown. |
| Current solver capability | Historical outcome nominates; current code/budget rechecks decision-bearing cliffs. |
| Within-parent causal nomination | Useful with transformation semantics and confound review; siblings remain correlated. |
| Cross-parent mechanism generalization | Requires whole-parent inference plus campaign/selection conditioning. |
| Prevalence estimation | Requires explicit eligible-parent denominator and selection model. |
| Scheduler/config discovery | Use whole-parent grouping and fixed-work comparison; family identity/outcomes never become runtime features. |
| Confirmatory holdout | Requires untouched whole-parent units and decision-frozen treatment. |
| Transfer/generalization | Requires unrelated parent/source/construction distribution beyond the development family pool. |
| Solution transfer | Referee validation proves the path on the target; replay provenance remains derivative. |
| Generation selectivity | Compare requested/attempted/accepted only when those counters describe the same generation run. |

## Population and selection effects

The resource accumulated through campaigns, not one stable sample. The original family work was small and mechanistic; later campaigns selected different parent populations and eventually evaluated much larger collections and more transform modes.

Consequences:

- variant-row count is never an independent sample size;
- parent count is a better first denominator but may still be selected/conditional;
- prolific families must not silently outweigh sparse families;
- modes have different eligibility and acceptance processes;
- historical "unsolved" cohorts are conditional on the solver baseline that created them;
- inspected families become development data for descendant hypotheses;
- corpus-specific mechanisms need cross-parent/cross-corpus confirmation before generalization.

The symmetry history is a useful warning: an orientation effect looked consistent in a small selected cohort and then failed to generalize across stress families. Representation sensitivity was real; the universal orientation rule was not.

## Generation selectivity and lost counters

The current generator accepts only candidates that survive operator-specific eligibility, placement attempts, witness preservation/referee validation and fingerprint deduplication. Rejection can therefore carry information: some structural edits are much easier to realize on some parents than others.

Modern manifests preserve useful top-level generation counters and per-variant `generationAttempts`, but append semantics create a specific information-loss boundary. On subsequent runs of the same family:

- `acceptedCount` becomes the cumulative number of variants in the family;
- `requestedCount`, `generationAttempts` and `attemptBudget` describe the current invocation;
- `generationRuns` preserves timestamp/seed/generator identity and newly created variant IDs, but not per-run requested/attempt/budget counters.

That means top-level acceptance ratios become scientifically invalid after more than one generation run. The audit classifies those manifests as ambiguous instead of fabricating a denominator. If future research needs generator selectivity as a decision-bearing statistic, the producer should preserve those counters inside each `generationRun` prospectively; historical missing values should remain missing.

## Transformation confounding

Recent class-5 work supplies a standing negative control for family interpretation. Larger/less-targeted edits rescued substantially more parents than targeted swaps, and multiple unrelated swaps could rescue one parent. Separate mechanic-composition work also found generic difficulty loosening.

Therefore:

- "a nearby variant solved" does not establish that the changed feature caused the rescue;
- freer edits may simply make a puzzle easier;
- families are excellent for **causal nomination**;
- causal attribution needs matched/decoupled controls or mechanism-specific evidence;
- rescue rate can measure generator looseness as much as the named structural property.

## Evaluation provenance and mixed eras

Modern family evaluation manifests are strong: solver commit/ref/dirty state, invocation, selection, dataset identity, solver policy, budgets, seeds, shard identity, timestamps, outputs and source-generation artifacts are explicit. The family index validates shard agreement/completeness and attaches run context to evidence.

Historical artifacts predate that contract. Missing fields cannot be filled from modern defaults.

For same-logical-variant disagreement:

1. same solver/config/budget/seed identity and different result can nominate nondeterminism or corruption;
2. same solver family with different budget can nominate a budget cliff;
3. different solver commits can nominate temporal capability drift;
4. missing context is ambiguity, not instability evidence;
5. copied representations or duplicate attachments are dependence, not replication.

Only the first class immediately earns determinism replay.

## Solution and hint dependence

Variant-derived solutions are valuable because referee validation proves the target puzzle accepts them, and because a related puzzle can expose a path canonical search missed. But replay creates dependence across records. Counts of hints, variants or accepted transfers cannot automatically be interpreted as independent discovery counts.

The useful questions are relational: which transforms expose transferable paths, which search mechanisms discover them, and whether the mechanism can be generalized without using historical IDs/outcomes at runtime.

## Information loss already encountered

The historical family census cannot answer every question its compute appears to have covered. The clearest example is per-technique response: whole-ladder winner records do not preserve isolated outcomes for every technique/configuration. Current work had to rerun a bounded exact comparison rather than infer a nonexistent counterfactual.

The design rule is to preserve the smallest sufficient attempt-level result for plausible later comparisons: canonical action/config identity, work/budget, outcome, relevant randomness semantics, generation relation, and explicit run provenance. Detailed traces should remain mechanism-specific and earned.

The append-run generation-counter issue is the analogous loss on the generation side.

## Current dependency audit

Current decision-bearing family use is mostly disciplined:

- `docs/variant-level-research.md` requires whole-parent independence, current-code rechecks for historical cliffs, and conflict-safe indexing;
- recent structural-response work used family flips only as an intermediate gate and did not promote a selector from tiny family evidence;
- class-5 work correctly closed naive perturbation rescue as confound-dominated;
- production routing forbids IDs, family membership and historical outcomes as runtime inputs.

The main remaining risk is scratch analysis outside shared boundaries: raw-ID joins, silent filename-era preference, row-weighted pseudo-replication, acceptance-rate calculations across appended manifests, or rescue prevalence without an eligible-parent denominator can recreate already-known evidence errors.

## Research opportunities exposed

Highest-value uses of the existing library are:

1. **Mixed-era conflict mining:** nominate temporal/budget cliffs from conflicting observations, then current-code recheck only interpretable cases.
2. **Difficulty-neutral controls for class 5:** search existing siblings for transformations matched on broad difficulty effects but differing in the candidate structural property before generating anything new.
3. **Technique-specific rechecks on information-rich families:** resolve only exact action/config counterfactuals needed by a current WS1/WS2 hypothesis.
4. **Solution-transfer mechanism analysis:** separate witness-preserving from obligation-changing transforms and ask which solver mechanisms discover parent-valid paths through each class.
5. **Effective unique-puzzle census:** run the exact-content audit on the full historical checkout and quantify nominal rows that collapse to identical content, by parent/mode.
6. **Campaign-denominator map:** reconstruct eligible parent populations and selection rules for major campaigns before making prevalence claims.
7. **Generation rejection/selectivity:** where run-consistent counters survive, test whether low acceptance or high attempt cost clusters structurally. Do not reconstruct multi-run historical rates from incompatible top-level counters.

Not earned by this audit:

- another broad variant-generation campaign;
- a global scheduler rule from raw rescue rate;
- a universal orientation correction;
- post-hoc scalar feature fishing over correlated siblings;
- treating replay-derived hint multiplicity as solver multiplicity.

## Durable guardrail

`scripts/variant-library-evidence-audit.mjs` is a deterministic whole-library audit over `--variant-family-dataset-root`. Schema v2 emits:

- explicit record/observation identity semantics;
- family/variant/parent counts;
- missing and colliding content identities;
- no-op, duplicate, conflicting and cross-mode logical variants;
- family-ID collisions;
- transform-mode population shape;
- generation-counter coverage and append-run ambiguity;
- evaluation observations versus attachments;
- solver/run/budget provenance coverage;
- existing family-index parse/run/mixed-era diagnostics;
- bounded examples for forensic follow-up;
- a purpose-specific evidence-policy table.

It is covered by focused fixture tests and the ordinary Vitest population. Exact-content collisions are surfaced for classification rather than declared corrupt by fiat.

A full run over the approximately 2.5 GB historical checkout should produce committed numbers only when those numbers become decision-bearing. During exploration, the audit should normally write to `tmp/` or stdout.

## What existing evidence cannot recover

Clever joins cannot reconstruct:

- per-technique historical outcomes where only a whole-ladder winner was retained;
- solver/config/budget identity absent from legacy evaluation records;
- per-run requested/attempt/budget generation counters for already-appended manifests;
- rejected candidate details that were never stored;
- an unbiased population denominator for campaigns whose original eligibility/selection rule is not recoverable;
- independent discovery multiplicity from replay-expanded solution records without producer provenance.

Those remain unknown unless a new bounded measurement is scientifically worth the cost.

## Closeout

The audit has changed the way the library should be read, added executable guardrails, corrected a live identity ambiguity, exposed an additional producer-side information-loss boundary, and produced several bounded solve-oriented research uses. Further generic auditing now has diminishing returns.

The next work should come from a ranked solver question, not from continuing to excavate the library because it is large.