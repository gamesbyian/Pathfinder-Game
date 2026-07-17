# Solver Development Roadmap — Toward Full Stress-Corpus Solvability

> **Status: active strategy document (written 2026-07-17).** This is the campaign-level plan for
> expanding the solver until it solves every level in both stress corpora, preferably in under 30s
> per level. It sequences *existing* diagnostic machinery into a repeatable workflow — it proposes
> no new tooling (the tooling investments are done; see
> [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md)) and no specific solver change (those
> come out of the diagnosis loop below, one campaign at a time). Complementary docs:
> [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) (technique-level
> research ledger), [`../data/stress/README.md`](../data/stress/README.md) (the shipped/rejected
> avenue ledger). Update the "Where things stand" numbers here after each full corpus refresh, or
> retire sections into the current-state references as campaigns complete.

## Where things stand (as of 2026-07-17)

| Corpus | Solved | Source |
|---|---|---|
| Published (regression gate) | 160/160 | `logs/solver-baseline.json` — the only trusted "did I break something" signal |
| Stress-corpus-1 | 85/102 | `logs/stress-corpus1-baseline.json` (compiled 2026-07-12) |
| Stress-corpus-2 | 237/1700 | 2026-07-17 batch refresh (`reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md`); up from 152 pre-elite-splice-fix |

The unsolved corpus-2 population is already clustered by failure mechanism
(`reports/stress/unsolved-failure-clusters.json`,
`reports/2026-07-16-phase-a-unsolved-failure-clustering.md`; clusters overlap):

- **`dfs-plain` — 843 levels (57.6%)**: genuine combinatorial exhaustion — plain DFS burns real
  node budget without finding the goal. Exhaustion-dominated, so *more time is the wrong lever*;
  the levers are ordering, pruning, and bounds. 592 of these are high-intersection-burden.
- **`repair-close` — 114 levels**: repair-gated near-misses, badness ≤ 5. The natural rescue
  target: the solver already gets within a handful of moves.
- **`repair-far` — 507 levels**: repair-gated but structurally stuck (badness > 5).
- **Fragile scoring-interaction family**: R02248/R01465 plus 3 diagnosed cousins — a
  position/attraction scoring term × orientation interaction locks in an early self-defeating
  commitment. Already mitigated by the attraction-diversity last-resort pass
  (`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`). The once-reported
  285-level "beam-collapse" bucket was an instrumentation artifact (timed-out beam attempts
  reported `nodesExpanded: 0`), since fixed — the real bucket is these few levels.
- **Robust hard cores** (e.g. R00440: 0/45 family variants solvable; R02579: 1/45): resist every
  technique *and* structural perturbation. Genuine combinatorial hardness, not a heuristic bug.

Two structural facts shape everything below: every stress level carries a withheld witness path
(`stressMeta.witnessSolution`) proving solvability by construction, so "is it solvable?" is never
the question — only "why doesn't our search find it?"; and solver strategy is keyed on level
*features*, never identity (`check:no-solver-level-numbers`), so no fix may be a per-level tweak.

## The core loop: diagnose → generalize → verify → refresh

Every campaign runs the same loop. The expensive groundwork (telemetry, clustering, witnesses,
diagnostic tools) already exists; the loop is how it compounds into solver capability.

### 1. Pick a failure cluster, not a level

Start from `reports/stress/unsolved-failure-clusters.json` and
`npm run stress:rank-levels` (closest-miss-first ordering over a compiled baseline). A level is a
*sample from* a cluster; the deliverable is always a fix for the cluster's mechanism.

### 2. Diagnose the mechanism on 3–5 representatives

The differential toolkit, in rough order of cost:

- **Witness-divergence diffing** (`scripts/stress/witness-divergence.mjs`): replay the withheld
  witness against the solver's own search trace and inspect each divergence point. This is the
  instrumented-ablation method that produced the real R02248/R01465 findings — per
  [`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md), differential diagnosis is the
  one reasoning mode that reliably beats narrative-mining.
- **Ablation sweeps** ([`ablation.md`](ablation.md) — 63 flags over scoring/pruning/strategy/
  templates/profiles, `scripts/run-ablation.mjs` + `analyze-ablation.mjs`): isolate which term is
  load-bearing vs self-defeating on the representatives. The fragile-family diagnosis
  (`reports/2026-07-16-phase-d-fragile-group-ablation-diagnosis.md`) is the worked example.
- **Level reduction** (`npm run stress:reduce-level`): shrink an antagonistic 15×15 to a minimal
  repro before reasoning about it — witness-guided free shrink first, then signature-preserving
  ddmin with a node budget.
- **Family variants** (`scripts/family-generate.mjs` — density-sweep, re-embed, symmetry,
  local-mutant, swap; joined by `family-analyze.mjs`; program described in
  [`sibling-cousin-system.md`](sibling-cousin-system.md)): the **fragile/robust split is the
  single most decision-relevant diagnostic**. A level whose variants mostly solve (R02248 solved
  35/45) has a heuristic problem — some scoring/ordering term is the obstacle, and a targeted or
  diversity-style fix is likely. A level whose variants mostly fail (R00440 solved 0/45) has a
  combinatorial problem — no scoring fix will help; it needs bounds/pruning/technique work.
  Remember open space is itself a difficulty variable
  (`reports/families/2026-07-15-re-embedded-cousin-grid-growth.md`).
- **Solution-profile comparison** (`npm run stress:solution-profile-compare -- --target-level=…`,
  [`solution-profile.md`](solution-profile.md)): profile the unsolved level's witness against the
  known-solvable libraries to ask which solved family it behaviorally resembles — i.e. which
  existing technique *should* work and therefore where the gap is.

### 3. Generalize to a feature-keyed change

Acceptable shapes, in increasing order of invasiveness:

- A new/adjusted `ATTEMPT_POLICY` rule or `POLICY.*` threshold (`modules/solver/attempts.ts`),
  gated on the diagnosed feature regime (navDensity band, reqInt burden, mechanic counts).
- A scoring/pruning adjustment (`scoring.ts`, `prune-gauntlet.ts`, `lower-bounds.ts`) — with the
  memoization-key soundness rule (CLAUDE.md gotcha: an under-keyed cache is a correctness bug)
  and differential testing.
- A strengthened admissible lower bound — every new bound needs a written admissibility argument
  and an `oracle:fuzz` pass (the MST-scratch-buffer bug is the precedent for why).
- **The proven pattern for fragile clusters**: a bounded, additive, opt-out *last-resort pass*
  (the attraction-diversity model — runs only after everything else failed, so it is zero-cost on
  every level that already solves, with its own budget-fraction override so testing sweeps can
  disable it independently).

### 4. Verify at the right tier — solvability AND cost

Follow `docs/testing.md`'s tier table: `npm run stress:smoke` (<60s sanity) → mechanic-filtered
subset (`--filter-mechanic`) where the change is mechanic-scoped → full
`npm run solver:bench -- --check` for anything touching shared hot-path files. Non-negotiables:

- `solver:bench --check` only verifies the solved/failed set — **always** pair it with a full-corpus
  before/after cost comparison (`nodesExpanded` + wall-time); the repair-probe seed-width episode
  is the standing example of a clean `--check` hiding a 14% slowdown.
- Testing sweeps pass **both** `--repair-budget-fraction=0` and
  `--attraction-diversity-budget-fraction=0`.
- When a refactor removes or tightens a condition, grep for second-order dependencies on the exact
  case removed (the elite-splice regression lesson).
- `diff-baseline.mjs` (+ `--retry-failures` isolated retry) to explain result changes;
  `classify-stability.mjs` to keep budget-edge flakiness out of conclusions.

### 5. Refresh, re-baseline, re-rank

Full corpus-2 sweeps go to GitHub Actions (`.github/workflows/solver-corpus2-batch-*.yml`, 20
batches ≈ 12.5 min each, combined via `npm run solver:combine-corpus2-batches`), never a local
multi-hour run. Always solve with `--save-hints` so every newly-solved level's hints (with full
provenance) feed the solution-profile libraries and heatmaps automatically. Between refreshes,
iterate locally with `portfolio-solve-sweep.mjs --resume --attempt-cache --baseline --priority`
so only levels the edited attempt family could plausibly affect are re-solved. Newly interesting
levels go through the failure inbox → promotion pipeline (`scripts/stress/failure-inbox.mjs`),
never ad-hoc pin-file edits. Regenerate `logs/stress-corpus2-baseline.json` /
`reports/stress/dev-benchmark-corpus2.json` and update this doc's numbers.

## Campaign sequence

**Campaign 0 — close out the pending follow-ups (first; cheapest; locks in gains already paid
for).** The 2026-07-16/17 reports left explicit unfinished work:

- ~~Test the attraction-diversity pass against the 621 `repair-close`+`repair-far` levels~~ **Done
  2026-07-17.** A 40-level sample (20 each, repair disabled to isolate the pass's own contribution,
  same methodology as the original `dfs-plain` test) found a **2.5% rescue rate** (1/40, from
  `repair-close` only — 0/20 on `repair-far`) — real but well below `dfs-plain`'s 10%, consistent
  with the pass's diagnosis having been derived entirely from non-repair-gated levels. Still
  strictly zero-cost to keep (gated after both main loop and repair fallback fail), but not
  expected to meaningfully move this population the way it does `dfs-plain`; Campaign 1's targeted
  repair-mechanism diagnosis is the more promising lever for `repair-close`/`repair-far`
  specifically. See
  [`reports/2026-07-17-attraction-diversity-repair-cluster-test.md`](../reports/2026-07-17-attraction-diversity-repair-cluster-test.md).
- ~~Evaluate the budget-fraction 1.5 candidate and candidate-flag widening~~ **Done 2026-07-17,
  evaluated only — no constant changed.** A fresh, larger (100-level) `dfs-plain` sample gave a
  more sober read than the original 30-level teaser: fraction 1.5 rescues only **+1/100** for
  **+24% time/+15% nodes** (not the disproportionate jump the smaller sample suggested). Widening
  `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` to all 5 diagnosed terms in one combined pass also nets
  only +1/100 at neutral cost, but — the more important finding — **the solved set is not a
  superset**: it loses 2 rescues the current single-flag pass finds while gaining 3 different ones,
  confirming the original diagnosis's "which term is responsible varies per level" extends to
  combined passes. Neither change is justified by this evidence; both constants stay at their
  current production values. Sequential per-flag sub-passes (untested, ~5x this pass's own budget)
  is flagged as the more promising unexplored shape if this is revisited. See
  [`reports/2026-07-17-attraction-diversity-fraction-and-flag-widening-evaluation.md`](../reports/2026-07-17-attraction-diversity-fraction-and-flag-widening-evaluation.md).
- ~~Audit the flagged `solveLevel()` budget-accounting overshoot~~ **Done 2026-07-17.** Root cause:
  the early repair probe's cost was never gated by `repairBudgetFractionOverride`, so `... : 0`
  zeroed the later fallback loop but left the probe free to burn its full fixed node budget as
  unaccounted wall time — confirmed on R02401 (~10.7s of the ~10s overshoot) and shown to also
  silently break both interactive UIs' documented ~30s cost promise on any repair-gated level.
  Fixed by skipping the probe when the resolved fraction is exactly 0. Real, measured trade-off:
  the 4 known repair-gated published levels lose the probe's cheap win on this path (up to ~100x
  slower, still comfortably under 30s) — judged correct, not a regression, since that override
  already means "no repair-related cost, period" for the later loop. See
  [`reports/2026-07-17-repair-probe-budget-override-bug.md`](../reports/2026-07-17-repair-probe-budget-override-bug.md).
  Follow-up noted there, not yet done: the probe's node budget is still unscaled by `timeBudgetMs`
  even on the production-default (non-zero-override) path.

**Campaign 1 — `repair-close` rescue (114 levels, badness ≤ 5).** Started 2026-07-17; found and
fixed a real infrastructure bug before reaching a per-level diagnosis, and the finding reshapes
this campaign's framing:

- **Discovered**: the early repair probe never checked the caller's external `nodeBudget` at all,
  always running its ~10,000,000-node internal worst case regardless of a smaller external
  ceiling. The GitHub Actions corpus-2 batch workflow runs with `--node-budget=8000000` — smaller
  than that worst case — so **100% of the `repair-close`+`repair-far` population (621/621, exact
  match)** hit `node-budget-reached` with only the probe's 3 attempts ever recorded: the main
  loop, full repair fallback, and attraction-diversity pass never ran on any of them. Fixed (capped
  each probe round to the remaining external budget); see
  [`reports/2026-07-17-repair-probe-node-budget-starvation.md`](../reports/2026-07-17-repair-probe-node-budget-starvation.md).
- **Measured the fix's real impact**: at the workflow's current 8,000,000-node budget, all 150
  sampled levels are *still* probe-only post-fix (the probe alone needs close to its full worst
  case here) — 0 new solves. At 2.5x that budget (25,000,000), every sampled level now gets real
  main-loop/fallback/diversity headroom (confirmed), but still **0/30 solve**. So the probe bug was
  real and worth fixing (accounting honesty, no more silent 25% overshoot past a stated ceiling),
  but it is **not** the reason this population is unsolved — these levels look genuinely hard, not
  budget-starved. See
  [`reports/2026-07-17-repair-probe-node-budget-starvation-impact.md`](../reports/2026-07-17-repair-probe-node-budget-starvation-impact.md).
- **Consequence**: the `repair-close`/`repair-far` cluster classification and "badness" ranking in
  `unsolved-failure-clusters.json` were computed entirely from probe-only telemetry — they don't
  reflect the full pipeline's real near-miss distance. **Recommended, not yet done**: raise the
  batch workflow's `node_budget` default (to ≥20–25M) and re-run corpus-2 to get an honest
  re-classification before trusting "badness ≤ 5" to mean anything about full-pipeline distance.
  This is a real CI-resource commitment (20 parallel batch jobs), flagged for an explicit decision
  rather than triggered unilaterally.
- **Differential diagnosis (witness-divergence) across all 621 members, done 2026-07-17, partially
  corrected same day.** Initial pass compared a top-30-discrepancy tail against two named batch-B
  levels and concluded this population needed "roughly double" batch-B's discrepancy density — **a
  flawed comparison, corrected**: a proper population-median comparison, including a solved-level
  control group, found the per-step discrepancy ratio is statistically indistinguishable between
  solved and unsolved corpus-2 levels (~0.38–0.40 across the board;
  [`reports/2026-07-17-witness-divergence-population-calibration-correction.md`](../reports/2026-07-17-witness-divergence-population-calibration-correction.md)).
  **What still stands**: zero legality/pruning errors across all 621 witnesses (search-core is
  sound for this population), the node-budget-starvation fix and its measured non-impact (0/30
  solved even at 2.5x generous budget with full pipeline access — this was measured directly, not
  inferred from discrepancy), and **"badness ≤ 5" is still not a reliable near-miss signal** (built
  on probe-only telemetry, per the earlier finding). **What's withdrawn**: the "this is a more
  severe version of the batch-B pattern" framing — the real reason this population resists both
  DFS/beam and repair-search is not yet isolated by this diagnostic. The only real (modest)
  population-level difference found: unsolved levels run somewhat longer paths (16–20% more steps)
  than solved ones — consistent with, not new beyond, the existing open-space/path-length
  difficulty variable already documented in CLAUDE.md. See
  [`reports/2026-07-17-repair-close-witness-divergence-diagnosis.md`](../reports/2026-07-17-repair-close-witness-divergence-diagnosis.md)
  (now flagged with the correction at its top) for the original write-up, and the correction report
  for what replaces it. Next-step recommendation: per-level witness-divergence using each level's
  own actually-selected attempt-policy profile (this pass used one common `default` baseline for
  the whole corpus) is more likely to find a real discriminator than repeating the population-level
  aggregate approach.

**Campaign 2 — `dfs-plain` exhaustion (843 levels; the bulk of the problem).** Research-shaped:
reduce → diagnose ordering divergence vs the witness → hypothesize → ablate → verify. Since
exhaustion means the search space is too large for current ordering/pruning, the levers are
better admissible bounds, better move ordering, and plausibly a new archetype for the 592
high-intersection-burden members (e.g. planning intersection *placement* rather than crossing
opportunistically — to be validated by diagnosis, not assumed). Any new feature gate should
consider navDensity/unused-space explicitly, given the grid-growth sensitivity finding. **Started
2026-07-17**: the same population-level default-profile witness-divergence pass run against
`repair-close`/`repair-far` was extended to all 843 `dfs-plain` members and found the identical
null result — no population-level discrepancy-density or `maxStepRank` discriminator vs. solved
levels (see the calibration-correction report above, which covers both clusters together). The
only real signal found so far is the same modest path-length gap. **Level reduction on R00648
(the population's highest-discrepancy member), also done 2026-07-17**: reached a genuine fixed
point at a completely empty 15×15 grid (zero mechanics) that still exhausts 15,000,000 nodes —
confirmed as a **6th independent member of the fragile-scoring-interaction family** already
documented in CLAUDE.md for R02248/R01465 (properly-isolated ablation, using
`ablation-config.mjs`'s `withFeatureDisabled` to avoid the sparse-object flag-leak bug this
codebase has hit twice before): the *original* level is unlocked by `SCORE_GOAL_ATTRACTION`
(matching a rescue already credited to the attraction-diversity pass in Task 3's sweep); the
*reduced* form needs `SCORE_INTERSECTION_SETUP` or `SCORE_PERIMETER_BIAS` instead — reduction
changed which flag rescues it, a real caveat for using `stress:reduce-level` on this level class.
See [`reports/2026-07-17-r00648-fragile-scoring-family-and-reduction-caveat.md`](../reports/2026-07-17-r00648-fragile-scoring-family-and-reduction-caveat.md).
**Full per-flag census on the same 100-level sample, also done 2026-07-17** (no new reductions
needed — reused Task 3's already-collected sweeps, added correctly-isolated per-flag attribution
for the 3 levels the combined-widening sweep solved but couldn't individually attribute): **7/100
(7%) of the sample are confirmed fragile-scoring cases** — `SCORE_GOAL_ATTRACTION` rescues 5 of the
7, `SCORE_INTERSECTION_SETUP` and `SCORE_OBJECTIVE_ATTRACTION` each uniquely rescue one more the
current candidate set misses (R02480, R02921). Strengthens, with real attribution data, Task 3's
speculative case for a **sequential per-flag sub-pass** design (try each candidate flag in its own
mini-pass, not all 5 at once) — the combined-pass shape already measured only reached 5/7, losing
2 `SCORE_GOAL_ATTRACTION`-only cases when every flag was disabled together. See
[`reports/2026-07-17-dfs-plain-fragile-scoring-census.md`](../reports/2026-07-17-dfs-plain-fragile-scoring-census.md).
Cost of the sequential design (~5x this pass's own budget) is still unmeasured — the natural next
increment if this thread is picked back up, before any actual mechanism change.

At 7%, the fragile-scoring family explains a meaningful minority of `dfs-plain`, not the bulk.
**Confirmed negative reference, 2026-07-17**: the already-known "robust" level R00440 (0/45 family
variants solvable, `docs/sibling-cousin-system.md`) was tested against all 5 known fragile-scoring
flags individually and combined — none rescue it (stays `timeout`, 6–10M nodes, in every
configuration). This corroborates the structural-perturbation "robust" classification with an
independent scoring-ablation test: R00440 is genuinely a different, harder case from the fragile-
scoring family, not just under-sampled by it. **Campaign 2 stands at a clean, well-evidenced
midpoint**: ~7% of `dfs-plain` is fragile-scoring (a known mechanism, cheap to check per-level, not
yet worth a production change per Task 3's cost findings), the remaining ~93% (R00440 being one
confirmed example) resists this entire class of intervention and needs different work — **still not
yet done**: level reduction + witness-divergence using a confirmed-robust level's own
actually-selected attempt-policy profile (not the common default baseline every population-level
pass so far has used) is the concrete next step, left for a future session.

**Campaign 3 — `repair-far` (507) + the robust cores.** Attacked last, armed with whatever
Campaigns 1–2 teach. If nothing generalizes, genuinely-new techniques (constraint propagation
over intersection/must-cross budgets; witness-shape-informed macro moves suggested by
solution-profile family resemblance) get prototyped behind ablation flags and held to the same
verification bar as everything else — the fast-portfolio-scheduler verdict
(`reports/portfolio/portfolio-scheduler-decision.md`) is the model for how a plausible idea gets
measured and, if slower, honestly shelved.

## Standing rules

- Published 160/160 is inviolable. No change ships without `solver:bench --check` **and** the
  cost sweep.
- Progress is measured per refresh on two axes: solved counts per corpus, and the wall-time
  distribution against the 30s/level target (report worst-case multiples explicitly, not just
  means).
- Every fix is keyed on features; every claim of "verified" names which testing tier ran and what
  it cannot see (e.g. "cost sweep not run" is a reportable gap, not a footnote).
- Negative results get written up in `reports/` like positive ones — the rejected-avenues ledger
  is what keeps future sessions from re-buying the same lessons.
