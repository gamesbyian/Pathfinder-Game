# Mechanic-bucket-retention-on-intersection-heavy canary 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — bounded canary applying the EXISTING, already-promoted `mechanicBucketRetention` mechanism (zero new code) to the frozen 28-level first-loss frontier population, checked directly against a routing-eligibility premise: `docs/solver-architecture.md` documents this retention mode as reserved for the must-cross-heavy regime, but 60% of intersection-heavy class-5 residual levels (213/355, and all 28 of this frozen population, verified directly rather than assumed) carry nonzero `mustCross` counts, so the mechanism has real bucket diversity available on them even though `ATTEMPT_POLICY` never offers it there.
> **Decision:** zero new solves, zero regressions, zero correctness alarms. Depth deltas range −13 to +8 (mean −0.75) — fully inside the already-established 0-13-step width-insensitivity noise band, and if anything net negative on average, unlike the same-population `intsBucketRetention` canary's near-zero mean. **CLOSED NEGATIVE** per the same frozen advancement rule.
> **Remaining gate:** none for this routing-eligibility premise on this population. Do not extend `mechanicBucketRetention` eligibility to intersection-heavy routing from this evidence.
> **Evidence role:** bounded mechanism-eligibility pilot (28 levels, same population/method as [`the intsBucketRetention canary`](2026-09-12-ints-bucket-retention-canary-001.md)). No production routing change (the mechanism's `ATTEMPT_POLICY` eligibility is unchanged).

## Why now

While investigating why `intsBucketRetention` (bucketed by `ints`) failed to help this population, a check of the population's own structural features found all 28 levels have nonzero `mustCross` counts (1-8) — contradicting the a-priori assumption (stated in that report's own first draft) that intersection-heavy levels mostly lack must-cross structure. Since `_mechanicBucketSelect` (the existing, already-promoted mechanism bucketing on `(mustCrossMask, flipperUsedMask)`) would therefore have genuine, non-degenerate bucket diversity on these levels, this is a zero-engineering-cost question: does the mechanism the codebase already trusts for must-cross-heavy routing also help when applied (research-only, via the existing opt-in `mechanicBucketRetention` parameter — no `ATTEMPT_POLICY` change) to intersection-heavy levels it is never currently offered on?

## Method

Extended `scripts/stress/ints-bucket-retention-pilot.mjs` with `--mode=mechanic|ints` (default `ints`, preserving the already-published canary's exact behavior/output). `--mode=mechanic` runs the identical control/treatment/metrics/population/budget design as the `intsBucketRetention` canary, substituting `mechanicBucketRetention: true` for the treatment arm (existing `beamSearchFromGate` parameter, position 10, no new search.ts code exercised).

```
node scripts/run-bundled.mjs scripts/stress/ints-bucket-retention-pilot.mjs -- \
  --mode=mechanic --out=reports/stress/mechanic-bucket-on-intersection-heavy-pilot-001.json
```

Same frozen population (28 ids), comparator (plain top-K vs. treatment), width (2000), node budget (3,000,000), and pre-registered advancement rule as the `intsBucketRetention` canary.

## Result

| metric | `intsBucketRetention` (prior) | `mechanicBucketRetention` (this report) |
|---|---:|---:|
| new solves | 0 | 0 |
| regressions | 0 | 0 |
| correctness alarms | 0 | 0 |
| depth-delta mean | +0.14 | **−0.75** |
| depth-delta range | −3 to +8 | −13 to +8 |

26/28 levels show zero or negative delta; only `R02438` improves meaningfully (+8, inside the established noise band). Three levels regress by double digits in relative terms (`R03351` −13, `R02897` −10, `R02185` −3) — the mechanism actively hurts survival depth on these by displacing genuinely higher-scored, on-path candidates to protect must-cross/flipper-bucket minorities that do not, in this structural context, correlate with eventual path viability the way they do in the must-cross-heavy contexts this mechanism was validated and promoted for.

## Interpretation

The routing-eligibility premise ("this mechanism could help here, and current `ATTEMPT_POLICY` just never tries it") is directly falsified on this population: the mechanism has real bucket diversity available (unlike a degenerate single-bucket case) and still nets negative. Combined with the `intsBucketRetention` result, this is now the **second** distinct bucket key tested against this exact population's `score-width-culled` loss, and the second to close negative — reinforcing that the loss is not a retention-diversity-axis problem addressable by keying on any single state scalar tried so far (mechanic masks, intersection count).

## Advancement

**CLOSED NEGATIVE.** Do not extend `mechanicBucketRetention` `ATTEMPT_POLICY` eligibility to intersection-heavy routing from this evidence. This does not reopen or narrow `mechanicBucketRetention`'s existing must-cross-heavy promotion, which was independently validated on its own population. Per the standing WS4 disposition, a third bucket-key variant on this same population needs its own materially new argument, not another single-scalar substitution — see the `intsBucketRetention` canary's own disposition for the same discipline.

## Artifacts

- `scripts/stress/ints-bucket-retention-pilot.mjs` — `--mode` flag added (this pilot's only code change; `--mode=ints` behavior/output unchanged).
- `reports/stress/mechanic-bucket-on-intersection-heavy-pilot-001.json` — full per-level result.
