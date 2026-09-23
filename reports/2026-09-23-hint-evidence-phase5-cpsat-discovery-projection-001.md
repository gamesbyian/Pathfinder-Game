# Hint evidence consolidation — Phase 5 CP-SAT successful-discovery projection — 001

> **Status:** implementation-complete in dual-path/shadow mode; real workflow parity validation pending
>
> **Date:** 2026-09-23
>
> **Branch:** `chatgpt/hint-consolidation-phase4-6-table-setting-2026-09-23`

## Why this batch

The preimplementation workflow matrix named CP-SAT as the one concrete successful-discovery producer
whose specialist artifact was not sufficient for central hint reconstruction.

The inner tool already held the exact referee-approved path, source level and forcing in memory, but
its optional JSON output discarded the path and the sharded workflow never requested that output.
Canonical Hint files were therefore the only durable successful-discovery payload.

This batch removes that artifact-sufficiency blocker without changing CP-SAT search behavior or
prematurely removing the existing direct persistence lane.

## Specialist artifact

`scripts/stress/cpsat-hint-harvest.mjs` now emits schema-v1:

`pathfinder-cpsat-hint-discovery-report`

The document names its producer and corpus.

For every referee-valid successful observation, the row now retains:

- exact accepted path;
- path signature;
- exact source level revision;
- external solver id and CP-SAT technique;
- forcing dimensions;
- budget/elapsed observation;
- discovery timestamp captured at acceptance time;
- novelty/rediscovery status.

Rejected/model-invalid paths still do not acquire a successful `solution` payload.

The outer sharded driver now requests one discovery JSON per level under
`logs/cpsat-hint-harvest-sweep/discovery-<id>.json`. The workflow already uploads the whole logs
directory in every shard artifact, including partial-failure uploads, so no new artifact transport is
required.

## Central specialist adapter

Added `scripts/harvest-cpsat-discovery-reports.mjs`.

It deliberately does **not** route CP-SAT through the native isolated-Pathfinder adapter.

For each new specialist report it:

1. accepts only the explicit CP-SAT report kind/producer;
2. resolves the declared corpus;
3. requires an exact source level revision and checks it against current canonical main;
4. requires the source-recorded discovery timestamp rather than stamping later harvest time;
5. referee-validates the exact path again on current canonical level data;
6. reconstructs provenance with `EXTERNAL_SOLVER_ID` and technique
   `cpsat-reference-probe`, preserving forcing/budget/elapsed/source revision;
7. adds exact physical source-run occurrence lineage;
8. merges through canonical `mergeHints()`;
9. reports exact path/provenance-event/occurrence additions in the shared ingestion receipt;
10. quarantines stale/malformed/incompatible observations explicitly.

## Phase-6 dual-path posture

The CP-SAT source workflow still transports/directly commits canonical Hint files.

The central harvest runs the ordinary captured-Hint merge first, then the new CP-SAT specialist
adapter.

That ordering is intentional. On a healthy dual-path run, the direct artifact should already have
introduced the semantic discovery event. The specialist projection should therefore normally merge
the exact physical source-run occurrence into the same semantic event rather than create a duplicate.

If a partial source run preserves the discovery report but loses the direct Hint artifact, the
specialist report remains sufficient to recover the accepted discovery centrally.

Direct CP-SAT persistence must not be retired until real workflow evidence demonstrates this parity
and retry behavior.

## Verification scaffolding

Added an empty-staging bundled smoke test for the specialist adapter. It proves the CLI runs without
mutating canonical data and emits the shared receipt with exact zero units.

The real parity test requires a CP-SAT workflow artifact containing the new discovery report and is
therefore intentionally left for a repo/GHA-capable continuation.

## Remaining gate

Dispatch or reuse one bounded CP-SAT run after this branch is integrated, then compare:

- direct captured-artifact receipt;
- CP-SAT discovery-projection receipt;
- final canonical Hint semantics/occurrence lineage;
- retry/re-harvest result.

Only then remove CP-SAT's direct canonical commit path.
