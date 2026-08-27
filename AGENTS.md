# Pathfinder agent guide

Compact entry point for coding/research agents. Load task-specific docs, not the whole repository context. Use [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) only for rare game rules, solver gotchas, level facts, or provenance detail.

## Route by task

| Task | Read first |
|---|---|
| Product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md), [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Solver optimization/research | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) and the relevant specialist doc |
| Solver evaluation/generalization | [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md), then [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe/batch/workflow | For a named concept, first run `node scripts/tooling-census.mjs --compact --query=<term>`; use [`docs/tooling-catalog.md`](docs/tooling-catalog.md) for broader tool choice |
| Prior experiment | [`reports/README.md`](reports/README.md), then the current topic doc |
| Deferred/reopen idea | [`docs/solver-future-work.md`](docs/solver-future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md); before using/expanding topology-composition challenge data, apply [`docs/solver-evaluation-evidence.md#suitability-and-expansion-gate`](docs/solver-evaluation-evidence.md#suitability-and-expansion-gate) |
| Validation choice | [`docs/testing.md`](docs/testing.md) |

## Working rules

1. **Read current authority and implementation before editing.** Dated reports/archive are evidence, not current behavior or priority.
2. **Treat the prompt as a goal, not an artificial file boundary.** Do adjacent work when it materially completes the task; avoid unrelated cleanup and do not silently replace the authorized task.
3. **Prefer durable fixes and close the loop.** If a bug invalidated evidence, rerun it; if a result changes current guidance, update the owning authority. Leave enough durable context that the next agent does not need this chat.
4. **Check existing machinery before adding more.** For a named concept, start with `node scripts/tooling-census.mjs --compact --query=<concept>`; use [`docs/tooling-catalog.md`](docs/tooling-catalog.md) when choosing among broader tool families. Open the full `package.json` or scan script/workflow directories only when those compact front doors are insufficient. [`scripts/README.md`](scripts/README.md) and [`.github/workflows/README.md`](.github/workflows/README.md) are the local/remote maps. Follow naming conventions in [`docs/README.md`](docs/README.md), [`reports/README.md`](reports/README.md), and [`logs/README.md`](logs/README.md).
5. **Audit propagation across boundaries.** Solver results/stages, mechanics, hints/provenance, app state, and generated schemas commonly have multiple consumers; use [`docs/change-recipes.md`](docs/change-recipes.md).
6. **Prefer branch/PR validation.** Merge to `main` before evidence collection only when the needed workflow/data path cannot exercise the branch; record why. Do not use `main` as experiment scratch space.
7. **Do not weaken validation to pass.** Root-cause unexpected `null`, invariant, CSP, architecture-lint, referee, and type failures.
8. **Source is TypeScript.** `modules/` source is `.ts`; imports intentionally use `.js`. See [`docs/typing.md`](docs/typing.md).
9. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are browser-free logic; ENGINE mutations use state actions. Fix boundary violations rather than relaxing checks.

## Solver research invariants

- **The live queue owns rank.** Do not duplicate its current priority list in other docs. Specialist reports/docs refine a queue item but do not outrank [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md).
- **Use the smallest evidence that can decide the next gate.** Diagnose nulls/surprises once; close a falsified form rather than indefinitely rescuing it with nearby thresholds, seeds, widths, or budgets.
- **Selection is part of the result.** A candidate/population/profile/threshold chosen after seeing outcomes is development evidence. Confirmation strength scales with selection pressure; cross-generator transfer is for broader distributional claims. See [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).
- **Level-blindness is not generalization.** Cold policy may use mechanics/current state, but not identity, hints, known winners, historical solve/cost, per-level caches, or variant outcomes. A level-blind policy can still overfit a repeatedly mined corpus; a fresh seed from the same generator is not cross-distribution transfer. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) and [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).
- **Use independent units.** Hold out whole variant parents/families. Once exact confirmation/transfer failures influence redesign, reclassify those cases as development evidence.
- **Use `workSpent` for cross-technique allocation.** Raw nodes are within-technique diagnostics; wall time measures implementation cost. Additive work is not free merely because it runs late.
- **Treat weights/profiles/widths/directions/seeds/thresholds/budgets as configurations until evidence shows a distinct mechanism.** Prefer bounded sweeps/racing and marginal portfolio value over serial guesses and name proliferation.
- **Investigate unexplained weakness before institutionalizing a workaround.** Retries, orientation tricks, larger budgets, and nearby score vectors may expose search/representation defects rather than solve them.
- **Preserve provenance classes.** Stored-valid, witness, human, hint-guided, variant-derived, and cold production solves carry different research meanings.
- **Respect the variant-trove boundary.** The ~2.5 GB trove lives on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code with the trove mounted separately. Existing variants are evidence, not a command to generate more. See [`docs/variant-level-research.md`](docs/variant-level-research.md).
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

`solver:bench --check` protects outcomes, not performance. GitHub Actions is execution infrastructure, not research evidence unless the exact run/protocol is reported.

For the complete current-reference inventory use [`docs/README.md`](docs/README.md). [`docs/command-glossary.md`](docs/command-glossary.md) maps runtime flow names to code; it is not CLI discovery.
