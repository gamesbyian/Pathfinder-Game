# Guidance-distance first-divergence pilot

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — one known goal-attraction-disabled rescue and six unrelated ordinary-guidance controls traced on their successful paths.
> **Decision:** disabling goal attraction improved the rescue path's cumulative rank by only one, while controls were mixed and had a nearly identical average effect. No recurring guidance-specific ranking error separates help from harm.
> **Remaining gate:** none for global goal-attraction enable/disable ranking on successful paths. Do not test another distance blend or alternate geometric quantity without a materially new recurrent error.
> **Evidence role:** local outcome-selected mechanistic development pilot.

## Prespecification

The pilot used the exact stored `R00355` witness attributed to the successful
`goal-attraction-disabled-retry` intersection-harvest beam, plus the first six unrelated Corpus-2
witnesses found for the same beam width/profile with ordinary goal attraction enabled (`R00094`,
`R00108`, `R00118`, `R00137`, `R00143`, `R00153`). For each path, the real current scoring and
state-transition code replayed every move with `SCORE_GOAL_ATTRACTION` enabled and disabled.

Success required disabled guidance to rank the rescue path better, enabled guidance to rank ordinary
control paths better, and a recurring first-divergence pattern. Mixed direction, no rescue/control
separation, or selected-level-only recovery was the stop condition. This deliberately asks the
guidance-specific question before inventing portal/corridor/connectivity quantities.

## Result

`R00355` was directionally consistent but tiny: cumulative discrepancy changed from 42 enabled to
41 disabled. Its first meaningful divergence was only at move 50, and disabling attraction ranked
the stored successful move *worse* at that particular first divergence (rank 0 → 1); the net one-rank
advantage accumulated elsewhere.

Controls did not show the required opposite pattern: disabling goal attraction ranked three paths
better, two worse, and tied one. Mean disabled-minus-enabled discrepancy was `-0.83`, nearly the
same as `R00355`'s `-1` single-level effect, with first divergences spread from
moves 8 to 69 and both signs represented. Thus the known rescue is not distinguished from ordinary
successes by this ranking quantity.

The stop condition is met. There is no recurrent guidance-specific error to explain with a future-
relevant alternate quantity, so portal-aware distance, corridor commitment, cut consumption, and
similar proposals are not earned by this evidence. The old global replacement remains closed and
the disabled-goal retry remains a finite-portfolio complement rather than evidence for a universal
guidance correction.

Machine-readable output: `reports/stress/guidance-distance-first-divergence-001.json`.

## Reproduction

```bash
npm run solver:guidance-distance-first-divergence -- \
  --out=reports/stress/guidance-distance-first-divergence-001.json
```
