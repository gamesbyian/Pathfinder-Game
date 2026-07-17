# Repair-search stagnation-burst constant tuning: three fixes tested, all negative (2026-07-17)

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

## Addendum: `STAGNATION_THRESHOLD` tuning also tested, also negative

The remaining "untested" direction named above — trigger timing rather than burst content — was
tested the same day, same method: `STAGNATION_THRESHOLD` lowered 6000 → 1500 (bursts fire 4x more
often), same 12-level deterministic A/B.

| Level | badness @ 6000 (baseline) | badness @ 1500 | Δ |
|---|---:|---:|---:|
| R00440 | 21 | 19 | −2 (better) |
| R00548 | 2 | 3 | +1 (worse) |
| R01397 | 35 | 30 | −5 (better) |
| R01698 | 15 | 17 | +2 (worse) |
| R01860 | 2 | 4 | +2 (worse) |
| R02003 | 12 | 3 | **−9 (much better)** |
| R02088 | 5 | 6 | +1 (worse) |
| R02123 | 2 | 11 | **+9 (much worse)** |
| R02220 | 10 | 9 | −1 (better) |
| R02239 | 2 | 4 | +2 (worse) |
| R02279 | 19 | 16 | −3 (better) |
| R02344 | 2 | 16 | **+14 (much worse)** |

5/12 improved, 7/12 regressed. Average final badness: 10.58 → 11.50 (+8.7%, worse). High variance
in both directions (R02003 improves by 9, R02123/R02344 regress by 9-14) — the same
regression-sensitivity signature as the other two tests in this constant family, not a cleaner
result just because the lever is different. Reverted the same way
(`git checkout -- modules/solver/repair-search.ts`), verified clean.

**Three independent, individually well-motivated fixes for the same diagnosed plateau have now
failed empirically**: burst length, burst-time pool acceptance, and trigger threshold. This is
no longer "this constant family is regression-sensitive" as a caveat — it's the dominant finding.
Simple constant-tuning on this mechanism should be considered exhausted; a further attempt likely
needs to change *what a restart does*, not *when/how the existing bookkeeping reacts to
stagnation* (e.g., diagnosing what specific local structure repeatedly attracts fresh-from-gate
restarts on a plateaued level — the deeper "why does independent random restart keep landing in
the same badness range" question neither this nor the plateau report actually answered).

## What's left

The stagnation-plateau phenomenon itself remains real and undiagnosed-as-fixed (see the earlier
report). The one remaining named-but-untested direction is level-adaptive burst sizing (vs. one
uniform constant for every level regardless of size/mechanic count) — untested because it's a
qualitatively bigger change (a function of level features, not a single constant) than the three
now-falsified ones, all of which were single-constant/single-condition tweaks. Given this constant
family's now three-times-confirmed regression sensitivity, treat a negative result as the likely
outcome for any further constant-tuning attempt here, and verify on the full corpus (not just a
12-level deterministic sample) before considering a flag default change. The more promising next
step is probably the diagnostic question above (what state are fresh restarts converging to,
and why) rather than another blind constant sweep.

## Verification

Root-cause mechanism and implementation confirmed via direct code reading (`repair-search.ts`'s
existing burst/elite-pool bookkeeping). Regression confirmed via a controlled, seed-identical A/B
comparison (not just an aggregate before/after) — `R02344`'s regression is deterministic and
reproducible, not sampling noise. Full revert verified: `git status`/`git diff` clean,
`npx vitest run modules/solver` 196/196, `npm run solver:bench -- --check` untouched by revert
(pre-revert run already confirmed 160/160 with the change active, and the change is now gone).
