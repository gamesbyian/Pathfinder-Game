# Elite-prefix DFS repair: a new operator, sound and mechanistically real, net-negative at default constants — shipped opt-in (2026-08-07)

## Context

`reports/2026-07-22-repair-stagnation-investigation-synthesis.md` diagnosed repair-search's
stagnation wall precisely: the search is append-only (extends a spliced prefix, never edits it),
and a stuck plateau's terminal residual needs prefix-level restructuring no bounded operator
reaching only the current restart's own tip can supply. Its recommendation: "breaking it would
need a fundamentally different capability... a much larger undertaking than this plan's scope,"
explicitly ruling out *more* bounded local completion operators for the terminal residual as a
non-starter.

`closeLengthGap` (shipped earlier) already proves the underlying *technique* — bounded,
deterministic, score-ordered backtracking DFS from a fixed point — is real and working, not just
theory. Its own follow-up report found its scope too narrow: restricted to exactly one point (the
current restart's own dead end), "the reachable neighborhood from a single restart's own
trajectory just rarely contains a rescue" (R02655: 6,727 triggers, 0 solves).

This generalizes the same proven technique to multiple points scattered across the top elite
near-misses — not a repeat of what the synthesis ruled out (which was about widening
closeLengthGap's own single-point scope), but the "genuinely different reversible prefix edits"
category it named as the real, if bigger, lever.

## What was built

`modules/solver/repair-search.ts`:
- `boundedDfsFromHere`: the same deterministic backtracking-DFS core as `closeLengthGap`'s tail
  loop, but starting completely fresh from wherever the caller has already positioned `ws` (no
  reconstruction of an existing suffix) — because every caller here starts from a genuinely new
  position (an elite's own earlier prefix), not the current restart's own history.
- `elitePrefixDfsRepair`: for the top 3 elites and 4 fractional depths each (0.5, 0.65, 0.8, 0.9 —
  back-half-and-later only, since an earlier destroy point leaves a residual close to the size of
  the *original* problem, which fresh-from-gate DFS already fails at), replays to that prefix and
  runs `boundedDfsFromHere` from there. Triggered on the same stagnation signal as path relinking
  (`STAGNATION_THRESHOLD`).
- Both feed their best-found (lowest-`computeBadness`) intermediate back into the elite pool on
  failure, mirroring `relinkPaths`' own "best recombined intermediate becomes new search material"
  pattern — an earlier version of this operator didn't do this and discarded every failed attempt's
  partial progress; adding it is directly confirmed working (see below).

**Soundness**: identical argument to every operator in this file — every move goes through
`applyMove`/`evaluatePrunedMove`/`isSolutionState`, so a returned path is solution-valid by
construction regardless of which points were tried. `tsc --noEmit` clean; existing
`repair-search.test.ts`/`attempt-dispatch.test.ts`/`orchestration.test.ts`/`attempts.test.ts`
(81 tests) pass unchanged; `solver:bench --check` 160/160, no regressions, published-corpus
`nodesExpanded` byte-identical to pre-change (51,959,664) — the mechanism never fires on the
published corpus (none of it stagnates for 6000 restarts within its budget), as expected.

## The feedback loop is real, not just plausible

Debug-traced (`PF_ELITE_PREFIX_DFS_DEBUG=1`) against 4 known repair-close levels at a realistic
15M-node budget: the mechanism fires repeatedly per level (consistent with the documented "stays
frozen for many further bursts" pattern), and for one gate, the elite pool's best badness
genuinely improved from 4 to 3, with the operator's own reported `bestFound` value matching the
pool's new best exactly — a real, attributable improvement caused by this specific mechanism's
feedback loop, not incidental to some other repair activity.

## The population-level test: net-negative

20-level A/B against the full repair-close + repair-far closest-miss set (`R00440`, `R01397`,
`R01698`, `R01860`, `R02003`, `R02022`, `R02088`, `R02123`, `R02220`, `R02239`, `R00342`, `R00786`,
`R00877`, `R00886`, `R00893`, `R01341`, `R02106`, `R02118`, `R02137`, `R02275` —
`reports/stress/unsolved-failure-clusters.json`'s own closest-misses lists), each level's real
`getAttemptConfigs()`-selected repair config, 15,000,000-node budget, 300s non-binding wall clock:

| | ON (mechanism enabled) | OFF (disabled) |
|---|---:|---:|
| Solved | 4/20 | **5/20** |
| Total nodesExpanded | 263,446,742 | 257,047,557 |

**One confirmed displacement**: R02239 solves at 14,194,203 nodes with the mechanism off, but
exhausts the full 15,000,000-node budget without solving when it's on. Because `runAttempt` on both
arms uses the identical seed (repair is deterministic given a fixed `(startKey, seedSalt)`), this
isn't sampling noise — it's the operator's own node consumption measurably starving the ordinary
repair process of budget it needed to reach its own (real, reproducible) solution.

This is the same "scarce shared node budget, zero-sum reallocation" dynamic
`reports/2026-07-23-turnbias-corpus2-ab-validation.md` diagnosed for turn bias's own initial
rollout: a mechanism can be sound, fire constantly, and demonstrably improve intermediate state
quality, while still trading away roughly as many solves as it adds once it's competing with the
rest of repair's technique ladder for the same fixed budget.

## Disposition: shipped, but opt-in-only (not default-on)

Unlike this session's earlier reachability-check/dedup-granularity experiments (sound but
essentially zero-effect, reverted entirely), this operator is sound, mechanistically confirmed
working, *and* has a real (if currently negative) effect on solve outcomes — reverting it outright
would throw away working, validated infrastructure over a constants problem, not a soundness or
concept problem. Gated behind `STRATEGY_REPAIR_ELITE_PREFIX_DFS`, opt-in-only
(`cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true`), mirroring `STRATEGY_REPAIR_TURN_BIAS`'s
own convention exactly rather than the standard default-on ablation pattern — production
(`null` cfg) is untouched, confirmed via the byte-identical published-corpus node count.

## What would need to change before reconsidering promotion

Directly following the turn-bias precedent's own resolution path:

1. **Smaller total/per-attempt budgets.** `ELITE_PREFIX_DFS_TOTAL_BUDGET` (90,000) and
   `ELITE_PREFIX_DFS_NODE_BUDGET_PER_ATTEMPT` (15,000) are unmeasured starting values, like every
   other constant introduced with this operator. R02239's displacement suggests the current budget
   is large enough to meaningfully compete with ordinary repair for the same fixed ceiling; a
   cheaper version might capture some of the confirmed badness-improvement value without the same
   displacement cost — untested.
2. **Fewer, better-targeted (elite, destroy-point) attempts** rather than a fixed grid of 3
   elites × 4 fractions (12 attempts) every trigger — e.g. only re-trying points whose prior
   attempts (across earlier triggers in the same restart-run) showed above-average depth reached,
   instead of always re-scanning the same fixed fractional grid.
3. **A real population-scale A/B** (the GitHub Actions `solver-stress-refresh.yml` with
   `enable_flags=STRATEGY_REPAIR_ELITE_PREFIX_DFS`, same tooling already used for turn bias) before
   any promotion decision — 20 levels is directionally informative but not the corpus-2-scale
   evidence CLAUDE.md's own bar requires, the same caveat every mechanism in this file's history
   has been held to.

`scripts/stress/elite-prefix-dfs-ab.mjs` (kept, not scratch-deleted) is the reusable tool for any
of the above — same node-budget-pinned, real-attempt-config methodology used here.
