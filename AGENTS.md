# Pathfinder agent guide

Canonical compact entry point for coding/research agents. Load only task-relevant references; use [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) selectively for rare rules, solver gotchas, level facts, or provenance detail.

## Route by task

| Task | Read first |
|---|---|
| Ordinary product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver optimization/research | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe/batch/workflow | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Prior experiment | [`reports/README.md`](reports/README.md), its report, then current topic doc |
| Deferred/reopen idea | [`docs/future-work.md`](docs/future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md) |
| Validation choice | [`docs/testing.md`](docs/testing.md) |

## Rules

1. **Read current authority and implementation before editing.** Dated reports/archive are evidence/history, not current behavior or priority.
2. **Keep diffs narrow.** Before adding tooling, check [`docs/tooling-catalog.md`](docs/tooling-catalog.md), `package.json`, [`scripts/README.md`](scripts/README.md), and [`.github/workflows/README.md`](.github/workflows/README.md).
3. **Audit cross-boundary propagation.** Solver stages/results, mechanics, hints/provenance, app state, and generated schemas often have multiple consumers; use [`docs/change-recipes.md`](docs/change-recipes.md).
4. **Solver priority is the live queue.** `future-work.md` is unranked deferred/reopen material; code presence does not imply an active hypothesis.
5. **Cold solver policy is level-blind.** Mechanics/current state are allowed; exact identity, saved hints, winner configs, historical solve status/cost, per-level caches/budgets, and variant outcomes are not. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md).
6. **Respect the variant-trove boundary.** The ~2.5 GB trove is on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code/instructions with the trove mounted separately. See [`docs/variant-level-research.md`](docs/variant-level-research.md).
7. **Preserve provenance classes.** Stored-valid, witness, human, hint-guided, variant-derived, and cold production solves have different research meanings.
8. **Source is TypeScript.** `modules/` source is `.ts`; import specifiers intentionally use `.js` and resolve to `.ts`. See [`docs/typing.md`](docs/typing.md).
9. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are browser-free logic; ENGINE mutations use state actions. Fix architecture-lint causes rather than weakening checks.
10. **Do not weaken validation to pass.** Root-cause unexpected `null`, invariant, CSP, architecture-lint, and solver-referee failures.
11. **Report evidence precisely.** State what ran, population/budget where relevant, and whether results are measured, inferred, historical, or pending. Never claim an unrun check passed.

Investigations use [`Status / Last evidence / Decision / Remaining gate`](docs/investigation-report-conventions.md). [`docs/command-glossary.md`](docs/command-glossary.md) maps runtime flow names to code; it is not CLI discovery.

## Verification

Use the cheapest check that answers the iteration question, then the relevant finish-line gate.

| Change | Default finish line |
|---|---|
| Normal code | targeted tests, then `npm run ci:fast` |
| Solver search/orchestration/repair/diversification/hint-ablation, relevant deep tests, coverage-risk, high-stakes completeness | full `npm run ci` |
| Browser/UI | focused Playwright; `npm run ci:full` for broad browser confidence |
| Solver hot path | targeted probes + [`docs/testing.md`](docs/testing.md) solved-set/cost gates + full `npm run ci` |
| Hard prune/cache/correctness | proof-oriented soundness/referee/differential gates in solver docs |
| Documentation | `npm run check:documentation-links` when possible |

`solver:bench --check` protects outcomes, not performance. GitHub Actions is optional remote execution, not evidence unless the exact run is reported.

## Authority map

Current behavior comes from implementation/topic docs. Solver priority: [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md); research method: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md); families: [`docs/variant-level-research.md`](docs/variant-level-research.md); default-off mechanisms: [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md); deferred ideas: [`docs/future-work.md`](docs/future-work.md). Experiments/history: [`reports/`](reports/README.md) and [`docs/archive/`](docs/archive/README.md).
