# WS2 failure-response reconnaissance Stage A: final result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — GHA run `35531721218` (the frozen 53-parent shared acquisition: 23 Class-3 residual + 30 solved controls, `node_budget=50000000`, shared production protocol), full compact-failure-response document durably persisted at `reports/stress/failure-evidence/targeted-sweep-runs/35531721218/compact-failure-response.json`.
> **Decision:** **route: allocation-specific-follow-up.** Every late-ladder stage the residual population reaches shows 100% `deadline-truncated` outcomes. The `admissible-order-fallback` ~12.5M-node ceiling is identical in residual and solved-control rows (folds into the already-tracked reserve-starvation question). The repair-family per-attempt deadline is not explained the same way (residual 0/55 solved vs solved-control 5/29 under the identical ceiling) and is independently corroborated by the companion Class-3 exact-action analysis.
> **Remaining gate:** design (not dispatch) a bounded, matched-work repair-family per-attempt-deadline experiment.
> **Evidence role:** routing screen per `reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-preflight-001.md` — not a hypothesis test.
> **Research question:** `WS2-FAILURE-RESPONSE-RECONNAISSANCE`

## Access-gap detour (now closed)

This acquisition was dispatched three times before real analysis was possible: `solver-level-blind-targeted-sweep.yml` published no durable copy of its compact-failure-response document (fixed in PR #1927, opt-in `persist_failure_response`), and the first attempt at that fix downloaded the artifact then immediately lost it to `actions/checkout@v7`'s default `clean: true` behavior running afterward (fixed in PR #1929, reordering checkout before download). Run `35531721218` (third dispatch) is the first to durably persist real data. See `reports/2026-09-19-ws2-failure-response-reconnaissance-stage-a-result-001.md` for the fully-traced access-gap diagnosis this report supersedes, and the companion `reports/2026-09-20-class3-dose-exposure-resolved-result-001.md` for the Class-3-specific exact-action analysis over the same acquisition.

## Population

Complete, 53/53 observed, single protocol/solver identity, 23 residual (all `nodeLimited` at the parent level) + 30 solved control (`solvedControlsWithFailedAttempts: 25` — most solved parents did fail at least one attempt en route, the expected within-run control the failure-evidence plan anticipated).

## Stage-A checklist

1. **Population/missingness:** complete, 0 missing/malformed.
2. **Solved/non-solved:** 30/23, exactly the frozen split, no drift, **no new cold solve** on a previously-residual id.
3. **Terminal composition:** all 23 residual are `node-limited` (the parent-level 50M ceiling); 0 exhausted-negative/work-limited/deadline-truncated/error at the parent level.
4. **Action/stage participation and reach** (full tables: `reports/stress/failure-evidence/ws2-reconnaissance-residual-query-2026-09-20.json` / `-solved-control-query-2026-09-20.json`): every late-ladder stage the residual population reaches shows **100% `deadline-truncated`** outcomes (`admissible-order-alternate-tiebreak-retry` 23/23, `admissible-order-fallback` 23/23, `early-repair-search` 55/55 attempts, `late-repair-multiseed-retry` 14/14, `late-repair-search` 2/2, `repair-fallback` 20/20) — zero natural exhaustion anywhere in the residual population's late ladder. `main-search` and the mid-ladder retries show a real mix of `deadline-truncated`/`exhausted` (not uniform), consistent with genuine per-level variation rather than a blanket ceiling.
5. **Exact-attempt dose by action:** see the companion Class-3 report for the exact-action view; population-wide, `admissible-order-fallback`'s dose is uniformly ~12.5M both in residual and solved-control rows (reserve-fraction artifact, folded into the existing question per below). `early-repair-search` shows a starker residual/control contrast: 0/55 residual attempts solved vs 5/29 (~17%) solved-control attempts, both under the same ~2M-node-per-attempt deadline — suggestive, but this could reflect that residual levels are simply harder overall (a selection confound the preflight itself anticipated) rather than an allocation-specific effect; the Class-3 exact-isolated-cost comparison is the stronger, deconfounded evidence for the same underlying claim.
6. **Solved parents with failed attempts:** 25/30, routine, matches expectation.
7. **Badness support:** not reported by this producer (0 rows with bestBadness/finalBadness) — not available for this analysis.
8. **Protocol partitions:** single protocol/solver identity throughout, no mixing.

## Routing decision

Per A1 ("recurrent work/node censoring before meaningful dose... solved controls show the same pattern -> does not earn an adverse-mechanism claim on its own"): the `admissible-order` piece is explained by the existing reserve-starvation question and does not nominate anything new. The repair-family per-attempt deadline is **not** ruled out by solved controls (which show the identical ~2M ceiling but do sometimes convert to solves, 5/29, unlike residual's 0/55) and is independently, non-confounded corroborated by the Class-3 exact-action evidence (16/23 Class-3 rows censored at doses far below their known isolated-solve cost, specifically in this family).

This is a producer-level allocation finding (a per-attempt deadline configuration), not a typed rejection reason (no B1 rejection-counterfactual candidate identified) and not a question that depends on search-event/state identity (no B2 first-loss trigger — the aggregate dose evidence already localizes the mechanism cleanly). It is not a producer/consumer pair either (no B3 2x2 candidate — this is a single allocation parameter, not an interaction).

```
route: allocation-specific-follow-up
```

## What this does not authorize

- Does not implement or dispatch a repair-deadline change. It nominates a bounded, matched-work allocation experiment (candidate: raise the early-repair-search/repair-fallback/late-repair per-attempt node deadline for a frozen population, matched total work, with explicit earlier-stage loss controls — mirroring the reserve-starvation A/B's own discipline) for separate precommitment.
- Does not reopen the closed-negative broad 4x work-ladder economics question.
- Does not merge this finding into `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` beyond noting the cross-validation; the repair-family mechanism is a distinct parameter and should get its own question/preflight if pursued.
- Does not select first-loss, rejection-counterfactual, or a 2x2 — none were nominated by this evidence.

## Screening-discipline disclosure

- Numerator/denominator for the nominated contrast: residual 0/55 `early-repair-search` attempts solved (across 23 parents) vs solved-control 5/29 attempts solved (across however many of the 30 reach that stage), both under the observed ~2,000,000-6,000,000-node per-attempt ceiling.
- Protocol/solver identity: single, as stated.
- Missing/censored counts: 0 missing; residual is 100% deadline-truncated at every late-ladder stage; solved-control shows a real mix.
- Exact action/stage identity: full byStage/byAction tables in the linked query artifacts; exact-action identity for the Class-3 subset in the companion report.
- Prespecified vs exploratory: the residual/solved-control split and the late-ladder stage list were prespecified by the original Stage-A preflight; the specific repair-vs-admissible-order decomposition was discovered during this analysis, not predeclared — reported as exploratory, corroborated (not merely asserted) by the independently-derived Class-3 exact-cost comparison.

## Companion report

`reports/2026-09-20-class3-dose-exposure-resolved-result-001.md` — the Class-3 exact-action dose analysis over the same acquisition, whose exact-isolated-cost comparison is the deconfounded evidence underlying the routing decision above.

## Artifacts

- `reports/stress/failure-evidence/ws2-reconnaissance-residual-query-2026-09-20.json`, `-solved-control-query-2026-09-20.json` — full Stage-A query outputs
- `reports/stress/failure-evidence/targeted-sweep-runs/35531721218/` — durable compact-failure-response document + manifest (the source of truth)
