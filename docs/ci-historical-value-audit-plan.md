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

1. **What claim does this check establish, and which repository process owns that claim?** Distinguish merge-safety correctness/soundness from repository governance, maintainability policy, solver/research effectiveness, generated-authority freshness, and historical/reproducibility evidence.
2. **Does PR CI own that claim at all?** If an experiment/promotion protocol, generator, closeout/audit, scheduled hygiene process, or other authority already establishes it more directly, move the check to that process/cadence before optimizing its runtime.
3. **Would a changed result necessarily mean a bad merge?** If an improvement, intentional tradeoff, regenerated artifact, or updated research conclusion can legitimately make it false, it is not a permanent merge-safety invariant.
4. Does the surviving check protect a still-real current contract? If no, retire.
5. Is the contract covered more cheaply elsewhere? If yes, replace/demote duplicate coverage.
6. Can source impact select it reliably? If yes, prefer scoped to universal.
7. Has it produced unique or materially earlier true catches?
8. What is the consequence of delayed detection?
9. What does it cost on relevant versus irrelevant changes, including lane/setup costs that exist only because this obligation is selected?
10. Is the check itself a meaningful source of false-red CI?

Only after this decision test should testability/topology work ask how to execute the surviving obligation faster.

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

## Important distinction: claim ownership, cadence, then execution cost

Be aggressive about **where the claim belongs** before deciding how often its test runs. A useful historical/research audit may deserve to exist without belonging to PR CI at any cadence.

For claims that do belong in CI, be aggressive about **when** useful tests run before deleting them. Adding ten narrow regression tests is cheap if they execute only on relevant changes. The pathological quantity is approximately:

**selected frequency × selected wall contribution × tail probability × setup coupling.**

Raw command duration alone is no longer a sufficient priority metric once semantic routing is active. Optimize the selected critical path, not the old universal population.

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

The cadence/value audit remains the authority for **whether** an obligation belongs on a given PR. The live authority for **how fast the fullest selected contract runs** is now [CI ≤35-second critical-path plan](ci-35s-critical-path-plan.md). Do not duplicate topology decisions here.

Current critical-path conclusions that constrain cadence work:

- deep capabilities, Fast Gate validator groups, and the independent two-shard Node/CLI population are impact-scoped by semantic ownership; Fast Gate remains always materialized for structural checks/validators/lint, while build is owned by deep-services; routing failure reconstructs the corresponding full validator/Node/deep authorities;
- the fullest selected contract is still above the ≤35 s target on ordinary shared runners;
- shared-runner Node and coverage sharding are closed as production candidates because useful work balances correctly but p90 infrastructure margin is inadequate;
- structural Node/Vitest testability, bounded p50/p90 confirmation, remaining proof/Firestore/bootstrap tails, and larger/reserved compute remain live when current timing evidence earns them; closed same-runner/sharding experiments stay closed unless a named premise changes;
- cadence/ownership changes may remove obligations that never belonged to merge-safety CI; the ≤35 s target applies to the fullest **semantically justified merge-safety contract**, not to every historical check that happened to be present when the target was announced.

The protected validation breadth and current timing evidence live in the critical-path plan. Any future cadence recommendation that changes the fullest selected contract must update both documents and name the retained protection for every moved obligation.


## Detector implication / domination pass

Phase 3 now has an explicit pairwise evidence surface in `scripts/ci-history-detector-implications.mjs`, produced by the existing manual historical-value workflow after representative failure signatures are recovered.

For every pair of **current registered detectors**, record:

- representative episodes for A and B;
- co-failure episodes;
- A-only and B-only episodes;
- observed `P(B|A)` and `P(A|B)`;
- whether the recoverable sample shows one-way implication or exact co-failure above a minimum episode floor;
- whether either detector has ever appeared as the sole current detector in a representative episode;
- sampled runtime exposure where available.

Treat this as a shortlist generator, not a deletion oracle. An observed `A => B` can arise because one root cause breaks several consumers, because detector lineage changed, or because older logs are unavailable. Before retiring or demoting A, source inspection must show that A owns no independent current-state or detector-integrity contract, and a representative fault challenge must show that B catches the intended A failure class at the proposed cadence.

This distinction is especially important for validator/self-test pairs. A repository-state validator and its mutation-fixture self-test may fail together when the detector changes, but they protect different failure directions: current-state invalidity versus detector regression.

Current detailed findings and disposition are recorded in [the 2026-09-26 detector implication audit](../reports/2026-09-26-ci-detector-implication-audit-001.md).
