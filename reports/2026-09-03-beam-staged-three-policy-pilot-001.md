# Beam staged three-policy pilot (rung 3, staged/non-cyclic form)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — the same two independent 30-level uniform corpus2 samples used for rungs 2–3 (60 levels total), current HEAD
> **Decision:** A staged, non-cyclic three-policy schedule (`intersectionHarvest` → `objectiveFirst` → `perimeterSweep`, one switch each, never returning to an earlier policy) solves exactly the same levels as rung 2's own two-stage `intersectionHarvest`→`objectiveFirst` switch — 0 net wins in either direction on both samples (60/60 levels agree). Adding a third, weight-distinct specialist stage after the already-validated two-stage switch adds nothing measurable.
> **Remaining gate:** none for this exact profile triple/width/budget/segment size. Combined with the cyclic-alternation result (concluded-negative across a 12x segment-size range), this profile family's rung-3 headroom beyond rung 2's single handoff looks exhausted for now — a different profile family or a materially different schedule shape (not another staged/cyclic variant of these same three profiles) would be a new premise.
> **Evidence role:** development — a direct follow-up to rung 3's cyclic-form result, testing the doc's other suggested schedule shape (staged, not alternating) with a genuine third profile.
> **Selection:** prespecified (same two populations/seeds as rungs 2–3, reused for direct comparability; profile triple, segment size, and schedule shape fixed before dispatch — `perimeterSweep` chosen for being weight-distinct from A/B and already a real, named production beam config, not selected after seeing any outcome).

## Why this check

`2026-09-03-beam-alternating-policy-schedule-pilot-001.md` closed cyclic `[A, B, A, B, ...]` alternation as negative across a 12x segment-size range. `docs/solver-search-resumability.md` names a second, distinct schedule shape a positive rung-2 result could support: *"staged beam policies such as broad early exploration followed by specialist exploitation."* Cyclic alternation is not that shape — it never commits to a specialist for good. This pilot tests the staged shape directly, with a genuine third policy so it is not simply rung 2's own two-stage switch restated.

## Method

Reused rung 2/3's exact calibration (`beamWidth=200`, `W=300,000`, `segment=20,000`, same two populations) and added a third scoring profile, `SCORING_PROFILES.perimeterSweep` — weight-distinct from `intersectionHarvest`/`objectiveFirst` (`perimeterBiasWeight` 2.05 vs. 1.15/1.1 — see `modules/solver/policy.ts`) and itself a real, named, production-used beam config (`beam('perimeterSweep', BEAM.STANDARD, perimeterCCW)`, `modules/solver/attempts.ts`).

Five arms per level (`scripts/beam-staged-three-policy-pilot.mjs`): `A-only@W`, `B-only@W`, `C-only@W` (each policy alone), **two-stage switch** (segment 1 = A, every remaining segment = B — rung 2's own treatment, recomputed for a directly comparable table), and **three-stage staged** (segment 1 = A, segment 2 = B, every remaining segment = C — never returns to A or B).

## Result

| Sample | A | B | C | two-stage | three-stage | three-stage-only wins | two-stage-only wins |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0/30 | 0/30 | 1/30 | 2/30 | 2/30 | 0 | 0 |
| 2 | 2/30 | 2/30 | 2/30 | 2/30 | 2/30 | 0 | 0 |
| **Combined** | 2/60 | 2/60 | 3/60 | **4/60** | **4/60** | **0** | **0** |

Three-stage solved precisely the same levels as two-stage on every one of the 60 levels — not merely the same count, the same identity (`R02124`, `R02714`, and the two trivial co-solves `R02477`/`R02968`). `armC` alone additionally solved `R02714` on its own (a level `A`/`B` alone could not), but this offered the staged schedule nothing beyond what the two-stage switch already captured.

## Interpretation

Combined with the cyclic-alternation result, this profile family (`intersectionHarvest`/`objectiveFirst`/`perimeterSweep`) now has two independently-tested schedule shapes — cyclic (rung 3 main result, closed negative across 5 segment sizes) and staged (this pilot, closed negative) — both showing that a single `intersectionHarvest`→`objectiveFirst` handoff already captures all the measurable complementarity value at this budget/width. Neither repeating the switch nor extending it with a further specialist stage helps. This is a coherent, not merely repeated, negative: two structurally different ways of using more policies on one shared frontier both landed on the same answer.

## Scope and what this does not show

- One specific profile triple and one specific staging order (A→B→C). A different order (e.g., `perimeterSweep` first) or a different third profile was not tested.
- Same corpus2-only, `beamWidth=200`-only, single-population-pair scope as rungs 2–3.
- Does not test whether a staged schedule helps for a profile family with more behaviorally distinct members than this one (`intersectionHarvest`/`objectiveFirst`/`perimeterSweep` share the same underlying weight structure, differing mainly in magnitude and which factor dominates — not, e.g., a beam vs. a fundamentally different retention/ordering-bias axis).

## Follow-on

This closes both tested rung-3 schedule shapes (cyclic and staged) for this profile family. Per the research ladder's "do not skip rungs" rule, this still does not license skipping to rung 4 (bounded beam → DFS handoff, a different mechanism with its own prerequisites). If rung 3 is revisited again, it should be with a materially different premise — e.g., a profile pair that differs on a structural axis (retention/dedup policy, `orderingBias`) rather than scoring-weight magnitude alone — not another schedule-shape variant of this same three-profile family.
