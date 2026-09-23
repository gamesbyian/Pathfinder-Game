# Hint evidence consolidation — Phase 4/5/6 observability, receipt, and central-harvest tranche — 001

> **Status:** implementation-complete on descendant branch; execution validation pending
>
> **Date:** 2026-09-23
>
> **Branch:** `chatgpt/hint-consolidation-phase4-6-table-setting-2026-09-23`
>
> **Base:** direct descendant of the then-current `claude/pathfinder-hint-evidence-consolidation-saeiuo`
> after Claude closed Phase 2 and substantially implemented Phase 3.

## Purpose

Move later phases forward without pre-deciding the remaining Phase-3 Firestore/occurrence persistence
semantics.

The tranche advances:

- Phase 4: query/determinism/reconstructability oracle;
- Phase 5: one canonical ingestion-accounting vocabulary;
- Phase 6: central-harvest source-run/receipt persistence for the two report-based import lanes.

It deliberately does not redesign Firestore occurrence storage, embed solver stage, start v4, or retire
the direct canonical-hint compatibility importer.

## Phase 4 — canonical identity reaches the determinism/query oracle

`scripts/hint-determinism-audit-lib.mjs` now consumes modern
`entry.execution.{solverRequestIdentity,protocolHash,reproducibilityMode,arm}`.

The audit:

- distinguishes modern `canonical-solver-request` comparisons from historical
  `legacy-recorded-input` approximations;
- includes execution identity in its modern input-group identity;
- explicitly excludes `first-success-race` observations from stable-winning-path determinism claims;
- retains the historical screen rather than pretending old events gained execution identity.

The CLI summary now reports canonical-vs-legacy comparable-event coverage.

A focused node test guards the distinction and is wired into `test:node`.

`scripts/stress/hint-reconstructability-report.mjs` now exposes persisted coverage for:

- execution capsules;
- embedded solver-request identities;
- occurrence lineage;
- events with multiple occurrences;
- occurrence record count;
- occurrence records carrying contract refs;
- constituent source-run links.

The hint-provenance research asset and audited resource declaration were updated from the old
"prospective identity" wording to the actual modern/historical state.

## Phase 3 acceptance oracle brought forward

Added `scripts/stress/hint-occurrence-acceptance-audit.mjs`.

It scans all three canonical hint corpora read-only and checks:

- the known 662-event July-11 synthetic-`foundAt` cohort remains exactly recognizable;
- one semantic provenance identity is not duplicated within one stored path;
- one `runId + runAttempt` occurrence key appears at most once within a semantic event;
- occurrence records always have a physical run id;
- `sourceRuns`, when present, remains an array.

It separately reports sparse execution coverage without treating historical missing request identity as
a violation.

This converts several Phase-3 corpus-scale acceptance bullets into one executable oracle. It does not
claim to validate the still-undecided Firestore/GHA bounded-growth representation.

## Phase 5 — canonical hint-ingestion receipt

Added `scripts/hint-ingestion-receipt-lib.mjs` with schema-v1 kind:

`pathfinder-hint-ingestion-receipt`

The common vocabulary is deliberately success-selected and explicitly not an attempted-population
denominator.

It records:

- candidate success observations;
- eligible observations;
- referee-accepted observations;
- accepted observations already represented;
- quarantine count/reasons;
- coarse semantic-record changes;
- exact path additions when measured;
- exact provenance-event additions when measured;
- exact occurrence additions when measured;
- physical-file changes when measured.

An unmeasured exact addition unit is `null`, not zero.

The previous level-blind harvest-selection manifest remains a historical/current specialist resource.
A compatibility projection reads it into the shared receipt without rewriting it.

The level-blind and isolated/report harvesters now optionally emit this same receipt. Their different
funnels prove the receipt is not merely a renamed level-blind manifest.

Added `scripts/hint-ingestion-receipt-query.mjs`, which aggregates receipts by producer/run and
preserves known-vs-unknown detailed addition units.

The research asset registry now exposes `hint-ingestion-receipts` as a first-class queryable resource.

## Phase 6 — central harvest source-run/receipt plumbing

`.github/workflows/harvest-solver-evidence.yml` now resolves the physical source run's
`run_attempt` in addition to run id/workflow/SHA.

For report-based imports:

- level-blind harvest receives exact run id/attempt and preserves modern request/protocol/repro/arm
  facts from the source report when those facts actually exist;
- isolated/direct historical report import receives exact run id/attempt but does not invent missing
  request/protocol facts;
- both reconstruct occurrence lineage using the actual source run;
- both emit canonical receipts under
  `reports/stress/hint-ingestion-receipts/run-<run-id>-<lane>.json`;
- the workflow's reset/replay loop regenerates and commits those receipts from immutable source
  artifacts, so retry behavior stays deterministic.

The workflow now tracks the receipt directory as durable harvest output.

## Important denominator correction caught during review

The first compatibility projection used the old manifest's total `sourceRowsSeen` as
`candidateObservations`. That would have violated the receipt's own success-selected contract because
the source total includes unsolved rows.

It was corrected before closeout:

- `candidateObservations = solvedCandidateRowsSeen`;
- `eligibleObservations = solvedCandidateRowsSeen` at this legacy boundary;
- originating attempted-population rows remain outside the receipt.

This is exactly the distinction the common vocabulary exists to preserve.

## Direct-artifact receipt closeout

The direct transported-canonical-file compatibility importer was subsequently migrated to the same
receipt vocabulary.

`scripts/merge-hint-artifacts.mjs` now measures canonical before/after semantic units for every
referee-accepted incoming observation and reports:

- accepted observations that changed semantic storage;
- accepted observations already represented;
- exact path additions;
- exact provenance-event additions;
- exact occurrence additions;
- physical files changed.

The central workflow emits this third receipt as
`run-<run-id>-captured-artifacts.json`, so all current canonical harvest lanes now share one accounting
contract. A focused empty-staging smoke test plus the shared semantic-unit counter guard were added.

## Remaining Phase-5/6 gaps

Phase 5 still needs the final standardized successful-discovery projection/completeness contract
for all intended modern producer families, including CP-SAT artifact sufficiency.

Phase 6 remains family-by-family migration work. This tranche does not remove any direct persistence
route merely because central accounting now exists.

## Validation status

Focused tests were added for:

- canonical-vs-legacy determinism grouping;
- first-success-race exclusion;
- occurrence/query coverage;
- corpus occurrence acceptance invariants;
- receipt construction/validation;
- level-blind receipt integration;
- isolated receipt integration;
- receipt query aggregation.

All lightweight guards are wired into `test:node`.

This authoring environment cannot execute the repository. Claude should run the complete descendant
branch through the same real local validation floor used in the preceding reconciliation batch before
accepting it.

## Next high-value Claude actions

1. run the new corpus occurrence acceptance audit and inspect any real violations before deciding
   Firestore occurrence bounds;
2. design/implement the Phase-3 Firestore/GHA bounded-growth/overflow semantics;
3. decide whether solver stage should become a bounded embedded provenance dimension or remain an
   exact sibling-evidence join;
4. use the now-complete receipt coverage to enumerate any maintained ingestion lane that still bypasses the canonical accounting vocabulary;
5. use the new query/receipt oracles as the gates for producer/workflow-family Phase-5/6 migration.
