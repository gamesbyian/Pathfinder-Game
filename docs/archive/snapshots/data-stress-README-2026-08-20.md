# Solver stress corpus

An experimental benchmark corpus whose **sole purpose is to evaluate and challenge the
production solver**. It is *not* player content: nothing in the normal (non-dev) app references
it, and it is never part of the normal boot payload — `data/levels.json`, `data/hints/`,
`level-heatmaps.json`, and `themes.json` are the only files fetched at ordinary boot, and these
levels can never appear in the ordinary level selector. Do not optimize them for aesthetics,
fairness, or fun — they exist to expose heuristic blind spots, orchestration weaknesses,
beam-width sensitivity, and generalization failures.

**Dev-Mode exception:** `stress-levels.json`, `stress-levels-random.json`, and `hints/` (this
directory's per-level saved-hint artifact for `stress-levels.json`, in the same
`{schemaVersion, hints: Hint[]}` format as `data/hints/<id>.json` — see CLAUDE.md's
hint-provenance section) *are* copied into the production build by `vite.config.ts`'s
`copyRuntimeAssets` (a narrow, explicitly-named
exception — `regression-set.json`, `smoke-set.json`, and `failure-inbox.json` are NOT, since
they're solver-tooling-only and never read by the browser). They are still never fetched during
ordinary play: only a signed-in admin flipping the Dev-Mode "Level Corpus" switch in the Options
Menu (`modules/dev-corpus.ts`) triggers that fetch, and only for Play/Edit — Review Mode and
submission/approval always read/write the real published corpus (Firestore `submissions` /
`published_levels`), never this directory, regardless of the switch's position. This exists so a
maker or admin can play-test and edit stress-corpus levels the same way as published ones,
without those levels ever being reachable by an ordinary player or leaking into what gets
reviewed/published.

**Location split:** the corpus JSON lives here, under `data/stress/`, alongside this working
doc; the generated reports it describes live in the sibling top-level
[`reports/stress/`](../../reports/stress/) directory (raw solver-run logs go to
[`logs/`](../../logs/) instead — see the repo root `CLAUDE.md` for the full logs-vs-reports
split). Everything in this doc that reads as a bare filename lives in this directory; report
filenames are called out explicitly with their `reports/stress/` prefix.

There are now **two corpora with deliberately different philosophies** — see "Second
corpus: uniform-random" below for why. Corpus 1 (`stress-levels.json`, this section and
"Batches"/"Future solver work") is hypothesis-driven; corpus 2 (`stress-levels-random.json`)
is solver-blind by design and documented separately so the two don't get conflated.

**Before validating a solver/heuristic change against either corpus, see the "Batches" table
below** for which batches here were built with explicit knowledge of the solver's own weaknesses
(highest overfitting risk if reused after the solver changes) vs. which were solver-blind — that
should shape which corpus you trust for which kind of claim. Per-level authorship/generation
provenance (who/what created each level, and when) now lives on the level data itself —
`level.provenance` — rather than in a separate doc; see CLAUDE.md's "Provenance" section.

## Files

| File | What it is |
|---|---|
| `stress-levels.json` | **Corpus 1** (hypothesis-driven + 300 solvable random instances, minus a 2026-07-11 non-square-grid cleanup — see "Square-grid cleanup" under "Second corpus" below): **102** generated levels in wire format + per-level `stressMeta` (hidden witness solution, batch/theory, complexity/challenge/novelty scores, seeds, generator notes). |
| `stress-levels-random.json` | **Corpus 2** (uniform-random, solver-blind, unsolvable/timeout subset): 1700 generated levels — see "Second corpus" below. The 300 solvable instances from the original 2000 have been migrated to Corpus 1; 1372 non-square levels were deleted and replaced (2026-07-11), so ids now range past R02000. |
| `hints/<id>.json` | Corpus-1 saved-hints artifact, one file per level, same `{schemaVersion, hints: Hint[]}` format as `data/hints/<id>.json` — see CLAUDE.md's "Provenance" section. Keyed by the level's own persistent `id` (e.g. `S00028.json`), not array position — migrated 2026-07-12 (`scripts/migrate-hint-files-to-id-keys.mjs`) after finding the `id` field wasn't actually protecting hint storage from reordering despite existing for exactly that purpose. |
| `hints-random/<id>.json` | Corpus-2's own saved-hints artifact, same format and same id-keyed convention (e.g. `R00028.json`) — a sibling directory rather than reusing `hints/` because both corpora number levels independently (see `scripts/level-data-io.mjs`'s `hintsDirFor`). |
| `regression-set.json` | Pinned regression set (`npm run stress:regression`): 5 solved historical canaries plus 3 structurally distinct current known-hard targets. `--update-baselines` refreshes matching solved measurements but never expectations. |
| `../../reports/stress/novelty-report.json` | Corpus-1 novelty report (`npm run stress:compare`). |
| `../../reports/stress/novelty-report-random.json` | Corpus-2 novelty report (vs. published + itself; a separate cross-check vs. corpus 1 was also run manually — see "Second corpus"). |
| `../../reports/stress/benchmark-latest.json` | Production-solver benchmark results (`npm run stress:benchmark`), freshly regenerated (2026-07-12) via a full sequential `--engine=sequential` official run against the current 102-level corpus: **85/102 solved**. |
| `../../reports/stress/batch-analysis.md` / `.json` | Corpus-1 per-batch analysis + highlights (`npm run stress:analyze`) — **stale as of the 2026-07-11 square-grid cleanup**, needs a re-run. |
| `../../reports/stress/solution-profile-published.json` / `-corpus1.json` (+ `-summary.md`) | Solution-space fingerprints for the known-solvable levels (156 published + 102 Corpus 1, post-2026-07-11-cleanup): per-level cell/edge/turn/portal/must-cross behavior, combined + per-provenance-source, for comparing an unsolved Corpus-2 level's witness/search behavior against known-solvable families (`npm run stress:solution-profile`, `stress:solution-profile-compare`) — see [`docs/solution-profile.md`](../../docs/solution-profile.md). |
| `../../logs/stress-corpus1-baseline.json` | Compiled regression baseline for the current 102-level Corpus 1, freshly regenerated (2026-07-12) against `reports/stress/benchmark-latest.json`: **85/102 solved**. Deliberately no level-count in the filename anymore — the old `-450-`/`-1700-` naming went stale in both the docs and the filename itself the moment either corpus was resized by the square-grid cleanup; the count now lives only in the file's own content and in whatever doc quotes it. Regenerate via `npm run stress:compile-baseline`. |
| `../../logs/stress-corpus2-baseline.json` | Compiled known-unsolved baseline for the current 1700-level Corpus 2, freshly regenerated (2026-07-17) against `reports/stress/benchmark-latest-random.json`: **295/1700 solved**. This is the *genuine* post-repair-probe-fix number — an earlier same-day refresh reported 286/1700 but was invalid (silently ran stale pre-fix solver code; see `reports/2026-07-17-corpus2-refresh-ran-stale-code-correction.md` and `.github/workflows/README-solver-corpus2-batches.md`'s "Third run — genuine" section for how this was caught and fixed). That official run is no longer a single sequential sweep — it's `npm run solver:combine-corpus2-batches` flattening 20 parallel `portfolio-solve-sweep.mjs --scheduler-mode=legacy` GitHub Actions batches (`.github/workflows/solver-corpus2-batch-*.yml`; see that dir's README) into one `stress:benchmark`-shaped report, run against the solver genuinely post the 2026-07-17 repair-probe budget fixes (up from 236/1700 at the last trustworthy 2026-07-16 pre-fix baseline, 152/1700 at the 2026-07-12 pre-elite-splice-fix baseline). Regenerate again via `npm run stress:compile-baseline -- --mode=corpus2 --official=reports/stress/benchmark-latest-random.json` whenever that official run is refreshed. **Cumulative ledger: 725/1700 known solved** (2026-08-06), with 96/102 in corpus 1, after the work-budget-starvation correction added +41/+1 respectively; see [`reports/2026-08-06-workbudget-starvation-audit.md`](../../reports/2026-08-06-workbudget-starvation-audit.md). These compiled baselines are cumulative known-solution ledgers, not cold typical-budget measurements — **725 is not a capability figure**: it was produced with `--prime-winner`, which replays each level's previously-recorded winning config+gate, and 684 of its 725 solves carry `solvedByPrime`. **The current level-blind capability is 731/1700 (C2) and 94/102 (C1)** — run #39 (`31772083174`, 2026-08-14, commit `d425532ba`, 50M node budget both corpora, `deterministic=true`); that run was artifact-only, so the committed baseline JSON here still holds the older cumulative data. Capability figures and their protocol live in [`docs/future-work.md`](../../docs/future-work.md)'s "Current capability evidence"; keep the two numbers distinct when quoting either. **Historical progression: 605/1700 solved** (2026-07-25) — a full `solver-stress-refresh.yml` refresh on 2026-07-23 first brought this to 434/1700 (predating this table row's own last edit), then two rounds of `.github/workflows/solver-highbudget-unsolved-sweep.yml`'s targeted high-budget sweep: round 1 over the 1259 then-still-unsolved ids (~9x budgetMs / ~6x node-budget) found 82 more (→516/1700); round 2 over the 1184 ids still unsolved after that (300M node budget per level, 240 parallel shards, 200+ hours total compute, 2026-07-24–25) found 89 level-level improvements (→605/1700) but only **26 completely new hint discoveries** (previously zero-hint levels) plus 63 additional hints on already-solved levels — a steep diminishing return. **Analysis**: every one of the 1095 unsolved levels after round 2 still hit the node cap, confirming budget is no longer the binding constraint. The remaining **995 corpus-2 levels without any hints** are categorically different from the 26 that did yield and likely require solver algorithm changes, manual/AI-assisted investigation, or level design changes rather than more compute. Both rounds independently re-verified against `validateCandidatePath`; see `scripts/patch-benchmark-with-sweep.mjs` (overlays a subset sweep report onto the last full official benchmark before feeding it to `compile-baseline.mjs`, chainable round over round) and the baseline's own `sources` array (`verified-highbudget-round1`/`verified-highbudget-round2`) for exactly which ids and how. |
| `../../reports/stress/dev-benchmark-corpus2.json` (+ `-summary.md`) | Curated 112-level development benchmark (last curated 2026-07-17 against the genuine 295/1700 refresh above): an information-dense subset of Corpus 2's unsolved levels (stratified by archetype × failure-mode, split between closest-misses and diversity-selected levels) for iterative solver work without the full 1700-level sweep (`npm run stress:curate-dev-benchmark`) — see "Workflow" below. |
| `stress-levels-envelope.json` | **In-envelope stratum** (2026-08-06, see that section below): 200 levels generated at CLAUDE.md's documented per-level object-count maxima instead of Corpus 2's raised +4, ids `E00001`–`E00200`. |
| `hints-envelope/<id>.json` | The in-envelope stratum's saved-hints artifact, same format/convention as `hints/`/`hints-random/` (`level-data-io.mjs`'s generalized `hintsDirFor`). |
| `../../reports/stress/benchmark-envelope-latest.json` (+ `-summary.md`) | Initial solve pass against the in-envelope stratum (2026-08-06, `portfolio-solve-sweep.mjs`, 60s/20M per-level budget): **124/200 solved (62.0%)**. |

## Guarantees

- **Provably solvable by construction.** Every level began as a *witness path*
  (generated first, on an empty grid, with movement-rule-exact stepping); gate, goal,
  `reqLen`, `reqInt` were derived from it; every mechanic added afterwards was kept only
  if the full witness still passed the exact domain referee
  (`validateCandidatePath`, PLAY rules). Each accepted level also passed the wire schema
  (`validateRawLevel`) and the independent structural validator (`validateLevelDetailed`).
- **The production solver did not participate in generation.** It is used only
  *after* generation, for benchmarking (`stress:benchmark` strips `stressMeta` — the
  witness included — before handing the level to the solver). The only solver-adjacent
  inputs to generation are historical audit data (batch A's ridge model) and the
  documented archetype/policy thresholds (batch E's targets).
- **No static filters.** Only flipping filters are used, by design.
- **Deterministic.** `masterSeed` + recorded `batchSeed`/`levelSeed` per level.

**Known-fixed gap (2026-07-10):** S139 was originally generated with its second portal pair's
destination silently coinciding with the goal cell — a violation of the absolute one-object-per-
cell invariant (see CLAUDE.md's "Cell occupancy is an absolute invariant" note) that slipped past
both gates listed above, because neither `validateRawLevel` nor `validateLevelDetailed` had a
general cross-object-overlap check at the time, and the witness-path referee only validates move
legality along the path, not whether the level's object placements are individually well-formed.
Root cause was in `scripts/stress/witness.mjs`'s `chooseEnd`, which picked a witness's truncation
point (the goal) without excluding portal-terminal cells. Fixed at three independent layers:
`chooseEnd` now rejects such cut points outright; `validateRawLevel` and `validateLevelDetailed`
both gained a general cross-object occupancy check; `validateWitnessOnRaw` now also runs the
schema check on every incremental mutation, not just final acceptance. S139 itself was hand-
patched (see its `stressMeta.generatorNotes`) rather than regenerated, since a full corpus
regeneration risks reshuffling every level's ID/content downstream of any changed acceptance
decision (IDs are assigned by acceptance order, and later levels' novelty scores are computed
against a pool that accumulates as generation proceeds).

## Batches

| Batch | Theory (short) | Adversarial intent | Overfit risk |
|---|---|---|---|
| A `historical-solver-pain` | Ridge model fitted on `logs/solver-workflow/latest.json` steers generation toward feature regimes that were historically slow. | solver-aware | high |
| B `structural-complexity` | Ignore history; maximize mechanic interaction (portals × flippers × must-cross × landmarks in tight radii). | solver-blind | low |
| C `deceptive-simplicity` | Few/no objects; ambiguity from open geometry, route multiplicity, uninformative gradients. | solver-blind | low |
| D `novel-topology` | Witness geometry selected (best-of-M) for distance from the published solution families. | solver-blind | low |
| E `anti-heuristic` | Directly oppose `solver/attempts.ts` policy: delayed closure under the near-closure rule, interior routing under perimeter-led orders, multi-gate budget starvation below the reqLen≥90 floor, flipper diverse-beam-ladder bait, navDensity-threshold gaming via hazard padding. | solver-aware | high |
| F `wild-witness` | Maximally wide parameter draws (extreme aspect ratios, tiny/huge grids, arbitrary mixes) — no hypothesis beyond coverage of un-authored level-space. | solver-blind | low |

**Overfit-risk caveat**: batches A and E were built by directly reading the solver's own historical weaknesses/policy, so validating a solver change only against those batches risks measuring "still handles what we already knew about," not general robustness — weight results from B/C/D/F (and the solver-blind uniform-random second corpus below) more heavily for a general-robustness claim.

Structural complexity and predicted solver challenge are **independent axes** in the
metadata: the corpus deliberately spans high-complexity/low-challenge,
low-complexity/high-challenge, and unknown-challenge/high-novelty combinations —
`predictionConfidence` says how much the predictor should be trusted per level (lowest
for batches D/F, highest for A).

## Workflow

```bash
npm run stress:generate            # regenerate the corpus (deterministic per --master-seed)
npm run stress:validate-witnesses  # integrity check: wire schema + structural validator + hidden witness, before benchmarking
npm run stress:compare             # novelty report; exits 1 on near-duplicates
npm run stress:benchmark           # production solver, witness withheld (-- --budget-ms=20000)
npm run stress:analyze             # per-batch report + highlights + regression recommendations
npm run stress:missing-levels      # which target level IDs have no result yet in a log dir (append-only baseline workflows)
```

`stress:generate`/`stress:benchmark`/`stress:validate-witnesses` run through `scripts/run-bundled.mjs`
(they import TS modules); `stress:compare`/`stress:analyze`/`stress:missing-levels` are plain node.

`stress:validate-witnesses -- [--corpus=<path>]` (default `stress-levels-random.json`) is a quick
read-only integrity check for a freshly-generated or freshly-edited corpus — every entry against
`validateRawLevel` (wire schema), `validateLevelDetailed` (structural heuristic), and its own
hidden `stressMeta.witnessSolution` against the PLAY referee — reporting per-stage pass counts and
exiting non-zero on any failure. Cheaper than a full benchmark run when the question is just "is
this corpus well-formed," e.g. right after a generator change or a manual corpus edit.

`stress:missing-levels -- [--corpus=<path>] [--levels=<spec>] [--log-dir=<dir>]` (default log dir
`logs/solver-randoms-baseline`) diffs a target level-ID range against every `.json` file's
`levels[].id` already present in `--log-dir`, printing the still-missing IDs (and, under
`GITHUB_OUTPUT`, emitting `count`/`levels`/`existing`/`total` for a CI step to consume) — for
append-only baseline workflows where existing log entries are treated as done and never
re-scheduled.

`stress:curate-dev-benchmark -- [--target=112] [--floor=8]` builds a fixed, ~100-125-level curated
subset of Corpus 2's *unsolved* levels for iterative solver work, so a change doesn't need the full
1700-level sweep (hours) to get a meaningful signal. Deliberately not a difficulty-sorted top-N —
it stratifies by (archetype × failure-mode: `known-unsolved` vs `budget-edge`, reusing
`classify-stability.mjs`'s classification) so every mechanic family and both failure modes get a
floor, then within each stratum splits the quota between the closest misses
(`rank-levels.mjs`'s badness) and a greedy farthest-point diversity pass (`features.mjs`'s
`levelDistance`, blended with `failedStrategies`-set overlap) so structurally-similar levels that
also fail to the same attempt configs get suppressed. Zero new solving — it's pure analysis over
`reports/stress/benchmark-latest-random.json` + `reports/stress/witness-divergence-random.json`.
Writes `reports/stress/dev-benchmark-corpus2.json` (+ `-summary.md`) and prints a ready-to-run
`stress:benchmark -- --levels=<ids>` command using the selection. Re-run whenever the source
benchmark/witness-divergence reports are refreshed — see
[`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the
full algorithm writeup.

`stress:benchmark -- --parallel[=N]` fans levels out across N worker threads (default:
`availableParallelism − 1`) for **iteration speed only**: per-level timings are CPU-contended
(not comparable to sequential runs, and solve/fail can flip near the budget edge under
contention), so the output is stamped `parallel: N` and defaults to
`reports/benchmark-parallel.json` instead of `benchmark-latest.json`. Official numbers stay
sequential. The `availableParallelism − 1` default isn't just a guess — `npm run
stress:tune-parallelism` empirically swept N=1..4 on this sandbox (2026-07-10, 4 cores per
`nproc`) and found N=3 fastest (9.3s vs. 23.1s at N=1, 13.8s at N=2, 14.9s at N=4 — N=4 already
regresses vs. N=3 here), confirming the default lands on the actual measured optimum for this
environment rather than merely a plausible one; re-run that tool if the sandbox's CPU allocation
changes materially (see `docs/solver-dev-tooling-plan.md`'s "Cheap-tail follow-ups" for detail).

`stress:benchmark -- --sample=N [--seed=<value>]` (composes after `--levels`/`--filter-mechanic`)
picks a deterministic N-level sample — same corpus + same seed (default: current commit SHA)
always yields the same sample, so a Tier-3 "run part of Corpus 2" check is both cheap and
reproducible instead of an arbitrary, unreplayable random subset. See `docs/testing.md`'s stress
tiers table.

**Repeatedly re-testing a solver change against this curated set** (not just a one-off run): prefer
`scripts/portfolio-solve-sweep.mjs` over plain `stress:benchmark -- --levels=<ids>` — see
`docs/solver-architecture.md`'s "Which tool for a corpus/large-batch solve" table and its "Fast
portfolio scheduler experiment" section's "Batch-scale tooling" bullet for full flag docs. In short:
`--resume` checkpoints progress so a killed run doesn't start over, `--attempt-cache` skips
re-solving a level your change provably can't affect (based on which solver source files actually
changed), `--priority=badness --baseline=reports/stress/dev-benchmark-corpus2.json` front-loads the
closest misses for fast positive/negative signal, and `--workers`/`--race-pool-size` parallelize
across levels and within each level's own attempt ladder (composed — the two are additive, unlike
`stress:benchmark`'s `--parallel`/`--engine=raced`, which are mutually exclusive). None of this
replaces `solver:bench --check` for regression safety — it's purely about making the *iteration
loop* on the unsolved population fast.

## Second corpus: uniform-random, solver-blind (`stress-levels-random.json`, 2026-07-09; 300 solvable levels migrated 2026-07-10; non-square levels deleted + replaced 2026-07-11)

Corpus 1's batches A-F were deliberately hypothesis-driven: witness geometry and mechanic
placement were shaped by reading `solver/attempts.ts`'s policy thresholds and (batch A)
audit history, specifically to target known solver behavior. That's exactly what makes it
risky as the *only* stress corpus once the solver has been iterated against it repeatedly
(see "Future solver work" below) — a corpus built by reasoning about a specific solver's
current strategy can end up measuring "does this solver still handle the things we already
thought of," not "is this solver robust in general." This second corpus exists to check the
opposite thing: does the solver hold up against levels that weren't shaped by any knowledge
of it at all?

**Generator:** `scripts/stress/generate-random.mjs` (`npm run stress:generate-random`,
same `run-bundled.mjs` wrapper as corpus 1). It deliberately does **not** reuse
`generate.mjs`'s decoration ops — those encode difficulty-biased placement ("cold cell",
"late", "on-path-only"), which would contradict the point here. Concretely, solver-blindness
means:
- **The witness walk uses zero scoring bias.** Every legal next cell is equally likely (all
  of `generateWitness`'s shaping weights — straight-preference, perimeter/interior bias,
  crossing-seeking, goal-attraction — are zero; the only non-uniform input is *which* cells
  are legal at all, i.e. the game's own movement rules). Contrast with corpus 1, where e.g.
  batch A explicitly biased the walk toward high self-crossing.
- **Mechanic placement is a uniform random draw over legal candidate cells** — no
  "interior-only", "cold-cell", or "must-cross-adjacent" targeting. **Every mechanic the
  game has gets the same treatment, except static filters** (excluded per the requester,
  same as corpus 1) and multi-gate/multi-goal (the game only ever has one true goal; extra
  gates were corpus 1's batch-E budget-starvation tool specifically, so this corpus doesn't
  use them, to avoid reintroducing solver-targeted design through the back door). That
  includes must-turn/surround/adjacent-turn landmarks, geese, and false goals — an earlier
  version of this generator omitted all five of these with a "not requested" rationale that
  the requester then explicitly overruled: leaving out object types by default is itself a
  design choice that shapes what the corpus can find, which is exactly the failure mode this
  corpus exists to avoid. See "object caps" below for how each is placed and why geese/false
  goals are validated differently from the other mechanics.
- **No solver-strategy imports at all** — not `solver/attempts.ts`, `policy.ts`,
  `archetype.ts`, nor any audit-history-fitted model (corpus 1's batch A). The only
  solver-adjacent import is `normalizeRawLevel` (pure wire-format normalization the referee
  itself needs) — same as corpus 1, the solver's *search* never runs during generation, but
  here nothing about the solver's *decision-making* is read at all, not even for labeling
  (no `archetype`/`predictedSolverChallenge`/`batchTheory` fields in `stressMeta` — those are
  explicitly "model the solver's current behavior," the opposite of this corpus's purpose).
- **No batches, no theories.** One flat, uniform generation recipe; the only "iteration
  loop" was calibrating presence probabilities against a smoke-test's *realized* mechanic
  counts (a generator-correctness check — does uniform-random construction actually reach
  the requested density? — not a solver-behavior tuning loop).

Witness-first construction is still a practical necessity even here — it's the only way to
guarantee "provably solvable by construction" without invoking the solver itself, which is
exactly what this corpus is trying to avoid depending on. It is a construction mechanism,
not a difficulty-targeting device: the walk doesn't know or care what it's building toward.

**Per-request parameters** (this is the additional, larger corpus commissioned after corpus
1 drove the solver from 133/150 to 150/150 — see "Future solver work" below):
- **2000 levels**, grids **11×11 to 15×15 only** (15×15 remains the documented max; corpus
  1 went as small as 4×4 in batch F — this corpus doesn't).
- **Object caps**: mustPass/mustCross/flippingFilters (documented max 4) and
  must-turn/surround/adjacent-turn landmarks/geese/false goals (no prior documented max) are
  all capped at **8**; portal pairs at **7** (documented max 3, +4). Checked safe against
  solver-side assumptions *before* generating, not after: `MAX_MST_K = 16` in
  `lower-bounds.ts` is sized for "up to MAX_MST_K remaining objectives," and must-turn
  landmarks fold into the *same* `mustPassKeys` array as plain must-pass cells
  (`domain/landmark-rules.ts`'s `applyLandmark`) — so raw-mustPass(8) + mustTurn(8) = 16 is
  the realistic worst case for that array, landing exactly on (not past) the documented
  ceiling. Every other mechanic (mustCross, portals, flippers, surround, adjacentTurn) has
  its own independent mask or plain `Map`/`Set` storage with no shared-array interaction to
  check.
- **"If used, used to a challenging degree, favouring larger numbers"** — applied
  identically to every mechanic (mustCross/mustPass/portals/flippers/mustTurn/surround/
  adjacentTurn/geese/falseGoals): presence is a ~55% coin flip per mechanic and, when
  present, the count is drawn from the **upper ~45% of its range** (e.g. present → 5-8 of
  8, not 1-8). Realized corpus-wide (2000 levels): mustCross present 55% (mean 4.9 of 8),
  mustPass 54% (mean 6.5), portal pairs 55% (mean 5.5 of 7), flippingFilters 54% (mean 6.5),
  mustTurn 54% (mean 6.5), adjacentTurn 55% (mean 6.5), decorative 55% (mean 6.5), geese 55%
  (mean 6.5), falseGoals 57% (mean 6.5). **Surround is the one honest outlier**: present on
  46% of levels but mean only **2.4 of 8** when present — its placement constraint (every
  valid 8-neighbor of the candidate cell must *already* be witness-visited or impassable) is
  structurally the tightest of any mechanic, so high requested counts often can't be fully
  realized on a given random witness; this is the same graceful-degradation behavior blocks/
  mustCross show at the margin, not a generator bug (independently confirmed: 2188 surround
  landmarks placed corpus-wide, all referee-valid).
- **Geese and false goals are validated differently, necessarily.** The PLAY referee itself
  (`validateCandidatePath` / `isValidMove`) rejects a witness that steps onto a false-goal
  or (under hazard checks) goose cell — entering either is defined as ending the attempt —
  so "provably solvable by construction" for these two specifically means placing them only
  on cells the witness never visits; there is no placement quality beyond that for the
  referee (or the solver, which ignores both via `MoveContext.SOLVER`) to judge. Uniform
  random selection from the free/unvisited cell pool already satisfies this exactly, so
  "placed randomly" is the correct and only construction-time check available here, not a
  shortcut relative to the other mechanics.
- **No static filters** (flipping filters only, same rule as corpus 1 — the one mechanic
  genuinely excluded, per explicit instruction both times). **Exactly one true goal**
  (unchanged; never was configurable) and **exactly one gate** per level — multiple gates
  were corpus 1's batch-E budget-starvation *tool* specifically; adding them here would
  reintroduce solver-targeted design through the back door, so this corpus doesn't use them.

**Validation, same rigor as corpus 1:** every level passed the wire schema
(`validateRawLevel`), the independent structural validator (`validateLevelDetailed`), and
the exact domain referee (`validateCandidatePath`, PLAY rules) against its hidden witness at
generation time — then **re-verified independently from the finished file** (a fresh
schema+structural+referee pass reading only `stress-levels-random.json`, not trusting the
generator's own bookkeeping): 2000/2000 pass, zero referee failures, zero cap/grid-size
violations, landmark/goose/false-goal counts independently re-tallied from the file (7034
must-turn, 2188 surround, 7072 adjacent-turn, 7235 decorative landmarks; 7203 geese; 7331
false goals — all real, referee-valid placements, not just requested-but-unrealized counts).
Novelty: `npm run stress:compare -- --corpus=data/stress/stress-levels-random.json` found zero
near-duplicates against the published corpus or within itself (min novelty 0.082, threshold
0.08, mean distance 0.173 — up from 0.137 in the mechanics-incomplete first pass, i.e. the
richer mechanic mix measurably increased diversity, not just count); a manual cross-check
against corpus 1 specifically (which `compare.mjs` doesn't do automatically — see its
published+self scope) found zero near-duplicates there either (min distance 0.151).
Generation stats: 2797 attempts for 2000 accepted levels (2 structural rejects, 0 referee
rejects, 0 novelty rejects needed this pass) — a healthy ~1.4 attempts/level.

**Deliberately not done, per the requester:** this corpus was initially **not run against the
solver** (generation only — "I'll try solving them in batches later, probably with another
agent"), and — unlike corpus 1 — **will not be iterated based on solver results** even once
it is benchmarked. Adjusting the generator in response to what it reveals about the current
solver would reintroduce the exact overfitting risk this corpus exists to avoid measuring.
If a future benchmark run wants a corpus 3, it should be a fresh generation exercise with
its own reasoning, not a retune of this one.

**Migration (2026-07-10):** The corpus was subsequently benchmarked via `logs/solver-randoms-baseline/`; 
300 of the 2000 levels were found to be solvable. These have been migrated to Corpus 1 
(`stress-levels.json`), which now contains 450 levels total (original 150 hypothesis-driven + 300 solvable random instances). The random corpus now contains 1700 levels (the unsolvable/timeout subset).

**Square-grid cleanup (2026-07-11):** both `buildLevel()` here and several of `generate.mjs`'s
batch builders drew grid width and height as two **independent** random rolls — legal per the
wire schema (which never required `w === h`), but a real mismatch with the true invariant: all
156 published levels are square, and no rectangular level has ever shipped. This had gone
uncaught because `validateRawLevel` never checked it either. Both are now fixed: `validateRawLevel`
(`modules/domain/level-schema.ts`) hard-rejects `w !== h`; every grid-drawing site in
`generate-random.mjs` and `generate.mjs` (including batch F's aspect-ratio branches, which
targeted "extreme aspect ratios" on purpose — that theory is now "extreme *sizes*," square only;
see the batch's `theory` string) draws one side and reuses it for both. Every non-square level was
deleted from both corpora (348/450 from Corpus 1 — down to **102**; 1372/1700 from Corpus 2) and
Corpus 2 was topped back up to 1700 via `generate-random.mjs`'s new `--append` mode (preserves
existing levels + their ids byte-for-byte, continues id numbering after the highest existing
number so a deletion pass can never cause a collision, checks novelty against the survivors too).
Corpus 1 was deliberately **not** topped back up (per the requester: it's fine smaller). Portal
pairing was also audited as part of this pass and found already fully enforced (every portal
object requires all four coordinates and rejects self-referencing endpoints —
`validateRawLevel` already had this before 2026-07-11).
**Was stale as of this cleanup — all regenerated by 2026-07-12** (`novelty-report{,-random}.json`
and `witness-divergence-corpus1.json` were already refreshed against the current corpora shortly
after the cleanup; `../../logs/stress-corpus1-baseline.json`, `../../logs/stress-corpus2-baseline.json`
(both renamed off their old `-450-`/`-1700-` filenames — see the Files table above),
`../../reports/stress/benchmark-latest.json`, and `../../reports/stress/batch-analysis.{json,md}`
needed a fresh maintainer-triggered solver run, done 2026-07-12).
`regression-set.json` was pruned in the same original cleanup pass (19 of its 24 pinned levels
were non-square; see its own `notes` field) and re-verified clean (`npm run stress:regression`:
5 held, 0 regressions) as part of this later refresh.

**Note to future maintainers of this generator, earned the hard way:** the first version of
this corpus (since regenerated) omitted landmarks, geese, and false goals entirely, reasoned
as "not requested" / "keeps the audit surface small." That was wrong, and the correction is
the point worth remembering: for a corpus whose entire purpose is "don't let anyone's
assumptions about what matters shape which levels get tested," quietly narrowing the object
palette *is* an assumption about what matters, made by the generator's author instead of by
a solver-behavior hypothesis — but structurally the same failure mode either way. If a
future revision of this corpus considers excluding any mechanic the game actually has, that
should be an explicit, stated, reasoned decision (like static filters and multi-gate above,
both of which have a real rationale on the record), not a default.

## Third stratum: in-envelope (`stress-levels-envelope.json`, 2026-08-06)

`reports/2026-08-06-game-rules-solver-alignment-plan.md` Section 4: Corpus 2's deliberately-raised
(+4 over CLAUDE.md's documented per-level maxima) object caps make its solve rate a statement
about how far outside the shipped game's own complexity envelope the solver reaches, not about
player-facing capability — scoring Corpus 2 by how many shipped-envelope dimensions each level
exceeds showed a clean solve-rate gradient from 83% (0 dimensions exceeded) down to 0% (6
exceeded), with only 6 of 1700 levels sitting fully inside the envelope.

This is a **smaller, separate stratum**, not a third full corpus on par with Corpus 1/2 — same
generator (`scripts/stress/generate-random.mjs`) and same zero-scoring-bias, uniform-mechanic-
treatment philosophy as Corpus 2, invoked with `--envelope-caps --id-prefix=E` so mustPass/
mustCross/flippers cap at 4 and portal pairs at 3 (CLAUDE.md's documented maxima) instead of
Corpus 2's raised 8/7 — see that flag's own comment in the generator for the exact reasoning,
including why mechanics with no prior documented max (landmarks, geese, false goals) get the
same reduced 4 rather than an attempt to hit the alignment report's separate "landmarks ≤5"
scoring threshold exactly.

- **200 levels**, ids `E00001`–`E00200`, generated in one `--count=200 --master-seed=20260806`
  run — every level referee-validated via the witness pipeline at generation time, same as
  Corpus 2.
- **Initial solve pass**: `portfolio-solve-sweep.mjs --scheduler-mode=legacy --budget-ms=60000
  --node-budget=20000000 --workers=4 --save-hints`, run in two parts after the first was
  interrupted by its own shell-level `timeout 590` wrapper at 181/200 levels (combined by id via
  `npm run solver:combine-corpus2-batches`, not re-run from scratch) — **124/200 solved (62.0%)**,
  all 124 saved hints independently re-verified against `validateCandidatePath`.
- **62.0% vs. Corpus 2's own historical rate (605/1700 = 35.6% as of 2026-07-25, itself inflated
  by two rounds of targeted high-budget sweeping well beyond this stratum's one quick pass)**
  is the qualitative confirmation the alignment report predicted: a population generated at the
  shipped game's own object-count ceilings solves at a markedly higher rate than one deliberately
  raised past them, even under a much lighter one-shot budget.
- **Not wired into `check:corpus-level-formatting` / `check:level-provenance`'s hardcoded "3 real
  corpora" lists, deliberately.** Those checks (and CLAUDE.md's "3 real corpora" language
  elsewhere) refer specifically to published + Corpus 1 + Corpus 2; this stratum is a lightweight
  measurement addition in the same on-disk shape (`stringifyCorpusJson`, stamped provenance,
  `hints-envelope/<id>.json` via `level-data-io.mjs`'s generalized `hintsDirFor`), not a fourth
  member of that specific invariant. It is exercised the same way Corpus 1/2 are for any solver
  batch tool that takes an explicit `--corpus=` path.
- **Regenerate**: `node scripts/run-bundled.mjs scripts/stress/generate-random.mjs
  --envelope-caps --id-prefix=E --count=200 --master-seed=<new-seed>
  --out=data/stress/stress-levels-envelope.json` (a fresh seed, not `--append`, if the intent is a
  wholly new sample rather than topping up this one). Re-benchmark with the same
  `portfolio-solve-sweep.mjs` invocation above against the new corpus.

## Future solver work — every avenue identified so far (2026-07-08)

This is the complete ledger: what shipped, what was tried and measured to not help, what's
root-caused with a concrete next step, and what's diagnosed but not yet investigated to a
fix-level of detail. Scope honesty: ingredient ablation (remove one mechanic, re-solve) was
run in depth on **S027, S033, S042, S017** — not all 16 remaining unsolved levels — plus a
corpus-wide *quantitative* witness-contrast pass (goal-progress monotonicity, objective
lateness, must-cross threading gap, perimeter/turn/crossing-timing profile) across all 17
original unsolved levels (see `noveltyScore`/`witnessProfile` in each level's `stressMeta`
and the one-off analysis this produced, not checked in as a script). Anything below not
explicitly ablated is a hypothesis from that quantitative pass or from policy/code reading,
not a confirmed root cause.

### Shipped

- **`HIGHINT_MC_DIVERSE`** (`modules/solver/attempts.ts`) — diverse WIDE beams, budget-floored,
  for must-cross-threaded (`mustCross ≥ 2`) high-intersection levels, in both the medium and
  very-high reqInt policy rules. Verified: S027 + S029 known-hard → solved; 156/156 published
  corpus, no bench regression; unit-tested.
- **Diverse-beam-first reorder for the very-high-reqInt, non-portal rule** (`modules/solver/
  attempts.ts`) — fixes item 4 below exactly as diagnosed: `mcDiverseThread(f)` now runs
  *before* the two non-diverse `@5000` beams instead of after, only when `mustCross ≥ 2` (the
  rule's other levels see `mcDiverseThread` return `[]`, so their config list — and therefore
  their timing — is unchanged). Verified: S017 known-hard → solved in ~3s (was a 20s timeout);
  156/156 published corpus, no bench regression (`solver:bench -- --check`); full stress
  corpus 135/150 (was 134/150), no other level regressed. Existing unit tests
  (`attempts.test.ts`) only assert config *presence*, not order, so none needed updating.
- **Adaptive gate-weighting for many-gate levels** (`modules/solver/orchestration.ts`,
  `runInterleavedAttempts`) — fixes item 5 (S118) below. After the first full round of the
  config×gate loop, each gate's remaining budget share is skewed by
  `(nodesExpanded share × gateCount)²`, floored at 0.35× so no gate is starved to near
  zero. **Scoped to `gates ≥ 4`, not ≥ 3**: nodesExpanded is a noisy progress proxy (a
  structurally bushier dead-end gate can out-expand a constrained correct one), and an
  initial `≥ 3` version regressed a 3-gate level (S142) from solved to timeout in testing —
  narrowing the threshold to 4 fixed the regression while keeping the S118 win, and means
  the published corpus (max 3 gates) is provably untouched by this code path. Verified:
  S118 known-hard → solves in ~14s (was a 20s timeout, reproduced twice); the other four
  4-gate stress levels (S103/S108/S113/S123) and S142 unaffected; 156/156 published corpus,
  no bench regression; full stress corpus 136/150 (was 135/150).
- **Used-flipper blocking in the connectivity prune** (`modules/solver/topology.ts`,
  `_reachCanEnter`) — an attempt at the "tighter admissible bound" direction from item 6
  below. `isConnected`'s reachability BFS didn't know flippers are single-use: once a
  flipper is used it can never be re-entered (`isMoveDynamicallyValid` already enforces
  this on real moves), but the generic visited/maxVisit check treated it like an ordinary
  cell, so whenever intersections were still allowed (`maxVisit ≥ 1`) the BFS could
  "revisit" a used flipper and wrongly conclude a genuinely unreachable region was still
  connected. Strict tightening, not a behavior change: the old check only ever
  over-approximated reachability, so this can only catch dead ends earlier, never reject a
  state that was actually feasible — pinned by a new `topology.test.ts` case. **Result: a
  real, measurable, but insufficient tightening.** Two cluster levels (S031, S043) now
  collapse to single-digit node counts in their beam attempts (was 800k–1.3M) — the BFS now
  proves infeasibility instantly where it previously explored for seconds — but **zero
  cluster levels flipped to solved**: 156/156 published corpus (no bench regression), full
  stress corpus stayed 136/150 (identical pass set). Consistent with the witness-trace
  finding in item 6: the blocker is combinatorial (22–59 cumulative discrepancy), and this
  prune, while a genuine correctness improvement, isn't the source of that gap. Kept anyway
  — it's sound, verified, and strictly better than the previous behavior.
- **Proof that beam search cannot solve the S031/S043 archetype at any width, budget, or
  profile.** Following the connectivity fix (which ~halved the WIDEST=50000 beam's
  time-to-cap), a 60s isolated run showed the beam now *naturally exhausts* at ~41s
  (S031) / ~34s (S043) instead of hitting the clock — i.e. this is no longer a "maybe
  more budget helps" open question, it's a proven negative: the entire width-50000
  search space, fully explored, contains no solution. A follow-up sweep of all 10
  `POLICY_PROFILES` at width 50000 confirmed this isn't a profile-selection problem
  either — every profile failed (9 timed out at the 15s test cap, the 10th matched the
  known pattern). Ruled out as a lead; no code change (this was a measurement, not a fix).
- **`diverseBeam` on the WIDEST tier — tested, reverted, no benefit.** The must-cross
  +flipper-heavy rule's WIDEST(50000) config deliberately omits `diverseBeam` (relies on
  raw width instead). Added it to test whether cumulative-score bias against
  necessary-but-locally-costly detours was losing the correct branch to purely-greedy
  competitors. Result: identical node counts (36, 3) with or without — the frontier
  collapses too early via the connectivity fix above for diversity bucketing to matter —
  and it burned the entire budget on beams, leaving zero time for the DFS fallback that
  gets a turn otherwise. Net negative (no gain, real cost); reverted.
- **Must-cross MST pairwise-edge tightening for simultaneous 2nd-pass cells**
  (`modules/solver/lower-bounds.ts`, `mcMSTLowerBound`) — the other half of the "tighter
  admissible bound" direction. The MC↔MC pairwise MST edges always used the plain BFS
  distance between two must-cross cells, even when one or both needed their perpendicular
  2nd-pass approach (a real, often-larger detour — already accounted for on the `pos→MC`
  edges via the same approach-distance maps, just never applied here). The subtlety that
  blocked this earlier in the session: visit order between two remaining objectives isn't
  known in advance, so naively using an approach-aware distance for one specific direction
  is unsound (valid only for that order, not the other). Resolved by computing *both*
  directional estimates and taking their `min` (safe regardless of which order the true
  solution uses — whichever direction is real, the estimate for it never exceeds the
  actual cost), then `max` with the plain distance (always a valid floor). This only
  exceeds the old plain-distance bound when *both* endpoints are pending their approach
  simultaneously; a single pending approach still bottoms out at the unconstrained
  direction — proven and unit-tested, not just asserted. Verified three ways: a new
  `lower-bounds.test.ts` case checks the admissibility reasoning directly; a git-stash A/B
  on the same hand-designed corridor confirms a real, measurable effect (7 → 8, not a
  no-op); the full regression suite (156/156 published, no bench regression; 136/150
  stress, identical pass set; zero referee-invalid solves) confirms no correctness
  regression. **Zero cluster levels flipped to solved** — consistent with the cluster's
  difficulty being distributed across many steps (22–59 cumulative discrepancy) rather
  than concentrated in the specific narrow condition (simultaneous pending 2nd-passes)
  this tightening addresses. Kept anyway, same rationale as the connectivity fix: sound,
  verified, strictly better than the previous behavior.
- **Iterated-local-search repair fallback** (`modules/solver/repair-search.ts`,
  `repairSearchFromGate`) — a genuinely different search paradigm, added after three
  independent admissible-bound-tightening attempts (used-flipper BFS block, must-cross MST
  pairwise edges, full flipper-axis-aware reachability) each moved zero batch-B cluster
  levels, confirming propagation-strengthening was exhausted for this regime (see item 6's
  "Follow-up" entries below). Explores via randomized epsilon-greedy restarts plus
  splice-repair (ruin-and-recreate: replay a best-so-far near-miss to a random prefix, then
  re-walk the suffix) instead of DFS/beam's deterministic best-first ordering, which the
  witness-trace analysis showed accumulates a cumulative discrepancy (22–59) no bound short
  of an order-of-magnitude tightening could close. **Soundness by construction**: every move
  goes through the exact same `applyMove`/`getNeighbors`/`isSolutionState` primitives
  DFS/beam already use — this file adds zero new game-mechanics logic, so it can only ever
  return a path that already passes `isSolutionState` (independently confirmed via a replay
  spot-check test and the referee validator in `stress:benchmark`, both green on every
  returned solution). Feature-gated (`mustCross ≥ 2 && mustPass ≥ 3` — matches all 11 batch-B
  levels, cutting across the must-cross-heavy and high-intersection-burden archetypes) and
  appended as a final-resort attempt, so it never runs on a level that already solves via an
  earlier attempt — purely additive by construction, not just by testing.
  - **Budget design, and a regression caught and fixed before shipping.** First cut reserved
    25% of the level's total budget for repair up front (shrinking the main DFS/beam loop's
    share before it ran). A full-corpus re-run caught this regressing **S017** (a previously
    solid, hard-won fix from earlier this session whose win *is* a tight budget race) from a
    ~3s solve to a 20s timeout — confirmed via a clean git-stash A/B (baseline: 2928ms solve;
    with the 25%-reservation code: still failed even run in isolation, no CPU contention).
    Root cause: `HIGHINT_MC_DIVERSE`'s 0.35/0.25 `minBudgetFraction` floors are fractions of
    whatever pool they're computed against — shrinking that pool by 25% shrinks their
    absolute floor too, even though the *fraction* is unchanged. Fixed by not touching the
    main loop's budget at all: repair now gets an *extra* budget allotment on top of
    `timeBudgetMs`, spent only after the (unmodified) main loop has already exhausted every
    other attempt. This costs the main loop nothing on any level, ever, and only adds wall
    time on levels where everything else already failed (the extended budget roughly doubles
    worst-case wall-clock on this narrow feature gate when every attempt fails — judged an
    acceptable trade since hint generation runs offline/off-thread, never blocking gameplay).
  - **Result: 5 of the 11 batch-B cluster levels solved — S031, S036, S042, S044, S048** (all
    referee-valid, confirmed via `stress:benchmark`'s `Solver.validateCandidatePath` check).
    This is the first real progress on this cluster after three sound-but-ineffective
    admissible-bound attempts. Full regression suite: 156/156 published (no bench
    regression), full stress corpus **142/150** (was 140/150 before this fix — see the
    Snapshot below), S017 and the flipper-fast cluster (S026/S027/S029/S034/S037/S040)
    reconfirmed unaffected, `npm run ci` green (721 vitest tests, hint-path-oracle 156/156).
    6 cluster levels remain unsolved (S028, S030, S033, S039, S043, S047) — repair times out
    on these too, at the doubled ~40s budget; not yet re-diagnosed why these specifically
    resist repair where the other 5 don't.
  - **Follow-up: found and fixed a real premature-convergence bug — 3 more levels solved (8/11
    total).** `PF_REPAIR_DEBUG=1` instrumentation added to `repair-search.ts` (mirrors
    `_LDS_DEBUG`/`_BEAM_DEBUG`) traced S030's `bestBadness` over time: it converged to 8 within
    2 seconds, then **never improved again — even after 17 million further node expansions over
    60 seconds.** Root cause: splicing only ever restarts from the single global-best near-miss
    path, so once that path belongs to one structural family, every subsequent restart just
    re-explores variations *within* that family — the search had structurally converged, not
    run out of time. Fixed two ways: (1) an 8-wide **elite pool** of the best-but-distinct
    near-misses found so far, spliced from at random instead of always the one best path
    (diversifies the jumping-off point immediately: S030's plateau dropped from badness 8 to 2
    in the same 2 seconds); (2) **stagnation-triggered fresh-restart bursts** — after 6000
    restarts with no new best-ever badness, force 800 restarts of pure fresh-from-gate walks
    (bypassing splicing entirely) before resuming normal behavior, since even an 8-wide pool can
    itself converge (confirmed: S030 still plateaued at badness 2 for the remainder of a 60s run
    with only the elite-pool fix). Both together solved S030 (~25–47s of repair's own compute)
    plus, at a bumped extra-budget fraction (3.0, not 1.0 — see below), **S033 and S039 too**
    (35–38s each in isolation). All 8 solutions referee-valid. **Budget fraction bumped 1.0 →
    3.0**: an isolated call to `repairSearchFromGate` with the exact production budget (40s at
    fraction 2.0) solved S033 in 37.8s, but the *same* level still timed out running through the
    full `solveLevel()` orchestration at that fraction — running after the main loop's own ~20s
    of DFS/beam work measurably slows repair below its isolated throughput (not otherwise
    diagnosed; plausible GC/heap-fragmentation pressure from the preceding search). 3.0 budgets
    real margin against that gap rather than the bare isolated minimum. **(2026-07-10 note:
    `REPAIR_EXTRA_BUDGET_FRACTION` in `orchestration.ts` has since been raised further, to 6.0 —
    this entry's "3.0" is a historical snapshot of that session, not the current value; check the
    constant itself before reasoning about worst-case repair wall-clock.)** **The remaining 3
    (S028, S043, S047) are a confirmed harder wall, not a slower version of the same
    problem**: S043 traced to the *identical* single-point badness-1 plateau (one landmark-turn
    requirement short of solved) as the levels that *did* eventually break through, but stayed
    there through a dedicated 300-second / 90-million-node-expansion isolated run — qualitatively
    different from S030/S033/S039, which broke through within 25–47s once given the chance.
    Verified: 156/156 published (no bench regression), full stress corpus **145/150** (was
    142/150), S017 and the flipper-fast cluster reconfirmed unaffected, `npm run ci` green.
  - **Follow-up: diagnosed and fixed a real gap in `scoreMove` — must-turn landmarks had ZERO
    scoring guidance, the only landmark type with none.** Investigating why S028/S043/S047
    resisted everything above, `PF_REPAIR_DEBUG=1`'s mask breakdown (extended to print the raw
    `surroundMask`/`mustTurnMask`/`adjTurnMask` bit patterns, not just counts) showed S028 and
    S043 both plateau on the *exact same bit*: a directional (`cw`, not `either`) must-turn
    requirement, with every other constraint (length/intersections/must-pass/must-cross)
    perfectly satisfied. Cross-checked against the corpus's hidden `stressMeta.witnessSolution`
    (confirming the level *is* genuinely solvable, not infeasible) and traced the witness path
    through the landmark cell — it does take the required `cw` turn there. So the level is
    solvable, but nothing in the search was ever aiming for it: `scoring.ts` has dedicated
    "urgency" terms for `surroundMask` and `adjTurnMask`, but **no term at all reads
    `mustTurnMask`** — the path only crosses a must-turn cell by incidental momentum, and hitting
    the specific required direction (not just "either") on top of that is left to pure chance.
    S047's plateau turned out to be unrelated (length off by exactly 1 with every landmark/
    objective term already satisfied — a different, still-open issue, likely portal-jump-length
    parity given its 3 portal pairs; not investigated further this round).
    - **Fix**: added `prep.mustTurnDistMaps` (single-source BFS distance-to-cell per must-turn
      cell, mirroring must-pass's plain distance shape — must-turn cells are passable single
      points, unlike surround/adjacent-turn's impassable multi-source-neighbor cells) and a new
      must-turn urgency term in `scoreMove`, gated by a new `SCORE_MUST_TURN_URGENCY` ablation
      flag matching the existing convention. **Result: S028 now solves in ~1–2s via plain DFS**
      (`objectiveFirst`/`mustCrossFirst`) — it no longer even needs the repair fallback.
    - **A second regression, caught the same way as the first (full-corpus re-run, not just the
      targeted cluster) and fixed more surgically this time.** The new term, added to the shared
      `scoreMove`, changes repair-search's entire randomized-exploration trajectory on any level
      with must-turn cells — including the three (S030, S033, S039) the *previous* fix had just
      gotten working. First cut (weight matching must-pass's `*5`) broke S030 outright (still
      unsolved at 90s, was ~44s) while barely touching S033/S039. Halving the weight to `*2`
      fixed S030 back to ~44s and even *helped* S033 (14.9s, down from ~59s) — but then broke a
      *different* level, S039 (previously ~35–38s, now unsolved at 80s), confirmed via an
      isolated re-run (not corpus-load noise — compare S143 in the same run, which *did* fail
      only under full-corpus CPU contention and solved cleanly standalone at 4.9s). Whack-a-mole
      across three weight-sensitive repair solves, not converging — repair's randomized-restart
      exploration is measurably more sensitive to `scoreMove`'s exact balance than DFS/beam are
      (consistent with everything already learned about how fragile its convergence is — see the
      elite-pool/stagnation entry above). **Resolved by scope, not more tuning**: gave must-turn
      urgency its own `mustTurnUrgencyWeight` profile field (previously it piggybacked on
      must-pass urgency's `wmp`, the same pattern surround/adjacent-turn use) and set it to `0`
      specifically in `POLICY_PROFILES.repair`, restoring repair's scoring to *exactly* what it
      was before this whole detour (S030/S033/S039 confirmed back to their original ~44–61s
      timings) while every other profile — the ones DFS/beam actually use — keeps the fix at full
      strength (`*2`, kept from the tuning above; not re-tested at `*5` in isolation from repair,
      no evidence it needs to be higher). This is why S028 solving via `objectiveFirst`/
      `mustCrossFirst` (not `repair`) mattered: the fix's actual value lives in DFS/beam, and
      repair never needed to share it.
    - **Result: S028 fixed with zero side effects. Full stress corpus 146/150** (was 145/150).
      Verified: 156/156 published (no bench regression), S030/S033/S039 confirmed back to their
      exact prior standalone timings, `npm run ci` green. **S043 and S047 remain open** — S043's
      blocker is now understood precisely (needs *axis-aware* guidance toward the correct entry
      direction for a `cw`/`ccw` cell, not just distance-to-cell, the same directional-approach
      pattern `mcApproachDistMaps`/`SCORE_MC_APPROACH_GUIDANCE` already solves for must-cross
      2nd-visits — not yet built for must-turn); S047's length-off-by-one plateau is a distinct,
      undiagnosed issue.

### Tried, measured, rejected — do not retry these exact changes without new evidence

1. **Portal-transfer profiles added to the must-cross+portal-dense attempt bundle**
   (`portalFirstTransfer`/`portalCommitted` alongside `mustCrossFirst` when portal
   terminals ≥ 4). Implemented, type-safe, unit-tested, zero regressions — but zero levels
   flipped from known-hard to solved either. Reverted. *Open question:* S033 (3 must-cross +
   3 portal pairs) still has no explained fix — ablating away its must-cross cells lets it
   fall through to a *different* attempt bundle that solves it in 14s, so the portal
   interaction with must-cross-heavy's default bundle is real, just not fixed by adding
   portal profiles to that bundle. Something else in that bundle's ordering or scoring is
   the actual blocker; not re-diagnosed.
2. **Per-branch portal-aware parity pruning** (`portalMayStillBeReached` gating
   `PRUNE_PARITY` on per-terminal reachability instead of mere portal presence). Provably
   safe (strictly tightens an existing prune), unit-tested — but a **deterministic
   node-count A/B** (same profile/beam width, run to completion, `nodesExpanded` compared,
   not wall-clock) showed **zero difference: 126 nodes, identical, with or without it** on
   S027, and S093/S099 stayed unsolved even at 3× budget. The portal terminal remains
   "reachable within remaining budget" for nearly the entire 60–100-step path on these
   grids, so the finer gate only diverges from today's blanket-disable in the last ~20
   steps. Reverted.

### Investigated and ruled out — do not attempt without new evidence

3. **Flippers "must-visit" hard lower-bound — unsound, do not build.** A prior pass of this
   ledger proposed mirroring `mustCrossLowerBound`'s perpendicular-approach-axis logic into a
   new `flipperLowerBound` (using `prep.flipperApproachEven`/`flipperApproachOdd`, built for
   the `SCORE_FLIPPER_URGENCY` scoring nudge). **This was checked empirically and found
   unsound**: an articulation-point test (BFS from each gate with each flipper cell
   individually blocked) on S042/S044/S047/S048 shows blocking any one flipper disconnects
   *nothing* — not the goal, not any must-pass/must-cross cell, not even the flipper's own
   neighbors from each other. None of these flippers are structural bottlenecks; solutions
   that never touch them are not provably impossible. A hard "must visit" bound would treat
   a *scoring preference* (the witness path happens to use the flipper) as a *constraint*,
   which risks the solver wrongly declaring an unrelated, genuinely solvable level (including
   future real player submissions, not just this corpus) unsolvable — a correctness
   regression, not just a missed optimization. No safe formulation was found in the time
   available; the flipper-tagged batch-B cluster remains open (see item 6).

### Shipped

4. ~~**S017: the winning search already exists in the policy — it's starved of budget.**~~
   **Fixed** — see the `HIGHINT_MC_DIVERSE` reorder in Shipped above. Root cause as
   originally diagnosed: `Solver.solve(...).attempts` instrumentation showed the diverse-beam
   attempts running 3rd/4th, receiving only 1924–2331ms each (short of the ~2800ms needed)
   because the two non-diverse `@5000` beams ahead of them each burned their full ~1664ms
   share first, shrinking the pool the 0.35/0.25 `minBudgetFraction` floor was computed
   against. Moving the diverse beams first (rather than raising the floor further) fixed it
   without touching the floor fractions at all.

### Root-caused, concrete next step, not yet attempted

5. ~~**S118 (4-gate budget starvation, batch E).**~~ **Fixed — see the "S118 and S123
   genuinely fixed: a floor+ceiling on dfsFromGateLDS's probe budget" snapshot for the final,
   verified mechanism** (it took two more reverted attempts after this entry's original
   "Fixed" claim turned out to be incomplete — the adaptive gate-weighting fix below is real
   and still necessary, but wasn't the whole story: S118's winning attempt separately needed
   its own LDS k=8 probe wave to run ~900ms, which the shared `probeCapMs` cap could cut short
   depending on exactly how budget diluted across the ladder). Verified reliable in isolation
   (10/10 across repeated runs) and in `solver:bench --check` (156/156). The one remaining
   caveat is a distinct, already-documented environmental effect (long single-process runs
   only, unrelated to code) — not this bug.
6. **The full 11-level batch-B cluster (S028, S030, S031, S033, S036, S039, S042, S043,
   S044, S047, S048): confirmed a combinatorial-search wall, not a budget or width wall —
   ruled out the cheapest hypotheses with clean evidence.** All 11 were run to
   completion at 45s (2.25× the 20s budget) with full `Solver.solve(...).attempts`
   instrumentation (not just S042/S047 this time — the entire cluster). **Every attempt in
   every level self-terminated (exhausted its search space) well inside its allotted
   share — none were cut off by the budget cap.** This includes `beam(..., width=50000)`
   on S031/S043 (the widest tier the policy has, on the rule specifically built for this
   feature regime) finishing in 28–31s out of a much larger available share — a beam that
   wide exhausting without success means beam *capacity* isn't the bottleneck (see the
   witness-trace dive below for what is). DFS attempts were the only ones consistently cut
   off by budget (running their full ~15–20s share without exhausting) — also explained
   below (they were still inside a search space too large to exhaust, not idling). This
   reframes the earlier "still a hard wall, not a budget artifact" note (previously checked
   only on S042/S047 at 90s) — it's not just "more budget doesn't help," it's "the search
   machinery that budget buys (wider beams, longer DFS) provably doesn't help either."
   **One narrow, low-risk hypothesis was tested and
   rejected**: the must-cross+must-pass-heavy rule (S028/S033/S040 — only 3 stress levels
   and 0 published levels match it) is the only rule in this cluster with no diverse-beam
   option at all (unlike the other 3 buckets, which already have one). Adding
   `mcDiverseThread` to it was implemented, tested, and reverted: S040 (already solved)
   was unaffected (3560ms vs. 3537ms baseline — no regression), but S028/S033 still timed
   out — consistent with the width/diversity-isn't-the-problem finding above. **What's
   likely needed** — **superseded by a direct witness trace, see below; the scoring
   picture is more nuanced than the aggregate stats suggested.**

   **Witness-trace deep dive (S033, S042): the scoring is locally good — the problem is
   cumulative, and it's bigger than the LDS ladder covers.** Built a diagnostic (replay the
   corpus's hidden witness path move-by-move through the real `getNeighbors`/`scoreMove`/
   lower-bound functions — the same code the solver runs, not a reimplementation) and found:
   - **Every witness move is legal and never incorrectly pruned** — `getNeighbors` always
     offers it, and none of the admissible bounds (distance, must-pass/must-cross LB,
     connectivity) would reject it. The pruning logic itself is sound; this is not a bug.
   - **Local scoring is good**: at each step, the witness move ranks 1st (greedy-best) among
     candidates 69–74% of the time (S033: 52/70 steps; S042: 64/93 steps), and is *never*
     worse than the last-place option out of 2–3 candidates.
   - **But it's cumulatively large**: LDS's "discrepancy" cost is the sum, over the whole
     path, of each step's rank (0 = greedy, 1 = second-best, …). Summed over the full witness
     path, S033 needs **cumulative discrepancy 22** and S042 needs **35** — both far past the
     LDS probe ladder's `k=8` ceiling (`_LDS_PROBE_K = [0,1,2,4,8]` in `search.ts`), so neither
     is ever *reachable* by a bounded probe wave; only the final unbounded (`k=Infinity`) phase
     even attempts them, which is plain best-first DFS with full backtracking.
   - **Extending the ladder doesn't trivially fix it either**: calling the DFS core directly
     with `maxDiscrepancy=25` (comfortably above the 22 S033 needs) and a full dedicated 20s
     budget (not shared with earlier probe waves) **still failed to find a solution.** So this
     isn't "the ladder stops too early" (an easy, additive, low-risk fix) — the search space
     *within* a discrepancy-25 bound is itself still too large to exhaust in 20s at current
     pruning tightness. Confirms this is genuine combinatorial hardness in the must-cross ×
     flipper × high-mustPass interaction, not a shallow policy/ladder gap.

   **What this rules out and what it leaves open:** rules out (a) an incorrect/over-aggressive
   prune, (b) the LDS ladder simply not going deep enough, (c) budget dilution (item above) —
   with clean, reproducible evidence for all three. What's left is either a materially better
   admissible lower bound (tighter pruning shrinks the discrepancy-25 tree enough to exhaust in
   budget) or a different search paradigm for this regime (e.g. constraint propagation over the
   must-cross/flipper interaction, or local-search repair from a near-miss). Both are
   substantial, open-ended research, not a scoped policy tweak — not attempted this session.
   The scoring-weight-tuning idea from the earlier (aggregate-stats-only) pass is *not* ruled
   out as a contributing factor, but the witness trace shows it's not the dominant one: local
   ranking is already good, so a wholesale weight retune is unlikely to close a 22–35
   cumulative-discrepancy gap on its own. **Confirmed across every profile, not just the one
   tested above**: the same cumulative-discrepancy trace was run for all 11 cluster levels
   against all 6 `POLICY_PROFILES` (`intersectionHarvest`, `objectiveFirst`, `mustCrossFirst`,
   `harvestThenFinish`, `knotBuilder`, `perimeterSweep`). Every level×profile combination
   landed in the 22–59 range — no profile is dramatically better for any level (the spread
   within a level is typically ±5–10, never a different order of magnitude). This rules out
   "wrong profile chosen by the policy" as an explanation too: there's no profile swap that
   turns this into an LDS-tractable problem.

   **Follow-up: both halves of the "tighter admissible bound" direction from the paragraph
   above have now been tried, shipped, and measured insufficient (see Shipped).** The
   connectivity prune now correctly blocks re-entry into used flippers, and the must-cross
   MST bound now correctly tightens pairwise edges when two remaining objectives are both
   pending their perpendicular approach simultaneously. Both are real, verified, sound
   improvements (zero regressions, unit-tested, node-count-confirmed to actually engage) —
   and neither flips a single cluster level. Also proven this round: beam search at width
   50000 (the widest tier the policy has) *naturally exhausts* — not budget-capped — on
   S031/S043 across all 10 `POLICY_PROFILES`, so this isn't a search-breadth or
   profile-selection gap either. Taken together with the discrepancy findings above, the
   remaining candidate fixes are now narrowed to two: (a) an admissible bound tight enough
   to shrink the search tree by an order of magnitude — not the narrow-condition tightening
   tried so far (note: `mpMSTLowerBound`, must-pass's analog, has *no* equivalent gap to
   close — must-pass cells need only one visit, with no axis-restricted approach concept
   at all, so there's no directional-min tightening available there the way there was for
   must-cross's 2nd-pass requirement; don't re-attempt this specific pattern on must-pass),
   or (b) a genuinely different search
   paradigm (constraint propagation over the must-cross/flipper interaction, or local-search
   repair seeded from a near-miss — the latter is trivially sound regardless of heuristic
   quality, since any candidate it produces still passes through the same `isSolutionState`
   check before being accepted, so it's a safe engineering investment even though it's a
   bigger one). (b) is the more promising direction given how many admissible-bound and
   search-breadth avenues have now been exhausted without moving this cluster at all.

   **Tried since: lower-bound-informed scoring — implemented, measured, reverted; a genuine
   negative result, not just an untried idea.** Standard best-first/A* practice is to make
   the admissible bound *itself* a scoring signal (reward moves that reduce it), not just a
   prune — untried before this pass since `scoreMove` and the lower bounds were two separate
   systems. Implemented as a new term (`SCORE_MST_URGENCY`): reuses `mustCrossLowerBound`/
   `mustPassLowerBound` directly, rewards `dCur − dTarget` same as the existing per-cell
   urgency terms, gated to ≥2 remaining objectives (where the MST/joint computation
   actually differs from what the existing per-cell terms already cover). Witness-trace
   discrepancy was **exactly unchanged** (S033 still 22, S042 still 35) — not a rounding
   effect, a real zero. Direct per-step inspection of the score deltas explains why: at
   every point the witness path had a real choice, it *sometimes* took the move that
   **increases** the joint must-cross bound while an available alternative would have
   decreased it (S033: consistently at every branch point checked — steps 1, 2, 6, 10, 11
   in the first 15; S042: mixed, aligned at some branches, opposed at others). The witness
   deliberately takes locally-"worse" (higher-remaining-bound) moves because the puzzle
   needs to hit `reqLen`/`reqInt` *exactly*, not just complete objectives fastest — greedy
   bound-minimization actively fights the "padding" moves the exact-length constraint
   requires. This is a **conceptual mismatch, not a weak-signal problem**: increasing the
   weight would likely have hurt more than helped, not just needed tuning. Reverted
   cleanly (`scoring.ts`, `ablation-config.mjs`) rather than shipped-but-disabled, since it
   adds real per-candidate compute cost (two more `mustCrossLowerBound`/
   `mustPassLowerBound` calls when gated) for a term with no established benefit anywhere.
   **Implication for future work**: any local-search/repair approach (the recommended
   direction above) needs an acceptance/scoring criterion that respects the exact-length
   constraint directly (e.g. distance-to-reqLen-and-reqInt jointly, not distance-to-goal
   alone) — a plain "minimize remaining distance" objective, the natural first thing to
   reach for, will fight the puzzle the same way this scoring term did.

   **Tried since: flipper-axis-aware connectivity propagator — implemented, measured,
   reverted; sound and strictly tighter, but a net-negative trade.** The plain connectivity
   BFS (`isConnected`) already treats a not-yet-used flipper as freely traversable in either
   direction, over-approximating reachability — a not-yet-used flipper can only be *entered*
   along its current required axis (parity of flippers used so far). Built a bitmask-aware
   variant (`_isConnectedFlipperAware`, BFS state = `(cell, hypothetical-flipper-bitmask)`,
   ≤16 bitmask values per CLAUDE.md's 4-flipper max) that respects this per-edge axis
   restriction, dispatched from `isConnected` only for flipper-containing levels so the far
   hotter flipper-free path pays nothing. Two unit tests confirmed the logic itself is
   correct (used-flipper hard wall under intersection budget; unused-flipper wrong-axis
   block) — this is a real, sound, strictly-tighter prune, not a bug. **First cut used a
   fresh `Set`/closure per call and regressed 5 of 6 sampled flipper levels from 2–12s
   solves to 20s timeouts** — confirmed via node counts as pure per-call allocation
   overhead on a documented 10^5–10^6-calls/level hot path, not a logic slowdown. Rewrote
   with preallocated generation-stamped typed arrays (mirroring the file's existing
   `_reachGenBuf`/`_reachQ` pattern) and inlined away the two return-value closures
   (`reachedKey`, `visitCell`) that reintroduced the same allocation one level up — brought
   5 of 6 back to within noise of baseline. **The 6th (S029) stayed regressed even after
   removing every allocation**: baseline solves it in 11.7s (`objectiveFirst`); with the
   axis-aware propagator it times out at 20s, with zero further allocations in the hot path
   — so this is the BFS's own larger per-call state space (up to 16× — cell×bitmask vs.
   cell-only), not GC pressure, costing more per `isConnected` call than the tighter pruning
   saves on this level. Ran the full 11-level batch-B cluster with the propagator active:
   **zero levels flipped from timeout to solved** — same result as both prior "tighter
   admissible bound" attempts (the used-flipper BFS block, the must-cross MST tightening).
   Net effect: one real regression (S029), zero gains anywhere sampled. Reverted
   (`topology.ts`, `topology.test.ts`) rather than shipped — CLAUDE.md's bar is *no*
   regression vs. baseline, and this failed it on a level actively used by other batches.
   **Implication**: this closes out the "tighter admissible bound via connectivity
   propagation" sub-avenue for this cluster specifically — a third independent bound-
   tightening attempt (used-flipper block, MST pairwise edges, now full axis-aware
   reachability) has now moved the needle on zero cluster levels while costing real
   performance elsewhere. The remaining candidate from item 6's "what's left" analysis
   is now singular: (b), a genuinely different search paradigm (constraint propagation
   over the must-cross/flipper interaction, or local-search repair with an exact-length-
   aware acceptance criterion per the SCORE_MST_URGENCY finding above) — not another
   admissible-bound variant.

   **Resolved (mostly): the iterated-local-search repair fallback, plus a real scoring gap
   fix — see "Shipped" above.** Option (b) from the paragraph above, built and shipped, then a
   real premature-convergence bug found and fixed (elite pool + stagnation-triggered
   fresh-restart bursts), then a genuine gap in `scoreMove` diagnosed and fixed (must-turn
   landmarks had zero scoring guidance — the only landmark type with none — leaving S028 to
   incidental momentum). **9 of the 11 cluster levels now solve** (S028, S030, S031, S033,
   S036, S039, S042, S044, S048) — S028 via plain DFS once the scoring gap closed, the other 8
   via repair. The remaining 2 are two *different, unrelated* open problems, not a single
   harder tier: **S043** needs *axis-aware* must-turn guidance (the correct entry direction for
   a `cw`/`ccw` cell, not just distance-to-cell — the same pattern already solved for
   must-cross 2nd-visits via `mcApproachDistMaps`, not yet built for must-turn); **S047**
   plateaus on length being off by exactly one with every other constraint satisfied, likely a
   portal-jump-parity interaction, not investigated further this round.
7. **S093/S099 (batch D, mechanism-free): confirmed genuine hard wall, re-quantified.**
   Re-probed after the S017 fix (which doesn't touch this rule's non-diverse-beam levels).
   S093 solved once at 90s (38.0s, `objectiveFirst`) but **failed again at a clean 60s
   re-run** with full `Solver.solve(...).attempts` instrumentation: `beam(objectiveFirst
   @5000)` and `beam(intersectionHarvest@5000)` both self-terminate (exhaust, not
   budget-cut) in 1–3s without finding anything — width isn't the bottleneck, the beam
   genuinely can't find this structure at any width tried up to 15000 — and the winning
   path is `dfs(objectiveFirst)` unbounded, which needed **28.2s and still hadn't
   converged** when capped (vs. ~36s inferred from the lucky 90s run). This is a real
   floor, not dilution: the earlier 90s "solve" was a favorable one-off split (the beams
   happened to fail fast, handing DFS nearly the whole budget by chance), not a
   reproducible fix — a same-budget re-run at 60s failed outright. No policy/ordering
   change closes a ~2× budget gap; needs either a genuinely faster path to the same
   solution or ~2× today's ceiling.

   **Resolved: the repair fallback, extended to a mechanism-free feature regime.** Asked
   directly whether the (unrelated-looking, different-batch) remaining failures might share a
   fix, a feature comparison showed S093/S099 have `mustPass=0, mustCross=0` — completely
   outside the repair gate's original `mustCross≥2 && mustPass≥3` predicate, so repair never
   even ran on them. But their *symptom* (beam can't find the structure at any width; unbounded
   DFS needs ~2× the budget to converge) is the same category of problem repair was built for —
   DFS/beam's deterministic ordering being the blocker, not raw search-space size. Tested
   directly: `repairSearchFromGate`, called on both, solved S093 in **215ms** and S099 in
   **774ms** — dramatically faster than DFS's own 28–40s, and both independently confirmed
   `isSolutionState`-valid via a from-scratch replay (not just trusted from the search's own
   internal check). Extended `needsRepairFallback` with a second clause — `isHighInt(f) &&
   reqInt ≥ POLICY.VERY_HIGH_REQINT` — reusing the same named threshold the existing
   "wide-beam-first" rule already uses for this exact archetype/difficulty regime, not a value
   invented for these two levels. Purely additive and risk-free by the same construction as the
   original clause: repair only ever runs after the entire existing bundle has failed, so any
   level that already solves is completely unaffected (confirmed: `solver:bench --check` stayed
   at 156/156 in the *same* ~23s, meaning repair never even engaged for the published corpus).
   **Result: both S093 and S099 solve** (~20s — the main loop's own budget elapsing before
   repair gets its turn — plus repair converging in under a second once it runs), both
   referee-valid. As a side effect, the same broadened gate also rescued **S143**, this
   session's previously-documented budget-edge-flaky level (item 8 above), which now has a
   repair-search safety net for the runs where the main loop's split falls unfavorably.
   Verified: 156/156 published (no bench regression), full stress corpus **148/150** (was
   146/150), `npm run ci` green. **Only S043 and S047 remain unsolved in the entire 150-level
   corpus** (plus nothing else — S093/S099/S143 are no longer failures).

**Methodological note for whoever picks these up:** the accepted fixes in this session
(`HIGHINT_MC_DIVERSE`, the diverse-beam-first reorder) and the rejected ones (portal-aware
parity, the flipper hard bound, S093/S099 beam-width/floor tuning) were built with equal
care and initially looked similarly promising in noisy wall-clock runs. The
differentiator was **deterministic, repeatable measurement** — a node-count A/B (fixed
profile/beam width, run to completion, compare `nodesExpanded` — not elapsed ms) for pure
search-order questions, or a **clean re-run at the same budget** for budget-allocation
questions (item 7's 90s "solve" did not reproduce at 60s on a second run — a single
favorable data point is not evidence). Wall-clock deltas of 5–10% on this corpus are
consistent with plain run-to-run noise (see the `stress:regression` "held" baselines
drifting run over run); don't trust them alone to justify a fix.

7. ~~**Adaptive per-attempt LDS probe budget — scoped design, NOT implemented.**~~ **Shipped**
   — see the "floor + ceiling" snapshot near the end of this file for the actual mechanism
   that landed (a different one than originally scoped below: the k=4-exhaustion gate this
   item proposed, and a "doubling trick" redesign tried after it, were BOTH also tried and
   reverted before the final floor+ceiling design closed S118's flakiness without regressing
   S123 or the published corpus). The original scoping is kept below for the reasoning trail,
   since two more real dead ends were found following exactly the risk this item predicted.

   **Why a flat floor can't work (recap of the proof, not repeated here in full — see the
   snapshot below for the actual bisection data):** the floor's harm is proportional to how
   many attempts in a ladder receive the extension × how much of each extension is wasted on
   an attempt that fails anyway; its benefit is concentrated in exactly one attempt per level
   (the one that would have succeeded given more room). A flat constant can't tell those
   apart, so raising it enough to help S118 necessarily also slows down every one of S123's
   many doomed earlier attempts, pushing S123's actual winning attempt out of budget.

   **Candidate signal: gate the k=8 wave's extension on how the k=4 wave finished.** Only let
   k=8 use budget beyond the un-extended `probeCapMs` when k=4 (run under the *original,
   unmodified* cap) finished via genuine **exhaustion** (fully explored its bounded tree)
   rather than **timeout** (hit the cap without finishing). Rationale: exhaustion at k=4 is
   real evidence this attempt's search tree is small/tractable at this position — LDS
   discrepancy trees grow roughly with branching factor per widened k, not unboundedly — so
   extending to k=8 is a bounded, comparatively cheap bet. Timeout at k=4 means the tree is
   *already* governed by hitting time limits; extending further compounds wasted time on what
   is very likely a doomed attempt — which is the exact failure mode the flat floor produced
   on S123.

   Spot-checked against today's own investigation data (not a full validation — a sanity
   check that the signal is *plausible*, nothing more): S118's winning attempt's k=4 wave
   exhausted in a clean 85ms (would qualify for the extension). Several of S123's floor-hurt
   attempts show k=4 *timing out* even under the bad floor (would NOT qualify, preserving
   their original fast-fail behavior) — but not all of them; some exhaust at k=4 and still
   fail afterward, so this signal reduces but does not eliminate the risk of wasting time on
   a doomed attempt. Real per-attempt verification, not this spot-check, would have to decide
   if that residual risk is small enough.

   **Why this design over other candidates considered:** two other approaches were sketched —
   gating the extension on how many ladder attempts remain (`pairsLeft`), or on what fraction
   of the level's total budget has already elapsed — both plausible, but both require new
   plumbing (`dfsFromGateLDS` doesn't currently receive ladder-position context, and it's
   called from orchestration.ts, repair-search.ts's sibling paths, and race.mjs's worker,
   multiplying the surface to thread through and re-verify). The k=4-exhaustion signal is
   self-contained inside `dfsFromGateLDS` itself — no new parameters, no new call-site
   changes anywhere — which makes it the smaller-blast-radius option to actually build.

   **Verification plan, informed by this investigation's own blind spot:** node-count A/B
   doesn't apply (behavior genuinely changes) — full differential testing is required, at
   minimum: (a) calibrate any new thresholds via bisection against BOTH S118 (needs it) and
   S123 (must not regress) in complete **isolation**, repeated ~10x each, not a single run and
   not a full-corpus-vs-full-corpus diff (proven insufficient — see the snapshot below for
   exactly how that diff hid a real regression); (b) given this investigation *also* found
   that this sandbox's own performance can drift ~20-25% over a multi-hour session for reasons
   outside code control (measured directly: an isolated single-attempt throughput test dropped
   from ~3760-3985 nodes/ms to ~2900-3000 nodes/ms between two points in the same session,
   while a simultaneous pure-arithmetic CPU probe showed zero change), any verification run
   should bracket itself with a quick re-check of an already-known-stable case (S123, or a
   short CPU probe) immediately before/after, to catch environmental drift contaminating the
   result before attributing an outcome to the code change; (c) `solver:bench --check` (156
   published levels); (d) full 150-level stress corpus, run twice given (b); (e) `npm run ci`.

   **Honest risk assessment:** verification is the expensive part here, likely comparable to
   or larger than the reverted floor attempt's own investigation, and there is a real chance
   this doesn't pan out either — S118's true margin may simply be thin enough (a few hundred
   ms against a background of hardware timing noise already shown to shift outcomes on its
   own) that no per-attempt probe-budget heuristic closes it reliably. Worth setting that
   expectation before investing the verification effort, not after.

   **Cheaper alternative worth trying first, independent of whether this gets built:** the
   literal ask ("full-corpus results should match individual-run results") doesn't strictly
   require touching solver hot-path logic at all. A tooling-only fix — e.g. `stress:benchmark`
   automatically re-trying any level that failed once, in a fresh isolated process, before
   reporting it as a genuine failure — would absorb exactly this class of narrow-margin
   flakiness without any risk of a new solver regression, at a fraction of the verification
   cost. Not implemented; flagged here as the lower-risk thing to reach for first.

## Snapshot — worker-thread attempt racing, backend-only tooling (2026-07-09, 20s budget)

Not a change to the production solver — `modules/solver/*` and its browser bundle are
untouched. `scripts/solver-parallel/` (`race.mjs`, `worker-source.mjs`, `benchmark.mjs`) races
the exact same policy-selected attempts (`getConfiguredAttemptConfigs`/`getActiveGates`, the
identical selection `solveLevel()` uses) across a pool of `node:worker_threads` instead of
running them one at a time; first success wins and every other in-flight worker is terminated.
Node-only, lives under `scripts/`, never imported by the solver core — see
`docs/solver-architecture.md`'s new "Parallel attempt racing" section for the full design
(two-queue reserved-worker scheduling for repair vs. main-loop jobs, and the dynamic
concurrency-scaled budget-sharing model).

**Two real bugs found and fixed during verification, not shipped on faith:**
1. **Repair starvation (S043).** An initial single combined priority queue (repair sorted
   last, as the policy naturally produces it) let repair jobs — which don't fail fast, an
   iterated-local-search that's going to fail burns its *full* budget — sit queued behind the
   whole main-loop ladder even when repair could solve the level in seconds. S043 raced at
   22.7s wall time for a winning job that only needed 2.5s. Fixed by reserving a bounded slice
   of the pool exclusively for repair, running concurrently with (not after) the main loop.
   Re-verified: S043 fixed at 2.87s.
2. **Budget-dilution collapse (S118).** A first budget model gave every `(config, gate)` job
   its own full `timeBudgetMs`, on the theory that concurrency removes the need to share a
   timeslice — backwards: it inflated total provisioned work by `configs × gates`, blowing
   through the overall wall-clock cap on S118 (4 gates) before the ladder reached the combo
   that solves it (the same level `ADAPTIVE_GATE_THRESHOLD`'s own comment names as the
   original dilution-discovery level). Fixed by reproducing `runInterleavedAttempts`'s dynamic
   `pairShare` reallocation, scaled by each queue's own worker count (a pool of N workers
   clears the queue in `pairsLeft/N` waves, not `pairsLeft` of them).

**Originally logged here as a CPU-contention limitation — since root-caused (but NOT
successfully fixed) as a real solver bug, not a hardware property. See the next snapshot
below.** At the time this was written, S118 didn't reliably solve at the sequential-default
20s budget on this session's 4-vCPU sandbox, and the working theory was throughput collapse
under worker contention. Follow-up investigation (prompted by asking "what would it take to
get to 150/150") found the actual mechanism: a real bug in `dfsFromGateLDS`'s probe-budget cap,
shared by *both* the sequential and raced engines. A fix was attempted, shipped, and then
**reverted** after a counter-example showed no single global value avoids trading this bug for
a worse one on a different level — see the "tried and REVERTED a dfsFromGateLDS probe-floor
fix" snapshot immediately below for the full story. S118's underlying flakiness is therefore
still present and still unresolved; contention on constrained hardware remains a real,
separate, secondary effect (racing's own throughput per worker does still degrade under
concurrency) but was never the dominant cause the way this entry originally concluded.

**Verified**: full 150-level stress corpus via `stress:benchmark:raced` (20s budget, default
pool size): **149/150 solved, 0 errors, all 149 solved paths referee-valid, 193.8s total** — vs.
the sequential engine's established 474.6s baseline on the same corpus (~2.4x faster
wall-clock), with S118 as the sole, previously-diagnosed exception. `check:lint`, both
`check:types*` tsc passes, and the full vitest suite (738 tests) all green — this tooling adds
no new solver-core surface, only new backend-only `.mjs` files. Not run through
`solver:bench -- --check` (that gate is for the sequential production path, which this doesn't
touch) or the Playwright e2e/visual suites.

## Snapshot — tried and REVERTED a dfsFromGateLDS probe-floor fix: real trade-off, no safe global value (2026-07-09, 20s budget)

Follow-up to the racing snapshot above, prompted by the direct question "what would it take
to get to 150/150?" Found a real, mechanistic root cause for S118's flakiness, shipped a fix
for it, then found — via a counter-example `solver:bench --check` doesn't cover — that the fix
traded S118's intermittent flakiness for a **different, worse, fully deterministic failure** on
another stress-corpus level (S123). Reverted. Recorded here in full because the investigation
method (and its blind spot) matters more than the abandoned fix itself.

**Root cause, verified mechanistically.** `dfsFromGateLDS`'s probe phase (LDS discrepancy
bounds k∈{0,1,2,4,8}) is capped at `probeCapMs = min(floor(levelBudgetMs*0.5), 4000)` before
falling back to the unbounded k=∞ search. S118's one winning attempt
(`knotBuilder@gate589829`) needs its k=8 probe to run ~900ms to find the solution; on a 4-gate
level, budget dilution across configs×gates (`ADAPTIVE_GATE_THRESHOLD` — S118 is the level
that mechanism was built for) regularly gives this attempt only 1000-1500ms total, so the flat
50% split caps probeCapMs at 500-750ms — cutting k=8 off right before success, deterministically
whenever dilution lands in that range. This part of the diagnosis is solid and still true.

**The fix, and the counter-example that killed it.** Floored `probeCapMs` at a constant
(tried 1300ms, then 1000ms after 1300ms was shown to regress published level 140's
`solver:bench --check` result — see the original write-up this replaced). 1000ms passed
`solver:bench --check` (156/156, twice) and fixed S118 in isolation (10/10). It was committed
and pushed. Only *after* that, chasing the user's follow-up question about full-corpus
consistency, did testing go further: **bisecting the floor value against S123 in isolation**
(not full-corpus — full-corpus was already known flaky on S123 pre-fix and that fact
masked this) showed S123 goes from a clean, deterministic 11.0s/1,209,412-node success at
floor≤350ms to a deterministic 20s/4,838,250-node *timeout* at floor≥400ms — every single
time, not intermittently. Meanwhile S118 needs floor≥~950-1000ms to succeed reliably. **These
two ranges do not overlap.** There is no flat `_LDS_PROBE_FLOOR_MS` value that fixes S118
without deterministically breaking S123: giving every attempt more probe room doesn't just
risk stealing time from phase 2 on the *same* attempt (the level-140 failure mode already
documented) — it also makes every *other, doomed* attempt earlier in a level's config ladder
take proportionally longer to concede, which can push a level's actual winning attempt (later
in the ladder) out of reach of the total budget. S123 is exactly that: with the floor, k=4/k=8
on several non-winning attempts each ran hundreds of ms to seconds longer before conceding,
consuming the ladder's budget before it ever reached the specific late attempt that (on
unmodified code) solves the level in 184ms via k=8.

**The methodology gap this exposed.** The original verification ran the fixed code's full
150-level corpus, saw the same two levels (S118, S123) fail as a stashed pre-fix run of the
same full corpus, and concluded — wrongly — that nothing had changed. That comparison was
contaminated: S123 was *already* a full-corpus-only flaky level pre-fix (passing standalone,
occasionally failing embedded in the 150-level run), so the fix's own *new*, fully
deterministic standalone failure on S123 was invisible inside a full-corpus-vs-full-corpus
diff — it looked like "the same pre-existing flakiness," when it was actually a distinct,
worse regression hiding behind a coincidence. **Lesson for any future probeCapMs/LDS tuning:**
verify every candidate level's isolated, standalone, repeated-run behavior directly (not just
`solver:bench --check`'s 156 published levels, and not just a full-corpus diff) — the stress
corpus's 150 synthetic levels are exactly the population a change like this needs checked
against, and full-corpus-vs-full-corpus is not a substitute for that when the corpus already
has known-flaky members.

**Status**: reverted to the original unmodified `probeCapMs = min(floor(levelBudgetMs*0.5),
4000)`. S118's original flakiness (root-caused above, real and mechanistic) remains
unresolved — a flat floor cannot fix it without an unacceptable trade-off; a level-adaptive
mechanism (distinguishing "this attempt's probe wave is worth extending" from "this attempt is
doomed, cut it short to preserve the ladder's remaining budget" — without keying on level
identity, which `check:no-solver-level-numbers` forbids and which would be the wrong fix even
if it were allowed) would need real design work, not a constant tweak. Not attempted here.

## Snapshot — S118 and S123 genuinely fixed: a floor+ceiling on dfsFromGateLDS's probe budget, after two more reverted attempts (2026-07-09, 20s budget)

Direct follow-up to the reverted flat-floor snapshot above, prompted by an explicit request
to keep pursuing a real fix rather than a tooling-level workaround ("I don't like the idea of
edge cases with razor thin margins... I would prefer to see every level's solve being
predictable and reliable"). Two more designs were tried and reverted before this one held;
recorded here in full since the dead ends are as instructive as the fix.

**Attempt 2 (reverted): gate the k=8 wave's extension on whether k=4 exhausted.** The design
scoped in item 7 above. Verified against S118 (9/10) and S123 (10/10, bit-identical, untouched)
— but broke published level 140 again, through a DIFFERENT mechanism than the flat floor:
level 140's own eventually-winning attempt already reaches k=8 today (timing out there under
the small original cap before correctly falling through to k=∞, which solves it in ~2.5s).
Extending k=8 even conditionally steals directly from that SAME attempt's own k=∞ phase,
since both draw from one fixed per-attempt budget. Confirmed with `PF_LDS_DEBUG=1` on the
*original* code: k=8 also times out for both S118's and level 140's winning attempts under
the small cap — there is no cheap signal in that shared behavior distinguishing "the answer is
at k=8" from "the answer needs k=∞." You cannot know without spending the time.

**Attempt 3 (reverted): the "doubling trick."** Widen k (0,1,2,4,8,16,32,64) and each wave's
own FRESH time budget together, doubling a wave's budget only once a smaller allotment proves
insufficient — a well-founded technique (bounded ~2x overhead vs. an oracle that knew the true
cost up front) for exactly this "unknown resource requirement" problem. Empirically made
things *worse*: reaching a wave with enough of its own room to land S118's ~900ms solution,
starting from a tiny first-wave cap (tried 50ms), itself costs roughly 2x that target
(~1600-1800ms) in cumulative escalation overhead across all the smaller, failed waves BEFORE
ever reaching a big-enough one — which exceeded the entire diluted attempt's own budget in
practice (direct isolated test: `budget=2000ms` → only 6,843 nodes explored, timing out with
the escalation cascade alone consuming ~1577ms before ever reaching a wave with real room).
The old fixed-percentage design's one advantage was putting a large chunk of the budget at
k=8 *immediately*, on the very first attempt — doubling-from-scratch can't do that without
either an arbitrary large first step (reintroducing attempt 2's exact problem) or paying the
escalation tax.

**Attempt 4 (shipped): a floor AND a ceiling.** `probeCapMs = clamp(floor(levelBudgetMs*0.5),
FLOOR, CEILING)` where `FLOOR = 1000ms` (unchanged from the reverted flat-floor attempt) and
`CEILING = levelBudgetMs * 0.6`. The ceiling is what makes this different from attempt 1: it
bounds the floor's own damage directly instead of trying to predict which attempts deserve it.
Two things fall out of the same mechanism:
- **Within-attempt protection (fixes the level-140 failure mode):** the ceiling guarantees the
  unbounded k=∞ phase a protected minimum share (≥40%) of THIS attempt's own budget no matter
  how large the floor tries to push `probeCapMs` — level 140's winning attempt can no longer
  have its own k=∞ phase starved by an extended k=8.
- **Cross-attempt protection (fixes the S123 failure mode):** because the ceiling is a
  fraction of THIS attempt's *own* (possibly tiny, dilution-shrunk) budget, a heavily-diluted
  early attempt's `probeCapMs` can only grow to a bounded fraction of its own small budget —
  never the large absolute floor constant that dwarfed it before. S123's many fast-failing
  early attempts stay fast; only attempts with a genuinely larger budget can approach the
  floor at all.
- Note: `CEILING_FRACTION <= 0.5` makes the floor completely inert (the ceiling always wins
  before the floor can raise anything above the original 50% split) — the useful range is
  strictly above 0.5.

**Calibration, not guessing — both constants were bisected, not assumed:**
`CEILING_FRACTION = 0.7` still let S123 (previously bit-identical, always-solving) fail 3 of 7
repeated isolated runs (same 4,838,250-node deterministic-failure signature as the original
flat-floor regression). `0.55` still failed 1 of 6. **`0.6` is the verified value**: clean
across 5/5 (S118) and 10/10 (S123) repeated isolated runs, plus a clean run on published level
140 (the level attempt 1 broke).

**Full verification, following the exact discipline the earlier methodology gap demanded:**
- `solver:bench --check`: **156/156, no regressions** (run twice).
- S118 isolated: 5/5 and 10/10 across separate rounds (up from ~1/3 pre-fix).
- S123 isolated: 10/10, bit-identical node counts throughout (fully untouched by the fix).
- Level 140 (isolated, the level attempt 1 broke): clean success every time re-checked.
- `check:lint`, both `check:types*` tsc passes, full vitest suite (738 tests): all green.
- Full 150-level stress corpus (single long-running process — the hardest test shape):
  **149/150** (up from 148/150 pre-fix). S123 no longer appears in the failure list at all
  — genuinely fixed even under the toughest conditions tested. The sole remaining failure,
  S118, timed out with `nodesExpanded=6,379,987` — squarely inside the "long-process-drift
  degraded throughput" signature (6.0-6.3M = degraded, 7.6-9.4M = healthy) already root-caused
  as a pre-existing, code-independent property of sustained single-process runs (confirmed via
  git-stash A/B against the pre-fix code in the racing snapshot above, which showed the
  identical S118/S123 pair failing with or without any of this session's changes). This is not
  a new regression; it's the same known, separately-tracked environmental effect, now with one
  fewer level (S123) exposed to it.
- Full `npm run ci`: green.

**Status**: shipped. S118's underlying flakiness is substantially, verifiably improved (not
just theoretically) — reliable in isolation and in the standard published-corpus gate; the
residual full-corpus-single-process sensitivity is a distinct, already-documented environmental
phenomenon, not something this fix left on the table.

## Snapshot — fixed the must-cross approach-axis timing bug, scoped out of repair-search.ts after a real regression (2026-07-09, 20s budget)

Follow-up to the must-pass hoist below, closing out the must-cross axis-timing bug documented
(but not fixed) there. Root cause, restated precisely: `scoreMove`'s must-cross 2nd-visit
approach-map selection reads `usedH = state.edgeUsage[mcKey] & AXIS_H` at call time. For beam and
repair (which score each candidate *after* tentatively applying it), when `pos` itself is the
pending must-cross cell (crossCounts=1 — an ordinary occurrence on every must-cross cell's first
visit, not a rare edge case), a candidate whose own exit axis differs from the entry axis sets a
*new* edge-usage bit that flips `usedH` for that one candidate only — an accidental,
candidate-dependent reading with no design intent behind it (the term's own comment says it
should guide toward the axis *perpendicular to entry*, a fixed fact once you've arrived).

**Fix**: `CurUrgencyContext` now also captures the must-cross branch/array selection once per
candidate batch, from the entry-only state (before any candidate is applied) — every sibling
candidate is scored against the same, correct axis choice. Wired into DFS's `scoreAndSort` and
beam's per-node candidate loop.

**A real regression found and fixed before shipping, not just a hypothetical concern.** A first
version applied the fix everywhere, including `repair-search.ts`'s `takePly`. A full stress-corpus
run showed S043 regressing from a ~4.4s solve (via the must-turn-biased repair attempt) to a hard
266.5s failure — both the ordinary *and* biased repair attempts now burned their full 120s
extra-budget allotment (`REPAIR_EXTRA_BUDGET_FRACTION`) and still failed. S043 needed three
independently stacked, carefully-tuned fixes to become solvable at all (must-turn exit guidance,
portal-parity guidance, the dedicated biased-repair attempt — see this file's earlier snapshots),
and repair's randomized-restart search is already documented elsewhere in this file as measurably
more sensitive to `scoreMove`'s exact balance than DFS/beam's deterministic search — exactly why
`mustTurnUrgencyWeight` and `mustTurnExitGuidanceWeight` are independently zeroed for
`POLICY_PROFILES.repair` while every other profile keeps those terms at full strength. Same shape
of problem, same fix: `buildCurUrgencyContext` gained an `includeMcAxisFix` parameter (default
true), and `repair-search.ts` passes `false` — repair keeps the *original* per-candidate
computation for must-cross specifically (still gets the must-pass hoist), while DFS and beam,
whose search isn't documented as sensitive this way and don't touch S043's winning path at all,
get the correctness fix at full strength. Re-verified: S043 solves in 3.968s in isolation with the
scoped fix, matching its historical baseline.

**Verified**: full stress corpus **150/150 solved, 0 failed, 0 errors, 474.6s** — down from 590.8s
(~20%), a genuine improvement from the correctness fix itself (not just noise: the fix changes
which move beam/DFS prefer on every must-cross-2nd-visit decision on every level that reaches that
code path, and the aggregate move is large and consistent across re-runs, unlike the single-digit-
percent deltas this file's own methodological note treats as noise-adjacent). One transient run
during investigation showed S118 timing out — re-verified clean in isolation (14.5s, matching its
historical baseline) and structurally unrelated (S118 has zero must-cross objects, so this fix
cannot affect it at all) — consistent with the pre-existing single-level environment flakiness this
file already documents for `solver:bench`. Published corpus **156/156, no bench regression**
(`solver:bench -- --check`). Full vitest suite green (738 tests — 5 new, including one pinning the
original bug/fix contrast directly via array-identity and isolated-term-delta assertions, and one
pinning the `includeMcAxisFix=false` scoping itself).

## Snapshot — hoisted scoreMove's position-invariant must-pass lookup out of the per-candidate loop (2026-07-09, 20s budget)

Follow-up to the flattening snapshot below: every `scoreMove` call recomputes `dCur` (distance
*from the current node's `pos`*) fresh, even though `pos` is identical across every sibling
candidate a batch scores — DFS's `scoreAndSort` loop, one beam frontier node's candidate loop, one
repair `takePly` call. Added `buildCurUrgencyContext`/`CurUrgencyContext` (`scoring.ts`): computed
once per batch, before any candidate is applied, and passed into every `scoreMove` call in that
batch as an optional parameter (omitted entirely by every existing test/caller, so nothing not
opted in changes behavior).

**Scoped down mid-implementation after a real bug was found, not shipped as originally designed.**
The first version also hoisted must-cross's 2nd-visit approach-map selection
(`usedH = state.edgeUsage[mcKey] & AXIS_H`). This is unsound to hoist: the *original* per-candidate
code reads that axis bit *after* the current candidate's own tentative move has been applied
(beam/repair's post-apply convention), and when `pos` itself is the pending must-cross cell
(crossCounts=1, evaluating exit candidates from it — an ordinary occurrence on every must-cross
cell's first visit, not a rare edge case), a candidate whose own exit axis differs from the entry
axis sets a *new* bit that changes `usedH` for that specific candidate only. A single pre-loop read
is a genuinely different, decision-changing computation, not just a faster route to the same one —
caught by this session's own node-count A/B (bit-identical `nodesExpanded` is the bar for every
optimization shipped today), which showed real divergence: S031 ordinary went from 651,912 nodes to
5,195,771; S047 ordinary regressed from a consistent ~3.4–3.9s solve to an outright 60s timeout.
Reverted must-cross from the hoist entirely — must-pass has no analogous dynamic-state branching
(`mpDistArrs[i]` is a plain static BFS array), so it's provably safe on its own. Re-verified: every
sample level's `nodesExpanded` came back bit-for-bit identical to the pre-hoist baseline once
must-cross was dropped. (Whether the *original* must-cross axis-timing behavior is itself worth
fixing — the hoisted version is arguably more semantically correct — is an open, separate
question, not attempted here: it would be a genuine search-order behavior change needing its own
dedicated verification, not a free rider on an optimization whose entire safety argument rests on
being decision-preserving.)

**A second false alarm, run down to ground rather than assumed.** A full-corpus benchmark run
showed S118 (the 4-gate budget-starvation level, `runInterleavedAttempts`) timing out — solved
cleanly 4/4 times in isolation, so not a deterministic bug, but concerning since it hadn't
previously failed in a full run. Per this file's own standing methodological guidance (re-run the
pre-change code before concluding anything), re-ran the *pre-hoist* code through the same full
150-level corpus: it also produced exactly one failure — a *different* level, S123 — which also
solves cleanly and consistently in isolation. Both S118 and S123 are already-known
budget-margin-sensitive levels; a single one of them tipping over in a ~10-minute, 150-level
sequential run (CLAUDE.md: "the single hardest level can fail under sandbox CPU-throttling, which
is not a code regression") is apparently a standing, environment-driven property of this corpus at
this budget, not something the hoist introduced — the *same* one-level-flakes-but-which-one-varies
signature appears with or without it.

**Verified**: full stress corpus **150/150 solved, 0 failed, 0 errors, 590.8s**. Published corpus
**156/156, no bench regression** (`solver:bench -- --check`). Full vitest suite green (735 tests —
3 new, pinning `buildCurUrgencyContext`'s output and `scoreMove`'s with/without-`curCtx`
score-identity directly, not just via the corpus). Node-count A/B (isolated `repairSearchFromGate`
runs, same seeded RNG): `nodesExpanded` bit-for-bit identical to the pre-hoist baseline on every
level/variant sampled once must-cross was dropped from the hoist.

## Snapshot — flattened remaining Map-based hot-path distance lookups to typed arrays (2026-07-09, 20s budget)

Follow-up to the MST-bound fix below: `mustPassDistMaps`/`goalDistArr` were already flattened
from `Map<key,dist>` to `Uint16Array` (`distMapToArray`/`getDistanceFromArray`) specifically for
hot-path speed, but four newer distance-map families were still plain `Map.get()` calls inside
`scoreMove`'s and the lower-bound functions' per-candidate loops — an inconsistency (these
features were added after the flattening pattern was established), not a deliberate choice.
Two commits closed the gap:

1. **Landmark maps** (`surroundNeighborDistMaps`, `adjTurnDistMaps`, `mustTurnDistMaps`) —
   read in `scoreMove`'s three landmark urgency terms and `surroundLowerBound`/
   `adjTurnLowerBound`. Live only on landmark-bearing levels (batch-B's must-turn/surround/
   adjacent-turn subset).
2. **`mcApproachDistMaps`** (must-cross 2nd-visit perpendicular-approach maps) — read in five
   hot-path sites across `scoring.ts` and `lower-bounds.ts`, including `mcMSTLowerBound`
   (historically ~30% of repair-search's CPU before its own memoization fix, see below) and the
   MST pairwise-edge tightening from the MST-bound correctness fix. Bigger blast radius than the
   landmark maps: must-cross ≥2 is part of the repair fallback's own feature gate, so this is
   live on most of the current slow tail. One wrinkle: read sites branch on `aMap.size > 0`
   ("any valid approach cell exists at all for this axis") as a condition distinct from "the map
   has entries but this query is unreachable" — a flattened all-0xFFFF array can't recover that
   distinction on its own, so `vEmpty`/`hEmpty` booleans are computed once at prep time instead.

Both are pure representation changes — identical values, O(1) typed-array reads instead of hash
lookups — verified as behaviorally a no-op via a node-count A/B (isolated `repairSearchFromGate`
runs, same seeded RNG, before vs after): `nodesExpanded` came back bit-for-bit identical on every
level/variant sampled (S031/S037/S040/S041 ordinary+biased, S043 biased, S047 ordinary+biased),
with wall-clock time dropping on the levels large enough to clear measurement noise (S047
ordinary 3.9s → 3.5s across both commits, ~10%). A concurrent full-corpus run (racing against the
A/B script itself on this 4-core sandbox) produced one false timeout (S123) — reproduced as pure
CPU contention, not a regression: S123 re-run in isolation solved cleanly in 9.0s, matching its
pre-change time exactly. This is why the aggregate number below comes from a benchmark run alone,
with no concurrent CPU-heavy jobs.

**Verified**: full stress corpus **150/150 solved, 0 failed, 0 errors**, total **581.8s** (down
from 605.9s, ~4.0%) — a real but modest aggregate move, consistent with the per-level A/B: most
of the corpus barely touches these code paths (only must-cross/landmark-bearing levels do), and
even there the flattening only removes hash-lookup overhead, not search work. The largest
individual gain was S030 (84.4s → 71.7s, ~15%); S033/S046/S047/S048/S143 moved by low
single-digit percents, within the range this file's own methodological note calls noise-adjacent
— but the *mechanism* (an O(1) array read replacing a `Map.get()` in a proven-hot function) is
sound and low-risk regardless of how any one level's wall-clock lands on a given run. Published
corpus **156/156, no bench regression** (`solver:bench -- --check`), `npm run ci`-equivalent
checks green (full vitest suite, 732 tests).

## Snapshot — found and fixed a real MST-bound unsoundness bug; repair-search hot-path speedups partially offset its honest cost (2026-07-09, 20s budget)

Follow-up to the solve-speed pass below, digging into repair-search's own convergence speed on
the 4 levels (S030/S047/S048/S143) that pass's scheduling fixes couldn't touch (they need
16-93s of genuine iterated-local-search compute even cold). `node --prof` on an isolated
`repairSearchFromGate` run found `mpMSTLowerBound` at ~32% of total CPU ticks — by far the
hottest function.

**A real, pre-existing correctness bug, found while investigating speed, not introduced by
anything in this session's earlier work.** `mpMSTLowerBound`/`mcMSTLowerBound` share an
`_mstEdges` scratch buffer sized "max 6 nodes" (30 float64 slots = 10 edges) and a matching
`_ufPar` union-find buffer. But must-turn landmarks fold into the same normalized
`level.mustPassKeys` as wire `mustPass` cells (`domain/landmark-rules.ts`), so the true combined
count regularly exceeds CLAUDE.md's wire-level "max 4" cap — a full-corpus scan found an observed
max of 6 (S026). At k=5+, `mpMSTLowerBound` needs more than 10 edges; TypedArray writes past a
buffer's end are silent no-ops, so the sort/Kruskal steps silently read back stale/undefined data
for the missing edges. This is not just "less tight," it's **unsound**: reproduced directly
against a real stress-corpus level (S046) where the buggy sizing computed a bound of 34 against
the mathematically correct 27 (verified three independent ways — a differential test against a
from-scratch reference implementation across ~8,000 states with zero mismatches, a
hand-computable synthetic 5-cell test now checked in as a permanent regression test, and the
direct S046 reproduction). A bound of 34 where the true value is 27 can wrongly prune a state
that's actually reachable in the remaining budget — a latent risk of the solver declaring a
genuinely solvable level unsolvable, independent of anything this session touched. **Fixed, not
reverted, regardless of performance cost** (see below): resized to a documented, generous bound
(`MAX_MST_K=16`) with a defensive fallback (skip MST tightening, keep the already-valid
max-of-individual bound) if a future level ever exceeds it.

Three genuine, verified speed wins layered on top of (not instead of) the correctness fix:
1. `mustPassLowerBound`/`mustCrossLowerBound` allocated a fresh `remain` array every call
   (millions of times per repair run) — replaced with preallocated scratch buffers.
2. `prep.mpPairDist`/`mcPairDist` flattened from array-of-arrays to flat row-major `Float64Array`,
   read in the MST computation's O(k²) inner loop.
3. **The big one**: `mustPassLowerBound` memoized per `(pos, mpVisitedMask)` on the `prep` object,
   sound because the bound is a pure function of exactly those two values given a fixed
   level/prep, and `prep` is reused across every attempt/gate within one `solveLevel()` call.
   `mpMSTLowerBound` dropped out of the hot-path top 10 entirely; isolated repair throughput rose
   ~44%. Extended the same pattern to `mustCrossLowerBound` (cache key additionally encodes each
   pending cell's `crossCounts`/axis state, since that bound depends on more than the mask) —
   verified correct via ~30,000 differential-tested states across 5 levels, zero mismatches, but
   a smaller, less certain win (must-cross's larger state space likely means a lower cache hit
   rate; measured via a clean full-corpus A/B, not assumed from profiling alone, which didn't
   show a clear shift).

**The honest net effect on this run: worse than the previous snapshot's 404.0s, landing at
605.9s** — a full per-level diff against that checkpoint (not just the aggregate, per this file's
own standing methodological warning above) shows why: the correctness fix costs two levels a lot
(S033: 4.9s → 184.6s, S046: 1.1s → 69.9s — both needed the must-turn-biased repair attempt, which
the old unsound over-pruning had been accidentally shrinking the search space just enough to find
by luck) while the three speed wins recover real but smaller ground elsewhere (S047: 68.8s →
30.8s; S048: 38.0s → 31.3s; plus smaller gains on S030/S043/S004/S028/S039). **This is the correct
trade, not a regression to chase back to 404s**: the 404s figure was never a legitimate baseline
in the first place — it was partly achieved by an unsound prune. Investigated one further honest
recovery avenue for S033 specifically (its must-turn-biased repair attempt only gets a turn after
ordinary repair's full 120s budget — 6× `timeBudgetMs` — is *entirely* wasted, since ordinary
never solves this level): confirmed via a cold isolated call that biased genuinely needs ~35s of
real compute regardless of when it starts (unlike S043 earlier in this session, this isn't a
"repair runs slower after main-loop contention" case), so a probe-style early catch isn't
available here. Reordering which repair variant tries first carries a **symmetric risk**
(S030/S035/S047 need *ordinary* to run first and would pay the same wasted-120s tax in reverse if
biased ran first) that isn't resolvable without either genuine interleaved scheduling between the
two variants (a substantial `repairSearchFromGate` rework to support pause/resume, not attempted)
or accepting that risk on faith — not done today given how many subtle bugs this exact session
already found in adjacent code.

**Verified**: full stress corpus **150/150 solved, 0 failed, 0 errors**, total **605.9s**.
Published corpus **156/156, no bench regression** (`solver:bench -- --check`). `npm run ci` green
(143 vitest tests — one new regression test pinning the MST-bound bug, which fails against the
old sizing with a concrete before/after number, 22 vs the correct 12, on a hand-verified
synthetic 5-cell scenario). Every value-correctness claim backed by differential testing against
an independent reference implementation, not just "tests still pass."

## Snapshot — solve-speed pass, corpus wall time cut 47.8% with zero correctness change (2026-07-09, 20s budget)

The corpus was already 150/150 solved (previous snapshot); this pass targeted wall-clock time,
not correctness, after `logs/solver-workflow` + `reports/stress/benchmark-latest.json` showed 13 repair-won
levels accounting for 563.5s of the corpus's 773.7s total (72.8%), most of it spent on main-loop
attempts already proven (previous snapshots) to exhaust their own search space rather than being
budget-cut. All changes are scheduling/ordering only — no search algorithm, scoring term, or
pruning rule changed, so the risk surface is timing regressions, not correctness ones.

1. **Diverse-beam-first reorder, portal-dense rule** (`attempts.ts`) — the very-high-reqInt +
   portal-dense policy rule still ran two plain WIDE beams before `mcDiverseThread`'s diverse
   beams, the same ordering bug already fixed on the sibling non-portal rule for S017. Reordered
   identically (mechanical repeat of a proven fix). S049: 9.4s → 3.4s; S034: 6.4s → 2.1s.
2. **Early repair probe** (`orchestration.ts`, `runRepairProbe`) — tries each repair attempt
   (ordinary, then must-turn-biased where present) at a small additional budget *before* the main
   DFS/beam loop, for levels matching `needsRepairFallback`. Strictly additive: never subtracted
   from the main loop's `timeBudgetMs` or the later full-budget repair loop's own
   `REPAIR_EXTRA_BUDGET_FRACTION` allotment, and sound by construction (`repairSearchFromGate`'s
   RNG is seeded only from `gateKey`, never wall-clock, so a failed probe just repeats a
   deterministic prefix of the work the later full-budget call performs anyway).
   - **A real implementation bug, caught by a full-corpus regression sweep before shipping.** The
     first version timed the main loop from the original `levelStartTime`; both main-loop runners
     compute each attempt's budget as `timeBudgetMs - elapsed-since-start`, so the probe's own
     wall-clock silently shrank the main loop's effective window — reintroducing the exact
     "reserve budget up front" mechanism that regressed S017 earlier in the project (see
     `REPAIR_EXTRA_BUDGET_FRACTION`'s comment). Several fast main-loop solves (S038, S050, S026,
     S027, S110, S023, S018) lost just enough budget to fail their first attempt, cascading into
     the full slow fallback chain — 50–100x slower instead of faster. Fixed with a separate
     `mainLoopStartTime`, set after the probe finishes, so the main loop always gets its full,
     untouched budget regardless of probe duration.
   - **Tax/benefit tuning, also measured rather than guessed.** A full-corpus scan found
     `needsRepairFallback`'s feature gate is far broader than the levels that actually need
     repair: 48 levels match it but already solve fast via the main loop (repair never engages)
     against 13 that need it — every level in the 48 pays the probe's cost as pure tax on a
     miss. A flat 5000ms budget caught the full known-hard cluster (including the two largest
     single-level wins, S033 and S043) but pushed the aggregate tax on the 48 to roughly the size
     of the cluster's own savings. A flat 1500ms budget cut the tax a lot but missed S033/S043
     entirely (their win needs the must-turn-biased attempt specifically, which took ~3.4s/~4.1s
     cold — over budget at 1500ms). Resolved by splitting into two tiers instead of tuning one
     value: `REPAIR_PROBE_ORDINARY_MS` (1500ms, low tax, applies to all 48) and
     `REPAIR_PROBE_BIASED_MS` (5000ms, only paid by the 9 of the 48 that are must-turn levels).
     This recovered the full cluster benefit (S033: 70.1s → 5.0s, S043: 144.2s → 5.7s — even
     faster than the flat-5000ms version, since the ordinary tier now fails in 1.5s instead of 5s
     before handing off) while bounding the tax. **Unexpected bonus, also verified empirically,
     not assumed**: sampling the "48 pays pure tax" set directly (38 of 48 checked) showed most
     of them are *also* solvable via the probe faster than their main-loop win (e.g. S002:
     2.6s → 147ms, S142: 14.6s → 1.0s, S029/S037/S040/S041: all faster) — the main loop only
     "won" in the old ordering because it ran first, not because it was actually faster. Only 7
     of the 48 sampled show the pure, bounded tax the design accepted as a tradeoff (1.5–6.8s
     each, all explained, none cascading).
3. **`scripts/stress/benchmark.mjs` / `scripts/run-ablation.mjs` diagnostics** — attempt records
   now carry `diverseBeam`/`repair`/`repairMustTurnBiased`/`gateKey` (previously indistinguishable
   from a plain attempt with the same profile/beam-width label, which cost real time during this
   investigation); `run-ablation.mjs` gained a `--corpus` flag so the ablation experiment
   catalogue (order/profile/template sweeps) can target the stress corpus, not just the published
   one — it could only reach `data/levels.json` before.

**Verified**: full stress corpus **150/150 solved, 0 failed, 0 errors**, total wall time
**404.0s, down from 773.7s (47.8% reduction)**. Full per-level diff against the pre-change
baseline (not just the aggregate count — see the methodological note above): 32 levels
meaningfully faster (>800ms), 7 levels pay the accepted bounded tax (1.5–6.8s, all on levels
matching `needsRepairFallback` that don't need it), 0 newly failed, 0 newly fixed (already
150/150). Published corpus **156/156, no bench regression** (`solver:bench -- --check`),
`npm run ci` green (729 vitest tests, hint-path-oracle 156/156, 9567/9567 stored hints valid).

## Snapshot — S043 fixed, full 150/150 corpus solved (2026-07-09, 20s budget)

**S043's remaining gap was two independent, stacked bugs, not one — root-caused with a fresh
diagnostic pass rather than continuing to tune the existing must-turn terms.**

1. **The must-turn exit-guidance term (added in the prior snapshot) was silently dead code
   under beam/repair's calling convention.** Its pending-cell check read `state.mustTurnMask`
   *after* the candidate move had already been applied (beam/repair score post-apply; only DFS
   scores pre-apply — see scoring.ts's long-standing comment on the split). If the candidate
   *is* the move that satisfies the cell's direction, `applyMove` (search-state.ts) has already
   cleared that bit by the time the guard runs, so the term always read "not pending" for
   exactly the move it existed to reward. This fully explains why the earlier fix helped S028
   (which solves via plain DFS) but never moved repair's search on S043 at all despite being
   "enabled for every profile." Fixed in `scoring.ts` by only trusting the pre-apply mask under
   the convention where it actually is pre-apply; the post-apply path now derives correctness
   structurally instead (see the code comment for the exact reasoning).
2. **S043's gate/goal parity and odd `reqLen` make a portal-less solution combinatorially
   impossible — a hard fact, not a heuristic, and nothing told the search.** Every regular
   (non-portal) move flips grid parity; a path of exactly `reqLen` such moves can only end on a
   cell whose parity is fixed by `gate parity ⊕ (reqLen mod 2)`. S043's gate and goal share the
   same parity while `reqLen` is odd, so that fixed endpoint parity never matches the goal —
   provably, for *any* portal-less path of exactly the required length. Only a portal whose two
   terminals have MISMATCHED parity (a "twist" portal) can inject the missing flip; S043 has
   exactly one (the other is same-parity and parity-neutral). Verified by hand and against the
   corpus's hidden witness (which does use the twist portal, exactly once). Added
   `prep.parityPortalDistMaps` (which twist portals exist) and a new `SCORE_PORTAL_PARITY_GUIDANCE`
   scoring term (`scoring.ts`) that rewards heading toward the nearer terminal of an unused twist
   portal only while the level's own parity relationship requires one — inactive (and free) on
   every level that doesn't need it, computed from `state.path[0]` so it's correct per-gate on
   multi-gate levels.
3. **Even with both of the above, repair still needed to actually *choose* the correct turn at
   the right moment — and any shared-scoring-weight nudge toward it broke other must-turn
   cluster members.** Raising `mustTurnExitGuidanceWeight` for the `repair` profile — even to
   its ordinary default of 1, not an aggressively tuned value — regressed **S030** from solved to
   a 120s timeout, a clean, reproducible A/B. Routing the decision through a second, independent
   RNG stream (`rand2`, never read from the primary `rand`) ruled out one failure mode (a first
   version consumed an extra `rand()` call whenever a candidate turn merely *existed* among
   survivors, shifting every later draw for the rest of that walk even when the nudge never
   fired) but not the whole problem — **S030 still regressed at every nonzero boost value tried,
   down to 0.05**, meaning repair's greedy ranking is load-bearing for that level's own
   convergence in a way no amount of "make the nudge gentler" fixes. **Resolved by scope, not
   more tuning**: the nudge (`EXIT_GUIDANCE_EPSILON_BOOST`, `repair-search.ts`) now only runs
   inside a brand-new, separate attempt (`attempts.ts`'s `repairMustTurnBiasedAttempt`,
   `AttemptConfig.repairMustTurnBiased`) that is appended only for must-turn levels and only
   ever executes *after* the ordinary (bias-free) repair attempt has already failed on every
   gate — purely additive by construction, identical to the repair fallback's own original
   safety argument. **S030/S035/S047 all solve via the untouched ordinary attempt at their exact
   prior timings** (confirmed via the full corpus run, not just the targeted four); only S043
   ever reaches the biased attempt, solving in ~4s once it does.

**Verified**: full stress corpus **150/150 solved, 0 failed, 0 errors, every solution
`refereeValid: true`** (`stress:benchmark`) — S030/S035/S043/S047 individually re-confirmed
against a from-scratch git-stash baseline to isolate exactly which change caused which effect,
not just the aggregate corpus count. Published corpus **156/156, no bench regression**
(`solver:bench -- --check`), `npm run ci` green (726 vitest tests, hint-path-oracle 156/156,
9567/9567 stored hints valid).

**Methodological note**: the first two root causes above were each independently sufficient to
explain part of S043's plateau, but neither alone was sufficient to solve it, and the process of
fixing item 3 produced two dead ends (the shared-weight regression, then the shared-RNG-stream
regression) before the working design — each ruled out with the same "reproducible A/B on the
specific already-solved level it broke" standard as the rest of this ledger, not by re-running
the full corpus and eyeballing the pass count. A full-corpus run alone would have reported
"149/150 → 150/150, but 3 new regressions" as a wash; it was the per-level isolation (git stash
to a clean baseline, then re-apply one change at a time) that told the two failures apart.

## Snapshot — after the must-turn exit-guidance fix and the must-turn-deadlock prune (2026-07-08, 20s budget)

With only S043 and S047 left, root-caused S043's plateau precisely: the must-turn distance
term (added earlier this session) pulls the path *toward* a pending must-turn cell but gives
no guidance once standing on it — any entry direction can satisfy either `cw` or `ccw`, it
depends solely on which exit is chosen (`turnDirection`'s cross product of entry/exit
vectors) — so the actual directional requirement was left to chance. Added a second, narrowly
-scoped scoring term (`mustTurnExitGuidanceWeight`) that rewards taking the specific exit that
satisfies the pending cell's direction requirement, only when a candidate move is a turn at a
pending must-turn cell. First implementation was a silent no-op for beam/repair (100% of
sampled calls computed `turnDir = null`): `scoreMove` is called under two different
conventions — `dfsFromGate` scores candidates *before* applying them (`state.path`'s tip is
still the current cell), but `beamSearchFromGate`/`repair-search.ts` score *after* tentatively
applying the candidate (the tip is already the candidate) — the fixed version detects which
convention is active per-call instead of assuming one. A tried malus for wrong-direction turns
measured worse, not better, on S043 and was dropped (reward-only).

Separately, proved a real coverage gap in the connectivity prune via the edge-axis-usage
bookkeeping: `isConnected` checks must-pass/must-cross reachability but never must-turn, yet
*any* turn taken at a pending must-turn cell — correct or wrong-direction — sets both of the
cell's axis-usage bits (entry axis + exit axis), and `isMoveDynamicallyValid`'s edge-axis-reuse
rule permanently blocks re-entering a cell once both bits are set. A wrong-direction turn is
therefore provably fatal to the constraint the instant it happens, but nothing pruned that
branch — the search kept exploring dead subtrees. Added `mustTurnDeadlocked` (O(1) per pending
must-turn cell, a single typed-array read, no BFS) to `lower-bounds.ts` and wired it into
DFS, beam, and repair's per-candidate pruning gauntlets. 4 new unit tests cover: untouched
cell (false), straight pass-through leaving one axis open (false), wrong-direction turn
(true), correct-direction turn (false, guarded by the mask already being cleared).

Both changes verified independently sound and regression-free (`solver:bench --check`
156/156, no timing change — repair/prune never engage on the published corpus; full solver
suite 139/139 including the 4 new tests). The full stress benchmark then produced a result
neither change was individually built for: **149/150 solved.** S047 — untouched by either fix,
still an "undiagnosed length-off-by-one plateau" per the prior snapshot — now solves via
`repair@dfs` in 1.6s of its own search time (`refereeValid: true`, confirmed from the
benchmark's stored attempt log), an apparent side effect of the deadlock prune's general
search-efficiency gain giving repair enough extra effective depth within the same budget to
also clear S047's separate plateau. **S043 is now the sole unsolved level in the entire
150-level corpus** — still timing out at the same node count ceiling (~16M nodes / 80s across
4 attempts) even with both fixes in place, meaning its remaining gap is not must-turn-shaped at
all; whatever blocks it is still unidentified.

## Snapshot — after the iterated-local-search repair fallback (2026-07-08, 20s budget + extended repair budget on the narrow feature gate)

The iterated-local-search repair fallback (`repair-search.ts`, see "Shipped" above) solved 5
of the 11 batch-B cluster levels (S031, S036, S042, S044, S048) — the first movement on this
cluster after three independent admissible-bound-tightening attempts each moved zero. A
follow-up pass found and fixed a real premature-convergence bug (splicing only ever restarted
from the single global-best near-miss, so the search structurally converged rather than
running out of time) via an elite pool of diverse near-misses plus stagnation-triggered
fresh-restart bursts, plus a bumped extra-budget fraction (1.0 → 3.0) after discovering
production runs measurably slower than isolated testing at the same nominal budget — **3
more levels solved (S030, S033, S039), 8 of 11 total.** Full stress corpus **145/150** (was
140/150 before any of this round's work). Published corpus stayed **156/156, no bench
regression**. A first version of the budget design (reserving a flat 25% of the total budget
up front for repair) regressed **S017** — a previously solid, budget-race-sensitive fix from
earlier this session — caught by a full-corpus re-run and fixed by extending the budget
instead of reallocating it (see "Shipped" above for the full root-cause writeup); S017 and
the flipper-fast cluster (S026/S027/S029/S034/S037/S040) are confirmed unaffected in the
final validated version.

A follow-up pass diagnosed the 3 remaining batch-B levels precisely: `PF_REPAIR_DEBUG=1`'s
mask breakdown showed S028 and S043 both plateau on the identical bit — a directional (`cw`)
must-turn requirement — while every other constraint was already exactly satisfied. Root
cause: `scoreMove` had no scoring guidance toward must-turn landmarks at all, the only
landmark type with none (surround and adjacent-turn both have dedicated urgency terms).
Fixed by adding one, mirroring must-pass's plain distance-to-cell shape. **S028 now solves in
~1–2s via plain DFS.** The new shared-scoring term initially regressed 3 already-working
repair solves (S030/S033/S039) via a whack-a-mole of weight-tuning attempts — resolved not by
more tuning but by scope: the term got its own `mustTurnUrgencyWeight` profile field, set to 0
specifically in `POLICY_PROFILES.repair` (repair's randomized exploration proved measurably
more sensitive to `scoreMove`'s balance than DFS/beam), restoring all 3 to their exact prior
timings while DFS/beam keep the fix at full strength. **9 of 11 batch-B levels now solve.**
Full stress corpus **146/150** (was 140/150 before this session's repair-search work began).
Published corpus stayed **156/156, no bench regression** throughout every step. 4 levels
remain unsolved: 2 batch-B levels — **S043** (needs axis-aware directional must-turn guidance,
not just distance; the must-cross 2nd-visit approach-map pattern hasn't been built for
must-turn yet) and **S047** (a distinct, undiagnosed length-off-by-one plateau, likely
portal-jump-parity related) — plus the two pre-existing, unrelated batch-D levels (S093/S099,
item 7).

## Snapshot — after extending repair to mechanism-free high-reqInt levels (2026-07-08, 20s budget)

Asked directly whether the (different-batch, seemingly unrelated) remaining failures might
share a fix. A feature comparison ruled out most of the surface hypothesis — S043/S047 (batch
B) and S093/S099 (batch D) have essentially nothing in common feature-wise, S093/S099 being
completely mechanism-free (`mustPass=0, mustCross=0`, no landmarks) — but it did surface a real
opportunity: S093/S099's documented symptom (beam can't find the structure at any width;
unbounded DFS needs ~2× the budget to converge) is the same *category* of problem the repair
fallback was built for, just outside its feature gate (which required `mustCross≥2 &&
mustPass≥3`). Tested directly and confirmed dramatically: `repairSearchFromGate` solved S093 in
215ms and S099 in 774ms, each independently verified `isSolutionState`-valid via a from-scratch
replay. Extended `needsRepairFallback` with `isHighInt(f) && reqInt ≥ POLICY.VERY_HIGH_REQINT`
— reusing the archetype's existing named difficulty threshold, not a value invented for these
two levels — and confirmed it's risk-free by the same construction as the original clause
(repair only ever runs after the whole existing bundle fails, so `solver:bench --check` stayed
at 156/156 in the identical ~23s: it never even engages on the published corpus). **Both S093
and S099 now solve**, and as a side effect the broadened gate also gave **S143** (this
session's previously-documented budget-edge-flaky level) a repair-search safety net for
unfavorable main-loop splits. Full stress corpus **148/150** (was 146/150). Published corpus
**156/156, no bench regression**, `npm run ci` green. **Only S043 and S047 remain unsolved in
the entire 150-level corpus** — two distinct, precisely-diagnosed, unrelated problems (S043:
needs axis-aware directional must-turn guidance; S047: an undiagnosed length-off-by-one
plateau), not a shared root cause after all.

## Snapshot — after the third solver fix (2026-07-08, 20s budget)

S118's 4 gates all pass the cheap admissible tests (goal-distance, parity), so none can be
excluded up front — the 4-way dilution across ~16 configs is genuine contention. Fix:
`runInterleavedAttempts` now runs one full flat-split round, then skews each gate's
remaining share by `(nodesExpanded share)²` (floored at 0.35×) — gates with real search
activity get more time, quiet gates keep a floor instead of an equal split. **S118 flipped
from a 20s timeout to a ~14s solve.** An initial version scoped to `gates ≥ 3` regressed a
3-gate level (S142, solved → timeout) — nodesExpanded turned out to be a noisy proxy at
that population size — so it's scoped to `gates ≥ 4` instead, where it was clean: the other
four 4-gate stress levels and S142 unaffected, published corpus (max 3 gates, so provably
untouched) stayed 156/156, full stress corpus **136/150** (was 135/150). 14 levels remain
unsolved — the batch-B flipper/must-cross interaction cluster (10 levels, item 6) and the
two mechanism-free batch-D topology levels (S093/S099, item 7).

## Snapshot — after the second solver fix (2026-07-08, 20s budget)

`HIGHINT_MC_DIVERSE`'s diverse beams were themselves being starved: they ran 3rd/4th in
the very-high-reqInt policy rule, behind two non-diverse `@5000` beams that never solve
this archetype but each burned a full budget share first. Moving the diverse beams first
(no change to the 0.35/0.25 floor fractions) fixed it: **S017 flipped from a 20s timeout to
a ~3s solve**. Verified: published corpus stayed **156/156 with no bench regression**
(`solver:bench -- --check`), full stress corpus **135/150** (was 134/150) with no other
level regressed, `npm run ci` green, and existing unit tests needed no changes (they assert
config presence, not order). 15 levels remain unsolved. A parallel investigation ruled out
the "flipper hard lower-bound" idea from the previous snapshot as unsound (see item 3) and
reconfirmed S093/S099 as a genuine ~2× budget gap rather than a dilution artifact (item 7).
Key remaining walls: the batch-B flipper/must-cross interaction cluster (10 levels, item 6),
the two mechanism-free batch-D topology levels (S093/S099, item 7), and the 4-gate
starvation level S118 (item 5).

## Snapshot — after the first solver fix (2026-07-08, 20s budget)

The corpus has already paid for itself: diagnosis of the batch-B failures produced the
`HIGHINT_MC_DIVERSE` attempt-policy rule (diverse WIDE beams, budget-floored, for
must-cross-threaded high-intersection levels — `modules/solver/attempts.ts`), verified
three ways: **S027 + S029 flipped from known-hard to solved** (and S045 got 2.6× faster)
in `stress:regression`, the published corpus stayed **156/156 with no bench regression**
(`solver:bench -- --check`), and unit tests pin the new rule. 16 levels remain unsolved
(S143 hovers at the budget edge and flips run-to-run — beam time-slicing variance, not a
policy effect). Key remaining walls: the rest of batch B (interaction), the two
mechanism-free batch-D topology levels (S093/S099), and the 4-gate starvation level S118.

## Snapshot — first benchmark run (2026-07-08, 20s budget)

- **133/150 solved, 17 unsolved, 0 errors** — against a solver that goes 156/156 on the
  published corpus at 30s. All 17 unsolved witnesses re-verified against the PLAY referee.
- **Batch B (structural-complexity) is the killer: 13/25 unsolved** (median = full budget).
  Two probes at 60s (3× budget) still failed — a hard wall, not budget sensitivity.
- Unsolved profile: long witness (avg reqLen 83) + high crossing burden (avg reqInt 7.1)
  + portals (16/17, usually with decoy pairs) + landmarks/flippers on large grids —
  i.e. mechanic *interaction*, not object count.
- Batch A's audit-fitted predictor ranks its own batch well (Spearman 0.76); it transfers
  poorly to B/E (≈0.22), confirming challenge ≠ what history alone predicts.
- Batches C (deceptive-simplicity) and F (wild) failed to hurt the solver (100% solve,
  low medians) — per the batch verdicts, those theories need rework, while B should be
  expanded.

Full details: `reports/batch-analysis.md`.

Notes for interpreting benchmarks:
- Runtimes are budget-relative and machine-sensitive (CI/sandbox CPU throttling can
  inflate them); compare within a run, not across machines.
- `refereeValid: false` on a solved level means the solver's returned path violates
  PLAY rules (it ignores geese/false goals by design — `MoveContext.SOLVER`); on
  hazard-padded levels that is a *finding about the solver*, not a benchmark bug.
