# Connectivity cut DFS dominated-work preflight 006

> **Status:** concluded-negative; executed
> **Last evidence:** 2026-09-21 — non-overlapping outermost DFS proof-hit subtrees contained only 49,034 canonical work units across the frozen 24-parent population. [Result 006](2026-09-21-connectivity-cut-dfs-dominated-work-result-006.md)
> **Decision:** dominated work is too small to justify a matched-work behavioral prune; the connectivity-cut consumer and parent computational-work-elimination audit are closed.
> **Remaining gate:** none for this preflight; use result 006's explicit reopen condition if connectivity cadence/cost or applicability economics materially change.
> **Evidence role:** development.
> **Parent result:** [caller attribution result 005](2026-09-21-connectivity-cut-unscheduled-caller-attribution-result-005.md).
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).

## Question

When an exact retained cut proof first applies at an ordinary DFS prefix where production skips connectivity:

> **How much canonical DFS work does production subsequently perform beneath that already-proved-dead prefix before natural backtracking?**

Incidence is already known. This experiment measures the missing economic numerator.

## Frozen population

Reuse results 002-005 exactly:

- Corpus 2 random stress positions 81-104;
- 24 parents;
- strict base work budget 500,000;
- 30 s wall safety;
- 64 retained unique certificates;
- exact proof dedupe and current-position index unchanged;
- ordinary production behavior unchanged.

This is deliberately the already-spent development population because 005 is selecting a mechanism-specific microscope, not estimating general prevalence.

## Measurement contract

Only ordinary DFS participates.

At an unscheduled theorem-backed cut hit:

1. the observer records the hit exactly as in 004/005;
2. if no proof-hit ancestor is already active and production accepts/pushes the candidate, mark this stack frame as an **outermost proof-hit subtree**;
3. production DFS continues unchanged;
4. when that exact frame naturally pops, record:
   - canonical work elapsed since the proof hit;
   - DFS loop/node expansions elapsed since the proof hit;
   - stack depth / remaining steps;
   - proof-validation boundary checks;
   - source-proof age;
5. nested hits beneath an active marked subtree are excluded from dominated-work summation.

This yields non-overlapping dominated subtrees.

## Censoring

If the DFS call terminates by budget/timeout while a marked subtree is active, emit a censored lower-bound record.

If a solution is returned while a theorem-backed marked subtree is active, emit a censored `solution` record as an implementation/theorem alarm; do not alter production behavior.

Do not treat censored records as complete subtree savings.

## Primary outputs

Per parent and aggregate:

- outermost marked subtrees;
- naturally exhausted marked subtrees;
- censored marked subtrees;
- sum / median / p90 dominated canonical work;
- sum / median / p90 dominated nodes;
- dominated work as a fraction of total solve work;
- proof-validation boundary checks at marked roots;
- dominated-work / root-validation-check ratio as a descriptive operation-scale statistic;
- contribution concentration by parent.

Also retain the existing unscheduled hit denominator to show how aggressively nested hits collapse into a smaller non-overlapping set.

## Interpretation

### Strong positive

Advance to a matched-work behavioral DFS prune only if:

- naturally closed outermost subtrees dominate a material fraction of solve work;
- multiple parents contribute materially;
- dominated work is not almost entirely one pathological parent;
- root proof validation is small relative to work beneath the prefix.

### Negative

Close the cut-proof consumer if outermost dominated work is small despite high raw hit incidence.

That would mean most hits are nested/redundant observations inside already-doomed search regions rather than separate work-elimination opportunities.

### Censored-heavy

If a large share of marked subtrees hit the work/time cap before closing, report lower bounds and design one narrower continuation/accounting experiment. Do not invent complete savings.

## Non-goals

This preflight does not authorize:

- pruning on a cut proof;
- changing DFS connectivity cadence;
- checking every candidate in production;
- beam/repair instrumentation;
- a general subtree tracing framework;
- a proof cache beyond the existing bounded solve-local research shadow.

## Advance gate

A behavioral prototype is earned only after this result establishes a favorable **dominated-work numerator**. Runtime overhead and matched-work solve impact remain a separate later gate.
