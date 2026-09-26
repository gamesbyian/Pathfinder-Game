# WS2 repair-deadline node-cap: disjoint solved-control confirmation result 001

> **Status:** active
> **Last evidence:** 2026-09-26 — 150-level disjoint solved-control A/B (control [36204016375](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204016375), treatment [36204019865](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204019865)) from `reports/2026-09-25-ws2-repair-deadline-promotion-completion-design-001.md`, solver ref `b9ef07707062094064c0456e4d7ade7daccb0b87`.
> **Decision:** **regression-safety leg of the promotion contract is now closed clean.** Treatment solved 150/150, byte-identical to control's 150/150, all referee-valid. Combined with the original 30-id solved-control tranche (also 0 losses), this is **180/180 combined independent solved-control observations with zero losses**, ruling out a true regression rate at or above ~1.66% at ~95% confidence (as sized in the originating design). Economics/concentration were already closed clean in `reports/2026-09-25-ws2-repair-deadline-promotion-completion-design-001.md`.
> **Remaining gate:** **NOT promotion-ready yet** — this result run surfaced a real, previously-unaddressed interaction between the proposed node-cap increase and `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` (the per-attempt wall-clock trip-wire) that must be resolved with its own reasoned analysis before flipping `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET`/`EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` as production constants. See "What blocks promotion" below.
> **Evidence role:** confirmation (regression-safety leg only)
> **Research question:** `WS2-REPAIR-DEADLINE-ALLOCATION`
> **Production effect:** none. No production default changed by this report.

## Result

| Arm | Run | Observed | Solved | Referee-invalid |
|---|---|---:|---:|---:|
| Control | [36204016375](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204016375) | 150/150 | 150 | 0 |
| Treatment | [36204019865](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204019865) | 150/150 | 150 | 0 |

Byte-identical solved sets (both 150/150 — every level in this disjoint sample remains solved under `earlyRepairSearchOrdinaryNodeBudgetOverride=21000000,earlyRepairSearchBiasedNodeBudgetOverride=38000000`, matching control exactly). Zero regressions, zero referee-invalid rows in either arm.

Combined with the original frozen-population solved-control tranche (30 ids, also 0 regressions), this treatment has now shown **0 losses across 180 independent solved-control observations** — comfortably clearing the design's own `~1.7%`-regression-rate confidence target and the preflight's original "target is zero losses" bar.

## What blocks promotion: `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` was never re-examined against the raised caps

While preparing to flip `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` (2,000,000 -> 21,000,000) and
`EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` (6,000,000 -> 38,000,000) as production constants, a
pre-existing regression test (`orchestration-early-repair.test.ts`, `'EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP
survives real contention, not just an idle host'`) revealed a real interaction nobody in this line of
work (the original 2026-09-20 reconnaissance, the node-cap seam preflight, or the nomination A/B) had
checked:

`EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` is a **1,200,000ms (20-minute) per-attempt wall-clock trip-wire**
passed alongside the node budget to `runAttempt` — whichever limit binds first wins. It exists
specifically because a 2026-08-12 incident found 4-way CPU contention on a 4-core host (`--workers=4`,
not even oversubscribed) can drop real throughput to **37,000-43,000 nodes/sec**, well under naive
assumptions, silently truncating an attempt below its intended node budget and changing solve outcomes
purely as a function of host load. The existing test encodes a *conservative* floor of
**10,000 nodes/sec** (below even that measured worst case, for margin) and asserts the MS_CAP comfortably
covers the then-current worst-case node budget (6,000,000, the biased tier) at that floor:
`6,000,000 / 10,000 * 1000 = 600,000ms`, safely under the 1,200,000ms cap.

At the proposed raised caps, the same arithmetic no longer holds:

| Tier | Old cap | New (tested) cap | Minimum safe MS_CAP at 10,000 nodes/sec | Current MS_CAP |
|---|---:|---:|---:|---:|
| Ordinary | 2,000,000 | 21,000,000 | 2,100,000ms (35 min) | 1,200,000ms (20 min) |
| Biased | 6,000,000 | 38,000,000 | 3,800,000ms (63 min) | 1,200,000ms (20 min) |

**Both raised caps exceed what the current 20-minute wall-clock trip-wire can safely cover under the
same conservative contention floor the existing safety test itself uses.** If the ordinary/biased
node caps were promoted unchanged, a genuinely contended host (not a hypothetical — this is the exact
scenario the 2026-08-12 incident measured) could truncate an early-repair-search attempt at the
20-minute wall-clock mark, well short of its intended 21M/38M node budget — silently reintroducing
the exact bug class `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` exists to prevent, just at a higher node
threshold. This did not manifest in this session's GHA evidence (all dispatches ran under ordinary,
not worst-case, runner load — individual shard times stayed well under the current cap), so the
existing positive results are not invalidated; the risk is specifically for production/interactive
use under real contention, which this batch-research protocol's generous non-binding wall-clock
budget never exercises.

### Why this is not addressed here

Fixing it requires its own reasoned decision, not a mechanical constant bump:

- Scaling `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` proportionally to preserve the same safety margin
  (e.g., to ~3,800,000ms for the biased tier) makes a single repair attempt able to stall for over an
  hour under contention — likely unacceptable for the **interactive** production path (a real player's
  hint/solve request), even though it may be entirely fine for the **batch research** path (non-binding
  24h wall deadline, workers=4, no user waiting).
- The two paths currently share one constant. A caller-differentiated cap (interactive vs. batch) is
  a real design option but is new scope beyond this question's own tested seam.
- Accepting the current MS_CAP unchanged and simply not promoting the full tested doses (e.g.
  promoting a smaller node-cap increase that stays under the existing MS_CAP's safe envelope at the
  conservative floor — arithmetically, roughly up to ~12,000,000 nodes total) would be safe but is a
  **different, untested treatment dose** from the one this A/B and its regression confirmation
  actually measured (21M/38M) — it would need its own matched-work evidence, not a re-use of this
  result.

## What this result does authorize

- Closes the regression-safety leg of the promotion contract definitively: 180/180 zero losses,
  economics and concentration already closed in the prior report. If the MS_CAP interaction above is
  separately resolved (or the interactive/batch paths are differentiated), no further population-scale
  regression evidence should be needed before promoting the tested 21M/38M doses specifically.
- Does not authorize flipping `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` /
  `EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` as production constants yet.
- Does not reopen the closed-negative broad 4x work-ladder economics question, and does not merge this
  question with `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`.

## Next gate

Resolve the `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` interaction with its own reasoned design (proportional
scale-up with an explicit interactive-UX tradeoff analysis, a caller-differentiated cap, or a
re-scoped smaller dose with new matched-work evidence), then promote. This is now the sole remaining
gate for `WS2-REPAIR-DEADLINE-ALLOCATION`.

## Artifacts

- GHA runs: [36204016375](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204016375) (control), [36204019865](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204019865) (treatment).
- `modules/solver/orchestration-early-repair.test.ts` — the pre-existing safety test that surfaced this interaction (`'EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP survives real contention, not just an idle host'`), unchanged.
- `reports/2026-09-25-ws2-repair-deadline-promotion-completion-design-001.md` — the design this result answers (economics/concentration closure, population design).
- `reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md` — the original nomination result.
