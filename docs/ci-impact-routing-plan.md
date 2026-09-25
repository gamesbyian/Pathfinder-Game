# CI impact routing and validation architecture plan

The research analogue of semantic invalidation/freshness and the repo-wide proof-ownership follow-through are tracked in [cross-program convergence backlog](cross-program-convergence-backlog.md), especially CP-2 and CP-3.

> **Status:** Phase 3 activated for semantic validator/Node groups and deep capabilities; Fast Gate remains always-materialized but its contract population is impact-scoped.
> **Started:** 2026-09-21.
> **Goal:** make validation proportional to the repository surfaces a change can invalidate, while preserving conservative correctness and a full-validation oracle.
>
> **Latency authority:** execution-topology and full-impact ≤35 s work now lives in [`ci-35s-critical-path-plan.md`](ci-35s-critical-path-plan.md). This document owns selection/routing, not runner topology.

## Why this exists

Pathfinder is simultaneously a browser game, a production solver, and a solver-research system. This program began when PR CI still validated nearly the entire product/solver/research stack on every change. That universal-gate state is now historical: semantic ownership selects validator groups, Node/CLI contracts, coverage, build, proofs, and Firestore obligations independently while preserving conservative full fallbacks.

This program changes the question from "which of three CI workflows should run?" to:

> What contracts can this change plausibly invalidate, and what is the cheapest safe execution plan for proving those contracts?

## Non-negotiable safety rules

1. **Unknown or ambiguous impact broadens validation.** Unclassified paths, routing/config changes, and unresolved ownership never silently skip checks.
2. **Routing is derived, never author-selected.** PR labels, commit messages, branch names, or manual "research-only" declarations are not authority for reducing validation.
3. **The current full gate remains available and equivalent.** Scope reduction is introduced only after parity/backtest evidence.
4. **Producer changes propagate downstream; consumer changes do not propagate upstream.** Production solver changes may require research-consumer contracts; research-analyzer changes do not imply production solver behavior changed.
5. **Execution topology and proof obligation are separate.** A semantic group may be required without getting its own hosted runner. Preserve the repo's hard-earned lesson that excessive runner fan-out increases tail latency.
6. **Periodic full validation audits the router.** Scoped PR validation is paired with recurring full-main validation so missed dependency edges become classifier defects rather than latent assumptions.
7. **Producer ownership is not downstream invalidation.** Prefer source rules that identify the changed producer's own surface. Encode specific downstream consumers with `contractSurfaces` / dependency metadata rather than escalating an entire consumer domain because some members depend on the producer.

## Validation surfaces

Initial semantic surfaces:

- **repo** — workflow/package/script reachability, documentation/infrastructure policy, repository hygiene.
- **game** — browser application, UI/render/input/controllers, persistence/runtime integration and production build.
- **solver** — production solver implementation, solver worker/orchestration, correctness proofs and capability canary.
- **research** — research authorities, experiment/evidence contracts, analysis/reconciliation tooling.
- **data** — runtime levels/themes/hints plus research populations/corpora/family assets; later split by data class where blast radius differs.
- **shared** — genuinely cross-cutting or not-yet-disambiguated contracts. Shared is intentionally conservative.

These are flags, not mutually exclusive PR classes.

## Inventory findings that shape implementation

### Static validators

The universal validator fan-out is already conceptually decomposable. Most checks are plain-Node and can potentially run before dependency installation. Type checking and the two tsx corpus/data checks require the installed toolchain.

### Node/CLI harnesses

`test:node` currently contains 162 independently launched package scripts spanning research-system contracts, solver tooling, data/hint/family tooling, repository/workflow contracts, app startup/persistence, and ambiguous cross-domain tools. This is the main semantic knot.

The current runner starts every child with unbounded `Promise.all()`. Benchmark bounded concurrency separately before changing it; do not assume more processes means lower wall time.

### package.json coupling

`package.json` is both product/dependency/build authority and the registry for a very large research/tool/test command surface. Research-only PRs therefore touch a globally important file merely to add a harness. Long term, separate tool/validation registration from product dependency/build authority or classify package diffs semantically.

### Alternate routing islands

`premise-map-hardening.yml` already uses path routing, while `main-push-validation.yml` universally repeats a broad fast gate after every main push. Both should eventually consume the same impact model rather than maintain independent trigger semantics.

## Implementation phases

### Phase 0 — machine-readable inventory, no skipping

**Purpose:** create one inspectable authority for validation ownership while preserving today's gate exactly.

- Add `scripts/validation-groups.json` with semantic ownership for current permanent validators and Node/CLI harnesses.
- Add a validator that proves every current member of `check:validators` and `test:node` appears exactly once in the registry and every registered command still exists.
- Add a group runner that can execute one or more semantic groups locally.
- Keep current universal aggregators authoritative. CI still runs everything.
- Document classification uncertainties under `shared`, not guessed narrower.

**Exit:** registry parity is mechanically checked and semantic group commands are usable without changing CI coverage.

### Phase 1 — source-impact model and backtest

- Add machine-readable source/path ownership and escalation rules.
- Distinguish runtime-shipped data, research populations/current authorities, derived current evidence, and historical reports.
- Treat CI/router/config/dependency authority changes as broad-impact.
- Add an impact classifier with adversarial tests: unknown path, rename/delete, mixed PR, new directory, router mutation, package dependency change, and package script-only change.
- Replay a substantial recent-PR sample and record predicted validation surfaces and reasons.
- Resolve surprising escalations by fixing repo ownership/coupling where appropriate rather than accumulating glob exceptions.

**Exit:** classifier is conservative on backtest and explains every selected surface.

### Phase 2 — repo shaping for cheap validation

- Split giant logical aggregators into semantic compositions backed by the registry.
- Keep governance/research metadata validators dependency-light where practical so docs/research-only changes can validate before `npm ci`.
- Reduce `package.json`'s role as universal research-tool registry, or introduce semantic diff handling with tests as an interim step.
- Benchmark bounded concurrency for `run-scripts-parallel.mjs` and repeated Node/npm startup cost.
- Consolidate repeated whole-repo scans or repeated large-asset loads where measurement shows material cost.

**Exit:** full CI remains equivalent but becomes cheaper and the common research-only path has a genuinely cheap validation substrate.

### Phase 3 — scoped PR execution

- Always run the classifier/meta-gate.
- Compute required semantic validation capabilities.
- Pack selected capabilities into a small number of hosted runners; do not create a job per group.
- Preserve one stable required final CI status even when domain jobs are skipped.
- Initially keep all production-solver deep proofs/canary together for any production solver impact.
- Unknown/unclassified/configuration impact receives full CI.

**Exit:** scoped PR CI is live with no missing required status and a documented full fallback.

### Phase 4 — unify push and specialist routing

- Apply the same classifier to `main-push-validation.yml` while preserving safety for direct/unprotected-main pushes.
- Fold premise-map hardening trigger semantics into the shared impact authority.
- Audit other maintained workflows for independent `paths`/routing rules that can drift from central ownership.

### Phase 5 — full oracle and routing telemetry

- Run the canonical full gate periodically and on manual dispatch.
- Record scoped-vs-full mismatches as impact-model defects.
- Emit routing reasons and escalation edges, not just booleans.
- Use repeated high blast-radius edges as architecture/coupling signals.

### Phase 6 — optional finer proof selection

Only after production routing is stable and measured:

- evaluate solver-proof-level ownership,
- evaluate coverage partitions,
- preserve conservative broad solver validation unless finer selection has direct contract evidence.

## Initial ownership policy

The Phase-0 registry is intentionally coarse. A test belongs to exactly one execution group for accounting, but its `surfaces` metadata may name multiple affected domains later. Ambiguous tools are placed in `shared` until their imports/contracts are inspected.

Do not optimize the registry by name alone. Names were sufficient for inventory triage, not final proof ownership.

## Production solver downstream routing — explicit-consumer activation

The original source-impact rule mapped `modules/solver/**` to both `solver` and `research` because research tooling consumes production solver behavior downstream. After semantic routing made that conservative edge economically visible, the branch migrated to the narrower representation: production solver paths select `solver`, while individual downstream contracts declare solver invalidation through `contractSurfaces` and explicit dependency metadata where needed.

Topology run 36103663827 emitted 59 exact lower-bound consumers from resolved imports and declared subprocess entrypoints. Those consumers are now explicitly tagged with `solver` invalidation and the production solver source rule selects only `solver`. Before declaring this settled:

- rerun the representative solver fault injection;
- replay the known #1722 solver-semantic unique-catch case or equivalent route oracle;
- compare a solver-scoped rehearsal against the prior `solver + research` population;
- inspect any broad-oracle miss for filesystem/generated/env dependencies not represented by static imports;
- retain conservative full fallback for routing authority/unknown impact and a broad oracle.

The production-solver source rule is now `solver` only and contract ownership carries downstream research invalidation. The remaining gates validate that activation; they are not prerequisites to a still-pending rule edit. If a gate fails, broaden the specific missing dependency/contract rather than restoring blanket `solver + research` escalation.

Treat this as the pilot for a general coarse-edge audit. Runtime data currently selects `data + game + solver + research`, and shared domain code selects `game + solver + research`. Those may be justified for some consumers, but the correct proof is contract invalidation, not an assumption that every contract in every downstream administrative surface must run.

## Activated deep execution packing

The execution plan now has four logical production lane classes, materializing as five runners when both Node owner shards are required:

- `fast-gate`: package/script reachability, textual invariants, selected non-lint validators, and lint;
- `node-contracts`: a two-entry owner-partitioned matrix for selected Node/CLI contracts;
- `deep-verification`: covered ordinary Vitest population only;
- `deep-services`: selected production build, hard-prune proofs, and Firestore boundary, overlapped on one runner where required.

This activation follows two clean independent Firestore samples (~22 s and ~18 s) and deliberately does **not** promote two-way coverage sharding, whose confirmation exceeded the 35 s threshold. The routing model exposes `deep_services_job_required` separately so scoped/manual rehearsal and production preserve the same capability ownership.

## Independent Node execution lane

Production Node/CLI contracts now run in a two-entry `node-contracts` matrix instead of serializing inside Fast Gate. The split is expressed through existing validation ownership rather than a permanent timing profile:

- shard A owns research/solver/game/persistence contracts;
- shard B owns shared/data/repo contracts;
- semantic surface selection happens first;
- execution-owner filtering then assigns each selected contract to exactly one shard.

A self-test requires the two shards to be disjoint and collectively exhaustive for the full Node authority. Planner failure requests every semantic surface and therefore reconstructs the full aggregate across the two shards.

## Measurement and success criteria

Track separately:

- PR wall time median and tail,
- hosted runner count and setup/install time,
- per-group command time,
- full-gate wall time,
- fraction of PRs by selected surface set,
- classifier fallbacks to full and why,
- periodic full-oracle mismatches,
- high-frequency cross-surface escalation edges.

The program succeeds when common research-only work avoids unrelated game/solver proof cost, broad product/solver changes remain strongly validated, and the routing model becomes easier to reason about than the universal gate it replaced.

## Current state and next gate

**Phases 0 through 2 are complete for the currently activated scope.** Ownership, impact classification, validation planning, execution packing, historical replay, live shadowing, manual scoped rehearsals, and semantic fault injection are all represented by maintained repository machinery.

Current production behavior:

- `fast-gate` remains an always-materialized runner, computes the semantic merge-diff plan locally, and executes package/script reachability, textual invariants, selected non-lint validator groups, and lint; routing failure falls back to the full validator authority;
- the historical solver capability canary is no longer an ordinary PR capability; solver effectiveness is owned by the experiment/promotion system;
- `node-contracts` is impact-scoped and partitions selected Node/CLI contracts across two disjoint execution-owner shards; routing failure reconstructs the full Node authority across both shards;
- `deep-verification` is impact-scoped and owns covered ordinary Vitest execution;
- `deep-services` independently selects build, hard-prune soundness proofs, and Firestore, with conservative full selection on planner failure;
- planner failure fails safe by running deep verification;
- manual `workflow_dispatch` runs deep verification;
- CI/router/config authority changes conservatively classify as full impact;
- `main-push-validation.yml` remains the broad direct-main/integration backstop and cache-generation seed path;
- dependency-local `contractDependencies` metadata is validated and measured but does not yet authorize production skipping.

Evidence supporting the deep-lane activation includes:

- the retained current-era history showed one demonstrated genuine branch-caused deep-only catch, PR #1722, and the current router selects deep verification for that solver-impacting change class;
- representative semantic fault injection now catches game, persistence, solver gate-interleaving, and router-authority defects, 4/4 after the missing interleaving invariant was pinned directly;
- research/data/repository-only historical and live samples repeatedly paid deep-lane cost without marginal detection;
- the broad main-push oracle remains in place to expose integration or routing omissions.

Phase 3 is now activated at the semantic-surface level for both Fast Gate contract populations and deep capabilities. Dependency-local skipping remains deliberately unactivated; the next routing question is whether individual semantic ownership is still too broad, not whether to return to universal aggregates.

### New latency constraint

The optimization target has changed from "remove obviously irrelevant work at acceptable complexity" to a hard critical-path objective:

> **A full-impact PR should complete its entire required validation contract in 35 seconds or less wall-clock.**

The original full-impact topology missed this goal badly, at roughly 96 seconds from first required runner start to last required validation completion. That architecture is historical. The current owner-routed/cache-first topology has now produced multiple <=35-second full-impact samples, including exact-head run 36196599695 at roughly 34 seconds. The stricter bounded-window declaration remains open because the canonical plan still requires p50 <=30 seconds and p90 <=35 seconds over comparable runs.

The target therefore remains an active distributional objective rather than a one-run milestone. Validation breadth stays protected; further work is driven by repeatable selected critical-path cost or runner-allocation variance, not by the historical universal-gate profile.

### Next gate

The staged execution plan is tracked in [`ci-35s-critical-path-plan.md`](ci-35s-critical-path-plan.md).

The original execution-architecture audit is substantially implemented. Current routing work should now follow the forward order in the 35-second plan:

1. continue the bounded comparable p50/p90 confirmation window;
2. act only on repeatable Node/coverage/deep-service tails, not one noisy hosted-runner sample;
3. finish the solver→research explicit-consumer routing proof, including the retained #1722-equivalent historical route oracle;
4. keep broad main/default-branch validation as the integration backstop;
5. if useful work is already within budget but hosted-runner variance still breaks p90, move to reserved/larger compute rather than deleting merge-safety proof.

The 35-second target does not authorize deleting tests, shrinking coverage, or weakening semantic proof obligations merely to meet the clock.

