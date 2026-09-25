# CI impact routing and validation architecture plan

> **Status:** Phase 3 activated for semantic validator/Node groups and deep capabilities; Fast Gate remains always-materialized but its contract population is impact-scoped.
> **Started:** 2026-09-21.
> **Goal:** make validation proportional to the repository surfaces a change can invalidate, while preserving conservative correctness and a full-validation oracle.
>
> **Latency authority:** execution-topology and full-impact ≤35 s work now lives in [`ci-35s-critical-path-plan.md`](ci-35s-critical-path-plan.md). This document owns selection/routing, not runner topology.

## Why this exists

Pathfinder is simultaneously a browser game, a production solver, and a solver-research system. Ordinary work is now dominated by solver research and research-system maintenance, but PR CI still validates the entire product/solver/research stack on every change.

The current gate is efficient at packing broad work into two hosted runners, but the work set itself is over-broad. A recent research-only PR still ran the production bundle build, production solver canary, the full covered implementation suite, heavyweight solver proofs, Java/Firestore validation, and the entire Node/CLI harness graph.

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

## Active coarse-edge audit: production solver → whole research surface

The current source-impact rule maps `modules/solver/**` to both `solver` and `research` because research tooling consumes production solver behavior downstream. After semantic Fast Gate activation, that conservative edge has become economically visible: it selects the entire research validator/Node group for every solver implementation change.

The router already supports a better representation: a source path can select `solver`, while individual downstream contracts declare solver invalidation through `contractSurfaces` (and explicit non-import dependency metadata where needed).

Do not narrow this edge from naming intuition. The dependency-local topology audit now emits an exact lower-bound `solverImplementationConsumers` list from resolved imports and declared subprocess entrypoints. Before changing the rule:

- inspect the emitted research-owned consumers;
- account for filesystem/generated/env dependencies not visible in static imports;
- add explicit solver surfaces only to genuine downstream consumers;
- replay the known #1722 solver-semantic unique-catch case;
- rerun the representative solver fault injection;
- compare a solver-scoped rehearsal against the current `solver + research` population;
- retain conservative full fallback for routing authority/unknown impact and a broad oracle.

If these gates pass, change the production-solver source rule to `solver` only and let contract ownership carry downstream research invalidation. This is semantic precision, not a blanket research-test demotion.

Treat this as the pilot for a general coarse-edge audit. Runtime data currently selects `data + game + solver + research`, and shared domain code selects `game + solver + research`. Those may be justified for some consumers, but the correct proof is contract invalidation, not an assumption that every contract in every downstream administrative surface must run.

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

- `fast-gate` remains an always-materialized runner, but computes the semantic merge-diff plan locally, executes only selected validator/Node-test groups, and runs the production build only when game/solver impact selects it; routing failure falls back to the full aggregates and build;
- the historical solver capability canary is no longer an ordinary PR capability; solver effectiveness is owned by the experiment/promotion system;
- `deep-verification` is impact-scoped under the semantic execution plan and independently selects coverage, hard-prune soundness proofs, and Firestore;
- planner failure fails safe by running deep verification;
- manual `workflow_dispatch` runs deep verification;
- CI/router/config authority changes conservatively classify as full impact;
- `main-push-validation.yml` remains broad and authoritative as the direct-main/integration backstop;
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

The current full-impact topology does not meet this goal. A recent full PR run took roughly 96 seconds from first required runner start to last required validation completion. The universal fast lane took roughly 79 seconds on its own and the deep lane roughly 85 seconds from its runner start.

This target changes the next phase from cadence refinement to execution-architecture work. Validation breadth remains protected; job topology, checkout/materialization, dependency setup, phase concurrency, sharding, worker reuse, and test/repository seams are all open to redesign.

### Next gate

The staged execution plan is tracked in [`ci-35s-critical-path-plan.md`](ci-35s-critical-path-plan.md).

Before another production routing reduction, complete the 35-second critical-path audit:

1. reconstruct per-step wall-time distributions from recent full-impact PR runs, including checkout, setup-node, cache restore, `npm ci`, validators, lint, Node/CLI contracts, solver canary, build, coverage, deep proofs, Java/Firebase setup, and Firestore;
2. explain the deep checkout outlier and measure the exact file/materialization cost of its sparse-checkout definition;
3. benchmark candidate lane topologies using the existing full validation contract, not a reduced substitute;
4. design runtime-balanced shards for Node/CLI contracts and covered Vitest work using measured command/file timings;
5. determine which setup costs can be shared, eliminated, prebuilt, or hidden behind useful parallel work;
6. audit solver-canary execution for safe internal parallelism/worker reuse;
7. model p50 and p90 critical paths, including hosted-runner startup variance;
8. only then preregister an implementation sequence capable of reaching the ≤35s target.

The 35-second target does not authorize deleting tests, shrinking coverage, or weakening semantic proof obligations merely to meet the clock. If a validation obligation cannot fit, first change how it is executed or make the underlying test boundary cheaper.

