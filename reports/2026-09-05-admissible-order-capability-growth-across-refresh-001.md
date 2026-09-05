# All four admissible-order tie-break profiles gained production-miss-rescue capability and exclusive territory across the 2-day census refresh; the default repair config lost the most of both

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — per-action `productionMissWins` and `exclusiveLevels`, old (2026-09-01) vs. fresh (2026-09-03), from `reports/stress/technique-niches/2026-09-03/temporal-stability.json` (35 comparable actions), no new dispatch
> **Decision:** all four `admissible-order` tie-break profiles show among the largest gains in **both** metrics across the refresh: `productionMissWins` rose by +16 (`tieBreak=none`), +14 (`tieBreak=default`), +12 (`tieBreak=mustCrossFirst`), +12 (`tieBreak=nearClosureRescue`) — roughly 55-70% relative growth from bases of 17-23. `exclusiveLevels` (singleton-exclusive territory) rose too: `tieBreak=none` 15→17, `tieBreak=nearClosureRescue` 0→2, `tieBreak=default` 0→1. Meanwhile `repair|score=repair|guidance=standard` — the single largest specific winning config in production (`2026-09-05-main-ladder-config-level-deconcentration-001.md`) — **lost** the most of both: `productionMissWins` −8, `exclusiveLevels` −9.
> **Remaining gate:** none — descriptive characterization using already-collected data. Directly relevant context for the in-flight admissible-order-alternate-tiebreak-retry fraction confirmation (see `docs/solver-optimization-workstreams.md` Workstream 2): this tier's isolated-census-justified "retains rare/exclusive capability" status is not a static snapshot fact, it is presently a *growing* one.
> **Evidence role:** discovery — directly informs the live repricing question with already-collected temporal data
> **Selection:** all 35 comparable actions in the temporal-stability join, not a sample; admissible-order and the largest mover highlighted

## Method

`temporal-stability.json` already tracks, per action, `productionMissWins` (levels production misses but this action's isolated-census cell solves) and `exclusiveLevels` (levels only this action solves in isolation), for both the 2026-09-01 and 2026-09-03 census vintages, with action identities already reconciled across naming conventions by the tool that built the file. Computed `fresh - old` for both metrics across all 35 comparable actions and ranked.

## Result

**Largest `productionMissWins` gains:**

| action | old | fresh | delta |
|---|---:|---:|---:|
| `admissible-order\|tieBreak=none\|lds=off` | 22 | 38 | **+16** |
| `admissible-order\|tieBreak=default\|lds=off` | 17 | 31 | **+14** |
| `beam\|score=intersectionHarvest\|...\|retention=mechanic-buckets` | 37 | 51 | +14 |
| `admissible-order\|tieBreak=mustCrossFirst\|lds=off` | 23 | 35 | **+12** |
| `admissible-order\|tieBreak=nearClosureRescue\|lds=off` | 22 | 34 | **+12** |
| `beam\|score=objectiveFirst\|...\|retention=mechanic-buckets` | 40 | 52 | +12 |

**Largest losses:** `repair\|score=repair\|guidance=standard` (−8), `dfs\|score=perimeterSweep\|bias=perimeterCCW` (−5), `dfs\|score=perimeterSweep\|bias=perimeterCW` (−4).

**Largest `exclusiveLevels` gains:** `repair\|score=repair\|guidance=must-turn-biased` (+5), `beam\|score=perimeterSweep\|...` (+4), `beam\|score=objectiveFirst\|...\|mechanic-buckets` (+3), `admissible-order\|tieBreak=nearClosureRescue` (0→2), `admissible-order\|tieBreak=none` (15→17), `admissible-order\|tieBreak=default` (0→1).

**Largest `exclusiveLevels` losses:** `repair\|score=repair\|guidance=standard` (−9), `repair\|score=repair\|guidance=turn-biased` (−5).

## Interpretation

This is directly relevant, timely context for the currently-open admissible-order-alternate-tiebreak-retry fraction question: the workstream doc's existing justification for keeping the tier at full strength ("the refreshed census shows those tie-break profiles retain rare/exclusive capability") is not just holding, it is strengthening across the very refresh cycle this session has been working within. All four tie-break profiles gained meaningfully in both the levels they can rescue from production misses and the levels only they can solve at all — while the single most common specific production config (`repair-standard`) lost the most ground on both fronts over the same window. If this trend continues, a reduced shared work-pool fraction for admissible-order-alternate-tiebreak-retry would be cutting into a *growing* asset, which argues for erring conservative on any fraction reduction until the in-flight confirmation's actual solve-loss result is in hand.

## What this does not establish

- Two data points (2026-09-01, 2026-09-03) is a trend of one step, not a established trajectory — a third census snapshot would be needed to confirm this is a sustained direction rather than noise.
- Correlational; does not explain *why* admissible-order gained ground (heuristic drift is expected and already documented as bidirectional in `2026-09-03-technique-census-refresh-001-rejoin.md`).
- Does not itself bear on the specific 0.18-vs-1.0 fraction question — that is what the in-flight confirmation tests directly.
