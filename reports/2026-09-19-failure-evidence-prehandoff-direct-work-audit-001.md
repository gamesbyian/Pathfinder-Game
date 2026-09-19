# Failure-evidence integration pre-handoff direct-work audit 001

> **Status:** direct pre-handoff work exhausted
> **Date:** 2026-09-19
> **Scope:** `docs/solver-failure-evidence-research-integration-plan.md` on PR #1912
> **Decision:** all presently useful implementation, authority wiring, reducers, and precommitments that do not require new solver evidence or a selected downstream scientific lane are now in the branch.
> **Evidence role:** implementation/closeout audit; no solver-efficacy claim.

## Audit question

What work from the failure-evidence integration plan can still be completed before either:

1. a new protocol-compatible solver population exists;
2. the frozen reserve-starvation GHA probe is executed; or
3. current workstream authority selects a condition-gated rich/first-loss consumer?

The answer after this pass is: **no material plan phase remains blocked only on ordinary implementation work.**

## Phase-by-phase disposition

| Phase | Current disposition | Remaining dependency |
|---|---|---|
| 0 | complete | none |
| 1 | complete | none; compact diagnostics remain research-only opt-in |
| 2 | complete | none; common compact query/reducer is supported |
| 3 | precommitted / tool-ready / data-blocked | first eligible post-contract compact-response population |
| 4A | precommitted / reducer-ready / data-blocked | regenerate/freeze current Class-3 membership, then acquire shared-production exact-action telemetry |
| 4B | precommitted / dispatch-ready | one-row R00044 execution-family canary, then frozen 40-parent probe |
| 4C | independently owned | H3 execution under its existing authority, if/when run |
| 4D | independently owned | Lane G execution under its existing authority, if/when run |
| 4E | complete | none |
| 5 | audited / condition-gated | a genuine recurring rich-capsule scientific producer |
| 6 | condition-gated | Phase 5 recurrence must exist first |
| 7 | condition-gated | enough repeated real data to support recurrence/phenotype reduction |
| 8 | authority-gated | WS2 must explicitly select operational divergence / first-loss |

## Direct work completed in this pass

### Live authority reconciliation

`docs/solver-optimization-workstreams.md` no longer describes the reserve-starvation premise as waiting for a sample design that already exists. It now records:

- the reserve-starvation path as independently dispatch-ready after the R00044 canary;
- the frozen 40-parent/300M default-profile acquisition and mechanical 0/1/>=2 reducer;
- the Class-3 dose path as analysis-ready but data-blocked;
- failure-response reconnaissance as the main WS2 discriminator-selection gate.

`docs/solver-future-work.md` now carries explicit durable resumption conditions for Phases 3, 4A, and 4B instead of a generic “retire when descendants have owners” sentence.

### Class-3 analysis handoff

Added:

- `scripts/analyze-class3-dose-exposure.mjs`;
- `scripts/analyze-class3-dose-exposure-node-test.mjs`;
- `research:analyze-class3-dose`;
- `test:class3-dose-exposure`, included in `test:node`.

The reducer consumes a frozen parent -> exact-rescuer expectation map plus one or more compact failure-response documents. It fails closed on unknown/mixed protocol or solver identity, preserves parent as the independent unit, reports missing parents, and classifies exact rescuers without hand interpretation.

The Class-3 preflight and question relation now point to this mechanical reducer.

### Reserve-starvation analysis handoff

Already present before this audit and rechecked here:

- frozen independent 40-parent sample;
- exact default admissible-order profile;
- one-row R00044 execution-family canary;
- 300M isolated node ceiling;
- mechanical `research:analyze-reserve-starvation` reducer;
- frozen 0/1/>=2 opportunity rule.

No analysis-code work remains before dispatch.

### WS2 reconnaissance handoff

Already present before this audit and rechecked here:

- common `research:query-failure-response` surface;
- protocol/solver partitioning;
- parent-level denominators;
- exact attempt action/stage dose summaries;
- solved-parent failed-attempt controls;
- predeclared Stage-A/Stage-B routing rules.

The missing input is real post-contract evidence, not parsing or schema work.

## Why the remaining work should not be “completed” synthetically

### Phase 3

Backfilling pre-contract, selectively dispatched native attempt arrays would create a pseudo-prevalence population with incompatible selection and protocol semantics. The readiness audit correctly blocks that shortcut.

### Phase 4A

The current Class-3 population is derived state. Copying the historical 23 IDs instead of regenerating the current atlas would defeat the purpose of the exposure reconciliation. The reducer is ready; the population/data are not.

### Phase 4B

The frozen probe asks a real solver-cost question. Static inspection cannot replace the canary or 40-parent measurement.

### Phases 5-7

Creating a ceremonial recurring rich producer merely to satisfy Resource Contract promotion would violate the plan's central condition. Recurrence must arise from an actual recurring scientific consumer.

### Phase 8

Search-loss infrastructure does not choose solver priority. First-loss can start only if the canonical workstream authority selects that discriminator after failure-response reconnaissance or another valid premise.

## Handoff boundary

A coding agent is **not currently required** to interpret the next Phase-3, Phase-4A, or Phase-4B evidence. Existing tools and frozen rules are sufficient.

A future coding task is justified only if new evidence exposes a concrete missing producer field/contract, or if a selected downstream treatment requires implementation. Do not commission generic failure-data work merely because the plan remains open.

## Closeout status

The integration plan should remain open because Phases 3 and 4 still have real scientific acquisition gates. It is nevertheless **direct-work complete for the current evidence state**.

When the next qualifying event occurs:

- post-contract compact population -> execute Phase 3 preflight;
- regenerated Class-3 map + shared-production compact rows -> execute the Class-3 reducer;
- reserve probe dispatch/result -> execute the reserve reducer;
- genuine recurring rich producer -> Phase 6 resource audit;
- first-loss selected by WS2 -> existing search-loss Phase 9.

If none of those events occurs and current workstream authority retires the questions, close the plan rather than preserving it as indefinite background debt.
