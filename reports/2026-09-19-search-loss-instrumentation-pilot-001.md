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
