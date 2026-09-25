# Cross-program convergence backlog

> **Status:** active
> **Created:** 2026-09-25
> **Scope:** cross-cutting lessons from the September 20–25 CI, Hint/provenance, solver-research, plan-quality, and execution-efficiency work.
> **Authority boundary:** this backlog does not reorder live scientific questions. `docs/solver-optimization-workstreams.md` owns solver-science priority; `docs/ci-35s-critical-path-plan.md` owns CI latency execution; `docs/ci-impact-routing-plan.md` owns validation selection/routing; `docs/solver-research-execution-efficiency-plan.md` owns research execution cost/reproducibility. This file owns cross-program follow-through where the same lesson should be applied in more than one domain.

## Why this exists

The last five days repeatedly produced the same structural lesson through different programs:

- CI: execute only the proof a change can actually invalidate;
- research: acquire only evidence that can discriminate the live alternatives;
- Hint consolidation: persist one canonical semantic fact with explicit identity/lineage;
- plan quality: every completion claim needs an executable proof and complete population;
- caching/materialization: reuse only exact generations and make hidden dependencies observable.

Those lessons have not yet propagated uniformly. This backlog records the remaining cross-program transfers so they are not lost once the current WS1/CI work closes.

## Ordering rule

Do not create a parallel infrastructure campaign that starves live solver science.

Near-term order:

1. finish PR #2122 and dispatch the single frozen WS1 confirmation;
2. keep current WS2 promotion/confirmation gates moving;
3. execute the highest-leverage convergence audits below;
4. only generalize a framework after repeated concrete pilots show the same structure.

## CP-1 — research evidence cadence and ownership audit

### Question

Which recurring research/evidence workflows are proving valuable facts at a cadence broader than the claim actually requires?

### Scope

Inventory recurring or routinely-dispatched:
- censuses;
- production replays;
- capability refreshes;
- canaries;
- integrity guards;
- evidence harvesters;
- stress refreshes;
- query/index rebuilds;
- reconciliation jobs;
- derived-resource refreshes.

For each, record:
- exact claim/invariant owned;
- canonical producer/owner;
- invalidating inputs;
- current trigger/cadence;
- last unique decision value;
- whether the claim is current correctness, scientific uncertainty, effectiveness characterization, historical reproducibility, evidence freshness, population drift, integrity/governance, or derived-resource maintenance.

### Decision categories

Classify the correct cadence as one of:
- every relevant source change;
- every evidence-generation change;
- after a named scientific gate;
- periodic;
- manual/forensic only;
- retire/no automatic execution.

### Exit

- machine-readable inventory or audit report;
- no recurring workflow whose cadence is justified only by history/comfort;
- every moved obligation names its new owner and retained proof.

### Trigger

Start after the current WS1 confirmation dispatch/closeout unless an earlier workflow-cadence defect directly blocks live science.

## CP-2 — research semantic freshness / invalidation pilot

### Question

What exact code/config/data authorities can make a retained scientific result stale?

### Initial pilot

Choose three expensive/current evidence families, preferably:
- one level-blind capability family;
- one history-aware/portfolio family;
- one derived/census family.

For each result family:
- enumerate semantic inputs;
- distinguish solver behavior from evidence transport/persistence;
- identify code/config/data changes that invalidate comparability;
- identify changes that do **not** invalidate the scientific result;
- make the dependency relation inspectable mechanically where feasible.

### Principle

Do not build a universal invalidation engine first. Prove value on concrete result families.

### Exit

- three explicit invalidation/freshness contracts;
- at least one example where current coarse freshness would have caused gratuitous reacquisition or incorrectly retained evidence;
- recommendation on whether repeated structure justifies a shared mechanism.

## CP-3 — proof-ownership / duplicate-proof census

### Question

Where does the repository independently re-prove weaker versions of an invariant already owned by a stronger canonical proof?

### Candidate invariants

- Hint semantic validity;
- experiment/source-run identity;
- corpus/population validity;
- workflow lifecycle completeness;
- research-resource registration;
- evidence/publication completeness;
- plan-quality closure;
- runtime identity;
- solver-result integrity;
- generated-data consistency.

### Method

For each important invariant:
1. name the strongest canonical proof;
2. find all weaker/parallel checks;
3. classify each as:
   - unique complementary proof;
   - cheap early failure / UX improvement;
   - migration-era duplicate;
   - obsolete weaker authority;
4. remove or narrow only when the canonical owner fully protects the invalid state.

### Exit

- proof-owner map;
- redundant proof removals/narrowings where safe;
- current docs/scripts refer to one owner per invariant.

## CP-4 — derived-resource generation ownership audit

### Question

Are reusable derived artifacts published by the process that actually creates the authoritative generation, or by adjacent consumers that can race/stale?

### Candidate resources

- runtime-data / runtime-Hint caches;
- research indexes;
- capability summaries;
- second-order census products;
- query snapshots;
- reconciled evidence bundles;
- execution manifests;
- derived benchmark profiles;
- resource registries generated from source evidence.

### Method

For each resource:
- canonical source generation;
- canonical producer;
- publication point;
- exact generation identity;
- consumers;
- miss/rebuild behavior;
- stale-generation failure mode.

### Exit

- adjacent-consumer ownership defects repaired;
- one canonical publication owner per derived resource;
- reuse key binds the actual authoritative generation.

## CP-5 — governance-check historical-value audit

### Question

Which permanent repository guards still uniquely prevent a possible bad state, and which are sediment from migration/refactor history?

### Scope

Review validators/guards introduced by:
- naming cleanup;
- Hint/provenance consolidation;
- CI routing/speed work;
- research-system hardening;
- plan-quality implementation.

For each guard:
- exact bad state prohibited;
- present architecture capable of producing that state?;
- invalidating paths;
- stronger overlapping owner?;
- unique catches since underlying refactor?;
- migration scar vs durable invariant.

### Exit

- keep durable unique protections;
- move forensic/migration-only checks to manual or delete;
- avoid perpetual per-PR tax for impossible historical states.

## CP-6 — phase-local hostile sampling in plan quality

### Question

Can large plans catch population/consumer/topology omissions while implementation context is still local, rather than only during final hostile closeout?

### Proposed addition

At the end of each major phase of a substantial plan, perform a bounded independent sample:
- reconstruct one claimed population from repo truth;
- attempt one adversarial bypass of a key guard;
- inspect one downstream consumer/transport not named by the implementation report.

This is **not** a full hostile audit every phase.

### Exit

Update the plan-quality standard/template only if the bounded sampling adds signal without recreating ceremony. Definitions of done should identify which phases require it and what executable evidence records completion.

## CP-7 — research cost-of-knowing queryability

### Question

Can the research system answer how much acquisition work a question required and how often that evidence paid off later, without inventing an ROI score?

### Factual substrate

Join, where already available:
- research question;
- experiment/run identity;
- population;
- work/node/wall/runner cost;
- evidence/result;
- downstream consumption / later questions;
- reacquisition vs reuse;
- stopped/negative/positive outcome.

### Questions this should support

- Which question classes repeatedly require expensive new acquisition before the first discriminator?
- Which retained resources answer later questions without reacquisition?
- Which experiments mostly establish non-participation?
- Where does orchestration/bootstrap dominate small pilots?
- Which evidence assets have unusually high downstream reuse?
- Where is solver work repeatedly purchased for a plumbing/identity question?

### Constraint

Do not introduce a global ROI ranking or automatic prioritization score. First make factual cost/reuse joins queryable.

### Exit

- one minimal query/report over existing evidence;
- at least two historical examples demonstrating useful retrospective insight;
- decision whether additional persistent cost metadata is justified.

## CP-8 — remaining CI structural pursuits, evidence-gated

Do **not** resume generic CI micro-optimization merely because ideas remain.

If the bounded p50/p90 confirmation still misses the target, investigate in this order:

### Vitest collection/import/setup architecture

Separate:
- module collection/import;
- shared setup;
- corpus/fixture initialization;
- actual test execution.

Look for repeated heavyweight initialization after individual slow tests have already been reduced.

### Per-Node-shard data materialization

Prove the minimum runtime-data surface each Node owner shard needs. In particular, continue the already-observed possibility that shard A can remain substantially data-light while shard B owns broader data contracts.

### Compute class

If useful work is already within budget but shared-runner variance alone breaks p90, prefer reserved/larger compute over deleting merge-safety evidence.

### Exit

Only open new CI work when the timing distribution names a repeatable limiting mechanism.

## Relationship to current live work

### Immediate

- PR #2122 / WS1 one-shot confirmation remains first.
- WS2 repair-node-cap matched-work confirmation and CID-0027/CID-0028 promotion/safety decisions remain higher scientific priority than generic infrastructure polishing.

### Already substantially applied

- exact runtime identity;
- targeted sparse materialization;
- exact dependency-tree reuse on one short orchestrator;
- search-vs-plumbing separation;
- canonical generation ownership for current CI caches / Hint persistence;
- semantic impact routing in CI;
- hostile final closeout / executable plan quality.

### Not yet complete

- CP-1 through CP-7;
- CP-8 only if CI timing evidence reopens it.

## Completion rule

This backlog is not complete when every item has produced code. It is complete when each item is either:
- implemented and integrated;
- closed negative with retained evidence;
- superseded by a stronger concrete mechanism;
- or explicitly deprioritized because live evidence shows lower value than current scientific work.

Every closeout must reconcile this file and whichever authority owns the affected domain.
