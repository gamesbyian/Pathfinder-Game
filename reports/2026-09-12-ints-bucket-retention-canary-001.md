# Ints-bucket beam retention canary 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — bounded A/B canary of a new, generic, opt-in beam frontier-retention mode (`intsBucketRetention`, buckets by `ints`/required-intersections-visited instead of `(mustCrossMask, flipperUsedMask)`) against production's plain top-K retention, on the exact frozen 28-level first-loss frontier population from the two 2026-09-11 first-loss reports, matched width (2000) and node budget (3,000,000) against those reports' own published control numbers.
> **Decision:** zero new solves, zero regressions, zero correctness alarms, and a depth-delta range (−3 to +8, mean +0.14) fully inside the already-characterized 0-13-step width-insensitivity noise band the 2000→5000 width delta produced on this same population. Per the frozen advancement rule below, this closes the mechanism **negative** — it does not earn a larger prespecified A/B.
> **Remaining gate:** none for this specific mechanism/population. Per `solver-optimization-workstreams.md` WS4's reopen condition ("independent recurrence across materially distinct actions **or** a new bounded descriptor"), this was the concrete test of the second branch (a new bounded retention mechanism); it does not clear the bar. WS4 stays closed.
> **Evidence role:** bounded mechanism pilot (28 levels, one canary run). No production solver-behavior change — the new retention mode is implemented opt-in/default-off and not wired into any `ATTEMPT_POLICY` entry.

## Why now

The two 2026-09-11 first-loss reports ([`dev`](2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md), [`confirmation`](2026-09-11-ws2-independent-first-loss-confirmation-001.md)) doubly confirmed (28/28, sample-independent) that known-live paths on this population die via `score-width-culled`: locally well-ranked (DFS-greedy mean rank 2-3 at the cull depth, falsifying a shared-scorer explanation) but discarded by beam's simultaneous multi-path width competition among 2000-4500 other candidates. `solver-optimization-workstreams.md`'s WS4 row and the confirmation report's own gate both name the missing ingredient explicitly: "cross-action recurrence needs a materially distinct action (repair) **or a materially new bounded retention mechanism** before WS4 reopens." The repair-side branch closed separately ([`repair-side first-loss exposure`](2026-09-11-repair-side-first-loss-exposure-001.md): repair's failure mode is near-total natural non-exposure, not rank-retention-loss — a different mechanism, not confirming recurrence). This report is the other branch: the smallest possible test of a new bounded retention mechanism, before investing in anything larger.

## Mechanism

`search.ts` already has a proven pattern for width-diversity retention: `_mechanicBucketSelect` (production `mechanicBucketRetention`) buckets the score-sorted candidate pool by `(mustCrossMask, flipperUsedMask)` and guarantees `floor(beamWidth/numBuckets)` slots per bucket before filling the remainder by score. It collapses to plain top-K (no effect) whenever the population shares one `(mustCrossMask, flipperUsedMask)` value — which is most of the intersection-heavy population this canary targets (little or no live must-cross/flipper state). Generalized the same partition-then-fill algorithm (extracted as `_bucketSelectByKey`) to a new sibling, `_intsBucketSelect`, bucketed by `c.ints` (required-intersections visited) instead — the one landmark-progress scalar every beam node tracks regardless of routing regime. Wired as a new trailing, opt-in `intsBucketRetention` parameter on `beamSearchFromGate` (default `undefined`/off, so every existing positional caller is byte-for-byte unaffected; mutually exclusive with `mechanicBucketRetention`, checked and thrown on at call time). Also fixed `known-solution-prefix-survival.ts`'s `summary()` to recognize the new `ints-bucket-culled`/`post-ints-bucket-selection` research-observer stages as removal/boundary events (additive; the existing `mechanic-bucket-culled`/`score-width-culled` handling is unchanged), so a run using this retention mode attributes its own extinction point correctly instead of silently miscounting it.

Unit coverage: `_intsBucketSelect` guarantees per-bucket representation against a naive top-K counterexample and degrades to top-K on a single bucket (`search.test.ts`); the new mutual-exclusivity guard is asserted directly. `npx tsc --noEmit`, targeted `vitest` (`search.test.ts`, `attempt-dispatch.test.ts`, `testing-api.test.ts`, `beam-resumability-pilot.test.ts`, `attempts.test.ts`, `known-solution-prefix-survival.test.ts`) all pass.

## Frozen design (recorded before running)

- **Population:** the exact 28 ids from the dev (14) + confirmation (14) first-loss samples — no new sampling.
- **Comparator:** control = plain top-K (`mechanicBucketRetention=false, intsBucketRetention=false`, what all 28 already ran under in both source reports); treatment = `intsBucketRetention=true`. Same gate (densest-label group), profile (`default`), beam width (2000), node budget (3,000,000) as those reports' own width=2000 run — a matched-work comparison against already-published control numbers.
- **Metrics:** (1) solved (referee-validated) — primary; (2) for still-unsolved levels, final-known-support depth vs. control; (3) correctness alarms (must stay 0).
- **Advancement rule, fixed in advance:** zero solves *and* no depth improvement beyond the already-characterized 0-13-step width-insensitivity noise band closes this mechanism negative — do not scale up. Any solve, or a depth improvement clearly outside that noise band on multiple levels, earns a larger prespecified A/B (not itself a promotion).

## Result

```
node scripts/run-bundled.mjs scripts/stress/ints-bucket-retention-pilot.mjs -- \
  --out=reports/stress/ints-bucket-retention-pilot-001.json
```

| metric | value |
|---|---:|
| levels | 28 |
| control solved | 0 |
| treatment solved | 0 |
| new solves | 0 |
| regressions | 0 |
| correctness alarms | 0 |
| depth-delta mean | +0.14 |
| depth-delta range | −3 to +8 |

27/28 levels' loss cause is `ints-bucket-culled` under treatment (vs. `score-width-culled` under control) — the retention mode is genuinely active and changing which candidates get discarded, not a no-op. The one level with the largest delta (+8, `R00786`) and every other level stay inside the noise band already established by the 2000→5000 width experiment (0-13 steps, dev+confirmation combined) — indistinguishable from ordinary width-driven variance, not a new capability signal.

## Interpretation

Bucketing by raw intersection-progress count does not help here because it is not the axis the population's own diversity lives on: the phenotyping reports already established these levels are locally well-ranked at every step (DFS mean rank 2-3) and lost purely to cumulative score competition among a very large same-depth candidate pool. A retention rule reserving slots by `ints` mostly reserves slots for candidates that already share the *same* `ints` value as the eventual winners (high branching within one intersection-progress tier, not across tiers), so it does not change which candidates compete for the scarce slots that actually matter. This is consistent with, not contradictory to, the phenotyping reports' own conclusion that width-insensitivity argues against "just needs more/differently-shaped room" as an explanation.

## Disposition

- **Mechanism: CLOSED NEGATIVE.** `intsBucketRetention` earns no further investment on this population. Per `solver-optimization-workstreams.md`'s standing rule, do not reopen without a materially new premise (e.g., a different bucket key with an actual argument for why it separates the winning candidates from the competing pool — not merely "another progress scalar").
- **WS4 reopening: still not earned.** Both named routes (cross-action recurrence, a new bounded retention mechanism) have now been tested and closed. WS4 stays `CLOSED IN TESTED FORMS`.
- **Capability signature preserved per the capability-memory contract:** `intsBucketRetention` is implemented, tested, and available in `search.ts`/`known-solution-prefix-survival.ts` as a clean opt-in primitive (zero production effect) should a future bucket-key argument revisit width-diversity retention; it does not need reimplementing from scratch even though this specific key is closed.
- **Does not establish:** whether a materially different retention axis (e.g., structural-family signature, or a positional/topological diversity key) would fare differently — untested here, and not warranted without its own argument for why it would separate the competing pool.

## Artifacts

- `modules/solver/search.ts` — `_bucketSelectByKey` (shared primitive), `_intsBucketSelect`, `intsBucketRetention` param on `beamSearchFromGate`, new `ints-bucket-culled`/`post-ints-bucket-selection` research stages.
- `modules/solver/types.ts` — `BeamResearchStage` extended with the two new stage literals.
- `modules/solver/known-solution-prefix-survival.ts` — `summary()` recognizes the new stages as removal/boundary events.
- `modules/solver/search.test.ts` — unit coverage for `_intsBucketSelect` and the mutual-exclusivity guard.
- `scripts/stress/ints-bucket-retention-pilot.mjs` — new, reusable canary tool (frozen population hardcoded; `--only=` is a smoke-test escape hatch only).
- `reports/stress/ints-bucket-retention-pilot-001.json` — full per-level result.
