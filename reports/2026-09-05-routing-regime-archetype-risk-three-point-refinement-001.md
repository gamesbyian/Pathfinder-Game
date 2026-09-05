# Correction/refinement: the multi-portal-hardest anomaly emerged between late July and early August, it is not a longer-standing pattern

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — added the earlier `reports/stress/corpus2-feature-solvability-2026-07-29.json` snapshot (a week before the `-2026-08-06.json` one used in `2026-09-05-routing-regime-archetype-risk-temporal-stability-001.md`) to build a three-point-in-time series, no new dispatch
> **Decision:** this refines, rather than contradicts, the prior report's "stable across a month" framing. The portal-heavy archetype's enrichment across the three snapshots is: **2026-07-29: 1.015** (near neutral) → **2026-08-06: 1.168** (elevated) → **2026-09-03: 1.250** (elevated, current). The "multi-portal is the hardest regime" anomaly was **not yet present** in the earliest snapshot — it emerged (or strengthened sharply) sometime between July 29 and August 6, then held roughly stable from August 6 through September 3. The prior report's stability claim is accurate for its actual comparison window (Aug 6 → Sep 3, ~4 weeks) but should not be read as "this has always been true" — the fuller series shows a real regime-level change happened in early August, not just measurement noise.
> **Remaining gate:** none — a refinement of an already-published finding using a third already-collected snapshot.
> **Evidence role:** forensic/methodological — corrects an implied stronger claim ("stable across a month") with a fuller time series that shows the pattern actually emerged mid-window
> **Selection:** whole corpus2 population at each of 3 snapshots (1,700 levels each), not a sample

## Method

Extended the two-point (Aug 6 vs. Sep 3) comparison in `2026-09-05-routing-regime-archetype-risk-temporal-stability-001.md` with the earlier `-2026-07-29.json` snapshot, computing the same enrichment metric for all four archetypes across all three time points.

## Result

| archetype/regime | 2026-07-29 | 2026-08-06 | 2026-09-03 (current) |
|---|---:|---:|---:|
| portal-heavy / `multi-portal` | 1.015 | 1.168 | 1.250 |
| high-intersection-burden / `intersection-heavy` | 1.020 | 0.981 | 0.983 |
| must-cross-heavy | 0.910 | 1.010 | 0.909 |
| default / `general` | 0.812 | 0.952 | 0.980 |

Per-feature Cohen's d also shifts substantially between the two earliest snapshots specifically: `mustCross` drops from 0.540 (Jul 29) to 0.189 (Aug 6), and `portalPairs` rises from 0.356 (Jul 29) to 0.584 (Aug 6) — both consistent with the same underlying shift (portal-related difficulty rising, must-cross-related difficulty falling) that produced the archetype-level change.

## Interpretation

Reading all three points together tells a more precise story than either two-point comparison alone: something changed in the corpus2 solve landscape between July 29 and August 6 that increased portal-heavy/multi-portal levels' relative difficulty and decreased must-cross-related separation, and that new state has persisted essentially unchanged for the four weeks since. Candidate explanations not tested here include a solver/budget-model change, a hint-corpus expansion changing which levels count as "solved" in the baseline, or a corpus content change — any of these would need the actual `logs/stress-corpus2-baseline.json` history or intervening commit log to distinguish, which this report did not pursue.

This matters for how confidently `2026-09-04-routing-regime-multiplicity-and-difficulty-001.md`'s multi-portal exception should be treated going forward: it is a real, currently-stable-for-a-month pattern, but it is not necessarily a permanent structural property of the multi-portal regime — it has changed once already within the available historical window, so future census refreshes should not assume it is fixed.

## What this does not establish

- Does not identify the specific cause of the Jul29→Aug6 shift (solver change, baseline regeneration, or corpus change) — would need commit-log/changelog correlation against `logs/artifact-metadata.json` to pin down.
- Does not test whether an even earlier snapshot (if one exists) would show yet another different pattern.
- Still limited to corpus2 only, per the legacy artifacts' scope.
