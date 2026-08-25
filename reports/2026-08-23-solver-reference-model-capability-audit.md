# Solver exact/reference-model capability audit

> **Status:** active
> **Last evidence:** 2026-08-24 — static reconciliation of the maintained full CP-SAT probe, mechanic-state contracts, prior bidirectional validation, repair-retreat work, and the existing exact beam-extinction case set
> **Decision:** treat the CP-SAT/reference stack as serious but bounded research infrastructure. It has already changed decisions for repair retreat and beam extinction. Do not expand mechanic scope for completeness; close the small support/validation matrix and issue new oracle queries only for a concrete ranked label, counterexample, attainability, or certificate gap.
> **Remaining gate:** finish a bounded adversarial bidirectional support suite that distinguishes exact-validated, encoded-but-insufficiently-validated, relaxed/one-sided, unsupported, and timeout-prone mechanic combinations; every model-emitted witness must pass the canonical Pathfinder referee.
> **Evidence role:** forensic
> **Selection:** observational

## Purpose

Pathfinder already has substantially more exact/reference capability than “we tried CP-SAT” suggests. It also has direct evidence that hand-written external encodings can be wrong in both directions.

This report records the current proof boundary and prevents “maintain a serious reference solver” from becoming an indefinite second-solver project.

The live rank is owned by [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md). The durable state representation vocabulary is [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md).

## Current reference stack

Primary model: [`../scripts/stress/cpsat-full-probe.py`](../scripts/stress/cpsat-full-probe.py).

The maintained full probe supports, subject to the validation caveats below:

- exact path-position variables over a padded horizon;
- exact counted length including zero-cost portal jumps;
- exact intersection count;
- gates/start/goal and static blocked cells;
- exact per-axis reuse constraints;
- must-pass and must-cross;
- surround, must-turn and adjacent-turn landmark state;
- portals;
- flipping-filter order/parity;
- explicit prefix forcing;
- known-witness pinning; and
- model-emitted candidate paths for independent referee validation.

Static regular filters are deliberately unsupported by the maintained full probe.

## Why the prefix interface matters

The reference model is most valuable when asked a narrow residual question rather than “solve the whole corpus.”

Existing explicit-prefix uses include:

- exact repair-retreat live/dead boundaries;
- exact beam extinction-adjacent labels;
- targeted witness/model validation; and
- reduced feasibility questions.

A prefix query asks whether **any** exact completion exists from a specific committed partial path. That turns the model into an independent truth source for questions such as:

- was this beam survivor still completable?
- exactly where did a repair trajectory become dead?
- does a proposed compressed state representation merge a live and dead future?
- does a proposed structural failure reason admit a live counterexample?

## Bidirectional validation is mandatory

Two complementary checks catch opposite model defects.

### Over-constraint check

Pin a known referee-valid Pathfinder witness. The model must accept it.

### Under-constraint check

Solve cold/unpinned or from a partial prefix, emit the model path, and validate that path through the canonical Pathfinder referee.

Witness pinning alone cannot detect an easier under-constrained model. Cold emitted paths alone do not establish absence of over-constraint.

## Strongest existing validation evidence

The 2026-08-15 flipping-filter/reference work records:

- 102/102 flipping-filter-bearing stored witnesses accepted after fixes;
- 83/83 portal-bearing flipper-free witness checks accepted in a broader portal batch;
- cold model-generated alternative solutions accepted by the Pathfinder referee; and
- multiple encoding bugs discovered because emitted paths were independently refereed.

That is real exact-model infrastructure, not merely a satisfiability sketch.

## Encoding bugs are evidence, not something to hide

Historical defects found and fixed include:

- illegal transitions masquerading as portal jumps;
- edge-axis reuse modeled too weakly;
- goal-padding transitions counted as real movement/axis touch;
- early goal arrival followed by padding because real path length was not tied correctly to `reqLen` plus portal jumps;
- insufficient gate exclusion; and
- mistaken attribution of an unsupported-mechanics abstention to MustCross when flipping filters were the real cause.

The lesson is methodological:

> `SAT`, `OPTIMAL`, or `INFEASIBLE` is only as trustworthy as the supported encoding and its validation history.

## Current support classification

| Mechanic / rule | Encoding status | Validation status / caution |
|---|---|---|
| Base grid, gates, goal, blocks | encoded | substantial indirect coverage; include in canonical suite |
| Exact counted length / intersections | encoded | prior length bug fixed; cold/referee evidence exists |
| Edge-axis reuse | encoded | prior under-constraint fixed; deserves adversarial revisit fixtures |
| Must-pass | encoded | straightforward; explicit suite coverage still useful |
| Must-cross | exact logic via `visits == 2` + exact edge-axis touch | targeted adversarial validation still desirable |
| Surround | encoded | central validation summary incomplete |
| Must-turn / adjacent-turn | exact turn/chirality encoding present | validation depth incomplete |
| Portals | encoded | strong exact candidate; some large queries can timeout |
| Flipping filters | encoded | strongest targeted validation family |
| Static regular filters | **unsupported** | full probe abstains |
| Goose / false goal / decorative exclusions | encoded for solver scope where relevant | not a full PLAY hazard simulation |

### MustCross equivalence

Native Pathfinder tracks first-pass consequences through edge-axis usage. Turning during the first MustCross visit consumes both axes and permanently prevents the required second orthogonal pass.

The CP-SAT model does not need a separate “first crossing axis” variable because exact `visits == 2` plus exact axis-touch reuse produces the same consequence. A first-pass turn consumes both axes and makes visit two impossible; two legal visits must therefore be straight passes on opposite axes.

Visit count **without** the exact axis constraints would be insufficient.

## Stale mechanic-contract correction

The audit found and corrected a durable documentation mismatch in [`../docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md):

- regular static filters were incorrectly described as externally exact although the maintained full probe explicitly skips them;
- must-turn and adjacent-turn were described as relaxed although current full CP-SAT has turn/chirality encodings;
- the table did not clearly distinguish encoding capability from validation depth.

The mechanic contract now owns encoding capability; this report owns validation depth/proof-use caution.

## What the model may prove

Only within an exact-supported and sufficiently validated query scope:

- a referee-accepted emitted path is a valid witness;
- `INFEASIBLE` can label an exact prefix/query dead;
- monotone prefix/retreat binary search can locate exact liveness boundaries.

For relaxed models, state the relaxation direction. For unsupported mechanics or timeout/UNKNOWN, abstain.

Never convert timeout, UNKNOWN, or unsupported into dead/UNSAT.

## The reference model has already paid rent twice

### Repair retreat

Explicit-prefix feasibility and binary search located exact feasible/infeasible boundaries on repair elites. The later broadened sample showed multiple regimes, including shallow and deep exact rollback. This changed the repair question from vague “near miss” geometry to exact liveness versus reconstructability.

### Beam extinction

The committed 32-case beam set, after flipping-filter support, produced **25 live / 4 dead / 3 timeout** with zero correctness/input alarms. It includes A/D cases where a score-preferred top candidate is exact-dead while a discarded or near-cutoff alternative is exact-live.

That already proves the mechanism question “can finite-width scoring prefer dead material over live alternatives?” on selected parents. Do not spend another CP-SAT campaign merely to prove it again.

See [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md).

## Bounded adversarial validation matrix

Prefer tiny semantic fixtures and real stored witnesses over a giant benchmark.

Cover at least:

- base path / exact length / exact intersections;
- must-pass;
- MustCross horizontal→vertical and vertical→horizontal valid cases;
- invalid MustCross first-pass turn and same-axis reuse;
- must-turn CW / CCW / either;
- adjacent-turn variants;
- surround;
- portals including unused pairs, padding and turn-boundary interactions;
- flipping filters including mixed axes and multiple orderings;
- mixed portal/flipper/turn cases where available;
- one static-filter unsupported control.

For supported cases, normally run both witness-pinning and cold-emitted/referee validation.

## Research roles going forward

The oracle can remain useful as:

- exact live/dead labeler;
- counterexample generator for proposed state abstractions;
- exact attainability checker for selected residual-resource questions;
- validator/falsifier of proposed sound structural certificates;
- bounded diagnosis instrument for repair assumptions when the encoding supports them.

It should **not** become:

- a source of production per-level hints or routing;
- a replacement definition of native solver capability;
- a second system that must encode every future mechanic;
- a truth source whose support/validation status is omitted.

## Cost/value gate

For every future reference-model use, record:

- query construction cost;
- solve/label turnaround;
- exact versus UNKNOWN rate;
- whether the answer changed a ranked decision;
- maintenance/debugging cost.

A reference model can be valuable historically and still be the wrong tool for a new query.

## Current disposition

The “can a reference model ever justify maintenance?” gate is **met** for bounded research use.

The next job is validation hygiene and demand-driven use, not broader mechanic coverage or full-corpus exact solving.
