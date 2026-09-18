# Decision-observation work-accounting correction result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — contract audit and code correction on the shared beam research observer / decision-observation adapter.
> **Decision:** corrected a measurement-semantic defect before D1 evidence collection. `BeamResearchRecord.work` remains the legacy node-progress counter; new `workSpent` captures canonical `prep._workMeter.units`; beam→decision conversion now requires canonical work and refuses legacy records that lack it.
> **Remaining gate:** ordinary CI plus behavioral-inertness tests. Once landed, D1 may use the shared decision seam without mislabelling nodes as machine-independent work.

## Defect confirmed

The beam observer emits `work = nodesExpandedTotal + frontierIndex`. That field is useful node-progress telemetry but is not the project's canonical work metric.

The #1863 adapter copied it into:

- `workSpentBefore`;
- `workSpentAfter`.

That made the shape valid while changing the meaning of the data. Any D1 displaced-work/economics analysis built on those fields would therefore have compared node counts under a `workSpent` label.

## Repair

The audit also found the same semantic conflation in `KnownSolutionPrefixSurvivalObserver`: its `workAfterFinalKnownSupport` field was derived from `record.work` while being described as canonical work. The repair therefore covers both shared consumers.

The repair is additive and observer-only:

1. `BeamResearchRecord.work` is preserved unchanged and explicitly documented as node progress.
2. `BeamResearchRecord.workSpent` is added and emitted from the solve-local canonical `prep._workMeter.units`.
3. `beamResearchRecordToDecisionObservation()` uses only `workSpent` for its canonical work fields.
4. Legacy records without canonical `workSpent` return `null` from that adapter rather than receiving a false fallback.
5. The legacy node counter is retained as `context.nodeProgress` for diagnostic use.
6. Known-solution prefix-survival stages now retain both `work` (node progress) and `workSpent` (canonical work), and `workAfterFinalKnownSupport` is computed only from `workSpent`.
7. The current prefix-survival collector now includes canonical OFF/ON work parity, emits per-row `workSpent`/`controlWorkSpent`, and no longer relabels its node cap as a canonical `workBudget` (`workBudget: null`, explicit node-budget note, schema v5).

No ranking, retention, cache, random, search, budget, or production-policy input reads the new field.

## Tests

The shared decision-observation unit test now verifies:

- canonical `workSpent` is propagated exactly;
- node progress remains separately available;
- a legacy cull record with ranked-pool context but no canonical work is rejected from decision conversion.

The beam behavioral-inertness test also captures both metrics and verifies canonical work snapshots are finite/bounded while node progress and canonical work remain observably distinct. Prefix-survival tests independently separate the two scales (`20/30/100` node progress versus `2/3/10` canonical work) and require the reported post-support work to remain `8`, proving the summary follows canonical work rather than nodes. The collector CLI test additionally requires canonical OFF/ON work equality and rejects the old node-budget-as-work-budget output convention.

## D1 consequence

This correction does not itself collect D1 evidence. It removes a measurement trap in the exact seam D1 is authorized to use.

D1 still needs:

- independently selected multi-parent opportunities;
- a frozen eligibility predicate;
- exact/UNKNOWN annotation;
- cutoff disagreement accounting;
- downstream ancestry/work bounds;
- observer information cost.

But those quantities can now use the shared decision record without corrupting the project's machine-independent work semantics.
