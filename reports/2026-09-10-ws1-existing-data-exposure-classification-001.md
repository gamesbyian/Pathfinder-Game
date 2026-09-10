# WS1 existing-data exposure classification 001: mechanically-eligible-unexposed vs. exposed-and-failed

> **Status:** concluded-positive
> **Last evidence:** 2026-09-10 — rerun against GHA run `34531412380` (the refreshed capability run this report originally waited on): coverage complete, zero errors, zero deadline truncation on both corpora. See "2026-09-10 refresh update" below for the current numbers; the original (2026-09-04, pre-refresh) analysis is preserved below it for provenance and comparison.
> **Decision:** the refresh confirms the earlier analysis's structure held up (same stages show the same eligible/unexposed/exposed-failed *pattern*), while updating the numbers: net **+55 solves / 0 regressions** across the full 1,802-level published research corpus (corpus1 99/102, corpus2 1,029/1,700) validates the cumulative effect of this week's portal restoration + goal-attraction fresh-pool promotions at full population scale, not just their own narrower confirmation populations. The `admissible-order-fallback` telemetry-artifact finding reproduces identically (169/169 "work-starved" levels on the new population still show substantial real work). The two previously-stale `instantiated` fields (`guidance-goal-distance-retry`, `late-repair-multiseed-retry`) now report correctly.
> **Remaining gate:** the residual-lane recompute is still blocked on the broader isolated-T1-winner technique-census join (unaffected by this capability refresh — that census is a separate pipeline); see "Residual-lane recompute readiness" below, unchanged.
> **Evidence role:** discovery
> **Selection:** observational — full corpus-2 unsolved population, no sampling (725/1,700 pre-refresh, 671/1,700 post-refresh; corpus-1 too small to classify meaningfully in either snapshot).

## 2026-09-10 refresh update

Rejoined the identical method against `34531412380`'s output (`solver-corpus{1,2}-latest.json`, `stageLifecycle` from `--lifecycle-telemetry`).

**Full-corpus solve-set diff (old commit `92c3155` pre-refresh vs. new `92c3155` control run — same commit, same defaults, just a fresh level-blind solve):** corpus1 98→99 (+1, `R01407`), corpus2 975→1,029 (+54) — **55 gains, 0 losses** combined. The +54 on corpus2 lines up almost exactly with the two portal restorations' own matched-work A/B net effects (+52 must-cross-neighbor-budget-portal, +2 connectivity-volume-portal = +54), a clean full-population reproduction of narrower controlled results — real, if circumstantial, validation that those A/Bs generalize.

**Refreshed classification (unsolved corpus-2, n=671):**

| technique | eligible | exposed | unexposed | exposed, failed |
|---|---:|---:|---:|---:|
| `guidance-goal-distance-retry` | 671 (was "0", now fixed) | 671 | 0 | 671 |
| `late-repair-multiseed-retry` | 184 (was "0", now fixed) | 184 | 0 | 184 |
| `goal-attraction-disabled-retry` | 671 | 120 | **551** | 120 |
| `must-cross-neighbor-prune-disabled-retry` | 671 | 381 | **290** | 381 |
| `repair-fallback` | 487 | 436 | 51 | 436 |
| `admissible-order-fallback` | 671 | 671 | 0 | 671 (169 telemetry-mislabeled "starved," same artifact as before) |

**Notable non-finding, worth recording accurately rather than glossing over:** `goal-attraction-disabled-retry`'s raw `reached` count is **still exactly 120**, identical to the pre-refresh snapshot, even though this run already includes the 2026-09-10 fresh-work-pool promotion in its defaults. The *unexposed* count shrank only because the total unsolved population shrank (725→671, from the unrelated portal fixes), not because more levels newly reached this stage — the starvation *rate* is essentially unchanged (83.4%→82.1%). Likewise `must-cross-neighbor-prune-disabled-retry`'s `routing-skipped` count is unchanged at exactly 290 both times, consistent with that being a level-identity-determined structural condition unrelated to this week's portal fixes. Neither is a bug: the fresh-work-pool fix's own confirmation evidence was about work-quantity per dispatch on a reach-conditioned population, not the binary reached/unreached count this lifecycle field measures — but it means the aggregate "551 unexposed" here should not be read as "the fix didn't work," only as "this specific binary metric doesn't move the way a first glance might expect." A future pass wanting to see the fix's real aggregate effect should compare per-attempt `workSpent`/`allocatedWorkCeiling` distributions for this stage, not the reached/unexposed split.

Zero new stage-level surprises beyond the above; the flag-inert/repricing-candidate list and the admissible-order-fallback telemetry-artifact caution from the original pass both stand unchanged.

## Original (2026-09-04, pre-refresh) analysis, preserved for provenance

## Method

For every unsolved level, each stage's retained `stageLifecycle` record was classified as:

- **not mechanically eligible** — `mechanicallyEligible: false` (excluded by structural routing/configuration, e.g. no repair config in the ladder);
- **mechanically eligible, unexposed** — eligible but `reached: false` (never got a real dispatch);
- **exposed and failed** — eligible and `reached: true` on an unsolved level (got a real dispatch, level still unsolved).

This reuses the existing hand-maintained `instantiated`/`reached` telemetry (`orchestration.ts`'s `stageLifecycle` block) rather than re-deriving eligibility — per the standing rule, existing lifecycle/capability evidence should be mined before generating more.

## Known data-validity caveats (read before using these numbers)

1. **Two stages' `instantiated` field is stale in this exact snapshot.** `reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md` fixed `guidance-goal-distance-retry` and `late-repair-multiseed-retry`'s `mechanicallyEligible`/`instantiated` projection on 2026-09-09 — one day *after* this analysis's source run (`33841017634`, 2026-09-04). Both rows below show `eligible: 0` even though `guidance-goal-distance-retry` alone carries 28.9% of node share and 20.1% of work share on this population (from the retained failure-map summary) — i.e. the eligibility LABEL is wrong, but the underlying attempt/reach/work numbers are not. Treat both rows as **not classifiable** until rerun on post-fix telemetry.
2. **Portal restoration (2026-09-09/10) postdates this run.** `must-cross-neighbor-prune-disabled-retry`'s 290/725 unexposed count (below) is pre-`PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` promotion; expect it to shift.
3. **`goal-attraction-disabled-retry`'s fresh-work-pool fix (promoted 2026-09-10) directly targets its 605/725 unexposed count below.** This number is exactly the starvation the fix was built to close — it should shrink materially post-refresh, not stay a stable baseline.

## Corrected classification (unsolved corpus-2 levels, n=725)

| technique | eligible | not eligible (routing/config) | exposed (reached) | **eligible, unexposed** | **exposed, failed** |
|---|---:|---:|---:|---:|---:|
| main-ladder | 725 | 0 | 725 | 0 | 725 |
| admissible-order-fallback | 725 | 0 | 725 | 0 | 725¹ |
| admissible-order-alternate-tiebreak-retry | 725 | 0 | 725 | 0 | 725 |
| coarse-state-near-tie-retention-disabled-retry | 725 | 0 | 725 | 0 | 725 |
| connectivity-axis-prune-disabled-retry | 725 | 0 | 725 | 0 | 725 |
| **must-cross-neighbor-prune-disabled-retry** | 725 | 0 | 435 | **290** | 435 |
| **goal-attraction-disabled-retry** | 725 | 0 | 120 | **605** | 120 |
| early-repair-search | 538 | 187 | 538 | 0 | 538 |
| repair-fallback | 538 | 187 | 481 | **57** | 481 |
| late-repair-search | 187 | 538 | 187 | 0 | 187 |
| repair-elite-prefix-dfs-retry | 538 | 187 | 0 | **538²** | 0 |
| guidance-goal-distance-retry | — | — | 725 | not classifiable¹ | — |
| late-repair-multiseed-retry | — | — | 187 | not classifiable¹ | — |

¹ See finding below — `admissible-order-fallback`'s "exposed, failed" count of 725 already includes 156 levels the retained `starvedByWorkBudget` label separately (and misleadingly) flags as budget-starved; corrected here to their real classification.
² `repair-elite-prefix-dfs-retry`'s `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` flag is production **default-OFF** (already `CLOSED` in the opt-in ledger — "recovered zero levels at both tested budgets"). Its 538/538 unexposed count reflects the flag being off in this control run, not a resource-allocation failure — it is structurally present in the ladder plan but never dispatches. **Not a live allocation-failure finding**; excluded from the flag-inert candidates below.

Corpus-1 has only 4 unsolved levels — too small to classify meaningfully; corpus-2 is the population of record here, consistent with the workstream's own treatment of corpus-2 as primary.

## New finding: `admissible-order-fallback`'s "work-starved" label is a telemetry artifact, not missing exposure

Cross-checking `starvedByWorkBudget` against `actualWork`/`actualNodes` for every unsolved corpus-2 level: **all 156 levels the retained telemetry marks `starvedByWorkBudget: true` for `admissible-order-fallback` show substantial real work** (mean 15,092,235 `workSpent`, mean 12,500,190 nodes — not near-zero). Root cause: `stageLifecycle`'s `workStarvedAtDispatch` (`orchestration.ts:1992`) is computed from `attempt.allocatedWorkCeiling === 0`, a **pre-dispatch** snapshot. `admissibleOrderSearch` (the primitive both `admissible-order-fallback` and `admissible-order-alternate-tiebreak-retry` dispatch through) does not consult `prep._workCap` in its hot loop by default (see this session's own `2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md` and the newly-added `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` opt-in fix) — so a dispatch that reads `allocatedWorkCeiling: 0` still runs its **full node/ms allowance regardless**, exactly as `attempt-dispatch.ts`'s own comment on `budgetStarvedAtDispatch` already warns. `admissible-order-alternate-tiebreak-retry` shows zero such mislabeled rows in this population (its own reserve was never fully exhausted at dispatch time here), so the artifact is currently isolated to `admissible-order-fallback`.

**Implication for WS1/allocation decisions:** do not read `admissible-order-fallback`'s "starved" count as "give this stage more budget, it was cut short" — these 156 levels already received a full, uncapped attempt and still failed. That is a **capability** signature (reasoning/representation or search-policy), not an **allocation/exposure** one. Any future scheduler-repricing pass reading this label at face value would misclassify these 156 levels' evidence role.

## Flag-inert / repricing-candidate stages (task: identify for future equal-work repricing)

Among currently **default-ON, live-allocation-holding** stages (excluding `repair-elite-prefix-dfs-retry`, already closed and off):

- **Genuinely under-exposed by budget/reserve, not capability** (real repricing/allocation targets — refreshed 2026-09-10): `goal-attraction-disabled-retry` (551/671, essentially unchanged rate pre/post its own promotion — see "notable non-finding" above; a repricing case needs a work-distribution join, not this binary metric), `must-cross-neighbor-prune-disabled-retry` (290/671, unchanged count, structural not portal-related), `repair-fallback` (51/487, smaller and structurally gated by `hasRepairConfig` — lower priority).
- **Already flagged and tail-audited in the ledger — no new action from this pass:** `connectivity-axis-prune-disabled-retry` and `must-cross-neighbor-prune-disabled-retry`'s DFS-monopolization cost is already forensically confirmed (`reports/2026-09-04-whole-ladder-retry-tier-dfs-monopolization-forensic-note-001.md`); do not re-open without new evidence.
- **Freshly unblocked for repricing (this session):** `admissible-order-alternate-tiebreak-retry` — the ledger already names this "retain as baseline but reprice residual value," and today's `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` fix (see `docs/solver-opt-in-experiment-ledger.md`) removes the sole architectural blocker to actually testing a reduced allocation for it. This is the most actionable near-term repricing candidate: prerequisite done, confirmation not yet run.
- **Do not reprice on the "starved" label alone:** `admissible-order-fallback` (see finding above) — its cost is earning real, if unsuccessful, work; a repricing case for it needs a different argument (e.g. marginal-value/redundancy, not "it's starved").

## Residual-lane recompute readiness (task 5)

Attempted to recompute `reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md`'s "122 misses with an isolated winner (45 never offered / 77 offered but unresolved)" figure against current retained data using the existing `npm run solver:analyze-equal-work-production-reach` tool (`reports/stress/technique-niches/2026-09-03/level-capability.json` + `reports/stress/ew1/33156541827-pricing-snapshot.json` + current corpus1/2-latest). That tool runs cleanly (`decisionBearing: true`, 34 techniques, 51,231 matched attempts) but its EW1 snapshot only covers 60 levels/2,015 cells — far narrower than the full-corpus isolated-T1-winner join the 122-miss figure was built from, so it cannot reproduce or refresh that figure on its own. **The residual-lane recompute needs the same broader isolated-T1-winner technique-census join the original 122-miss figure used** (not this narrower EW1 pricing tool), rerun against the refreshed capability + technique-census snapshot once the in-flight run lands. Recorded here so the next session does not re-discover this tool-scope mismatch from scratch.

## What this does not establish

- Does not change production disposition of any stage.
- Does not recompute the residual-lane figures themselves (blocked on the broader join above, and on the in-flight capability refresh).
- Does not re-derive the DFS-monopolization or specialist-retention findings already in the ledger — only cross-references them.
