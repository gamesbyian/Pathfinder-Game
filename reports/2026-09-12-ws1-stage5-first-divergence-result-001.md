# WS1 stage 5: bounded operational first divergence result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — ran the exact one-sibling-per-pair, matched-small-work-budget bounded operational first-divergence check the stage-4 result scoped: `R02687`/`objectiveFirst`/`swap`/idx0 and `R02094`/`intersectionHarvest`/`cs`/idx0, each solved comfortably within 500,000 nodes (306,910 and 473,998 respectively — far below the 20,000,000-work stage-3/4 ceiling), with a small new instrumentation-free comparison technique (below) locating the exact first depth where `plain` and `mechanic-buckets` retention would keep different candidate sets.
> **Decision:** both pairs diverge at the **same depth (12)**, and in both cases the candidate `mechanic-buckets` retains-but-`plain`-would-cull is one step past a fresh mechanic-progress event (a portal traversal at idx 5-6 for `R02687`; a must-cross visit at idx 11 for `R02094`), while the candidate `plain` retains-but-`mechanic-buckets`-culls is a locally higher-scored path in the *same, already-well-represented* bucket (for `R02094`, the culled example has made **zero** mechanic progress at all — `nearestMechanicEvent: null`). This is a clean, mechanistic confirmation of what mechanic-bucket retention is designed to do: protect minority constraint-progress buckets from being swamped by top-scored majority-bucket candidates, caught at the operational moment it happens, for both frozen pairs.
> **Remaining gate:** none for this bounded check — it was the last rung of the temporal-persistence → difficulty-stratified → family-flip → solution-space-mediation → operational-first-divergence ladder for these two pairs. n=2 does not license a production selector; see "Advancement" below.
> **Evidence role:** discovery/diagnosis (bounded, two-sibling operational trace). No new production code; no routing/selector change.

## Why now

`solver-optimization-workstreams.md` and [`the stage-4 result`](2026-09-12-ws1-stage4-solution-space-mediation-result-001.md) named this the next earned step after both prespecified solution-space-mediation descriptors closed non-separating/inapplicable: "bounded operational first divergence on one flip sibling per pair; needs new small instrumentation." This report executes exactly that, on the exact candidates the stage-4 report suggested (`R02094`/`cs`/idx 0; an `R02687` `swap`/`sym` sibling using a purely positional/self-intersection definition since `R02687`'s whole family has zero must-cross cells).

## Method: no new search.ts instrumentation needed

`plain` and `mechanic-buckets` retention share the *identical* pipeline up to the final retention-selection line in `beamSearchFromGate` (hard-prune, coarse-state merge, sort) — they differ only in which subset of the same sorted `pool` becomes `frontier`. The existing `mechanic-bucket-culled` research stage already emits the full sorted pool with ranks/scores (`details.rankedPool`) whenever `pool.length > beamWidth`; the existing `post-mechanic-bucket-selection` stage emits the actually-retained frontier's paths. So a **single** `mechanic-buckets` run's own telemetry already contains both "what `plain` top-K would have kept" (`rankedPool.slice(0, beamWidth)`) and "what `mechanic-buckets` actually kept" (`frontier`) at every depth — no second run and no new production code were needed to find their first difference. This holds only up to and including the first differing depth; after that, the two configs would genuinely explore different populations, which this script does not claim to characterize (and does not need to, for a "where does it first diverge" question).

`scripts/stress/ws1-stage5-first-divergence.mjs` (new): loads each candidate's raw family variant from the `claude/variant-levels-solver-insights-tpk4qg` worktree, runs `beamSearchFromGate` once with `mechanicBucketRetention: true` and a small node budget, and at each depth where culling occurred, diffs the two candidate sets (by path identity). At the first depth where they differ, it reports pool size, how many candidates are exclusive to each side, one example from each side, and each example's nearest preceding M(must-cross)/P(portal)/X(self-intersection) event — computed against the candidate's own in-progress path (not the final solution), mirroring `ws1-stage4-mediation-analysis.mjs`'s `mechanicEvents()` convention.

```
node scripts/run-bundled.mjs scripts/stress/ws1-stage5-first-divergence.mjs -- \
  --families=<variant-worktree>/data/families/corpus2 --node-budget=500000 --out=tmp/ws1-stage5.json
```

## Result

| candidate | levelId | solved | nodes | first divergence depth | pool size | exclusive each side |
|---|---|---|---:|---:|---:|---:|
| `R02687`/objectiveFirst/swap/0 | `F02687-swap-01` | yes | 306,910 | **12** | 5,711 | 136 / 136 |
| `R02094`/intersectionHarvest/cs/0 | `F02094-cs-01` | yes | 473,998 | **12** | 8,550 | 366 / 366 |

Both pairs solve comfortably and diverge at the *same* depth, well before either exhausts even 2.5% of the 20,000,000-work ceiling stage 3/4 used — first divergence is a shallow, cheap phenomenon, not something that needed large-scale search to observe.

**`R02687` (no must-cross; buckets keyed on `flipperUsedMask`, 6 flippers in this variant):** the buckets-only-retained candidate (rank 5070 of 5711 — well below the natural top-5000 cutoff) is one step past a portal traversal (idx 6); the plain-only-retained candidate it displaces (rank 4858, inside the natural top-5000) is one step past a *different* portal traversal (idx 5). Both sides have made mechanic progress; the divergence is about which of two competing post-portal branches gets a protected slot.

**`R02094` (must-cross present; buckets keyed on `mustCrossMask`):** the buckets-only-retained candidate (rank 5265) has just visited a must-cross cell (idx 11, immediately before the divergence depth). The plain-only-retained candidate it displaces (rank 4599, inside the natural top-5000) has made **zero** mechanic progress at all (`nearestMechanicEvent: null`) — a locally higher-scored but constraint-idle path. Here the mechanism is unambiguous: bucket retention is protecting the *only* representative of a just-created must-cross-progress bucket from a same-bucket-as-everyone-else, higher-raw-score competitor.

## Interpretation

Both first-divergence points land immediately after a real mechanic-progress event (a portal jump or a must-cross visit), consistent with the bucket key (`mustCrossMask`/`flipperUsedMask`) creating a *new* minority bucket exactly at that step — before the event, the diverging candidate was indistinguishable (same bucket as the majority); after it, mechanic-bucket retention's floor guarantee reserves it a slot regardless of its raw score, while plain top-K would have let the majority bucket's higher-scoring candidates crowd it out. This is not a new hypothesis — it is what mechanic-bucket retention is documented to do (`solver-architecture.md`: "guarantees `floor(beamWidth/numBuckets)` per bucket... prevents beam collapse to one structural mode") — but it had not previously been pinned to an exact operational moment on real, previously-flipped siblings for either pair. It also gives a concrete answer to stage 4's own open question about *where* the plain/buckets difference actually originates: at final acceptance/retention, immediately following a mechanic event, not earlier in exploration order and not in scoring itself (consistent with stage 3's static object-count check and stage 4's own descriptor work, which both located the effect at retention, not scoring).

## Advancement

This is the last rung of the temporal-persistence → difficulty-stratified → family-flip → solution-space-mediation → operational-first-divergence ladder `docs/solver-future-work.md` names for these two pairs. **Do not** add a third pair, generate new variants, or treat this as license to build a routing/selector signal — n=2 siblings is discovery evidence for a mechanism, not confirmation proportional to a selector's configuration space (per the standing WS3 rule). The mechanism itself is not new capability and not surprising once stated; its value here is narrowing *where* stage 3's flips originate, closing that specific open question for both frozen pairs. Per `solver-optimization-workstreams.md`'s own instruction, this line ("Frontier/structural-response path") stays WS1 technique-level; it does not escalate to WS2/WS4 (mechanic-bucket retention is already a known, understood mechanism — this session's separate `intsBucketRetention` canary already tested and closed a *generalization* of it for class-5 first-loss levels; see [`that report`](2026-09-12-ints-bucket-retention-canary-001.md)).

## Artifacts

- `scripts/stress/ws1-stage5-first-divergence.mjs` — new, reusable (no search.ts change; reuses existing `mechanic-bucket-culled`/`post-mechanic-bucket-selection` research telemetry).
- `tmp/ws1-stage5.json` — full per-candidate divergence detail (not committed; regenerate via the command above against the `claude/variant-levels-solver-insights-tpk4qg` worktree, gate keys `589830`/`262151` as recorded in the committed stage-3 result files).
