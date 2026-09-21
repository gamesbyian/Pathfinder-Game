# Relational-query next-question reconciliation 001

> **Status:** concluded-positive as question-generation work; no new active workstream item.
> **Date:** 2026-09-21.
> **Purpose:** reconcile the per-instance relational-feasibility positives against the later D1 production-consumer negative, and preserve only the descendants that remain materially distinct.
> **Priority authority:** [solver optimization workstreams](../docs/solver-optimization-workstreams.md).
> **Deferred/reopen authority:** [solver future work](../docs/solver-future-work.md).

## Executive result

The per-instance relational-query family remains scientifically interesting, but the strongest tested production consumer is closed.

Three facts now coexist:

1. **Future-intersection realizability is a real exact signal.**
   - Original matched-scalar test: DEAD states had zero confirmed realizable revisit commitments while LIVE siblings retained at least one.
   - R03147 replication: **18/18 exact-DEAD states** had zero feasible future-intersection commitments; both exact-LIVE siblings had at least one.
   - 0 correctness alarms across the 220-query replication.

2. **That exact signal did not help the tested beam-retention decision.**
   - Independent production slice: 24 cull decisions, 120 eligible candidates, 1,960 exact per-cell queries across 8 parents.
   - 84% definitive support.
   - **0 retention disagreements**.
   - Therefore D1 beam score-width/mechanic-bucket ranking is closed in its tested form.

3. **Other relational forms remain materially different.**
   - Constrained-event feasibility varies within LIVE states: 54/392 live-state event queries were infeasible, and 16/23 LIVE states mixed feasible and infeasible events.
   - Residual-interface commutativity is real among accepted solutions: **1,453/3,121 length-matched candidates (46.6%)** splice into a fully legal alternate solution.

The correct conclusion is not "relational queries failed" and not "build an exact-query service."

It is:

> preserve only descendants whose consumer is materially different from the closed D1 beam-ranking seam.

## A. Candidate-commitment viability inside LIVE search

The constrained-event result is not a LIVE/DEAD classifier. Its useful content is narrower:

> within a state that is still globally completable, some candidate near-term commitments are individually impossible.

That could matter only if production reaches a decision seam where:

- several candidate commitments are being considered;
- choosing an impossible one causes material downstream search;
- a current-input test can reject it substantially more cheaply than that downstream work.

The existing CP-SAT query is far too expensive for ordinary per-node use and should not be treated as the proposed consumer.

### Reopen / advancement condition

Advance this line only when both are available:

1. a materially cheaper current-input sufficient/relaxed test for candidate commitment viability; and
2. a production seam where perfect commitment-viability knowledge has a non-trivial oracle ceiling on displaced canonical work.

Do not reopen merely by running more exact CP-SAT annotations at the already-negative beam cutoff seam.

## B. Residual-interface commutativity

The commutativity result is genuinely positive, but it currently proves only that alternate already-valid solution segments can often be exchanged legally.

Length-matched candidates are the meaningful subset:

- 3,121 tested;
- 1,453 legal after splice;
- **46.6%** legal;
- 0 unresolved referee outcomes.

This shows per-instance interchangeability is real and cheap to test with the native referee.

What it does **not** show is capability gain.

### Natural next discriminator

The next meaningful question is:

> Can a legal commuting segment substitution rescue or materially improve a real DEAD / near-miss prefix or repair candidate?

That is different from the already-closed Lane E question "is the causal rollback point earlier than naive divergence?" A commuting substitution changes a segment while preserving its external interface and obligation multiset; it is a different revision operator.

### Reopen / advancement condition

Advance only when a suitable exact-labelled or referee-valid near-miss population exists where:

- the candidate segment substitution is generated without using hidden level identity/history at runtime;
- the source/target interface is current-input derivable;
- success is measured as restored feasibility, lower residual work, or a genuine solve gain;
- independent-parent support is possible if the development microscope is positive.

Do not promote from LIVE->LIVE splice legality alone.

## C. Why no new active queue item

The canonical research system already has several stronger live gates:

- BC1 removable-work economics;
- literal forced-work capture economics;
- hidden semantic forcedness, deferred behind literal capture economics;
- action-selection legal-signal capture, already merged from the pre-winner work census.

Adding a new active relational-query item now would dilute priority before either descendant has a cheap consumer or a production oracle ceiling.

These should remain **deferred, evidence-backed questions with exact reopen conditions**.

## D. Broader question-generation lesson

The useful question is increasingly:

> Where does production make an expensive choice while lacking a bounded fact about the future consequences of that choice?

That framing is better than asking for a generic exact-query subsystem.

Candidate fact families should be nominated from real decision seams, then tested in this order:

1. perfect-information oracle ceiling at the actual decision seam;
2. cheapest current-input discriminator;
3. observer participation and soundness;
4. matched-work consumer economics;
5. only then production behavior.

The D1 sequence is the worked negative control: a strong exact premise can still have zero consumer value at the tested seam.
