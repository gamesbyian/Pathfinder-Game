# Solver workflow and research-evidence remediation plan

> **Status:** active remediation plan.
> **Created:** 2026-09-11.
> **Condensed:** 2026-09-11 to keep the live authority within the repository's agent-context budget. The pre-condensation detail remains available in Git history.
> **Scope:** GitHub Actions solver/research workflows, shared sweep/reporting infrastructure, historical solver evidence, derived research conclusions, workflow lifecycle, and documentation.
> **Priority authority:** this plan owns the remediation sequence only. [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) remains the authority for ordinary solver-research priority and gates.
> **Implementation handoff:** [`solver-workflow-remediation-implementation-handoff.md`](solver-workflow-remediation-implementation-handoff.md) locks settled workflow lifecycle decisions, integrity-index semantics, reliability vocabulary, rerun dispositions, population identity rules, and the implementation-tranche boundary.
> **Method authorities:** [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-level-blindness.md`](solver-level-blindness.md).

## 1. Purpose

The solver research system has accumulated several generations of workflows and supporting scripts whose experimental contracts are not fully aligned. Similar-looking workflows can disagree about population identity, budget meaning, timeout semantics, checkout/ref behavior, historical assistance, completeness, persistence side effects, and what counts as a scientifically interpretable result.

The remediation goal is one coherent experimental substrate. Preserve raw evidence, repair its interpretation, retire obsolete plumbing, and spend new compute only where the original scientific question remains important and existing evidence cannot answer it reliably.

This plan is intentionally a compact live authority. Detailed implementation instructions belong in the implementation handoff, method authorities, tests, schemas, workflow README, dated reports, and Git history rather than being duplicated here.

## 2. Immediate trust posture

Until remediation completes:

| Surface | Interim status | Rule |
|---|---|---|
| Canonical `solver-stress-refresh.yml` results that passed exact 102/1700 coverage and anti-history checks | **Trusted** | Preserve; normalize metadata unless retrospective audit finds a contradiction |
| `solver-level-blind-targeted-sweep.yml` results that passed exact ID validation | **Trusted** | Preserve; migrate to common schema |
| `solver-broad-confirmation.yml` / `solver-residual-confirmation.yml` | **Trusted architecture** | Preserve architecture; migrate vocabulary/schema |
| `method-probe-sweep.yml`, `static-portfolio-confirmation.yml`, `technique-census.yml` | **Conditionally trusted** | Preserve observations; verify completeness/status semantics before decision-bearing reuse |
| `solver-highbudget-unsolved-sweep.yml` | **Non-decision-bearing until repaired/audited** | Verified solves remain positive evidence; aggregate population claims require exact-coverage audit |
| `solver-typical-budget-baseline.yml` | **Warm/history-aware evidence only** | Do not interpret as cold capability |
| Historical routing-regime paired comparisons | **Unverified paired evidence** | Confirm exact population identity across arms before reuse |
| Generic shard “completeness” claims | **Artifact coverage only** | Never substitute for population completeness |
| Shared-combiner hardcoded producer/engine/error/failure aggregates | **Unreliable derived metadata** | Recompute from source rows |
| Referee-valid saved solutions | **Trusted positive facts** | Preserve unless independent referee validation fails |

Do not reset the current canonical production boundary merely because historical evidence is being reclassified.

## 3. Non-negotiable evidence rules

1. **Raw evidence is immutable history.** Preserve original dated outputs; generate corrected derived records or reliability annotations instead of rewriting history.
2. **Missing is never negative.** Missing, deadline-truncated, harness-error, malformed, and unknown observations are indeterminate, not ordinary unsolved results.
3. **Verified positive solutions survive surrounding experimental defects.** A referee-valid path remains evidence that the level is solvable.
4. **Decision-bearing comparisons require compatible populations and protocols.** Same count is not same population.
5. **Actual execution SHA matters.** Evidence-producing workflows must record immutable executed code, not merely an intended or mutable ref.
6. **Artifact coverage and population integrity are different facts.** Transport completeness does not prove scientific completeness.
7. **Observed count is not the intended denominator.** Summaries must expose expected, observed, missing, truncated, errored, and solved counts where applicable.
8. **Rerun minimally.** Recover missing cells or IDs where scientifically valid; do not rerun obsolete questions for cosmetic completeness.
9. **Canonical side effects require trustworthy integrity.** Partial or indeterminate runs must not silently update baselines, telemetry, or other future research inputs.
10. **History-aware and level-blind are separate dimensions.** Runtime blindness does not erase historical priming or selection.

## 4. Common experiment contract

All maintained decision-bearing solver workflows should converge on one machine-readable result contract, currently expected to supersede the generic publisher schema as `pathfinder-solver-experiment-result` schema version 3.

The common contract must make these concepts explicit:

- **Identity/provenance:** experiment ID, workflow family, producer/entrypoint, requested ref, resolved SHA, workflow run/attempt, source runs, reconciliation run, configuration hash.
- **Population:** kind, identity basis/hash, expected/observed counts, duplicate/unexpected/missing identities.
- **Execution semantics:** level-blind, history-aware, historical inputs, reproducibility expectation, producer family, scheduler mode.
- **Limits:** cumulative node ceiling, initial work allocation, total-work ceiling, wall safety deadline, and whether wall time is decision-bearing.
- **Outcome taxonomy:** solved, valid protocol negative/exhaustion where justified, node-limited, work-limited, deadline-truncated, harness/infrastructure error, malformed, missing, unknown.
- **Coverage:** artifact coverage separately from population integrity.
- **Research outcome:** execution status, verdict, whether decision-bearing, and reason.
- **Side effects:** hints, canonical baseline, telemetry, reports, and whether each is artifact-only, harvestable, or a canonical mutation.

The common layer must never define scientific failure as `!ok`, hardcode `errors: 0`, infer completeness from shard presence, or infer a scientific verdict merely from a green workflow job.

## 5. Foundational shared-infrastructure work

Repair shared infrastructure before leaf workflow cleanup.

### Shared combiner

`scripts/combine-solver-sweep-reports.mjs` must:

- derive producer/engine metadata from inputs;
- validate compatible producers and normalized execution semantics;
- preserve source provenance;
- expose explicit normalized status counts;
- keep expected and observed counts separate;
- support population/configuration hashes;
- refuse semantically incompatible combinations;
- avoid hardcoded error/failure interpretations.

### Shared publisher

`scripts/publish-solver-sweep-result.mjs` must:

- distinguish artifact coverage from population integrity;
- use intended population as the denominator;
- expose missing/error/truncation counts;
- mark partial evidence non-decision-bearing;
- preserve actual SHA, source runs, configuration hash, and population hash;
- forbid misleading bare solve fractions based only on observed rows.

### Integrity and identity helpers

Use one shared implementation for:

- population canonicalization and hashing;
- normalized configuration hashing;
- source-run provenance;
- explicit ID, corpus, generated cohort, residual, portfolio/census cell, and stratified populations;
- compatibility assertions for paired and reconciled experiments.

## 6. Execution semantics that must converge

### Checkout/ref discipline

Ordinary evidence-producing workflows execute immutable dispatched code and record the actual SHA. Cross-ref comparisons resolve each requested ref to an immutable SHA before execution and record which arm used which SHA.

Remove implicit meanings such as “whatever `main` is when this job starts” or a mutable `${{ github.ref }}` from decision-bearing experiment semantics.

### Budget/determinism vocabulary

Normalize and separately report:

- cumulative node ceiling;
- initial work allocation;
- strict total-work ceiling;
- wall safety deadline;
- whether wall time binds the scientific result;
- reproducibility expectation;
- whether canonical-state mutation is allowed.

Do not overload a single `deterministic` flag with these meanings.

### Canary/participation vocabulary

Keep three concepts separate:

- **harness canary:** proves entrypoint/config/output shape and that work actually starts;
- **treatment canary:** proves a materially different treatment was wired correctly where needed;
- **participation gate:** proves the tested mechanism meaningfully participated across the population.

A one-level canary is not a substitute for treatment participation.

## 7. Workflow dispositions and required repairs

The implementation handoff is authoritative for settled lifecycle decisions. Current high-level dispositions:

- `solver-stress-refresh.yml`: retain as canonical cold level-blind capability refresh; preserve exact C1/C2 integrity gates and migrate to common schema.
- `solver-level-blind-targeted-sweep.yml`: retain; preserve exact-ID/recovery model and migrate to common schema.
- `solver-highbudget-unsolved-sweep.yml`: retain only after substantial repair; execute immutable SHA, freeze/hash expected cohort, classify truncation/error/missing separately, block canonical side effects on incomplete runs, and support first-class gap fill.
- `solver-typical-budget-baseline.yml`: rename/redefine as warm/history-aware production replay; remove cold/apples-to-apples language and require exact population integrity for decision-bearing diffs.
- `solver-routing-regime-sample-ab.yml`: redesign as one coordinated paired experiment with one sealed population, immutable arm SHAs, compatible population hashes, and prespecified target-stratum verdict.
- `solver-combine-sweep-runs.yml`: retain; preserve all source run IDs/SHAs, population/configuration hashes, normalized semantics, and reconciliation provenance.
- `method-probe-sweep.yml`: retain; derive population cardinality/identity from the corpus, not caller-maintained totals.
- `solver-broad-confirmation.yml`: retain as a model; preserve sealed population, identical arms, explicit provenance, and exact coverage.
- `solver-residual-confirmation.yml`: retain as a model for frozen residual/conditional confirmation.
- `static-portfolio-confirmation.yml`: retain; matched cells must remain interpretable and complete before gain/loss conclusions.
- `technique-census.yml`: retain; preserve dedicated partial-cell semantics while migrating common identity/status/publication fields.
- CP-SAT/reference workflows: audit against the same integrity contract with reference-model-specific outcomes; timeout/unsupported/missing must never masquerade as exact negative evidence.

### Workflow retirement/consolidation

Per the implementation handoff:

- retire `solver-early-repair-search-adaptive-sample-ab.yml`;
- retire `mitm-frontier-sweep.yml`;
- retire `firestore-level-fingerprint-boundary.yml` after any uniquely valuable invariant is migrated to durable test/CI coverage;
- consolidate `cpsat-hint-harvest-sweep-published.yml` into `cpsat-hint-harvest-sweep.yml`, then retire the wrapper;
- keep `collect-prune-gap-labels.yml`;
- keep `cpsat-explicit-prefix-reference.yml`.

Operational workflows such as CI/deploy/diagnostics/harvesting do not need the scientific solver-experiment schema unless they themselves produce decision-bearing solver evidence.

## 8. Workflow lifecycle ledger

`.github/workflows/README.md` should maintain a lifecycle inventory for every workflow, including classification, purpose, execution family, decision-bearing/observational role, current consumer, side effects, replacement/supersession relationship, and retirement condition where applicable.

Automated checks should ensure:

- every workflow is listed;
- retired workflow names do not remain as maintained current-authority entrypoints;
- one-shot workflows do not persist indefinitely without a live reason;
- maintained solver workflows declare their experimental class.

Do not invent unavailable historical usage counts.

## 9. Historical evidence audit

After the common contract exists, audit retained evidence in the order defined by the implementation handoff:

1. canonical stress-refresh history;
2. shared combiner/publisher outputs;
3. high-budget frozen cohorts and telemetry;
4. routing-regime paired-population identity;
5. warm replay family;
6. method-probe cardinality;
7. cross-run reconciliation provenance;
8. wrong-ref exposure for materially decision-bearing experiments;
9. current reports/docs/ledgers depending on downgraded evidence.

The rebuildable machine-readable authority is:

`reports/stress/solver-evidence-integrity-index.json`

with schema:

[`solver-evidence-integrity-index.schema.json`](solver-evidence-integrity-index.schema.json)

Use the reliability and rerun vocabularies defined in the implementation handoff. Missing provenance stays unknown rather than being fabricated.

### Historical repair rules

- Recompute misleading derived metadata from surviving raw rows.
- Preserve expired/unrecoverable gaps as unverifiable/incomplete rather than manufacturing certainty.
- Audit high-budget expected versus observed IDs, preserving every referee-valid success even when the population claim is incomplete.
- Mark scheduling telemetry derived from censored/incomplete populations biased or superseded rather than recreating obsolete history.
- Verify exact population identity for historical paired routing experiments; mismatched arms retain observational rows but lose paired causal authority.
- Relabel the historical typical-budget family as warm/history-aware replay.
- Verify method-probe dispatched totals against actual corpus cardinality.
- Preserve source-run SHAs for reconciled experiments rather than substituting the reconciliation workflow's SHA.
- Audit historically important mutable-ref workflows for intended-versus-actual SHA.
- Do not purge valid hints/paths merely because the producer experiment is downgraded.

## 10. Correct affected reports and current authorities

For a dated report whose material claim is weakened:

- preserve the original report body;
- add a prominent correction/reliability note;
- identify the affected claim and what remains usable;
- link normalized/replacement evidence;
- state rerun disposition.

Then reconcile current authorities without turning remediation into a second research queue.

### `solver-optimization-workstreams.md`

Trace evidence dependencies for current dispositions. Reopen a lane only when downgraded evidence was materially necessary and independent surviving evidence is insufficient.

### `solver-opt-in-experiment-ledger.md`

Correct evidence characterization and replacement links while preserving closed status where independent grounds still justify it.

### `solver-future-work.md`

Update only deferred/reopen conditions whose premise actually depended on downgraded evidence.

### Method authorities

Fold durable experiment-contract rules into `solver-research-operating-model.md` and `solver-evaluation-evidence.md`, including population identity, completeness semantics, provenance, limits, outcome classes, canary/participation distinction, side effects, and paired-comparison compatibility. Remove stale maintained-workflow references.

## 11. Selective rerun policy

New compute is for unresolved decision-bearing questions, not remediation ceremony.

Priority:

1. wrong-code experiments whose executed SHA materially differed from intended code;
2. mismatched paired populations whose conclusion remains active;
3. incomplete high-budget populations, gap-filling missing IDs only where valid;
4. consequential method-probe cardinality errors;
5. warm/cold misinterpretations that still require a cold answer.

Do not rerun when newer valid evidence supersedes the question, metadata alone was wrong, rows can be safely reaggregated, the result was merely mislabeled, or the historical question is closed independently.

Every non-valid historical item must eventually receive a settled rerun disposition rather than remaining indefinitely “probably needs a rerun.”

## 12. Guardrails and regression coverage

CI should mechanically prevent recurrence of the defects this remediation found. At minimum:

- every maintained solver workflow appears in the lifecycle ledger;
- every decision-bearing solver result carries the common schema and actual SHA;
- paired comparisons prove compatible population identity;
- scientific failure is not defined as `!ok`;
- error counts are not hardcoded away;
- artifact coverage cannot set scientific completeness;
- partial evidence cannot mutate canonical baseline/telemetry state;
- history-aware workflows cannot advertise themselves as cold capability;
- expensive workflows use appropriate canary/participation checks;
- corpus cardinality is derived where possible;
- composite results retain source-run provenance;
- retired workflow names are absent from current authorities;
- lifecycle inventory matches the workflow directory.

Regression tests must cover missing rows despite complete artifacts, placeholders, duplicates, unexpected IDs, malformed/error/truncated/node/work-limited outcomes, mixed/incompatible producer semantics, actual-SHA preservation, source-run provenance, paired-population mismatch, canonical population hashing, misleading denominator prevention, and canonical-side-effect blocking on incomplete runs.

## 13. Implementation sequence

Execute in dependency order:

1. **Experiment contract and shared infrastructure:** schema v3, hashing, status taxonomy, integrity representation, combiner/publisher repair, tests.
2. **Core capability workflows:** stress refresh, targeted sweep, high-budget sweep, warm replay rename, cross-run combine.
3. **Paired/specialized workflows:** routing A/B, method probe, broad/residual confirmation, static portfolio, technique census, CP-SAT/reference.
4. **Lifecycle cleanup:** retire/consolidate settled workflow debt, update workflow README, add inventory/lifecycle checks.
5. **Historical audit tooling:** generate integrity index, population hashes, normalized status/provenance, wrong-ref candidates, routing/high-budget/method-probe audits.
6. **Historical corrections and authority reconciliation:** annotate reports, regenerate safe derived summaries, classify telemetry, update ledgers/authorities, produce minimal rerun queue.
7. **Selective re-execution:** run only unresolved decision-bearing red items.
8. **Final hostile closeout:** search for stale workflow names/terminology, observed-row denominators, mutable refs, unmatched populations, partial canonical writes, undocumented side effects, invalid-evidence dependencies, ownerless workflows, and unresolved rerun items. Then archive or mark this plan complete.

## 14. Acceptance criteria

The remediation is complete only when:

- maintained evidence-producing solver workflows have a declared common experimental contract;
- actual immutable execution SHA, intended population identity, normalized limits, level-blind/history-aware semantics, explicit outcome taxonomy, population integrity, and side effects are mechanically visible;
- paired decision-bearing comparisons prove compatible populations;
- incomplete evidence cannot masquerade as a valid negative or silently mutate canonical state;
- shared reporting no longer hardcodes producer identity, zero errors, generic failure, or shard-completeness-as-scientific-completeness;
- composite evidence preserves source-run provenance;
- settled workflow retirements/consolidations are complete and every surviving workflow has a current role;
- materially decision-bearing historical evidence is classified or explicitly outside reconstructable scope;
- affected reports and current authorities are corrected without erasing history;
- every red experiment has a final disposition;
- unnecessary full-corpus reruns are avoided.

## 15. Expected final state

A future researcher or agent should be able to inspect a solver experiment and answer without reverse-engineering YAML:

- what exact code ran;
- what exact population was intended;
- whether every intended subject produced usable evidence;
- how solved, exhausted, limited, truncated, errored, malformed, missing, and unknown outcomes were classified;
- whether execution was cold, level-blind, history-aware, or primed;
- what actually limited search;
- whether the result is decision-bearing or observational;
- what side effects the run could perform;
- which source runs produced composite evidence;
- whether the result is current, historical, superseded, incomplete, observational, or invalid;
- what current research decision, if any, depends on it.

The goal is not to purify history. It is to make trustworthy evidence machine-recognizable, questionable evidence hard to accidentally promote back into truth, and future solver research considerably harder to fool.
