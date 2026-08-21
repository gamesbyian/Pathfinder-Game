# Turn-bias corpus-2 validation: net-negative on current defaults, stays opt-in (2026-08-07)

> **CORRECTED 2026-08-08 — the -7/1700 headline conclusion turned out right, for the wrong
> reason.** This report's nogood-cache-interaction hypothesis (below) is **falsified** —
> disabling the cache gave -8, not a recovery. Chasing an alternative explanation found a real,
> independent bug in `normalizeAblationConfig`: `enable_flags=STRATEGY_REPAIR_TURN_BIAS` was
> silently also running with `STRATEGY_REPAIR_ELITE_PREFIX_DFS` enabled (independently
> net-negative) the entire time this report's runs were dispatched. That bug is fixed. A clean
> re-run against the fix reproduced the exact same -7 result, byte-for-byte (same gained/lost
> level sets) — elite-prefix-dfs's accidental presence had flipped zero levels. **Turn bias's net
> -7/1700 against current defaults is confirmed via two independent, byte-identical
> measurements**; the "stays opt-in" disposition below stands, just not for the reason originally
> argued. Full writeup:
> [`reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md`](2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md).
> The nogood-cache section below is preserved verbatim as superseded (falsified) reasoning, per
> this repo's "superseded reasoning stays visible" convention.

## Context

`STRATEGY_REPAIR_TURN_BIAS` (append an experimental turn-aware selective-bias repair
attempt on must-turn levels) shipped opt-in pending a corpus-2 validation run. Two
`deterministic:true` GitHub Actions dispatches of `solver-stress-refresh.yml` with
`enable_flags=STRATEGY_REPAIR_TURN_BIAS` gave contradictory-looking results:

| Run | `main` commit | Corpus-2 solved | Net vs. baseline |
|---|---|---:|---:|
| #16/#17 (05:27–05:28 UTC) | `8ce42ba8` | 728/1700 | **+3** |
| #18 (19:26 UTC) | `38c092df` (this session's own branch, not `main`) | 718/1700 | **-7** |

The discrepancy traced to `main` moving between the two dispatches: this session's own
`STRATEGY_REPAIR_NOGOOD_CACHE` (shipped default-on, see
`reports/2026-08-07-repair-nogood-cache.md`) and `STRATEGY_REPAIR_ELITE_PREFIX_DFS`
(shipped opt-in) had merged to `main` via PR #1336 (`903dbc09`) at 19:24 UTC, just
before run #18 — which had also, separately, been dispatched against a branch ref
rather than `main`. Run #18's committed comparison baseline (`logs/stress-corpus2-baseline.json`,
"725") was last regenerated 2026-08-06T21:12:51Z, before either change existed, so its
churn report conflated turn bias's own effect with the nogood cache's unmeasured
full-corpus-2 effect.

## Clean matched pair

Two more `deterministic:true` runs, both dispatched against the same current `main`
commit (`0df7b22f`, post-merge):

| Run | `enable_flags` | Corpus-2 solved | vs. committed baseline (725) |
|---|---|---:|---|
| #19 | *(none)* | 725/1700 | **0 gained, 0 lost** — identical solved-ID set |
| #20 | `STRATEGY_REPAIR_TURN_BIAS` | 718/1700 | 5 gained, 12 lost, net **-7** |

Both 0/1802 deadline-truncated and 0/1802 clock-bound (ruling out wall-clock artifacts
in either run).

**Run #19 is the load-bearing result**: the nogood cache, at this workflow's current
36,000,000-node / non-binding-clock budget, produces **zero** solved-count change on
corpus-2 — not one flip either direction, on the full 1700-level corpus. This is
consistent with the mechanism's own design (skip already-proven-dead work, never add
competing search effort) and with the smaller 20-level sample's one flip (R02239) being
a budget-margin effect that a 36M-node ceiling has enough headroom to absorb without it
showing up as a net solved-count change at full scale.

Because run #19's solved-ID set is byte-identical to the stale committed baseline's,
run #20's own reported churn (`725 -> 718`) is — despite having been computed against
a technically-stale comparison file — actually a valid, clean, apples-to-apples measure
of turn bias's marginal effect on top of *current* defaults. **Turn bias's real
disposition, confirmed: net -7/1700 on corpus-2** (5 gained: R00306, R00500, R00632,
R02934, R03368; 12 lost: R01849, R01969, R02153, R02436, R02447, R02655, R02765,
R02862, R02875, R03196, R03211, R03350).

## The more interesting finding: turn bias behaves differently across the two baselines

Turn bias's net effect was **+3** against the pre-nogood-cache code (run #16/#17) and
**-7** against the current, nogood-cache-included code (run #20) — a 10-solve swing
from adding a mechanism that, alone, changes nothing. Turn bias doesn't introduce any
new randomness or seed dependency of its own between these two runs (both
`deterministic:true`), so the swing is attributable to the nogood cache's presence.

The nogood cache is a per-`repairSearchFromGate`-call cache, shared across every
restart within that call regardless of which attempt config is currently active. A
plausible mechanism (not yet confirmed by tracing): turn bias's biased `takePly`
narrows the distribution of moves a restart is likely to try from a given state, so
independent restarts under turn bias are more likely to converge on and repeat the
*same* states than unbiased restarts would. The nogood cache then short-circuits those
repeats more aggressively under turn bias than under the baseline policy, trading away
some of the "spend more nodes, eventually find an escape via a different random
continuation" recovery value that turn bias's narrower search depends on more than
baseline random-restart search does. This has the same shape as CLAUDE.md's documented
July 10 `evaluatePrunedMove` consolidation regression: a shared pruning mechanism,
correct and validated on its own, silently undermining a caller-specific technique that
depended on exploring cases the shared mechanism now short-circuits. Not confirmed via
instrumentation this session — flagged here as the leading hypothesis for anyone
picking this up, not a proven cause.

## Disposition

`STRATEGY_REPAIR_TURN_BIAS` **stays opt-in** (`ablation-config.mjs`'s existing
description already said "pending corpus-2 validation before becoming a default
attempt" — updated to record the negative verdict). Confirmed net-negative
(-7/1700) against the current real default configuration, not a wash and not a
measurement artifact.

## What's still open

- The nogood-cache/turn-bias interaction hypothesis above is untested. If turn bias is
  revisited, worth checking whether restricting the nogood cache to skip only on
  non-biased restarts (or keying it per-bias-policy) recovers turn bias's earlier
  standalone +3.
- No other opt-in repair mechanism (`STRATEGY_REPAIR_ELITE_PREFIX_DFS`) has been
  checked for the same interaction against the now-default nogood cache at full
  corpus-2 scale — its own validation (`reports/2026-08-07-repair-elite-prefix-dfs.md`)
  predates the nogood cache's existence entirely.
