# Phase A: corpus-2 unsolved-population failure clustering (2026-07-16)

## Goal

Cheap, telemetry-only first pass (no new solving) to find shared failure signatures across
corpus-2's 1,464 unsolved levels, to seed a targeted family/variant deep-dive (Phase B) rather than
picking seed levels arbitrarily. Tool: `scripts/stress/cluster-unsolved-failures.mjs`.

## The premise this ruled out

An initial pass (before the nodesExpanded instrumentation fix — see
`reports/2026-07-16-beam-nodesexpanded-instrumentation-gap.md`) bucketed 285/1,464 (~19.5%) of
unsolved levels into a "beam-collapse" cluster, matching the diagnostic signature confirmed causal
on R02248/R01465 (a scoring-term × orientation interaction that locks beam search into an early,
unrecoverable self-crossing). This looked like a major, previously-unknown finding — the same
phenomenon at ~140x the previously-known scale.

**It wasn't real.** The "collapse" signature (every beam attempt `timedOut: true` with
`nodesExpanded` near zero) turned out to be a 100% structural instrumentation artifact — the node
counter was never credited on any timeout exit path, so *every* timed-out beam attempt looked
identical to a genuine lockup regardless of how much real search happened. After fixing the
instrumentation (crediting partial progress on all three timeout exit paths) and re-solving the
655 affected levels (those with any beam attempt in their ladder) to get corrected telemetry:

**The beam-collapse bucket is now empty. Zero levels in the corrected corpus-2 unsolved population
show the signature.** R02248 and R01465 remain the only 2 known genuine instances — this was never
a broad corpus-wide pattern, just a measurement artifact making a 2-level phenomenon look like a
285-level one.

## Corrected clustering (post-fix)

Re-solved the 655 beam-affected levels at the corrected budget/policy (`--budget-ms=8000
--repair-budget-fraction=0`, per the newly-established solver-testing convention — see
`docs/solver-architecture.md`'s repair-budget-fraction policy note), merged the corrected telemetry
into `reports/stress/benchmark-latest-random.json` (solve/fail outcomes unchanged: still 236/1700
solved — this is a pure telemetry correction), and re-ran the clustering:

| Cluster | Count | Dominant archetype(s) |
| --- | ---: | --- |
| `dfs-plain` (genuine exhaustion, substantial real node counts, no repair/beam involved) | **843** | high-intersection-burden (592), portal-heavy (132), must-cross-heavy (63), default (56) |
| `repair-far` (repair-gated, structurally stuck, badness > 5 even under repair) | **507** | high-intersection-burden (459), must-cross-heavy (48) |
| `repair-close` (repair-gated, badness ≤ 5 — near-miss under repair) | **114** | high-intersection-burden (80), must-cross-heavy (34) |
| `beam-collapse` (R02248-style scoring lockup) | **0** | — |

(A level can appear in multiple buckets if its ladder mixes techniques; totals don't need to sum to
1,464.)

## Reading

The dominant, genuinely-informative population is `dfs-plain` at 843 levels (57.6% of all
unsolved) — plain DFS running out of budget with hundreds of thousands of real nodes expanded, not
a collapse or an accounting artifact. This is the population most relevant to "find a faster
heuristic/pruning strategy," since these levels are failing via genuine combinatorial exhaustion
within the practical budget, not merely needing more time (which the repair-fallback-cost
investigation already showed is the wrong lever — see the instrumentation-gap report's "related
finding" section).

`repair-close` (114) is the natural near-miss population for a targeted rescue effort — badness ≤ 5
under the existing repair mechanism suggests these are genuinely close, not stuck; `repair-far`
(507) is likely a harder, lower-priority population (structurally stuck even with repair's own
extended search).

## Next step

Phase B (denser family/variant generation) should seed from `dfs-plain` — the large, real
population — rather than the now-debunked `beam-collapse` cluster, plus keep R02248/R01465
themselves (the only confirmed real scoring-lockup cases) as a smaller, separate deep-dive.
