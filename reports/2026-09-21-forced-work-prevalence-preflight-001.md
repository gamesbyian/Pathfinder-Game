# Forced-work prevalence preflight 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — preregistered 64-parent census completed successfully in GitHub Actions run `35657944874` (artifact `10666349433`).
> **Decision:** forced-work prevalence is decisively headroom-positive: one-successor parents carry 25.33% of measured canonical parent-expansion work across the frozen current-residual sample; advance to capture-fraction/safety economics, not production contraction.
> **Remaining gate:** `WS2-FORCED-WORK-CAPTURE-ECONOMICS` must measure truly removable work, recognition/transition overhead, semantic parity, capability preservation, and overlap with existing pruning before any production consumer.
> **Evidence role:** discovery
> **Selection:** prespecified 64-parent current-residual sample frozen before forced-work telemetry is inspected.
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

The first development population is frozen in [`data/stress/forced-work-prevalence-sample-2026-09-21.json`](../data/stress/forced-work-prevalence-sample-2026-09-21.json): 64 independent C2 parents sampled from the exact 531-level residual of production-boundary run `35066677597`, recovered from combined artifact `10439992643` (`solver-stress-refresh-combined`, head `16114b80`, source `reports/stress/solver-corpus2-latest.json`). Selection grouped the residual by production-stage eligibility/reach signature, allocated at least two parents per nonempty signature, then sampled across baseline `workSpent` rank. No forced-work telemetry was inspected.

The full residual identity is retained by source run/artifact plus a sorted-ID SHA-256 in the manifest. The sample itself has its own ID hash. This avoids mutable “current residual” reconstruction.

First execution:

```bash
npm run research:forced-work-prevalence -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels-file=data/stress/forced-work-prevalence-sample-2026-09-21.json \
  --profile=objectiveFirst --width=5000 \
  --work-budget=5000000 --budget-ms=600000 \
  --out=reports/stress/forced-work-prevalence-census-2026-09-21.json
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


## Census result

The frozen 64-parent census completed successfully in GitHub Actions run `35657944874` (artifact `10666349433`).

- expanded parents: **19,260,501**;
- one-successor parents: **7,617,557** (**39.55%**);
- measured canonical parent-expansion work: **90,572,067**;
- work at one-successor parents: **22,944,663** (**25.33%** oracle ceiling);
- all **64/64** independent sampled parents exceeded the preregistered 5% headroom threshold;
- per-parent forced-work share: **11.68% min / 24.81% median / 46.65% max**;
- observed forced chains: **5,813,731**, pooled mean length **1.31**, typical per-level p90 **2**, maximum length **14**.

This is far above the preregistered **HEADROOM POSITIVE** gate. The opportunity is broad rather than a single-family spike, but the short-chain distribution changes the implementation hypothesis: do not build a long-chain compressor first. Measure whether frequent individual forced steps can bypass enough repeated generation/pruning/scoring/retention work to survive their own recognition and transition costs.

The 25.33% figure remains an **upper bound**, not expected speedup. It includes work that a correct forced-step consumer may still need to perform.

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

Advance only `WS2-FORCED-WORK-CAPTURE-ECONOMICS`: build the smallest production-inert semantics-preserving forced-step shadow/consumer needed to measure captured work and overhead. Keep production behavior unchanged until that gate passes.
