# Search-loss instrumentation pilot

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — 16-parent hosted real-search canary with solved controls, parity, overhead, bounded-capture, and audit-preflight evidence.
> **Decision:** compact failure instrumentation is safe for ordinary collection at the measured cost; rich capsules remain selective/question-driven because their hosted wall overhead is about 10%.
> **Remaining gate:** an actual recurring search-loss producer population before Resource Contract promotion/audit declaration. Do not manufacture recurrence from a one-off canary.
> **Evidence role:** infrastructure/promotion-gate evidence; no solver-policy or causal scientific claim.
> **Population:** latest canary = 12 deterministic Corpus-2 stress parents + 4 deterministic published-level solved controls.

## Implemented seams

- Progress: bounded family-scoped new-best collector; repair emits already-computed new-best badness, while DFS/beam emit their already-existing terminal badness only. The latter adds no information beyond terminal badness, so progress telemetry remains specialist and is not enabled universally.
- Rejection composition: beam may aggregate the existing typed `PruneDiagnostics.reached/rejected` maps per attempt. There are no per-node records and no second taxonomy.
- Beam flow: an optional counter-only path records incoming, generated, hard-pruned, merge-removed, score/mechanic/ints culled, and retained counts without reconstructing paths or ranked pools.

## Parity and size canary

Command: `npx vitest run modules/solver/search.test.ts modules/solver/failure-progress.test.ts --reporter=verbose`.

On the deterministic beam fixture, observer-off, counter-only, and rich-observer modes returned the same path and identical node/work totals. One local sample measured 1.76 ms off, 1.89 ms counter-only, and 1.77 ms rich; the counter payload was 28 bytes versus 146 bytes for stage names alone (the real rich records are larger). These sub-2-ms timings are dominated by noise and do **not** establish negligible overhead. The result clears semantic parity, not promotion.

## Disposition

- counter-only flow: implemented; representative overhead gate cleared as part of the compact instrumentation class;
- typed rejection counts: implemented; representative overhead gate cleared as part of the compact instrumentation class;
- repair progress transitions plus bounded beam/DFS progress observations: implemented and production-inert under the representative parity canary;
- rich replayable cull capsules: implemented and parity-clean, but remain selective/question-driven because hosted overhead is materially higher than compact collection;
- recurring rich-capture persistence: deferred until a concrete recurring research consumer justifies the cost and conditioning.


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


## Follow-up bounded-capture canary — GHA run 35423279713

A second representative real-search run on immutable head `aba8dc9e961898b3e00c607a13fcc20c8bf54419` repeated the parity result and validated the denominator-hardening work.

Observed aggregate wall time:

| Mode | Aggregate wall ms | Delta vs observer-off |
| --- | ---: | ---: |
| observer off | 164,127.9 | — |
| compact counters/progress | 165,155.3 | +0.63% |
| bounded rich cull observation | 179,120.6 | +9.13% |

Again, semantic parity was exact on all 12 hard parents. Compact payload remained 35,342 bytes and the same repair/beam/DFS progress families participated. This independently reinforces the conclusion that compact instrumentation is below the plan's 5% overhead threshold, while rich capture remains appropriate only as a selective profile.

The rich artifact now passes the structural capture gate:

- valid capture contract;
- observer parity verified;
- multi-parent population;
- non-empty capsules;
- selector denominators present;
- immutable resolved SHA;
- non-synthetic producer.

Resource Contract promotion still correctly remains blocked on:

1. a solved-control observation in the captured population;
2. a recurring producer declaration.

The canary population is being extended with a small published-level solved-control cohort, and control status is now evaluated from the population envelope rather than only from parents that happened to retain a cull capsule.


## Solved-control closeout canary — GHA run 35423841173

The latest run on immutable head `cfd6d02ca6ff6cd6ade919e3be89d7be617ca777` closes the remaining empirical Phase-4 conditioning gate by adding four solved controls to the same observer-off / compact / rich protocol.

Observed aggregate wall time:

| Mode | Aggregate wall ms | Delta vs observer-off |
| --- | ---: | ---: |
| observer off | 164,605.3 | — |
| compact counters/progress | 165,357.2 | +0.46% |
| bounded rich cull observation | 181,596.6 | +10.32% |

Semantic parity was exact for all 16 parents in both observational modes. Compact payload was 35,710 bytes. Rich capture observed 551 cull decisions and retained bounded replayable evidence on 6 parents. Progress observation again exercised all three intended families: repair 160, beam 302, DFS 945.

The Resource Contract preflight on the emitted real capture reports:

- `captureGateClear=true`;
- `empiricalConditioningReady=true`;
- `auditReady=false`;
- only remaining failed check: `recurringProducerDeclared`.

That is the intended boundary. The capture format, selector denominators, parent population envelope, solved/failed controls, immutable run provenance, and non-synthetic producer are now empirically demonstrated. The asset remains `contract-only` because the repository does not yet have a genuine recurring search-loss producer population whose missingness, conditioning, dependence, durability, and consumers can be audited as a recurring resource.
