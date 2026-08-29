# Naming-cleanup Phase 8 execution record

Status: **not started**. Phase 8 is a milestone composed of serial implementation batches. Do not implement more than one batch on an unmerged branch.

Authority for exact mappings: [`naming-cleanup-plan.md`](../naming-cleanup-plan.md) and [`naming-cleanup-ledger.json`](../naming-cleanup-ledger.json).

Use [`naming-cleanup-phase-record-template.md`](../naming-cleanup-phase-record-template.md) to create one evidence record per batch when the batch starts.

## Batch sequence

| Batch | Scope | Compatibility/risk focus | Status |
| --- | --- | --- | --- |
| **8A** | Hint-path validator; CP-SAT reference naming/workflow; GHA result retrieval; offline replay harness and producer/consumer terminology | command aliases, workflow identities, real runtime/path verification | not started |
| **8B** | Known-solution-prefix survival doc/module/types/analyzer/collectors and former lineage/atlas pilot names | module/type propagation, generated/research consumers, frozen historical lineage evidence | not started |
| **8C** | Durable research command names: repair search runner/worker, producer-population, residual-interface, rollback census, symmetry repair seed, restart/continuation, candidate eligibility/participation audit | real CLI/runtime coverage, parent/worker wiring, package aliases | not started |
| **8D** | Technique-census analysis doc/tool and equal-work analyzer | generated census readers, package/docs/tooling references, historical census evidence | not started |
| **8E** | Prune-gap label collection formerly called atlas sweep, including workflow/display/concurrency names | workflow command/path/artifact identities, frozen old runs | not started |
| **8F** | Variant-family dataset formerly called trove: workflow, manifest/shard/merge/doctor tools, package alias, env var, branch local | **high-risk external env compatibility**, workflow/tool family propagation | not started |
| **8G** | Solver diagnostics formerly audit-export, generated field dual-read/single-write, workflow/package alias; legacy-latency portfolio report/replay names | generated-report compatibility boundary, current writer single-write, surfaced CLI aliases | not started |
| **8H** | Remaining low-risk semantic qualification sweep: naked profile/fingerprint/family/residual, winning-path archaeology, Phase-8-wide residue/authority closeout | current docs/exported APIs only; frozen history stays frozen | not started |

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
