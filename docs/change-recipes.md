# Cross-cutting change recipes

## Rename / identity migration

For any rename that crosses a module boundary, transport, persisted identity, workflow, generated artifact, CLI, application state boundary, or current documentation authority, treat the work as a **contract migration**, not a textual substitution.

For the repository-wide naming cleanup, also read [`naming-cleanup-process-hardening.md`](naming-cleanup-process-hardening.md) and [`naming-cleanup-history-and-lessons.md`](naming-cleanup-history-and-lessons.md). Phase 8 onward uses the stronger completion model defined there and records its evidence in a checked-in batch record created from [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md).

### 0. Establish branch/batch authority before editing

For Phase-8+ naming-cleanup work:

1. run `npm run naming:status` and cite selected rows by immutable ledger ID;
2. start from current `main` and record the full SHA;
3. search open naming-cleanup PRs and similarly named branches;
4. compare plausible predecessor/sibling branches against current `main` rather than inferring work from branch names;
5. recover unique relevant commits or explicitly record the old branch as superseded;
6. create the batch execution record and claim the one active batch in the ledger;
7. do not stack the next implementation batch on an unmerged predecessor.

Before merge, compare the branch head with current `main`. If the intended patch is empty or already present, close/supersede rather than merge a duplicate/no-op PR.

### 1. Build the impact map before editing

1. read [`naming-and-vocabulary.md`](naming-and-vocabulary.md), the owning plan, and active row(s) in [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json);
2. search the old spelling, canonical spelling, abbreviations, case variants, human-readable labels, physical paths, and persisted values across source, tests, package scripts, workflows, current docs, schemas, telemetry/provenance, environment variables, artifact/concurrency/cache identifiers, and spawned/imported paths; explicitly classify existing **canonical-target occupancy** as same concept, unrelated use, collision, or already migrated;
3. identify producers, canonical readers/normalizers, transports, writers/projections, historical fixtures, grouping/classification consumers, CLI/workflow surfaces, and application/UI consumers before changing a persisted or cross-boundary value;
4. identify which concrete test/check actually executes or structurally validates each live consumer. Record whether the real boundary is native Node, bundled/tsx, worker, browser, parser, or workflow-structural validation; those classes are not interchangeable. A green aggregate suite is not evidence for a surface it never runs;
5. verify the ledger risk class against the plan rubric and raise it before implementation if the impact map reveals a stronger boundary;
6. define the batch change envelope: intended naming deltas, invariant observables, and out-of-scope findings;
7. for medium/high-risk behavior-preserving migrations, capture the smallest useful before-change observable that exercises an invariant and can be compared after implementation.

For surfaced tooling, run `node scripts/tooling-census.mjs --compact --query=<term>` for both legacy and canonical terms when applicable. For physical file/workflow renames, separately audit exact-case paths and spawned/imported targets.

### 2. Fill the contract-migration matrix

Every potentially relevant row must be classified as **migrate**, **compatibility read**, **retained/frozen**, or **not applicable**. Record the evidence/test that supports the classification.

| Surface | Classification | Evidence / test |
| --- | --- | --- |
| Definition / producer |  |  |
| Internal direct consumers |  |  |
| Canonical parser / normalizer |  |  |
| Sequential transport |  |  |
| Alternate worker/race transport |  |  |
| Serialized writer |  |  |
| Historical reader / fixture |  |  |
| Report/export projection |  |  |
| Analyzer/grouping consumers |  |  |
| CLI / package alias |  |  |
| Workflow command/inputs/outputs |  |  |
| Artifact/concurrency/cache/path identifiers |  |  |
| Hint/provenance storage |  |  |
| Application/UI/editor consumer |  |  |
| Current docs/examples |  |  |
| Frozen historical evidence |  |  |

Do not equate “no search hit” with “not applicable.” If the category could plausibly carry the concept, show how it was searched, traced, or tested.

### 3. Preserve compatibility at an explicit boundary

For persisted identities use dual-read/single-write unless the owning plan explicitly says otherwise:

- accept legacy and canonical input at one owning normalization boundary;
- normalize immediately to the canonical internal form;
- keep internal grouping/classification on canonical values;
- emit only the canonical form;
- do not rewrite frozen reports, logs, archived snapshots, or historical workflow artifacts merely to modernize terminology.

Every future dual-read ledger row also names its compatibility owner and retirement policy. Keep legacy knowledge at that owner only. A `temporary-command-alias` must be gone by owning-batch closeout when batched (otherwise owning-phase closeout); `permanent-historical-read` and `wire-format-retained` are intentionally indefinite; `phase-15-review` modes require evidence before removal rather than automatic deletion.

A compatibility alias may be removed only when live code/workflows no longer emit it, current docs no longer teach it, historical readers still accept any promised legacy form, the ledger retirement condition is satisfied, and a representative historical fixture proves compatibility where historical reads are promised.

For structured identities require parse/format round trips, uniqueness, deterministic canonical formatting, legacy-to-canonical fixtures, and a collision check proving distinct legacy behavior does not collapse.

### 4. Prefer eliminating duplicated knowledge

When the migration exposes the same field/identity mapping in sequential, worker, raced, report, or provenance paths, prefer one shared projection/normalizer over correcting several hand-maintained copies.

If duplication must remain, add a sentinel/parity test that would fail when one path drops or renames a field independently.

For TypeScript/plain-Node boundaries:

- do not assume a `.mjs` tool can import a `.ts` source file merely because a newer local runtime or bundler accepts it;
- verify plain-Node tools under the repository's minimum supported Node version when the touched boundary depends on native Node loading;
- tighten `any`/broad port types when a wrong renamed option/result field could otherwise pass compilation.

### 4.1 Distinguish impact-map growth from specification change

Another consumer of an already-fixed mapping may be added to the batch impact map. A different canonical target, risk class, compatibility owner/lifetime, phase/batch assignment, or allowed change envelope is a **specification amendment**. Stop implementation and amend the plan/ledger/phase authority first; do not normalize the divergence by documenting it after the code lands.

### 5. Validate the migrated contract, not just the definition

For Phase-8+ naming-cleanup work, write the exact validation command/fixture and what it proves into the checked-in batch record. Ledger verification fields summarize this evidence; they do not replace it.

Use the cheapest test that proves the boundary:

- module-load/runtime smoke;
- CLI parse/help/count/dry-run smoke;
- worker message sentinel;
- option/result transport parity;
- serializer/parser round trip;
- representative historical row through a real downstream consumer;
- exact output-schema assertion;
- UI/controller/render assertion where application state is involved.

For behavior-preserving solver renames, compare representative attempt/stage order, node/work accounting, and solved outcomes before/after. For application/state renames, verify the relevant visible/rendered behavior. For generated/research data, verify row inclusion/grouping and provenance, not only command exit status. Use the same observable captured before editing whenever practical; an unexplained parity change blocks completion.

### 6. Close from consumers inward

Before marking a cross-boundary migration complete, perform a distinct closeout pass that starts from live consumers rather than the implementation diff. Prefer a fresh agent/session when available; if the implementation agent performs the closeout, record that fact and still start from the consumer/surface inventory:

- package commands and surfaced CLI tools;
- workers/raced execution;
- workflows and exact-case local targets;
- generated-data readers/writers and analyzers;
- current docs/reproduction commands;
- application/UI/editor consumers when applicable;
- historical compatibility paths.

Update current authority links and semantic dependants, then run `npm run check:documentation-links`. Mark a ledger row `done` only after all applicable verification dimensions required by its owning plan are complete and the row points at the checked-in evidence record that proves those dimensions.

### 7. Clear the merge barrier before handing off

For Phase-8+ naming-cleanup batches:

1. reconcile/update from current `main` as required;
2. compare head vs current `main` and confirm the intended diff is unique and non-empty;
3. confirm no next-batch implementation is stacked into the PR;
4. confirm the batch record, immutable row IDs, risk/compatibility policy, ledger state, targeted tests, and required aggregate CI agree;
5. after rows close, reset `activeExecution` to `idle` before merging the implementation PR; leave that batch's own merge-completion record pending until the merge exists;
6. merge the batch before creating the next implementation branch;
7. on the next branch, record the predecessor's merged PR/commit before claiming new rows;
8. run the phase-wide final closeout on merged `main` before advancing `lastCompletedPhase` for a multi-batch phase.

Use this recipe when a change is conceptually small but crosses representations or execution boundaries. The point is to prevent plausible 80%-complete patches, not to make ordinary local renames ceremonial.

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

Before changing scoring, retention, routing-regime selection, action order, eligibility, reserves, or budget shares:

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

Do not generate a large variant-family dataset because it may be useful someday. Existing large family data is a resource to query before more generation.

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