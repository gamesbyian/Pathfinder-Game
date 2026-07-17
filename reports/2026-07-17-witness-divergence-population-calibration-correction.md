# Correction: witness-divergence discrepancy density does not discriminate solved from unsolved corpus-2 levels (2026-07-17)

## What this corrects

`reports/2026-07-17-repair-close-witness-divergence-diagnosis.md` (same day, earlier) claimed the
`repair-close`/`repair-far` population's witness-discrepancy density (0.60–0.80 per step, from its
**top-30-by-discrepancy** members) was "roughly double" the batch-B reference (S033: 0.31/step,
S042: 0.38/step — `data/stress/README.md`). **This comparison was not apples-to-apples and the
conclusion built on it does not hold up under a proper population-level check**, done here as part
of extending the same diagnostic to the `dfs-plain` cluster (Campaign 2). Documenting the
correction explicitly rather than quietly revising, per this repo's own standard for reporting
overreach once found.

## What went wrong

The earlier report compared a **cherry-picked tail** (the 30 highest-discrepancy members of a
621-level population) against **two specific named levels** from an earlier corpus
generation/session (batch-B, `data/stress/stress-levels.json`, not `stress-levels-random.json`).
Both selection effects bias the comparison toward finding a gap: the top-30 of any distribution is
by definition its most extreme members, and two hand-picked historically-hard levels are not
representative of "how hard is typical for a level repair-search already solves."

## Correct comparison: same corpus, population medians, matched control group

Ran `witness-divergence.mjs` (unchanged tool, no code fix needed) against three same-corpus
(`stress-levels-random.json`) populations and compared **medians**, not cherry-picked extremes:

| Population | n | Median steps | Median cumulative discrepancy | Median discrepancy/step |
|---|---:|---:|---:|---:|
| `dfs-plain` (unsolved) | 843 | 100 | 39 | **0.395** |
| `repair-close`+`repair-far` (unsolved) | 621 | 104 | 39 | **0.377** |
| Solved corpus-2 sample | 60 | 86 | 34 | **0.394** |

**The per-step discrepancy ratio is statistically indistinguishable across all three groups**
(0.377–0.395, a difference well within noise for these sample sizes). `maxStepRank` distributions
are equally indistinguishable: all three groups are dominated by rank 2 (74–85% of levels), with
most of the remainder at rank 3, and no meaningful skew toward higher ranks for the unsolved
populations.

**The only real (and modest) difference found: path length.** Unsolved levels run somewhat longer
(`dfs-plain` median 100 steps, `repair-close`+`repair-far` median 104) than the solved sample
(median 86) — roughly 16–20% longer, not a qualitative difference in per-step search difficulty.

## Corrected interpretation

The default-profile witness-divergence replay (no structural template, a single common baseline
across the whole corpus — see the tool's own doc comment) **does not discriminate solvability at
the population level** for stress-corpus-2. This doesn't mean the diagnostic is useless — it
correctly found zero legality/pruning errors across both traced populations (a real, if negative,
result), and it may still be informative for a genuinely deep single-level dive using that level's
*actual* attempt-policy profile rather than the common default baseline. But **"this population's
discrepancy density is roughly double what repair-search was proven against" is not a supportable
claim from this data**, and should not be treated as established going forward.

What the data *does* support: unsolved levels in both `dfs-plain` and `repair-close`/`repair-far`
tend to require somewhat longer paths than solved ones. This is consistent with — not a new
finding beyond — the already-documented CLAUDE.md gotcha that open board space / path length is a
first-class difficulty variable independent of object placement (the re-embedded-cousin grid-growth
finding), rather than evidence of a distinct "compounding small deviations" failure mechanism.

## Revised standing for Campaign 1 and Campaign 2

- **Campaign 1** (`repair-close`/`repair-far`): the probe-node-budget-starvation finding and its
  measured non-impact (0/30 solved even with 2.5x generous budget and full pipeline access) both
  stand — those were measured directly, not inferred from the discrepancy comparison. What's
  withdrawn is specifically the "this population needs ~2x what repair-search was calibrated for"
  framing; the honest state is "genuinely hard, real reason not yet isolated by this diagnostic."
- **Campaign 2** (`dfs-plain`): the same default-profile witness-divergence pass found no
  population-level discriminator either. The path-length gap (100 vs. 86 median steps) is real but
  modest — worth noting as a contributing factor, not a root cause on its own (plenty of 86-100-step
  levels solve; plenty of 100+ step levels are in the unsolved set, so length alone isn't
  deterministic).
- **What would be more informative than repeating this diagnostic**: per-level witness-divergence
  using each level's own actually-selected attempt-policy profile (not the common `default`
  baseline every level was replayed against here), which is a closer match to what the real solver
  attempt would score — plausibly a real discriminator this coarser pass couldn't see. Also worth
  trying: the level reducer (`stress:reduce-level`) on 1–2 concrete `dfs-plain` members to get a
  minimal reproducing case small enough to reason about directly, rather than population-level
  aggregate statistics.

## Verification

Read-only diagnostic re-analysis, no code changed. All comparisons in this report are reproducible
directly from the already-generated `witness-divergence.mjs` JSON outputs (population-level
medians over the full `results` array, not the tool's own printed top-N summary, which is what
produced the earlier report's misleading impression).
