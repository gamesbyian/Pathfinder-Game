# Admissible-order confirmation 006 artifact recovery

> **Status:** inconclusive
> **Last evidence:** 2026-09-10 — recovered and inspected the retained `targeted-sweep-combined` artifacts from control run 33956553409 and treatment run 33956555296
> **Decision:** confirmation 006 is non-informative for the `1.0 -> 0.18` repricing decision because the target retry received zero work in both arms; retain production at `1.0` and require a matched-work test with nonzero target-stage work
> **Remaining gate:** run a matched-work confirmation in which `admissible-order-alternate-tiebreak-retry` receives nonzero work in both arms, then evaluate solve retention and realized work saving
> **Evidence role:** forensic
> **Selection:** observational inspection of the already-frozen confirmation-006 population and its retained artifacts; no new solver execution

## Why this correction exists

[`2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md`](2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md) correctly established a clean and complete 76-vs-76 execution with identical solved sets, but its result report could not download the combined artifacts in that session. It therefore described the zero-loss result as supporting a later promotion path while explicitly leaving the actual `workSpent` delta unmeasured.

The retained Actions artifacts are still available. Recovering them resolves that missing measurement and, more importantly, exposes a participation failure that changes the interpretation under [`docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md): a treatment that receives effectively zero mechanism participation cannot support a positive or negative mechanism verdict.

## Recovered artifacts

Both runs are at commit `b3c25484df805358e636de6f75e99f3648dc1e1a`, over the same 76 levels and the same strict whole-solve work envelope (`workBudget=1,005,000,000`).

| Arm | Run | Combined artifact | Fraction | Solved | Aggregate `workSpent` |
|---|---:|---:|---:|---:|---:|
| control | 33956553409 | 9968206487 | 1.0 | 12/76 | 70,623,264,853 |
| treatment | 33956555296 | 9968104124 | 0.18 | 12/76 | 70,623,264,853 |

The solved ID sets are identical, as the original report recorded. The newly recovered aggregate work result is also exactly identical: delta `0` work units.

## Target-stage participation

The combined reports contain per-attempt records. On each of the 64 levels that proceeds far enough to instantiate `admissible-order-alternate-tiebreak-retry`, both arms contain four target-stage attempts, for 256 target-stage attempt records per arm.

Every one of those 256 records in both arms has:

- `outcome: "budget-starved"`;
- `allocatedWorkCeiling: 0`;
- `workSpent: 0`;
- `nodesExpanded: 0`.

The configured retry fraction is visible only in the time-side allocation metadata. For example, on `R00039` the first target-stage attempt reports `allocatedBudgetMs=86,400,000` in control and `15,552,000` in treatment, exactly the intended `1.0` versus `0.18` ratio, but both have zero work ceiling and execute zero search work. Thus configuration propagation occurred, while the mechanism under test did not actually participate.

Across all 76 levels:

- control aggregate `workSpent`: `70,623,264,853`;
- treatment aggregate `workSpent`: `70,623,264,853`;
- target-stage `workSpent`: `0` in both arms;
- target-stage expanded nodes: `0` in both arms;
- target-stage attempt records: `256` per arm, all budget-starved.

## Correct interpretation

Confirmation 006 remains valuable execution evidence: it proves the 76-level comparison completed cleanly and that the fraction override propagated into retry allocation metadata. It does **not** establish that reducing the retry's production work fraction from `1.0` to `0.18` is coverage-neutral or cheaper, because neither value bought any target-stage work on this population under the strict whole-solve ceiling.

The exact equality in whole-solve `workSpent` is therefore expected rather than evidence of successful repricing. The solver consumed the strict work ceiling before the target retry could spend from its nominal allocation.

This matches the current canonical queue, which already requires a "matched-work test with nonzero target-stage work" before changing production from `1.0`. No queue reprioritization is needed; this report supplies the missing forensic basis for that gate and supersedes only the positive *interpretation* of confirmation 006, not its raw run facts.

## Reproduction / provenance

Source runs and retained artifacts:

- control: GitHub Actions run `33956553409`, artifact `9968206487` (`targeted-sweep-combined`);
- treatment: GitHub Actions run `33956555296`, artifact `9968104124` (`targeted-sweep-combined`).

Artifact metadata at recovery showed both artifacts unexpired and tied to `b3c25484df805358e636de6f75e99f3648dc1e1a`. The comparison above was performed directly over each artifact's `combined.json`, pairing rows by level id and summing `workSpent`, then inspecting attempts whose `stageId` is `admissible-order-alternate-tiebreak-retry`.

No solver code, configuration, population, or outcome was changed by this recovery.