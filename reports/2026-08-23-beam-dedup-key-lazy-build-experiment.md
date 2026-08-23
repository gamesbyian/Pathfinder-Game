# Beam dedup/diversity keys built lazily instead of on every candidate (2026-08-23)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-23 — this report's own interleaved node-budgeted A/B and `solver:bench --check`
> **Decision:** landed directly (order-preserving, no flag needed); see disposition below
> **Remaining gate:** none

Branch `claude/solver-speed-optimizations-mtbemk`. Part of the ASAP architectural speed program
([`../docs/solver-architectural-speed-opportunities.md`](../docs/solver-architectural-speed-opportunities.md)),
item 2 ("Beam candidate arena and cheaper coarse dedup").

## Motivation

A fresh CPU profile on current code (not the 2026-07-30 report's month-old numbers) confirms
`beamSearchFromGate`'s own body is still the largest single self-time entry — **24.93%** of
published-corpus self-time (up slightly from the 22% the prior hot-path campaign recorded, and
matching that report's own flagged-but-untaken follow-up: "Its per-*phase* allocations ... are the
remaining scoped Tier-2 item"). `PF_BEAM_DEBUG=1` segment timing on the published corpus split that
further: candidate-generation loop 5,397ms, connectivity checks 1,719ms, replay 1,017ms, dedup
476ms, sort 466ms — dedup+sort together (~17% of instrumented beam time) were the most mechanical,
lowest-behavior-risk piece to target without touching `scoreMove`'s actual computation (which the
prior report explicitly scoped out as too easy to turn into a behavior change).

## What was actually wasted

Every accepted beam candidate built two delimited-string keys unconditionally, in the per-candidate
loop, immediately after `scoreMove`:

- `sc` (7-field constraint-state key: `ints|mpVisitedMask|mustCrossMask|flipperUsedMask|` +
  `surroundMask|mustTurnMask|adjTurnMask`) — used only inside the state-dedup `Map` built when
  `cands.length > beamWidth`.
- `sk` (2-field diversity key: `flipperUsedMask|mustCrossMask`) — used only inside `_diverseSelect`,
  itself only called from the same `cands.length > beamWidth` branch.

Both strings were built regardless of whether that branch is ever reached. Any phase where the beam
doesn't overflow its width — narrow late-game phases, small `beamWidth` configs, or portal levels
(`useStateDedup` off entirely) — paid the string-construction cost (7-8 number→string conversions
plus concatenation, per candidate) for a value that was immediately discarded.

## The change

`modules/solver/search.ts`: `BeamNode` now stores the 7 raw numeric fields as scalars (snapshotted
from `ws` at the same point `sc`/`sk` used to be built) instead of the joined strings. Two new
module-level functions, `beamStateKey(c)` and `beamDiverseKey(c)`, build the delimited string
**lazily**, called only from the two sites that actually consume a key: the dedup `Map`'s key
(`dk = \`${c.key}|${beamStateKey(c)}\``) and `_diverseSelect`'s bucket key. Every other candidate now
pays only the 7-field scalar snapshot (already-materialized numbers, no allocation) instead of a
string build. This is a pure allocation-deferral change — the *content* of every string ever built is
byte-identical to before, just built later and skipped entirely when the branch that needed it isn't
taken. `.sc`/`.sk` were referenced nowhere outside `search.ts` (checked directly), so the refactor is
fully self-contained to one file.

## Verification (order-preservation + regression gates)

Per [`../docs/testing.md`](../docs/testing.md) and the prior hot-path report's own protocol:
node-budgeted, non-binding wall-clock runs so `nodesExpanded` is directly comparable, medians of
**interleaved** before/after runs (separate esbuild bundles, alternated per round, same machine) so
drift cancels rather than favoring one side.

- **Order preservation:** `nodesExpanded` bit-identical in every round on both corpora (below) — the
  change altered zero search decisions.
- **`solver:bench --check`:** 160/160 published levels solved, **byte-identical 45,859,097 nodes**
  to the count already on record in `docs/solver-optimization-current-queue.md` for the current
  baseline — independent confirmation of order preservation via a different tool.
- **Types:** `tsc --noEmit` clean on both `tsconfig.json` and `tsconfig.test.json`.
- **Solver unit tests:** 196 targeted tests (`search`, `repair-search`, `orchestration`,
  `stage-budget`, `stage-executors`, `testing-api`) pass. Full `vitest run` (`SOLVER_DEEP_TESTS=0`):
  **92 files / 1228 passed, 9 skipped** (pre-existing skips, unrelated).
- **`check:*` gate:** all `npm run check` sub-checks pass except two pre-existing, unrelated
  failures verified present on unmodified `HEAD` (via `git stash`) before this branch touched
  anything: `check:lint` (`structuredClone` undefined in
  `scripts/audit-technique-census-duplicates.mjs`, a file this change never touches) and
  `check:documentation-links` (stale doc references to removed npm aliases and two workflow files
  missing from `.github/workflows/README.md`, likewise untouched by this change).
- **`test:node:fast`:** all pass except `test:race-stage-parity`, confirmed pre-existing on
  unmodified `HEAD` — `race.mjs`'s stage-ID list hasn't caught up to two stages promoted default-ON
  on `main` just before this branch (`goal-attraction-legacy-distance-retry`,
  `repair-late-probe-multi-seed-retry`; see `docs/solver-optimization-current-queue.md`'s 2026-08-23
  entries), unrelated to this change.

### Wall time — published corpus (`--corpus=published --count=160 --budget-ms=4000 --node-budget=250000`)

| round | before | after | nodes (both) |
|---|---|---|---|
| 1 | 12.39s | 10.91s | 6,344,576 |
| 2 | 12.01s | 11.08s | 6,344,576 |
| 3 | 11.55s | 11.07s | 6,344,576 |

Median 12.01s → 11.07s, **−7.8%**. 147/160 solved within the node budget, identical set both sides.

### Wall time — Corpus-2 sample (`--corpus=corpus2 --count=60 --budget-ms=4000 --node-budget=250000`)

| round | before | after | nodes (both) |
|---|---|---|---|
| 1 | 74.26s | 66.93s | 14,870,405 |
| 2 | 76.92s | 65.80s | 14,870,405 |
| 3 | 72.30s | 65.97s | 14,870,405 |

Median 74.26s → 65.97s, **−11.2%**. 1/60 solved within the (deliberately tight, 4s/level) node
budget both sides — this sample is mostly budget-edge/hard levels by construction; the identical
node count across all three rounds is the load-bearing signal here, not the solve count.

## Disposition

Strictly order-preserving speed win, no scoring/pruning/ordering change. Landed directly (not gated
behind a flag) — same disposition class as the 2026-07-30 report's order-preserving changes 1–3.

## Addendum (same day): loop-invariant portal lookup hoisted out of beam's candidate loop

A re-profile after the change above (fresh `--cpu-prof` plus `PF_BEAM_DEBUG=1`) confirms it worked
as designed: the `candGen` segment (`PF_BEAM_DEBUG`'s per-candidate bucket) dropped from 5,397ms to
4,768ms summed over the published corpus, with the now-lazy string build correctly showing up
instead inside the `dedup` bucket (476ms → 662ms) only for the candidates that actually reach it.
`beamSearchFromGate` remains the largest single self-time entry (~24%) on a fresh profile; the
connectivity flood fill (`_floodFillBits`/`_buildPassableRow`, ~16% combined) is the next largest
but was already heavily bit-parallelized and lazily row-banded by the 2026-07-30 campaign, with its
one plausible remaining idea (dense per-level cell indices) refuted for this specific access pattern
in that same report — not revisited here.

One further one-line fix, found while re-reading the candidate loop: `level.portalMap.get(pos)` was
re-looked-up on every candidate inside `for (const next of neighbors)`, even though `pos` (the
parent node) is fixed for the whole loop — identical to how `curCtx` right above it is already
computed once per node, not per candidate. Hoisted the lookup out, matching `takePly`'s existing
convention in `repair-search.ts` (which already hoists the same lookup outside its own per-candidate
loop). A parallel opportunity in `dfsFromGate`'s iterative stack (`level.portalMap.get(top.key)`
re-run on every child pop even though a stack frame's `key` is fixed across its own children) was
**deliberately not touched**: the surrounding code has an explicit comment arguing against adding
fields to the hot-path `DfsFrame` shape "so there is zero allocation-shape/hidden-class risk," and
caching the lookup there would require exactly that. Left as a documented candidate rather than
overridden without measurement.

Verification, same protocol as above: `solver:bench --check` 160/160, byte-identical 45,859,097
nodes; 176 targeted solver tests pass; 3 interleaved node-budgeted rounds on the published corpus,
`nodesExpanded` bit-identical every round (order preserved):

| round | before (this addendum) | after |
|---|---|---|
| 1 | 11.33s | 11.20s |
| 2 | 11.32s | 11.00s |
| 3 | 11.42s | 11.33s |

Median 11.33s → 11.20s, **≈−1.1%** — small, as expected for hoisting a single `Map.get()` out of a
loop that runs at most 4 times, but consistently in the same direction across all three rounds and
zero-risk (byte-identical semantics). Folded into the same disposition as the change above: landed
directly, no flag.
