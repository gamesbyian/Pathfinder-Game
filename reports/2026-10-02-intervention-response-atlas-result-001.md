# Intervention-response residual atlas (premise-generation lane B)

> **Status:** active
> **Last evidence:** 2026-10-02 — retrospective atlas over 25 retained Corpus-2 capability runs (`data/stress/intervention-response-atlas-001.json`); prospective arms dispatched (GHA 37049775397 control, 37049784486 BC1-off, both current `main` 3d126d65).
> **Decision:** the lane is buildable from retained evidence after all: the 2026-10-01 feasibility audit missed `reports/stress/capability-runs/*/per-level-corpus2.json` (25 runs × 1,700 levels). Retrospectively, BC1's residual gains are **not** enriched among levels that other interventions solve, so this evidence shows no shared "soft residual" regime. The trajectory-fragility contrast for losses is suggestive (OR 3.8) but underpowered (4 losses). Predictions below were registered before the prospective runs finished.
> **Remaining gate:** once both runs are harvested, score predictions 3–4 with `--control=<BC1-off> --treatment=<control>` and predictions 1, 2, 5, 6 with `--control=<control> --treatment=<BC1-off>`. The second orientation prices the parked BC1-off dead-last retry.
> **Research question:** none
> **Premise refs:** `P113`, `P145`, `P181`, `P199`
> **Evidence role:** forensic
> **Selection:** prespecified (whole retained run set; BC1 random-300 seeded population)
> **Owner:** `docs/solver-optimization-workstreams.md`.

## Retained evidence the feasibility audit missed

Every canonical stress refresh persists `reports/stress/capability-runs/<run>/per-level-corpus2.json`, one row per level for the same 1,700 Corpus-2 levels. 25 such runs exist (2026-08 → 2026-09-24), seven of them flag ablations. Consecutive runs are natural interventions: a promotion, a fix or a flag lands between them. `scripts/stress/intervention-response-atlas.mjs` reads them together with the 2026-09-13 capability-memory signatures and the BC1 random-300 production A/B.

| Era | Runs | Behaviour between consecutive runs |
|---|---:|---|
| Volatile (before 32526927206) | 13 | large symmetric churn between shas (e.g. +79/−81, +90/−73); repair trajectories were seed/ordering sensitive |
| Stable (32526927206 → 35944989969) | 12 | repeat runs of one sha are outcome-identical (three 0/0 pairs); changes are mostly one-sided: +96, +54, +121, and **+35/−16** at the 2026-09-11 `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` fold |

Level history over all 24 transitions: 1,103 levels never flip, 356 flip once (a monotone gain), 241 flip two or more times. Of the 531 levels unsolved at the latest retained baseline (35944989969, 1,169/1,700), only **29 were ever solved** by any retained run. Historical solves are therefore not a reservoir of easy residual wins.

### Unrecovered stable-era regressions

Eight levels solved earlier in the stable era are unsolved at the latest retained baseline: `R00536 R02196 R02206 R02258 R02458 R03251 R03323` (all lost at the 09-11 MC-portal fold and solved in the five runs before it) and `R01761` (solved once). Four of the seven were cheap early-repair solves (1–14M work), so the loss is a trajectory change, not a capability that was removed. `R03251` and `R03323` were later solved by the WS2 repair-deadline treatment at raised caps (2026-09-25 matched-work A/B), so current `main` may already have recovered them. The fresh control settles it.

## Retrospective contrasts (BC1 random-300; all historical runs predate BC1)

| Contrast | Responders marked | Non-responders marked | OR | Fisher p |
|---|---:|---:|---:|---:|
| BC1 gains vs capability-signature nomination (pre-BC1 residual, n=98) | 3/23 | 8/75 | 1.26 | 0.72 |
| BC1 gains vs any historical flip (pre-BC1 residual) | 2/23 | 2/75 | 3.48 | 0.23 |
| BC1 losses vs historical ever-lost (pre-BC1 solved, n=202) | 2/4 | 41/198 | 3.83 | 0.20 |

Reading: BC1 reached residual levels that the portal-coarse, repair-turn-biased, intersection-harvest and objective-first signatures had not, at the same rate as un-nominated levels. On this population the residual does not split into a generic "responds to any intervention" regime and a hard core; each response looks capability-specific. The loss contrast fits the idea that the levels BC1 drops are trajectory-fragile, but n=4.

## Pre-registered predictions (written before either prospective run finished)

Arms: control = current `main` defaults (normal refresh, 37049775397); BC1-off = same sha with `disable_flags=STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE` (deterministic, 37049784486). The scorer's "treatment" is whichever run is passed as `--treatment`. Predictions 3–4 use BC1-on as treatment, so its gains and losses are BC1's own. Prediction 6 uses BC1-off as treatment, so its gains are the levels the retry would recover.

1. **Current capability:** control solves 1,265–1,335 / 1,700 (latest retained 1,169, plus BC1 ≈ +6.3 pp and WS2/CID ≈ +1.3 pp from the random-300 controls).
2. **BC1 exchange on the full corpus:** BC1-off loses 95–165 control solves and gains 10–40 control-unsolved levels (the random-300 rates of 23/300 and 4/300, scaled).
3. **R1 (no shared soft regime):** BC1's net gains over BC1-off, within the BC1-off residual, are not enriched for capability-signature nomination (Fisher p ≥ 0.05). A p < 0.05 enrichment refutes the retrospective null.
4. **R2 (trajectory fragility):** the levels only BC1-off solves are enriched among historically ever-lost levels (OR > 1, p < 0.05). If p ≥ 0.05, this evidence shows no historical fragility regime.
5. **Regressions:** at most 3 of the 8 unrecovered stable-era losses are solved by the control.
6. **BC1-off dead-last retry pricing (fixed `workSpent`):** treat the BC1-off arm's per-level `workSpent` on control-unsolved levels as the retry's exact additive cost (stable-era outcomes are deterministic per sha). Promotion is earned only if (a) recovered solves are ≥ 10 and (b) recovered solves per 10⁹ `workSpent` are at least the yield of the lowest-yield tail retry tier on the same control run, which is the work the retry would have to displace under a fixed per-level budget. Expected: about 23 recoveries for about 120×10⁹ work (~0.19/G), which is below every tail tier measured on 2026-09-24 (0.24–7.5/G). The predicted outcome is **do not promote**.

## What this does not establish

Historical outcomes are not level-blind and cannot route cold policy; every regime here is descriptive and can only nominate a premise. Transitions between shas bundle several changes, so a transition response is a bundle response, not one intervention's. Capability signatures were measured against older baselines.
