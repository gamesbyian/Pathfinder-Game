<!-- agent-context-budget: warn=9000 max=12000 -->
# Solver research data assets

> **Status:** human evidence-topology guide.
> **Structured detail:** [`solver-research-data-assets.json`](solver-research-data-assets.json) owns per-asset locations, authorities, query entry points, join keys, relationships, roles, and caveats.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Method:** [`solver-research-operating-model.md`](solver-research-operating-model.md) and [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

Do not duplicate the machine registry here. This file explains safe cross-asset use. The older catalogue is frozen at [`archive/snapshots/solver-research-data-assets-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-research-data-assets-2026-09-04-pre-consolidation.md).

Human/editor-parent controlled contrasts use the existing **variant-family data** asset contract rather than creating a parallel evidence store. Their source/selection interpretation is owned by [`human-parent-contrast-research.md`](human-parent-contrast-research.md); generated descendants still join through normal parent/variant identity and provenance.

## Cheap discovery first

```bash
node scripts/research-asset-query.mjs --query=<term>
node scripts/research-status-index.mjs --compact --query=<term>
node scripts/tooling-census.mjs --compact --query=<term>
```

Use `research-asset-query --id=<asset-id>` for exact registry detail.

## Required evidence preflight

Before broad compute or a new dataset:

1. Read the current workstream/gate.
2. Query assets that could falsify, stratify, contextualize, independently challenge, or expose complementary prior capability.
3. Name join keys and independent unit before ad hoc joins.
4. Preserve exact population revision, generation ancestry, later selection history, and prior decision use when they affect interpretation.
5. For solution profiles, state which axes are supported by the observed sample and whether chronology supports longitudinal claims.
6. Prefer an existing evidence join over generation when it answers the gate.
7. Record materially relevant rejected assets when that prevents rediscovery.

Mining many assets/features or historical regimes creates selection pressure; discovered relationships are development evidence until independently checked as appropriate.

## Evidence topology

| Asset family | Natural grain | Main question |
|---|---|---|
| Published/stress levels | level × source/generator/selection | What population and selection process is this? |
| Hint provenance | path discovery | Who/what found this path, under which context? |
| Structural fingerprint | level structure | Is persisted evidence about the same revision? |
| Solution profiles | level × provenance source × sample support | What do known sampled solutions look like? |
| Technique census/capability map | level × technique/config | What isolated capability exists at measured dose? |
| Production benchmarks | run × level | What does the real solver solve/spend? |
| Capability memory | baseline × candidate × level | Which historical capabilities were demonstrated/displaced and still overlap a named residual? |
| Lifecycle telemetry | level × stage/action/attempt | What did production reach, starve, exhaust, skip, or solve with? |
| Known-prefix survival | level × beam boundary | Where did labelled viable support disappear? |
| Operational traces | encountered decision | How did searches diverge? |
| Exact/reference labels | level × state/prefix | Is selected material feasible? |
| Offline replay atlas | labelled state × probe | Can a candidate reasoner explain/use exact labels? |
| Variant families, including human/editor-parent contrasts | parent × controlled transform | Which controlled structural changes flip behavior, and does the relation survive across whole parent sources? |
| Experiment manifests | run/arm/shard | Which code/data/protocol produced an observation? |
| Raw logs/baselines | raw run/snapshot | What happened before interpretation? |
| Research-status index | report/workstream/experiment | Has this been tested/renamed? |
| Static descriptors | level × legal feature | Which geometry/mechanics stratify an effect? |

## High-value joins

Useful joins include census × lifecycle, census × profiles, census × variants/traces/static descriptors, benchmark × lifecycle, benchmark/history × capability memory, hint provenance × profile/census, structural fingerprint × persisted evidence, exact labels × traces/prefix survival, and manifests × decision-bearing runs. Human-parent descendants use the same variant-family joins; preserve parent source/exposure and analyze whole parents when the claim needs independent units. These are opportunities, not mandatory ritual. Use the smallest join that answers the gate.

## Three different fingerprints

1. **Structural level fingerprint** (`modules/domain/level-fingerprint.ts`): puzzle-structure identity/deduplication.
2. **Solution-space profile/fingerprint** (`solver-solution-profile.md`): offline summary of sampled accepted paths.
3. **Solver determinism fingerprint** (`scripts/solver-fingerprint.mjs`): execution/search-behavior regression signature.

Solver fingerprints are schema-bound; v1/v2 are not interchangeable. Only structural fingerprints identify puzzle structure. None permits per-level production steering from historical results.

## Scientific boundaries

### Offline evidence is not runtime policy

Hints, known solutions, exact labels, census winners, historical costs, family outcomes, traces, profiles, capability-memory signatures, and historical gain/loss IDs are offline evidence. They may not become exact-level lookup/hidden steering in the cold solver. Historical capability intersecting today's residual is a **nomination**, not current proof. See [`solver-level-blindness.md`](solver-level-blindness.md) and [`solver-capability-memory.md`](solver-capability-memory.md).

### Generation provenance is not selection provenance

Solver-blind generation does not make later corpus membership independent. Current C1 is 23 surviving old A-F rows plus 79 random-generator rows selected for historical solver success, so whole C1 is not cross-generator transfer against C2. Current C2 combines 328 survivors from a historical solver-negative complement with 1,372 later replacements; it is a strong development laboratory, not one prospective untouched draw. See [`solver-corpus-selection-provenance.md`](solver-corpus-selection-provenance.md).

A residual or participant cohort supports the conditional question it was selected for, not unconditional mechanic prevalence. Level-blindness alone does not establish sample or distributional generalization.

Human/editor-parent generation adds a genuinely different **parent source** from the procedural stress generators, but it does not erase selection. Descendants of one parent remain correlated, preserved witnesses prove solvability only, and a parent family whose outcomes influenced treatment design becomes development evidence for descendants of that decision. See [`human-parent-contrast-research.md`](human-parent-contrast-research.md).

### Solution profiles are sample profiles

Profile fields summarize stored known solutions with explicit support. Missing/unsupported axes remain unavailable. `observedSingleOrder` is sampled agreement, not structural rigidity. `hasExhaustiveSearchEvent` records an event, not unrestricted whole-space enumeration/persistence. Saturation/plateau claims require adequate dated chronology. Sparse nearest-profile identity is exploratory even under schema v3 and needs independent calibration before decision-bearing use. See [`solver-solution-profile.md`](solver-solution-profile.md) and the [`profile audit`](../reports/2026-09-13-solution-profile-resource-audit-001.md).

### Independence, missingness, and hint provenance

Variant siblings, generator batches, rediscoveries, and multiple rows from one level are not automatically independent; hold out whole families/parents when needed. For human/editor controlled contrasts, the parent family is the usual independent unit and parent exposure must be explicit. Missing provenance is unknown: an absent baseline/capability-memory row is no observation, not failure.

Declare the evidence purpose before consuming provenance: `positive-oracle`, `solution-atlas`, `current-production-capability`, `technique-performance`, or `longitudinal-process`. Use shared applicability/dependency-stratum helpers rather than a local “trusted hint” predicate.

A referee-valid path remains useful oracle/atlas evidence regardless of producer. Variant replay, witnesses, external/guided/isolated discoveries and old regimes can be valuable history while proving nothing about current cold capability. Missing legacy booleans remain unknown; age alone does not prove staleness; rediscovery-event count is not independent support. Technique performance requires the attempted population, failures, comparable `workSpent`, and protocol identity. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

### Freshness and reuse are evidence-specific

`latest` is a convenience pointer, not proof of compatibility. Reusable benchmark/census rows need matching meaning-changing provenance: solver/fingerprint schema, corpus/content identity, scheduler/config/flags, deterministic budget semantics, and execution mode. Across-level parallel comparisons must not mix incompatible contention regimes.

Historical capability may survive code drift as forensic nomination, but current-capability claims require reconciliation. After a material promotion/provenance reinterpretation changes residual membership, rebuild residual-derived views/counts.

## Asset maintenance

When a durable evidence family changes, update [`solver-research-data-assets.json`](solver-research-data-assets.json), not parallel prose. Registry entries should own stable ID/status, grain/independent unit, locations/authorities, query entry points, join keys, related assets, evidence roles, and leakage/freshness/selection caveats.

Human/editor controlled contrasts intentionally remain under the existing `variant-family-data` asset rather than minting a new asset ID: the generated records/manifests use the same family identity/provenance contract. Add a new registry asset only if the apparatus later creates a genuinely separate persisted evidence interface.

Capability memory is a generated/derived interface, not another authoritative outcome database. Keep source reports/manifests as provenance and rebuild the view against the baseline relevant to the current question.

Add prose here only for a cross-asset rule that cannot be expressed clearly in the registry.