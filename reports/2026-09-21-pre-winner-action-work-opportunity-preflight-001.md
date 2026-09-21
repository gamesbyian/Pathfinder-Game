<!-- agent-context-budget: warn=6500 max=9000 -->
# Pre-winner action work opportunity preflight 001

> **Status:** active opportunity-sizing preflight; no solver behavior change.
> **Date:** 2026-09-21.
> **Question:** how much canonical work on successful sequential solves is spent before the first successful attempt?
> **Evidence role:** oracle-ceiling measurement for action selection / ladder repricing.
> **Priority relationship:** supporting investigation only. It does not create a new workstream or reopen closed selector forms.
> **Implementation boundary:** analysis-only. No action is skipped, reordered, or repriced by this work.

## 1. Why this question now

The completed batch-digestion and computational-work-elimination audits ruled out several broad speed
reservoirs:

- ingestion and normalization are negligible;
- general prep reuse is a tiny share of hard solve wall;
- current corpora contain no cross-level exact/symmetry solve-elimination opportunity;
- initial parity and initial BC1 presolve have zero incidence;
- a highly recurrent connectivity-cut proof still dominated only ~0.40% of total canonical work.

Those results make a larger-granularity question more attractive:

> Are we spending meaningful canonical work on complete solver actions that occur before the action
> that eventually solves the level?

If the answer is no, action-selection speedup has a low oracle ceiling.

If the answer is yes, the next question becomes whether legal current-input facts or earlier
failure-response evidence can identify any of that work prospectively.

This is distinct from cross-attempt proof caching. The potential consumer is the **scheduler/action
selector**, not a proof store.

## 2. Exact measurement

For every successful sequential solve row:

1. preserve attempt order exactly as emitted by the solver;
2. locate the first successful attempt;
3. require canonical `attempt.workSpent` for every attempt through that winner;
4. sum all canonical work before the winner;
5. divide by the row's total canonical `workSpent` when available and consistent, otherwise by
   canonical work through the winner.

Primary numerator:

```
preWinnerWork = sum(workSpent of attempts before first successful attempt)
```

Primary denominator:

```
successfulSolveCanonicalWork
```

The aggregate ratio is an **oracle upper bound** on work removable by perfect winner-first selection.

It is intentionally generous. A real selector cannot know the future winner for free.

## 3. Currency rule

Use canonical `workSpent` only.

Do **not** substitute:

- elapsed wall time;
- raw `nodesExpanded`;
- attempt count;
- allocated node ceilings.

The ladder mixes techniques for which nodes are not a common cost currency.

A retained artifact lacking attempt-level canonical work is **measurement-unavailable**, not negative
evidence and not permission to change units.

Current HEAD already emits `Attempt.workSpent`; no new solver work meter is needed.

## 4. First-pass decision bands

Freeze these before observing a current-format population.

### Aggregate pre-winner work share < 1%

Close the current speed premise as low ceiling.

Do not build a selector-response model merely because some individual rows have late winners.

### 1% to < 5%

Narrow / characterize.

Inspect concentration:

- is almost all opportunity on one or two parents?
- one stage?
- repeated copies of the same action?
- one specific mechanic/population?
- a known allocation pathology already owned elsewhere?

No runtime selector yet.

### >= 5%

A meaningful oracle ceiling exists.

This earns the **next discriminator**, not production action skipping:

> Can runtime-legal current-input and/or already-observed failure-response facts identify a substantial
> subset of pre-winner work without losing the eventual winner?

The next test should be retrospective/offline on frozen attempt traces where possible.

### >= 10%

Treat as a potentially material scheduler-speed reservoir and prioritize a response/selection
discriminator, still requiring loss controls and matched-work validation before behavior change.

## 5. Secondary measurements

For canonical-work-complete solved rows, report:

- fraction with any pre-winner work;
- median / p90 row-level pre-winner share;
- median / p90 number of failed attempts before winner;
- winning action/stage;
- failed actions contributing the most aggregate pre-winner work;
- repeated exact action keys before the winner;
- concentration by parent/action/stage.

These are descriptive only.

Repeated action identity does not prove redundant information.

## 6. Existing evidence and its limitation

### Historical published winner analysis

`reports/solver-winning-attempts.json` establishes where winning attempts occur and their own elapsed
cost, but it does not price canonical work before the winner.

### 2026-09-20 targeted failure-response run

GHA run `35531721218` retains full ordered attempt lists for 53 parents (23 residual + 30 solved
controls). Its combined artifact is scientifically relevant, but that historical result does not carry
`attempt.workSpent` or stage-lifecycle canonical work.

Therefore:

- do not derive a canonical pre-winner percentage from it;
- do not substitute heterogeneous node counts;
- use it later for response-shape exploration only after a current-format canonical-work population
  establishes that the ceiling is large enough.

### Current solver telemetry

Current `Attempt` includes `workSpent`, and lifecycle telemetry can expose stage `actualWork`.
The measurement problem therefore does not justify new search instrumentation.

## 7. Cheapest evidence acquisition

Before dispatching any new solver run:

1. scan retained current-format combined artifacts for solved rows with `attempt.workSpent`;
2. analyze any compatible population using `scripts/pre-winner-work-census.mjs`;
3. require explicit population/protocol identity and report canonical coverage.

Only if no suitable current-format retained artifact exists should a fresh execution be considered.

A fresh run should reuse an already-meaningful production-shaped population rather than create a
special synthetic corpus solely for this census.

## 8. What a positive would and would not mean

A high oracle ceiling would establish:

> action ordering/selection has enough *possible* work leverage to investigate.

It would not establish:

- that the winner is predictable;
- that an earlier failure response identifies the winner;
- that skipping failed attempts preserves solves;
- that a learned selector is level-blind/generalizable;
- that nominally similar action outcomes are information-redundant.

Those are later questions.

The clean progression is:

```
oracle ceiling
  -> legal discriminator
  -> retrospective loss/savings bound
  -> prospective shadow selector
  -> matched-work behavioral A/B
```

Stop at the first failed gate.

## 9. Relationship to existing research

This supports, but does not supersede:

- WS1 automatic action selection;
- WS2 first-loss/capability acquisition;
- compact failure-response evidence;
- the historical cross-attempt cooperation hypothesis.

It does not reopen:

- generic portfolio proliferation;
- broad scorer/width sweeps;
- generic shared memory;
- proof blackboards;
- historical identity-based routing.

If the opportunity is concentrated in a mechanism already owned by a live workstream, route it there
rather than creating a new scheduler project.

## 10. First deliverable

Run the committed analysis against the first compatible retained current-format artifact.

If none exists, record that exact evidence gap and nominate the smallest existing workflow/population
that can emit current attempt canonical work without adding new solver instrumentation.
