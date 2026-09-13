# Must-turn-biased repair family preflight 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — existing historical family-census results for the seven current class-2 must-turn-biased repair nominations, covering constrained-shuffle, group-reshuffle and swap families.
> **Decision:** retain the bounded late must-turn-biased repair treatment question, but use `R02768` and `R02180` as the first contrast pair because they bracket historical family sensitivity rather than merely being the two cheapest isolated winners.
> **Remaining gate:** implement the smallest default-off/additive late must-turn-biased repair probe and compare the contrast pair under matched current work. Family evidence does not establish current treatment efficacy and must not substitute for that live test.

## Question

Can the existing variant-family library sharpen the seven-level must-turn-biased repair nomination before any new solver compute?

The seven current residual parents are `R02180`, `R02367`, `R02459`, `R02768`, `R02849`, `R03049`, and `R03056`. Each has an isolated `repair|score=repair|guidance=must-turn-biased` winner while current production reaches repair context without exposing that exact guidance.

This preflight deliberately asks a narrower question than treatment efficacy: **are these seven parents sitting in uniformly perturbation-sensitive neighborhoods, or does nearby structural response vary enough to improve the first pilot design?**

## Evidence used

The historical research branch `claude/variant-levels-solver-insights-tpk4qg` contains whole-ladder family-census runs for three controlled transform modes on all seven parents:

- constrained shuffle (`cs`), 10 siblings per parent;
- group reshuffle (`gr`), 10 siblings per parent;
- swap (`swap`), 10 siblings per parent.

All cited rows are historical August 7 solver observations under the legacy scheduler with a 36M node ceiling / 48.24M work budget. They are not current-production capability claims. The old census also records only whole-ladder success here, not isolated must-turn-biased repair response, so this evidence can stratify the live pilot but cannot answer it.

## Result

| Parent | Isolated must-turn-biased winner nodes | CS solved | GR solved | Swap solved | Historical family total |
|---|---:|---:|---:|---:|---:|
| `R02180` | 6,206,072 | 1/10 | 0/10 | 0/10 | **1/30** |
| `R02367` | 32,182,920 | 0/10 | 0/10 | 0/10 | **0/30** |
| `R02459` | 16,268,287 | 1/10 | 0/10 | 0/10 | **1/30** |
| `R02768` | 1,179,294 | 3/10 | 2/10 | 0/10 | **5/30** |
| `R02849` | 12,955,651 | 1/10 | 0/10 | 0/10 | **1/30** |
| `R03049` | 12,345,609 | 0/10 | 0/10 | 0/10 | **0/30** |
| `R03056` | 23,299,834 | 0/10 | 0/10 | 0/10 | **0/30** |
| **Total** |  | **6/70** | **2/70** | **0/70** | **8/210** |

The evidence is strongly non-uniform by parent. `R02768` owns 5/8 observed sibling solves and is the only parent with rescues in two transform modes. `R02180`, despite being the second-cheapest isolated must-turn winner, is nearly family-rigid under this historical whole-ladder regime. Three parents are fully 0/30.

The mode pattern also argues against a simple "any local perturbation makes these levels easier" story: swap is 0/70 across the nominated population, while the sparse rescues concentrate in constrained shuffle and, for `R02768`, group reshuffle.

## Interpretation

This is exactly the kind of cheap stratification the family library should provide before live compute.

It does **not** show that must-turn-biased repair is causal, because the historical census did not preserve isolated per-technique counterfactuals for these rows. It does show that the seven-level seam is not one homogeneous cloud of generally perturbation-sensitive parents.

Therefore the original advice to start with `R02768` and `R02180` becomes stronger for a better reason:

- `R02768` is the cheapest isolated winner **and** the most historically family-responsive parent.
- `R02180` is the second-cheapest isolated winner but historically family-rigid.

That pair is an informative bracket. A current additive must-turn-biased probe that solves both would survive a meaningful difference in nearby structural sensitivity. Solving only `R02768` would increase suspicion that the treatment is exploiting a generally fragile/easy neighborhood. Solving only `R02180` would be especially interesting because it would cut against generic family-rescue sensitivity and strengthen the mechanism-specific interpretation. Neither outcome alone licenses promotion.

The 0/30 parents (`R02367`, `R03049`, `R03056`) are valuable later confirmation cases if the cheap pair earns continuation: they offer historically rigid neighborhoods rather than more copies of the `R02768` phenotype.

## Research-evidence boundary

Treat sibling rows as correlated within parent. The independent units here are seven parent families, not 210 levels. Raw 8/210 is descriptive of the historical library slice, not a prevalence estimate for either the stress corpus or the transform operators.

Historical whole-ladder success is also not current solver capability. This preflight changes **case selection and interpretation**, not the treatment disposition.

## Disposition

The family library earns immediate practical value here without new generation or solver compute. It sharpens the first live test from "run the two cheapest rows" to **run a deliberately contrasted pair: cheap/family-responsive `R02768` versus cheap/family-rigid `R02180`**.

If that pair earns continuation, add at least one 0/30 parent before population scaling. Do not generate new families for this question unless the existing relatives cease to discriminate the surviving mechanism.