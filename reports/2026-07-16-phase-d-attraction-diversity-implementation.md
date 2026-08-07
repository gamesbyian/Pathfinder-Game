# Phase D implementation: the attraction-diversity last-resort pass (2026-07-16)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-07 — sequential-widening disposition in the live queue
> **Decision:** keep the shipped single-flag, 1.0-budget pass; do not widen or add sequential
> per-flag passes without a cheap selector or isolation mechanism
> **Remaining gate:** none

## Goal

`reports/2026-07-16-phase-d-fragile-group-ablation-diagnosis.md` found that 5 levels in the
`dfs-plain` fragile subgroup each unlock when one specific `SCORE_*` term is disabled, but the
term varies per level (4 distinct culprits across 5 levels) — ruling out a single scoring fix. The
generalizable pattern it identified was a **diversity mechanism**: a bounded last-resort attempt
that retries with a candidate term disabled, analogous to repair search's existing multi-seed
retry. This report implements and verifies that mechanism.

## Design

`modules/solver/orchestration.ts`'s `solveLevel()` gains a new stage, after the main loop AND the
repair fallback have both already failed on every gate: a **whole extra rerun of the same
`mainConfigs` ladder**, with `attempts.ts`'s `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` (currently just
`SCORE_GOAL_ATTRACTION`) disabled for the pass's duration, in its own separate additive budget
(`ATTRACTION_DIVERSITY_BUDGET_FRACTION = 1.0`, i.e. one more nominal-budget's worth of time).

Two design points that were **not** the first thing tried, and were corrected after being shown
wrong by direct measurement (see "Mistakes made and caught" below):

1. **A whole-ladder rerun, not one narrow attempt.** The diagnosis disabled the flag globally
   across every profile/template attempt.ts's policy selects, not one specific config — a fix that
   only retries a single default-profile DFS attempt under-delivers relative to what was actually
   proven.
2. **Its own independent budget override** (`attractionDiversityBudgetFractionOverride`), separate
   from `repairBudgetFractionOverride`, so a caller can control each extension's cost independently
   (e.g. disable repair's 6x while still exercising this pass, or vice versa) rather than the two
   extensions being inseparably coupled.

The interactive UI call sites (`solver-controller.ts`'s "Find 1 Hint", `review-controller.ts`'s
review-approval solve) now pass `attractionDiversityBudgetFractionOverride: 0` alongside their
existing `repairBudgetFractionOverride: 0`, for the same reason: their progress bar promises a
~30s wait, and either extension could silently exceed it. `scripts/stress/benchmark.mjs` gained a
matching `--attraction-diversity-budget-fraction` CLI flag (sequential + raced-pool paths; the
raced engine accepts but does not yet act on it — see the flag's own doc comment). A new
`STRATEGY_ATTRACTION_DIVERSITY` ablation flag (`scripts/ablation-config.mjs`) gates the whole
mechanism, following the same `defaultConfig()`-derived-registry pattern every other flag uses.

## Mistakes made and caught during implementation

Two real bugs were found and fixed before this was verified working — recorded here because both
are instances of failure modes this codebase has hit before, not new categories:

1. **Single-attempt under-delivery.** The first version added one `AttemptConfig` (`profileName:
   'default', template: null`) with the candidate flag disabled, scoped to just that one attempt
   via a new `AttemptConfig.ablationOverride` field. Verified against the 6 known-rescuable
   variants: only rescued 2 of 6 (both R02795, whose winning config happens to be the fast/early
   default profile) — missing every R00156/R02960 case, because their diagnosed rescue needs a
   config this single attempt never tried. Fixed by replacing the per-attempt override with a
   whole-`mainConfigs` rerun (removing `AttemptConfig.ablationOverride` and the per-attempt
   `prep._cfg` scoping in `runAttempt` entirely — dead code once the design changed).
2. **Sparse ablation object silently disabling unrelated strategy flags.** The whole-ladder rerun
   initially built its overridden config via `{ ...(originalCfg ?? {}) }` — since `originalCfg` is
   `null` in the common case, this produces a **sparse** object (`{ SCORE_GOAL_ATTRACTION: false }`
   and nothing else). Every ablation-gated check in this codebase reads `(!cfg || cfg.SOME_FLAG)` —
   "no ablation object at all" is the only way an unset flag defaults to enabled — so a non-null
   sparse object silently disabled every *other* unset strategy flag (`STRATEGY_GATE_INTERLEAVING`,
   `STRATEGY_MIN_BUDGET_FLOOR`, `STRATEGY_ARCHETYPE_ROUTING`, etc.) for the whole pass. This is the
   *exact* bug class `SolveOpts.repairBudgetFractionOverride`'s own field comment already documents
   shipping once before. Caught by direct isolation: a standalone plain-ablation call (bypassing
   this pass, using `scripts/ablation-config.mjs`'s `withFeatureDisabled` — which correctly starts
   from a fully-populated `defaultConfig()`) rescued `F00156-sym-02` in 788ms, while the pass itself
   still failed to rescue it even at double the budget. Fixed by replacing the plain-object spread
   with a `Proxy` that falls through to `true` for any flag not explicitly named as a candidate or
   already set on `originalCfg` — faithfully reproducing "everything else exactly as if no ablation
   config were present," regardless of whether `originalCfg` itself was null or a real config.

Both were caught by running the actual rescue-verification sweep rather than only running
`solver:bench --check`/`vitest` — neither would have surfaced from those alone, since the published
corpus never reaches this pass (see below) and no unit test yet exercised the whole-pass rerun path
end-to-end.

## Verification

- `tsc --noEmit`: clean.
- `npm run check:lint`: clean.
- `npx vitest run modules/solver`: 183/183 pass (no new test added for this specific pass yet —
  see "Follow-ups" below).
- `npm run solver:bench -- --check`: published corpus 160/160 solved, **no regressions**, 32.6s
  (comparable to the pre-change baseline sweep). This pass never engages on any published level —
  they all solve well within the main loop, before repair fallback or this pass would ever run —
  so this is expected to be, and measured as, a pure no-op there.
- **Rescue verification** (the actual point of the mechanism): solved all 6 known-rescuable
  fragile-group variants from `reports/2026-07-16-phase-d-fragile-group-ablation-diagnosis.md`'s
  own tables, at `timeBudgetMs=15000, repairBudgetFractionOverride: 0` (repair's 6x explicitly
  off, matching this session's solver-testing policy — only the new pass's own default 1.0x
  extension active, so worst case 30s per level, matching the user's stated tolerance ceiling):

  | Variant | Result | Expected (per the diagnosis) |
  | --- | --- | --- |
  | `F02795-sym-05` | **SOLVED** (5179ms) | rescuable by `SCORE_GOAL_ATTRACTION` alone — yes |
  | `F02795-sym-06` | **SOLVED** (4755ms) | rescuable by `SCORE_GOAL_ATTRACTION` alone — yes |
  | `F00156-sym-02` | **SOLVED** (16394ms) | rescuable by `SCORE_GOAL_ATTRACTION` alone — yes |
  | `F00156-sym-04` | **SOLVED** (17333ms) | rescuable by `SCORE_GOAL_ATTRACTION` alone — yes |
  | `F00156-sym-05` | unsolved (timeout) | **not** rescuable by this flag alone (diagnosis: "stays stuck") |
  | `F02960-sym-02` | unsolved (timeout) | culprit is `SCORE_OBJECTIVE_ATTRACTION`, not in the current candidate set |

  **4/4 predicted-rescuable variants solved; 2/2 predicted-unrescuable variants correctly stayed
  unsolved.** The mechanism does exactly what the diagnosis said it should, no more and no less.
- **Control checks**: (1) `STRATEGY_ATTRACTION_DIVERSITY: false` correctly suppresses the pass —
  `F00156-sym-02` stays unsolved at 15068ms (vs. solved at 16394ms with the flag enabled). (2) Both
  overrides set to 0 (`repairBudgetFractionOverride: 0, attractionDiversityBudgetFractionOverride:
  0`) keeps total wall time at 15081ms — essentially exactly the 15000ms nominal budget, confirming
  neither extension silently engages when a caller opts out of both.

## Cost/scope characterization

- **Zero cost to any level that already solves** (main loop or repair fallback): the pass is
  strictly gated on `!result.solution` after both. Measured directly on the published corpus
  (`solver:bench --check`, no regressions, no timing change).
- **Bounded cost when it does engage**: exactly one more nominal-`timeBudgetMs`-sized pass (default
  fraction 1.0), never more, regardless of how many candidate flags are eventually added to
  `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS`.
- **Narrow rescue scope by design**: only `SCORE_GOAL_ATTRACTION` is in the candidate set today —
  the diagnosis found 4 distinct culprits across 5 levels, and this session verified only the one
  candidate currently wired in. `F02960-sym-02` (culprit `SCORE_OBJECTIVE_ATTRACTION`) is a known,
  expected miss, not a bug.

## Follow-up implementation (same day): unit tests + the raced engine

Two gaps flagged above were closed in the same session:

- **Dedicated unit tests**: `modules/solver/orchestration.test.ts` gained 3 tests using a
  deterministically-infeasible, non-repair-gated level (`reqLen` matching the true gate/goal
  distance's parity — an odd-vs-even mismatch here makes `STRATEGY_PARITY_GATE_FILTER` empty
  `activeGates` before any attempt runs at all, which was the first thing caught while writing
  these tests). Confirms: the pass reruns exactly as many configs as the main loop did (via the new
  `Attempt.attractionDiversity` diagnostic tag), `STRATEGY_ATTRACTION_DIVERSITY: false` suppresses
  it, and `attractionDiversityBudgetFractionOverride: 0` suppresses it independently of
  `repairBudgetFractionOverride`. `scripts/solver-parallel-unit-tests.mjs` (the raced engine's own
  suite) gained 3 matching tests, plus an assertion on the existing "returns a solution" test that
  the phase never engages when phase 1 already solves.
- **Raced engine** (`scripts/solver-parallel/race.mjs`): added a third, single-queue phase, run
  strictly after the existing repair+main dual-queue phase resolves (not reserved-and-concurrent
  from the start the way repair is — see the module comment's reasoning: repair is a known, common,
  feature-gated win from t=0; this last-resort phase only matters once everything else has already
  failed, so reserving workers for it up front would only dilute the common case). Reuses the same
  persistent worker slots (no extra spawn cost). Requires materializing the ablation override as a
  **plain, fully-populated object** (`scripts/ablation-config.mjs`'s `defaultConfig()` as the base) —
  a `Proxy` (orchestration.ts's own approach) can't cross the worker `postMessage` boundary, since
  structured clone drops it. Verified: the existing 9-test `solver-parallel-unit-tests.mjs` suite
  still passes unmodified (including its pre-existing "genuinely unsolvable" case, which turned out
  to be parity-filtered to zero active gates and so never reaches either phase — not a useful test
  of this specifically, hence the new dedicated tests above); a real end-to-end smoke run against
  `data/stress/stress-levels-random.json` (R00440 stays unsolved through both phases as expected;
  R02735 was rescued by the diversity phase in one run, by phase 1 alone in another — legitimate
  racing nondeterminism, both outcomes correctly reported).
- Found and fixed **two pre-existing attempt-serialization allowlists** that would have silently
  dropped the new `attractionDiversity` tag from on-disk reports: `scripts/stress/benchmark.mjs`'s
  `solveEntry` and `scripts/portfolio-solve-sweep-lib.mjs`'s `attemptRecord` (shared by
  `portfolio-solve-sweep.mjs`) each explicitly allowlist which `Attempt` fields survive to JSON —
  same pattern already used for `repair`/`repairMustTurnBiased`/`diverseBeam`, just missed for this
  new field until the smoke run's own output showed 0 diversity attempts despite the pass having
  visibly run (confirmed via `Solver.solve` directly in-memory first, to isolate the gap to
  serialization rather than the pass itself not running).

## Corpus-wide impact estimate (same day)

A seeded-random 30-level sample from the real `dfs-plain` cluster (`reports/stress/
unsolved-failure-clusters.json`, 843 levels total), solved once at baseline (main loop only,
`repairBudgetFractionOverride: 0, attractionDiversityBudgetFractionOverride: 0`) and once with the
pass enabled (`attractionDiversityBudgetFractionOverride: 1.0`), 10s nominal budget each:

**3/30 (10%) newly solved**: R02735, R02716, R02917.

Treating this as a rough corpus-wide rate estimate (important caveats below): applied to the full
`dfs-plain` cluster (843 levels) that's on the order of **~80 additional solves**; the mechanism is
untested against `repair-close`/`repair-far` (621 levels combined) since the diagnosis it's built on
was derived entirely from non-repair-gated levels, so no estimate is offered for that population.

**Caveats on treating 10% as a stable rate**:
- n=30 is a first-pass sample, not a powered estimate — a 95%-ish confidence band on 3/30 is wide
  (roughly 2%–27%), so "~80" should be read as "same order of magnitude as a few dozen to ~100," not
  a precise figure.
- Only one candidate flag (`SCORE_GOAL_ATTRACTION`) is wired in; the diagnosis found 4 total, so
  this is very plausibly a floor, not a ceiling, on what the *mechanism* (widened) could eventually
  reach — but widening is explicitly unexplored (see below).
- The sample draws from `dfs-plain` levels' own original orientation/structure, not from Phase B's
  denser variant sets — a different, arguably more representative population than Phase C's
  120/477 variant-solve-rate figure, and the two shouldn't be conflated.

## Historical follow-ups — resolved

These were the open questions at implementation time. The larger independent evaluation in
[`2026-07-17-attraction-diversity-fraction-and-flag-widening-evaluation.md`](2026-07-17-attraction-diversity-fraction-and-flag-widening-evaluation.md)
tested the budget increase and combined widening; neither justified a production change. The
remaining sequential shape was later closed on cost/evidence in
[`docs/future-work.md`](../docs/future-work.md#older-loose-thread-triage-2026-08-07): up to five
extra full passes are not worth buying without a cheap selector or isolation mechanism.

- Widening `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` to the other diagnosed culprits
  (`SCORE_OBJECTIVE_ATTRACTION`, `SCORE_INTERSECTION_SETUP`, `SCORE_SURROUND_URGENCY`,
  `SCORE_PERIMETER_BIAS`) would need either multiple sequential sub-passes (each its own budget
  slice) or a combined single pass with all candidates off at once. The combined shape was later
  measured; the sequential shape is deliberately closed under the disposition above.
- This session's verification covers a 30-level `dfs-plain` sample plus the 6 known-rescuable
  variants plus the published-corpus regression check — not a full stress-corpus-2 before/after
  sweep. The subsequent 100-level independent test was sufficient to reject the proposed constant
  changes; a full sweep is no longer a gate for the unchanged production behavior.

## Follow-up closure (same day): `portfolio-solve-sweep.mjs` cost-control flag

A post-implementation audit found `scripts/portfolio-solve-sweep.mjs` — the tool CLAUDE.md and this
doc name as the primary one for repeated corpus-2 iteration, and the one the
`.github/workflows/solver-corpus2-batch-*.yml` batch jobs use — had no way to disable the new pass:
it already supported `--repair-budget-fraction` (added earlier in this session) but never gained a
matching `--attraction-diversity-budget-fraction`, so every run would have silently inherited the
new pass's default 1.0x extra budget with no CLI-level opt-out, in direct tension with this
session's own solver-testing policy (extensions should default OFF for ordinary batch testing).

Fixed: `--attraction-diversity-budget-fraction=<n>` threads through all 4 execution paths the tool
supports (sequential plain, sequential + `--race-pool-size`, `--workers` plain, `--workers` +
`--race-pool-size`) — the latter three needed an explicit fix beyond just adding the flag, since
both `racePool.solveLevel()` call sites (in `portfolio-solve-sweep.mjs` itself and in
`portfolio-solve-sweep-worker.mjs`) hand-picked which `SolveOpts` fields to forward rather than
spreading the whole object, so adding a field to `solveOpts` alone wouldn't have reached them.
Verified via direct smoke runs against `data/stress/stress-levels-random.json` (R00440, the known
"robust" level) across all 4 paths — each correctly shows `attractionDiversity: true`-tagged
attempts in the JSON output when the flag is set, confirming the fix reaches every path, not just
the default one.

## Follow-up (2026-07-17): DFS's own nodesExpanded gap, a real nodeBudget bug, and the raced-engine determinism note

Three more items closed in a dedicated follow-up pass:

**1. DFS analog of the beam nodesExpanded instrumentation gap.** An audit of `dfsFromGate`
(`search.ts`) prompted by the earlier beam-search fix found the identical bug: its timeout exit
path set `out.nodesExpanded` but never incremented `prep._metrics.nodesExpanded`. More
consequential than the beam case — `dfsFromGateLDS`'s probe waves are specifically designed to
often hit their own bounded node/time budget, so a large fraction of real DFS attempts' reported
`nodesExpanded` were silently zeroed, not an edge case. The evidence originally cited for "DFS
looks fine" (plain-DFS attempts on the same level show hundreds of thousands of real nodes) turned
out to only ever have sampled *exhausted/solved* attempts, never *timed-out* ones specifically —
aggregate evidence about a function doesn't cover a bug conditional on one particular exit branch.
Confirmed via direct before/after comparison (`STRATEGY_LDS: false` bypasses the probe-wave ladder
down to one plain `dfsFromGate` call, avoiding wave-mixing noise): every `timedOut: true` trial
reported exactly 0 pre-fix, real nonzero counts post-fix. Fixed, verified (`solver:bench --check`
160/160, `adaptiveGateWeight`'s ≥4-gate risk surface re-confirmed moot), new regression test
alongside the beam one.

**2. A real bug in the attraction-diversity pass's own `nodeBudget` composition**, found while
writing a test for it (not found any other way — nothing in the original implementation's
verification exercised `opts.nodeBudget` at all). The pass computed a *remaining* node budget
(`nodeBudget - nodesExpanded so far`) and passed that into `runInterleavedAttempts`/
`runGateSerialAttempts` — copying the repair loop's own pattern a few lines above it. But those two
functions check `nodeBudget` directly against `prep._metrics.nodesExpanded`, the **global
cumulative** counter (exactly how the main loop's own call to them works, since `nodesExpanded` is
0 when the main loop runs first) — not a local-relative counter the way `repairSearchFromGate`'s
own `nodeBudget` param is. Passing a *remaining* value into a check that expects an *absolute* one
meant: on a synthetic level where the main loop spent 288 nodes and `nodeBudget` was 400 (112
nodes of real headroom left), the pass's own entry check became `288 >= 112` — true — silently
skipping the entire pass despite plenty of absolute budget remaining. Fixed by passing the same
absolute `nodeBudget` the main loop's own call already uses. Two new tests in
`orchestration.test.ts` cover both directions: a `nodeBudget` genuinely exhausted by the main loop
alone correctly suppresses the pass, and one with real headroom left lets it start (and, on a
single-gate level, run to full completion — `nodeBudget` is only checked once before a gate's inner
attempt loop, the same coarse granularity the main loop itself already has, consistent with
`SolveOpts.nodeBudget`'s own documented precision caveat).

**3. Raced-engine determinism note.** Added a comment to `race.mjs`'s phase-2 block noting that it
introduces a new source of the same class of nondeterminism already documented for phase 1 (see
the Determinism Report referenced elsewhere in the docs) — not just *when* a level solves, but
sometimes *which* mechanism gets credit for it. Confirmed directly during earlier verification: the
same real corpus-2 level (R02735) solved via a plain main-loop attempt in one raced run and via the
diversity pass in another, on identical input.

All three verified together: `tsc --noEmit` clean, `check:lint` clean, full `modules/solver` vitest
suite (189/189), `solver:bench --check` (160/160, no regressions).
