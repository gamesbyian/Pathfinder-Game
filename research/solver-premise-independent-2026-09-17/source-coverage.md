# Independent peer-map source coverage

Date: 2026-09-17  
Branch: `chatgpt/premise-map-independent-peer-map-2026-09-17`

This ledger records what the quarantined independent construction actually inspected. It is a coverage record, not a claim that every file in each region was read.

## Independent-lineage material

- `research/solver-premise-independent-2026-09-17/field-notes.md`
- `research/solver-premise-independent-2026-09-17/pass-architecture-evidence.md`
- `research/solver-premise-independent-2026-09-17/pass-history-negative-space.md`
- governing brief `docs/independent-peer-map-construction-brief.md`

Role: seed the continuation with conclusions already derived independently from underlying evidence, while preserving their caveats and remaining-work list.

## Production solver state and transition representation

- `modules/solver/search-state.ts`
- `modules/solver/nogood-cache.ts`
- `modules/solver/topology.ts`
- `modules/solver/joint-obligation-propagation.ts`
- `modules/solver/known-solution-prefix-survival.ts`

Conceptual material recovered:

- represented history as an epistemic boundary;
- multiple non-equivalent notions of state relatedness;
- empirical failure memory versus logical proof;
- relational obligation feasibility;
- topology's distinct logical/predictive/diagnostic uses;
- witness-lineage survival and support extinction.

## Orchestration, defaults, work, and scheduling

- `modules/solver/stage-budget.ts`
- `modules/solver/work-meter.ts`
- `modules/solver/orchestration.ts`
- `modules/solver/ablation-config.ts`
- current contracts in `docs/solver-budget-determinism.md`
- `docs/solver-scheduling-policy.md`
- current research priority authority `docs/solver-optimization-workstreams.md`

Conceptual material recovered:

- canonical cross-technique work versus nodes/wall time;
- base versus total work;
- deadline censoring;
- retry distinctness;
- stage eligibility and reserve placement as algorithmic semantics;
- default polarity as a capability definition;
- intrinsic capability versus portfolio value and displacement.

## Negative-result and premise-check reports

- `reports/2026-08-07-repair-nogood-cache.md`
- `reports/2026-08-24-learned-failure-certificate-audit.md`
- joint-obligation pilot evidence referenced by code and the independent checkpoint
- resumability and restart/continuation evidence reconstructed by the existing independent lineage from underlying reports before this continuation

Conceptual material recovered:

- negative-result scope must follow mechanism/population/budget/architecture;
- a pessimistic prior can fail when transferred across mechanically different populations;
- learned reasons have different economics from direct prunes;
- tested descendants can close while semantic parents remain open;
- resumability feasibility is distinct from scheduler value.

## Capability measurement and experiment plumbing

- `scripts/level-blind-capability-worker.mjs`
- `scripts/level-blind-capability-sweep.mjs`
- `scripts/solver-worker-pool.mjs`
- `scripts/portfolio-solve-sweep-lib.mjs`
- `scripts/stress/feature-solvability-analysis.mjs`

Conceptual material recovered:

- level blindness as enforced information flow;
- task identity versus completion order;
- run identity requires population/config/commit/budget provenance;
- persisted action identity has historical compatibility constraints;
- observational feature enrichment is not causal explanation.

## Persistence and corpus surfaces

- `scripts/level-data-io.mjs`
- sampled `data/levels.json`
- corpus and witness assumptions already reconstructed in the independent lineage
- stress-analysis tooling around corpus-wide features and baselines

Conceptual material recovered:

- canonical puzzle inputs and durable research artifacts are intentionally separable;
- provenance/hints can be retained by the research system while withheld from a cold solver;
- corpus composition/base rates are part of interpretation.

## Historical and vocabulary handling

The independent lineage used current naming only as a translation layer and explicitly preserved distinctions that older vocabulary blurred, including:

- base/total work and historical millisecond-shaped budget names;
- state merge versus retention policies;
- current versus legacy stage/config identity;
- historical corpus terminology.

A known repository-history limitation is that pre-consolidation chronology for some tracked files cannot be reconstructed from git history alone. Historical reports and embedded timestamps therefore remain part of the evidence base.

## Coverage by conceptual function

| Function | Coverage |
|---|---|
| Encode / state | strong |
| Derive / feasibility | strong, sampled across local/topological/relational forms |
| Generate | moderate |
| Reject | strong |
| Prefer / score | moderate; many descendants intentionally not mapped individually |
| Retain | moderate-strong |
| Remember | strong for local failure/witness/frontier concepts |
| Allocate | strong |
| Select / route | strong at architectural level |
| Transfer | sparse in the repository and represented mainly as open questions |
| Recognize / terminate | moderate |
| Measure | strong |
| Infer from evidence | strong |
| Worker/process substrate | moderate after hostile pass |
| Persistence/provenance | moderate after hostile pass |
| Generator construction | partial |

## Saturation interpretation

Repeated reading in prune, ablation, and orchestration regions increasingly produced descendants of already-recovered parent premises rather than new conceptual regions. That is evidence of local saturation, not proof of repository-wide completeness.

The worker/persistence hostile pass did produce new parent concepts, which is why construction did not stop at the first algorithm-centric checkpoint.

## Deliberate aggregation

The map does not allocate a top-level node to every prune, score profile, retry flag, mechanic, experiment, or queue item. A descendant is promoted to its own node when it exposes at least one of:

- a distinct semantic parent question;
- a distinct epistemic authority;
- a distinct evidence-scope boundary;
- a distinct information-flow boundary;
- a distinct architecture-dependent meaning;
- an unresolved tension that would disappear if folded into a broader label.

This keeps the object conceptual rather than turning it into a repository inventory.

## Known incomplete regions

- complete deleted-code archaeology;
- exhaustive generator implementation archaeology;
- cross-process serialization of live search continuation;
- every mechanic-specific historical negative;
- every workflow and evidence validator.

These are explicit blind spots, not silently claimed coverage.
