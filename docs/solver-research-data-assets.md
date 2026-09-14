<!-- agent-context-budget: warn=9000 max=12000 -->
# Solver research data assets

> **Status:** human evidence-topology guide.
> **Structured detail:** [`solver-research-data-assets.json`](solver-research-data-assets.json) owns the per-asset locations, authorities, query entry points, join keys, relationships, affordances, roles, and caveats.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns what runs next.
> **Method:** [`solver-research-operating-model.md`](solver-research-operating-model.md) and [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) own evidence/selection/holdout discipline.
> **Capability memory:** [`solver-capability-memory.md`](solver-capability-memory.md) owns the offline distinction between promotion disposition and complementary capability.

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
2. Query assets that could **falsify, stratify, contextualize, independently challenge, or expose complementary prior capability relevant to** the premise.
3. Name the join keys and independent unit before writing an ad hoc join.
4. Preserve **generation ancestry, later population-selection history, prior decision use, and exact population identity/revision** when they affect interpretation. A corpus filename does not supply these automatically.
5. For solution-profile evidence, state which axes are actually supported by the observed sample and whether chronology is complete enough for any longitudinal claim.
6. Prefer an existing evidence join over generation when it can answer the gate.
7. Record materially relevant assets considered and rejected when that prevents rediscovery.

Do not mine every available axis. Searching many assets/features creates selection pressure; discovered relationships are development evidence until appropriately confirmed. The same applies to mining many historical solver regimes or failed treatments through capability memory.

## Evidence topology

| Asset family | Natural grain | Main question |
|---|---|---|
| Published/stress levels | level, source/generator/selection history | What population/construction/selection process is this? |
| Hint provenance | path discovery | Who/what found this path, under which config/work/context? |
| Structural level fingerprint | level structure | Are observations from the same structural revision? |
| Solution-space profiles | level × provenance source × sample support | What do the **known sampled solutions** look like and how diverse are they? |
| Technique census/capability map | level × technique/config | What isolated capability exists at measured dose? |
| Production benchmarks | run × level | What does the real solver solve and spend? |
| Solver capability memory | baseline × candidate policy × level | Which complementary capabilities were demonstrated or displaced, and how much overlap survives against a named residual? |
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
- **census × solution profile:** technique response versus sampled known-solution structure, with profile-axis support exposed;
- **census × static descriptors:** technique response versus legal level features;
- **census × variants:** controlled transformations that flip technique response;
- **census × traces:** outcome differences versus actual behavioral differences;
- **benchmark × lifecycle:** solved/unsolved outcome versus where work was spent;
- **benchmark/history × capability memory:** promoted/rejected policy churn, historical gains, and current-residual overlap without treating old wins as current capability;
- **capability memory × traces/variants/static descriptors:** turn complementary policy basins into generic mechanism/selector premises rather than exact-level routing;
- **hint provenance × profile/census:** whether known-solution structure is confounded by how solutions were discovered;
- **structural fingerprint × persisted evidence:** whether historical observations still refer to the same puzzle revision;
- **exact labels × traces/prefix survival:** whether a localized search failure discarded feasible material;
- **manifests × any decision-bearing run:** whether compared arms actually used comparable code/data/protocol.

These are opportunities, not mandatory joins. Use the smallest join that answers the current gate.

## Three different fingerprints

Do not collapse these:

1. **Structural level fingerprint** (`modules/domain/level-fingerprint.ts`): versioned puzzle-structure identity/deduplication.
2. **Solution-space profile/fingerprint** (`solver-solution-profile.md`): offline summary of sampled known accepted paths.
3. **Solver determinism fingerprint** (`scripts/solver-fingerprint.mjs`): versioned execution/search-behavior regression signature.

Solver determinism fingerprints are schema-bound evidence. Schema v2 includes canonical action/stage/seed identity; v1 and v2 are not interchangeable baselines. Only the first fingerprint family is a structural identity primitive. None permits per-level production steering from historical results.

## Scientific boundaries

### Offline evidence is not runtime policy

Hints, known solutions, exact labels, census winners, historical costs, family outcomes, traces, profiles, capability-memory signatures, and historical gain/loss IDs may explain or label research. They may not become exact-level lookup or hidden per-level steering in the cold solver. See [`solver-level-blindness.md`](solver-level-blindness.md).

A historical capability signature is especially easy to overread: intersection with today's residual is a **nomination**, not proof that the historical policy still solves under current code/budget semantics. `scripts/solver-capability-memory.mjs` labels this distinction explicitly.

### Generation provenance is not selection provenance

A row can be generated solver-blind and later enter a corpus because of solver outcome, curation, residual membership, difficulty, novelty, or another measured response. Preserve both histories. Current C1 is 23 surviving old A-F rows plus 79 random-generator rows selected for historical solver success; whole C1 is therefore not cross-generator transfer against C2. Current C2 combines 328 survivors from the historical solver-negative complement with 1,372 later replacements; it remains a strong development/capability laboratory, not one prospective untouched draw. See [`solver-corpus-selection-provenance.md`](solver-corpus-selection-provenance.md).

### Level-blindness is not generalization

A policy can be level-blind and still be overfit to repeatedly mined Corpus 2 or a narrow generator. Same-generator fresh data confirms a sample; materially different construction/source is required for broader distributional transfer claims. A residual or participant cohort supports a conditional claim about that selected population, not unconditional mechanic prevalence.

### Solution profiles are sample profiles

Profile fields summarize the stored known-solution sample with explicit support. Missing/unsupported axes stay unavailable rather than becoming zero-valued evidence. `observedSingleOrder` is sample agreement, not structural rigidity. `hasExhaustiveSearchEvent` says an exhaustive-search event occurred under its recorded local conditions; it does not prove unrestricted whole-puzzle enumeration or complete persistence. Saturation/plateau comparisons require adequate dated chronology. Sparse nearest-profile identity remains exploratory even under schema v3 and should be independently calibrated before any decision-bearing similarity claim. See [`solver-solution-profile.md`](solver-solution-profile.md) and the [`2026-09-13 audit`](../reports/2026-09-13-solution-profile-resource-audit-001.md).

### Preserve independent units

Variant siblings, common generator batches, repeated hint rediscoveries, and multiple rows from one level are not automatically independent. Hold out whole families/parents where family dependence matters.

### Missing provenance is unknown

Do not infer a negative from an absent join. In particular, technique-census production-baseline status is tri-state: `true`, `false`, or `unknown`. A missing/failing baseline join must remain `unknown`; it cannot populate a “production-unsolved” or frontier cohort. The retained canonical census affected by the 2026-09-10 audit had a valid frozen baseline and required no regeneration.

Capability-memory row joins follow the same rule: a candidate report that omits a baseline level has **no observation** for that level; absence is not candidate failure.

### Hint provenance is query-dependent

The same hint/provenance record can be strong evidence for one research question and inadmissible for another. Declare the purpose before consuming it: `positive-oracle`, `solution-atlas`, `current-production-capability`, `technique-performance`, or `longitudinal-process`. Use the shared applicability and dependency-stratum helpers exposed by `hint-query --purpose=...` and the provenance evidence report rather than inventing a local “trusted hint” predicate.

A referee-valid path remains useful oracle/atlas material regardless of producer. Variant replay, witnesses, external/guided/isolated discoveries and old solver regimes may be excellent history or basin evidence while providing no proof of current cold capability. Missing legacy booleans remain unknown; solver age alone does not prove staleness; and raw rediscovery-event count is not independent support. Technique performance requires the originating attempted population and comparable work, not a success-selected sidecar event. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) and the [`hint-provenance relevance audit`](../reports/2026-09-11-hint-provenance-evidence-relevance-audit-001.md).

### Freshness and reuse are evidence-specific

`latest` files are convenience pointers, not proof that the underlying evidence matches current code. Inspect commit/protocol metadata. Technique capability can drift under heuristic changes; rebuild/rejoin the capability map after meaningful solver changes before relying on old support classes.

Reusable benchmark/census rows need compatible meaning-changing provenance, not merely the same level id: solver/fingerprint schema, corpus/content identity, scheduler/config/flags, deterministic budget semantics, and relevant execution mode. Across-level parallel runs must not mix partially reused rows with newly executed rows when that would change the contention regime.

Historical capability signatures may remain useful after code drift as forensic nominations, but they must be labelled historical and reconciled before any current-capability claim. After a material production promotion or provenance reinterpretation changes residual membership, rebuild residual-derived views and current-state counts rather than carrying forward stale class sizes.

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

Capability memory is intentionally a **generated/derived interface**, not another authoritative outcome database. Keep source experiment reports/manifests as provenance, rebuild the view against the baseline relevant to the current question, and record a dated report only when the derived analysis informs a decision.

Add prose here only for a cross-asset rule that cannot be expressed clearly in the registry.
