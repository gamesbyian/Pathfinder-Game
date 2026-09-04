# Production pays a real, large efficiency premium relative to the isolated census's cheapest known technique

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — per-level ratio of `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s production `nodes` against `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `cheapestObservedSolveNodes`, over the 936 levels solved by both, no new dispatch
> **Decision:** production's real solve cost is dramatically higher than the isolated census's own cheapest-known-technique cost for the same levels — **median 38.65x**, with the interquartile range spanning **8.16x to 182.73x** and p90 at **482.33x**. Only **0.9%** of production solves are actually *cheaper* than the isolated census's own best-known solve for that level. This directly quantifies the headroom `solver-scheduling-policy.md`'s "Fixed-work oracle frontier" analysis item asks for: a hypothetical perfect router that always picked each level's cheapest known technique would use on the order of 1-2 orders of magnitude less work than production's real ladder currently does, on the levels both already solve.
> **Remaining gate:** none for this specific ratio. Whether that gap is *closeable* (a router needs to know in advance which technique is cheapest, which is exactly the level-blindness problem `docs/solver-optimization-workstreams.md`'s Workstream 1/2 already wrestle with) is a separate, much harder design question this report does not address.
> **Evidence role:** discovery — a direct ratio computation over two already-collected artifacts
> **Selection:** the 936-level intersection of both artifacts' solved populations, not a drawn sample

## Method

For each of the 936 levels solved by both the fresh production run and the isolated census, computed `productionNodesExpanded / isolatedCheapestObservedSolveNodes`. A ratio of 1.0 means production found the level exactly as cheaply as the isolated census's best-known technique; a ratio of 39 means production spent 39x more nodes than the cheapest known isolated path.

## Result

| statistic | value |
|---|---:|
| median ratio | 38.65x |
| p25 | 8.16x |
| p75 | 182.73x |
| p90 | 482.33x |
| fraction of production solves cheaper than the isolated cheapest | **0.9%** |

## Interpretation

This is the concrete number `solver-scheduling-policy.md`'s "This is a value-of-information gate. If a tiny static policy captures nearly all credible headroom, sophisticated scheduling has not earned implementation" framing was asking for, updated with the current census/production pair rather than derived fresh. The gap is large enough (a 39x median, not a modest 20-30%) that it is not obviously already-captured by existing static-portfolio work — `portfolio-18-tranche-v2`'s own best confirmed result beat `full-menu` by using *less* aggregate work while solving *more* levels, which is a different, coarser kind of efficiency gain than this level-by-level "did we use the cheapest known path" comparison. This large a gap is exactly the kind of finding that would make a genuinely level-aware (not level-blind) routing signal valuable *if* one could be built cheaply and legally — but level-blindness is a hard current-architecture constraint (`docs/solver-level-blindness.md`), not an oversight, so this report should be read as sizing the theoretical ceiling, not proposing to chase it directly.

## What this does not establish

- Does not show this gap is *closeable* under level-blind constraints — the isolated census's "cheapest observed" figure benefits from testing every technique in isolation with a full budget each, information a level-blind production caller cannot have in advance.
- Does not account for the real cost of *finding out* which technique is cheapest (a router that had to try several techniques to discover the cheap one would itself spend some of this headroom).
- Single production run; the 936-level intersection is itself a byproduct of which levels happen to be solved by both sources, not a designed sample.
