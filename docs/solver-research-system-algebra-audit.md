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

## A. Evidence applicability — **IMPLEMENT SMALL CONSERVATIVE COMPOSITION**

Current primitive: `research-evidence-applicability-lib.mjs`.

The domain is already explicit:

`admissible > context-bound > inadmissible`

for a **fixed evidence purpose/regime**. Combining evidence classifications for one use cannot be stronger than the weakest required constituent. This is a small meet operation, not a global evidence-quality score.

Useful law:
- identity: combining only `admissible` remains admissible;
- weakening: adding `context-bound` weakens to context-bound;
- absorbing bottom: any required `inadmissible` constituent makes that combined use inadmissible;
- commutative/idempotent/associative within one declared purpose.

Boundary: classifications from different purposes must be reclassified before combination. There is no timeless global applicability value.

**Action:** add a tiny conservative combine helper + tests.

## B. Population identity sets — **IMPLEMENT SET RELATION, NOT A POPULATION ONTOLOGY**

Current primitive: `research-population-identity-lib.mjs`.

Canonical identity sets recur throughout residuals, matched cohorts, block exclusions, capability overlap, family scopes and integrity checks. The missing reusable operation is not another population type; it is safe set comparison after identity-domain agreement has already been established by the caller.

Useful relations:
- equal;
- proper subset / proper superset;
- overlap;
- disjoint;
- intersection / left-only / right-only counts and identities.

This helps prevent prose/manual mistakes such as impossible union counts and makes scope changes explicit.

Boundary: the primitive must not infer that two identity arrays share a semantic domain. Corpus/identity-basis compatibility remains the consuming contract's job.

**Action:** add a canonical identity-set relation helper + tests. Do not add automatic cross-domain union/hash behavior.

## C. Research-block consumption — **STRONG ALGEBRAIC MODEL, NO NEW CODE YET**

Current primitive: `solver-research-block-lineage.mjs`.

The block machinery already enforces a form of linear resource semantics:
- copying an artifact does not create fresh independent evidence;
- a consumption event monotonically adds lineage history;
- confirmation/transfer eligibility for a decision lineage can move from untouched to consumed, never be restored by deleting interpretive context;
- development evidence remains reusable.

This resembles an affine/linear resource more than an ordinary mutable status.

Why no new abstraction now:
- eligibility depends on question lineage and scope, not just a scalar spent/unspent bit;
- an unrelated question can still be eligible when lineage independence is explicitly supplied;
- evidence roles are not a simple total order.

**Next useful probe:** audit real `research:record-consumption` call sites for ad-hoc “fresh/spent” logic or accidental block copying. If duplicate semantics recur, add a derived consumption-state view, not a new canonical store.

## D. Observability envelopes — **PRODUCT STRUCTURE EXISTS; COMPOSITION SEMANTICS NOT YET EARNED**

Current primitive: `research-resolution-envelope-lib.mjs`.

The eight axes form an explicit product space and readiness is already a conjunction over required axes. The tempting next operation is evidence-source composition: one artifact establishes eligibility/opportunity, another fidelity/coverage, etc.

But axis merge semantics are not yet uniform:
- `satisfied` in one artifact may legitimately repair `unknown` in another;
- `blocked` can mean that *that instrument* was blocked, not that the question is globally blocked;
- fidelity/coverage often need joint identity/protocol conditions before evidence can be pooled.

A naive per-axis max/min would manufacture entitlement.

**Next useful probe:** inventory resolution-envelope producers and identify cases where a decision currently composes multiple envelopes by hand. Only then define a typed bundle-composition contract carrying source identity and compatibility proof.

## E. Independence vectors — **PARETO IDEA IS REAL; AXIS ORDER IS ABSENT**

Current primitive: `research-independence-vector-lib.mjs`.

The vector deliberately has no aggregate score. That is correct. A Pareto/dominance relation would be useful only if each axis had an explicit ordered vocabulary such as “same sample < fresh sample” for the exact claim context.

Today the axis values are intentionally free-form prose. Therefore generic dominance is undefined.

**Next useful probe:** inspect repeated independence-vector values across current reports. If two or more axes already use stable recurring categories, normalize only those axes. Do not invent an overall independence score.

## F. Claim derivation / invalidation — **GRAPH CLOSURE IS PROMISING; GLOBAL CLAIM GRAPH IS MISSING**

Current primitive: `research-claim-lib.mjs`.

A claim capsule owns material derivation edges and direct bounded reverse invalidation. This is already graph semantics at one node.

The natural extension is a transitive **reevaluation closure**:
changed dependency -> directly affected claims -> materially dependent descendant claims.

Important invariant: closure means “must reconsider,” never “automatically rewrite conclusion.”

Why no implementation yet:
- claim capsules are not yet a single authoritative global relation surface;
- relation kinds have different transitivity semantics;
- crossing question/report/claim authorities risks inventing ancestry.

**Next useful probe:** inventory persisted claim capsules and whether downstream claims actually reference upstream claim identities. If a real multi-hop chain exists, add a derived read-only closure view with relation-specific composition rules.

## G. Research-unit topology — **QUOTIENT/PARTITION MODEL IS USEFUL BUT DATA IS ONLY VOCABULARY**

Current primitive: `research-unit-topology-lib.mjs`.

Observation -> dependence cluster -> analysis/generalization units often behaves as quotienting observations by a dependence relation. This could mechanically catch pseudoreplication and invalid unit inflation.

Today the primitive intentionally stores only unit *names*, not observation-to-cluster mappings. There is therefore no actual partition to validate.

**Next useful probe:** find studies that already persist observation IDs plus parent/family/cluster IDs. If multiple consumers independently collapse the same mappings, add a partition helper that checks refinement/coarsening and counts; do not expand the vocabulary object itself into a study framework.

## H. Research relation graph — **TYPED RELATION ALGEBRA ONLY, NEVER GENERIC TRANSITIVE CLOSURE**

Current surfaces: `research-question-relations.json`, premise-map edges, `research-relations-lib.mjs`.

Some edges plausibly compose:
- duplicate/equivalence-like relations;
- material derivation/dependency;
- supersession in carefully scoped authority contexts.

Others do not:
- `triggeredBy`;
- `negativeControlFor`;
- `calibratedBy`;
- generic `constrainedBy`.

A generic graph closure would fabricate scientific relations.

**Next useful probe:** produce a relation-kind table with symmetry/transitivity/inverse rules only for relation kinds that already have explicit semantics. The current reciprocal `calibratedBy/calibrates` validator is a good model: encode one law at a time.

## I. Evidence-role lifecycle — **DO NOT ORDER DEVELOPMENT / CONFIRMATION / TRANSFER**

Current primitive: `research-evaluation-evidence-role-lib.mjs`.

The three roles are categorical purposes, not levels. Transfer is not “better confirmation”; development evidence can be exact; confirmation can be in-distribution; transfer answers a different claim.

**Disposition:** explicitly reject a total-order/lattice treatment. Algebraic neatness here would damage evidence semantics.

## Cross-line methodology

For every proposed research-system operator:

1. identify the carrier domain and owner;
2. state identity, absorbing, monotonicity, symmetry, transitivity, or closure laws only where actually meaningful;
3. construct smallest counterexamples to over-strong laws;
4. search current consumers for duplicated manual logic;
5. prefer a pure derived helper over another persisted authority;
6. add property-style tests for algebraic laws when the operation is implemented;
7. document domain boundaries so callers cannot compose objects from incompatible purposes/protocols/identity bases.

## Priority after first audit

1. **Implement now:** applicability meet; population identity-set relation.
2. **Investigate next:** block-consumption call-site audit; observability-envelope multi-source composition census.
3. **Then:** claim-chain persistence/closure; independence-axis normalization census; unit-partition recurrence.
4. **Keep guarded:** typed question/premise relation laws.
5. **Explicit non-goal:** evidence-role ordering or a generic “research algebra framework.”

The useful end state is a handful of small semantic operators that make invalid research transformations difficult, not a new abstraction hierarchy.
