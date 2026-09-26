# WS1 late-continuation single-stage confirmation result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-26 — the frozen one-shot workflow (`ws1-late-continuation-single-stage-confirmation.yml`), dispatched exactly once from merged main (run [36220112812](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36220112812), commit `d722e1ca28b02c50e0e09e886b5bc273a5e2c3db`), per `reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md`.
> **Decision:** **NEGATIVE.** All 160 fresh independent parents (seed `2026092591`, block `ws1-late-continuation-single-001`) solved for real (113/160), but the frozen legal-signal model found **zero nominated pre-winner boundaries across all 44 solved validation-split levels** — not merely below the `>=3` floor, but exactly zero, with `nominatedPreWinnerWork: 0` and `capturedPreWinnerWorkShare: null`. Per the plan's own precommitment, this is a genuine negative, not rescued by retuning.
> **Remaining gate:** none for this exact frozen model/protocol. Closes `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`'s fresh-acquisition confirmation line in this tested form.
> **Evidence role:** confirmation (the properly-powered single-stage replacement for the under-sized two-stage design)
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Production effect:** none. No production behavior changed; the frozen model was never live-consuming.

## Why this result is decisive, not another under-sizing artifact

The prior Stage A canary (n=24, `reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md`) found 0 nominated parents, but a same-day power analysis showed that outcome was consistent with pure bad luck: at n=24, `E[nominated] ≈ 1.24`, giving roughly an 81% chance of failing the `>=3` floor even if the historical mechanism transferred exactly. This session's replacement plan (`reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md`) sized `N=160` specifically so that outcome could not recur: `E[nominated] ≈ 8`, `P(X<3) ≈ 1.4%` under a Poisson approximation if the mechanism transfers at the historical 25% capture / 68.8% solve rate.

The observed result is not "below 3" — it is **zero nominated parents out of 44 solved validation-split levels**, with **zero total pre-winner work identified at all** (`preWinnerWork: 0`, before nomination filtering). At the historical rates this plan was sized against, observing 0/44 nominated when ~11 (44 × 25%) were expected has a probability far below the plan's own already-strict `1.4%` false-stop bound. This is a strong, well-powered negative, not a sampling artifact.

## What ran

Exactly the frozen one-shot workflow's own protocol, no deviation (two prior dispatch attempts on this exact commit range failed on pure infrastructure bugs before any scoring occurred — a manifest-seed-validation bug and a `saveHints` propagation bug, both fixed in `combine-solver-sweep-reports.mjs` and the workflow's own inline checks; see `reports/2026-09-25-ws1-precommitment-overlap-recovery-001.md` and this branch's CI-fix commits for that unrelated plumbing history):

1. Generated 160 fresh parents in-workflow: `research:generate-levels --method=random --count=160 --master-seed=2026092591 --id-prefix=U --block-id=ws1-late-continuation-single-001`.
2. Solved all 160 via `portfolio-solve-sweep.mjs --scheduler-mode=production --node-budget=50000000 --work-budget=67000000` (level-blind, no baseline/prime-winner/attempt-cache, `saveHints=false`), sharded 40 ways.
3. Scored with `apply-action-selection-legal-signal-model.mjs` against the unmodified frozen model (`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`).
4. Applied the preregistered verdict gates via `evaluate-ws1-late-continuation-confirmation.mjs`.

## Result

**113/160 solved** (real production search, not primed). Of the frozen model's fixed 70/30 development/validation split (a deterministic function of level ID), **44 of the 160 parents fell into the validation split and solved**.

| Criterion | Threshold | Observed | Pass |
|---|---|---:|:---:|
| Winner safety (endangered winners) | 0 | 0 | ✅ |
| Independent nominated-parent breadth | >= 3 | **0** | ❌ |
| Captured pre-winner work share | >= 5% | null (no pre-winner work to share) | ❌ |
| Parent concentration | no parent > 35% of nominated work | null (no nominated work) | ❌ |
| Same-stage majority | > 50% of nominated work is same-stage | null (no nominated work) | ❌ |

`preWinnerWork: 0` across all 44 solved validation levels — not one of them had *any* pre-winner boundary the model could even consider nominating, let alone one that cleared its signature-membership bar. The 449 censored + 179 exhausted + 37 start-state attempts recorded in `baselineByPriorOutcome` show real attempt activity; the model simply found nothing in it worth nominating.

## Interpretation

This is a clean, well-powered negative for the frozen 15-signature `prior-response+work+next-stage` model's fresh-population transfer. It does **not** overturn the retained-evidence result on its own historical population (`reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md`, 6.93-9.91% capture across three historical C2 regimes) — that population and this one are different samples, and the retained-evidence result stands as a description of that population. But it does mean: the historical capture rate does not transfer to a genuinely fresh, independent, current-production sample at the sizing this plan used, closing the question of whether this exact frozen model generalizes as a production-consumable signal.

## What this does not authorize

- Does not widen the frozen 15-signature model, change the development/validation split function, or retune thresholds in response to this outcome — the plan's own precommitment forbids rescuing a negative this way.
- Does not license a further fresh-population draw under this exact plan; any future attempt needs a new, separately reasoned acquisition plan, per the standing "no drawing again outside a new decision" discipline this question's `constrains` list already carries.
- Does not claim the underlying premise (late-continuation value exists in principle) is false — only that this specific frozen model, at this dose, does not transfer.
- Does not affect any other WS1/WS2 question.

## Artifacts

- GHA run: [36220112812](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36220112812).
- `reports/stress/experiment-evidence/36220112812__run-36220112812__attempt-1/` — full harvested evidence bundle (`combined.json` via `result.json`, `scoring.json`, `verdict.json`, `generation-manifest.json`, `shard-plan.json`).
- `reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md` — the plan this result answers.
- `reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md` — the historical-population result this confirmation attempt does not overturn.
