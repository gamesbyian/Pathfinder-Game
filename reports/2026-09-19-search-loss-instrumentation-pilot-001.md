# Search-loss instrumentation pilot

> **Status:** inconclusive
> **Last evidence:** 2026-09-19 — deterministic unit-fixture parity and payload-size canary.
> **Decision:** retain all three telemetry paths as specialist-only; semantic parity passed but representative overhead/value did not run.
> **Remaining gate:** multi-parent real-search canary across repair and beam/DFS families with stable wall-time and byte measurements.
> **Evidence role:** infrastructure pilot; no solver-policy or scientific claim.
> **Population:** deterministic unit fixtures only; not representative performance evidence.

## Implemented seams

- Progress: bounded family-scoped new-best collector; repair emits already-computed new-best badness, while DFS/beam emit their already-existing terminal badness only. The latter adds no information beyond terminal badness, so progress telemetry remains specialist and is not enabled universally.
- Rejection composition: beam may aggregate the existing typed `PruneDiagnostics.reached/rejected` maps per attempt. There are no per-node records and no second taxonomy.
- Beam flow: an optional counter-only path records incoming, generated, hard-pruned, merge-removed, score/mechanic/ints culled, and retained counts without reconstructing paths or ranked pools.

## Parity and size canary

Command: `npx vitest run modules/solver/search.test.ts modules/solver/failure-progress.test.ts --reporter=verbose`.

On the deterministic beam fixture, observer-off, counter-only, and rich-observer modes returned the same path and identical node/work totals. One local sample measured 1.76 ms off, 1.89 ms counter-only, and 1.77 ms rich; the counter payload was 28 bytes versus 146 bytes for stage names alone (the real rich records are larger). These sub-2-ms timings are dominated by noise and do **not** establish negligible overhead. The result clears semantic parity, not promotion.

## Disposition

- counter-only flow: implemented, specialist, representative overhead gate open;
- typed rejection counts: implemented, specialist, representative overhead gate open;
- repair progress transitions: implemented, specialist; DFS/beam terminal-only observations are not promoted as “progress over work”;
- universal automatic persistence: deferred until a representative multi-parent canary shows negligible overhead and incremental value.


## Representative real-search follow-up — GHA run 35422485466

The fixture-only timing gate is now superseded for the compact instrumentation path by a representative 12-parent Corpus 2 canary on immutable head `1447fe8c6494426d606ac07e34faa7b874cd7c1c`.

Observed aggregate wall time:

| Mode | Aggregate wall ms | Delta vs observer-off |
| --- | ---: | ---: |
| observer off | 161,843.3 | — |
| compact counters/progress | 161,284.0 | -0.35% |
| bounded rich cull observation | 174,733.7 | +7.96% |

Semantic parity was exact on all 12 parents for both observational modes: no solve/status/solution/node/work drift.

Compact payload was 35,342 bytes across the sample. Compact progress observation exercised all three intended search families:

- repair: 160 observations;
- beam: 302 observations;
- DFS: 945 observations.

This clears the original <5% representative-overhead gate for the compact progress / prune-reason / beam-flow instrumentation as a class. Hosted timing noise means the negative point estimate is not interpreted as a speedup; the scientifically relevant conclusion is that no material slowdown was observed.

The rich observation arm retained cull evidence on 6 parents and observed 551 cull decisions before bounded selection. Its +7.96% wall delta is materially above the compact path and supports the existing architecture: rich capsules remain selective/question-driven rather than universally enabled.

The first green rich-capture artifact also exposed two selection/denominator issues that are now repaired in the canary implementation:

1. selector limits were global and could let early parents consume the retained-capsule allowance; selection is now bounded per independent parent and combined afterward;
2. capture `population.parentCount` incorrectly described only parents with retained capsules; it now describes the complete deterministic observed parent sample, with retained-capsule parent coverage recorded separately.

Those repairs require a subsequent canary artifact before Resource Contract promotion. The green run nevertheless closes the compact-overhead question.
