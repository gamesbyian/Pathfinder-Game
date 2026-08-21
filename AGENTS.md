# Pathfinder agent guide

Shortest reliable entry point for coding/research agents. Load only task-relevant references; use [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) for broad rules or historical gotchas.

## Route by task

| Task | Read first |
|---|---|
| Ordinary product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md), [`docs/testing.md`](docs/testing.md) |
| Solver optimization/research | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe/batch/workflow | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Prior experiment | [`reports/README.md`](reports/README.md), its report, then current topic doc |
| Deferred/reopen solver ideas | [`docs/future-work.md`](docs/future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md), [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md#provenance) |
| Test/validation choice | [`docs/testing.md`](docs/testing.md) |

## Working rules

1. **Read before editing.** Inspect current topic docs and implementation; prefer existing patterns.
2. **Keep diffs narrow.** Avoid unrelated reformatting/speculative infrastructure. Check [`docs/tooling-catalog.md`](docs/tooling-catalog.md), `package.json`, `scripts/`, and `.github/workflows/` before adding tools.
3. **Audit cross-boundary propagation.** For solver stages/results, mechanics, hints/provenance, app state, and generated schemas, use [`docs/change-recipes.md`](docs/change-recipes.md); do not stop at the first producer/consumer pair.
4. **Separate current contracts from history.** Topic docs define current behavior; dated reports/archive preserve evidence that may no longer hold on `main`.
5. **Use the live queue for solver priority.** [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) is authoritative; [`docs/future-work.md`](docs/future-work.md) is unranked deferred/reopen material.
6. **Respect the variant-trove boundary.** The ~2.5 GB family trove lives on `claude/variant-levels-solver-insights-tpk4qg`; reusable tooling lives on `main`. Use current `main` as code/instructions and mount the trove via separate worktree/path. See [`docs/variant-level-research.md`](docs/variant-level-research.md).
7. **Solver policy is level-blind.** Cold behavior may use mechanics/current state, never exact identity, saved hints, winning configs, historical solve status, or other exact-level knowledge. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md).
8. **Preserve provenance distinctions.** Stored-valid, witness, human, hint-guided, variant-derived, and cold production solves have different research meanings.
9. **Source is TypeScript.** `modules/` uses `.ts`; import specifiers intentionally use `.js` and resolve to `.ts`. Docs name actual `.ts` paths. See [`docs/typing.md`](docs/typing.md).
10. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are browser-free logic; ENGINE mutations use state actions. Fix architecture-lint causes, not checks.
11. **Do not weaken validation to pass.** Root-cause unexpected `null`, invariant, CSP, architecture-lint, and solver-referee failures.
12. **Report evidence precisely.** State what ran, population/budget where relevant, and whether results are measured, inferred, historical, or pending.

## Verification

Use the cheapest check that answers the iteration question, then the relevant local finish-line gate. GitHub Actions is optional remote execution.

- **Normal code:** targeted tests while editing, then `npm run ci:fast` by default. Use full `npm run ci` for solver search/orchestration/repair/diversification/hint-ablation changes, directly relevant deep tests, plausible coverage-threshold shifts, or high-stakes final completeness validation. Exact rule: [`docs/testing.md`](docs/testing.md).
- **Browser/UI:** relevant Playwright subset; `npm run ci:full` when broad browser confidence is warranted.
- **Solver hot path:** targeted probes, then [`docs/testing.md`](docs/testing.md) solved-set/cost gates; use full `npm run ci`. `solver:bench --check` does not measure performance.
- **Hard prune/cache/correctness:** stronger soundness/referee/differential gates in solver docs.
- **Documentation:** `npm run check:documentation-links` when possible.

Never claim an unrun check passed.

## Research/tool authority

Current implementation/topic docs define behavior. Solver priority: [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md); method: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md); families: [`docs/variant-level-research.md`](docs/variant-level-research.md); default-off dispositions: [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md); deferred ideas: [`docs/future-work.md`](docs/future-work.md). Dated `reports/` and [`docs/archive/`](docs/archive/README.md) are evidence/history.

Investigations use [`Status / Last evidence / Decision / Remaining gate`](docs/investigation-report-conventions.md). Before adding tooling, start at [`docs/tooling-catalog.md`](docs/tooling-catalog.md); `package.json`, [`scripts/README.md`](scripts/README.md), and [`.github/workflows/README.md`](.github/workflows/README.md) provide exhaustive maps. [`docs/command-glossary.md`](docs/command-glossary.md) covers runtime flow names, not CLI discovery.

## Full reference

[`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) contains rules, layout, solver gotchas, level stats, provenance, Firebase, and detailed testing notes. Read selectively.
