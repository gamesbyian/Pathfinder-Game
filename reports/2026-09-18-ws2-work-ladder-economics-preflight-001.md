# WS2 work-ladder economics: intermediate-tier preflight

> **Status:** active
> **Last evidence:** 2026-09-18 — design only; no new solver compute in this pass. Builds directly on `reports/2026-09-18-ws2-post-d1-work-ladder-reuse-and-confirmation-preflight-001.md`'s concluded-positive confirmation slice (0/20 solved at 300M nodes, 3/20 at 1.2B nodes, current commit, level-blind).
> **Decision:** not yet reached. This freezes a cheap, zero-new-tooling addition (a third node-budget tier on the identical 20-id population) before any of its outcome is inspected.
> **Remaining gate:** dispatch the 600M tier, then interpret the resulting 3-point response curve per the decision rule below.
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

No outcome has been inspected before this precommitment; the workflow has not been dispatched as of this section being written and committed.

## What this does and does not authorize

This is still discovery/confirmation for the *shape* question only. It does not itself authorize a production node-budget change under any outcome above -- per standing rule, that requires a genuine matched-work comparison (equal total compute, deep-vs-wide) plus a downstream-workSpent/wall-cost accounting for the full residual population, not a 20-id recovery-rate reading at any single or multi-point grid.

## Handoff

- Feed all three tiers (300M/600M/1.2B) into `scripts/analyze-work-ladder-response.mjs` for the standard MO-004 response-curve reduction (`gainedFromPrevious`/`lostFromPrevious`/`nonMonotoneLevels`) once 600M completes, rather than hand-summarizing.
- Update this report (or a successor) with the 600M result and the resulting economics framing before deciding whether a full matched-work deep-vs-wide comparison is justified next.
