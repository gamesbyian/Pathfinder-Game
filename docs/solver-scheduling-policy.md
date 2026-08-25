# Evidence-driven solver scheduling and allocation

> **Status:** active policy/research contract; [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) owns rank and next gate.
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
7. Level-blindness is necessary but repeatedly mined scheduler rules still need independent confirmation/transfer for broad claims.
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

- **search-action identity:** engine/family, profile/weights, template, width/diversity, seed/restart semantics, behavior-changing flags;
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

## Offline scheduler analysis

Before live reordering, materialize comparable current action/reach/`workSpent` data and build:

### Residual/tranche table

For each material action/context/tranche report eligible/reached population; risk set at tranche start; solves/unique marginal solves; natural exhaustion vs censoring; solved/failed `workSpent`; failed-work tax; overlap/substitution with alternatives; current reach; evidence provenance; uncertainty/denominator.

Do not keep exhausted rows in later risk sets or turn timeouts into exact runtimes.

### Fixed-work oracle frontier

Estimate the best measured coverage-vs-work frontier at several envelopes, with rare/exclusive losses, missing-cell/uncertainty sensitivity, and perfect-routing ceiling separated from achievable simple policies.

This is a value-of-information gate. If a tiny static policy captures nearly all credible headroom, sophisticated scheduling has not earned implementation. The mined matrix gives an optimistic ceiling, not a forecast.

### Tail audit

For every current additive/retry stage record reach, unique residual solves, conditional `workSpent`, actual winning sub-actions, upstream redundancy, equal-cost alternatives, robustness of rare wins, and whether later tranches still earn continuation value.

Current cap/tranche evidence is documented in [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md) and [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md). The immediate live gate remains in the queue, not here.

## Generalization

Scheduler development has unusually high selection/overfit surface because it compares many actions/features/tranches.

Use discovery/tuning, untouched/grouped confirmation, and locked/fresh transfer/challenge roles. Split before fitting thresholds/features; group variant siblings by parent; prefer simple baselines; report policy complexity; avoid repeated transfer peeking; assess decision quality on rare cohorts; use independent-unit resampling where useful.

A baseline-failure-conditioned population supports claims about that residual tail, not unconditional unseen-level improvement.

## Scheduler generations

### Static

Use legal static features and a fixed aggregate envelope. Begin with a small deterministic rule/action order. A useful first policy may simply reorder cheap screens, split deep continuations into tranches, and remove dominated tail work rather than predict one winning technique.

### Dynamic

Only after static scheduling shows confirmed value and residual headroom, add current-solve telemetry such as exhaustion, progress, repair plateau, frontier pressure, or resource state. Each dynamic feature needs a concrete conditional-value hypothesis, cheap computation, controlled predecessor semantics, and held-out incremental policy value.

Empirical tranche tables precede survival/hazard models; bandit/value-of-computation control is later still.

### Typed producer signals

Only after one stage demonstrably emits useful information another action cannot cheaply rediscover should a typed artifact enter scheduler state. Follow the producer→receptor contract in [`solver-research-operating-model.md`](solver-research-operating-model.md); no general blackboard.

## Fallback

For unsupported/out-of-distribution cases, prefer conservative behavior: baseline order, a small protected complementary set under high uncertainty, no sharp extrapolation beyond calibrated ranges, and telemetry identifying fallback/low-confidence decisions. Do not treat an uncalibrated “confidence” scalar as safety.

## Architecture seam

- `stage-policy.ts`: stable stage/action metadata;
- `attempts.ts`: candidate definitions/static features;
- `stage-plan.ts`: eligibility/order/planning;
- `stage-budget.ts`: shared envelope/tranches/minima;
- `orchestration.ts`: execution/telemetry feedback, not policy sprawl;
- `stage-executors.ts`: execute an action without owning global order.

The migration should reduce first-match bundle logic, not add a parallel policy layer.

## Promotion path

1. preflight run identity/population/action IDs/work envelope/evidence role;
2. establish residual-value tables and fixed-work oracle headroom;
3. compare a deliberately simple baseline;
4. check stability/uncertainty/rare capability;
5. shadow candidate choices without changing search;
6. run a matched-work live A/B;
7. independently confirm selected policy/configuration;
8. use transfer evidence appropriate to broader claims;
9. report gains/losses, `workSpent`, wall cost, reach, actions/tranches, errors/truncation, rare unique losses, complexity, fallback rate;
10. periodically reprice all actions/tails.

## Relationship to speed work

Scheduling reduces unnecessary logical work; architectural optimization reduces the cost of work still worth doing. Scheduler comparisons use machine-independent work. Pure-speed changes preserve logical search when claiming order preservation. Doing less work is not an implementation speedup. See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).