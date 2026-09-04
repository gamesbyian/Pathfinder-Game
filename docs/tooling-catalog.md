# Tooling catalog

> **Purpose:** family-level map for existing developer/research tooling.
> **Named-tool discovery:** `node scripts/tooling-census.mjs --compact --query=<term>`.
> **Full pre-consolidation question→command catalogue:** [`archive/snapshots/tooling-catalog-2026-09-04-pre-consolidation.md`](archive/snapshots/tooling-catalog-2026-09-04-pre-consolidation.md).

Do not duplicate individual script aliases/options here. `tooling-census`, `package.json`, [`../scripts/README.md`](../scripts/README.md), and [`.github/workflows/README.md`](../.github/workflows/README.md) own executable discovery at different levels of detail.

## Choose the smallest tool first

Before adding or launching machinery:

1. Query the concept: `node scripts/tooling-census.mjs --compact --query=<term>`.
2. For solver research, read the current gate in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) and query prior evidence with `research-status-index --compact`.
3. Query existing research assets/joins with `node scripts/research-asset-query.mjs --query=<term>` before generating data.
4. Choose the smallest population/tool that can falsify or decide the gate.
5. Escalate only surviving questions to broader/sharded workflows.
6. Before inventing a script, run `node scripts/tooling-census.mjs --orphans` and inspect related current code/reports.

Tool choice does not determine evidence quality. Decision-bearing solver work still follows [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), and [`investigation-report-conventions.md`](investigation-report-conventions.md).

## Tool families

| Family | Front door | Use for |
|---|---|---|
| Validation | [`testing.md`](testing.md); `npm run ci:fast`, `npm run ci`, targeted `check:*` / `test:*` | Implementation correctness and finish-line gates |
| Solver direct/regression | query `solver:direct`, `solver:regression`, `solver:measure-speed` | Named-level debugging, published regression, pinned-work speed measurement |
| Solver research preflight | `npm run solver:experiment-preflight` | Treatment/control, corpus, selection, flags, work-envelope comparability |
| Stress/corpus | [`../data/stress/README.md`](../data/stress/README.md); query `stress` | Generation, benchmarks, reducers, lifecycle/failure diagnostics, profiles |
| Compact corpus discovery | `node scripts/corpus-query.mjs` | Corpus summaries, filters, deterministic samples; `--full` only for exact payloads |
| Technique capability/census | query `technique census`, `niches`, `relative advantage`, `temporal stability` | Isolated technique response, capability maps, niche/ownership analyses |
| Scheduling/portfolio | [`solver-scheduling-policy.md`](solver-scheduling-policy.md); query `static portfolio`, `equal work`, `reach` | Fixed-work portfolios, cap/tranche pricing, production reach/value joins |
| Operational comparison | [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md); query `paired trace`, `method probe`, `beam trace` | Bounded behavioral comparisons after outcome/work screening |
| Exact/reference | query `cpsat`, `reference`, `prefix survival`, `offline replay` | Feasibility labels, counterexamples, bounded exact diagnostics |
| Hints/provenance | `npx tsx scripts/hint-query.mjs --id=<ID>`; query `hint` | Hint generation, diversification, provenance/cost forensics |
| Variant/family | [`variant-level-research.md`](variant-level-research.md); query `family`; mount the off-main dataset with `--variant-family-dataset-root=<worktree>` | Family generation/index/query/coverage, parent replay, controlled transformations |
| Research status | `node scripts/research-status-index.mjs --compact --query=<term>` | Existing investigations, dispositions, gates, evidence pointers |
| Research assets | `node scripts/research-asset-query.mjs --query=<term>` | Existing evidence families, joins, boundaries, entry points |
| Raw artifact metadata | `node scripts/artifact-query.mjs [--query=...] [--role=...]` | Meaning/provenance of tracked raw artifacts |
| Completed GHA result retrieval | `npm run gha:fetch-result -- --run=<run-id>` | Standard result/manifest retrieval without enumerating shards |
| Tool inventory/health | `node scripts/tooling-census.mjs --compact`, `--health`, `--orphans` | Existing tool discovery, surfaced import health, unindexed specialists |
| Completed naming-cleanup status/history | `npm run naming:status -- --batch=<id>` | Completed Phase 0–15 state/history; not current naming authority |

Use `package.json` only when the compact tool query does not expose the alias/options you need. Use directory listings as a fallback, not a discovery default.

## Evidence boundaries

Keep these out of the tooling catalogue's command descriptions; the owning research docs are authoritative:

- **Level-blindness:** exact identity, saved hints, historical per-level outcomes/cost, winner configs, and variant outcomes cannot steer cold production policy. See [`solver-level-blindness.md`](solver-level-blindness.md).
- **Generalization:** fresh same-generator data is not automatically cross-generator transfer. See [`solver-evaluation-evidence.md`](solver-evaluation-evaluation-evidence.md).
- **Allocation:** compare techniques/treatments with `workSpent`; wall deadlines must be non-binding for deterministic search evidence. See [`solver-budget-determinism.md`](solver-budget-determinism.md).
- **Selection:** a population/feature/config selected after outcomes is development evidence until independently confirmed at strength proportional to selection pressure.
- **Known solutions/exact labels:** powerful offline diagnostics, forbidden as hidden runtime lookup.

A tool's presence does not imply an active hypothesis or a production recommendation.

## Remote execution

GitHub Actions is execution infrastructure. Use [`.github/workflows/README.md`](../.github/workflows/README.md) for workflow-specific inputs/sharding/retrieval. A successful workflow run is not by itself research evidence; reports/manifests must state the protocol, population, code/data ref, work envelope, and evidence role.

Prefer branch/PR execution. Merge experimental code to `main` only when the required workflow/data path genuinely cannot exercise the branch, and record why.

## Adding or changing tooling

Before adding a script/workflow:

- query existing tooling and orphan candidates;
- reuse shared loaders/parsers/workers/report contracts where they already model the operation;
- use [`change-recipes.md`](change-recipes.md) for telemetry/provenance/persistence/state/worker boundaries;
- expose a compact discovery surface if the new tool would otherwise require directory/package scans;
- document only durable family/contract guidance here, not a dated experiment narrative.

When a tool is renamed/retired, update its actual surfaces and tooling census inputs. Do not retain a second prose alias list in this file.
