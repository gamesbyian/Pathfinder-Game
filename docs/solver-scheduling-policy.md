# Evidence-driven solver scheduling and allocation

> **Status:** active policy/research contract; [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns current execution priority and next gate.
> **Objective:** replace fixed-ladder accretion with level-blind bounded allocation that improves the solve/`workSpent` Pareto frontier while preserving reproducible rare capability.
> **Related:** implementation [`solver-architecture.md`](solver-architecture.md); research method [`solver-research-operating-model.md`](solver-research-operating-model.md); budget semantics [`solver-budget-determinism.md`](solver-budget-determinism.md).

The runtime question is:

> Given legal features of this unseen level, what has happened in this solve, which actions/continuations remain, and the shared work left, what is the best next use of that work?

For an action already unsolved through work `t`, value the next tranche **conditional on surviving unsolved to `t`**. A budget stop is right-censoring; natural exhaustion means no continuation remains in that state.

## Governance

1. Adding an action expands the menu, not the default aggregate work budget.
2. Schedule concrete actions/configurations/tranches, not marketing names.
3. A continuation re-earns later work from residual value; early participation grants no permanent entitlement.
4. Distinguish natural exhaustion from budget censoring.
5. Use canonical `workSpent` across techniques; nodes remain within-technique diagnostics.
6. Dead-last non-interference with earlier winners is not economic evidence.
7. Level-blindness is necessary but repeatedly mined scheduler rules still need independent confirmation proportional to selection pressure; broad/high-selection-risk claims need cross-distribution challenge evidence under [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).
8. Unexplained predecessor-state dependence blocks causal scheduler inference.
9. Use systematic racing/configuration search rather than hand-authoring large nearby families.
10. Preserve rare unique capability and uncertainty; do not optimize only the mean.
11. Prefer simple policies when held-out performance is indistinguishable.
12. Historical conditional success is nomination evidence until reach/sequence/state/work are controlled.
13. Dynamic/ML/hazard/bandit infrastructure needs measurable fixed-work oracle headroom beyond simple policies.
14. Keep a known-good fallback during rollout/debugging; fallback is damage containment, not validation.

## Runtime information boundary

Legal inputs include current level structure/mechanics, generic topology/distance descriptors, current action/stage/config, exhaustion/censoring, `workSpent`, objective/resource progress, repair/frontier/retention telemetry produced during this solve, and generic offline-learned policies using those legal features.

Forbidden steering includes exact identity/corpus position, saved hints/solutions, historical solved/cost/winner/seed/order, per-level historical caches, and family/variant outcomes. High-dimensional fingerprints need extra scrutiny for accidental family/identity lookup. See [`solver-level-blindness.md`](solver-level-blindness.md).

## Action identity

Use a stable research identity for each meaningful candidate action. Keep two layers distinct:

- **search-action identity:** engine/family, scoring profile/weights, ordering bias, beam width/mechanic-bucket retention, seed/restart semantics, behavior-changing flags;
- **execution context:** stage/tier, predecessor contract, forced overrides, fresh vs continuation, allocated tranche, accounting scope, typed producer inputs.

A continuation tranche is separately valued: `repair 20M→30M` need not have the same value as `repair 0→10M`. Do not proliferate permanent profile names merely to encode explored combinations.

## Configuration and portfolio search

Start with the **existing semantically valid action grammar**, not the Cartesian product of every ablation flag. Many flags are context-specific, closed, or pure-speed.

Complexity ladder:

1. prune/race existing actions;
2. construct a small fixed-work static portfolio;
3. test a few legal static routing features;
4. refine weights/widths/budgets/thresholds only around surviving families;
5. use an external configurator or learned selector only if simpler stages leave held-out headroom.

For any search: define legal conditional ranges; use stable config IDs; group correlated family rows; eliminate weak arms early; optimize marginal portfolio value/Pareto behavior and rare exclusives; record search size/selection rule; independently confirm selected survivors.

Report coverage versus portfolio cardinality under the same aggregate work envelope, including which rare/exclusive solves disappear as the portfolio shrinks. Charge every reached failed action for its work.

**Rung 2 tooling (built 2026-09-02, see [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) Workstream 2 and [`2026-09-02-static-portfolio-construction-pilot.md`](../reports/2026-09-02-static-portfolio-construction-pilot.md) for the full evidence trail):** a real fixed-work static-portfolio execution mode exists and needs no `attempts.ts`/production orchestration change. `technique-census-cell.mjs`'s `runCell` already runs an arbitrary ORDERED technique-key list against one level under one cumulative shared work budget with early-exit-on-success; its opt-in `cell.perTechniqueWorkCap` additionally bounds each individual technique's own share, which is required whenever a non-naturally-terminating technique (e.g. `repair`, which right-censors at whatever cap it is given rather than exhausting) could otherwise consume an entire shared budget and starve every later list position regardless of budget size. `scripts/build-static-portfolio-plan.mjs` constructs a plan (population + named ordered-technique-key arms + one shared budget, optionally `--per-technique-work-cap`); a 2026-09-03 addition, `--per-technique-work-cap-map`/`cell.perTechniqueWorkCapByKey`, lets individual techniques have their own cap instead of one flat cap for the whole menu — needed for a tranche-weighted allocation (cheap self-exhausting beams protected less, deep DFS/IDA/repair continuations protected more) rather than every technique getting the same share regardless of its own real cost; a technique absent from the map falls back to the flat cap. `scripts/combine-static-portfolio-shards.mjs` aggregates shard results into per-arm coverage/work and a pairwise comparison against a named control arm, failing loudly on incomplete/inconsistent plan coverage. `.github/workflows/static-portfolio-confirmation.yml` dispatches this at population scale (artifact-only, no commit). `scripts/stress/select-random-sample.mjs` draws a deterministic seeded UNIFORM population sample (with `--exclude-ids-from` to keep it disjoint from an already-mined discovery sample) — use this, not a routing-regime/mechanic-eligibility-gated selector, for a portfolio-cardinality question that is not scoped to a particular mechanic/regime.

## Budget-model completion prerequisite

The scheduler cannot be coherently repriced while a non-binding wall deadline can still resize deterministic search. The workstream authority therefore treats budget-model completion as scheduler foundation, not optional architecture cleanup.

Before new production allocation policy is promoted:

1. **Own work explicitly.** `stage-budget.ts` / `BudgetEnvelope` should describe the work actually granted to a stage; wall time is deadline metadata, nodes are local/diagnostic guards.
2. **Remove hidden cap lifetime.** Replace shared mutable `prep._workCap` inheritance with explicit attempt/stage budget context. Compatibility scopes may bridge the migration, but a prior stage must not be able to donate or starve work accidentally.
3. **Isolate multi-solve accounting.** Discovery/research sessions must own their work scope rather than consuming a realm-global counter that unrelated solves can advance.
4. **Price heterogeneous techniques in work.** Keep the existing node census for within-technique depth/censoring analysis, but scheduler cost comparisons require equal-work execution or trustworthy `workSpent` observations.
5. **Retire ms-derived allocation incrementally.** For each inventoried `timeBudgetMs * fraction` additive tier, first measure/derive its current effective work dose and reproduce that policy with explicit work. Preserve eligibility/order/seed behavior during this migration. Any deliberate repricing is a separate experiment.
6. **Expand the invariant.** Every migrated stage should join the regression that changing a generously non-binding deadline leaves deterministic search unchanged. The end state is whole-solve deadline independence.
7. **Keep the ratchet shrinking.** `check:solver-budget-boundaries` may lose legacy allowlist entries as migration proceeds; it must not gain new wall-derived allocation sites.

This prerequisite does **not** require converting production to `strictTotalWorkBudget` wholesale. That switch remains the current experiment mechanism for matched whole-solve envelopes. Production total-work policy is itself a scheduler decision and must earn it through matched evidence.

## Offline scheduler analysis

Before live reordering, materialize comparable current action/reach/`workSpent` data and build:

### Equal-work calibration now available

The bounded EW1 pilot ([2026-08-28 report](../reports/2026-08-28-ew1-equal-work-technique-census-pilot.md)) supplies the first decision-bearing cross-family calibration in canonical work: 60 frozen-gap levels, 34 base techniques, 2,015 eligible cells at 10M work each. Corrected run 33156541827 produced a 12/60 oracle union with beams solving 8 levels, 6 beam-exclusive; IDA 3 levels, 2 exclusive; ordinary DFS 2, 1 exclusive; repair 2, 1 exclusive. Every beam naturally exhausted below 10M while almost every unsuccessful DFS/IDA/repair cell consumed the cap. Treat this as strong support for **cheap beam screens first, protected distinct deep capability later, and competitive DFS/IDA continuation entitlement**. Do not expand EW1 just for smoother rankings; join these prices to current production reach/work before the next static matched-work A/B. The supported post-naming join is `npm run solver:analyze-equal-work-production-reach -- --equal-work=<EW1 combined-cells.json> --production=<current solver report> --require-current-head --check`; generate the production side with lifecycle telemetry and per-attempt work, and treat a blocked join as missing infrastructure/evidence rather than a scheduler result.

### Residual/tranche table

For each material action/context/tranche report eligible/reached population; risk set at tranche start; solves/unique marginal solves; natural exhaustion vs censoring; solved/failed `workSpent`; failed-work tax; overlap/substitution with alternatives; current reach; evidence provenance; uncertainty/denominator.

Do not keep exhausted rows in later risk sets or turn timeouts into exact runtimes.

### Fixed-work oracle frontier

Estimate the best measured coverage-vs-work frontier at several envelopes, with rare/exclusive losses, missing-cell/uncertainty sensitivity, and perfect-routing ceiling separated from achievable simple policies.

This is a value-of-information gate. If a tiny static policy captures nearly all credible headroom, sophisticated scheduling has not earned implementation. The mined matrix gives an optimistic ceiling, not a forecast.

### Tail audit

For every current additive/retry stage record reach, unique residual solves, conditional `workSpent`, actual winning sub-actions, upstream redundancy, equal-cost alternatives, robustness of rare wins, and whether later tranches still earn continuation value.

Current cap/tranche evidence is documented in [`technique-census-analysis.md`](technique-census-analysis.md) and [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md). The immediate live gate remains in the queue, not here.

## Generalization

Scheduler development has unusually high selection/overfit surface because it compares many actions/features/tranches.

Use the roles in [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Split before fitting thresholds/features; group variant siblings by parent; prefer simple baselines; report policy complexity; consume untouched confirmation blocks rather than repeatedly peeking at one holdout; and use a materially different source/generator when the scheduler claim itself is cross-distribution. Assess decision quality on rare cohorts and use independent-unit resampling where useful.

A baseline-failure-conditioned population supports claims about that residual tail, not unconditional unseen-level improvement.

## Scheduler generations

### Static

Use legal static features and a fixed aggregate envelope. Begin with a small deterministic rule/action order. A useful first policy may simply reorder cheap screens, split deep continuations into tranches, and remove dominated tail work rather than predict one winning technique.

### Dynamic

Only after static scheduling shows confirmed value and residual headroom, add current-solve telemetry such as exhaustion, progress, repair plateau, frontier pressure, or resource state. Each dynamic feature needs a concrete conditional-value hypothesis, cheap computation, controlled predecessor semantics, and held-out incremental policy value.

Empirical tranche tables precede survival/hazard models; bandit/value-of-computation control is later still.

The 2026-09-03 dynamic tranche pilot also exposed an execution prerequisite: a predictive continuation signal is not economically actionable when the search must restart and repay prior work. Before richer dynamic allocation, the live queue now carries a bounded in-memory beam-resumability feasibility gate. See [`solver-search-resumability.md`](solver-search-resumability.md).

### Typed producer signals

Only after one stage demonstrably emits useful information another action cannot cheaply rediscover should a typed artifact enter scheduler state. Follow the producer→consumer contract in [`solver-research-operating-model.md`](solver-research-operating-model.md); no general blackboard.

## Fallback

For unsupported/out-of-distribution cases, prefer conservative behavior: baseline order, a small protected complementary set under high uncertainty, no sharp extrapolation beyond calibrated ranges, and telemetry identifying fallback/low-confidence decisions. Do not treat an uncalibrated “confidence” scalar as safety.

## Architecture seam

- `stage-policy.ts`: stable stage/action metadata;
- `attempts.ts`: candidate definitions/static features;
- `stage-plan.ts`: eligibility/order/planning;
- `stage-budget.ts`: authoritative work envelope/tranches/minima plus explicit node/deadline guards;
- `orchestration.ts`: execution/telemetry feedback, not policy sprawl;
- `stage-executors.ts`: execute an action without owning global order.

The migration should reduce first-match bundle logic, not add a parallel policy layer. Budget-model completion is part of this seam: once a stage's work policy is represented here, orchestration should execute it rather than reconstructing work from milliseconds.

## Promotion path

1. preflight run identity/population/action IDs/work envelope/evidence role;
2. establish residual-value tables and fixed-work oracle headroom;
3. compare a deliberately simple baseline;
4. check stability/uncertainty/rare capability;
5. shadow candidate choices without changing search;
6. run a matched-work live A/B;
7. independently confirm selected policy/configuration;
8. use sample-independent confirmation and cross-distribution transfer/challenge evidence appropriate to the policy's selection pressure and claim scope;
9. report gains/losses, `workSpent`, wall cost, reach, actions/tranches, errors/truncation, rare unique losses, complexity, fallback rate;
10. periodically reprice all actions/tails.

## Relationship to speed work

Scheduling reduces unnecessary logical work; architectural optimization reduces the cost of work still worth doing. Scheduler comparisons use machine-independent work. Pure-speed changes preserve logical search when claiming order preservation. Doing less work is not an implementation speedup. See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).