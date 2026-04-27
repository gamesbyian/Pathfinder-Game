Persistent Solver Failure Audit (Synthesis & Extension) — 2026‑04‑27
What I reviewed
All 118 commits + 22 merged PRs in the main history (PR #688 → #730).
audits/metrics/history.ndjson (123 audit runs, 2026‑03‑28 → 2026‑04‑27) and audits/metrics/latest.json / audits/raw/latest.json (run be055847).
levels.js constructions and embedded hint paths for L92/L108/L134.
Solver.js (15,004 lines) — particularly the rescue/feasibility blocks around lines 4275, 9046, 10678, 10730.
docs/persistent-solver-failure-approach-audit-2026-04-27.md (the prior response).
docs/pathfinder-solver-refactor-plan.md (8‑segment master plan, PR #697).
docs/pathfinder-refactor-status-2026-04-18.md.
techmemo.txt (2026‑04‑22, the deeply‑researched LAMA/CP‑SAT memo).
Recovered deleted artifacts: docs/persistent-failure-conclusions-2026-04-16.md (5f0bd8b^) and docs/solver-failure-elimination-plan-2026-03-30.md (5949b1b^).
Where I agree with the prior audit
The core narrative in docs/persistent-solver-failure-approach-audit-2026-04-27.md is sound:
L92, L108, L134 are genuinely persistent — they appear in essentially every audit since 2026‑03‑30 (L134 joined 2026‑03‑30; L92/L108 go back to the start of the corpus).
The dominant failure category is healthy-expansion-timeout, not contradiction collapse or invalid‑level rejection. Confirmed in latest run (levels[91/107/133]).
Almost every aggressive structural change in the last 2 weeks has been reverted (PR #693, #695, #715–#720, #702–#707, #722, #725–#726). The audit's bucketing into A/B/C/D/E categories is a fair summary.
The misguided‑in‑execution call on PR #721/#722 (global landmark penalty / LCP threshold tighten) is correct — it caused L7 collateral and was reverted in PR #723.
Where the prior audit is wrong, stale, or thin
These are the corrections worth noting before reading its recommendations:
1. The "exactly {92,108,134} at HEAD" claim is stale
The audit was written against 1da14d56b77a (2026‑04‑27 01:03Z, failing = [92,108,134]). The very next audit be055847 (2026‑04‑27 02:52Z, after PR #729 — the index.html review) regressed to [7, 61, 92, 108, 134]. So as of right now, "the persistent 3" is actually a persistent‑3‑plus‑shoulder of L7 and L61 that re‑appears on small perturbations. This matters because L7 appears under a different failure category (low-expansion-collapse/no-solution-inconclusive) than the timeout triad — it is not the same problem and a fix for one will not necessarily help the other.
2. The per‑level diagnoses are inverted for L92
The prior audit characterizes L108 as "near‑solution flood" and L92 as also having "near‑solution states". The latest telemetry (verified per‑attempt in levels[91/107/133]) shows the opposite for L92:
Level
bestLowerBoundToValidSolution per attempt
nearSolutionStates per attempt
L92
[18, 18, 24, 19, 19, 19, 19]
[0, 0, 0, 0, 0, 0, 0]
L108
[1] × 14
[3499, 2617, 2527, 15103, …, 13459]
L134
[2, 4, 2, 1, 1, 1, 1, 1, 1]
[0, 0, 0, 184, 168, 184, 128, 184, 184]
L61 (intermittent)
[3, 2, 4, 2, 2, … 2]
[6592, 10926, …, 12616]
The reading should be:
L92 is not a final‑mile problem. It never gets within 18+ of a valid solution and produces zero near‑solution states. That is a search‑guidance / heuristic‑plateau problem (consistent with techmemo §1) and possibly a feasibility‑pruning gap, not a rescue/closure gap.
L108 is the textbook final‑mile case (lb=1, thousands of near‑solution states). The prior audit's L108 description is right.
L134 is hybrid. Initial attempts are far (lb=2/4); later attempts collapse to lb=1 and ~150 near‑solution states — i.e., it transitions into the L108 family after a few passes.
L61 has the same lb≈2, ~10k near‑solution‑state signature as L108 — not a separate failure family. Treating L61 as part of the L108 cluster is more honest than calling it a "shoulder" failure.
3. The audit understates two important pieces of prior history
The deleted elimination‑plan (docs/solver-failure-elimination-plan-2026-03-30.md, removed in 5949b1b on 2026‑04‑18) is an explicit three‑slice plan that was specifically designed for these three levels and was never executed before being deleted. The slices are:
Slice A: hard near‑closure rescue trigger when bestLowerBoundToValidSolution ≤ 1 for L108.
Slice B: retry de‑duplication on (nodesExpanded, maxDepth, nearSolutionByDimension) fingerprints for L134.
Slice C: must‑cross schedule‑aware feasibility scorer + must‑cross rescue attempt for L92.
techmemo.txt (2026‑04‑22) is a deeply‑sourced research memo that recommends a specific technical stack (LAMA‑style landmark heuristic + Held‑Karp waypoint TSP, EHC with plateau memoization, Luby restarts with nogood retention, optional CP‑SAT precompute, and, critically, a 30‑minute backward‑BFS solvability red‑team before any of the above). The prior audit doesn't reference it at all, even though several of its "novel approaches yet to be tried" are restatements of techmemo §2/§3.
4. The audit's "useful and not misguided" verdict on instrumentation needs an asterisk
Per pathfinder-refactor-status-2026-04-18.md, Gate A of the refactor plan has not actually passed. Schema fields exist (pruneBreakdown, counterIntegrityStatus, statsProvenance) but persist as null in the latest run for non‑trivial attempts. So the telemetry the audit calls "useful" still has integrity gaps that make trend statements about hard levels weak.
Failure profiles, restated honestly

L92
L108
L134
Construction (levels.js)
12×12, reqLen=99, reqInt=8, mustPass=2, mustCross=2, portals=2, 9 blocks, 2 hints
11×11, reqLen=33, reqInt=1, mustPass=2, portals=2, 0 blocks, 3 hints
12×12, reqLen=53, reqInt=3, mustPass=2, mustCross=2, portals=3, 48 blocks, 1 hint
Solvability proof
hint paths present
hint paths present
hint path present
Failure category
healthy-expansion-timeout, attempts=7
healthy-expansion-timeout, attempts=14
healthy-expansion-timeout, attempts=10
Search reaches near a solution?
No (lb=18–24, 0 near states)
Yes, massively (lb=1, ~3k–15k)
Sometimes (early lb=4 → late lb=1, 100–200 near states)
Likely root cause
Heuristic plateau / weak schedule‑aware feasibility for must‑cross + reqInt
Final‑mile closure conversion gate
Mixed: starts L92‑like, ends L108‑like
Rescue activation in latest run
nearClosureRescueActivated=false
nearClosureRescueActivated=false
nearClosureRescueActivated=false
The single most important observation: all three persistent levels have provided ground‑truth solutions in levels.js.hints[], so this is unambiguously a solver problem, not a level‑design problem. The techmemo's §6.2 BFS red‑team is therefore not strictly necessary for existence, but a backward‑BFS or replay of the recorded hint path is still useful as a heuristic ground truth.
What approaches need more work (i.e. were promising but stopped early)
The 2026‑04‑18 intersection‑bound fixes (PR #695 / 2b232b8). Three concrete bug fixes — portal multiplier removed, intBudgetSlack corrected from Math.max(0,x) ≥ 0 to x ≥ 0, and a coupled intersectionDeficit + minDistToGoal > rSteps bound. Reverted same day in PR #696 with no published per‑level evidence. Of all reverted work, this one most directly matches the L92 telemetry signature ("frontier expansion in regions infeasible for both intersections AND goal distance"). It deserves a re‑attempt behind feature flags + per‑level canaries, not a verdict of "unstable, abandon."
The Three‑Slice plan from the deleted elimination doc. Particularly Slice A (hard near‑closure rescue trigger when bestLowerBoundToValidSolution ≤ 1) maps 1:1 onto L108's signature. The current code at Solver.js:10678–10712 already has the gate predicates wired (nearClosureRescueGateMissed), and audit data shows nearClosureRescueActivated=false consistently — meaning the gate is failing somewhere in timeoutProne || repeatedTimeoutOutcome || nearClosureCountRemaining. First step is to log which sub‑predicate is short‑circuiting on the failing runs, not to redesign rescue.
The mustCrossStallRescue / mustCrossScheduleRescue paths (Solver.js:10730–10770). The code exists. Telemetry in latest run does not show it firing on L92. The same diagnostic — log mustCrossRescueGateMissed reasons across the 7 L92 attempts — would tell us if these are inert or are mis‑wired.
Per‑level adaptive policy (hardClusterGating.passOrderByLevel). The infrastructure to switch attempt ladders by level number is in Solver.js:9310–9388, but the latest run's hardClusterGating.passOrderByLevel = {} and knownHardLevels = []. The plumbing is there; the policy table is empty. Filling it with three small, evidence‑based pass orders for L92/L108/L134 is a 1‑day change, fully reversible, and unblocks per‑level experimentation without algorithmic rewrites.
Diversity telemetry (Segment 1). The plan exists (refactor‑plan §1) and was attempted three times (PRs #715/#716/#719/#720), each time triggering the 133‑level mass regression that the plan explicitly warns against (_preCanonAttempts pattern). The "Option A" pattern documented at refactor‑plan lines 160–195 — compute metrics before canonicalization, attach scalar result after — has not yet been shipped to completion. This unblocks the rest of the gated plan.
Approaches that look misguided as executed
Global heuristic re‑weighting (PR #721 h_L landmark penalty, PR #722 LCP threshold ≥ 2). The intent matches the techmemo (LAMA‑style landmarks), but the execution applied a global multiplier without per‑level guardrails, so it traded one persistent failure for L7 collateral. The fix is not "don't do landmarks"; it is "don't ship landmark heuristics as a global scalar."
The 2026‑04‑18 modularization sprint (PRs #702–#707, six PRs reverted in 24 hours). Modularization was a legitimate goal, but bundling six PRs in a day, each touching solver entry points, hints ladder parsing, and result normalization, guaranteed mass revert. The successful version (PR #724 / 9622862) shipped 8 days later as a single atomic extraction — confirming that the architecture change itself is fine when isolated.
The identity‑stamp / attempts‑propagation chain (de16858 → b54cd5d → 0401458 → 43e0630). Each attempt to thread attemptsUsed through createCanonicalSolveResult for telemetry caused mass (~133 level) regressions. The refactor plan now contains an explicit warning against the pattern (lines 192–195). This is a closed lesson, not a missed opportunity — but worth noting that the diversity telemetry it was meant to enable is still ungated.
Broad architecture changes ahead of correctness gates (PR #725 red‑team reachability + PR #726 Luby restart telemetry). Reverted in the next two PRs without any persistent‑3 wins to bank. Both ideas appear in the techmemo (§2.4 Luby restarts; §6 backward reachability) but the techmemo specifically prescribes them with retained nogoods and as a one‑afternoon red‑team check, respectively. The PRs implemented neither precondition.
Continuing to delete planning artifacts (commit 5949b1b deleted the elimination plan, 5f0bd8b deleted the conclusions doc, 26f10ca deleted telemetry, b73dfbd deleted the heuristic‑recall CI workflow — all on 2026‑04‑18). The strategic pivot from incremental per‑level fixes to broad architectural changes happened in lockstep with the wholesale revert chain that immediately followed. Worth rebuilding what was deleted (the slices in particular) before the next round of broad changes.
Novel approaches not yet tried (or only partially tried)
These extend the prior audit's recommendations, with the techmemo's grounding made explicit.
Replay the recorded hints as an oracle. Every persistent level has its solution path embedded in levels.js. A trivial test harness that runs the hint path through the solver's state model gives:
Ground truth for per‑state lower‑bound admissibility checks.
Per‑step h(s) traces along a known‑good trajectory, which makes plateau detection mechanical (run h along the hint, find depths where h does not decrease — those are the actual plateau locations to attack).
A counterexample harness for the next intersection‑bound retry: any pruned state on the hint path proves over‑pruning. This converts bound tuning from "reverted because regressions" to a closed feedback loop. (Aligned with the prior audit's recommendation #2 "counterexample‑guided bound tuning" — but the oracle is already in the data, no synthesis needed.)
Two‑phase solver contract specifically for L108 (techmemo §3 + prior audit §4). Phase 1 = reach feasible near‑solution shell (the solver is already great at this — L108 generates 15k near‑solution states). Phase 2 = a dedicated completion solver that operates only on lb≤1 frontier states, runs a small bounded BFS toward goal under hard constraint check, and short‑circuits as soon as one closure exists. This is a much smaller change than landmarks/EHC and directly matches the L108 telemetry signature.
Held‑Karp waypoint ordering for the per‑level heuristic (techmemo §2.6). With must‑pass + must‑cross ≤ ~10 per level, optimal waypoint ordering is a tiny TSP DP solvable in <1 ms. This is the single change most likely to produce a positive obligationReductionSlope on L92 (which currently has lengthPressure=107 dominating and mustPassUrgency=-36.52 actively pulling against it — see techmemo §1, point 5). Critically, a level‑local waypoint heuristic is much safer than a global landmark scalar and avoids the L7 regression mode of PR #721/#722.
Make rescue gating observable, not heuristic. The two rescue gates at Solver.js:10678–10770 already record nearClosureRescueGateMissed and mustCrossRescueGateMissed. Surface these in the metrics rollup (hardClusterGating block) so the next audit answers "why didn't rescue fire on L108 in attempt 7?" in one query. Cheap, no‑risk change; converts every future audit into a rescue‑gate diagnostic. (This is the single change I would ship first.)
Pre‑seeded hardClusterGating.passOrderByLevel for {92, 108, 134, 61}. The plumbing exists, the table is empty. Three‑line config to (a) put nearClosureRescue first on L108/L61, (b) put mustCrossFirst first on L92, (c) bias L134 toward portal‑committed/perimeter for early attempts and nearClosureRescue for late attempts. This matches the per‑level adaptive portfolio in the prior audit and the L108 conversion plan in the deleted elimination doc, without touching any algorithm.
Re‑attempt PR #695 behind feature flags. Three named flags (disabledPrunes.has('portalIntMultiplier'), disabledPrunes.has('intBudgetSlack'), disabledPrunes.has('intGoalCoupledBound')) so each fix can be A/B'd independently against the full 137‑level suite. Of the three, the Math.max(0, x) ≥ 0 correction is a pure bug fix with no design judgment — it should be re‑landed unconditionally with regression evidence. This is the highest‑leverage low‑risk item in the entire audit.
A small "hints‑replay" CI gate asserting that for every level (not just hard ones) the recorded hint path remains feasible against the current solver's state model, with no bound pruning the hint. This would have caught all three intersection‑bound fix reverts within minutes instead of after a full audit cycle.
Two things missing from the techmemo recommendations
The techmemo is the strongest single source in the repo, but two of its top‑line items deserve push‑back in this codebase's actual context:
CP‑SAT precompute (techmemo Recommendation 4) is excellent for shipped levels but doesn't help live "user authored level" or "hint from current state" use cases. If shipped, it should complement a live solver, not replace it.
Luby restarts (techmemo §2.4) are explicitly conditional on retaining nogoods between restarts — the techmemo says "the key invariant is: restart must retain nogoods, or you're just paying overhead." PR #726 added Luby restart telemetry without nogoods. This is precisely the failure mode the techmemo warned about, and explains why #726 produced no wins before being reverted. Don't ship Luby until nogood learning lands first.
Bottom line
The prior audit's framing — "feasibility correctness + final‑mile conversion, narrow test‑harness‑driven changes" — is right. But the work it implies is much more concrete than "novel approaches not yet tried":
Re‑land the bug‑fix portion of PR #695 (the Math.max correction) with a regression flag.
Surface nearClosureRescueGateMissed / mustCrossRescueGateMissed in the audit rollup; diagnose why rescues are dormant on L108/L92 before writing new ones.
Populate hardClusterGating.passOrderByLevel for L92/L108/L134/L61 with profile orderings that match each level's signature.
Add a hints‑replay CI gate using the existing levels.js hint paths as the oracle.
Only then revisit the bigger swings (Held‑Karp waypoints, two‑phase L108 completion solver, landmark heuristic with per‑level scoping).
That order delivers the L108 conversion (steps 2 + 3) and the L92 feasibility correctness (step 1) inside a week, with permanent guard against the regression patterns that derailed every previous attempt (step 4). The architectural items in the refactor plan and techmemo become tractable once the rescue paths are observable and the bound logic is provably correct.
Note: I did not write this report to a file, since you asked for a review rather than a deliverable. If you want it persisted alongside docs/persistent-solver-failure-approach-audit-2026-04-27.md as a companion, say the word and I'll commit it to claude/analyze-solver-failures-LkOo4.
