# Solver Development Roadmap — Toward Full Stress-Corpus Solvability

> **Status: historical campaign record (written 2026-07-17; last campaign update 2026-08-05).**
> This is the campaign-level plan that organized the effort to expand
> the solver until it solves every level in both stress corpora, preferably in under 30s
> per level. It sequences *existing* diagnostic machinery into a repeatable workflow — it proposes
> no new tooling (the tooling investments are done; see
> [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md)) and no specific solver change (those
> come out of the diagnosis loop below, one campaign at a time). Complementary docs:
> [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) (technique-level
> research ledger), [`../data/stress/README.md`](../data/stress/README.md) (the shipped/rejected
> avenue ledger). The workflow and standing rules remain useful, but the dated counts and campaign
> labels below are snapshots and must not be used as the live queue. Current priorities and blockers
> live in [`future-work.md`](future-work.md); current generated corpus state lives in
> `logs/stress-corpus{1,2}-baseline.json`.

## Historical baseline snapshot (2026-07-18, first genuine solver-stress-refresh.yml run)

> **Snapshot superseded.** The table below is the 2026-07-18 state and is kept
> for its infrastructure narrative. The live figures come from
> `.github/workflows/solver-typical-budget-baseline.yml`'s latest run
> (`reports/stress/typical-budget-baseline-2026-07-30T114427Z.md`, 240 shards at pinned work
> budgets): **corpus-1 97/102, corpus-2 434/1700**. Note the two distinct corpus-2 counts and don't
> mix them: 434 is what a *typical budget* solves cold; `logs/stress-corpus2-baseline.json`'s 605 is
> how many carry a valid hint from any source, including the 2026-07-24/25 high-budget sweeps and
> hint-discovery tooling. Those figures were themselves superseded by later refreshes. As of the
> 2026-08-06 work-budget-starvation fix, the generated known-solution ledgers contain **corpus-1
> 96/102 and corpus-2 725/1700**; they are cumulative hint ledgers, not comparable cold typical-budget
> measurements. See [`reports/2026-08-06-workbudget-starvation-audit.md`](../reports/2026-08-06-workbudget-starvation-audit.md).

| Corpus | Solved | Source |
|---|---|---|
| Published (regression gate) | 160/160 | `logs/solver-baseline.json` — the only trusted "did I break something" signal |
| Stress-corpus-1 | 94/102 | `logs/stress-corpus1-baseline.json`, refreshed 2026-07-18 (unchanged from the 2026-07-17 refresh — no solver change between the two touched corpus-1's population). `officialSource` is now `official-contended`/`timingTrustworthy:false` (corpus-1 switched to `--parallel` for speed the same day — see the infrastructure note below); solved/failed counts are unaffected by that switch, only `elapsedMs` is. |
| Stress-corpus-2 | 304/1700 | 2026-07-18 refresh (20/20 GitHub Actions shards, all genuinely contributing — see infrastructure note), the first full refresh since the `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS` extension (`reports/2026-07-18-length-gap-close-invocation-rate.md`) — up from the prior genuine baseline of 302/1700. Not yet run through `diff-baseline.mjs`/isolated-retry verification the way the 07-17 refresh was — the +2 delta is plausible (matches the near-miss extension's own ~5% single-flag sample rescue rate applied to a population this size) but not yet confirmed to be exactly attributable to that change vs. flaky/environmental noise. |

**Infrastructure note (2026-07-18)**: `solver-stress-refresh.yml`'s first three real end-to-end runs each caught a genuine bug, none previously visible from local validation alone: (1) run 1 — a shard artifact `name`/`path` mismatch (zero-padded staging dir vs. unpadded upload path) silently dropped 9/20 corpus-2 shards' results while the job still reported success (`if-no-files-found: warn`); the commit that landed from that run undercounted the corpus by 45% (935/1700 covered, not 1700) — no consumer should treat that commit's `logs/stress-corpus2-baseline.json` as accurate. (2) run 2 — with (1) fixed, all 20 shards + corpus-1 succeeded, but the `combine` job's archive step used a date-only stamp and collided with run 1's same-day archive folder (`git mv: destination exists`), aborting before any commit — `main` was left unchanged, not further corrupted. (3) run 3 — with both fixed, completed cleanly end-to-end (~34 min total, vs. run 1's ~45 min — the corpus-1 `--parallel` switch measurably helped) and is the source of the table above, verified directly: all 20 `sourceReports` present, `total: 1700`, `missing: []`, corpus-1 solved count unchanged at 94/102. Full writeups: PRs #1271 and #1274. `solver-stress-refresh.yml` (the matrix-based successor to the old 20-branch `solver-corpus2-batch-NN.yml` scheme — no persistent branches, no checkpoint/resume, corpus-1 folded into the same run) is now considered proven by a real end-to-end success, not just designed.

The unsolved corpus-2 population is already clustered by failure mechanism
(`reports/stress/unsolved-failure-clusters.json`,
`reports/2026-07-16-phase-a-unsolved-failure-clustering.md`; clusters overlap). **Re-clustered
2026-07-17 against the 302/1700 baseline** (previous re-cluster was against the stale 295
baseline — the 7-level shift moved a meaningful number of levels between buckets, not just the
totals):

- **`dfs-plain` — 1398 levels (all unsolved levels)**: every remaining unsolved level has at least
  one real non-repair DFS/beam timeout now that the main loop actually runs on repair-gated levels
  too — this tag stopped being a useful partition on its own; use it jointly with the repair tags.
  1080 of these are high-intersection-burden.
- **`repair-close` — 139 levels** (down from 156): repair-gated near-misses, best
  *repair-specific* badness ≤ 5. **Caveat**: badness reflects where repair's stochastic local
  search landed its single best sample, not a proven distance to a solution — cross-check against
  any existing family-variant robustness result before treating a `repair-close` member as an easy
  win (see the report above; `R00440` is `repair-close` at badness 2 despite being an
  already-characterized robust hard core).
- **`repair-far` — 754 levels** (up slightly from 751): repair-gated but structurally stuck
  (best repair-specific badness > 5).
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
  for what replaces it. **Done, same day**: per-level witness-divergence using each level's own
  actually-selected attempt-policy profile(s) (`getAttemptConfigs()`, not the common `default`
  baseline) on 8 `repair-close` levels plus 10 fresh `dfs-plain` levels (18 total, no overlap with
  earlier reports) found the real-profile discrepancy within a few percent of the default-baseline
  number on every single level — no hidden per-level discriminator the generic baseline was
  masking. More significant than the "no discriminator" answer itself: `maxStepRank` is 2
  (occasionally 3) on **all 18 levels, under every profile tested, with zero exceptions** — the
  solver's own greedy scoring essentially never disagrees strongly with the witness's real move,
  across 90-170 consecutive steps per level. This closes the methodology gap (not a baseline
  artifact) and sharpens the diagnosis: per-step local move quality does not look like the
  bottleneck on this sample — the difficulty is that long sequences of individually-reasonable
  moves still don't compound into a valid win often enough, consistent with a genuinely
  combinatorial planning problem. **A scoped claim, not a blanket one**: this lowers the priority
  of scoring/ordering-only work for the `dfs-plain`/`repair-close` bulk (zero counterexamples in
  18 levels, the same confidence the turn-landmark archetype's flag sweep earned for its
  narrower case) — 18 levels is real evidence for a ~1400-level population, not exhaustive proof;
  it doesn't rule out a scoring fix helping some untested member, only deprioritizes
  scoring-only work as the next lever to reach for here. See
  [`reports/2026-07-17-real-profile-witness-divergence-closure.md`](../reports/2026-07-17-real-profile-witness-divergence-closure.md).

- **repair-search's own mechanism, diagnosed for the first time this session (same day)**: every
  prior pass examined DFS/beam; `repair-close`/`repair-far` are actually gated on
  `repair-search.ts`'s iterated-local-search fallback, which had never been looked at directly.
  Using its pre-existing debug trace (`PF_REPAIR_DEBUG=1`), 4 levels all show the identical
  shape: `bestBadness` drops fast within the first few hundred restarts, then **plateaus for
  85-99% of the entire budget** despite the existing stagnation-burst escape mechanism firing
  12-30+ times without escaping (`R02010`: reaches `bestBadness=3` — one length step and two
  must-turn cells short — within 170ms, then never improves again across the remaining 14.8s).
  A real, severe, previously-undiagnosed gap. **The obvious fix was tested and found
  net-negative, not a win**: raising `STAGNATION_BURST_LEN` 800→6000 (published-corpus-safe,
  `solver:bench --check` 160/160) on a 40-level `repair-close`+`repair-far` sample gained one
  solve but made average final badness *worse* (11.50→13.35, +16%), with **18 levels regressing
  vs. 4 improving** (up to +156% on one level) — high-variance, net-negative, consistent with
  this exact constant family's documented regression sensitivity (the pre-session S030 episode).
  See
  [`reports/2026-07-17-repair-search-stagnation-plateau-and-burst-length-negative-result.md`](../reports/2026-07-17-repair-search-stagnation-plateau-and-burst-length-negative-result.md).
  **The plateau finding stands as real and actionable even though this specific fix doesn't**:
  untested directions include level-adaptive burst sizing (vs. one uniform constant),
  independently tuning `STAGNATION_THRESHOLD`, and diversifying the elite pool itself on burst
  trigger (rather than just biasing restart origin while the burst runs, then reverting to the
  same pool) — the data here suggests reverting to the *same* stuck pool after the burst ends may
  be the real limiting factor, not burst duration itself.

**Addendum, 2026-07-17 (after the genuine corpus-2 refresh): the "114 levels" framing above is
stale.** Re-clustering against the fresh 295/1700 baseline (and fixing a classifier bug the probe
fix itself exposed — see the "Where things stand" section above and
[`reports/2026-07-17-failure-cluster-taxonomy-stale-after-probe-fix.md`](../reports/2026-07-17-failure-cluster-taxonomy-stale-after-probe-fix.md))
puts `repair-close` at **156 levels**, not 114. This campaign's diagnostic findings (stagnation
plateau, elite-pool bookkeeping) are unaffected — they were derived from direct
`repairSearchFromGate` instrumentation on individual levels, not from the stale cluster count —
but a future continuation of this campaign should pick fresh representatives from the corrected
156-level `repair-close` cluster (`reports/stress/unsolved-failure-clusters.json`), not the old
114-level list, and should sanity-check any candidate against existing family-variant robustness
data first (a level can be `repair-close` by badness while still being a robust hard core by
structural-perturbation testing — see the report above).

**Second addendum, 2026-07-17: the plateau report's own flagged next step also failed.** Tested
"diversify the elite pool on burst trigger, don't just revert to the same stuck pool afterward" —
the specific untested direction the plateau report closed with — by accepting tied-badness (not
just strictly-better) near-misses into the pool during a stagnation burst. Controlled A/B on 12
fresh `repair-close` levels (deterministic seed, identical across both configs — a true causal
comparison, not sampling noise): **0/12 improved, 2/12 regressed, one severely** (`R02344`:
badness 2 → 20). Reverted. **Two independent, individually well-motivated fixes for the same
diagnosed plateau have now both failed empirically** (burst length, and this). See
[`reports/2026-07-17-repair-burst-diversify-pool-negative-result.md`](../reports/2026-07-17-repair-burst-diversify-pool-negative-result.md).
**Third test, same day, same report**: `STAGNATION_THRESHOLD` itself (trigger timing — a different
lever from what a burst does once triggered) lowered 6000→1500, same 12-level method: 5/12
improved, 7/12 regressed (up to +14 on one level), average badness worse (+8.7%). **All three
individually well-motivated fixes for the same diagnosed plateau have now failed empirically.**
Simple constant-tuning on this mechanism should be considered exhausted for now; the one untested
direction left is qualitatively bigger (level-adaptive burst sizing, a function of level features
rather than a single constant) — a future attempt should probably first answer the deeper question
neither negative result actually resolved: what specific state do independent fresh-from-gate
restarts keep converging back to on a plateaued level, and why.

**That deeper question was answered the same day**:
[`reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md`](../reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md)
instrumented two of the constant-tuning-sensitive levels directly (`PF_REPAIR_DEBUG=1`) and found
that repair converges fast to a near-miss with a specific deficit signature (length off by N, plus
M pending must-turn cells), then logs **zero further best-ever-badness improvement for the
remainder of the run** — tens of thousands of further independent restarts and a dozen-plus more
stagnation bursts, all at roughly the first half of the budget onward, not a vanishingly early
point. (The debug line only fires on a new best-ever, so this proves no restart ever beat that
badness within the observed run — it doesn't by itself establish every individual restart
reproduced the identical signature or that the elite pool's other members stayed unchanged.) This
explains why all three constant-tuning fixes failed: they all assumed more/differently-timed
independent restarts would eventually find a *better* structural family, but the evidence shows
none ever did across a large number of independent attempts. The likely mechanism (not yet
confirmed): satisfying a must-turn cell's
specific required direction costs a specific number of path steps (a direction-dependent detour),
and hitting `reqLen` exactly while also taking that detour is a narrow target ordinary
epsilon-greedy random exploration essentially never finds by chance — consistent with this
codebase's own documented must-turn sensitivity precedent (the S030/`EXIT_GUIDANCE_EPSILON_BOOST`
episode). **Redirects future work**: not more generic random-restart tuning (three variants
falsified), but a targeted move/repair operator for the specific "length deficit + pending
must-turn" combination — a materially bigger, more invasive change needing full solver-hot-path
verification rigor, proposed but not attempted. Caveat: only 2 levels instrumented this deeply
(both happened to have must-turn deficits at their frozen point) — not yet established as
universal across `repair-close`, or that must-turn specifically (vs. must-cross/must-pass) is
always the dominant frozen term.

**That caveat was checked the same day, and the hypothesis got sharper, not just confirmed**:
[`reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md`](../reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md)
ran the same instrumentation across 15 fresh `repair-close` levels spanning both archetypes and a
range of badness. **0/15 solved within the bounded run; every one froze.** `len` (length deficit)
was pending in **15/15 (100%)** — more universal than `mustTurn` (10/15, 67%) — and **3 levels
froze on a pure length deficit alone**, no must-turn/must-cross/anything else pending. This
narrows the earlier must-turn-centric hypothesis: closing an exact `reqLen` match without
disturbing already-satisfied constraints looks like the actual universal hard component (every
other deficit term is a mask-popcount "cleared or not," many move sequences satisfy it; `reqLen`
is one exact integer target), with must-turn a common but non-necessary complication layered on
top for the majority of cases. 14/15 levels also confirm the "stays frozen for many further bursts"
pattern (4-34 more bursts, zero progress). **Revises the proposed fix direction**: target a
move/repair operator for closing an exact length deficit while preserving already-satisfied state
(a length-neutral-or-adjusting detour through unused slack) as the primary mechanism, with
must-turn-specific direction logic as a secondary refinement — still a qualitatively bigger change
than any constant tuned so far, still unimplemented. Caveat: 15 levels, not a random or exhaustive
sample of the full 156-level cluster — a population-wide check would sharpen the exact prevalence
numbers before committing engineering effort.

**Implemented, verified, and shipped the same day**: `closeLengthGap` (new function in
`modules/solver/repair-search.ts`, ablation flag `STRATEGY_REPAIR_LENGTH_GAP_CLOSE`, default-
enabled) — a bounded backtracking DFS triggered whenever a restart deadends with
`structuralDeficit(ws, level) === 0` (a new `solution.ts` export: every non-length/intersection
objective already satisfied, a sound signal because those masks only ever clear, never re-set,
during forward walking). Full design, a real methodology bug caught mid-session (a bare partial
ablation-config object silently disabling every OTHER unset strategy flag — the exact
cross-contamination gotcha `docs/solver-architecture.md` already documents, reproduced here in
test tooling rather than production code), and corrected verification numbers:
[`reports/2026-07-17-length-gap-close-operator.md`](../reports/2026-07-17-length-gap-close-operator.md).
**Net result**: `solver:bench --check` 160/160 no regressions, published-corpus wall time
unchanged within noise, and a clean 20-level `repair-close` A/B (corrected methodology, both
wall-clock- and node-budget-bounded framings) showing near-miss quality identical to baseline on
19/20 levels and one genuine, deterministic, reproducible solve (R02560) — with search throughput
*not* reduced (the wall-clock-bounded framing, the realistic production shape, actually explored
more nodes with the flag on). A 5% single-flag rescue rate on this sample, comparable to this
session's other targeted repair-cluster mechanisms (e.g. the attraction-diversity pass's own
2.5% repair-cluster rescue rate). **Not yet done**: a full corpus-2 batch refresh to get a
population-level (not 20-level-sample) solved-count delta — flagged as the natural next step per
the "Refresh, re-baseline, re-rank" process above, now that this change is verified safe to
include in that refresh.

**Addendum, 2026-07-18: closeLengthGap's own invocation/success rate measured directly, plus a
near-miss trigger extension.** The `solver-stress-refresh.yml` workflow that would give the
corpus-2 refresh above a population-level number has still never run end-to-end on real GitHub
Actions (see the "Where things stand" infrastructure note); rather than trigger that first real
run this session, continued with cheaper local diagnosis instead. Instrumented `closeLengthGap`'s
call site directly (`PF_LENGTH_GAP_DEBUG=1`, new permanent env-gated debug flag mirroring
`_REPAIR_DEBUG`) and ran it against a fresh 15-level `repair-close` sample: a clean bimodal split
— 67% of levels never invoke the operator at all within budget (never reach
`structuralDeficit === 0`), 33% invoke it thousands of times per run but it fails almost entirely
via genuine local-subtree exhaustion, not budget starvation (only 0.2–14% of calls hit the
4,000-node cap). Confirms the shipped operator's low rescue rate isn't a tuning problem when it
fires — the reachable neighborhood from a single restart's own trajectory just rarely contains a
rescue. More consequential finding: `R02655` (the cluster's closest near-miss in this sample,
`bestBadness=2`) never invoked the operator even once — its best-ever state is `len=1` plus
**one** pending `mustTurn` cell (`structuralDeficit === 1`, not `0`), invisible to the base
trigger's strict equality. Implemented `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS` (new
independently-ablatable flag, default-enabled) widening the trigger to
`structuralDeficit <= LENGTH_GAP_CLOSE_STRUCTURAL_SLACK` (= 1) — correctness unaffected (a
returned solve still only ever comes from the same `evaluatePrunedMove`/`isSolutionState` gate;
the trigger only changes when the bounded attempt is tried). A fresh 20-level A/B (including
R02655 specifically) found one genuine rescue (a different cluster member, R02319 — R02655 itself
still didn't close within budget even with the wider trigger), 16/20 identical, 3/20 modest
badness regressions on non-solving levels, near-neutral cost once the one early-exit solve is
excluded from the comparison. Published corpus: 160/160 both with and against the flag (in-process
isolated A/B, not a git-diff before/after), `solver:bench --check` 160/160 no regressions. Shipped
default-enabled per this file's existing convention. See
[`reports/2026-07-18-length-gap-close-invocation-rate.md`](../reports/2026-07-18-length-gap-close-invocation-rate.md).
**Not yet done, same reason as above**: a full corpus-2 refresh to get this flag's real
population-level contribution stacked on the base operator.

**Campaign 1 closed out, 2026-07-18, once the refresh above finally landed.** Full writeup:
[`reports/2026-07-18-campaign-1-closing-summary.md`](../reports/2026-07-18-campaign-1-closing-summary.md).
Verified via `diff-baseline.mjs --retry-failures`: +28 genuine improvements, 2 confirmed
regressions (both deterministically root-caused to `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS`
via direct flag A/B — a documented, not hidden, trade-off, net clearly positive), 24 flaky
apparent regressions (batch-contention noise, not code issues). Re-clustered against the fresh
population: `repair-close` 139→124, `repair-far` 754→765. A direct instrumented case study on
R02655 (the extension's own motivating level) confirms `closeLengthGap`'s bounded local
backtracking has a real ceiling — 6,727 near-miss triggers on the identical frozen state, zero
solves — even though the level itself is solved by some other, unpinned part of the full attempt
ladder. **Standing conclusion for any future continuation**: three independent constant-tuning
attempts on the stagnation plateau all failed, and this session's evidence sharpens *why* —
independent local restarts (plain repair restarts, or `closeLengthGap`'s own bounded backtrack)
keep rediscovering the same dead end without learning from the failure. The next lever isn't
another bounded local operator or restart-diversity tweak; it's giving the search memory of its
own failures (the cheap-sound-transposition-signature question left open earlier in this file,
or a genuinely different conflict-driven search paradigm) — a materially bigger investment,
correctly left unattempted rather than half-built this session. `repair-far` (765 levels) was
never targeted by Campaign 1 at all and remains fully open for Campaign 3.

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
documented for R02248/R01465
(`reports/2026-07-16-r02248-orientation-scoring-interaction.md`/`reports/2026-07-16-r02248-pattern-scan.md`)
(properly-isolated ablation, using
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
pass so far has used) is the concrete next step. **Both tried on R00440, same day**:
per-level witness-divergence using its real selected profiles (`intersectionHarvest`,
`objectiveFirst`, `repair`) came back statistically identical to the generic-default pass (54–58
vs. 56 discrepancy, `maxStepRank` still 2 throughout) — this technique is genuinely exhausted for
R00440, not just under-applied. Level reduction found something more consequential than a
discriminator: it very likely produced a **genuinely infeasible** candidate (repair-disabled
main-loop search collapses from millions of real nodes on the original to a 38-node complete
exhaustion on the reduced form — this codebase's own signal for "provably no solution"), a real
`stress:reduce-level` limitation for repair-gated levels the tool's own docs didn't previously
cover — see
[`reports/2026-07-17-r00440-reduction-infeasibility-finding.md`](../reports/2026-07-17-r00440-reduction-infeasibility-finding.md)
and the now-updated `docs/solver-dev-tooling-plan.md` Component G. **Picked a non-repair-gated
`dfs-plain` member instead, same day, specifically to sidestep that blind spot: R02657.** Reduction
here was clean and trustworthy (phase 2 made zero changes — already-minimal after phase 1's free
strip), landing on an 11×11 grid, single `mustCross`, 14 landmarks (6 `adjacentTurn`, 8
`decorative`), `reqLen: 68`, `reqInt: 1` — notably almost no self-intersection required, a
structurally different profile from every fragile-scoring case studied (`default` archetype,
meaning no existing `ATTEMPT_POLICY` rule claims it; the full 16-config unrouted ladder still fails
entirely). All 5 known flags, individually and combined, leave it untouched — a **second, clean
negative reference**, spanning a genuinely different structural shape than R00440 (small grid vs.
large, `reqInt` 1 vs. 9, non-repair-gated vs. gated, `default` archetype vs.
`high-intersection-burden`). See
[`reports/2026-07-17-r02657-second-negative-reference.md`](../reports/2026-07-17-r02657-second-negative-reference.md).
**Campaign 2's conclusion for this session**: the harder ~93% majority is not one narrow pattern
the current diagnostic toolkit hasn't quite reached — it spans genuinely different structural
profiles, none touched by the known fragile-scoring family. **The missing-archetype hypothesis
this raised was checked against the population and corroborated, same day**: every one of the
100-level sample's 6 `default`-archetype unsolved members (not a cherry-picked subset — all 6)
shares R02657's exact profile — low `reqInt` (1–3), small-to-medium grid, and heavy combined
turn-landmark density (`adjacentTurn`+`decorative`+`surround`+`mustTurn`, 14–22 landmarks covering
10–15% of the grid). 100% consistency across a small but *complete* same-sample population is a
real signal, not proof — `default` archetype currently just means "no `ATTEMPT_POLICY` rule
matched," but empirically it also means this specific shape for every case found here, suggesting
turn-landmark density isn't currently a first-class routing signal even though it clearly shapes
this subgroup. **The cheap fix (policy reordering) was checked directly and ruled out, same day**:
gave each of R02657-reduced's 16 existing attempt configs its own full, dedicated 8s budget
(bypassing the shared ladder split entirely) — every single one times out, each burning 20.8–29.7
million genuinely-explored nodes. No existing technique gets close even with complete independent
attention, so reordering/prioritizing which of the 16 gets tried first (the cheap, low-risk fix a
new `ATTEMPT_POLICY` rule could deliver) would not help this level — the gap is in what the
techniques themselves can do, not the order they're tried. **The existing turn-constraint scoring
machinery was also checked directly, same day** (`SCORE_ADJ_TURN_URGENCY`, `SCORE_MUST_TURN_URGENCY`,
`SCORE_MUST_TURN_EXIT_GUIDANCE` — found by reading `scoring.ts`, not assumed; none were in the
original 5-flag fragile-scoring test set) — individually and combined, all leave the level fully
untouched (44–50M nodes, timeout regardless). **This makes the negative result exhaustive, not
under-explored**: 8 total scoring flags (5 fragile-family + 3 turn-specific) and all 16 attempt
configs with full dedicated budget have now been checked, and none of them do anything. **Revised
concrete next step for a future session**: a genuinely new admissible lower bound accounting for
outstanding turn-constraint landmarks, or a new scoring/ordering strategy that doesn't yet exist in
the codebase at all — either substantial, open-ended research, not a quick policy or flag tweak.

**The new-scoring-strategy fork was tried the same day and also ruled out.** Reading `scoring.ts`
directly (not assumed) found a real, specific asymmetry: `mustTurn` landmarks have a dedicated
`SCORE_MUST_TURN_EXIT_GUIDANCE` term (rewards the specific exit direction that satisfies the turn
requirement, not just distance); `adjacentTurn` — identical `TurnDir` semantics, confirmed via
`search-state.ts`'s actual constraint-clearing logic — has no equivalent. Implemented
`SCORE_ADJ_TURN_EXIT_GUIDANCE` mirroring the proven `mustTurn` pattern (including its documented
before/after-apply calling-convention fixes), `tsc` clean. **Tested and found a clean null result**:
0/6 targeted levels (R02657-reduced with full dedicated per-config budget, plus R00285/R01129/
R02221/R02356/R02541) newly solve. Reverted per this session's evidence-based-change standard — see
[`reports/2026-07-17-adj-turn-exit-guidance-null-result.md`](../reports/2026-07-17-adj-turn-exit-guidance-null-result.md).
This rules out the turn-*direction*-choice mechanism specifically (on top of turn-*urgency* and the
unrelated fragile-scoring family, both already ruled out above), narrowing the field further.

**The admissible-lower-bound lever was scoped, and an offline (zero-production-risk) analysis run
the same day, per explicit user direction to investigate but not implement given the real
correctness stakes.** `adjTurnLowerBound` (`lower-bounds.ts`) takes a simple max over pending
`adjacentTurn` objects, unlike `mustPass`/`mustCross`'s existing MST-based combined bounds — a real
gap, exactly on this population's 6–8-pending-object shape. A standalone script computed a naive
MST-style combined bound (single-linkage inter-object distances, standard and provably sound) at
each level's initial gate state and compared it to the existing bound directly. **Counterintuitive,
useful result: the naive MST bound is looser (30–64% smaller), not tighter, on all 5 levels
tested** — the existing bound anchors to one specific object's own goal-distance, while the naive
MST construction uses the global-minimum goal-distance across all objects, a more optimistic
(weaker) final-leg assumption that outweighs its more accurate multi-object connecting cost. Neither
bound dominates the other; combining them soundly (`max(existing, MST)`, itself a standard
admissible-heuristics technique) is safe, but whether it would ever actually help needed checking
beyond the gate state.

**Follow-up, same day: mid-search-state sampling — decisive, not just unvalidated.** Replayed each
level's withheld witness path through the real search-core primitives (same technique
`witness-divergence.mjs` uses) and sampled `max(existing, MST)` at ~30–65 real intermediate states
per level across R00285/R01129/R02356/R02541 (183 samples total). **The naive MST term wins only 5
times out of 183 (all on one level), by at most +2 steps** against a `reqLen` in the 80s–100s —
`max(existing, MST)` would be a no-op for 3 of 4 levels and a rounding error on the fourth. This
closes the naive single-linkage-MST-plus-global-minimum-goal-distance construction off decisively —
not "unvalidated," a real negative result. See
[`reports/2026-07-17-adjturn-mst-bound-offline-analysis.md`](../reports/2026-07-17-adjturn-mst-bound-offline-analysis.md)
for the full construction, both rounds of numbers, and why a tour-aware goal-distance refinement
(the natural next idea) turns out to reduce to the same global-minimum formula already tested — a
genuinely different technique (e.g. a Held–Karp-style 1-tree bound, or folding `goal` itself into
the graph as a must-reach node) would be needed to make further progress here, not an incremental
tweak to what's been tried.

**A boolean deadlock-feasibility check — `mustTurn`'s proven pattern, generalized to
`adjacentTurn` — was tried the same day and also found ineffective, though for a more
interesting reason than "doesn't help."** `mustTurnDeadlocked` (a pending must-turn cell whose
`edgeUsage` has both axis bits set can never be re-entered — provably unsatisfiable) has no
`adjacentTurn` equivalent; only the (already-weak) additive lower bound exists. Implemented
`adjTurnDeadlocked`, generalized correctly for the one real structural difference (an
`adjacentTurn` object's requirement can be satisfied at *any* of several adjacent cells, so the
check only fires once *all* of them are exhausted), unit-tested, verified `solver:bench --check`
160/160. **Instrumented with call/fire counters before measuring effectiveness — found ZERO
fires across ~88.7 million evaluations spanning 6 structurally diverse levels**, including 3
levels picked specifically to favor triggering it (`reqInt` 14-16, vs. the target archetype's
1-3). The condition is real (the unit tests construct it directly) but apparently never survives
in practice: a still-pending object needs every turn at its adjacent cells to be wrong-direction
across *all* of them, and the existing intersection-deficit prune already cuts off that kind of
unproductive multi-cell wandering first. Cost was negligible (+1.5% nodes/+0.4% time on a
15-level sample) but with zero measured benefit, **the change was reverted** per this session's
evidence-based-change standard. See
[`reports/2026-07-17-adjturn-deadlock-check-null-result.md`](../reports/2026-07-17-adjturn-deadlock-check-null-result.md).
Combined with the earlier MST-bound result: **both natural generalizations of
`mustPass`/`mustCross`'s existing bound/pruning machinery to `adjacentTurn`'s multi-cell shape
have now been tried and found ineffective** for this archetype — not because either construction
was wrong, but because `adjacentTurn`'s "any of several cells can satisfy it" shape structurally
resists the single-object techniques that work for `mustTurn`/`mustPass`/`mustCross`.

**A third generalization — articulation-point/topology-based dead-end-pocket detection — tried
2026-07-18, same result.** Prompted by an externally-sourced research survey (see
[`reports/2026-07-18-articulation-point-prevalence-check.md`](../reports/2026-07-18-articulation-point-prevalence-check.md)
for the full writeup and how that survey was itself assessed). A 40-level prevalence check
(offline, no solver code touched) found the phenomenon it targets — multiple small, disjoint,
objective-bearing pockets whose combined forced out-and-back cost a per-object bound would
underestimate — in only 1/40 levels; every other "gated pocket" found was either objective-free
clutter (a 1–2 cell dead end) or a single giant catchment (one doorway to almost the whole level,
already fully captured by ordinary BFS distance). Not implemented, same evidence-based-change
standard as the other two.

**Characterizing the harder majority remains genuinely open** — this is the honest,
thoroughly-evidenced state to hand off: two structurally distinct negative references, a
corroborated (6/6) population pattern, every existing cheap scoring/ordering lever exhaustively
ruled out (8 original flags + the new exit-guidance term + all 16 attempt configs), and now
**three** independent bound/pruning generalizations (the MST-style lower bound, tested to 183
real states; the deadlock-feasibility check, tested to ~88.7M evaluations; articulation-point
pocket detection, tested to a 40-level prevalence sample) all tested to a decisive conclusion
rather than left as a guess. What remains is either a fundamentally different
technique that doesn't try to extend `mustPass`/`mustCross`/`mustTurn`'s single-object machinery
to `adjacentTurn`'s multi-object shape (untried), or acceptance that this archetype needs
research beyond scoring/pruning tweaks entirely — both substantial, open-ended future work.

**The real-attempt-policy-profile witness-divergence closure (same day, see below in the
`dfs-plain` section) reframes what "a fundamentally different technique" should even mean here.**
Across 18 `dfs-plain`/`repair-close` levels tested with each level's own real profile, per-step
local move ranking is essentially perfect (`maxStepRank` ≤ 3 on every level, every profile) yet
the search still fails — meaning the bottleneck isn't heuristic quality (scoring/ordering) *or*
branch-pruning tightness (bounds) in the usual sense, both now well-evidenced dead ends. This
points toward a different failure mode entirely: DFS with long paths and a large branching
factor plausibly re-explores functionally-equivalent dead subtrees reached via different move
orders — the classic setting where a transposition table / dead-state memoization pays off.

**The premise was checked the same day with a crude signature first, then corrected the same
day once the crude signature's own flagged unsoundness turned out to matter empirically, not
just in principle.** Instrumented `dfsFromGate` (temporarily; reverted before shipping both
times — pure measurement, zero production risk) to track state-signature repeats within one
attempt. First pass, a crude signature
(`pos|mustMask|mustCrossMask|adjTurnMask|mustTurnMask|surroundMask|ints|pathLength`): 92-99%
apparent duplicate rate across 6 levels/13 attempts spanning every population tested. **Second
pass, the actually-sound signature** (full visited-cell identity, not just an `ints` count, plus
`edgeUsage` at every visited cell and portal-usage history — the standard no-approximation
transposition-table key): **the real duplicate rate is 0.5-16%, an order of magnitude lower**,
and R02657 (the level with the *most* extreme crude-signature rate, 98.7-99.2%) has the
*lowest* sound-signature rate of any level tested (0.5-1.1%). Almost all of the crude
signature's apparent duplication was states that merely looked similar while being genuinely
different in the ways that matter — precisely the false-equivalence failure mode the original
pass's own soundness caveat warned about, now confirmed as the dominant case rather than a
theoretical risk. See
[`reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md`](../reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md)
(the correction is recorded at the top of that report, original numbers kept intact below it per
this session's practice of not quietly rewriting a claim).

**Revised conclusion: this lever is weak, not the "highest-leverage" one a same-day earlier
draft of this section claimed.** A sound transposition table would eliminate on the order of
1-2% of node visits on most levels tested (up to 16% on one outlier attempt) — real but modest,
and very plausibly not even worth its own per-node overhead (computing/hashing a full
visited-cell-set + `edgeUsage` signature is not free; the sound-signature measurement itself ran
5-6× fewer total nodes than the crude one in the same budget, from instrumentation cost alone).
**Downgraded from "clear next priority" to "checked and found weak"** — not worth pursuing
further without first finding a *cheaper* sound (or provably-conservative) signature that still
catches meaningful duplication, which is now the open question if this is ever revisited, not
"should the naive version be built" (answered here: no). The broader lesson, worth carrying
into future diagnostic work in this repo: when a cheap proxy signature is known to be loose in a
specific direction (here, a crude signature that strictly *overcounts* matches relative to a
sound one, since it ignores information), measuring where the sound version actually lands is
not optional due diligence before making a "this is the priority" claim — it's the number that
answers whether something is actually worth building.

**Campaign 3 — `repair-far` (507) + the robust cores.** Attacked last, armed with whatever
Campaigns 1–2 teach. If nothing generalizes, genuinely-new techniques (constraint propagation
over intersection/must-cross budgets; witness-shape-informed macro moves suggested by
solution-profile family resemblance) get prototyped behind ablation flags and held to the same
verification bar as everything else — the fast-portfolio-scheduler verdict
(`reports/portfolio/portfolio-scheduler-decision.md`) is the model for how a plausible idea gets
measured and, if slower, honestly shelved.

**Read [`reports/2026-07-30-solvability-plateau-diagnosis.md`](../reports/2026-07-30-solvability-plateau-diagnosis.md)
before starting either of those two.** It tested four explanations for the plateau and killed
three: move ordering is *not* the deficit on the failing population (68.1% vs 65.1% first-choice
accuracy, measured with the confound controlled), no prune rejects valid moves (0.0% across ~12,000
decisions), and the `reqInt == nodes - distinctCells` identity is already exploited by
`PRUNE_MC_CEILING` plus topology's volume check. It also shows CP-SAT — which already has conflict
learning and global propagation — timing out on the same levels, which is evidence against porting
those capabilities rather than for it. What survives is that **must-cross is the mechanic that
makes these levels hard** (8.2s with turns and surround enabled, 150s+ timeout with must-cross), and
that its fully-reserved regime covers ~half the failures. The obvious way to exploit that — a degree
prune on required cells — is unsound and is documented as such above `isConnected` in `topology.ts`.

**Then read [`reports/2026-07-31-mustcross-forced-structure.md`](../reports/2026-07-31-mustcross-forced-structure.md),
which takes up that surviving lead and partially corrects the degree-prune dismissal.** The
affordability test for the in-and-out detour that makes a degree prune unsound is the **free**
intersection budget (`reqInt - ints - popcount(mustCrossMask)`), not `intNeeded` — and
`reqInt <= must-cross count` drives the free budget to zero for the whole search, so the regime the
plateau report ruled out as "never coinciding with a zero budget" is exactly the one that does: 536
unsolved corpus-2 levels. The report also derives, from `isMoveDynamicallyValid`, that every
must-cross cell forces two straight passes and therefore all four of its orthogonal neighbours onto
the path — validated against 15,032 stored solutions (50,086 must-cross cell instances, zero
violations), a median of 18 required cells per failing level that the search never derives, though
the *editor* validator has asserted the underlying rule all along. Its recommended sequence starts
with reservation-aware connectivity in `topology.ts` (cheap, and unlike the dead-flipper change,
`solver:bench --check` is not blind to it — 35 published levels are in the regime). It also measures
and rejects the tempting half: widening the MST bound with those cells buys +10 steps against 72
steps of slack, i.e. the same experiment the 2026-07-30 MST revert already measured at −12 levels
net. Census tool: `scripts/stress/mustcross-forced-structure.mjs`.

**That sequence's step 1 has now shipped and is the campaign's first real win —
[`reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md).**
`PRUNE_MC_RESERVED_WALL` walls off every visited cell in the connectivity fill once the free
intersection budget reaches zero, keeping only the pending must-cross cells open (their revisit is
the one already paid for). Sound over 2.6M replayed steps of real solutions across all three
corpora. On the published corpus it is a **pure speed** change — 134 of 160 levels bit-identical on
`nodesExpanded`, and those levels run **2.25x faster**; on the fully-reserved regime it also prunes,
worth **+2 solves on a 24-level unsolved sample at 73% of the wall time**. Three lessons that
generalise past this change: (1) at *matched nodes* it measures −1 solve — a speedup only pays once
the budget it frees is actually spent, so matched-**wall-cost** is the valid comparison and every
unsolved level in the typical-budget baseline is node-bound by construction; (2) `workSpent` is blind
to it (+11% work on a change that halved CPU), because the meter prices `isConnected` at a flat 12
units however much it floods; (3) the next step is the general case — at most `freeInt` visited cells
may be entered on any remaining route, computable as `freeInt + 1` bit-parallel dilation passes,
applying to every level with a small remaining budget rather than only the reserved regime.

> **Status update (2026-08-05): the must-cross forced-structure sequence is now complete —
> shipped at steps 1–3, step 4 falsified.** The "general dilation" idea in point (3) just above
> *was* built and measured (`FREE_INT_DILATION_MAX`) — **reverted**: 1.88x faster at identical
> node counts (reproducing the wall's speed signature exactly) but −2 solves at matched nodes,
> net 0 at matched wall cost. The mechanism transfer doesn't hold: at `freeInt == 0` the wall
> changes the *topology* of the remaining problem (a hard boundary, whole regions unreachable);
> at `freeInt >= 1` a single paid hop reopens the far side almost everywhere, so the fill gets
> cheaper without getting smaller in the way that prunes. Full writeup and the
> do-not-rebuild-without-a-new-argument note:
> [`reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md#the-follow-up-built-and-reverted-bounded-cost-reachability-at-freeint--1).
>
> Steps 2 and 3 of `mustcross-forced-structure.md`'s own sequence shipped separately and did pay
> off: **step 2** (`PRUNE_MC_FORCED_NEIGHBOR`, forced-cell availability as a dead-state test) —
> +3 solves on a 120-level unsolved-must-cross sample at matched nodes, 0 regressions. **Step 3**
> (`PRUNE_MC_FORCED_FIRST_MOVE`, forced-first-move) — sound and free, solve-neutral as predicted
> (all instances single-gate, so no gate *choice* eliminated). **Step 4** (forced-edge
> propagation, "no other edge at a doubly-must-cross-adjacent cell is usable") is **falsified** —
> not true in general, and no simple sound narrowing exists either; a qualifying cell has
> multiple structurally distinct legal completion patterns that disagree even on its own visit
> count, so nothing about its "spare" edges survives every valid completion. See that report's
> own step-by-step callouts for the full derivations, falsification data, and the reasoning for
> why a genuinely correct version of step 4 would need real constraint propagation, not a static
> rule — a materially different and larger undertaking than steps 1–3, not a continuation of them.
> **The must-cross forced-structure sequence is closed; Campaign 3 should look elsewhere next**
> (see `docs/future-work.md`'s "Solver rule-recognition gaps" section for live candidates: portal
> parity is the most promising, not yet properly investigated).

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
