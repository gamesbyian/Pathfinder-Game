# Queue readiness and artifact reconciliation

> **Status:** active
> **Last evidence:** 2026-08-24 — `main` at `953398f6ad4b7b085f3b465f6d83882a5e2e7502`, recent merged research/instrumentation work, current persistence code, and Actions run `32526927206` including raw shard and combined artifacts
> **Decision:** do not duplicate the August 24 static P0 audit. Current `main` already has the admissible-order research-observer seam needed for a first-order checksum, but the historical `e5034e8c433eb32ab6d1882d80271dc277b91b0f` reproduction still needs an isolated historical harness/backport. For scheduler repricing, the current persistence **contract** is ready, but no inspected full-corpus artifact materializes the current per-attempt `actionKey`/work-ceiling/`workSpent` contract; one current decision-bearing materialization is therefore required before the fixed-work join.
> **Remaining gate:** P0: reproduce one of the eight historical admissible-order anomalies at the historical commit with matched resource/config context and first-child ordering. Scheduler: materialize a current fixed-work development run using the existing attempt projection, then join those attempt rows to the frozen census tranche evidence.
> **Evidence role:** forensic
> **Selection:** observational — this reconciliation specifically checked whether recently merged work or already-existing artifacts had already satisfied the live queue gates.

## Why this check was necessary

The canonical queue and August 24 readiness reports were written while several related branches were still landing. Before beginning another P0 or scheduler investigation, the first task was therefore to establish whether the proposed work had already been completed in recent commits or existed in Actions artifacts but had not yet been reconciled into the live docs.

That check changed the execution plan materially.

## Recent-commit reconciliation

The current baseline inspected here is `main` at `953398f6ad4b7b085f3b465f6d83882a5e2e7502`, after the August 24 research-integration merge and the diagnostics/tooling-health merge.

Most importantly, commit `897443b762c4913b380bdf9ea16753ee9bc968ad` already performed the broad static lifetime/accounting audit around the P0 admissible-order anomaly. Repeating another broad state-ownership review would therefore be duplicate work. The remaining P0 value is the narrow executable historical comparison already specified in [`2026-08-22-technique-census-reverse-oracle-diagnosis.md`](2026-08-22-technique-census-reverse-oracle-diagnosis.md).

Current `modules/solver/admissible-order-search.ts` also already reports sibling ordering/slack through the opt-in `PrepLevel._orderingResearchObserver` seam. [`../modules/solver/README.md`](../modules/solver/README.md) documents that observer as diagnostic-only and not read by search policy. Therefore the current-tree P0 prerequisite is not "invent ordering instrumentation." The practical missing piece is making the same checksum available to the historical target commit/control harness without changing the search semantics being diagnosed.

### Historical false lead explicitly excluded

`modules/solver/lower-bounds.ts` documents an older shared MST scratch-buffer bug in which sufficiently large must-pass-style calls could read stale edge data left by a previous call. That failure mode is genuinely history-dependent and superficially resembles P0.

It does **not** explain the eight August admissible-order anomalies: the scratch-buffer defect was fixed on July 9, before the historical target commit `e5034e8c433eb32ab6d1882d80271dc277b91b0f`. Keep it as useful precedent for why shared lower-bound state deserves scrutiny, but do not reopen it as the mechanism for these rows.

## Scheduler artifact audit

The scheduler evidence audit correctly identifies the **current code contract**. `scripts/portfolio-solve-sweep-lib.mjs` now projects:

- canonical `actionKey`;
- stage/config/gate/seed identity;
- `allocatedWorkCeiling` and `allocatedNodeCeiling`;
- per-attempt `workSpent`;
- explicit outcome/censoring fields;
- row-level winner/failed action identities and total `workSpent`.

That is sufficient telemetry for the first fixed-work scheduler analysis once it has been materialized on a comparable population.

The distinction that needed checking was whether such a dataset already exists.

### Latest inspected full refresh: run `32526927206`

The still-live Actions artifacts for the August 21 refresh were inspected directly.

The combined artifact `solver-stress-refresh-combined` includes the committed-style per-level projection with row-level `workSpent`, `attemptCount`, winning configuration and failed-strategy labels, but it does not retain the full `attempts` array.

The raw shard artifacts do retain the `attempts` array. However, the inspected raw shard attempts from this run carry the older projection shape: stage/gate/profile/template, outcome, elapsed time, allocated wall budget, nodes, seeds and technique-specific flags, but **not** the current `actionKey`, `allocatedWorkCeiling`, `allocatedNodeCeiling`, or per-attempt `workSpent` fields required for cross-technique fixed-work repricing.

This is consistent with the run being produced from head `ce4fc98a6ec4e87060c740161ea800dd04970a2b`, before the current richer attempt projection was available.

Therefore:

> the scheduler telemetry implementation is ready, but the inspected decision-bearing dataset is not.

This is a smaller gap than another telemetry project, but a real one. The first scheduler step cannot honestly be described as pure analysis of an already-materialized current dataset.

## Corrected scheduler execution gate

Do **not** run another technique census. The frozen census already supplies the isolated cap/tranche and overlap evidence needed for the comparison side of the join.

Do **not** redesign action identity or termination telemetry. Current code already supplies them.

Do materialize one current fixed-work development dataset using the existing projection and a declared current solver/action contract. The run must preserve raw per-attempt rows with:

- `actionKey`;
- stage/gate/config/seed context;
- allocated work/node ceilings;
- actual `workSpent`;
- outcome and censoring semantics;
- predecessor/reach context;
- row-level total work and correctness status.

For the first tail/scheduler valuation, a baseline-failure-conditioned development population is legitimate if the claim is explicitly residual: it asks how to allocate work among actions after the frozen baseline has failed. A broad full-corpus run is useful for unconditional production accounting but is not logically required merely to price late residual actions.

Once those rows exist, perform the already-specified join/frontier analysis:

1. promoted-tail failed-work tax and residual/exclusive solves;
2. action/tranche continuation risk sets with natural exhaustion removed from later risk sets;
3. portfolio-cardinality curve with rare capability losses shown;
4. current fixed-work point versus measured static oracle/Pareto headroom;
5. one simple deterministic static repricing baseline;
6. sensitivity excluding P0/sequence-ambiguous admissible cells.

Only residual headroom after that static baseline can justify dynamic/survival/bandit scheduler machinery.

## Documentation staleness corrected

This reconciliation found and corrected three stale descriptions on the same branch:

- [`2026-08-24-scheduler-evidence-contract-audit.md`](2026-08-24-scheduler-evidence-contract-audit.md) had said current solver **artifacts** already carry the full per-attempt work contract. It now distinguishes current code capability from the latest inspected full-refresh materialization.
- [`2026-08-24-research-execution-readiness-reconciliation.md`](2026-08-24-research-execution-readiness-reconciliation.md) had described P0 as needing a new tiny instrumentation seam. It now records that current `main` already has `_orderingResearchObserver` and narrows the missing seam to historical-harness availability.
- `modules/solver/admissible-order-search.ts` had still called the search an unwired, unmeasured prototype. Its top-level comment now describes the production last-resort tier and existing validation history without changing search behavior.

## Disposition

The recent-commit check prevented two duplicate projects:

- another broad P0 static audit;
- another scheduler telemetry/schema design pass.

The remaining work is narrower than the previous readiness wording implied:

- **P0:** historical executable checksum/reproduction;
- **scheduler:** one current rich attempt-row materialization, then the already-designed fixed-work analysis.

Treat those as the next gates. Do not let the absence of a current materialized scheduler dataset expand back into a general instrumentation project.
