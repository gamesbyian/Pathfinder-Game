# Repair-winner classifier rerun on Corpus 2 (2026-08-07)

> **Status:** concluded-negative
>
> **Last evidence:** 2026-08-07 — deterministic five-fold threshold cross-validation on the current 725 solved Corpus-2 levels
>
> **Decision:** drop learned/single-feature repair-winner routing; retain the separate attempt-ordering-cost question
>
> **Remaining gate:** none; reopen only with a causal feature unavailable to the current policy

## Why this rerun existed

[`docs/solver-improvement-research-notes.md`](../docs/solver-improvement-research-notes.md) left one
data-volume gate: rerun the binary “will `repair` win?” classifier when Corpus 2 grew the original
sample beyond 85 solved levels and 10 repair winners. The current compiled baseline supplies 725
solved levels, 188 of which record a repair-family `winningConfig`.

## Method

`scripts/stress/repair-winner-classifier.mjs` joins the compiled baseline to raw level data, extracts
the existing numeric `levelFeatures`, and labels a level positive when its winning config contains
`repair`. For each numeric feature independently it performs deterministic five-fold
cross-validation: search thresholds/directions on four folds, select by F1 with deterministic
tie-breakers, score only the held-out fold, then aggregate held-out predictions.

This is stricter than the original same-sample threshold search. Full machine-readable results are
in [`reports/stress/repair-winner-classifier-2026-08-07.json`](stress/repair-winner-classifier-2026-08-07.json).

## Results

| Rule | Precision | Recall | F1 | TP / FP / FN / TN |
|---|---:|---:|---:|---:|
| Historical `navDensity <= 0.524` | 0.167 | 0.005 | **0.010** | 1 / 5 / 187 / 532 |
| Best cross-validated feature: `mustCross >= 2` | 0.356 | 0.697 | **0.471** | 131 / 237 / 57 / 300 |
| Always predict repair (prevalence baseline) | 0.259 | 1.000 | **0.412** | 188 / 537 / 0 / 0 |

The old density rule does not generalize: it catches only 1 of 188 repair winners. The best new
single feature is stable across all five folds, but its modest F1 lift over always-positive creates
237 false positives and still misses 57 repair winners.

`mustCross` is also partly a **policy/eligibility echo**, not an independent causal discovery:
current routing already uses must-cross burden to decide whether repair fallback is offered. A label
of “repair won” is observable only where the existing policy runs it. Promoting repair earlier from
this correlation would reinforce current routing while paying repair cost on hundreds of false
positives.

## Decision

Do not build a learned classifier or add `mustCross >= 2` as a repair-priority rule. More data
refutes the historical density signal, and the replacement is too confounded and imprecise.

The independent finding that solved levels can spend substantial time before their winner remains a
valid performance observation. Pursue it only through direct, feature-scoped A/B measurements of a
specific ordering change—not through a generic “will repair win?” model.

## Reproduce

```bash
npm run stress:repair-winner-classifier -- \
  --baseline=logs/stress-corpus2-baseline.json \
  --corpus=data/stress/stress-levels-random.json \
  --folds=5
```
