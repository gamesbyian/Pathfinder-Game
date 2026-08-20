# Pathfinder agent guide

This is the shortest reliable entry point for an AI coding or research agent working in this repository. Load only the references needed for the current task. The full accumulated developer reference lives in [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md); do not preload it unless the task needs broad game-rule or historical gotcha context.

## Route by task

| Task | Read first |
|---|---|
| Ordinary product/code change | [`docs/architecture.md`](docs/architecture.md), then the files being changed |
| UI, input, accessibility, rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation change | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md), [`docs/testing.md`](docs/testing.md) |
| Solver optimization/research selection | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) |
| Variant/family research or use the large variant trove | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Find an existing probe, batch tool, or workflow | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Understand a prior experiment | [`reports/README.md`](reports/README.md), then the specific report and its current topic reference |
| Broader deferred/reopen solver ideas | [`docs/future-work.md`](docs/future-work.md) |
| Default-off experiment disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress-corpus work | [`data/stress/README.md`](data/stress/README.md) and the relevant provenance reference in [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md#provenance) |
| Test or validation choice | [`docs/testing.md`](docs/testing.md) |

## Working rules

1. **Read before editing.** Inspect the current topic reference and the implementation you are about to touch. Prefer the existing pattern over a new abstraction.
2. **Keep diffs narrow.** Do not reformat unrelated code or build speculative infrastructure. Check the tooling catalog, `package.json`, `scripts/`, and `.github/workflows/` before creating another tool.
3. **Treat current references and historical evidence differently.** Current behavior belongs in topic docs. Dated reports and archive snapshots preserve evidence. A historical statement can be true for its tested commit and false for current `main`.
4. **Use the current solver queue for priority.** [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) is the live ranked entry point. [`docs/future-work.md`](docs/future-work.md) is a broader deferred/reopen index, not a competing ranking or run notebook.
5. **Know where the variant trove lives.** The ~2.5 GB generated family dataset is intentionally retained on `claude/variant-levels-solver-insights-tpk4qg`, not `main`. Main contains the reusable family tooling. Read [`docs/variant-level-research.md`](docs/variant-level-research.md) before generating more variants or designing family analytics.
6. **Solver policy is level-blind.** Production/cold behavior may key on mechanics and current state, never exact level identity, saved hints, known winning configs, historical solve status, or other exact-level knowledge. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md).
7. **Preserve provenance distinctions.** A valid stored hint is not automatically cold capability evidence. Witness, human-solved, hint-guided, variant-derived, and cold production-solver finds have different research meanings.
8. **Source filenames are TypeScript.** Files under `modules/` are `.ts`; import specifiers intentionally use `.js` and resolve to `.ts`. Documentation should name the actual `.ts` source path. See [`docs/typing.md`](docs/typing.md).
9. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are the browser-free logic core. ENGINE state mutations go through state actions. Understand architecture-lint failures rather than working around them.
10. **Do not weaken validation to make a change pass.** Unexpected `null`, failed invariants, CSP complaints, architecture lint errors, and solver referee failures should be root-caused.
11. **Report evidence precisely.** State what ran, the population/budget when relevant, and whether a result is measured, inferred, historical, or pending.

## Verification ladder

Use the cheapest check that answers the iteration question, then the required finish-line gate.

- Normal code change: targeted tests while iterating, then `npm run ci`.
- Browser/UI change: relevant Playwright subset; `npm run ci:full` for release confidence.
- Solver hot-path change: targeted probes first, then the solved-set and cost requirements in [`docs/testing.md`](docs/testing.md). `solver:bench --check` alone does not measure performance.
- Hard prune/cache/correctness change: use the stronger soundness/referee/differential-testing requirements in the solver docs.
- Documentation change: run `npm run check:documentation-links` when possible.

Do not claim a check passed if it was not actually run.

## Research authority map

1. Current implementation and durable topic/tool contract under `docs/`.
2. Current solver optimization priority: [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md).
3. Research method and evidence routing: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md).
4. Variant/family resource and methods: [`docs/variant-level-research.md`](docs/variant-level-research.md).
5. Default-off mechanism disposition: [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md).
6. Broader deferred/reopen ideas: [`docs/future-work.md`](docs/future-work.md).
7. Individual experiment evidence: dated files under `reports/`.
8. Historical campaign records and [`docs/archive/`](docs/archive/README.md): provenance, not current instruction.

Human-authored investigations should follow the [`Status / Last evidence / Decision / Remaining gate`](docs/investigation-report-conventions.md) convention.

## Tool discovery

Before implementing a script or Actions workflow, start at [`docs/tooling-catalog.md`](docs/tooling-catalog.md). `package.json` is the exhaustive npm-alias list; [`scripts/README.md`](scripts/README.md) maps scripts; [`.github/workflows/README.md`](.github/workflows/README.md) maps remote/sharded jobs.

The engine-flow [`docs/command-glossary.md`](docs/command-glossary.md) is about runtime flow names and implementation locations, not CLI discovery.

## Full reference

[`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) contains the former root developer reference in full: game rules, repository layout, solver gotchas, level statistics, provenance, Firebase, and detailed testing notes. Read it selectively rather than loading it by default.
