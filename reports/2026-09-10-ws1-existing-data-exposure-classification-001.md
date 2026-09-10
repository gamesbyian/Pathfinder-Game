# WS1 existing-data exposure classification 001: mechanically-eligible-unexposed vs. exposed-and-failed

> **Status:** active
> **Last evidence:** 2026-09-10 — direct join of retained `stageLifecycle` telemetry from run `33841017634` (2026-09-04, pre-portal-restoration, pre-lifecycle-instantiation-fix) against `reports/stress/solver-corpus2-latest.json`/`solver-corpus1-latest.json`
> **Decision:** the eligible/exposed/failed split below is directionally trustworthy for most stages and reproduces known ledger numbers exactly (`goal-attraction-disabled-retry` 605/725 starved matches the ledger's own figure), but two stages' `instantiated` field is known-stale (see below) and every count reflects pre-portal-restoration, pre-goal-attraction-fresh-pool production defaults. **Do not treat any count here as current production truth** — rerun this exact join against GHA run `34531412380` (in flight at write time) once it lands, per this workstream's own "refresh the target cohort" gate.
> **Remaining gate:** rerun against the refreshed capability run; then feed corrected `goal-attraction-disabled-retry`/`must-cross-neighbor-prune-disabled-retry` exposure counts into the priced residual-lane recompute.
> **Evidence role:** discovery
> **Selection:** observational — full corpus-2 unsolved population (725/1,700) plus corpus-1 (4 unsolved), no sampling.

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

- **Genuinely under-exposed by budget/reserve, not capability** (real repricing/allocation targets once refreshed): `goal-attraction-disabled-retry` (605/725, actively being fixed by the 2026-09-10 promotion — re-measure, don't reprice further until the fix's effect is seen), `must-cross-neighbor-prune-disabled-retry` (290/725, pre-portal-restoration — re-measure post-refresh before any repricing), `repair-fallback` (57/725, smaller and structurally gated by `hasRepairConfig` — lower priority).
- **Already flagged and tail-audited in the ledger — no new action from this pass:** `connectivity-axis-prune-disabled-retry` and `must-cross-neighbor-prune-disabled-retry`'s DFS-monopolization cost is already forensically confirmed (`reports/2026-09-04-whole-ladder-retry-tier-dfs-monopolization-forensic-note-001.md`); do not re-open without new evidence.
- **Freshly unblocked for repricing (this session):** `admissible-order-alternate-tiebreak-retry` — the ledger already names this "retain as baseline but reprice residual value," and today's `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` fix (see `docs/solver-opt-in-experiment-ledger.md`) removes the sole architectural blocker to actually testing a reduced allocation for it. This is the most actionable near-term repricing candidate: prerequisite done, confirmation not yet run.
- **Do not reprice on the "starved" label alone:** `admissible-order-fallback` (see finding above) — its cost is earning real, if unsuccessful, work; a repricing case for it needs a different argument (e.g. marginal-value/redundancy, not "it's starved").

## Residual-lane recompute readiness (task 5)

Attempted to recompute `reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md`'s "122 misses with an isolated winner (45 never offered / 77 offered but unresolved)" figure against current retained data using the existing `npm run solver:analyze-equal-work-production-reach` tool (`reports/stress/technique-niches/2026-09-03/level-capability.json` + `reports/stress/ew1/33156541827-pricing-snapshot.json` + current corpus1/2-latest). That tool runs cleanly (`decisionBearing: true`, 34 techniques, 51,231 matched attempts) but its EW1 snapshot only covers 60 levels/2,015 cells — far narrower than the full-corpus isolated-T1-winner join the 122-miss figure was built from, so it cannot reproduce or refresh that figure on its own. **The residual-lane recompute needs the same broader isolated-T1-winner technique-census join the original 122-miss figure used** (not this narrower EW1 pricing tool), rerun against the refreshed capability + technique-census snapshot once the in-flight run lands. Recorded here so the next session does not re-discover this tool-scope mismatch from scratch.

## What this does not establish

- Does not change production disposition of any stage.
- Does not recompute the residual-lane figures themselves (blocked on the broader join above, and on the in-flight capability refresh).
- Does not re-derive the DFS-monopolization or specialist-retention findings already in the ledger — only cross-references them.
