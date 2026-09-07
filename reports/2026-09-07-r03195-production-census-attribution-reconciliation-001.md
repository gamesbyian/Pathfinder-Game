# `R03195` production/census attribution reconciliation

> **Status:** concluded-positive
> **Last evidence:** 2026-09-07 — local provenance join of the frozen census dispatch, its declared production baseline, the immutable per-level production row, and the earlier lifecycle-attribution correction; no solver dispatch.
> **Decision:** close the last member of the 35-row production-solved/no-isolated-T1-winner cohort. `R03195` is not an unexplained current-envelope production rescue and supplies no selector evidence: the census copied `productionSolved` from historical baseline run `31918095910`, where a late `beam|intersectionHarvest|width=5000|diverseBeam=true` retry solved only after 110,780,231 cumulative `workSpent`.
> **Remaining gate:** none for this cohort. Reopen only if a future census and a comparably defined production run create a new discrepancy.
> **Evidence role:** forensic
> **Selection:** selected after the earlier 35-row audit reduced the open set to this single ID

## Question

The current WS1 queue carried one bounded residue: which production action solved `R03195` inside the production envelope, and why was that action absent from or unsuccessful in the isolated T1 census?

The premise mixed two different evidence contracts. This pass traced the label to its source rather than rerunning the solver.

## Evidence chain

1. `reports/stress/technique-census/33717910218/gha-source-run.json` records the census dispatch input `baseline=reports/stress/capability-runs/31918095910/summary.json`. The census did not derive `productionSolved` from a contemporaneous current-envelope run.
2. `scripts/combine-technique-census-shards.mjs` loads `plan.baselineFile`, builds solved-ID sets, and writes `wasSolvedByProduction` into `level-technique-coverage.json`. The `R03195` coverage row is therefore a frozen-baseline label, not fresh action attribution.
3. The immutable row in `reports/stress/capability-runs/31918095910/per-level-corpus2.json` records `R03195` as solved by `beam:intersectionHarvest@beam5000(diverse)` at 75,423,793 cumulative nodes and **110,780,231 cumulative work**, on attempt 18 after 17 failed attempts.
4. The same row is preserved in run `32459711208`, which `2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md` already used to correct the stale lifecycle reducer: `R03195` was a later diverse-beam retry win, not an admissible-order win or unexplained predecessor-state effect.
5. The T1 census tested isolated actions at a 50M node cap. Its 41 `R03195` cells all failed; this is consistent with a historical whole-ladder solve reached after 75.42M cumulative nodes / 110.78M work. It does not create a like-for-like current-envelope contradiction.

The previous follow-up noticed that the persisted solve exceeded the nominal 67M work budget, but treated that fact as a reason the attribution remained open. Once the census baseline identity is included, the opposite follows: exceeding that envelope explains why the historical solved label must not be read as evidence of a missing action within it.

## Result and queue consequence

The original cohort is fully reconciled:

- 25 rows were census/provenance coverage gaps;
- 7 rows used production retry/flag/bias contexts outside the compared isolated cells;
- `R02452` and `R02887` had ordinary native repair evidence predating the newer provenance marker;
- `R03195` is a frozen-baseline/work-envelope mismatch with a known late diverse-beam winner.

That accounts for all 35 rows. No candidate routing rule follows from `R03195`, and no local replay is warranted. WS1 should return to cross-evidence searches for simple legal descriptors that replicate across independent evidence rather than treating this selected singleton as a capability seam.

## Local reproduction

No solver compute or GitHub Actions was used. The conclusion was reproduced locally by parsing committed JSON:

```bash
node scripts/research-status-index.mjs --compact --query=R03195
node scripts/research-asset-query.mjs --query=R03195
node -e "const x=require('./reports/stress/technique-census/33717910218/level-technique-coverage.json').find(r=>r.levelId==='R03195'); console.log(x)"
node -e "const x=require('./reports/stress/capability-runs/31918095910/per-level-corpus2.json').rows.find(r=>r.id==='R03195'); console.log({ok:x.ok,winningConfig:x.winningConfig,nodesExpanded:x.nodesExpanded,workSpent:x.workSpent,attemptCount:x.attemptCount})"
```

The first two commands route prior evidence; the latter two print the exact frozen label and source outcome. Documentation validation is recorded in the PR.
