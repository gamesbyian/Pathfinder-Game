# Technique capability census: design and calibration (2026-08-19)

> **Status:** built, locally validated, not yet dispatched at population scale.
> **Scope:** every technique the production ladder ever generates, tested in isolation (the FULL
> node budget to itself, not a shared ladder slice) against **every currently-unsolved level in both
> real corpora** (888 levels, no sampling — see the worker-pool addendum below), plus a curated set of
> complementary technique pairs and ablation-flag variants. Answers "which technique solves or fails,
> and how" — a different question from every existing batch tool in `docs/solver-architecture.md`'s
> tool-selection table, none of which isolate a single technique's full budget across a whole corpus.

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
| **T1** | all 34 techniques (minus 1 provably-degenerate eligibility skip) + 7 promoted flag-variant rows × **every currently-unsolved level in both real corpora, no sampling** (888 levels: all 7 Corpus-1 + all 881 Corpus-2) | 50,000,000 nodes (full) | 35,042 | **The decision-bearing tier**: can any single isolated technique (or known-complementary flag variant) crack a level the production ladder can't, given the whole budget instead of a shared slice — for literally every level currently in that state, not a sample of them |
| **T2** | all 34 techniques (minus the same eligibility skip) × every level in all 3 real corpora (1,962 levels, solved and unsolved) | 1,000,000 nodes | 65,714 | Cheap breadth/redundancy fingerprint across the whole game — which techniques are near-duplicates of each other, which are load-bearing |
| **T3** | 10 curated complementary pairs (skipped where a member is eligibility-ineligible) × a 200-level sub-sample of T1's own pool | 50,000,000 nodes (shared across the pair, same cost shape as one T1 cell) | 1,935 | Does trying A-then-B find something neither finds alone |
| **T4** | *(empty — see "Was that the only one?" below)* | — | 0 | Structural placeholder for a future flag confirmed to reach live search code, not merely routing. Every candidate so far is either promoted to T1 (`PRUNE_MC_NEIGHBOR_BUDGET`/`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`/`STRATEGY_DEDUP_NEAR_TIE_RETENTION`/`STRATEGY_REPAIR_TURN_BIAS`, each verified to read `prep._cfg` inside actual search code) or removed (`PRUNE_PORTAL_PARITY_ENVELOPE`: evidence-backed inert; `STRATEGY_ARCHETYPE_ROUTING`: provably inert in this census's execution model — only ever read inside routing logic this census bypasses) |

**Total: 102,691 cells** (final, post-review + post-eligibility-audit + post-worker-pool-addendum
numbers; see "External review", "Was that the only one?", and the worker-pool addendum below for how
this was reached from the original 90,130). T3/T4's sample is a strict subset of T1's, so every
(technique, level) pair they touch already has a T1 baseline — pairs and flags are compared by joining
against T1's data at combine time, not by re-running a redundant control cell.

### Why T2/T3/T4 don't also run full-budget on literally every level

T1 now genuinely is "every technique × every currently-unsolved level" (see the worker-pool addendum
below for how that became affordable) — but running the *full* 50M budget on literally every level in
**all 3 real corpora** (1,962 levels, including the 1,074 already solved) would be wasted compute: a
solved level's own production solve already answers "can the solver do this," and re-running 34
techniques' full budgets against it in isolation asks a much narrower question (which of the 34 would
independently have found it) that T2's cheap 1M-node breadth pass already answers well enough to
surface near-duplicate/load-bearing technique clusters. T3/T4 sample a 200-level sub-population of
T1's own pool because a pair or flag experiment's value is in the *comparison* against a T1 baseline
that already exists for that same (technique, level); running every pair against all 888 T1 levels
would multiply cost for combinatorial coverage the curated-pair selection doesn't need.

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

Sequential-equivalent cost (1 worker), from the calibrated per-cell rates below (`## Calibration`):

| tier | cells | est. cost (1 worker) |
|---|---:|---:|
| T1 | 35,042 | ~448 runner-hours |
| T2 | 65,714 | ~36 runner-hours |
| T3 | 1,935 | ~24 runner-hours |
| T4 | 0 | 0 runner-hours |
| **total** | **102,691** | **~508 runner-hours** |

Every shard runs with **`--workers=2`** (see the worker-pool addendum immediately below) — a measured
**1.78x** wall-clock speedup, bringing the actual dispatched cost to **~285 runner-hours**. Across 60
shards: **~4.76h/shard average**, against GitHub's hard 360-minute (6h) per-job ceiling — **~21%
margin** (the original 90,130-cell/600-level, 1-worker design had ~18% margin; the eligibility audit
then removed 1,394 cells outright before the worker-pool addendum reinvested the freed headroom into
full T1 population coverage rather than banking it as extra slack — see "External review", "Was that
the only one?", and the addendum below). Cells are interleaved (technique varies fastest within a
tier) so any contiguous shard slice contains a representative mix of cheap and expensive cells rather
than clumping — and cells are also dispatched to the worker pool on demand, not by a fixed static
split, so heterogeneous per-cell cost within a shard doesn't leave one worker idle while the other is
still on an expensive cell. Given real calibration uncertainty (6 samples, not a population, plus the
speedup measurement's own sampling error), every shard is additionally wrapped in a `timeout -k 30s
--preserve-status 345m` wall-clock safety net (15 minutes under the hard cap) — a shard running hotter
than calibrated stops gracefully and reports whatever it completed, since `technique-census.mjs`
writes its output after every single cell (both the sequential and worker-pool code paths call the
same `writeReport` after each result). Any gap the safety net catches is closed by a follow-up
dispatch with `--skip-existing` pointed at the prior partial output, not a full re-run.

## Worker-pool parallelism and full-population T1 (2026-08-19 addendum)

GitHub-hosted `ubuntu-latest` standard runners are 2-vCPU, and `scripts/technique-census.mjs`'s
sequential path used only one of them — real headroom left on the table for a 6h-per-shard-capped
batch job. `scripts/solver-worker-pool.mjs` (`runWorkerPool`/`runWorkerMain`) already provides exactly
this pattern for `level-blind-capability-sweep.mjs`, so the census now reuses it rather than inventing
a second parallelism mechanism: `technique-census-cell.mjs` extracts the previously-inline per-cell
execution logic (level-blind prep, per-gate fair-share budget division, attempt execution, referee
validation) into a shared `createCellRunner()`, called identically from the sequential path
(`--workers=1`, unchanged behavior) and from a new dedicated worker entry point
(`technique-census-worker.mjs`, `--workers>1`) — so a cell's outcome can never depend on which path
ran it. `technique-census.mjs` gained a `--workers=N` flag selecting between them.

**Verified, not assumed**, before trusting it for the real dispatch: a 60-cell timing plan run
sequentially (87s) and pooled at `--workers=2` (49s) — a **1.78x** wall-clock speedup — with a full
cell-by-cell correctness comparison between the two arms (`ok`, `nodesExpanded`, `status` for all 60
cells) showing **0 mismatches**. `npx eslint` clean on all three new/changed files.

**The freed headroom was spent on coverage, not banked as slack.** A 1.78x speedup at the previous
83,456-cell/400-level-sample plan would have simply cut shard time from ~4.37h to ~2.46h/shard — a
~59% margin, more than this calibration's uncertainty actually warrants sitting idle. Instead, T1's
sample was widened from a 400-level draw (all of Corpus-1's unsolved + ~45% of Corpus-2's) to **the
literal full currently-unsolved population of both corpora (888 levels, 0% sampling)** —
`scripts/build-technique-census-plan.mjs`'s `--t1-sample-size` now accepts `'all'` (the new default,
also used when the flag is omitted) alongside a numeric cap for a smaller/faster test-drive run; `'all'`
resolves to `Infinity` rather than a hardcoded population count, so a future baseline with a different
unsolved count still gets full coverage without this file needing a matching edit. This raises T1 from
15,810 to 35,042 cells (2.2x) while the *dispatched* wall-clock cost only grows from ~4.37h/shard to
~4.76h/shard (workers=2 more than compensates for the larger population) — landing at ~21% margin,
comparable to the original 400-level/1-worker design's ~18%, while eliminating sampling variance from
T1 entirely: every currently-unsolved level gets isolated-technique evidence from this run, not just a
seeded random 45% of Corpus-2's. (The now-largely-redundant `PRIORITY_LEVEL_IDS` guarantee mechanism —
which force-included three research-flagged still-unsolved levels, `R02119`/`R02422`/`R02644`, into a
partial sample — is kept in the plan builder rather than deleted: it's dead weight only in `'all'`
mode, but it still matters for a deliberately smaller test-drive `--t1-sample-size` run, and removing
it would mean re-deriving it if that need comes up again.)

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
unsolved levels, plus ~45% of Corpus-2's 881) brings the total to **84,850 cells, ~268 runner-hours
(pre-eligibility-audit; see "Was that the only one?" below for the final 83,456-cell/~262-hour numbers),
~4.47h/shard average — a wider margin (~25%) than the original 600-level design had, despite testing
materially more per level.** This is the direct trade the review's own framing argues for: fewer raw
levels, but every level gets a fair shot from techniques we already have specific reason to think
matter. *(Superseded later the same day — see the "Worker-pool parallelism and full-population T1"
addendum below: the 400-level trade was a response to a 1-worker compute ceiling; once that ceiling
moved, the trade was revisited and T1 went to the full, unsampled population instead.)*

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

## Level-blind measurement compliance

Every cell's solve attempt follows `docs/solver-level-blindness.md`'s non-negotiable boundary exactly:
`technique-census-cell.mjs`'s `runCell` strips `id`/`stressMeta` from the raw level object before
calling `Solver.prepareLevelForSolver` (`const { id: _id, stressMeta: _sm, ...rawLevel } = entry;`) —
byte-identical to `level-blind-capability-sweep.mjs`'s own pattern — so no individual solve attempt
ever has access to the level's identity, prior solved/unsolved status, or any other out-of-band
signal. The node budget, ablation config, and technique choice for a cell are all fixed by the plan
before the solve runs; nothing about a specific solve's own behavior can leak back into how it's
configured.

Using baseline solved/unsolved status to *select which levels the census's T1 sample covers* is a
distinct thing from feeding that status into an individual solve, and is not a level-blindness
violation: it is a research-design decision about where to spend compute (precedented by
`solver-highbudget-unsolved-sweep.yml`, which does the same thing), not a change to what any solve
attempt itself can see or use. With T1 now covering the full unsolved population rather than a sample,
this distinction matters less than it did — there's no longer a sampling decision to defend — but the
underlying solves were, and remain, fully level-blind regardless.

## How this serves open solver research

This census wasn't designed in a vacuum — its four output artifacts (`level-technique-coverage.json`,
`technique-capability-summary.md`, `pair-synergy.md`, `flag-sensitivity.md`) each answer a question a
currently-open research thread is already asking, at full-population scale instead of the few-dozen-
level spot-checks those threads have had to rely on so far:

- **`docs/solver-optimization-current-queue.md`'s Priority 0** (the confirmed
  `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` beam-dedup regression, currently evidenced on exactly 3 levels —
  `R02248`/`R02114`/`R00592` — plus one case where the flag's default-on state is what succeeds,
  `R03248`) gets its first population-scale read: the `beam:intersectionHarvest@beam5000`/
  `beam:objectiveFirst@beam5000` `connectivity-axis-exhausted-off` T1-promoted variants run against
  **every** currently-unsolved Corpus-2 level, not just the 3 known ones — `flag-sensitivity.md`
  reports exactly how many additional unsolved levels the toggle flips either direction. That directly
  answers whether the regression's population is "3 known cases plus scattered noise" or a much wider,
  previously-invisible pattern — the open question the queue's own writeup already flags as unresolved
  ("the population signature is scattered... exactly why").
- **`docs/solver-heuristic-capability-gap-analysis.md`'s Priority 1** (`PRUNE_MC_NEIGHBOR_BUDGET`
  five-loss diagnosis and equal-work integration — population evidence already showed 611→665, +54
  net, 59 gained/5 lost) gets a complementary isolated-technique read from the
  `beam:mustCrossFirst@beam2000`/`dfs:mustCrossFirst` `mc-neighbor-budget-off` T1-promoted variants:
  which of the currently-unsolved, must-cross-eligible levels the flag alone recovers in isolation,
  independent of ladder position — narrower evidence than a full-ladder A/B, but isolates the flag's
  own effect from everything else moving around it in a shared ladder pass.
- **`docs/solver-optimization-current-queue.md`'s Priority 1** and
  **`docs/solver-heuristic-capability-gap-analysis.md`'s Priority 4** (failure-conditioned/late-reserve
  budget allocation — "the ladder usually spends the shared pool before every mechanically eligible
  technique receives a meaningful search") is exactly what the oracle-union headline stat and
  `level-technique-coverage.json` are built to distinguish: a currently-unsolved level with **zero**
  isolated-technique solves anywhere in T1∪T2 is a genuine technique blind spot (new algorithms
  needed), while one that at least one isolated technique *does* crack under its own full budget is a
  starvation/scheduling candidate — direct, population-scale evidence for which lane (new technique
  work vs. routing/allocation work) is the higher-value next investment, instead of the queue's current
  reliance on lifecycle classification (starved/capped/exhausted) alone.
- **`docs/solver-optimization-current-queue.md`'s Priority 6** (mechanics-conditioned technique
  routing — "confirm the observed block-density split between admissible-order and repair winners")
  and **`docs/solver-research-operating-model.md`**'s family/variant failure-routing taxonomy both
  benefit from `technique-capability-summary.md`'s per-technique unique-solve-count column: a
  technique with few total solves but many *unique* ones (solves nothing else does) is exactly the
  signal a mechanics-conditioned routing rule would key off — this run supplies that signal across the
  whole currently-unsolved population in one pass, rather than requiring a bespoke sweep per candidate
  rule.
- **`pair-synergy.md`** speaks directly to whether Priority 1's "failure-conditioned late-tier
  allocation" should ever route to a *specific* fallback technique conditioned on an earlier one's
  failure (as opposed to a generic reserve/retry), since it measures exactly that: does trying B after
  A find something neither finds alone, for 10 curated pairs already chosen for plausible
  complementarity (e.g. `dfs:mustCrossFirst` + `ida:mustCrossFirst`, `dfs:repair:repair` +
  `dfs:repair:repair(mustTurnBiased)`).

None of this substitutes for the queue's own next decision-bearing steps (a matched full-ladder A/B is
still required to actually change production routing) — but it replaces "spot-check 3-20 levels and
extrapolate" with "here is the full-population answer," which is a materially stronger evidence base
to design that A/B against.

## How to dispatch

`workflow_dispatch` on `.github/workflows/technique-census.yml` — every parameter (baseline, sample
sizes, node budgets, seed, max-parallel, save-hints) is a documented input with the calibrated
defaults above. The `baseline` input must point at a frozen `summary.json` from a real
`solver-stress-refresh.yml` run (default: `31918095910`, the 819/1700 baseline this session's other
work is measured against) — this defines T1/T3/T4's "currently unsolved" population and should be
refreshed to the latest capability run before dispatch if one has landed since. `t1_sample_size`
defaults to `'all'` (every currently-unsolved level in both real corpora); pass a number instead for a
smaller/faster test-drive run.

## "Does this ever run a technique we already know can't do anything different?" (2026-08-19)

Asked directly, and worth a real answer rather than an assurance. Investigated by reading the
relevant search code, not guessing — the general pattern (a DFS/beam/admissible-order *scoring
profile* like `mustCrossFirst` or `portalFirstTransfer`) is **not** provably redundant on a level
lacking its namesake feature: each profile differs from `default` across many weight dimensions at
once (`goalAttractionWeight`, `perimeterBiasWeight`, `antiDitherWeight`, ... — see
`modules/solver/policy.ts`'s `POLICY_PROFILES`), so the other weight differences still produce a
genuinely different search even at zero of the profile's own feature. Pruning on "probably not the
best fit for this level" would be exactly the kind of assumption this census exists to check
empirically — a technique winning outside its expected regime is one of its more interesting
possible findings, not noise to filter out. So that softer judgment is deliberately never used to
skip a cell.

One case **is** provably degenerate, though, and it was real: `dfs:repair:repair(mustTurnBiased)`
layers a pure additive bias on top of ordinary repair via a second, independently-seeded RNG stream
(`rand2` in `repair-search.ts`) that is only ever *consumed* when `ws.mustTurnMask !== 0` — a bit
that can never be set on a level with zero must-turn landmarks, while the primary stream (`rand`) is
seeded identically regardless of the bias flag. So on such a level the "biased" and ordinary repair
searches are the same search, not just similar ones. Verified empirically, not just read from the
code: on 3 real solvable levels, `nodesExpanded` and the full solution path matched exactly (70/93/58
nodes, byte-for-byte identical paths) between the two configs. This exact config is already gated the
same way in production's own `getAttemptConfigs` (`if (f.mustTurn > 0) ...`) — the census had
inherited the technique key correctly (it's real ladder output) but not the eligibility constraint
production enforces when deciding whether to generate it for a given level.

Fixed: `TECHNIQUE_ELIGIBILITY` in `build-technique-census-plan.mjs` gates this one key on
`mustTurn > 0` in T1, T2, and T3 (a pair containing an ineligible member degenerates to testing only
the other one — pure duplicate of that member's own T1 cell, so the whole pair-level is skipped
rather than half of it silently doing nothing). Saved 1,194 cells (15,942→15,810 in T1,
66,708→65,714 in T2, 2,000→1,932 in T3) — a modest ~15 runner-hour saving, but the more important
effect is removing rows from the capability tables that would otherwise silently duplicate another
row's numbers under a different label, which is worse than wasted compute: it's misleading output.

### "Was that the only one?" — asked again, found a bigger case

Pressed further: was the mustTurnBiased case the only one, or the only one found so far? Went
looking systematically rather than declaring the first find complete, checking a different failure
mode entirely — not "does this technique degenerate to another one," but "does this **ablation flag**
actually reach the code my census executes, or only code my census never calls."

**Every ablation flag promoted to T1 scale must be traced to a live `prep._cfg` read inside the
actual search functions this census's `runAttempt`/`attempt-dispatch.ts` call graph exercises**
(`search.ts`, `prune-gauntlet.ts`, `topology.ts`, `repair-search.ts`) — not merely "the flag exists
and sounds like it should matter." Applying that standard to all four promoted flags:

- `PRUNE_MC_NEIGHBOR_BUDGET`, `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`, `STRATEGY_DEDUP_NEAR_TIE_RETENTION`
  all read `prep._cfg` directly inside `prune-gauntlet.ts`/`topology.ts`/`search.ts`, functions
  genuinely on this census's execution path. **Re-verified empirically, not just architecturally**:
  ran the exact `technique-census.mjs` pipeline (not `method-probe.mjs`) on the `mc-neighbor-budget-
  off` variant against `R02119`, a level with a known ground-truth answer from earlier work this
  session (recovers only with `PRUNE_MC_NEIGHBOR_BUDGET` disabled) — solved, matching the known
  answer exactly (112,938 nodes, `beam:mustCrossFirst@beam2000`). Confirmed real, not just plausible.
- `STRATEGY_ARCHETYPE_ROUTING` is read **only** inside `attempts.ts`'s `getAttemptConfigs` — the
  function that decides which configs a *ladder* routes to. This census never calls
  `getAttemptConfigs`; every cell constructs its `AttemptConfig` directly and calls `runAttempt`,
  bypassing routing entirely. So the flag is not merely unlikely to matter here — it is **provably
  inert on every single cell it would generate, unconditionally, on every level** — a strictly bigger
  problem than the must-turn case (which was conditional on a level property; this one has no
  condition under which it does anything at all in this execution model). The entire
  `archetype-routing-off` T4 experiment (200 cells) was removed, not gated.
- A related, smaller finding surfaced by the same check: the `repair-turn-bias-on` T1 variant's own
  `ablation: { enable: ['STRATEGY_REPAIR_TURN_BIAS'] }` was *also* inert, for the identical reason —
  `attempt-dispatch.ts` reads `repairTurnBiased` straight off the `AttemptConfig` object (already set
  `true` by the `(turnBiased)` marker in the technique key string), never consulting `prep._cfg` for
  it. Not wasted compute (the cell still tests something real — the technique itself), but the
  ablation toggle implied the flag was what mattered, and it wasn't. Simplified to `ablation: null`.

T4 is now empty (`FLAG_EXPERIMENTS = []`) — every candidate that has ever been proposed for it is now
either promoted to T1 (evidenced) or removed (provably inert here). Left as a structural placeholder,
not deleted, for a future flag that's confirmed to reach live search code rather than only routing.
