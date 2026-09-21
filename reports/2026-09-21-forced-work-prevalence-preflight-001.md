# Forced-work prevalence preflight 001

> **Status:** active
> **Last evidence:** 2026-09-21 — production-inert beam observer seam and prevalence probe implemented on PR #1952.
> **Decision:** measure current-residual one-successor canonical-work prevalence before considering any forced-chain consumer.
> **Remaining gate:** run the frozen 64-parent current-residual census below and apply the preregistered admission bands; no forced-chain consumer before that result.
> **Evidence role:** discovery
> **Selection:** prespecified current-residual sample to be frozen before execution.
> **Inference scope:** oracle-ceiling and prevalence sizing only; no production behavior claim.
> **Question owner:** capability-gap reconciliation, forced-chain traversal row.
> **Production effect:** none. Research telemetry only.
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

The first development population is now frozen in [`reports/stress/forced-work-prevalence-sample-2026-09-21.json`](stress/forced-work-prevalence-sample-2026-09-21.json): 64 independent C2 parents sampled from the exact 531-level residual of production-boundary run `35066677597` (artifact `10440286196`, head `16114b80`). Selection grouped the residual by production-stage eligibility/reach signature, allocated at least two parents per nonempty signature, then sampled across baseline `workSpent` rank. No forced-work telemetry was inspected.

The full residual identity is retained by source run/artifact plus a sorted-ID SHA-256 in the manifest. The sample itself has its own ID hash. This avoids mutable “current residual” reconstruction.

First execution:

```bash
npm run research:forced-work-prevalence -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels-file=reports/stress/forced-work-prevalence-sample-2026-09-21.json \
  --profile=objectiveFirst --width=500 \
  --work-budget=5000000 --budget-ms=600000 \
  --out=reports/stress/forced-work-prevalence-current-residual-2026-09-21.json
```

Treat any wall-deadline-bound row as censored. Report parents as independent units. If the first pass exposes substantial headroom, replicate at a materially different beam width/profile before inferring general prevalence.

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
