# Wall-clock budget and test-dependence audit — 2026-08-27

> **Status:** concluded-positive
> **Last evidence:** 2026-08-27 — repository-wide solver test/budget audit plus deterministic regression and research-harness hardening in PR #1539
> **Decision:** The recurring wall-clock confusion is real: correctness tests, research deadlines, elapsed telemetry, and runner timeouts had overlapping semantics. Replace real-time correctness assertions with controlled clocks, surface binding wall deadlines explicitly, and keep work as the decision-bearing research currency.
> **Remaining gate:** none for this audit scope; broader budget-model rationalization is tracked separately in the follow-up report/PR.
## Question

Repeated solver investigations have been confused by three different mechanisms that all surface as "time" or "timeout":

1. deterministic search/work budgets;
2. genuine outer wall-clock safety deadlines;
3. test-runner / workflow hang timeouts.

The current solver contract already says cross-technique allocation and decision-bearing research use canonical work, with wall time only as a non-binding outer deadline. This audit checked the live solver tests and the recent restart-vs-continuation / hint-discovery tooling for places where that contract was still violated or obscured.

## Findings and fixes

### 1. Two unit tests still depended on real elapsed milliseconds

`modules/solver/search.test.ts` used real 10 ms windows to exercise beam/DFS deadline exits. The comments recorded the failure history directly: an earlier 2 ms version became load-sensitive, the threshold was increased, and the beam test eventually needed repeated samples to survive CI contention.

`modules/solver/repair-search.test.ts` separately measured real elapsed time and asserted a 300 ms search returned within a tolerance.

Both are now deterministic correctness tests. They mock `Date.now()` so real search work occurs and then the exact deadline transition is forced. Runner load can no longer decide whether the assertion is exercised or passes.

### 2. Equal-work restart/continuation pilots could still be silently right-censored

`restart-continuation-population-pilot.mjs` recently exposed its formerly-hardcoded wall deadline because the new ~150M-work experiment could exceed the old 120 s assumption. Before this audit, however, the harness could only report "unsolved"; a slow arm stopped by wall time could therefore be consumed as if it had completed its prescribed work envelope.

`repairSearchFromGate` now reports the actual stop reason: `work-budget`, `node-budget`, or `wall-clock`. The restart/continuation harness propagates that as `stopReason` / `deadlineTruncated`, and it does not rescue a wall-truncated seed 0 by reallocating its missing work to seed 1.

The population pilot now:

- records `budgetMs`, split, badness band, offset, limit, and truncation status in its output;
- marks the report with `validEqualWorkComparison`;
- exits non-zero if any arm was wall-clock-truncated.

A binding deadline can therefore no longer silently produce decision-bearing "equal-work" evidence.

### 3. Hint tooling still used wall-clock names for work-based stopping

The full hint-ablation generator and resumable diversification session had already been migrated away from elapsed-time stopping, but retained `wallClockDeadlineMs` / `haltedByWallClock` terminology. In the full generator the ms-shaped input was immediately converted to work; in diversification the bound was already an absolute `workMeter.units` ceiling.

That naming made a deterministic work stop look like a real timing event.

The preferred API is now `workBudget` / `haltedByWorkBudget`. Existing `wallClockDeadlineMs` and `haltedByWallClock` surfaces remain as compatibility aliases so stored reports and older callers do not break. The workbench now calls the preferred work-budget API. Its legacy `--wall-ms` CLI name remains, but current documentation states that it is an ms-shaped work-budget input, not a live elapsed-time gate.

### 4. The expensive lower-bound proof is a different class of issue

The deadlock-soundness property in `lower-bounds.test.ts` is intrinsically expensive and can approach Vitest's 90 s hang timeout under contention. That timeout is not solver search evidence.

Current CI already handles it correctly: the exhaustive proof is split across two dedicated root-subtree jobs, while the ordinary deep-verification job skips that duplicate execution. No solver-budget change is warranted here. The durable testing rule is to isolate/partition deterministic proofs when runner contention threatens the test-runner timeout, rather than infer anything about solver capability from that timeout.

## Intentional remaining clock use

Real wall time remains legitimate for:

- outer latency/safety deadlines in production search;
- cooperative-yield scheduling;
- `elapsedMs` telemetry;
- implementation-speed benchmarks where wall time is the quantity being measured;
- Vitest / Actions hang protection.

Those uses should not determine allocation, search escalation, research equality, duplicate identity, or unit-test correctness.

## Durable rule

For solver tests and research:

- search extent / policy comparisons use work (or technique-local nodes where explicitly appropriate);
- deadline-path unit tests use a mocked clock;
- genuine wall deadlines must surface when they bind;
- test-runner timeout means "the proof did not finish on this runner", never "the level/search failed at budget";
- compatibility names that still contain "wall" must be documented as aliases when they no longer observe wall time.

## Production impact

No production attempt ordering, scoring, pruning, technique eligibility, scheduler policy, or work allocation was changed by this audit. The only solver-core behavioral addition is diagnostic stop-reason telemetry from repair search; normal successful/failed search trajectories are unchanged.
