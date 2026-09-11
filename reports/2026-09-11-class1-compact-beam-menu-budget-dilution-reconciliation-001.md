# Class-1 compact beam menu vs. budget-dilution reconciliation 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — reconciliation of `2026-09-11-class1-missed-rescuer-menu-audit-001.md`'s compact-beam-menu nomination against `2026-08-28-highint-standard-ih-exposure-development.md` and `2026-08-28-highint-standard-ih-reserve-preserving-development.md` (both concluded-negative, main).
> **Decision:** do not implement the class-1 compact-beam-menu candidate as a naive append/insert under a strict work envelope. 17/25 (68%) of the still-current class-1 population (excluding `R02162`, now solved by the promoted `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`) resolves into exactly the two "very-high-intersection" `ATTEMPT_POLICY` rules (`attempts.ts`) where two independent 2026-08-28 development A/Bs already found that **any** new attempt addition dilutes an existing protected-suffix winner's usable work under a strict total-work envelope, regardless of append-last vs. reserve-preserving placement.
> **Remaining gate:** none for the naive form on this 17/25 subpopulation. A viable design needs either a non-strict/additive-tier work envelope (matching the just-promoted `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` precedent, not `strictTotalWorkBudget=true`) or restriction to the 8/25 subpopulation outside these two rules, with its own reserve-window headroom checked before dispatch.

## Why this reconciliation

The joint-obligation branch's reconciliation onto `main` cleared `2026-09-11-class1-missed-rescuer-menu-audit-001.md`'s stated blocker ("defer implementation while the active Claude joint-obligation branch modifies orchestration/pruning"), making its compact beam-menu candidate nominally ready to implement. Before spending any implementation/dispatch effort, this session's standing instruction to reconcile against latest evidence and not resurrect closed forms required checking whether that candidate overlaps a form already tested.

## Overlap found

The class-1 audit's nominated identity #3, `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain`, is **exactly** the action `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE` / `..._RESERVE_PRESERVING_EXPOSURE` already tested and closed negative in the same two `attempts.ts` rules (`when: f => isHighInt(f) && f.requiredIntersections >= POLICY.VERY_HIGH_REQINT[ && f.portals >= POLICY.PORTAL_DENSE_PAIRS]`):

- **Append-last form:** 120-level strict-67M development A/B, 0 gains / 1 loss (`R02965`) — the new action pushed the existing protected `beam:objectiveFirst@beam5000` winner outside `MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT`'s 5-slot suffix, cutting its attempt allocation from 6,465,587 to 5,412,314 work.
- **Reserve-preserving descendant:** selected 2-row mechanism replay, +1 (`R02440`) / -1 (`R02965` still regresses) — inserting the same action *before* the protected suffix instead of after it does not help: "a useful extra action is not free merely because suffix membership is preserved." The old winner's usable work still drops (6.797M → 6.327M on the rescue row), because the fixed strict work envelope divides among however many attempts exist regardless of position.

Both closures are general findings about *any* attempt addition to these two rules under a strict envelope, not narrowly about the one tested identity.

## Population impact

Re-running the class-1 audit's 26 ids against the current (post-promotion) residual — excluding `R02162`, now solved by `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` — and classifying each by `ATTEMPT_POLICY` rule membership:

| Subpopulation | Count | Risk |
|---|---:|---|
| Falls in one of the two very-high-intersection rules (`reqInt>=7` + `intersection-heavy`) | **17/25 (68%)** | Directly implicated by both closed forms; any new attempt addition here is expected to reproduce the same dilution mechanism absent a materially different envelope. |
| Falls in a different rule (must-cross-heavy, multi-portal, general, or lower-`reqInt` intersection-heavy) | 8/25 (32%) | Not directly tested by the closed forms; reserve-window headroom is unverified and would need checking before any dispatch. |

Nomination #1 (`beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets`, the dominant identity covering 10/26 in the original audit) is a technically different action from the closed form (mechanic-bucket retention, WIDE not STANDARD width) and is not currently reached by the very-high-intersection rules' `mcDiverseThread(f)` gate for most of these levels (their `mustCross` is mostly 0, below `POLICY.HIGHINT_MC_DIVERSE`). It is therefore a genuinely untested candidate — but the *general* dilution mechanism the two closed reports establish (any addition to a rule whose protected suffix is already full costs the existing winner usable work under a strict envelope) is not identity-specific, so this candidate should not be assumed safe merely because the specific action differs.

## Disposition

- Do not implement the class-1 compact beam-menu candidate as a naive append/insert under `strictTotalWorkBudget=true` on the 17/25 very-high-intersection subpopulation. This is a closed-mechanism resurrection, not a new premise.
- A materially different premise that could still be worth testing: dispatch under non-strict/additive-tier work semantics (`strict_total_work_budget=false`, matching `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s own promoted precedent) rather than the strict envelope the closed forms used — this changes the resource-contention contract the dilution mechanism depends on and has not itself been tested for this rule family.
- The 8/25 subpopulation outside the two implicated rules remains a smaller, untested candidate; check each of its rules' current config-list length against `MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT` (5) for headroom before any dispatch.
- Updates `docs/solver-optimization-workstreams.md` (WS1 row) and `docs/solver-future-work.md` to route future class-1 beam-menu work through this reconciliation rather than the original audit's recommended recipe in isolation.
