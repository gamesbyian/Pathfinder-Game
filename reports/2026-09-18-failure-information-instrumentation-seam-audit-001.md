# Failure-information instrumentation seam audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — reconciled current implementation and workflow inventory.
> **Decision:** reuse typed prune, specialist reason, BeamResearch, repair-progress, and technique-census in-memory seams; do not add a second taxonomy.
> **Remaining gate:** representative overhead evidence before universal telemetry promotion.
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

Attempt-scoped typed prune aggregation and counter-only beam flow are implemented behind research-only options. Repair new-best transitions and DFS/beam terminal badness feed the bounded progress pilot. None is enabled universally until representative real-run parity, overhead, byte-volume, and incremental-value gates pass.
