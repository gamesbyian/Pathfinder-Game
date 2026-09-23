# Hint evidence consolidation — Claude handoff after Phase 4–6 table-setting — 001

> **Date:** 2026-09-23
>
> **Handoff branch:** `chatgpt/hint-consolidation-phase4-6-table-setting-2026-09-23`
>
> **Draft PR:** #2011, based directly on `claude/pathfinder-hint-evidence-consolidation-saeiuo`
>
> **Ancestry at handoff:** strict descendant; no rebase/rewrite.

## Executive status

The program is now materially beyond the architectural-foundation stage.

A reasonable implementation-progress estimate is **roughly 65–70% of the entire dependency-ordered
plan**, with the important asymmetry that the semantic foundation is much further along than the
remaining physical/workflow migration volume.

It would be misleading to call the full plan 75% complete before the remaining Phase-3 storage
semantics are settled and at least one real Phase-6 dual-path family has passed parity/reharvest and
retired its old direct route. Those are real gates, not paperwork.

The program is nevertheless now close enough that Claude's next sessions can focus on those genuine
gates rather than identity archaeology, queryability plumbing, source-run rescue, ingestion vocabulary,
or runtime-delivery design.

## Phase status

### Phase 0 — baseline / expiring authority

**Essentially complete for the high-value objective.**

- original run metadata rescue retained;
- all six September-9 source `solver-sweep-result` artifacts were later downloaded while still live;
- durable collision-focused authority now covers all six runs, 15 #1996 collision levels and 41 source
  observations with original manifest/result hashes, exact tracked-path hashes, run/config identity
  and winning-attempt facts;
- #1996 collision reconstruction no longer depends on Actions retention.

Full unrelated source-result archival is optional, not a blocking authority gap.

### Phase 1 — honest semantic ingress / boundary repair

**Complete, subject only to ordinary regression maintenance.**

Claude's earlier batches closed stale I/O, historical missingness, synthetic chronology, worker observer
parity, shared v1-v3 decode and storage-loss containment. The later shared layout authority closed the
remaining PSC-025 seam.

### Phase 2 — identity / durable join semantics

**Complete.**

Canonical request projection, digest/compatibility, execution protocol, reproducibility mode, backend
classification, immutable solver/source-run binding and real producer transport are implemented and
locally validated by Claude.

### Phase 3 — provenance event / occurrence semantics

**Substantially implemented; this is the main semantic frontier.**

Complete:

- optional execution provenance;
- occurrence lineage separated from semantic-event identity;
- occurrence merge/idempotency behavior;
- real current producers wired;
- embedded request identity consumed by reconstructability queries;
- corpus-scale read-only acceptance audit now exists.

Still needs Claude-level decisions/validation:

- final Firestore/GHA occurrence bounded-growth unit;
- byte-aware capacity/overflow representation;
- decision on durable solver-stage identity vs exact sibling-evidence join;
- run the new full-corpus acceptance audit and resolve any real violations;
- prove persistence/join behavior through the chosen Firestore/GHA layout.

### Phase 4 — query / observability oracle

**Largely implemented.**

This descendant adds:

- modern canonical-request-aware determinism grouping;
- first-success-race exclusion from path-stability claims;
- modern-vs-legacy comparable coverage;
- execution/occurrence/join-locator coverage in reconstructability reporting;
- resource-contract/catalog updates reflecting actual modern semantics;
- corpus occurrence acceptance oracle.

No derived Hint index was added merely because the plan mentioned one; it remains contingent on a
demonstrated repeated query that earns another persistent projection.

### Phase 5 — standardized ingestion projection / receipt

**Substantially implemented, not fully closed.**

Complete:

- one canonical versioned success-ingestion receipt;
- explicit success-selected denominator semantics;
- candidate/eligible/referee/already-represented/quarantine vocabulary;
- exact path/event/occurrence units when measurable and explicit null when not;
- receipt query surface;
- receipt coverage for level-blind report, isolated/report and direct transported-Hint lanes;
- CP-SAT specialist artifact is now sufficient for exact central reconstruction;
- CP-SAT specialist central adapter exists in shadow/dual-path mode.

Still open:

- decide whether a separately surfaced canonical successful-discovery projection is needed beyond the
  current specialist-artifact -> canonical adapter boundaries;
- complete producer/static completeness checks if the real workflow migrations expose a need;
- prove CP-SAT shadow parity on one bounded real run.

### Phase 6 — incremental GHA persistence centralization

**Meaningfully started, still a large remaining phase.**

Complete infrastructure:

- central harvest is already the single serialized writer;
- exact source run id/attempt reaches receipts and occurrence reconstruction;
- all canonical import lanes expose one accounting vocabulary;
- deterministic replay/reset includes receipt outputs;
- CP-SAT now has a shadow central semantic path while the old direct route remains for parity.

Still open:

- run real dual-path parity/reharvest per family;
- remove direct canonical mutation only after each family's parity gate;
- retain historical `merge-hint-artifacts` compatibility afterward;
- resolve any diagnostics specialist exception that still lacks sufficient artifacts.

Do not count a direct-route deletion as progress unless the real parity evidence exists.

### Phase 7 — authoritative historical enrichment

**Authority is prepared; corpus mutation has not begun.**

The key #1996 collision source authority is now durable. The semantic model it would enrich is largely
ready. Actual exact historical backfill should wait until Phase-3 persistence semantics are final and
Phase-4 queries can judge the result.

### Phase 8 — physical Hint schema v4

**Intentionally not started.**

This remains correct dependency ordering. Do not pull it forward merely to improve the completion
percentage.

### Phase 9 — generated runtime delivery

**Implemented on this descendant; real build validation pending.**

Vite now generates path-only runtime Hint files from canonical decoded evidence rather than recursively
shipping canonical provenance. Every generated file carries exact source-content and source-semantic
hashes and must round-trip through the same decoder.

Run the real build and record full-corpus bytes/build time before marking the phase fully closed.

### Phase 10 — bounded level cleanup

**Not started; deliberately low priority and dependency-late.**

## New executable gates Claude should run first

Before new semantic implementation:

1. full `npm run test:node`;
2. full Vitest + type checks;
3. `npm run check:workflow-actions`;
4. `npm run check:audit-artifacts`;
5. `npm run build` and inspect runtime projection manifests/bytes;
6. `npm run hints:occurrence-acceptance-audit`.

Then inspect the new receipt/query surfaces on a real source run.

## Highest-value next sequence

1. **Phase-3 persistence decision:** occurrence bounded-growth / Firestore semantics and stage identity.
2. **Run one bounded CP-SAT dual-path canary:** compare captured-artifact and specialist-report receipts,
   final semantic events and occurrences, then re-harvest once.
3. **Choose the first ordinary solver family for Phase-6 parity** (prefer a small artifact-sufficient
   level-blind family), exercise old direct route + central report reconstruction, then remove the direct
   route only if exact semantic/occurrence parity holds.
4. Repeat family migrations in small batches.
5. Once semantic storage/central ingestion is stable, apply proved Phase-7 historical enrichment.
6. Only then benchmark/implement/migrate v4.

## Why this stops short of a cosmetic 75%

The easiest way to claim another five or ten percentage points would be to:

- remove direct workflow writes without live parity;
- invent a Firestore occurrence layout without byte/evidence validation;
- start v4 before historical enrichment;
- bulk backfill guessed historical fields.

Every one of those would violate the program's core methodology.

The remaining distance to a defensible ~75% is therefore best earned by **Claude validating this branch,
closing Phase 3 storage semantics, and retiring at least the first one or two real dual-path workflow
families**. The plumbing and oracles needed to do that are now present.
