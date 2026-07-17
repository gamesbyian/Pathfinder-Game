# Elite-pool diversification on stagnation burst — tested, found net-negative, reverted (2026-07-17)

## Context

The stagnation-plateau negative-result report
([`reports/2026-07-17-repair-search-stagnation-plateau-and-burst-length-negative-result.md`](2026-07-17-repair-search-stagnation-plateau-and-burst-length-negative-result.md))
found that raising `STAGNATION_BURST_LEN` alone was net-negative, but flagged one untested
direction as the more promising remaining lever: *"the data here suggests reverting to the same
stuck pool after the burst ends may be the real limiting factor, not burst duration itself."* This
report tests that hypothesis directly.

## The mechanism tested

`repairSearchFromGate` (`modules/solver/repair-search.ts`) maintains an 8-member elite pool of
best-but-distinct near-miss paths, spliced from on most restarts. When a stagnation burst triggers
(`STAGNATION_THRESHOLD` restarts with no improvement), the burst forces fresh-from-gate restarts
for `STAGNATION_BURST_LEN` iterations — but the pool-acceptance rule (`b < worst.badness`,
strictly better only) is unchanged during a burst. So a burst restart that lands on a genuinely
different structural path *tied* with the pool's current worst member gets rejected, and the pool
comes out of the burst byte-identical to how it went in whenever the burst fails to strictly beat
the existing floor — the exact scenario a plateau produces by definition.

**Implementation**: added `STRATEGY_REPAIR_BURST_DIVERSIFY_POOL` (new ablation flag, default
enabled to match every other `STRATEGY_REPAIR_*` flag's convention). During a burst restart only,
the acceptance condition additionally admits a tie (`b === worst.badness`), evicting the previous
worst and installing the new, structurally-distinct-but-equal-badness path in its place. Outside a
burst, behavior is byte-identical to before. `tsc --noEmit` clean, `npx vitest run modules/solver`
196/196, `npm run solver:bench -- --check` 160/160 (no published-corpus regression).

## Test

12 fresh `repair-close` levels (lowest-badness members of the corrected 156-level cluster from
[`reports/2026-07-17-failure-cluster-taxonomy-stale-after-probe-fix.md`](2026-07-17-failure-cluster-taxonomy-stale-after-probe-fix.md)),
solved twice each — once with the flag forced off (`withFeatureDisabled`, the pre-change
behavior) and once with production defaults (flag on) — at `budgetMs=8000`, `nodeBudget=3000000`
per attempt. Because `repairSearchFromGate`'s PRNG is seeded deterministically from `(startKey,
seedSalt)` alone, not from the ablation config, both runs on a given level start from the
*identical* random stream — any difference in outcome is caused by the flag, not run-to-run
noise. This makes it a clean controlled comparison despite the small sample and short budget (the
short budget was a deliberate scope-down after two background-execution failures in this
environment; it doesn't affect the causal cleanliness of the comparison, only how far into each
level's search either config got).

| Level | baseline badness | new (diversify) badness | Δ |
|---|---:|---:|---:|
| R00440 | 21 | 21 | 0 |
| R00548 | 2 | 2 | 0 |
| R01397 | 35 | 35 | 0 |
| R01698 | 15 | 15 | 0 |
| R01860 | 2 | 2 | 0 |
| R02003 | 12 | 12 | 0 |
| R02088 | 5 | 5 | 0 |
| R02123 | 2 | 2 | 0 |
| R02220 | 10 | 11 | **+1 (worse)** |
| R02239 | 2 | 2 | 0 |
| R02279 | 19 | 19 | 0 |
| R02344 | 2 | **20** | **+18 (much worse)** |

**0/12 improved, 2/12 regressed (one severely), 0/12 solved either way at this short budget.**
Average final badness: baseline 10.58, new 12.17 (+15%).

## Interpretation

Not a wash — a real, reproducible regression. `R02344` in particular: allowing a tied-badness
burst restart to evict the pool's current worst member cost it 18 points of badness deterministically,
on the exact same random stream. The mechanism is plausible in hindsight: accepting *any* tie
(not just a tie that's also structurally promising) can evict an elite that was actually a good
splice source for *later*, non-burst restarts, in favor of a fresh-burst path that just happened to
match badness by coincidence — diversity for its own sake isn't free when the pool is small
(`ELITE_POOL_SIZE = 8`) and eviction is permanent.

This corroborates the stagnation-plateau report's own closing caution almost exactly: this
constant family (`ELITE_POOL_SIZE`/`SPLICE_PROBABILITY`/`STAGNATION_THRESHOLD`/
`STAGNATION_BURST_LEN` and now this pool-acceptance rule) has already shown high regression
sensitivity to well-motivated-looking changes (the pre-session S030 episode, this session's own
burst-length test). **Two independent plausible-looking fixes for the same diagnosed plateau have
now both failed empirically** — raising burst length, and loosening pool acceptance during a
burst. Neither survives contact with real measurement.

## Reverted

`git checkout -- modules/solver/repair-search.ts scripts/ablation-config.mjs` — clean revert,
`git diff` empty against the pre-change commit, full solver test suite back to 196/196.

## What's left

The stagnation-plateau phenomenon itself remains real and undiagnosed-as-fixed (see the earlier
report). Untested directions still on the table: independently tuning `STAGNATION_THRESHOLD`
(trigger bursts sooner/later, orthogonal to what a burst does once triggered) and level-adaptive
burst sizing (vs. one uniform constant for every level regardless of size/mechanic count) — both
different levers from the two now-falsified ones. Given this constant family's now twice-confirmed
regression sensitivity, any future attempt here should budget for a negative result being the
likely outcome, and verify on the full corpus (not just a 12-level deterministic sample) before
considering a flag default change.

## Verification

Root-cause mechanism and implementation confirmed via direct code reading (`repair-search.ts`'s
existing burst/elite-pool bookkeeping). Regression confirmed via a controlled, seed-identical A/B
comparison (not just an aggregate before/after) — `R02344`'s regression is deterministic and
reproducible, not sampling noise. Full revert verified: `git status`/`git diff` clean,
`npx vitest run modules/solver` 196/196, `npm run solver:bench -- --check` untouched by revert
(pre-revert run already confirmed 160/160 with the change active, and the change is now gone).
