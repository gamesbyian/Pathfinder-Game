# CI historical value audit — Phase 0 implementation and incident seed

> **Status:** active
> **Last evidence:** 2026-09-23 — Exhaustive retained-history collection completed: 7,905 CI/main-push runs recovered with zero recorded retrieval gaps; current fast/deep era lane comparison and the two deep-only completed failures adjudicated.
> **Decision:** Historical collection is complete enough to enter value/cadence adjudication. Do not retire protections yet; quantify marginal detector value by workflow era and root-cause family, then shadow proposed cadence changes.
> **Remaining gate:** Cluster red runs into root-cause/failure families, complete current-era detector/cost accounting, repair historical PR association coverage where needed, and shadow any proposed demotions before changing required CI.

**Plan:** [CI historical value and cadence audit](../docs/ci-historical-value-audit-plan.md)

## What now exists

Phase 0 has executable infrastructure rather than only a plan:

- `scripts/ci-history-collector.mjs` exhausts retained `ci.yml` and `main-push-validation.yml` run history through the GitHub API, retains every run as exposure/timing evidence, expands detailed attempts/jobs/steps for non-successful or rerun cases, joins represented PRs from a repository-wide PR index, and records retrieval gaps explicitly.
- `scripts/ci-check-lineage.mjs` walks git history for the CI authority files and produces a name-based executable/check lineage with add/remove intervals.
- `.github/workflows/ci-historical-value-audit.yml` is a manual collection entrypoint that runs both tools with full git history and an authenticated read-only GitHub token, then uploads the normalized corpus.
- The collector defaults to metadata rather than bulk job-log retention. Failure adjudication can fetch logs only for distinct red incidents, avoiding a large raw-log artifact whose duplication would add little analytical value.

The manual workflow is registered in both the workflow lifecycle ledger and workflow discoverability documentation. It does not alter ordinary PR validation.

## Collector availability semantics

The generated summary must state:

- oldest/newest recovered run;
- run, attempt, job, failed-job, and represented-PR counts;
- per-workflow run counts;
- conclusion counts;
- every retrieval gap encountered.

A missing historical run, attempt, job page, PR record, artifact, or log must remain an availability gap. The audit must never translate missing retained evidence into “this check never failed.”

## Seed incident 001 — PR #1993 / CI run 35691478371

PR #1993 added only `.github/workflows/ws1-remaining-length-intrasolve-stage-a-one-shot.yml`.

The run had three CI jobs:

- `deep-verification`: success;
- `impact-shadow`: success;
- `fast-gate`: failure.

Inside the fast gate, the solver canary, production build, lint, package-script reachability, and ordinary deep lane all passed. The actual failures were:

1. `check:failure-evidence-disposition`: the new solver-running workflow had no failure-evidence disposition entry.
2. `check:documentation-links`: the new workflow was absent from `.github/workflows/README.md`.
3. `test:workflow-lifecycle`: the workflow existed on disk but not in the workflow lifecycle ledger.
4. `test:failure-evidence-disposition`: repeated the missing-disposition defect through the library/node-test surface.

### Provisional incident classification

This is one **branch-caused repository-governance omission cluster**, not four independent regressions.

Provisional detector accounting:

| detector | role in incident | marginal note |
|---|---|---|
| failure-evidence disposition validator | true catch | detects missing semantic retention/disposition registration |
| documentation discoverability check | true catch | distinct documentation/discoverability contract, same workflow-addition root cause |
| workflow lifecycle test | true catch | distinct lifecycle-ledger contract, same workflow-addition root cause |
| failure-evidence disposition node test | duplicate catch | same missing-disposition condition already exposed by validator |
| deep verification | no detection | entire lane passed |
| solver canary | no detection | passed |
| production build | no detection | passed |

The PR was ultimately merged at its failing head SHA, so this incident also demonstrates why the audit needs separate fields for **detected** and **prevented from merging**.

This incident is not evidence that all three governance contracts are redundant with each other. It is evidence that raw red-check counts would overcount one workflow-authoring omission as four separate catches.

## Immediate lessons for the audit implementation

1. Root-cause clustering is mandatory before catch-rate accounting.
2. Aggregate gate failures must be decomposed to their underlying semantic checks.
3. A green expensive lane is relevant negative evidence: it consumed cost but had zero marginal detection on this incident.
4. “CI caught it” does not imply the branch was prevented from merging in this repository.
5. Workflow additions are a useful fault-injection family because several governance checks deliberately overlap around them; this can quantify the difference between complementary and duplicate coverage.

## Next phase-0 gate

Run the manual collector first with a bounded rehearsal, then without `max_runs` to exhaustion. Validate:

- pagination completeness;
- attempt retrieval on rerun-heavy historical runs;
- PR changed-file attachment;
- oldest retained run;
- gap accounting;
- lineage output size and active-head correctness.

After that, Phase 1 can mechanically identify all red incidents and fetch logs only for those runs.


## Seed cluster 002 — PRs #1981 through #1990

A connector-side scan of the ten consecutive PR heads #1981–#1990 found **10/10 red CI runs**.

Every one of those runs had the same lane shape:

- `fast-gate`: failure;
- `deep-verification`: success;
- `impact-shadow`: success.

Across the cluster, the expensive deep lane therefore executed ten times and contributed **zero observed detection**. This is not yet enough to demote it globally, but it is exactly the historical counterfactual the audit is designed to quantify over the full retained population.

The fast-gate failure population was heavily concentrated in research-system metadata/queryability/governance checks:

- `check:research-integration`;
- `test:research-query`;
- `test:research-integration-audit`;
- `test:research-system-inventory`;
- `test:research-system-consolidation-closeout`;
- `test:research-index`;
- workflow lifecycle/documentation/parity checks;
- an action-selection fixture expectation during part of the sequence.

The failure multiplicity is again much larger than the apparent root-cause count. For example, the same structured research metadata disagreement propagated through the status index into relations, query, inventory, integration-audit, and closeout consumers. Counting each failing harness as an independent catch would substantially exaggerate the marginal detection value of the graph.

The sequence also shows repair progression rather than ten cleanly independent incidents: by PR #1990 the fast gate had narrowed to a single failing `test:research-query` while validators, lint, solver canary, production build, and deep verification were green.

### Audit implication

The final analysis must support **failure-family clustering across adjacent PRs**, not only within one run. Otherwise a whack-a-mole repair sequence can be miscounted as repeated independent regression incidence.

A useful incident schema therefore needs both:

- `rootCauseIncidentId` for correlated failures inside one run; and
- `failureFamilyId` for the same underlying debt/fix sequence spanning multiple PR heads.


## Exhaustive collection result — run 35829858794

The uncapped manual collector completed successfully against current `main`.

Recovered availability window:

- oldest retained run: **2026-03-23 01:56:09Z**;
- newest retained run: **2026-09-23 06:55:45Z**;
- total runs: **7,905**;
- `ci.yml`: **7,598** runs;
- `main-push-validation.yml`: **307** runs;
- attempts represented: **7,915**;
- detailed jobs retained: **12,231**;
- failed jobs in retained detailed trees: **9,536**;
- indexed PRs: **2,000**;
- PRs associated by the current collector join: **1,426**;
- runs with detailed non-success/rerun job trees: **5,303**;
- successful runs intentionally retaining run-level rather than job-level detail: **1,249**;
- recorded retrieval gaps: **0**.

Run conclusions across the recovered corpus:

| conclusion | runs |
|---|---:|
| success | 1,256 |
| failure | 3,083 |
| cancelled | 3,566 |

For PR CI alone:

| conclusion | runs |
|---|---:|
| success | 1,098 |
| failure | 2,978 |
| cancelled | 3,522 |

This distribution makes raw red-run counts actively misleading. Most historical CI outcomes are non-success, and cancellations plus repair-sequence churn dominate the visible surface. Root-cause/failure-family clustering is not an analytical refinement; it is necessary for the audit to mean anything.

### Historical PR-association caveat

The repository-wide head-SHA join fixed the rehearsal's zero-PR bug, but it associates only **1,425 distinct PRs across 7,598 PR-CI runs**. That is expected to under-associate older intermediate commits from PRs whose final head later moved. Historical diff-sensitive analysis therefore must not treat an unassociated run as a non-PR run. For red incidents requiring changed-file/router counterfactuals, resolve the PR from preserved head branch / commit-to-PR evidence before adjudication.

## Workflow eras

The retained job identities show several materially different CI eras:

- `solver-checks`: 2026-03-23 through 2026-05-28;
- monolithic `checks`: 2026-06-16 through 2026-09-04;
- split `checks-lint` / `node-tests` / `deep-proofs`: 2026-08-27 through 2026-09-04;
- current `fast-gate` / `deep-verification`: from 2026-09-04;
- `impact-shadow`: from 2026-09-22.

Detector value must be compared within these eras before semantic lineage is used to bridge equivalent protections across renames/repackaging.

## Current fast/deep era — marginal lane evidence

From the introduction of `fast-gate` on 2026-09-04 through the end of the recovered corpus:

- PR-CI runs: **3,710**;
- successes: **304**;
- failures: **532**;
- cancellations: **2,874**.

Among the **519 completed failing runs where both fast and deep lane outcomes are observable**:

| fast gate | deep verification | runs |
|---|---|---:|
| failure | success | **468** |
| failure | failure | **49** |
| success | failure | **2** |

Thus the deep lane was the only failing lane in **2 / 519 observable completed failures (0.39%)**. Conversely, fast gate alone exposed 468 failures that deep verification did not.

Repair-family adjudication further weakens the raw two-run count: one deep-only run (#1693) is not branch-caused, while the other (#1722) is a genuine solver-semantic catch. Current evidence therefore contains **one demonstrated branch-caused deep-only repair episode**.

Observed runner time in retained detailed current-era jobs is already substantial:

- `fast-gate`: about **36.2 runner-hours**;
- `deep-verification`: about **32.1 runner-hours**.

These are **lower bounds**, because the exhaustive collector intentionally skipped full job details for ordinary successful runs. Completed non-cancelled observed medians were roughly 112s for fast gate and 91s for deep verification.

### Deep-only run A — PR #1693 / run 34405094061

PR #1693, **“Retire obsolete CI and completed campaign scaffolding,”** passed fast gate but failed deep verification's ordinary covered test population on a solver-orchestration expectation.

Further family/commit tracing changes the classification. The immediately preceding failing head (`e26c540...`) had deep verification green. The two commits from that head to the deep-only head (`55f4fa7...`) changed only:

- `reports/2026-09-09-ci-test-lifecycle-audit.md`; and
- `scripts/check-solver-sweep-result-contract.mjs`.

Neither touched solver implementation, solver tests, test configuration, dependencies, or the deep-verification workflow. The next successful head changed only the Firestore fingerprint-boundary workflow/test naming. Therefore the solver-orchestration failure cannot reasonably be credited as a branch-caused regression catch for PR #1693.

**Classification:** test/harness nondeterminism or inherited-state failure, not a demonstrated branch-caused regression. It still matters as evidence that deep verification can go red independently, but it earns no regression-prevention credit.

### Deep-only incident B — PR #1722 / run 34573749717

PR #1722, **“Solver system audit campaign: correctness, identity, evidence and harness hardening,”** passed fast gate but failed deep verification's ordinary covered test population.

The deep lane caught three solver orchestration regressions, including:

- a node-budget-exhaustion contract that should suppress a later diversity pass;
- sparse unrelated ablation configuration failing to preserve a promoted default-on retry;
- a second promoted/default-on solver-routing expectation in the same orchestration surface.

Again, this is a real solver-semantic catch, not infrastructure noise.

### Current implication

The evidence now supports a narrower question than “keep or delete deep verification”:

> Can ordinary/deep solver verification become **impact-scoped PR validation** for solver-affecting surfaces, with a periodic full oracle, while preserving these two demonstrated unique catch classes?

That hypothesis must be tested against historical diffs/router behavior and fault injection before changing cadence.


## Current-era repair-episode clustering

A first mechanical clustering pass groups failing PR-CI runs by head branch into repair episodes. A success closes an episode; a gap longer than six hours starts a new episode; cancellations do not count as discoveries and do not themselves split the repair sequence.

This is deliberately conservative. It can still merge distinct root causes within a long repair burst, so later semantic adjudication may split an episode. Its purpose is to stop repeated red SHAs from being counted as independent incidence.

For the current fast/deep era the **536 failure rows represented by this branch/time clustering collapse to 215 repair episodes**:

| episode lane behavior | repair episodes |
|---|---:|
| fast fails while deep stays green throughout | **193** |
| both lanes fail at some point, no deep-only transition | **13** |
| episode contains a fast-green/deep-red transition | **2** |
| incomplete/legacy-transition lane visibility | **7** |

Of the two episodes containing a deep-only transition:

- PR #1693 is reclassified as non-branch-caused test/harness/inherited-state evidence;
- PR #1722 is a genuine branch-caused solver-semantic episode and changed core solver implementation/tests.

This episode-level view is materially different from raw run counting. Deep verification has one currently demonstrated branch-caused episode in which it supplied unique marginal evidence after the fast lane was green.

### Cadence hypothesis strengthened

The surviving genuine deep-only case is exactly the kind of change an impact router should classify as solver-affecting: PR #1722 changed `modules/solver/orchestration.ts`, `modules/solver.ts`, `modules/solver/search.ts`, stage-budget/executor code, worker code, and associated solver tests.

The historical evidence therefore supports testing a policy of:

1. run deep verification on solver/runtime/high-blast-radius changes selected by deterministic impact routing;
2. do not run it universally on unrelated documentation/research-governance changes;
3. retain a periodic full deep oracle (main-push/nightly) as a backstop for router omissions and cross-surface coupling;
4. fault-inject the #1722-style solver regressions to prove the scoped route still catches the demonstrated unique class.

This is still a hypothesis to shadow, not yet a production CI change.


## Whole-history repair-family compression

Applying the same conservative branch/time repair-episode rule across all **2,978 failed PR-CI runs** collapses them to **865 candidate repair episodes**.

That is a **3.44× raw-run inflation factor** before any semantic root-cause deduplication. The median episode contains 2 failed runs; the upper tail is much larger because some active branches accumulate long repair sequences.

This does not claim there were exactly 865 independent regressions. It is an upper-bound candidate-family count: semantic adjudication can split a heterogeneous episode or merge related episodes across branches. The important result is that **2,978 is definitely not an honest regression count**.

### Cancellation churn

The **3,522 cancelled PR-CI runs** are overwhelmingly superseded work rather than detector evidence:

- every retained cancellation in this corpus had a later run on the same branch;
- median time to the next run: about **17 seconds**;
- 75th percentile: about **34 seconds**;
- 90th percentile: about **64 seconds**;
- **99.86%** were followed by another same-branch run within ten minutes.

Cancelled runs therefore belong in compute/cost accounting, but not in regression-catch accounting unless a specific cancelled job had already produced durable failure evidence before cancellation.

## Main-push validation — distinct role and cadence question

The retained main-push workflow has:

- **307** runs;
- **158** successes;
- **105** failures;
- **44** cancellations.

The 105 failures collapse to **22 failure streaks** when a success closes the streak. This is another large raw-count inflation: repeated red pushes while main is being repaired must not be counted as 105 independent catches.

The first commit in each of those 22 streaks was inspected. **13 / 22** were single-parent commits on main rather than merge commits; **9 / 22** were merge commits.

That matters because direct-to-main changes do not necessarily have an equivalent PR-CI exposure on the exact commit. Main-push validation therefore has a real safety role in Pathfinder's current operating model. The evidence does **not** support simply deleting it as duplicate post-merge CI.

The useful cadence question is instead:

> Can main-push validation become an impact-scoped backstop for direct-main changes and merge/integration-sensitive surfaces, while periodic full validation supplies the broader oracle?

This should be evaluated separately from PR deep-verification scoping.


## Historical unique-catch counterfactual against the current router

The current impact authority was checked against the surviving genuine deep-only episode.

Current routing rules classify `modules/solver/**`, `modules/solver.ts`, and related production solver paths as **solver + research** impact. The solver validation plan requires:

- unit coverage;
- deep proofs;
- solver canary; and
- production build.

PR #1722 changed `modules/solver/orchestration.ts`, `modules/solver.ts`, `modules/solver/search.ts`, stage-budget/executor code, worker code, and solver tests. Therefore the current scoped plan would **require deep verification** for the exact historical episode where deep supplied unique branch-caused evidence.

This is an important safety result: the current router does not appear to trade away the only demonstrated current-era marginal deep catch.

PR #1693 is different: it changed package/workflow/CI authority and would conservatively escalate to full impact under the current router anyway. Its non-branch-caused deep failure therefore also remains visible during router-authority changes, where conservative full validation is appropriate.

### Provisional current-era disposition

Evidence now supports the following **shadow candidate**, not yet a production change:

- **fast gate:** retain as universal installed-dependency lane for now, while its internal semantic groups continue to be audited;
- **deep verification:** move from universal PR cadence to impact-scoped PR cadence under the existing execution plan;
- **solver impact:** keep the whole current deep bundle together initially;
- **CI/router/config authority:** retain conservative full-impact escalation;
- **periodic full oracle:** retain to audit router omissions and unexpected cross-surface coupling;
- **main push:** preserve as a direct-main/integration backstop, then scope it with the same impact authority rather than deleting it.

Before activation, fault injection should reproduce at least the PR #1722 failure class and prove the scoped route selects/catches it.


## Fast-gate family sampling — why semantic scoping matters inside the lane

The largest current-era repair episodes were sampled by fetching the first failing fast-gate log for each episode rather than every repeated red SHA. The 16 largest mechanical episodes alone account for **188 failed PR-CI runs**.

Representative failures include:

- `test:experiment-manifest` on the 24-run research-domain episode;
- `check:types:tests`, `check:documentation-links`, and `check:level-metric-boundaries` during the solver-audit campaign;
- `check:file-size-ratchet` on a 10-run workflow-remediation episode;
- `check:documentation-links` on several research/documentation episodes;
- `check:workflow-actions` and `test:workflow-lifecycle` on hint/workflow-authoring work;
- `test:append-solver-health-record` and `test:combine-solver-sweep-reports` on solver-research information-retention work.

In these sampled long episodes, production build and solver canary were repeatedly green while a small number of repository/research contracts were red. Large numbers of unrelated Node/CLI harnesses also passed around the actual failing contract.

This is direct evidence for the impact-routing program's core premise: the fast lane itself contains useful checks, but **universal execution of every semantic group is not the same thing as useful detection**. The audit should demote by relevance/cadence before deleting individual contracts.

## Reproducible repair-episode analyzer

The branch now includes `scripts/ci-history-repair-episodes.mjs`. It consumes the normalized `history.jsonl` corpus and emits:

- whole-history candidate repair episodes;
- current-era fast/deep lane episode categories;
- cancellation supersession timing;
- per-episode failing job/step identities.

The existing manual `ci-historical-value-audit.yml` workflow invokes this analyzer after history collection, so future audit runs produce `repair-episodes.json` in the same artifact without adding any new ordinary PR-CI obligation.


## Current fast-gate validation population

The current machine-readable validation registry contains:

| semantic group | validators | Node/CLI harnesses |
|---|---:|---:|
| repo | 10 | 9 |
| research | 3 | **87** |
| solver | 2 | 16 |
| game | 6 | 2 |
| data | 5 | 33 |
| shared | 2 | 25 |
| persistence | 0 | 1 |
| **total** | **28** | **173** |

Research-only harnesses therefore account for **87 / 173 (50.3%)** of the current permanent Node/CLI population. The current universal gate executes these alongside every other semantic group even when a change is unrelated to research-system contracts.

This does not imply that research checks are low value. On the contrary, sampled repair episodes show research contracts catching real research-system inconsistencies. It means their **universal cadence** deserves evidence rather than inheritance.

## Representative failure-signature stage

The audit branch now includes two second-stage analyzers:

- `scripts/ci-history-failure-signatures.mjs` fetches only the first failing run from each mechanical repair episode and extracts concrete `check:*` / `test:*` detector identities from retained job logs;
- `scripts/ci-history-failure-groups.mjs` maps those detectors back to the current semantic validation registry.

The manual historical-audit workflow can reuse a prior audit artifact through `source_run_id`, avoiding another 7,905-run crawl. An optional `max_episodes` input supports a bounded rehearsal before all 865 candidate episodes are expanded.

This stage is intended to answer:

1. which detector identities recur across candidate repair families;
2. which semantic validation groups account for first-failure evidence;
3. which failures are repeatedly co-detected by multiple contracts in the same representative run;
4. which current permanent groups have little or no observed representative catch evidence;
5. where cadence/scoping can reduce execution without deleting the underlying contract.


## Representative runtime economics

The second-stage failure-signature analyzer also extracts the per-command durations already printed by the fast-gate parallel runner for every `PASS` / `FAIL` `check:*` and `test:*` line in the representative job logs.

The semantic grouper therefore reports, for each detector/group represented in the episode sample:

- representative repair episodes in which the detector was red;
- observed executions in the sampled logs;
- observed aggregate runtime seconds;
- median and p90 command runtime where available;
- observed execution seconds per representative detector hit.

These are **not** causal “cost per bug” scores. A representative log contains many unrelated green commands, correlated detectors can share a root cause, and the sample deliberately selects first failures rather than every execution. The purpose is to expose obvious cadence mismatches such as expensive groups with little representative catch evidence, then validate any proposed demotion with router counterfactuals and fault injection.


## Signature-rehearsal correction

The first 50-episode signature rehearsal (run 35908941294) completed green but was analytically empty:

- 50 episodes requested;
- 47 representative job logs unavailable;
- 0 episodes with extracted detector signatures.

The cause was selection order, not extractor failure. Mechanical repair episodes are emitted oldest-first, so the rehearsal sampled March 2026, where GitHub job-log retention is largely exhausted. Direct checks against recent September episodes recovered detailed detector signatures immediately.

The signature analyzer now sorts episodes **newest-first by default** before applying `max_episodes`. It also records the selected order and refuses a bounded rehearsal that recovers zero detector signatures, preventing an availability-empty run from appearing successful.


## Newest-first 50-episode signature rehearsal — run 35910435942

The corrected rehearsal is analytically usable:

- 50 newest repair episodes sampled;
- 48 episodes yielded parsed detector signatures;
- 0 job-log retrieval gaps;
- sample spans roughly 2026-09-21 19:52Z through 2026-09-23 06:30Z.

Recent representative evidence is concentrated in repository/research contracts. Top detectors include `check:documentation-links` (39 episodes), `check:research-integration` (29), `test:research-integration-audit` (28), `test:research-system-consolidation-closeout` (28), `test:research-system-inventory` (28), `test:research-index` (27), and `test:workflow-lifecycle` (26).

Current-registry detector appearances in this sample are dominated by research tests (298 appearances across 17 detectors), followed by repo validators (69 across 5), research validators (31 across 2), repo tests (26 across 1), solver tests (5 across 2), and shared validators (4 across 2). These are correlated detector appearances, not unique root-cause counts.

The sampled logs also support runtime/evidence comparisons. Cheap frequent examples include `check:documentation-links` (~4.0s median, 39 representative episodes), `check:research-integration` (~4.3s, 29), and `test:workflow-lifecycle` (~8.1s, 26). More expensive low-frequency examples in this recent research-heavy window include `test:append-solver-health-record` (~13.5s, 3), `test:combine-solver-sweep-reports` (~27.7s, 2), `check:types:tests` (~13.2s, 3), and `check:types` (~10.6s, 1).

This sample is intentionally recent and reflects a research-heavy development period. It is evidence that the extractor is healthy, not a final cadence ranking. The next gate is a full recoverable representative-signature pass across all 865 repair episodes, with retention gaps reported explicitly.


## Full representative-signature pass — run 35911214948

The full second-stage pass processed all **865** mechanical PR-CI repair episodes from the retained corpus.

Availability:

- episodes requested: **865**;
- episodes with parsed detector signatures: **296**;
- representative job-log retrieval gaps: **421**;
- episodes with at least one retrievable representative failed-job log: **438**;
- oldest representative episode with retrievable job logs: **2026-07-09**;
- oldest episode with modern parsed `check:*` / `test:*` signatures: **2026-08-21**;
- the 421 explicit log gaps are concentrated in the oldest history, from **2026-03-23 through 2026-06-16**.

The correct denominator for detector-level cadence analysis is therefore the recoverable modern window, not all 865 episodes. Older run/job outcome evidence still informs lane-level conclusions, but missing logs are never counted as zero catches.

### Full-pass detector recurrence

Most frequently observed representative detector identities:

| detector | representative episodes |
|---|---:|
| `check:documentation-links` | **201** |
| `test:research-index` | **39** |
| `test:research-system-consolidation-closeout` | **35** |
| `test:research-system-inventory` | **35** |
| `test:workflow-lifecycle` | **34** |
| `check:research-integration` | **33** |
| `check:types:tests` | **33** |
| `test:research-integration-audit` | **32** |
| `test:research-relations` | **31** |
| `test:research-portfolio-retrospective` | **30** |
| `test:research-question-dossier` | **27** |
| `test:research-consumption-link` | **25** |
| `test:research-acquisition-preflight` | **24** |
| `check:level-metric-boundaries` | **19** |
| `test:research-query` | **19** |
| `check:types` | **17** |

These are representative-episode appearances, not unique independent regressions. Correlated repository/research contracts still frequently fail together.

### Distinct representative episodes by current semantic group

Using the current validation registry to classify only detectors that still exist today:

| current group | distinct representative episodes with at least one detector |
|---|---:|
| validator / repo | **211** |
| test / research | **73** |
| validator / research | **40** |
| test / repo | **35** |
| validator / shared | **33** |
| test / solver | **24** |
| validator / data | **20** |
| test / data | **10** |
| validator / solver | **4** |
| test / shared | **3** |

No current game or persistence detector appears as a parsed representative failure in this recoverable modern sample.

### Zero-/low-hit runtime tail

Representative failed-job logs also expose a large population of commands that executed repeatedly while never appearing as the representative failing detector.

Examples with **zero** representative detector appearances in the recoverable sample include:

- `test:portfolio-solve-sweep-worker`: 174 observed executions, ~3,822 aggregate sampled seconds, ~21.4s median;
- `test:stress-topology-generator`: 185 executions, ~3,529s, ~18.2s median;
- `test:family-parent-hint-replay`: 190 executions, ~3,378s, ~17.3s median;
- `test:select-routing-regime-sample-cli`: 174 executions, ~2,854s, ~15.7s median;
- `test:lifecycle-failure-map`: 175 executions, ~2,751s, ~15.0s median;
- `test:level-blind-capability-sweep-cli`: 174 executions, ~2,520s, ~13.7s median;
- `test:early-repair-search-badness-report`: 174 executions, ~2,474s, ~13.6s median;
- `test:loader`: 190 executions, ~2,241s, ~11.2s median;
- `test:hint-query-lib`: 174 executions, ~2,234s, ~12.1s median;
- `test:firestore-rules`: 190 executions, ~1,134s, ~5.8s median.

Low-hit examples include `check:corpus-level-formatting` (1 representative detector appearance across 334 observed executions), `test:experiment-manifest` (1 / 190), `test:family-generate` (1 / 190), `test:hint-complete-sharded` (1 / 190), and `test:publish-solver-sweep-result` (1 / 138).

These numbers do **not** mean the zero-hit checks are useless. The sample is conditioned on representative failing runs, detector lineage changed over time, and absence of observed failure is not proof of absence of latent value. They do show that universal cadence has a substantial cost tail that now requires positive justification.

## Provisional cadence disposition after the full pass

### Keep universal for now

**Cheap repository invariants.** Repository validators, especially documentation/workflow/authority checks, have high representative catch frequency and low per-command runtime. They are strong candidates to remain universal.

**Cross-cutting type validation.** `check:types` and `check:types:tests` have 17 and 33 representative detector appearances respectively. Their cost is material, but current evidence does not support demoting them before a more specific dependency-aware alternative exists.

### Shadow impact-scoped PR cadence

**Research tests.** They are highly valuable on research-system work, but 87 current research harnesses make up half the permanent Node/CLI population. The evidence supports running the research group when research/research-evidence/workflow surfaces are impacted, backed by a periodic full oracle.

**Data/family/hint tests.** The current data group contains many of the largest zero-/low-hit runtime consumers. Run these on data, corpus, family, hint, and related solver-research surfaces rather than universally.

**Solver tests and deep verification.** Preserve on solver-impacting changes. The only demonstrated current-era genuine deep-only branch-caused episode (#1722) is selected by the existing solver impact rules, so impact scoping retains the known unique class.

### Reclassify before cadence decisions

**Shared Node tests.** Current shared tests produced only 3 representative detector appearances across two detector identities, while several shared commands are among the more expensive always-running harnesses. Because `shared` is explicitly the conservative unknown-ownership bucket, the right next move is to reduce that ambiguity, not blindly demote the whole group.

### Require fault injection / explicit backstop before demotion

**Game and persistence validation.** No current game/persistence detector appears as a parsed representative failure in the recoverable modern sample. That is insufficient evidence to remove universal protection for production boot/browser/security-sensitive surfaces. Before changing cadence, inject representative faults and prove the scoped router plus periodic full oracle catches them.

## Recommended activation sequence

1. Keep repo invariants and type checks universal.
2. Turn existing impact-shadow output into a **shadow comparison for research/data/solver group execution**, without changing required checks yet.
3. Reclassify the expensive `shared` tail into narrower ownership groups.
4. Fault-inject representative solver, game, persistence, and router-authority defects.
5. Compare shadow-selected groups against all subsequent real CI failures for a defined observation window.
6. If no misses are observed and injected faults route correctly, activate impact-scoped research/data/solver PR validation.
7. Preserve full validation on periodic main/nightly cadence as the oracle and for direct-to-main changes until main-push scoping has equivalent evidence.

The audit now supports changing **when** large validation populations run. It does not yet support deleting large classes of validation.


## Representative semantic fault injection follow-up

PR #2030 converted the remaining activation prerequisite into a reusable isolated-worktree audit across four semantic fault families.

Initial hosted run `35952055604` produced:

| fault family | routed protection | existing detector result |
| --- | --- | --- |
| game editor-runtime port miswire | `game` + build/unit coverage | caught |
| persistence runtime auth-token drop | `game,persistence` + Firestore/unit coverage | caught |
| solver gate interleaving forcibly disabled | `research,solver` + solver canary/deep proofs/unit coverage/build | **missed by the targeted existing solver tests** |
| router authority drops `deep-proofs` | conservative full impact | caught |

The solver miss was substantive rather than a routing error. The router selected the intended solver protections, while the targeted orchestration/routing/default-equivalence tests all remained green with production gate interleaving hard-disabled. Ordinary CI's solver canary and deep-verification lane also remained green on the audit PR, demonstrating that this particular scheduling invariant was not directly pinned by the existing proof population.

The follow-up adds a focused production-path regression test to `modules/solver/orchestration-core.test.ts`. It constructs a two-gate level, bounds execution to two dispatched nodes, and asserts that production scheduling visits both active gates under the same config before advancing configs. This directly distinguishes the intended interleaved coordinator from the gate-serial fallback without relying on a corpus solve outcome.

Activation implication: impact routing itself passed this injected solver case; the uncovered risk was detector completeness. Scoped solver validation should not be promoted until the refreshed fault-injection run proves the new scheduling invariant catches the injected defect.


## Production activation and new latency objective

The cadence audit's principal production recommendation is now partially activated.

PR #2036 changed ordinary PR CI so that:

- `fast-gate` remains universal;
- semantic impact routing is authoritative only for whether `deep-verification` must run;
- planner failure fails safe by running deep verification;
- manual dispatch always runs deep verification;
- CI/router/config authority changes remain conservative full-impact cases;
- broad main-push validation remains the integration/direct-main oracle.

The activation PR itself classified as full impact and ran the entire deep lane successfully.

This closes the original universal-vs-scoped deep-verification question, but it opens a stricter performance question. The current target is now **≤35 seconds wall-clock for a full-impact PR while preserving the full selected validation contract**.

CI run 35955087367 is the initial reference point: roughly **96 seconds** from first required runner start to final deep-lane completion. That is about 2.7× the new ceiling. The next audit phase therefore treats the current lane packing as a baseline rather than a preferred architecture.

The remaining work is not justified by lower defect value. It is justified by critical-path cost. Historical catch evidence continues to constrain what may be moved or transformed: the #1722 solver-semantic unique-catch class, router-authority full fallback, and representative 4/4 semantic fault-injection set remain safety oracles while execution is redesigned.
