# Stress-corpus selection-history reconstruction audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — PR #1182 / July-10 migration archaeology, July-11 square-grid replacement history, current row-level ancestry, and recovered per-level artifacts from the September-3 static-portfolio transfer run.
> **Decision:** corpus membership is not a neutral generation label. Corpus 1 and Corpus 2 inherited a solver-outcome-conditioned partition on 2026-07-10, and whole-Corpus-1 evidence must not be called cross-generator transfer. Reinterpret the September-3 portfolio transfer result at ancestry-stratum level.
> **Remaining gate:** no further archaeology is required to establish this correction. Future cross-generator claims should use a materially independent source/population (for example topology composition or genuinely independent human/editor material) rather than whole Corpus 1.

## Bottom line

A fresh reconstruction from generation through retention changed an important scientific conclusion.

On 2026-07-10, the original 2,000-level random corpus was not merely split administratively. PR #1182 explicitly used solver baseline outcomes to identify **300 solvable random levels**, moved those 300 into Corpus 1, and left the **1,700 unsolved/timeout complement** as Corpus 2. The next day's square-grid cleanup then removed non-square rows: current Corpus 1 retains 23 old A-F rows plus 79 of those solver-positive random rows; current Corpus 2 retains 328 rows from the original solver-negative random complement and contains 1,372 newly generated square replacements.

Therefore current corpus membership carries historical solver-outcome selection in addition to generator ancestry. The current row provenance records how levels were generated, but not this later selection/migration event.

This matters because a 2026-09-03 experiment treated all 102 current Corpus-1 rows as a clean, genuinely different-generator transfer population for `portfolio-18-tranche-v2`. Rejoining its still-live workflow artifacts against actual ancestry reverses part of the published interpretation.

## Reconstructed population pipeline

The relevant history is:

1. **2026-07-08:** Corpus 1 is created as 150 hypothesis-driven A-F rows.
2. **2026-07-09:** a separate 2,000-row random-uniform corpus is created.
3. **2026-07-10, PR #1182:** solver baseline logs identify 300 random rows as solvable. Those 300 are moved into Corpus 1. The 1,700-row random file becomes the complementary unsolved/timeout set.
4. **2026-07-11, commit `063ada5c9b97a29a392865413e1d53630bf347f6`:** square-grid enforcement removes every non-square row. Corpus 1 falls 450 -> 102 and is not replenished. Corpus 2 loses 1,372 rows and generates 1,372 replacements, returning to 1,700.

The current populations therefore contain these strata:

| Current population | Stratum | Rows | Selection history |
|---|---|---:|---|
| Corpus 1 | original A-F survivors | 23 | hypothesis-driven generation; square-grid retention |
| Corpus 1 | migrated random-uniform survivors | 79 | **selected because the 2026-07-10 solver solved them**, then square-grid retention |
| Corpus 2 | original random-uniform survivors | 328 | **selected into the 1,700 complement because the 2026-07-10 solver did not solve them**, then square-grid retention |
| Corpus 2 | July-11 square replacements | 1,372 | generated after the outcome partition; not members of the original July-10 solve/fail split |

The 79 current migrated rows are not merely same-generator ancestry. They are an outcome-selected easy-for-that-solver slice of the same original random population from which Corpus 2's retained old rows came.

Likewise, at least 328 current Corpus-2 rows carry an old-solver-failure selection history even though the current corpus as a whole should not be reduced to that historical label because 1,372 rows were generated fresh after the square cleanup.

## Why the earlier corpus audit did not go far enough

The September-13 population-validity audit correctly found that current Corpus 1 contains 23 A-F rows and 79 `random-uniform-v1` rows. It treated this primarily as mixed generator ancestry.

That was incomplete. The key causal fact is **why those 79 random rows are in Corpus 1 at all**: they were chosen from the original 2,000 because the then-current solver solved them. The same operation made the remaining 1,700 a solver-negative complement.

Thus `generator ancestry` and `retention/selection ancestry` are separate evidence dimensions. A row can be solver-blind at generation time but solver-outcome-selected later.

This is the same general lesson established elsewhere in the research operating model: selection is part of the result.

## September-3 "cross-generator" transfer reanalysis

The report `reports/2026-09-03-portfolio-18-tranche-v2-cross-generator-001-preflight.md` treated all 102 current Corpus-1 rows as:

> a clean, disjoint, differently-generated population

and concluded that `portfolio-18-tranche-v2` transferred its no-regression/work-saving property to a genuinely different generator.

The experiment itself ran correctly. Its recorded whole-population totals are accurate. The **population-role premise was false**.

The still-live GHA artifacts were recovered from:

- control/full-menu run `33718270281`;
- tranche-v2 run `33718272194`.

The 102 rows were then partitioned by current ancestry into:

- **23 genuine A-F rows**: the original generator-1.0.0 hypothesis-driven survivors;
- **79 migrated random rows**: generator-1.1.0 `random-uniform-v1` rows selected for July-10 solver success.

### Coverage by ancestry

| Arm | Genuine A-F (23) | Migrated random (79) | Whole C1 (102) |
|---|---:|---:|---:|
| `full-menu` | 22 | 71 | 93 |
| `portfolio-18-flat-2m` | 22 | 69 | 91 |
| `portfolio-18-tranche-v2` | 22 | 71 | 93 |

On the actual different-generator A-F stratum, **all three arms solve the identical 22/23 count**. The sole A-F miss is `S00028` for all three.

Every whole-C1 coverage difference is in the migrated random stratum.

For tranche-v2 versus full-menu specifically:

- gains: `R00064`, `R01756`;
- losses: `R00045`, `R00087`;
- A-F gains: **0**;
- A-F losses: **0**.

So the experiment provides no cross-generator evidence that tranche-v2 improves or damages coverage relative to full-menu. It establishes only parity on 23 A-F rows.

### Work by ancestry

Recovering the shard-level `workSpent` rows changes the work conclusion more sharply:

| Arm | A-F aggregate work | Migrated-random aggregate work | Whole-C1 aggregate work |
|---|---:|---:|---:|
| `full-menu` | 113,932,072 | 914,968,506 | 1,028,900,578 |
| `portfolio-18-flat-2m` | 82,592,469 | 678,154,926 | 760,747,395 |
| `portfolio-18-tranche-v2` | 148,017,188 | 807,653,353 | 955,670,541 |

Relative to full-menu:

- whole C1: tranche-v2 saves 73,230,037 work, **-7.12%**;
- migrated random stratum: tranche-v2 saves 107,315,153 work, **-11.73%**;
- genuine A-F stratum: tranche-v2 spends 34,085,116 more work, **+29.92%**.

Thus the whole-population work saving is not merely weaker on the genuine transfer stratum. It reverses sign.

`portfolio-18-flat-2m` does save work on A-F (-27.51% versus full-menu) while tying A-F coverage 22/23, but that is a different treatment and does not rescue the historical tranche-v2 transfer claim.

## Correct classification of the historical result

This is **not** an implementation failure and **not** a broken solver measurement.

- The treatment ran.
- The arms produced real outcomes.
- The recorded 93/102, 91/102, 93/102 totals and whole-population work figures were correct.
- The failure was the **evidence-population premise**: current Corpus 1 was assumed to be one genuinely different generator when 79/102 rows were same-generator random levels selected by historical solver success.

So the right classification is:

> **premise failed: population/evidence-role misclassification**

The corrected interpretation is:

- on 23 genuine A-F rows, tranche-v2 and full-menu have coverage parity (22/23);
- tranche-v2 costs 29.92% more aggregate work there;
- the favorable whole-C1 coverage churn and work saving come from the 79 migrated same-generator, solver-positive rows;
- therefore the September-3 run does **not** satisfy a cross-generator work-saving transfer gate for tranche-v2.

## Scientific consequences

### 1. Corpus labels are downstream variables

`Corpus 1` and `Corpus 2` are not primitive population identities. They are the result of generation, solver-outcome migration, geometry cleanup, and later replacement. Analyses that care about generalization must preserve those stages.

### 2. Solver-blind generation is not enough

The 79 migrated random rows were generated without solver steering, but later selected because the solver solved them. Calling them solver-blind is true about generation and insufficient about evidence selection.

Similarly, the 328 surviving original C2 rows came from the July-10 failure complement. They are not a prospective random sample with respect to that historical solver.

### 3. Whole Corpus 1 is development evidence, not a transfer source

Current evidence authority already treats Corpus 1 as development material for new policy decisions. This reconstruction supplies an additional reason: even before repeated later mining, the corpus itself mixes generators and an outcome-selected migration.

A future transfer claim should not use all 102 rows as one cross-generator unit. If historical A-F rows are useful diagnostically, stratify them explicitly. For genuinely fresh distributional transfer, prefer a materially independent current source such as topology composition or independent human/editor material.

### 4. Current Corpus 2 is also temporally heterogeneous

It should remain the main development/capability laboratory. But historical conclusions that implicitly treat all 1,700 rows as one prospective July-9 random draw are false after both the July-10 outcome partition and July-11 1,372-row replacement.

A frozen experiment needs content/run identity, not only the filename `stress-levels-random.json`.

### 5. Selection history deserves first-class provenance in future generated resources

Generation provenance currently answers who/how created a row. It does not necessarily answer why that row remained in or moved between research populations.

For future population curation, preserve selection events separately from generation events when membership is decided by solver outcome, difficulty, residual status, novelty, or another research-derived criterion. Do not silently collapse generation provenance and evidence-selection provenance into one label.

## What this audit changes, and what it does not

It does **not** make the standing stress corpora less useful for the project's actual objective. Solving a current C1 or C2 level remains a solve.

It does change what those solves and experiments are entitled to establish scientifically:

- C1/C2 membership cannot be treated as a clean generator-only partition;
- C1 whole-population results cannot establish cross-generator transfer;
- C2 historical rows include a solver-negative selection stratum plus a large later replacement stratum;
- ancestry-stratified interpretation can materially reverse an aggregate conclusion, as the September-3 work result demonstrates.

This fresh pass therefore strengthens the operational program while narrowing several historical evidence claims. That is the desired outcome of the audit: keep the mountain, improve the map.