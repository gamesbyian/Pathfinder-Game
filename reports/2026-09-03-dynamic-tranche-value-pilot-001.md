# Dynamic tranche-value pilot 001: lifecycle-only shadow screen

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — local 24-level, three-action split-sample shadow pilot.
> **Decision:** natural exhaustion versus cap censoring is predictive, but not actionable in the tested scheduler shape. The bounded matched-envelope shadow A/B dispatched zero continuations because current searches cannot resume and no level's unused first-tranche work could fund the required 2×-cap restart. Close this lifecycle-only dynamic form.
> **Remaining gate:** none. Reopen only if resumable search state makes a continuation cost one incremental tranche, or a materially different same-envelope allocation mechanism avoids paying again for the first tranche.
> **Evidence role:** local development shadow pilot.

## Prespecification

The smallest available legal signal was the existing attempt lifecycle outcome. Three operationally
different `portfolio-18-tranche-v2` actions (CW perimeter beam, diverse objective beam, and
portal-first DFS) were run independently at their v2 cap and at twice that cap on the first 24 levels
of the already-fixed confirmation-001 population. A continuation benefit means the static-v2 tranche
failed and one additional equal tranche solved. Odd/even population positions were fixed as
train/test before results. This directly asks about allocation beyond the static map; an earlier
half-v2/full-v2 draft was corrected before this decision-bearing artifact because it merely
re-measured the already-confirmed static allocation rather than next-tranche value.

Success required lifecycle outcome to improve held-out Brier score beyond technique identity and
to separate continuation value in the same direction in both splits. The stop rule was no held-out
improvement, split instability, or no continuation-benefit events. Canonical `workSpent` bounded
both arms; no level identity enters a candidate policy.

## Result

Of 69 unsolved static-tranche risk rows, 39 naturally exhausted and 30 were capped (`timed-out` in
the attempt lifecycle vocabulary). The added tranche rescued 3/30 capped rows (10%) and 0/39
naturally exhausted rows. Direction held in both fixed splits: train 1/14 versus 0/20; test 2/16
versus 0/19. Adding lifecycle outcome to technique identity reduced held-out Brier score from
`0.055766` to `0.037311` (33.1%). The rescues span two actions and three unrelated level ids
(`R00181`, `R00546`, `R01151`), rather than one action/family.

This passes the prespecified predictive gate and gives an interpretable diagnostic rule:
never continue a search that reports natural exhaustion; a capped search remains at risk of benefit.
It does **not** establish that simply doubling every capped action is worthwhile under a shared
portfolio envelope. The actionability check below therefore keeps total work matched and permits
only same-solve work left unused by naturally exhausted first tranches to fund a larger retry.

## Matched-envelope actionability check

The solver has no resumable frontier contract for these actions. After observing censoring, the
smallest executable counterpart to the 2×-cap measurement is therefore a fresh 2×-cap restart; its
cost is the whole larger attempt, not merely the second tranche. A bounded shadow policy ran the
three ordinary v2 tranches first, then considered capped actions in static order only when work left
unused by naturally exhausted actions could fund that full restart. The per-level envelope was the
sum of the three v2 caps (`10,531,934` work).

Across all 24 levels, this policy dispatched **zero** continuations: unused work ranged from zero to
about 3.11M, below every eligible 2× restart cost. Control and treatment consequently both solved
3/24. This is the decisive scheduler result: the signal predicts which actions are futile to
continue, but current execution cannot monetize that information under the same envelope. Building
a dynamic scheduler, adding more signals, or running a population-scale A/B would not repair the
missing continuation primitive. The tested form is closed negative despite its positive conditional
correlation.

Machine-readable rows: `reports/stress/portfolio/dynamic-tranche-value-pilot-001.json`.

## Reproduction

```bash
npm run solver:dynamic-tranche-value-pilot -- --limit=24 --out=reports/stress/portfolio/dynamic-tranche-value-pilot-001.json
```

The script fails on wall-censored cells rather than treating them as deterministic evidence. Its
new `collectAttemptTelemetry` input exposes already-existing attempt outcomes only for this shadow
path; default census/static-portfolio result size and execution are unchanged.
