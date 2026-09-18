# Decision-observation work-accounting correction preflight 001

> **Status:** superseded
> **Last evidence:** 2026-09-17 — D1 implementation audit against current `main`.
> **Decision:** completed by `reports/2026-09-17-decision-observation-work-accounting-correction-result-001.md`; canonical work is now distinct from the legacy node-progress counter.
> **Remaining gate:** ordinary CI / behavioral-inertness validation.

## Defect

`BeamResearchRecord.work` is emitted as `nodesExpandedTotal + frontierIndex`. It is a node-progress counter.

`beamResearchRecordToDecisionObservation()` currently copies that value into `workSpentBefore` / `workSpentAfter`, whose contract and D1 economics require the canonical machine-independent work meter.

That conflates two metrics and would make D1 displaced-work/economics evidence invalid.

## Repair boundary

- Do not rename/remove the existing `work` field; retained consumers may rely on its node semantics.
- Add `workSpent` as an observer-only canonical snapshot from `prep._workMeter.units`.
- The shared decision adapter must use `workSpent`, never fall back to `work`.
- Legacy beam records without canonical `workSpent` should be ineligible for decision-economics conversion rather than mislabeled.
- No solver ranking, retention, budget, or production policy change.
