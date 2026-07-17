# repair-search stagnation diagnosis: a real, severe plateau — but a longer burst is a net-negative fix (2026-07-17)

## Context

Everything diagnosed so far today (witness-divergence, revisit-rate measurement) examined
DFS/beam's own scoring and search-tree structure. Nothing this session had looked at
`repair-search.ts`'s own mechanism — the iterated-local-search fallback that `repair-close`/
`repair-far` (621 corpus-2 levels) are actually gated on — despite this population's own name
implying repair is the primary technique that should matter for it. This report uses
`repair-search.ts`'s pre-existing, already-shipped debug instrumentation
(`PF_REPAIR_DEBUG=1`, traces `bestBadness` evolution across restarts) to look at this directly
for the first time this session.

## Finding 1: a severe, consistent stagnation plateau

Traced 4 levels (`R01698`, `R01860`, `R00440`, `R02010` — spanning `repair-close` and the
R00440 robust hard core) at 15s budget. **Every level shows the same shape**: `bestBadness`
drops fast within the first 100-800 restarts (tens to low hundreds of milliseconds), then
plateaus for the overwhelming majority of the remaining budget — 85-99% of total wall time —
despite the existing `STAGNATION_THRESHOLD`/`STAGNATION_BURST_LEN` fresh-restart-burst
mechanism firing repeatedly (12-30+ times per run) without escaping. `R02010` is the starkest
example: reaches `bestBadness=3` (needing just 1 more length step and 2 more correctly-turned
must-turn cells) within **170ms**, then never improves again across the remaining **14.8+
seconds** and ~20 more stagnation triggers.

This confirms repair-search's escape mechanism is *firing* as designed but not *working* as
intended on this population — a real, previously undiagnosed gap distinct from anything already
investigated (the probe-budget-starvation bug fixed earlier today, or the pre-session
elite-splice regression).

## Finding 2: the obvious fix (longer burst) is a net-negative regression, not a win

Hypothesis: `STAGNATION_BURST_LEN=800` may simply be too short for a burst to establish a
genuinely better elite before reverting to `SPLICE_PROBABILITY=0.75`-dominated exploration
(which keeps re-exploring variations of the same stuck elite pool). Tested directly: temporarily
raised `STAGNATION_BURST_LEN` from 800 to 6000 (matching `STAGNATION_THRESHOLD` itself, so a
triggered burst runs as long as the exploitation phase that preceded it), reverted after
measuring (never shipped).

**Published-corpus safety check first**: `solver:bench --check` with the modified constant —
**160/160, no regressions** (covers the 4 known repair-gated published levels this constant
family has documented regression history against).

**40-level corpus-2 sample** (20 `repair-close` + 20 `repair-far`, 8s budget, identical seed/
methodology both passes):

| | Solved | Avg final badness | Improved | Worsened | Unchanged |
|---|---:|---:|---:|---:|---:|
| Baseline (`STAGNATION_BURST_LEN=800`) | 0/40 | 11.50 | — | — | — |
| Longer burst (`=6000`) | 1/40 | 13.35 (**+16%**) | 4 | **18** | 17 |

One genuine new solve (`R02022`, deterministic seed — reproduced identically across both burst
runs, not independent evidence of a stable rescue rate). But **average badness got worse, not
better**, and nearly 5× as many levels regressed as improved. The swings are large in both
directions — `R00228` regressed from 16 to **41** (+156%), `R02436` from 2 to 13, `R01403` from
9 to 20, while `R03286` improved from 23 to 5 and `R02165` from 10 to 2. This is high-variance,
net-negative behavior, not a marginal or ambiguous result.

## Interpretation

This is consistent with — and now directly confirms with real data on the actual target
population, not just the old calibration family — the repair-search-constants sensitivity
CLAUDE.md's history already documents (S030 regressing from solved to a 120s timeout from a
much smaller, more targeted change). A blanket, uniform lengthening of the stagnation burst
doesn't give the search "more room to escape" in a way that generalizes — it just shifts *which*
structural family each level's restarts converge toward, helping some and actively hurting
others, with no reliable net direction. The severe plateau documented in Finding 1 is real and
substantial, but **the burst-length lever specifically is not the fix** — this doesn't mean the
escape mechanism can't be improved, only that a uniform constant bump is the wrong shape of fix
for it.

## What this doesn't rule out

This tests exactly one lever (burst *length*, uniformly across all levels) — it does not test:
- **Level-adaptive burst sizing** (e.g., scaling burst length with grid size, `reqLen`, or
  landmark count) rather than one constant for every level — untested, and given the demonstrated
  high variance, plausibly more promising than a uniform bump, but real design/calibration work.
- **`STAGNATION_THRESHOLD`** (how *often* a burst triggers) independent of burst length.
- **A qualitatively different escape mechanism** (e.g., a burst that also resets or diversifies
  the elite pool itself, not just biases restart origin) — the current burst still splices from
  the same potentially-stuck elite pool once it ends, which this report's data suggests may be
  the real limiting factor (a longer burst still reverts to the same pool afterward).
- **Whether the severe plateau (Finding 1) is itself diagnostic of something fixable elsewhere**
  (e.g., in `scoreMove`'s bias making the greedy branch too deterministic even within repair's
  own epsilon-exploration) — Finding 1 stands as a real, well-evidenced diagnostic regardless of
  Finding 2's negative result on this specific fix.

## Verification

`git diff`/`git status` confirmed clean against `modules/solver/repair-search.ts` after the
experiment (`git checkout --` reverted the temporary constant edit before this report was
written). `tsc --noEmit` clean and `solver:bench --check` (160/160, no regressions) verified
both before writing this report and during the experiment itself (with the modified constant in
place, before reverting). No production code changed by this investigation.
