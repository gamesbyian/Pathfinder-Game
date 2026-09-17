# H3 dependency-defined repair commitment interface result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-17 — offline replay/comparison over Card-E's already-committed 156-row rescuable/non-rescuable population, current HEAD.
> **Decision:** H3's core premise ("repair locality is governed by a small set of coupled earlier commitments rather than rollback distance or prefix length") is **not supported** on this population. Remaining path length is by far the dominant predictor of rescuability (Cohen's d = -1.81; reconstructable rate 30.2% when remaining length ≤80 vs. 1.0% when >80) — exactly the generic distance/length driver the premise names as insufficient. Specific commitment facts (portal-jump history, intersection usage) show a real but much weaker secondary effect that partially survives controlling for remaining length, but nothing resembling "a substantially smaller commitment set than positional distance."
> **Remaining gate:** none for this specific premise. Per H3's own advancement bar ("do not jump to CP-LNS, adaptive destroy severity, or new operators from descriptive differences alone"), this closes the commitment-interface-over-distance formulation; it does not close whether remaining length itself has production allocation value (a separate, already-partially-explored question — see "Relation to existing evidence" below).
> **Evidence role:** discovery/confirmation over an already-committed population. Card-E's reconstructable/non-reconstructable labels were fixed before this analysis (Card-E's own sizing pass), and were never touched here; this report only extracts commitment-interface features from the already-recorded prefixes and compares them against that fixed label. No new solver compute, no new labelling.
> **Population identity:** the exact 156-row Card-E population (`reports/stress/card-e-sizing-cross-tab-001.json`, `reports/stress/card-e-sizing-retreat-file-001.json`), reused unmodified. 17 rows reconstructable (already referee/replay-validated by Card-E), 139 not.
> **Selection history:** Card-E's own population selection/labelling (stratified draw over the post-Class-4 residual, described in `reports/2026-09-16-card-e-sizing-and-state-selection-001.md`) is unrelated to and predates this question; this pass adds no new selection pressure beyond choosing which already-recorded state fields to extract.
> **Inference scope:** this establishes that on Card-E's population, generic remaining length dominates rescuability and a "commitment interface distinct from distance" is not the primary explanation. It does not test other repair-retreat populations, does not test whether length itself is an economically actionable allocation signal under fixed work, and does not rule out a commitment interface mattering within a length-matched subpopulation with more data (the short-remaining-length stratum, n=53, showed weaker but non-zero portal/intersection effects).

## Why this ran

`reports/2026-09-16-class5-cross-resource-hypothesis-harvest-001.md` names H3 as a bounded next-in-order acquisition line (queue items 4-5 in `docs/solver-optimization-workstreams.md`, after H1 and DEAD-core closed). Its own "smallest falsifying observer" calls for comparing a dead continuation with a rescuing one on already exact-labelled repair-retreat/seeded-reachability cases and recording only future-relevant commitment differences — exactly what Card-E's already-committed 156-row population (17 reconstructable via `searchCompletionFromPartialPath`, 139 not, both referee/replay-validated) already provides, with zero new solver compute required.

## What was implemented

**`scripts/stress/h3-repair-commitment-interface.mjs`**: for each of Card-E's 156 rows, replays the retreat-file's elite path up to its recorded beam-cull depth (`row.cullDepth`, the same `low` field Card-E used to seed `searchCompletionFromPartialPath`) through the native solver's own `createState`/`applyMove` primitives, then extracts only commitment-interface facts: must-cross/must-pass total and pending counts, flipper usage, portal-pair total and jumps-already-used, self-intersections used/remaining, and remaining path length. This never touches Card-E's reconstructable/non-reconstructable label as an input — the label is the dependent variable being explained.

## Result

Effect sizes (Cohen's d, reconstructable vs. non-reconstructable), ranked by magnitude:

| Feature | d | Mean (reconstructable) | Mean (non-reconstructable) |
|---|---:|---:|---:|
| `lengthRemaining` | **-1.81** | 60.3 | 94.0 |
| `requiredLength` | -1.41 | 83.2 | 108.3 |
| `portalJumpsUsed` | 0.83 | 1.18 | 0.66 |
| `intsRemaining` | -0.71 | 3.77 | 5.73 |
| `ints` (self-intersections used) | 0.63 | 0.71 | 0.34 |
| `mustPassTotal` | 0.39 | 10.1 | 8.4 |
| `mustCrossTotal` | 0.34 | 3.8 | 2.9 |
| `mustCrossPending`, `mustPassPending`, `flipperUsed`, `flipperPendingFraction` | ≤0.20 | — | — |

Splitting on remaining length (≤80 vs. >80, roughly the pooled median): reconstructable rate is **30.2% (16/53)** in the short-remaining half and **1.0% (1/103)** in the long-remaining half — 16 of the 17 reconstructable rows sit in the short-remaining half. Within that short-remaining half alone, `portalJumpsUsed` (1.19 vs. 0.81) and `ints` (0.69 vs. 0.51) still separate the groups, but the gap shrinks substantially from the pooled comparison; `intsRemaining`'s effect nearly vanishes (3.50 vs. 3.97).

## Interpretation

Remaining path length — precisely the "rollback distance or prefix length" H3's premise names as an *insufficient* explanation — is the dominant predictor here, by a wide margin over every commitment-specific feature tested. This is the expected behavior of a fixed-node-budget search operator (`searchCompletionFromPartialPath`, capped at 2,000,000 nodes in Card-E's contract): a smaller remaining problem is mechanically more likely to be solved within a fixed budget, independent of any specific commitment structure. The moderate portal-jump/intersection-usage effects are real (they partially survive controlling for length) but are far smaller than the length effect and do not constitute "a substantially smaller commitment set than positional distance" recurring across unrelated levels — they are a secondary signal riding on top of a dominant scale effect, not a replacement for it.

## What survives

The weak length-independent portal-jump/intersection-usage signal (Cohen's d ≈0.6-0.8 pooled, smaller but present within the short-remaining stratum) is preserved as capability-memory evidence: "more portal jumps or self-intersections already committed correlates with higher rescuability, independent of remaining length" is a real, small, board-independent-so-far pattern that a future higher-powered pass (a larger population, or one stratified/matched on remaining length from the start) could test properly. It is not, on its own, enough to earn a dependency-conditioned neighbourhood or descent-aware repair observer per H3's own advancement bar.

## Relation to existing evidence

This does not reopen the Class-2 must-turn-biased late-repair economics result (`reports/2026-09-16-class2-must-turn-economics-result-001.md`, closed negative) or generic positional/prefix repair's earlier negative under shared work — those are production-economics questions (does *using* a distance/positional signal to prioritize repair buy net solves under fixed work), which is a different and stronger claim than this report's purely descriptive/oracle-budget correlation. Nothing here licenses a production treatment; per H3's own advancement bar, descriptive differences alone do not earn CP-LNS, adaptive destroy severity, or new operators.
