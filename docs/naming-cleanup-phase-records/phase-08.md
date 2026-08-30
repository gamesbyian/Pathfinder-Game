# Naming-cleanup Phase 8 execution record

Execution state is **ledger-derived**, not maintained in this document. Run `npm run naming:status -- --phase=8`. This document owns Phase-8 batch partitioning/order and completion rules. Do not implement more than one batch on an unmerged branch.

Authority for exact mappings: [`naming-cleanup-plan.md`](../naming-cleanup-plan.md) and [`naming-cleanup-ledger.json`](../naming-cleanup-ledger.json).

Use [`naming-cleanup-phase-record-template.md`](../naming-cleanup-phase-record-template.md) to create one evidence record per batch when the batch starts.

## Immutable ledger assignment

Batch order is a dependency chain: **8A -> 8B -> 8C -> 8D -> 8E -> 8F -> 8G -> 8H**. The ledger checker rejects starting a later batch while any predecessor row is incomplete.

- **8A:** NC-P08-012, NC-P08-013, NC-P08-014, NC-P08-015, NC-P08-045, NC-P08-046, NC-P08-062, NC-P08-063, NC-P08-064, NC-P08-065, NC-P08-066, NC-P08-067, NC-P08-068
- **8B:** NC-P08-001, NC-P08-002, NC-P08-003, NC-P08-004, NC-P08-005, NC-P08-006, NC-P08-010, NC-P08-029, NC-P08-030, NC-P08-031, NC-P08-032
- **8C:** NC-P08-027, NC-P08-028, NC-P08-033, NC-P08-034, NC-P08-035, NC-P08-036, NC-P08-037, NC-P08-038, NC-P08-039, NC-P08-040, NC-P08-041, NC-P08-057
- **8D:** NC-P08-021, NC-P08-022, NC-P08-042
- **8E:** NC-P08-016, NC-P08-017, NC-P08-043, NC-P08-044
- **8F:** NC-P08-018, NC-P08-019, NC-P08-047, NC-P08-048, NC-P08-049, NC-P08-050, NC-P08-051, NC-P08-052, NC-P08-053, NC-P08-054
- **8G:** NC-P08-023, NC-P08-024, NC-P08-025, NC-P08-026, NC-P08-055, NC-P08-056, NC-P08-058, NC-P08-059, NC-P08-060, NC-P08-061
- **8H:** NC-P08-007, NC-P08-008, NC-P08-009, NC-P08-011, NC-P08-020

Use these IDs in PR descriptions and batch records. Old/new wording may be clarified later without changing row identity. Changing a row's batch assignment is a specification amendment, not an implementation convenience.

## Batch sequence

| Batch | Scope | Compatibility/risk focus |
| --- | --- | --- |
| **8A** | Hint-path validator; CP-SAT reference naming/workflow; GHA result retrieval; offline replay harness and producer/consumer terminology | command aliases, workflow identities, real runtime/path verification |
| **8B** | Known-solution-prefix survival doc/module/types/analyzer/collectors and former lineage/atlas pilot names | module/type propagation, generated/research consumers, frozen historical lineage evidence |
| **8C** | Durable research command names: repair search runner/worker, producer-population, residual-interface, rollback census, symmetry repair seed, restart/continuation, candidate eligibility/participation audit | real CLI/runtime coverage, parent/worker wiring, package aliases |
| **8D** | Technique-census analysis doc/tool and equal-work analyzer | generated census readers, package/docs/tooling references, historical census evidence |
| **8E** | Prune-gap label collection formerly called atlas sweep, including workflow/display/concurrency names | workflow command/path/artifact identities, frozen old runs |
| **8F** | Variant-family dataset formerly called trove: workflow, manifest/shard/merge/doctor tools, package alias, env var, branch local | **high-risk external env compatibility**, workflow/tool family propagation |
| **8G** | Solver diagnostics formerly audit-export, generated field dual-read/single-write, workflow/package alias; legacy-latency portfolio report/replay names | generated-report compatibility boundary, current writer single-write, surfaced CLI aliases |
| **8H** | Remaining low-risk semantic qualification sweep: naked profile/fingerprint/family/residual, winning-path archaeology, Phase-8-wide residue/authority closeout | current docs/exported APIs only; frozen history stays frozen |

## Serial merge rule

1. Create the batch branch from current `main`.
2. Create its checked-in batch execution record before implementation.
3. Implement and close out only that batch.
4. Merge it.
5. Verify current `main` and update this phase record's status table.
6. Only then create the next batch branch.

Do not stack 8B on an unmerged 8A branch, and so on. A batch may be split further if its impact map reveals multiple independent compatibility owners, but batches must not be recombined into a larger PR merely to reduce PR count.

## Phase 8 completion

`lastCompletedPhase` may advance to 8 only after:

- all eight batches are merged or explicitly superseded with evidence;
- every Phase-8 ledger row is `done` with all applicable verification dimensions resolved;
- each completed batch has a durable execution record;
- a final Phase-8 consumer-inward audit runs against current `main`, not a pre-merge branch;
- `npm run naming:surface-inventory -- --compact --phase=8` shows no unclassified live legacy surface;
- current docs/tooling/workflow authorities use canonical Phase-8 terminology;
- frozen historical evidence remains unchanged except for explicit compatibility readers.
