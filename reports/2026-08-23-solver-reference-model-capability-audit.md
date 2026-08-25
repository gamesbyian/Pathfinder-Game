# Solver exact/reference-model capability audit

> **Status:** active
> **Last evidence:** 2026-08-24 — current `cpsat-full-probe.py`, explicit-prefix and repair-retreat wrappers, native mechanic-state contract, flipping/portal validation, mixed repair-retreat prefixes, and current queue #6 certificate/restart audit
> **Decision:** treat the existing CP-SAT/reference stack as a serious but bounded research oracle now; do not expand it yet. Current implementation can express every mechanic used by the stress corpora; static regular filters remain deliberately unsupported. Close the remaining validation gap with a small adversarial matrix rather than another broad model build.
> **Remaining gate:** targeted bidirectional validation for the least-directly-audited mechanic interactions (especially turn/adjacent-turn/surround, must-cross edge cases, and tiny independently-checkable dead fixtures), plus decision-changing use on one current ranked question. Reuse existing exact branch labels before buying new CP-SAT calls.
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
| Must-cross | `visits == 2` plus exact per-visit edge-axis-touch reuse | **encoding logic reconciled as exact** with native first-pass lock semantics; broad targeted validation still desirable | adversarial first-pass-turn / axis-reuse fixtures plus cold/referee cases |
| Must-turn / adjacent-turn chirality | turn variables and landmark families present | exact encoding present; validation depth not yet summarized centrally | targeted witness + cold/referee fixtures for each chirality/portal-boundary interaction |
| Surround | encoded in full model | exact encoding present; validation depth not yet summarized centrally | targeted suite |
| Portals | encoded, including padded horizon/jump typing; several bugs already found/fixed | strongest current exact candidate after flipper-free witness batches + cold referee checks | keep pair-count/unused-pair/padding adversarial cases in suite; do not rerun broad population merely for volume |
| Flipping filters | encoded with global ordering/parity and no-turn/single-use semantics | strong targeted validation: 102 witness checks + cold referee-valid alternative paths | mixed portal/flipper prefix evidence now exists; retain one or two mixed adversarial cases in suite |
| Static filters | explicit skip | unsupported in current full model | no action until a real decision-bearing population/question exists |
| Goose / false goal / decorative exclusions | represented as impassable for solver scope where applicable | encoded for solver scope; not a PLAY simulation | bounded fixtures only if a research question depends on them |

### Must-cross support reconciliation

The audit initially found a real documentation discrepancy: `cpsat-full-probe.py` described must-cross as exactly enforceable through `visits == 2` plus edge-axis reuse, while [`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) still said an external model was relaxed unless it explicitly tracked the first-cross axis/lock state.

Reading the native legality path resolves the apparent disagreement. `search-state.ts` has an explicit **must-cross lock prevention** rule: on the unsatisfied first pass, turning would consume the other axis at that cell and permanently block the required second crossing. The CP-SAT model already encodes the equivalent resource consequence globally: a visit that turns touches both axes, while its exact edge-axis-touch constraints permit each axis at most once. Therefore requiring two visits makes a first-pass turn infeasible automatically; two legal visits must be straight crossings on opposite axes.

So a separate first-axis variable is not required **in this model while the exact edge-axis-touch constraints are present**. Visit count by itself would still be insufficient. The durable mechanic contract has been corrected accordingly.

This closes the documentation-logic discrepancy, not the broader validation gate. Targeted adversarial must-cross fixtures remain useful because a hand-written equivalence should be exercised directly before broad `INFEASIBLE` claims rely on it.

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

## 2026-08-24 follow-up: gate narrowing and consumer audit

A current-code reconciliation narrowed the remaining P5 work further.

### Existing evidence already covers more mixed terrain than the table originally implied

The 2026-08-15 repair-retreat reruns provide **mixed portal + flipping-filter + must-cross** prefix evidence, not only isolated mechanic-family checks. `R00630` and `R02449` each carry five flipping filters and three portal pairs; `R00630` also has five MustCross cells. After the `real_N == reqLen + 1 + jumps` under-constraint fix, `R00630` converged to a clean adjacent live/dead prefix boundary and `R02449` produced a referee-verified live prefix plus a separate exact-dead upper point, with genuine `UNKNOWN` inside the harder transition band. That is meaningful mixed-consumer validation and should be reused rather than replaced by another broad batch.

The post-flipper B2 extinction-adjacent rerun is another useful consumer control: **25 live / 4 dead / 3 timeout-abstain, 0 unsupported-mechanics, 0 correctness alarms, 0 input alarms** across the 32 selected cases. It also changed the beam diagnosis by adding two exact D-class dead-top/live-alternative examples. This already demonstrates that targeted prefix labels can alter a real research conclusion; the remaining turnaround gate should be interpreted as proving continued value on a **current** ranked question, not pretending the model has never paid for itself.

### Wrapper semantics are currently conservative

`cpsat-explicit-prefix-oracle-lib.mjs` preserves `OPTIMAL/FEASIBLE -> live`, `INFEASIBLE -> dead`, and maps `UNKNOWN`, `MODEL_INVALID`, unsupported mechanics, process errors and unparsed output to abstention. `cpsat-explicit-prefix-oracle.mjs` additionally replays every supplied prefix through native transition machinery before the model call and downgrades a SAT result to abstention if no path is emitted or the canonical referee rejects it.

`repair-retreat-binary-search.mjs` uses the same classifier/referee path and stops the bisection on any abstention rather than moving a feasible/infeasible bound. Its stored result semantics are therefore safe. One console line still prints an “exact boundary” shape after an abstained bisection even though the stored note correctly says the interior did not converge; treat that line as presentation shorthand, not evidence that an UNKNOWN interval has been closed.

### Documentation drift found and corrected

`docs/mechanic-state-contracts.md` defined its `externalModelSupport` field as the capability of the **current maintained external model**, but its table had drifted in two directions: regular filters were listed `exact` even though `cpsat-full-probe.py` explicitly skips them, while MustTurn/AdjacentTurn were listed `relaxed` even though the full model now contains the required turn/chirality variables and landmark constraints. The table has been reconciled on the 2026-08-24 research branch. The field now states encoding capability; validation confidence remains here in this audit.

### Practical remaining validation matrix

Do not rerun the 102-level flipper or broad portal batches merely to increase sample counts. The remaining highest-information fixtures are narrow:

1. MustTurn CW/CCW/either, including the “no defined turn across a portal jump” boundary;
2. AdjacentTurn CW/CCW/either with several candidate neighbouring cells, so the OR semantics is genuinely load-bearing;
3. Surround on a tiny fixture where one missing neighbour separates SAT from UNSAT;
4. MustCross first-pass-turn and nearby axis-reuse adversaries, directly exercising the equivalence between native lock prevention and the model's two-visit + per-axis-touch formulation;
5. at least one tiny deliberately infeasible fixture per nontrivial family where an independent exhaustive/native check can corroborate CP-SAT `INFEASIBLE` rather than relying only on positive witnesses;
6. one mixed portal/flipper/turn or portal/flipper/MustCross case retained as a regression fixture from existing evidence;
7. one static-filter case that must return unsupported, as a negative capability control.

This is a semantic suite, not a benchmark. A dozen well-chosen fixtures can be more informative than another hundred ordinary witnesses.

### Current ranked use: reuse before new oracle spending

Queue #6's learned-failure audit now has a bounded candidate seam: joint dynamic residual-interface/resource incompatibility. Its **discovery** phase does not require new CP-SAT calls. The existing 5,518-branch exact/shadow atlas already carries enough live/dead labels to ask whether a proposed bounded reasoner adds unique exact separation and whether its explanation keys recur across different exact states. Only if the needed state family lies outside that atlas, or if independent confirmation is required, should P5 buy fresh exact-prefix labels.

This is the preferred current P5/P6 coupling: reference labels as a microscope for one narrowly specified reason family, not CP-SAT expansion as an end in itself.

## Documentation consequence after the audit

When the bounded suite closes:

1. keep [`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) aligned with verified model semantics as support changes;
2. keep the reference-model validation/support entry point in [`docs/tooling-catalog.md`](../docs/tooling-catalog.md) aligned with this report;
3. keep detailed validation counts and bugs in dated reports;
4. keep unsupported/one-sided limitations explicit in every consumer report.

Do **not** create a new permanent `solver-reference-model.md` merely because this audit exists. The topic earns a durable doc only if repeated active use makes the existing mechanic/tooling references insufficient.