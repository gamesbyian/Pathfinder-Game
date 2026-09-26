# WS2 repair-deadline node-cap: MS_CAP resolution and production promotion result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-26 — code trace of `disableExtraBudgetPasses`'s resolution path (`modules/solver/stage-budget-core.ts`'s `repairMultiplierOverride`, `modules/solver/orchestration.ts`'s `repairAdditiveBudgetMultiplier !== 0` gate) plus the full local validation suite, on top of the prior 180/180 solved-control regression confirmation and the 7-gain/0-loss matched-work nomination.
> **Decision:** **PROMOTED.** `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` 2,000,000 -> 21,000,000, `EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` 6,000,000 -> 38,000,000, `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` 1,200,000 -> 7,600,000 (`modules/solver/orchestration-early-repair.ts`). The blocking interaction reported in `reports/2026-09-26-ws2-repair-deadline-solved-control-confirmation-result-001.md` is resolved: it does not require a caller-differentiated cap or a re-scoped dose, because the interactive path already never runs this probe at all, independent of MS_CAP's value.
> **Remaining gate:** none. `WS2-REPAIR-DEADLINE-ALLOCATION` is closed positive at this dose.
> **Evidence role:** promotion (implementation) — resolves the sole gate the prior confirmation left open.
> **Research question:** `WS2-REPAIR-DEADLINE-ALLOCATION`
> **Production effect:** yes — the three constants above are now production defaults for every batch/research caller of `runEarlyRepairSearch`. No effect on either interactive caller (see below).

## Why the prior report's blocking concern does not apply

`reports/2026-09-26-ws2-repair-deadline-solved-control-confirmation-result-001.md` found that raising
the node-cap constants to their tested 21M/38M doses breaks the arithmetic invariant the existing
`EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` safety test relies on (the cap must cover the worst-case node
budget at a conservative 10,000-nodes/sec contended floor), and reasoned that fixing this "requires its
own reasoned decision" — either an unacceptable ~63-minute interactive stall, a new caller-differentiated
cap, or a smaller, separately-evidenced dose.

That framing assumed the interactive path can actually reach this wall-clock cap. Tracing the full
resolution path shows it cannot:

1. `modules/solver/orchestration.ts`'s probe call site gates on `repairAdditiveBudgetMultiplier !== 0`
   (line ~364): `if (repairConfigs.length > 0 && repairAdditiveBudgetMultiplier !== 0 && ...)`.
2. `repairAdditiveBudgetMultiplier` is resolved in `modules/solver/stage-budget-core.ts` as
   `repairMultiplierOverride = Number(opts.repairAdditiveBudgetMultiplierOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined))`.
3. Both of this app's interactive production callers of `solveLevel` —
   `modules/input/solver-controller.ts` (Play's "Find a Hint") and `modules/input/review-controller.ts`
   (Review's approval solve), confirmed as the *only* two production/interactive callers via
   `grep -rln "solveLevel(\|\.solve(" modules/input/ modules/ui/` — pass `disableExtraBudgetPasses: true`
   on every call.

So for both interactive callers, `repairAdditiveBudgetMultiplier` resolves to `0`, the call-site gate is
false, and `runEarlyRepairSearch` (and therefore `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP`) never runs at
all. This is unconditional on MS_CAP's value: raising it from 1,200,000ms to 7,600,000ms changes nothing
about interactive latency, because the interactive path was never exposed to it in the first place. The
only callers that can ever hit this trip-wire are batch/research callers (`portfolio-solve-sweep.mjs`
and friends: `--workers=4`, non-binding 24h wall deadline, no user waiting), which is exactly the
population this promotion's own evidence (the matched-work A/B and the 180/180 disjoint solved-control
confirmation) was measured against.

This resolves the prior report's gate without a caller-differentiated cap or a smaller re-scoped dose:
the full tested 21M/38M doses promote cleanly, with MS_CAP scaled proportionally to preserve the exact
safety margin the original 1,200,000ms/6,000,000-node pairing held (`7,600,000 / 38,000,000 * 10,000 =
2,000` nodes/sec headroom ratio, i.e. the cap still comfortably covers the new worst case at the same
conservative 10,000-nodes/sec contended floor with the same ~2x margin as before).

## What changed

`modules/solver/orchestration-early-repair.ts`:
- `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET`: 2,000,000 -> 21,000,000
- `EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET`: 6,000,000 -> 38,000,000
- `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP`: 1,200,000 -> 7,600,000

Header comments on all three updated to cite this promotion and explain the interactive-safety
mechanism precisely (rather than only asserting it). One stale literal reference (`6,000,000` in
`modules/solver/orchestration-contracts.ts`'s `nodeBudget` doc comment) updated to `38,000,000`.

`modules/solver/orchestration-early-repair.test.ts`: two hardcoded literals tied to the old doses fixed
to reference the (now-promoted) exported constants instead of duplicating their values, so they cannot
go stale again on a future re-calibration:
- the ordinary-tier probe scheduling test's `nodesExpanded === 2_000_000` assertion now reads
  `nodesExpanded === EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET`;
- the MS_CAP safety test's local `WORST_CASE_NODE_BUDGET` constant now reads
  `EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` directly instead of a hardcoded `6_000_000`, so the test's
  own arithmetic automatically re-derives against whatever the constant is at test time.

## Validation

- `npx vitest run modules/solver/`: 683 passed, 7 skipped (pre-existing deep-test-tier skips), 0 failed.
- `npm run check`: all parallel gates pass, including `check:solver-budget-boundaries`.
- `npm run build`: clean production build.
- `node scripts/run-bundled.mjs scripts/solver-bench.mjs --check`: 160/160 solved, no regressions vs.
  baseline (`solver-bench --check PASS`; a pre-existing shallow-clone staleness warning on the baseline
  commit is unrelated to this change and does not affect the pass/fail gate).

## What this does not authorize

- Does not reopen `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` (closed negative in the matched-work A/B
  this promotion's nomination evidence came from).
- Does not license re-deriving `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` by simple proportional scaling on a
  future node-budget change without re-checking whether the interactive-bypass mechanism this report
  relies on (`disableExtraBudgetPasses: true` on both interactive callers) still holds — if either
  caller is ever changed to stop setting that flag, MS_CAP's safety for the interactive path must be
  re-derived from scratch, not assumed.

## Artifacts

- `reports/2026-09-26-ws2-repair-deadline-solved-control-confirmation-result-001.md` — the regression-safety confirmation and the MS_CAP interaction this report resolves.
- `reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md` — the original 7-gain/0-loss nomination result.
- `reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md` — the originating design/preflight.
- `modules/solver/orchestration-early-repair.ts`, `modules/solver/orchestration-early-repair.test.ts`, `modules/solver/orchestration-contracts.ts` — the implementation and test changes.
