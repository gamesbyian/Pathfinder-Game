# At the specific-config level, "main-ladder" is 26 different techniques, none dominant

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `winningConfig` (the exact action key, not just stage) across all 1,073 solved levels in `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json`, no new dispatch
> **Decision:** `2026-09-05-production-win-share-concentration-001.md` found the `main-ladder` *stage* wins 62.6% of all solves. At the specific-config level, that 62.6% is spread across many different techniques: the single largest config (`repair|score=repair|guidance=standard`) wins only 20.9%, and it takes 6 configs to reach 72.1% cumulative share. 26 distinct configs win at least one solve. Concentration risk is much lower than the stage-level view suggests — no single specific technique dominates production the way the aggregated `main-ladder` figure implies.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — refines the stage-level concentration finding at finer grain, using a richer per-level dataset (`per-level-corpus{1,2}.json`) not otherwise mined this session
> **Selection:** whole solved population (1,073 levels), not a sample

## Method

`per-level-corpus{1,2}.json` records each solved level's exact `winningConfig` (e.g. `repair|score=repair|guidance=standard`), a finer identity than `lifecycle-failure-map`'s `winningTechnique` (stage only, e.g. `main-ladder`). Tabulated `winningConfig` across every solved level.

## Result

| specific config | wins | share | cumulative |
|---|---:|---:|---:|
| `repair\|score=repair\|guidance=standard` | 224 | 20.9% | 20.9% |
| `beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain` | 170 | 15.8% | 36.7% |
| `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` | 121 | 11.3% | 48.0% |
| `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain` | 93 | 8.7% | 56.7% |
| `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain` | 90 | 8.4% | 65.1% |
| `beam\|score=perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain` | 76 | 7.1% | 72.1% |
| ... (20 more configs) | | | 100% |

26 distinct configs win at least one solve; the top 6 (all listed above) reach 72.1%, versus the stage-level top-3 reaching 85.0%.

## Interpretation

The two findings are not in tension — they answer different questions. At the stage level, `main-ladder` really is 62.6% of solve volume, and a regression to the *stage itself* (e.g. its scheduling, gate logic, or shared infrastructure) would be as catastrophic as that number suggests. But at the config level, that volume is distributed across at least 26 different scoring-profile/bias/width/retention combinations, none exceeding 21% individually — so a regression in any *one specific* technique's tuning would cost far less than the stage-level share implies. This nuances the risk picture from the win-share-concentration report: `main-ladder`'s risk is concentrated at the *architectural* level (the stage's existence and scheduling) but diffuse at the *specific-technique* level.

## What this does not establish

- Does not test what would happen if a specific config were actually removed (only characterizes current win distribution).
- `winningConfig` reflects which config's attempt is recorded as the solve; ties or near-simultaneous solves by multiple configs are not distinguished here.
- Single production run, both corpora combined; see the companion per-corpus breakdown in `2026-09-05-main-ladder-config-concentration-by-corpus-001.md`.
