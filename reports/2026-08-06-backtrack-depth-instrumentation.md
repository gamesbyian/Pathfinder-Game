# Real DFS backtrack-depth instrumentation: the definitive answer is another clean null (2026-08-06)

Follow-up to `reports/2026-08-06-branching-factor-parity.md`, whose greedy-single-line proxy for
backtracking cost was inconclusive (mean delta +1.75, stdev 6.17 — not distinguishable from noise at
n=10) and explicitly named the real fix: instrument `dfsFromGate` itself to measure actual
backtracking cost, not a proxy. This does that.

## The instrumentation

`modules/solver/search.ts`'s `dfsFromGate` now tracks, gated behind a new env-var flag
(`PF_DFS_DEBUG=1`, same shape and zero-production-cost pattern as the existing `_BEAM_DEBUG`/
`_LDS_DEBUG` probes in the same file): for every stack frame that gets pushed and later fully
popped (every child tried, no solution found beneath it — a genuinely abandoned branch), its
**subtree size** (how many nodes `nodesExpanded` advanced while that frame and its descendants were
being explored) and the depth it was abandoned at. Reported via `console.error` as a
`__DFS_BACKTRACK_STATS__`-prefixed JSON line per `dfsFromGate` call (mean/max subtree size, mean
depth, instant-reject count, and a cheap log-scale histogram — no percentile sort of a
possibly-multi-million-entry array).

**Verified zero-cost when off** (the only state that matters — `PF_DFS_DEBUG` is never set on any
production path): `npm run solver:bench -- --check` gives byte-identical `nodesExpanded`
(51,959,664) with the instrumentation present vs. fully reverted (`git stash`), across repeated runs.
The `-7.9%`/`+37-41%` delta both runs show against the committed baseline is pre-existing and
unrelated to this change — reproduces identically with the instrumentation completely absent, so it's
either environmental noise or drift since the baseline's commit, not something this patch introduced.
All 50 existing `search.test.ts`/`orchestration.test.ts` tests still pass. `tsc --noEmit` clean.

## Measurement

Same 10-pair sample as the branching-factor report (5 starved-then-fair + 5 real-attempt levels,
paired against their solved twins). Each level run with `Solver.solve()` at a bounded 5,000,000-node
budget, `disableExtraBudgetPasses: true` (so only the main-loop ladder runs, no repair/AO tiers
diluting the DFS-specific signal), aggregating every `dfsFromGate` call's stats weighted by how many
frames it actually popped.

```
                    unsolved population    solved twins
mean subtree size:  72.20                  69.22
per-pair delta (unsolved − twin): mean=+2.99, stdev=14.12, t≈0.67
positive (unsolved higher): 6/10
```

**Another clean null, and now from the real search, not a proxy.** A t-statistic of 0.67 on a
paired difference this noisy is nowhere near significant — this is indistinguishable from chance. DFS
doesn't waste systematically more work per abandoned branch on the harder population than on their
cheaply-solved twins.

## Important caveat: what this actually measures

Neither the "solved" nor "unsolved" side of this specific comparison **found a solution** within the
5M-node budget (`ok=false` on every one of the 10 solved-twin runs too) — because the twins' own
cheap wins (per the source report, e.g. `beam:perimeterSweep`) come from **beam search, not DFS**,
and `disableExtraBudgetPasses`/the bounded node budget means the ladder may not even reach that
config before running out. This measurement is honest about what it answers: **is DFS's own
backtracking behavior, independent of which technique eventually wins, different between the two
populations?** No. It does **not** directly explain why the twin solves fast overall (that credit
goes to beam finding a good path with little backtracking of its own — a distinct question this
instrumentation doesn't address, since `beamSearchFromGate` has its own separate search shape with
no directly comparable "subtree size" concept).

## Where this leaves the "admissible-bound lever"

Three independent, now-real (not proxy) measurements agree: local branching factor after full
admissible pruning is identical between the populations; DFS's real per-branch backtracking cost is
identical; and (from the earlier reports) no scoring term and no dynamic prune misfires either. Every
locally-measurable property of the search tree that this session could think to check is the same.
**A new per-step admissible bound is very unlikely to be the fix** — there is no measurable local
signal for it to exploit that isn't already equally present on the levels that solve fine. The
remaining, unexamined possibilities are (a) something in beam search's own dynamics specifically
(this instrumentation only covers DFS), (b) a genuinely global/aggregate property not visible in any
per-branch or per-step statistic (e.g. total distinct-dead-end COUNT rather than their individual
cost, which a sampled measurement like this one is not well-suited to capture), or (c) this
population is simply harder in a way no cheap structural diagnostic will explain short of a
much larger, dedicated search-algorithm research effort — which is a legitimate, if less satisfying,
place for this investigation to conclude.

## The instrumentation is kept, not reverted

Consistent with `_BEAM_DEBUG`/`_LDS_DEBUG`'s own precedent (built for one investigation, kept as
permanent zero-cost tooling): `PF_DFS_DEBUG=1` remains available in `modules/solver/search.ts` for
any future backtrack-depth question, rather than being thrown away after this one use.

## Reproduce

```bash
PF_DFS_DEBUG=1 node -e "
  const { installBrowserStubs } = require('./scripts/test-lib/browser-stubs.mjs');
  // ...call Solver.solve() on a level and grep stderr for __DFS_BACKTRACK_STATS__
"
```
Run via a scratch script (not committed — sets `process.env.PF_DFS_DEBUG='1'` before importing
`Solver.js`, captures `console.error` lines, aggregates per-level).
