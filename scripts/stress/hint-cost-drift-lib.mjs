/**
 * Pure helpers for scripts/stress/hint-cost-drift.mjs, split out so they're unit-testable without
 * triggering the CLI's own top-level corpus scan on import (that file executes its work eagerly at
 * module load, matching this repo's convention of keeping CLI drivers thin over a testable -lib.mjs
 * — see portfolio-solve-sweep-lib.mjs for the same split).
 */

/** The production attempt ladder's own techniques — see hint-cost-drift.mjs's doc comment. */
export const LADDER_TECHNIQUES = new Set(['dfs', 'beam', 'repair', 'admissible-order']);

export const techniqueFamily = (t) => String(t || 'unknown').split(':')[0];

/**
 * Multiplicative (not additive) budget bucket, ~15% tolerance per bucket.
 *
 * Nearest-second bucketing was tried first and found to silently collide two very different
 * allocations whenever both fell under ~1.5s: 554ms and 888ms (a 60% difference) both round to
 * "1 second" and were treated as the same config. This single collision, from one commit (an
 * ablation-diagnostic run with unusually small total budgets), was responsible for 59 of 153
 * drifted groups (38.6%) at the 1.25x threshold, several with ratios over 100x — a time-bounded
 * DFS given 60% more wall-clock genuinely explores much further before its own budget check fires,
 * so the "drift" was real in the sense that node counts differed, but spurious in the sense that
 * nothing about the solver changed; the caller just gave it a different amount of time.
 *
 * Grouping by log-ratio instead keeps the earlier fix (5862ms vs 5872ms, 0.2% apart, must still
 * match) while correctly separating budgets that differ by tens of percent regardless of their
 * absolute scale — the actual property "did this attempt get materially the same budget" needs, at
 * 78ms as much as at 20000ms. See reports/2026-07-29-hint-cost-drift-triage.md for the full
 * before/after measurement.
 */
const BUDGET_BUCKET_LOG_BASE = Math.log(1.15);
export const budgetBucket = (ms) => (ms > 0 ? Math.round(Math.log(ms) / BUDGET_BUCKET_LOG_BASE) : 0);

/** Everything a caller controls. A node-count difference is only attributable to the commit when
 *  every one of these matches. */
export const configKeyOf = (e) => [
    techniqueFamily(e.solver?.technique),
    e.solver?.scoringProfileId ?? e.solver?.profile ?? '-',
    e.solver?.orderingBiasId ?? e.solver?.template ?? '-',
    e.solver?.beamWidth ?? '-',
    (e.solver?.mechanicBucketRetention ?? e.solver?.diverseBeam) ? 'mechanic-buckets' : '-',
    budgetBucket(e.search?.budgetMs ?? 0),
].join('|');
