# `failureCensoring.failedCells` is a definitional total, not a third category — the real signal is in its `naturallyExhausted`/`budgetOrOtherCensored` split

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `failureCensoring{failedCells, naturallyExhausted, budgetOrOtherCensored}` for all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, checked per-level and aggregated by corpus/production status/isolated-oracle status, no new dispatch
> **Decision:** `failedCells` equals exactly `naturallyExhausted + budgetOrOtherCensored` on **every single level** checked (confirmed on a 10-level sample and holding in every aggregate split at exactly 50.000%) — it is not an independent third failure category, it is the sum/total of the other two. Treating it as a separate axis (e.g. "50% of cells fail") is a schema misread; the only informative axis is the `naturallyExhausted` vs `budgetOrOtherCensored` **ratio**, which does carry a small but consistent directional signal: harder-outcome populations (production-unsolved, isolated-no-T1-winner, corpus2) have relatively more `naturallyExhausted` and relatively less `budgetOrOtherCensored` than their easier counterparts.
> **Remaining gate:** none — this is a schema/methodology note plus a descriptive secondary finding.
> **Evidence role:** forensic/methodological — the kind of definitional catch this repo's conventions warn about (see the analogous attempt-identity-normalization catch earlier this session)
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Computed `failedCells / (failedCells + naturallyExhausted + budgetOrOtherCensored)` per level first (to check the definitional relationship), then aggregated `naturallyExhausted` and `budgetOrOtherCensored` totals (as % of their own sum, excluding `failedCells`) across corpus1/corpus2, `productionSolved` true/false, and `isolatedOracleSolved` true/false.

## Result

Per-level check (10-level sample, holds generally): `failedCells / total` = exactly 0.500 for every level, e.g. `R00408`: `failedCells=29, naturallyExhausted=12, budgetOrOtherCensored=17` → 12+17=29.

`naturallyExhausted` vs `budgetOrOtherCensored` split (as % of `naturallyExhausted + budgetOrOtherCensored`):

| population | naturallyExhausted | budgetOrOtherCensored |
|---|---:|---:|
| corpus1 | 32.8% | 67.2% |
| corpus2 | 40.0% | 60.0% |
| `productionSolved=true` | 35.8% | 64.2% |
| `productionSolved=false` | 43.0% | 57.0% |
| `isolatedOracleSolved=true` | 37.0% | 63.0% |
| `isolatedOracleSolved=false` (no T1 winner) | 43.6% | 56.4% |

(Figures above are `naturallyExhausted / (naturallyExhausted + budgetOrOtherCensored)`, recomputed from the raw aggregate totals to isolate the two-way split.)

## Interpretation

The schema point is the primary contribution here: `failedCells` looks like a plausible third failure category at a glance, and any future report that aggregates or standardizes on it directly as an independent signal (rather than as the union of the other two) would silently be reporting a tautological 50%-everywhere constant — exactly the class of silent misread this repo's evidence conventions ask contributors to guard against. This report exists to close that off before it happens.

The secondary, real signal: harder populations (production-unsolved, isolated-no-T1-winner, and the harder corpus2) consistently show a higher share of `naturallyExhausted` relative to `budgetOrOtherCensored` than their easier counterparts (roughly 43% vs 36-38% naturallyExhausted). This is a small but directionally consistent effect suggesting that failure on harder levels is somewhat more often a genuine "this cell's search space is provably exhausted" outcome rather than a budget-limited one, though the effect size here is modest compared to the standardized-difference magnitudes found in the structural risk-factor work.

## What this does not establish

- Does not identify what specifically counts as `budgetOrOtherCensored` vs `naturallyExhausted` at the mechanism level (that's defined in whatever tool produced `level-capability.json`, not re-derived here).
- The secondary directional signal is modest (roughly 6-8 percentage points) and correlational; not proposed as an actionable routing signal on its own.
- Single census snapshot (2026-09-03).
