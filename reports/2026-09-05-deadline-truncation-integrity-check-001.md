# Zero deadline-truncated runs in the existing full-scale production census — the "unsolved" population is a clean negative set

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `deadlineTruncated` flag across all 1,802 rows in `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json`, no new dispatch
> **Decision:** `deadlineTruncated` is `false` (or absent) on every single row, solved and unsolved alike (0/1,802 true). Per `modules/solver/orchestration.ts`'s own documentation ("The wall-clock deadline cut this run short while work budget remained — so the result is INDETERMINATE, not a reproducible negative. Never record such a run as unsolved"), this confirms none of this session's extensive use of the 729-level "unsolved" population (starved-vs-capped analysis, structural risk factors, win-share concentration, attempt-cost asymmetry, and others) is built on indeterminate, wall-clock-cut-short data mislabeled as genuine negatives.
> **Remaining gate:** none — a data-integrity validation, not a new substantive finding, but worth recording since it underwrites every other report this session that treats this run's "unsolved" population as a reliable negative signal.
> **Evidence role:** forensic — a defensive data-integrity check of the kind this repo's conventions specifically ask for before trusting a derived population at scale
> **Selection:** whole population (1,802 rows, both corpora), not a sample

## Method

Checked the `deadlineTruncated` boolean field directly on every row of both corpus files, counting `true` occurrences overall and restricted to the unsolved subset specifically.

## Result

| | total rows | `deadlineTruncated===true` |
|---|---:|---:|
| all rows | 1,802 | 0 |
| unsolved rows only | 729 | 0 |

## Interpretation

This is a clean pass, not a discovery of a problem — but it was worth checking explicitly rather than assumed, given the orchestration code's own comment warns this exact contamination is possible and must never be silently treated as a negative. Confirms every "unsolved"/"node-budget-reached" level this session has analyzed genuinely exhausted its search budget rather than merely running out of wall-clock time with search still live, so all downstream conclusions drawn from that population (starved-vs-capped structural signature, budget-edge fragility, attempt-cost asymmetry, and others) rest on a sound negative set.

## What this does not establish

- This check is specific to this one production run (`33841017634`); other runs/artifacts referenced this session were not re-checked for the same property, though none flagged an anomaly during use.
- Does not itself validate any other aspect of data quality (e.g. attempt-identity naming, budget confounds) — those were separately checked where relevant this session.
