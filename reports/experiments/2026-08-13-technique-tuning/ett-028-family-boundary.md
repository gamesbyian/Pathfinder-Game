# Family boundary report

> **Status:** diagnostic artifact
> **Decision:** triage existing family telemetry only; no solver or scheduler policy change
> **Next gate:** replay and ablate selected queue entries before drawing a solver conclusion

> Read-only analysis of existing artifacts; no levels were solved.

> **Caution:** Winning configs are scheduler-censored observations, not independent config success probabilities.

Families: **123** (50 symmetry, 73 non-symmetry) · queued findings: **79** · missing variant rows: **0**

## Actionable queue

| Priority | Finding | Parent | Variant | Score |
|---:|---|---|---|---:|
| 2 | symmetry-pathology | R02795 | F02795-sym-01 | 5.000 |
| 2 | symmetry-pathology | R00156 | F00156-sym-01 | 4.000 |
| 2 | symmetry-pathology | R02248 | F02248-sym-01 | 4.000 |
| 2 | symmetry-pathology | R02960 | F02960-sym-01 | 4.000 |
| 2 | symmetry-pathology | R00548 | F00548-sym-01 | 2.000 |
| 2 | symmetry-pathology | R01465 | F01465-sym-01 | 2.000 |
| 2 | symmetry-pathology | R02239 | F02239-sym-04 | 2.000 |
| 2 | symmetry-pathology | R02452 | F02452-sym-05 | 2.000 |
| 5 | variant-config-concentration | P00010 | F00010-sym-01 | 1.000 |
| 5 | variant-config-concentration | P00097 | F00097-re-01 | 1.000 |
| 5 | variant-config-concentration | P00097 | F00097-sym-01 | 1.000 |
| 5 | variant-config-concentration | P00136 | F00136-lm-01 | 1.000 |
| 5 | variant-config-concentration | P00136 | F00136-swap-01 | 1.000 |
| 5 | variant-config-concentration | P00144 | F00144-swap-01 | 1.000 |
| 5 | variant-config-concentration | P00145 | F00145-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00059 | F00059-re-08 | 1.000 |
| 5 | variant-config-concentration | R00134 | F00134-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00156 | F00156-lm-06 | 1.000 |
| 5 | variant-config-concentration | R00156 | F00156-swap-06 | 1.000 |
| 5 | variant-config-concentration | R00156 | F00156-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00541 | F00541-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-lm-03 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-re-06 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-swap-08 | 1.000 |
| 5 | variant-config-concentration | R00548 | F00548-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00631 | F00631-lm-01 | 1.000 |
| 5 | variant-config-concentration | R00631 | F00631-swap-01 | 1.000 |
| 5 | variant-config-concentration | R00727 | F00727-sym-01 | 1.000 |
| 5 | variant-config-concentration | R00792 | F00792-lm-01 | 1.000 |
| 5 | variant-config-concentration | R00792 | F00792-swap-01 | 1.000 |
| 5 | variant-config-concentration | R00920 | F00920-sym-01 | 1.000 |
| 5 | variant-config-concentration | R01465 | F01465-lm-01 | 1.000 |
| 5 | variant-config-concentration | R01465 | F01465-sym-01 | 1.000 |
| 5 | variant-config-concentration | R01533 | F01533-sym-01 | 1.000 |
| 5 | variant-config-concentration | R01636 | F01636-sym-01 | 1.000 |
| 5 | variant-config-concentration | R01644 | F01644-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02028 | F02028-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02208 | F02208-re-01 | 1.000 |
| 5 | variant-config-concentration | R02239 | F02239-lm-05 | 1.000 |
| 5 | variant-config-concentration | R02239 | F02239-sym-04 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-lm-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-re-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-re-07 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-swap-01 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-cs-05 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-lm-05 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-swap-01 | 1.000 |
| 5 | variant-config-concentration | R02452 | F02452-sym-05 | 1.000 |
| 5 | variant-config-concentration | R02563 | F02563-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02579 | F02579-lm-03 | 1.000 |
| 5 | variant-config-concentration | R02714 | F02714-re-01 | 1.000 |
| 5 | variant-config-concentration | R02795 | F02795-cs-04 | 1.000 |
| 5 | variant-config-concentration | R02795 | F02795-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02825 | F02825-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02909 | F02909-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-cs-03 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-lm-02 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-re-02 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-re-08 | 1.000 |
| 5 | variant-config-concentration | R02960 | F02960-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02976 | F02976-sym-01 | 1.000 |
| 5 | variant-config-concentration | R03015 | F03015-sym-01 | 1.000 |
| 5 | variant-config-concentration | S00107 | F00107-sym-01 | 1.000 |
| 5 | variant-config-concentration | S00109 | F00109-sym-01 | 1.000 |
| 5 | variant-config-concentration | S00114 | F00114-sym-01 | 1.000 |
| 5 | variant-config-concentration | S00120 | F00120-sym-01 | 1.000 |
| 5 | variant-config-concentration | R02248 | F02248-cs-01 | 0.875 |
| 5 | variant-config-concentration | P00144 | F00144-lm-01 | 0.857 |
| 5 | variant-config-concentration | P00144 | F00144-sym-01 | 0.857 |
| 5 | variant-config-concentration | R00392 | F00392-sym-01 | 0.857 |
| 5 | variant-config-concentration | R00432 | F00432-sym-01 | 0.857 |
| 5 | variant-config-concentration | R00631 | F00631-cs-01 | 0.857 |
| 5 | variant-config-concentration | R00631 | F00631-sym-01 | 0.857 |
| 5 | variant-config-concentration | R02341 | F02341-sym-01 | 0.857 |
| 5 | variant-config-concentration | R02962 | F02962-sym-01 | 0.857 |
| 5 | variant-config-concentration | R02976 | F02976-swap-01 | 0.857 |
| 5 | variant-config-concentration | R03341 | F03341-sym-01 | 0.857 |
| 5 | variant-config-concentration | R00156 | F00156-re-01 | 0.800 |
| 5 | variant-config-concentration | R02248 | F02248-sym-01 | 0.750 |

## Mutation-conditioned summary

| Relation / mode / object | N | Rescue rate | Flip rate | Config-switch rate | Median work ratio |
|---|---:|---:|---:|---:|---:|
| constrained-shuffle|constrained-shuffle|all-movable-types | 102 | — | — | — | — |
| density-sweep|add|blocks | 10 | — | — | — | — |
| density-sweep|remove|blocks | 6 | — | — | — | — |
| group-reshuffle|group-reshuffle|blocks | 7 | — | — | — | — |
| group-reshuffle|group-reshuffle|flippingFilters | 7 | — | — | — | — |
| local-mutant|move|blocks | 57 | — | — | — | — |
| local-mutant|move|falseGoals | 2 | — | — | — | — |
| local-mutant|move|flippingFilters | 13 | — | — | — | — |
| local-mutant|move|fountain | 4 | — | — | — | — |
| local-mutant|move|geese | 19 | — | — | — | — |
| local-mutant|move|lamppost | 10 | — | — | — | — |
| local-mutant|move|library | 10 | — | — | — | — |
| local-mutant|move|market | 5 | — | — | — | — |
| local-mutant|move|mustCross | 2 | — | — | — | — |
| local-mutant|move|mustPass | 16 | — | — | — | — |
| local-mutant|move|park | 11 | — | — | — | — |
| local-mutant|move|statue | 3 | — | — | — | — |
| re-embed|re-embed|whole-level | 101 | — | — | — | — |
| swap|swap|swap | 151 | — | — | — | — |
| symmetry|transform|whole-level | 350 | — | — | — | — |

## Join diagnostics

All manifest variants had result rows.
