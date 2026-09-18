# WS2 post-D1 discriminator: work-ladder zero-compute reuse, and a confirmation-slice preflight

> **Status:** active
> **Last evidence:** 2026-09-18 — zero-new-compute reconciliation of already-committed artifacts against the current production boundary (`35066677597` @ `16114b80`, current HEAD). No new solver compute in this pass.
> **Decision:** reusing the already-committed 2026-07-29 high-budget sweep (`reports/stress/highbudget-unsolved-sweep-corpus2-2026-07-24.json`, commit `d0f29e93`) against the current 531-row residual finds **0/483 solved** even at up to 1.2B nodes (~5x current production's typical per-level ceiling), with 449/483 cleanly exhausting that budget (`node-budget-reached`, not a wall-clock/infra timeout). This is real, decision-relevant evidence against "simply underdosed" for the bulk of the current residual, but it is confounded by a ~7-week-old commit and by that sweep's own history-aware (`--resume`/`--save-hints`) execution mode -- neither clean enough to close the work-ladder question on its own.
> **Remaining gate:** a small, level-blind, current-commit confirmation slice (precommitted below, not yet dispatched as of this report) is required before the work-ladder instrument can be called closed or positive for WS2-POST-D1-DISCRIMINATOR.
> **Evidence role:** discovery (reuse of a pre-existing, differently-purposed artifact) for the reuse finding; the confirmation slice below is precommitted (population/budgets/decision rule fixed before dispatch) and will be confirmation once run.
> **Population identity:** current 531-row Class 1-5 residual, production run `35066677597` @ `16114b80` (`docs/solver-optimization-workstreams.md`'s boundary). The confirmation slice further narrows to a deterministic 20-id sample (below).

## Why this ran

`docs/solver-optimization-workstreams.md`'s WS2 gate closed D1 negative and named four candidate "smallest live discriminators": work-ladder (absent-vs-underdosed capability), operational divergence (distinct failure basins), rejection counterfactuals (retention boundaries), and a 2x2 interaction (producer/consumer pair). Per standing research rules ("prefer the cheapest information-value test" and "use current research-data/status tooling to verify no retained asset already contains the required decision context" before new collection, the same Stage-0 discipline D1's own preflight used), this pass first checked whether work-ladder evidence for the *current* residual already exists in committed artifacts before proposing any new GHA campaign.

## What was checked

- `reports/stress/capability-runs/35066677597/per-level-corpus2.json`: the 531 current residual ids (all `status: node-budget-reached`, current production ceiling: nodesExpanded p10/p50/p90 = 177.3M / 233.2M / 263.7M -- current production already runs a fairly narrow, large per-level node ceiling, not a small one).
- `logs/solver-stress-refresh/corpus2-runtime-telemetry.json`: per-id EMA runtime telemetry left behind by the (one-time) 2026-07-29 `solver-highbudget-unsolved-sweep.yml` dispatch, recording each tested id's `lastNodeBudget`/`lastNodesExpanded`.
- `reports/stress/highbudget-unsolved-sweep-corpus2-2026-07-24.json`: that dispatch's own combined per-level result (`ok`/`status`), commit `d0f29e93` (2026-07-29), `portfolio-solve-sweep.mjs --scheduler-mode=production --resume --save-hints` (history-aware, not level-blind).

Only one commit in git history (`f5e2681`) ever touched this result file: the workflow's *code* was edited many times afterward (raising its default `node_budget`, adding gap-fill), but it was only actually dispatched-and-committed once. There is therefore no free multi-tier ladder inside this one artifact -- only a single high-budget snapshot per id, at whichever of two budgets (`300000000` or `1200000000`) that id's shard resolved to.

## Result: zero-compute reconciliation

Intersecting the current 531-row residual against that snapshot's ids:

| | Count |
|---|---:|
| Current residual (`35066677597`) | 531 |
| ...also present in the 2026-07-29 high-budget snapshot | 483 (91.0%) |
| ...of those, solved at high budget | **0** |
| ...tested at `node_budget=300,000,000` | 26 |
| ...tested at `node_budget=1,200,000,000` | 457 |
| ...cleanly exhausted their full node budget (`status=node-budget-reached`) | 449 |
| ...hit an infra/wall-clock timeout before exhausting node budget (censored) | 34 |

**0/483 solved**, and 449 of those genuinely burned through up to 1.2 billion nodes (roughly 5x current production's own ~233M-node typical ceiling) without finding a solution -- not merely running out of wall-clock time. This is real, free, decision-relevant signal: on this large overlap, escalating raw node budget by ~5x did not recover any current residual level, which argues against "simply underdosed" as the dominant explanation for the current Class-5-heavy residual.

## Why this does not close the question yet

Two confounds keep this from being a clean current-capability confirmation:

1. **Commit drift.** The high-budget snapshot ran at `d0f29e93` (2026-07-29); the current residual boundary is `16114b80` (2026-09-16) -- about seven weeks and many commits apart, including the Class-4 dead-last-retry promotion and various correctness/repair changes. A ~7-week-old solver snapshot failing at 5x budget does not by itself establish that *today's* solver would also fail at 5x budget; it only establishes that an earlier snapshot did.
2. **History-aware execution.** `solver-highbudget-unsolved-sweep.yml` runs `portfolio-solve-sweep.mjs` with `--resume --save-hints`: saved hints and prior partial solutions are legitimate inputs there, per `docs/solver-level-blindness.md`. That is appropriate for that workflow's own purpose (finding real hints to harvest), but it means this is not a clean level-blind "current algorithm, more budget, nothing else" test.

Per this repo's evidence-role discipline, a finding built on a differently-purposed, confounded artifact is discovery/context, not confirmation. It is strong enough to avoid dispatching a large, speculative fresh work-ladder campaign (the prior probability of a positive underdose finding is now low), but not strong enough to close WS2-POST-D1-DISCRIMINATOR's work-ladder branch outright.

## Precommitted confirmation slice

Before any new solver compute runs or is inspected, this section freezes the population, instrument, budgets, and decision rule.

**Instrument:** `.github/workflows/solver-level-blind-targeted-sweep.yml` (`scripts/level-blind-capability-sweep.mjs` entrypoint) -- explicit id list, level-blind (no hints, no prior solution, no historical status reach the solve), artifact-only (no baseline/main mutation), matching the "generic cold procedure" boundary this program requires.

**Population:** a deterministic 20-id sample, evenly spaced (by sorted id, stride = floor(449/20)) over the 449 current-residual ids that (a) are in the current 531-row residual, (b) were tested by the 2026-07-29 snapshot at `node_budget=1,200,000,000`, and (c) cleanly exhausted that budget (`status=node-budget-reached`, not a censored timeout). Selection is level-blind with respect to outcome: every eligible id shares the identical prior outcome (unsolved, budget-exhausted), so there is no outcome-based cherry-pick available; the stride-sample only controls for possible ordering artifacts.

```
R00044,R00512,R01000,R01380,R01718,R02035,R02144,R02215,R02309,R02404,
R02473,R02588,R02661,R02774,R02880,R02974,R03046,R03129,R03194,R03276
```

**Budgets (work-ladder tiers, identical population at each):**

1. `node_budget=300,000,000` -- near current production's own typical per-level ceiling (p50 233M / p90 264M on the current residual); a parity/sanity tier expected to reproduce non-solves under the current commit.
2. `node_budget=1,200,000,000` -- matches the 2026-07-29 snapshot's own high tier exactly, for direct apples-to-apples comparison against that confounded evidence, now under the current commit and level-blind (no resume/hints).

**Corpus:** `data/stress/stress-levels-random.json` (Corpus 2, matching both the current residual boundary and the 2026-07-29 snapshot).

**Decision rule, fixed before dispatch:**

- If **0/20 solve at either tier**: strengthens the negative work-ladder finding under the current commit, level-blind, free of both confounds above. Closes the work-ladder branch of WS2-POST-D1-DISCRIMINATOR as **not simply underdosed** at this budget range, and hands the queue to the next candidate instrument (operational divergence / first-loss class survey, per `docs/solver-first-loss-causal-taxonomy.md`, which is otherwise the most mature of the remaining three per its own "no line establishes class distribution" gap).
- If **any id solves at tier 2 but not tier 1**: genuine underdose signal at this scale on at least this population; nominates (not yet earns) a bounded production node-budget increase as a separately justified follow-on, contingent on how many ids respond and their downstream `workSpent`/wall-cost.
- If **any id solves at tier 1** (near-parity with normal production): would indicate the July high-budget snapshot's confound (commit drift or resume/hints) was masking an already-recoverable level, and requires investigating why current production itself has not already found it (a routing/dose question, not a pure budget question) -- see `docs/solver-first-loss-causal-taxonomy.md` F8.

No outcome has been inspected before this precommitment; the workflow has not been dispatched as of this report.

## Handoff

- If dispatched and closed negative, update `docs/solver-optimization-workstreams.md`'s "Execution gate now" text to record work-ladder closed and point at the first-loss class-prevalence survey as the next candidate instrument, and update `WS2-POST-D1-DISCRIMINATOR` in `docs/solver-research-question-relations.json` accordingly.
- If positive (either branch above), do not promote a production change from this alone; the advancement bar is the same as every other lane here (positive premise -> smallest consumer -> matched-work economics -> broader architecture only if earned).
- Preserve this report's zero-compute reuse method (cross-referencing `logs/solver-stress-refresh/corpus2-runtime-telemetry.json` against a current residual boundary) as reusable practice: check already-committed high-budget telemetry before proposing new escalation experiments elsewhere in the program.
