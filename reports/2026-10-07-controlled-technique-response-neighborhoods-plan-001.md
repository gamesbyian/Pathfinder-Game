# Controlled technique-response neighborhoods — plan and infrastructure audit (2026-10-07)

> **Status:** active premise-discovery method.
> **Decision:** reuse the existing variant-family and technique-census systems; do not build a second solver harness or launch another bulk family-generation campaign.
> **Current gate:** run a bounded current-main pilot over existing controlled families, with whole parent families as the independent unit, then inspect only response-cliff edges with the existing pair-divergence microscope.
> **Treatment authority:** none. Interesting interactions nominate premises; they do not promote solver behavior.

## Question

The solver program has separately studied how techniques/configurations behave across populations of levels and how controlled variants of one level change solve behavior. The missing experiment is their interaction:

> Holding parent ancestry nearly fixed, which small legal changes to a level change the marginal value of a solver technique?

For a parent level L, controlled transformation delta, and isolated technique T, the response derivative is the paired change between T(L) and T(L+delta). The primary observable is the solve-state transition under an equal canonical-work envelope; secondary observables include work, node diagnostics, failure status, attempt response, and, for nominated cliffs, first search divergence.

The scientific unit is **parent family + controlled transformation + technique response**. Variant rows within one parent family are repeated measurements, not independent confirmation.

## What the repository already provides

### Controlled level perturbation

scripts/family-generate.mjs already produces referee-certified witness-preserving families with local one-object relocation, block-density sweeps, symmetry transformations, pair swaps, group reshuffles, constrained reshuffles, and re-embedding.

scripts/human-parent-contrast-pilot.mjs supplies a question-first front door for published/editor parents and already records evidence role, parent exposure, parent-family independence, transformation provenance and witness limitations.

The historical family trove is therefore useful as a nomination resource. Its existing audit records roughly 96k variants overall, including an audited artifact with 1,962 parents / 72,965 variants.

### Requirement perturbation

solver:req-length-sweep is already a controlled terminal-requirement experiment: it varies reqLen in memory without editing artifacts, supports canonical work budgets, separates solver failure from static/stored-witness feasibility, and reports winning-technique transitions.

This is a second response-neighborhood axis and should be treated separately from geometry mutation because it changes terminal selectivity while holding board geometry fixed. A later extension may add similarly disciplined reqInt neighborhoods if an earned question requires them.

### Technique isolation and pricing

The technique-census cell runner already owns canonical attempt/config parsing, isolated technique execution, optional ablation overrides, canonical workSpent, work-budget enforcement including strict IDA caps, deadline-truncation semantics, referee validation, attempt/failure telemetry, and worker-pool parallel execution.

This is the correct executor for the new matrix.

### Pairwise mechanism microscope

stress:family-pair-divergence already computes path-rank divergence, score-feature ablation differentials, semantic/prune/lower-bound snapshots, symmetry-equivariance diagnostics, and first meaningful divergence for one parent -> variant edge.

That remains a microscope for nominated edges. It should not be expanded into the population executor.

### Research-system safeguards

The existing research system already supplies parent-family independence, evidence roles, selection lineage, experiment provenance, current-code rechecks, opportunity sizing, work-budget discipline, and the rule that premise discovery cannot bypass treatment promotion.

## What historical family evidence can and cannot answer

The existing family resource should be queried before new generation, but the old corpus cannot simply be interpreted as a complete technique-response cube.

Historical family runs often retained a whole-ladder winner rather than every isolated technique result. The variant-library audit explicitly identifies per-technique counterfactuals as unrecoverable where those cells were never retained. Mixed solver eras, missing budget/config identity, transform selection, and sibling dependence further prevent treating all nominal variant rows as equivalent cells.

Therefore:

- use historical family outcomes to select information-rich parents/edges;
- reuse isolated technique cells only when solver/config/budget identity is adequate for the question;
- re-run decision-bearing cells on current code under one explicit equal-work protocol;
- do not infer missing technique outcomes from the ladder winner;
- do not count siblings as independent parents.

## New minimal integration

This tranche adds no new solver search code.

### technique-census-cell.mjs

Cells may now supply corpusFile for an arbitrary level corpus. Existing named published / corpus1 / corpus2 behavior is unchanged. Optional familyContext is echoed into result rows so parent/variant ancestry survives execution and sharding.

This lets the established census runner and worker pool execute family data directly.

### family-technique-response-plan.mjs

The planner consumes one family manifest, its parent corpus, its variant corpus, a caller-chosen set of canonical isolated technique keys, and one equal canonical-work budget.

It emits one FTR1 census cell for every parent-or-variant x technique combination. Every cell carries the family id, parent id, variant id, relation, witness relation and mutation manifest.

The planner intentionally does **not** choose techniques automatically. Technique selection is part of the research question, not plumbing.

### analyze-family-technique-response.mjs

The analyzer pairs every variant cell with the same technique's parent cell and classifies gain, loss, both-solved or neither. For solved pairs it also records canonical-work delta/ratio.

It marks an edge as **technique-response heterogeneous** when different techniques have different solve-state transitions on the same controlled parent -> variant transformation.

Heterogeneity is a nomination signal, not a causal conclusion. Generic difficulty changes, witness conditioning, or transformation looseness remain rival explanations until the edge is interpreted in context.

## First bounded pilot

Do not start with all 96k variants.

1. Query existing current/recent family resources for 6-12 independent parent families with small interpretable transformations and useful technique diversity.
2. Prefer local-mutant, swap, tightly bounded density changes, and selected symmetry edges. Avoid broad reshuffles in the first causal pilot.
3. Use 3-6 isolated techniques chosen to span genuinely different search behavior, not dozens of near-duplicate configurations.
4. Give every cell the same workBudget; use a generous wall deadline solely as a safety cap.
5. Report parent count, edge count and raw cell count separately.
6. Rank edges by solve-response heterogeneity, gain/loss sign disagreement between techniques, and large work-ratio crossings among both-solved cells.
7. Send only the strongest bounded edges to stress:family-pair-divergence.
8. Split subsequent confirmation by untouched whole parent families.

A useful first finding is not "technique A wins most variants." It is a recurring conditional statement of the form: a specific controlled structural change changes the relative value of technique A versus technique B across independent parents.

That is a candidate solver premise.

## Requirement-neighborhood companion

Run solver:req-length-sweep on the same or a deliberately separate parent sample to identify requirement cliffs. The current tool reports winning-technique transitions from the production ladder, so the first retained pass is nomination-only.

If nomination shows sharp reqLen boundaries, use the same isolated-technique executor to re-run selected fixed-geometry reqLen points under equal work. Keep geometry-family and requirement-family claims separate until evidence supports a shared mechanism.

## Stop / expansion rules

Stop a pilot if transforms mostly act as generic difficulty looseners, isolated techniques move together with no useful differential response, deadline truncation makes the equal-work matrix uninterpretable, one parent accounts for the apparent interaction, or the transformation cannot be stated more precisely than a large compound edit.

Expand only when a recurring interaction survives several independent parents or when one unusually clean edge exposes a specific missing observable that can be tested cheaply.

No production treatment, selector, scheduler rule or new capability follows directly from this lane. A discovered interaction must enter the ordinary question/premise -> smallest consumer -> matched-work economics -> confirmation path.
