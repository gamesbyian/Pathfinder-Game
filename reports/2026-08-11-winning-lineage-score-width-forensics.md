# Winning-lineage score/width extinction forensics

> **Status:** bounded observational result plus first exact-prefix follow-up; no production retention change
> **Emitter commit:** `0e831fd910784c4c255367ed902fa1d447240a63`
> **Artifact:** `reports/stress/winning-lineage-same-config-2026-08-11.json`
> **Exact-prefix follow-up:** GitHub Actions run `31537268571`, 12 atlas abstentions → 7 dead / 1 live / 4 abstain

## Reproduction and method

The clean-commit rerun used the deterministic first 30 solution-bearing levels in `data/stress/stress-levels.json`, densest-label gate, default profile, width 100, and 100,000 canonical beam nodes. It exactly reproduced **13 solved / 17 failed**, observation OFF/ON path/outcome/node identity on 30/30, zero hard-prune alarms, mean normalized last support **0.505 solved vs 0.239 failed**, and failed final loss **15 score/width / 2 dedup**.

At every real score/width decision the observer now reduces the ranked pre-cull pool into supported rank, score, structural-family, and insertion-order facts. Classification is level-balanced (one final extinction per level): **C** requires the supported candidate itself to tie the cutoff and lose across stable order; **B** is a positive margin ≤1 score point; **D** requires a pool at least twice width, best known rank within 1.25× width, and a modest margin ≤5; **A** is the remaining material margin >1; **E** preserves missing/ambiguous evidence. D does not assert that every unknown competitor is valid—it identifies width saturation superimposed on score ordering.

## Fifteen failed final score/width extinctions

| level | depth / normalized | pool / width | supported candidates / winning families | best–worst rank | cutoff | supported score(s) | margin | first culled | tied at cutoff / support tied | stable boundary; insertion order | known families represented | work after extinction | class |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|---|---:|---:|:---:|
| S00001 | 28 / 0.431 | 142 / 100 | 1 / 10 | 126 | 639.759 | 627.843 | 11.916 | 638.971 | 1 / no | no; 373 | 10 | 3127 | A |
| S00028 | 15 / 0.167 | 224 / 100 | 1 / 1 | 165 | 456.295 | 421.863 | 34.432 | 456.283 | 4 / no | no; 274 | 1 | 7472 | A |
| S00030 | 14 / 0.161 | 256 / 100 | 2 / 5 | 109–216 | 698.187 | 694.998, 661.081 | 3.189 | 697.916 | 1 / no | no; 141,140 | 5 | 7070 | D |
| S00035 | 10 / 0.116 | 229 / 100 | 3 / 4 | 160–221 | 336.854 | 315.054, 296.231, 277.481 | 21.800 | 335.120 | 1 / no | no; 64,88,280 | 4 | 6262 | A |
| S00048 | 25 / 0.243 | 266 / 100 | 1 / 1 | 108 | 638.722 | 636.709 | 2.012 | 638.299 | 1 / no | no; 330 | 1 | 5514 | D |
| S00095 | 15 / 0.156 | 230 / 100 | 1 / 1 | 133 | 70.908 | 70.692 | 0.217 | 70.908 | 4 / no | yes; 180 | 1 | 6730 | B |
| S00099 | 11 / 0.106 | 255 / 100 | 1 / 3 | 179 | 84.756 | 81.658 | 3.097 | 84.756 | 4 / no | yes; 90 | 3 | 7989 | A |
| S00108 | 15 / 0.195 | 216 / 100 | 1 / 1 | 111 | 270.381 | 269.889 | 0.492 | 270.300 | 1 / no | no; 44 | 1 | 5880 | B |
| S00120 | 18 / 0.305 | 141 / 100 | 1 / 6 | 109 | 70.911 | 69.918 | 0.993 | 70.849 | 2 / no | no; 232 | 6 | 3209 | B |
| S00140 | 11 / 0.143 | 148 / 100 | 1 / 1 | 105 | 127.689 | 125.952 | 1.737 | 127.300 | 1 / no | no; 324 | 1 | 5569 | A |
| R00058 | 11 / 0.111 | 218 / 100 | 2 / 8 | 145–211 | 328.592 | 316.483, 271.873 | 12.110 | 328.055 | 2 / no | no; 277,372 | 8 | 7724 | A |
| R00060 | 18 / 0.247 | 127 / 100 | 1 / 1 | 124 | 79.882 | 21.810 | 58.072 | 77.164 | 1 / no | no; 389 | 1 | 4760 | A |
| R00064 | 9 / 0.090 | 163 / 100 | 1 / 2 | 103 | 12.808 | 3.796 | 9.012 | 7.724 | 1 / no | no; 117 | 2 | 8507 | A |
| R00087 | 10 / 0.096 | 228 / 100 | 1 / 5 | 218 | 297.233 | 232.281 | 64.952 | 295.768 | 1 / no | no; 356 | 5 | 8174 | A |
| R00104 | 36 / 0.493 | 165 / 100 | 2 / 1 | 120–127 | 564.882 | 536.516, 522.174 | 28.366 | 563.088 | 2 / no | no; 284,228 | 1 | 804 | A |

## Level-balanced result and controls

Failures classify as **10 A clearly mis-ranked, 3 B weak-margin, 0 C exact-tie/stable-order, 2 D width saturation, 0 E**. The two D rows miss by 2.012 and 3.189 points at ranks 108 and 109 in pools of 266 and 256; crowded pools never override materially bad score margins. Thus stable tie order is not the final-extinction explanation; no known-supported candidate was exactly tied with the cutoff. Three failures (S00095, S00108, S00120) are genuinely narrow misses. The rest are materially below cutoff or embedded in pools of 216–256 candidates, often with several labelled winning families collapsing together.

Solved controls had four final known-support score/width losses (S00103, S00114, R00045, R00134), all materially below cutoff (margins 1.514–10.640); seven ended labelled support at dedup and two had no observed extinction. Yet the four score-loss controls still solved, demonstrating that stored labels are incomplete and “known support extinct” is not “all true solutions extinct.” Controls also spent substantial post-label work in some cases (1,081–8,325 nodes), so post-extinction work alone does not distinguish failure.

## Initial interpretation

The strongest recurring mechanism is **score representation under a saturated frontier**, not deterministic exact-score tie asymmetry. Ten failures are materially below the boundary; two narrowly miss amid >2×-width pools, and three are within one score point. The evidence therefore does not justify a global tie shuffle or wider beam, and controls warn against treating labels as exhaustive.

The original next step was to obtain exact contrastive labels before freezing any retention counterfactual. That first exact-label step has now been completed.

## 2026-08-11 explicit-prefix CP-SAT follow-up

Workflow `.github/workflows/cpsat-explicit-prefix-oracle.yml`, run `31537268571`, processed the 12 `oracle-abstain` rows in the pilot atlas:

- **7 dead** (`INFEASIBLE`);
- **1 live** (`OPTIMAL`);
- **4 abstain**;
- **0 correctness alarms**;
- **0 input alarms**.

The four abstentions are all R00039 and all report `unsupported-mechanics`; they remain unknown rather than being mislabeled dead.

The one live case, `R00001:42:child-[5,6]:3`, produced an OPTIMAL completion whose emitted path passed Pathfinder's referee. The model-supported dead cases comprise five R00001 siblings and two R00044 siblings.

Most importantly, at least one R00001 sibling that the beam ranked **first** at its parent is now exact-infeasible while the same parent has a known-valid continuation. This provides a direct same-parent counterexample to the idea that the observed extinction problem is merely stable tie order or unavoidable beam width. The score can prefer a provably dead future over a viable one.

The live alternative matters too: not every sibling outside the stored known continuation is dead, so the search can genuinely face multiple viable futures. Exact labels should therefore be used to learn which neutral state properties distinguish future viability, not to turn the solver into a one-path imitation system.

## Updated interpretation / next experiment

The score-representation thesis is stronger, but the exact sample is still small: only eight of the 12 cases were model-supported, and they come from R00001/R00044. Do **not** freeze a production score, family quota, wider beam, or tie shuffle from this batch.

Next:

1. build a bounded set of same-parent siblings adjacent to actual score/width extinction events;
2. label them with the existing explicit-prefix CP-SAT workflow;
3. keep live/dead/abstain distinct;
4. test neutral future-opportunity descriptors against those labels;
5. only then choose the narrowest equal-work retention/score counterfactual.

A secondary structural-family reservoir/quota remains a plausible candidate, but it is no longer justified merely by “keep a labelled family alive.” It should be motivated by the exact labels and must remain level-blind: no exact-level known solution or historical winner may guide production selection.
