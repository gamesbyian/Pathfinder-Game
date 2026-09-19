# Failure-information instrumentation seam audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — reconciled current implementation and workflow inventory.
> **Decision:** reuse typed prune, specialist reason, BeamResearch, repair-progress, and technique-census in-memory seams; do not add a second taxonomy.
> **Remaining gate:** representative parity/overhead/byte-volume is cleared by GHA run `35423841173`; universal durable promotion still requires incremental-value and producer-scope evidence. See [`2026-09-19-compact-failure-diagnostic-promotion-review-001.md`](2026-09-19-compact-failure-diagnostic-promotion-review-001.md).
> **Evidence role:** architecture/seam audit only; no solver efficacy claim.

## Existing cheap seams

- `PruneId` and `PruneDiagnostics.reached/rejected` already own hard-prune reason identity and counts. Rejection telemetry must reuse them rather than define another taxonomy.
- Connectivity and joint-obligation observers own their specialist subtype/family vocabularies. They remain opt-in and their bounded summaries may be joined, not relabelled as generic causal failure.
- BeamResearch owns incoming/generated/hard-pruned/merge/cull/retained stage semantics. Rich records copy paths and pools, so ordinary telemetry needs a separate counter-only path.
- Repair search already computes best-ever badness transitions. DFS and beam ordinarily compute only a terminal timeout snapshot, so calling those trajectories would overstate the available signal.
- Technique census has full attempts in memory before failed cells historically discard them; this is the narrowest automatic compact-attempt seam.

## Direct/untyped exits

Terminal invalid-goal/fundamental beam rejection fallbacks and some natural exhaustion paths do not own stable typed reason IDs. They remain unknown rather than receiving inferred labels. New IDs require a stable canonical semantic owner, not merely a useful-looking debug branch.

## Pilot disposition

Attempt-scoped typed prune aggregation and counter-only beam flow are implemented behind research-only options. Repair new-best transitions and DFS/beam terminal badness feed the bounded progress pilot. GHA run `35423841173` cleared representative semantic-parity, overhead, byte-volume, and family-coverage conditioning for this compact bundle (about 0.46% aggregate wall overhead and 35.7 KB payload across 16 parents). The bundle remains research-only by default until incremental scientific value and recurring producer scope justify a durable promotion; do not rerun equivalent calibration merely for ceremony.
