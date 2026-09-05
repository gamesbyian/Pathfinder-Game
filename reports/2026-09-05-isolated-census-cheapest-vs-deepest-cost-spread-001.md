# Within the isolated census alone, a level's cheapest and priciest known solve differ by a median 41.7x — rising to 228x for well-supported levels

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `deepestObservedSolveNodes / cheapestObservedSolveNodes` ratio for all 1,316 oracle-solved levels carrying both fields in `reports/stress/technique-niches/2026-09-03/level-capability.json`, bucketed by `solverCount`, no new dispatch
> **Decision:** across the full oracle-solved population, the median cost-spread ratio between a level's cheapest and most expensive known solving technique is **41.72x** (p10 1.00x, p90 1,367.78x, max 425,317x). This spread rises smoothly and monotonically with `solverCount`: singleton (trivially 1.00x) → doubleton (2.42x) → 3-5 solvers (3.47x) → 6-10 solvers (44.54x) → 11+ solvers (**227.83x**). This is a within-isolated-census finding (no production data involved), distinct from but complementary to `2026-09-04-production-cost-efficiency-vs-isolated-cheapest-001.md`'s production-vs-isolated-cheapest premium (median 38.65x) — that report showed production pays a large premium *relative to* the cheapest known technique; this report shows the isolated census's own techniques already span a comparably huge range *among themselves*, especially for well-supported levels.
> **Remaining gate:** none — a descriptive characterization using already-collected data.
> **Evidence role:** discovery — quantifies technique-choice cost variance within the isolated census, a previously-uncomputed ratio of two fields the census already carries per level
> **Selection:** whole oracle-solved population with both fields present (1,316 of 1,962 levels), not a sample

## Method

Computed `deepestObservedSolveNodes / cheapestObservedSolveNodes` per level (both fields already present in `level-capability.json`), then bucketed by `solverCount` to see how the spread scales with how many techniques solve a level.

## Result

| `solverCount` bucket | n | median cost-spread ratio |
|---|---:|---:|
| 1 (singleton) | 175 | 1.00x (trivial) |
| 2 (doubleton) | 94 | 2.42x |
| 3-5 | 213 | 3.47x |
| 6-10 | 195 | 44.54x |
| 11+ | 639 | **227.83x** |
| whole population | 1,316 | 41.72x (p10 1.00x, p90 1,367.78x) |

## Interpretation

This is an intuitive but previously-unquantified relationship: the more techniques that can solve a level, the more likely the sampled set includes both a cheap, well-suited technique and a wildly expensive, poorly-suited one — pure sampling breadth effect, since the "worst of N" grows with N even if each individual technique's cost were drawn from the same distribution. But the magnitude is still striking and directly relevant to routing/scheduling design: for the 639 levels with 11+ solving techniques, the median gap between the best and worst available technique is nearly 228x. Combined with `2026-09-04-production-cost-efficiency-vs-isolated-cheapest-001.md`'s finding that production itself pays a 38.65x premium over the cheapest known technique, the two findings together frame the same underlying opportunity from both directions: there is enormous headroom in technique selection, both because production doesn't reliably pick the cheapest option (the earlier report) and because the cost gap between "cheapest" and "just another available option" is itself often huge (this report) — meaning even a partially-informed router (not necessarily perfect) capturing some of this spread could yield large work savings on well-supported levels specifically.

## What this does not establish

- Purely descriptive/correlational — does not identify which structural or technique-identity features predict a large cost-spread ratio, or whether the same technique reliably occupies the "cheapest" role across levels (that would connect to the family-internal-ranking reports already produced this session).
- Does not test whether the same pattern holds at each census refresh (temporal stability) — single snapshot.
- `deepestObservedSolveNodes`/`cheapestObservedSolveNodes` reflect whichever techniques happened to be cheapest/priciest in this specific census run, subject to the same technique-identity temporal-fragility caveats already documented for `cheapestObservedSolveNodes` elsewhere this session.
