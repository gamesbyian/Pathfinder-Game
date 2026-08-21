# Elite-prefix DFS repair: a new operator, sound and mechanistically real, net-negative at default constants — shipped opt-in (2026-08-07)

> **CORRECTION (2026-08-19):** the "what would need to change" list below's item 3 (a dedicated
> retry mechanism giving this operator a fresh, uncontended budget) was built and tested —
> `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` (`modules/solver/orchestration.ts`), applying this
> session's "run dead last, additive-only budget" pattern (see
> `reports/2026-08-15-connectivity-axis-exhausted-regression.md`) directly to this mechanism: the
> ordinary repair fallback loop runs unaffected (flag off, its own protected budget), and only if
> that fails does a fresh, separate `repairSearchFromGate` call run with the flag on and its own
> additive node budget — structurally eliminating the exact R02239-shaped displacement this report
> diagnosed. Validated on this report's own 20-level closest-miss sample at TWO retry budgets
> (7.5M and the full 15M matching this report's own ON-arm scale): **zero recoveries at either
> budget** (`scripts/stress/elite-prefix-dfs-retry-validate.mjs`,
> `.github/workflows/solver-elite-prefix-dfs-retry-validate.yml`). Protected (flag-off) loop alone
> solved 5/20 — `R00342`, `R00877`, `R02022`, `R02220`, `R02239` — identical at both budgets; of
> the 15 that failed protected, none were rescued by a fresh independent retry pass either. This
> confirms the mechanism's real limitation was never budget competition (which the retry tier
> structurally removes) — it's that `elitePrefixDfsRepair` itself doesn't have enough power to
> close these particular gaps at these budgets, full stop. The badness-improvement feedback loop
> this report traced (4→3) is real, but real intermediate progress and an actual extra solve are
> different claims, and only the first was ever demonstrated. `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY`
> is kept in the codebase (opt-in, default-OFF, zero production risk, structurally sound) rather
> than reverted — same "sound infrastructure, no capability gain, not promoted" disposition this
> file's own original mechanism already carries — but is **NOT** a candidate for promotion or
> further investment without a materially different approach to the underlying operator itself
> (not just its budget accounting).

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

## Follow-up (2026-08-19): a dedicated retry tier, tested and negative

This investigation's own item 3 above was built directly: `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY`
(`modules/solver/orchestration.ts`), the fourth application this session of the "run dead last,
additive-only budget" pattern first validated on `STRATEGY_DEDUP_NEAR_TIE_RETRY`/`STRATEGY_
ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`/`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` (see
`reports/2026-08-15-connectivity-axis-exhausted-regression.md`). Unlike those three (which rerun
`mainConfigs` and disable a flag), this reruns `repairConfigs` via the same per-config/per-gate
loop shape as the ordinary repair fallback loop, and **enables** `STRATEGY_REPAIR_ELITE_PREFIX_DFS`
via a Proxy override — the opposite polarity, since the underlying mechanism is opt-in-off by
design. The ordinary repair fallback loop runs first, completely unaffected (flag off, its own
protected node budget) — exactly reproducing this report's own OFF arm — and only if that fails
does a fresh, separate `repairSearchFromGate` call run with the flag forced on and its own
additive node budget, stacked on `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`'s own ceiling from
the start (applying that tier's own "stack on the preceding tier" lesson without rediscovering it).
This structurally eliminates the R02239-shaped displacement above: the ordinary loop's budget is
never shared with or reduced by this tier.

**Validated on this report's own 20-level closest-miss sample, at TWO retry budgets** (via
`scripts/stress/elite-prefix-dfs-retry-validate.mjs`, run sharded across 10 parallel GHA jobs —
`.github/workflows/solver-elite-prefix-dfs-retry-validate.yml` — rather than sequentially, since a
naive single-job version took close to an hour locally for no wall-time benefit):

| retry node budget | protected (flag-off) solved | retry attempted | retry recovered |
|---|---:|---:|---:|
| 7,500,000 (0.5× the shipped `REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION`) | 5/20 | 15 | **0** |
| 15,000,000 (matching this report's own ON-arm scale exactly) | 5/20 | 15 | **0** |

Byte-identical protected-solved set at both budgets (`R00342`, `R00877`, `R02022`, `R02220`,
`R02239` — the same 5 this report's own OFF arm found), and **zero recoveries at either retry
budget**, including at the full 15M scale that matches this report's own ON arm exactly. Doubling
the retry budget changed nothing, which rules out "budget too small" as the explanation.

**What this establishes, precisely**: the mechanism's real limitation was never the shared-budget
displacement this report diagnosed — that was a genuine, real, but SEPARATE problem (real cost
imposed on levels that already solve elsewhere), now structurally fixed. The underlying question
this retry tier was built to answer — does `elitePrefixDfsRepair`, given a truly uncontested
budget, ever convert a hard-fail into a solve? — comes back negative on this sample. Re-reading
this report's own evidence with that in mind: the ON/OFF population test never actually showed a
positive recovery either (the elite pool's badness improving from 4 to 3, quoted above, is
intermediate progress, not a solve), so the retry tier's negative result is consistent with, not a
contradiction of, this report's own original findings — my initial hypothesis (that competing for
shared budget was masking a latent capability) was the part that turned out wrong.

**Disposition**: `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` is kept in the codebase — opt-in,
default-OFF, zero production risk (structurally a no-op for any caller that doesn't explicitly
enable it), and its own mechanism (the Proxy-override/additive-ceiling infrastructure) is sound
and directly reusable if a future, materially different repair operator needs the same "give it an
uncontested last-resort shot" treatment. It is **not** a promotion candidate and needs no further
population-scale investment in its current form — the blocker is the underlying `elitePrefixDfsRepair`
operator's own power at these budgets, not anything about how or when it runs. See
`reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Applying the pattern elsewhere"
family of sections for the three siblings that DID pan out, for comparison.
