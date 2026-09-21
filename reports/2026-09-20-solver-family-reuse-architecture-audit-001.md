# Solver family reuse architecture audit 001

> **Status:** static architecture conclusion; quantitative census tooling committed, execution pending.
> **Date:** 2026-09-20
> **Parent plan:** [`../docs/solver-batch-digestion-architecture-audit-plan.md`](../docs/solver-batch-digestion-architecture-audit-plan.md)
> **Evidence role:** solve-less / reuse-more architecture audit.
> **Decision:** use existing family provenance directly where constructive reuse is operationally allowed; do not build global symmetry canonicalization or consume family witnesses inside blind capability experiments.

## 1. Question

The batch-digestion audit asked whether historical computation can become a reusable asset rather than
being discarded after each solve.

Generated family datasets are the strongest existing place to test that idea because their parent-child
relationships are explicit rather than guessed from similarity.

The key question is not merely:

> can a sibling's known solution be reused?

It is:

> in which workflows is consuming that solution scientifically legal?

## 2. Family generation already carries constructive knowledge

`scripts/family-generate.mjs` requires a parent stored hint or stress witness.

Accepted descendants are not merely shape mutations. Before acceptance they are:

1. constructed from the parent;
2. fingerprint-deduplicated;
3. schema-checked;
4. referee-checked against the preserved or transformed witness;
5. stamped with family/provenance metadata.

The manifest records `witnessRelation`:

- `exact-coordinate` when the parent's witness coordinates remain valid;
- `transformed` when a known coordinate map is applied, for example symmetry or re-embedding.

Therefore many generated family variants are **constructively solved by generation contract** before any
solver benchmark runs on them.

This is not an inference from solver behavior. It is explicit provenance.

## 3. Operational reuse and research reuse are different

### Operational / data-maintenance context

If the task is simply:

> obtain a valid solution for this generated variant

then re-running the general solver is unnecessary when the family provenance already supplies a
referee-valid inherited/transformed witness.

The correct reuse path is family provenance / stored witness material.

A global structural solution index would add machinery around a fact already known at creation time.

### Blind solver-capability context

If the task is:

> measure whether the solver can solve this variant under configuration X

then consuming the family witness to skip search is invalid.

It would:

- leak the answer into the evaluated system;
- erase the very difficulty/response difference the family is meant to expose;
- convert a solver-capability measurement into a provenance lookup.

This remains true even when the witness is exact and perfectly valid.

The family integration plan already encodes the same epistemic boundary:

- descendants diagnose controlled sensitivity;
- they do not mint independent parent support;
- exposure/lineage is explicit;
- historical/family information must not become hidden runtime routing input.

## 4. Symmetry is a particularly clean example

Symmetry families explicitly generate the seven non-identity rotations/reflections using the same
geometry transforms as the editor/runtime.

For those variants:

- mathematical equivalence is known by provenance;
- transformed witness construction is known;
- global canonicalization is unnecessary to discover the relation.

This matters in light of the natural-corpus equivalence census:

- published + Corpus 1 showed zero exact duplicate groups;
- published + Corpus 1 showed zero strict 8-way symmetry-equivalent groups.

So the two use cases separate cleanly:

| Population | Best identity/reuse mechanism |
|---|---|
| natural committed corpora | no demonstrated symmetry reuse opportunity |
| generated symmetry families | consume explicit family provenance |
| blind family benchmark | intentionally do **not** consume the known witness |

## 5. Partial compilation is more promising than solution reuse for blind family research

Family solver experiments cannot skip search using their known solution, but they may still reuse
**problem compilation** because static input structure is not answer leakage.

This makes the parent->variant dependency census scientifically cleaner than solution reuse.

Examples:

- local mutant: often only one placement class changes;
- density sweep: challenge/geometry largely stable while block occupancy changes;
- symmetry: all coordinates transform, but the entire derived structure may itself be transformable;
- re-embed: geometry changes broadly;
- constrained/group reshuffle: selected mechanic/object classes change while challenge metrics and
  grid may remain fixed.

The committed `family-compile-reuse-census.mjs` measures broad invariance classes before any
incremental compiler is built.

## 6. Historical solution index: narrow the proposal

The original audit nominated a corpus-wide lookup sequence:

1. exact duplicate?
2. symmetry equivalent?
3. sibling solution directly valid?
4. sibling repairable?
5. known residual artifact?

Current evidence narrows the first three substantially.

### Exact duplicate / natural symmetry

No opportunity in published + Corpus 1; Corpus 2 still pending.

### Generated sibling direct solution

Already represented by family provenance when generation preserved/transformed a witness.

### Implication

Do **not** build a general "solution warehouse" merely to answer relationships already explicit in
family manifests/hints.

A broader index is earned only if it demonstrates reuse across **non-family** historical computation
or across residual subproblems that cannot be recovered from existing provenance.

## 7. What remains genuinely open

### A. Corpus 2 natural equivalence

The random corpus is large enough that accidental or generator-induced duplicate/symmetry classes may
exist. The committed equivalence census remains the right measurement.

### B. Sibling path repair beyond generation witness

A different question is whether a solver-found path from sibling A can cheaply solve sibling B when
the family did **not** preserve that path.

That is predictive/repair reuse, not exact provenance reuse.

It requires:
- direct referee validation first;
- cheap repair only after direct failure;
- comparison against ordinary solve cost;
- no use inside a blind experiment unless the experiment explicitly studies warm-start transfer.

### C. Reusable exact residual facts

Family provenance says nothing about whether two unrelated solves encounter the same exact residual
problem. That remains a separate residual-interface question with the proof burden in
`solver-residual-state-representation.md`.

## 8. Disposition

- **Global natural-corpus solution canonicalizer:** not earned from current evidence.
- **Generated family witness reuse:** already available by provenance; use operationally where legal.
- **Blind solver family experiments:** must keep known witness out of the solve path.
- **Family partial compilation:** still open and quantitatively gated.
- **Sibling warm-start/repair:** distinct future experiment, not implied by existing exact witnesses.
- **General historical solution warehouse:** deferred until a non-family reuse hit-rate justifies it.

The architecture lesson is simple: **reuse should follow the strongest existing identity relation**.
When provenance already says "this is the transformed child of that solved parent," rediscovering the
relation by hashing/canonicalization is wasted machinery.
