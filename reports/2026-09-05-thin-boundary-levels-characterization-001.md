# `thinBoundaryLevels` is a real, non-trivial category — 363 action-level thin-support solves across the census, over twice the count of genuinely exclusive solves

> **Status:** concluded-positive
> **Last evidence:** 2026-09-10 — read `scripts/analyze-technique-niches.mjs`'s own source (`thinBoundaryLevels: wins.filter((row) => row.solverCount <= 2).length`, line 107) to confirm the exact definition this report's original pass left unconfirmed.
> **Decision:** `thinBoundaryLevels` has **nothing to do with work/node budget margin** — the original pass's hedged guess ("plausibly ... a threshold (budget, near-tie, or similar)") was wrong. The actual definition: for a given action, it is the count of that action's own winning levels whose `solverCount` (the number of *distinct* frozen-T1/isolated-oracle actions able to solve that level at all) is `<= 2` — i.e. **thin isolated-technique *support*, not a solve-cost margin.** This is the exact same underlying population as "singleton ∪ doubleton" levels already characterized elsewhere in this census program (`doubleton-intra-family-redundancy-001.md`, `doubleton-structural-signature-null-001.md`, `singleton-family-plurality-001.md`, `tripleton-redundancy-and-structural-signature-001.md`) and the `frozenT1SupportClass: 'frozen-t1-thin-boundary'` label the same script emits a few lines above (line 86: `solverCount <= 2 ? 'frozen-t1-thin-boundary' : 'frozen-t1-broadly-supported'`) — `thinBoundaryLevels` is simply that same per-level classification, aggregated per-action rather than reported as a standalone level count. The 363/175/18,389 totals below are unchanged and still accurate; only the semantic label was corrected.
> **Remaining gate:** none — the definition is now confirmed from source. Any future decision-bearing use of `thinBoundaryLevels` should cite this report (or the source line directly) rather than re-guessing, and should treat it as a per-action view of the already-studied singleton/doubleton population, not a new independent metric.
> **Evidence role:** discovery, now fully forensic-confirmed (source-code read, not inference from field name)
> **Selection:** whole action population (41 actions), not a sample

## Method

Summed the `thinBoundaryLevels` field across every action in `level-capability.json`'s `actions` array and compared to the already-familiar `exclusiveLevels` and `solvedLevels` totals for scale.

## Result

| metric | total across 41 actions |
|---:|---:|
| `solvedLevels` | 18,389 |
| `exclusiveLevels` | 175 |
| `thinBoundaryLevels` | 363 |

Per-family breakdown (from the family-internal ranking reports): `admissible-order` shows `thinBoundaryLevels` values of 24 (`tieBreak=none`), 6 (`default`), 4 (`intersectionHarvest`, `mustCrossFirst`), 4 (`nearClosureRescue`); `beam`'s highest is `perimeterSweep|bias=perimeterCW` at 30, with several beam configs at 20+.

## Interpretation

This field is over twice the size of `exclusiveLevels` in aggregate because it counts a strictly broader condition: `exclusiveLevels` requires `solverCount === 1` (singleton only), while `thinBoundaryLevels` requires `solverCount <= 2` (singleton **or** doubleton) — so `thinBoundaryLevels` is `exclusiveLevels` plus each action's own doubleton-win count by construction, not an independently surprising quantity. The per-family breakdown below (`admissible-order`, `beam`) describes which actions most often appear as one of only 1-2 isolated solvers for a level, i.e. which actions carry the most thin-support-population weight — directly relevant to the specialist-retention question the workstream authority already tracks ("audit specialist retention, not only aggregate solves/work"), since a technique with a high `thinBoundaryLevels` share is disproportionately exposed to the doubleton/singleton redundancy risk those other census reports already characterize.

## What this does not establish

- Does not itself test whether a technique's `thinBoundaryLevels` share predicts its real production specialist-retention risk (the doubleton/singleton reports already partially answer this in aggregate; a per-action join is the natural next step if this workstream needs it).
- Single census snapshot (2026-09-03).
