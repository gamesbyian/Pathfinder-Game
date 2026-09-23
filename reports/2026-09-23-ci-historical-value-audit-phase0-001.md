# CI historical value audit — Phase 0 implementation and incident seed

**Date:** 2026-09-23  
**Status:** active investigation  
**Plan:** [CI historical value and cadence audit](../docs/ci-historical-value-audit-plan.md)

## What now exists

Phase 0 has executable infrastructure rather than only a plan:

- `scripts/ci-history-collector.mjs` exhausts retained `ci.yml` and `main-push-validation.yml` run history through the GitHub API, walks attempts/jobs/steps, attaches PR changed-file metadata, and records retrieval gaps explicitly.
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
