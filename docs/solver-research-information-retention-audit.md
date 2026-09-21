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
