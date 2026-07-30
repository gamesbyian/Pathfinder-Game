# Pure-speed work on the solver hot path (2026-07-30)

Branch `claude/solver-hot-path-perf-28rbq1`.

**Motivation.** Two recent, individually well-reasoned changes to pruning/routing logic —
[`2026-07-30-mst-tightening-reverted-net-negative.md`](2026-07-30-mst-tightening-reverted-net-negative.md)
and [`2026-07-29-archetype-routing-ab-refuted.md`](2026-07-29-archetype-routing-ab-refuted.md) — each
looked like a clear win on their targeted population and each turned out net-negative once measured
against corpus-2's whole already-solved population. The solver's DFS/beam/repair techniques are
heuristic and budget-limited, so *any* change to exploration order helps some instances and hurts
others. A pure speed change sidesteps that entirely: same states, same order, strictly less time per
node, so solved/unsolved outcomes are invariant by construction — provided "same order" is actually
verified rather than asserted.

**Result: published corpus −27.1% wall time, corpus-2 −13.2%, with `nodesExpanded` bit-identical and
zero flips to the solved/failed set.** Plus one new corpus-2 solve that falls out of the speedup
itself (see "Did the speedup itself change solve outcomes?" below).

---

## Verification protocol (the load-bearing part)

Getting an honest "did this preserve search order" answer needed a harness that did not exist.

**Under a wall-clock budget, `nodesExpanded` is not comparable across a speed change.** A faster
solver expands *more* nodes inside the same 30s window — `solver:bench --check` on the final branch
reports `+73.1%` nodes precisely *because* the corpus got faster, which reads alarming and means
nothing. So node counts under ms budgeting cannot prove order preservation.

The fix: pass `--node-budget` together with a `--budget-ms` large enough never to bind. The run
becomes deterministic in node terms, `nodesExpanded` must then come out **bit-identical** across a
genuine speed-only change, and wall time carries the whole signal. Verified reproducible first:
repeated runs of unchanged code gave identical node totals while CPU contention moved wall time 3–4x.
This is now `npm run solver:speed-probe` (`scripts/solver-speed-probe.mjs`), which fills the
"no dedicated tool exists yet" gap CLAUDE.md's hot-path gate refers to.

Wall time on a single run is noisy here (±5–10%), so every number below is a median of **interleaved**
runs — both bundles built up front, then alternated, so machine drift cancels instead of landing on
one side. An early non-interleaved pair produced a spurious 20% spread for identical code.

Three independent checks on every change: the node-identity A/B above, `solver:bench --check`
(solved/failed set), and full `npm run ci`.

---

## What profiling actually said

`node --cpu-prof` over the full published corpus at the bench's own 30s budget, and over a corpus-2
sample. Self-time, top entries:

| | published | corpus-2 |
|---|---|---|
| `_floodFillReachability` (the `isConnected` BFS) | **34.1%** | 11.6% |
| `beamSearchFromGate` | 11.4% | 15.8% |
| `scoreMove` | 9.2% | 17.5% |
| `buildCurUrgencyContext` | 7.7% | **11.2%** |
| `applyMove` | 5.5% | 9.0% |
| garbage collector | 4.3% | 4.9% |

The two corpora disagree enough that either one alone would have misdirected the work.

### A refuted hypothesis, checked before any code changed

The obvious story for a 34% flood fill was the Tier-3 cache-locality finding already scoped in
`docs/solver-architecture.md`: `PACK(x, y) = (y << 16) | x` puts vertically-adjacent cells 65,536
elements apart, a power-of-two stride that should alias catastrophically in a set-associative cache.

Measured it standalone (sparse packed-key indexing vs dense `y*w + x` over the same 15×15 access
pattern): **456ms vs 449ms — no difference at all.** A 15×15 grid's live footprint is only ~15–30
cache lines per array, small enough that the sparse layout costs nothing. The flood fill's 34% is
call volume, not layout. Tier 3's own doc says its payoff "can only be confirmed by measurement, not
reasoning"; this is that measurement, and the answer for the fill is no.

---

## Change 1 — bit-parallel connectivity flood fill (`topology.ts`)

`_reachCanEnter`'s predicate is entirely per-cell, so it can be evaluated a whole grid row at a time
into a passability bitmap (one 32-bit word per row; grids are ≤15×15). "Spread reachability one
step" then becomes `(c << 1) | (c >>> 1)` horizontally and an OR of the neighbouring rows vertically,
replacing the per-cell queue with whole-row bit operations.

Microbenchmarked before committing to it: ~3x faster on an open grid — but **3.7x *slower* on a tiny
sealed-off pocket**, where the queue visits a handful of cells and the naive version still builds
every row. That case is common (it is what the prune fires on), so the row band is grown lazily out
from `pos`, keeping it proportional to the region rather than the grid.

Prior art worth noting: a 2026-07-23 attempt to cut this same cost by *narrowing the connectivity
throttle* (a behaviour change) cost 2 corpus-1 levels and was reverted. Making the identical check
cheaper has no such exposure.

### The bug this shipped with, and how it was caught

The first version zeroed a row's reached bits inside `buildRow`, so a row the lazy band never
touched answered `_reached()` from the **previous call's** bits. `isConnected` asks about arbitrary
cells (`goalKey`, must-pass, must-cross), so a stale bit reads as "reachable" and skips a legitimate
prune. It can never reject a reachable solution — the prune only ever over-permits — but it changes
search order.

What is worth recording is what did and did not catch it:

- A differential run of both implementations on **6.6M calls across all three corpora**, comparing
  the full reachable set *and* `freshVolume`, reported **zero mismatches**. It never sampled the
  states where staleness bit.
- The node-budgeted A/B caught it immediately, as a **39-node divergence out of 4.4M** on 3 of 12
  corpus-2 levels.

Diagnosing it took ruling out the obvious explanation properly. The divergence was deterministic per
build, which suggested a wall-clock-gated decision (the codebase has documented history here —
`runRepairProbe`, `dfsFromGateLDS`). Three experiments settled it: baseline under 4-5 CPU hogs (wall
time 3-4x, node counts *identical*); baseline artificially slowed 4x inside the flood fill (node
counts *identical*); and finally the changed build slowed ~3x so its wall time matched baseline —
which still produced the *changed* node counts. Not speed. Forcing the changed build down its BFS
fallback then reproduced baseline exactly, isolating the cause to the fill itself.

One methodology failure is worth owning: a middle round of those experiments was invalid because the
differential instrumentation was still in the file, so the "changed build" was silently running both
implementations. It produced a genuinely confusing result (a 4x-slowed changed build behaving like
nothing else) that cost a detour before the leftover code was spotted.

`topology.test.ts` gains a randomized-**sequence** differential test against an independent Set-based
BFS oracle. The sequence is the point: a single-call test cannot observe cross-call scratch reuse.
Confirmed to fail when the bug is reintroduced.

## Change 2 — pool `buildCurUrgencyContext`'s per-node allocations (`scoring.ts`)

Six heap objects on every search node (four typed/plain arrays, the returned record, the
resolved-weights record), called once per DFS node, per beam frontier node, per repair ply, and per
admissible-order tie-break.

This is the Tier-2 item `docs/solver-architecture.md` scoped but did not implement — and both that
section and the function's own doc comment argued *against* pooling, citing the MST scratch-buffer
sizing bug. The distinction that makes it safe here: every read is bounds-tied to
`mustPassKeys.length` / `mustCrossKeys.length`, the same counts that just wrote those slots, so a
stale slot beyond them is never read. The MST bug was the opposite shape — a read *past* what the
call had written.

The lifetime/reentrancy audit Tier 2 asks for, done rather than assumed: all four build sites hold a
context only across a candidate loop that never scores again, those loops call nothing that builds
another context (`evaluatePrunedMove` reaches only lower-bounds/solution/topology), no site nests
another, and no test holds two at once. Contract change, now documented on `CurUrgencyContext`: the
arrays are capacity-sized, so `.length` is no longer the objective count.

## Change 3 — hoist `_floodFillBits`'s two per-call closures to module level

The bit-parallel fill allocated a closure context for `buildRow` and `growRow` on every call, which
the standalone prototype it was ported from did not. Same reason `_reachCanEnter` is already a plain
module-level function. Published −3.2%, `nodesExpanded` bit-identical.

## Change 4 — reusable `UndoToken` for beam's candidate loop — **tried, measured, reverted**

The third Tier-2 item. `applyMove` allocates a token per *candidate examined* (not per accepted
move); after changes 1–2 it was 8.1% of published self-time with GC a further 7.4%. Beam's candidate
loop is the highest-volume site and its token is pure scratch — audited: exactly one `undoMove` per
iteration, no `continue` skips it, and `BeamNode` stores scalars only.

Implemented as an opt-in `out` parameter, verified correct (node counts identical, 265/265 solver
tests pass) — and it was **4.6% slower**. V8's young-generation object-literal allocation is cheaper
than field-by-field writes into a reused object; short-lived objects die in the nursery almost for
free. Reverted.

This is a direct negative result against the Tier-2 doc's assumption that `UndoToken` pooling is the
"single largest, most uniform" win available. It is not; the allocation is nearly free. Anyone
picking up that list should skip this item, or expect to have to beat V8's nursery.

## Change 5 — beam frontier walked in tree order instead of score order — **tried, measured, REVERTED (cost a solve)**

The largest single win found, and rejected anyway.

`beamSearchFromGate` keeps ONE mutable working state and repositions it per frontier node by undoing
back to the shared prefix and replaying forward. The frontier is walked in *score* order, which is
uncorrelated with the parent-pointer tree, so consecutive nodes share almost no prefix. Measured with
`PF_BEAM_DEBUG=1` on a beam5000 published level: **9,777,764 replay steps for 213,089 frontier nodes
— ~46 per node, the worst case**, and 441.7ms of the ~1349ms of instrumented beam regions. (The same
instrumentation killed a different idea before it was written: the per-phase `pool.sort` is only
32.9ms, so replacing it with a quickselect would have bought nothing.)

Walking the frontier in parent-grouped order instead turns that into a depth-first traversal of the
beam tree: **replay steps 9.78M → 2.08M, replay time 441.7ms → 124.6ms.**

Walk order must not leak into *which* nodes survive the cull, because dedup keeps the first node on a
score tie and the score sort is stable — so generation order silently propagates into the next
frontier. The naive version, without guarding that, was measured first and is a clean example of the
trap: on a paired 70-level sample of corpus-2's already-solved population it **lost 3 of 47 solved
levels and gained none**, while looking excellent on its own metric (−23% wall time).

Guarding it worked, and was verified to work: candidates carry an `insOrd` built from their parent's
*score* rank, and `cands` is sorted back into exactly the order a score-order walk would have
produced before dedup/sort/slice. With the walk reordering then disabled but all that machinery kept,
a level resolved bit-identically (192,750 nodes) to the unmodified code — so the restoration is
exact, not approximately exact.

With the guard in place:

| population | before | after |
|---|---|---|
| published (`solver:bench --check`) | 160/160 | 160/160, no flips |
| corpus-2, 70 already-solved sample | 47 solved | **47 solved**, 0 lost / 0 gained, −30.3% wall |
| corpus-1, all 102 | 62 solved | **61 solved** — lost R00526 |

R00526 is not a budget-boundary artifact: it solves in 192,750 nodes before and fails at a **40M**
node budget after. So one solve is genuinely lost, in exchange for −16% to −30% wall time.

The residual mechanism is the phase's early return on the first valid solution found — a different
walk order reaches a different one first — but that alone does not obviously explain losing a level
that then fails at 200x the node budget, and I did not run that down. **Reverted**: trading a solve
for speed is a call worth making deliberately, not as a side effect of a performance branch. The
change is small and reproducible from this description if the trade is judged acceptable; the
`insOrd`/`treeOrd` guard is the non-obvious part and is what makes the corpus-2 result neutral.

---

## Did the speedup itself change solve outcomes?

It does change behaviour: under a wall-clock budget the solver now covers ~21% more ground per
second, and every production call path (Play/Editor/Review) is wall-clock budgeted. `data/stress/README.md`
records that corpus-2's unsolved tail stopped responding to more compute (a 300M-node sweep found few
new solves), so the expected answer was none.

Measured anyway, on the 40 lowest-`badness` levels of `dev-benchmark-corpus2.json`'s curated
"budget-edge" stratum — the population most likely to flip — at a 15s wall-clock budget, base commit
vs branch HEAD:

- base: **0/40** solved, 943,342,073 nodes
- head: **1/40** solved, 1,232,524,520 nodes (**+30.7% throughput in the same wall clock**)

**R02575 is a new solve** — base burned the full 15s and failed (32.9M nodes); HEAD solved it in 7.1s
using *fewer* nodes (22.4M), because the extra throughput carries each attempt's ms slice further
into the ladder rather than simply adding nodes to one attempt. Verified genuine via
`validateCandidatePath` (`ok: true`, 65-node path, `reqLen` 64, `reqInt` 7).

Not persisted as a hint here: that belongs to the `solver-stress-refresh.yml` workflow, which handles
provenance/`solver.id` correctly (CLAUDE.md's hint-provenance rules). Flagging it so the next refresh
picks it up. One flip in 40 is a modest effect, and it is the *only* solve-rate change this branch
makes — everything landed is otherwise order-preserving.

---

## Numbers

End-to-end, base commit `40ca848` vs branch HEAD, interleaved, node-budgeted:

| corpus | wall time | `nodesExpanded` | per-level divergences |
|---|---|---|---|
| published (160 levels) | 13,103ms → 9,550ms (**−27.1%**) | 7,224,167 → 7,224,167 (identical) | 0 |
| corpus-2 (40-level sample) | 71,813ms → 62,369ms (**−13.2%**) | 11,535,681 → 11,535,681 (identical) | 0 |

Per change, measured separately (published / corpus-2): flood fill −14.9% / −11.5%; context pooling
−11.3% / −12.2%; closure hoist −3.2% / not separately measured. Those compound to ≈−21% published,
against −27.1% end-to-end — the gap is machine drift across a long session, not a fourth change.
Treat the published figure as "roughly −21% to −27%"; every individual number is a median of
interleaved runs, but the session spans hours on a shared host.

`npm run solver:bench -- --check`: **160/160, no regressions, zero flips**, 30.1s → 28.9s across the
two changes. Its `-31.4%` cost-vs-baseline line is against a figure recorded on a different machine
and commit and should not be read as this branch's speedup; the interleaved same-machine numbers
above are the honest ones. Full `npm run ci` green (1000/1000 vitest, all node validators).

## Follow-ups not taken

- `beamSearchFromGate`'s own body is now the largest single entry (22% published self-time). Its
  per-*phase* allocations (dedup `Map`, spread, sort closure, `_diverseSelect`'s buckets) are the
  remaining scoped Tier-2 item — though change 3's result suggests measuring before assuming
  allocation removal pays.
- `scoreMove` (7.7% / 17.5%) was not touched. It is a long chain of independently-ablatable scoring
  terms; any reordering or short-circuiting risks being a behaviour change rather than a speed one,
  which is exactly what this workstream was scoped to avoid.
- Tier 3 (dense per-level indexing) is not worth pursuing for the flood fill given the refuted
  aliasing measurement above. Whether it pays for the *distance* arrays, which have a different
  access pattern, is untested.
