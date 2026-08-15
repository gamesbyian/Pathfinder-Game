# Variant Corpus Solver Research Plan

> **Status:** the "canonical plus all siblings" cold-confirmation gate is complete (2026-08-15). Canonical: 5/8 solve, 3/8 genuine failures. Siblings for the 3 failures: `R02248` 7/7 (total disagreement — clean beam-exhaustion evidence), `R00156` 4/7, `R02960` 3/7 (both budget-allocation-flavored, not clean scoring bias).
> **Last evidence:** [ETT-028 source-selected family-boundary report](../reports/experiments/2026-08-13-technique-tuning/ett-028-family-boundary.md); [canonical-only cold retest](#canonical-only-cold-retest-all-eight-parents-2026-08-15); [sibling cold-solve](#sibling-cold-solve-all-3-confirmed-failures-2026-08-15)
> **Decision:** use the variant corpus to identify and diagnose solver competence boundaries that can yield more cold solves or less work without regression; treat symmetry disagreement primarily as evidence of representation-dependent solver failure, not as a production retry strategy.
> **Remaining gate:** none — the cold-confirmation gate this file was blocking on is done. `R02248`'s reproduced beam-exhaustion boundary is ready to feed Priority 2's K-vs-2K descriptor test; `R00156`/`R02960` are evidence for Priority 1's allocation experiment, not a new gate of their own.
> **Current handoff:** [Solver optimization: current priority queue](solver-optimization-current-queue.md#3-canonical-inclusive-family-boundary-retest).

## Objective

The variant corpus exists to improve the production solver.

The two primary outcomes are:

1. increase the number of canonical levels solved by the ordinary production solver at a controlled operating budget;
2. reduce machine-independent solver work while preserving the current solved set.

Descriptive research is useful only insofar as it helps reach one of those outcomes.

ETT-028's source-selected view covers 886 edges, 51 parents, and 123 relation families with zero missing variant rows. Its sibling-disagreement cohort is **R02795, R00156, R02248, R02960, R00548, R01465, R02239, and R02452**. Treat parents—not sibling rows—as independent units in the next test.

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

### Relationship to solver interoperability work

[`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md)
defines a separate but complementary research layer: typed artifacts emitted by DFS, beam,
admissible-order, repair, and future techniques, with replay-complete witnesses, neutral derived
metrics, proof-strength classes, and a bounded shadow-mode exchange contract. Do not duplicate that
artifact schema or build variant-specific versions of the same measurements here.

Once artifact instrumentation exists, controlled families become unusually strong evidence for
judging those artifacts. In particular, symmetry siblings can test whether an artifact class is
stable under an isomorphic presentation, while local mutants and other controlled cousins can show
which artifacts track real puzzle changes versus accidental search history. Family pairs can also
measure whether two techniques produce complementary artifacts on closely related puzzles before
any live handoff is enabled. This is a later join between the two systems, not a reason to delay the
current wide-trove boundary report or to turn the variant corpus into a production retry mechanism.

## 2026-08-13 saved-data audit update

The [existing solve-data tuning opportunities report](../reports/2026-08-13-existing-solve-data-tuning-opportunities.md) performs a preliminary parent-aware read of the wide Corpus1 trove without re-solving levels. It establishes three actionable facts:

- the wide artifact contains 1,962 parents, 72,965 variants, 36,622 cold solves, and 78,429 full attempt records;
- 37 bare variant IDs occur under more than one parent, so any analysis keyed only by variant ID can silently join unrelated families;
- four historical symmetry cliffs are strong current-main retest candidates: R00526, R01407, R01875, and R01675.

Those four families are a queue, not a capability verdict. They were observed on historical code and should be re-run on current main before any solver change is designed around them. Repair-probe allocation findings and the proposed adaptive-gate sweep live in the companion [repair-probe report](../reports/2026-08-12-repair-probe-early-main-loop-starvation.md).

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

The current cross-report synthesis is
[`reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md).
It reconciles the repaired 38-family rerun with the R02248/R01465 and Phase D ablations. The
durable result is a recurring failure *shape* across several position/attraction terms, not a
universal bad transform index or one globally broken score term. Use that synthesis rather than
the pre-fix headline in the original 2026-07-15 symmetry report.

# 2. Build a corpus-wide boundary report

The main genuinely missing analysis layer is a corpus-wide relational index over the existing family artifacts and attempt telemetry.

Implement a tool with a name such as:

```text
scripts/family-boundary-report.mjs
```

The exact name and internal structure may follow repository conventions, but do not duplicate an equivalent existing tool if one has appeared since this plan was written.

It should consume existing canonical baselines, family manifests/provenance, and wide-trove attempt artifacts. It should not re-solve levels.

Before that report is run, its join key must be corrected and regression-tested. The authoritative identity is the tuple `(parentCorpus, parentId, variantId)`, not a bare `variantId`. The current wide Corpus1 artifact contains 37 repeated bare IDs across different parents (for example, R00064 and S00064 both contain `F00064-sym-01`). The reporter should fail loudly on an ambiguous or incomplete identity rather than deduplicating it.

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

## Later join: artifact invariance and complementarity

Only after the instrumentation gate in
[`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md)
has produced real standardized artifacts, extend family analysis by joining those artifacts to the
already-recorded parent/variant relationships. Prefer joins in the boundary/reporting layer over a
second artifact store. Candidate questions include:

- does a typed artifact survive symmetry after transforming its replay witness back to canonical
  coordinates;
- which artifact fields are invariant, which vary harmlessly, and which correlate with a
  solve-status cliff;
- do different techniques emit complementary candidate/resource/failure artifacts across siblings;
- does an artifact emitted on an easy sibling predict a useful handoff on the hard canonical
  representation without encoding level identity;
- are apparent handoff predictors stable across held-out parent families rather than memorizing
  dense sibling data.

This later join remains shadow/offline analysis until the interoperability plan's own promotion
gates are satisfied.

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

## Symmetry-control instrumentation update (2026-08-11)

The family-pair divergence path now compares mapped legal sets, mechanic substate, lower bounds,
prune verdicts, neutral metrics, and total candidate scores at corresponding prefixes. The first
R02248 pilot found zero semantic mismatches across 202 prefixes and localized mapped ranking
divergences to steps 7 and 81. A matched repair-seed control then demonstrated the same exploratory
draw selecting different mapped moves from equal survivor sets in different production order. This
is a controlled taxonomy C→D interaction, not a production policy proposal. See
[`reports/2026-08-11-symmetry-equivariance-prefix-pilot.md`](../reports/2026-08-11-symmetry-equivariance-prefix-pilot.md).

> **2026-08-11 review status:** No production policy from this track was changed in the PR #1356 follow-up. Completed lineage/correctness evidence and the explicitly uncompleted oracle/receptor work are recorded in [the review follow-up report](../reports/2026-08-11-pr1356-review-follow-up.md); oracle abstentions remain abstentions.

## 2026-08-13 tuning-campaign checkpoint

The [existing-technique tuning campaign](../reports/2026-08-13-existing-technique-tuning-experimental-campaign.md) re-audited and repaired the family-result identity blocker. Boundary aggregation, flat-attempt coalescing, pair divergence, and parent-hint replay now use `(parentCorpus,parentId,variantId)`; legacy bare IDs resolve only when unique, namespaced rows cannot fall through across parents, ambiguous collisions fail loudly, and collision/cross-parent shapes are covered by regression. Historical boundary output is not retroactively certified: regenerate it and audit unmatched/legacy rows before using it. Do not treat an uncorrected historical output as evidence.


### 2026-08-14 current-main canonical persistence check

A locally protocol-frozen targeted cold retest at 5M nodes found R00526, R01407, R01875 and R01675 still unsolved (0/4), each exhausting its ceiling after three repair attempts and one admissible-order attempt. A locally protocol-frozen 50M-node follow-up then also failed 0/4, with minimum badness unchanged level-for-level from the 5M run (15, 13, 14, 10). This preserves all four as current-main family pathology candidates at the production capability budget and shows flat budget is saturated; it does not substitute for regenerated namespaced sibling results. See the ETT-012 section of the [campaign report](../reports/2026-08-13-existing-technique-tuning-experimental-campaign.md).

### 2026-08-14 campaign sequencing gate

Do not count ETT-010–013 as independently preregistered family evidence: their local protocol commits
were not preserved on a persistent GitHub ref. Before another family solve batch, regenerate joins
using `(parentCorpus,parentId,variantId)`, persist parent-family denominators, and require explicit
reach/progress telemetry. A future decision-bearing family protocol must use a full GitHub-resolvable
SHA/permalink and retain the ref after merge.


### 2026-08-14 wide-input identity blocker (ETT-021–023)

The filename census was invalidated by a tracked counterexample. Corrected ETT-023 found 63 family-result documents and 911 rows, but 0/911 rows carries complete namespaced identity; the 477-row Phase-C artifact also references an untracked combined corpus. Before any more family solves, migrate existing outcomes through manifest/file context with explicit unmatched and ambiguous counts, verify every used `(parentCorpus,parentId,variantId)`, and record solver/budget provenance.


### 2026-08-14 manifest identity recovery (ETT-024)

All 911 detected result rows resolve globally uniquely against the 161 tracked manifests (0 ambiguous,
0 unmatched; 1,237 distinct manifest variant IDs). A mechanical namespacing migration is therefore
possible for this tracked subset. Before boundary aggregation, preserve source file/commit/budget and
quantify duplicate measurements of the same edge; select runs explicitly rather than last-writing.
This does not prove the subset is the missing seven-chunk Corpus-1 trove.


#### Source-preserving family migration (ETT-025)

The 911 observations represent 886 edges in 51 parent families; 25 edges repeat twice. One repeated
edge flips solve status across a 60s standalone run and a 20s later-commit run, demonstrating that
last-write/pooling is invalid. Define and record an internally comparable source-selection view before
boundary aggregation; retain all excluded rows and cluster results by parent family. No new solve is
justified by this migration alone.


#### Corrected Phase-C sibling boundary (ETT-026/027)

ETT-026 was invalidated because absent canonical rows were treated as canonical failures. ETT-027
kept canonical status unknown and found historical solve-status disagreement in 8/11 symmetry parent
families at one 20s source run. Strongest sibling rates were R02795 5/7, R00156 and R02960 4/7, and
R02248 3/7. Treat these as four parent-family nominations, not independent sibling wins. A cold
current-main retest requires canonical plus all siblings, one persistent protocol ref, and no
production orientation retry proposal.

#### Canonical-only cold retest, all eight parents (2026-08-15)

First half of the "canonical plus all siblings" gate above — the eight ETT-028 nominated canonical
parents (`R02795, R00156, R02248, R02960, R00548, R01465, R02239, R02452`) cold-solved individually
on current main, production protocol (`scripts/level-blind-capability-sweep.mjs`, 50M node budget,
1 worker, sequential, non-binding 24h deadline — the exact tool/flags `solver-stress-refresh.yml`
uses, not `stress:benchmark`'s raced engine, which was tried first and discarded: an initial raced
run at a 120s time budget solved 8/8, but raced mode doesn't respect a node-budget ceiling and the
tool's own printed warning says its timings aren't production-representative — confirmed misleading
when the production-protocol re-run below disagreed with it on 3 of 8 levels). Local run, commit
`4efc2d1` (same commit as run #41/#42, zero `modules/`/`data/config/` diff verified against both).

**Result: 5/8 solved, 3/8 genuine `node-budget-reached` failures at the full 50M ceiling** —

| level | result | winning config | nodes / work | wall time |
|---|---|---|---:|---|
| R00548 | **solved** | `beam:objectiveFirst@beam5000(diverse)` | 4,499,936 / 18,359,079 | 30.1s |
| R01465 | **solved** | `beam:intersectionHarvest@beam5000` | 4,268,862 / 13,343,518 | 19.3s |
| R02239 | **solved** | `beam:intersectionHarvest@beam5000(diverse)` | 4,770,937 / 22,290,874 | 14.7s |
| R02452 | **solved** | `dfs:repair:repair` (2nd seed) | 2,143,156 / 3,818,154 | 2.8s |
| R02795 | **solved** | `dfs:harvestThenFinish` | 31,536,354 / 20,439,776 | 15.1s |
| R00156 | node-budget-reached | — | 50,000,096 / 47,232,580 | 17.4s |
| R02248 | node-budget-reached | — | 50,000,070 / 50,646,509 | 28.1s |
| R02960 | node-budget-reached | — | 50,000,108 / 48,657,970 | 29.7s |

Five of the eight canonical parents ETT-028 nominated are **not** current-main failures at all —
they solve cleanly, well under the 50M ceiling, using ordinary production techniques (beam variants,
`repair`, `harvestThenFinish`). This narrows the "canonical plus all siblings" gate's actual scope:
sibling comparison is only informative for the 3 genuine failures (`R00156`, `R02248`, `R02960`) —
running siblings against the other 5 would compare a solved canonical parent against its siblings,
which is not the symmetry-pathology question ETT-028 was built to answer. This does not itself
validate ETT-028's sibling-rate nominations (`R02795` 5/7, `R00156`/`R02960` 4/7, `R02248` 3/7) —
`R02795`'s inclusion in that list is now moot (canonical solves), and the other three's sibling
counts still need the actual sibling cold-solve half of the gate, not done here.

**Next**: cold-solve the nominated siblings for `R00156`, `R02248`, and `R02960` only, at the same
frozen protocol/commit, then compare against these three's confirmed-failure status.

#### Sibling cold-solve, all 3 confirmed failures (2026-08-15)

Symmetry families generated for `R00156` and `R02960` (7/7 accepted each, `--mode=symmetry
--seed=20260716 --count=7`, matching `R02248`'s existing manifest convention exactly —
`data/families/family-{R00156,R02960}-symmetry{,-manifest}.json`). All 21 siblings (7 per parent)
cold-solved at the identical production protocol as the canonical run above (50M nodes, 1 worker,
commit `4efc2d1`).

| parent | canonical | siblings solved | disagreement |
|---|---|---:|---|
| `R02248` | fail (node-budget-reached) | **7/7** | **total** — every rotation/reflection solves, canonical alone fails |
| `R00156` | fail (node-budget-reached) | 4/7 | partial |
| `R02960` | fail (node-budget-reached) | 3/7 | partial |

**`R02248` is a clean, single-mechanism reproduction of representation-dependent solver failure — and it carries zero mechanics that could explain it geometrically** (0 mustCross, 0 portals, 0 flipping filters, 11 plain blocks; `reqLen=101, reqInt=7`, so nothing axis-sensitive under rotation could be the cause). All 7 siblings solved via `beam:intersectionHarvest@beam5000` (5/7) or `beam:objectiveFirst@beam5000` (2/7), 4.17M–4.38M nodes each. **Canonical tried the exact same two configs** — and both **exhausted** (searched their full beam tree at that width and terminated cleanly, not a timeout) at only 205,351 and 166,474 nodes respectively, an order of magnitude cheaper than what the same config needed to succeed on every sibling. This is not a starvation story (the config got to run to completion) — it is direct evidence that `beam:intersectionHarvest@beam5000`'s scoring/retention discards the winning candidate specifically in this level's canonical orientation, while the identical technique at the identical width finds it in every rotated/reflected copy of the same puzzle. This is exactly the "reproduced, parent-clustered solver boundary that identifies a generic technique or representation change" `docs/solver-optimization-current-queue.md`'s Priority 3 success signal calls for, and it points squarely at Priority 2 (beam score/retention) as the relevant lane, not a new one.

**`R00156` and `R02960` show a different, budget-allocation-flavored disagreement, not a clean exhaustion story.** `R00156`'s winning sibling technique, `dfs:perimeterSweep/sideCommitment`, needed ~19.4–19.5M nodes to solve; canonical's own attempt at that exact template only got a 6.39M-node allocation before timing out and the ladder moved to the next technique. `R02960`'s winning sibling technique, `dfs:repair:repair`, solved in 0.8–1.3M nodes on 3 siblings; canonical's two `repair` attempts both timed out at the standard 2,000,000-node repair-probe cap without reaching that badness. In both cases the technique that eventually wins on a sibling **is tried on canonical too, but is cut off before it would have had comparable node count to work with** — a shape that directly supports Priority 1's allocation-bound thesis (`docs/solver-optimization-current-queue.md`: "the ladder usually spends the shared pool before every mechanically eligible technique receives a meaningful search") rather than Priority 2's scoring-bias thesis. Whether more nodes on that exact attempt would have solved canonical is not established here (a longer per-attempt allocation was not tested) — this is suggestive, not proof, unlike `R02248`'s exhaustion evidence.

**Caution on generalizing**: this is n=3 parent families, and the disagreement mechanism differs by family (clean scoring bias at `R02248` vs. budget-allocation shape at `R00156`/`R02960`) — do not treat this as one root cause. `R02248` alone is strong enough to justify including it as a held-out extinction-boundary case in Priority 2's K-vs-2K descriptor test (the beam already tried the winning config and rejected it, at a cheap, cleanly-reproducible node count). `R00156`/`R02960` are better evidence for Priority 1's allocation experiment than for Priority 2.

> **Correction (2026-08-15, same day): `R02248`'s "beam-scoring bias" framing above was wrong — it's a confirmed solver regression, not orientation sensitivity.** Checking `R02248`'s own hint provenance found `beam:intersectionHarvest@beam5000` had cold-solved canonical `R02248` reliably 11 times (182,923–184,005 nodes, deterministic) through 2026-07-31, then never again. Git-bisected to [`80a5706`](https://github.com/gamesbyian/Pathfinder-Game/commit/80a57068103d46a20beefc4a405f2f8cd012eb7e) (`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`, 2026-07-31) and causally confirmed via direct ablation at HEAD: disabling just that flag restores the exact historical solve (184,005 nodes, referee-valid). Provenance mining found 195 more candidate levels with the same shape; a 20-level verification sample confirmed 2 more regressions (`R02114`, `R00592`) and found 1 case where the flag's default-ON state is what's needed (`R03248`) — not a simple "disable the flag" fix. Full investigation, mechanism analysis, and recommended next steps: [`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md). This does not change the sibling-disagreement *fact* (7/7 vs. canonical fail is still real) — it changes the *explanation* from "beam scoring" to "a specific, traceable prune regression," which is a stronger and more actionable finding, not a weaker one.
