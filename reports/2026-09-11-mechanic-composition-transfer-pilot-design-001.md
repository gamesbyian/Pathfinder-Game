# Controlled mechanic-composition transfer pilot: design + first static check 001

> **Status:** active
> **Last evidence:** 2026-09-11 — the `R00726` static decoupling check plus reconciliation against the frozen +21/-0 A/B gain set. The relocation instrument works cleanly on the calibration parent, and the inference cohort/edit-selection rules are now frozen before dynamic outcomes are observed.
> **Decision:** Card A is executable as a small causal sibling experiment. `R00726` is calibration-only because it was used to develop the edit. The inference pool is the other independently referee-valid `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` treatment gains, selected by deterministic structural eligibility rather than outcome convenience.
> **Remaining gate:** materialize the deterministic 3-5-parent sibling cohort, run legality/connectivity plus observer manipulation checks, then run matched-work prune on/off only for siblings whose intended structural manipulation is clean. No broad generator campaign.
> **Evidence role:** design/prespecification plus zero-solver-compute instrument confirmation. No production solver behavior changes.

## Why this premise is earned

The promoted must-cross x visited-portal-terminal hard prune produced **21 treatment-exclusive gains and 0 losses** on the frozen 219-level opportunity population, with all 21 gains independently re-solved and referee-valid. That is a concrete generic capability whose causal boundary can now be perturbed rather than merely correlated with coarse portal/must-cross features.

The mechanism is composition-specific: a pending must-cross cell has a forced cardinal neighbour that is a portal terminal, and the rejection becomes sound once that specific terminal has already been consumed. Existing must-cross checks do not represent this coupled future-feasibility fact.

The question is therefore narrow:

**Does deliberately removing or changing that coupled obligation change observer/prune behaviour in the predicted direction on otherwise-nearby sibling levels?**

A positive answer earns adjacent capability-acquisition work. A negative answer closes this transfer instrument without reopening generic generator expansion.

## Calibration check already completed

`R00726`, one of the 21 independently verified A/B gains, contains two independent static obligation clusters:

- must-cross `(5,9)`, V-axis forced neighbour portal terminal `(5,10)`;
- must-cross `(11,3)`, H-axis forced neighbour portal terminal `(12,3)`.

Relocating the first portal terminal from `(5,10)` to free cell `(9,10)` removes exactly the targeted first cluster while preserving the second. `Solver.prepareLevelForSolver` still accepts the edited level. The static cluster list therefore changes **2 -> 1** exactly as predicted.

That establishes a usable manipulation instrument, but it also means `R00726` has been used for instrument development. It is **not** part of the inference cohort below.

## Frozen inference population

The causal follow-up starts from the 21 treatment-exclusive gains of the original frozen A/B, not from all 219 opportunity levels. These are the levels on which the promoted mechanism already demonstrated real rescue capability rather than mere observer applicability:

`R00726`, `R00817`, `R01046`, `R01274`, `R01489`, `R01616`, `R01766`, `R01885`, `R01893`, `R01919`, `R02342`, `R02511`, `R02518`, `R02894`, `R02912`, `R03025`, `R03103`, `R03245`, `R03336`, `R03427`, `R03465`.

`R00726` is calibration-only. The remaining 20 form the frozen candidate inference pool. No parent may enter or leave that pool because of sibling solve results.

Parent/family is the independent unit. Generated sibling identity is research-only and must never become a production routing signal.

## Deterministic parent and edit selection

The pilot should contain **five inference parents when at least five structurally eligible parents exist; three is the minimum interpretable cohort**. If fewer than three satisfy the manipulation contract, stop and record that this relocation instrument is not reusable enough for the proposed pilot.

Process the 20 candidate parents in ascending level-ID order. For each parent:

1. Enumerate static obligation clusters with the existing `findStaticObligationClusters` helper.
2. Order candidate clusters deterministically by must-cross row, must-cross column, axis, portal-terminal row, portal-terminal column.
3. For each cluster in that order, search relocation cells by increasing Manhattan distance from the portal terminal, with row/column order as the tie-break.
4. A relocation cell is eligible only when it is free, does not collide with another landmark, is not adjacent to any must-cross cell, preserves a preparable level, and relocating that one portal terminal removes **exactly one** targeted static obligation cluster without altering the identity of every other pre-existing cluster.
5. The first cluster/relocation pair satisfying all conditions is that parent's frozen edit. Do not search for a different edit after observing any dynamic or solve result.
6. Take the first five eligible parents in level-ID order. If only three or four are eligible, use all of them. If fewer than three are eligible, stop before solver comparison.

This rule deliberately optimizes neither for a dramatic sibling effect nor for apparent solvability. It only asks whether the causal instrument can be applied cleanly.

## Staged experiment

### Stage A: materialization and static integrity

For every selected parent, create exactly one original/decoupled sibling pair using the frozen edit above. Before any solver comparison:

- both siblings must parse and prepare;
- the edited sibling must satisfy ordinary level/referee structural validity requirements;
- the targeted cluster must disappear;
- all non-target pre-existing obligation clusters must remain identical;
- record the moved portal endpoint and its paired endpoint so the intervention is fully reconstructable.

Failure of these checks removes the **edit**, not the parent-selection rule. Do not substitute a hand-picked second edit after seeing a result; only the deterministic next structurally eligible edit from the rule above may be used.

### Stage B: observer manipulation check

Run the existing joint-obligation observer with pruning disabled on each original/decoupled pair under matched execution semantics. The primary manipulation check is structural cluster identity; the dynamic check asks whether rejection opportunities attributable to the removed cluster disappear or materially decline as predicted.

If the dynamic observer response does not track the intended structural change, stop for that parent and diagnose the instrument before any prune on/off solve comparison. Do not use a null observer manipulation as evidence that the prune itself transfers.

### Stage C: matched-work prune comparison

Only manipulation-valid sibling pairs proceed to the same matched-work prune on/off comparison contract used by the original promotion. Compare each sibling to its own parent counterpart, not generated levels to an aggregate corpus.

Record per parent:

- control/treatment solve outcome for original and decoupled sibling;
- `workSpent` and termination reason;
- observer participation;
- whether the original treatment-exclusive rescue disappears, persists, or changes cost after decoupling;
- referee validation for every claimed solve.

The pilot is diagnostic. With only 3-5 parents, do not report a population-scale effect size or treat raw sibling counts as a promotion estimate.

## Success, stop and advancement gates

**Mechanism-supporting result:** multiple independent parents show the predicted chain: clean structural decoupling -> corresponding observer participation change -> loss or material weakening of the previously demonstrated prune rescue. This earns a second, separately prespecified adjacent-boundary contrast such as alternative-interface manipulation or a larger untouched confirmation cohort.

**Mechanism-refining result:** structural and observer manipulation succeed but solve rescue persists. That says the promoted capability is less causally dependent on the single targeted cluster than expected, and the next work is to explain the surviving mechanism, not to generate more levels.

**Stop:** edits cannot be cleanly reused on at least three independent gains; observer behaviour fails to follow the manipulation; relocation introduces connectivity/general-difficulty confounds; or solve differences are not referee-valid. Any of these closes this specific transfer instrument without reopening broad generator work.

No result from this pilot authorizes a production per-level lookup, family-ID routing, broad topology generator, or portal-revisitability mechanic change.

## Other contrasts remain subordinate

**Alternative usable interface** is the next plausible sibling contrast if decoupling succeeds: add/remove another viable must-cross axis while keeping the coupled cluster itself present. It requires its own frozen edit rule before execution.

**Obligation slack** remains poorly defined in the current implementation because must-cross satisfaction is binary per cell. Do not run a `requiredLength`/`requiredIntersections` perturbation until a concrete causal quantity is specified.

**Portal revisitability** is an unconditional engine rule, not a level-data transform. Testing it would require a dedicated mechanics ablation and is outside this pilot.

## Relationship to the live queue

This line has graduated from deferred future work into the live parallel acquisition probe in `docs/solver-optimization-workstreams.md`. It does **not** depend on the pending production-boundary refresh or capability-memory census because its question is causal transfer of an already-demonstrated generic mechanism, not current residual membership.

The production refresh -> residual rejoin -> capability-memory census remains the WS2 serial spine. This pilot can run alongside it when compute is available.

## Artifacts and provenance

- frozen original opportunity population: `data/stress/joint-obligation-mc-portal-ab-001-ids.txt`;
- original positive A/B and the 21 treatment-exclusive gains: `reports/2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md`;
- static predicate/helper: `scripts/stress/lib/joint-obligation-mc-portal.mjs`;
- calibration parent: `R00726`, portal-terminal relocation `(5,10) -> (9,10)`, static cluster count `2 -> 1` with the unrelated cluster preserved.

No additional solver run was used to freeze this prespecification.