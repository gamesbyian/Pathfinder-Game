# Controlled mechanic-composition transfer pilot: design + first static check 001

> **Status:** superseded
> **Last evidence:** 2026-09-12 — the designed Stage A/B/C pilot was executed on the corrected frozen inference population; the portal-terminal relocation instrument closed negative because it introduced general-navigation confounds on 2/5 parents. See [`the result`](2026-09-12-mechanic-composition-pilot-001-result.md).
> **Decision:** preserve this file as the original prespecification, including its corrected population transcription, but do not treat it as a live experiment gate. The relocation instrument is closed. Any successor manipulation needs a new frozen edit rule and explicit execution envelope.
> **Remaining gate:** none for this design. A materially different manipulation may be proposed only under the reopen condition in the live workstream/result report.
> **Evidence role:** historical design/prespecification. No production solver behavior changes.

## Why this premise was earned

The promoted must-cross x visited-portal-terminal hard prune produced **21 treatment-exclusive gains and 0 losses** on the frozen 219-level opportunity population, with all 21 gains independently re-solved and referee-valid. That established a concrete generic capability whose causal boundary could be perturbed rather than merely correlated with coarse portal/must-cross features.

The mechanism is composition-specific: a pending must-cross cell has a forced cardinal neighbour that is a portal terminal, and the rejection becomes sound once that specific terminal has already been consumed. Existing must-cross checks do not represent this coupled future-feasibility fact.

The question was narrow:

**Does deliberately removing or changing that coupled obligation change observer/prune behaviour in the predicted direction on otherwise-nearby sibling levels?**

## Calibration check

`R00726`, one of the 21 independently verified A/B gains, contains two independent static obligation clusters:

- must-cross `(5,9)`, V-axis forced neighbour portal terminal `(5,10)`;
- must-cross `(11,3)`, H-axis forced neighbour portal terminal `(12,3)`.

Relocating the first portal terminal from `(5,10)` to free cell `(9,10)` removes exactly the targeted first cluster while preserving the second. `Solver.prepareLevelForSolver` still accepts the edited level. The static cluster list changes **2 -> 1** exactly as predicted.

That established the original manipulation instrument, but it also made `R00726` calibration-only.

## Frozen inference population

The original text below was frozen before execution but contained a transcription error:

`R00726`, `R00817`, `R01046`, `R01274`, `R01489`, `R01616`, `R01766`, `R01885`, `R01893`, `R01919`, `R02342`, `R02511`, `R02518`, `R02894`, `R02912`, `R03025`, `R03103`, `R03245`, `R03336`, `R03427`, `R03465`.

`R00726` was calibration-only. The remaining 20 were intended to form the candidate inference pool.

> **Correction (2026-09-12):** the list above did not match this report's cited source. [`The A/B preflight's real 21 gains`](2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md) are `R00726`, `R01274`, `R01489`, `R01849`, `R01882`, `R02036`, `R02060`, `R02162`, `R02389`, `R02479`, `R02546`, `R02654`, `R02707`, `R02823`, `R02832`, `R02864`, `R02932`, `R03097`, `R03106`, `R03254`, `R03336`. Only four IDs overlapped between the two lists and several of the original IDs did not exist in any corpus. Execution correctly used the preflight's verbatim gain list minus calibration-only `R00726`. See [`the result`](2026-09-12-mechanic-composition-pilot-001-result.md).

Parent/family was the independent unit. Generated sibling identity remained research-only.

## Deterministic parent and edit selection

The pilot targeted five inference parents when at least five structurally eligible parents existed; three was the minimum interpretable cohort.

The frozen selection procedure was:

1. Enumerate static obligation clusters with `findStaticObligationClusters`.
2. Order candidate clusters deterministically by must-cross row, must-cross column, axis, portal-terminal row, portal-terminal column.
3. Search relocation cells by increasing Manhattan distance from the portal terminal, with row/column tie-break.
4. Require a free relocation cell, no landmark collision, no adjacency to any must-cross cell, a preparable level, removal of exactly the targeted cluster, and preservation of all other pre-existing cluster identities.
5. Take the first satisfying cluster/relocation pair. Do not search for a more convenient edit after seeing dynamic outcomes.
6. Take the first five eligible parents in level-ID order.

This rule optimized neither for a dramatic sibling effect nor for apparent solvability.

## Staged experiment

### Stage A: materialization and static integrity

For every selected parent, create exactly one original/decoupled sibling pair using the frozen edit. Require both siblings to parse/prepare, the targeted cluster to disappear, all non-target clusters to remain identical, and the moved/paired portal endpoints to be recorded.

### Stage B: observer manipulation check

Run the joint-obligation observer with pruning disabled on each original/decoupled pair under matched execution semantics. Require rejection opportunities attributable to the removed cluster to disappear or materially decline before proceeding.

### Stage C: matched prune comparison

The design intended Stage C to use the same matched-work prune on/off contract as the original promotion. Actual execution used a **smaller diagnostic envelope** (`nodeBudget=20,000,000`, `timeBudgetMs=300,000`) matched across each parent's four arms rather than the original promotion's 50M-node / 67M-work production envelope. The result report therefore treats any failure to reproduce an original rescue as inconclusive and bases closure on the independently observable decoupled-control confounds, not on reduced-envelope non-reproduction.

Record per parent:

- control/treatment solve outcome for original and decoupled sibling;
- `workSpent` and termination reason;
- observer participation;
- whether the original treatment-exclusive rescue disappears, persists, or changes cost after decoupling;
- referee validation for every claimed solve.

The pilot was diagnostic; raw 3-5-parent counts were never a population-scale promotion estimate.

## Success, stop and advancement gates

**Mechanism-supporting result:** multiple independent parents show clean structural decoupling -> corresponding observer change -> loss or material weakening of the previously demonstrated prune rescue.

**Mechanism-refining result:** structural and observer manipulation succeed but solve rescue persists.

**Stop:** edits cannot be cleanly reused on at least three independent gains; observer behaviour fails to follow the manipulation; relocation introduces connectivity/general-difficulty confounds; or solve differences are not referee-valid.

The actual pilot hit the relocation-confound stop condition on 2/5 parents, so this design is now closed.

No result from this pilot authorizes production per-level lookup, family-ID routing, broad topology generation, or portal-revisitability mechanic changes.

## Successor boundary

If mechanic-composition transfer is revisited, the next manipulation must not relocate a landmark shared with the general navigation graph. Adding/removing an alternative viable must-cross axis while keeping the coupled cluster present remains a plausible idea, but it requires a **new** prespecification with its own deterministic edit rule, confound check and frozen execution envelope.

## Artifacts and provenance

- frozen original opportunity population: `data/stress/joint-obligation-mc-portal-ab-001-ids.txt`;
- original positive A/B and 21 treatment-exclusive gains: `reports/2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md`;
- static predicate/helper: `scripts/stress/lib/joint-obligation-mc-portal.mjs`;
- calibration parent: `R00726`, portal-terminal relocation `(5,10) -> (9,10)`, static cluster count `2 -> 1` with unrelated cluster preserved;
- completed execution/result: `reports/2026-09-12-mechanic-composition-pilot-001-result.md`.
