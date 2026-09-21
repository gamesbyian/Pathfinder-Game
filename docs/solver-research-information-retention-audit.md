<!-- agent-context-budget: warn=9000 max=12000 -->
# Solver research information-retention audit

> **Status:** active investigation; documentation-first.
> **Started:** 2026-09-20.
> **Branch:** `chatgpt/solver-research-information-retention-audit-2026-09-20`.
> **Primary question:** where do Pathfinder solving and analysis tools discard, downgrade, aggregate away, overwrite, or only ephemerally retain information that could plausibly support future solver research?
> **Safety boundary:** this audit does **not** loosen production level-blindness, evidence-integrity rules, or workflow invariants. It investigates observation and retention outside the solver decision boundary.
> **Authority relationship:** the durable-resource semantics remain owned by `solver-research-resource-contract.md` and `solver-research-data-assets.*`; search-loss/failure telemetry remains owned by `solver-search-loss-evidence-implementation-plan.md` and `solver-failure-evidence-research-integration-plan.md`; any solver experiment still enters the canonical queue through `solver-optimization-workstreams.md`.

## 1. Trigger

The immediate trigger was a level-blindness question:

> Does enforcing a level-blind production solve accidentally prevent solver research from collecting useful information during sweeps?

The first inspection found that the runtime boundary itself is sound, but several downstream representations lose information that the level-blind worker already computed. That raised the broader question addressed here:

> Across solving, combining, publishing, persistence, and analysis, what useful information exists at one boundary and no longer exists at the next?

The concern is not merely permanent deletion. Research value can also be degraded by:

- collapsing a precise identity into a coarser one;
- replacing rows with aggregates;
- retaining rich evidence only in expiring Actions artifacts;
- overwriting longitudinal state with a moving summary;
- retaining a truncation flag without using it to nominate richer follow-up;
- computing a useful normalized dataset inside an analyzer and emitting only its final report;
- preserving evidence in a specialist workflow while ordinary runs through the same semantic seam remain unobserved.

## 2. Non-goals

This audit does **not** assume that more telemetry is always better.

It will not:

- weaken the cold level-blind solver input contract;
- persist full search traces by default;
- turn every intermediate object into a durable resource;
- duplicate raw source evidence merely because a reducer is lossy;
- promote research-only observers into production without parity/cost evidence;
- treat a summary as defective merely because it is a summary;
- create a new evidence warehouse before existing assets and manifests are evaluated;
- reconstruct historical fields that were never retained.

The goal is to distinguish justified compression from accidental research amnesia.

## 3. Information-boundary model

Audit the end-to-end path:

```text
puzzle / corpus row
  -> solver input projection
  -> prepared level / current-invocation state
  -> attempt / stage execution
  -> solve result
  -> sweep/cell row
  -> shard artifact
  -> combined result
  -> standard published result
  -> durable evidence / canonical resource
  -> normalized analysis rows
  -> aggregate / report / decision
```

At each arrow record:

1. what information exists on the left;
2. what survives on the right;
3. what is intentionally excluded and why;
4. whether the source remains durably reconstructable;
5. whether identity/provenance resolution changes;
6. whether truncation/sampling occurs;
7. whether the lost information has plausible future research value;
8. whether retaining a bounded projection would be cheap and semantically stable.


## 3A. Expanded model: retention is not one boolean

The first audit pass used "durable" too coarsely. Current evidence shows at least five separate questions:

1. **Transport:** did the workflow upload bytes somewhere?
2. **Publication:** did the bytes enter the standard `solver-sweep-result`/manifest surface?
3. **Canonical persistence:** did a harvester or workflow commit an evidence-bearing copy to durable repository state?
4. **Layer coverage:** which parts survived — solved paths, primary rows, compact failure response, rich capture, console logs, derived analyses?
5. **Scientific role:** after persistence, is the object still raw observation, a lossy projection, a decision-bearing bundle, a generated interface, a historical report, or operational state?

A workflow can therefore truthfully be "automatically harvested" while its successful paths survive and its failed-attempt/process rows do not. Likewise, a standard artifact can be well formed without qualifying as decision-bearing, and a generated resource can be well specified without any current durable instance.

The retention audit must record **evidence-layer coverage**, not infer it from workflow-level transport labels.


### Retention destination vocabulary

For the remaining audit, classify each retained object by destination:

- `canonical-main`: bytes are committed to canonical main;
- `merged-history`: branch-local bytes are known to have entered retained repository history;
- `branch-bound`: committed only to a live research/feature branch;
- `durable-experiment-bundle`: immutable v3 evidence copied under the canonical experiment-evidence store;
- `artifact-bound`: survives only under Actions retention;
- `operational-overwrite`: current state intentionally replaces prior state;
- `recomputable`: no durable copy required because stable durable inputs + deterministic derivation suffice;
- `unknown`: survival/reconstruction has not been established.

This vocabulary describes byte/reconstruction survival, not evidence quality.


### Semantic phase transitions

Add another question at each boundary:

> Did this object change scientific role here, and is that transition explicit?

Important transitions include:

- exploratory observation -> decision-bearing experiment evidence;
- current capability observation -> historical/forensic nomination;
- raw row -> compact response -> aggregate;
- generated interface/contract -> actual retained instance;
- exact/reference label -> downstream annotation;
- successful path -> hint provenance;
- partial/failed workflow output -> salvageable forensic evidence;
- one-shot primary evidence -> dated closeout report.

A role transition is not information loss by itself. It becomes risky when consumers can no longer tell which distinctions were dropped, or when the old role's primary evidence disappears.


## 4. Loss classes

Use the following classes so unlike problems are not conflated.

### R1 — actual durability loss

Evidence exists now but is expected to disappear or become inaccessible under normal retention/cleanup behavior, with no durable equivalent sufficient for likely future questions.

Examples include exploratory negative rows existing only in expiring Actions artifacts.

### R2 — lossy durable projection

A richer source remains durable, but a standard downstream representation discards dimensions that matter for queryability or future interpretation.

This is often recoverable archaeology, not destroyed evidence.

### R3 — intentional operational compression

A stateful operational product intentionally replaces history with a summary suitable for its live purpose, such as an EMA or current scheduler estimate.

Not a defect by itself. The audit asks whether another existing durable source already preserves the history and whether consumers understand the distinction.

### R4 — transient unobserved knowledge

The solver/search/analyzer computes information that never reaches any retained observation layer.

This can be the highest-value class but also the easiest place to over-instrument.

### R5 — identity/provenance degradation

The observation survives but loses specificity required to join, compare, or attribute it correctly: stage vs config, exact action vs family, parent vs child, protocol/config identity, censoring status, etc.

### R6 — analyzer reduction loss

An analysis tool constructs useful normalized or intermediate rows, then emits only aggregate/report output. The raw source may remain available, but subsequent research must repeat the normalization or may accidentally treat the aggregate as the primary evidence.

### R7 — bounded-selection information debt

A collector correctly reports `observed / retained / truncated`, but the system has no general way to use heavy truncation or rare-event counts as nominations for richer follow-up.

This is not dishonest missingness; it is an unrealized research-routing signal.

## 5. Confirmed findings so far

### IR-001 — level-blind failure information is collected then omitted from compact failure response

**Class:** R2, possibly R1 when raw artifacts expire.

`level-blind-capability-worker.mjs` automatically collects, when failure information telemetry is enabled:

- `beamFlowCounters`;
- `pruneDiagnostics.reached`;
- `pruneDiagnostics.rejected`;
- bounded per-family progress transitions with exact `observed`, `retained`, and `truncated`.

`level-blind-capability-sweep.mjs` attaches this as `row.failureInformation`.

The shared compact failure-response projection in `solver-failure-response-lib.mjs` does not currently project `failureInformation`. Therefore the standard failure-response resource can be materially thinner than the ordinary level-blind row from which it was derived.

This is not required by level-blindness. All of the above is generated from legal current-puzzle/current-invocation information and only leaves the solver after the solve.

**Investigation still needed:** quantify current producers carrying `failureInformation`; identify whether standard published primary results durably retain it for each workflow; determine which fields are stable enough for compact promotion versus specialist-only use.

### IR-002 — winning action identity can degrade to config identity

**Class:** R5.

`buildRow()` preserves both `winningConfig` and `winningActionKey`. The action key carries stage/action identity beyond the configuration identity.

`compactFailureResponseRow()` currently sets its row-level `actionKey` from `winningConfig`, `winningConfigKey`, or `actionKey`, but does not read `winningActionKey`.

A normal sweep row can therefore lose stage/action/seed resolution when transformed into compact failure response.

**Disposition:** confirmed candidate bug; document first, fix only after this audit establishes expected identity semantics across producers.

### IR-003 — targeted level-blind sweeps expose less diagnostic telemetry than canonical stress refresh

**Class:** R2/R4.

`level-blind-capability-sweep.mjs` supports `--attempt-budget-telemetry` and `--lifecycle-telemetry`.

`solver-stress-refresh.yml` defaults lifecycle telemetry on and rejects ordinary production refreshes that disable it because residual-atlas analysis consumes `stageLifecycle`.

`solver-level-blind-targeted-sweep.yml` does not currently expose/pass those diagnostic flags. Targeted research sweeps can therefore produce thinner explanatory rows than broad canonical refreshes even though both use the same level-blind solve boundary.

**Investigation still needed:** characterize cost/size overhead; inspect whether targeted questions need lifecycle by default or only an explicit research profile; avoid blindly making all diagnostics mandatory.

### IR-004 — exploratory negative evidence is less durable than successful or decision-bearing evidence

**Class:** R1.

The repository aggressively preserves:

- referee-valid discoveries through hint/provenance harvesting, including usable evidence from failed/cancelled workflows;
- decision-bearing v3 experiment bundles via `persist-decision-bearing-experiment-evidence.mjs`.

But several exploratory/diagnostic producers rely primarily on finite Actions retention.

Concrete example: `method-probe-sweep.yml` currently uses approximately:

- raw shard artifacts: 14 days;
- workflow-specific combined artifact: 30 days;
- standardized `solver-sweep-result`: 90 days.

If no durable report/resource imports those rows, informative unsolved attempts eventually disappear while a solution discovered by the same run can be rescued into canonical hint provenance.

This produces a durability gradient biased toward successful and already-mature research outcomes.

**Investigation still needed:** inventory all solver/research workflows by raw/combined/standard/durable retention; distinguish ephemeral duplicates from genuinely unreconstructable observations.

### IR-005 — winner analysis discards its normalized per-win dataset

**Class:** R6.

`analyze-solver-winning-attempts.mjs` constructs a normalized row per successful attempt containing:

- source;
- level identity;
- winning config;
- elapsed time;
- nodes expanded;
- allocated time budget;
- attempt index;
- cumulative elapsed time;
- cumulative nodes.

Its output writes aggregate/config percentile summaries, late-bloomer summaries, and optional family summaries, but not the normalized rows themselves.

The original source reports may remain available, so this is generally recoverable. However future questions must redo normalization and the analysis artifact cannot identify which exact rows produced an aggregate tail without reopening sources.

**Investigation still needed:** decide whether row-preserving normalized outputs should be a general analyzer convention or only used when source retention is weak.

### IR-006 — high-budget runtime telemetry overwrites longitudinal history by design

**Class:** R3.

`update-highbudget-telemetry.mjs` intentionally maintains an EMA of capped-level throughput for future shard planning. Per level it retains the EMA, sample count, config key, and latest sample fields. It also removes an entry after that level solves.

This is correct operational behavior. It is not a historical evidence resource.

Potential research history such as throughput variance/regime shifts across revisions must be reconstructed from source sweeps rather than from this telemetry file.

**Investigation still needed:** verify that contributing source sweeps are durably reconstructable for the period where such longitudinal questions matter; document the telemetry asset explicitly as operational state rather than historical evidence if not already clear in the asset registry.

### IR-007 — hint-cost drift preserves anomalies more richly than stability evidence

**Class:** R6/R2.

`hint-cost-drift.mjs` computes every comparable cross-commit hint-provenance group. Its optional JSON output retains detailed drifted groups, while stable groups principally survive as aggregate counts.

This is reasonable for anomaly detection because canonical hint provenance remains the underlying source. It nevertheless demonstrates a recurring reducer pattern: positive/interesting cases preserve identities while the complement becomes an aggregate.

**Investigation still needed:** no change implied unless the source resource's reconstructability or query cost makes stable row identity valuable enough to retain separately.

### IR-008 — derived lifecycle maps preserve classification but not the full lifecycle evidence

**Class:** R2/R6.

`lifecycle-failure-map.mjs` preserves useful per-level classifications, reached/starved stages, best badness, and winning stage while aggregating stage lifecycle economics.

The input `stageLifecycle` can contain richer stage-local progress information. The map intentionally does not reproduce all of it.

This is healthy if the source sweep stays durable and consumers understand the map as a projection. It becomes evidence loss if the map survives longer than its primary rows.

**Investigation still needed:** bind lifecycle maps to source artifact/durable bundle identity and check actual retention asymmetry.

### IR-009 — bounded progress/search-loss collectors expose truncation honestly but truncation is not yet a general nomination signal

**Class:** R7.

Both the level-blind failure progress collector and search-loss collector retain exact denominator information: observed count, retained count, and truncation state.

That satisfies missingness honesty. What appears absent is a standard follow-up path where unusually high event counts/truncation, rare reason composition, or extreme recurrence automatically nominate a parent/stage for richer replay.

The current state tells the researcher that information was intentionally dropped, but does not systematically exploit the magnitude/pattern of that drop.

**Investigation still needed:** inspect existing failure-response novelty/query/resource-audit tooling before proposing any nomination layer.

### IR-010 — combiner archaeology shows information-loss bugs are a recurring historical class

**Class:** audit heuristic.

`combine-solver-sweep-reports.mjs` now contains explicit protections for execution configuration, effective configuration, commit provenance, corpus identity, population identity, and node/work budget context.

Comments document that combined reports previously dropped some budget context, making downstream attempt costs uninterpretable.

This is evidence that adapter/combiner boundaries deserve systematic sibling inspection rather than assuming current problems are isolated.


## 5A. Preliminary workflow durability matrix

This matrix is intentionally about **research reconstruction**, not merely whether a workflow uploads an artifact. A durable hint can preserve a success while still losing the failed-attempt/process evidence from the same run.

| Producer/workflow | Raw/shard retention | Combined/standard retention | Canonical/durable behavior | Preliminary retention disposition |
|---|---:|---:|---|---|
| `solver-stress-refresh.yml` | 90d | 90d standard + report artifact | complete canonical runs commit combined reports, capability-run summaries/maps/timeline, baselines and hints | strong durability; inspect whether rich row fields survive canonical projection |
| `technique-census.yml` | 14d shards | 30d intermediate, 90d combined/standard | combined run directory and discovered hints are committed | strong combined-row durability; raw shard/log detail still ephemeral |
| `collect-variant-family-dataset.yml` | 90d | 90d | family data, attempt reports, logs/source provenance committed to research branch | strong durability; inspect per-task transient fields |
| `solver-diagnostics.yml` | 30d full diagnostic artifact | 90d standard | audit history, hints, drift report committed | generally durable; distinguish console-only diagnostics |
| `solver-highbudget-unsolved-sweep.yml` | 90d | 90d | full-cohort rounds commit combined reports/telemetry/hints; gap fills deliberately defer aggregate persistence pending reconciliation | conditional but explicit; gap-fill research depends on reconciliation before artifact expiry |
| `solver-broad-confirmation.yml` | 90d | 90d | artifact-only workflow, but standard decision-bearing experiment evidence is eligible for the shared harvester/durable bundle path | likely durable when valid decision-bearing v3 publication succeeds; verify non-decision-bearing/failure paths |
| `solver-residual-confirmation.yml` | 90d | 90d | same decision-bearing durable-evidence rail as broad confirmation | likely durable for completed decision-bearing result; verify phase-1 explanatory evidence |
| `static-portfolio-confirmation.yml` | 90d | 90d | artifact-only, included in durable decision-bearing harvest family | likely durable when publication qualifies |
| `solver-routing-regime-sample-ab.yml` | 90d | 90d | artifact-only; standard compact failure response published; not obviously a canonical report writer | durability beyond Actions depends on decision-bearing retention/other report consumers; verify |
| `solver-level-blind-targeted-sweep.yml` | 90d | 90d | artifact-only; compact failure-response persistence is opt-in; valid solves may be harvested | **R1 candidate:** ordinary exploratory negative/process evidence can expire unless separately persisted or decision-bearing |
| `method-probe-sweep.yml` | 14d | 30d combined, 90d standard | no canonical result commit in workflow | **R1 confirmed class:** non-solution probe evidence is Actions-retention-bound unless another resource/report imports it |
| `search-loss-real-canary.yml` | 30d | 30d | canary/capture/preflight artifact only | **R1 candidate:** rich instrumentation evidence expires unless intentionally promoted/persisted elsewhere |
| `cpsat-explicit-prefix-reference.yml` | 30d shard/result; 90d analysis/standard | 90d standard | artifact-only in inspected workflow | **R1 candidate:** exact/reference rows may outlive reports only if separately imported; verify consumers before calling actual loss |
| `cpsat-hint-harvest-sweep.yml` | 30d | 30d combined, 90d standard | discovered hints committed/harvested | success evidence durable; unsuccessful/reference-process detail mostly ephemeral |
| `solver-combine-sweep-runs.yml` | n/a input reconciliation | 90d | combined standard result; durable only when downstream decision-bearing harvester or later report captures it | utility itself should not be assumed archival |
| `solver-production-replay-baseline.yml` | to complete | to complete | history-aware benchmark family included in hint/evidence harvesting | pending detailed inspection |


### Deterministic-refresh correction to the workflow matrix

The earlier matrix entry describing `solver-stress-refresh.yml` as having "strong durability" needs a mode distinction:

- **normal refresh:** full combined reports are committed and later recoverable through Git history;
- **deterministic refresh:** durable capability-run projections are committed, but full primary rows remain artifact-bound.

This is a useful warning against assigning durability at workflow granularity when dispatch mode changes the persistence contract.


### Durability observations

1. **The repo does not have a blanket evidence-retention problem.** Canonical refresh, technique census, diagnostics, family collection, and full high-budget runs already preserve substantial combined evidence.
2. **The sharp edge is exploratory/specialist work.** Method probe, targeted sweeps, search-loss canaries, and some exact/reference tools can create unique negative/process observations without a durable primary-row destination.
3. **Success rescue and process rescue are different.** A harvester can reconstruct a valid solved path from an ephemeral run while the unsuccessful attempts preceding it, or comparable failed parents from the same run, still disappear.
4. **Decision-bearing durability is intentionally strong but selective.** That protects conclusions after promotion/closeout; it does not automatically preserve the exploratory observations that nominate the next hypothesis.
5. **Artifact-only is not itself a defect.** It becomes R1 only when the observation is plausibly reusable, not represented in another durable resource, and expected to matter after the retention horizon.

### Immediate verification targets from the matrix

- verify exactly which artifact-only workflows produce `decisionBearing=true` manifests and therefore reach durable experiment retention;
- inspect failed/cancelled publication paths: whether a red run's negative/process rows can become durable or only its successful hints are rescued;
- identify specialist exact/reference outputs already imported into canonical resource assets before labeling them R1;
- verify whether routing-regime A/B evidence is durably consumed by dated reports/resources or only Actions;
- compare phase-1 versus phase-2 retention in residual confirmation;
- inspect one-shot/deleted-workflow policy for whether deleting the wrapper can strand artifact-only primary evidence after Actions expiry.




### IR-011 — rich search-loss evidence requires explicit publication wiring

**Class:** R1/R2 producer-publication seam.

`publish-solver-sweep-result.mjs` is capable of carrying a rich search-loss capture and marking `failureEvidence.richCapturePresent=true`, but only when the producer explicitly supplies that capture through `--include=<path>`.

The publisher does not discover rich captures from the primary result, neighboring files, or a generic producer contract. It merely inspects already-requested include entries for `kind === pathfinder-search-loss-capture`.

Therefore a solver/research producer can successfully generate a rich capture and still publish a standard artifact that omits it if the workflow forgets or intentionally declines the include.

Current workflow inspection found the dedicated `search-loss-real-canary.yml` as the maintained Actions producer of rich search-loss captures; it uploads the canary/capture/preflight bundle directly and does not currently publish a standard solver sweep result.

**Interpretation:** the infrastructure already has a forward-compatible publication slot, but rich capture remains specialist/opt-in and has no recurring ordinary producer yet. This is consistent with the search-loss plan's current contract-only status; it should not be "fixed" by automatic discovery before the recurring producer question is settled.

### IR-012 — method probe can generate high-value operational evidence whose durable horizon is only the combined artifact

**Class:** R1/R2/R7, depending invocation.

`method-probe.mjs` supports optional research instrumentation richer than its ordinary outcome rows:

- bounded beam operational trace signatures via `--beam-trace-limit`;
- bounded decision observations via `--beam-decision-limit`;
- ordering-policy comparison data, including first top-choice divergence and score decomposition;
- exact observed/retained/truncated counts for bounded ordering and beam collectors.

These fields are serialized into the per-level row and survive `combine-method-probe-shards.mjs`, because the combiner concatenates the full worker rows into `combined.json`.

However `method-probe-sweep.yml` is artifact-only: raw shards currently retain for 14 days, the workflow-specific combined artifact for 30 days, and the standardized primary result for 90 days. The compact failure-response projection does not preserve these specialist operational fields.

Thus a method-probe run used for a mechanism investigation can contain uniquely valuable trace/divergence evidence that disappears after artifact retention unless a dated report/resource explicitly retains it.

**Interpretation:** this does not justify making every method probe durable. It does justify treating a method probe that enables rich research observers as scientifically different from a cheap capability probe and checking its intended evidence horizon during preflight/closeout.

### IR-013 — resource catalogue semantics do not currently expose evidence survival horizon

**Class:** documentation/discoverability gap supporting R1 classification.

`solver-research-data-assets.json` correctly distinguishes resource semantics such as:

- `operational-traces` as a generated interface;
- `compact-failure-response` as a generated interface;
- `search-loss-evidence` as contract-only;
- tracked/current assets such as the technique census.

The catalogue describes grain, locations, authorities, joins, evidence roles, affordances, and caveats. For generated interfaces, though, the location often describes where outputs *may be produced*, not whether any particular observation is durably retained.

Examples:

- `operational-traces`: "method-probe, paired deterministic trace, and beam-trace outputs selected by investigations";
- `search-loss-evidence`: `reports/stress/search-loss-evidence/**/*.json`, despite the resource still being contract-only;
- `compact-failure-response`: a broad generated `**/failure-response*.json` pattern.

The Resource Contract's **audited-resource** tier already requires reconstructability and irreversible-information-loss semantics. Catalogue-grade generated interfaces do not expose an equivalent survival-horizon field.

**Research consequence:** a fresh agent can discover that an evidence type exists and how it may be interpreted, yet still not know whether the relevant bytes are tracked, decision-bundle-retained, Actions-retention-bound, reproducible on demand, or already expired.

**Investigation gate:** before proposing registry-schema changes, determine whether this is better handled by:
- existing audited-resource declarations;
- a documentation convention for generated interfaces;
- workflow/source provenance records;
- or a small catalogue field such as durability/reconstructability class.




### IR-014 — analyzer reduction loss is localized, not systemic

**Class:** investigation correction / R6 scope narrowing.

A sample of maintained analyzers shows materially better row preservation than the initial concern implied:

- `analyze-work-ladder-response.mjs` emits a `perLevel` result across budgets;
- `analyze-technique-niches.mjs` emits its derived per-level `levels` table alongside action/routing aggregates;
- `analyze-technique-census-temporal-stability.mjs` preserves changed-level identities and per-action gained/lost IDs, not only summary counts.

By contrast, `analyze-solver-winning-attempts.mjs` constructs a useful normalized per-win table internally and emits only aggregates/config summaries.

**Interpretation:** do not create a blanket rule that every analyzer must serialize all internal rows. The better audit question is whether an analyzer's aggregate output retains enough identity to explain tails/anomalies **or** binds to a durable source from which the normalized rows are cheaply and deterministically recoverable.

### IR-015 — technique census already embodies a good compact-vs-full retention pattern

**Class:** positive design precedent / bounded R2.

`technique-census-cell.mjs` intentionally distinguishes:

- `compactAttempts`: always retained using the shared compact failure-attempt projection;
- full `attempts`: retained for successful cells, or for unsuccessful cells only when `collectAttemptTelemetry === true`;
- `solution`: retained only for successful/referee-valid cells.

This avoids paying full-attempt payload cost for the entire unsuccessful matrix while preserving cheap response semantics for every cell.

**Audit implication:** this is closer to the desired model than “retain everything.” The remaining question is whether the compact projection preserves enough action identity, progress/reason composition, and censoring detail for recurring reconnaissance. Any implementation proposal should prefer improving the compact projection over broadly enabling full unsuccessful-cell attempts.



### IR-016 — automatic-harvest is a transport label, not an evidence-coverage guarantee

**Class:** R1/R2 documentation semantics.

`docs/solver-failure-evidence-disposition.json` assigns workflow-level durability modes such as `automatic-harvest`, `artifact-only`, and `alternate-rail`.

For standard solver workflows, `automatic-harvest` means `harvest-solver-evidence.yml` is triggered after completion. The harvester itself persists only selected evidence classes:

- structurally merged hint/provenance files;
- reconstructed hints from solved level-blind rows;
- isolated valid solutions;
- pending/quarantined solve evidence;
- **decision-bearing v3 experiment bundles**.

It does **not** generally persist every compact failure-response document, full primary sweep row set, console log, compact diagnostic profile, or rich process field merely because the workflow is on the trigger list.

Therefore `durability.mode: automatic-harvest` can be read too strongly if treated as "this workflow's research evidence is durable."

**Implication:** future retention documentation should distinguish **harvester participation** from **evidence-layer retention coverage**. No schema change is proposed yet; this is an investigation requirement.

### IR-017 — failed/cancelled-run salvage is strongly success-asymmetric

**Class:** R1, intentional for some layers.

The evidence harvester deliberately runs after failed/cancelled solver workflows because shard reports are written incrementally and may contain valid discoveries.

That salvage path is excellent for positive evidence:

- valid hint files are merged;
- solved level-blind rows can be converted into canonical hint provenance;
- isolated valid solutions can be recovered;
- incompatible/stale solution evidence can be quarantined rather than discarded.

But a failed/cancelled run normally cannot qualify as a complete decision-bearing experiment bundle, and the harvester has no generic durable import for its **partial negative/process rows**.

Consequently a cancelled 60-shard run may permanently preserve the one novel solution it found while eventually losing hundreds of completed unsolved rows, exact failed attempts, badness/work observations, and process diagnostics when Actions artifacts expire.

This asymmetry is scientifically reasonable for capability claims — partial negatives must not masquerade as a clean null — but those rows can still be legitimate **forensic/mechanism-nomination evidence** if their censoring and population incompleteness remain explicit.

**Investigation gate:** determine whether recurring consumers actually need salvageable partial-negative rows before proposing any durable partial-run rail.

### IR-018 — exact/reference evidence occupies a retention role not served by either hint or decision-bearing rails

**Class:** R1/R3 semantic-role gap, currently intentional.

`cpsat-explicit-prefix-reference.yml`:

- writes explicit per-case exact/reference outputs;
- verifies exact case-population integrity;
- declares a native v3 experiment contract;
- publishes a standard `solver-sweep-result`;
- retains shard/combined artifacts for 30 days and the standard artifact for 90 days.

It does **not** declare a `completed-positive` or `completed-negative` research outcome. Under `decisionBearingExperimentResultIssues()`, that correctly means it is not a decision-bearing experiment bundle.

It is also intentionally outside the compact attempt-response contract: `solver-failure-evidence-disposition.json` marks it `unsupported` and `artifact-only`, because CP-SAT reference cases are downstream exact annotations rather than comparable Pathfinder node/work attempts.

The resource registry separately recognizes `exact-reference-labels` as a generated interface with important `exact-control`, `correctness`, and `mechanism` roles.

This leaves a real category between the existing durability rails:

> scientifically meaningful exact/reference observations that are neither hint discoveries nor binary experiment verdicts.

Some labelled branch sets are explicitly committed by individual investigations, but the generic explicit-prefix workflow itself has no durable retention contract beyond Actions.

**Interpretation:** this is not evidence that the experiment archive should accept non-verdict objects. The likely question is whether recurring exact/reference labels deserve their own minimal resource-instance durability convention.

### IR-019 — previously adjudicated non-retention must not be reopened as an accidental-loss bug

**Class:** audit correction.

The initial finding that `row.failureInformation` is omitted from standard compact failure response remains factually correct, but the 2026-09-19 failure-evidence program already adjudicated the broader question.

The Phase-1 closeout measured the prune/beam-flow/progress diagnostic bundle at approximately:

- exact solve/status/solution/node/work parity;
- ~0.46% hosted wall overhead on the representative canary;
- ~35.7 KB compact payload across 16 parents;
- coverage across beam, DFS, and repair progress families.

It then explicitly chose:

`research-only opt-in / canonical semantics / parity-calibrated`

rather than durable default promotion, because maintained producers have different scientific roles and no recurring consumer had demonstrated incremental decision value beyond automatic compact attempts.

Similarly, the recurring-rich-producer audit closed negative: rich capture cost was materially higher and no genuine repeated consumer justified turning it on routinely.

**Revised disposition for IR-001:** omission of `failureInformation` from the broad compact default is **intentional compression under a current authority**, not a newly discovered defect. The still-open questions are narrower:
- whether a scoped producer now has a recurring consumer;
- whether enabled diagnostics are retained for the intended evidence horizon;
- whether the compact automatic layer loses unrelated identity fields such as `winningActionKey`.

This audit must treat an existing explicit negative disposition as evidence, not as an implementation backlog item.

### IR-020 — one-shot workflow cleanup can preserve the conclusion while leaving primary-row reconstructability on an artifact clock

**Class:** R1/R6, historically variable.

The workflow README's one-shot convention is sensible operationally: delete bespoke dispatch YAML after the question is answered, keep reusable local scripts, and point to the dated closeout.

However several historical closeouts use "answer recorded" as the retirement criterion rather than the newer Resource Contract's stricter **reconstructability** criterion.

Concrete example: `2026-08-27-repair-restart-continuation-w150m-pre-wiring-pilot-null.md` durably records:

- the prespecified 36-level population definition;
- aggregate 9/36 vs 9/36 result;
- zero gains/losses;
- several representative rows;
- the source run ID and method.

But it explicitly says:

> Full 36-row detail is in the run's `repair-restart-continuation-pilot-combined` artifact.

The one-shot workflow was then deleted. Unless those primary rows are retained elsewhere, exact 36-row reconstruction becomes Actions-retention-bound even though the scientific conclusion remains durably documented.

This does not invalidate the historical conclusion. It narrows later auditability: exact row-level re-analysis, alternative summaries, or forensic checks may become impossible after artifact expiry.

The modern Resource Contract already supplies the right prospective rule: preserve the smallest decision-bearing bundle needed for future reconstruction. The one-shot documentation convention has not yet visibly absorbed that newer distinction.



## 5B. Transient solver-knowledge inventory

This pass asks the negative-space question from the original audit:

> What does search know or compute during a failed attempt that disappears completely when the attempt returns?

The answer is narrower than expected because much of the solver already has research-only observer seams.

| Internal information | Current exposure | Survival today | Preliminary disposition |
|---|---|---|---|
| beam generation/prune/merge/cull/retain flow | `_beamFlowCounters` + beam research observer | opt-in diagnostics/captures only | already adjudicated; do not default-promote without recurring consumer |
| typed hard-prune reach/reject counts | `_pruneDiagnostics` | opt-in diagnostics only | already adjudicated compact-diagnostic layer |
| DFS/beam/repair progress/badness transitions | `_failureProgressObserver` | bounded opt-in diagnostic records | already adjudicated; retain observed/retained/truncated when enabled |
| beam candidate/state decisions and parent expansion work | `_beamResearchObserver`, optional parent-expansion work | specialist method-probe/search-loss outputs | rich/specialist; existing selector/cost rules apply |
| repair elite arrivals | `_repairEliteResearchObserver` | specialist investigations only | existing rich observer, not a default-retention candidate |
| repair choice candidate set / chosen move / random draws | `_repairChoiceResearchObserver` | specialist investigations only | existing rich observer; potentially useful for divergence studies |
| connectivity rejection subtype/state/boundary sketch | `_connectivityRejectionObserver` | specialist investigations only | explicitly staged Stage-A/Stage-B observer; preserve current scoped economics |
| parity-capacity / phase-distance shadow facts | dedicated research observers | question-specific pilots | already purpose-built, no general retention case established |
| joint-obligation propagation verdicts | `_jointObligationObserver` | question-specific pilot evidence | already purpose-built |
| beam resumable frontier / live continuation | explicit `BeamContinuation` capture | opt-in research only | rich mutable execution state; intentionally unsuitable for generic persistence |
| DFS exhausted-subtree size/depth distribution and instant rejects | `PF_DFS_DEBUG` env-gated console aggregation | ephemeral console output | **R4 candidate**, but debug collection changes allocation/workload shape and is forensic rather than cheap default telemetry |
| must-pass/must-cross lower-bound memo reuse | solve-local caches exist, no hit/miss counters | values disappear with `PrepLevel` | **R4 candidate for performance/reuse research**, better owned by batch-digestion architecture audit unless a solver-capability question emerges |
| repair nogood-cache recurrence | exact signatures stored solve-locally; API exposes size/has/add, no hit/miss history | cache discarded at attempt end | **R4 candidate** for recurrence/redundant-work questions; overlaps search-loss/resumability and should not create a parallel instrumentation line |
| full search state/frontiers/visited arrays | live mutable execution structures | discarded | intentionally not a retention target; use selected capsules/continuations when a concrete question requires state identity |

### Transient-knowledge conclusion

The high-value gap is **not** “instrument the solver generally.”

There are three buckets:

1. **Already observed and already adjudicated:** beam flow, prune composition, bounded progress. These have measured economics and a current opt-in disposition.
2. **Already observable through specialist hooks:** beam decisions, repair choices/elites, connectivity/parity/joint-obligation records, continuations. The issue is acquisition/retention for a concrete consumer, not missing instrumentation.
3. **Still genuinely unobserved in compact form:** repeated-work/cache economics and DFS subtree/backtrack anatomy. These are plausible research leads, but they overlap existing batch-digestion/search-loss questions and need opportunity sizing before any new counters.

This sharply reduces the case for broad new solver instrumentation.



### IR-021 — badness fields are structurally preserved but semantically heterogeneous across search families

**Class:** semantic downgrade risk, not raw information loss.

The common attempt/result layer can retain `bestBadness` and `finalBadness`, and the compact failure-response/query layer preserves and aggregates them.

However the producer semantics differ:

- repair `bestBadness` is explicitly the **lowest badness reached across restarts**, a real best-ever progress measure;
- DFS/beam `finalBadness` is a **one-shot terminal snapshot** of whichever live state the search happened to occupy at timeout; comments explicitly warn it is not a tracked best-ever minimum;
- a family may omit one field entirely rather than produce an equivalent measurement.

`failure-response-query.mjs` correctly labels badness deltas descriptive-only, and action/stage identities remain available for stratification. But its default aggregate `badness.best` / `badness.final` statistics can still pool measurements with different observational meanings if a consumer does not stratify by family/action.

**Disposition:** documentation/query-semantics issue first. Do not solve by fabricating a universal progress metric. Any cross-family research use should name the measurement semantics or use the bounded progress observer where comparable best-over-time behavior is actually needed.



### IR-022 — run-linked hint discovery process is only as durable as its source solver report

**Class:** R1/R2 generated-interface dependency.

The durable Hint schema intentionally does not embed the whole attempt sequence preceding every discovered solution.

Instead, `hint-discovery-process.mjs` reconstructs that process offline from a solver report:

- locate the first successful attempt;
- retain compact projections of all preceding attempts;
- retain the compact winning attempt;
- bind the result to run/protocol/solver/population identity from an experiment contract when available;
- exact-match the solution path to stored Hint evidence.

This is a good normalization design: it avoids bloating every Hint event with dependent attempt history.

But the process evidence is **derived from the source solver report**. The generated document explicitly records `sourceReport`, and the resource registry lists `hint-discovery-process` as a generated interface rather than a durable store.

Therefore a valid solution can survive indefinitely in hint provenance while its discovery-process history becomes unreconstructable if the source report was artifact-only and expires.

The risk is producer-dependent:

- canonical refresh/census or decision-bearing experiment bundles may retain the relevant primary rows;
- artifact-only exploratory runs may not;
- a failed/cancelled run may salvage the Hint but not the report rows needed to recover preceding failures.

This is a concrete example of why **success durability does not imply process durability**.

**Disposition:** do not expand the Hint schema by default. First inventory which recurring consumers actually need longitudinal pre-win process evidence after source-artifact expiry; the failure-evidence plan already prefers sibling joins over direct Hint bloat.

### IR-023 — top-level action identity degradation propagates into longitudinal phenotype and join products

**Class:** R5 with downstream blast radius.

IR-002 identified that the compact failure-response row-level `actionKey` does not currently consider `winningActionKey`, even when the source sweep row has it.

That degraded field is consumed downstream:

- `failure-response-novelty-lib.mjs` includes row-level `actionKey` and `stageId` in the categorical failure phenotype used for longitudinal novelty/saturation analysis;
- `failure-evidence-purpose-query.mjs` exposes the row-level action/stage identity in purpose-filtered evidence;
- `hint-failure-process-join-lib.mjs` carries row-level action/stage identity into comparable failure records.

Full compact attempts may still retain their own correct `attempt.actionKey`, so the evidence is not wholly destroyed. But the canonical row-level identity used by higher-level reducers can collapse distinctions that the source row already knew.

**Research consequence:** two observations that differ in winning stage/action/seed context can appear more similar at the row phenotype layer than the source evidence warrants.

**Disposition:** remains a narrow, high-confidence projection bug candidate. Investigation should confirm intended row-level semantics across all producers before implementation, but this no longer looks like mere presentation polish.



### IR-024 — deterministic stress refresh preserves a durable per-run projection but not the full primary rows

**Class:** R1/R2/R5, mode-specific.

`solver-stress-refresh.yml` has two persistence behaviors.

For an ordinary non-deterministic refresh, the persistence step stages broad `reports/stress/` state, including the full current combined `solver-corpus1-latest.json` and `solver-corpus2-latest.json` reports. Git history therefore retains the primary rows even when those latest pointers are replaced later.

For `deterministic=true`, the workflow intentionally avoids committing those continuity/baseline report pointers. It still commits:

- `reports/stress/capability-runs/<run_id>/summary.json`;
- `per-level-corpus1.json`;
- `per-level-corpus2.json`;
- lifecycle failure maps when enabled;
- solver-health timeline updates.

The per-run projection deliberately retains only a subset of each level row:

- id/level/outcome/status;
- nodes/work/elapsed;
- deadline state;
- `winningConfig`;
- attempt count / failed strategies;
- solution.

It does **not** retain:

- full `attempts` / compact attempt sequence;
- `winningActionKey`;
- full `stageLifecycle`;
- `failureInformation` compact diagnostics;
- other newly added row-level explanatory fields unless explicitly projected.

The full combined report and standard `solver-sweep-result` remain in Actions for 90 days, but the committed per-run resource is a lossy projection.

**Research consequence:** deterministic refreshes can remain durably visible as “what solved and how much it cost” while losing “which exact stage/action sequence and failure process produced that result” after artifact expiry.

This is especially relevant because deterministic mode is explicitly described as A/B/research mode.

**Disposition:** high-priority documentation/retention candidate, but implementation should not simply commit the `latest` pointers. The safe design question is whether a bounded immutable per-run primary/attempt attachment belongs under `capability-runs/<run_id>/`, possibly compressed or projected through an existing durable evidence format.



### IR-025 — targeted-sweep acquisition can become decision-relevant without becoming a durable decision-bearing bundle

**Class:** semantic phase-transition / R1.

`solver-level-blind-targeted-sweep.yml` has strong scientific integrity plumbing:

- exact intended ID population;
- complete-coverage validation;
- optional required-stage participation gates;
- native v3 experiment contract;
- protocol identity;
- standard compact failure response;
- standard `solver-sweep-result`.

Its own comments explicitly distinguish incomplete artifact presence from evidence that may "count as decision-bearing."

However the workflow never supplies `publish-solver-sweep-result.mjs` with a declared `researchOutcome`. Since `decisionBearingExperimentResultIssues()` requires `completed-positive` or `completed-negative`, the standard manifest cannot become `decisionBearing=true`.

That is reasonable for a generic acquisition rail: the workflow cannot know which downstream research question or threshold a caller intends.

The retention problem appears **later** when an exploratory targeted run becomes material to an actual decision after inspection:

- the shared durable experiment harvester ignores its non-decision-bearing primary rows;
- `persist_failure_response=true` can commit the compact response + manifest, but is chosen at dispatch time and does not retain the full primary rows;
- a dated report can preserve the interpretation while the exact source rows remain on a 90-day artifact clock.

This is a semantic transition the current infrastructure does not automatically model:

`generic acquisition -> inspected evidence -> decision-relevant source`.

**Disposition:** do not make every targeted sweep declare a fake verdict. Investigate a narrow prospective closeout convention for runs that actually influence a durable research decision: either preserve/link the exact source bundle at closeout or explicitly record its reconstructability horizon.

### IR-026 — branch-local evidence commits are durable only if the branch history is retained/merged

**Class:** R1 lifecycle/destination risk.

The operating model correctly prefers branch/PR evidence for research. Several workflows also commit rich outputs back to the **dispatched ref**, for example:

- `solver-stress-refresh.yml` pushes its persisted capability/report state to `${github.ref_name}`;
- `technique-census.yml` commits the combined census directory and hints to `${github.ref_name}`.

This is useful because research runs can exercise feature-branch code without polluting canonical main.

But branch-local git history has a different survival contract from canonical main:

- if the generated evidence commit is included in a subsequently merged PR, it becomes canonical history;
- if the branch is deleted or abandoned without that evidence commit merging, the rich branch-local report may become practically unavailable after Actions expiry;
- the main harvester still rescues supported Hint/provenance and decision-bearing bundles, but not necessarily the complete branch-local exploratory matrix.

The workflow README already states the important principle for solved paths: execution ref and durable evidence destination are separate concerns. This audit extends that principle to non-solution research evidence.

**Disposition:** classify retention destinations as `canonical-main`, `merged-history`, `branch-bound`, `artifact-bound`, or `recomputable` rather than using "committed" as a synonym for durable.

### IR-027 — compact failure response retains per-attempt badness that the common query reducer does not expose by action/stage

**Class:** R6 queryability downgrade.

`compactFailureAttempt()` retains both `bestBadness` and `finalBadness` when an attempt produced them.

`failure-response-query.mjs` groups attempts by action and stage, but those group summaries currently aggregate only:

- attempt count;
- outcome composition;
- work;
- nodes.

Its badness summary is built from **row-level** `row.bestBadness` / `row.finalBadness`, not the retained attempt-level values.

Therefore the compact document may already contain the information needed for questions such as:

> under this exact action/stage, what progress distribution did failed attempts show at comparable dose?

but the maintained query surface does not expose it without ad-hoc parsing.

Combined with IR-021's cross-family badness semantics, blindly adding one global badness aggregate would be the wrong fix. A safe future query extension would need action/family stratification and explicit measurement semantics.

**Disposition:** investigation/query ergonomics candidate, not a storage gap.


## 6. Positive findings / boundaries already working well

The audit must record good boundaries as well as defects.

### P-001 — level-blindness is already architected as a one-way information boundary

The parent sweep retains target identity and original corpus context while the worker receives only a mechanics-only corpus and no level identity/history. After the solve returns, research metadata can be reattached without feeding it back into the invocation.

This means post-solve joins against:

- historical outcomes;
- exact/reference labels;
- family/variant relationships;
- capability memory;
- provenance;
- known solutions;
- generator metadata;

can remain legal offline research operations without weakening runtime level-blindness.

### P-002 — compact collectors generally preserve missingness/truncation explicitly

The newer failure/search-loss collectors prefer `null`/unknown to fabricated false/zero and preserve observed-vs-retained counts. The problem is mostly what gets carried forward, not silent invention.

### P-003 — decision-bearing durable evidence has strong byte/population/identity binding

`persist-decision-bearing-experiment-evidence.mjs` verifies manifest entry hashes, exact result binding where applicable, and population consistency before preserving immutable bundles. The retention audit should reuse this rail where appropriate rather than creating a competing archival system.

### P-004 — solver sweep combining is increasingly fail-closed

The current combiner refuses mismatched immutable revision/configuration and maintains intended-population integrity rather than merely concatenating files. This is a model for future retention adapters.


### P-005 — several modern analyzers retain explanatory row identity

Work-ladder response, technique-niche analysis, and technique-census temporal stability all preserve per-level or changed-ID detail in their generated JSON while also publishing aggregates. This is a useful precedent: derived reports can remain compact without making every later anomaly require source-artifact archaeology.



### P-006 — the failure-evidence program already separates cheap automatic response from richer opt-in observation

The 2026-09-19 compact diagnostic and recurring-rich producer audits are strong precedents for this audit's desired discipline: measure parity/cost, require a real consumer, and avoid universal telemetry merely because an observer exists. Information retention should reuse those gates rather than treating maximal observability as the objective.

### P-007 — failed/cancelled workflows already preserve evidence before surfacing failure

Several solver workflows write rows incrementally and upload artifacts before deliberately failing the job. This means the acquisition side is often much more recoverable than a red Actions badge suggests. The open problem is selective long-horizon persistence, not failure-time byte survival.


## 7. Investigation matrix

Every inspected boundary should eventually produce one row with:

| Field | Meaning |
|---|---|
| boundary ID | stable IR-* identifier |
| producer | script/workflow/resource |
| source grain | attempt/stage/level/cell/event/family/run |
| source information | fields/semantics available before reduction |
| downstream representation | artifact/resource/query/report |
| loss class | R1-R7 |
| intentionally discarded | what and why |
| durable source? | yes/no/conditional/unknown |
| reconstructability horizon | indefinite / branch-bound / Actions retention / overwrite / unknown |
| identity resolution | preserved / coarsened / transformed |
| selection/truncation | none / bounded / sampled / filtered |
| plausible research value | concrete future questions enabled |
| retention cost | rough bytes/runtime/complexity |
| current authority | owning doc/resource |
| disposition | benign / document / query-improve / producer-gap / implementation-candidate |
| implementation gate | evidence required before changing code |

## 8. Investigation phases

### Phase A — solver/sweep boundary

Inspect:

- production level-blind capability sweep;
- history-aware portfolio/high-budget sweep;
- method probe;
- technique census;
- static portfolio;
- confirmation/residual-confirmation producers;
- diagnostics;
- CP-SAT/reference producers;
- variant-family solve/evaluation tools.

For each, compare solver-return information with persisted row fields and shard artifacts.

### Phase B — shard/combine/publish boundary

Inspect:

- workflow-specific combiners;
- `combine-solver-sweep-reports.mjs`;
- standard `solver-sweep-result` publication;
- failure-response projection;
- experiment contract/manifests;
- artifact include lists.

Look specifically for metadata existing in shard rows that disappears in combined/standard output.

### Phase C — ephemeral-to-durable boundary

Build a workflow retention matrix:

- raw shard retention;
- combined retention;
- standardized artifact retention;
- canonical commit behavior;
- harvester behavior;
- decision-bearing preservation eligibility;
- one-shot/deleted workflow practices;
- whether failed/cancelled runs retain negative as well as positive observations.

Mark genuine R1 loss only where no durable equivalent exists.

### Phase D — analyzer/reducer boundary

Inspect maintained analyzers for:

- internal normalized row construction;
- row filters that introduce survivorship/conditioning;
- aggregates replacing identities;
- representative/example selection;
- quantile/tail calculations with no retained contributing IDs;
- loss of protocol/config/provenance joins;
- optional `--out` behavior where useful data exists only in console logs.

Do not require row output universally. Classify whether the original durable source makes recomputation cheap/reliable.

### Phase E — transient solver knowledge

Inventory cheap/stable facts currently computed but not emitted:

- reason counters;
- candidate/beam flow;
- progress trajectory;
- recurrence/duplicate counters;
- handoff/continuation disposition;
- stage terminal reason;
- exact prune/reject subtypes;
- frontier diversity summaries;
- solve-local proof/conflict/cache reuse.

This phase should lean on the existing search-loss implementation plan and failure-evidence integration plan rather than duplicating their instrumentation audit.

### Phase F — synthesis

Produce:

1. confirmed information-loss map;
2. benign/intended-compression list;
3. producer-gap list;
4. durability-risk list;
5. identity-degradation bugs;
6. analyzer-queryability opportunities;
7. smallest prospective implementation candidates.

Implementation should be separately authorized/prioritized after this investigation.

## 9. Decision rules

A lost field deserves prospective retention only when most of the following are true:

- semantics are stable and understood;
- the producer already computes it or collection is demonstrably cheap;
- a concrete recurring research question can use it;
- the information is not cheaply/reliably reconstructable from an already-durable source;
- bounded representation is possible;
- identity/provenance can be retained correctly;
- retaining it does not alter solver behavior;
- expected value exceeds storage/query/schema complexity.

Conversely, classify as benign when a lossy report is clearly derived, its primary source is durable and bound, and recomputation is straightforward.

## 10. Immediate next investigation

1. build workflow retention/durability matrix;
2. compare major solver-running row schemas against compact failure response;
3. audit standard publisher include behavior for rich secondary evidence;
4. inspect technique-census/method-probe cell schemas for fields lost at combine/publication;
5. inspect high-value analyzers for normalized rows discarded after aggregation;
6. cross-reference every confirmed issue against `solver-research-data-assets.json` and resource-contract audits;
7. inspect the search-loss/failure integration plans to avoid reopening already-owned gaps;
8. update this document with evidence and dispositions before proposing implementation.

## 11. Working hypothesis

The current repo appears stronger at preserving **scientific verdict identity** than **explanatory process structure**.

That was a rational order of operations: correctness, provenance, population integrity, and decision validity needed hardening first. As the solver program moves toward capability invention, reusable negative/process evidence becomes more valuable.

The likely target architecture is not “save everything.” It is:

> capture broadly enough to expose useful process distinctions; retain bounded, semantically stable projections; preserve truncation and missingness; enrich offline; escalate selected anomalies/questions into richer replay.

This remains a hypothesis to test against the retention matrix and producer/consumer audit.
