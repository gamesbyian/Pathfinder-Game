# Admissible-order alternate-tiebreak retry repricing: production A/B 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-05 — Both fresh 150-level production arms finished 81/150 with identical aggregate work/nodes, but the treatment's target retry expanded zero nodes on all 69 nominal reaches because the strict whole-solve cap was exhausted upstream.
> **Decision:** do not promote `admissibleOrderNonDefaultRetryBudgetFraction=0.18` from this run; production remains `1.0` because A/B 001 did not exercise the priced stage.
> **Remaining gate:** redesign the matched-work promotion test with a frozen nonzero target-stage participation requirement and an envelope/control-side selection that leaves executable work for the late retry.
> **Candidate:** `admissibleOrderNonDefaultRetryBudgetFraction=0.18`
> **Control:** `admissibleOrderNonDefaultRetryBudgetFraction=1.0`

## Why this run existed

Confirmation 006 established that reducing `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`'s shared work-pool fraction from `1.0` to `0.18` lost no solves on the 76-level informative population that had been selected specifically for historical reach of the retry tier. That answered the narrow confirmation question but did not establish a production-default change.

Production A/B 001 therefore drew a fresh, level-blind 150-level Corpus-2 population. At draw time it excluded 1,407 IDs already touched by this research lineage, then added the 150 new IDs to the exclusion ledger (1,557 total), so this population was untouched by the candidate's prior development/confirmation analysis.

Both arms used the same 150 IDs, the real level-blind production entrypoint, a strict whole-solve work ceiling of approximately 1.005B work units per level, advisory-only node budgeting, and otherwise identical configuration. The only intended treatment difference was the admissible-order non-default retry fraction.

## Runs

| Arm | Fraction | Workflow run | Dispatch commit | Shards |
|---|---:|---:|---|---:|
| control | `1.0` | `33983828492` | `c1e4ddb5030bd9f81129eeee56acc36a83dc45fd` | 38/38 |
| treatment | `0.18` | `33992186555` | `01015b7455a7c44bc81587f2e3e450fae83aa6f7` | 38/38 |

The treatment run included the newly added `scripts/summarize-targeted-sweep-work.mjs`, which prints aggregate and per-stage participation directly into the combine-job log. This avoids the environment's Azure artifact-download limitation and is reusable infrastructure for future scheduler experiments.

## Whole-solve result

Both arms produced the same result:

| Metric | Control 1.0 | Treatment 0.18 | Delta |
|---|---:|---:|---:|
| solved | 81/150 | 81/150 | 0 |
| aggregate `workSpent` | 92,540,060,503 | 92,540,060,503 | 0 |
| aggregate nodes | 107,033,552,716 | 107,033,552,716 | 0 |
| unsolved | 69 | 69 | 0 |
| unsolved status | 69 `work-budget-reached` | 69 `work-budget-reached` | identical |
| attempt errors | none observed | 0 | no asymmetry |
| deadline truncation | none observed | 0 | no asymmetry |

The solved ID sets are identical as well. This is excellent execution parity, but it is **not** evidence that `0.18` is equivalent to `1.0` in production because the target stage did not receive executable work in the treatment arm.

## Participation failure

Treatment-stage telemetry for `admissible-order-alternate-tiebreak-retry`:

- reached/recorded on **69/150** levels;
- **276 attempts** recorded, exactly four per reached level;
- **0 aggregate nodesExpanded**;
- **0 solves**;
- every one of those 69 levels ended at the strict whole-solve `work-budget-reached` boundary, with total work around the 1.005B cap.

This distinguishes nominal stage reach from real participation. The orchestration emitted attempt records for the stage after upstream work had already consumed the strict whole-solve envelope; the retry therefore had no work with which to search. Changing its internal fraction could not affect the run.

The treatment's exact equality with control in aggregate work, aggregate nodes, solve count, and solved IDs is therefore a symptom of the participation failure, not promotion-grade equivalence evidence. The control run predates the job-log stage summarizer, so this report does not claim a directly measured control-stage node total; no control-stage assumption is needed for the disposition because the treatment itself failed the minimum participation requirement.

## Interpretation

The earlier 76-level confirmation remains valid for the question it actually tested: on a population known to reach and exercise this retry under its confirmation envelope, `0.18` preserved the solve set relative to `1.0`.

Production A/B 001 answers a different question about experiment design: a strict whole-solve cap sized above a previously observed production maximum can still censor a very late stage on a fresh population if upstream stages consume that envelope first. A cap can be operationally sound and still make a late-stage pricing experiment non-informative.

Accordingly:

1. **Do not promote `0.18` from this A/B.** Production default remains `1.0`.
2. **Do not count the 81/150 tie as independent confirmation.** The treatment being priced did not execute.
3. **Do not repeat another ordinary random 150-level strict-cap A/B unchanged.** The failure mode is now diagnosed.
4. Preserve the untouched-population discipline for the next promotion test, but add a prespecified participation gate.

## Next experiment contract

The next promotion-path experiment must keep a matched aggregate-work comparison while ensuring the late retry is actually priceable. Before interpreting solved-set or work deltas, require a prespecified minimum of **nonzero target-stage work** in the control/reference condition and confirm that the treatment's allocation change can actually alter that work.

Legitimate designs include either:

- a fresh population selected using independent **control-side** historical telemetry showing actual nonzero work in this stage, with all candidate-treatment outcomes excluded from selection; or
- a production-shaped matched-work allocation design that explicitly preserves enough envelope for the target retry to execute, with any work saved by `0.18` accounted for/reallocated under the same total envelope.

Whichever design is chosen, freeze before dispatch:

- population and exclusion provenance;
- aggregate work envelope and budget semantics;
- minimum target-stage participation criterion;
- solve gain/loss rule and rare-capability audit;
- accounting for where reclaimed work goes;
- a non-informative disposition if the participation criterion is missed.

The research question remains open. What is closed is **production A/B 001's experimental form**.
