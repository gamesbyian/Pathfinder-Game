# Dynamic tranche-value pilot 001: lifecycle-only shadow screen

> **Status:** inconclusive
> **Last evidence:** 2026-09-03 — local 12-level, three-action split-sample shadow pilot.
> **Decision:** first-tranche lifecycle outcome supplied no incremental information in this sample. Do not build a dynamic scheduler from this result.
> **Remaining gate:** only a deliberately mixed continuation-value population plus one small generic progress/frontier bundle; do not enlarge this lifecycle-only form unchanged.
> **Evidence role:** local development shadow pilot.

## Prespecification

The smallest available legal signal was the existing attempt lifecycle outcome. Three operationally
different `portfolio-18-tranche-v2` actions (CW perimeter beam, diverse objective beam, and
portal-first DFS) were run independently at half their v2 cap and at the full v2 cap on the first 12
levels of the already-fixed confirmation-001 population. A continuation benefit means half-cap
failed and full-cap solved. Odd/even population positions were fixed as train/test before results.

Success required lifecycle outcome to improve held-out Brier score beyond technique identity and
to separate continuation value in the same direction in both splits. The stop rule was no held-out
improvement, split instability, or no continuation-benefit events. Canonical `workSpent` bounded
both arms; no level identity enters a candidate policy.

## Result

All 36 half-cap risk rows reported `timed-out`; there were no naturally exhausted rows. Exactly one
full-cap rescue occurred (1/36, 2.8%), in the training split, and none occurred in test. Technique-only
and technique-plus-outcome held-out Brier scores were identical (`0.03125`). The lifecycle descriptor
therefore cannot discriminate these continuation decisions: the cap makes every observed first shot
look the same. The tested lifecycle-only form meets its stop condition.

This is not evidence that richer legal progress/frontier signals lack value. It establishes the
smaller result needed before adding them: existing lifecycle outcome alone does not earn a dynamic
A/B, and a future pilot must deliberately select action/level/tranche cells with an observable mix
of continuation benefits and telemetry states rather than merely enlarging this uniform sample.

Machine-readable rows: `reports/stress/portfolio/dynamic-tranche-value-pilot-001.json`.

## Reproduction

```bash
npm run solver:dynamic-tranche-value-pilot -- --limit=12 --out=reports/stress/portfolio/dynamic-tranche-value-pilot-001.json
```

The script fails on wall-censored cells rather than treating them as deterministic evidence. Its
new `collectAttemptTelemetry` input exposes already-existing attempt outcomes only for this shadow
path; default census/static-portfolio result size and execution are unchanged.
