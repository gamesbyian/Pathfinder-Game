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
| **T1** | all 34 techniques × a 600-level sample (all 7 currently-unsolved Corpus-1 levels + a seeded random draw from Corpus-2's 881 unsolved) | 50,000,000 nodes (full) | 20,400 | **The decision-bearing tier**: can any single isolated technique crack a level the production ladder can't, given the whole budget instead of a shared slice |
| **T2** | all 34 techniques × every level in all 3 real corpora (1,962 levels, solved and unsolved) | 1,000,000 nodes | 66,708 | Cheap breadth/redundancy fingerprint across the whole game — which techniques are near-duplicates of each other, which are load-bearing |
| **T3** | 10 curated complementary pairs × a 200-level sub-sample of T1's own pool | 50,000,000 nodes (shared across the pair, same cost shape as one T1 cell) | 2,000 | Does trying A-then-B find something neither finds alone |
| **T4** | 6 curated ablation-flag experiments (each gated to levels where the flag is mechanically reachable) × the same 200-level sub-sample | 50,000,000 nodes | 1,022 | Isolated flag sensitivity — extends several currently-open ledger/queue threads (`PRUNE_MC_NEIGHBOR_BUDGET`, `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`, `STRATEGY_REPAIR_TURN_BIAS`, `STRATEGY_DEDUP_NEAR_TIE_RETENTION`, `PRUNE_PORTAL_PARITY_ENVELOPE`, `STRATEGY_ARCHETYPE_ROUTING`) to full coverage instead of anecdote |

**Total: 90,130 cells.** T3/T4's sample is a strict subset of T1's, so every (technique, level) pair
they touch already has a T1 baseline — pairs and flags are compared by joining against T1's data at
combine time, not by re-running a redundant control cell.

### Why the population isn't literally "every level"

The literal ask — every technique × every currently-unsolved level, full budget — is ~30,192 cells at
T1 alone; at a naive cost estimate that's well over the platform's hard per-shard ceiling (GitHub-
hosted runners cap a job at 360 minutes, not configurable higher). T1's 600-level sample is a
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
| T1 | 20,400 | ~226 runner-hours |
| T2 | 66,708 | ~37 runner-hours |
| T3 | 2,000 | ~25 runner-hours |
| T4 | 1,022 | ~8 runner-hours |
| **total** | **90,130** | **~296 runner-hours** |

Across 60 shards: **~4.9h/shard average**, against GitHub's hard 360-minute (6h) per-job ceiling —
**~18% margin**. Cells are interleaved (technique varies fastest within a tier) so any contiguous
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

## How to dispatch

`workflow_dispatch` on `.github/workflows/technique-census.yml` — every parameter (baseline, sample
sizes, node budgets, seed, max-parallel, save-hints) is a documented input with the calibrated
defaults above. The `baseline` input must point at a frozen `summary.json` from a real
`solver-stress-refresh.yml` run (default: `31918095910`, the 819/1700 baseline this session's other
work is measured against) — this defines T1/T3/T4's "currently unsolved" population and should be
refreshed to the latest capability run before dispatch if one has landed since.
