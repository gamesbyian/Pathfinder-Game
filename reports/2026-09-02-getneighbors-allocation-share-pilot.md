# getNeighbors allocation share: value-of-information check, closed negative

> **Status:** concluded-negative
> **Last evidence:** 2026-09-02 — fresh `PF_BEAM_DEBUG=1` runs on current HEAD (post-migration/correctness-fix commits) using the exact same protocol, workloads, and level selection as the 2026-08-27 beam cost breakdown
> **Decision:** `getNeighbors`'s own array allocation is a minority (8-14%) share of the already-measured `candGenExcl` bucket, not an independently dominant cost. Do not build a "fixed neighbor slots" pilot targeting `getNeighbors` in isolation; that candidate is closed without an implementation attempt.
> **Remaining gate:** none for this specific candidate. `solver-architectural-speed-opportunities.md`'s "Fused move/state kernel" entry's other named direction — batching work across candidates rather than fusing one candidate's cycle at a time — remains untested and is a structurally different, bigger redesign this measurement does not speak to.
> **Evidence role:** discovery/value-of-information pilot (no code shipped as a result; instrumentation only)
> **Selection:** prespecified — evaluates the exact candidate `solver-architectural-speed-opportunities.md`'s "Fused move/state kernel" entry names as untested ("fixed neighbor slots to avoid `getNeighbors`'s per-node array allocation (untouched by this pilot)"), before any implementation, per that doc's own "profile first" rule.

## Why this measurement, and why before any implementation

The 2026-08-27 beam cost breakdown ([`2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md`](2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md)) found `candGenExcl` (the whole per-candidate loop minus connectivity: `getNeighbors`, `pruneFirstStepNeighbors`, `buildCurUrgencyContext`, `applyMove`/`undoMove`, `scoreMove`, array push) at 46.5-55.3% of instrumented beam time — the dominant bucket on every workload. The same-day fused-JS move/state-kernel pilot then eligibility-gated an inline replacement of most of that bucket and came back **+3.13% slower** (published, the levels it could engage) despite preserving every solve/node trace exactly — closed negative.

`solver-architectural-speed-opportunities.md`'s own text for that closed pilot names two directions a *materially different* descendant could still take, one of which is "fixed neighbor slots to avoid `getNeighbors`'s per-node array allocation (untouched by this pilot)". Before spending implementation effort on that candidate, this pilot answers the cheaper prior question the doc's own "profile first" rule and Working rule ("Extend [speed work] only when profiles identify a specific allocation/lookup cost") require: how large is `getNeighbors`'s own share of `candGenExcl`, on its own, actually?

## Method

Added a nested `_BEAM_DEBUG`-only sub-timer (`_dbgNeighborsNs`/`_dbgNeighborsCalls`) around the single `getNeighbors(pos, ws, level, prep)` call in `beamSearchFromGate`'s per-node candidate-generation step — the identical pattern already used for the existing `_dbgConnNs` connectivity sub-timer nested inside the same `candGen` window. Zero production cost (gated behind the same `_BEAM_DEBUG` env check every existing counter uses); appended as a new field to the existing `[beam]` debug log line, which no checked-in script parses (verified by search), so no existing tooling's log format was broken.

Ran `scripts/solver-speed-probe.mjs` (bundled) with `PF_BEAM_DEBUG=1`, a 250,000-node cap, and a 600,000 ms non-binding wall allowance — the exact protocol, node budget, and level selection the 2026-08-27 breakdown used — on two of its four original workloads:

- Corpus-2 stride 70, 24 levels (`--corpus=corpus2 --count=24 --stride=70`);
- the full 160-level published corpus.

## Result

| Workload | Beam calls | Reproduced (2026-08-27 call count) | candGenExcl % of disjoint total | neighbors % of disjoint total | **neighbors % of candGenExcl** |
|---|---:|---:|---:|---:|---:|
| Corpus-2, stride 70 (24 levels) | 90 | 90 ✓ | 56.5% (was 55.3%) | 4.7% | **8.3%** |
| Published, all 160 | 91 | 91 ✓ | 47.5% (was 46.5%) | 6.7% | **14.2%** |

Beam call counts match the 2026-08-27 report exactly on both workloads (90 and 91), and `candGenExcl`'s share is within 1.2 points of the original measurement on both — confirming this run reproduces the same workload/protocol and that nothing about the intervening migration/correctness-fix commits (queue #2's nine work-dose migrations, the whole-ladder deadline-independence tests, the 31/32-flipper-filter beam-key fix) materially shifted beam's own cost profile, as expected since none of them touch this hot loop's own logic.

`getNeighbors`'s own share is a **minority** of `candGenExcl` on both workloads: 8.3% on the hard Corpus-2 sample, 14.2% on published. Even a hypothetical 100%-effective elimination of its own cost would recover at most 4.7-6.7% of total beam time — smaller than what the already-closed fused-kernel pilot attempted to eliminate (a strict superset of `getNeighbors` plus `pruneFirstStepNeighbors`, `buildCurUrgencyContext`, `applyMove`, `undoMove`) and still lost net wall time on.

## Interpretation

This is a negative value-of-information result for the "fixed neighbor slots" candidate specifically, decided before any implementation:

- `getNeighbors`'s allocation is real but not the dominant driver even within the already-large `candGenExcl` bucket — most of that bucket's cost is elsewhere (`applyMove`/`undoMove`/`scoreMove`/`buildCurUrgencyContext`/array push), which the fused-kernel pilot already targeted more broadly and still lost.
- A "fixed neighbor slots" implementation would need to recover a smaller absolute cost than the fused-kernel pilot's own target, using the same class of hand-inlining technique that pilot already showed nets negative once V8's own array/GC handling and dispatch overhead are accounted for (small, short-lived arrays of ≤4 elements are exactly the shape V8's nursery-generation allocator is cheapest at).
- Building this pilot anyway, absent new evidence that the implementation overhead would somehow be smaller here than in the fused-kernel case, would very likely repeat that pilot's own outcome for a smaller potential upside.

## What this does not establish

- does not claim `getNeighbors` could never be worth touching under a **different** mechanism (e.g., as part of a genuinely different batched-candidate redesign, the fused-kernel entry's other named direction) — only that isolating it alone, via the same inline/hand-optimize approach two prior pilots already tried and lost with, is not independently justified;
- does not reopen or re-measure connectivity, replay, dedup, or sort — unchanged from the 2026-08-27 breakdown;
- ships no production code change; the added debug counter is instrumentation only, silent unless `PF_BEAM_DEBUG=1` is set.

## Disposition

Close the "fixed neighbor slots to avoid `getNeighbors`'s per-node array allocation" candidate without an implementation pilot; `solver-architectural-speed-opportunities.md` updated accordingly. The "batching work across candidates" direction remains the one still-untested descendant of the fused-kernel entry.

## Reproduction

```bash
PF_BEAM_DEBUG=1 node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
  --corpus=corpus2 --count=24 --stride=70 --budget-ms=600000 --node-budget=250000 --out=/tmp/c2-70.json 2>/tmp/beam-debug-c2-70.log
PF_BEAM_DEBUG=1 node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
  --corpus=published --count=160 --budget-ms=600000 --node-budget=250000 --out=/tmp/pub.json 2>/tmp/beam-debug-pub.log
# then sum each line's replay/candGen/conn/neighbors/coarseMerge/sort ms fields per workload
```
