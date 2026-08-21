Plan: Fast Portfolio Scheduler Experiment

> **Status:** the experiment described below ran to completion. Verdict: **not production-ready**
> — every measured variant was slower than the legacy scheduler on the published corpus, even
> where it retained full solvability. See
> [`../reports/portfolio/portfolio-scheduler-decision.md`](../reports/portfolio/portfolio-scheduler-decision.md)
> for the full evidence and [`solver-architecture.md`](solver-architecture.md)'s "Fast portfolio
> scheduler experiment" section for the current-state summary. `schedulerMode: 'portfolio-experiment'`
> still exists in `modules/solver/orchestration.ts` as opt-in, offline-only CLI tooling — this
> document remains the design record for its non-negotiable definitions and phased build, kept in
> case of a future re-attempt rather than folded into the archive.
>
> **Related but distinct follow-up:** [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md)
> deliberately does **not** revive this broad fast-portfolio hypothesis. This experiment asked
> whether many techniques should receive earlier cold-start slices. The interoperability plan asks
> first whether techniques leave behind complementary typed artifacts, replayable candidates, or
> failure evidence that another technique can exploit. Any later failure-conditioned scheduling in
> that plan should therefore be read as evidence-driven cooperation under the canonical work budget,
> not as a reason to repeat the tier rotation measured negative here.

Purpose
Test one narrow hypothesis:

A broad fast portfolio can recover most solves before the existing ladder spends large budgets on individual attempts.

This is not a solver rewrite. It is an opt-in scheduler experiment placed in front of the existing ladder.

The historical published-corpus evidence motivating the experiment is:

156 successful attempts across 10 configurations.

Median winning-attempt time: 11 ms.

p90: 220 ms.

p95: 486 ms.

96.8% of wins within 1s.

98.7% of wins within 2s.

100% of wins within 5s.

Median winning attempt consumed only 0.6% of its allocated budget; p90 consumed 5.9%, p95 consumed 16.1%. 

The core observation is that winners usually reveal themselves early. The experiment should determine whether that retrospective timing pattern survives a live scheduler change.

Non-negotiable definitions
1. Scheduling unit
A portfolio attempt is:

one current AttemptConfig applied to one active gate.

So the unit is config × gate, not “configuration across all gates.”

This matters because “run every config for 1s” can secretly mean:

configs × gates × 1 second
If there are 20 configs and 4 gates, a nominal 1s pass can become 80 attempt-slices.

Reports must include both:

config-level totals, and

config-gate-level totals.

The existing attempt telemetry already records the gate key, profile, template, beam width, elapsed time, allocated budget, and nodes expanded, so this is a natural unit to preserve. 

2. Pass thresholds
Pass thresholds mean:

maximum uninterrupted runtime of an individual attempt-slice.

They do not mean cumulative time granted across restarts.

So if Pass 1 runs a config-gate attempt for 1s, and Pass 2 restarts the same config-gate attempt with a 2s cap, the report should describe that as:

1s probe + fresh 2s restarted probe
3s total wall/search time spent by scheduler
2s maximum uninterrupted attempt runtime
1s repeated prefix, if deterministic
Do not describe that as simply “2s total budget.”

This avoids ambiguity when interpreting “recovered within 2 seconds.”

3. Fallback budget
During validation:

Legacy fallback receives the full historical legacy budget after portfolio failure.

This intentionally means failed portfolio levels can cost:

portfolio time + full legacy time
That is acceptable for the experiment because it isolates solve retention. It answers:

Did the portfolio change solvability?

A later production scheduler may choose to share one total budget between portfolio and fallback, but that is not the validation experiment.

4. Legacy unchanged means behaviorally unchanged
“Do not touch the legacy ladder” should mean:

Legacy mode produces the same attempt ordering, budget allocation, results, and telemetry as before.

A small internal refactor is acceptable if needed to extract a single-attempt slice seam. Duplicating search code to avoid touching internals would be worse.

5. Duplicated nodes are estimates unless proven exact
If Pass 2 restarts an attempt already run in Pass 1, duplicated elapsed time is measurable. Duplicated nodes are not necessarily exact unless the search exposes stable node identities or resumable checkpoints.

Report:

repeated attempt elapsed time,

total nodes spent across restarts,

repeated-prefix node upper bound,

estimated duplicated nodes, clearly labelled as estimated.

Do not make exact duplicated-node accounting an acceptance blocker.

Existing telemetry requirements
The current code already has most of the required raw material.

Per-attempt telemetry includes:

gateKey,

profile,

template,

beamWidth,

ok,

elapsedMs,

allocatedBudgetMs,

nodesExpanded. 

runAttempt() records the attempt-local elapsed time, the allocated attempt budget, and the node delta for that attempt. 

Normal solve provenance should continue storing winning-attempt cost separately from cumulative solve cost. The current provenance bridge extracts the winner’s elapsedMs, nodesExpanded, and allocatedBudgetMs, then stores cumulative nodesExpanded, totalMs, and outer budget separately. 

That invariant must not regress.

Experiment configuration
Static tier definitions should live in data/config, not scattered solver policy conditionals.

Use something shaped like:

const PORTFOLIO_EXPERIMENT = {
  pass1Ms: 1000,
  pass2Ms: 2000,
  pass3Ms: 5000,

  pass2Configs: new Set([
    "beam:intersectionHarvest@beam5000(diverse)",
    "dfs:perimeterSweep/perimeterCW",
    "beam:perimeterSweep/perimeterCW@beam2000",
  ]),

  pass3Configs: new Set([
    "beam:objectiveFirst@beam5000",
    "beam:perimeterSweep/perimeterCW@beam2000",
  ]),
};
Better: allow the CLI/report runner to supply this experiment definition so threshold sweeps can be tested without editing solver code:

250ms / 1s / 3s,

500ms / 2s / 5s,

1s / 2s / 5s.

The initial tiers are based on the published-corpus timing distribution:

dfs:perimeterSweep/cornerHarvest: 89 wins, p95 158 ms, 0% after 2s. 

dfs:nearClosureRescue: 46 wins, p95 46 ms, max 434 ms, 0% after 1s. 

beam:intersectionHarvest@beam5000(diverse): 2 wins, max 1641 ms, 0% after 2s. 

dfs:perimeterSweep/perimeterCW: 3 wins, max 1183 ms, 0% after 2s. 

beam:perimeterSweep/perimeterCW@beam2000: 3 wins, one after 2s, max 2209 ms. 

beam:objectiveFirst@beam5000: 1 win, after 2s, max 2569 ms, still within 5s. 

Important wording:

Historical timing predicts an upper-bound expectation of roughly 154 / 156 recoverable within uninterrupted 2-second attempt caps, subject to scheduler-context effects.

Do not present 154 / 156 as a replay guarantee.

Implementation sequence
Phase 0: Historical replay simulation
Before changing runtime behavior, use existing logs/reports to simulate cap policies offline.

Simulate:

first historical successful attempt under 250 ms,

under 500 ms,

under 1s,

under 2s,

under 5s,

1s-all / 2s-selected / 5s-specialist.

This gives a retrospective ceiling and helps choose the first live experiment. It does not model scheduler-context effects.

Phase 0 invariant
Complete when there is one offline replay report showing expected solve recovery by cap policy, using already-recorded winning-attempt elapsed times.

Phase 1: Extract behavior-preserving single-attempt slice seam
Create a reusable internal function for:

run this AttemptConfig against this active gate with this explicit cap
This should be a refactor around the current runAttempt() behavior, not a duplicate implementation.

The seam must preserve existing legacy behavior.

Phase 1 invariant
Complete when:

legacy mode produces the same attempt ordering, budgets, results, and telemetry as before;

a single config-gate attempt can be run with an explicit attempt-local cap;

the cap is not implemented by shrinking the solver’s outer total budget.

Phase 2: Add opt-in portfolio experiment mode
Add a feature-flagged mode, for example:

schedulerMode: "legacy" | "portfolio-experiment"
Default remains legacy.

In experiment mode:

Prepare the level once where possible.

Run Pass 1.

If unsolved, run Pass 2.

If unsolved, run Pass 3.

If still unsolved, invoke fresh full-budget legacy fallback.

Phase 2 invariant
Complete when:

existing callers still get legacy behavior by default;

portfolio mode is opt-in;

fallback receives the full historical budget;

portfolio failure cannot reduce legacy fallback solvability.

Phase 3: Implement static tier execution
Use the experiment configuration.

Initial live experiment:

Pass 1:
  every applicable config-gate attempt, 1000 ms uninterrupted cap

Pass 2:
  selected moderate-tail config-gate attempts, 2000 ms uninterrupted cap

Pass 3:
  selected specialist config-gate attempts, 5000 ms uninterrupted cap

Fallback:
  unchanged full-budget legacy ladder
If attempts restart between passes, mark them as restarts and record repeated work estimates.

Phase 3 invariant
Complete when every portfolio attempt records:

pass number,

config key,

gate key,

allocated uninterrupted cap,

elapsed time,

nodes expanded,

result,

timeout/termination,

restart vs fresh status.

Phase 4: Add comparison report
Produce one report comparing:

legacy baseline
vs
portfolio experiment + full-budget fallback
Minimum required fields:

Solve retention
legacy solved count,

portfolio-before-fallback solved count,

portfolio+fallback solved count,

fallback-only solved count,

unsolved count.

Pass distribution
solved in Pass 1,

solved in Pass 2,

solved in Pass 3,

solved only by fallback.

Runtime breakdown
Separate:

level preparation time,

attempt search time,

scheduler/orchestration overhead,

fallback search time,

total runtime.

This matters because with median winning attempts around 11 ms, prep and orchestration overhead can become significant. 

Restart duplication
Report:

repeated attempt elapsed time,

total nodes across restarted attempts,

estimated duplicated nodes / repeated-prefix upper bound,

repeated work by config and config-gate.

Late and fallback-only wins
For fallback-only or late wins, report:

config key,

gate key,

level feature summary,

pass attempts already tried,

fallback winning attempt elapsed time,

fallback cumulative elapsed time.

Phase 4 invariant
Complete when the report can answer:

Did the portfolio recover the same solves, faster, and where did it fail?

without reading raw logs.

Phase 5: Run published corpus
Run:

legacy baseline,

portfolio experiment with full-budget fallback.

Expected but not guaranteed:

Pass 1 should recover most solves.

Pass 1 + Pass 2 should approach the historical 98.7% within 2s ceiling. 

Pass 1 + Pass 2 + Pass 3 should approach the historical 100% within 5s ceiling. 

fallback-only wins should be rare or zero.

Phase 5 invariant
Complete when:

portfolio+fallback solve count matches legacy solve count, or every mismatch is explained;

pass distribution is known;

runtime saved and overhead are known;

fallback-only wins are listed.

Phase 6: Run stress corpora
Repeat the same comparison on stress corpora.

This is where the experiment becomes credible. The published corpus may be optimistic or historically entangled with solver development.

Phase 6 invariant
Complete when:

portfolio+fallback retention is known on stress corpora;

fallback-only wins are categorized by config and level features;

any heavier late-tail configurations are identified;

no specialist behavior has been removed or weakened.

Phase 7: Decide next step
Based on published + stress reports, choose one:

Option A: Keep simple tiers
If fallback-only wins are rare and duplicated work is low, keep the static tier scheduler and tune thresholds.

Option B: Adjust tier config
If fallback-only wins cluster in specific configs or features, promote those configs/features into Pass 2 or Pass 3.

Option C: Add continuation
If restart duplication is large enough to erase the benefit, consider resumable search state for selected configs.

Option D: Stop
If portfolio overhead is high, solve retention is poor, or fallback-only wins are diverse and common, stop and keep legacy default.

Phase 7 invariant
Complete when the next action is justified by measured:

solve retention,

pass distribution,

runtime,

fallback-only wins,

late-win configs,

repeated work.

Minimal first milestone
The best first milestone is:

Add a behavior-preserving single-attempt slice API, run a feature-flagged 1s-all / 2s-selected / 5s-specialist portfolio ahead of a fresh full-budget legacy fallback, and emit one comparison report for the published corpus.

That is the smallest useful experiment.

It answers the central question without building the eventual production scheduler.

Final acceptance criteria
The experiment is acceptable if:

Legacy mode is behaviorally unchanged.

Portfolio mode is opt-in.

Portfolio attempts are true config × gate attempt slices.

Pass caps mean uninterrupted attempt runtime.

Fallback receives full legacy budget during validation.

Winning-attempt metrics and cumulative metrics remain separate.

Reports distinguish search time, prep time, scheduler overhead, and fallback time.

Duplicated nodes are labelled as estimates unless exact accounting exists.

Tier definitions live in experiment configuration.

Published and stress corpus reports show solve retention, runtime, pass distribution, fallback-only wins, and late-winning configurations.