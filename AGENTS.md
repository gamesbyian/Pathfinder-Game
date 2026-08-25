# Pathfinder agent guide

Canonical compact entry point for coding/research agents. Load only task-relevant references; use [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) selectively for rare rules, solver gotchas, level facts, or provenance detail.

## Route by task

| Task | Read first |
|---|---|
| Ordinary product/code change | [`docs/architecture.md`](docs/architecture.md), then changed files |
| Cross-cutting schema/state/telemetry | [`docs/change-recipes.md`](docs/change-recipes.md), then owning topic doc |
| UI/input/accessibility/rendering | [`docs/architecture.md`](docs/architecture.md), [`docs/ui-accessibility.md`](docs/ui-accessibility.md), [`docs/testing.md`](docs/testing.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md), [`docs/solver-technique-operational-taxonomy.md`](docs/solver-technique-operational-taxonomy.md) when comparing named techniques/configs, [`modules/solver/README.md`](modules/solver/README.md), [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md) |
| Solver optimization/research | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md), then [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md); use [`docs/solver-scheduling-policy.md`](docs/solver-scheduling-policy.md), [`docs/solver-technique-operational-taxonomy.md`](docs/solver-technique-operational-taxonomy.md), and [`docs/solver-architectural-speed-opportunities.md`](docs/solver-architectural-speed-opportunities.md) for the relevant ranked program |
| Variant/family research | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| Existing probe/batch/workflow | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Prior experiment | [`reports/README.md`](reports/README.md), its report, then current topic doc |
| Deferred/reopen idea | [`docs/solver-future-work.md`](docs/solver-future-work.md) |
| Default-off disposition | [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md) |
| Stress corpus | [`data/stress/README.md`](data/stress/README.md) |
| Validation choice | [`docs/testing.md`](docs/testing.md) |

## Autonomy and scope

- **The prompt is a goal, not a hard file/task boundary.** Do adjacent work that materially advances it; avoid unrelated cleanup.
- **Prefer complete, durable solutions over timid partial steps.** Substantial refactors, migrations, or tooling are welcome when they are the strongest route. Use tests, evidence, and git history as safeguards.
- **Prefer branch/PR validation to merging merely to obtain evidence.** Merge to `main` before validation only when the required workflow or data path genuinely cannot exercise the candidate branch, and record why. Do not turn `main` into an experiment scratchpad.

## Execution philosophy

- **Keep the active task visible.** Do not silently replace an authorized task with a newly noticed one; finish it, block it explicitly, or state why adjacent work is required.
- **Optimize for the underlying objective, not literal prompt completion.** Follow useful discoveries through to their consequences.
- **Use evidence proportional to the decision.** Prefer the smallest reliable population that can falsify or decide the next gate. Full coverage is for claims or decisions that need it, not a default virtue.
- **A null result deserves diagnosis, not indefinite rescue.** Check implementation, participation, budget, instrumentation, and obvious confounds once. If the tested mechanism then remains negative or non-participating, close that form unless materially new evidence changes the premise.
- **Selection is part of the experiment.** If a candidate, threshold, seed, profile, population, or explanation was chosen after inspecting results, disclose that selection and do not use the same selected-on data as sole confirmation.
- **Investigate surprises.** Unexpected gains, losses, contradictions, and regressions are evidence to explain, not noise to smooth over.
- **Prefer causal evidence to stories.** Separate measurement, inference, hypothesis, and speculation; isolate mechanisms when practical.
- **Do not rediscover work.** Check code, tools, reports, queue, ledger, archive, and relevant data before proposing or rebuilding.
- **Close the loop.** If a bug invalidated an experiment, rerun it; if a result changes priorities, update the live authority. Leave the repo so the next agent can continue without this chat.
- **Treat unexplained solver weakness as a defect to understand.** Before accepting retries, bigger budgets, orientation tricks, nearby score vectors, or other workarounds as final design, investigate the underlying routing/search/representation failure.
- **Do not confuse more compute with a better policy.** A solved-set superset obtained by additive work still has a cost. Compare marginal solve value under an explicit shared `workSpent` envelope whenever allocation is part of the treatment.

## Rules

1. **Read current authority and implementation before editing.** Dated reports/archive are evidence/history, not current behavior or priority.
2. **Keep work coherent.** Do not pad a task with unrelated reformatting or speculative infrastructure, but do not artificially constrain a justified solution. Before adding tooling, check [`docs/tooling-catalog.md`](docs/tooling-catalog.md), `package.json`, [`scripts/README.md`](scripts/README.md), and [`.github/workflows/README.md`](.github/workflows/README.md). Follow the naming conventions in [`docs/README.md`](docs/README.md), [`reports/README.md`](reports/README.md), and [`logs/README.md`](logs/README.md); do not mint near-synonym paths casually.
3. **Audit cross-boundary propagation.** Solver stages/results, mechanics, hints/provenance, app state, and generated schemas often have multiple consumers; use [`docs/change-recipes.md`](docs/change-recipes.md).
4. **Solver priority comes from the live queue.** Current top work is: P0 unexplained cross-stage dependence; evidence-driven fixed-work scheduling/repricing; generalization/holdout discipline; systematic configuration/racing; causal beam retention; maintained exact/reference modeling; restart/learned-failure research; then the remaining specialist and speed programs. Specialist docs refine these lanes but do not outrank [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md). `solver-future-work.md` is deferred/reopen material and code presence does not imply an active hypothesis.
5. **Cold solver policy is level-blind, and level-blindness is not generalization.** Mechanics/current state are allowed; exact identity, saved hints, winner configs, historical solve status/cost, per-level caches/budgets, and variant outcomes are not. A policy repeatedly tuned on Corpus 2 can still overfit Corpus 2. See [`docs/solver-level-blindness.md`](docs/solver-level-blindness.md).
6. **Respect discovery, confirmation, and transfer roles.** Data used to invent/tune a treatment is development data for that decision. Hold out whole variant parents. Do not inspect a challenge/transfer failure and continue calling the same population untouched.
7. **Respect the variant-trove boundary.** The ~2.5 GB trove is on `claude/variant-levels-solver-insights-tpk4qg`; use current `main` code/instructions with the trove mounted separately. Existing variants are evidence, not a command to generate more. See [`docs/variant-level-research.md`](docs/variant-level-research.md).
8. **Preserve provenance classes.** Stored-valid, witness, human, hint-guided, variant-derived, and cold production solves have different research meanings.
9. **Do not hand-author a portfolio when the question is configuration search.** Weight/profile/width/direction/seed/threshold/budget variants are configurations until evidence shows a distinct mechanism. Prefer bounded sweeps/racing/automatic configuration and marginal portfolio value over serial guesses and name proliferation.
10. **Source is TypeScript.** `modules/` source is `.ts`; import specifiers intentionally use `.js` and resolve to `.ts`. See [`docs/typing.md`](docs/typing.md).
11. **Respect architecture boundaries.** `domain/`, `runtime/`, and `solver/` are browser-free logic; ENGINE mutations use state actions. Fix architecture-lint causes rather than weakening checks.
12. **Do not weaken validation to pass.** Root-cause unexpected `null`, invariant, CSP, architecture-lint, and solver-referee failures.
13. **Report evidence precisely.** State what ran, population/budget, candidate-selection procedure where relevant, and whether results are discovery, confirmation, transfer, measured, inferred, historical, or pending. Never claim an unrun check passed.

Investigations use the status/evidence-role/selection conventions in [`docs/investigation-report-conventions.md`](docs/investigation-report-conventions.md). [`docs/command-glossary.md`](docs/command-glossary.md) maps runtime flow names to code; it is not CLI discovery.

## Verification

Use the cheapest check that answers the iteration question, then the relevant finish-line gate.

| Change | Default finish line |
|---|---|
| Normal code | targeted tests, then `npm run ci:fast` |
| Solver search/orchestration/repair/diversification/hint-ablation | targeted correctness tests + full `npm run ci`; research claims additionally follow the operating-model population/work/confirmation gate |
| Solver routing/scheduling/configuration | experiment preflight; explicit shared work envelope; current-lifecycle reach/marginal value; independent confirmation when selected/tuned on development data |
| Browser/UI | focused Playwright; `npm run ci:full` for broad browser confidence |
| Solver hot path | targeted probes + [`docs/testing.md`](docs/testing.md) solved-set/cost gates + full `npm run ci` |
| Hard prune/cache/correctness | proof-oriented soundness/referee/differential gates in solver docs |
| Documentation | `npm run check:documentation-links` when possible |

`solver:bench --check` protects outcomes, not performance. GitHub Actions is execution infrastructure, not evidence unless the exact run/protocol is reported.

## Authority map

Current behavior comes from implementation/topic docs. Solver priority: [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md). Research method: [`docs/solver-research-operating-model.md`](docs/solver-research-operating-model.md). Scheduling/allocation: [`docs/solver-scheduling-policy.md`](docs/solver-scheduling-policy.md). Technique/config interpretation: [`docs/solver-technique-operational-taxonomy.md`](docs/solver-technique-operational-taxonomy.md). Architectural speed: [`docs/solver-architectural-speed-opportunities.md`](docs/solver-architectural-speed-opportunities.md). Families: [`docs/variant-level-research.md`](docs/variant-level-research.md). Default-off mechanisms: [`docs/solver-opt-in-experiment-ledger.md`](docs/solver-opt-in-experiment-ledger.md). Deferred ideas: [`docs/solver-future-work.md`](docs/solver-future-work.md). Experiments/history: [`reports/`](reports/README.md) and [`docs/archive/`](docs/archive/README.md).