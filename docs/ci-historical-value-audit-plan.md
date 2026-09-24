# CI historical value and cadence audit

> **Status:** cadence/value audit substantially complete; reopened for the ≤35s full-CI critical-path phase.
> **Started:** 2026-09-23.
> **Primary question:** which CI protections still justify running on every pull request, given their observed historical detection value, cost, redundancy, and blast radius?

This complements [CI impact routing](ci-impact-routing-plan.md). Routing asks which contracts a change could invalidate. This audit asks how often each protection has actually detected defects, whether it was the earliest or unique detector, and what slower or narrower cadence would have changed.

## Decision target

A regression test can remain useful without remaining useful on every PR. Compare these fates for every check or semantic group: universal PR, impact-scoped PR, main-push, nightly, weekly, demand-triggered, or retire/replace.

The output must identify what can leave the universal PR path, with evidence and explicit residual risk.

## Measure catches, not red badges

Classify every recoverable historical failure as:

- **true regression catch**: branch behavior violated an intended current contract;
- **intentional contract change**: correctly red while the contract was deliberately changing;
- **test/harness defect**: stale fixture, validator bug, workflow bug, bad action pin, etc.;
- **infrastructure/environment**: runner, cache, network, service, permissions, Actions behavior;
- **flake/nondeterminism**: rerun passes without a relevant code change;
- **inherited-main failure**: already red on the tested base;
- **unknown**: retained evidence is insufficient.

For true regressions, additionally mark the check as **unique**, **earliest**, **redundant**, or **late duplicate** for that root-cause incident.

The valuable unit is marginal defect-detection value, not raw failure count.

## Use the maximum recoverable history

Harvest with pagination to exhaustion:

- every retained pull-request CI run and attempt;
- every retained main-push validation run;
- jobs, steps, conclusions, timestamps, and runner time where exposed;
- logs for every non-successful job while retained;
- PR metadata, base/head SHAs, changed files, merge status, and eventual fixes;
- impact-shadow artifacts where present;
- historical versions of package.json, CI workflows, Vitest configuration, validation registries, and routing authorities at the SHA that actually ran.

The collector must report the oldest recovered run, total runs/attempts/PRs, proportion of failed jobs with usable logs, workflow eras, and retention gaps. Missing evidence must never silently become “never failed.”

## Build a check lineage

Checks have been renamed, regrouped, split, and moved. Create a machine-readable ledger mapping historical executable names to stable semantic identities, including aliases, first/last seen dates, current group, surfaces, supersession, and replacement relationships.

Use the narrowest granularity history actually exposes. If an old bundled step reports only aggregate success, do not fabricate individual-test history.

## Reconstruct failure incidents

Collapse correlated red checks into root-cause incidents. One defect that makes lint, tests, build, and an aggregate gate red is one catch event, not four.

For each incident record the PR/commit/run/attempt, changed files and router classification, failing stable check IDs, first failing check, root cause, failure class, fix/rerun evidence, whether it could have merged absent the check, whether another check independently covered it, and whether current main still has equivalent protection. Assign both a `rootCauseIncidentId` for correlated failures within one run and, where evidence supports it, a `failureFamilyId` linking the same underlying debt/fix sequence across adjacent PR heads. A repair pinball sequence must not be counted as repeated independent incidence merely because the branch moved between runs.

Prefer explicit log/fix evidence. Use “unknown” rather than inference theater.

## Exposure denominator

For each stable check compute:

- total executions;
- **relevant exposures** where changed surfaces could plausibly violate its contract;
- irrelevant executions;
- true regression incidents;
- unique catches;
- earliest non-unique catches;
- redundant catches;
- harness/test defects;
- flakes;
- infrastructure failures;
- inherited failures.

For zero-catch checks, distinguish “zero in 12” from “zero in 2,000.” A useful descriptive bound is the rule of three: after n roughly independent relevant exposures with zero catches, 3/n is a rough 95% upper bound on per-exposure incidence. It is not a safety proof.

## Cost model

Measure both compute and developer latency:

- median and p90/p95 execution time;
- setup/install cost attributable to keeping a lane alive;
- hosted-runner minutes;
- contribution to PR critical path and tail frequency;
- rerun cost caused by flakes/harness defects;
- diagnostic cost where a failure requires log archaeology.

Report true catches and unique catches per 1,000 executions, unique catches per 100 runner-hours, avoidable executions under the current impact router, and estimated runner/wall-time savings under each candidate cadence.

A cheap high-blast-radius invariant may remain universal despite few catches. A ten-minute proof with zero unique catches across hundreds of irrelevant changes faces a much higher bar.

## Counterfactual replay

Replay historical PRs against:

1. **Current universal behavior** as baseline.
2. **Current impact router**, using the real historical diff.
3. **Impact router plus cadence demotion**, simulating main-only/nightly/weekly checks and measuring detection delay.
4. **Redundancy-pruned CI**, removing one detector at a time from each historical incident.
5. **Minimal historical PR gate**, the cheapest set that still catches every recoverable true-regression incident plus explicitly protected catastrophic classes.

The minimal gate is an analytical lower bound, not an automatic recommendation.

## High-severity zero-catch checks

History alone is insufficient for rare/high-consequence invariants. Before demoting a zero-catch check, classify the consequence: local/reversible, research-evidence corruption, production breakage, persistent-data corruption, silent solver unsoundness/invalid accepted solutions, or security boundary.

For high-severity classes require at least one of:

- another always-on check covers the invariant;
- deterministic impact routing guarantees execution when owning code/data changes;
- synthetic fault injection proves a cheaper retained gate catches representative violations;
- a slower cadence has an explicitly accepted exposure window.

## Fault-injection challenge

For important checks with little or no historical signal, deliberately break a minimal representative invariant on a disposable branch/worktree and observe:

1. which current checks catch it;
2. which catches it first;
3. whether the impact router selects it for the responsible change;
4. whether a cheaper check can replace an expensive one.

Use small reversible mutations. This is especially valuable for regression tests whose motivating bug predates retained Actions history.

## Regression-test fossil record

Answer the central question directly: **of the regressions CI checks for today, how many have ever recurred?**

Create a fixture ledger for tests added for past bugs. Record the motivating PR/commit/issue where discoverable, date added, bug class, subsequent relevant exposures, genuine recurrences caught, times the test itself broke, overlap with broader property/invariant tests, execution cost, and proposed fate.

This separates recurring bug classes from one-off examples, obsolete architecture, examples subsumed by stronger invariants, cheap harmless fossils, and expensive fossils worth demoting.

## Recommendation buckets

Every current check/group ends in exactly one bucket:

- **U — Universal PR:** cheap/broad or strong marginal detection value.
- **S — Scoped PR:** run only when impact ownership selects it.
- **M — Main push:** every merged repository state, not PR critical path.
- **N — Nightly:** broad oracle/drift detector with acceptable hours of latency.
- **W — Weekly/periodic:** expensive low-frequency proof/integrity sweep.
- **D — Demand-triggered:** pre-release, workflow/research-specific, incident, migration, or manual audit.
- **R — Retire/replace:** obsolete, fully subsumed, no current contract, or negative-value brittleness.

A demotion/removal recommendation must name the retained protection for the contract.

## Ordered decision test

Do not hide judgment inside one numeric score. Ask, in order:

1. Does the check protect a still-real contract? If no, retire.
2. Is the contract covered more cheaply elsewhere? If yes, replace/demote duplicate coverage.
3. Can source impact select it reliably? If yes, prefer scoped to universal.
4. Has it produced unique or materially earlier true catches?
5. What is the consequence of delayed detection?
6. What does it cost on relevant versus irrelevant changes?
7. Is the check itself a meaningful source of false-red CI?

## Deliverables

Produce:

1. a machine-readable normalized history under reports/ci-audit or as a generated artifact;
2. a check-value table with relevant exposures, true/unique/redundant catches, false-red classes, cost, critical-path contribution, proposed cadence, and confidence;
3. a human-auditable incident ledger supporting every counted catch;
4. the regression fixture ledger;
5. a counterfactual policy report showing jobs/checks avoided, runner-hours saved, PR wall-time savings, regressions missed at PR time, detection delays, merged regressions, and severity classes;
6. concrete proposed CI architecture edits, but only after the audit result is reviewed.

Large raw logs should not be committed.

## Audit phases

### Phase 0 — collector and lineage
Build the exhaustive historical collector, record retention gaps, and establish stable check identities across workflow eras.

### Phase 1 — mechanical classification
Extract executions, timings, failures, reruns, changed files, router predictions, and obvious infrastructure/flake signatures.

### Phase 2 — incident adjudication
Review every distinct failed root-cause incident that can be recovered. This is the judgment-heavy part; total green-run volume stays mechanical.

### Phase 3 — value and redundancy analysis
Compute exposure-normalized catch rates, unique detection, redundancy, cost, and counterfactual removal.

### Phase 4 — zero-signal/high-severity challenge
Use fault injection and ownership analysis where history never exercised an important invariant.

### Phase 5 — cadence simulation
Replay historical changes against scoped, main-only, nightly, weekly, and redundancy-pruned policies.

### Phase 6 — recommendation
Assign U/S/M/N/W/D/R buckets with evidence and residual risk.

### Phase 7 — shadow before weakening
Run the proposed policy in shadow beside the existing full gate for a bounded observation window. Any full-only genuine regression is a veto/data point requiring routing or cadence revision.

## Important distinction: tests versus cadence

Be aggressive about **when** useful tests run before deleting them. Adding ten narrow regression tests is cheap if they execute only on relevant changes. The pathological quantity is:

**test count × irrelevant execution frequency × setup/tail cost.**

Optimize that product.

## Questions the final report must answer plainly

1. How many current checks have ever caught a true branch-caused regression in retained CI history?
2. How many have ever been the unique detector?
3. How many have only failed because of test/harness/workflow/infrastructure problems?
4. How many regression fixtures have observed a genuine recurrence of their motivating bug class?
5. Which checks consume the most runner time per unique catch?
6. Which checks run mostly on changes that could not plausibly affect them?
7. What would historically have happened if deep verification ran only on selected surfaces?
8. What would have happened if candidate checks ran on main, nightly, or weekly instead of every PR?
9. What is the smallest PR gate that catches every recoverable historical true regression?
10. Which high-severity invariants must remain protected despite zero historical catches?
11. How much PR wall time and Actions compute can be removed under the recommended cadence?
12. What periodic full oracle remains to catch mistakes in scoping?

## Existing evidence and expected bias

The impact-routing backtest already found 18/27 historical PRs eligible for scoped validation, with 16/27 able to skip the deep runner and 17/27 able to skip build/canary/heavy solver proofs. That is prior evidence, not the answer.

This audit goes one level deeper: **what historical defect-detection value did those expensive obligations actually deliver?**

The finish line is that every frequently executed check has a defensible marginal reason to be frequent, while expensive low-frequency protections run at a cadence proportional to demonstrated risk.


## 35-second critical-path extension

The cadence/value work established that `deep-verification` can be impact-scoped safely enough for production activation while `fast-gate` remains universal and broad main-push validation remains the oracle.

That does **not** satisfy the current latency objective.

The new decision target is:

> **Execute the complete validation contract of a full-impact PR in 35 seconds or less wall-clock without deleting meaningful protection.**

A recent full-impact PR run, CI run 35955087367, took roughly **96 seconds** from the first required runner starting to the last required validation lane completing. Approximate lane spans from hosted logs were:

| lane | observed span |
| --- | ---: |
| impact planner | ~7 s |
| fast gate | ~79 s |
| deep verification | ~85 s |

Representative useful-work spans inside that run included:

| work | observed span |
| --- | ---: |
| fast checkout + setup/cache/install before validation | ~17 s |
| validators | ~5.6 s |
| lint | ~14.4 s |
| Node/CLI contracts | ~26.9 s |
| solver canary | ~10.0 s |
| build | ~2.6 s |
| deep checkout + setup/install before tests | ~29 s |
| covered Vitest | ~30 s |
| explicit deep proofs | ~11.5 s |
| cached Firebase CLI + Java + Firestore boundary | ~13 s |

These figures are single-run observations, not stable estimates. The critical-path audit must reconstruct distributions across comparable recent full-impact runs before choosing a topology.

### New optimization rules

1. **Validation breadth is fixed initially.** Do not claim success by deleting detectors, weakening coverage thresholds, shrinking solver proof fixtures, or silently moving required protection off the PR gate.
2. **Wall time is the objective.** Runner-hours remain relevant but are secondary when they conflict with the ≤35 s critical path.
3. **Topology is negotiable.** The old two-lane preference is historical evidence, not a constraint. Additional lanes/shards are allowed when measured end-to-end latency improves after runner/setup variance.
4. **Setup is part of CI.** Checkout, sparse materialization, cache restore, dependency installation, Java/Firebase setup, and final aggregation count against the target.
5. **Balance by measured runtime.** Shards must be built from observed command/file costs, not equal item counts.
6. **Preserve failure quality.** A faster topology must still expose useful failures and must not turn one root cause into opaque cancellation/pinball.
7. **Measure p50 and p90.** A lucky sub-35-second run is not completion.
8. **Prefer structural testability improvements.** Repository discovery, CLI wrappers, subprocess startup, repeated bundling/model construction, and heavyweight fixture seams are valid implementation targets when they make the same proof cheaper.

### Required deliverable

Produce a concrete, staged implementation plan whose modeled critical path reaches **≤35 seconds** for a full-impact PR with explicit timing budgets for every lane and a fallback strategy if hosted-runner variance prevents the target.
