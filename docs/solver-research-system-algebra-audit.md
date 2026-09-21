<!-- agent-context-budget: warn=7000 max=9000 -->
# Solver research-system algebra audit

> **Status:** ACTIVE HARDENING AUDIT; research semantics first, no generic algebra framework.
> **Scope:** current shared research primitives and their real composition/consumption seams.
> **Method owner:** [solver research operating model](solver-research-operating-model.md).
> **Related concept program:** [small exact projections](solver-small-exact-projections-program.md).

## Why this audit exists

The parity/exact-projection work exposed a useful research-system question:

> When research objects are transformed, combined, consumed, grouped, or invalidated, which properties are preserved, weakened, or forbidden?

The current research system already has several small semantic domains with exact invariants. Some are ready for explicit composition operators; others intentionally expose only vocabulary because the missing relation semantics are study-specific.

Do **not** build a generic algebra layer. Promote an operator only when:
1. its domain/order law is unambiguous;
2. at least two real consumers repeat the same semantics or the operator prevents a known research error;
3. the operation is conservative and testable;
4. specialist ownership is preserved.

## A. Evidence applicability — **IMPLEMENTED**

Purpose-local meet: `admissible > context-bound > inadmissible`, with algebraic-law tests. Use only for genuinely conjunctive requirements already classified for the same purpose/regime. Hint/failure observations are usually alternatives, so do not aggregate them with this meet.

## B. Population identity sets — **IMPLEMENTED**

Canonical same-domain relation: equal, proper subset/superset, overlap, disjoint, plus intersection/difference/union detail. Callers still prove identity-basis compatibility. Capability-evidence reuses it for generic historical/pairwise overlap; policy-specific greedy coverage remains local.

## C. Research-block consumption — **AUDIT CLOSED**

Consumption is monotone/scoped; immutable source blocks plus sidecars remain canonical. A summary view and `summarizeResearchBlockUsageOverlap()` report consumption and proposed-parent overlap, including unresolved family scope. Both are diagnostic; `researchBlockEligibility()` remains authoritative. No spent/unspent state machine.

## D. Observability envelopes — **CENSUS NEGATIVE**

Current producers do not require same-question multi-envelope composition: they reconcile inputs before one envelope or emit distinct-question envelopes. The exploratory helper was removed. Reopen only when independent artifacts for one question/interpretation contract must jointly establish resolution; require typed compatibility, never axis max/min.

## E. Independence vectors — **ORDER ABSENT**

No aggregate score. Pareto relations become meaningful only after an axis earns a stable ordered vocabulary; current values remain study-authored prose. Never compare raw strings.

## F. Claim derivation / invalidation — **NOT EARNED**

Direct dependencies exist, but no authoritative persisted claim→claim chain does. Revisit when such edges appear. Any closure means “reconsider,” never “rewrite.”

## G. Research-unit topology — **NARROW GROUPING PRIMITIVE EARNED**

The full quotient/partition model is still not earned: `unitTopology` names units but does not persist a universal observation→cluster map.

A smaller repeated operation *is* real. Reserve-starvation and Class-3 dose analysis both group observation rows by an explicitly supplied parent/independent-unit identity before interpreting repeated measures. `research-observation-integrity-lib.mjs` now owns `groupResearchObservationsByUnit(rows, unitOf)`, which reports canonical unit IDs, repeated units and missing-key row indexes without assigning scientific meaning.

Both live consumers now reuse it. Refinement/coarsening algebra remains deferred until actual nested partition mappings recur.

## H. Research relation graph — **AUDIT CLOSED; DERIVED TOPOLOGY VIEW IMPLEMENTED**

`calibratedBy/calibrates` remains the one explicit inverse pair. `implies` and `triggeredBy` are not inverses: they represent epistemic bearing versus research genealogy.

The question-authority audit now exposes mirrored, implication-only, and trigger-only directed pairs as a read-only diagnostic. It never creates relations or closure.

`negativeControlFor` stays directed/non-transitive by default; `supersedes` and `duplicateOf` have no live edges, so no stronger laws are earned. Relation kinds remain directed/non-transitive unless their owner explicitly declares otherwise.

## I. Evidence-role lifecycle — **EXPLICIT NON-GOAL**

Development, confirmation and transfer are purposes, not levels. Transfer is not “better confirmation.” Reject a total-order/lattice treatment.

## Deferred-abstraction tripwires

A deferred abstraction should have an observable reopen condition rather than depending on somebody remembering it.

Cheap future integration-audit signals worth adding when their source surfaces become queryable:
- first persisted claim→claim identity edge -> reconsider transitive reevaluation closure;
- two independent envelopes for the same question + interpretation contract -> reconsider typed envelope composition;
- repeated nested observation→cluster mappings across studies -> reconsider partition refinement/coarsening;
- stable repeated categorical values on an independence axis -> reconsider an axis-local order/Pareto relation.

These are **tripwires, not implementations**. A signal means “audit the abstraction again,” never “auto-promote a framework.”

## Cross-line methodology

For each proposed operator: name the carrier domain/owner; state only laws that are meaningful; attack over-strong laws with counterexamples; find duplicated current logic; prefer pure derived helpers over persisted authority; test algebraic laws; and document compatibility boundaries.

The standard is prevention of real research errors, not mathematical elegance.

## Priority after first audit

- **Done:** applicability meet; population set relation; capability-evidence set migration; block-consumption summary + scoped overlap diagnostic; independent-unit grouping shared by two analyses; relation-law audit.
- **Next:** claim-chain persistence only when real claim→claim identity edges appear. Full partition refinement/coarsening and envelope composition remain deferred until real consumers appear.
- **Then:** claim-chain persistence, independence-axis categories, unit-partition recurrence.
- **Guarded:** typed relation laws.
- **Never implied:** evidence-role ordering or a generic algebra framework.

Target: a few small operators that make invalid transformations difficult.
