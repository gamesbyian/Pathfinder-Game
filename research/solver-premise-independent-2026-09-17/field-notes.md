# Independent solver premise-space investigation — field notebook

Date: 2026-09-17
Branch: `chatgpt/independent-premise-space-2026-09-17`
Base: `main` at `a1580a62607a794295ea2dd671d3297fc3399e51`

## Independence boundary

This investigation is being reconstructed from solver code, repository history, historical research snapshots, experiments, tooling, corpora, and evidence artifacts before consulting the premise-mapping work created immediately before this investigation.

Quarantined until the independent synthesis is substantially complete:

- `docs/solver-premise-space-atlas.md`
- `docs/solver-premise-space-completeness-matrix.md`
- `docs/solver-premise-space-extension-2026-09-17.csv`
- `docs/solver-premise-space-graph.json`
- `docs/solver-premise-space-register.csv`
- `docs/solver-premise-space-relations-v2.json`
- recent PRs whose purpose is premise mapping, and any premise IDs / ontologies / conclusions originating in them

Current queue/authority documents that cross-link the quarantined work are not being used to seed the conceptual reconstruction. They may later be consulted as evidence once their relevant claims can be traced to pre-mapping sources.

## Naming translation rule

`docs/naming-and-vocabulary.md` is being used only to translate current and historical language. Important canonical dimensions include search family, scoring profile, structural ordering bias, beam retention policy, routing regime, solver stage, resource envelope, and seed. Historical `reqLen`/`reqInt` remain wire spellings for current `requiredLength`/`requiredIntersections`; historical corpus-2 `random`/`randoms` terminology maps to `corpus2`; mechanic-bucket retention and coarse state merge are deliberately distinct from exact deduplication.

This vocabulary is not the investigation's ontology.

## Pass plan

The reconstruction uses several passes that are intentionally allowed to disagree before synthesis:

1. **Architecture / locus pass** — state representation, generation, inference/pruning, scoring/order, retention/equality, repair, retries, orchestration, budgets, routing, persistence/continuation, workers/boundaries, validation/termination, diagnostics.
2. **Claim pass** — descriptive, causal, architectural, algorithmic, empirical, methodological/evidential, negative, and scope/boundary claims.
3. **Research-function pass** — representation, inference, alternative generation, rejection, preference, retention/forgetting, allocation, information transfer, learning from failure, completion recognition, measurement, interpretation, plus functions discovered from the repo rather than this seed list.
4. **History pass** — solver generations, stress-corpus campaigns, variant/family research, repair/search architecture, orchestration and work-budget changes, major correctness and naming/refactor boundaries.
5. **Evidence pass** — population, budget, configuration, architecture, measurement, stability, provenance and witness/reference assumptions behind conclusions.
6. **Negative-space pass** — performed only after an independent structure exists.
7. **Hostile completeness audit** — search specifically for premise forms the chosen representation makes hard to express.
8. **Post-quarantine comparison** — inspect the recent mapping work only after the independent result is fixed enough that comparison cannot silently become imitation.

## Early historical constraints recovered before classification

The July/August solver campaign treated every generated stress level as solvable by construction because the generator retained a witness path. That shifted the research question from solvability to search failure: why a known-valid path is not discovered under the solver's representation, ordering, pruning, retention and work allocation.

The campaign also explicitly separated per-level symptoms from feature-keyed solver changes. Levels were treated as samples from failure clusters, and identity-specific fixes were prohibited. This is both an engineering rule and a research premise: useful capability should generalize through observable structure rather than memorized level identity.

Historical campaign practice used multiple distinct diagnostic claims that should not be collapsed:

- a close repair badness was acknowledged as a stochastic sample, not a proof of geometric distance to solution;
- family-variant fragility was used as evidence for heuristic sensitivity, while variant robustness was used as evidence for deeper combinatorial difficulty;
- a solved-set regression check was explicitly insufficient for performance conclusions, because equal solved sets could conceal materially different work cost;
- lower-bound changes required admissibility arguments and independent/fuzz validation because an apparently helpful prune can be a correctness bug;
- cumulative known-solution ledgers and cold typical-budget solve measurements were explicitly different populations/measurements and could not be compared as if they were one statistic.

These are being retained as methodological premises, not merely historical procedure.

## Provisional code-derived questions to test rather than assume

The current source inventory exposes several places where implementation choices may encode research premises. These are hypotheses for inspection, not findings yet:

- what information `search-state.ts` preserves versus omits, and which omitted history is assumed irrelevant;
- which equivalence relations are exact, coarse, or merely pragmatic in caches/merges;
- whether scoring combines signals independently/additively or represents interactions;
- whether hard-prune and lower-bound logic reasons about obligations jointly or mostly one constraint at a time;
- what information crosses main-search / repair / retry / stage boundaries;
- whether retries chiefly resample the same search geometry or construct genuinely different search distributions;
- whether failed work produces reusable information beyond orchestration-level decisions;
- whether work units are actually comparable across search families and stages when used for allocation conclusions;
- whether continuation/resumability preserves enough frontier/history to make “more budget” equivalent to continuing search rather than restarting a related search;
- whether capability present behind flags, diagnostic APIs, or tests is materially exercised by production orchestration.

Each will be checked against code and historical evidence before entering the synthesis.

## Evidence discipline

For important negative conclusions, record separately:

- broad question;
- specific hypothesis;
- concrete implementation/treatment;
- architecture and defaults at the time;
- population;
- budget/work definition;
- measurement and stability method;
- observed result;
- strongest warranted conclusion;
- broader conclusion people may be tempted to infer;
- later architectural changes that could reopen the question.

A negative implementation result is not treated as closure of its parent question without evidence for that generalization.
