# External research cross-pollination audit

> **Status:** superseded
> **Last evidence:** 2026-08-24 — final fourteen-report synthesis and durable residual-state representation reference incorporated the useful cross-topic transfers
> **Decision:** use [`2026-08-24-external-research-pathfinder-synthesis.md`](2026-08-24-external-research-pathfinder-synthesis.md) for the final literature reconciliation, [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md) for durable representation vocabulary, and [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) for execution. This file remains a compact historical record of the strongest sideways transfers from the first eleven reviews.
> **Remaining gate:** none
> **Evidence role:** discovery
> **Selection:** observational

## Scope

The first eleven external-literature reviews covered repair/LNS, learned failure, beam survivor selection, sequential portfolios, symmetry, residual feasibility, exact attainability, future equivalence/basin width, structured repair, infeasibility certificates, and censored continuation/randomized symmetry.

The useful result was not eleven independent implementation ideas. Several literatures converged on the same residual-state questions from different directions.

The final synthesis and durable docs now own those conclusions. This report preserves the most important cross-topic transfers so their provenance remains visible without competing with current authorities.

## Strong transfers retained

### Certificates -> repair

UNSAT cores, MUSes and minimal correction/diagnosis sets sharpen the repair question from “how far should we roll back?” to:

- which frozen assumptions are sufficient for infeasibility; and
- which commitments must be relaxed before any repair can exist?

This remains an **offline diagnostic** idea until recurrent deep-retreat cases justify it. A core is not automatically a unique cause, and an MUS is not a minimum repair set.

### Future equivalence -> exact context caching

Weak full-state recurrence does not logically rule out recurrence of a smaller exact residual context.

But sharing an exact result across histories requires the strong condition:

`I(A) = I(B) => C(A) = C(B)`

for the queried future property.

No Pathfinder interface currently satisfies that proof gate. This therefore does **not** reopen loose transposition caching.

### Portfolio construction -> beam retention

A finite beam can be viewed as a tiny portfolio of future possibilities. The useful set-level objective is marginal future-extension capability, not visual/history distance for its own sake.

This analogy later became more precise through representative-set/frontier research and is now documented in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md).

### Symmetry -> representation-quality audit

Any descriptor claimed to encode intrinsic residual structure should declare its symmetry behavior:

- scalar capacities/counts should normally be invariant;
- directional/interface state should transform equivariantly;
- arbitrary coordinate or enumeration conventions should not silently enter structural identity.

This applies across beam descriptors, repair diagnostics, learned reasons, exact-resource summaries, and later scheduler features.

### Basin width -> later scheduler telemetry

Viable branching, forced-choice fraction, frozen/backbone structure and related basin-width proxies could eventually update continuation value during a solve.

They remain behind the simple-static-scheduler headroom gate. No current evidence shows these features predict which Pathfinder action deserves the next work tranche.

### Future equivalence -> repair windows

“What history may be forgotten?” and “what commitment may remain frozen?” are dual residual-interface questions.

Repair-window difficulty therefore depends on how frozen and reopened regions interact, not only rollback distance.

### Exact attainability -> beam/repair/learned failure

Exact-target search needs more than lower bounds. A state can have enough nominal resource while lacking any continuation that realizes the exact remaining length/intersection vector.

Attainable-resource reasoning can therefore support:

- offline future-opportunity labels;
- repair diagnosis;
- sound failure certificates when the relaxation/proof direction is explicit.

It should not become a generic dominance rule that prefers “more unused resource.”

### Censoring/continuation -> restart and scheduler work

Failure after work `t` changes the correct question to the conditional value of the **next** tranche, with natural exhaustion distinct from budget censoring.

This transfer now directly governs [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md) and the equal-work restart-versus-continuation audit.

## What this audit did not justify

It did not justify:

- a broad CDCL/LCG conversion;
- a generic context cache;
- a large diversity/archive framework;
- automatic core-guided repair;
- a dynamic learned scheduler before fixed-work headroom is demonstrated;
- symmetry canonicalization as a generic fix;
- hard pruning from merely predictive future descriptors.

## Supersession

The final three literature reviews added frontier/representative-set, automaton/resource, and CEGAR/backdoor concepts. Their integration is recorded in [`2026-08-24-third-wave-cross-pollination-addendum.md`](2026-08-24-third-wave-cross-pollination-addendum.md), and the complete conclusion in [`2026-08-24-external-research-pathfinder-synthesis.md`](2026-08-24-external-research-pathfinder-synthesis.md).

For current work, use the canonical queue rather than this historical audit.
