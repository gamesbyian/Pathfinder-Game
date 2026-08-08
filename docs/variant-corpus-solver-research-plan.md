# Variant Corpus Solver Research Plan

> **Status:** tooling implemented; corpus research not yet run
> **Last evidence:** 2026-08-07 — family-wide research trove, symmetry-family investigations, current solver-development ledgers
> **Decision:** use the variant corpus to identify and diagnose solver competence boundaries that can yield more cold solves or less work without regression; treat symmetry disagreement primarily as evidence of representation-dependent solver failure, not as a production retry strategy
> **Remaining gate:** run the read-only boundary tooling on the existing wide trove and use its ranked queue for selected divergence/profile diagnosis; no corpus research was run as part of the tooling implementation

## Objective

The variant corpus exists to improve the production solver.

The two primary outcomes are:

1. increase the number of canonical levels solved by the ordinary production solver at a controlled operating budget;
2. reduce machine-independent solver work while preserving the current solved set.

Descriptive research is useful only insofar as it helps reach one of those outcomes.

The preferred comparison order is:

1. solved-count delta;
2. machine-independent `workSpent` / fixed `workBudget` delta;
3. nodes expanded where comparable;
4. wall-clock time as a secondary operational measure.

A local improvement is not sufficient. Every solver hypothesis derived from variants must ultimately be tested against already-solved levels as well as the target population. A sound bound, better-looking heuristic, or additional unsolved-population win can still be net-negative under a finite shared budget.

## Existing systems to reuse

Do not rebuild capabilities that already exist.

The repository already has:

- controlled family generation for symmetry, local-mutant, swap, group-reshuffle, constrained-shuffle, density-sweep, and re-embed variants;
- witness preservation and canonical validation;
- level and hint provenance;
- the family-wide trove workflow covering the real corpora and collecting per-attempt telemetry plus additional hint enumeration;
- `family-analyze.mjs` for per-family mutation-effect joins;
- stress failure clustering, ranking, reduction, baseline diffing, stability classification, failure inbox, and regression promotion;
- `witness-divergence.mjs` and `hint-divergence.mjs` for real-state path replay and score-ablation diagnosis;
- hint-weight calibration and solution-profile tooling;
- winning-attempt analysis, scheduler reports, and historical portfolio replay;
- ablation infrastructure for scoring, pruning, strategy, template, and profile hypotheses;
- oracle/fuzz and CP-SAT-labelled diagnostic infrastructure;
- work-based solver accounting.

Do not add a second variant generator, hint enumerator, generic clusterer, generic profiler, generic benchmark runner, learned repair classifier, or research database unless a later concrete need cannot be satisfied by the existing artifacts.

## Core scientific unit: relationships between levels

Treat the corpus as a graph of controlled relationships, not as 96,000 independent benchmark rows.

The useful unit is:

```text
source level A
+ recorded transformation M
→ variant B
+ change in solver behavior
+ change, where measurable, in accepted solution behavior
```

Most existing level features remain useful. The new analysis should emphasize relational quantities such as:

- relation/mutation type;
- mutation magnitude;
- exact-witness preservation;
- parent/variant solve-status difference;
- parent/variant work ratio;
- winning-attempt/config difference;
- family solve rate;
- family winner concentration/entropy;
- path-rank or divergence delta where replayed;
- solution-profile distance where measured.

Do not build an O(n²) all-pairs graph. Prefer recorded parent→variant generation edges, with additional sibling comparisons only when a concrete diagnostic calls for them.

# 1. Symmetry variants are solver invariance tests

A rotated or reflected symmetry sibling is the same abstract Pathfinder puzzle under an invertible coordinate transformation. Its graph, obligations, and valid solution set are isomorphic to the parent's.

Therefore, large solver differences across symmetry variants are not evidence that the puzzle became harder. They are evidence that the solver is materially sensitive to representation.

Some sensitivity is unavoidable in a finite heuristic search. Tie-breaking, neighbour enumeration, beam truncation, randomized repair trajectories, and small score differences can change search order. The target is not identical node counts across all eight presentations.

The important failure condition is when orientation moves an isomorphic puzzle across the solver's competence boundary or causes extreme cost inflation.

Examples of high-priority symmetry pathology include:

- canonical unsolved, one or more symmetry siblings solved;
- one orientation solves cheaply while another does not solve at the operating budget;
- 10×, 100×, or larger work spread among orientations;
- winning technique/config changes systematically by orientation;
- one orientation exposes a reproducible score-term or search-order failure.

### Symmetry regret

For every family compute an invariance-oriented summary. At minimum:

```text
canonical status
8-orientation solved count
minimum solved work
maximum solved work
canonical work, if solved
best-orientation work
canonical/best work ratio
max/min solved-work ratio
winning-config distribution
solve-status consistency
```

Define a descriptive `symmetryRegret` for solved canonical levels as:

```text
canonical work / best symmetry-orientation work
```

For canonical failures with a solved sibling, classify regret as a solve-status cliff rather than forcing an arbitrary numeric infinity into downstream statistics.

Rank highest:

1. canonical failure with cheap symmetry success;
2. solve/non-solve disagreement among siblings;
3. extreme work spread;
4. extreme winning-technique/config spread.

### Correct use of a symmetry rescue

A symmetry solve is primarily a diagnostic witness that the existing solver already possesses enough search capability to solve the abstract puzzle under another representation.

The first response should be to diagnose the representation dependence, not to add "try the rotated level" as a production fallback.

A production orientation-retry strategy is explicitly deferred. It should be considered only for residual cases after the recurring underlying causes of symmetry disagreement have been investigated and where the remaining dependence appears to be irreducible heuristic tie-breaking rather than a fixable solver pathology.

### Diagnosis path

For the highest-regret families:

1. establish exact transform identity and validate the transformed/inverse-transformed known path;
2. compare full attempt traces;
3. replay a successful path under the hard and easy orientations using the existing real-state divergence machinery;
4. run existing per-`SCORE_*` and, where warranted, broader ablations;
5. locate the first meaningful search-order divergence;
6. determine whether the cause recurs across independent symmetry families;
7. formulate the smallest general intervention in the ordinary solver;
8. verify whether the symmetry spread collapses and whether canonical cold solves increase without regression.

R02248 is the model case: an isomorphic orientation split was traced to a concrete scoring interaction rather than worked around by retrying the easy orientation.

# 2. Build a corpus-wide boundary report

The main genuinely missing analysis layer is a corpus-wide relational index over the existing family artifacts and attempt telemetry.

Implement a tool with a name such as:

```text
scripts/family-boundary-report.mjs
```

The exact name and internal structure may follow repository conventions, but do not duplicate an equivalent existing tool if one has appeared since this plan was written.

It should consume existing canonical baselines, family manifests/provenance, and wide-trove attempt artifacts. It should not re-solve levels.

## Required classifications

### Symmetry pathologies

Report the invariance metrics above and rank severe representation dependence.

### Fragile canonical failures

Canonical parent fails while a meaningful fraction of controlled non-symmetry variants solve.

These indicate that the existing search machinery can solve nearby problems and should preferentially trigger diagnosis of:

- scoring/order interactions;
- templates/profiles;
- attempt ordering or budget allocation;
- repair trajectory sensitivity;
- phase-specific heuristic behavior.

Do not immediately propose new hard pruning for a fragile family.

Keep solve rate continuous and allow CLI thresholds rather than baking one universal fragile cutoff into the tool.

### Robust canonical failures

Canonical parent fails and almost all controlled nearby variants also fail.

These should be routed away from repeated score tuning and toward:

- lower-bound/pruning work;
- rule implication/recognition;
- search-state representation;
- genuinely different search methods;
- repair architecture;
- oracle-labelled diagnostics.

### Cost cliffs

Parent and variant both solve, but a controlled mutation produces a large work change.

Rank both directions. A mutation that makes a level dramatically cheaper can reveal missing guidance; one that makes it dramatically more expensive can expose fragile search behavior.

### Config switches and rescue concentration

For each family report the distribution of winning attempt configurations among solved variants.

Especially useful for a canonical failure:

```text
dominant sibling-winning config
fraction of solved siblings won by it
whether canonical parent attempted it
canonical allocation/work spent on it
whether canonical attempt timed out or exhausted
median successful sibling work for that config
```

This creates a direct scheduler/search hypothesis without pretending the observed winner is necessarily the globally best config.

Remember scheduler censoring: an earlier winning config prevents later configs from being observed. Winner counts alone are not evidence of independent technique superiority. When that distinction matters, use existing single-config/ablation machinery for the follow-up experiment.

## Mutation-conditioned summaries

Report solver effects by recorded intervention, for example:

- symmetry;
- specific local-mutant object type;
- swap;
- group reshuffle;
- constrained shuffle;
- density change;
- re-embedding/grid growth.

Useful derived summaries include:

```text
P(rescue | mutation type)
median work ratio
solve-status flip rate
winning-config switch rate
```

Allow conditioning on existing structural features such as reqInt, navDensity, turn load, archetype, portal count, and mechanic counts.

The purpose is to nominate solver hypotheses, not to convert correlations directly into production policy.

## Output

Produce both machine-readable JSON and a concise human-readable Markdown summary.

The report should provide a ranked queue of actionable cases, for example:

```text
1. symmetry solve-status cliff
2. extreme symmetry regret
3. high non-symmetry fragile solve rate
4. strong sibling winner concentration
5. extreme cost cliff
6. robust hard core
```

The queue should preserve enough identifiers and provenance to feed the existing reducer, divergence, ablation, failure-inbox, and benchmark workflows without manually reconstructing family context.

# 3. Generalize existing divergence tooling for family pairs

Do not create a third independent replay implementation.

`witness-divergence.mjs` and `hint-divergence.mjs` already replay successful paths through real solver state and score ordering. `hint-divergence.mjs` already supports per-score-flag ablation diagnosis.

Refactor only where useful to expose shared replay primitives, for example:

```text
scripts/stress/divergence-lib.mjs
```

Possible shared functions:

```text
tracePathRanks(...)
scoreFlagAblation(...)
resolveAttemptContext(...)
```

Keep existing CLIs behavior-compatible.

Then provide a family-pair mode, either by extending an existing CLI cleanly or by adding a thin wrapper that uses the shared library.

It should support:

- canonical parent vs symmetry sibling;
- canonical parent vs exact-witness-preserving non-symmetry sibling;
- explicit successful path selection;
- transform/inverse-transform handling for symmetry paths using existing geometry primitives;
- comparison under a specified or observed attempt context;
- parent/variant cumulative discrepancy;
- worst-ranked steps;
- first major differential divergence;
- per-score-flag differential ablation.

The key diagnostic signal is not merely that a score term contributes a large number. It is that changing/ablating a real production term changes the difficult representation much more than the easy related representation.

Do not add a second arithmetic score-decomposition framework unless an actual case cannot be diagnosed using the existing causal ablation machinery.

# 4. Replay variant-discovered solutions against canonical parents

Implement a small utility, if no equivalent already exists, to test whether solutions discovered while solving variants are valid on their canonical parent.

Suggested role/name:

```text
scripts/family-parent-hint-replay.mjs
```

It should be dry-run by default and use the canonical Pathfinder validator/referee as the authority.

### Symmetry variants

Inverse-transform the variant solution to canonical coordinates and validate it on the parent.

This should normally validate by construction. Any failure is a transformation/tooling defect worth surfacing loudly.

### Non-symmetry variants

Try the discovered path against the parent only when the coordinate representation makes that meaningful. Retain it only if the canonical validator accepts it.

Do not infer validity from similarity or witness preservation.

### Persistence

If optional `--save-hints` functionality is provided, reuse the existing hint merge and provenance systems. Never write bare paths that discard provenance.

A parent-valid variant-discovered path is useful because it can immediately feed existing solution profiles, calibration, divergence, and hint-diversity tooling even if the canonical cold solver did not discover it.

This utility does not convert the parent into a cold production solve. It enriches diagnostic ground truth.

# 5. Extend winning-attempt analysis with family conditioning

Do not build a new scheduler learner.

Extend the existing winning-attempt analysis only as needed to consume family metadata already present in wide-trove records.

Useful grouping dimensions:

```text
parentId
mode
parentId + mode
```

Prefer work metrics where available.

Per family/config report:

```text
solved variants
winner distribution
median/p90 winning work
attempt index
unique observed wins
winner concentration/entropy
```

For canonical failures, produce the sibling evidence needed to ask concrete questions such as:

> Does the canonical level give too little or too-late work to a configuration that repeatedly solves its controlled siblings?

Use existing historical scheduler replay only as a cheap filter. Because historical winners are scheduler-censored and replay does not model all scheduler-context effects, any promising routing/budget hypothesis must still go through a real direct A/B.

Do not revive the generic learned repair-winner classifier unless materially new evidence invalidates its existing negative verdict.

# 6. Couple solution-space and solver-space evidence selectively

Do not immediately run expensive solution-profile comparisons across every possible variant pair.

First use the boundary report to select important families.

For those families, compare solver-behavior change with existing solution-profile distance.

Use the diagnostic matrix:

| Solution-space change | Solver change | Interpretation |
|---|---|---|
| small | small | stable control |
| large | large | puzzle genuinely changed |
| large | small | solver robust to changed solution space |
| small | large | solver pathology / highest-priority heuristic-search counterexample |

For symmetry siblings, the abstract solution space is isomorphic by construction, so severe solver differences are already strong evidence without needing profile distance as proof.

For non-symmetry families, provenance breadth and hint saturation matter when interpreting profile distance. A sampled solution corpus is not a proof of complete solution-space equivalence unless provenance explicitly establishes exhaustive enumeration.

# 7. Use variants to choose the kind of solver work

The boundary analysis should route research rather than merely score levels.

## Fragile / symmetry-pathological families

Prefer:

- differential replay;
- score/strategy/profile/template ablation;
- phase-local search analysis;
- attempt-allocation analysis;
- reduction to a minimal reproducer.

Aim for the smallest ordinary-solver intervention that removes the dependence.

## Robust families

Prefer:

- rule-recognition derivation;
- lower bounds/pruning with written soundness arguments;
- oracle-labelled shadow evaluation;
- new search structure;
- repair-architecture work;
- admissible-search experiments.

Once a family is convincingly robust, generating still more nearby variants is usually lower priority than changing the search capability.

# 8. Look for phase-local failures

For top fragile boundaries, use existing path replay/calibration phase concepts to locate where the easy and hard relatives diverge:

- early construction;
- intersection harvesting;
- objective completion;
- portal transition;
- turn-obligation handling;
- final closure.

Prefer a feature-and-phase-scoped intervention over a global scoring retune when the evidence permits it. Narrow interventions reduce regression risk.

# 9. Feed findings into existing development workflows

Do not create a parallel issue queue.

The boundary report should emit enough relational context that interesting findings can be promoted through the existing failure-inbox/regression system.

Useful finding types include:

```text
symmetry-pathology
variant-fragile
variant-robust
variant-cost-cliff
variant-config-concentration
solution-space-stable-search-failure
```

A promoted case should preserve:

- parent ID;
- related variant IDs;
- relation/mutation details;
- canonical and variant solver outcomes;
- work metrics;
- winning configs;
- relevant path/profile evidence;
- solver commit/config/budget identity.

# 10. Experimental discipline

Every derived solver intervention must follow the existing diagnose→generalize→verify→refresh method.

At minimum:

1. confirm the mechanism on the family that nominated it;
2. test at an identical fixed work budget;
3. test against already-solved controls before claiming a gain;
4. test held-out families not used to design the change;
5. run published regression checks;
6. compare full-corpus gained IDs, lost IDs, solved total, and total work;
7. classify budget-edge instability with existing tooling;
8. preserve any genuinely novel validated solutions before reverting a net-negative experiment.

Do not treat an unsolved-only sweep as sufficient evidence for shipping a solver change.

## Family leakage

Any statistical model or predictive analysis using dense sibling data must split evaluation by whole parent/family, not random variant row. Random row folds would leak near-duplicate family information and materially overstate generalization.

Where provenance/generator generalization matters, also report holdouts by provenance/generator family.

## Censoring

Solver failure at a finite work budget is censored evidence, not logical unsolvability.

Winning config is also scheduler-censored: later configs are unobserved after an earlier success.

Analysis and naming should preserve those distinctions.

# 11. Explicitly deferred or closed directions

Do not use this plan to restart work that already has a negative or deferred verdict without new evidence.

In particular:

- no new generic learned repair classifier;
- no generic recipe-cousin generator yet;
- no production symmetry/orientation retry tier as the first response to symmetry disagreement;
- no separate generic solution-archetype system before demonstrating a gap in the existing solution-profile representation;
- no new global research database without a concrete analysis blocked by the current artifact layout;
- no duplicate failure clusterer, benchmark harness, hint enumerator, or score-attribution framework;
- no revival of specific rejected solver mechanisms merely because variants expose another hard level.

Always check `docs/future-work.md`, `docs/solver-development-roadmap.md`, current solver research notes, and the stress-corpus avenue ledger before converting a new correlation into implementation work.

# 12. Tooling implementation order

The next tooling work should be limited to analysis/diagnostic capability. It should not modify production solver behavior.

## Phase A: corpus-wide boundary report

Implement or extend tooling to produce:

- symmetry invariance/pathology metrics and rankings;
- fragile/robust parent rankings;
- cost cliffs;
- mutation-conditioned effects;
- config-switch and sibling-winner concentration evidence;
- machine-readable and concise human-readable output.

This is the highest-priority missing layer.

## Phase B: family-pair divergence

Refactor existing divergence code only enough to avoid duplication, then support parent/variant differential replay and score ablation.

## Phase C: parent-valid variant hint replay

Add the dry-run validation utility and optional provenance-preserving persistence.

## Phase D: family-conditioned winning-attempt analysis

Extend the existing tool rather than adding another scheduler-analysis stack.

## Phase E: selective profile coupling

Add only lightweight wrappers or joins needed to connect existing solution-profile data to selected boundary cases.

# 13. Success criterion for the tooling phase

The tooling phase is complete when it can answer, without re-solving the corpus:

1. Which canonical levels cross solve/non-solve boundaries under symmetry alone?
2. Which levels have the largest symmetry work regret?
3. Which unsolved canonical levels are fragile under small non-symmetry perturbations?
4. Which are robust across controlled variants?
5. Which controlled changes create the largest work cliffs?
6. Which existing configs repeatedly win solved siblings of a canonical failure, with proper warning about scheduler censoring?
7. For a selected boundary, where does a known successful path become disfavored and which existing score terms or policies causally contribute?
8. Which variant-discovered paths validate on the canonical parent and can enrich its diagnostic hint corpus?

The tooling itself should not change solver behavior, run new large experiments, generate new variant families, change attempt policy, add retries, retune scores, or claim new solver gains.

# 14. Development loop after tooling exists

```text
existing family trove
        ↓
boundary + symmetry-invariance report
        ↓
rank concrete solver counterexamples
        ↓
existing differential/ablation/reducer tools
        ↓
identify recurring mechanism
        ↓
small ordinary-solver hypothesis
        ↓
fixed-work A/B on target + solved controls + held-out families
        ↓
full corpus gained/lost/work comparison
        ↓
ship, narrow, or revert
        ↓
capture any novel hints
        ↓
refresh boundary analysis
```

The governing question is:

> Which currently-unsolved canonical levels lie closest to the solver's existing competence, what controlled change moves them across that boundary, and what underlying solver behavior can be corrected so the canonical puzzle crosses the same boundary without paying for a workaround?

For symmetry families, an even sharper version applies:

> Why does the solver distinguish two representations of the same abstract puzzle, and can that representation dependence be removed in a way that increases ordinary cold solves or reduces work across unrelated levels?
