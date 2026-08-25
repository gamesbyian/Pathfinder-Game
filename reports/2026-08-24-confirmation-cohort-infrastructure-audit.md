# Confirmation cohort infrastructure audit

> **Status:** active
> **Last evidence:** 2026-08-24 — current random/envelope generator, stress-corpus contract, experiment-manifest library/tests, and confirmation/transfer protocol design
> **Decision:** Pathfinder already has sufficient deterministic generation and experiment-comparability machinery to instantiate fresh confirmation/transfer populations. Do not build another generator or experiment framework. The remaining infrastructure gap is a thin **evaluation-population manifest/lifecycle** that records cohort role, generation/source identity, exposure state, family grouping, and optional frozen-baseline residual-selection contract.
> **Remaining gate:** define one small population-manifest schema that references an immutable generated corpus and existing experiment manifests; use it to mint the first broad confirmation and transfer-envelope cohorts, then exercise one LOCKED -> AGGREGATE_SEEN -> EXPOSED/DEVELOPMENT lifecycle before promoting the schema to a permanent docs authority.
> **Evidence role:** discovery
> **Selection:** observational — this audit maps the already-designed evaluation protocol onto existing generator/manifest infrastructure.

## What already exists

The conceptual #2 protocol is not blocked on generation capability.

### Deterministic solver-blind random generation

`scripts/stress/generate-random.mjs` already provides the core properties needed for a fresh broad cohort:

- deterministic `--master-seed`;
- explicit generator version (`GENERATOR_VERSION`);
- caller-selected `--count` and `--out`;
- separate output namespace via `--id-prefix`;
- no production solver search during generation;
- zero heuristic scoring bias in witness construction;
- uniform-random legal mechanic placement;
- witness-first solvability by construction;
- schema/structural validation;
- canonical referee validation of the construction witness;
- per-level provenance;
- duplicate/novelty rejection against existing pools rather than solver-performance filtering.

This can mint a new **broad confirmation** population without modifying the generator.

### In-envelope generation

The same generator supports `--envelope-caps`, restoring shipped/documented object-count ceilings while preserving the same solver-blind generation philosophy.

This is already a strong first source for a **transfer-envelope** cohort. It is a distribution shift in complexity envelope, not a fundamentally independent human-level distribution, so claims must remain scoped accordingly.

### Existing experiment manifests

`scripts/experiment-manifest-lib.mjs` and `solver-experiment-preflight.mjs` already capture/run-check much of the candidate-freeze contract:

- experiment/run IDs;
- solver ref;
- exact corpus and level IDs;
- level-selection hash;
- control/treatment arm;
- solver flags;
- workflow and complete workflow inputs;
- seeds;
- canonical work budget;
- wall deadline;
- profile/instrumentation;
- output artifact;
- A/B parity checks that reject undeclared differences.

Family evaluation manifests separately capture solver commit/ref/dirty state, selection, source-generation artifacts, work/node/wall budgets, shards, seeds, and output provenance.

This is substantial comparability infrastructure already in place.

## What is actually missing

Neither current manifest shape owns the **research evidence lifecycle of the population itself**.

The missing object is not “another run manifest.” It answers different questions:

- Why does this set exist?
- What evidence role does it have for the current research program?
- How was membership determined?
- Was solver outcome used to select membership?
- Which generator/source version and seed produced it?
- What is the independent grouping unit?
- Has exact information been exposed?
- If exposed information later influenced redesign, when did this population become development data?

Those facts should not be reconstructed from filenames or chat history.

## Minimal population-manifest contract

A first schema can remain deliberately small.

Suggested fields:

| Field | Meaning |
|---|---|
| `schemaVersion` | population-manifest schema |
| `populationId` | stable research identity, not solver input |
| `role` | `confirm-broad`, `confirm-residual`, `transfer-envelope`, `confirm-family`, or another declared scoped role |
| `evidenceRole` | confirmation / transfer, with development only after reclassification |
| `corpusPath` | immutable generated/source artifact |
| `corpusSha256` | exact content identity |
| `levelSelectionHash` | exact membership identity when subsetted |
| `generatedAt` / `createdAt` | provenance |
| `sourceKind` | random generator / envelope generator / family parents / external human-authored source, etc. |
| `generatorVersion` | where generated |
| `generatorCommit` | code identity where available |
| `masterSeed` / seed derivation | generation reproducibility |
| `selectionRule` | static membership rule fixed before outcomes |
| `familyGroupingKey` | parent/ancestor grouping rule or `level` |
| `baselineCondition` | null for broad/transfer; frozen solver commit/config/work/failure rule for residual cohorts |
| `exposureState` | `LOCKED`, `AGGREGATE_SEEN`, `EXPOSED`, `DEVELOPMENT` |
| `exposureHistory` | timestamp + state transition + reason/reference |
| `notes` | narrow scope caveats, not free-form hidden selection logic |

Do not duplicate every experiment-manifest field. A population manifest should be referenced by run manifests, not absorb them.

## Role-specific membership rules

### Broad confirmation

Membership is selected before candidate outcomes and without solver-performance filtering.

A first implementation can simply be:

- fresh `generate-random.mjs` output;
- fixed seed/version/count;
- optional prespecified static strata only;
- whole resulting cohort frozen in the population manifest.

No “retain only hard levels” step belongs here.

### Residual confirmation

Generate the broad pool first, then apply one **frozen baseline** under one fixed work contract.

The manifest must preserve:

- baseline commit/ref;
- config/flags;
- canonical work budget and non-binding wall deadline;
- exact failure-membership rule;
- source broad-pool identity;
- resulting selected level hash.

This population may support claims such as:

> among fresh levels the frozen baseline fails, treatment improves residual solve/work.

It does not become broad confirmation by virtue of being fresh.

### Transfer-envelope

Use a fresh `--envelope-caps` generation seed/version not used for development or broad-confirmation selection.

The first transfer claim should be scoped to:

> fresh solver-blind generated puzzles within the documented shipped/editor mechanic-count envelope.

That is useful and honest. It is not automatically evidence about future human-designed levels.

### Family confirmation

When treatment was selected using family/variant data, lock whole fresh parents/ancestors. Siblings never cross evidence roles for that decision.

Existing family run manifests can be referenced rather than duplicated.

## Exposure state transitions

The lifecycle should be explicit and monotone in information exposure:

`LOCKED -> AGGREGATE_SEEN -> EXPOSED -> DEVELOPMENT`

Not every cohort must pass through every state.

Examples:

- A frozen confirmation run can move directly from LOCKED to EXPOSED after its verdict if exact failure inspection is immediately useful.
- A transfer population ideally moves LOCKED -> AGGREGATE_SEEN for the milestone verdict, then later EXPOSED.
- Once exposed cases influence candidate redesign/selection, record DEVELOPMENT. Historical evidence from the earlier frozen comparison remains valid; untouched status for future candidates does not.

Do not permit a tool to silently move `DEVELOPMENT` back to `LOCKED` because the file was regenerated under a new name.

## Visibility implementation can remain modest

The protocol does not require a security system.

For the first lifecycle:

- exact files may remain accessible to maintainers;
- agents/research process simply avoid opening them before the verdict;
- the population manifest records the declared exposure state;
- an aggregate-only result artifact can be generated when practical;
- repeated candidate querying of the same locked cohort is prohibited by process/metadata rather than elaborate access control.

Build stronger concealment only if repeated use demonstrates that process discipline is insufficient.

## Reuse existing manifests rather than fork them

A decision-bearing treatment still uses the existing experiment manifest/preflight for:

- candidate/baseline parity;
- exact level IDs;
- work/deadline/seed settings;
- workflow/flag equality.

The new population manifest contributes only the evidence-role/lifecycle/source layer.

Conceptually:

```text
population manifest
    identifies the evidence population and exposure lifecycle
        ↓
experiment manifests
    identify frozen control/treatment execution against that population
        ↓
result/report
    records aggregate verdict, then optional unsealing/reclassification
```

This avoids creating another parallel provenance system.

## First concrete cohorts

The smallest useful instantiation remains:

### `confirm-broad-v1`

- fresh solver-blind random generation;
- modest cohort, sized for the first selected treatment rather than by ritual;
- no baseline-performance filter;
- initially LOCKED.

### `transfer-envelope-v1`

- separate fresh master seed;
- `--envelope-caps`;
- initially LOCKED;
- preferably aggregate-only through the first milestone verdict.

### `confirm-residual-v1`

Create only when a residual question is ready, for example scheduler/restart tail value.

- start from a separately generated fresh pool;
- freeze baseline commit/config/work contract first;
- select failures by that prespecified rule;
- record the conditioning explicitly.

Do not create all possible cohorts merely because the schema exists.

## No-code versus coding boundary

No new generator algorithm is required.

The smallest coding/tooling task is limited to:

- validate/write the population manifest;
- hash corpus/membership;
- optionally record exposure-state transitions;
- optionally let experiment preflight reference/verify `populationId` and corpus hash.

The first cohort can even be instantiated manually with a checked-in manifest if that is faster than generalizing the tool immediately. The schema should earn permanence by surviving one real lifecycle.

## Stop conditions

Do not build a large benchmark-management framework if:

- one lightweight manifest plus current preflight is sufficient;
- cohorts are used too rarely to justify automated exposure tooling;
- the next treatment's effect is so large that a simple fresh one-shot generated comparison answers the question cleanly.

Do build the thin durable layer if manual cohort provenance starts being reconstructed from filenames/messages or if repeated confirmation/transfer use makes exposure state easy to lose.

## Disposition

#2 is no longer accurately described as a broad “infrastructure gap.”

Generation, validation, level provenance, exact membership hashing, solver-run manifests and A/B comparability already exist.

The missing piece is a **thin evaluation-population lifecycle manifest**, followed by actual cohort instantiation and one exercised lifecycle. After that, if the shape proves stable, promote it from this dated report into a permanent evaluation-populations reference.
