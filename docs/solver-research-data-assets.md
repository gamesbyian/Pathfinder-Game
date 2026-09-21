# Solver research data assets

> **Status:** human evidence-topology guide.
> **Structured detail:** [`solver-research-data-assets.json`](solver-research-data-assets.json) owns per-asset locations, authorities, query entry points, join keys, relationships, roles, and caveats.
> **Resource contract:** [`solver-research-resource-contract.md`](solver-research-resource-contract.md) defines catalogue-grade versus audit-grade resource semantics; [`solver-research-resource-contract-audits.json`](solver-research-resource-contract-audits.json) contains audit-grade declarations keyed to registry IDs.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Method:** [`solver-research-operating-model.md`](solver-research-operating-model.md) and [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

This file explains safe cross-asset use; the JSON registry owns asset detail. Human/editor-parent contrasts remain variant-family data; [`human-parent-contrast-research.md`](human-parent-contrast-research.md) owns their interpretation.

## Cheap discovery first

```bash
node scripts/research-asset-query.mjs --query=<term>
node scripts/research-status-index.mjs --compact --query=<term>
node scripts/tooling-census.mjs --compact --query=<term>
```

Use `research-asset-query --id=<asset-id>` for exact registry detail; `--full` includes the complete declaration.

Asset/interface existence does not prove a historical evidence instance survives. A `generated-interface` means the shape can be produced/queried; harvester participation means only that the run is inspected for supported evidence classes. For row-level reconstruction, verify that the needed source is merged/canonical, durably bundled, branch/artifact-bound, or deterministically recomputable.

## Required evidence preflight

Before broad compute or a new dataset:

1. Read the current workstream/gate.
2. Query assets that could falsify, stratify, contextualize, independently challenge, or expose complementary prior capability.
3. Name join keys and independent unit before ad hoc joins.
4. Preserve exact population revision, generation ancestry, later selection history, and prior decision use when they affect interpretation.
5. For solution profiles, state which axes are supported by the observed sample and whether chronology supports longitudinal claims.
6. Prefer an existing evidence join over generation when it answers the gate.
7. Record materially relevant rejected assets when that prevents rediscovery.

Broad asset mining creates selection pressure; discoveries remain development evidence until independently checked.

## Evidence topology

| Asset family | Natural grain | Main question |
|---|---|---|
| Published/stress levels | level × source/generator/selection | What population and selection process is this? |
| Hint provenance | path discovery | Who/what found this path, under which context? |
| Hint discovery process | run × parent × exact stored path | What failed/ran before this accepted path was found under a named experiment contract? |
| Hint harvest selection | source run × harvest funnel | Which solved candidate rows entered, duplicated, or were quarantined from the hint store? |
| Structural fingerprint | level structure | Is persisted evidence about the same revision? |
| Solution profiles | level × provenance source × sample support | What do known sampled solutions look like? |
| Technique census/capability map | level × technique/config | What isolated capability exists at measured dose? |
| Production benchmarks | run × level | What does the real solver solve/spend? |
| Capability evidence | baseline × candidate × level | Which historical capabilities were demonstrated/displaced and still overlap a named residual? |
| Lifecycle telemetry | level × stage/action/attempt | What did production reach, starve, exhaust, skip, or solve with? |
| Known-prefix survival | level × beam boundary | Where did labelled viable support disappear? |
| Operational traces | encountered decision | How did searches diverge? |
| Exact/reference labels | level × state/prefix | Is selected material feasible? |
| Offline replay atlas | labelled state × probe | Can a candidate reasoner explain/use exact labels? |
| Variant families, including human/editor-parent contrasts | parent × controlled transform | Which controlled structural changes flip behavior? |
| Experiment manifests | run/arm/shard | Which code/data/protocol produced an observation? |
| Raw logs/baselines | raw run/snapshot | What happened before interpretation? |
| Research-status index | report/workstream/experiment | Has this been tested/renamed? |
| Static descriptors | level × legal feature | Which geometry/mechanics stratify an effect? |
| Compact failure response | run × parent × attempt/stage | Participation, dose, censoring, termination, solved controls. |
| Search-loss evidence | run × parent × selected event | Where did search lose or retain material, including solved-run controls? |
| Capability-invention demand | parent × first-loss diagnosis | Is this miss HARVEST, EXTENSION/INVENTION, or still unresolved? |

### Exact/reference evidence graduation

Generic exact/reference workflows are acquisition surfaces, not universal archives. When selected exact/reference labels become a reusable research input rather than a one-off diagnostic, preserve the smallest purpose-specific labelled dataset/report needed for that use. Keep case/source identity, model/probe identity, non-collapsed LIVE/DEAD/UNKNOWN/UNSUPPORTED or timeout/abstention semantics, source population/provenance, and witness/referee information where emitted. Existing tracked explicit-prefix datasets are the precedent. Do not infer that every output of the generic CP-SAT/reference workflow is durably retained merely because the `exact-reference-labels` interface is listed here.

## High-value joins

Use the smallest useful join: failure response × census/benchmarks, provenance × profiles/census, hint process × failure response/manifests, harvest selection × provenance/manifests, exact labels × traces/prefix survival, and manifests × runs. Parent joins use parents as independent units.

### Four-resource lineage recipe

For corpus × family × provenance × profile questions, treat the join as one lineage: corpus selection defines the population; family identity the intervention; provenance how paths entered the sample; the Solution Profile summarizes it. One replayed path does not become multiple independent observations because it appears in several resources.

The September 14 census found every current published/C1/C2 parent replay-touched and replay as the earliest dated discovery for ~75% of stored paths. When family effects are the question, distinguish **replay-touched** from **replay-first** and prefer non-replay-first profile evidence, or label the full profile downstream/dependent. Full profiles remain valid descriptions of the current known sample.

Use `scripts/cross-resource-observability-audit.mjs` when this ancestry matters. Missing/partial family mounts are unavailable, not negative evidence.

## Three different fingerprints

1. **Structural level fingerprint** (`modules/domain/level-fingerprint.ts`): puzzle-structure identity/deduplication.
2. **Solution-space profile/fingerprint** (`solver-solution-profile.md`): offline summary of sampled accepted paths.
3. **Solver determinism fingerprint** (`scripts/solver-fingerprint.mjs`): execution/search-behavior regression signature.

Only structural fingerprints identify puzzle structure; fingerprint/profile identities never permit per-level production steering.

## Scientific boundaries

### Offline evidence is not runtime policy

Hints, known solutions, exact labels, census winners, historical costs, family outcomes, traces, profiles, capability-evidence signatures, search-loss capsules, and historical gain/loss IDs are offline evidence. They may not become exact-level lookup/hidden steering in the cold solver. Historical capability intersecting today's residual is a **nomination**, not current proof. See [`solver-level-blindness.md`](solver-level-blindness.md) and [`solver-capability-evidence.md`](solver-capability-evidence.md).

### Generation provenance is not selection provenance

Solver-blind generation does not make later corpus membership independent. C1/C2 carry later solver-outcome selection history, so neither filename implies untouched transfer evidence. See [`solver-corpus-selection-provenance.md`](solver-corpus-selection-provenance.md).

Residual/participant cohorts answer the conditional question they were selected for, not unconditional prevalence. Level-blindness does not establish sampling independence; human/editor siblings remain correlated development evidence.

### Solution profiles are sample profiles

Solution profiles summarize stored samples with explicit support. Missing axes stay unavailable; `observedSingleOrder` is sampled agreement; `hasExhaustiveSearchEvent` is not whole-space enumeration. See [`solver-solution-profile.md`](solver-solution-profile.md).

### Independence, missingness, and hint provenance

Variant siblings, generator batches, rediscoveries, and repeated level rows are not automatically independent. Missing provenance is unknown, not failure.

Declare the evidence purpose before consuming provenance: `positive-oracle`, `solution-atlas`, `current-production-capability`, `technique-performance`, or `longitudinal-process`. Use shared applicability/dependency-stratum helpers rather than a local “trusted hint” predicate.

A referee-valid path remains useful oracle/atlas evidence regardless of producer. Variant replay, witnesses, external/guided/isolated discoveries and old regimes can be valuable history while proving nothing about current cold capability. Missing legacy booleans remain unknown; age alone does not prove staleness; rediscovery-event count is not independent support. Technique performance requires the attempted population, failures, comparable `workSpent`, and protocol identity. Run-linked discovery-process evidence can recover pre-success failed attempts for exact stored paths without bloating Hint records; harvest-selection manifests explain how already-solved candidates entered the store but are not attempted-population denominators. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

### Freshness and reuse are evidence-specific

`latest` is not proof of compatibility. Reusable rows need matching code/schema, population/content, scheduler/config, budget, and execution semantics.

Historical capability may survive code drift as forensic nomination, but current-capability claims require reconciliation. After a material promotion/provenance reinterpretation changes residual membership, rebuild residual-derived views/counts.

## Asset maintenance

When a durable evidence family changes, update [`solver-research-data-assets.json`](solver-research-data-assets.json), not parallel prose. Registry entries should own stable ID/status, grain/independent unit, locations/authorities, query entry points, join keys, related assets, evidence roles, and leakage/freshness/selection caveats. Human/editor contrasts stay under `variant-family-data` unless they create a genuinely separate persisted interface.

When a focused resource audit changes scientific semantics, update its audit-grade declaration in [`solver-research-resource-contract-audits.json`](solver-research-resource-contract-audits.json) and satisfy [the closeout gate](solver-research-resource-contract.md). Never fill unknown fields merely to mark a resource audited.

Capability evidence is derived, not an outcome authority. Keep source provenance and rebuild against the baseline relevant to the question.

Add prose only for cross-asset rules not clear in the registry or resource contract.
