# Solver exact/reference-model capability audit

> **Status:** active
> **Last evidence:** 2026-08-23 — current `cpsat-full-probe.py`, mechanic-state contracts, CP-SAT flipping-filter validation, repair-retreat prefix work, and canonical-referee validation practice
> **Decision:** treat the existing CP-SAT/reference stack as a serious but bounded research oracle now; do not expand it yet. First reconcile mechanic-support claims, summarize bidirectional validation by mechanic combination, and demonstrate turnaround/value on one current ranked question
> **Remaining gate:** produce a bounded support/validation suite that classifies each relevant mechanic combination as exact-validated, encoded-but-insufficiently-validated, one-sided/relaxed, unsupported, or timeout-prone, with every emitted witness checked by the canonical referee
> **Evidence role:** forensic
> **Selection:** observational — audit follows prior targeted CP-SAT work and current reference-program reprioritization

## Purpose

The project already has substantially more exact/reference capability than “we tried MiniZinc/CP-SAT once” suggests. It also has direct evidence that hand-written external encodings can be wrong in both directions.

This report therefore does two things:

1. records what the current reference stack can already do; and
2. prevents “maintain a serious reference solver” from turning into a vague mandate to keep expanding a second solver indefinitely.

The live research priority remains [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md). This report is the current audit record for queue P5.

## Existing reference stack

### Full CP-SAT model

Primary model:

- [`scripts/stress/cpsat-full-probe.py`](../scripts/stress/cpsat-full-probe.py)

The file describes itself as a full-mechanic probe extending an earlier relaxed/core model. Current capabilities visible in code/comments include:

- exact path-position variables over a padded horizon;
- exact required counted length with portal-jump accounting;
- exact intersection count via real-node/distinct-cell relation;
- gate/start and goal constraints;
- edge-axis reuse constraints;
- must-pass;
- must-cross visit requirements combined with edge-axis reuse;
- turn/chirality state for landmark constraints;
- surround/adjacent-turn/must-turn families in the full model;
- portals, including one-use jump semantics and no-consecutive-jump behavior;
- flipping-filter global order/parity semantics;
- explicit prefix forcing;
- witness pinning for over-constraint checks; and
- emitted-path support for referee validation.

Static regular filters are deliberately rejected/skipped because neither stress corpus currently provides a validation population.

### Prefix / repair-retreat query path

Existing work already uses the model as a bounded exact-prefix oracle rather than only a full-level competitor. The repair-retreat study binary-searched exact feasible/infeasible boundaries along repair elites and validated CP-SAT-emitted completions with the canonical referee.

This is a particularly valuable reference use because the question is narrow, monotone, and directly connected to a search-quality mechanism.

### Existing exact/shadow consumers

Current research has used CP-SAT/reference labels for:

- repair rollback/retreat boundaries;
- beam/extinction-adjacent prefix labels;
- external hint/witness checks;
- reduced/targeted feasibility questions; and
- model-coverage validation after adding mechanics.

The model does not need to solve the whole stress corpus quickly to justify these uses.

## Strongest existing validation evidence

The 2026-08-15 flipping-filter report is currently the most useful validation anchor.

It records:

- **102/102** flipping-filter-bearing stored-witness checks feasible, with 0 UNKNOWN and 0 INFEASIBLE after fixes;
- **83/83** portal-bearing flipper-free witness checks feasible in the broader portal validation batch;
- cold unpinned CP-SAT solves on flipping-filter levels whose emitted paths differed from stored witnesses and were accepted by the real referee;
- prior cold portal-bearing emitted-witness/referee validation; and
- multiple real encoding bugs found precisely because emitted paths were independently refereed rather than trusting witness-pinning alone.

This is important methodological evidence. `--check-witness` is excellent for finding **over-constraint** because a model rejecting a real witness is wrong. It cannot by itself find **under-constraint**, because an easier model also accepts every valid witness. Cold emitted-path → canonical-referee validation is therefore mandatory whenever a model-produced SAT/OPTIMAL path is used as evidence.

## Encoding bugs are part of the audit, not an embarrassment to hide

The reference model has already exposed/fixed several failure classes, including:

- jump-type variables insufficiently constrained, permitting illegal transitions to masquerade as portal jumps;
- edge-axis reuse that originally modeled only entries rather than all axis-touching visits;
- goal-padding transitions spuriously counted as real axis touches;
- real path length not originally tied to `reqLen` plus portal jumps, permitting early goal arrival and padding;
- unused gate cells insufficiently prohibited in an earlier form; and
- historical support/abstention misattribution around must-cross vs flipping filters.

These bugs strengthen the case for the reference model **as a research instrument** while simultaneously proving that “CP-SAT said SAT/UNSAT” is not self-authenticating puzzle truth.

The canonical referee remains the arbiter of model-emitted witnesses, and model proof claims remain limited by encoding support and validation.

## Current support classification

The table below deliberately separates *encoding presence* from *validated exactness*.

| Mechanic / rule family | Current implementation evidence | Current audit classification | Needed before calling broadly exact-validated |
|---|---|---|---|
| Base grid adjacency / gates / goal / blocks | encoded in full model | encoded; substantial indirect witness validation | include in bounded canonical suite |
| Exact counted length / intersections | encoded; length bug fixed 2026-08-15 | encoded with known cold/referee validation after fix | include portal and non-portal cases in suite |
| Edge-axis reuse | encoded; prior under-constraint bug fixed after referee rejection | encoded with substantial witness/cold coverage | targeted adversarial fixtures for turns/revisits |
| Must-pass | encoded directly | encoded; likely straightforward | explicit witness + cold cases in suite |
| Must-cross | model claims exact satisfaction from two visits + global edge-axis reuse | **reconciliation required**: model/code claim exactness, while [`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) still labels generic external support “relaxed unless first-cross axis/lock is modeled” | prove/document why edge-axis-touch semantics make the CP-SAT encoding exact, or amend model/contract; add adversarial first-pass-turn fixtures |
| Must-turn / adjacent-turn chirality | turn variables and landmark families present | encoded; validation depth not yet summarized centrally | targeted witness + cold/referee fixtures for each chirality/portal-boundary interaction |
| Surround | encoded in full model | encoded; validation depth not yet summarized centrally | targeted suite |
| Portals | encoded, including padded horizon/jump typing; several bugs already found/fixed | strongest current exact candidate after flipper-free witness batches + cold referee checks | include pair counts and unused-pair/padding edge cases in suite |
| Flipping filters | encoded with global ordering/parity and no-turn/single-use semantics | strong targeted validation: 102 witness checks + cold referee-valid alternative paths | include mixed portal/flipper interactions, not only isolated families |
| Static filters | explicit skip | unsupported in current full model | no action until a real decision-bearing population/question exists |
| Goose / false goal / decorative exclusions | represented as impassable for solver scope where applicable | encoded for solver scope; not a PLAY simulation | bounded fixtures only if a research question depends on them |

### Must-cross documentation discrepancy

This audit should not silently choose a winner between two current descriptions.

`cpsat-full-probe.py` explicitly argues that must-cross is exact with:

- two visits; and
- the same edge-axis-reuse rule that prevents using an axis twice.

The durable mechanic contract still says external-model support is relaxed unless first-cross axis/lock is explicitly modeled.

Those statements may be reconcilable: if a turn on the first visit consumes both axis resources, a second legal visit is impossible, so “two visits + exact axis-touch reuse” may already enforce two straight crossings on opposite axes without a separate first-axis state variable. But that should be demonstrated with targeted referee-valid/adversarial fixtures and then documented consistently, not inferred from reassuring prose.

Until reconciled, must-cross-sensitive `INFEASIBLE` results should be treated with extra caution when they are decision-bearing.

## What the model may prove

When all involved mechanics/rules are exact-validated for the query:

- a model-emitted path accepted by the referee is a valid witness;
- `INFEASIBLE` can serve as an exact dead/UNSAT label for that encoded query;
- explicit-prefix feasibility can distinguish live/dead search states; and
- monotone prefix/retreat binary searches can locate exact boundaries.

When the model is relaxed/one-sided:

- SAT may show that the relaxation is feasible but not necessarily that Pathfinder is feasible;
- UNSAT may or may not be a safe implication depending on relaxation direction;
- the report must state the direction explicitly.

When unsupported or timed out:

- report **unsupported** or **UNKNOWN/timeout**;
- never collapse either into dead/UNSAT.

## What the model should *not* become

Do not make the CP-SAT model:

- a source of production per-level hints/configuration;
- a replacement criterion for “our solver solved the level”;
- an excuse to duplicate every runtime mechanic architecture in a second indefinitely maintained system;
- a giant full-corpus competition project before bounded research uses prove value; or
- a truth source whose own validation status is omitted from reports.

The reference model earns maintenance by answering questions that are otherwise expensive or ambiguous.

## Bounded audit suite design

The next concrete work should be a **small adversarial validation matrix**, not a giant benchmark.

### Case construction

Select stored valid witnesses and/or tiny hand-reduced fixtures covering:

1. base path + exact length/intersection;
2. must-pass;
3. must-cross with:
   - two straight opposite-axis crossings;
   - attempted first-visit turn;
   - axis-reuse near the must-cross cell;
4. must-turn CW / CCW / either;
5. adjacent-turn variants;
6. surround;
7. portals:
   - 1, several, and unused pairs;
   - arrival/exit around turn landmarks;
   - padding after fewer than maximum jumps;
8. flipping filters:
   - 1 and many;
   - mixed declared axes;
   - ordering/parity alternation;
9. mixed portal + flipper + turn/must-cross cases if available;
10. static-filter case only as a deliberate unsupported control.

Prefer tiny/reduced fixtures where they exercise a specific semantic edge more directly than a large stress level.

### Checks per exact-supported case

A case should normally receive both directions where feasible:

**Over-constraint check**

- pin a real stored/referee-valid witness;
- require CP-SAT to accept it.

**Under-constraint check**

- solve cold/unpinned or from a partial prefix;
- emit the model path;
- validate it with `Solver.validateCandidatePath` / canonical referee.

For a deliberately infeasible reduced fixture, compare `INFEASIBLE` to a tiny independent exhaustive/reference check where practical.

### Failure classification

Any disagreement becomes one of:

- model over-constraint;
- model under-constraint;
- native/referee misunderstanding;
- unsupported mechanic combination;
- timeout/complexity limitation;
- test/provenance error.

Do not “fix” a disagreement by weakening/strengthening constraints until the semantic rule is traced to canonical game/solver behavior.

## Turnaround/value gate

After the support audit, use the model on **one current ranked question** before expanding scope.

Good candidates include:

- an exact-live/dead beam retention boundary;
- a repair edit/retreat interface;
- a proposed learned-failure reason whose soundness needs a counterexample search; or
- a reduced counterexample for a new propagator.

Record:

- query construction cost;
- model solve/label turnaround;
- exact/unknown rate;
- whether the answer changed a real research decision;
- maintenance/debugging effort required.

### Success gate

Keep/elevate the reference program if the audited model produces reliable decision-changing labels at a cost meaningfully below equivalent heuristic archaeology on at least one active question.

### Stop/demotion gate

Keep only narrow exact/reduced forms if:

- model maintenance repeatedly exceeds the value of questions answered;
- most relevant hard queries time out/abstain;
- supporting remaining mechanics requires large duplicated architecture with little use; or
- exact/shadow questions can be answered more cheaply by native exhaustive/reducer tooling.

A smaller trustworthy oracle is better than a grand “full solver” whose support status is fuzzy.

## Documentation consequence after the audit

When the bounded suite closes:

1. update [`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) so `externalModelSupport` matches the verified model semantics rather than historical expectation;
2. add the reference-model validation/support entry point to [`docs/tooling-catalog.md`](../docs/tooling-catalog.md) if repeated use justifies a stable command;
3. keep detailed validation counts and bugs in dated reports;
4. keep unsupported/one-sided limitations explicit in every consumer report.

Do **not** create a new permanent `solver-reference-model.md` merely because this audit exists. The topic earns a durable doc only if repeated active use makes the existing mechanic/tooling references insufficient.