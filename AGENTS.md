# Pathfinder agent guide

Compact entry point for coding/research agents. Load task-specific material, not the repository's accumulated history. [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) is optional detail for rare game rules, solver gotchas, level facts, or provenance.

## Route by task

| Task | Read first |
|---|---|
| Product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| Naming / future rename | [`docs/naming-and-vocabulary.md`](docs/naming-and-vocabulary.md) + [`docs/change-recipes.md`](docs/change-recipes.md). The Phase-0-15 cleanup is complete history, not a live phase queue. |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md), [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Solver optimization/research | **Start with the compact [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md)**, then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md) and the specialist doc needed by the current gate. Open [`docs/solver-optimization-workstreams.md`](docs/solver-optimization-workstreams.md) only for detailed chronology/evidence. |
| Existing solver research data / cross-evidence | Run `node scripts/research-asset-query.mjs --query=<term>` first. Use [`docs/solver-research-data-assets.md`](docs/solver-research-data-assets.md) only when the compact result is insufficient or a non-obvious join needs full boundary guidance. |
| Solver budgets/allocation/determinism | Compact queue, then [`docs/solver-scheduling-policy.md`](docs/solver-scheduling-policy.md); add [`docs/solver-budget-determinism.md`](docs/solver-budget-determinism.md) when budget semantics/work accounting matter. |
| Solver evaluation/generalization | [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md), then [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe/batch/workflow | `node scripts/tooling-census.mjs --compact --query=<term>` first; use [`docs/tooling-catalog.md`](docs/tooling-catalog.md) for broader tool choice |
| Completed GHA solver/research run | `npm run gha:fetch-result -- --run=<run-id>` (or `--workflow=<name>`); enumerate jobs/shards only if the standard result is incomplete |
| Prior experiment | `node scripts/research-status-index.mjs --compact --query=<term>` first; then open the matched report/current topic doc |
| Deferred/reopen idea | [`docs/solver-future-work.md`](docs/solver-future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md) |
| Validation choice | [`docs/testing.md`](docs/testing.md) |

The completed [`docs/solver-research-post-naming-resumption.md`](docs/solver-research-post-naming-resumption.md) bridge is **conditional**: read it when executing, aggregating, or translating frozen pre-cleanup solver evidence whose names/contracts may be historical. It is not mandatory current-head research orientation.

## Working rules

1. **Read current authority and implementation before editing.** Dated reports/archive/frozen migration evidence do not define current behavior or priority.
2. **Treat the prompt as a goal, not an artificial file boundary.** Do adjacent work when it materially completes the task; avoid unrelated cleanup and do not silently replace the authorized task.
3. **Prefer durable fixes and close the loop.** If a bug invalidated evidence, rerun it. If a result changes guidance, update the owning authority. Leave enough durable context that the next agent does not need this chat.
4. **Use cheap discovery before directory-sized context.** Named tooling: `tooling-census --compact`; prior evidence: `research-status-index --compact`; solver evidence assets/joins: `research-asset-query.mjs`. Open full catalogs, reports indexes, package scripts, giant workstream chronology, or data catalogues only when the compact front doors are insufficient.
5. **Audit propagation across boundaries.** Solver results/stages, mechanics, hints/provenance, app state, generated schemas, scripts, and workflows commonly have multiple consumers; use [`docs/change-recipes.md`](docs/change-recipes.md). The completed naming program's impact-map/compatibility-owner/consumer-inward practices remain useful evidence for risky migrations.
6. **Prefer branch/PR validation.** Merge to `main` before evidence collection only when the required workflow/data path cannot exercise the branch; record why. Do not use `main` as experiment scratch space.
7. **Do not weaken validation to pass.** Root-cause unexpected `null`, invariant, CSP, architecture-lint, referee, and type failures.
8. **Source is TypeScript.** `modules/` source is `.ts`; imports intentionally use `.js`. See [`docs/typing.md`](docs/typing.md).
9. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are browser-free logic; `engineState` mutations use state actions.

## Solver research invariants

- **Current priority comes from the compact queue.** The large workstreams file supplies chronology and full evidence chains; specialist docs/reports cannot silently reprioritize the queue.
- **Use the smallest evidence that can decide the next gate.** Close a falsified form instead of repeatedly rescuing it with nearby seeds, widths, thresholds, or budgets.
- **Inventory before generating.** Query existing hints/provenance, census/capability maps, profiles, variants, lifecycle, traces, manifests, exact labels, and other evidence before buying broad compute. Materially searched joins add selection pressure.
- **Level-blindness is not generalization.** Cold policy may use mechanics/current state, but not identity, saved hints, known winners, historical per-level outcomes/cost, per-level caches, or variant outcomes. Confirmation strength scales with selection/tuning pressure; hold out whole variant parents/families where relevant.
- **Use `workSpent` for cross-technique allocation.** Raw nodes are within-technique diagnostics; wall time is implementation cost. New actions/configurations do not get free additive budget.
- **Treat weights/profiles/widths/directions/seeds/thresholds/budgets as configurations until evidence shows a distinct mechanism.** Prefer bounded sweeps/racing and marginal portfolio value over name proliferation.
- **Preserve provenance classes and evidence roles.** Stored-valid, witness, human, hint-guided, variant-derived, isolated-technique, and cold production solves mean different things. Report population, independent unit, work envelope, selection procedure, and evidence role precisely.
- **Respect the variant-family boundary.** The large dataset lives off-main on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code with the dataset mounted separately. Existing variants are evidence, not a command to generate more.

Detailed method/stop/promotion rules live in [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md); evaluation/holdout intensity in [`docs/solver-evaluation-evidence.md`](docs/solver-evaluation-evidence.md).

## Context budget

Agent context is a repository resource. `docs/agent-context-routes.json` records representative default routes and separates **required orientation** from optional drill-down material. Run:

```bash
node scripts/agent-context-budget.mjs
node scripts/agent-context-budget.mjs --check
node scripts/agent-context-budget.mjs --route=solver-research
```

A growing repository is fine; a growing mandatory preload path should be deliberate. Large histories/catalogues are allowed when compact/queryable front doors keep ordinary tasks cheap.

## Verification

Use the cheapest check that answers the iteration question, then the relevant finish-line gate.

| Change | Default finish line |
|---|---|
| Normal code | targeted tests, then `npm run ci:fast` |
| Solver search/orchestration/repair/diversification/hint-ablation | targeted correctness + full `npm run ci`; research claims also follow population/work/confirmation rules |
| Solver routing/scheduling/configuration | experiment preflight; shared work envelope; current reach/marginal value; proportional independent confirmation/transfer |
| Browser/UI | focused Playwright; `npm run ci:full` for broad browser confidence |
| Solver hot path | targeted probes + [`docs/testing.md`](docs/testing.md) solved-set/cost gates + full `npm run ci` |
| Hard prune/cache/correctness | [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md) + proof-oriented soundness/referee/differential gates |
| Documentation | `npm run check:documentation-links` when possible |

`solver:regression --check` protects outcomes, not performance. GitHub Actions is execution infrastructure, not research evidence unless the exact run/protocol is reported.

For the current-reference inventory use [`docs/README.md`](docs/README.md). [`docs/command-glossary.md`](docs/command-glossary.md) maps runtime flow names to code; it is not CLI discovery.
