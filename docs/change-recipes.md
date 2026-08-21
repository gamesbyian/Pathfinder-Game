# Cross-cutting change recipes

Use this when a change is conceptually small but can propagate across multiple representations or execution boundaries. These are audit checklists, not instructions to edit every named surface blindly. Inspect current consumers first.

## Solver attempt, stage, or retry

Check whether the change affects:

1. attempt/stage selection and stable identity;
2. budget ownership and ordering;
3. sequential orchestration;
4. raced/worker execution, if that path claims the same planned policy;
5. attempt/result telemetry;
6. report/export projection and JSON artifacts;
7. hint provenance / invocation identity;
8. ablation or opt-in disposition;
9. current solver docs and optimization queue, when decision-bearing;
10. targeted tests plus the solver finish-line gates in [`testing.md`](testing.md).

Do not infer stage identity later from attempt order when the solver can emit it directly.

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

## When this document applies

Use these recipes when a patch crosses representations, transports, persistence, or duplicated optimized implementations. Ordinary local changes should stay local. The goal is to prevent plausible 80%-complete patches, not to make every edit ceremonious.
