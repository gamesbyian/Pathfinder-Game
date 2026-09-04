# Solver research data assets

> **Status:** human evidence-topology guide.
> **Structured detail:** [`solver-research-data-assets.json`](solver-research-data-assets.json) owns the per-asset locations, authorities, query entry points, join keys, relationships, affordances, roles, and caveats.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns what runs next.
> **Method:** [`solver-research-operating-model.md`](solver-research-operating-model.md) and [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) own evidence/selection/holdout discipline.

Do not duplicate the machine registry here. This document explains how to use it safely. The older expanded prose catalogue is frozen at [`archive/snapshots/solver-research-data-assets-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-research-data-assets-2026-09-04-pre-consolidation.md).

## Cheap discovery first

For a research premise, start with:

```bash
node scripts/research-asset-query.mjs --query=<term>
node scripts/research-status-index.mjs --compact --query=<term>
node scripts/tooling-census.mjs --compact --query=<term>
```

Use `research-asset-query --id=<asset-id>` when you know the family. Open the JSON registry or specialist authority only when exact paths/join boundaries are needed.

## Required evidence preflight

Before broad compute or a new dataset:

1. Read the current workstream/gate.
2. Query assets that could **falsify, stratify, contextualize, or independently challenge** the premise.
3. Name the join keys and independent unit before writing an ad hoc join.
4. Preserve corpus/source/generator/family/provenance context needed to interpret the result.
5. Prefer an existing evidence join over generation when it can answer the gate.
6. Record materially relevant assets considered and rejected when that prevents rediscovery.

Do not mine every available axis. Searching many assets/features creates selection pressure; discovered relationships are development evidence until appropriately confirmed.

## Evidence topology

| Asset family | Natural grain | Main question |
|---|---|---|
| Published/stress levels | level, source/generator | What population/construction is this? |
| Hint provenance | path discovery | Who/what found this path, under which config/work/context? |
| Structural level fingerprint | level structure | Are observations from the same structural revision? |
| Solution-space profiles | level × provenance source | What do known solutions look like and how diverse are they? |
| Technique census/capability map | level × technique/config | What isolated capability exists at measured dose? |
| Production benchmarks | run × level | What does the real solver solve and spend? |
| Lifecycle telemetry | level × stage/action/attempt | What did production reach, starve, exhaust, skip, or solve with? |
| Known-prefix survival | level × beam boundary | Where did labelled viable support disappear? |
| Operational traces | encountered decision | How did two searches actually diverge? |
| Exact/reference labels | level × state/prefix | Is selected material actually feasible? |
| Offline replay atlas | labelled state × probe | Can a candidate reasoner explain/use exact labels? |
| Variant families | parent × controlled transform | Which controlled structural changes flip behavior? |
| Experiment manifests | run/arm/shard | Which code/data/protocol produced the observation? |
| Raw logs/baselines | raw run/snapshot | What happened before interpretation? |
| Research-status index | report/workstream/experiment | Has this already been tested or renamed? |
| Static descriptors | level × legal feature | Which geometry/mechanics stratify an effect? |
| Failure triage | selected level/cohort | Why was this case selected and what is already known? |

The registry contains the durable asset IDs and exact relationships behind this table.

## High-value joins

Common useful joins include:

- **census × lifecycle:** isolated capability versus actual production reach/work;
- **census × solution profile:** technique response versus known solution-space structure;
- **census × static descriptors:** technique response versus legal level features;
- **census × variants:** controlled transformations that flip technique response;
- **census × traces:** outcome differences versus actual behavioral differences;
- **benchmark × lifecycle:** solved/unsolved outcome versus where work was spent;
- **hint provenance × profile/census:** whether known-solution structure is confounded by how solutions were discovered;
- **structural fingerprint × persisted evidence:** whether historical observations still refer to the same puzzle revision;
- **exact labels × traces/prefix survival:** whether a localized search failure discarded feasible material;
- **manifests × any decision-bearing run:** whether compared arms actually used comparable code/data/protocol.

These are opportunities, not mandatory joins. Use the smallest join that answers the current gate.

## Three different fingerprints

Do not collapse these:

1. **Structural level fingerprint** (`modules/domain/level-fingerprint.ts`): versioned puzzle-structure identity/deduplication.
2. **Solution-space profile/fingerprint** (`solver-solution-profile.md`): offline summary of known accepted paths.
3. **Solver determinism fingerprint** (`scripts/solver-fingerprint.mjs`): execution/search-behavior regression signature.

Only the first is a structural identity primitive. None permits per-level production steering from historical results.

## Scientific boundaries

### Offline evidence is not runtime policy

Hints, known solutions, exact labels, census winners, historical costs, family outcomes, traces, and profiles may explain or label research. They may not become exact-level lookup or hidden per-level steering in the cold solver. See [`solver-level-blindness.md`](solver-level-blindness.md).

### Level-blindness is not generalization

A policy can be level-blind and still be overfit to repeatedly mined Corpus 2 or a narrow generator. Same-generator fresh data confirms a sample; materially different construction/source is required for broader distributional transfer claims.

### Preserve independent units

Variant siblings, common generator batches, repeated hint rediscoveries, and multiple rows from one level are not automatically independent. Hold out whole families/parents where family dependence matters.

### Freshness is evidence-specific

`latest` files are convenience pointers, not proof that the underlying evidence matches current code. Inspect commit/protocol metadata. Technique capability can drift under heuristic changes; rebuild/rejoin the capability map after meaningful solver changes before relying on old support classes.

### Normalize historical identities

Stage/action/routing/config names changed during the naming cleanup. Use owning normalizers and the post-naming bridge when old evidence is involved; do not join mixed-era strings by hand.

## Asset maintenance

When a durable evidence family changes, update [`solver-research-data-assets.json`](solver-research-data-assets.json) rather than adding parallel prose here. A useful registry entry states:

- stable asset ID and status;
- grain/independent unit;
- locations and owning authorities;
- compact query entry points;
- valid join keys and related assets;
- evidence roles/affordances;
- leakage, freshness, selection, or interpretation caveats.

Add prose here only for a cross-asset rule that cannot be expressed clearly in the registry.
