# Cross-cutting change recipes

Use this when a change is conceptually small but can propagate across multiple representations or execution boundaries. These are audit checklists, not instructions to edit every named surface blindly. Inspect current consumers first.

## Solver attempt, stage, or retry

Before adding one, answer the policy question first: **why is this a new production stage rather than a candidate action/configuration for the scheduler?** A dead-last placement that cannot regress already-solved levels is a safety property, not evidence that the added work is worth its cost.

Check whether the change affects:

1. attempt/stage selection and stable identity;
2. budget ownership, aggregate `workSpent`, and ordering;
3. sequential orchestration;
4. raced/worker execution, if that path claims the same planned policy;
5. attempt/result telemetry;
6. report/export projection and JSON artifacts;
7. hint provenance / invocation identity;
8. ablation or opt-in disposition;
9. current solver docs and optimization queue, when decision-bearing;
10. targeted tests plus the solver finish-line gates in [`testing.md`](testing.md).

Also require, for a production-facing stage/retry:

- current residual marginal solves and work when the stage is actually reached;
- a comparison against displacement/reordering of existing actions at fixed total work;
- whether the proposal is only another weight/width/direction/seed/threshold configuration of an existing engine;
- a reason a systematic configuration/racing experiment is not the better discovery method;
- independent confirmation if the exact stage/config was selected after mining the evaluation population;
- fresh-vs-preceded parity unless an intentional typed handoff is part of the stage contract.

Do not infer stage identity later from attempt order when the solver can emit it directly. Do not add a whole-ladder retry when a narrower action can express the measured source of value.

## Solver heuristic, routing, or allocation experiment

Before changing scoring, retention, archetype routing, action order, eligibility, reserves, or budget shares:

1. classify the failure being targeted: correctness, routing, allocation, search quality, or representation/retention;
2. state the causal premise and the observation that supports it;
3. state whether the candidate was prespecified or selected after inspecting levels/results;
4. define the smallest falsifying pilot before broad compute;
5. pin the comparison currency: `workSpent` across techniques, nodes only within a technique, wall time for implementation cost;
6. declare the aggregate work envelope and whether treatment can buy extra work;
7. use shadow/exact evidence first when it can answer the premise without perturbing search;
8. separate discovery/tuning data from confirmation; group variants by parent;
9. report gains, losses, reach/participation, errors/truncation, and work, not solve count alone;
10. define a stop condition before launching a sweep of thresholds/profiles/seeds.

If the hypothesis is “some combination of these knobs may work,” treat it as algorithm configuration. Prefer racing/successive elimination or bounded automatic configuration over serial hand-authored guesses. The best arm of a many-arm sweep is nomination evidence until independently confirmed.

If a technique already fails at substantial/full isolated budget, do not prescribe another nearby budget/reserve by default. First look for operator, restart, retention, state-representation, exact-feasibility, or learned-failure evidence.

## Research data / corpus generation campaign

Before generating another large variant, stress, census, oracle, or lineage dataset:

1. name the unanswered question;
2. show why existing data/tooling cannot answer it;
3. state the independent statistical unit and leakage/grouping rule;
4. define the analysis that will consume the new data;
5. run a small pilot and verify that the intended signal is observable;
6. define stopping/expansion criteria before scaling;
7. record generation and solver-evaluation provenance separately;
8. decide whether outputs belong on `main`, off-main, in workflow artifacts, or only as rebuildable derived summaries.

Do not generate a large trove because it may be useful someday. Existing large family data is a resource to query before more generation.

## Solver result or telemetry field

Trace the field end-to-end rather than stopping when TypeScript accepts the producer:

1. canonical solver result/attempt type;
2. direct/on-thread return value;
3. worker message and worker-client adapter;
4. public port/facade type;
5. batch/report projection;
6. JSON round-trip;
7. provenance conversion, if the field describes how a solve was obtained;
8. downstream analyzers that classify attempts/results.

Prefer a sentinel completeness test that exercises every supported field across the relevant boundaries. Manual property whitelists are drift risks.

If a field is used for research decisions, dropping or changing it is scientific-data corruption, not merely an observability regression. Preserve stage/config/seed/budget/protocol identity strongly enough to reproduce the claim.

## Level mechanic or wire-format change

At minimum inspect:

1. raw schema and validation;
2. normalize / denormalize / editor export;
3. persistent identity and fingerprint compatibility;
4. rotate/mirror/remap transforms;
5. editor creation and mutation;
6. rendering/input behavior;
7. canonical move/win referee;
8. solver parse/prep/state/search semantics;
9. worker serialization;
10. independent oracle/differential tests;
11. corpus generators, reducers, and fixtures;
12. mechanic state/cardinality contracts.

Also follow the new-mechanic checklist in [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md). Preserve independent arbiters rather than "fixing" drift by making all implementations share one code path.

## Hint or provenance schema change

Check:

1. canonical in-memory type and constructors;
2. `reconcileHints` / `mergeHints` behavior;
3. sidecar read/write through the shared level-data I/O;
4. backwards compatibility with older records;
5. Firestore supplemental-hint merge where applicable;
6. cold-capability evidence classification;
7. batch/report producers that create provenance;
8. coverage/reporting tools;
9. round-trip tests with old and new records.

Do not hand-write hint sidecars or introduce a second default-merging path.

## Application state shape or action change

Check:

1. canonical state slice/type;
2. state action / mutation boundary;
3. initialization and reset paths;
4. controller/facade exposure;
5. persistence or serialization, if any;
6. debug/test snapshots and fakes;
7. cancellation/invalidation behavior for derived async work;
8. browser/e2e tests for user-visible state.

Do not mutate ENGINE-owned state around the action boundary to save plumbing.

## Generated artifact schema or "latest" output

Check:

1. generator identity and schema version;
2. exact source/run provenance needed to reproduce it;
3. canonical-vs-derived status;
4. every consumer before moving or renaming it;
5. whether `latest` is a convenience pointer or an authority;
6. whether old artifacts remain readable;
7. whether the artifact belongs in git, a workflow artifact, `logs/`, `reports/`, or an off-main data resource.

A generated filename is not sufficient authority metadata. Prefer explicit run/schema/provenance fields.

## Current documentation / authority change

Documentation drift is usually duplicated **volatile facts**, not broken links. File modification time is weak evidence of freshness: a consolidation/edit can preserve an already-stale paragraph verbatim.

When changing a current authority, implementation contract, workflow, default, or measured constant:

1. name the canonical source of truth;
2. search current docs, local READMEs, source comments, and adapters for the changed symbol/name plus old terminology;
3. distinguish links/routing from repeated semantics: links usually age safely; copied counts, statuses, representations, ownership, defaults, timings, and workflow policy do not;
4. derive/check volatile facts mechanically where practical instead of hand-copying them;
5. if a satellite must restate a volatile fact, add a sentinel/check or make its measurement/date/status explicitly non-authoritative;
6. do not use a recent doc edit as evidence that every section was reconciled;
7. run `npm run check:documentation-links`, then separately review semantic dependants that a link checker cannot understand.

High-risk examples are solver stage/default disposition, budget ownership, mutable-storage lifetime, mechanic cardinality, workflow selection, test-suite timing, and current experiment status. Prefer one executable authority plus projections over parallel hand-maintained descriptions.

## When this document applies

Use these recipes when a patch crosses representations, transports, persistence, duplicated policy, documentation authorities, optimized implementations, or research decision boundaries. Ordinary local changes should stay local. The goal is to prevent plausible 80%-complete patches and expensive experiments with weak inference, not to make every edit ceremonious.