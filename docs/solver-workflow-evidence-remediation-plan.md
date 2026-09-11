# Solver workflow and research-evidence remediation plan

> **Status:** active remediation plan.
> **Created:** 2026-09-11.
> **Scope:** GitHub Actions solver/research workflows, shared sweep/reporting infrastructure, historical solver evidence, derived research conclusions, workflow lifecycle, and documentation.
> **Priority authority:** this plan owns the remediation sequence only. [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) remains the authority for ordinary solver-research priority and gates.
> **Method authorities:** [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-level-blindness.md`](solver-level-blindness.md).

## 1. Purpose

The solver research system has accumulated several generations of GitHub Actions workflows and supporting scripts. Newer workflows have substantially stronger experimental discipline than older ones, but similar-looking workflows do not currently share one experimental contract.

The resulting problems include:

- misleading or false aggregate result metadata;
- incomplete populations represented as ordinary failures or complete experiments;
- inconsistent population selection and matching between experimental arms;
- different meanings for nominally identical budget, timeout, deterministic, and completion concepts;
- inconsistent checkout/ref behavior;
- history-aware and level-blind measurements presented too similarly;
- workflows with different persistence and evidence-retention side effects;
- composite experiments losing source-run provenance;
- obsolete or one-off workflows remaining in the maintained workflow surface;
- historical reports and research decisions that may rely on evidence whose interpretation is now known to be weaker than originally stated.

This plan is not merely a YAML cleanup. It establishes one coherent experimental substrate, retires obsolete plumbing, normalizes trustworthy historical evidence, explicitly downgrades unreliable evidence, and reruns only experiments whose conclusions genuinely require new computation.

The governing principle is:

> **Preserve raw evidence, repair its interpretation, and spend new compute only where the original scientific question remains important and the existing evidence cannot answer it reliably.**

The current research operating model already requires complete intended coverage, comparable arms, explicit provenance, correct cost accounting, and reconciliation of historical evidence before reuse. This remediation makes those requirements mechanically enforceable rather than workflow-specific conventions.

## 2. Immediate trust posture

Until remediation completes, apply these provisional evidence classes.

| Surface | Interim status | Rule |
|---|---|---|
| Canonical `solver-stress-refresh.yml` capability results that passed exact 102/1700 coverage and anti-history checks | **Trusted** | Preserve result; normalize metadata only unless retrospective integrity audit finds a contradiction |
| `solver-level-blind-targeted-sweep.yml` results that passed exact ID validation | **Trusted** | Preserve; migrate to common schema |
| `solver-broad-confirmation.yml` | **Trusted architecture** | Preserve; migrate schema |
| `solver-residual-confirmation.yml` | **Trusted architecture** | Preserve; migrate schema |
| `method-probe-sweep.yml` | **Conditionally trusted** | Trust only after actual corpus cardinality is confirmed against dispatched `total_levels` |
| `static-portfolio-confirmation.yml` | **Conditionally trusted** | Preserve subject to common timeout/error classification audit |
| `technique-census.yml` | **Conditionally trusted** | Dedicated completeness information remains useful; generic publication semantics need normalization |
| `solver-highbudget-unsolved-sweep.yml` | **Non-decision-bearing until repaired/audited** | Successful solves remain positive evidence; aggregate population conclusions and derived telemetry require coverage audit |
| `solver-typical-budget-baseline.yml` | **Warm/history-aware evidence only** | Do not interpret as cold capability |
| `solver-routing-regime-sample-ab.yml` historical paired comparisons | **Unverified paired evidence** | Confirm exact population identity across arms before reuse |
| Generic `solver-sweep-result` statements of shard “completeness” | **Artifact coverage only** | Must not be cited as proof of population completeness |
| Shared-combiner `engine`, `witnessAccess`, `failed`, and `errors` aggregates | **Unreliable derived metadata** | Recompute from source rows |
| Referee-valid saved solutions | **Trusted positive facts** | Preserve unless independent referee validation fails |

This does **not** require resetting the current canonical production boundary. The workstream authority already distinguishes a complete production boundary from later promoted capability that has not yet been folded into a new full refresh. Preserve that discipline.

## 3. Non-negotiable evidence rules

### 3.1 Raw evidence is immutable history

Do not silently rewrite dated raw solver outputs merely to make them conform to the new schema.

Instead:

- preserve original raw reports;
- generate corrected derived/normalized records;
- attach correction metadata or reliability annotations;
- regenerate files explicitly designated as `latest`, canonical, derived, or rebuildable only after their inputs pass the new integrity rules.

Historical errors should remain inspectable rather than being erased.

### 3.2 Missing is never negative

A level that did not produce a trustworthy terminal row is not an unsolved level.

It is `missing`, `deadline-truncated`, `harness-error`, `malformed`, or another explicit indeterminate class.

### 3.3 A positive verified solution survives surrounding experimental defects

A referee-valid path remains evidence that the level is solvable by that path.

Population censoring, misleading denominators, provenance defects, or a bad paired comparison do not invalidate an independently referee-valid solution.

### 3.4 Comparison requires compatible populations and protocols

A decision-bearing comparison must mechanically prove:

- same intended population where pairing is claimed;
- compatible population identity hashes;
- compatible execution semantics;
- declared treatment differences only;
- known actual SHAs;
- complete required coverage or an explicitly non-decision-bearing incomplete outcome.

### 3.5 Historical evidence should be rerun minimally

Do not rerun an entire 1,700-level sweep merely because a few levels disappeared from an old batch.

Where possible, recover only missing cells or IDs.

Do not rerun an obsolete scientific question merely to make history cosmetically tidy.

## 4. Establish a common solver experiment contract

Create one canonical machine-readable experimental contract shared by all maintained solver/research workflows.

A new standard result schema should supersede the current generic publisher schema. A reasonable name is `pathfinder-solver-experiment-result`, schema version 3.

Every decision-bearing result should contain at least the following conceptual fields.

### Identity and provenance

```text
experiment:
  schemaVersion
  experimentId
  workflowFamily
  producer
  entrypoint
  requestedRef
  resolvedSha
  workflowRunId
  workflowRunAttempt
  sourceRuns[]
  reconciliationRun
  configurationHash
```

The distinction between `sourceRuns` and `reconciliationRun` is mandatory for composite/gap-filled experiments.

### Population

```text
population:
  kind
  identityBasis
  identityHash
  expectedCount
  observedCount
  duplicateIds[]
  unexpectedIds[]
  missingIds[]
```

Standardize population hashing:

- explicit-ID experiment: hash canonical sorted ID vector;
- complete corpus experiment: hash corpus/content identity plus selection definition;
- generated cohort: hash sealed corpus artifact;
- static portfolio/census: hash canonical ordered cell identities;
- residual experiment: hash the frozen residual population;
- stratified experiment: preserve whole-population and stratum hashes.

### Execution semantics

```text
execution:
  levelBlind
  historyAware
  historicalInputs[]
  reproducibilityExpected
  producerFamily
  schedulerMode
```

`levelBlind` and `historyAware` are separate facts. A workflow can be level-blind at runtime while still using history to prime or select execution.

### Limits

Replace overloaded reporting vocabulary with normalized semantics:

```text
limits:
  cumulativeNodeCeiling
  initialWorkAllocation
  totalWorkCeiling
  wallSafetyDeadlineMs
  wallDeadlineBinding
```

A raw CLI `budget_ms`, `node_budget`, or `work_budget` may still be recorded, but consumers should not need workflow archaeology to understand what those values constrained.

### Outcome taxonomy

Every expected subject must ultimately fall into an explicit class such as:

```text
solved
exhaustedNegative
nodeLimited
workLimited
deadlineTruncated
harnessError
malformed
missing
unknown
```

Do not retain a generic `failed = !ok` scientific category.

Use `exhaustedNegative` only when the protocol genuinely establishes the intended negative under its defined search envelope.

### Coverage

Separate:

```text
artifactCoverage
populationIntegrity
```

Artifact coverage answers:

> Did the expected shard/result files arrive?

Population integrity answers:

> Did the experiment actually produce one valid interpretable observation for every intended subject?

Reserve the word **complete** for population integrity unless explicitly qualified as artifact/shard completeness.

### Research outcome

```text
researchOutcome:
  executionStatus
  verdict
  decisionBearing
  reason
```

Suggested verdict vocabulary:

- `completed-positive`
- `completed-negative`
- `timeout`
- `incomplete`
- `invariant-violation`
- `harness-error`
- `infrastructure-error`
- `observational-only`

A green Actions job and a positive scientific verdict are not the same concept.

### Side effects

Each workflow must explicitly declare:

```text
sideEffects:
  hints
  canonicalBaseline
  telemetry
  reports
```

Each field should say whether the workflow:

- produces artifact-only evidence;
- permits harvesting;
- directly commits canonical state;
- replaces a baseline;
- updates scheduling telemetry.

No operator should need to inspect shell steps to discover that an experiment mutates future research inputs.

## 5. Repair shared result infrastructure first

These fixes are foundational and precede workflow-by-workflow cleanup.

### 5.1 `scripts/combine-solver-sweep-reports.mjs`

The current shared combiner can hardcode portfolio/legacy engine metadata even when combining level-blind capability reports, and reduces every non-`ok` row to `failed` while hardcoding `errors: 0`.

Replace that behavior with:

1. producer and engine metadata supplied by source reports;
2. consistency validation across all combined inputs;
3. refusal to silently combine semantically incompatible producers;
4. explicit normalized status counts;
5. separate expected and observed counts;
6. no hardcoded error count;
7. preservation of source report/run provenance;
8. configuration compatibility checks based on normalized semantics, not merely matching raw field names;
9. explicit support for weighted/per-level budgets where budget equality is not a required invariant;
10. a configuration hash suitable for reconciliation checks.

The combiner should fail loudly if inputs claim one coherent experiment but disagree on meaning-changing execution semantics.

### 5.2 `scripts/publish-solver-sweep-result.mjs`

The current publisher can label matching shard counts as `shardCompleteness` and print `X/Y solved` where `Y` is merely the number of rows that happened to exist.

Change it so that:

- `shardCompleteness` becomes `artifactCoverage`;
- population integrity comes from a validated integrity record;
- `total` means expected population, not observed row count;
- summaries expose expected, observed, missing, errors and truncations;
- a bare `X/Y solved` is forbidden when `Y` is not the intended population;
- paired gained/lost calculations are decision-bearing only when populations and protocol semantics are compatible;
- generic publication never infers a scientific verdict;
- publication of partial evidence is allowed, but visibly marked non-decision-bearing;
- the manifest records actual source SHAs, source runs and population hashes.

Preferred wording:

> 20 solved / 350 observed / 400 expected; 50 missing-indeterminate.

Not:

> 20/350 solved, complete.

### 5.3 Generalize integrity validation

Extend or wrap `validate-solver-sweep-integrity.mjs` so the same underlying concepts work for:

- explicit ID vectors;
- full corpus populations;
- sampled/sealed populations;
- generated cohorts;
- paired arms;
- static portfolio cells;
- technique census cells;
- cross-run reconciliation.

Do not create a separate bespoke notion of completeness in every workflow.

### 5.4 Shared population/configuration hashing

Introduce a small common helper for:

- population canonicalization and hashing;
- normalized configuration hashing;
- source-run provenance;
- compatibility assertions.

Every paired experiment and every cross-run reconciliation should use it.

## 6. Normalize checkout and ref semantics

The workflow README already states that evidence-producing runs should use immutable dispatched-SHA checkout. Make this mechanically true.

### Default rule

Every ordinary evidence-producing workflow checks out:

```text
${{ github.sha }}
```

and records it as the actual execution SHA.

### Explicit cross-ref comparisons

A workflow that intentionally compares different revisions should accept explicit ref/SHA inputs, resolve them to immutable SHAs before execution, and record:

- requested ref;
- resolved SHA;
- which arm used which SHA.

### Eliminate implicit alternatives

Do not retain workflow-specific meanings such as:

- “whatever `main` is when this job starts”;
- mutable `${{ github.ref }}`;
- dispatched immutable SHA;

under the same apparent workflow semantics.

In particular:

- remove high-budget's implicit checkout of `main`;
- remove typical-baseline's dependence on a mutable dispatched ref;
- convert routing comparisons to explicit immutable arm SHAs.

A retrospective wrong-ref audit is required in Phase 11.

## 7. Normalize budget, deterministic and timeout semantics

The workflow family currently uses the same terms for materially different constraints.

Replace informal interpretation with the normalized `limits` contract above.

### Node semantics

Distinguish a genuine cumulative node ceiling from an advisory/planning node value.

### Work semantics

Distinguish initial work allocation from a strict total-work ceiling.

The repository has measured additive tiers spending far beyond nominal starting allocations when strict total-work enforcement is disabled. That distinction must be machine-readable.

### Wall semantics

Distinguish:

- safety deadline;
- decision-bearing wall cap;
- deliberately non-binding deadline.

### Replace overloaded `deterministic`

A single `deterministic=true` should no longer implicitly mean several unrelated things.

Represent separately:

```text
reproducibilityExpected
wallDeadlineBinding
strictTotalWorkBudget
canonicalStateMutationAllowed
```

The UI may still provide a convenience preset if useful, but the result manifest must expose actual resolved semantics.

## 8. Standardize canaries and participation checks

Three different concepts currently overlap.

### Harness canary

A known-fast representative solve used to prove that:

- the entrypoint starts;
- flags/config resolve;
- output shape is valid;
- the execution family actually performs work.

It should not accidentally become an expensive scientific observation.

### Treatment canary

Use only where needed to prove that a materially different treatment configuration was actually wired into the invocation.

### Participation gate

A population-level assertion that the mechanism under test actually executed or received meaningful work on enough subjects for the scientific question to be interpretable.

Do not use a one-level canary as a substitute for participation.

Update the operating-model documentation at the same time. Its current canary inventory should be checked against the actual maintained workflow surface so references to retired or missing workflows cannot fossilize.

## 9. Workflow-specific repairs

### 9.1 `solver-stress-refresh.yml`

Retain as the canonical cold level-blind capability refresh.

Its existing exact 102/1700 validation is stronger than the generic publisher and should become the model rather than be weakened.

Required changes:

- publish C1 and C2 population hashes;
- feed exact integrity results into the standard publisher;
- explicitly distinguish incomplete publication from valid capability completion;
- prevent a generic “artifact complete” message from contradicting a failed capability-integrity check;
- migrate limits/outcomes/provenance to the common schema;
- keep canonical state mutation behind successful population integrity;
- retain the solver-health timeline only from valid compatible completed runs.

No historical canonical baseline reset is required unless retrospective audit finds an actual integrity failure.

### 9.2 `solver-level-blind-targeted-sweep.yml`

Retain.

This is already one of the strongest explicit-population workflows.

Required changes are mostly convergence:

- add common population hash;
- use common normalized limit semantics;
- publish exact integrity metadata;
- identify recovery/gap-fill source runs;
- make first-pass partial status explicitly observational;
- retain final exact-population validation and participation gates.

Its current exact-ID and recovery model should inform the common contract.

### 9.3 `solver-highbudget-unsolved-sweep.yml`

Retain only after substantial repair. This is the highest-priority individual workflow fix.

Required changes:

1. execute the dispatched immutable SHA, not implicit `main`;
2. treat frozen historical unsolved lists as explicit named cohorts with hashes and dates;
3. load exact expected IDs before execution;
4. reject duplicates or unexpected IDs;
5. do not treat placeholder JSON as observed evidence;
6. record timeout/truncation separately from true negatives;
7. validate exact expected population before any aggregate population conclusion;
8. prevent incomplete runs from updating canonical runtime telemetry;
9. prevent incomplete runs from committing a canonical combined report as though complete;
10. preserve referee-valid discoveries even from incomplete runs through artifact/harvester provenance;
11. replace “newly solved” with “solved by this run under this envelope” unless novelty against a named previous baseline has actually been established;
12. declare the run history-aware because it uses production scheduler/history mechanisms such as baseline/resume/hints;
13. make gap-fill execution first-class so only missing IDs need rerunning;
14. record whether telemetry was derived from a complete representative population.

Historical high-budget fallout is handled separately in Phase 11.

### 9.4 `solver-typical-budget-baseline.yml`

Rename and redefine.

Recommended new name:

`solver-production-replay-baseline.yml`

or equivalently `solver-history-aware-replay-baseline.yml`.

The maintained name must stop suggesting that this is the canonical cold capability baseline.

The workflow uses production/history-aware mechanisms including `--baseline` and `--prime-winner`; its own implementation describes the measurement as a warm re-solve.

Required changes:

- label the measurement history-aware/warm everywhere;
- remove “apples-to-apples” language against cold stress refresh;
- use immutable execution SHA;
- enforce exact C1/C2 population integrity;
- fix placeholder/unusable-shard accounting;
- retain `allow_partial` only for explicitly exploratory output;
- prohibit a partial run from updating the continuity baseline or producing a decision-bearing diff;
- compare only against the same warm replay measurement family;
- migrate standard metadata.

Delete the old workflow filename after the rename so there are not two entrypoints.

### 9.5 `solver-routing-regime-sample-ab.yml`

Redesign as a single coordinated paired experiment.

The current two-dispatch design can independently select different populations when control/treatment refs have different classifier or representation behavior. A shared seed is insufficient.

New design:

1. accept explicit `control_ref` and `treatment_ref`;
2. resolve both to immutable SHAs;
3. choose a defined selection revision;
4. materialize the exact population once;
5. seal and hash it;
6. feed that identical artifact to both arms;
7. assert population-hash equality;
8. record resolved treatment provenance;
9. run both arms inside one workflow dispatch;
10. remove accidental concurrency serialization between matched arms;
11. summarize by meaningful strata: target eligible, Corpus-2 control stratum, Corpus 1, published, and overall;
12. derive the treatment verdict from the prespecified target stratum, not an aggregate denominator that mixes fundamentally different populations.

The newer broad-confirmation architecture already demonstrates the safer one-population/two-arm model.

### 9.6 `solver-combine-sweep-runs.yml`

Retain and strengthen.

Required changes:

- persist every source run ID;
- recover and validate every source run SHA;
- validate population hashes;
- validate compatible normalized execution semantics;
- record configuration hashes;
- identify the current run separately as `reconciliationRun`;
- reject combining semantically incompatible experiments;
- preserve gap-fill provenance at row level where practical.

### 9.7 `method-probe-sweep.yml`

Retain.

Remove caller-maintained `total_levels`.

Derive:

- actual corpus cardinality;
- exact population identity;
- population hash;

from the supplied corpus itself.

Keep its strong existing distinction between explicit timeout and missing/harness-error states and its explicit research outcomes.

### 9.8 `solver-broad-confirmation.yml`

Retain as a model implementation.

Preserve:

- one generated sealed population;
- byte-identical arm population;
- explicit arm provenance;
- frozen verdict gates;
- exact coverage checks;
- separate infrastructure/harness/invariant outcomes.

Migrate only to the common vocabulary/schema.

### 9.9 `solver-residual-confirmation.yml`

Retain as a model for conditional confirmation.

Preserve:

- phase-1 control-only population generation;
- frozen residual before treatment observation;
- no residual reuse once its results influence redesign;
- sealed artifacts;
- exact SHA execution;
- phase-specific canaries;
- common population/provenance records.

Its current design already documents the scientific distinction between residual-conditioned evidence and a broad population solve-rate estimate.

### 9.10 `static-portfolio-confirmation.yml`

Retain.

Conform its plan/cell identity to the common population-hash abstraction.

Verify that:

- missing cells cannot become losses;
- timeout/error cells cannot become ordinary unsolved negatives;
- gain/loss calculations require interpretable matched cells;
- existing exact plan coverage guarantees remain.

### 9.11 `technique-census.yml`

Retain, but perform a conformity audit.

The dedicated census combine path already acknowledges partial completion. Preserve that.

Required changes:

- common population/cell identity hash;
- normalized explicit outcome classes;
- common artifact/publication schema;
- no generic publisher interpretation that overrides census-specific partial-cell accounting;
- role-based retention policy.

### 9.12 CP-SAT/reference workflows

Audit against the same contract, with reference-model-specific outcome types where necessary.

Do not allow:

- unsupported;
- timeout;
- relaxed-model result;
- missing case;

to masquerade as exact `UNSAT` or other hard negative evidence.

## 10. Workflow retirement and consolidation

Workflow cleanup is part of this plan, not a later cosmetic exercise.

### Delete now

#### `solver-early-repair-search-adaptive-sample-ab.yml`

Retire.

The generalized routing-regime workflow supersedes the hardcoded early-repair form. Git and dated evidence are the archive.

Remove associated current-authority documentation references.

#### `firestore-level-fingerprint-boundary.yml`

Retire once its completed proof is confirmed to be represented by durable tests/reports.

This is a narrow migration/persistence boundary proof and matches the workflow README's rule that completed migration/campaign gates should live in Git history and dated evidence, not the maintained workflow surface.

If any current test coverage necessary to preserve its invariant exists only inside the workflow, migrate that assertion into durable CI/test plumbing before deletion.

### Consolidate

#### `cpsat-hint-harvest-sweep-published.yml`

Add the published-corpus selection mode to `cpsat-hint-harvest-sweep.yml`, then delete the published-only wrapper.

A corpus-size variation is not sufficient reason for two maintained experimental entrypoints.

### Resolve before remediation closeout

The following workflows must either have a specific current research consumer documented or be deleted:

- `collect-prune-gap-labels.yml`
- `cpsat-explicit-prefix-reference.yml`
- `mitm-frontier-sweep.yml`

For each, ask:

1. Which current workstream or deferred question can dispatch this workflow?
2. What question can it answer that a retained workflow/tool cannot?
3. When was it last genuinely used?
4. Is the underlying method still scientifically current?
5. What exact condition should cause its retirement?

If no live answer exists, delete it.

Do not leave them indefinitely classified as “maybe useful.”

### Keep operational workflows

Retain:

- `ci.yml`
- `deploy-pages.yml`
- `deploy-firestore-rules.yml` while Firestore remains an active product dependency
- `solver-diagnostics.yml`, subject to a separate contents/lifecycle sanity check
- `harvest-solver-evidence.yml`

Operational workflows are not required to implement the solver-experiment scientific schema.

## 11. Add a workflow lifecycle ledger

Extend `.github/workflows/README.md` with a maintained lifecycle table containing, for every workflow:

- workflow filename;
- classification;
- purpose;
- execution family;
- decision-bearing or observational;
- current consumer/workstream;
- side effects;
- introduced date if known;
- last known dispatch;
- historical dispatch count where obtainable;
- replacement/superseded-by relationship;
- retirement condition.

Do not invent unavailable usage counts.

Add a checker so:

- every workflow is listed;
- deleted workflow names cannot remain in current-authority sections;
- a workflow marked one-shot cannot remain indefinitely;
- every maintained solver workflow declares its experimental class.

## 12. Comprehensive historical evidence audit

After the new contract is implemented, audit the repository's retained solver evidence.

Include at minimum:

- `reports/`
- `reports/stress/`
- committed solver result subdirectories;
- committed `logs/solver*` evidence;
- population/ID files under `data/stress/`;
- current canonical baselines;
- runtime/scheduling telemetry;
- hint provenance;
- solver health timeline;
- experiment ledgers;
- dated research reports;
- current workstream and future-work conclusions that depend on historical results.

Create one rebuildable machine-readable integrity index, for example:

`reports/stress/solver-evidence-integrity-index.json`

Optionally generate a concise Markdown view from it, but JSON is the authority.

This is an integrity ledger, not another research-opportunity catalog.

For each historical experiment/result, record where reconstructable:

```text
evidenceId
sourcePaths
sourceRunIds
intendedRef
actualSha
producer
entrypoint
populationKind
populationHash
expectedCount
observedCount
missingCount
duplicateCount
unexpectedCount
levelBlind
historyAware
normalizedLimits
timeoutCount
errorCount
reliability
replacementEvidence
rerunRequired
notes
```

Use these reliability classes.

### `valid`

No material defect found.

### `valid-after-normalization`

Raw observations remain sound, but metadata/aggregates need correction.

### `observational-only`

Useful rows or capability signatures remain, but the evidence cannot support the original causal/population claim.

### `incomplete`

Intended population was not fully observed.

### `superseded`

The result may have been valid under its original protocol but a newer authoritative result should be used for current conclusions.

### `invalid`

The claimed conclusion cannot be supported because the wrong code/population/protocol was measured.

## 13. Specific historical remediation

### 13.1 Canonical stress capability history

For each retained canonical stress refresh:

- verify expected 102/1700 population;
- verify no duplicate/unexpected IDs;
- verify no forbidden history/prime assistance;
- recover normalized status counts;
- record population and configuration hashes;
- correct misleading generic publisher metadata.

If these checks pass, retain the historical capability result.

Do not rerun merely because the old shared combiner mislabeled the engine.

### 13.2 Shared-combiner historical outputs

Recompute, wherever raw rows remain available:

- producer;
- entrypoint;
- engine;
- witness/history semantics;
- solved count;
- true negative categories;
- truncation;
- errors;
- observed count;
- expected count;
- missing count.

Retire these historical derived fields:

- hardcoded `errors: 0`;
- `failed = total - solved`;
- false portfolio/legacy engine labels.

Consumers should move to normalized records.

### 13.3 Standard publisher artifacts

Do not recreate expired GitHub artifacts solely for neatness.

Where committed source evidence exists:

- generate normalized integrity records;
- correct committed summaries derived from misleading generic publication semantics.

Where source artifacts have expired and no sufficient retained evidence exists:

- mark the historical result `unverifiable` or `incomplete`, as appropriate;
- do not manufacture reconstructed certainty.

### 13.4 Historical high-budget sweeps

For every retained high-budget round:

1. recover intended frozen ID population;
2. compare expected IDs against observed rows;
3. detect duplicates/unexpected IDs;
4. classify timeout/error/missing rows;
5. record actual execution SHA;
6. determine whether published aggregate conclusions used observed rows as the denominator.

If expected and observed populations match:

- retain the result;
- rederive corrected metadata.

If IDs are missing:

- preserve every referee-valid successful solve;
- mark whole-population solve-rate claims incomplete;
- identify downstream telemetry/report based on the incomplete aggregate;
- gap-fill only missing IDs if the scientific conclusion remains relevant and the original SHA/configuration is reconstructable.

Do not call a current rerun a replication of the historical experiment if the original execution environment cannot be reconstructed faithfully.

### 13.5 High-budget runtime telemetry

Identify telemetry records derived from incomplete/selectively censored high-budget populations.

Mark them biased/superseded for scheduling calibration.

Do not burn large amounts of compute recreating obsolete scheduling history.

Recalibrate current telemetry from valid current observations and let trustworthy modern data replace contaminated scheduling inputs.

### 13.6 Historical routing-regime A/Bs

For every paired control/treatment experiment:

- recover exact selected IDs for each arm;
- canonicalize and hash them;
- compare hashes and cardinalities.

If they match:

- retain the paired experiment after metadata normalization.

If they differ:

- retain individual rows as observational evidence;
- mark the paired causal conclusion invalid;
- correct any report/ledger/workstream decision that cites the paired effect;
- rerun only if the scientific question remains live.

### 13.7 Historical typical-budget baselines

Relabel the entire measurement family as warm/history-aware production replay.

Correct documentation that describes it as:

- cold capability;
- directly apples-to-apples with stress refresh;
- evidence of level-blind solver acquisition when the result depended on primed historical winners.

Keep valid warm-replay continuity information.

Rerun only scientific questions that genuinely require cold capability evidence and still matter today.

### 13.8 Historical method-probe runs

For every decision-bearing retained method-probe run:

- recover actual corpus cardinality;
- compare it with dispatched `total_levels`;
- determine whether the intended population was completely probed.

Matching runs survive.

Mismatched runs become incomplete and are rerun only if their conclusion remains consequential.

### 13.9 Cross-run reconciliations

For historical reconciled experiments:

- reconstruct source run IDs where available;
- record source SHAs/configurations;
- distinguish source execution from reconciliation;
- validate that all source runs were semantically compatible.

Do not allow a reconciliation workflow's SHA to replace the SHAs of solver executions it merely merged.

### 13.10 Wrong-ref audit

For every historically important decision-bearing workflow family that ever used `main`, `${{ github.ref }}`, or another mutable/ref-specific checkout pattern:

- recover actual executed SHA from Actions metadata or retained provenance;
- recover intended branch/ref from dispatch/report context where possible;
- compare them.

Classify:

- intended and actual equivalent: valid;
- ambiguity but no evidence of difference: observational/unverified;
- actual code materially different from intended: invalid comparison.

Prioritize promoted/default-on decisions and current queue assumptions.

### 13.11 Valid hints and solved paths

Do not purge a hint merely because its discovery experiment gets downgraded.

A referee-valid path can retain `positive-oracle` value even when the producer cannot establish current production capability. Update provenance classification rather than deleting positive knowledge.

## 14. Correct affected research reports and decisions

The integrity index alone is insufficient. Humans and agents will continue reading dated reports.

For every report whose material conclusion is weakened by this audit:

- preserve the original report;
- add a prominent correction/reliability note near the top;
- identify the affected claim;
- identify what remains valid;
- link the replacement/normalized evidence;
- state whether a rerun is required, completed, or intentionally unnecessary.

Example:

> **Reliability correction, 2026-09-XX:** The original control and treatment populations were independently selected and were not identical. Per-level observations remain useful exploratory evidence, but the reported paired gain/loss conclusion is not decision-bearing. See `<replacement evidence>`.

Do not rewrite old prose so thoroughly that the historical record disappears.

## 15. Reconcile current solver authorities

After historical classification, audit every current authoritative solver document for claims dependent on downgraded evidence.

### `docs/solver-optimization-workstreams.md`

This remains the sole current priority authority.

For every current disposition/next gate:

- trace important evidence dependencies;
- if a supporting experiment becomes invalid, determine whether independent surviving evidence still supports the disposition;
- reopen only when the downgraded evidence was materially necessary;
- otherwise annotate the surviving basis and leave the decision closed.

Do not pollute this file with remediation chronology. It is current-state only.

### `docs/solver-opt-in-experiment-ledger.md`

For each disposition backed by affected workflow evidence:

- update the evidence characterization;
- point to corrected/replacement evidence;
- preserve closed status if independent grounds still justify it;
- reopen only when the actual promotion/closure decision no longer has adequate support.

### `docs/solver-future-work.md`

Do not turn remediation into a second queue.

Update only deferred/reopen conditions whose premise depended on downgraded evidence.

### `docs/solver-research-operating-model.md`

Add the new experiment-contract requirements:

- population identity/hash;
- normalized limits;
- explicit expected/observed/missing semantics;
- artifact coverage vs population integrity;
- actual SHA discipline;
- source-run provenance;
- common outcome classes;
- canary/participation distinction;
- workflow side-effect declaration;
- retention policy;
- no decision-bearing paired comparison without population compatibility.

Remove stale references to retired/nonexistent workflow surfaces.

### `docs/solver-evaluation-evidence.md`

Integrate the common completeness and population-identity rules rather than duplicating them.

Preserve its existing rule that timeout/deadline truncation and execution errors are indeterminate, never ordinary failures.

## 16. Selective rerun queue

Only red/incomplete evidence that still matters should generate new solver compute.

Priority order:

### Priority 1: wrong-code experiments

Rerun decision-bearing experiments where the executed SHA materially differed from intended code.

### Priority 2: mismatched paired populations

Rerun routing or other A/B experiments whose control/treatment population hashes differ and whose conclusion remains active.

### Priority 3: incomplete high-budget populations

Gap-fill missing IDs only.

Do not rerun already trustworthy rows.

### Priority 4: method-probe cardinality errors

Rerun only omitted population/cells where coherent reconstruction is scientifically valid; otherwise rerun the smallest complete experiment necessary.

### Priority 5: warm-versus-cold misinterpretations

Rerun only questions that still require a cold answer.

### No-rerun category

Do not rerun when:

- a newer valid experiment already supersedes the question;
- only metadata was wrong;
- valid per-level rows can be reaggregated;
- the result was merely mislabeled;
- the historical question is closed for independent reasons;
- reproducing an obsolete scheduling statistic has no current decision value.

Every red historical item must ultimately be marked one of:

- `rerun-completed`;
- `rerun-queued`;
- `superseded-no-rerun`;
- `invalid-no-longer-relevant`.

Nothing should sit indefinitely at “we should probably rerun this.”

## 17. Artifact retention policy

Standardize retention by evidence role rather than workflow author preference.

Recommended default:

| Evidence | Retention |
|---|---:|
| Population definitions / plans / hashes / manifests | 90 days minimum; commit when scientifically important |
| Standard experiment result | 90 days |
| Small decision-bearing combined result | 90 days |
| Large raw shard artifacts | 14 to 30 days after successful combine |
| Failed/incomplete shard evidence needed for forensic recovery | 90 days or harvested/committed before expiry |
| Disposable console/intermediate files | Short retention |
| Durable referee-valid solutions | Harvest into canonical evidence |

A tiny population manifest is more valuable for later reconstruction than many gigabytes of disposable shard output. Retention policy should reflect that.

## 18. Concurrency policy

Normalize concurrency by scientific identity.

Rules:

- matched arms inside one coordinated workflow may execute concurrently;
- unrelated experiments should not serialize merely because they share a workflow filename;
- canonical state writers must serialize semantic merges;
- artifact-only experiments should avoid unnecessary global locks;
- concurrency keys should include experiment/cohort identity where needed;
- no two workflows should race to overwrite canonical baseline/telemetry state.

The preferred long-term design is fewer independent matched-arm dispatches and more single-dispatch paired workflows.

## 19. Documentation and automated guardrails

Add tests/checkers so this cleanup does not decay.

At minimum, CI should verify:

1. every maintained solver workflow is present in the workflow lifecycle ledger;
2. every decision-bearing solver workflow publishes the common experiment schema;
3. every such manifest contains actual resolved SHA;
4. every paired comparison has compatible population hashes;
5. no decision-bearing result uses `failed = !ok`;
6. no error count is hardcoded to zero;
7. no artifact/shard count can set scientific `complete=true`;
8. partial evidence cannot mutate canonical baseline/telemetry state;
9. a history-aware workflow cannot advertise itself as cold capability;
10. expensive fan-out workflows implement the canonical canary pattern where applicable;
11. population/corpus cardinality is derived rather than caller-maintained where possible;
12. composite results retain source-run provenance;
13. retired workflow names are absent from current-authority docs;
14. one-shot workflows are not left in the maintained surface after evidence is recorded;
15. workflow README inventory matches the actual `.github/workflows` directory.

## 20. Required regression tests for the remediation itself

Add explicit tests covering failures found by the audit.

### Result integrity

- all expected artifact files exist but one or more expected level rows are absent;
- placeholder file exists but contains no usable result;
- duplicate ID;
- unexpected ID;
- malformed row;
- explicit solver error;
- deadline-truncated row;
- node-limited row;
- work-limited row;
- complete true-negative row.

### Metadata

- level-blind producer must never emerge labeled as legacy portfolio;
- mixed producer families reject combination;
- incompatible execution semantics reject combination;
- actual execution SHA survives publication;
- source-run SHAs survive reconciliation.

### Population

- routing arms with different selected IDs are rejected;
- same count but different IDs is rejected;
- same IDs in different ordering produce the same canonical population hash;
- corpus cardinality cannot be overridden incorrectly by a caller parameter.

### Publication

- 20/20 shard artifacts plus 390/400 rows reports artifact coverage complete and population incomplete;
- no summary prints a misleading bare solve fraction;
- non-decision-bearing partial results remain publishable for diagnosis.

### Persistence

- incomplete high-budget run cannot update telemetry;
- incomplete warm baseline cannot replace canonical warm baseline;
- failed final integrity cannot be hidden by successful earlier shard jobs;
- valid paths from a failed/incomplete run remain harvestable.

## 21. Implementation sequence

Execute work in dependency order rather than fixing leaf workflows first.

### PR 1: Experiment contract and shared infrastructure

Implement:

- schema v3;
- population/config hashing;
- status taxonomy;
- shared integrity representation;
- combiner repair;
- publisher repair;
- tests.

Do not yet rewrite historical evidence.

### PR 2: Core capability workflows

Migrate and harden:

- stress refresh;
- targeted sweep;
- high-budget sweep;
- warm production replay rename;
- cross-run combine.

High-budget canonical side effects remain disabled until exact integrity gates are in place.

### PR 3: Paired and specialized research workflows

Migrate/redesign:

- routing-regime A/B;
- method probe;
- broad confirmation;
- residual confirmation;
- static portfolio;
- technique census;
- CP-SAT/reference workflows.

### PR 4: Workflow retirement and consolidation

- delete early-repair hardcoded A/B;
- retire Firestore fingerprint boundary after durable test confirmation;
- fold published CP-SAT sweep into general CP-SAT sweep;
- resolve prune-gap / explicit-prefix / MITM workflows;
- update lifecycle README;
- add inventory/lifecycle checker;
- remove stale current-authority references.

### PR 5: Historical integrity audit tooling

Implement a deterministic audit/normalization script.

Generate:

- evidence integrity index;
- population hashes where reconstructable;
- normalized status/metadata records;
- wrong-ref candidate list;
- routing population-match audit;
- high-budget missing-ID audit;
- method-probe cardinality audit;
- warm/cold classification audit.

This PR should produce findings without automatically launching expensive reruns.

### PR 6: Historical corrections and authority reconciliation

Use audit output to:

- annotate affected reports;
- regenerate safe derived summaries;
- mark biased/superseded telemetry;
- update ledgers;
- update current authority where necessary;
- create the minimal red-item rerun queue.

### PR 7: Selective re-execution

Execute only unresolved decision-bearing red items.

After each:

- update integrity index;
- update corrected report;
- resolve rerun state;
- update workstream/ledger only if new evidence changes a current decision.

### PR 8: Final closeout

Run a hostile final audit looking specifically for:

- stale workflow names;
- old terminology such as generic “failed”;
- bare observed-row denominators;
- implicit mutable refs;
- unmatched paired populations;
- partial canonical writes;
- undocumented side effects;
- current documents citing evidence now marked invalid;
- workflow surfaces without current consumers;
- rerun items without final disposition.

Then archive this remediation plan or mark it complete rather than allowing it to become another permanent queue.

## 22. Acceptance criteria

This plan is complete only when all of the following are true.

### Workflow correctness

- every maintained evidence-producing solver workflow has a declared experimental contract;
- every decision-bearing run records its actual immutable execution SHA;
- every intended population has an identity hash and expected count;
- every paired comparison proves compatible population identity;
- every workflow distinguishes missing/truncated/error from valid negative evidence;
- every workflow distinguishes artifact coverage from population integrity;
- every workflow declares level-blind/history-aware semantics;
- every workflow declares normalized budget/limit semantics;
- every workflow declares side effects;
- partial/incomplete runs cannot silently update canonical baselines or telemetry.

### Shared reporting

- no shared combiner hardcodes producer identity;
- no shared combiner hardcodes `errors: 0`;
- no shared combiner defines every `!ok` row as ordinary failure;
- no publisher calls shard presence scientific completeness;
- no standard summary uses an observed-row denominator as though it were intended population size;
- composite results preserve source-run provenance.

### Workflow lifecycle

- superseded early-repair A/B is deleted;
- Firestore boundary proof is retired after durable coverage is confirmed;
- published CP-SAT duplicate workflow is consolidated;
- prune-gap, explicit-prefix and MITM workflows are either demonstrably live with retirement conditions or deleted;
- every remaining workflow has a documented current consumer and retirement trigger where appropriate;
- current documentation contains no references presenting deleted workflows as maintained entrypoints.

### Historical evidence

- every materially decision-bearing committed solver result has an integrity classification or is explicitly outside reconstructable scope;
- historical high-budget populations have been exact-coverage audited;
- historical routing A/B populations have been matched or marked invalid;
- historical method-probe cardinalities have been checked;
- warm baseline evidence is clearly labeled history-aware;
- wrong-ref exposure has been audited for important historical decisions;
- misleading aggregate metadata has been normalized where source rows survive;
- affected dated reports carry correction notes;
- current solver authorities no longer rely unknowingly on invalid evidence;
- referee-valid positive solutions have been preserved.

### Reruns

- every identified red experiment has a final disposition;
- no unnecessary full-corpus rerun was performed where a smaller gap fill could answer the question;
- current canonical capability is refreshed only when scientifically required, not as remediation ceremony.

## 23. Expected final state

After this plan, Pathfinder should have one coherent experimental vocabulary rather than several generations of subtly different workflow semantics.

A future researcher or agent should be able to inspect any solver experiment and answer, without reverse-engineering YAML:

- What exact code ran?
- What exact population was intended?
- Did every intended subject produce usable evidence?
- Which rows solved, exhausted, truncated, errored or disappeared?
- Was the solver cold, level-blind, history-aware, or primed?
- What actually limited search?
- Was this a positive, negative, incomplete or merely observational result?
- Did the run mutate hints, telemetry, baselines or reports?
- If this is a composite experiment, which runs produced its evidence?
- Is this result still authoritative, merely historical, superseded, or invalid?
- What current research decision, if any, depends on it?

The cleanup should leave the project with **less maintained workflow surface, stronger shared plumbing, better historical provenance, and a smaller amount of genuinely questionable evidence than the current ambiguity makes it appear**.

The aim is not to purify history. It is to make trustworthy evidence machine-recognizable, make questionable evidence impossible to accidentally promote back into truth, and make future solver research considerably harder to fool.