# Deterministic refresh compact-retention measurement 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-21 — CI run 35569466174, current tracked C1/C2 full stress reports, corrected compact failure-response projection
> **Decision:** do not persist a full compact failure-response document for every deterministic refresh at current granularity; retain `winningActionKey` in the existing immutable per-level capability snapshots instead
> **Remaining gate:** none; reopen only if a recurring consumer needs per-attempt historical sequence/work beyond Actions retention and existing derived products.
> **Evidence role:** forensic
> **Source plan:** `docs/solver-research-information-retention-implementation-plan.md`
> **Measurement tool:** `scripts/measure-deterministic-retention-payload.mjs`

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-09-21","decision":"Do not persist full compact failure-response documents for every deterministic refresh at current granularity; add winningActionKey to the existing per-level capability snapshot instead.","remainingGate":"Reopen only when a recurring consumer demonstrates a need for historical per-attempt sequence/work beyond existing retained derived products and normal artifact retention.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"current tracked reports/stress/solver-corpus1-latest.json + solver-corpus2-latest.json","selection":"all 1,802 rows and their 56,906 attempts","inferenceScope":"payload economics and retained-field coverage for deterministic refresh evidence"},"claimRefs":[],"sourceArtifacts":["scripts/measure-deterministic-retention-payload.mjs"],"prospective":{"expectation":"Compact response would be substantially smaller than the full primary and might justify immutable per-run retention.","surprise":"Gzip is cheap, but the ordinary tracked JSON remains 32.7 MB because the compact product intentionally retains all 56,906 attempts; existing capability-run products already answer most recurring longitudinal questions.","anomaly":null}} -->

## Question

Would retaining the standard compact failure-response document beside every deterministic C1+C2 capability refresh preserve enough additional explanatory evidence at low enough storage cost to justify making it part of the immutable capability-run directory?

The pre-registered decision gate required more than “smaller than the primary.” The candidate also needed:

- materially lower retained size;
- recurring consumers that benefit from the missing fields;
- information not already recoverable from current retained per-run products;
- acceptable annual repository growth;
- stable run/protocol/population binding.

## Measurement

The measurement used the actual tracked full reports:

- `reports/stress/solver-corpus1-latest.json`;
- `reports/stress/solver-corpus2-latest.json`.

The measurement tool invokes the same `createFailureResponseDocument()` producer used by ordinary compact failure evidence, after the configuration/action identity correction from this retention program.

It measured:

- source bytes;
- gzip(source);
- pretty compact JSON;
- minified compact JSON;
- gzip(compact);
- row/attempt counts;
- retained identity/attempt coverage;
- intentionally omitted lifecycle/solution/diagnostic fields.

The successful measurement executed in CI run `35569466174`.

## Results

### Corpus 1

- rows: **102**
- attempts retained by compact response: **415**
- full JSON: **1,301,346 bytes**
- full gzip: **66,246 bytes**
- compact pretty JSON: **317,380 bytes**
- compact minified JSON: **218,176 bytes**
- compact gzip: **17,726 bytes**
- compact pretty / full: **24.4%**
- compact gzip / full gzip: **26.8%**

Winner identity coverage after the projection correction:

- rows with winning configuration: **101**
- rows with winning action: **101**
- compact rows with configuration identity: **101**
- compact rows with action identity: **101**

All 102 source rows carry `stageLifecycle`; compact response intentionally does not preserve it.

### Corpus 2

- rows: **1,700**
- attempts retained by compact response: **56,491**
- full JSON: **61,146,200 bytes**
- full gzip: **4,299,983 bytes**
- compact pretty JSON: **32,402,205 bytes**
- compact minified JSON: **22,073,127 bytes**
- compact gzip: **1,721,974 bytes**
- compact pretty / full: **53.0%**
- compact gzip / full gzip: **40.0%**

Winner identity coverage after the projection correction:

- rows with winning configuration: **1,169**
- rows with winning action: **1,169**
- compact rows with configuration identity: **1,169**
- compact rows with action identity: **1,169**

All 1,700 source rows carry `stageLifecycle`; compact response intentionally does not preserve it.

### Combined C1+C2

- rows: **1,802**
- attempts: **56,906**
- full JSON: **62,447,546 bytes**
- full gzip: **4,366,229 bytes**
- compact pretty JSON: **32,719,585 bytes**
- compact minified JSON: **22,291,303 bytes**
- compact gzip: **1,739,700 bytes**
- compact pretty / full: **52.4%**
- compact gzip / full gzip: **39.8%**

At representative frequencies, gzip-only payload volume would be approximately:

- 12 runs/year: **20.9 MB**
- 26 runs/year: **45.2 MB**
- 52 runs/year: **90.5 MB**

But ordinary tracked JSON would instead add approximately:

- 12 runs/year: **392.6 MB**
- 26 runs/year: **850.7 MB**
- 52 runs/year: **1.70 GB**

before Git packing/delta behavior.

## What the compact document adds

Relative to the existing per-level capability snapshot, compact response would preserve:

- the full failed/successful attempt list;
- attempt stage identity;
- attempt action identity;
- attempt configuration identity;
- per-attempt allocated/consumed node/work information where produced;
- per-attempt outcome/censoring/badness fields where produced;
- solved-parent failed-attempt visibility.

This is real additional information.

## What is already retained without it

The deterministic capability-run directory already preserves multiple cheaper views:

### Per-level snapshot

For every level:

- outcome/status;
- total nodes/work/time;
- deadline truncation;
- winner configuration;
- attempt count;
- failed strategies;
- solution.

This measurement program adds **`winningActionKey`** beside `winningConfig`, removing the clearest remaining winner-identity loss without retaining 56,906 attempts.

### Lifecycle failure map

When lifecycle telemetry is enabled, the immutable run directory preserves per-level:

- reached stages;
- starved stages;
- terminal classification;
- best observed progress summary;
- winning lifecycle stage for solved rows;

plus aggregate lifecycle allocation/starvation statistics.

### Equal-work production reach

The refresh pipeline already derives and persists the current production reach/work relationship needed by the equal-work pricing program while the full attempt rows are available.

### Solver health timeline

The health record preserves longitudinal compatible-run stage reach/attempt/solve/node/work aggregates and points back to exact per-level snapshots for gain/loss reconstruction.

Therefore routine historical questions about:

- solved/unsolved composition;
- cost;
- winner config/action;
- lifecycle reach/starvation;
- stage-level aggregate exposure;
- gain/loss churn;
- equal-work production reach;

do not require the entire compact attempt sequence to survive forever.

## Consumer check

The maintained failure-response tooling provides valuable consumers for compact evidence:

- identity audit;
- novelty analysis;
- purpose query;
- failure-response query;
- hint/failure-process joins.

But no recurring deterministic-refresh consumer currently requires the complete historical per-attempt sequence on every capability run.

The capability-evidence authority already states that protocol-compatible compact failure response may enrich analyses **without creating a new durable memory store**.

A future investigation can still:

- use the full standard artifact during its retention window;
- persist decision-bearing compact evidence through existing experiment-evidence rails;
- graduate a purpose-specific dataset when the run becomes a durable premise/resource;
- explicitly record an expiration boundary under the closeout reconstructability rule.

## Decision

**Do not add full compact failure-response persistence to every deterministic refresh.**

The candidate is compressible, but its ordinary tracked representation is not compact enough relative to its mostly duplicated value:

- 32.7 MB of JSON per run;
- 56,906 attempt records in the current C1+C2 population;
- lifecycle and several longitudinal summaries already persist;
- no recurring consumer currently requires all attempt sequences indefinitely.

The smallest evidence-backed improvement is instead:

> Preserve `winningActionKey` in the existing immutable per-level capability snapshot.

That fixes the newly-verified winner identity gap at negligible relative size while leaving richer attempt history on the existing artifact / explicit-graduation rails.

## Reopen condition

Reopen compact deterministic persistence only if a real recurring consumer needs a historical question that cannot be answered from:

- per-level snapshots with winner config/action;
- lifecycle maps;
- equal-work reach;
- health timeline;
- decision-bearing experiment bundles;
- purpose-specific promoted datasets.

A plausible reopen case would be repeated cross-run analysis requiring exact **failed action/config sequence + per-attempt dose/censoring** after the source Actions artifacts have expired.

If that happens, measure a purpose-built bounded attempt projection before defaulting back to the current 32.7 MB compact document.
