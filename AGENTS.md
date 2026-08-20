# Pathfinder agent guide

This is the shortest reliable entry point for an AI coding or research agent working in this repository. Load only the references needed for the current task. The full accumulated developer reference lives in [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md); do not preload it unless the task needs broad game-rule or historical gotcha context.

## Route by task

| Task | Read first |
|---|---|
| Ordinary product/code change | [`docs/architecture.md`](docs/architecture.md), then the files being changed |
| UI, input, accessibility, rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation change | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md), [`docs/testing.md`](docs/testing.md) |
| Solver optimization/research selection | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) |
| Find an existing probe, batch tool, or workflow | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Understand a prior experiment | [`reports/README.md`](reports/README.md), then the specific report and its current topic reference |
| Level/hint corpus work | [`data/stress/README.md`](data/stress/README.md) and the relevant provenance reference in [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md#provenance) |
| Test or validation choice | [`docs/testing.md`](docs/testing.md) |

## Working rules

1. **Read before editing.** Inspect the current topic reference and the implementation you are about to touch. Prefer the existing pattern over a new abstraction.
2. **Keep diffs narrow.** Do not reformat unrelated code or build speculative infrastructure. This repo already contains many specialized tools, so check the tooling catalog, `package.json`, `scripts/`, and `.github/workflows/` before creating another one.
3. **Treat current references and historical evidence differently.** Current behavior belongs in topic docs. Dated reports preserve experiment evidence. A historical statement can be true for its tested commit and false for current `main`.
4. **Use the current solver queue for priority.** [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) is the ranked live entry point for optimizing existing solver techniques. [`docs/future-work.md`](docs/future-work.md) is the detailed evidence/disposition store and broader deferral record, not a competing optimization ranking.
5. **Solver policy is level-blind.** Production/cold solver behavior may key on level mechanics and state, never exact level identity, saved hints, known winning configs, historical solve status, or other exact-level knowledge. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md).
6. **Preserve provenance distinctions.** A valid stored hint is not automatically cold-solver capability evidence. Witness, human-solved, hint-guided, and cold production-solver finds have different research meanings.
7. **Source filenames are TypeScript.** Files under `modules/` are `.ts`; import specifiers intentionally use `.js` and resolve to `.ts`. When documentation names a repository path, prefer the actual `.ts` source filename. See [`docs/typing.md`](docs/typing.md).
8. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are the browser-free logic core. ENGINE state mutations go through state actions. Architecture rules are enforced by ESLint; understand a failure instead of working around it.
9. **Do not weaken validation to make a change pass.** Unexpected `null`, failed invariants, CSP complaints, architecture lint errors, and solver referee failures should be root-caused.
10. **Report evidence precisely.** State what was run, what was not run, the population/budget when relevant, and whether a result is measured, inferred, or still pending.

## Verification ladder

Use the cheapest check that answers the current iteration question, then run the required finish-line gate before claiming the work complete.

- Normal code change: targeted tests while iterating, then `npm run ci`.
- Browser/UI change: use the relevant Playwright subset; `npm run ci:full` is the release-confidence gate.
- Solver hot-path change: targeted probes first. Before reporting/merging, follow [`docs/testing.md`](docs/testing.md) for solved-set regression safety **and** cost comparison. `solver:bench --check` alone does not measure performance.
- Hard solver prune/cache/correctness change: maintain the stronger soundness/referee/differential-testing requirements described in the solver docs.
- Documentation change: run `npm run check:documentation-links` when possible.

Do not claim a check passed if it was not actually run.

## Research authority map

Use this order when multiple documents discuss the same topic:

1. Current implementation and contracts: the topic reference under `docs/` and current code.
2. Current optimization priority: [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md).
3. Broader solver research coordination: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md).
4. Detailed evidence/dispositions and deferrals: [`docs/future-work.md`](docs/future-work.md) plus the opt-in ledger where applicable.
5. Individual experiment evidence: dated files under `reports/`.
6. Historical campaign narrative and archived plans: useful context, never assumed current without reconciliation.

Human-authored investigation reports should follow the [`Status / Last evidence / Decision / Remaining gate`](docs/investigation-report-conventions.md) convention. When later evidence changes a conclusion, update the current reference or queue as well as preserving the older report.

## Tool discovery

Before implementing a new script or Actions workflow, start at [`docs/tooling-catalog.md`](docs/tooling-catalog.md). `package.json` remains the exhaustive list of npm command aliases; [`scripts/README.md`](scripts/README.md) maps the script tree; [`.github/workflows/README.md`](.github/workflows/README.md) maps remote/sharded jobs.

The engine-flow [`docs/command-glossary.md`](docs/command-glossary.md) is about runtime command/flow names and implementation locations. It is not a CLI/tool catalog.

## Full reference

[`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) contains the former root developer reference in full: game rules, repository layout, solver gotchas, level statistics, provenance, Firebase, and detailed testing notes. Read it selectively when those details are relevant rather than loading it by default.
