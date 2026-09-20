# WS2 failure-response reconnaissance Stage-A result

> **Status:** inconclusive
> **Last evidence:** 2026-09-19 — targeted sweep run `35465898521` (53-level shared-production sweep: 23-parent Class-3 residual population + 30-parent solved-control sample, `node_budget=50000000`, `enable=none`/`disable=none`, commit `22c32a88af3fa515b79b49007c24b5a5041e2667`).
> **Decision:** Stage A is data-incomplete for a confident A1/A3 call: the raw compact-failure-response.json is inaccessible in this environment (see companion report `2026-09-19-class3-dose-exposure-result-001.md` for the precise trace), so full action/stage participation and dose by action/stage (preflight items 4-5) could not be produced for all techniques, only for 3 hardcoded stages the job log happens to print at per-level granularity. What that partial evidence shows is best explained by expected residual/solved-control ladder structure (residual parents mechanically fall through to late fallback stages; solved parents mechanically do not reach them), not a clean allocation/exposure anomaly. Per the preflight's own screening discipline, this is reported as **unresolved** rather than forced into A1/A3.
> **Remaining gate:** either (a) obtain the full compact-failure-response.json for this run (or a future protocol-compatible run) through a channel this sandbox can reach, and re-run the complete Stage-A checklist with full action/stage granularity, or (b) if a human/orchestrator wants to proceed without it, explicitly authorize and mechanically freeze a Stage-B compact-diagnostics population per the preflight's Stage-B rules — this report does not do so unilaterally.
> **Research question:** `WS2-FAILURE-RESPONSE-RECONNAISSANCE`
> **Evidence role:** routing screen, per the preflight (`reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-preflight-001.md`) — not a hypothesis test.

## Eligible input and population

Standard `pathfinder-compact-failure-response` document, protocol `solver-level-blind-targeted-sweep.yml` @ commit `22c32a88af3fa515b79b49007c24b5a5041e2667`, run `35465898521`. Population: 53 records (23 Class-3 residual + 30 solved-control), 0 missing, 0 malformed, 0 harness-error, 0 deadline-truncated, single protocol/solver identity throughout (confirmed complete per the job's own printed "Population coverage: 53/53 observed; 0 missing-indeterminate; complete" and "Decision-valid observations: complete").

This is the first eligible producer the readiness audit (`reports/2026-09-19-ws2-failure-response-reconnaissance-readiness-audit-001.md`) was waiting for: a maintained producer emitting the standard compact response over a current-boundary population that includes solved controls.

**Access caveat governing everything below:** the raw JSON document itself could not be retrieved (GitHub Actions artifact downloads for this run redirect to an Azure blob-storage host this sandbox's egress policy blocks with 403; this workflow does not commit a durable copy — traced precisely in the companion Class-3 report). All figures below are recovered from the `combine-final` job's own log output (fetched via the GitHub REST logs API, which is not blob-storage-gated), specifically the compact-response summary counts the publish step printed, and `scripts/summarize-targeted-sweep-work.mjs`'s population-wide per-stage table plus its per-level detail for exactly 3 hardcoded stage names. This is **less** than the full compact-response document: it has no `actionKey` field, and only 3 of the ~13 observed stage identities have per-level (parent-level) granularity — the rest are population-wide aggregates only, not split by residual vs. solved-control.

## Stage-A checklist, as far as available evidence supports it

**1. Population coverage and missingness:** complete, 53/53, 0 missing/malformed/harness-error/deadline-truncated (see above).

**2. Solved / non-solved parent counts:** 30 solved / 23 non-solved. Exact-set verification against the frozen population files confirms the 30 solved ids are precisely the 30 frozen solved-control ids and the 23 non-solved ids are precisely the 23 frozen Class-3 ids — no drift, no cross-contamination, and **no new cold solve on a previously-residual id** (flagged per the task's own instruction to flag this loudly if it happened; it did not).

**3. Parent terminal composition:**

| composition | count |
|---|---:|
| exhausted negative | 0 |
| node-limited | 23 (all 23 Class-3 parents, status `node-budget-reached`) |
| work-limited | 0 |
| deadline-truncated | 0 |
| harness/malformed/missing/unknown | 0 |

Every non-solved parent is uniformly node-limited; none exhausted cleanly. This is informative on its own: it rules out a population where residual failures are heterogeneous (some exhausted, some censored, some errored) — the residual population is homogeneously ceiling-bound at this budget.

**4. Action/stage participation and reach:** only partially available. Population-wide (all 53, not split residual-vs-control):

| stage | reach | attempts | solves | nodesExpanded |
|---|---:|---:|---:|---:|
| `main-search` | 48/53 | 306 | 19 | 1,040,312,366 |
| `early-repair-search` | 34/53 | 84 | 5 | 177,734,540 |
| `goal-attraction-disabled-retry` | 29/53 | 226 | 3 | 27,861,603 |
| `admissible-order-fallback` | 26/53 | 26 | 1 | 319,128,824 |
| `coarse-state-near-tie-retention-disabled-retry` | 25/53 | 202 | 1 | 301,716,303 |
| `admissible-order-alternate-tiebreak-retry` | 24/53 | 24 | 1 | 287,637,132 |
| `connectivity-axis-prune-disabled-retry` | 23/53 | 189 | 0 | 574,999,435 |
| `guidance-goal-distance-retry` | 23/53 | 189 | 0 | 1,190,473,368 |
| `repair-fallback` | 22/53 | 22 | 0 | 83,101,038 |
| `portal-coarse-state-merge-dead-last-retry` | 19/53 | 157 | 0 | 775,407,032 |
| `must-cross-neighbor-prune-disabled-retry` | 15/53 | 128 | 0 | 611,958,828 |
| `late-repair-multiseed-retry` | 2/53 | 14 | 0 | 69,999,614 |
| `late-repair-search` | 2/53 | 2 | 0 | 9,999,592 |

All 30 solves are accounted for across `main-search` (19), `early-repair-search` (5), `goal-attraction-disabled-retry` (3), `admissible-order-fallback` (1), `coarse-state-near-tie-retention-disabled-retry` (1), `admissible-order-alternate-tiebreak-retry` (1) — sums to 30. Six late-ladder stages solved zero levels population-wide in this run (`connectivity-axis-prune-disabled-retry`, `guidance-goal-distance-retry`, `repair-fallback`, `portal-coarse-state-merge-dead-last-retry`, `must-cross-neighbor-prune-disabled-retry`, `late-repair-*`), but this is population-wide and not split by residual/control, so it cannot by itself distinguish "these techniques are broadly weak" from "these techniques never got a fair, comparable-work shot on the residual population specifically."

Per-level (parent-level) detail is available for exactly 3 stages:

| stage | Class-3 (23) reach | Class-3 attempts/parent | Class-3 nodesExpanded/parent | Class-3 solves | solved-control (30) reach |
|---|---:|---:|---:|---:|---:|
| `admissible-order-fallback` | 23/23 | 1 | ~12.5M | 0 | 3/30 |
| `admissible-order-alternate-tiebreak-retry` | 23/23 | 1 | ~12.5M | 0 | 1/30 |
| `connectivity-axis-prune-disabled-retry` | 23/23 | 5-20 | ~25M (≈half the 50M node ceiling) | 0 | 0/30 |

**5. Exact-attempt work/node dose by action and stage:** not available at the exact-action level (no `actionKey` field in what was recoverable); stage-level dose for the 3 named stages is in the table above (count/median/min/max by action is not computable without the raw per-attempt array — only per-parent totals for those 3 stages are known).

**6. Solved parents containing failed attempts:** partially visible — e.g. `R02052` and `R02110` (both solved-control) each show a non-solving attempt at `admissible-order-fallback` before solving via a different stage (`coarse-state-near-tie-retention-disabled-retry` for R02052, per the population-wide solve list). A full "solved-with-failed-attempt" count requires the full attempts array and was not computed.

**7. Badness support:** not reported by this reduced view; not available.

**8. Protocol partitions / unknown identity:** single protocol and solver identity throughout (one dispatch, one commit); no mixing.

## Interpretation

The 3-stage per-level table shows a stark asymmetry: 100% Class-3 reach with real, multi-attempt, substantial dose (up to ~half the total node budget in `connectivity-axis-prune-disabled-retry` alone) and zero solves, versus near-zero solved-control reach at those same stages. Read naively this could suggest an allocation/exposure concentration (A1's "recurrent work/node censoring before meaningful dose"). But per the preflight's own routing discipline, this asymmetry has an entirely mechanical, non-adverse explanation available: parents that solve early (via `main-search` or an early retry stage) never need to fall through to these late fallback stages by construction, so solved-controls trivially cannot show comparable reach there — this is not evidence they were denied dose, it is evidence they didn't need it. The preflight explicitly warns against treating this kind of structural non-participation as an adverse signal ("Never infer an unreported zero. Configured-but-unreached is not exposed-and-failed") and against promoting a pattern to "adverse mechanism" status without a genuine comparable-condition contrast in solved controls, which this population structurally cannot supply for late-ladder stages.

At the same time, the evidence gap is real and material: 10 of ~13 observed stages (including every `repair`/`beam`-family identity from the Class-3 rescuer set) have no per-level split at all in what is recoverable here, so a genuine producer/consumer concentration in one of those stages cannot be ruled in or out. The population-wide "six late stages solved nothing" pattern is suggestive but, without the residual/control split, cannot be attributed specifically to the residual population versus being uniformly weak techniques in this run.

Per A2: "If participation/dose/censoring are broadly comparable across failed and solved controls, or the automatic compact fields simply do not localize the difference, do not jump directly to a treatment." Here the automatic compact fields — as far as this reduced, log-recovered view can see — do not cleanly localize a producer/consumer pair independent of the mechanical solved-early/fails-late structure, and a materially large share of the requested Stage-A evidence (exact-action dose, full per-stage residual/control split, badness support) is simply unavailable due to the artifact-access gap, not because it was checked and found absent. That is a materially different epistemic state from "checked and comparable" (which would route A3) or "checked and concentrated" (A1) — it is genuinely unresolved.

## Screening-discipline disclosure

- Numerator/denominator for the one nominable contrast (late-stage reach): 23/23 Class-3 vs 0-3/30 solved-control, reported above per stage.
- Protocol/solver identity: single, as stated.
- Missing/censored counts: 0 missing; 23/23 Class-3 censored (node-budget-reached) at the parent level; per-action censoring unknown.
- Exact action/stage/reason identity: stage-level only (3 of ~13 stages), no action-level identity recovered.
- Prespecified vs. exploratory: the 3 highlighted stages were **not selected by this report** — they are hardcoded into the workflow's own `summarize-targeted-sweep-work.mjs --stage=` invocation (a prior repository decision, unrelated to this run's outcomes), so their selection is prespecified relative to this analysis, but their coverage is incomplete relative to what the preflight actually asks for.

## Route

Given genuine and material missingness in the required Stage-A evidence (not merely a null result), and given the observed asymmetry has a plausible non-adverse structural explanation that the available data cannot rule out or confirm, this does not meet the bar for A1 (concentrated allocation signal), A3 (clean absence of signal), or a confident B-stage selection. Per the hard constraint governing this work, Stage B is not unilaterally launched here.

route: unresolved-needs-compact-diagnostics
