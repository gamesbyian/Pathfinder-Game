# Compact failure-response producer suitability audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — audit of every workflow marked `standard` in `docs/solver-failure-evidence-disposition.json`, plus the variant-family alternate rail, after contract propagation was added to the compact-response publisher paths.
> **Decision:** maintained compact-response producers now have a clear role split; contract-bearing workflows can support protocol-aware analysis, while diagnostics and variant-family remain descriptive-only for longitudinal comparison until their own experiment identity is explicitly defined.
> **Remaining gate:** none for producer discovery. Phase-1 durable diagnostic promotion still requires demonstrated incremental value/consumer scope; scientific consumers must choose a producer whose population and control semantics fit their question.
> **Evidence role:** infrastructure/methodology audit, not solver efficacy evidence.

## Why this audit matters

"Publishes compact failure response" is necessary but not sufficient for a scientific consumer.

A producer can still be unsuitable because:

- its protocol identity is unknown;
- its population is selected or residual-only;
- it runs isolated techniques rather than the shared production ladder;
- it is history-aware;
- it cannot naturally provide solved controls;
- it is a combine/reconciliation rail rather than a primary acquisition.

This audit separates those dimensions so later agents do not treat every standard producer as interchangeable.

## Protocol-identity plumbing

Two common publication paths now preserve experiment identity:

1. direct users of `summarize-solver-failure-response.mjs` can pass `--contract-file`; the compact document inherits `experiment.configurationHash` as `protocolHash` and the contract/GHA solver ref;
2. `sweep-publish.mjs` now performs the same propagation from its existing `--contract-file`.

Direct contract attachment was added to:

- `method-probe-sweep.yml`;
- `solver-broad-confirmation.yml`;
- `solver-combine-sweep-runs.yml`;
- `solver-highbudget-unsolved-sweep.yml`;
- `solver-routing-regime-sample-ab.yml`;
- `technique-census.yml`.

The shared `sweep-publish.mjs` fix automatically covers existing contract-bearing users including:

- `solver-level-blind-targeted-sweep.yml`;
- `solver-production-replay-baseline.yml`;
- `solver-residual-confirmation.yml`;
- `solver-stress-refresh.yml`;
- `static-portfolio-confirmation.yml`.

Unknown identity remains unknown. No hash is fabricated from a workflow name.

## Producer matrix

| Producer | Search semantics | Population | Natural solved controls | Protocol-comparable compact evidence | Best use |
|---|---|---|---|---|---|
| `solver-stress-refresh` | level-blind production ladder | whole canonical corpora | **yes, strong** | **yes** | preferred general shared-production exposure/control population |
| `solver-level-blind-targeted-sweep` | level-blind production ladder | explicit selected IDs | only if selected population includes them | **yes** | smallest targeted shared-production acquisition, including Class-3 if population is frozen first |
| `solver-routing-regime-sample-ab` | paired level-blind production-shaped A/B | sealed C2 stratified sample + full C1/published | **yes**, within paired population | **yes** | routing/action-policy contrasts with explicit controls |
| `solver-broad-confirmation` | paired production-shaped control/treatment | fresh sealed generated cohort | cohort may contain both solves and failures | **yes** | independent confirmation, not current-residual prevalence |
| `solver-residual-confirmation` | production-shaped two-phase paired A/B | fresh control-defined residual | **no** in phase-2 by construction | **yes** | treatment confirmation on fresh residual, not failure-specificity controls |
| `solver-highbudget-unsolved-sweep` | production ladder at high budget | frozen historically unsolved cohort | **no** by design | **yes** | high-dose capability / censoring, not prevalence or solved-control contrast |
| `solver-production-replay-baseline` | **history-aware** production replay | whole canonical corpora | **yes** | **yes**, within its own history-aware protocol | continuity/replay questions only; do not mix with level-blind evidence |
| `method-probe-sweep` | isolated single action/config | explicit selected subset or whole corpus | possible if selected | **yes** | isolated action cost/capability such as reserve-starvation; **not** shared-production Class-3 dose |
| `technique-census` | isolated techniques/cells | full solved + unsolved parity population by default | **yes, strong** for isolated semantics | **yes** | isolated capability, substitutions, cost distributions; not shared ladder exposure |
| `static-portfolio-confirmation` | explicit fixed-work technique portfolio | committed selected population | depends on population file | **yes** | fixed-work portfolio economics, not ordinary ladder prevalence |
| `solver-combine-sweep-runs` | reconciliation/meta-producer | caller-supplied compatible source runs | inherited from sources | **yes only when its source provenance reconciles** | combine already-comparable evidence, never create comparability |
| `solver-diagnostics` | published-level diagnostics + hint capture | all published levels on qualifying main pushes | usually solved-rich | **not yet: no experiment contract** | descriptive diagnostics/cost drift; do not use for protocol-comparable failure prevalence |
| `collect-variant-family-dataset` | generated structural variants + solve/hint enrichment | variant families across real parents | not a simple production solved-control population | **not yet: no experiment contract; alternate rail** | specialist family research; join by provenance rather than treating as ordinary production failure population |

## Consumer recommendations

### WS2 failure-response reconnaissance

Preferred source hierarchy:

1. **`solver-stress-refresh`** if a current ordinary refresh naturally occurs, because it supplies the strongest combination of shared-production semantics, complete population denominator and solved controls.
2. **`solver-level-blind-targeted-sweep`** if a dedicated acquisition becomes necessary. Freeze a mechanically selected current-residual population and, only if failure-specificity is required, a protocol-compatible solved-control tranche before dispatch.
3. paired A/B producers only when the active question is already a treatment contrast.

Do not use high-budget-unsolved, residual-confirmation phase 2, technique census or method-probe as a substitute for general shared-production prevalence.

### Class-3 exact-action dose

The preferred direct producer is **`solver-level-blind-targeted-sweep`** over the frozen Class-3 IDs under production-shaped shared-ladder settings.

Why:

- exact small population;
- level-blind shared-production ladder;
- compact attempts;
- externally verified expected IDs;
- protocol identity;
- no need to rerun the full corpora.

A normal `solver-stress-refresh` can answer the same exposure question opportunistically if it naturally happens first, but a full refresh should not be launched merely to fill the Class-3 table.

`method-probe-sweep` is explicitly wrong for this question because it measures isolated action dose.

### Reserve-starvation

`method-probe-sweep` is the correct producer for the frozen first recurrence screen because that question deliberately asks for the isolated default admissible-order find-cost distribution. The precommitted follow-on, if earned, must return to a matched-total-work production-shaped allocation A/B.

## Solved-control rule by producer

A workflow that has no natural solved controls may still answer exposure/dose/censoring questions. It cannot, by itself, show that an observed signature is **failure-specific**.

Use these labels in result reports:

- `controls: protocol-matched-solved`;
- `controls: within-parent-eventual-solve-only`;
- `controls: residual-only`;
- `controls: none`.

Do not silently borrow solved controls from another protocol or solver ref.

## Remaining identity exceptions

### Solver diagnostics

This workflow has a stable conceptual job, but today it does not write an experiment contract before `sweep-publish.mjs`. The shared publisher therefore preserves solver ref through GHA but correctly leaves `protocolHash` unknown.

Do not invent a hash from the workflow name. If diagnostics later becomes a longitudinal failure-response consumer, first define the actual diagnostic configuration/budget contract.

### Variant-family dataset

This is an alternate durability rail with generated variant/family semantics, recovery dispatches and research-branch state. It also does not currently publish an ordinary experiment contract through `sweep-publish.mjs`.

Keep it specialist. If a future consumer needs protocol-comparable family failure response, derive a family-run contract from the existing family manifest/run-manifest authorities rather than forcing the ordinary production contract onto it.

## Phase-1 implication

The compact diagnostic observer bundle should **not** be promoted universally across every standard producer.

The strongest prospective scoped candidates are:

- `solver-stress-refresh` for general current-boundary research, if incremental value is demonstrated;
- `solver-level-blind-targeted-sweep` for bounded residual/diagnostic acquisitions;
- `technique-census` only for isolated-technique questions where prune/flow/progress has an explicit consumer.

This is a scope nomination, not a promotion decision. Automatic compact attempt response remains the default first rung.
