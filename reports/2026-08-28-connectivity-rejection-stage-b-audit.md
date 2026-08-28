# Connectivity-rejection Stage B audit — boundary-sketch recurrence

> **Status:** concluded-negative
> **Last evidence:** 2026-08-28 — 80-level boundary-sketch run on `data/stress/stress-levels-random.json` (corpus2, same population as the Stage A audit), `--boundary-sketch` mode of `scripts/connectivity-rejection-audit.mjs`
> **Decision:** do not proceed to a bounded cross-level reason checker for the `goal`-unreachable, no-pending-obligation coarse cluster. Recurrence of the boundary sketch materially exceeds exact-state recurrence, but per the certificate-audit's own stop gate ("recurrence is mostly one parent/family"), that recurrence is overwhelmingly confined to a single level: only 8.8% of dominant-cluster records, and 1.9% of distinct reached-set shapes, span more than one level. A within-solve (single-level) boundary-shape memo is a separate, narrower candidate this audit surfaces but does not itself build, test for soundness, or recommend building without further scoping.
> **Remaining gate:** none for the cross-level bounded reason checker (closed by this report). A within-solve memo hypothesis, if pursued, needs its own soundness argument and matching-cost measurement before any code change — not yet scoped.
> **Evidence role:** discovery
> **Selection:** prespecified — same 80-level, positions-1-80 corpus2 sample used for Stage A (not reselected after seeing Stage B's own results), and the single coarse cluster the Stage A report itself nominated as "the largest population share and cleanest cross-level signal."

## Scope

Implements Stage B of [`2026-08-24-learned-failure-certificate-audit.md`](2026-08-24-learned-failure-certificate-audit.md), following [`2026-08-28-connectivity-rejection-stage-a-audit.md`](2026-08-28-connectivity-rejection-stage-a-audit.md)'s positive gate result. Adds a bounded conservative boundary/blocker sketch — `_classifyBoundaryBlocker`/`_computeBoundarySketch` in `modules/solver/topology.ts` — computed only when a `ConnectivityRejectionObserver.includeBoundarySketch` opts in, reading the already-materialized reached set from the flood fill that just ran rather than rerunning connectivity. Verified byte-identical to production both with the sketch disabled (unchanged behavior, matching Stage A's own verification) and with it enabled (the sketch is pure post-hoc read-only reporting, never consulted by search): `solver:bench --check` reports `68,562,085 nodes`, identical to the pre-Stage-A and post-Stage-A baselines. `topology.test.ts` (14/14) covers the blocker-category classification (`static`/`used-flipper`/`axis-exhausted`/`visited-wall`) against the four existing rejection-site fixtures.

`scripts/connectivity-rejection-audit.mjs` gained a `--boundary-sketch` flag and Stage B aggregation: for the dominant `goal`-subtype, no-pending-obligation coarse cluster (`mpVisitedMask=0, mustCrossMask=0, reservedWallActive=false`), it compares recurrence of the per-row hex-encoded `reachedFingerprint` and a normalized `boundaryBlockers` set against recurrence of the raw exact-state fingerprint.

## Cost of the sketch itself

A 5-level smoke sample (`pos:1-5`, same work budget as the main run) took 6.38s without `--boundary-sketch` and 6.49s with it — a ~1.7% difference, within run-to-run noise for a 5-level sample and far below anything that would change the tool's usability. The sketch's own cost is a bounded grid-sized scan per rejection, not a second flood fill, matching the design intent stated in the certificate-audit report.

## Population

Same corpus2 positions 1-80 sample as Stage A: `workBudget=500,000` with `strictTotalWorkBudget: true`, `timeBudgetMs=30,000` non-binding safety net. All 80 levels again reached `work-budget-reached`. Full Stage A numbers reproduced unchanged on this run (67,179 total rejections, subtype shares, coarse-key counts all match the Stage A report exactly), confirming the boundary sketch changes no aggregate rejection behavior.

The dominant cluster (`goal`, `mpVisitedMask=0`, `mustCrossMask=0`, no reserved wall) has **12,905 records** — matching the Stage A report's own count for this cluster exactly — spanning **7,934 distinct exact-state fingerprints** and (per Stage A) 29 distinct levels.

## Results

### Recurrence: boundary sketch vs. exact state, within the dominant cluster

| Measure | Distinct groups | Records in a group shared by >1 record | Share |
|---|---:|---:|---:|
| Exact-state fingerprint | 7,934 | 6,793 | 52.6% |
| `reachedFingerprint` | 3,661 | 10,726 | 83.1% |
| Normalized `boundaryBlockers` set | 3,885 | 10,614 | 82.2% |

The boundary sketch collapses 7,934 distinct exact states down to 3,661 distinct reached-set shapes (a 54% reduction in distinct-group count), and 83.1% of records fall into a shape shared with at least one other record — well above the 52.6% baseline for sharing the literal exact state. By this measure alone, Stage B's "recurrence materially exceeds exact-state recurrence" criterion is met.

### Cross-level span: where the recurrence actually lives

| Measure | Value |
|---|---:|
| Distinct `reachedFingerprint` shapes spanning >1 level | 68 / 3,661 (1.9%) |
| Records belonging to a cross-level-spanning shape group | 1,132 / 12,905 (8.8%) |
| Largest single shape group | 164 records, 38 distinct exact states, **2 distinct levels** |

Of the 83.1 percentage points of record-level recurrence, only 8.8 points come from shapes that recur across different levels; the remaining ~74 points are recurrence **within a single level** — the same solve revisiting the same local dead-end/wall shape from different search states during its own search. The single largest recurring shape, at 164 records and 38 distinct exact states, still spans only 2 levels.

## Reading against Stage B's success and stop gates

Per the certificate-audit report, proceeding to a bounded reason checker requires **all** of: recurrence materially exceeding exact-state recurrence; a non-trivial fraction of connectivity cost covered or useful earlier firing; matching substantially cheaper than `isConnected`; a conservative soundness argument per literal; and value not confined to one selected puzzle family. The stop list separately names: *"recurrence is mostly one parent/family or exact-state duplication already known to be weak."*

This population meets the first criterion cleanly (83.1% vs. 52.6%) but trips the stop condition on the last: recurrence here is overwhelmingly one parent/family — 91.2% of the recurring records' benefit is confined to their own level, and only 1.9% of distinct shapes ever recur across a level boundary. Matching cost and per-literal soundness were not measured, since the cross-level generalization criterion the certificate-audit actually asks for (value transferable across "unrelated development parents," i.e. across levels) fails before either of those would matter.

## Decision

**Do not build a cross-level bounded connectivity reason checker from this cluster.** The certificate-audit's own stop gate is triggered on the population it nominated as the strongest candidate.

This audit does surface a materially different, narrower observation: **within one solve**, the same boundary shape recurs across different search states at a rate (83.1%) far above literal exact-state recurrence (52.6%). That is a different question — a per-solve, ephemeral memo scoped to a single `Solver.solve()` call, not a cross-level learned-failure store — and was never what the certificate-audit's "unrelated development parents" criterion was built to license. Pursuing it would require its own soundness argument (can a previously-computed boundary shape validly stand in for a fresh flood fill from a different search state within the same solve? under what state-field equivalence?) and its own matching-cost measurement against `isConnected`'s own cost, neither of which this report performs. It is recorded here as a candidate for a future, separately-scoped investigation — not a recommendation to build it.

## What this does not establish

- No production cache, checker, or search-behavior change. As with Stage A, the observer and boundary sketch are verified byte-identical to production when absent, and were never consulted by any production-shaped decision during this run — only already-computed rejections were recorded.
- No claim about subtypes other than the dominant `goal`/no-pending-obligation cluster; `must-pass`, `must-cross`, and `volume` were not sketched.
- No claim beyond this specific 80-level corpus2 sample. A within-solve memo hypothesis, if scoped later, should draw on an independent population before any promotion-shaped claim.
- No soundness or matching-cost measurement was performed for either the tested (cross-level) or surfaced (within-solve) direction.

## Reproduction

```bash
npx tsx scripts/connectivity-rejection-audit.mjs \
  --corpus=data/stress/stress-levels-random.json --levels=pos:1-80 \
  --work-budget=500000 --boundary-sketch \
  --out=reports/stress/connectivity-rejection-audit-corpus2-stageb.json \
  --summary-out=reports/stress/connectivity-rejection-audit-corpus2-stageb-summary.md
```

Raw records and per-level summaries: [`reports/stress/connectivity-rejection-audit-corpus2-stageb.json`](stress/connectivity-rejection-audit-corpus2-stageb.json).
