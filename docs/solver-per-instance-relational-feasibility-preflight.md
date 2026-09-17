# Per-instance relational feasibility preflight

> **Status:** questions 1-2 EXECUTED; question 3 still prepared. See [`Q1 result`](../reports/2026-09-17-lane-d-intersection-commitment-realizability-result-001.md), [`Q2 result`](../reports/2026-09-17-lane-d-constrained-event-feasibility-result-001.md).
> **Purpose:** test whether bounded current-input relational questions can distinguish LIVE from DEAD states where the production solver's scalar/local vocabulary cannot, without first building a new search architecture.
> **Priority:** owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Question 1 result:** on the 2 B2 parents with a same-parent LIVE/DEAD pair matched on identical remaining-intersection-deficit and remaining-length, every exact-DEAD state has zero confirmed-feasible future-intersection commitments while every exact-LIVE sibling has >=1 (107 queries, 0 correctness alarms). Population now exhausted; expansion needs the same production-search-quality sibling constructor blocking `solver-fresh-dead-sibling-harvest-preflight.md`. No production prototype earned yet -- economics and a concrete cheapest consumer are untested.
> **Question 2 result:** zero-new-compute per-instance re-analysis of H1's already-run cross-via/pass-via queries (449 rows, 0 alarms) found DEAD states trivially 100% infeasible under any added constraint (no new information; the base problem is already infeasible), while LIVE states show a real per-instance signal -- 13.8% of live-state event queries are individually infeasible despite the state overall being live, and 16/23 live states mix feasible/infeasible outcomes across their own candidate events. Reframes the earned claim as a within-state candidate-commitment viability signal, not a LIVE/DEAD classifier. No production prototype earned.

## Premise

Pathfinder's production solver is strong at local legality, scalar resources, individual obligation bounds, connectivity, and forward ranking. It is weaker at questions of the form:

> **Can these future requirements still be jointly realized under some legal order/interface/commitment?**

A generic level-blind procedure may answer a board-specific question. Cross-level recurrence is not required unless the proposed output is itself a fixed reusable descriptor.

## Historical reopening

This gate does **not** reopen failed implementations unchanged.

- H1 closed its frozen low-cardinality event vocabulary as a reusable recurring relation; it did not close generic per-instance feasibility.
- Future-intersection blueprint implementations were not clean premise tests: one lineage bundled an unsound bound; another suffered option-transport/nonparticipation and later runtime explosion inside a larger bundle.
- Residual-interface mining found weak reusable cross-level detour gadgets, but the actual commutativity decision test was never run.
- The historical arbitrary-target constrained-feasibility primitive was reverted almost immediately without a causal solver verdict.

See [`solver-capability-gap-stop-condition-reconciliation.md`](solver-capability-gap-stop-condition-reconciliation.md) and [`solver-archaeology-register.md`](solver-archaeology-register.md).

## First three bounded questions

Run these as **offline exact/observer questions on already-labelled states first**. Reuse existing supported exact/reference machinery or the smallest purpose-built bounded query. Do not build a production fallback solver.

1. **Future-intersection commitment realizability**
   - On matched LIVE/DEAD states with the same scalar intersection deficit, enumerate or decide a small bounded family of future crossing commitments/interfaces.
   - Ask whether DEAD states lose all realizable commitments while LIVE siblings retain at least one.
   - Prefer an answer such as `REALIZABLE / IMPOSSIBLE / UNKNOWN` over a fitted score.

2. **Constrained-event feasibility**
   - Ask whether completion remains possible through a nominated current-input event/region/interface: a crossing cell/axis, separator side, portal family, chokepoint, or required approach class.
   - The nomination must come from current puzzle/state structure or the frozen microscope design, never historical level identity at runtime.

3. **Residual-interface commutativity**
   - For candidate disjoint/weakly-coupled obligation excursions, actually swap/reorder them and evaluate legality plus future completion feasibility/state consequences.
   - Obligation-multiset equality alone is not evidence of commutativity.

## Population order

1. Reuse already exact-labelled B2/topology/repair-retreat states where the needed fields are retained and model support is adequate.
2. Use the fresh exact LIVE/DEAD sibling asset once available; prespecify the query before reading its dynamic labels when the query is decision-bearing.
3. Generate new states only if the first two populations cannot answer the semantic question.

Keep each subquestion's population and inference separate. One positive does not validate the other two.

## Required outputs

For every query form report:

- exact population and independence unit;
- model/mechanic support and UNKNOWN/unsupported handling;
- query cost and bounded-stop behavior;
- LIVE/DEAD discrimination at matched controls;
- whether the useful answer is a recurring descriptor or a board-specific per-instance fact;
- the cheapest plausible production consumer: prune, forced move, lower bound, action selection, decomposition, conflict extraction, or exact-mode switch;
- counterexamples and failure modes.

## Advancement gates

A query earns a production-shaped prototype only if all are true:

1. it provides information not already captured by current scalar/local machinery;
2. the relation is causally/structurally tied to exact LIVE/DEAD fate on more than a one-off curiosity;
3. derivation can be bounded, with `UNKNOWN` remaining non-decision-bearing;
4. a plausible consumer can exploit the answer more cheaply than blindly spending the displaced search work;
5. soundness is strong enough for that consumer.

A reusable fixed descriptor additionally needs independent recurrence/invariance. A generic per-instance procedure does not.

## Stop rules

Close a tested query form if:

- LIVE and DEAD states are rarely distinguished;
- the exact answer mostly restates an existing scalar bound or connectivity fact;
- answering is comparable to solving the residual itself with no reusable intermediate value;
- required state/model support makes the intended population mostly UNKNOWN/unsupported;
- the useful relation disappears once enough state is retained for soundness;
- no plausible runtime consumer can turn the answer into saved work or new capability.

A negative on one query form does not close per-instance relational feasibility as a class. Record the semantic subquestion that was actually falsified.

## Non-goals

- no restoration of historical blueprint production behavior;
- no universal event vocabulary search;
- no CP-SAT/SAT/CSP architecture commitment merely because an exact model is available;
- no historical solution/hint/identity as cold-solve input;
- no broad solver A/B before the offline premise discriminates LIVE/DEAD or exposes a concrete consumer.
