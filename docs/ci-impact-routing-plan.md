# CI impact routing and validation architecture plan

> **Status:** implementation active.
> **Started:** 2026-09-21.
> **Goal:** make validation proportional to the repository surfaces a change can invalidate, while preserving conservative correctness and a full-validation oracle.

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

## Current next gate

**Phase 0 is complete.** Validation ownership is exact and mechanically guarded: 28 permanent validators and 165 Node/CLI harnesses are registered without omissions or duplicates.

**Phase 1 source-impact hardening is complete enough for shadow operation.** Current branch state:

- zero unclassified paths across the current tracked tree (**10,297 blobs** at the latest structural sweep);
- permanent tracked-path coverage validation;
- explicit full-impact precedence over derived harness ownership;
- rename/delete/copy-safe Git change parsing;
- semantic script-only `package.json` classification with non-script changes remaining full;
- registered harness entrypoint ownership derived from the validation registry;
- first-class `persistence` impact, separating Firestore boundary cost from generic game work;
- real `--git-diff <base> <head>` classification;
- data-driven validation planning;
- 27-PR historical replay: **18/27 scoped candidates, 9/27 earned full-impact**;
- modeled execution consequence: **16/27** historical PRs skip the deep runner, **17/27** skip build/canary/heavy solver proofs, and **18/27** skip Firestore.

Evidence:
- [foundation result 001](../reports/2026-09-21-ci-impact-routing-foundation-result-001.md)
- [historical backtest 002](../reports/2026-09-21-ci-impact-routing-historical-backtest-002.md)
- [shadow readiness result 002](../reports/2026-09-21-ci-impact-routing-shadow-readiness-result-002.md)
- [scoped execution historical economics 003](../reports/2026-09-21-ci-scoped-execution-historical-economics-003.md)

**Phase 2 measurement/shadowing is active.** `.github/workflows/ci.yml` now contains non-gating, dependency-free `impact-shadow`. It reports what validation would be selected while `fast-gate` and `deep-verification` still run unchanged. Router failure is non-gating during this phase.

The parallel-script runner also supports opt-in `PATHFINDER_PARALLEL_JOBS=<N>` bounded concurrency, but the historical unbounded default remains unchanged until representative 4/8/16/unbounded measurements justify a new default.

The execution layer is now modeled separately in `scripts/ci-execution-plan.json` / `scripts/ci-execution-plan.mjs`:

- `fast-gate` remains the always-materialized installed-dependency lane in the first scoped version;
- `deep-verification` becomes a whole-job skip candidate only when coverage, deep proofs, and Firestore boundary are all unnecessary;
- the future single required status is `ci-success`, evaluated with `if: always()`;
- `impact-shadow` and `fast-gate` must succeed;
- `deep-verification` may be either `success` or deliberately `skipped`; failure/cancellation is never accepted.

The validation-plan parity checker now also proves every expensive capability belongs to exactly one execution lane and the final-status acceptance contract is structurally conservative.

`main-push-validation.yml` now also shadows the same impact model over the complete push event range while leaving its broad safety-net validation untouched.

`ci-scoped-dry-run.yml` now provides a manual end-to-end activation rehearsal over explicit base/head refs. Its job/capability/always-on/final-status structure is mechanically checked against the execution plan. Ordinary PR CI remains unchanged.

**Next:** collect shadow outcomes across real non-router PR shapes, run representative manual scoped dry-runs, and benchmark Node-harness concurrency. Do not enable skipped validation until those empirical gates are green and the final required status is deliberately promoted into ordinary PR CI.
