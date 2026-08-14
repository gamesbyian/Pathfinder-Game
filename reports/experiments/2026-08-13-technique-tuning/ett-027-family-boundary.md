# Family boundary report

> **Status:** diagnostic artifact
> **Decision:** triage existing family telemetry only; no solver or scheduler policy change
> **Next gate:** replay and ablate selected queue entries before drawing a solver conclusion

> Read-only analysis of existing artifacts; no levels were solved.

> **Caution:** Winning configs are scheduler-censored observations, not independent config success probabilities.

Families: **66** (11 symmetry, 55 non-symmetry) · queued findings: **39** · missing variant rows: **0**

## Actionable queue

| Priority | Finding | Parent | Variant | Score |
|---:|---|---|---|---:|
| 2 | symmetry-pathology | R02795 | F02795-sym-01 | 5.000 |
| 2 | symmetry-pathology | R00156 | F00156-sym-01 | 4.000 |
| 2 | symmetry-pathology | R02960 | F02960-sym-01 | 4.000 |
| 2 | symmetry-pathology | R02248 | F02248-sym-01 | 3.000 |
| 2 | symmetry-pathology | R00548 | F00548-sym-01 | 2.000 |
| 2 | symmetry-pathology | R01465 | F01465-sym-01 | 2.000 |
| 2 | symmetry-pathology | R02239 | F02239-sym-04 | 2.000 |
| 2 | symmetry-pathology | R02452 | F02452-sym-05 | 2.000 |
| 5 | variant-config-concentration | R00059 | F00059-re-08 | 1.000 |
| 5 | variant-config-concentration | R00156 | F00156-lm-06 | 1.000 |
| 5 | variant-config-concentration | R00156 | F00156-swap-06 | 1.000 |
| 5 | variant-config-concentration | R00156 | F00156-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-lm-03 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-re-06 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-swap-08 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-sym-01 | 1.000 |
| 5 | variant-config-concentration | R01465 | F01465-lm-01 | 1.000 |
| 5 | variant-config-concentration | R01465 | F01465-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02239 | F02239-lm-05 | 1.000 |
| 5 | variant-config-concentration | R02239 | F02239-sym-04 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-lm-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-re-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-re-07 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-swap-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-cs-05 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-lm-05 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-swap-01 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-sym-05 | 1.000 |
| 5 | variant-config-concentration | R02579 | F02579-lm-03 | 1.000 |
| 5 | variant-config-concentration | R02795 | F02795-cs-04 | 1.000 |
| 5 | variant-config-concentration | R02795 | F02795-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-cs-03 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-lm-02 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-re-02 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-re-08 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-cs-01 | 0.875 |
| 5 | variant-config-concentration | R00156 | F00156-re-01 | 0.800 |

## Mutation-conditioned summary

| Relation / mode / object | N | Rescue rate | Flip rate | Config-switch rate | Median work ratio |
|---|---:|---:|---:|---:|---:|
| constrained-shuffle|constrained-shuffle|all-movable-types | 88 | — | — | — | — |
| local-mutant|move|blocks | 37 | — | — | — | — |
| local-mutant|move|falseGoals | 2 | — | — | — | — |
| local-mutant|move|flippingFilters | 8 | — | — | — | — |
| local-mutant|move|fountain | 4 | — | — | — | — |
| local-mutant|move|geese | 11 | — | — | — | — |
| local-mutant|move|lamppost | 9 | — | — | — | — |
| local-mutant|move|library | 10 | — | — | — | — |
| local-mutant|move|market | 5 | — | — | — | — |
| local-mutant|move|mustCross | 2 | — | — | — | — |
| local-mutant|move|mustPass | 11 | — | — | — | — |
| local-mutant|move|park | 9 | — | — | — | — |
| local-mutant|move|statue | 2 | — | — | — | — |
| re-embed|re-embed|whole-level | 92 | — | — | — | — |
| swap|swap|swap | 110 | — | — | — | — |
| symmetry|transform|whole-level | 77 | — | — | — | — |

## Join diagnostics

All manifest variants had result rows.
