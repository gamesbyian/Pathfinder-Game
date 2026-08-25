# Solver exact/reference-model capability audit

> **Status:** active
> **Last evidence:** 2026-08-25 — static reconciliation of the maintained full CP-SAT probe, mechanic-state contracts, prior bidirectional validation, repair-retreat work, exact beam-extinction labels, commit-level validation history, and cross-representation reuse audit
> **Decision:** treat the CP-SAT/reference stack as serious but bounded research infrastructure. It has already changed decisions for repair retreat and beam extinction. Do not expand mechanic scope for completeness. The support/validation matrix is now explicit: portals and flipping filters have the strongest two-way validation; core/MustPass/MustCross have substantial mixed validation; landmark turn/surround encodings have known-witness validation but still lack a deliberately targeted cold-emitted/referee suite. Static filters remain unsupported by design. If an independently justified exact frontier/edge representation later answers the same bounded query, use agreement/disagreement as epistemic triangulation rather than maintaining a duplicate complete solver.
> **Remaining gate:** add a **small landmark-focused under-constraint suite only when a ranked query actually needs stronger landmark proof**: cold/unpinned or explicit-prefix cases covering must-turn CW/CCW/either, adjacent-turn, surround, and at least one portal/turn-boundary mixture, with every emitted path refereed. Do not run a broad validation campaign merely to turn every matrix cell green.
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

Static regular filters are deliberately unsupported by the maintained full probe. Its own current header explains why: neither stress corpus contains static filters, so there is no decision-bearing population that would justify building and validating that encoding merely for completeness.

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

## Validation evidence already in history

The strongest evidence is spread across several earlier research/fix commits rather than one canonical matrix. Reconciliation gives the following anchors.

### Core + landmarks, July 30

Commit `e965b2272a54aa253a5b839bfdad87b7cc53a05b` explicitly ran `--check-witness` on the full-mechanic model for `R00044`, `R00001`, and `R00108`; every stored Pathfinder-valid witness remained `OPTIMAL` in under a second. The same investigation isolated `R00044` with the landmark family enabled and reported it feasible in 8.2 s.

This is genuine **known-witness / over-constraint** evidence for the turn/surround/adjacent-turn encoding. It is not, by itself, under-constraint evidence for each landmark family.

### Portal validation, August 5 and 15

Portal support had two cold unpinned model solutions, on 4-pair and 6-pair levels, independently accepted by `validateCandidatePath`. Later broad witness checks covered 83/83 flipper-free portal-bearing levels after padding/length fixes. The portal work also exposed multiple real modeling defects, including transitions falsely masquerading as jumps and padding/real-length mistakes.

This is meaningful two-way validation rather than “the model happened to solve a portal level.”

### Multi-gate validation, August 12

A cold B2 run emitted illegal S00108 paths because unused gates were under-constrained. The canonical referee rejected them. Commit `572f0e51666c7aca175cb6b972d7a271d8e2cc20` fixed gate visits so only the selected start gate may appear, and the affected S00108 cases then returned referee-valid live witnesses.

This is a particularly useful adversarial fixture because it demonstrates the exact failure mode the model→referee direction exists to catch.

### Flipping-filter validation, August 15

Commit `606588181818ab5a64a72608fcc3098eb31caf4b` records 102/102 flipping-filter-bearing known-witness checks accepted after the encoding/padding fixes, plus two independent cold solutions accepted by the Pathfinder referee. The broader follow-up also rechecked 83 portal-bearing flipper-free witnesses.

This is the strongest targeted two-way mechanic-family validation in the stack.

### Explicit-prefix downstream use

The beam-extinction suite ultimately produced 25 live / 4 dead / 3 timeout with zero correctness/input alarms after mechanic-support fixes. Repair-retreat binary searches also used the same prefix interface, and referee alarms there exposed the `real_N == reqLen + 1 + jumps_used` under-constraint before the result was trusted.

These uses matter because they exercise the model in the mode current research actually depends on, not only as whole-level witness pinning.

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

## Independent-representation triangulation

If a future ranked question independently earns a second exact representation, such as a bounded frontier/expanded-lane or edge-based formulation, duplicate bounded queries can have epistemic value even when the second representation produces no unique solves.

The useful pattern is:

1. formulate the same narrow supported query in two materially different exact encodings;
2. require emitted witnesses from either encoding to pass the canonical native referee;
3. treat agreement as stronger evidence because the encodings have different structural failure modes;
4. treat disagreement as a correctness/model investigation, never as a vote where two systems can outnumber the third.

This is especially useful for high-value live/dead labels, attainability claims, and proposed hard certificates whose downstream conclusions would be expensive if wrong.

Do **not** build or broaden a second exact solver solely for triangulation. The benefit is opportunistic when another representation has already been justified by its own bounded research question.

## Closed support / validation matrix

The matrix deliberately separates **encoding capability** from **validation depth**. “Exact encoding present” is not the same claim as “exhaustively validated,” and no row below is a promise that every future combination is safe without checking its support context.

Validation grades are qualitative and scoped:

- **strong two-way**: substantial known-witness acceptance plus cold/prefix emitted paths accepted by the referee, including adversarial bug history;
- **mixed two-way**: both directions exist in real workloads, but not as a family-isolated exhaustive suite;
- **one-sided targeted**: direct known-witness acceptance exists, but a deliberately isolated cold/referee family suite is absent;
- **unsupported**: the model abstains.

| Mechanic / rule | Encoding status | Validation grade | Evidence / remaining caution |
|---|---|---|---|
| Base grid, selected gate, goal, blocks | exact in model scope | **strong two-way** | Broad witness batches plus many cold/prefix referee-valid outputs; multi-gate under-constraint was caught by referee and fixed. |
| Exact counted length / intersections | exact | **strong two-way** | Central to all witness/cold runs; real padding/`real_N` bugs were exposed and fixed rather than hidden. Portal horizons remain more timeout-prone. |
| Edge-axis reuse | exact | **mixed two-way** | Exercised throughout both directions; earlier weak/padding formulations produced real alarms and were fixed. A tiny dedicated adversarial fixture would be useful only if a new proof depends specifically on this boundary. |
| Must-pass | exact | **mixed two-way** | Present in full-mechanic witness and downstream prefix workloads; no current evidence of a family-specific mismatch. |
| Must-cross | exact via `visits == 2` plus exact axis-touch reuse | **mixed two-way** | Central to July 30 full-model witness checks and later exact-prefix work. The logical equivalence depends on axis reuse, not visit count alone. |
| Surround | exact encoding present | **one-sided targeted** | Full-mechanic known witnesses including landmark-bearing R00044/R00001/R00108 were accepted. No deliberately isolated cold-emitted/referee surround suite is recorded. |
| Must-turn CW / CCW / either | exact turn/chirality encoding present | **one-sided targeted** | Same full-model known-witness evidence. Current source derives chirality from the native geometry convention. Missing piece is targeted cold/referee coverage, not encoding implementation. |
| Adjacent-turn | exact turn/chirality encoding present | **one-sided targeted** | Same landmark witness evidence; no family-isolated cold/referee suite recorded. |
| Portals, including unused pairs/padding | exact | **strong two-way** | 83/83 broader witness checks after fixes; cold 4-pair/6-pair referee-valid solutions; several under-constraint/padding bugs caught during validation. Large models can timeout. |
| Multiple gates | exact after 2026-08-12 fix | **strong targeted two-way** | S00108 referee alarm exposed unused-gate bug; affected cases became referee-valid after fix. |
| Flipping filters | exact order/parity encoding | **strong two-way** | 102/102 known-witness checks plus two cold referee-valid solutions; later beam cases use the same support. |
| Mixed portal + flipping-filter prefix queries | exact when no unsupported static filter is present | **mixed two-way** | Repair-retreat and beam work exercise the combined machinery; complexity/timeout is a practical limit, not an UNSAT inference. |
| Static regular filters | **unsupported** | **unsupported** | Full probe intentionally exits `SKIPPED`; neither stress corpus uses them. Do not add support absent a ranked need. |
| Goose / false-goal / decorative exclusions | encoded only as model-scope impassability where relevant | **scoped, not full PLAY simulation** | Suitable only when the query's semantics match the model scope; do not describe this as a complete live-hazard model. |

### What the matrix closes

The prior “finish the matrix” queue wording could be read as requiring a broad new validation campaign. The static evidence does **not** support that interpretation.

The support question is now explicit enough to gate real research:

- portal/flipper work has strong two-way evidence;
- core objective/resource mechanics have substantial mixed two-way evidence;
- landmarks are **implemented and positively checked against known valid witnesses**, but the family-specific model→referee direction is comparatively shallow;
- static filters are unsupported on purpose.

The only obvious validation-depth hole is therefore narrow: targeted **under-constraint** coverage for the landmark families and turn/portal boundary combinations. That hole should be bought only when a ranked exact query depends on those semantics.

### MustCross equivalence

Native Pathfinder tracks first-pass consequences through edge-axis usage. Turning during the first MustCross visit consumes both axes and permanently prevents the required second orthogonal pass.

The CP-SAT model does not need a separate “first crossing axis” variable because exact `visits == 2` plus exact axis-touch reuse produces the same consequence. A first-pass turn consumes both axes and makes visit two impossible; two legal visits must therefore be straight passes on opposite axes.

Visit count **without** the exact axis constraints would be insufficient.

## Stale mechanic-contract correction

The audit previously found and corrected a durable documentation mismatch in [`../docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md):

- regular static filters were incorrectly described as externally exact although the maintained full probe explicitly skips them;
- must-turn and adjacent-turn were described as relaxed although current full CP-SAT has turn/chirality encodings;
- the table did not clearly distinguish encoding capability from validation depth.

The mechanic contract owns encoding capability; this report owns validation depth/proof-use caution.

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

## If landmark validation is next demanded

Do not build a giant benchmark. Use a handful of semantic fixtures and real stored witnesses, chosen before outcomes:

- must-turn CW;
- must-turn CCW;
- must-turn either;
- adjacent-turn with a qualifying and non-qualifying neighboring turn;
- surround with all required reachable neighbors;
- one portal jump immediately before/after a turn-sensitive region, because portal jumps deliberately erase entry-axis meaning;
- optionally one mixed flipper + turn case if the ranked query actually contains both.

For each supported case, use both directions:

1. pin a known referee-valid witness and require model feasibility;
2. solve cold or from a fixed prefix, emit the candidate, and require canonical referee acceptance.

A failure is a correctness investigation, not an inconvenient datapoint. A timeout is UNKNOWN, not a failed semantic fixture.

## Research roles going forward

The oracle can remain useful as:

- exact live/dead labeler;
- counterexample generator for proposed state abstractions;
- exact attainability checker for selected residual-resource questions;
- validator/falsifier of proposed sound structural certificates;
- bounded diagnosis instrument for repair assumptions when the encoding supports them;
- one side of opportunistic cross-representation triangulation when another independently justified exact model answers the same bounded query.

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

For triangulated queries, also record whether the second representation already existed for another ranked purpose; do not hide the cost of creating duplicate exact infrastructure behind “validation.”

## Current disposition

The “can a reference model ever justify maintenance?” gate is **met** for bounded research use.

The broad support/validation-matrix task is **closed**. The remaining validation debt is narrow and demand-driven: landmark-family under-constraint/referee fixtures if and when a ranked query depends on them. The next reference-model work should otherwise be a concrete exact label/counterexample/certificate request from a higher-ranked queue item, not generic validation expansion or full-corpus exact solving.
