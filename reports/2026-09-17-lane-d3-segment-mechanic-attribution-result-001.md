# Lane D3 segment-level mechanic attribution result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — per-segment re-analysis of the same deterministic pipeline `reports/2026-09-17-lane-d3-mechanic-conditioned-breakdown-result-001.md` used, verified to reproduce its exact totals (12,277/1,653) before drawing any conclusion, current HEAD.
> **Decision:** the flipper-zero finding (0% legal on any flipper-bearing level) survives at the per-segment level but is **not explained by the spliced segment itself touching a flipper cell** — within flipper-bearing levels, segments that avoid every flipper cell are *also* 0% legal (464/567, vs. 103/567 that do touch one; both subsets are exactly 0%). The finding's independent-level support is also smaller than the prior report's framing suggested: of the 10 levels statically classified as flipper-bearing, only **3** actually produced any length-matched commuting candidate at all (the other 7 produced zero commuting candidates outright, consistent with the original D3 report's "16/25 levels had zero commuting candidates"), and one single level supplies 399 of those 3 levels' 567 candidates (70%).
> **Remaining gate:** the mechanism is now known to be *not* simple per-segment mechanic avoidance. What it actually is (true flipper-parity history-dependence rippling through even a flipper-free segment, vs. an unrelated per-board geometric confound on these specific 3 boards) is not resolved by this population and would need either a larger flipper-bearing population (blocked on the same sibling-constructor gap as other lanes) or a targeted single-level microscope.
> **Evidence role:** direct correction/tightening of `reports/2026-09-17-lane-d3-mechanic-conditioned-breakdown-result-001.md`'s own flagged open item ("a tighter per-segment version... left as a natural tightening").
> **Population identity:** the identical 25-level/12,277-candidate D3 population, re-mined with the same seed/parameters (verified byte-for-byte against the committed totals) and additionally tagged per candidate with whether segment a or b touches a flipper/portal cell, using each level's own `flippingFilterMap`/`portalMap`. No new labelling beyond what D3 already computed.

## Why this ran

The mechanic-conditioned breakdown this directly follows explicitly flagged its own limitation: bucketing was per-LEVEL (does the board contain a flipper anywhere), not per-SEGMENT (does the specific spliced route touch one). That report's own "what this does not earn" section named this exact gap as the natural next check before treating "flippers invalidate commutativity" as a clean mechanistic claim.

## Method

Re-ran the identical deterministic mining/splice/validate pipeline (same seed `lane-d-commutativity-wide-001`, same `maxSpan=25`) and verified it reproduces the committed D3 totals exactly (12,277 candidates, 1,653 legal) before trusting any new output. For each length-matched candidate, additionally tagged whether segment `a` or `b` touches any cell in the level's `flippingFilterMap`/`portalMap`, and cross-tabulated against the level's own static mechanic bucket.

## Result

Cross-tab (length-matched candidates only):

| Level bucket | Segment bucket | Levels | Candidates | Legal | Legal rate |
|---|---|---:|---:|---:|---:|
| flipper-only | segment touches flipper | 2 | 84 | 0 | 0% |
| flipper-only | segment touches neither | 2 | 65 | 0 | **0%** |
| portal-and-flipper | segment touches flipper | 1 | 19 | 0 | 0% |
| portal-and-flipper | segment touches portal only | 1 | 399 | 0 | **0%** |
| portal-only | segment touches portal | 4 | 1,224 | 862 | 70.4% |
| portal-only | segment touches neither | 2 | 10 | 0 | 0% (n=10) |
| mechanic-free | segment touches neither | 3 | 1,320 | 591 | 44.8% |

Level counts here are levels that actually produced a qualifying candidate, not levels statically in that mechanic category (the prior report's 4/6/8/7 level counts included levels that produced zero commuting candidates at all, consistent with D3's own "16/25 levels had zero commuting candidates" finding).

## Interpretation

**Avoiding the flipper cell does not rescue commutativity.** On flipper-bearing levels, segments that touch a flipper (103 candidates) and segments that touch no flipper at all (464 candidates) are both exactly 0% legal. If the mechanism were simply "this specific commuting segment's own route crosses a flipper cell, disturbing its state," the flipper-avoiding segments should behave like ordinary portal-only or mechanic-free segments (44.8-70.4% legal) — they do not. This rules out the simplest mechanistic story from the prior report and leaves two live explanations: (a) a flipper's *global* order-dependent state (its required entry axis depends on `popcount(flipperUsedMask)` across the *entire* path, per `cpsat-reference-probe.py`'s own comments) can be disturbed by a segment swap anywhere earlier in the path even without touching the flipper directly, since the swap can still change *which* cells get visited before a later flipper encounter; or (b) these 3 specific levels are independently hard for reasons unrelated to flippers, and the flipper association is coincidental at this small a sample.

**The independent-level evidence is real but thinner than "10 levels" implied.** Only 3 of the 10 statically flipper-bearing levels produced any length-matched commuting candidate to test, and one single level supplies 70% of those candidates (399/567). The zero-legal finding is not wrong, but citing it as "10 independent levels, 2,152 candidates" overstates how independently it has been confirmed — it is closer to "3 levels, dominated by one board's geometry."

## What this earns

Earned:
- A materially more honest population-size claim for the flipper-zero finding (3 levels with qualifying candidates, not 10).
- Ruled out the simplest explanation (avoid-the-flipper-cell) for why flipper-bearing levels show 0% commutativity, narrowing the remaining hypothesis space to global flip-state history-dependence vs. board-specific confound.
- A verified-reproducible pipeline (exact match to committed D3 totals) for any future per-segment mechanic tagging on this population.

Not earned:
- A definitive mechanism. Distinguishing "real flip-parity ripple effect" from "these 3 boards are just hard" needs either a larger flipper-bearing population (blocked on the same sibling-constructor gap named throughout this session) or a targeted single-level microscope isolating one flipper-bearing board's specific failure chain (similar in spirit to Lane E's bisection method, applied to a commuting-splice failure instead of a repair-retreat prefix).
- Any correction to D3's headline pooled figures (46.6% length-matched, 12,277 candidates) -- those are untouched; only the mechanic-attribution narrative built on top of them is corrected here.

## Artifacts

- `scripts/stress/lane-d3-segment-mechanic-attribution.mjs`
- `reports/stress/lane-d3-segment-mechanic-attribution-2026-09-17.json`
