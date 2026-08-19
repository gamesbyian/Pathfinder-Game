# Technique capability census: design and calibration (2026-08-19)

> **Status:** built, locally validated, not yet dispatched at population scale.
> **Scope:** every technique the production ladder ever generates, tested in isolation (the FULL
> node budget to itself, not a shared ladder slice) against a large sample of every currently-unsolved
> level in all 3 real corpora, plus a curated set of complementary technique pairs and ablation-flag
> variants. Answers "which technique solves or fails, and how" — a different question from every
> existing batch tool in `docs/solver-architecture.md`'s tool-selection table, none of which isolate a
> single technique's full budget across a whole corpus.

## Why this is a new tool, not a reuse of an existing one

`scripts/method-probe.mjs` already runs one (or a short ordered list of) technique(s) directly
against a level set, and its own `method-probe-sweep.yml` already shards that across 20 GitHub-hosted
runners — but for exactly ONE `--only` value per dispatch, sharing budget across the list rather than
giving each technique its own. Testing all 34 techniques this way would mean 34 separate dispatches
(34 × 20 = 680 shard-jobs, no unified cross-matrix, no pairs, no flags). The new pieces
(`scripts/build-technique-census-plan.mjs`, `scripts/technique-census.mjs`,
`scripts/combine-technique-census-shards.mjs`, `.github/workflows/technique-census.yml`) reuse
method-probe.mjs's own core machinery — its `attemptConfigKey` parser is now
`scripts/attempt-config-key.mjs`, a shared module both files import, extracted as a pure code move
(method-probe.mjs's own behavior verified unchanged) — but run every technique against every level as
its own fully-isolated cell in one unified plan.

## The technique universe: grounded, not synthetic

"Every available technique" is derived **live**, by calling `getAttemptConfigs(level, null)` (the
real ladder's own config generator) over every level in all 3 corpora and collecting the distinct
`attemptConfigKey()` strings — not a synthetic profile × template × beam-width cross-product, which
would include combinations the ladder never actually produces. This gives **34 technique keys**,
self-updating if the ladder's routing ever changes:

- 18 DFS-family configs (including the two repair variants)
- 11 beam-family configs (widths 2000/5000, plain and diverse)
- 5 admissible-order-search profiles (`ida:default`/`none`/`mustCrossFirst`/`intersectionHarvest`/`nearClosureRescue`)

## Four tiers, each answering a different piece of the question

| Tier | Population | Budget | Cells | What it answers |
|---|---|---:|---:|---|
| **T1** | all 34 techniques + 7 promoted flag-variant rows × a 400-level sample (all 7 currently-unsolved Corpus-1 levels + a seeded random draw from Corpus-2's 881 unsolved) | 50,000,000 nodes (full) | 15,942 | **The decision-bearing tier**: can any single isolated technique (or known-complementary flag variant) crack a level the production ladder can't, given the whole budget instead of a shared slice |
| **T2** | all 34 techniques × every level in all 3 real corpora (1,962 levels, solved and unsolved) | 1,000,000 nodes | 66,708 | Cheap breadth/redundancy fingerprint across the whole game — which techniques are near-duplicates of each other, which are load-bearing |
| **T3** | 10 curated complementary pairs × a 200-level sub-sample of T1's own pool | 50,000,000 nodes (shared across the pair, same cost shape as one T1 cell) | 2,000 | Does trying A-then-B find something neither finds alone |
| **T4** | 1 curated ablation-flag experiment (`STRATEGY_ARCHETYPE_ROUTING` off — the one flag without prior evidence of a different solve population) × the same 200-level sub-sample | 50,000,000 nodes | 200 | Exploratory flag sensitivity, smaller sample. `PRUNE_MC_NEIGHBOR_BUDGET`/`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`/`STRATEGY_DEDUP_NEAR_TIE_RETENTION`/`STRATEGY_REPAIR_TURN_BIAS` — every flag WITH such evidence — were promoted to T1 instead (see "External review" below); `PRUNE_PORTAL_PARITY_ENVELOPE` was dropped entirely (evidence-backed inert) |

**Total: 90,130 cells.** T3/T4's sample is a strict subset of T1's, so every (technique, level) pair
they touch already has a T1 baseline — pairs and flags are compared by joining against T1's data at
combine time, not by re-running a redundant control cell.

### Why the population isn't literally "every level"

The literal ask — every technique × every currently-unsolved level, full budget — is ~30,192 cells at
T1 alone; at a naive cost estimate that's well over the platform's hard per-shard ceiling (GitHub-
hosted runners cap a job at 360 minutes, not configurable higher). T1's 400-level sample is a
deliberate, documented trade against that hard constraint: all of Corpus-1's tiny unsolved population
(7 levels) plus 84% coverage-equivalent of Corpus-2's after calibration (see below). T2 recovers full
"every level" breadth cheaply, at a much smaller budget.

## Calibration: measured, not guessed

An initial cost model (~150s/cell, extrapolated from a handful of anecdotes earlier in this session)
would have forced a much smaller sample. Six real `method-probe.mjs` runs at the full 50,000,000-node
budget, one per technique family, against six different currently-unsolved Corpus-2 levels, gave a
materially different picture:

| technique | level | nodes reached | wall time |
|---|---|---:|---:|
| `dfs:objectiveFirst` | R02097 | 50,000,159 (cap) | 33.6s |
| `beam:objectiveFirst@beam2000` | R02545 | 29,639 | 0.4s |
| `beam:intersectionHarvest@beam5000(diverse)` | R02391 | 394,646 | 4.0s |
| `ida:default` | R02177 | 50,000,000 (cap) | 35.3s |
| `dfs:repair:repair` | R02813 | 50,000,128 (cap) | 35.7s |
| `beam:mustCrossFirst@beam2000` | R03315 | 116,554 | 0.8s |

**The key finding: a single beam config run in isolation very often exhausts its own frontier far
below the node cap**, because it isn't being fed fresh restarts by the rest of the ladder the way it
is in production — bounded search width genuinely runs out of distinct states to expand. dfs/ida/
repair techniques, when they don't solve, reliably run to the cap at a consistent ~0.7ms per 1,000
nodes (~35s at 50M). Beam is bimodal: often cheap (exhausts in 1–5s) but capable of running the full
cap when the level structure allows deep exploration (~150–200s, per a real production winning beam
attempt recorded earlier this session: `R02422` reached 50,333,677 nodes in 155,856ms). Blended
estimate: **~35s/cell for dfs/ida/repair, ~50s/cell blended for beam, ~45s/cell overall average.**

## Cost estimate and safety margin

| tier | cells | est. cost |
|---|---:|---:|
| T1 | 15,942 | ~204 runner-hours |
| T2 | 66,708 | ~37 runner-hours |
| T3 | 2,000 | ~25 runner-hours |
| T4 | 200 | ~3 runner-hours |
| **total** | **84,850** | **~268 runner-hours** |

Across 60 shards: **~4.47h/shard average**, against GitHub's hard 360-minute (6h) per-job ceiling —
**~25% margin** (post-review numbers; the original 90,130-cell/600-level design had ~18% margin
before trading level-sample breadth for the promoted flag variants — see "External review" below). Cells are interleaved (technique varies fastest within a tier) so any contiguous
shard slice contains a representative mix of cheap and expensive cells rather than clumping. Given
real calibration uncertainty (6 samples, not a population), every shard is additionally wrapped in a
`timeout -k 30s --preserve-status 345m` wall-clock safety net (15 minutes under the hard cap) — a
shard running hotter than calibrated stops gracefully and reports whatever it completed, since
`technique-census.mjs` writes its output after every single cell. Any gap the safety net catches is
closed by a follow-up dispatch with `--skip-existing` pointed at the prior partial output, not a
full re-run.

## Concurrency safety: shards never write to git-tracked data

A level can appear in cells assigned to *different* shards across *different* tiers (the plan shards
the flat cell list, not the level list) — two shards touching the same level's hint file concurrently
would be a real git-merge hazard. Every shard is strictly read-only against the repository; the
**combine job is the sole writer**, running once after all 60 shards finish, using the exact same
`createHintCapture`/`provenanceFromSolveResult` path every other tool in this codebase uses (never
hand-rolled — see `CLAUDE.md`'s provenance section) so a newly discovered solution is recorded with
full, correctly-shaped provenance.

**A real bug was caught here during local validation, not in CI.** The first version of the combine
script loaded each corpus via a raw `JSON.parse` before calling `hintCapture.record()`/`flush()`. The
corpus JSON files themselves carry no inline `.hints` (hints are split into `data/hints/*.json` by
design), so every level's `.hints` read back as `undefined`, and `writeLevelsWithHints` — seeing every
level as "never registered by `readLevelsWithHints`, therefore always considered touched" — rewrote
**every** hint file in the corpus with empty content. A local 1-solve test run wiped all 160
published levels' hint files before this was caught (`git diff` showed full content deletion, not a
formatting change) and reverted. Fixed by loading through `readLevelsWithHints` (which populates the
`UNTOUCHED_HINTS_STATE` tracking `writeLevelsWithHints` depends on to skip untouched levels) instead
of a raw parse; re-verified afterward with the same test — exactly one file changed, a clean
single-line diff appending the one new solution found.

## Reuse: what the combine step derives automatically

Beyond the raw cross-matrix (`combined-cells.json`, the reusable research artifact everything else is
derived from):

- **`technique-capability-summary.md`** — per-technique solve count/rate and average cost, T1 vs T2.
- **`level-technique-coverage.json`** — per level, which techniques solved it in isolation (T1 ∪ T2).
  A level with **zero** isolated-technique solves anywhere is a mechanistically different kind of
  unsolved than one an isolated technique *does* crack — the first is a genuine technique blind spot,
  the second is a starvation/routing candidate for the queue's own Priority 1 (failure-conditioned
  late-tier allocation).
- **`pair-synergy.md`** — for each T3 pair, how many levels it solves that *neither* member solves
  alone (joined against T1's per-technique data for the same level).
- **`flag-sensitivity.md`** — for each T4 experiment, how many levels the flag toggle flips relative
  to T1's default-flag baseline for the identical technique+level pair — an isolated flag effect, not
  confounded by ladder position or budget-sharing the way a full-ladder A/B can be.

## External review (2026-08-19): what changed and why

A second design review raised several points before dispatch. Two were real, verified problems;
the rest were valuable framing that reshaped the flag/variant selection and the combine step's
analysis, at no extra cost (derived from data already being collected) except where noted.

**1. Gate-budget fairness — a genuine correctness bug, fixed.** The review noted that sharing one
node budget across all of a level's gates, gate-outer, can recreate starvation *inside* the very
experiment meant to eliminate it — exactly the pathology `STRATEGY_GATE_INTERLEAVING`/
`runGateSerialAttempts` already exist to prevent in the production ladder. Checked against the real
corpora: Corpus-2 is uniformly single-gate (1,700/1,700), Corpus-1 has only 2 multi-gate levels (both
already solved, so outside T1's population) — but **published carries real exposure: 54 of 160
levels (34%) have 2–3 gates, and T2 tests every published level.** `technique-census.mjs`'s `runCell`
now divides the cell's node budget fairly across gates (`remaining / gatesLeft`, recomputed at each
gate boundary, unspent share rolling forward — the same pattern `runGateSerialAttempts` already
uses), instead of letting gate 1 exhaust the whole budget before gate 2 is ever tried. Verified
directly against a real 4-gate level (`S00103`): before the fix, gate 1 alone would consume a
400,000-node test budget; after, all 4 gates got a fair, near-even share (100,051 / 100,075 / 99,998
/ 99,919 nodes). A `gateSummaries` field now records each gate's own node spend and share on any
multi-gate cell (omitted on single-gate cells, the overwhelming majority, to keep output lean).

**2. Flag classification into three groups, and re-selecting T4 around it.** Reframed the flag
selection around the review's classification: (a) production-default flags stay off the census
entirely — T1/T2's `ablation: null` baseline already **is** "canonical technique;" (b) flags with
**existing evidence** a toggle produces a genuinely different solve population are promoted to
first-class T1-scale variants, not a smaller side-experiment; (c) everything else — including every
budget-management/orchestration flag (reserve fractions, late-tier reserves) and every
`STRATEGY_*_RETRY` wrapper — is excluded outright, since an isolated single-technique cell has no
ladder to allocate a reserve against and a retry tier exists only to rerun a *whole ladder pass*,
meaningless outside one. Applying this:

- **Promoted to T1 scale** (`T1_PROMOTED_VARIANTS`, full 400-level population, full 50M budget,
  restricted to levels where the flag is mechanically reachable): `PRUNE_MC_NEIGHBOR_BUDGET` off on
  `beam:mustCrossFirst@beam2000`/`dfs:mustCrossFirst` (must-cross levels — this session's own
  `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` work already confirmed 2 real targets); `PRUNE_CONNECTIVITY_
  AXIS_EXHAUSTED` off on `beam:intersectionHarvest@beam5000`/`beam:objectiveFirst@beam5000`
  (confirmed regression on `R02248`/`R02114`/`R00592`); `STRATEGY_DEDUP_NEAR_TIE_RETENTION` off on
  the same two beam configs (confirmed net −7/+27 at ladder scale); `STRATEGY_REPAIR_TURN_BIAS` on
  (the `dfs:repair:repair(turnBiased)` technique key doesn't exist without it, so it's a genuine
  algorithmic variant on must-turn levels, not a toggle comparison). 7 variant rows total, 3,493
  additional T1 cells.
- **Dropped entirely, not re-swept**: `PRUNE_PORTAL_PARITY_ENVELOPE`. Per the review's own "closed
  negative opt-ins go in a secondary museum sweep only where isolation asks a materially new
  question" — the existing closure (`reports/2026-08-08-portal-parity-envelope.md`) already found
  its reject condition fires **zero times** over ~240M searched nodes. Isolation doesn't change
  whether a prune condition can fire; re-testing it asks nothing new.
- **Left at T4's smaller, exploratory sample**: `STRATEGY_ARCHETYPE_ROUTING` off — no prior evidence
  of a different solve population, kept as a cheap diagnostic rather than promoted.

**3. Sample size trimmed 600 → 400 to afford the promotions.** The 7 promoted variants add 3,493
cells to T1 at the same full budget — recalibrated total cost with `t1_sample_size=600` came to
~370h (over the 60-shard/360-runner-hour envelope). Trimming to 400 (still all 7 of Corpus-1's
unsolved levels, plus ~45% of Corpus-2's 881) brings the total to **84,850 cells, ~268 runner-hours,
~4.47h/shard average — a wider margin (~25%) than the original 600-level design had, despite testing
materially more per level.** This is the direct trade the review's own framing argues for: fewer raw
levels, but every level gets a fair shot from techniques we already have specific reason to think
matter.

**4. The oracle union is now a first-class, automatically-computed headline statistic.** The
review's point 5 — "how many levels are solved by at least one isolated technique, compared with
production" — was previously only reconstructable by hand from `level-technique-coverage.json`.
`technique-capability-summary.md` now leads with it explicitly: of T1's sample levels (0 solved by
production at the frozen baseline, by construction), how many at least one T1 technique solves
alone, and how many when T2's cheaper pass on the same levels is folded in too. This is the number
that decides whether the next lever is scheduling (queue Priority 1) or genuinely new algorithms.

**5. Per-technique unique-solve counts and solve-cost distribution, free from data already
collected.** `technique-capability-summary.md`'s T1 table now carries a `unique` column (levels only
that technique solves among all 34 + 7 promoted variants) and a `median solve nodes` column — both
pure cross-tabulations of results the run was already producing, at zero extra compute. Directly
serves the review's point 6 ("a technique with few total solves but dozens of unique solves is an
extremely valuable specialist").

**6. Identity-key fix, found while wiring in the above.** A promoted variant (e.g.
`beam:mustCrossFirst@beam2000` with `PRUNE_MC_NEIGHBOR_BUDGET` off) shares its bare technique key
with its default-ablation counterpart. Every aggregation (`technique-capability-summary.md`,
`level-technique-coverage.json`, the uniqueness count) now keys on `variantLabel ?? techniqueKeys[0]`
so a variant's solves are never silently merged into its base technique's row — caught locally
before it could misattribute which configuration actually solved anything. `pair-synergy.md`/
`flag-sensitivity.md`'s own baseline lookup was separately hardened to only ever read `ablation ===
null` T1 rows, so a promoted variant's own reading can never leak in as "the" default baseline a
pair or flag experiment gets compared against.

**7. Explicitly deferred, not built — the schema already supports them without re-running
anything.** Point 7 (joining capability with level-blind features — block density, nav density,
reqInt regimes) and point 8 (response curves at 1M/5M/10M/20M/50M) are real, valuable follow-ups but
each is its own substantial piece of work (point 8 alone would need ~5x this run's compute if done
as separate full sweeps). Every row already carries `corpus`/`levelId`/`levelPos`, so a follow-up
script can join against the raw level files for point 7 without touching this pipeline; point 8 is
better designed *after* seeing this run's actual solve-cost distribution (the new median-solve-nodes
column) rather than guessing budget breakpoints blind. Point 9 (routing experiments built from the
strongest signals) is exactly `docs/solver-optimization-current-queue.md`'s own Priority 1 — this
run's oracle-union/uniqueness/pair-synergy output is the evidence that lane has been waiting for.

## How to dispatch

`workflow_dispatch` on `.github/workflows/technique-census.yml` — every parameter (baseline, sample
sizes, node budgets, seed, max-parallel, save-hints) is a documented input with the calibrated
defaults above. The `baseline` input must point at a frozen `summary.json` from a real
`solver-stress-refresh.yml` run (default: `31918095910`, the 819/1700 baseline this session's other
work is measured against) — this defines T1/T3/T4's "currently unsolved" population and should be
refreshed to the latest capability run before dispatch if one has landed since.
