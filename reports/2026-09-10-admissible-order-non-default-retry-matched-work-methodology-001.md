# admissible-order-non-default-retry matched-work confirmation: architecturally unreachable by configuration alone — the search primitive never consults its own soft work cap

> **Status:** concluded-negative
> **Last evidence:** 2026-09-10 — seven local single-level probes on `R02367` across five distinct budget configurations (node-only bound, explicit finite work-budget at two node scales, strict-mode with a generous ceiling, strict-mode with a ceiling deliberately well below natural need), plus direct code verification of the dispatch path (`modules/solver/attempt-dispatch.ts:40-43`, `modules/solver/admissible-order-search.ts:176-317`)
> **Decision:** the queue gate ("a matched-work test with nonzero target-stage work in which the work ceiling actually differs the outcome") is **not satisfiable by any CLI/workflow configuration**, because `admissibleOrderNonDefaultConfigs` (all four non-default `ADMISSIBLE_ORDER_PROFILES`: `none`, `mustCrossFirst`, `intersectionHarvest`, `nearClosureRescue`) dispatch exclusively through the plain `admissibleOrderSearch` primitive, which never reads the per-tier soft work cap (`prep._workCap`) that the tier's own `admissibleOrderNonDefaultRetryBudgetFractionOverride`-scaled `withWorkCapScope` call installs. Only the raw node ceiling (always enforced) and the global whole-solve `prep._strictWorkCap` (enforced only under `--strict-total-work-budget`, and only as an incidental whole-solve-wide constraint, never this tier's own scoped allocation) can ever stop this tier's search. This is a code-level architectural gap, not a parameter-tuning problem
> **Remaining gate:** a genuine confirmation of the `1.0 → 0.18` work-fraction candidate requires a prerequisite code change (making `admissibleOrderSearch`'s hot loop consult `prep._workCap`, mirroring the fix `2026-08-28-admissible-order-work-cap-gap-discovery.md` already proposed-but-did-not-implement for the sibling `admissible-order-fallback` tier) — not further methodology or budget-sizing work. That code change was not made here (out of scope: analysis/preflight only, no solver-behavior changes without explicit direction)
> **Evidence role:** forensic — local single-level diagnostic plus direct source-code verification, no population-scale execution
> **Selection:** one level (`R02367`), reused across this investigation's probes; not a frozen population

## Why this supersedes this report's own earlier finding

An earlier revision of this report (still visible in git history) concluded the binding constraint was the tier's own stacked NODE ceiling being exhausted by earlier ladder tiers at small `node_budget` scale, and recommended re-deriving budgets at a larger scale (matching the 750,000,000 used by confirmation-004/-005/-006) as the next step. That diagnosis was correct as far as it went, but incomplete: further probes at 3x node scale (150,000,000, comfortably more absolute node headroom) and — decisively — with `--strict-total-work-budget` added (the one mode where a per-attempt work check is even theoretically possible for this code path) all reproduced the exact same byte-identical result regardless of the work ceiling's value. That ruled out "not enough node headroom" as the root cause and pointed at something structural, which direct code reading then confirmed.

## Method

Seven local runs via `scripts/level-blind-capability-sweep.mjs` (through `scripts/run-bundled.mjs`) on level `R02367`, `--lifecycle-telemetry --workers=1`, varying `--node-budget`, `--work-budget`, `--strict-total-work-budget`, and `--admissible-order-non-default-retry-budget-fraction`:

| # | `node_budget` | `work_budget` | strict? | fraction | `allocatedWorkCeiling` | `allocatedNodeCeiling` | `actualWork` | `actualNodes` |
|---|---:|---:|:---:|---:|---:|---:|---:|---:|
| 1 | 50,000,000 | (default, derived) | no | 1.0 | (large, derived) | 12,499,809 | 319,965,776¹ | 192,500,001¹ |
| 2 | 50,000,000 | 100,000,000 | no | 1.0 | 100,000,000 | 12,499,809 | 59,092,879 | 12,499,968 |
| 3 | 50,000,000 | 100,000,000 | no | 0.18 | 18,000,000 | 12,499,809 | **59,092,879** | 12,499,968 |
| 4 | 150,000,000 | 500,000,000 | no | 1.0 | 500,000,000 | 37,499,864 | 168,652,151 | 37,499,904 |
| 5 | 150,000,000 | 500,000,000 | no | 0.18 | 90,000,000 | 37,499,864 | **168,652,151** | 37,499,904 |
| 6 | 150,000,000 | 1,000,000,000 | **yes** | 0.18 | 180,000,000 | 37,499,797 | **168,652,151** | 37,499,904 |
| 7 | 150,000,000 | 500,000,000 | **yes** | 0.18 | 90,000,000 | 37,499,864 | **168,652,151** | 37,499,904 |

¹ Whole-solve totals from an earlier unbounded-work-budget probe in this investigation, before an explicit `--work-budget` was introduced; included for context only.

Runs 4/5 are a matched control/treatment pair at 3x node scale with a generous, non-strict work ceiling (fraction never binds either way — consistent with the "node ceiling wins" hypothesis this report originally proposed). Run 6 adds `--strict-total-work-budget` with a ceiling (180,000,000) still above the natural 168,652,151 — inconclusive by construction, since a non-binding ceiling looks the same whether or not it's being checked. **Run 7 is the decisive test**: `--strict-total-work-budget` on, `allocatedWorkCeiling=90,000,000`, well below the 168,652,151 every other run at this node scale naturally consumes. If the strict cap were actually enforced against this tier's own allocation, `actualWork` should truncate near 90,000,000. It does not — `actualWork` and `actualNodes` come back byte-identical to every non-strict run at the same node scale.

## Root cause (code-verified)

`modules/solver/attempt-dispatch.ts:40-43`:

```ts
return admissibleOrder
  ? admissibleOrderLds
    ? admissibleOrderSearchLDS(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
    : admissibleOrderSearch(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
```

`modules/solver/attempts.ts:226`: `ADMISSIBLE_ORDER_PROFILES = ['default', 'none', 'mustCrossFirst', 'intersectionHarvest', 'nearClosureRescue']`. Per `2026-08-28-admissible-order-work-cap-gap-discovery.md`'s own established finding, `admissibleOrderLds` is never set `true` by ordinary config generation (`getAttemptConfigs`/`ADMISSIBLE_ORDER_PROFILES`) — it is exclusively a `method-probe.mjs` research-tool construct. So every config in `admissibleOrderNonDefaultConfigs` (`orchestration.ts:1847`, `admissibleOrderConfigs.filter(c => c.scoringProfileId !== 'default')` — all four non-`default` profiles) dispatches through the plain `admissibleOrderSearch`, never `admissibleOrderSearchLDS`.

`modules/solver/admissible-order-search.ts`:
- `admissibleOrderSearch` (line 176): its hot-loop checks are `prep._strictWorkCap !== undefined && prep._workMeter.units >= prep._strictWorkCap` (lines 189, 213) — **the global, whole-solve-cumulative strict cap only**, undefined and therefore never true under non-strict semantics.
- `admissibleOrderSearchLDS` (line 296): its check is `prep._workMeter.units >= (prep._workCap ?? Infinity)` (line 317) — **the per-tier soft cap** `withWorkCapScope` installs. Unreachable from this tier's ordinary dispatch.

The tier's own call site (`orchestration.ts:2479`, `withWorkCapScope(prep, prep._workMeter.units + nonDefaultRetryWorkBudget, ...)`) genuinely computes a correctly fraction-scaled number and installs it as `prep._workCap` — this is real, and it is exactly why `allocatedWorkCeiling` in the telemetry always shows the right, fraction-differentiated value. But nothing downstream of that ever reads `prep._workCap` for this tier's actual search. Even under `--strict-total-work-budget` (run 7), the check that *does* fire (`prep._strictWorkCap`) is a global cumulative one set once at solve start (`workStart + workBudget`) — it has nothing to do with this tier's own fraction-scaled slice, and in practice never bound at any node/work scale tried, because the whole ladder's cumulative consumption by the time this dead-last tier runs was always comfortably under whatever generous strict total was chosen. Only the raw `remainingNodeBudget` argument passed directly into `admissibleOrderSearch` (checked far more frequently, inside the search's own node-expansion loop, not shown above) ever actually terminates this tier's attempt.

This is the same structural gap `2026-08-28-admissible-order-work-cap-gap-discovery.md` already proved for the sibling `admissible-order-fallback` tier — but that report's own "What this does not establish" section explicitly declined to claim coverage of `admissible-order-non-default-retry`, reasoning it "already installs a fresh cap" (verified only at the orchestration/dispatch level, i.e. that `withWorkCapScope` is called with a correctly-computed number). This report closes that gap: installing the cap and the search primitive consulting it are different things, and for this tier's actual dispatch path, only the first is true.

## What this means for the queue gate

The candidate's premise — "does reducing `admissible_order_non_default_retry_budget_fraction` from `1.0` to `0.18` cost solves for a work saving" — cannot be tested by any combination of `node_budget`, `work_budget`, or `strict_total_work_budget` values, local or population-scale, because the fraction's only effects (`allocatedWorkCeiling` in telemetry, `nonDefaultRetryTotalBudget`'s wall-clock slice) are either never consulted by the search (`prep._workCap`) or dominated in practice by the real node ceiling and the ms deadline, neither of which the fraction touches independent of its work-budget scaling. Every prior non-informative result in this candidate's confirmation history (`-001` through `-006`, plus this session's own probes) is consistent with this: the fraction has never had a code path capable of making it bind.

A genuine confirmation would require a prerequisite code change — install a `prep._workCap` (or equivalent) check inside `admissibleOrderSearch`'s hot loop, matching `admissibleOrderSearchLDS`'s existing pattern — before any matched-work A/B of the fraction is meaningful. Per `2026-08-28-admissible-order-work-cap-gap-discovery.md`'s own stated standard for exactly this kind of change ("a genuine behavior-changing addition... needs evidence before being executed, not just a plausibility argument"), that is a real, separate, behavior-affecting code change requiring its own validation — not something to fold into a confirmation dispatch's parameter choices, and not made here.

## What this does not establish

- Does not establish that shrinking this tier's work allocation would or would not cost solves in practice — the question remains genuinely open, just untestable via the current code path.
- Does not touch `admissible-order-fallback`'s own already-closed finding (`2026-08-28-admissible-order-work-cap-gap-discovery.md`) — this report corrects that report's disclaimed-but-unverified assumption about the sibling tier, it does not reopen the fallback tier's own closed question.
- Does not implement the prerequisite code fix, evaluate its safety, or estimate its likely effect — that is future work, gated on an explicit decision to pursue it, not something this analysis-only pass should decide unilaterally.
- Does not change production disposition: the fraction stays `1.0`.
