# Solver exact/reference-model capability audit

> **Status:** active
> **Last evidence:** 2026-08-24 - static reconciliation of `cpsat-full-probe.py`, mechanic-state contracts, tooling catalog, current queue, prior CP-SAT validation, repair-retreat prefix work, and the existing extinction-adjacent beam case set; corrected stale external-model support entries and confirmed the beam oracle has already produced decision-useful A/D live/dead labels
> **Decision:** treat the existing CP-SAT/reference stack as serious but bounded research infrastructure now; do not expand mechanic scope. Close the small bidirectional support matrix, then use additional oracle queries only when a ranked question has a specific label gap that existing exact material cannot answer
> **Remaining gate:** produce a bounded support/validation suite that classifies each relevant mechanic combination as exact-validated, encoded-but-insufficiently-validated, one-sided/relaxed, unsupported, or timeout-prone, with every emitted witness checked by the canonical referee. For beam-retention Priority 4, analyze the already-committed A/D exact cases before spending more CP-SAT work
> **Evidence role:** forensic
> **Selection:** observational - audit follows prior targeted CP-SAT work and current reference-program reprioritization

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

This is important methodological evidence. `--check-witness` is excellent for finding **over-constraint** because a model rejecting a real witness is wrong. It cannot by itself find **under-constraint**, because an easier model also accepts every valid witness. Cold emitted-path -> canonical-referee validation is therefore mandatory whenever a model-produced SAT/OPTIMAL path is used as evidence.

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
| Must-turn / adjacent-turn chirality | turn variables and landmark families present | encoded; validation depth not yet summarized centrally | targeted witness + cold/referee fixtures for each chirality/portal-boundary interaction |
| Surround | encoded in full model | encoded; validation depth not yet summarized centrally | targeted suite |
| Portals | encoded, including padded horizon/jump typing; several bugs already found/fixed | strongest current exact candidate after flipper-free witness batches + cold referee checks | include pair counts and unused-pair/padding edge cases in suite |
| Flipping filters | encoded with global ordering/parity and no-turn/single-use semantics | strong targeted validation: 102 witness checks + cold referee-valid alternative paths | include mixed portal/flipper interactions, not only isolated families |
| Static filters | explicit skip | unsupported in current full model | no action until a real decision-bearing population/question exists |
| Goose / false goal / decorative exclusions | represented as impassable for solver scope where applicable | encoded for solver scope; not a PLAY simulation | bounded fixtures only if a research question depends on them |

### Must-cross support reconciliation

The audit initially found a real documentation discrepancy: `cpsat-full-probe.py` described must-cross as exactly enforceable through `visits == 2` plus edge-axis reuse, while [`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) still said an external model was relaxed unless it explicitly tracked the first-cross axis/lock state.

Reading the native legality path resolves the apparent disagreement. `search-state.ts` has an explicit **must-cross lock prevention** rule: on the unsatisfied first pass, turning would consume the other axis at that cell and permanently block the required second crossing. The CP-SAT model already encodes the equivalent resource consequence globally: a visit that turns touches both axes, while its exact edge-axis-touch constraints permit each axis at most once. Therefore requiring two visits makes a first-pass turn infeasible automatically; two legal visits must be straight crossings on opposite axes.

So a separate first-axis variable is not required **in this model while the exact edge-axis-touch constraints are present**. Visit count by itself would still be insufficient. The durable mechanic contract has been corrected accordingly.

This closes the documentation-logic discrepancy, not the broader validation gate. Targeted adversarial must-cross fixtures remain useful because a hand-written equivalence should be exercised directly before broad `INFEASIBLE` claims rely on it.

### 2026-08-24 support-contract staleness correction

A later static audit found that the same durable mechanic table had drifted again in a different way. It still listed regular static filters as externally exact even though the maintained full CP-SAT probe explicitly skips any level with `filters`, while it listed must-turn and adjacent-turn as relaxed despite the current full probe containing turn/chirality encodings for those landmark families.

[`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) is now reconciled to the maintained full probe:

- regular static filters: **unsupported by the maintained full probe**;
- flipping filters: exact encoding present, with strong targeted validation already recorded;
- must-turn and adjacent-turn: exact encoding present, but broad validation depth remains incomplete;
- surround: exact encoding present, with validation depth still to be summarized.

The correction also makes the contract explicit that `externalModelSupport` describes **encoding capability**, not proof that every combination is sufficiently validated for broad `INFEASIBLE` claims. This report remains the validation-depth authority.

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

The next concrete model-validation work should be a **small adversarial validation matrix**, not a giant benchmark.

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

The value gate has already been crossed twice in bounded form.

### Repair retreat

The repair-retreat study used explicit-prefix feasibility and binary search to locate exact feasible/infeasible rollback boundaries, with emitted completions validated by the canonical referee. This changed the interpretation of repair failure: some elite trajectories had already crossed an exact completion boundary rather than merely being difficult for the native repair operator.

### Beam extinction

The existing beam case set [`reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json) and its report [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md) already answer the exact boundary question that this audit had initially nominated as future work.

After flipping-filter support was added, the 2026-08-15 rerun of the 32 committed cases produced **25 live / 4 dead / 3 timeout, 0 correctness alarms, 0 input alarms**. It includes A- and D-class parents where the beam's score-preferred top candidate is exact-dead while a same-parent discarded/near-cutoff alternative is exact-live. The D-class examples also have a live rank-100 near-cutoff candidate, showing that the saturated pool retains viable capacity while top scoring can prefer a dead state.

Therefore do **not** launch another exact-label campaign merely to re-establish beam mis-ranking. Priority 4 should consume the existing labels first. The 2026-08-24 scalar sanity check in [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md) already uses those exact pairs to falsify several simplistic future-opportunity summaries.

Additional CP-SAT beam queries are justified only when the offline descriptor pass identifies a concrete missing comparison, such as an unlabeled sibling needed to distinguish two candidate interface hypotheses.

### Ongoing value accounting

For every future use, still record:

- query construction cost;
- model solve/label turnaround;
- exact/unknown rate;
- whether the answer changed a real research decision;
- maintenance/debugging effort required.

A reference solver can have paid rent historically and still become the wrong tool for a new query.

### Success gate

**Met for bounded research use.** The model has produced reliable, decision-changing labels for both repair-retreat and beam-retention questions without needing full-corpus exact solving.

The remaining question is maintenance scope, not whether the reference stack has any research value. Keep/elevate the bounded forms while requiring new mechanic/model expansion to justify itself separately.

### Stop/demotion gate

Keep only narrow exact/reduced forms if:

- model maintenance repeatedly exceeds the value of questions answered;
- most relevant hard queries time out/abstain;
- supporting remaining mechanics requires large duplicated architecture with little use; or
- exact/shadow questions can be answered more cheaply by native exhaustive/reducer tooling.

A smaller trustworthy oracle is better than a grand “full solver” whose support status is fuzzy.

## Documentation consequence after the audit

When the bounded suite closes:

1. keep [`docs/mechanic-state-contracts.md`](../docs/mechanic-state-contracts.md) aligned with verified model semantics as support changes;
2. keep [`docs/tooling-catalog.md`](../docs/tooling-catalog.md) aligned with the maintained probe, its abstentions, and validation direction;
3. keep detailed validation counts and bugs in dated reports;
4. keep unsupported/one-sided limitations explicit in every consumer report.

Do **not** create a new permanent `solver-reference-model.md` merely because this audit exists. The topic earns a durable doc only if repeated active use makes the existing mechanic/tooling references insufficient.