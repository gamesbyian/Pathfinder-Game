<!-- agent-context-budget: warn=10500 max=13000 -->
# Pathfinder agent guide

Compact router. Load task-specific material, not history. [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) is optional.

## Route by task

| Task | Read first |
|---|---|
| Product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| Periodic repository hygiene / “periodic hygiene check plan” | Execute [`docs/periodic-repository-hygiene.md`](docs/periodic-repository-hygiene.md) end-to-end from current `main`; it owns the recurring hygiene procedure |
| Naming / future rename | Cleanup is complete through Phase 15. Use [`docs/naming-and-vocabulary.md`](docs/naming-and-vocabulary.md) + [`docs/change-recipes.md`](docs/change-recipes.md); history: `npm run naming:status`. Do not reopen it. |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver correctness/cache/prune | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md), [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Solver optimization/research | [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) and the specialist doc for the current gate |
| Solver workflow/evidence maintenance | [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md), [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md), then changed workflow/scripts |
| Solver experiment population / sample sizing | [`docs/solver-experiment-opportunity-sizing.md`](docs/solver-experiment-opportunity-sizing.md); use `node scripts/experiment-opportunity-audit.mjs` before broad/sharded compute |
| Solver research acquisition / whether to generate | `npm run research:acquisition-preflight -- --question-id=<id>` after queue/status/assets; it routes evidence acquisition but never generates automatically |
| Solver research data / cross-evidence | `node scripts/research-asset-query.mjs --query=<term>`; cross-authority: `npm run research:relations -- --list`; topology: [`docs/solver-research-data-assets.md`](docs/solver-research-data-assets.md) |
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
| Push/PR finish line or red CI | [`docs/ci-preflight.md`](docs/ci-preflight.md), then the failing validator/owning authority |

Use [`docs/solver-research-post-naming-resumption.md`](docs/solver-research-post-naming-resumption.md) only for frozen pre-cleanup evidence.

## Working rules

1. Read the current authority and implementation before editing. Reports/archive/frozen migration evidence do not define current behavior or priority.
2. Treat the prompt as a goal, not an artificial file boundary. Do adjacent work when it materially completes the task; avoid unrelated cleanup.
3. Close the loop: rerun invalidated evidence and update owning authority when results change.
4. Use cheap discovery before broad context: `tooling-census --compact`, `research-status-index --compact`, `research-asset-query.mjs`.
5. Audit cross-boundary propagation with [`docs/change-recipes.md`](docs/change-recipes.md).
6. Prefer branch/PR validation; use `main` for experiments only when branch execution is impossible and record why.
7. Before push, follow [`docs/ci-preflight.md`](docs/ci-preflight.md): ordinary `npm run ci:fast && npm run build`; deep solver `npm run ci && npm run build`. Do not use GHA as first deterministic feedback.
8. Do not weaken validation; root-cause invariant, CSP, architecture, referee, or type failures.
9. Source is TypeScript; `domain/`, `runtime/`, and `solver/` stay browser-free; `engineState` mutations use state actions.
10. Honor file-size declarations: stay below `warn` when practical, never cross `max`; if already over, reduce with margin and re-measure.

## Solver research invariants

- [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md) owns priority/state/gates. Specialist docs/reports refine a gate but do not reprioritize it.
- Use the smallest evidence that can decide the next gate. A clear negative closes the tested form unless materially new evidence changes the premise.
- Inventory existing provenance/capability/profile/variant/trace/manifest/exact evidence before generating more; searched joins add selection pressure.
- Before broad/sharded decision work, define the **opportunity population**, estimate its control-side rate, and size N from informative rows. Benefit-enriched and representative no-harm populations are separate.
- When opportunity/exposure is uncertain, run the smallest control-only/shadow pilot. Ceiling, low real participation, or zero opportunity blocks scale-up.
- Before a large matrix, run one representative **execution-family canary** under exact cap/flags/selector semantics and verify stop/accounting behavior.
- Resolve populations once: planning emits literal IDs/positions and execution consumes that exact plan.
- Persist arm/config provenance at solver invocation. A/B arms must prove semantic difference with unintended dimensions matched.
- Runtime telemetry may steer GHA packing/timeouts, never cold policy; persist the telemetry/fallback used.
- Derived features come from canonical helpers/schemas; assert row shape before filtering/stratifying.
- Level-blindness is not generalization. Cold policy cannot use identity, hints, known winners, historical per-level outcomes/cost, prior persistent per-level state, or variant outcomes. Solve-local derivations from current inputs are legal in principle; soundness/economics are separate.
- Use `workSpent` for cross-technique allocation; nodes are diagnostics, wall time is implementation cost, and new actions get no free additive budget.
- Treat weights/profiles/widths/directions/seeds/thresholds/budgets as configurations until evidence shows a distinct mechanism.
- Preserve provenance/evidence classes and independent units; report population, work envelope, selection, and role precisely.
- The large variant-family dataset stays off-main on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code with it mounted separately.

Detailed method/stop/promotion rules: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md). Evaluation/holdouts: [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).

## Documentation hygiene

Optimize docs for **decision density**: state contracts/state/gates directly; keep chronology/debugging in dated reports/archive; replace stale claims instead of appending; give mutable facts one owner; consolidate overlapping live docs; preserve useful history before destructive consolidation.

## Context budget
`docs/agent-context-routes.json` budgets representative required orientation separately from optional drill-down. Individual authority documents declare their own `warn` and `max` byte budgets in the opening comment. Run:

```bash
node scripts/agent-context-budget.mjs
node scripts/agent-context-budget.mjs --check
```

Repository growth is acceptable; mandatory preload growth should be deliberate. Treat warning thresholds as a prompt to compact/archive before the hard route ceiling makes CI the first feedback.

## Verification

Use the cheapest check that answers the iteration question, then the relevant finish-line gate.

| Change | Default finish line |
|---|---|
| Normal code | targeted tests, then `npm run ci:fast && npm run build` |
| Solver search/orchestration/repair/diversification | targeted correctness + `npm run ci && npm run build`; research claims also follow population/work/confirmation rules |
| Solver routing/scheduling/configuration | experiment preflight + opportunity audit; execution-family canary; fixed/shared work envelope; current reach/marginal value; proportional independent confirmation/transfer |
| Browser/UI | focused Playwright; `npm run ci:full` for broad browser confidence, plus `npm run build` if not already exercised |
| Solver hot path | targeted probes + [`docs/testing.md`](docs/testing.md) solved-set/cost gates + `npm run ci && npm run build` |
| Hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md) + soundness/referee/differential gates |
| Documentation | `npm run check:documentation-links` when possible, then the ordinary finish line before push |

`solver:regression --check` protects outcomes, not performance. GitHub Actions is execution infrastructure, not research evidence unless the exact run/protocol is reported.

References: [`docs/README.md`](docs/README.md). Research-report navigation: [`reports/README.md`](reports/README.md). Runtime-flow glossary: [`docs/command-glossary.md`](docs/command-glossary.md).