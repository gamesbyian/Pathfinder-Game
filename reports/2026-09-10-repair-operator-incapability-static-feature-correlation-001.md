# Repair operator-incapability × static level feature correlation 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-10 — joined all 30 cleanly-classified cases from the repair reachability/reconstructability program (`2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md` + `2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md` batches 1-3) against each level's own static (raw, pre-solve) features.
> **Decision:** static block count (`level.blocks.length`) is the only candidate feature showing a non-trivial separation between reconstructable and operator-incapable cases — reconstructable cases have visibly fewer static blocks (mean 6.9 vs 13.0, median 4.5 vs 13.0; AUC/probability-of-superiority 0.69). Every other checked feature (grid area, `reqLen`, `reqInt`, `mustPass`, `mustCross`, flipping filters, portals, false goals, landmarks) shows weak-to-negligible separation. This is a **candidate signal, not a confirmed correlation**: n=8 reconstructable vs. n=22 incapable is small, the split is unequal, and this analysis mined the existing labelled population rather than testing a prespecified hypothesis on fresh cases.
> **Remaining gate:** if this workstream continues, test the block-count hypothesis on a **fresh, prespecified sample** (drawn before checking outcomes) using the same CP-SAT+rollout+`closeLengthGap` classification pipeline this program already established — that is real, non-cheap compute (each case needs a CP-SAT boundary + 2,000-trial rollout + up to 2,000,000-node diagnostic), so it should only be spent if this hypothesis is judged worth confirming, not folded into a future same-design batch by default.
> **Evidence role:** discovery
> **Selection:** observational — used every already-classified case from the existing program (no new solver/CP-SAT compute), joined against already-generated corpus level definitions (`data/stress/stress-levels-random.json`). Not selected after seeing the correlation; the classification outcomes were already fixed by the prior program before this join was run.

## Why this check

`2026-08-24-repair-reachability-reconstructability-audit.md`'s own "Remaining gate" (after its n=28 recurrence-check batches reached their target sample size) names the next question explicitly: "correlating operator-incapability or reconstructable-case cost with a legal static level feature." This join answers that question as cheaply as possible — no new solver runs, only a join of already-published classification outcomes against already-generated level JSON — while an unrelated GHA capability refresh ran in the background.

## Population

All 30 cases with an unambiguous binary classification (reconstructable/solved vs. operator-incapable) across the whole program:

- 8 reconstructable: `R00630`, `R02134`, `R02257`, `R02344`, `R02426`, `R02449`, `R02990`, `R03104`.
- 22 operator-incapable: `R00260`, `R00479`, `R00500`, `R01936`, `R02075`, `R02265`, `R02271`, `R02293`, `R02413`, `R02459`, `R02575`, `R02596`, `R02644`, `R02816`, `R02958`, `R02975`, `R03020`, `R03097`, `R03162`, `R03171`, `R03187`, `R03297`.

Excluded: `R00648`/`R03176` (different diagnostic category — `R03176` is "operator-incapable-here-but-whole-process-solves," not a clean binary with the rest), `R02919` (CP-SAT boundary never converged, explicitly excluded from the rate estimate by the source report itself).

## Method

For each case, pulled its raw level definition from `data/stress/stress-levels-random.json` and computed: grid area, `reqLen`, `reqInt`, `blocks.length`, `mustPass.length`, `mustCross.length`, `filters.length`, `flippingFilters.length`, `portals.length`, `geese.length`, `falseGoals.length`, `landmarks.length`, and `reqLen`/gridArea. Compared per-outcome-group mean/median for each feature, then computed a nonparametric effect size (AUC / probability-of-superiority: for a random incapable-reconstructable pair, the probability the incapable case's value is higher) for the features showing the largest raw separation.

## Result

| Feature | Reconstructable mean / median | Incapable mean / median | AUC(incapable > reconstructable) |
|---|---:|---:|---:|
| **blocks** | **6.88 / 4.50** | **12.95 / 13.00** | **0.690** |
| mustCross | 2.63 / 1.50 | 1.05 / 0.00 | 0.318 |
| falseGoals | 5.00 / 6.50 | 2.64 / 0.00 | 0.310 |
| flippingFilters | 4.63 / 5.00 | 2.86 / 0.00 | 0.389 |
| portals | 3.88 / 4.00 | 2.55 / 0.00 | 0.389 |
| gridArea | 148.13 / 144.00 | 141.27 / 121.00 | (weak, not tabulated) |
| reqLen | 83.25 / 81.00 | 83.05 / 77.00 | (negligible) |
| reqInt | 4.75 / 5.50 | 4.59 / 5.00 | (negligible) |
| mustPass | 4.50 / 5.00 | 3.18 / 2.50 | (weak, not tabulated) |
| filters | 0 (all cases) | 0 (all cases) | n/a — no case in this population uses static filters |
| geese | 1.25 / 0.00 | 2.05 / 0.00 | (weak, opposite direction, not tabulated) |
| landmarks | 9.88 / 11.00 | 11.23 / 11.00 | (negligible) |

`blocks` is the only feature with AUC meaningfully off 0.5 in a consistent, interpretable direction (more static blocks → more likely operator-incapable). `mustCross`/`falseGoals` show a weaker signal in the *opposite* direction (more of either → more likely reconstructable), consistent with repair having an easier time when the level's own obligations are more explicit/structured, but neither reaches `blocks`' separation.

## Interpretation

An AUC of 0.69 is a real but modest effect (0.5 = no separation, ~0.7 is typically called "acceptable" discrimination, not "strong"), on a small and unbalanced sample (8 vs. 22). A plausible mechanism, if this holds up: more static blocks means less open floor space for `closeLengthGap`'s bounded backtracking search to find an alternative completion within its neighborhood, independent of the must-pass/must-cross/flipper obligation count. This is a hypothesis the data is *consistent with*, not one this data establishes — no attempt was made here to control for confounds (e.g. blocks correlating with grid area or with a specific generator regime), and the population was not drawn to test this specific question.

## What this does not establish

- Does not confirm block count causes or even reliably predicts operator-incapability — this is an observational join over an existing, differently-purposed population, not a designed test.
- Does not justify a repair-operator mechanism change. Per the parent audit's own standing rule, no retreat/reconstruction-budget/destroy mechanism should be designed from this population regardless of this finding.
- Does not rule out that other unexamined features (relative block placement/clustering rather than raw count, distance from the frozen prefix to the nearest block, generator regime) matter more than raw block count.
- Small-n means this specific point estimate (AUC 0.69) should not be treated as precise; a fresh confirmatory sample could shift it materially in either direction.

## Reproduction

Ad hoc local join, not committed as a script (same convention as this program's own prior ad hoc diagnostics). For each of the 30 case IDs above, read `data/stress/stress-levels-random.json`'s matching `{id}` entry and tabulate `blocks.length`/`mustPass.length`/`mustCross.length`/`flippingFilters.length`/`portals.length`/`falseGoals.length`/`geese.length`/`landmarks.length`/`reqLen`/`reqInt`/`grid.w*grid.h` against the outcome recorded in the two source reports listed above.
