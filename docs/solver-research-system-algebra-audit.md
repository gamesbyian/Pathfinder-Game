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

`research-evidence-applicability-lib.mjs` now exposes the purpose-local meet
`admissible > context-bound > inadmissible`.
Combining already-classified constituents for one use takes the weakest required value. Tests cover identity, weakening, absorbing inadmissibility, commutativity, idempotence and associativity.

Boundary: never combine classifications from different purposes/regimes without reclassification. This is not a global evidence-quality score. Current hint/failure classifiers mostly aggregate alternative observations, so they must **not** be migrated to this meet; the operator is for genuinely conjunctive evidence requirements.

## B. Population identity sets — **IMPLEMENTED**

`research-population-identity-lib.mjs` now exposes canonical same-domain set comparison: equal, left proper subset/superset, overlap, disjoint, plus intersection/difference/union counts and identities.

Boundary: callers still prove corpus/identity-basis compatibility. The helper deliberately does not infer semantic domain or auto-build cross-domain unions/hashes. Capability-memory now reuses it for historical-signature intersections and pairwise nomination overlap; policy-specific greedy coverage remains local.

## C. Research-block consumption — **AUDIT CLOSED; SUMMARY VIEW SUFFICIENT**

`solver-research-block-lineage.mjs` behaves like a scoped consumable resource: history grows monotonically; copying artifacts does not mint independence; confirmation/transfer eligibility is lineage/scope-sensitive; development remains reusable.

The call-site/docs audit found one canonical recording path: `research:record-consumption` writes sidecars, including matched-cohort parent scopes derived from selection artifacts, while source blocks remain immutable. No competing fresh/spent registry or alternate block mutation path is currently authoritative.

The relation model now exposes a pure consumption summary (question/role/scope counts, opened outcomes, decision refs, time span). That is enough for audit/orientation. Do not add a spent/unspent state machine or order evidence roles unless a second real consumer needs semantics the summary cannot express.

## D. Observability envelopes — **COMPOSITION CENSUS NEGATIVE; KEEP SINGLE-ENVELOPE OWNER**

The eight axes form an explicit product space, but current producers do not expose a real same-question multi-envelope composition problem:
- WS2 may read multiple raw evidence documents, then reconciles them before emitting one envelope;
- reserve-starvation emits one envelope under one frozen sample/interpretation contract;
- the parity shadow emits separate envelopes for separate questions.

Therefore the exploratory multi-envelope composition helper was removed before merge. A generic axis max/min remains unsafe because blockers can be instrument-local and fidelity/coverage require joint identity proof.

Reopen only when at least two independent artifacts for the same question/interpretation contract must jointly establish resolution. Then define a typed bundle contract with explicit compatibility proof rather than composing statuses by rank.

## E. Independence vectors — **PARETO IDEA REAL; ORDER ABSENT**

The no-score design is correct. Pareto dominance becomes meaningful only after individual axes have stable ordered vocabularies; today values are intentionally prose.

Producer inspection confirms the vector is commonly frozen and propagated intact, but axis values remain study-authored prose. Normalize only axes with genuinely repeated categories; never compare/order raw strings or synthesize an overall independence score.

## F. Claim derivation / invalidation — **PROMISING, NOT EARNED**

Claim capsules already encode direct material dependencies and bounded reverse invalidation. A transitive reevaluation closure would be useful, but there is not yet one authoritative persisted multi-claim graph and relation kinds need explicit composition laws.

Current WS2 claim production still derives from artifacts/contracts/protocols rather than upstream claim identities, so there is no real multi-hop claim chain yet. Revisit only when persisted claim-to-claim identity edges exist; closure would mean “reconsider,” never “rewrite.”

## G. Research-unit topology — **PARTITION MODEL BLOCKED ON MAPPINGS**

Observation -> dependence cluster -> analysis unit often is a quotient/partition. But the current primitive intentionally stores unit names, not observation-to-cluster mappings.

Next: find studies that already persist both observation and parent/family/cluster IDs. Repeated manual collapsing can earn a partition helper for refinement/coarsening and pseudoreplication checks.

## H. Research relation graph — **ONE LAW AT A TIME**

Generic transitive closure would manufacture science. Some relations may have explicit algebraic laws; others do not. The existing reciprocal `calibratedBy/calibrates` validator is the model.

Next: relation-kind table declaring symmetry/transitivity/inverse behavior only where already semantically justified.

## I. Evidence-role lifecycle — **EXPLICIT NON-GOAL**

Development, confirmation and transfer are purposes, not levels. Transfer is not “better confirmation.” Reject a total-order/lattice treatment.

## Cross-line methodology

For each proposed operator: name the carrier domain/owner; state only laws that are meaningful; attack over-strong laws with counterexamples; find duplicated current logic; prefer pure derived helpers over persisted authority; test algebraic laws; and document compatibility boundaries.

The standard is prevention of real research errors, not mathematical elegance.

## Priority after first audit

- **Done:** applicability meet; population set relation; capability-memory set migration + regression/ownership guards; block-consumption summary view.
- **Next:** claim-chain persistence and unit-partition recurrence only when real mapped data appears. Envelope composition is deferred until a real same-question multi-envelope consumer appears.
- **Then:** claim-chain persistence, independence-axis categories, unit-partition recurrence.
- **Guarded:** typed relation laws.
- **Never implied:** evidence-role ordering or a generic algebra framework.

Target: a few small operators that make invalid transformations difficult.
