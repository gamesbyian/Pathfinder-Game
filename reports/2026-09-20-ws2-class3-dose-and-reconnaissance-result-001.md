# WS2 Class-3 dose exposure and failure-response reconnaissance: result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — GHA run `35531721218` (`solver-level-blind-targeted-sweep.yml`, the frozen 53-parent shared acquisition: 23 Class-3 residual + 30 solved controls, `node_budget=50000000`, shared production protocol), full compact-failure-response document durably persisted at `reports/stress/failure-evidence/targeted-sweep-runs/35531721218/compact-failure-response.json`.
> **Decision:** **Class-3 dose exposure is resolved: 0/23 exposure-gap, 20/23 censored-dose, 3/23 exposed-and-negative.** No Class-3 row is exposure-gapped; every known T1 rescuer action genuinely ran under the shared production protocol. Most (20/23) were cut off by a per-attempt deadline well short of the T1-isolated solve cost; 3/23 ran the exact rescuer technique to real exhaustion and still failed. **WS2 reconnaissance routes to `allocation-specific-follow-up`**, informed directly by the Class-3 exact-action evidence.
> **Remaining gate:** design (not yet dispatch) a bounded, matched-work allocation experiment for the repair-family per-attempt deadline (the dominant censored mechanism below), separate from and complementary to the already-tracked `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` question, which this run's aggregate data independently corroborates.
> **Evidence role:** two separate analyses over one shared acquisition, per `reports/2026-09-20-ws2-class3-shared-acquisition-freeze-001.md`'s own instruction to keep them separate; this report keeps that separation while documenting how they reinforce each other.
> **Research question:** `WS2-CLASS3-DOSE-EXPOSURE` and `WS2-FAILURE-RESPONSE-RECONNAISSANCE`

## Access-gap detour (now closed)

This acquisition was dispatched three times before real analysis was possible, due to two infrastructure gaps discovered and fixed in the process (both now durable for future sessions):

1. **`solver-level-blind-targeted-sweep.yml` published no durable copy of its own compact-failure-response document** — GitHub Actions artifact downloads to `*.blob.core.windows.net` are blocked by this sandbox's egress policy, and this workflow was artifact-only by design. Fixed in PR #1927: an opt-in `persist_failure_response` input/job that commits just the compact-failure-response document (never the full result, hints, or baseline files) to `reports/stress/failure-evidence/targeted-sweep-runs/<run id>/` on `main`.
2. **The new persist job downloaded the artifact, then immediately lost it**: `actions/checkout@v7` defaults to `clean: true`, which cleans untracked files as part of checking out `main` -- since checkout ran *after* the download in the first attempt, it silently deleted the just-downloaded directory. Fixed in PR #1929 by reordering: checkout first, download second.

Run `35531721218` (third dispatch) is the first to durably persist real data. See `reports/2026-09-19-class3-dose-exposure-result-001.md` and `reports/2026-09-19-ws2-failure-response-reconnaissance-stage-a-result-001.md` for the honest, fully-traced access-gap diagnosis this report supersedes.

## Class-3 dose exposure: `WS2-CLASS3-DOSE-EXPOSURE`

### A tooling bug found and fixed before trusting the first pass

The first run of `scripts/analyze-class3-dose-exposure.mjs` against the real data returned a suspiciously total result: **23/23 exposure-gap** (every rescuer "exact-not-participated"), across every action family including families independently known to have run (`main-search`, `early-repair-search`, etc. all show real attempts in the raw document). Investigating one row (`R00306`) directly: the frozen expectation's rescuer identity is the bare technique-census form (`repair|score=repair|guidance=must-turn-biased`), but production's actual per-attempt `actionKey` carries a `<stageId>|` prefix and, for repair, a `|seedSalt=N` suffix (`early-repair-search|repair|score=repair|guidance=must-turn-biased|seedSalt=0`) -- the same semantic action, different string. The script's exact-string match (`attempt.actionKey === rescuer.actionKey`) therefore never matched anything, for any row, regardless of real participation.

Fixed in `scripts/analyze-class3-dose-exposure.mjs` (this report's own commit): a `normalizedActionKey()` helper strips exactly the row's own `stageId` prefix and a trailing `|seedSalt=\d+` suffix before comparing to the bare rescuer identity. `npm run test:class3-dose-exposure` passes unchanged (the existing fixture attempts already used bare-form keys, so the bug was invisible to the test suite -- a gap now covered implicitly by this real-data run, though a dedicated regression fixture would be a reasonable follow-up).

### Corrected result

Re-running `research:analyze-class3-dose` with the fix:

| Parent disposition | Count |
|---|---:|
| `exposure-gap` (rescuer never ran) | 0 |
| `censored-dose` (rescuer ran, cut off before exhaustion/solve) | 20 |
| `exposed-and-negative` (rescuer ran to real exhaustion, failed) | 3 |

**No Class-3 row is an exposure gap.** Every one of the 23 rows' known T1 rescuer actions genuinely executed under the shared production protocol -- the original 2026-09-17 ambiguity ("dose-unverified, not negative") is resolved as **dose-censored for 20/23, genuinely negative for 3/23**.

### The 20 censored-dose rows: a real, well-characterized underdose

All 20 censored rescuers show outcome `deadline-truncated` (never `node-limited`/`work-limited`) -- a per-attempt wall-clock/node ceiling, not the parent's outer 50M-node budget. Comparing each rescuer's production dose against its own T1-isolated solve cost (already on file in `reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json`):

| Rescuer family | Parents | Production dose (median) | Typical isolated cost | Pattern |
|---|---:|---:|---:|---|
| `admissible-order\|tieBreak=none\|lds=off` | 5 | **12,499,968 nodes, every single time** | 14.3M-48.2M | Uniform ~25% ceiling -- see below |
| `repair\|score=repair\|guidance=standard` | 11 | ~2,000,000 nodes/attempt x3 seeds | 349K-37.2M (usually well above 2M) | Per-attempt deadline |
| `repair\|score=repair\|guidance=must-turn-biased` | 5 | 2.1M-6.0M nodes | 4.1M-38.7M | Per-attempt deadline |

**The `admissible-order` censoring is not a new finding: it is the already-tracked `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` mechanism, now cross-validated at a different total budget.** 12,499,968 / 50,000,000 = almost exactly 25% -- the same `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` already under investigation (concluded positive, 2/40, at the 300M-total probe: `reports/2026-09-20-admissible-order-reserve-starvation-probe-result-001.md`). The population-wide Stage-A query below shows this same ~12.5M ceiling hit uniformly on **both** residual and solved-control parents that reach `admissible-order-fallback` (one solved control even solved right at that boundary, at 12,499,968 nodes) -- exactly the preflight's own "solved controls show the same pattern" case, which does **not** independently license a new adverse-mechanism claim here. It is folded into the existing question, not a second one.

**The repair-family censoring (16/23 rows) is a materially different, so-far-untracked mechanism**: a roughly 2,000,000-6,000,000-node **per-attempt** deadline (not a shared-total-budget fraction), hit repeatedly across parents whose T1-isolated cost is frequently 5-20x higher. This is the genuinely new allocation-specific finding this reconnaissance earns.

### The 3 exposed-and-negative rows

All three are `beam|score=objectiveFirst|bias=none|width=5000|retention=...` rescuers (2x `mechanic-buckets`, 1x `plain`), all ran to real `exhausted` outcomes at production doses close to or slightly above their T1-isolated cost (e.g. 272,572 vs 293,389 isolated; 521,329 vs 578,195 isolated). These are genuine negatives at comparable dose: the exact known-rescuer technique does not reproduce its isolated solve under shared-production conditions for these 3 rows, most plausibly because production's concurrent/inherited state differs from the isolated T1 census's clean-slate run. Not further investigated here; no allocation fix would be expected to help these three.

## WS2 failure-response reconnaissance Stage A: `WS2-FAILURE-RESPONSE-RECONNAISSANCE`

Population: complete, 53/53 observed, single protocol/solver identity, 23 residual (all `nodeLimited` at the parent level) + 30 solved control (`solvedControlsWithFailedAttempts: 25` -- most solved parents did fail at least one attempt en route, the expected within-run control the failure-evidence plan anticipated).

### Stage-A checklist

1. **Population/missingness:** complete, 0 missing/malformed.
2. **Solved/non-solved:** 30/23, exactly the frozen split, no drift, **no new cold solve** on a previously-residual id.
3. **Terminal composition:** all 23 residual are `node-limited` (the parent-level 50M ceiling); 0 exhausted-negative/work-limited/deadline-truncated/error at the parent level.
4. **Action/stage participation and reach** (full tables: `reports/stress/failure-evidence/ws2-reconnaissance-residual-query-2026-09-20.json` / `-solved-control-query-2026-09-20.json`): every late-ladder stage the residual population reaches shows **100% `deadline-truncated`** outcomes (`admissible-order-alternate-tiebreak-retry` 23/23, `admissible-order-fallback` 23/23, `early-repair-search` 55/55 attempts, `late-repair-multiseed-retry` 14/14, `late-repair-search` 2/2, `repair-fallback` 20/20) -- zero natural exhaustion anywhere in the residual population's late ladder. `main-search` and the mid-ladder retries show a real mix of `deadline-truncated`/`exhausted` (not uniform), consistent with genuine per-level variation rather than a blanket ceiling.
5. **Exact-attempt dose by action:** see the Class-3 table above for the exact-action view; population-wide, `admissible-order-fallback`'s dose is uniformly ~12.5M both in residual and solved-control rows (reserve-fraction artifact, folded into the existing question per above). `early-repair-search` shows a starker residual/control contrast: 0/55 residual attempts solved vs 5/29 (~17%) solved-control attempts, both under the same ~2M-node-per-attempt deadline -- suggestive, but this could reflect that residual levels are simply harder overall (a selection confound the preflight itself anticipated) rather than an allocation-specific effect; the Class-3 exact-isolated-cost comparison above is the stronger, deconfounded evidence for the same underlying claim.
6. **Solved parents with failed attempts:** 25/30, routine, matches expectation.
7. **Badness support:** not reported by this producer (0 rows with bestBadness/finalBadness) -- not available for this analysis.
8. **Protocol partitions:** single protocol/solver identity throughout, no mixing.

### Routing decision

Per A1 ("recurrent work/node censoring before meaningful dose... solved controls show the same pattern -> does not earn an adverse-mechanism claim on its own"): the `admissible-order` piece is explained by the existing reserve-starvation question and does not nominate anything new. The repair-family per-attempt deadline is **not** ruled out by solved controls (which show the identical ~2M ceiling but do sometimes convert to solves, 5/29, unlike residual's 0/55) and is independently, non-confounded corroborated by the Class-3 exact-action evidence (16/23 Class-3 rows censored at doses far below their known isolated-solve cost, specifically in this family).

This is a producer-level allocation finding (a per-attempt deadline configuration), not a typed rejection reason (no B1 rejection-counterfactual candidate identified) and not a question that depends on search-event/state identity (no B2 first-loss trigger -- the aggregate dose evidence already localizes the mechanism cleanly). It is not a producer/consumer pair either (no B3 2x2 candidate -- this is a single allocation parameter, not an interaction).

```
route: allocation-specific-follow-up
```

### What this does not authorize

- Does not implement or dispatch a repair-deadline change. It nominates a bounded, matched-work allocation experiment (candidate: raise the early-repair-search/repair-fallback/late-repair per-attempt node deadline for a frozen population, matched total work, with explicit earlier-stage loss controls -- mirroring the reserve-starvation A/B's own discipline) for separate precommitment.
- Does not reopen the closed-negative broad 4x work-ladder economics question.
- Does not merge this finding into `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` beyond noting the cross-validation; the repair-family mechanism is a distinct parameter and should get its own question/preflight if pursued.
- Does not claim any new cold solve; 0/23 Class-3 parents and 0 previously-residual ids solved in this run.

## Artifacts

- `scripts/analyze-class3-dose-exposure.mjs` -- fixed (`normalizedActionKey`), `npm run test:class3-dose-exposure` passes
- `reports/stress/failure-evidence/class3-dose-analysis-2026-09-20.json` -- corrected full analysis
- `reports/stress/failure-evidence/ws2-reconnaissance-residual-query-2026-09-20.json`, `-solved-control-query-2026-09-20.json` -- full Stage-A query outputs
- `reports/stress/failure-evidence/targeted-sweep-runs/35531721218/` -- durable compact-failure-response document + manifest (the source of truth for both analyses)
