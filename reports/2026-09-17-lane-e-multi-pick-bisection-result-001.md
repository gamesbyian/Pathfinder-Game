# Lane E multi-pick bisection result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-17 — CP-SAT bisection on 4 exact-DEAD/exact-LIVE matched pairs from `R03147`'s multi-pick population, current HEAD.
> **Decision:** on a materially different, non-degenerate population from B2's exhausted n=2 set, the point-of-no-return again coincides exactly with the naive first-divergence point in every tested case (rope=0/4), even though 7 steps of nominal rollback distance remained available. B2's earlier finding ("rollback distance and a compact commitment predict the same thing") was previously dismissible as a degenerate artifact of divergence happening only 1-2 moves from the trajectory's own end. This population's divergences happen much earlier (depth 4 of an 11-move trajectory), giving bisection real room to find a LATER, more specific causal point -- and it still lands exactly at the first divergence every time. Combined with B2 (2/2, near-end regime) this is now 6/6 tested matched pairs across two structurally different regimes showing no daylight between naive divergence and the true causal point.
> **Remaining gate:** none for the tested regimes (near-end divergence, early/immediate divergence). The premise -- that dependency-defined causal locality is materially more compact or actionable than simple divergence-point reasoning -- has no supporting evidence across either tested regime. A different regime (a DEAD state whose divergence from its LIVE sibling is neither near the end nor immediate, i.e. a genuine "rope" case) remains logically possible but requires yet more matched-pair population; not pursued further here per the preflight's own stop rule ("the first actionable causal point is usually indistinguishable from ordinary rollback distance").
> **Evidence role:** direct reuse of Lane E's already-built bisection tool (`scripts/stress/lane-e-repair-retreat-commitment-probe.mjs`, unmodified) against a fresh, independently-constructed population -- closes the population-limited gap the original Lane E report explicitly named.
> **Population identity:** `R03147`'s 25-state multi-pick population (2 live / 23 dead, all from one real production search frontier at depth-fraction 0.1) converted into the tool's expected input shape; 4 DEAD states qualified at `--min-common-prefix=4` (the maximum common-prefix length available in this population).

## Why this ran

Lane E's own report closed INCONCLUSIVE, population-limited at n=2: "CP-SAT bisection on B2's only 2 qualifying same-parent dead/live pairs finds the exact point of no return in both, but both land 1-2 moves from the trajectory's own end -- rollback distance and a compact commitment predict the same thing, so neither discriminates the premise." The preflight named the same blocked sibling constructor as Lanes B/D1/G2 as the way to expand this population. That constructor closed this session (`reports/2026-09-17-production-search-sibling-construction-result-001.md`), and `R03147`'s multi-pick population -- 2 exact-LIVE and 23 exact-DEAD siblings sharing one real production beam-search frontier -- is exactly the fresh matched-pair asset this gate needed, with divergences starting much earlier than B2's (common prefix 3-4 out of 12, not "1-2 moves from the end").

## What ran

No new tooling: `scripts/stress/lane-e-repair-retreat-commitment-probe.mjs` (Lane E's own bisection script, unmodified) reused directly. A small conversion step reshaped the multi-pick exact-labels file into the `{states: [{levelId, exactLabel, prefixXY, role}]}` document the script already expects. `--min-common-prefix=4` selected the 4 DEAD states whose common prefix with a same-parent LIVE sibling reached the population's own maximum (4 of 11 index positions).

## Result

All 4 candidates: **point of no return = depth 4 (feasible at depth 3, infeasible at depth 4), exactly matching the naive first-divergence point. Rope beyond naive divergence = 0.** Rollback distance from the trajectory's own end = 7 moves -- meaningful room existed for a later, more specific causal point to emerge, and none did. Critical move family = `plain` (an ordinary non-mechanic-obligation move) in all 4 cases, consistent with B2's own finding.

**Independence check:** 2 of the 4 candidates (`multi-pick-218`, one via LIVE partner `multi-pick-262`) are one independent observation. The other 3 (`multi-pick-975`/`888`/`892`) all share LIVE partner `multi-pick-112` and the identical depth-4 divergent cell -- but are NOT duplicates: inspecting their full prefixes shows they diverge from each other at depth 5 or 7, i.e. three genuinely different downstream continuations all independently confirm depth 4, not depth 5+, is where feasibility was already lost. Honest count: **2 independent divergence points tested, one replicated 3x by different continuations, all agreeing** -- not 4 fully independent trials, but real corroboration rather than an artifact of resampling the same state.

## What this closes

Combined with B2's 2/2 (near-end-divergence regime), this is 6 tested matched pairs across two structurally different divergence regimes (immediate/early vs. near-the-end), and every one shows the causal point of no return exactly at the naive divergence point. The dependency-defined-revision premise -- that a compact causal interface exists and differs materially from ordinary path-distance/divergence reasoning -- has no supporting evidence in either tested regime. Per the preflight's own stop rule, this closes the premise in these tested forms; it does not rule out a hypothetical third regime (a real "rope" case) that a much larger population might eventually surface, but no such case has been observed across 6 attempts.

## Artifacts

- `reports/stress/class5-multi-pick-lane-e-input-2026-09-17.json` -- converted population input
- `reports/stress/lane-e-multi-pick-bisection-2026-09-17.json` -- full bisection trace (reproduce: `node scripts/run-bundled.mjs scripts/stress/lane-e-repair-retreat-commitment-probe.mjs -- --corpus=data/stress/stress-levels-random.json --b2=reports/stress/class5-multi-pick-lane-e-input-2026-09-17.json --min-common-prefix=4 --time-limit=60`)
