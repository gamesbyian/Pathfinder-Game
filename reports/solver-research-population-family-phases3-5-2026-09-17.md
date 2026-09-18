# Solver research population + family integration: Phases 3-5

> **Status:** implementation complete on branch; scientific queue unchanged.
> **Date:** 2026-09-17
> **Scope:** producer lineage, progressive enrichment joins, and acquisition-routing preflight only.
> **Priority authority:** `docs/solver-optimization-workstreams.md`.

## Result

Phases 3-5 of `docs/solver-research-population-family-integration-plan.md` are implemented without creating a warehouse, persistent block index, new standing corpus, or solver treatment.

The shared workflow can now carry one prospective research lineage through:

```text
ranked question
 -> frozen generated/reused parent block
 -> optional controlled family descendants
 -> optional production-frontier states
 -> observation/exact/treatment artifacts by reference
 -> conservative question-first acquisition route
```

Source artifacts remain authoritative. Family descendants remain clustered under their parent and do not mint independent support.

## Phase 3 — family-ready producers

### Procedural parent blocks

`stress:generate-random` and `stress:generate-topology` accept optional:

- `--question-id=<stable registry id>`;
- `--evidence-role=<development|confirmation|transfer>`;
- `--block-id=<explicit id>`.

When a question ID is supplied, the generated output embeds:

- a sealed `populationIdentity`;
- a validated `researchBlock`;
- source regime and deterministic generator/config revision;
- literal generated parent IDs;
- content identities derived from the canonical structural fingerprint payload;
- parent-level independence;
- generation/source refs;
- empty consumption lineage.

Random/witness-first generation rejects `--append` when emitting a research block. A frozen research block cannot silently change membership after its identity has been established.

Normal generation without research arguments is unchanged.

### Controlled families

`family-generate.mjs` now accepts optional research context:

- stable `--question-id`;
- evidence role;
- parent exposure;
- originating block ID + population identity.

The context is recorded **per generation run**, not as one family-global research claim. This matters because a cumulative family can legitimately be reused by later questions while each run retains its own selection/exposure context.

The originating block is a reference only. Family descendants do not become a second parent block and do not inflate independent-parent support.

### Human/editor wrapper

`human-parent-contrast-pilot.mjs` preserves its human-readable `--question` and now also supports stable question-ID linkage. If the question string itself is a registered ID it is adopted automatically; an explicit unknown question ID is rejected. The wrapper passes evidence role/exposure/question lineage into the underlying family manifest.

## Phase 4 — progressive enrichment joins

### Frontier inheritance

`solver:sample-production-frontiers` accepts `--block-artifact=<path>`.

It validates the inherited block/population identity, verifies every sampled parent belongs to the frozen block, rejects a conflicting question, and carries the same block lineage into population/cases outputs.

This lets production-state sampling enrich a parent block without minting new parent identity.

### Reference-only enrichment linker

New front door:

```bash
npm run research:link-enrichment -- \
  --block-artifact=<frozen-block-artifact.json> \
  --artifact=<existing-exact-observation-or-treatment-output> \
  --kind=<observation|exact|treatment|artifact> \
  --out=<lineage-sidecar.json>
```

The sidecar copies no scientific payload. It records only:

- the inherited block/population identity;
- enrichment kind;
- authoritative source artifact ref;
- optional state/run ref.

`research:relations` recognizes these sidecars and composes their refs into the existing block/parent relation rows. Existing D1 capture/annotation remains a native producer; other tools do not need invasive schema changes merely to participate in lineage.

## Phase 5 — acquisition routing preflight

New front door:

```bash
npm run research:acquisition-preflight -- \
  --question-id=<stable-question-id> \
  [--artifact=<existing-block-or-enrichment-artifact>]... \
  [--evidence-role=development|confirmation|transfer] \
  [--related-questions=<ids>] \
  [--need=<explicit blocker kind>]
```

The preflight returns exactly one primary route:

- `REUSE_EXISTING`;
- `FRESH_SAME_SOURCE`;
- `CROSS_SOURCE_TRANSFER`;
- `CONTROLLED_FAMILY`;
- `HUMAN_EDITOR`;
- `NO_LEVEL_GENERATION`.

Routing is deliberately conservative:

1. supplied mechanically eligible blocks win first as `REUSE_EXISTING`;
2. explicit blocker semantics may select a generation/contrast route;
3. strict reopen-condition cues can identify fresh-parent, transfer, family, or human-origin needs;
4. telemetry, dose, economics, representation, exact semantics, candidate construction, observer/instrumentation, or ambiguous blockers route to `NO_LEVEL_GENERATION`.

The preflight never generates levels. Generation routes still require opportunity sizing and pilot/expansion discipline.

For the current D1 question the conservative route remains `NO_LEVEL_GENERATION`: its blocker is production-inert opportunity/economics evidence, not parent generation.

## Shared block helper

`solver-research-block-lineage.mjs` now exposes a generic frozen-block builder so producers use the same population identity + validation contract instead of rebuilding D1-shaped variants.

## Coverage

Added/extended coverage for:

- generic frozen-block construction;
- family run research lineage and originating-block references;
- reference-only treatment enrichment joining;
- acquisition-route decisions and reuse precedence.

Existing D1 block/query tests remain intact.

## Boundaries preserved

This tranche does **not**:

- execute D1 or any other solver-science experiment;
- change solver ranking, pruning, routing, budget, randomness, or caches;
- create a database/warehouse/master evidence file;
- auto-generate levels from the acquisition preflight;
- treat family rows as independent parents;
- backfill historical unknowns;
- make generation availability a reason to interrupt the ranked queue;
- begin Phase 6 pilots.

## Validation

The branch was prepared through the GitHub connector. The local scratch environment could not resolve github.com, so no local npm-run claim is made here. Repository CI remains the executable validation surface for this branch.

## Next

Do not continue into Phase 6 merely because Phases 3-5 exist.

Return to `solver-optimization-workstreams.md`. The current scientific priority remains the D1 production-inert evidence gate. Phase 6 of this integration plan should be used later only when a ranked live question calls for one of its end-to-end pilots.
