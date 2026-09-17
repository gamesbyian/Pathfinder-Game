# Solver premise-space third pass

> **Status:** active / continuation checkpoint
> **Base:** `main` at `ad8f86648d3f36198147b4c2121dff5f1961735c` (merged PR #1830)
> **Purpose:** continue the hostile premise-space investigation after the recovered 92-premise baseline and 26-premise second-pass extension were merged.

## Recovery checkpoint

The stalled-session work requested for recovery is now durable on merged PR #1830. That merge contains the baseline atlas/register/graph, the 26-row second-pass extension, typed relation graph, completeness matrix, and second-pass audit report. The original owning PR is therefore closed by merge and cannot serve as a live continuation branch.

This branch is the continuation lineage from that merged checkpoint. It must remain research/documentation only: no expensive experiments and no production solver behavior changes.

## Third-pass questions

The next pass deliberately targets blind spots that survive the five-axis second-pass ontology:

1. transitions *between* lifecycle stages, especially what information is dropped at attempt, beam/DFS/repair, gate, and process handoffs;
2. counterfactual causality at the exact decision that first destroys access to a valid completion;
3. policy- and budget-relative notions of state equivalence, dominance, and future value;
4. endogenous residual selection: the unsolved population is continually sculpted by earlier solver capabilities and portfolio order;
5. observation/instrumentation effects and missing-data mechanisms in traces;
6. non-monotone capability: more precision, work, or retained state can displace useful search and reduce solves;
7. option value and information value of branches that are poor immediate candidates but preserve rare completion regimes or reveal causal information;
8. stopping/abandonment as an explicit decision problem within a level, not only allocation among attempts;
9. provenance of knowledge across exact observers, production search, repair, and offline research so that evidence can be reused without leaking oracle information;
10. whether generator coverage should be defined over solver-relevant structural/state space rather than only level-space surface diversity.

The remainder of this report will be expanded only after the continuation PR is open, preserving the user-requested checkpoint-before-expansion workflow.