# H3 remaining-length allocation-value: independent-transfer result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — full precommitted pipeline executed on the frozen 239-row disjoint population per `reports/2026-09-19-h3-independent-transfer-preflight-001.md`.
> **Decision:** the allocation-value effect **transfers**. Ascending-remaining-length ordering clears 83.3% (10/12) of achievable rescues at 20% of the shared full-cap-for-all-rows budget on this independent, disjoint 175-row cohort, well above the preflight's 50%-at-20% confirmation bar. This clears the "one prespecified independent shared-budget transfer" `docs/solver-optimization-workstreams.md` required before H3 can open a WS1 gate. Descending-length order solves 0 rows below 50% of the shared budget on every tier tested, a stark contrast.
> **Remaining gate:** transfer confirmed nominates, but does not itself authorize, the smallest production consumer: a bounded, matched-work pilot ordering near-miss completion-search candidates by ascending remaining length within a fixed shared budget. That pilot is not designed or run here and needs its own precommitment.
> **Evidence role:** independent-transfer confirmation per the preflight's frozen decision rule; not itself a production change or a WS1 gate opening.
> **Research question:** H3 remaining-length allocation-value / WS1 selector-gate transfer requirement.
> **Population identity:** 239-row remainder of `reports/2026-09-16-card-e-sizing-and-state-selection-001.md`'s 439-row eligible pool (never drawn by that report's own 200-row Card-E cohort), seed `h3-independent-transfer-2026-09-19`. Phenotype-screen cohort (per Card-E's own predicate: `solved===false && lossCause==='score-width-culled'`): 175/239 (73.2%), matching the original report's ~78% conversion rate.

## Pipeline, run exactly as precommitted, no parameter changes

1. **Phenotype screen:** `collect-known-solution-prefix-survival.mjs --beam-width=2000 --node-budget=3000000` on all 239 rows. Cohort count inspected before any further step, per the preflight's staged-cost discipline: 175/239 qualify.
2. **Natural exposure census** (context only): `census-repair-rollback-windows.mjs --node-budget=30000` and `--node-budget=300000` on the 175-row cohort. Replicates the original finding: natural exposure is essentially absent (median rollback fraction of required length 0.87 at 300k dose, consistent with the original ~0.17-0.19 common-prefix/cull-depth ratio).
3. **Seeded operator reachability:** built a synthetic retreat-file (`{elite:{levelId,path,eliteLength}, low:finalSupportLoss.depth, high:low+1}`, identical construction to Card-E's own, verified against a real Card-E entry field-for-field before use), then ran `repair-plateau-rollout-classifier.mjs --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000` on all 175 rows using the real `searchCompletionFromPartialPath` operator.

## Reachability result

**12/175 (6.9%) reconstructable** via `searchCompletionFromPartialPath` within the 2,000,000-node close-gap cap — every claimed solve independently verified by both canonical referee (`Solver.validateCandidatePath`) and a fresh from-scratch replay (`isSolutionState`), matching Card-E's own dual-verification standard. Reconstructable ids and cost: R00367 (129,841 nodes), R01154 (18,521), R03125 (26,012), R03348 (34,737), R02392 (45,029), R02281 (287,778), R03308 (475,098), R02187 (927,395), R02661 (1,215,416), R02419 (1,463,906), R00417 (1,503,148), R02118 (1,506,719).

163/175 rollouts and completions failed to close the residual gap within budget (0/2000 rollout-trial solves and close-gap exhaustion at the full 2,000,000-node cap for each) — consistent with the earlier Lane G real-frontier finding that this kind of gap-closing is genuinely expensive, not merely underdosed at modest scale.

**Note on the two lowest-cost solves (R03308, R03348):** both levels are drawn from Card-E's eligible pool, whose membership predicate requires a referee-valid stored hint already present (i.e., some technique already knows these levels are solvable; the production ladder simply doesn't currently reach that route). This reachability step finding a *second*, repair-completion-based route to a referee-valid solution on these two rows is useful corroborating evidence for the operator's soundness, but is **not a newly-discovered cold solve** — both levels already had known accepted solutions before this pipeline ran. No previously-fully-unknown level was solved by this pipeline.

## Four-order allocation simulation

Zero new solver compute: `h3-length-allocation-value-simulation.mjs`'s existing deterministic-replay simulation over the recorded `{reachNodes, remainingLength}` pairs above, unmodified (`reconstructableCount=12`, `perRowCap=2,000,000`, matching Card-E's own cap).

| Budget fraction | Total budget (nodes) | Ascending-length | Descending-length | Dataset order | Random mean (of 50 trials) | Oracle max |
|---:|---:|---:|---:|---:|---:|---:|
| 2% | 7,000,000 | 2 | 0 | 2 | 0.18 | 11 |
| 5% | 17,500,000 | 7 | 0 | 2 | 0.56 | 12 |
| 10% | 35,000,000 | 7 | 0 | 2 | 1.16 | 12 |
| **20%** | **70,000,000** | **10** | **0** | 3 | 2.44 | 12 |
| 35% | 122,500,000 | 12 | 0 | 5 | 4.38 | 12 |
| 50% | 175,000,000 | 12 | 0 | 8 | 6.48 | 12 |
| 100% | 350,000,000 | 12 | 12 | 12 | 12.0 | 12 |

At the preflight's primary checkpoint (20% budget): ascending-length order solves **10/12 = 83.3%** of achievable rescues, versus a random-order mean of 2.44/12 (20.3%) — **~4.1x random**, and versus descending-length order's **0/12**. At 5% budget ascending-length already clears 7/12 = 58.3%, already above the 50% bar four budget tiers early. Descending-length order is not merely worse than ascending — it solves **zero** rows at every tested budget below 100% (the full shared pool), the same qualitative "wrong order actively starves" pattern the original Card-E report found.

## Decision-rule application

Per the preflight's frozen rule (`reports/2026-09-19-h3-independent-transfer-preflight-001.md`, "Decision rule"):

> Ascending-length order clears >=50% of achievable rescues at <=20% of full-cap-for-all budget (the original found 94% at 20%): confirms the allocation-value effect transfers across population.

**83.3% at 20% budget clears this bar.** The original Card-E population found 94% at 20%; this independent, disjoint 175-row population finds 83.3% — directionally consistent, somewhat weaker in magnitude but comfortably above the confirmation threshold, not merely "directionally dominant." This is a **population transfer**, not a technique transfer (only `searchCompletionFromPartialPath` was used, per the preflight's explicit scope).

## What this earns

- H3's allocation-value claim survives its first required independent transfer. Per `docs/solver-optimization-workstreams.md`'s WS1 entry ("H3 remaining-length ordering is a one-population nomination only; one prespecified independent shared-budget transfer is required before a WS1 gate"), this transfer is now complete.
- This nominates, but does **not** itself authorize, a bounded production consumer pilot: ordering near-miss completion-search candidates by ascending remaining length within one fixed shared node budget, matched-work against an unordered/current-routing control. That pilot needs its own precommitment (population, budget grid, matched-work accounting, solved/regression tracking) before any dispatch.
- Does **not** vary technique, open a WS1 selector gate directly, or authorize production deployment of length-first ordering under any outcome.
- Does **not** claim a new cold solve; the two low-cost reachability solves are corroborating-route evidence on already-hint-known levels, not new capability.

## Artifacts

- `reports/stress/h3-independent-transfer-population-001.json` — verified 239-row disjoint population, exact match to the preflight's 439-eligible-minus-200-drawn contract
- `reports/stress/h3-independent-transfer-phenotype-screen-001.json` — 239-row phenotype screen (175/239 cohort)
- `scripts/stress/h3-independent-transfer-build-retreat-file.mjs` — retreat-file builder (verified field-for-field against a real Card-E entry)
- `reports/stress/h3-independent-transfer-retreat-file-001.json` — 175-row synthetic retreat file
- `reports/stress/h3-independent-transfer-census-30k-001.json`, `-300k-001.json` — natural-exposure census, context only
- `reports/stress/h3-independent-transfer-reachability-001.json` — full seeded-operator reachability result, dual-verified
- `reports/stress/h3-independent-transfer-cross-tab-001.json`, `-h3-features-001.json` — derived simulation inputs (reachNodes/reconstructable and lengthRemaining per row, built from the reachability result)
- `reports/stress/h3-independent-transfer-simulation-001.json` — full four-order simulation output
