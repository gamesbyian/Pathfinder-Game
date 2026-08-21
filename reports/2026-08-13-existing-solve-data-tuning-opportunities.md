# Existing solve-data tuning opportunities (2026-08-13)

> **Status:** analysis complete; documentation only  
> **Scope:** saved cold-solve attempt logs, hint provenance, family manifests/variants, historical baselines, winning-lineage artifacts, and matched GitHub Actions A/B artifacts  
> **Decision:** use existing artifacts first to rank narrow tuning experiments; do not begin with a global optimizer, generic scheduler learner, wider beam, or another broad variant-generation campaign  
> **Immediate gates:** fix family-result identity before the wide-trove boundary run; then run the existing boundary report and a matched repair-probe constant sweep

## Executive conclusion

The repository already contains enough information to direct several tuning efforts without another
large exploratory solve campaign.

The strongest current opportunities are:

1. **repair-probe adaptive budget calibration** — the existing 300-level matched A/B artifacts contain
   a much stronger badness/outcome relationship than the original 12-level calibration used to choose
   `BADNESS_GATE=10` and `MIN_SCALE=0.35`;
2. **family-boundary ranking** — the wide controlled-variant trove contains exact symmetry cliffs,
   work cliffs, nearby non-symmetry rescues, winning-config switches, and full failed-attempt traces;
3. **beam score/retention diagnosis** — winning-lineage evidence and exact-prefix labels point much
   more strongly toward score representation at bounded frontiers than toward global beam widening
   or tie randomization;
4. **phase- and feature-conditioned path-rank diagnosis** — existing referee-valid hint paths can
   identify where successful moves become disfavored, provided provenance classes and family leakage
   are handled correctly;
5. **online allocation signals** — current-invocation progress, plateau, extinction, and starvation
   telemetry can nominate bounded allocation experiments without reviving the closed cold-start
   scheduler or using exact-level historical knowledge.

The artifacts do not support treating historical winning configurations, raw hint frequency, raw
variant rows, or technique winner counts as direct production policy. Those observations are
success-biased, scheduler-censored, version-dependent, and often densely correlated within one parent
family.

## Existing evidence inventory

### Wide family trove

The research branch
`claude/variant-levels-solver-insights-tpk4qg` contains the completed wide-trove artifacts:

- 7,839 of 7,842 planned `(level, mode)` tasks completed;
- 1,962 parents represented;
- 72,965 generated variants in the published summary denominators;
- 36,622 cold variant solves;
- 78,429 full per-variant attempt records across seven chunked reports;
- controlled symmetry, local-mutant, swap, constrained-shuffle, and group-reshuffle relationships;
- family manifests retaining parent identity, corpus, content hashes, generator version/seed,
  mutation details, witness relationship, and structural features;
- per-variant hint files retaining path plus solver, technique, profile, template, beam width,
  attempt index, seed, nodes, elapsed time, work, budget, termination, solver version, and
  hint-guidance context.

See
[`reports/families/2026-08-07-wide-trove-summary.md`](https://github.com/gamesbyian/Pathfinder-Game/blob/claude/variant-levels-solver-insights-tpk4qg/reports/families/2026-08-07-wide-trove-summary.md).

The original variant solve pass was cold/level-blind with respect to stored witnesses. The later
`hint-workbench --preset=enumerate-targeted` enrichment was not. Analyses must keep those evidence
classes separate.

### Ordinary corpus and hint artifacts

The repository also retains:

- canonical attempt logs and historical baselines;
- successful hint provenance across published, Corpus 1, and Corpus 2;
- feature-solvability reports;
- historical cost-minimum and cost-drift reports;
- winning-attempt analysis;
- winning-lineage and extinction artifacts;
- CP-SAT exact-prefix labels;
- repair badness, seed, plateau, nogood, and rollback research artifacts;
- direct A/B workflow reports and downloadable Actions artifacts.

This makes the main missing layer a set of disciplined joins and matched follow-up experiments, not
more raw data collection.

## Finding 1: repair badness is already a useful live allocation signal

### Recovered matched-sample distribution

The matched 300-level repair-probe sample ran at the real 50,000,000-node production budget:

- control run: [31651604893](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/31651604893);
- adaptive treatment run: [31651610514](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/31651610514).

The old artifacts predate the explicit `repairProbe` persistence tag added by PR #1368. For this
analysis, the probe was reconstructed as the initial contiguous repair-attempt prefix. In this
workflow/version, 247 rows have exactly the expected two ordinary repair attempts followed by one
must-turn-biased repair attempt; 53 rows have no biased tier. The newer explicit tag must be used for
all future calibration.

Among the 247 levels that reached a biased tier:

| Ordinary-tier minimum `bestBadness` | Levels | Biased-tier direct solves | Rate |
| --- | ---: | ---: | ---: |
| 0–5 | 38 | 7 | 18.4% |
| 6–10 | 37 | 3 | 8.1% |
| 11–15 | 38 | 1 | 2.6% |
| 16–20 | 61 | 1 | 1.6% |
| 21+ | 73 | 0 | 0.0% |

The monotonic decline is the first population-scale evidence that the live ordinary-tier badness
signal meaningfully predicts the marginal value of the later biased tier.

The adaptive arm:

- preserved all 12 direct biased-tier wins observed in the control;
- gained `R02719` through a later `beam:objectiveFirst@beam5000` attempt after releasing repair
  budget;
- lost no sampled solve;
- changed 108/300 to 109/300;
- reduced aggregate nodes by 1.5% and work by 9.0%.

### Constant-sweep nomination

A retrospective cap replay against the control arm gives a cheap experiment-nomination result:

| Gate | Floor | Approx. biased-tier nodes avoided | Recorded direct wins whose solve depth exceeds replayed cap |
| ---: | ---: | ---: | ---: |
| 10 | 0.35 | 32.8% | 0 |
| 8 | 0.35 | 40.1% | 0 |
| 6 | 0.35 | 47.7% | 0 |
| 4 | 0.35 | 54.4% | 2 |

This replay is not a capability verdict. Reducing a tier's cap changes later attempts and can create
or lose full-ladder solves; the observed successful run is only one sample from repair's stochastic
trajectory. It does establish a narrow and evidence-based next sweep:

1. keep `MIN_SCALE=0.35` fixed;
2. compare gates 10, 8, and 6 in matched level-blind full-ladder arms;
3. include the complete eligible population if affordable, otherwise use the existing deterministic
   stratified sampler with all observed high-badness direct winners forced into the sample;
4. compare solved IDs, total work, and which later recipient consumes the released budget;
5. only investigate lower floors after the gate sweep.

Lowering the gate is currently better motivated than lowering the floor. Gate 4 already crosses two
observed winning solve depths; gates 6 and 8 do not.

### Required future telemetry

PR #1368 added the durable `repairProbe` attempt tag and
`scripts/stress/repair-probe-badness-report.mjs`. Future artifacts should use those fields directly
and retain:

- ordinary minimum badness;
- biased-tier budget scale and exact cap;
- biased-tier outcome and terminal badness;
- released nodes/work;
- next attempted config and whether it wins;
- exact flags, worker count, solver ref, seed, node/work budgets, and run ID.

## Finding 2: controlled families already identify concrete current-main retest candidates

A parent-aware join of the Corpus-1 wide attempt report to its contemporaneous historical baseline
found:

- 101 symmetry families in the raw report;
- 18 with mixed solved/failed sibling outcomes;
- 34 with at least a 10x work spread among solved orientations;
- four historical canonical failures with one or more solved symmetry siblings.

| Parent | Solved symmetry siblings | Cheapest solved sibling work | Dominant/recurring evidence |
| --- | ---: | ---: | --- |
| `R00526` | 4/7 | 1,755,178 | three diverse `intersectionHarvest@beam5000` wins; one repair win |
| `R01407` | 2/7 | 713,109 | two repair wins; swap variants solve 6/10 |
| `R01875` | 2/7 | 319,693 | two repair wins; local mutants solve 4/10 and swaps 5/10 |
| `R01675` | 2/7 | 5,044,296 | two repair wins; constrained-shuffle and swap each solve 4/10 |

These are historical research labels, not claims about current-main capability. The wide run used an
older solver version and a different operating budget from current main, while the canonical
baseline is historical re-verification evidence rather than today's cold capability baseline.

They remain unusually strong retest candidates:

- symmetry siblings are isomorphic controls, so a solve-status cliff indicates finite-search
  representation dependence rather than intrinsic puzzle difficulty;
- repeated winning configurations across siblings provide a concrete attempt context for
  differential replay;
- nearby non-symmetry rescue rates separate an isolated orientation effect from a wider fragile
  competence boundary.

### Diagnostic order

1. Cold-run each canonical parent and its seven symmetry siblings on current main at one fixed
   node/work budget.
2. Drop families whose historical cliff no longer exists.
3. For surviving cliffs, use `family-pair-divergence.mjs` to compare mapped legality, mechanic
   state, lower bounds, prune verdicts, scores, survivor order, and first ranking divergence.
4. Run existing score-flag/profile/template ablations only after the first divergence is localized.
5. Promote a mechanism only if it recurs across unrelated parent families.
6. Validate through ordinary `solveLevel()` on targets, held-out families, solved controls, and the
   full corpus.

`R00526` is the strongest initial beam score/retention candidate. `R01407`, `R01875`, and
`R01675` are the strongest initial repair ordering/trajectory candidates.

## Finding 3: the boundary report has an identity-key correctness blocker

`scripts/family-boundary-lib.mjs` currently deduplicates variant results by bare result `id`.

The Corpus-1 wide report contains 37 repeated bare IDs belonging to different parents. For example:

- `F00064-sym-01` exists under parent `R00064`;
- the same `F00064-sym-01` exists under parent `S00064`;
- their configurations, work, and outcomes are independent.

A bare-ID last-write-wins map can therefore attach one parent's result to another parent's manifest,
silently corrupting family solve rates, work cliffs, mutation summaries, and actionable rankings.

Before the wide-trove boundary run:

1. key variant results by a namespaced identity such as
   `(parentCorpus, parentId, variantId)`;
2. make manifests and result rows supply the same identity explicitly;
3. fail loudly on ambiguous bare IDs rather than silently overwriting;
4. add a regression fixture with the `R00064`/`S00064` collision shape;
5. report duplicate and unmatched counts in boundary-report diagnostics.

This is an analysis-tool correctness issue. It does not imply that the stored variants or solves are
wrong.

## Finding 4: beam tuning should target representation before width

The current winning-lineage cohort and exact-prefix work already narrow the beam question:

- 15 of 17 failed same-configuration runs lost their last known labelled support at score/width
  retention;
- follow-up classification found 10 clear mis-rankings, 3 weak-margin cases, 0 exact-tie/stable-order
  cases, and only 2 width-saturation cases;
- exact labels prove at least one rank-1 sibling dead while a viable sibling from the same parent
  exists.

This makes the preferred next analysis:

1. collect score cutoff, margin, equal-score population, and neutral future-opportunity descriptors
   at the actual extinction decisions;
2. use CP-SAT labels where supported, preserving `live`, `dead`, and `abstain`;
3. stratify by extinction class and parent;
4. test a neutral descriptor or a tiny protected family reservoir only after it discriminates viable
   from dead siblings on held-out parents.

Global width expansion and tie shuffling are weak first moves: the observed failures are mostly
mis-ranking, exact ties were absent, and extra width taxes every level.

The family trove can strengthen this work by asking whether the same descriptor and extinction
mechanism recur across symmetry siblings and small controlled mutations.

## Finding 5: hints are path labels, not an optimization corpus in their raw form

The variant hint files contain enough information to extend the existing hint-weight calibration and
divergence tools, but three provenance classes must remain separate:

1. **cold solver discoveries** — admissible as historical capability/configuration evidence when
   `usedExistingHints=false` and `hintGuided=false`;
2. **hint-guided or targeted-enumeration discoveries** — admissible as validated path-shape and
   scoring-replay labels, not cold capability evidence;
3. **inherited witnesses** — admissible for validation, symmetry mapping, solution descriptors, and
   oracle-style diagnostics, never as a discovered solve.

A defensible calibration study should:

- replay every accepted path through the authoritative referee/state machinery;
- measure target-move rank, score margin, cutoff margin, and phase at every branching decision;
- condition on mechanic features, nav density, turn load, profile, template, and solution phase;
- weight parents equally or fit a hierarchical model so one family with many variants/hints cannot
  dominate;
- split train/test by whole parent family, never by variant row;
- additionally hold out solver version or generation cohort when testing temporal generalization;
- use local move imitation only to nominate a small scoring hypothesis;
- require a full-ladder level-blind solved-count/work A/B before changing production weights.

A global coordinate-descent fit across all stored hints would mostly teach the solver to imitate its
own historically sampled paths and over-count dense families. It would not establish that the new
weights solve more unseen levels.

## Finding 6: attempt logs can nominate allocation changes, but winner counts cannot decide them

Full attempt traces allow several useful analyses:

- whether a canonical parent reached a sibling-dominant config;
- how much work it allocated there;
- whether the attempt exhausted, timed out, or was starved;
- whether successful siblings usually win before or after a particular tier;
- conditional repair success by badness, seed, retry index, and budget;
- cost cliffs under one controlled mutation;
- historical configurations worth direct current-main replay.

The outer ladder stops after the first success. Consequently:

- later configs are censored on easy levels;
- a frequent winner may merely run early;
- a specialist can be cheap when it wins and expensive overall when promoted;
- failed attempts and cumulative work before the winner matter more than winner count alone.

Use family-conditioned winning-attempt analysis and historical scheduler replay as filters. Any
promising order/reserve/budget change still needs a direct matched full-ladder A/B.

## Existing negative evidence that constrains tuning

Do not use the new data to reopen unchanged mechanisms already closed by direct evidence:

- generic repair-winner classifier;
- repair fallback node reserve;
- attraction-diversity reserve;
- admissible-order profile reserve without population evidence covering both gain/loss shapes;
- repair beam seeding in its tested full-ladder form;
- repair elite-prefix DFS;
- repair turn bias;
- generic cold-start portfolio scheduler;
- global beam dedup removal or exact-state beam dedup;
- portal parity envelope;
- `closeLengthGap` floor/budget increases for the diagnosed R00648 residual.

Historical provenance also failed to justify an automatic scheduler change: 96.3% of eligible latest
discoveries tied their historical node minimum, and the large apparent gaps were explained by
different configurations/budgets or timing-sensitive runs. Use old minima to nominate controlled
replays only.

## Ranked execution plan

### 1. Correct and run the family boundary analysis

- Fix namespaced variant identity.
- Run the existing `family-boundary-report.mjs` over all seven wide attempt chunks and matching
  manifests/baselines.
- Produce JSON and Markdown with symmetry cliffs/regret, non-symmetry fragility, robust families,
  work cliffs, mutation effects, and sibling config concentration.
- Record solver version/budget on every ranked row.
- Do not solve anything during this phase.

### 2. Re-test the top historical symmetry cliffs on current main

Start with `R00526`, `R01407`, `R01875`, and `R01675`. Use current-main cold results to decide
which families still warrant divergence and ablation work.

### 3. Run a matched repair gate sweep

Compare gates 10, 8, and 6 with floor 0.35. Keep commit, flags, worker count, seed, sample, node
budget, work budget, and deadline identical. Evaluate full-ladder solved IDs and total work.

### 4. Extend path-rank analysis to selected families

Do not scan every hint first. Use boundary rankings to select families, then derive phase-local
ranking/margin evidence from cold, targeted, and inherited path classes separately.

### 5. Couple family and lineage evidence

For surviving beam-oriented cliffs, collect the same score/width extinction fields used by the
winning-lineage work. Prefer mechanisms that recur both across unrelated canonical levels and across
isomorphic siblings.

## Decision rules

A tuning change is ready for promotion only if:

1. it uses level mechanics or current-invocation evidence, never exact-level history;
2. the motivating effect survives a held-out parent-family test;
3. target gains survive the complete production ladder;
4. matched total work is equal or lower, or increased work buys a justified net solve gain;
5. published and previously solved controls do not regress beyond an explicitly accepted bound;
6. full-corpus gained/lost IDs and work are reported;
7. any stochastic effect is repeated or otherwise stability-classified;
8. artifacts retain exact commit, flags, budgets, worker count, run ID, and provenance.

## Cross-links

- [Variant corpus solver research plan](../docs/variant-corpus-solver-research-plan.md)
- [Solver future work](../docs/future-work.md)
- [Solver opt-in experiment ledger](../docs/solver-opt-in-experiment-ledger.md)
- [Repair-probe starvation and adaptive-budget report](2026-08-12-repair-probe-early-main-loop-starvation.md)
- [Symmetry orientation-sensitivity synthesis](2026-08-08-symmetry-orientation-sensitivity-synthesis.md)
- [Symmetry semantic-equivariance prefix pilot](2026-08-11-symmetry-equivariance-prefix-pilot.md)
- [PR #1356 review follow-up / winning-lineage cohort](2026-08-11-pr1356-review-follow-up.md)
- [Historical hint-cost minima](2026-07-30-historical-hint-cost-minima.md)
- [Hint-cost drift triage](2026-07-29-hint-cost-drift-triage.md)
- [Repair-winner classifier rerun](2026-08-07-repair-winner-classifier-rerun.md)
