# Class-4 portal coarse-state-merge freshness replay 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — local in-process replay of 8 prespecified class-4 residual rows under `STRATEGY_PORTAL_COARSE_STATE_MERGE` (default-off), current code, and production-shaped work semantics.
> **Decision:** the September 9 positive basin is fresh, not stale. 8/8 sampled levels solved and were independently referee-valid (`Solver.validateCandidatePath`). This answers `WS2-CLASS4-PORTAL-COARSE-FRESHNESS` (docs/solver-research-question-relations.json) and the class-4 freshness gate in `docs/solver-optimization-workstreams.md`.
> **Remaining gate:** design and validate the least-disruptive changed-treatment exposure/allocation form (a dead-last additive whole-ladder retry, not a global merge-key change) before any promotion attempt. Do **not** reopen the globally-enabled merge form; the `R01273` control regression from the 2026-09-09 A/B still stands as a reason the *global* form stays closed.
> **Evidence role:** diagnostic freshness recovery. No solver-policy change; the flag remains default-off exactly as before this report.

## Why this sample

`docs/solver-optimization-workstreams.md`'s WS2 gate 1 asked to "replay a tiny prespecified sample of current class-4 portal coarse-state-merge nominations under the existing default-off treatment, current code and production-shaped work semantics," to answer only whether the basin still exists — not to promote or measure the full basin.

The 113-row class-4 nomination set was reconstructed from committed evidence (no solving): regenerated the corrected residual atlas (`node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- --baseline=reports/stress/capability-runs/34683011115/per-level-corpus2.json --lifecycle=reports/stress/capability-runs/34683011115/lifecycle-failure-map-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --hints-dir=data/stress/hints-random`, exactly reproducing `652` residual / `22/39/37/123/431`), then intersected its class-4 rows against the closed treatment's own committed 158-id referee-valid gain set (`data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt`) — reproducing the reconciliation report's own `113/123` class-4 count exactly.

The 113 rows split `88` intersection-heavy / `11` multi-portal / `14` must-cross-heavy by routing regime. Sample selection was prespecified before running: proportional-stratified, 4 intersection-heavy + 2 multi-portal + 2 must-cross-heavy, evenly spaced by sorted id within each stratum (deterministic, not cherry-picked toward a favorable outcome):

`R00082, R02173, R02807, R03365` (intersection-heavy), `R00466, R03228` (multi-portal), `R00329, R03303` (must-cross-heavy).

## Method

New tool: `scripts/stress/class4-portal-freshness-replay.mjs`. For each sampled id, solved locally with `{ ...defaultConfig(), STRATEGY_PORTAL_COARSE_STATE_MERGE: true }` and production-matched work semantics — `nodeBudget: 50000000, workBudget: 67000000, timeBudgetMs: 86400000, schedulerMode: 'production'` — the exact tuple matching the current production boundary run's own dispatch inputs (`corpus2_node_budget=50,000,000`, `strict_total_work_budget=false`), and the same convention `scripts/stress/verify-joint-obligation-ab-gains.mjs` already established for this kind of local reproduction. Every solve was independently checked through the canonical referee (`Solver.validateCandidatePath`).

## Result

| id | routing regime | result | nodesExpanded |
|---|---|---|---:|
| R00082 | intersection-heavy | SOLVED, referee-valid | 5,859,799 |
| R02173 | intersection-heavy | SOLVED, referee-valid | 347,450 |
| R02807 | intersection-heavy | SOLVED, referee-valid | 6,651,638 |
| R03365 | intersection-heavy | SOLVED, referee-valid | 101,313,315 |
| R00466 | multi-portal | SOLVED, referee-valid | 33,526,924 |
| R03228 | multi-portal | SOLVED, referee-valid | 33,779,697 |
| R00329 | must-cross-heavy | SOLVED, referee-valid | 6,517,305 |
| R03303 | must-cross-heavy | SOLVED, referee-valid | 18,648,599 |

**8/8 solved, 8/8 referee-valid**, across all three represented routing regimes. (Several `nodesExpanded` values exceed the nominal 50,000,000 `nodeBudget` — expected and correct: the production ladder stacks several additive per-tier node reserves on top of the base budget, per `stage-budget-core.ts`'s own documented design, so a full solve's total node count legitimately exceeds any single stage's reserve.)

This is a clean, unambiguous positive: no evidence of decay in the roughly one week since the original A/B. A larger confirmatory population is not needed to answer the freshness question itself — 100% fresh on a stratified sample spanning every routing regime this population contains is already decisive for "does the basin still exist." A bigger population read only becomes necessary if/when sizing a specific allocation-form's expected yield.

## Next gate

Per the workstream doc, the closed *global* merge-key form stays closed (`R01273` regression, root-caused in `reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md` as an ordinary coarse-merge collision risk, not a portal-pair aliasing bug). The live next question is a **least-disruptive changed-treatment exposure/allocation form** that exposes this fresh capability without risking any currently-solving level.

Candidate design (not yet implemented, to avoid a concurrent edit collision with the in-flight class-2 must-turn-biased late-repair-probe work touching the same file this session): a **dead-last additive whole-ladder retry** — the same `runWholeLadderRetryTier`/`proxyOverrides` pattern `orchestration-additive-retry-tiers.ts` already uses for `must-cross-neighbor-prune-disabled-retry`, `connectivity-axis-exhausted-retry`, and `guidance-goal-distance-retry` — reusing `proxyOverrides: { STRATEGY_PORTAL_COARSE_STATE_MERGE: true }`, positioned after every currently-promoted tier including `must-cross-neighbor-prune-disabled-retry` (the tier that already independently rescues `R01273` today — see `reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md`'s "Finding 2"). Because every additive tier in this file is gated on `!result.solution`, a level that already solves via any earlier tier structurally never reaches a new dead-last one — `R01273` (and any other currently-solving level) cannot regress by construction, unlike the closed global form which changed the merge key inside the *primary* beam search every portal level goes through. This is the next implementation task once the file is free of the concurrent class-2 edit.
