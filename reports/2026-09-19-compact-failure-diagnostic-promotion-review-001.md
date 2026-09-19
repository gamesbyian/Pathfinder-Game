# Compact failure-diagnostic promotion review

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — representative real-search canary run `35423841173`.
> **Decision:** compact prune/beam-flow/progress observers clear the representative parity/overhead/byte-volume gate; universal durable promotion is not yet earned.
> **Remaining gate:** demonstrate incremental scientific value and a justified recurring producer scope before durable default enablement.
> **Question:** Does the completed representative real-search canary clear the parity/overhead/byte-volume gate for the compact observer bundle, and if so does that justify universal durable enablement?
> **Evidence role:** infrastructure calibration; no solver efficacy claim.

## Evidence

GHA run `35423841173` executed the same 16-parent deterministic sample under observer-off, compact, and rich modes.

Compact mode enabled:

- canonical `PruneDiagnostics`;
- counter-only `beamFlowCounters`;
- bounded `failureProgressObserver`.

The run reported:

- exact semantic parity for solve/status/solution/node/work;
- compact elapsed time 165,357 ms vs 164,605 ms observer-off, about **0.46%** aggregate wall overhead;
- compact payload **35,710 bytes**;
- bounded progress observations from all three intended families: beam, DFS, repair.

Rich mode also preserved semantic parity but measured about 10.32% overhead and 246,208 bytes, reinforcing that rich selected capture should remain a deliberately invoked microscope.

## Decision

The seam audit's representative **parity / overhead / byte-volume** gate is cleared for the compact observer bundle on this representative harness. Do not rerun an equivalent canary merely to reproduce that fact.

This does **not** yet justify universal durable enablement across every solver-running workflow. The remaining promotion questions are:

1. **incremental value:** does prune/flow/progress materially discriminate real research choices beyond the already-automatic compact attempt response?
2. **producer scope:** which recurring workflows have a real consumer for those fields?
3. **family-specific calibration:** if a materially different search/producer family is proposed for durable enablement, does the existing canary actually represent its overhead/shape well enough?

Until those are answered, keep the observer bundle research-only except where a consuming experiment explicitly enables it. Prefer a scoped future promotion (for example diagnostics/census/residual research producers) over universal enablement if that captures the value.

## Consequences

- Phase 1 of `docs/solver-failure-evidence-research-integration-plan.md` no longer owes a generic representative-overhead rerun.
- Phase 2 can proceed immediately over the automatic compact response layer; it need not wait for diagnostic-field promotion.
- WS2 reconnaissance should run Stage A from already-published automatic compact response before deciding whether Stage B compact diagnostics add enough information.
- Rich capture remains selective and condition-gated; its working empirical cost is materially higher.

## Non-claims

This review does not show that any failure phenotype is causal, recurrent, or predictive. It does not promote a solver treatment, change production policy, or satisfy search-loss Resource Contract recurrence.
