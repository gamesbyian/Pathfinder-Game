# Pathfinder agent guide

Compact entry point for coding/research agents. Load task-specific docs, not the whole repository context. Use [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) only for rare game rules, solver gotchas, level facts, or provenance detail.

## Route by task

| Task | Read first |
|---|---|
| Product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| Naming cleanup / rename migration | First run `npm run naming:status`, then read the authority for the next phase returned by that status plus [`docs/naming-and-vocabulary.md`](docs/naming-and-vocabulary.md), [`docs/naming-cleanup-plan.md`](docs/naming-cleanup-plan.md), [`docs/naming-cleanup-process-hardening.md`](docs/naming-cleanup-process-hardening.md), and [`docs/change-recipes.md`](docs/change-recipes.md). While Phase 15 is active, its execution authority is [`docs/naming-cleanup-phase-records/phase-15.md`](docs/naming-cleanup-phase-records/phase-15.md); [`phase-15-preparation.md`](docs/naming-cleanup-phase-records/phase-15-preparation.md) remains the frozen preparation snapshot. Use immutable ledger IDs in records/PRs; keep implementation serialized and create/update the checked-in execution record before claiming completion. |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md), [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Solver optimization/research | [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) and the relevant specialist doc |
| Solver budgets/allocation/determinism | [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md) Workstream 2, then [`docs/solver-budget-determinism.md`](docs/solver-budget-determinism.md), [`docs/solver-scheduling-policy.md`](docs/solver-scheduling-policy.md), and [`docs/architecture-unification-debt.md`](docs/architecture-unification-debt.md) |
| Solver evaluation/generalization | [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md), then [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe/batch/workflow | For a named concept, first run `node scripts/tooling-census.mjs --compact --query=<term>`; use [`docs/tooling-catalog.md`](docs/tooling-catalog.md) for broader tool choice |
| Completed GHA solver/research run | Run `npm run gha:fetch-result -- --run=<run-id>` (or `--workflow=<name>`). Only consult [the retrieval fallback](.github/workflows/README.md#agent-result-retrieval) or enumerate jobs/shards if the standard result is missing/incomplete. |
| Prior experiment | [`reports/README.md`](reports/README.md), then the current topic doc |
| Deferred/reopen idea | [`docs/solver-future-work.md`](docs/solver-future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md); before using/expanding topology-composition challenge data, apply [`docs/solver-evaluation-evidence.md#suitability-and-expansion-gate`](docs/solver-evaluation-evidence.md#suitability-and-expansion-gate) |
| Validation choice | [`docs/testing.md`](docs/testing.md) |

## Working rules

1. **Read current authority and implementation before editing.** Dated reports/archive are evidence, not current behavior or priority.
2. **Treat the prompt as a goal, not an artificial file boundary.** Do adjacent work when it materially completes the task; avoid unrelated cleanup and do not silently replace the authorized task.
3. **Prefer durable fixes and close the loop.** If a bug invalidated evidence, rerun it; if a result changes current guidance, update the owning authority. Leave enough durable context that the next agent does not need this chat.
4. **Check existing machinery before adding more.** For a named concept, start with `node scripts/tooling-census.mjs --compact --query=<concept>`; use [`docs/tooling-catalog.md`](docs/tooling-catalog.md) when choosing among broader tool families. Open the full `package.json` or scan script/workflow directories only when those compact front doors are insufficient. [`scripts/README.md`](scripts/README.md) and [`.github/workflows/README.md`](.github/workflows/README.md) are the local/remote maps. Follow canonical naming vocabulary in [`docs/naming-and-vocabulary.md`](docs/naming-and-vocabulary.md) plus conventions in [`docs/README.md`](docs/README.md), [`reports/README.md`](reports/README.md), and [`logs/README.md`](logs/README.md).
5. **Audit propagation across boundaries.** Solver results/stages, mechanics, hints/provenance, app state, generated schemas, scripts, and workflows commonly have multiple consumers; use [`docs/change-recipes.md`](docs/change-recipes.md). For Phase-8+ naming work, run `naming:status`, cite immutable row IDs, confirm target-name occupancy/risk/compatibility ownership, establish the one active batch/branch, create the checked-in execution record with an explicit change envelope, close from consumers inward, and clear the duplicate/no-op pre-merge barrier required by [`docs/naming-cleanup-process-hardening.md`](docs/naming-cleanup-process-hardening.md).
6. **Prefer branch/PR validation.** Merge to `main` before evidence collection only when the needed workflow/data path cannot exercise the branch; record why. Do not use `main` as experiment scratch space.
7. **Do not weaken validation to pass.** Root-cause unexpected `null`, invariant, CSP, architecture-lint, referee, and type failures.
8. **Source is TypeScript.** `modules/` source is `.ts`; imports intentionally use `.js`. See [`docs/typing.md`](docs/typing.md).
9. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are browser-free logic; `engineState` mutations use state actions. Fix boundary violations rather than relaxing checks.

## Solver research invariants

- **The workstream authority owns current execution priority.** Do not duplicate its current execution order in other docs. Specialist reports/docs refine a workstream but do not override [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md).
- **Use the smallest evidence that can decide the next gate.** Diagnose nulls/surprises once; close a falsified form rather than indefinitely rescuing it with nearby thresholds, seeds, widths, or budgets.
- **Selection is part of the result.** A candidate/population/profile/threshold chosen after seeing outcomes is development evidence. Confirmation strength scales with selection pressure; cross-generator transfer is for broader distributional claims. See [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).
- **Level-blindness is not generalization.** Cold policy may use mechanics/current state, but not identity, hints, known winners, historical solve/cost, per-level caches, or variant outcomes. A level-blind policy can still overfit a repeatedly mined corpus; a fresh seed from the same generator is not cross-distribution transfer. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) and [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).
- **Use independent units.** Hold out whole variant parents/families. Once exact confirmation/transfer failures influence redesign, reclassify those cases as development evidence.
- **Use `workSpent` for cross-technique allocation.** Raw nodes are within-technique diagnostics; wall time measures implementation cost. Additive work is not free merely because it runs late. Treat `baseWorkBudget`/legacy `workBudget` as a base allocation unless `strictTotalWorkBudget` makes it a whole-solve cap; do not add new wall-derived allocation sites.
- **Treat weights/profiles/widths/directions/seeds/thresholds/budgets as configurations until evidence shows a distinct mechanism.** Prefer bounded sweeps/racing and marginal portfolio value over serial guesses and name proliferation.
- **Investigate unexplained weakness before institutionalizing a workaround.** Retries, orientation tricks, larger budgets, and nearby score vectors may expose search/representation defects rather than solve them.
- **Preserve provenance classes.** Stored-valid, witness, human, hint-guided, variant-derived, and cold production solves carry different research meanings.
- **Respect the variant-family dataset boundary.** The ~2.5 GB dataset lives on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code with the dataset mounted separately. Existing variants are evidence, not a command to generate more. See [`docs/variant-level-research.md`](docs/variant-level-research.md).
- **Report evidence precisely.** State what ran, population, independent unit, budget/work envelope, selection procedure, and evidence role. Never claim an unrun check passed.

Detailed evidence/stop/promotion rules live in [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md); evaluation roles and holdout intensity live in [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md); retained default-off mechanisms live in [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md). Investigations use [`docs/investigation-report-conventions.md`](docs/investigation-report-conventions.md).

## Verification

Use the cheapest check that answers the iteration question, then the relevant finish-line gate.

| Change | Default finish line |
|---|---|
| Normal code | targeted tests, then `npm run ci:fast` |
| Solver search/orchestration/repair/diversification/hint-ablation | targeted correctness tests + full `npm run ci`; research claims also follow the operating-model population/work/confirmation gate |
| Solver routing/scheduling/configuration | experiment preflight; shared work envelope; current reach/marginal value; proportional independent confirmation/transfer per [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md) |
| Browser/UI | focused Playwright; `npm run ci:full` for broad browser confidence |
| Solver hot path | targeted probes + [`docs/testing.md`](docs/testing.md) solved-set/cost gates + full `npm run ci` |
| Hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md) + proof-oriented soundness/referee/differential gates |
| Documentation | `npm run check:documentation-links` when possible |

`solver:regression --check` protects outcomes, not performance. GitHub Actions is execution infrastructure, not research evidence unless the exact run/protocol is reported.

For the complete current-reference inventory use [`docs/README.md`](docs/README.md). [`docs/command-glossary.md`](docs/command-glossary.md) maps runtime flow names to code; it is not CLI discovery.
