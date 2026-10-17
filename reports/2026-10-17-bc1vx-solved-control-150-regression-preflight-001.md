# BC1-VX solved-control 150 regression: frozen paired promotion gate

> **Status:** active
> **Last evidence:** 2026-10-16 — prior random-300 production A/B yielded 7 gains / 0 losses; independent-of-that-cohort disjoint cold-64 yielded 2 further gains / 0 losses, with all reported solves referee-valid and lower aggregate work.
> **Decision:** run the *already frozen* 150-ID solved-control regression population before any BC1-VX default change. This is an adversarial regression gate, not a random population prevalence estimate.
> **Remaining gate:** complete paired control/treatment at the exact same production budget, account for all 150 IDs, review every current-control loss, and reconcile default-OFF promotion disposition based on control capability and economics.
> **Research question:** `WS2-CUT-BALANCE-PROJECTION`
> **Evidence role:** development
> **Selection:** retained `data/stress/ws2-repair-deadline-solved-control-confirmation-150-ids.json` (frozen for previous solved-control validation well before this experiment). This cohort was selected from historic solved controls, not from BC1-VX gains or current results.
> **Population identity:** the entire exact 150-element retained list, joined to current `data/stress/stress-levels-random.json`; store source commit, corpus SHA256 and selected manifest. No exclusion or replacement if current control fails.
> **Inference scope:** regression of previously solved population, not unbiased unseen holdout or population solve-rate estimate.
> **Production effect:** none; `STRATEGY_BC1_VERTEX_VOLUME_PRUNE` remains default-OFF.

## Why this population

`docs/solver-optimization-workstreams.md` has demanded the BC1-VX solved-control regression since the first positive production A/B. The 150-ID cohort is the already-established solved-control set used for the earlier BC1 fresh-prune promotion regression (which detected the real `R02401` loss). It is a useful, previously frozen adversarial stress set, chosen without seeing the BC1-VX effect.

**Do not silently call all 150 current control successes.** Previous "solved" means historic, possibly a different source revision or budget contract. Every item gets a fresh **paired current-default control** under the exact treatment source. Only rows where current control actually solves enter the BC1-VX loss denominator. Report any historical-control failures explicitly, not as BC1-VX regressions.

## Fixed protocol

- Level-blind ordinary production scheduler, 50,000,000 nodes, base work budget 67,000,000, wall safety 86,400,000ms, additive retries retained (`strictTotalWorkBudget=false`), two workers per arm.
- Control: production defaults, no flags altered. Treatment: exactly `STRATEGY_BC1_VERTEX_VOLUME_PRUNE` enabled.
- Assign the 150 fixed ordered IDs round-robin to 15 shards of 10 IDs; each resolves IDs to current corpus positions. Each position token must independently carry `pos:`.
- Same source and corpus on both arms. Assert sample SHA, source commit, budgets, effective solver requests (BC1-VX boolean is the **only** intended change), 10 unique IDs, completeness, definite outcomes, and referee validity for all successes.
- Upload full per-arm solution paths/attempt records, both request projections, selected manifest and paired 10-row verdict. Run a strict 15-shard combiner to reject any missing/overlapping row or subset mismatch.
- No automatically updated Hint files or promotion action. The workflow is temporary and will be removed after the decision data are retained in repository reports.
- Use canonical `workSpent` for aggregate economics, and list **all** treatment-only losses and gains. Distinguish no-harm among *current* solved controls from an unqualified 150/150 claim.
- Source workflow may continue when this session ends; it is GitHub Actions computation, not asynchronous ChatGPT work.

## Prespecified decision

If any current-control success becomes a treatment failure, freeze that loss as a real regression and investigate its winning tier/trajectory before deciding production promotion. Do **not** auto-reject or auto-promote on a mechanical gain/loss count alone. Zero attributable losses and reasonable work cost would be a positive solved-control gate, but causal checks and the independent/generalization limitations of Corpus 2 remain separate.

Source from [prior solved-control regression](2026-09-30-bc1-fresh-prune-matched-budget-ab-result-001.md), [BC1-VX owner](2026-10-02-bc1-volume-consequence-result-001.md), and [disjoint positive result](2026-10-16-bc1vx-fresh-cold-solve-paired-screen-001.md).
