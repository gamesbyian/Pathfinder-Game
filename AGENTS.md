# Pathfinder agent guide

Shortest reliable entry point for AI coding and research agents. Load only the references needed for the task. Use [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) only when broad game-rule or historical-gotcha context is needed.

## Route by task

| Task | Read first |
|---|---|
| Ordinary product/code change | [`docs/architecture.md`](docs/architecture.md), then the files being changed |
| Cross-cutting schema/state/telemetry change | [`docs/change-recipes.md`](docs/change-recipes.md), then the owning topic doc |
| UI, input, accessibility, rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation change | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md), [`docs/testing.md`](docs/testing.md) |
| Solver optimization/research selection | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) |
| Variant/family research or large variant trove | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe, batch tool, or workflow | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Prior experiment | [`reports/README.md`](reports/README.md), then its report and current topic reference |
| Broader deferred/reopen solver ideas | [`docs/future-work.md`](docs/future-work.md) |
| Default-off experiment disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress-corpus work | [`data/stress/README.md`](data/stress/README.md) and [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md#provenance) |
| Test or validation choice | [`docs/testing.md`](docs/testing.md) |

## Working rules

1. **Read before editing.** Inspect the current topic reference and implementation. Prefer existing patterns to new abstractions.
2. **Keep diffs narrow.** Do not reformat unrelated code or build speculative infrastructure. Check [`docs/tooling-catalog.md`](docs/tooling-catalog.md), `package.json`, `scripts/`, and `.github/workflows/` before adding tools.
3. **Audit propagation when a contract crosses boundaries.** For solver stages/results, level mechanics, hints/provenance, application state, and generated artifact schemas, use [`docs/change-recipes.md`](docs/change-recipes.md). Do not stop after fixing the first producer/consumer pair.
4. **Separate current contracts from historical evidence.** Current behavior belongs in topic docs. Dated reports and archive snapshots preserve evidence. A historical result may not hold on current `main`.
5. **Use the current solver queue for priority.** [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) is authoritative. [`docs/future-work.md`](docs/future-work.md) is deferred/reopen material, not another ranking or run notebook.
6. **Know the variant-trove boundary.** The ~2.5 GB generated family dataset is retained on `claude/variant-levels-solver-insights-tpk4qg`, not `main`; reusable family tooling is on main. Keep **current `main` as the code/instruction environment** and mount the trove through a separate worktree/path. Do not check out the trove branch as the working codebase: its source, docs, root prompts, counts, and task state are historical. Read [`docs/variant-level-research.md`](docs/variant-level-research.md) before generating more variants or designing family analytics.
7. **Solver policy is level-blind.** Cold production behavior may use mechanics and current state, never exact level identity, saved hints, known winning configs, historical solve status, or other exact-level knowledge. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md).
8. **Preserve provenance distinctions.** A valid stored hint is not automatically cold-capability evidence. Witness, human-solved, hint-guided, variant-derived, and cold production-solver finds have different research meanings.
9. **Source files are TypeScript.** `modules/` source files use `.ts`; import specifiers intentionally use `.js` and resolve to `.ts`. Docs should name the actual `.ts` source path. See [`docs/typing.md`](docs/typing.md).
10. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are the browser-free logic core. ENGINE mutations use state actions. Root-cause architecture-lint failures instead of bypassing them.
11. **Do not weaken validation to make a change pass.** Root-cause unexpected `null`, failed invariants, CSP complaints, architecture-lint errors, and solver-referee failures.
12. **Report evidence precisely.** State what ran, population/budget when relevant, and whether a result is measured, inferred, historical, or pending.

## Verification

Use the cheapest check that answers the iteration question, then run the relevant finish-line validation locally when the task requires it. GitHub Actions is optional remote execution, not a prerequisite for pushing or merging.

- Normal code: targeted tests while iterating, then local `npm run ci:fast` for completion confidence — it's the default finish-line gate (~1 min) and covers the same code the full gate does, minus only the handful of tests whose own subject is deep solver-search cost. Use full `npm run ci` instead when the change touches solver search/orchestration/repair/diversification/hint-ablation code, when a deep test's own assertion is directly relevant, when the change plausibly shifts coverage thresholds, or as final validation before a high-stakes completeness claim — see [`docs/testing.md`](docs/testing.md)'s "Core commands" for the exact defensibility rule.
- Browser/UI: relevant Playwright subset; `npm run ci:full` for broad browser confidence when warranted.
- Solver hot path: targeted probes, then the solved-set and cost requirements in [`docs/testing.md`](docs/testing.md). Use full `npm run ci`, not `ci:fast`. `solver:bench --check` does not measure performance.
- Hard prune/cache/correctness: use the stronger soundness/referee/differential requirements in the solver docs.
- Documentation: run `npm run check:documentation-links` when possible.

Never claim an unrun check passed. If remote CI later finds a problem, fix it normally; do not distort local development around Actions queue time.

## Research authority

Current implementation and durable topic/tool docs define current behavior. Solver priority comes from [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md); method from [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md); family/variant methods from [`docs/variant-level-research.md`](docs/variant-level-research.md); default-off dispositions from [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md); broader deferred ideas from [`docs/future-work.md`](docs/future-work.md). Dated `reports/` and [`docs/archive/`](docs/archive/README.md) are evidence/provenance, not current instruction.

Human-authored investigations use the [`Status / Last evidence / Decision / Remaining gate`](docs/investigation-report-conventions.md) convention.

## Tool discovery

Start at [`docs/tooling-catalog.md`](docs/tooling-catalog.md) before adding a script or Actions workflow. `package.json` lists npm aliases; [`scripts/README.md`](scripts/README.md) maps scripts; [`.github/workflows/README.md`](.github/workflows/README.md) maps remote/sharded jobs. [`docs/command-glossary.md`](docs/command-glossary.md) covers runtime flow names and implementation locations, not CLI discovery.

## Full reference

[`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) contains game rules, repository layout, solver gotchas, level statistics, provenance, Firebase, and detailed testing notes. Read it selectively.
