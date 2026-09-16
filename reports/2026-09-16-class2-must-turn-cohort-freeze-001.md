# Class-2 must-turn-biased late-repair: 60-row cohort freeze 001

> **Status:** active
> **Last evidence:** 2026-09-16 — deterministic materialization from current-code control-side eligibility (`reports/stress/solver-corpus2-latest.json`, run `35043165547` @ `4421bd8`)
> **Decision:** freeze the 60-row participant-aware cohort before any treatment outcome exists. No A/B has run yet.
> **Remaining gate:** run matched control/treatment at the frozen 7M `late-repair-must-turn-biased-retry` dose on exactly these 60 rows and analyze with `ws2-experiment-readiness.mjs class2-analyze`.
> **Evidence role:** preregistered population freeze per `reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md`'s Class-2 section.

## Why this ran

`docs/solver-optimization-workstreams.md`'s WS2 gate 2 requires materializing/freezing the 60-row participant-aware Class-2 cohort (40 control-unsolved gain rows + 20 control-downstream-solved collateral rows, excluding the `R02768`/`R02180` development pair) before running the matched 7M economics A/B. This session dispatched the routine `solver-stress-refresh.yml` control refresh (run `35043165547`) specifically to get current-code `class2ControlEligibility` (added in #1804, absent from the prior `34683011115` boundary run) across all of Corpus 2.

## Population

`materializeClass2Cohort` (`scripts/ws2-experiment-readiness-lib.mjs`) filtered `reports/stress/solver-corpus2-latest.json`'s 1,700 rows to those with `class2ControlEligibility.hasMustTurn && .childStructuralEligible && .childInsertionPointReached` (structural must-turn eligibility) and genuine nonzero `late-repair-search` participation, excluding the two development rows. That yielded **151 structurally eligible rows** system-wide. Ranking eligible rows by `stableHash([seed, selectionVersion, id])` and splitting into gain (`ok !== true`, excluding `R03049` from gain accounting per the preflight) and collateral (`ok === true` via a stage strictly after `late-repair-search`) strata:

- Only **17** eligible collateral rows exist (fewer than the nominal 20), so per the preflight's explicit fallback ("all available collateral rows with unused slots transferred to gain"), the shortfall moved to the gain stratum.
- Final cohort: **43 gain + 17 collateral = 60 rows**, ranked-deterministic, IDs frozen in `data/stress/ws2-class2-frozen-cohort-001-ids.txt` and the full manifest (provenance + `populationHash`/`freezeIdentityHash`) in `data/stress/ws2-class2-frozen-cohort-001.json`.

## Frozen provenance (declared before any outcome is inspected)

- `seed`: `ws2-class2-freeze-2026-09-16`; `selectionVersion`: `v1`
- `corpusHash`: sha256 of `data/stress/stress-levels-random.json`; `baseSha`: `873b792d8f6353fbaa99d3d3e7918e5be2368ef0`
- `envelope`: `{nodeBudget: 50000000, workBudget: 67000000, budgetMs: 86400000, strictTotalWorkBudget: false}`, `schedulerMode: production`, `workerConfig: {workers: 4}`
- `controlConfig`: no extra flags. `treatmentConfig`: `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` only. `controlConfigHash`/`treatmentConfigHash` are `stableHash` digests of those two declared config objects (frozen now, independent of any run's own internal hashing scheme) — the actual A/B execution will stamp each row's `configHash` from these same frozen values, verified against which flags that arm's dispatch actually resolved.
- `stageOrder`: the canonical `SOLVER_STAGE_IDS` array.

## Next gate

Dispatch `solver-level-blind-targeted-sweep.yml` twice against `ids_file=data/stress/ws2-class2-frozen-cohort-001-ids.txt` at the frozen envelope: control with no extra flags, treatment with `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY`. Stamp `configHash` on the combined rows from the frozen `controlConfigHash`/`treatmentConfigHash` above (verified against the arms' actual resolved `enable_flags`), then run `ws2-experiment-readiness.mjs class2-analyze` against the frozen manifest. Per the preflight: advance only with at least one new referee-valid target-stage solve, zero credible losses, no material downstream starvation, valid participation (>=75% of both strata), symmetric censoring, and clean incremental-cost accounting.
