# Beam search `nodesExpanded` instrumentation gap (2026-07-16)

## Context

While scoping a broader family/variant deep-dive to find shared bottleneck patterns across
corpus-2's 1,464 unsolved levels (as a cheaper, telemetry-only first pass before generating any
new levels — see `scripts/stress/cluster-unsolved-failures.mjs`), an initial pass bucketed 285/1464
(~19.5%) of unsolved levels into a "beam-collapse" cluster: every non-repair beam attempt on the
level showed `timedOut: true` with `nodesExpanded` under 50, despite each attempt running for a
real, substantial `elapsedMs` slice (hundreds to thousands of ms). This looked like it might be the
R02248/R01465 scoring-orientation phenomenon (CLAUDE.md's `SCORE_INTERSECTION_SETUP`/
`SCORE_SURROUND_URGENCY` gotcha) recurring at corpus scale — a much larger population than the 2
previously-known cases.

It isn't. It's a 100% structural artifact of where the node counter lives in the beam search code.

## Investigation

**Code read** (`modules/solver/search.ts`'s `beamSearchFromGate`): `prep._metrics.nodesExpanded`
(the counter that becomes an attempt's reported `nodesExpanded`) is only incremented in two places:

1. Line ~454, on finding the goal (`prep._metrics.nodesExpanded += frontierIndex + _beamNeighborCount`).
2. Line ~549, at the very end of the function, reached only when the `while (frontier.length > 0)`
   loop exits via `cands.length === 0` (a genuine dead-end) — `out.timedOut` is explicitly set to
   `false` right there.

None of the three timeout exit paths — the per-phase budget check (line ~374), the mid-phase
256-node check (line ~388), or the `maxPhases` limit (line ~375) — touch `nodesExpanded` at all.
So **any beam attempt that times out reports `nodesExpanded: 0`, unconditionally, regardless of how
much real candidate-generation/scoring work it did.**

**Corpus-wide verification** (`reports/stress/benchmark-latest-random.json`, 1700 levels): checked
every non-repair beam attempt's `(timedOut, nodesExpanded > 0)` pair.

| | `nodesExpanded > 0` | `nodesExpanded == 0` |
| --- | ---: | ---: |
| `timedOut: true` | **0** | **1681** |
| `timedOut: false`/absent | **951** | **0** |

Perfect, exceptionless correlation — confirms the code read isn't missing some other increment site.

**Ruled out CPU contention as an alternative explanation.** The corpus-2 refresh ran under
`--workers=2` on GitHub Actions runners, so before trusting this as a real search phenomenon it was
worth checking whether concurrent-process scheduling delay (an `await` point resuming late because
another worker held the CPU) could produce the same signature without a code-level cause. Re-solved
4 sample "collapsed" levels (R00050, R00088, R00143, R00180) locally, single-threaded
(`--workers=1`, no `--race-pool-size`), at the same budget. Every beam attempt on every level still
showed `nodesExpanded: 0` with `timedOut: true` — identical to the contended run. Contention is not
the cause; this reproduces cleanly and deterministically.

**Beam isn't structurally unable to search these levels** — on the same 4 levels, the *plain DFS*
variants of the identical profiles (`objectiveFirst`/`intersectionHarvest` without `beamWidth`) on
the same gate showed 400k–550k `nodesExpanded`, and repair attempts showed millions. The search
space is not degenerate; the beam-specific counter just never gets touched before the attempt's
short time slice runs out.

## Why this happens mechanically

A beam attempt's `nodesExpanded` only gets credited once its *entire current phase* (one full pass
over the frontier, dedup, sort, reselect) completes without hitting the time limit. If a level's
frontier is large (`beamWidth` 2000–5000) or per-node work is nontrivial, a single phase can easily
exceed a short per-attempt time slice (many of the observed slices were 450ms–2s) — so the attempt
times out mid-phase, and the entire phase's work (real, substantial CPU time) is silently
uncredited. This is an accounting gap, not a claim that the beam search "does nothing" — it visibly
does real work (matching elapsedMs), it just isn't currently observable via this field.

## Implications

- **`cluster-unsolved-failures.mjs`'s `beam-collapse` bucket is not usable as a search-quality
  signal** — it currently just measures "this level has a beam attempt that timed out," which
  describes most of the unsolved-via-beam population, not a specific pathology. Flagged loudly in
  the script's own doc comment and a runtime console warning rather than silently shipped.
- **R02248/R01465's original diagnosis is unaffected** — that investigation used the `_BEAM_DEBUG`
  introspection counters (`_dbgFrontierNodes`, etc., in `search.ts`), which track unconditionally
  regardless of timeout, not the corpus-wide `nodesExpanded` field. Those findings stand on their
  own terms; they just aren't currently minable at corpus scale through the benchmark telemetry
  pipeline (`stress:benchmark`, `portfolio-solve-sweep.mjs`).
- **Every past analysis that used a timed-out beam attempt's `nodesExpanded`** (e.g., as a
  "how much progress did this make" proxy in `rank-levels.mjs`'s `levelBadness`, which falls back to
  `bestBadness`/`finalBadness` rather than `nodesExpanded` for its primary ranking, so is not
  directly affected — but any other consumer reading `nodesExpanded` on a timed-out beam attempt as
  a meaningful quantity should be re-checked) was working with data that's uninformative in exactly
  this case.

## Recommendation

Before rebuilding the failure-signature clustering (or drawing any other conclusion from timed-out
beam attempts' `nodesExpanded`), fix the instrumentation: increment `prep._metrics.nodesExpanded` on
every frontier-node touch (or at minimum on each timeout exit path, crediting `frontierIndex` at the
point of interruption) rather than only at full-phase completion. This is a pure telemetry change —
it must not alter search behavior, pruning decisions, or returned paths, only the recorded count —
so it's verifiable trivially (identical solve/fail outcomes and identical returned solutions
before/after, `solver:bench --check` green, only `nodesExpanded` values change on previously-0
timed-out beam attempts). Low risk, and it unblocks not just this specific clustering effort but any
future corpus-wide beam-search cost/badness analysis.

No code change made yet — this report documents the finding; the fix and its own verification are
tracked as a separate step.

## Fix (implemented same day)

`beamSearchFromGate` now credits `prep._metrics.nodesExpanded += frontierIndex` on all three
timeout exit paths (the per-phase budget check, the mid-phase 256-node check, and the `maxPhases`
limit), crediting whatever phase — complete or partial — was in progress at the moment of
interruption. Exactly mirrors the credit the natural-exhaustion path already gave; no other logic
changed.

**Verified pure-telemetry, no behavior change**, per the recommendation above:
- `solver:bench --check`: 160/160, no regressions (the 4 "newly solved" entries are pre-existing
  baseline staleness — `logs/solver-baseline.json` predates 4 levels added to the corpus since
  2026-07-01, unrelated to this change).
- New regression test (`modules/solver/search.test.ts`, "credits nodesExpanded even when it times
  out mid-search"): a wide-open 9x9 grid with generous slack forces multiple real phases before a
  tiny budget interrupts it; asserts `nodesExpanded > 0` whenever the attempt actually times out.
  Confirmed via a standalone check that it exercises the intended path (`timedOut: true,
  nodesExpanded: 4`, vs. the pre-fix value of exactly 0 for the same call).
- **Behavioral risk surface identified and checked**: `nodesExpanded` also feeds
  `adaptiveGateWeight()` in `orchestration.ts` (cross-gate budget allocation on dilution-prone
  levels), which could in principle change solve outcomes now that the counter is more accurate —
  but that mechanism only engages at `ADAPTIVE_GATE_THRESHOLD` (4) or more active gates, and no
  level in any of the 3 real corpora has more than 3 gates except 2 in stress-corpus-1 (S00103,
  S00108) — the published corpus is provably untouched (per the constant's own code comment).
  Re-solved both post-fix: both solve trivially (200ms, 106ms), nowhere near where adaptive
  weighting would even engage (it only activates from the second full config round onward) — the
  one theoretical risk surface turned out to be moot in practice, without needing a second
  expensive full-corpus timing sweep just to re-confirm two trivial levels.
- `beamSearchFromGate` doesn't take a `nodeBudget` parameter at all (only `repairSearchFromGate`/
  `dfsFromGateLDS` do — nodeBudget is a repair/DFS-only deterministic backstop), so this change
  has no interaction with `--node-budget` enforcement either.

## Related, separately-motivated finding: the repair-fallback extension's real cost

While instrumenting this fix, a full corpus-1 before/after sweep (needed to check the
`adaptiveGateWeight` risk above) surfaced an unrelated but significant cost finding: corpus-1 (102
levels, 20s nominal budget) took **51 minutes** total, dominated by `REPAIR_EXTRA_BUDGET_FRACTION`'s
default 6x extension — 10 levels spent 146-299s each and still failed; 6 more only solved by taking
35-115s. Re-running with `--repair-budget-fraction=0` cut total time to 18 minutes (~65% less) and
lost exactly those 6 slow solves — every one of which already exceeded any reasonable interactive
tolerance. This directly motivated: (1) passing `repairBudgetFractionOverride: 0` from the two
live, human-waiting solve call sites (`modules/input/solver-controller.ts`'s editor "Find 1 Hint",
`modules/input/review-controller.ts`'s review-approval solve — both have a progress bar that
promises a ~30s wait the 6x extension could silently blow past, up to 210s), and (2) adding
`--repair-budget-fraction` support to `scripts/stress/benchmark.mjs` (previously missing entirely)
so solver-testing/benchmarking workflows can opt out of the extension, which offline hint-discovery
tooling (`--save-hints` runs) should keep using by default.
