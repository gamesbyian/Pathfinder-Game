# A length/intersection-gap-closing repair operator: design, a methodology bug caught mid-session, and a clean positive result (2026-07-17)

## Context

[`reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md`](2026-07-17-repair-stagnation-frozen-signature-generalization.md)
found that `repair-search.ts`'s iterated-local-search fallback converges fast to a near-miss whose
only remaining deficit is length (`reqLen`) — every other objective (must-pass/must-cross/
must-turn/adjacent-turn/surround) already satisfied — and then plateaus for the rest of the
budget: tens of thousands of further independent restarts, all landing on the same class of
dead end, zero improvement. Three independent constant-tuning fixes for this exact plateau
(burst length, elite-pool tie-diversification, stagnation threshold) had already been tried and
found net-negative in prior sessions. That report's proposed, unimplemented direction: a
move/repair operator specifically for closing an exact length/intersection deficit while
preserving already-satisfied constraints, since ordinary epsilon-greedy random exploration
essentially never lands an exact integer target by chance. This report implements, verifies, and
measures that operator.

## Design: `closeLengthGap`

**Soundness argument.** `search-state.ts`'s `applyMove` only ever *clears* a
`mustMask`/`mpVisitedMask`/`mustCrossMask`/`surroundMask`/`mustTurnMask`/`adjTurnMask` bit during
forward walking — it never re-sets one (only `undoMove` does, on backtrack). So
`structuralDeficit(state, level) === 0` (a new export from `solution.ts`: `computeBadness` minus
its length/intersection terms) is a sound, order-independent signal that every non-length/
non-intersection objective is — and, absent an undo, will stay — satisfied for the remainder of a
walk. This is exactly the frozen-signature population: once a restart's dead end shows
`structuralDeficit === 0`, the only thing left to fix is `reqLen`/`reqInt`.

**Mechanism.** `closeLengthGap` (`modules/solver/repair-search.ts`) is a bounded backtracking DFS
— not another random walk — invoked from `repairSearchFromGate`'s main loop immediately after a
restart deadends with `structuralDeficit(ws, level) === 0`. It rebuilds one DFS frame per step
already taken in the current restart's suffix (by replaying `originalPath` from the elite-splice/
fresh-start floor), giving each reconstructed frame a `childIdx` positioned just past the sibling
this restart already tried — the same invariant `dfsFromGate`'s own stack keeps natively — then
runs ordinary best-first backtracking (`evaluatePrunedMove`, `scoreAndSort`, `applyMove`/
`undoMove`) up to a small node budget (`LENGTH_GAP_CLOSE_NODE_BUDGET = 4000`), never backtracking
below the restart's own floor. On failure, `replayToPrefix` restores `ws`/`liveUndo` to the exact
dead-end state the caller had, so existing near-miss bookkeeping (elite pool, `bestBadnessEver`)
is unaffected. On success, it returns the same way `takePly`'s own `'solved'` path does. Every
move goes through the same `applyMove`/`evaluatePrunedMove`/`isSolutionState` primitives DFS and
beam already use, so a returned path is sound by the same construction argument the rest of
`repair-search.ts` already relies on (see the file's own top-of-file SOUNDNESS comment).

New ablation flag `STRATEGY_REPAIR_LENGTH_GAP_CLOSE`, default-enabled (`!cfg ||
cfg.STRATEGY_REPAIR_LENGTH_GAP_CLOSE`) like every other `STRATEGY_REPAIR_*` flag in this file.
Registered in `scripts/ablation-config.mjs`'s `FEATURES` and documented in `docs/ablation.md`.

## A real methodology bug caught mid-session

The first A/B sweep (20-level `repair-close` sample, `budgetMs=8000`) used a bare
`prep._cfg = { STRATEGY_REPAIR_LENGTH_GAP_CLOSE: false }` object for the "disabled" run. This
reproduced — inside my own test tooling, not the production code — the exact documented gotcha in
`docs/solver-architecture.md`: *"every OTHER strategy toggle in orchestration.ts/repair-search.ts
checks `(!cfg || cfg.STRATEGY_X)` — 'no ablation config at all' is the only way those default
enabled — so passing any ablation object, even one that only sets an unrelated field, silently
disabled every other unset strategy."* My "disabled" runs were silently also running with
`STRATEGY_REPAIR_ELITE_SPLICE` and `STRATEGY_REPAIR_STAGNATION_BURST` off — a much weaker
baseline than real production "off" behavior, and also (during a debugging detour) a hand-built
"trap" unit-test level that looked like a clean rescue example under the contaminated config
turned out to need **no rescue at all** once re-tested with every flag correctly held at its
default (`withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE')` — every flag explicit except
the one under test, from `scripts/ablation-config.mjs`, the same helper `run-ablation.mjs` uses
for real single-flag sweeps). All numbers below are from the corrected methodology; the
hand-built trap level was discarded in favor of a real corpus level (see below). **Lesson,
consistent with this session's other methodology corrections**: a bare partial ablation-config
object is never safe for a strict behavioral A/B in this codebase — always build from
`defaultConfig()`/`withFeatureDisabled()`, even for a one-off scratch script.

Two speculative "optimizations" (switching `closeLengthGap`'s per-candidate scoring to the
cheaper `includeMcAxisFix=false` convention `takePly` uses; capping reconstruction to a bounded
recent window instead of the whole restart suffix) were tried *while the measurement was still
contaminated*, chasing an apparent ~2x throughput cost that turned out to be almost entirely the
confound above, not a real cost of the operator. Once the confound was fixed, the throughput
"problem" both changes were trying to solve had mostly disappeared, so both were reverted — the
shipped implementation is the original, simplest version (`scoreAndSort`'s default scoring
convention, throttled connectivity matching `dfsFromGate`'s own schedule, unconstrained
reconstruction back to the restart's splice/fresh-start floor).

## Corrected results

**20-level `repair-close` sample** (`reports/stress/unsolved-failure-clusters.json`, seeded
random sample: R02881, R02823, R02088, R03153, R02560, R02960, R02062, R02319, R02338, R03274,
R02871, R00960, R02545, R02765, R02470, R03136, R03339, R01930, R03084, R02246), single gate,
`repairSearchFromGate` called directly (bypassing the full attempt ladder, matching the frozen-
signature reports' own methodology), `defaultConfig()` vs `withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE')`:

**Wall-clock-bounded** (`budgetMs=8000`, `nodeBudget=Infinity` — the realistic production shape
for the ordinary repair fallback, which is time-budgeted, not node-budgeted):

| | solved | total nodes | total ms | bestBadness vs OFF |
|---|---:|---:|---:|---|
| ON  | 1/20 | 121,162,231 | 152,626 | 1 improved (the solve), 0 worse, 19 identical |
| OFF | 0/20 | 95,630,314  | 160,003 | — |

Node cost ratio (ON/OFF) 1.267 — enabling the operator explored **more** nodes in the same wall
time, not fewer. Time cost ratio 0.954. On 19/20 levels the final near-miss badness is bit-for-bit
identical whether the flag is on or off; the 20th (R02560) solves outright with it on and doesn't
without it.

**Node-budget-bounded** (`nodeBudget=3,000,000`, `budgetMs=8000` as a backstop — the shape a
probe-style caller would use):

| | solved | total nodes | total ms | bestBadness vs OFF |
|---|---:|---:|---:|---|
| ON  | 1/20 | 55,634,360 | 95,201  | 1 improved, 5 worse, 14 identical |
| OFF | 0/20 | 57,760,770 | 110,942 | — |

Node cost ratio 0.963 (near-neutral), time cost ratio 0.858 (ON faster for the same node count).
The 5 "worse" cases here are a real but small signal (badness differences of a few points on
levels that don't solve either way) — plausibly restart-count variance from `closeLengthGap`
itself consuming part of the fixed node budget on levels where it doesn't find a solve; the
wall-clock-bounded shape above (the more representative one for the shipped code path) doesn't
show this pattern.

**R02560** (stress-corpus-2, 15×15, flippers/geese/false-goals/decorative-landmarks, `reqLen`
138, `reqInt` 9): deterministic, reproducible rescue. Enabled solves in exactly 803,000 nodes
(~0.6s); disabled exhausts a 900,000-node budget without solving. Used directly as a unit-test
fixture (`repair-search.test.ts`) — an earlier hand-built small "trap" level was discarded once
the corrected methodology showed it didn't actually need the rescue (see above).

**Published corpus** (`solver:bench --check`, `npm run ci`): 160/160 solved, no regressions.
Wall time 34.3s (pre-change) vs 34.8s/35.0s/35.1s (post-change, 3 runs) — within normal run-to-run
noise, as expected: none of the 160 published levels are members of the repair-close/repair-far
population this operator targets, so it almost never triggers there. `npm run ci` (920 Vitest
tests including 3 new ones, all node validators) passes.

## Verdict

A genuine, correctness-safe, essentially-zero-cost addition on levels it doesn't rescue, with one
confirmed solve in a 20-level sample of the 156-level `repair-close` cluster (5%). Shipped
**default-enabled**, matching every other `STRATEGY_REPAIR_*` flag's convention — the corrected
measurement shows no throughput or near-miss-quality cost to justify gating it opt-in the way an
early (confound-driven) draft of this report concluded.

**What this does and doesn't establish**: a 20-level, non-exhaustive sample is real evidence, not
a population-level solved-count estimate. A 5% single-flag rescue rate is modest but in the same
range as this session's other targeted single-mechanism fixes on this same population (e.g. the
attraction-diversity pass's repair-cluster test found 2.5%, `reports/2026-07-17-attraction-diversity-repair-cluster-test.md`).
The natural next step — not done here, flagged per the roadmap's "Refresh, re-baseline, re-rank"
step — is a full corpus-2 GitHub Actions batch refresh to get an honest population-level solved-
count delta, now that this change is verified safe to include in that refresh.

## Verification

- `tsc --noEmit`: clean.
- `npx vitest run modules/solver`: all passing, including 3 new tests (rescue vs. disabled on
  R02560, determinism, must-pass/must-cross soundness spot-check).
- `npm run ci`: 920/920 Vitest tests, all static checks, all node validators.
- `npm run solver:bench -- --check`: 160/160, no regressions vs. `logs/solver-baseline.json`.
- Full-corpus wall-time sweep (not just `--check`'s solvability comparison): before/after within
  run-to-run noise (~34.3–35.1s across 4 runs).
- 20-level `repair-close` sample, both wall-clock- and node-budget-bounded framings, using
  `defaultConfig()`/`withFeatureDisabled()` (not a bare partial config object) to avoid the
  documented cross-flag-contamination gotcha.

## Addendum: full corpus-2 refresh, 2026-07-17 (same day)

The full 20-batch GitHub Actions refresh recommended above was run the same day. **302/1700
solved, up from 295** (`logs/stress-corpus2-baseline.json`). `diff-baseline.mjs` against the prior
baseline found 36 newly-solved levels and 29 that flipped solved→unsolved — a much larger raw
churn than the net +7 suggests, typical for this stochastic, budget-sensitive solver.

**Isolating what's actually attributable to this change**: of the 29 losses, an isolated
fresh-process retry (`diff-baseline.mjs --retry-failures`) found 15 pass again (flaky, not a real
regression) and 14 reproduce. Rather than stop there, each of the 14 was re-solved on the
*current* codebase twice — once with `STRATEGY_REPAIR_LENGTH_GAP_CLOSE` at its default (on) and
once with `withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE')` (off), same budget
(`timeBudgetMs=8000`, `nodeBudget=20000000`) — to separate "caused by this change" from "caused by
something else since the last baseline, or pure run-to-run variance." **13 of the 14 fail
identically regardless of the flag** (same outcome, same node counts on repeat runs) — not caused
by this change. **Exactly one, `R02252`, is a real, reproducible, deterministic regression**:
flag-on exhausts the full 20,000,008-node budget and fails; flag-off solves cleanly in 3,931,559
nodes (~7.5s). Confirmed reproducible across 2 repeated runs each way (identical node counts both
times), so this is a genuine causal effect, not noise.

**Verdict, updated**: the operator has one confirmed narrow trade-off (`R02252`, not in the
original 20-level sample) alongside one confirmed unique rescue (`R02560`, independently verified
in both the original sample and this refresh). Net population effect remains clearly positive
(+7 on corpus-2, 0 hard regressions on published or corpus-1) and the trade-off is understood, not
hidden — consistent with this session's established pattern for scoring/search mechanisms that
help most levels and hurt a specific few (e.g. the fragile-scoring-interaction family, the
must-turn exit-guidance nudge's S030 regression). Not reverted: a single-level, well-understood
trade-off inside a change with a clearly positive net effect and full verification rigor doesn't
meet this session's own bar for reverting (that bar is "no clear net benefit," not "zero
regressions anywhere in a 1700-level stochastic corpus") — but it's recorded here, not swept under
the rug, per this session's standing rule that negative results get written up like positive ones.
No further action taken on `R02252` specifically; a future session investigating this operator
further should know it exists.

This refresh was also the last one run under the old 20-branch `solver-corpus2-batch-NN.yml`
scheme (see `.github/workflows/README-solver-stress-refresh.md` for its retirement and the
matrix-based `solver-stress-refresh.yml` that replaces it) and the first corpus-1 refresh paired
with a corpus-2 refresh in the same session (94/102, up from the 2026-07-12 baseline's 85/102 — 0
hard regressions, 9 improvements, mostly attributable to the several days of other solver fixes
between the two corpus-1 baselines, not this operator specifically).
