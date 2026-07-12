Plan: Fast Portfolio Scheduler Experiment
Goal
Treat this as a scheduler experiment, not a solver rewrite.

The goal is to test whether a broad, cheap portfolio pass can recover most solves before the existing solver ladder spends large budgets on individual attempts.

The existing ladder must remain available as an automatic fallback during rollout. The experiment should answer:

How many solves are recovered by a 1s broad pass?

How many additional solves are recovered by a 2s pass?

How many additional solves are recovered by selective 3–5s specialist slices?

How many solves are found only by the legacy ladder?

How much runtime is saved?

How much duplicated work is introduced by restart-based passes?

Which configurations produce late wins?

Whether the published-corpus result generalizes to stress corpora.

The implementation should be the smallest safe change that can answer those questions.

Supporting evidence discovered so far
The current evidence comes from the generated winning-attempt report over the published corpus.

The report contains 156 successful attempts across 10 configurations. Overall, the successful attempts were extremely fast:

median winning-attempt elapsed time: 11 ms

p90: 220 ms

p95: 486 ms

max: 2569 ms

fraction after 1s: 3.2%

fraction after 2s: 1.3%

fraction after 5s: 0%

fraction within 2s: 98.7%

fraction within 5s: 100%. 

Budget consumption was also tiny:

median winning attempt consumed 0.6% of its allocated budget

p90 consumed 5.9%

p95 consumed 16.1%

max consumed 82.8%. 

The dominant configurations were strongly “fast-or-never”:

dfs:perimeterSweep/cornerHarvest: 89 wins, median 11 ms, p90 62 ms, p95 158 ms, max 1116 ms, 0% after 2s, 100% within 2s. 

dfs:nearClosureRescue: 46 wins, median 6 ms, p90 36 ms, p95 46 ms, max 434 ms, 0% after 1s, 0% after 2s, 100% within 500 ms. 

Together, those two configurations account for 135 / 156 wins, or about 86.5% of published-corpus successful attempts.

The moderate-tail configurations still fit comfortably inside 2 seconds:

beam:intersectionHarvest@beam5000(diverse): 2 wins, median 1063.5 ms, max 1641 ms, 50% after 1s, 0% after 2s, 100% within 2s. 

dfs:perimeterSweep/perimeterCW: 3 wins, median 392 ms, max 1183 ms, 33.3% after 1s, 0% after 2s, 100% within 2s. 

The sparse specialist tail contained the only after-2s wins:

beam:objectiveFirst@beam5000: 1 win, elapsed 2569 ms, after 2s but within 5s. 

beam:perimeterSweep/perimeterCW@beam2000: 3 wins, median 472 ms, max 2209 ms, 33.3% after 2s, all within 5s. 

So the scheduling hypothesis is:

A broad 2-second portfolio sweep would have recovered 154 / 156 published-corpus wins, and a selective 3–5 second specialist slice would have recovered all 156 / 156.

This should be treated as a hypothesis to validate, especially on stress corpora.

Existing code state relevant to the plan
The current attempt telemetry already records elapsedMs, allocatedBudgetMs, and nodesExpanded per attempt. The Attempt interface includes elapsedMs, allocatedBudgetMs, and nodesExpanded, and runAttempt() records allocatedBudgetMs: attBudget plus a per-attempt node delta. 

Normal solve provenance has also been corrected to preserve both winning-attempt cost and cumulative solve cost. deriveSolveAttemptInfo() now extracts the winning attempt’s elapsedMs, nodesExpanded, and allocatedBudgetMs, while provenanceFromSolveResult() writes those to the primary search fields and stores whole-run totals separately as cumulative fields. 

Those two facts are important because the scheduler experiment must not regress provenance quality. Attempt-local metrics answer “how long did the winning configuration need once started?” Cumulative metrics answer “how long did the scheduler take to reach and complete the winner?”

Core design principles
1. This is a scheduler overlay
Do not rewrite solver techniques.

Do not remove the existing ladder.

Build an experimental scheduler path that runs before the existing ladder and falls back automatically if the fast portfolio does not solve the level.

2. Use true per-configuration slices
The fast passes must impose explicit caps on individual configurations.

Do not simulate a 1s or 2s probe by reducing the outer timeBudgetMs of the whole solver invocation. The current solver divides budget internally, so shrinking the outer budget changes the ladder’s internal allocation semantics.

The experiment needs a way to say:

Run configuration X for this gate/profile/template/beam setting with cap = 1000 ms.
without changing the full fallback ladder’s normal budget math.

3. Keep rollout safe
The experiment should initially be observationally safe:

Try fast portfolio.
If solved, return result.
If unsolved, invoke legacy ladder exactly as before.
Record whether fallback was needed.
No specialist behavior should be removed or weakened until fallback-only wins have been measured on both published and stress corpora.

4. Start simple
Do not build an ML scheduler yet.

Use evidence-backed static tiers:

Pass 1: broad 1s pass.

Pass 2: moderate-tail / plausible specialist 2s pass.

Pass 3: sparse specialist 3–5s pass.

Fallback: unchanged legacy ladder.

The thresholds are hypotheses, not permanent constants.

5. No level-ID-specific behavior
Any selection or escalation must use:

configuration identity,

configuration history,

current level features,

or generic applicability rules.

Do not special-case published level IDs, stress level IDs, or named level numbers.

Proposed tiering for the first experiment
Pass 1: broad fast portfolio, 1 second
Run every applicable configuration for up to 1000 ms.

Purpose:

Capture fast-or-never wins.

Measure how many solves are recovered before the legacy ladder spends large slices.

Establish the baseline value of a broad cheap sweep.

Expected published-corpus result, based on existing data:

Should recover approximately 96.8% of wins if “within 1s” reproduces historical behavior. The report’s overall fractionWithin1000ms is 0.968. 

Primary beneficiaries:

dfs:perimeterSweep/cornerHarvest

dfs:nearClosureRescue

dfs:portalFirstTransfer

other configs whose historical wins are sub-second.

Pass 1 invariant
Pass 1 is fully satisfied when:

Every applicable configuration selected for the experiment has been attempted with an explicit per-configuration cap of 1000 ms.

Each attempt record includes:

pass number,

full configuration key,

allocated slice,

elapsed time,

nodes expanded,

success/failure,

restart/continuation status.

The solver has not altered the legacy fallback ladder’s internal budget allocations.

No level-ID-specific rules are used.

Pass 2: moderate-tail pass, up to 2 seconds
Run or rerun selected moderate-tail and plausible specialist configurations with caps up to 2000 ms.

The simplest first implementation can restart these attempts. If it restarts, it must record duplicated work explicitly.

Candidate configs for Pass 2:

beam:intersectionHarvest@beam5000(diverse)

dfs:perimeterSweep/perimeterCW

beam:perimeterSweep/perimeterCW@beam2000

any other configuration with either:

historical p95 > 1000 ms,

historical after-1s win fraction > 0,

or feature-based applicability suggesting it is plausible.

Why this pass exists:

beam:intersectionHarvest@beam5000(diverse) had wins up to 1641 ms, with 50% after 1s but 0% after 2s. 

dfs:perimeterSweep/perimeterCW had wins up to 1183 ms, with 33.3% after 1s but 0% after 2s. 

Expected published-corpus result:

Pass 1 + Pass 2 should recover 154 / 156 known wins, matching the overall 98.7% within 2s result. 

Pass 2 invariant
Pass 2 is fully satisfied when:

Only configured moderate-tail/plausible specialist configs are given second-pass time.

Each second-pass attempt records whether it is:

a restart,

a continuation,

or a fresh configuration not run in Pass 1.

If restarted, the report computes duplicated work:

duplicated elapsed ms,

duplicated nodes expanded,

duplicated configuration count.

All Pass 2 slices are explicit per-configuration caps, not outer solver budget reductions.

The experiment can report “solved in Pass 2” separately from “solved in Pass 1.”

Pass 3: sparse specialist rescue, 3–5 seconds
Run a very small specialist list for 3000–5000 ms.

Initial candidates:

beam:objectiveFirst@beam5000

beam:perimeterSweep/perimeterCW@beam2000

Why:

beam:objectiveFirst@beam5000 produced one observed after-2s win at 2569 ms, within 5s. 

beam:perimeterSweep/perimeterCW@beam2000 produced one after-2s win, with max 2209 ms, also within 5s. 

This pass should be tiny and conservative. It exists to protect rare cases during rollout, not to reintroduce the whole expensive ladder under a different name.

Expected published-corpus result:

Pass 1 + Pass 2 + Pass 3 should recover 156 / 156 known wins, because all observed published-corpus wins landed within 5s. 

Pass 3 invariant
Pass 3 is fully satisfied when:

Only explicit specialist configurations receive 3–5s slices.

The specialist list is configuration-based and optionally feature-gated, never level-ID-gated.

Each Pass 3 solve is reported separately from Pass 1, Pass 2, and fallback.

The report identifies which specialist configuration produced each late win.

The legacy fallback still runs automatically for unsolved levels.

Fallback: unchanged legacy ladder
If Passes 1–3 fail, invoke the current solver ladder with its existing behavior and normal budget semantics.

This is essential.

The first implementation should not try to replace the ladder. It should measure how much of the ladder’s work is still necessary.

Fallback invariant
Fallback is fully satisfied when:

Every level unsolved by the fast portfolio is automatically attempted by the legacy ladder.

The legacy ladder uses the same outer budget and internal budget allocation it would have used before the experiment.

The final result records whether the solve was:

found by fast portfolio,

found only by legacy fallback,

or not found.

Fallback-only wins include the winning configuration and timing information.

No existing specialist behavior has been removed or weakened.

Required instrumentation
The experiment must add a telemetry model for portfolio scheduling, separate from ordinary attempt telemetry if necessary.

Each portfolio attempt should record:

{
  pass: 1 | 2 | 3 | "fallback";
  configKey: string;
  technique: "dfs" | "beam" | "repair" | string;
  profile: string | null;
  template: string | null;
  beamWidth: number | null;
  diverseBeam: boolean;
  repair: boolean;

  allocatedSliceMs: number;
  elapsedMs: number;
  nodesExpanded: number;

  ok: boolean;
  timedOut?: boolean;
  termination: string;

  restartStatus: "fresh" | "restart" | "continuation";
  priorElapsedMsForSameConfig?: number;
  priorNodesExpandedForSameConfig?: number;

  levelFeatureBucket?: string | null;
}
At the solve-result level, record:

{
  schedulerMode: "legacy" | "portfolio-experiment";
  solvedByPass: 1 | 2 | 3 | "fallback" | null;
  foundOnlyByFallback: boolean;
  portfolioElapsedMs: number;
  fallbackElapsedMs: number | null;
  totalElapsedMs: number;
  duplicatedElapsedMs: number;
  duplicatedNodesExpanded: number;
}
This is deliberately explicit. The experiment is not useful if it only reports total runtime.

Evaluation reports to produce
1. Solve retention report
For each corpus:

total levels,

legacy solves,

portfolio solves before fallback,

portfolio + fallback solves,

solve retention vs legacy,

regressions, if any.

Important metric:

portfolio_plus_fallback_solved must equal legacy_solved during rollout
If not, the experiment has changed solver behavior too much.

2. Pass distribution report
Report:

solved in Pass 1,

solved in Pass 2,

solved in Pass 3,

solved only by fallback,

unsolved.

This is the main test of the scheduler hypothesis.

3. Runtime report
Report:

legacy runtime,

portfolio pre-fallback runtime,

fallback runtime,

total portfolio+fallback runtime,

runtime saved when portfolio succeeds,

runtime overhead when portfolio fails and fallback runs.

The runtime report should separate:

fast-success levels
fallback levels
all levels
Otherwise fallback overhead can obscure the win rate.

4. Duplicated work report
If attempts restart between passes, report:

duplicated elapsed ms,

duplicated nodes expanded,

duplicated attempts,

duplicated work by configuration.

This is important because the simplest implementation may restart attempts instead of continuing them.

Restarting is acceptable for the first experiment, but only if measured.

5. Late-win report
Report, by full configuration:

win count,

wins after 1s,

wins after 2s,

wins after 5s,

p50/p90/p95/max elapsed,

p50/p90/p95 budget fraction,

pass where each win occurred,

fallback-only wins.

This report should identify whether specialist late wins remain rare.

6. Fallback-only report
For each fallback-only solve:

corpus,

level feature summary,

winning fallback configuration,

winning fallback attempt elapsed time,

cumulative time before fallback winner,

whether the configuration was attempted in Pass 1/2/3,

whether it timed out in the portfolio pass,

whether it was skipped by the portfolio pass,

duplicated work before fallback.

This is the most important report for deciding whether to expand Pass 2/3 or preserve the full ladder.

Suggested implementation phases
Phase 0: Baseline validation
Before changing scheduler behavior, ensure the current telemetry and report pipeline are trustworthy.

Actions:

Confirm per-attempt records include:

elapsedMs,

allocatedBudgetMs,

nodesExpanded. 

Confirm normal solve provenance stores winning-attempt metrics separately from cumulative metrics. 

Run the current legacy solver on:

published corpus,

stress corpus,

any known hard/unsolved corpus.

Generate baseline reports:

winning-attempt timing by config,

late-bloomer configs,

per-corpus solve count,

per-corpus runtime.

Phase 0 invariant
Phase 0 is complete when:

The legacy solver result is reproducible.

Every successful normal solve has both:

winning-attempt elapsed/nodes/budget,

cumulative elapsed/nodes/budget.

Baseline reports exist for published and stress corpora.

No scheduler behavior has changed yet.

Phase 1: Add scheduler experiment mode
Add a feature-flagged scheduler mode, for example:

schedulerMode?: "legacy" | "portfolio-experiment";
Default must remain "legacy".

The experiment mode should:

Build the same applicable attempt configurations as the normal ladder.

Run explicit per-configuration slices for Pass 1.

If unsolved, run Pass 2 selected configs.

If unsolved, run Pass 3 specialist configs.

If still unsolved, call the unchanged legacy ladder.

The first version may restart attempts between passes.

Phase 1 invariant
Phase 1 is complete when:

Existing callers still default to legacy behavior.

Experiment mode is opt-in.

Experiment mode can solve via Pass 1/2/3/fallback.

Legacy fallback is automatic.

No existing ladder behavior changes when schedulerMode is absent or "legacy".

Phase 2: Implement explicit per-configuration caps
Add a mechanism to run a single configuration with a specific slice budget.

This should reuse the existing search implementation, but avoid invoking the whole ladder with a reduced outer budget.

The important abstraction is something like:

runAttemptSlice({
  gateKey,
  level,
  prep,
  attemptConfig,
  sliceBudgetMs,
  pass,
  restartStatus,
})
This should produce the same attempt telemetry as ordinary attempts, plus portfolio metadata.

Phase 2 invariant
Phase 2 is complete when:

The portfolio scheduler can cap one configuration independently of the outer solve budget.

Reducing a portfolio slice does not change the fallback ladder’s internal budget shares.

Each portfolio attempt records allocated slice, elapsed time, nodes, pass, config, and restart status.

A test or audit demonstrates that legacy mode’s attempt allocation is unchanged.

Phase 3: Implement simple tier selection
Start with static, evidence-backed tiers.

Initial proposed tiers:

Pass 1:
  all applicable configs, cap 1000 ms

Pass 2:
  moderate-tail / plausible specialist configs, cap 2000 ms
  examples:
    beam:intersectionHarvest@beam5000(diverse)
    dfs:perimeterSweep/perimeterCW
    beam:perimeterSweep/perimeterCW@beam2000

Pass 3:
  sparse specialist configs, cap 3000–5000 ms
  examples:
    beam:objectiveFirst@beam5000
    beam:perimeterSweep/perimeterCW@beam2000

Fallback:
  unchanged legacy ladder
Do not over-engineer this yet. The point is to validate the scheduling hypothesis.

Phase 3 invariant
Phase 3 is complete when:

Tier membership is explicit and reviewable.

Tier rules are configuration-based and feature-compatible, not level-ID-based.

Thresholds are constants/config values with comments saying they are experimental hypotheses.

The scheduler can report exactly which pass found the solve.

Phase 4: Add experiment reports
Add or extend reporting scripts to compare:

legacy baseline
vs
portfolio experiment with fallback
The report should include:

solve retention,

pass distribution,

fallback-only solves,

total runtime,

runtime saved,

duplicated work,

late wins by configuration,

fallback-only winning configurations.

Phase 4 invariant
Phase 4 is complete when:

Published and stress corpus reports can be generated from one command each.

Reports identify pass number for every successful portfolio solve.

Reports identify fallback-only wins.

Reports quantify duplicated work.

Reports include enough configuration detail to revise tiers without reading raw logs.

Phase 5: Run published-corpus experiment
Run:

legacy baseline,

portfolio experiment with fallback.

Expected published-corpus result, based on current evidence:

Pass 1 should recover most solves.

Pass 1 + Pass 2 should recover about 154 / 156 known wins.

Pass 1 + Pass 2 + Pass 3 should recover 156 / 156 known wins.

Fallback-only solves should be zero or very rare.

Do not hard-code these as test assertions yet, because runtime variation and implementation details can shift timings. Treat them as expectations for analysis.

Phase 5 invariant
Phase 5 is complete when:

Portfolio + fallback solve count matches legacy solve count.

Pass distribution is reported.

Any fallback-only solve has a full explanation.

Runtime savings and duplicated work are reported.

The report confirms or falsifies the 1s/2s/3–5s hypothesis on published levels.

Phase 6: Run stress-corpus experiment
Repeat the same comparison on stress corpora.

This is the decisive generalization test.

The stress corpus may show a heavier tail. That is okay. The goal is to learn:

which configs need longer slices,

whether late wins cluster by feature,

whether fallback-only solves are rare,

whether a few specialist configs need to be promoted into Pass 2 or Pass 3.

Phase 6 invariant
Phase 6 is complete when:

Portfolio + fallback solve count matches legacy solve count on stress corpora, or every mismatch is explained.

Fallback-only solves are categorized by configuration and level features.

Any proposed tier changes are based on configuration/feature behavior, not level IDs.

No specialist behavior has been removed.

Phase 7: Tune tiers conservatively
Only after published and stress data exist, revise tiers.

Examples:

Promote a fallback-only specialist to Pass 3.

Move a config from Pass 1-only to Pass 2 if it has repeated 1–2s wins.

Increase a specialist slice from 3s to 5s if stress data shows repeated 3–5s wins.

Keep full fallback if stress data shows diverse late wins.

Do not jump to ML yet.

Phase 7 invariant
Phase 7 is complete when:

Every tier change is justified by report data.

Every rule is configuration-based or feature-based.

Fallback-only wins become rarer or better explained.

Solve retention remains equal to legacy with fallback enabled.

Phase 8: Decide whether continuation is worth it
The first implementation may restart attempts between passes. That is acceptable only if duplicated work is measured.

After reports exist, decide whether resumable/continuation search is worth implementing.

Continuation is worth considering if:

duplicated elapsed time is large,

duplicated nodes are large,

restart overhead erases much of the runtime gain,

or the same configs often run in Pass 1, Pass 2, and Pass 3.

Continuation is probably not worth it yet if:

most solves happen in Pass 1,

fallback-only levels are rare,

duplicated work is small compared with runtime saved.

Phase 8 invariant
Phase 8 is complete when:

The project has quantified restart duplication.

There is an explicit decision to either:

keep restart-based slices for now,

or implement resumable search state for selected configurations.

That decision is based on measured duplicated work, not assumption.

Minimal safe implementation scope
The smallest useful implementation is:

Keep existing legacy solver untouched as default.

Add opt-in portfolio-experiment mode.

Add true per-configuration slice execution.

Add Pass 1 / Pass 2 / Pass 3 static tiers.

Add automatic fallback to legacy ladder.

Add telemetry for:

pass,

config,

allocated slice,

elapsed,

nodes,

restart/continuation,

fallback-only status.

Add reports comparing:

legacy baseline,

portfolio with fallback.

Do not implement yet:

ML scheduler,

feature-trained hazard model,

removal of legacy ladder,

removal of specialist configs,

level-ID-specific exceptions,

complex resumable search state unless duplicated work proves it necessary.

Acceptance criteria for the whole experiment
The experiment is successful when all of these are true:

Safety

Portfolio + fallback solves every level that legacy solves, or every difference is explained.

Attribution

Every solve is attributed to Pass 1, Pass 2, Pass 3, fallback, or unsolved.

Cost separation

Winning-attempt elapsed/nodes/budget remain separate from cumulative elapsed/nodes/budget.

No budget distortion

Fast probes use true per-configuration slices, not reduced outer solver budgets.

Fallback visibility

Fallback-only wins are explicitly reported with winning configuration and level features.

Late-tail visibility

Reports identify which configurations produce wins after 1s, 2s, and 5s.

Duplication visibility

If attempts restart between passes, duplicated elapsed time and duplicated nodes are reported.

No level-ID behavior

All scheduling decisions are configuration-based and/or feature-based.

No premature weakening

Specialist behavior remains intact until fallback-only wins have been measured on published and stress corpora.

Actionable result

The report can justify whether to:

keep 1s/2s/3–5s tiers,

adjust thresholds,

promote/demote specialist configs,

implement continuation,

or leave legacy behavior as the default.

What I would tell the future agent to do first
Start by building the experiment scaffolding, not by changing solver strategy.

The first real milestone should be:

Run the published corpus in portfolio-experiment mode with legacy fallback, and produce a report showing Pass 1 / Pass 2 / Pass 3 / fallback distribution, runtime saved, duplicated work, and fallback-only configurations.

If that reproduces the expected published-corpus shape, immediately run the same experiment on stress corpora before tuning anything.

The published data is strong enough to justify the experiment. It is not enough to permanently choose the thresholds.
