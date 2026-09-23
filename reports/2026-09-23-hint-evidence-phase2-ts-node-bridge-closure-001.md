# Hint evidence consolidation — Phase 2 TypeScript/plain-Node bridge decision closure — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive (decision-only, no runtime behavior change)
>
> **Date:** 2026-09-23
>
> **Batch:** closes the last open item from
> [`2026-09-23-hint-evidence-phase2-identity-table-setting-001.md`](2026-09-23-hint-evidence-phase2-identity-table-setting-001.md)'s
> "Deliberately deferred" list and the mechanical-migration-audit's "reserved for Claude" TS-bridge
> question.
>
> **Base commit:** `0d0fde6`.

## 1. The open question

The mechanical-migration-audit's own "TypeScript to plain-Node bridge audit" section left one item
explicitly unresolved: "Whether runtime request default resolution can move to a neutral `.mjs` owner;
do not copy it. ... That is an architectural choice reserved for Claude."

## 2. Decision: decline the plain-`.mjs` projection builder, keep the current split

After the four preceding batches (level-blind and portfolio sweep producer migrations,
`check-effective-config-agreement.mjs` and `combine-solver-sweep-reports.mjs` consumer integrations,
the sweep-publisher source-run binding), the actual bridge need this plan anticipated has not
materialized: **every current producer that must construct a canonical solver-request projection is
already bundled or TypeScript-capable** (both migrated producers import
`buildCanonicalSolverRequestProjection` directly from `modules/solver/solver-request-projection.ts`).
Every plain-`node scripts/*.mjs` consumer identified by the audit (publishers, combiners, validators,
hint-discovery/failure queries) only ever needs to **hash or validate** an already-emitted projection,
which `scripts/solver-request-identity-lib.mjs` and `scripts/solver-request-identity-compat.mjs`
already do without touching TypeScript.

Building a plain-`.mjs` projection *builder* (as opposed to the existing digest/validator) safely would
require moving the solver's entire default-resolution authority — `stage-budget-core.ts`,
`ablation-config.ts`, `orchestration-early-repair.ts`, `orchestration-static-portfolio.ts`, and every
constant/function `solver-request-projection.ts` currently imports from them — to plain JS. That is an
extremely large, high-risk core-solver refactor, and per this plan's own change-recipe discipline it
would be pure speculative work: no real consumer currently needs it, only a hypothetical future one.
The repository's own engineering guidance is explicit about not building for hypothetical future
requirements.

## 3. What changed

Nothing in behavior. Added a "RESOLVED bridge architecture" doc comment to
`scripts/solver-request-identity-lib.mjs` (the file a future agent investigating this exact question
would most likely open first) stating the three-way split plainly — bundled producers construct,
plain-Node consumers only validate, a plain-`.mjs` builder is declined until a real need appears — and
pointing at the mechanical-migration-audit report for the full original survey. This is a documentation
closure, not new code: the point is to prevent this question from being re-opened and re-litigated by a
future agent who has not seen the four migration batches that already answered it empirically.

## 4. Verification

`node --check` and the module's own node-test — unchanged behavior, both pass. No other file touched.

## 5. Phase 2 status

With this closure, every item from the reconciliation report's "next work" list is now addressed except
raced-backend/first-success semantics in the execution-protocol layer (plan section K), which remains
open as the next substantive Phase 2 batch — it requires defining new reproducibility-mode vocabulary
and therefore its own naming/vocabulary occupancy pass (plan section 13.2) before implementation, unlike
every batch in this session's second half, which reused already-established names.
