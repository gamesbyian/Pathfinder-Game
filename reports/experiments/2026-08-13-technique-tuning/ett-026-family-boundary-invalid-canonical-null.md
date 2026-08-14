# Family boundary report

> **Status:** diagnostic artifact
> **Decision:** triage existing family telemetry only; no solver or scheduler policy change
> **Next gate:** replay and ablate selected queue entries before drawing a solver conclusion

> Read-only analysis of existing artifacts; no levels were solved.

> **Caution:** Winning configs are scheduler-censored observations, not independent config success probabilities.

Families: **66** (11 symmetry, 55 non-symmetry) · queued findings: **92** · missing variant rows: **0**

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
| 4 | variant-fragile | R00156 | F00156-re-01 | 1.000 |
| 4 | variant-fragile | R02248 | F02248-cs-01 | 1.000 |
| 4 | variant-fragile | R02248 | F02248-re-01 | 1.000 |
| 4 | variant-fragile | R02248 | F02248-lm-01 | 0.900 |
| 4 | variant-fragile | R02248 | F02248-swap-01 | 0.900 |
| 4 | variant-fragile | R00156 | F00156-re-06 | 0.800 |
| 4 | variant-fragile | R02795 | F02795-swap-01 | 0.700 |
| 4 | variant-fragile | R02795 | F02795-lm-01 | 0.600 |
| 4 | variant-fragile | R02960 | F02960-re-02 | 0.600 |
| 4 | variant-fragile | R00059 | F00059-re-01 | 0.400 |
| 4 | variant-fragile | R00059 | F00059-re-08 | 0.400 |
| 4 | variant-fragile | R01465 | F01465-re-03 | 0.400 |
| 4 | variant-fragile | R01465 | F01465-re-06 | 0.400 |
| 4 | variant-fragile | R02960 | F02960-re-08 | 0.400 |
| 4 | variant-fragile | R00059 | F00059-cs-02 | 0.375 |
| 4 | variant-fragile | R01465 | F01465-cs-02 | 0.375 |
| 4 | variant-fragile | R01465 | F01465-lm-01 | 0.300 |
| 4 | variant-fragile | R02239 | F02239-lm-05 | 0.300 |
| 4 | variant-fragile | R00548 | F00548-cs-04 | 0.250 |
| 4 | variant-fragile | R02960 | F02960-cs-03 | 0.250 |
| 4 | variant-fragile | R00156 | F00156-lm-06 | 0.200 |
| 4 | variant-fragile | R00548 | F00548-lm-03 | 0.200 |
| 4 | variant-fragile | R00548 | F00548-re-06 | 0.200 |
| 4 | variant-fragile | R02248 | F02248-re-07 | 0.200 |
| 4 | variant-fragile | R02452 | F02452-cs-05 | 0.125 |
| 4 | variant-fragile | R02795 | F02795-cs-04 | 0.125 |
| 4 | variant-fragile | R00156 | F00156-swap-06 | 0.100 |
| 4 | variant-fragile | R00548 | F00548-swap-08 | 0.100 |
| 4 | variant-fragile | R02452 | F02452-lm-05 | 0.100 |
| 4 | variant-fragile | R02452 | F02452-swap-01 | 0.100 |
| 4 | variant-fragile | R02579 | F02579-lm-03 | 0.100 |
| 4 | variant-fragile | R02960 | F02960-lm-02 | 0.100 |
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
| 7 | variant-robust | R00059 | F00059-lm-01 | 10.000 |
| 7 | variant-robust | R00059 | F00059-swap-01 | 10.000 |
| 7 | variant-robust | R00440 | F00440-lm-01 | 10.000 |
| 7 | variant-robust | R00440 | F00440-swap-01 | 10.000 |
| 7 | variant-robust | R01465 | F01465-swap-01 | 10.000 |
| 7 | variant-robust | R02239 | F02239-swap-01 | 10.000 |
| 7 | variant-robust | R02579 | F02579-swap-01 | 10.000 |
| 7 | variant-robust | R02960 | F02960-swap-01 | 10.000 |
| 7 | variant-robust | R00156 | F00156-cs-01 | 8.000 |
| 7 | variant-robust | R00440 | F00440-cs-01 | 8.000 |
| 7 | variant-robust | R02239 | F02239-cs-01 | 8.000 |
| 7 | variant-robust | R02579 | F02579-cs-01 | 8.000 |
| 7 | variant-robust | R00440 | F00440-re-01 | 5.000 |
| 7 | variant-robust | R00440 | F00440-re-06 | 5.000 |
| 7 | variant-robust | R00548 | F00548-re-01 | 5.000 |
| 7 | variant-robust | R02579 | F02579-re-01 | 5.000 |
| 7 | variant-robust | R02579 | F02579-re-06 | 5.000 |
| 7 | variant-robust | R02795 | F02795-re-01 | 5.000 |
| 7 | variant-robust | R02795 | F02795-re-06 | 5.000 |
| 7 | variant-robust | R02239 | F02239-re-01 | 1.000 |
| 7 | variant-robust | R02239 | F02239-re-02 | 1.000 |

## Mutation-conditioned summary

| Relation / mode / object | N | Rescue rate | Flip rate | Config-switch rate | Median work ratio |
|---|---:|---:|---:|---:|---:|
| constrained-shuffle|constrained-shuffle|all-movable-types | 88 | 0.227 | — | — | — |
| local-mutant|move|blocks | 37 | 0.216 | — | — | — |
| local-mutant|move|falseGoals | 2 | 0.000 | — | — | — |
| local-mutant|move|flippingFilters | 8 | 0.250 | — | — | — |
| local-mutant|move|fountain | 4 | 0.500 | — | — | — |
| local-mutant|move|geese | 11 | 0.273 | — | — | — |
| local-mutant|move|lamppost | 9 | 0.111 | — | — | — |
| local-mutant|move|library | 10 | 0.200 | — | — | — |
| local-mutant|move|market | 5 | 0.200 | — | — | — |
| local-mutant|move|mustCross | 2 | 0.000 | — | — | — |
| local-mutant|move|mustPass | 11 | 0.455 | — | — | — |
| local-mutant|move|park | 9 | 0.222 | — | — | — |
| local-mutant|move|statue | 2 | 1.000 | — | — | — |
| re-embed|re-embed|whole-level | 92 | 0.315 | — | — | — |
| swap|swap|swap | 110 | 0.173 | — | — | — |
| symmetry|transform|whole-level | 77 | 0.312 | — | — | — |

## Join diagnostics

All manifest variants had result rows.
