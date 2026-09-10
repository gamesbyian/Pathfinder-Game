# admissible-order-non-default-retry matched-work methodology: node headroom, not the work fraction, is the actual binding constraint at small scale

> **Status:** inconclusive
> **Last evidence:** 2026-09-10 — local single-level probes on `R02367` at commit `6931bc468ab26ac6a7367a5028452a3aafbfb5ba`, `--node-budget=50000000`, explicit `--work-budget=100000000`, non-strict, real (non-advisory) node budget, `--admissible-order-non-default-retry-budget-fraction` 1.0 vs 0.18
> **Decision:** the frozen queue gate ("a matched-work test with nonzero target-stage work") is still not satisfied by any tested configuration so far. This session's local probe gets real, nonzero target-stage participation and correctly-propagated, correctly-sized `allocatedWorkCeiling` values (100,000,000 control / 18,000,000 treatment) — a genuine improvement over confirmation-006's zero-participation result — but the attempt's actual outcome is still byte-identical between arms, because the tier's own stacked NODE ceiling, not its WORK ceiling, is what terminates the attempt in both arms
> **Remaining gate:** unchanged from `2026-09-10-admissible-order-confirmation-006-artifact-recovery.md` — a matched-work confirmation in which the target stage's *work* ceiling (not its node ceiling) is what actually binds, differently, in the two arms. This report narrows what that requires; it does not supply it
> **Evidence role:** forensic / methodology preparation — local single-level diagnostic only, no population-scale execution
> **Selection:** one level (`R02367`), reused from an earlier probe in this same investigation; not a frozen population

## Why this report exists

`2026-09-10-admissible-order-confirmation-006-artifact-recovery.md` established that confirmation-006's own dispatch (`node_budget_advisory_only=true` + `strict_total_work_budget=true`, `node_budget=750,000,000`) gave the target stage (`admissible-order-alternate-tiebreak-retry`) **zero** participation in both arms — `allocatedWorkCeiling: 0` / `workSpent: 0` / `nodesExpanded: 0` on all 256 target-stage attempt records — because the whole-solve strict work cap (`prep._strictWorkCap`, set once at solve start) was already exhausted by earlier ladder tiers before this very-late tier ever ran. The current queue (`docs/solver-optimization-workstreams.md`, item 2A.3) requires a matched-work test with nonzero target-stage work before production's `1.0` fraction can be reconsidered.

This session picked that gate back up as analysis-only preparation (per explicit instruction: determine methodology, do not spend broad compute). The obvious first fix — drop `strict_total_work_budget` and `node_budget_advisory_only`, use a real finite `--node-budget`, and supply an explicit, independently-sized `--work-budget` via the CLI/workflow input built for the six-seed confirmation (`solver-level-blind-targeted-sweep.yml`'s `work_budget` input, `scripts/level-blind-capability-sweep.mjs --work-budget=`) — was tested locally. It fixes the *participation* problem but exposes a **third**, distinct confound.

## Method

Single level `R02367` (chosen because an earlier probe in this same investigation thread already established it reaches this stage with real, non-starved participation under a real node budget). Two local runs via `scripts/level-blind-capability-sweep.mjs` (through `scripts/run-bundled.mjs`), differing only in `--admissible-order-non-default-retry-budget-fraction`:

```
--node-budget=50000000 --work-budget=100000000 --lifecycle-telemetry --workers=1
--admissible-order-non-default-retry-budget-fraction=1.0   (control)
--admissible-order-non-default-retry-budget-fraction=0.18  (treatment)
```

No `--strict-total-work-budget`, no advisory-only node budget — `--node-budget` is real and applies to the whole solve, same as every earlier tier.

## Result

Both arms: whole-solve `status=node-budget-reached`, `ok=false`, `workSpent≈311.5M`, `nodesExpanded≈192,500,020` (level does not solve either way, consistent with `2026-09-05-admissible-order-tiebreak-production-exposure-001.md`'s finding that only `tieBreak=none` ever wins a real production solve — this level's ladder never gets there).

Target-stage (`admissible-order-alternate-tiebreak-retry`) lifecycle, one attempt in each arm:

| | control (fraction=1.0) | treatment (fraction=0.18) |
|---|---:|---:|
| `allocatedWorkCeiling` | 100,000,000 | 18,000,000 |
| `allocatedNodeCeilings` | 12,499,809 | 12,499,809 |
| `allocatedBudgetMs` | 86,400,000 | 15,552,000 |
| `actualWork` / `workSpent` | 59,092,879 | 59,092,879 |
| `actualNodes` / `nodesExpanded` | 12,499,968 | 12,499,968 |
| `attempt.outcome` | `timed-out` | `timed-out` |

The fraction propagates correctly this time (unlike confirmation-006, `allocatedWorkCeiling` genuinely differs 100M vs 18M, and `allocatedBudgetMs` genuinely differs too), and the tier gets real, nonzero, identical-magnitude participation in both arms — a real fix of the confirmation-006 problem. But `workSpent` (59,092,879) **exceeds** the treatment's own `allocatedWorkCeiling` (18,000,000), and is byte-identical to control's, which has a >5x larger ceiling. The work ceiling never actually binds in either arm.

## Root cause

`allocatedNodeCeilings: [12,499,809]` is identical in both arms and matches `actualNodes` almost exactly (off by 159 — one node-check granularity). This is `nonDefaultRetryNodeCeiling - prep._metrics.nodesExpanded` at the moment this tier starts (`modules/solver/orchestration.ts:2497`, `remainingNodeBudget`), where `nonDefaultRetryNodeCeiling = nodeBudget + floor(nodeBudget * ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION)` = `50,000,000 + floor(50,000,000 * 0.5)` = `75,000,000` (`modules/solver/stage-budget.ts:503,1100-1103`). Since `allocatedNodeCeilings` came out to 12,499,809, the earlier ladder (main search, repair fallback, goal-attraction-disabled-retry, coarse-state-near-tie-retention-disabled-retry, connectivity-axis-exhausted retry, etc. — every tier that runs before this one) had already driven `nodesExpanded` to `75,000,000 - 12,499,809 = 62,500,191` — **more than the base `nodeBudget` itself** — before this tier's single attempt ever starts.

So this tier's own stacked NODE ceiling, not its WORK ceiling, is what actually terminates its attempt here, and that node ceiling is a residual leftover of everything upstream, not a function of this tier's own fraction at all. The `admissibleOrderNonDefaultRetryBudgetFractionOverride` CLI flag only scales the WORK axis (`scaledStageWorkBudget(workBudget, fraction, ...)`) and the wall-clock axis (`nonDefaultRetryTotalBudget = floor(timeBudgetMs * fraction)`) — it has no effect on `ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION`, which is a separate, already-production-validated constant (`stage-budget.ts:503`, promoted 2026-08-15, population-confirmed +45/0 at the time). Changing that reserve fraction as part of this confirmation would confound it against actual production behavior, so it is not a lever this confirmation should pull.

This is a **third, distinct** failure mode in this candidate's confirmation history, different from both:
- confirmation-001's raw node-cap-too-early problem, and
- confirmation-006's whole-solve strict-cap-exhausted-by-earlier-tiers problem (zero participation, `2026-09-10-admissible-order-confirmation-006-artifact-recovery.md`).

Here participation is real and the work axis is correctly wired, but the **node** axis (not the work axis under test) is what happens to bind, because `node_budget=50,000,000` is small enough that the whole ladder consumes more than one full `nodeBudget`'s worth of nodes before this last-resort tier's turn comes — leaving a small, fraction-independent node headroom that happens to be almost exactly what one attempt needs here (~12.5M nodes ≈ 59M work), for both arms.

## Why this is plausibly a small-scale artifact, not necessarily true at the confirmation's actual dispatch scale

Every population-scale dispatch of this candidate so far (`-004`, `-005`, `-006`) used `node_budget=750,000,000` — 15x this probe's local `50,000,000`. At that scale, the same tier's additive reserve is `0.5 * 750,000,000 = 375,000,000`, and if earlier tiers consume a similar *proportion* of the stacked ceiling (rather than a similar *absolute* amount), the absolute node headroom left for this tier at dispatch scale would be roughly 15x larger too — plausibly large enough that the node axis stops binding and the (correctly-sized) work axis could become the real differentiator instead. This is a plausible hypothesis, not verified evidence: it has not been checked at 750M scale, locally or otherwise, in this session.

## What would still be needed before a valid confirmation

1. Confirm (a cheap qualitative check, not necessarily a full local solve) whether node headroom for this tier scales the way hypothesized above at `node_budget=750,000,000`, or pick a `node_budget` scale where it demonstrably does not bind.
2. Re-derive the explicit `--work-budget` candidate at whatever `node_budget` scale is chosen, sized from real natural-need evidence (the existing `2026-09-03-admissible-order-profile-cost-probe-preflight.md` census — median 3.8-4.1M, mean 4.6-5.6M work when solving under an isolated 20M cap — plus this session's own failing-level natural-exhaustion figure, ~59M work at 50M node scale) so that `0.18 * work_budget` is genuinely below natural need (binds) while `1.0 * work_budget` stays comfortably above it (non-binding, production-equivalent).
3. Re-validate on at least one more representative level once both axes are sized, confirming the work ceiling — not the node ceiling — is what differs between arms before any population dispatch.

None of this was executed here: per the governing instruction for this queue item, this session performed diagnosis and methodology only and did not spend further local or population-scale compute past the single-level check above.

## What this does not establish

- Does not establish a validated node_budget/work_budget pair for the actual confirmation — only rules out the specific small-scale local pair tried here and explains precisely why it failed to differentiate.
- Does not revisit whether `ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION` (0.5, production-validated) itself needs adjustment — it should not be touched by this confirmation.
- Does not change production disposition: the fraction stays `1.0` pending a genuinely matched-work confirmation.
