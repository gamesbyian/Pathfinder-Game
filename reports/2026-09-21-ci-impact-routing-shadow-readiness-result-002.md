# CI impact routing shadow readiness result 002

> **Date:** 2026-09-21
> **Status:** shadow-mode implementation checkpoint; no validation skipping enabled.
> **PR:** #1965.

## Current invariants

At this checkpoint the branch has:

- **28/28** permanent validators owned exactly once;
- **164/164** permanent Node/CLI harnesses owned exactly once;
- **10,291/10,291** tracked blobs classified;
- **0** unknown tracked paths.

Router/planner/workflow authority is explicitly full-impact and overrides narrower derived harness ownership.

## Historical replay

The extended backtest covers 27 recent merged PRs:

- **18/27 (67%)** scoped candidates;
- **9/27 (33%)** earned full-impact;
- all sampled maintained-workflow changes remain full;
- all sampled production-solver-module changes include solver;
- permanent `test:node` / `check:validators` composition changes remain full;
- scripts-only research command registration can remain narrow when every local target has known ownership.

See `reports/2026-09-21-ci-impact-routing-historical-backtest-002.md`.

## First live shadow observation

Actions run **35671767734**, job **106569608227** exercised the dependency-free `impact-shadow` path successfully.

The logged decision was:

```json
{
  "full": true,
  "surfaces": ["data", "game", "persistence", "repo", "research", "shared", "solver"],
  "validatorGroups": ["data", "game", "repo", "research", "shared", "solver"],
  "nodeTestGroups": ["data", "game", "persistence", "repo", "research", "shared", "solver"],
  "capabilities": ["build", "deep-proofs", "firestore-boundary", "lint", "solver-canary", "unit-coverage"]
}
```

That is the expected result for #1965 because this PR changes the impact router, validation planner, package/validation authority, and `ci.yml` itself. The observed full fallback therefore agrees with the model's strongest safety rule.

The full gate jobs in that run were later cancelled by a superseding commit; that does not affect this observation because the shadow job had already completed successfully and shadow mode does not claim full-gate outcome evidence.

## Planner/gate parity

`scripts/check-ci-validation-plan-parity.mjs` now binds planner capabilities to the real gate:

- package-script-backed capabilities must still exist in `package.json`;
- each capability must still expose its expected step id in `.github/workflows/ci.yml`;
- every planned validator/Node group must exist in the ownership registry;
- the union of every surface must cover every registered group and every capability.

This closes the failure mode where the planner remains internally green while the real gate evolves underneath it.

## Node harness concurrency measurement

The shared script runner has an opt-in `PATHFINDER_PARALLEL_JOBS=<N>` worker pool while preserving the historical unbounded default.

`.github/workflows/ci-node-concurrency-benchmark.yml` is manual-only and benchmarks requested values (default 4,8,16,unbounded) sequentially on one runner. Variant order rotates across repeats to reduce warm-cache/order bias. No normal PR pays this benchmark cost.

No default concurrency change is justified until those measurements exist.

## Remaining activation gates

Before scoped execution becomes authoritative:

1. collect live shadow decisions on PRs that are not themselves CI/router changes;
2. run the concurrency benchmark enough times to distinguish a stable win from runner noise;
3. encode/test the intended lane-packing and final required-status contract;
4. activate scoped execution with conservative fallback to full on router failure or ambiguity;
5. retain periodic/manual full-oracle validation after activation.
