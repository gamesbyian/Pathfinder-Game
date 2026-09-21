# Forced-work prevalence preflight 001

> **Status:** probe implemented; empirical run pending.
> **Date:** 2026-09-21.
> **Question owner:** capability-gap reconciliation, forced-chain traversal row.
> **Production effect:** none. This is production-inert research telemetry over the existing beam search.
> **Implementation:** `scripts/stress/forced-work-prevalence.mjs` and `forced-work-prevalence-lib.mjs`.

## Question

Across the current hard residual, what fraction of canonical search work is spent expanding retained beam parents for which ordinary hard pruning leaves exactly one surviving successor?

The implementation question **is not** whether to add forced-chain traversal. The first gate is whether enough current work lies in the eliminable class to make any such implementation economically interesting.

## Why this is distinct from recent speed audits

The batch-digestion audit tested ingestion, compilation, caching, canonicalization and cross-level reuse ideas. This probe asks about work *inside the search tree after the level is already prepared*.

The capability-gap reconciliation records forced-chain traversal as historically positive but explicitly unresolved for the current solver because current prevalence/economics have never been remeasured.

## Existing seam

No new solver instrumentation is required.

Beam search already supports a research observer with `includeParentExpansionWork`. At each completed generation it reports, per incoming retained parent:

- the exact path identity;
- canonical `workSpent` while expanding that parent, excluding beam path-replay overhead;
- `generatedCandidates`, which counts candidates surviving the ordinary hard-prune pipeline.

The probe observes those records and leaves pruning, scoring, ordering, retention and production policy unchanged.

## Primary measurements

For each isolated beam/gate run:

- expanded parent count;
- zero-, one-, and multi-successor parent counts;
- total canonical parent-expansion work;
- canonical work spent at one-successor parents;
- one-successor work share;
- traversed runs of consecutive one-successor parents;
- chain-length distribution;
- chain termination category: branch, dead end, forced child not retained, forced child not expanded, or no surviving child identity.

The probe also aggregates these quantities across selected independent levels.

## Oracle-ceiling interpretation

The primary admission statistic is:

> **If recognition and contraction were perfect and free, how much currently measured parent-expansion canonical work could disappear at most?**

The probe reports one-successor parent-expansion work as an **upper bound**, not expected savings. A real implementation still has to preserve transition semantics, work accounting, solution recognition, mechanics, observer behavior and any unavoidable state updates.

Therefore:

- a small upper bound closes the current forced-chain speed premise cheaply;
- a large upper bound earns deeper decomposition of what portion is actually contractible;
- a large node fraction with a small work fraction is not sufficient;
- long chains are interesting only when they carry material canonical work.

## Population

Use the current hard residual rather than a hand-picked historical success set.

The first run should be a bounded development census over independent current residual parents, stratified enough to avoid letting one mechanic/family dominate. Historical residual class membership is legal for offline research selection but never a production input.

The CLI deliberately requires explicit `--levels` or `--levels-file` so population identity is frozen outside the probe rather than silently reconstructed from filenames or current outcomes.

Recommended first pass:

- one representative production-relevant beam profile/width;
- a work cap large enough to expose meaningful search without making this an expensive full solve campaign;
- non-binding wall deadline;
- report parent-grouped results, not rows as independent observations.

If the first pass exposes substantial headroom, replicate on at least one materially different beam width/profile before inferring general prevalence.

## Frozen interpretation gate

This probe does **not** directly earn a production implementation.

Disposition after the first representative census:

- **CLEAR NEGATIVE:** aggregate one-successor canonical expansion-work ceiling <1%, with no recurrent independent-parent stratum showing material long-chain work. Close current forced-chain speed work and retain only the historical note.
- **WEAK / AMBIGUOUS:** 1-5% aggregate ceiling, or a larger ceiling concentrated in one selected mechanic/family. Diagnose concentration and replication before implementation.
- **HEADROOM POSITIVE:** >=5% aggregate ceiling across independent parents, or smaller aggregate share with a clearly recurring high-cost stratum whose removal could plausibly matter at batch scale. Then measure the *capture fraction*: transition work that is truly avoidable versus semantics that must still execute.

These are admission bands for further measurement, not production promotion thresholds.

## Reactivity and validity

The observer already exists in the research surface and does not alter candidate generation or hard-prune verdicts. The probe requests complete parent-expansion records and summarizes them offline.

A work cap uses beam's existing phase-boundary continuation capture so the probe does not stop halfway through a generation and misclassify an incomplete parent cohort. The run may overshoot the requested work cap by at most the current phase; the output records that overshoot.

If the wall deadline binds before the work/phase boundary, treat the row as censored rather than a clean prevalence observation.

## What this probe cannot establish

It does not establish:

- that a one-successor parent is cheap to recognize earlier;
- that the same condition holds in DFS;
- that score/sort or state-transition work can all be skipped;
- that literal path compression is the right consumer;
- that a forced future remains forced under a different search representation;
- that mechanics terminating chains are themselves causal opportunities.

Those are descendants only if the oracle ceiling earns them.

## Next action

Run the smallest representative current-residual census and record the oracle ceiling before writing any forced-chain production code.
