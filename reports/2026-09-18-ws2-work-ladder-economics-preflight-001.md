# WS2 work-ladder economics: intermediate-tier preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — the intermediate 600M shape check concluded threshold-shaped; the successor 4x-only matched-work costing has since completed and closed `WS2-WORK-LADDER-ECONOMICS` negative in `reports/2026-09-19-ws2-work-ladder-4x-only-matched-work-costing-result-001.md`.
> **Decision:** the response is threshold-shaped, concentrated at/near 1.2B, not smooth across 300M-1.2B (decision rule branch 1, precommitted before this dispatch). This weakens the economics case for a cheap intermediate budget increase: a production change would need to commit to the full 4x escalation to see any of this population's gain. Per the rule, the next step is costing out the full 4x-only case against production's total residual population size (390 Class-5 rows), not a smaller intermediate-budget ask.
> **Remaining gate:** none owned here. The successor 4x-only economics question is concluded-negative; follow `reports/2026-09-19-ws2-work-ladder-4x-only-matched-work-costing-result-001.md` and current WS2 authority.
> **Evidence role:** confirmation (same precommitted population/instrument as the parent report; only the budget grid is extended).
> **Population identity:** the identical, already-frozen 20-id sample from the parent report (`R00044,R00512,R01000,R01380,R01718,R02035,R02144,R02215,R02309,R02404,R02473,R02588,R02661,R02774,R02880,R02974,R03046,R03129,R03194,R03276`), current commit, `data/stress/stress-levels-random.json`.

## Why this ran

`WS2-WORK-LADDER-ECONOMICS` asks whether a matched-work counterfactual justifies a bounded production node-budget change, not merely whether *some* higher budget recovers *some* levels. The parent report's two-tier result (0/20 at 300M, 3/20 at 1.2B) establishes a positive endpoint but says nothing about the **shape** of the response between them: a threshold effect concentrated near 1.2B implies a much more expensive ask than a response that already shows most of its gain at a modest 2x escalation. Per standing research rules ("prefer the cheapest information-value test"), the cheapest way to learn the shape is to reuse the exact same frozen population and instrument at one more budget point, rather than commissioning a new economics-specific harness before knowing whether the curve is even worth costing out.

## Precommitted design

**Instrument:** the same `.github/workflows/solver-level-blind-targeted-sweep.yml` dispatch used for the parent report's two tiers. No new tooling.

**Population:** identical to the parent report's 20-id sample (reproduced above), unchanged. No new selection, no outcome-based filtering.

**New tier:** `node_budget=600,000,000` (2x the 300M parity tier, half of the 1.2B tier) -- the natural midpoint of the existing grid on a log2 scale (300M -> 600M -> 1.2B is three even doublings).

**Corpus:** `data/stress/stress-levels-random.json`, matching both existing tiers.

**Decision rule, fixed before dispatch:**

- **0/20 solve at 600M:** the response is concentrated at or near 1.2B (a threshold/late-payoff shape). This makes the economics case *weaker*: a production change would need to commit to the full 4x escalation to see any of this population's gain, not a cheaper intermediate increase. Proceed to cost out the full 4x-only case against production's total residual population size (390 Class-5 rows) before any further nomination.
- **1-3 solve at 600M (a strict subset of, or distinct from, the 1.2B solves):** the response is smoother/more linear across this range. This *strengthens* the economics case for a smaller, cheaper intermediate budget increase and narrows what a production trial would need to test.
- **All 3 of the 1.2B solves already solve at 600M:** the 1.2B tier is buying nothing beyond 600M on this population; the effective useful escalation is 2x, not 4x, which meaningfully changes the cost side of the economics comparison.
- **Any id solves at 600M that did NOT solve at 1.2B:** would indicate non-monotone behavior (already flagged as a possibility by `work-ladder-response-lib.mjs`'s `nonMonotoneLevels` field, presumably from randomness/technique-ordering interaction with budget rather than a true capability regression) and requires inspecting that id's per-attempt trace before drawing any economics conclusion from it.

No outcome was inspected before this precommitment; the workflow had not been dispatched as of that section being written and committed.

## Result

**600M tier: 0/20 solved, all `node-budget-reached`.** Both GHA passes are accounted for and cross-checked against the frozen 20-id population before any outcome was read further:

- First pass (run [35385561798](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35385561798)): 11/20 ids completed cleanly (`R00512, R01000, R02035, R02215, R02309, R02404, R02473, R02774, R02880, R02974, R03046`) -- 0 solved. The other 9 ids' shards hit the same GHA job-level wall-time-estimate timeout pattern documented in the parent report's tier-2 recovery (the shard planner underestimates real per-level cost at escalated budgets under level-blind execution).
- Recovery pass (run [35391933756](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35391933756), redispatched with `fixed_group_size=1` and a larger per-shard timeout, the standing recovery procedure for this workflow): the remaining 9 ids (`R00044, R01380, R01718, R02144, R02588, R02661, R03129, R03194, R03276`) all completed cleanly -- 0 solved.
- Union of both passes reproduces the frozen 20-id population exactly (verified by sorted-id set equality, no duplicates, no extras).

Feeding all three tiers into `scripts/analyze-work-ladder-response.mjs` (the standard MO-004 reduction, not hand-summarized) confirms:

| workBudget | solved | gainedFromPrevious | lostFromPrevious |
|---|---:|---|---|
| 300,000,000 | 0 | (baseline) | (baseline) |
| 600,000,000 | 0 | none | none |
| 1,200,000,000 | 3 | R00044, R01000, R02974 | none |

`nonMonotoneLevels: []` -- no id solved at a lower budget and failed at a higher one, and no id solved at 600M (ruling out the decision rule's fourth, non-monotone branch entirely).

**This is decision rule branch 1** ("0/20 solve at 600M"), precommitted before dispatch: the response is concentrated at or near 1.2B, a threshold/late-payoff shape, not a smoother response across the tested range. All three of the ids that eventually solve at 1.2B were still `node-budget-reached` at 600M, so the useful escalation on this population is the full 4x, not a cheaper 2x.

## What this does and does not authorize

This is still discovery/confirmation for the *shape* question only. It does not itself authorize a production node-budget change under any outcome above -- per standing rule, that requires a genuine matched-work comparison (equal total compute, deep-vs-wide) plus a downstream-workSpent/wall-cost accounting for the full residual population, not a 20-id recovery-rate reading at any single or multi-point grid.

Per the decision rule's branch-1 instruction, the justified next step is costing out the **full 4x-only case** against production's total residual population size (390 Class-5 rows) -- not a smaller intermediate-budget ask, since this population shows no benefit from one. That costing (a genuine matched-work comparison: 4x budget on some levels vs. the same total compute spent elsewhere) is `WS2-WORK-LADDER-ECONOMICS`'s own remaining gate and is not attempted in this pass.

## Handoff

- `WS2-WORK-LADDER-ECONOMICS` (`docs/solver-research-question-relations.json`) remains `active-diagnostic`; this report narrows what its eventual matched-work comparison must cost (the full 4x escalation, applied to some fraction of the 390-row residual) rather than closing the question.
- Next step: design the actual matched-work counterfactual (equal total compute: N levels at 4x budget vs. 4N levels at normal budget, or an equivalent split) against the current 390-row Class-5 residual, with its own precommitted population/decision rule, before any dispatch.
- Preserve the same recovery procedure documented here and in the parent report (redispatch only the missing ids with `fixed_group_size=1` and a much larger per-shard timeout) as the standing practice for this workflow at escalated budgets.
