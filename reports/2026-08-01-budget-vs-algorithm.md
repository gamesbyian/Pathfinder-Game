# Where the typical-budget solves actually are (2026-08-01)

Three deterministic full-corpus runs, dispatched on a branch whose only behavioural delta from main
is one ablation-gated flag. All three report **0/1802 clock-bound and 0 deadline-truncated**, so
unlike every previous corpus comparison there is no noise band: differences below are exact.

| cell | clock | corpus-2 node budget | corpus-1 | corpus-2 | corpus-2 nodes | corpus-2 wall |
|---|---|---|---|---|---|---|
| committed baseline `92fdb49a` | 8000ms, **binding** | 20M | 89 | **505** | 25.34B | 29,236s |
| OFF @ 20M | non-binding | 20M | 93 | **537** | 24.91B | 58,993s |
| OFF @ 36M | non-binding | 36M | 91 | **562** | 43.91B | 47,671s |
| ON @ 36M | non-binding | 36M | 91 | 560 | 43.96B | 47,878s |

## 1. The wall-clock deadline costs ~32 corpus-2 solves

505 -> 537 at an identical node and work budget. The only change is that the 8s deadline stops
terminating the ladder early. The node budget has therefore been **nominal**: levels were dying on
the clock long before spending it, so the baseline has been measuring "what the solver finds in 8
seconds of tier-sized attempts", not "what it finds in 20M nodes". The cost is wall time — 29,236s
-> 58,993s, roughly 2x, because runs that used to be cut short now run to their real budget.

## 2. Raising the node budget 1.8x is worth a further ~25

537 -> 562 for 20M -> 36M. So the tail **is** budget-limited, which contradicts the working
assumption this campaign has been operating under. Combined with (1), the same solver goes
**505 -> 562, +57**, on configuration alone.

## 3. Axis-aware connectivity is -2, measured properly this time

ON@36M 560 vs OFF@36M 562, at matched nodes, deterministic, full corpus. It was reverted earlier on
a -1 over a 200-level sample; that verdict was right, and this is the clean confirmation. Corpus-1
is 91 in both.

## 4. The ~2x speedups measured locally today were an ordering artifact

Corpus-wide, ON expanded 43.96B nodes in 47,878s against OFF's 43.91B in 47,671s — identical
throughput, ON marginally slower. Yet the local A/B on 200 levels had ON at 7,218s against OFF's
13,247s at matched nodes.

Every sequential local A/B run today shows the **first** arm ~1.8-2.2x faster:

| A/B | first arm | second arm |
|---|---|---|
| reserved wall (solved population) | 522s | 1,132s |
| freeInt dilation | 7,647s | 14,363s |
| axis-aware | 7,218s | 13,247s |
| portal extension | 15,611s | 25,989s |

Four different mechanisms do not all happen to be ~2x faster. This is sandbox CPU throttling
accumulating across a multi-hour sequential run — the effect CLAUDE.md already warns about for
`solver:bench`, here large enough to invent a headline result.

**The reserved-intersection wall's 2.25x is unaffected**: it was measured interleaved (on/off/on/off,
three each on one level) and again as an alternating 2x2 on the published corpus, so ordering was
controlled. Its solve-count results are also unaffected — a matched-node solve count does not depend
on wall time.

**Rule: in this environment, a sequential A/B is untrustworthy on timing. Interleave, or measure on
fresh runners.**

## What this implies for the campaign

Configuration is currently worth more than algorithms. Today's best algorithmic result — the
reserved-intersection wall — is +28 corpus-2. Removing an artificial early termination is +32, and
1.8x budget is +25, neither of which required any solver insight.

That is not an argument against solver work; it is an argument for fixing the measurement first, and
for two reasons beyond the solve count. Deterministic runs have **no** noise floor, so the +/-5 band
that made today's small results unreadable disappears — every future A/B gets cheaper and more
conclusive. And a baseline whose binding constraint is the clock cannot be reasoned about: "the level
hit the node ceiling" was the premise behind treating the tail as budget-limited-by-construction, and
it was false for a large share of levels.
