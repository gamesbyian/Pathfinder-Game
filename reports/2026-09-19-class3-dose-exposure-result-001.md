# Class-3 exact-action dose acquisition result

> **Status:** inconclusive
> **Last evidence:** 2026-09-19 — targeted sweep run `35465898521` (53-level shared-production sweep: 23-parent frozen Class-3 population + 30-parent solved-control sample, `node_budget=50000000`, `enable=none`/`disable=none`, commit `22c32a88af3fa515b79b49007c24b5a5041e2667`).
> **Decision:** the population-level acquisition succeeded exactly as specified (23/23 Class-3 parents present, terminal status confirmed), but the **exact-action dose classification cannot be mechanically computed** for this run: the standard `pathfinder-compact-failure-response.json` artifact this workflow publishes is inaccessible from this sandboxed environment (GitHub Actions artifact downloads redirect to an Azure blob-storage host that this session's egress policy blocks with a 403, and this workflow does not commit a durable copy to the repository — traced precisely, see below). `scripts/analyze-class3-dose-exposure.mjs` was not run. All 23 Class-3 rescuer classifications are reported as `indeterminate` at the exact-action level, not reclassified to any other bucket.
> **Remaining gate:** obtain the raw compact-failure-response.json for run `35465898521` through a channel this environment can reach (e.g. a maintained CI step that commits/attaches it durably in the repo, or a future session with different egress permissions), then run `npm run research:analyze-class3-dose -- --in=<path> --expectations=reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json --out=reports/stress/failure-evidence/class3-dose-analysis-2026-09-19.json` exactly as the preflight specifies. The population is already correctly captured by this run; no new solver compute is required to close this gate, only artifact retrieval.
> **Research question:** `WS2-CLASS3-DOSE-EXPOSURE`
> **Evidence role:** acquisition result + explicit tooling-gap report, not the mechanical dose classification the preflight requires.

## What ran, and what it confirms at the population level

Run `35465898521` dispatched the exact frozen population from `reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json` (23 Class-3 parents) plus the 30-parent solved-control sample from `reports/stress/failure-evidence/ws2-reconnaissance-solved-control-sample-2026-09-19.json`, under the production-boundary-matching protocol (`node_budget=50000000`, no enable/disable flags, matching the `35066677597` production-boundary protocol per the dispatch instructions). All 16 shards completed successfully; no auto-recovery was needed (population was complete on the first pass).

The `combine-final` job's own printed summary (job id `105960180743`, step "Publish standard solver sweep result") reports the compact-failure-response document's own summary counts directly:

```
Failure-evidence disposition: compact (compact records: 53,
  {"solved":30,"exhaustedNegative":0,"nodeLimited":23,"workLimited":0,
   "deadlineTruncated":0,"harnessError":0,"malformed":0,"missing":0,"unknown":0})
```

Cross-checked against the job's own solved/unsolved id lists (also printed to the log, "Print a solved-count summary" step) against the frozen population files with an exact set comparison:

- The 23 unsolved ids (`status=node-budget-reached` for all 23, no exceptions) are **exactly** the 23 frozen Class-3 parent ids — no drift, no unexpected addition/removal.
- The 30 solved ids are **exactly** the 30 frozen solved-control ids — every solved-control parent solved again under this protocol; none regressed.
- **No new cold solve occurred on a previously-residual Class-3 id.** This is the single most important correctness check for this run and it is clean: 0/23 Class-3 parents solved.

This confirms the population/protocol side of acquisition is sound and matches the frozen expectations exactly. It does **not** by itself answer the dose question, which requires exact-action (`actionKey`) participation/work/censoring per rescuer, not just parent-level pass/fail.

## Why the exact-action classification could not run

Tracing precisely, per the dispatching instructions:

1. `.github/workflows/solver-level-blind-targeted-sweep.yml`'s own header comment states this workflow is **artifact-only by design**: "never commits to main... this is diagnostic evidence for a specific question, not a baseline-shaping run." Grepping the whole file for `git commit`, `git push`, and `create-pull-request` finds nothing — there is no durable-evidence-closeout step in this workflow, unlike some other workflows in this repo.
2. `scripts/sweep-publish.mjs` (invoked as `node scripts/sweep-publish.mjs --failure-in=p ...` in the `combine-final` job) writes the compact-failure-response document to the runner's local `logs/solver-sweep-result/` directory and then calls `scripts/publish-solver-sweep-result.mjs`, which copies it into the same directory. That directory is then uploaded as the `solver-sweep-result` GitHub Actions artifact (`actions/upload-artifact@v7`) — never committed to git.
3. Both `npm run gha:fetch-result -- --run=35465898521` (which shells out to `gh run download`) and the MCP `download_workflow_run_artifact` call resolve to a signed URL on `productionresultssa*.blob.core.windows.net`. Both attempts failed: the `gh` CLI call returned `Get "https://productionresultssa11.blob.core.windows.net/...": Forbidden`, and the proxy's own diagnostic endpoint (`/__agentproxy/status`) independently recorded two `connect_rejected` entries for this exact run's blob hosts (`productionresultssa8`/`productionresultssa9`/`productionresultssa11.blob.core.windows.net`, `gateway answered 403 to CONNECT (policy denial or upstream failure)`) at timestamps matching these attempts. This matches the task's own stated expectation and is a hard organizational egress-policy denial, not a bug to route around.
4. `scripts/summarize-targeted-sweep-work.mjs` (already used by this workflow specifically because of this exact constraint — its own header comment names this class of blocked-egress environment) prints per-stage, and for 3 hardcoded stage names, per-level detail directly to the job log, which **is** retrievable (job logs go through the GitHub REST logs API, not blob storage). This recovers substantial but incomplete evidence: see below. It does not recover the raw per-parent `attempts[].actionKey` records the dose script needs, because those three hardcoded stage names (`admissible-order-alternate-tiebreak-retry`, `admissible-order-fallback`, `connectivity-axis-prune-disabled-retry`) do not enumerate all technique families in the Class-3 rescuer set (`repair` guidance variants, `beam` configurations are not named stages in this print, and the two admissible-order stage names cannot be reliably mapped to the frozen expectation's exact `admissible-order|tieBreak=none|lds=off` identity without guessing).

Given the preflight's own explicit prohibition against exactly this kind of manual family/stage-name inference ("A repair-family stage reaching millions of nodes does not prove that a particular repair guidance configuration received comparable work" — dose reconciliation report, 2026-09-17), this report does **not** attempt to hand-classify the 23 Class-3 rescuers from the partial stage-name evidence below. It is reported as directionally suggestive context only.

## Directionally suggestive (non-mechanical) stage-level evidence

For the record, because it may usefully inform whether this is worth re-acquiring: the job log's per-level detail for the 3 hardcoded stages shows, for every one of the 23 Class-3 parents (no exceptions):

| stage | Class-3 reach | attempts/parent | nodesExpanded/parent | Class-3 solves | solved-control reach |
|---|---:|---:|---:|---:|---:|
| `admissible-order-fallback` | 23/23 | 1 | ~12.5M | 0 | 3/30 (1 solved there) |
| `admissible-order-alternate-tiebreak-retry` | 23/23 | 1 | ~12.5M | 0 | 1/30 (solved there) |
| `connectivity-axis-prune-disabled-retry` | 23/23 | 5-20 | ~25M (≈half the 50M node budget) | 0 | 0/30 |

Every Class-3 parent reached and received real, measurable, non-trivial dose in every one of these three late-fallback stages — none show non-participation or near-zero dose at the *stage* level. This is consistent with (though does not mechanically prove) the "censored-dose, not exposure-gap" interpretation the preflight names, and inconsistent with a picture where known rescuers simply never ran. The near-total absence of solved-control reach at these same stages is expected ladder structure (solved parents solve earlier and never fall through to late fallback stages), not itself an exposure anomaly — the preflight's routing logic already anticipates this asymmetry is not automatically diagnostic.

## Parent-level disposition (per the preflight's stop condition)

Per parent, what is known and unknown:

- **Exact rescuer participation:** unknown (indeterminate) — requires the raw JSON.
- **Work/node dose per rescuer:** unknown (indeterminate) — requires the raw JSON.
- **Termination/censoring at the parent level:** known — all 23 are `node-budget-reached` (censored by the node ceiling), 0 are `exhausted-negative`, 0 `work-limited`, 0 `deadline-truncated`, 0 `harness-error`.
- **Disposition:** none of the 23 parents can be assigned a final disposition (exposure-gap / censored-dose / exhausted-negative / refreshed-current-solve) at the exact-rescuer level from what is retrievable here. All 23 are recorded as `indeterminate` per this preflight's own rule: "Error/unknown-only attempts stay indeterminate rather than being converted into negative evidence."

## Classification breakdown (23 Class-3 rows)

| classification | count |
|---|---:|
| `exact-not-participated` | 0 |
| `exact-participated-dose-unknown` | 0 |
| `exact-participated-censored` | 0 |
| `exact-participated-exhausted-negative` | 0 |
| `exact-participated-solved` | 0 |
| `indeterminate` (artifact inaccessible) | 23 |

This is an honest non-answer, not a silent reclassification: per the hard constraint governing this work, "do not silently reclassifying" on drift — the population itself has not drifted (23/23 confirmed), only the mechanical per-rescuer classification is blocked.

## No new cold solve

**None.** 0/23 Class-3 parents solved in this run; all 30 solved-controls solved again. There is no promotion-adjacent finding here.

## Recommendation

This is a tooling/access gap, not a scientific finding, and is flagged for a human/orchestrator decision rather than resolved unilaterally (no new solver compute was launched to work around it). Two concrete remedies, in order of preference:

1. Add a durable-evidence-closeout step to `solver-level-blind-targeted-sweep.yml` (matching whatever convention other workflows in this repo already use) that commits or PRs the compact-failure-response document into `reports/stress/...`, the way the D1 Stage-2 capture and other decision-bearing evidence already do. This closes the gap for every future sandboxed session, not just this one.
2. If (1) is not adopted, re-run this same analysis from a session/environment whose egress policy allows the `*.blob.core.windows.net` artifact-download hosts, using this run's id (`35465898521`) directly — no new solver compute is needed, only artifact retrieval.
