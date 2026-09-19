# WS2 failure-response reconnaissance analysis preflight 001

> **Status:** active
> **Last evidence:** 2026-09-19 — compact failure-response query/protocol surface merged; readiness audit found no suitable accumulated post-instrumentation population yet.
> **Decision:** freeze the Stage-A/Stage-B analysis and routing rules now so the first eligible compact-response population is interpreted mechanically rather than mined post hoc.
> **Remaining gate:** one maintained producer emits an eligible protocol-compatible population under `WS2-FAILURE-RESPONSE-RECONNAISSANCE`; then execute this analysis before commissioning first-loss, rejection-counterfactual, or 2x2 compute.
> **Research question:** `WS2-FAILURE-RESPONSE-RECONNAISSANCE`.
> **Evidence role:** precommitment / discriminator selection, not solver efficacy evidence.

## Purpose

The current WS2 queue has already rejected broad 4x escalation economics. The next choice is among:

1. operational divergence / first-loss;
2. rejection counterfactuals;
3. a producer-consumer 2x2 interaction;
4. no expensive follow-up yet.

Failure response is the cheap discriminator between those choices. This preflight fixes what will be measured and how it can route the queue before outcomes are available.

## Eligible input

Use standard `pathfinder-compact-failure-response` documents only.

A primary comparison tranche must have:

- explicit population identity or externally verified population integrity;
- stable parent identity;
- known `protocolHash`;
- known `solverRef`;
- no mixing of different protocol hashes or solver refs inside one primary comparison;
- complete accounting of missing, malformed, deadline-truncated and harness-error parents.

Multiple documents may be joined only when the protocol and solver identities agree and their populations are not silently duplicated.

Pre-contract native attempt arrays remain valid forensic evidence for their original questions but are not eligible prevalence input here.

## Independent unit

The independent unit is **parent**, not row and not attempt.

Repeated attempts/stages from one parent are dependent observations used to describe that parent's exposure. Raw attempt counts must never become the prevalence denominator.

## Solved controls

Prefer solved controls emitted naturally by the same maintained producer and protocol.

If the eligible producer covers only a residual/failure population:

- Stage A may still answer participation, dose and censoring questions;
- adverse-signature prevalence must be labelled residual-only;
- no signature may be called failure-specific;
- a rejection/first-loss/2x2 nomination that depends on failure-specificity must obtain protocol-compatible solved controls before treatment selection.

Failed attempts inside eventually solved parents are deliberately retained and are the cheapest within-run control when present.

## Stage A: automatic compact response

Run `npm run research:query-failure-response -- --in=...` on the complete eligible documents and preserve the machine-readable output.

Report, at parent level unless explicitly marked attempt-level:

1. population coverage and missingness;
2. solved / non-solved parent counts;
3. parent terminal composition:
   - exhausted negative;
   - node-limited;
   - work-limited;
   - deadline-truncated;
   - harness/malformed/missing/unknown;
4. action/stage participation and reach;
5. exact-attempt work/node dose by action and stage:
   - count;
   - median;
   - min/max;
   - total only as support, never as prevalence;
6. solved parents containing failed attempts;
7. badness support only where actually reported;
8. protocol partitions and any unknown/mixed identity.

Never infer an unreported zero. Configured-but-unreached is not exposed-and-failed.

## Stage-A routing

Use the smallest supported conclusion.

### A1. Allocation/exposure concentration

Nominate an allocation or producer-consumer question only when the same exact action/stage identity shows a repeated, protocol-compatible exposure distinction such as:

- configured but not reached;
- reached but zero/near-zero reported dose;
- recurrent work/node censoring before meaningful dose;
- a producer action participates but the candidate downstream consumer repeatedly does not.

If solved controls show the same pattern at similar frequency/dose, the pattern does not earn an adverse-mechanism claim.

A producer-consumer 2x2 is preferred over a generic first-loss study when Stage A already identifies a concrete upstream/downstream pair whose exposure can be independently toggled without historical lookup.

### A2. No Stage-A discriminator

If participation/dose/censoring are broadly comparable across failed and solved controls, or the automatic compact fields simply do not localize the difference, do **not** jump directly to a treatment.

Advance to Stage B compact diagnostics on a mechanically frozen bounded population.

### A3. Weak or heterogeneous signal

If apparent concentrations are supported by only a few parents, depend on mixed protocols, reverse across obvious strata, or are common in solved controls, record "no expensive follow-up earned" unless another live authority independently supplies the premise.

The purpose of reconnaissance is allowed to be a null routing result.

## Stage B: compact diagnostics, only if Stage A is unresolved

Use the already-calibrated research-only bundle:

- canonical `PruneDiagnostics`;
- counter-only beam flow;
- bounded failure progress.

Freeze the population and protocol before inspecting diagnostic outcomes. Preserve semantic parity.

Do not enable rich capsules yet.

## Stage-B routing

### B1. Rejection counterfactual

A rejection-counterfactual treatment is eligible for design when:

- a canonical typed rejection/reached relation is repeatedly concentrated in failed parents;
- the same relation is materially less common in solved controls under the same protocol;
- the reason has an existing semantic owner and a legal treatment seam;
- the proposed intervention can be bounded to that reason rather than disabling broad pruning.

Do not invent a new reason taxonomy from aggregate correlations.

### B2. Operational divergence / first-loss

First-loss becomes the preferred next instrument when:

- Stage A confirms comparable participation/dose rather than starvation;
- Stage B does not isolate one typed rejection mechanism;
- progress/flow indicates materially different search evolution or survivor loss that aggregate counters cannot localize;
- the question therefore genuinely depends on event/state identity.

If selected, use the existing search-loss Phase-9 procedure. Do not create a competing first-loss protocol here.

### B3. Producer-consumer 2x2

A 2x2 becomes preferred when compact evidence identifies:

- an upstream producer/fact/action that occurs;
- a downstream consumer/action whose participation or response plausibly depends on that producer;
- enough independent parents to measure both main effects and interaction without selecting cells from treatment outcomes.

The future experiment must predeclare all four arms and use matched total work.

### B4. No treatment

If compact diagnostics remain diffuse, mirror solved controls, or merely restate "hard levels are hard," stop. Do not spend rich/exact/counterfactual compute to force a mechanism.

## Screening discipline

This reconnaissance is a **routing screen**, not a hypothesis test.

For every nominated contrast publish:

- affected-parent numerator and denominator in failed/residual parents;
- the same numerator and denominator in solved controls when available;
- protocol/solver identity;
- missing/censored counts;
- exact action/stage/reason identity;
- whether the contrast was prespecified by this preflight or discovered in a secondary exploratory view.

Do not choose thresholds after looking at outcomes. If a numeric cutoff is needed for a descendant experiment, freeze it in that experiment's own preflight and treat this reconnaissance as development evidence.

## Output

Write one dated result report that ends with exactly one of:

- `route: rejection-counterfactual`;
- `route: first-loss`;
- `route: producer-consumer-2x2`;
- `route: allocation-specific-follow-up`;
- `route: none`;
- `route: unresolved-needs-compact-diagnostics`.

The report may describe secondary observations, but only the selected route changes what expensive WS2 instrument is considered next.

## Non-goals

This preflight does not:

- promote compact diagnostics to universal telemetry;
- create a failure-cause taxonomy;
- treat badness movement as solve efficacy;
- make historical exact-level identity a production input;
- activate first-loss merely because search-loss infrastructure exists;
- override H3, Lane G, or any other independently owned queue item.
