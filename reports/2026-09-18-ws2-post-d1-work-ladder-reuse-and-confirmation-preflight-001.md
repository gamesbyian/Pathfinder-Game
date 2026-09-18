# WS2 post-D1 discriminator: work-ladder zero-compute reuse, and a confirmation-slice result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-18 — the precommitted 20-id, 2-tier, level-blind confirmation slice ran to completion on GHA (current commit `4ed64bf0`/`c29047d9`): **0/20 solved at 300M nodes; 3/20 solved at 1.2B nodes** (R00044, R01000, R02974). See "Confirmation slice: result" below.
> **Decision:** work-ladder is a genuine, narrow discriminator: at the current commit, level-blind, 4x node-budget escalation (300M -> 1.2B) recovers 3/20 (15%) of a sample drawn from levels that were unsolved at both the current production ceiling and (per the zero-compute reuse below) a 7-week-old commit's own 1.2B-node attempt. This is a real positive that the earlier confounded zero-compute reuse (0/483) understated -- the confounds disclosed below (commit drift, history-aware execution) were masking real recoverable capacity, not merely adding noise. **Not simply "absent capability"** for at least this slice. Does not by itself earn a production budget change: per standing rule, a positive premise nominates a matched-work economics test, it does not authorize one. See `WS2-WORK-LADDER-ECONOMICS` for the follow-on.
> **Remaining gate:** none for this confirmation slice itself (complete, decision rule's middle branch triggered). The follow-on matched-work economics question is a new, separately gated question.
> **Evidence role:** discovery (zero-compute reuse) superseded by confirmation (the dispatched slice: precommitted population/budgets/decision rule, current commit, level-blind, complete population coverage).
> **Population identity:** current 531-row Class 1-5 residual, production run `35066677597` @ `16114b80` (`docs/solver-optimization-workstreams.md`'s boundary). The confirmation slice narrows to the deterministic 20-id sample below, run at current commit `c29047d9` (tier 1, tier 2 first pass) / `4ed64bf0` (tier 2 recovery pass; an intervening automated hint-store maintenance commit, no solver-logic change).

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

No outcome was inspected before this precommitment; both dispatches below ran after it was written and committed.

## Confirmation slice: result

**Tier 1 (300,000,000 nodes):** dispatched as run [35335885011](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35335885011), complete on the first pass (20/20 shards, no recovery needed). **0/20 solved**, all `node-budget-reached` (workSpent 740M-1.14B; additive retry tiers routinely spend several times the nominal node-derived work budget once the main ladder is exhausted, consistent with `solver-level-blind-targeted-sweep.yml`'s own documented `node_budget_advisory_only` caveat -- `workSpent` and raw node count are different cost currencies here, not a discrepancy).

**Tier 2 (1,200,000,000 nodes):** dispatched as run [35335905251](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35335905251). 15/20 ids completed on the first pass; 5 (`R00512`, `R01380`, `R02309`, `R02880`, `R03046`) hit a GHA job-level timeout cancellation ("The operation was canceled" after ~89 minutes) -- the shard planner's wall-time prediction, calibrated from the July run's telemetry, badly underestimated real cost at this escalated budget under level-blind (non-resumed) execution. This is an infrastructure censoring, not a genuine solver outcome (same category the repo's own gap-fill convention exists for), so the 5 missing ids were redispatched as run [35352629524](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35352629524) with a generous fixed per-id timeout (`target_wall_minutes=60`, `min_timeout_minutes=240`, `fixed_group_size=1`) rather than accepted as absence. All 5 completed cleanly within the new ceiling (16-83 minutes each).

Combined tier-2 population (20/20, complete):

| Outcome | ids | Count |
|---|---|---:|
| Solved | R00044, R01000, R02974 | **3** |
| Unsolved (`node-budget-reached`) | the remaining 17 | 17 |

**3/20 (15%) solved at 1.2B that were unsolved at 300M.** All three solved well under the 1.2B ceiling itself -- `workSpent` 335M/588M/882M via `main-search` (R01000, R02974) or `admissible-order-fallback` (R00044, `stageNodesExpanded=219,802,423` at the solving stage) -- markedly cheaper than the 17 unsolved-at-1.2B rows' workSpent (2.8B-4.1B, reflecting additive retry tiers burning the full ceiling without success). Per-level wall time at the 1.2B tier ranged roughly 4 minutes to just over 2 hours across the sampled population (single-level, not cross-level-parallel cost).

This triggers the precommitted decision rule's middle branch: **genuine underdose signal**, not absent capability, for at least this slice. It also corrects the zero-compute reuse finding above: the earlier confounded 0/483 result was not simply "extra noise on a real negative" -- under a clean level-blind current-commit test, real recoverable capacity exists at this budget scale. The confounds (commit drift, history-aware `--resume`) were masking a positive, not merely adding uncertainty to a negative.

Per standing program rule ("positive premise -> smallest consumer -> matched-work economics -> broader architecture only if earned"), this **nominates, and does not by itself earn**, a bounded production node-budget change. The open question -- whether spending ~4x node budget on a level that's already near production's ceiling is a better use of total compute than spending that same work elsewhere (more levels at normal budget, or a different technique entirely) -- is a matched-work economics question, not a raw recovery-rate question. See `WS2-WORK-LADDER-ECONOMICS`.

## Handoff

- `docs/solver-optimization-workstreams.md`'s "Execution gate now" text and workstream-state table updated: work-ladder branch concluded positive-narrow; `WS2-WORK-LADDER-ECONOMICS` is the new active WS2 gate.
- `docs/solver-research-question-relations.json`: `WS2-POST-D1-DISCRIMINATOR` marked `concluded-positive` (work-ladder was the justified next instrument and produced a decision-bearing result); `WS2-WORK-LADDER-ECONOMICS` added as the follow-on question.
- The other three candidate instruments (operational divergence / first-loss class survey, rejection counterfactuals, 2x2 interaction) remain untested and available; nothing here closes them. The first-loss taxonomy (`docs/solver-first-loss-causal-taxonomy.md`) remains the most mature of the three if the economics test closes negative.
- Preserve this report's zero-compute reuse method (cross-referencing `logs/solver-stress-refresh/corpus2-runtime-telemetry.json` against a current residual boundary) as reusable practice, with the caveat now on record: a confounded historical negative can understate a real current positive, so treat it as a prior to update from, not a substitute for a clean confirmation slice.
