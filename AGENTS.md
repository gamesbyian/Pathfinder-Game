# Pathfinder agent guide

Compact router for coding/research agents. Load task-specific material, not accumulated repository history. [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) is optional detail for rare rules, solver gotchas, level facts, or provenance.

## Route by task

| Task | Read first |
|---|---|
| Product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| Naming / future rename | [`docs/naming-and-vocabulary.md`](docs/naming-and-vocabulary.md) + [`docs/change-recipes.md`](docs/change-recipes.md); Phase 0–15 is history, not a live phase queue |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver correctness/cache/prune | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md), [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Solver optimization/research | [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) and the specialist doc for the current gate |
| Solver research data / cross-evidence | `node scripts/research-asset-query.mjs --query=<term>`; open [`docs/solver-research-data-assets.md`](docs/solver-research-data-assets.md) only for topology/boundary guidance |
| Solver budgets/allocation | Workstreams, then [`docs/solver-scheduling-policy.md`](docs/solver-scheduling-policy.md); add [`docs/solver-budget-determinism.md`](docs/solver-budget-determinism.md) when work/budget semantics matter |
| Solver evaluation/generalization | [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md), then [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing tool/workflow | `node scripts/tooling-census.mjs --compact --query=<term>`; broader map: [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Completed GHA research run | `npm run gha:fetch-result -- --run=<run-id>` (or `--workflow=<name>`); enumerate jobs/shards only if the standard result is incomplete |
| Prior experiment | `node scripts/research-status-index.mjs --compact --query=<term>`, then matched report/current authority |
| Deferred/reopen idea | [`docs/solver-future-work.md`](docs/solver-future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md) |
| Validation choice | [`docs/testing.md`](docs/testing.md) |

[`docs/solver-research-post-naming-resumption.md`](docs/solver-research-post-naming-resumption.md) is conditional: use it when executing or translating frozen pre-cleanup solver evidence with historical names/contracts, not for ordinary current-head orientation.

## Working rules

1. Read the current authority and implementation before editing. Reports/archive/frozen migration evidence do not define current behavior or priority.
2. Treat the prompt as a goal, not an artificial file boundary. Do adjacent work when it materially completes the task; avoid unrelated cleanup.
3. Close the loop. If a bug invalidated evidence, rerun it; if a result changes guidance, update the owning authority.
4. Use cheap discovery before broad context: `tooling-census --compact`, `research-status-index --compact`, `research-asset-query.mjs`.
5. Audit cross-boundary propagation with [`docs/change-recipes.md`](docs/change-recipes.md).
6. Prefer branch/PR validation; do not use `main` as experiment scratch space unless the required execution path cannot exercise a branch and the reason is recorded.
7. Do not weaken validation to pass. Root-cause unexpected invariant, CSP, architecture, referee, or type failures.
8. Source is TypeScript; `domain/`, `runtime/`, and `solver/` stay browser-free; `engineState` mutations use state actions.

## Solver research invariants

- [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md) owns priority/state/gates. Specialist docs/reports refine a gate but do not reprioritize it.
- Use the smallest evidence that can decide the next gate. A clear negative closes the tested form unless materially new evidence changes the premise.
- Inventory existing provenance, census/capability, profiles, variants, lifecycle, traces, manifests, exact labels, and other evidence before generating more. Materially searched joins add selection pressure.
- Level-blindness is not generalization. Cold policy cannot use exact identity, saved hints, known winners, historical per-level outcomes/cost, per-level caches, or variant outcomes.
- Use `workSpent` for cross-technique allocation. Raw nodes are within-technique diagnostics; wall time is implementation cost. New actions/configurations do not get free additive budget.
- Treat weights/profiles/widths/directions/seeds/thresholds/budgets as configurations until evidence shows a distinct mechanism.
- Preserve provenance/evidence classes and independent units. Report population, unit, work envelope, selection procedure, and evidence role precisely.
- The large variant-family dataset stays off-main on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code with it mounted separately.

Detailed method/stop/promotion rules: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md). Evaluation/holdouts: [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).

## Documentation hygiene

Current documentation should optimize for **decision density**, not historical completeness.

- **Concise prose:** state the contract, current state, gate, or instruction directly. Prefer compact tables/bullets when they carry more information per token.
- **Minimal narrative:** current authorities describe what is true now. Put chronology, debugging stories, and “then we tried…” sequences in dated reports or archive snapshots.
- **Staleness resistance:** when state changes, **replace** the obsolete statement. Do not append a newer paragraph beneath stale guidance.
- **No redundant authority:** a mutable fact should have one owner. Other docs link to it instead of restating numbers, gates, defaults, or long rationale.
- **Consolidate:** if two live docs no longer have distinct ownership, merge their useful content and leave at most a tiny compatibility pointer at the old path.
- Preserve useful history before destructive consolidation by snapshotting it under `docs/archive/` or keeping the dated report that already owns it.

## Context budget

`docs/agent-context-routes.json` budgets representative required orientation separately from optional drill-down. Run:

```bash
node scripts/agent-context-budget.mjs
node scripts/agent-context-budget.mjs --check
```

Repository growth is acceptable; mandatory preload growth should be deliberate. The normal CI check path enforces hard route ceilings.

## Verification

Use the cheapest check that answers the iteration question, then the relevant finish-line gate.

| Change | Default finish line |
|---|---|
| Normal code | targeted tests, then `npm run ci:fast` |
| Solver search/orchestration/repair/diversification | targeted correctness + full `npm run ci`; research claims also follow population/work/confirmation rules |
| Solver routing/scheduling/configuration | experiment preflight; fixed/shared work envelope; current reach/marginal value; proportional independent confirmation/transfer |
| Browser/UI | focused Playwright; `npm run ci:full` for broad browser confidence |
| Solver hot path | targeted probes + [`docs/testing.md`](docs/testing.md) solved-set/cost gates + full `npm run ci` |
| Hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md) + soundness/referee/differential gates |
| Documentation | `npm run check:documentation-links` when possible |

`solver:regression --check` protects outcomes, not performance. GitHub Actions is execution infrastructure, not research evidence unless the exact run/protocol is reported.

Current-reference inventory: [`docs/README.md`](docs/README.md). Runtime-flow glossary: [`docs/command-glossary.md`](docs/command-glossary.md).
