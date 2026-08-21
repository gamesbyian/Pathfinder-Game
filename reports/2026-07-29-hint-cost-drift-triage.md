# Triaging `hint-cost-drift.mjs`'s 153 drifted entries: a real bug found, no code regression found (2026-07-29)

## What this is

The first thing on the priority list from this session's "what should solver work focus on next"
discussion: someone should actually read the drift entries `hint-cost-drift.mjs` surfaces, since
that signal has existed since earlier this session and nobody had triaged it. This is that triage.

**Outcome**: found and fixed a real bug in the drift tool itself (a budget-bucketing collision that
misattributed 59 of 153 drifted groups, 38.6%, to a single outlier commit). After the fix, the
remaining drift is dominated by genuine execution-time variance across different machines/times, not
solver-code changes. **No evidence of an actual cost regression was found in this pass.**

## Method

Ran `node scripts/stress/hint-cost-drift.mjs --by-commit --min-ratio=1.25` and inspected the
highest-ratio entries directly against their full provenance (raw `nodesExpanded`/`budgetMs`/
`attemptIndex`/`gateKey`, not just the tool's own summarized ratio), cross-referencing against `git
log` for the commits involved. This repo's shallow clone had to be unshallowed
(`git fetch --unshallow`) to resolve the older commit SHAs provenance referenced.

## Finding 1: a real bug — 38.6% of drift traced to one bucketing collision

`configKeyOf`'s budget matching bucketed `budgetMs` to the **nearest second** before grouping. That
bucket is coarse enough at sub-1.5-second allocations to silently merge genuinely different budgets:
554ms and 888ms (a 60% difference) both round to "1 second."

Tracing the highest-ratio entries (R03253 117.5x, R02175 104.8x, S00108 86.3x, R02752 66.1x, R02726
58.9x) found every one paired against commit **`42dfab1`** ("Trace R02248's persistent non-solves to
a scoring-term × orientation interaction") — a diagnostic/investigation commit whose provenance
entries carry categorically smaller allocated budgets than every other commit's on the same levels
(78ms–554ms, vs. 312ms–20,000ms elsewhere). No solver hot-path file (`scoring.ts`,
`prune-gauntlet.ts`, `lower-bounds.ts`, `search.ts`, `attempts.ts`, `orchestration.ts`) changed
between `42dfab1` and the commits it was being compared against — the "drift" was entirely explained
by a time-bounded DFS being given a materially different amount of wall-clock and, unsurprisingly,
exploring proportionally more or less of the tree before its own budget check fired.

**Quantified**: 59 of 153 drifted groups at the 1.25x threshold (38.6%) involved `42dfab1` as one of
the compared versions.

**Fix**: `configKeyOf` now buckets budget on a **multiplicative** (log-ratio, ~15% tolerance) basis
instead of additive nearest-second rounding — the same property ("was this attempt given materially
the same budget") needs relative tolerance at 78ms as much as at 20,000ms. Verified against the two
cases that motivated each version of the rule: `554` vs `888` (60% apart) now separate correctly;
`5862` vs `5872` (0.2% apart, the ordinary per-attempt jitter the *original* nearest-second fix was
built to tolerate) still merge correctly. Shipped as `scripts/stress/hint-cost-drift-lib.mjs`,
extracted from the CLI script so the bucketing logic is unit-testable without triggering a corpus
scan on import — 11 new tests in `hint-cost-drift-lib-node-test.mjs`, registered in `test:node`.

**Effect on the numbers**: 949→977 cross-commit comparisons available (the corrected bucket
recovers a few genuine matches the coarse one also missed), 153→148 drifted, and critically, the two
most extreme false positives (R03253, S00108) no longer appear in the drifted list at all.

## Finding 2: most of what's left is measurement noise, not code drift

Even after the fix, 148 groups still show a difference. Checking whether the compared entries even
have *different* nominal budgets (the only mechanism that could make a real difference explicable
without a code change):

> **111 of 148 drifted groups (75.0%) have their minimum- and maximum-cost entries at the exact
> same `budgetMs`** — not merely the same bucket, bit-for-bit identical.

Concretely, on R02175 (`dfs/objectiveFirst`, same accepted path, same `attemptIndex: 4`), six
provenance entries all carry `budgetMs: 888` and yet range from 16,004 to 1,013,319 nodes — a 63×
spread with **zero** budget difference to explain it. Since these are DFS/beam attempts whose
internal termination is itself wall-clock-gated (not purely node-count-gated), the same nominal
allocation genuinely buys a different amount of real search under CPU contention — this repo already
flags `elapsedMs`/timing as untrustworthy under contention for exactly this reason
(`timingTrustworthy: false` on every parallel benchmark report), and it's the same phenomenon
independently confirmed on the published corpus this session: three levels (P00125/P00131/P00140)
span ~1.6–1.8x in `nodesExpanded` across repeat runs of the *same commit* on *one machine*
(see `docs/testing.md`). R02175's 63x spread is the same effect at a larger magnitude, likely because
its provenance entries span many different machines/times (local dev, CI runners, high-budget sweep
shards) rather than four consecutive runs on one host.

## Conclusion

No entry examined in this triage indicates an actual solver-code cost regression. The signal was
dominated by two artifacts: a tool bug (fixed) and inherent execution-time noise (a known, documented
property of this corpus, not new). This is a **negative result worth recording as such** — the
question "did anything recently get slower" was asked and answered "not detectably, from this data."

## What this means for the tool going forward

`hint-cost-drift.mjs` remains useful for its stated purpose (a retroactive, free cost signal
`solver:bench --check` can't provide), but this triage surfaces a real limitation: **a single-pair
comparison cannot distinguish a genuine regression from execution noise**, and on this evidence
noise is the dominant explanation for most drifted groups. A future improvement — not done here,
flagged for whoever picks this back up — would require **multiple independent samples per
(level, config) at each commit** before treating a large ratio as signal (analogous to what
`classify-stability.mjs` already does for solved/unsolved flakiness, applied to cost instead of
outcome). Until then, treat any single drift row exactly as the tool's own doc comment already
says: a lead, not a verdict — and per this report, usually not even that.

## Verification

Read-only investigation and a scoped bug fix; no solver code touched.
`node scripts/stress/hint-cost-drift-lib-node-test.mjs`: 11/11 pass, including regression coverage
for both the collision case (554ms/888ms, 78ms/20000ms, 312ms/8000ms) and the jitter-tolerance case
(5862ms/5872ms, 312ms/320ms) the original fix was built to preserve. `check:lint` and
`check:dead-scripts` pass. The pre/post comparison (949→977 comparisons, 153→148 drifted, R03253 and
S00108 dropping out of the drifted list entirely) was verified by running
`hint-cost-drift.mjs --min-ratio=1.25 --by-commit` before and after the fix and diffing the two
outputs directly.
