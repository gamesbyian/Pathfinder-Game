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

This is strong evidence against treating the two lanes as equal-value universal detectors. It is not evidence that deep verification is useless: the two unique catches are real and semantically important.

Observed runner time in retained detailed current-era jobs is already substantial:

- `fast-gate`: about **36.2 runner-hours**;
- `deep-verification`: about **32.1 runner-hours**.

These are **lower bounds**, because the exhaustive collector intentionally skipped full job details for ordinary successful runs. Completed non-cancelled observed medians were roughly 112s for fast gate and 91s for deep verification.

### Deep-only incident A — PR #1693 / run 34405094061

PR #1693, **“Retire obsolete CI and completed campaign scaffolding,”** passed fast gate but failed deep verification's ordinary covered test population.

The unique deep catch was a solver orchestration regression in the compatibility contract for legacy repair-probe option names normalizing to canonical early-repair-search overrides.

This is a real regression catch, not infrastructure or flake evidence.

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
