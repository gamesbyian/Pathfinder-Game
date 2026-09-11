# Resumable solver search

> **Status:** opt-in in-memory beam continuation primitive exists; the portfolio-18 same-policy residual-tranche scheduler test is CLOSED NULL, and no production scheduling policy currently consumes continuation.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) decides whether resumability work is active.
> **History:** [`archive/snapshots/solver-search-resumability-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-search-resumability-2026-09-04-pre-consolidation.md) plus dated reports below.

This document owns the **current resumability mechanism and research dispositions**, not the experiment diary.

## Implemented primitive

`beamSearchFromGate` has default-off continuation support for bounded research:

- `resumeFrom`: resume an existing in-memory beam continuation;
- `pauseAfterPhases`: pause at a deterministic phase boundary;
- `captureContinuationOnBudgetExit`: capture continuation at a work-cap exit. Exact at `beamWidth <= 256`; at wider production widths the mid-phase check defers to the next phase boundary, so capture is reliable but may overshoot `prep._workCap` by up to one phase's own work. Measured overshoot on real corpus levels at widths 2000/5000 is single-digit-percent.

Same-policy pause/resume has reproduced uninterrupted `W + Δ` execution with the same solve/unsolved outcome, solution, and cumulative canonical work. Correct continuation carries live mutable working/search state as well as the frontier; frontier-only replay incorrectly repays work.

The primitive is **in-memory only**. It does not authorize serialization, cross-process checkpoints, persisted continuation compatibility, or production scheduler use.

Primary feasibility evidence: [`../reports/2026-09-03-beam-resumability-feasibility-pilot-001.md`](../reports/2026-09-03-beam-resumability-feasibility-pilot-001.md).

## Continuation contract

A continuation is an execution object, not scheduler policy. It must preserve enough state to resume correctly, including as applicable:

- frontier/beam and phase/depth;
- parent-pointer/retention/dedup state required by future phases;
- deterministic insertion/tree ordering state;
- mutable path/constraint state needed to reconstruct the next frontier node;
- cumulative nodes/work and budget-boundary state;
- PRNG state for randomized configurations.

Rules:

- resumed work charges only newly performed work;
- natural exhaustion produces no continuation;
- pause/censoring is distinct from failure/exhaustion;
- continuation cannot contain identity-derived policy or historical per-level outcomes;
- default production behavior remains unchanged unless a separately validated scheduler policy promotes continuation use;
- fresh-vs-resumed equivalence tests must guard hidden predecessor-state dependence.

## Tested scheduler use case: portfolio-18 same-policy residual tranche

The failed `portfolio-18-tranche-v2` production-replacement test supplied a concrete reason to try same-policy continuation. Static lost 14/40 vs production 18/40; three of the four production-only wins were beam configurations already present in the static portfolio and capped only about 2-12% short in node count. A prior lifecycle-only tranche pilot had also found added work could rescue capped searches, while cold restart made reuse impractical.

The bounded candidate therefore kept the validated portfolio-18 first pass frozen, retired naturally exhausted beam attempts, retained capped beam attempts, and allowed each retained continuation at most one additional same-policy tranche inside the same 67M per-level envelope.

**CLOSED NULL (2026-09-11).** Production-width capture was implemented and `runStaticPortfolio` gained opt-in `resumableResidualPass`, exposed through `portfolio-solve-sweep.mjs` as `--resumable-residual-pass`. A fresh 120-level Corpus-2 fixed-work development A/B then showed real continuation participation but no coverage value: control 52/120, treatment 52/120, 120/120 eligible, 64 continuation dispatches, zero errors/truncation, zero losses, and zero treatment-exclusive gains.

Per the candidate's frozen decision rule, the simple same-policy residual-tranche salvage is closed. Do **not** retry it by varying tranche size, beam policy, or portfolio menu without a materially new premise. Evidence: [`../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md), [`../reports/portfolio/resumable-tranche-development-ab-001/result.md`](../reports/portfolio/resumable-tranche-development-ab-001/result.md).

## Tested policy-switch forms

### One beam-policy handoff

A single `intersectionHarvest -> objectiveFirst` inherited-frontier switch produced rare complementarity on two independent 30-level Corpus-2 samples: 2/60 cases solved only by inherited switching, with no opposite-direction loss in that pilot. This is development evidence, not a production rule or cross-generator confirmation.

Evidence: [`../reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md`](../reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md).

### Repeated/staged switching

For that same profile family, cyclic `A,B,A,B,...` alternation and a non-cyclic three-profile staged schedule added no reliable value over one handoff. Those schedule shapes are closed for the tested profile family. Reopen only with a structurally different premise, such as policies differing materially in retention/ordering behavior rather than another schedule variation.

Evidence: [`../reports/2026-09-03-beam-alternating-policy-schedule-pilot-001.md`](../reports/2026-09-03-beam-alternating-policy-schedule-pilot-001.md), [`../reports/2026-09-03-beam-staged-three-policy-pilot-001.md`](../reports/2026-09-03-beam-staged-three-policy-pilot-001.md).

## Cross-method handoff

The simplest beam-to-DFS form, handing one inherited beam state directly to DFS without a selection strategy, is closed negative for the tested population/profile pair. Shared state representation does not imply compatible search shape; fresh-gate DFS was materially better.

A genuine state-selection mechanism that chooses a DFS-suitable frontier state remains a distinct untested form. It has no current priority merely because it remains logically open.

Evidence: [`../reports/2026-09-03-beam-to-dfs-handoff-pilot-001.md`](../reports/2026-09-03-beam-to-dfs-handoff-pilot-001.md).

## Research interpretation and reopen gates

Resumability changes the executable cost of giving an attempt another tranche from `0->W + restart 0->W+Δ` to `0->W + resume W->W+Δ`. That can matter for dynamic allocation, but the now-closed portfolio experiment demonstrates that removing restart tax does not by itself establish useful marginal continuation value.

Additional work needs a current workstream premise and should isolate a materially distinct question:

- same search, later tranche value: **tested and CLOSED NULL** for the portfolio-18 residual-tranche form;
- same frontier, materially different future beam policy;
- selected-state cross-method handoff;
- memory/runtime overhead of retained continuations;
- only after those earn it, persistence/checkpointing across process boundaries.

Any production-facing policy remains level-blind and follows [`solver-scheduling-policy.md`](solver-scheduling-policy.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-research-operating-model.md`](solver-research-operating-model.md).