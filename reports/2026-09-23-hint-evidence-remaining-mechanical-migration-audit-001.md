# Hint evidence: remaining mechanical migration audit 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** reconciled into draft PR #2002
> **Last evidence:** 2026-09-23 — Codex static maintained-surface audit at `23389ff4763884db4dc10689689aef216addd2b9`, reconciled against the live #2002 continuation branch.
> **Decision:** Preserve this inventory as the mechanical migration/validation map. Findings already implemented on #2002 are marked below; remaining items continue to guide compatibility migration.
> **Remaining gate:** Execute the real transport canaries and finish the still-open mixed-era producer/consumer migrations before semantic-heavy Phase 3 work.

**Date:** 2026-09-23  
**Audited revision:** `23389ff4763884db4dc10689689aef216addd2b9` (`work`)  
**Scope:** reconnaissance only; this snapshot does not contain draft PR #2002.  
**Authority:** [`docs/hint-evidence-execution-identity-storage-consolidation-plan.md`](../docs/hint-evidence-execution-identity-storage-consolidation-plan.md)

## Purpose and limits

This is a parallel impact map for later reconciliation into draft PR #2002. It does not recreate
the shared artifact-layout, solver-request projection, compatibility reader, execution-protocol,
source-run-binding, or reconstructability work known to exist there. No identity equivalence below
is inferred from spelling alone. Historical reports and tracked evidence were searched to understand
compatibility, but are not migration targets.

The current snapshot already contains an important correction: `publish-solver-sweep-result.mjs`
refuses to substitute workflow `GITHUB_SHA` for declared solver execution identity. Conversely,
several older standalone producers still label `GITHUB_SHA` as a commit/solver fingerprint. Those
sites require an execution-context decision; this audit does not silently change their persisted
meaning.


## Reconciliation against PR #2002

This report originated on Codex PR #2003 from the pre-#2002 snapshot and is intentionally retained as
an independent consumer/validation inventory. Reconciliation against the actual continuation branch
established the following.

Already implemented on #2002 before this report was transplanted:

- `protocolHash` is no longer copied from `configurationHash`; execution protocol identity is owned
  by `hashExecutionProtocol()`, with a source guard preventing direct reintroduction of that alias.
- `hint-discovery-process` already consumes the canonical bounded
  `sourceRunBindingFromContract()`, including optional physical `runAttempt`.
- canonical run-wide solver-request projection and plain-Node digest/verification owners already
  exist.
- legacy `effectiveConfig/effectiveConfigDigest` is already represented by an explicit
  `legacy-only` compatibility status rather than being promoted to canonical request identity.
- effective-input reconstructability now has a derived query surface with exact
  `missingDimensions`.
- browser/Node hint artifact layout and v1-v3 decode authorities are already shared.

Mechanical work performed during reconciliation:

- the mixed-era flattened sweep ingress now preserves
  `solverRequestProjection/solverRequestIdentity` when present instead of dropping them;
- focused regression coverage was added to the existing sweep-combiner node test.

Still-open findings from this audit remain useful, especially:

- canonical/mixed-era request identity handling in combiner/readiness/agreement consumers;
- canonical request emission from bundled solver producers;
- publisher/source-run projection reuse where public schemas must remain stable;
- per-producer review of standalone `GITHUB_SHA` semantics;
- real direct/worker/raced transport canaries;
- search-loss occurrence-vs-semantic identity, which remains reserved for Claude/Phase 3;
- broader failure/search-loss query compatibility and exact sibling-evidence joins.

The original inventory below is retained verbatim except for this reconciliation header because it is
useful as an independent map of the pre-integration maintained surface.

## Classification key

| Code | Category |
|---|---|
| P | producer/writer |
| T | transport/projection |
| V | validator/normalizer |
| H | historical/mixed-era reader |
| J | grouping/join consumer |
| W | workflow glue |
| D | current documentation/schema authority |
| X | frozen historical evidence; do not edit |

## Maintained identity inventory

### Producer-local `effectiveConfig` dialect

| File and symbol/section | Class | Meaning now | Later disposition | Cheapest real validation |
|---|---:|---|---|---|
| `scripts/level-blind-capability-sweep.mjs`, `effectiveConfig`/`writeReport` | P | Invocation-boundary `SolveOpts` minus observer callbacks, plus `corpusSha256` and `levelBlind`; therefore mixes solver request and population/execution dimensions. | Dual-write the PR #2002 canonical request projection at the invocation boundary; retain this legacy envelope through a compatibility period. Do not reinterpret its digest as request identity. | `test:level-blind-capability-sweep-cli`, then a one-level bundled sweep because the CLI test stubs execution. |
| `scripts/portfolio-solve-sweep.mjs`, `effectiveConfig`/summary | P | Solver options plus corpus, backend (`sequential`/`raced`), pool width, budgets, cache and execution mode. It is broader than a solver request. | Same dual-write rule, but execution backend/cache/population remain outside request identity. | `test:portfolio-solve-sweep-lib`, `test:portfolio-solve-sweep-worker`, then a one-level sequential and raced canary. |
| `scripts/solver-sweep-report-input.mjs`, `normalizeSolverSweepReportInput` | T/H | Copies legacy `effectiveConfig` and digest from top-level reports into the normalized summary. Also carries `sourceRuns`. | Route the pair through #2002's mixed-era compatibility reader; keep explicit `legacy-only` status. | `test:combine-solver-sweep-reports`. |
| `scripts/combine-solver-sweep-reports.mjs`, combine/summary checks | V/T/H | Requires shard agreement and projects the legacy pair into combined output. | Prefer canonical request identity when present, validate legacy when only legacy exists, and reject mixed disagreement. | `test:combine-solver-sweep-reports` with canonical-only, legacy-only, and mixed fixtures. |
| `scripts/check-effective-config-agreement.mjs`, `loadEffectiveConfig`, `checkAgreement`, `checkCompare` | V/J/H | Recomputes the legacy digest and checks arm agreement/differences. It intentionally checks a producer-local whole envelope. | Keep as a named legacy-envelope validator. Add a canonical-reader mode through #2002 rather than replacing the allowed-difference semantics blindly. | `test:effective-config-agreement`. |
| `scripts/ws2-experiment-readiness-lib.mjs`, readiness extraction | H/V | Uses the legacy envelope/digest as execution-readiness evidence. | Consume compatibility status and report `legacy-only`; canonical identity must not be synthesized. | `test:ws2-experiment-readiness`. |
| Corresponding `*-node-test.mjs` fixtures | V | Pin current legacy schema and mismatch behavior. | Retain legacy fixtures and add canonical/mixed-era fixtures during migration. | Their named package tests above. |
| `docs/solver-correctness-hardening.md`, current prose | D | Teaches legacy effective-config agreement as an invocation check. | Link to the canonical request/execution distinction after #2002 lands; retain legacy checker purpose. | `check:documentation-links`. |

### Experiment configuration, execution protocol, revision and source-run envelopes

| File and symbol/section | Class | Meaning now | Later disposition | Cheapest real validation |
|---|---:|---|---|---|
| `scripts/solver-experiment-contract.mjs`, `decisionContractIssues`, `assertCompatibleExperiments`, `stableHash` | P/V/J | `experiment.configurationHash` hashes the declared experiment configuration; `resolvedSha` is immutable checked-out solver revision; `sourceRuns` is recombination lineage. This is not solver-request identity. | Remain the experiment-contract owner. A future source-run binding should adapt these fields without renaming configuration hash to request identity. | `test:solver-experiment-contract`, `test:write-solver-experiment-contract`. |
| `scripts/write-solver-experiment-contract.mjs`, contract writer | P | Resolves the declared contract, stamps actual Git `HEAD`, hashes experiment configuration and records population/execution. | Exact source for immutable revision and declared configuration; mechanically feed future shared binding. | `test:write-solver-experiment-contract`. |
| `scripts/publish-solver-sweep-result.mjs`, `experiment` and `ghaSourceRun` assembly | P/T/V | Builds both standard manifest experiment fields and a `pathfinder-gha-source-run` sidecar. It deliberately uses declared `resolvedSha`, never `GITHUB_SHA`; `workflowRunId`/attempt are acquisition identity. | High-confidence duplicate suitable for adaptation to #2002's bounded binding. Preserve manifest and sidecar schemas as projections. | `test:publish-solver-sweep-result`, then a workflow artifact inspection. |
| `scripts/sweep-publish.mjs`, publish contract staging | T/V | Carries `configurationHash`, `resolvedSha`, workflow run identity and publication inputs. | Partial transport; consume shared binding fields without becoming their owner. | `test:sweep-publish`. |
| `scripts/validate-reconciliation-sources.mjs`, `sourceContract`, `validateReconciliationSources`, `buildReconciliationContract` | V/J/P | Proves source manifests share immutable solver/config/population/execution semantics, hashes a recombination protocol, and records source run/attempt lineage. Its `protocolHash` is specifically the preserved-source recombination protocol. | Keep specialist protocol hash distinct. Adapt its result to the shared source-run binding; do not replace it with experiment `configurationHash`. | `test:validate-reconciliation-sources`, including mismatched staging-directory/run-ID fixture. |
| `scripts/solver-sweep-report-input.mjs`, `commit` and `sourceRuns` projection | T/H | Maps `commitSha` to summary `commit` and forwards lineage. | Mixed-era adapter remains necessary; normalize to explicit revision/source-run fields before comparisons. | `test:combine-solver-sweep-reports`. |
| `scripts/check-solver-sweep-result-contract.mjs` and `docs/solver-experiment-result.schema.json` | V/D | Validate published experiment, population/corpus, integrity and lineage schema. | Extend additively only after #2002 field names stabilize. | `check:solver-sweep-results`, `test:experiment-result-contract-audit`. |
| `scripts/persist-decision-bearing-experiment-evidence.mjs` | P/V | Persists decision-bearing experiment contracts with run/revision/config/population bindings. | Exact adapter candidate, not a new owner. | `test:persist-decision-bearing-evidence`. |
| `.github/workflows/solver-{broad-confirmation,residual-confirmation,routing-regime-sample-ab,highbudget-unsolved-sweep,production-replay-baseline,stress-refresh,level-blind-targeted-sweep}.yml`, contract-spec steps | W | Read producer `configurationHash` as observed execution evidence and pass declared experiment configuration to the shared contract writer. | Later read canonical request identity alongside specialist configuration hash; keep observed arm hashes separate. | `check:workflow-actions`, contract-writer test, then one execution-family canary. |
| `.github/workflows/cpsat-explicit-prefix-reference.yml`, recombination contract | W/P | Records constituent `sourceRuns`; CP-SAT is an external/non-native solver producer. | Remain an external-reference partial lineage projection; do not force native solver-request semantics onto it. | `test:cpsat-explicit-prefix-reference-pipeline`, `test:cpsat-prefix-reference-integrity`. |
| `.github/workflows/persist-targeted-failure-response.yml`, summary | W | Displays workflow source run and attempt only. | Partial acquisition projection should remain partial. | `check:workflow-actions`. |

### Hint discovery, failure response and search-loss consumers

| File and symbol/section | Class | Meaning now | Later disposition | Cheapest real validation |
|---|---:|---|---|---|
| `scripts/hint-discovery-process.mjs`, CLI assembly | P/T | Joins solved rows to hint provenance and supplies run/config/protocol/revision/population metadata to the evidence constructor. | Use #2002's source-run binding exactly; no local reconstruction. | `test:hint-discovery-process-cli` plus a tiny real hint/report fixture. |
| `scripts/hint-discovery-process-evidence-lib.mjs`, document constructor/validator | P/V | `run` carries `runId`, `configurationHash`, `protocolHash`, `solverRef`, population and producer; current code historically sets protocol from configuration in its caller/constructor path. | Prime migration target for #2002. Request, execution protocol and acquisition run must remain distinct. | `test:hint-discovery-process-evidence` with deliberately distinct sentinel hashes, then CLI test. |
| `scripts/hint-failure-process-join-lib.mjs`, `key`/join | J/H | Joins on population + parent + protocol + solver ref; run ID is output lineage, not part of the join key. | Normalize both dialects before joining; preserve exclusion of run ID from semantic comparability. | `test:hint-failure-process-join` with same protocol across different runs and different protocol in same run. |
| `scripts/solver-failure-response-lib.mjs`, `compactFailureResponseRow`, document constructor/validator | P/T/V/H | Accepts row/document protocol and revision dialects; normalizes `solverCommit`/`commitSha` to `solverRef`; carries configuration/action/stage separately. | Mixed-era ingress adapter. Prefer canonical binding when available, but retain row/document fallback. | `test:solver-failure-response`, `test:summarize-solver-failure-response`. |
| `scripts/failure-evidence-semantics-lib.mjs`, `failureResponseIdentityView` | H/J | Extracts comparable action/config/protocol/revision semantics from mixed failure records. | Add canonical-binding precedence through #2002 compatibility APIs. | `test:failure-evidence-semantics`. |
| `scripts/failure-response-query.mjs`, `failure-evidence-purpose-query.mjs`, `search-loss-query.mjs` | H/J | Query/group current evidence by protocol, revision, run and purpose. | Expose canonical and `legacy-only` status; never fill absent historic dimensions. | Their corresponding `test:*query` commands. |
| `scripts/failure-response-identity-audit-lib.mjs`, novelty/claim/analyzer libraries | V/J | Audit collisions/comparability on existing protocol/revision dialects. | Migrate after compatibility reader so historical incompleteness stays explicit. | `test:failure-evidence-disposition`, failure-response query and reconnaissance tests. |
| `scripts/solver-search-loss-evidence-lib.mjs`, `searchLossCapsuleIdentity`, capture validators | P/V/J | Capsule identity currently includes acquisition `runId` with level revision, solver ref, protocol, stage and event. This is an artifact-row identity, not necessarily semantic discovery identity. | Requires Claude decision before removing run ID: preserve row uniqueness while defining separate semantic identity. Do not mechanically rewrite. | `test:solver-search-loss-evidence`, `test:search-loss-pipeline`, real bundled canary. |
| `scripts/capture-search-loss-evidence.mjs`, `search-loss-real-canary.mjs` | P | Build run envelope and capsules at real solver boundary. Canary runs bundled and imports TypeScript solver/domain modules. | Suitable producer for canonical request identity once the projection is importable at this bundled boundary. | `research:canary-search-loss` on a bounded fixture. |
| `scripts/append-solver-health-record.mjs`, analysis scripts (`analyze-class3-dose-exposure`, `analyze-reserve-starvation-probe`, WS2 reconnaissance/claim) | P/H/J | Carry protocol/revision/run into specialist health and failure analyses. | Partial/specialist projections; read normalized binding but do not replace domain-specific records with a generic envelope. | Named node tests for each script. |
| `scripts/harvest-level-blind-report-hints.mjs`, report provenance | H/P | Reads `summary.commit` as solver version while reconstructing canonical hints from reports. | Mixed-era historical adapter; prefer explicit canonical revision/binding when present. | `test:harvest-isolated-report-hints` plus `test:hint-harvest-selection-integration`. |

### Standalone revision spellings and `GITHUB_SHA`

| Files/symbols | Class | Meaning now | Disposition |
|---|---:|---|---|
| `scripts/solver-fingerprint.mjs:getCommitSha`, `run-solver-direct.mjs:getCommitSha`, `run-ablation.mjs`, `hint-diversification.mjs`, `hint-workbench.mjs`, `hint-corpus-expand.mjs`, `hint-complete-enumeration-sharded.mjs` | P | Prefer `GITHUB_SHA`, otherwise local `git rev-parse HEAD`; persisted as commit or solver version/fingerprint. | Unsafe under custom checkout unless workflow topology proves equality. Later use actual checked-out HEAD or a declared immutable solver ref. This requires per-producer compatibility review. |
| `scripts/stress/{benchmark,regression}.mjs` and assorted stress probes | P | Stamp diagnostic artifacts with `GITHUB_SHA`/`commitSha`; usually repository snapshot identity, not a universal solver-run binding. | Keep as artifact revision where accurate; do not automatically migrate every diagnostic to solver source-run semantics. |
| `scripts/req-length-sweep.mjs`, stress compilers/comparators, `family-boundary-report.mjs`, `build-technique-census-plan.mjs` | P/T | Local `commitSha` or copied revision for specialist evidence. | Classify at producer: actual HEAD is mechanically bindable; inherited summary commit is mixed-era input. |
| `publish-solver-sweep-result.mjs` | V/P | Explicitly forbids the unsafe workflow-SHA substitution. | Retain as the current model and add a regression fixture if #2002 does not already have one. |
| Deployment/diagnostics workflow uses of `GITHUB_SHA` | W | Deployment source or commit-message text, not solver execution identity. | Semantically separate; no migration. |

### Population/corpus identities and stage/action/config identities

Population identity is already owned by `scripts/research-population-identity-lib.mjs` and the
research artifact envelope. The following are consumers, not candidates for a generic source-run
hash: experiment contracts, population-integrity combiners, generation/matching tools, family
indexes, D1 observations, search-loss/failure artifacts, and hint/failure joins. `corpusSha256` in
the two legacy effective-config producers is a different, concrete input-file content hash. Preserve
that distinction.

Attempt configuration identity is owned by `modules/solver/attempt-identity.mjs`; stage spelling is
normalized by `modules/solver/stage-id-normalization.mjs`; scheduler spelling is normalized by
`modules/solver/scheduler-mode-normalization.mjs`. Failure/search-loss/hint-process records often
carry only partial `configurationKey`, `actionKey`, and `stageId` projections. They should remain
partial when history lacks dimensions, and should consume the canonical effective-input status
from #2002 rather than inferring a stage from attempt order.

## TypeScript to plain-Node bridge audit

### Existing execution classes

| Class | Maintained examples | Can import runtime TypeScript? | Finding |
|---|---|---:|---|
| `run-bundled.mjs` (esbuild -> `.solver-tools/*.bundle.mjs` -> Node) | most solver sweeps, `research:canary-search-loss`, lane analyses and solver probes | Yes | Best existing boundary for producers already invoking the solver. Local `.ts` is bundled; npm packages remain external. A bundled producer can import the canonical projection directly without duplicating defaults. |
| `tsx` | `test:portfolio-solve-sweep-lib`, Firestore boundary tests and a small number of tools | Yes | Correct but intentionally avoided for solver hot paths because module-by-module transformation impedes optimization. Appropriate for tests, not the default production sweep bridge. |
| literal `node scripts/*.mjs` | contract writer/publisher, combiners, validators, hint-discovery process, failure/search-loss queries, most node tests | No direct `.ts` support | These can validate/hash a *stored* canonical projection through #2002's plain-Node helper, but must not construct it or resolve defaults independently. |
| Vite/browser | application and worker build | Yes, through Vite | Canonical browser-neutral runtime owners in `modules/` are available, but no research CLI should infer browser coverage from a Vite build alone. |

### Existing neutral-module pattern

The repository already uses browser/TypeScript/plain-Node-neutral `.mjs` semantic owners under
`modules/`, including `attempt-identity.mjs`, stage/scheduler/routing normalization,
`hint-runtime.mjs`, and `worker-result-serialization.mjs`. TypeScript imports these using their real
`.mjs` extension; plain Node imports the same file. This is a valid architectural pattern only when
the owner itself does not need TypeScript runtime modules or duplicate their default resolution.

`scripts/run-bundled.mjs` is the existing generated execution mechanism. It creates an untracked
esbuild artifact rather than a checked-in generated API. No checked-in generated-module mechanism
was found that would be safer for solver-request default resolution.

### Bridge recommendation

1. Producers that already run bundled and hold the literal resolved `SolveOpts` should import the
   canonical TypeScript projection at that invocation boundary and emit it.
2. Plain-Node publishers/combiners/readers should only hash/validate the emitted projection through
   #2002's compatibility helper.
3. A plain `.mjs` projection owner would be safe only if the entire default-resolution authority can
   move there without copying TypeScript logic. That is an architectural choice reserved for Claude.
4. Do not make `run-bundled.mjs` a hidden subprocess merely to let plain-Node validators construct a
   projection; that creates two execution paths and obscures which defaults were used.

## Source-run envelope duplication table

| Envelope | Overlap | Classification |
|---|---|---|
| Experiment contract (`solver-experiment-contract.mjs`) | workflow family, producer, entrypoint, immutable revision, configuration, population, execution, arms, source runs | Canonical experiment declaration; exact adapter input. |
| Published manifest + `pathfinder-gha-source-run` sidecar (`publish-solver-sweep-result.mjs`) | contract fields plus workflow run/attempt and artifact metadata | Exact semantic duplicate of much of the future bounded binding; highest-priority mechanical migration. Keep two output projections. |
| Reconciliation provenance (`validate-reconciliation-sources.mjs`) | source runs/attempts, source protocol, source set, revision, configuration, population, execution | Specialist recombination protocol. Adapt, but retain `sourceProtocolHash` meaning. |
| Hint-discovery-process `run` | run, producer, revision, configuration, protocol, population, arm-like context | Exact future binding consumer after the historical protocol/config alias is removed by #2002. |
| Search-loss capture `run` | run, producer, revision, configuration, protocol, population, level-blind | Exact native-solver candidate, though capsule identity semantics remain separate. |
| Failure-response document | optional protocol and solver ref; rows may carry run and attempt identity | Partial projection; remain partial for historical evidence. |
| CP-SAT explicit-prefix reference | source runs and external solver artifact identity | Non-native solver; do not force native request capsule. |
| Family/variant run manifests and CI history | run ID, producer and family/population lineage | Different acquisition domains; not solver source-run duplicates without an actual solver invocation. |
| Deployment workflows | workflow SHA/run only | Non-solver operational provenance; separate. |

## Stale-assumption findings

1. **Configuration equals protocol:** hint-discovery-process is the confirmed maintained alias site.
   It must be migrated using #2002's distinct execution-protocol owner. Reimplementing its fix here
   would conflict with the unseen branch.
2. **Workflow SHA equals solver SHA:** the publisher correctly rejects this. Standalone producers
   listed above still prefer `GITHUB_SHA`; whether each runs after a custom checkout must be proved
   before changing stored output.
3. **Run ID in semantic identity:** the hint/failure join correctly excludes run ID. Search-loss
   capsule identity includes it, but calls the result a capsule/row identity. Separating occurrence
   and semantic identities is a Phase-3 decision, not a mechanical deletion.
4. **Legacy digest sufficiency:** current checker prose already limits its claim, but the two
   producers mix population/backend/cache with solver options. All downstream readiness/grouping
   should surface `legacy-only` once #2002 is available.
5. **Historical defaults:** failure-response mixed-era normalization uses null/fallbacks rather than
   manufacturing request identity. No independent false-default replacement was found in this
   tranche; the plan's known provenance-normalization issue remains owned by the continuation work.
6. **Filename/timestamp recovery:** reconciliation explicitly rejects staging-directory identity as
   provenance unless it matches the manifest. Preserve this validator.
7. **Green means treatment reached solver:** workflows read observed producer configuration hashes,
   which is stronger than labels alone, but remains the legacy broad envelope. Future canaries must
   compare distinct canonical request identities at invocation output.

No stale assumption was edited in this snapshot: each actionable code site either depends on the
unseen compatibility/binding APIs or requires a producer-specific semantic decision.

## Validation topology

| Invariant | Cheapest trustworthy path | Helper-only tests that are insufficient alone |
|---|---|---|
| Resolved request reaches direct solver and report | One-level bundled level-blind sweep with sentinel option; inspect solver result and report projection | Projection unit test, CLI parser test |
| Worker transport retains request fields | `test:portfolio-solve-sweep-worker` with sentinel plus a one-level worker canary | solve-options membership/type test |
| Raced backend retains/rejects backend fields | One-level `portfolio-solve-sweep` with race pool and distinct sentinel; compare invocation/result identity | sequential sweep test |
| Plain Node reads canonical and legacy identities honestly | Compatibility fixtures through combine, readiness and agreement consumers | digest helper test |
| Browser/worker bundle accepts shared owner | focused Vitest worker transport test plus `npm run build`; browser smoke if hint schema changes | Node import test |
| Workflow treatment actually differs | contract writer over real arm artifacts, assert request identities differ only on intended fields | YAML/action validation |
| Source run/attempt survives publication | publisher node test with sentinel run attempt, then inspect uploaded manifest/sidecar in one canary | contract constructor test |
| Recombined lineage is not relabeled | reconciliation node test with mismatched directory/manifest and multiple attempts | stable-hash unit test |
| Hint harvest retains execution binding | tiny report -> harvester -> decoded hint -> query/reconstructability output | evidence constructor test |
| Failure/hint join compares protocol, not acquisition run | mixed-run fixture through `hint-failure-process-join` | key helper test |
| Search-loss real capture carries invocation identity | bounded `research:canary-search-loss` | search-loss schema validator |
| Sparse CI can validate registered artifacts | repository-index/object fixture in the owning check | full-worktree local run |
| Firestore/local persistence retains semantic fields | focused emulator/encoded-size round trip when schema changes | in-memory codec round trip |

The most falsely reassuring surfaces are CLI parser tests for level-blind sweeps, structural workflow
checks, and constructor-only evidence tests. They prove shape, not value transport through a solver
or persistence boundary.

## Changes in this tranche

- Added this durable audit only.
- Did not introduce a registry, identity helper, projection, source-run abstraction, schema change,
  historical rewrite, or solver behavior change.
- Did not edit historical reports or tracked evidence.

## Safe mechanical transplant into PR #2002

- Use the inventory and validation matrix as the consumer checklist.
- Add mixed-era compatibility-reader fixtures to combine/readiness/agreement consumers.
- Adapt publisher manifest and GHA sidecar construction to the shared source-run binding while
  preserving their public schemas.
- Add distinct sentinel request/protocol/config hashes to hint-discovery and failure-join tests.
- Import the canonical request projection directly only from already-bundled solver producers.

## Reserved for PR #2002 / Claude

- Canonical-versus-legacy precedence and retirement policy in each reader.
- Whether search-loss capsule identity remains occurrence-specific or gains a separate semantic ID.
- Which standalone `GITHUB_SHA` producers can run after custom checkout and how old records remain
  readable after correcting them.
- Whether runtime request default resolution can move to a neutral `.mjs` owner; do not copy it.
- Backend reproducibility and observer-reactivity membership in execution identity.
- Final provenance occurrence model, Firestore layout, historical enrichment, and physical v4.
