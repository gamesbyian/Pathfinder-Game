# A confirmed, population-scale regression from `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`

> **Status:** confirmed, causally isolated regression on at least 3 levels (`R02248`, `R02114`,
> `R00592`), with 195 further candidates from provenance mining not yet individually verified. The
> exact mechanism on `R02248` is now **fully pinned down** (see "The mechanism, fully traced" below):
> not a soundness bug in the flag itself, but a **beam-width-threshold timing artifact** — a
> legitimately-correct small reduction in candidate count at one specific depth pushes the pool to
> the wrong side of the fixed `beamWidth` cutoff, deferring the dedup/cull step by one generation and
> causing a much larger, more collision-prone collapse later that happens to eliminate the eventual
> winning lineage. This also explains why the effect isn't uniformly harmful (`R03248` goes the other
> way) — it's a generic sensitivity of the width-triggered dedup design, not a defect specific to this
> one flag.
> **NOT a production fix** — a fix attempt (unconditional dedup) was implemented, tested, and
> **reverted**: it doesn't recover `R02248`'s regression (a deeper, flag-independent dedup-heuristic
> issue at depth 12, not just threshold timing) and adds a real cost regression on the published
> corpus (+13.4% nodes, +47.5% wall time) for no solve benefit there. See "A fix attempt, tried and
> reverted" below. This report is scoped to establishing that the regression is real,
> population-relevant, and mechanistically understood — not to shipping a change.
> **Scope:** read-only investigation (bisection via `git worktree`, direct `runAttempt`/ablation
> calls, hint-provenance mining). No `modules/solver/*` code touched.
> **Motivation:** discovered as a side effect of `docs/variant-corpus-solver-research-plan.md`'s
> `R02248` sibling-boundary work — see that doc's "Sibling cold-solve" section, which originally
> (and now incorrectly) framed this as beam-scoring orientation bias.

## How this was found

`R02248`'s Priority-3 sibling comparison (all 7 rotated/reflected variants solve; canonical alone
fails) was first read as evidence of beam-scoring orientation bias — both winning beam configs
(`intersectionHarvest@beam5000`, `objectiveFirst@beam5000`) exhausted cleanly on canonical at only
~200K nodes. Checking `R02248`'s own hint-provenance file
(`data/stress/hints-random/R02248.json`) for historical context surfaced something inconsistent with
that theory: `beam:intersectionHarvest@beam5000` (the exact winning sibling config, non-diverse) had
**repeatedly, cheaply, and cold-solved R02248's own canonical orientation** — 11 separate provenance
entries, `hintGuided: false`, `usedExistingHints: false`, spanning commits from 2026-07-23 to
2026-07-31, all landing within 182,923–184,005 nodes (deterministic — no `randomSeed`, as expected
for beam search). That is not compatible with "this orientation is intrinsically hard for this
technique" — it was cheap and reliable for over a week, then stopped.

## Confirmed regression on `R02248`

Direct reproduction (`SOLVER_TESTING_API.runAttempt`, `profileName: 'intersectionHarvest'`,
`beamWidth: 5000`, `diverseBeam: false`, canonical `R02248`, current `main` @ `4efc2d1`):
**`exhausted` at 205,351 nodes, no solution** — matching the earlier full-ladder finding exactly
(same node count).

Level data is unchanged: `getLevelFingerprint(R02248)` at HEAD equals the fingerprint recorded in
the historical hint provenance (`v2:751ced95888f016239928ce8eafb8b1591021422b0e74889c714bed6ce6b3850`)
byte-for-byte. This rules out a data-drift explanation — the puzzle is identical.

**Git-bisected** (deepened the shallow clone with `git fetch --deepen=500` to reach the 2026-07-31
window, then `git worktree add` + `git bisect run` against a `runAttempt`-based probe script,
confirming solve/exhaust at each candidate commit): **first bad commit is
[`80a5706`](https://github.com/gamesbyian/Pathfinder-Game/commit/80a57068103d46a20beefc4a405f2f8cd012eb7e)
, "Treat both-axes-spent cells as walls in the connectivity flood fill" (2026-07-31 01:54:41 UTC)**
— the commit that introduced `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`, default ON.

**Causally confirmed at HEAD via direct ablation** (not just correlation from the bisect): disabling
only this one flag (`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false`, all else at production default)
restores the solve — **success at 184,005 nodes**, exactly matching the historical values, and the
emitted path is **independently referee-validated** (`Solver.validateCandidatePath` → `ok: true`).

## The mechanism is NOT a straightforward `isConnected` rejection of the winning path

The commit's own soundness gate (`scripts/stress/connectivity-soundness-check.mjs`) replays every
stored hint and asserts `isConnected` never returns `false` at any prefix of a known-valid solution
— its own validation claimed 50,121 paths / 3,677,639 states, zero rejections. That check is real
but has a coverage gap this report exploits: it only replays **already-stored** witnesses, not the
specific path a live, currently-regressed search would need to find.

Directly extending that same methodology to the *newly recovered* (flag-off) winning path — replaying
it step by step against `isConnected` **with the flag ON** (production default), both post-move
(`isConnected(path[s], stateAfterMove, ...)`) and pre-move (`isConnected(next, stateBeforeMove, ...)`,
exactly matching `prune-gauntlet.ts`'s real call site) — found **zero rejections anywhere along the
path**. The connectivity prune, taken in isolation against this exact witness, is sound: it never
incorrectly rejects a state on the path that does have a valid completion.

That means the regression runs through a **downstream** mechanism, not a direct false-reject.

## The mechanism, fully traced: a beam-width-threshold timing artifact

Instrumented `beamSearchFromGate` with `prep._beamResearchObserver` (an existing hook, already used
elsewhere in this codebase for exactly this kind of trace) to capture every stage of every beam phase
— `incoming-frontier`, `generated`, `hard-pruned` (with per-candidate rejection cause),
`dedup-removed` (with the competing scores), `score-width-culled`, `post-*` — for both flag-on and
flag-off runs of `R02248`'s `intersectionHarvest@beam5000` attempt, then diffed them phase by phase
against the recovered winning path.

**Step 1 — find where the winning lineage dies.** At depth 17, the winning path's own candidate
(score 594.5713, reaching cell `720903` with constraint-state key `1|0|0|0|7|0|0`) is present in
`generated` but absent from `post-production-dedup` — it was removed by **state deduplication**
(`useStateDedup` in `beamSearchFromGate`), which keeps only the highest-scoring candidate per
`(cell, constraint-state)` key. It lost to a competitor scoring 595.8524. In the flag-off run, the
same winning-path candidate is *never* removed at any stage, at any depth, through to the solve.

**Step 2 — is the competitor itself flag-dependent?** No: the exact competitor path (score 595.8524)
is *also* generated in the flag-off run — but there it isn't even dedup-*eligible*, because the
overall pool at that dedup key never collides with it (0 dedup-removed entries at that key in the
flag-off run, vs. **30** entries at that same key in the flag-on run, the highest of 147 distinct
colliding keys that phase). `scoreMove` never reads connectivity state, so the competitor's score is
identical in both runs — the difference is entirely in *how many other candidates pile onto the same
key*, not in any candidate's own score changing.

**Step 3 — why does the flag-on run have a 47x larger collision pool at this exact depth?**
Tracing `post-hard-prune` pool size at every depth from 1–18 in both runs:

| depth | ON incoming→postHardPrune→postDedup | OFF incoming→postHardPrune→postDedup |
|---:|---|---|
| 1–15 | identical in both runs (grows 1→3→7→18→45→112→257→596→1275/1321→2919/2936→**59**→108→240→528→1143→2473) | same |
| 16 | 2473 → **4948** → 4948 (*below* the 5000 beamWidth — dedup/cull is **skipped**) | 2473 → **5239** → 144 (*above* 5000 — dedup/cull **fires**, collapsing to 144) |
| 17 | 4948 → **10,801** → 169 (the deferred pool, now huge, finally collapses — hard) | 144 → 229 → 229 (no collapse needed) |

(Depths 8–9 already show the flag correctly rejecting a handful more candidates — 1275 vs 1321,
2919 vs 2936 — a small, legitimate effect. Depths 10–15 collapse to the *same* size, 59, in both
runs, coincidentally — the sets aren't necessarily identical, just equal-sized.)

This is the whole mechanism: `beamSearchFromGate`'s dedup+width-cull step only fires when
`cands.length > beamWidth` (5000). At depth 16, the flag's small, entirely legitimate reduction in
candidate count (a handful of correctly-rejected axis-exhausted revisits, compounding from earlier
depths) happens to land the flag-on pool at 4,948 — just **under** the 5,000 threshold — while the
flag-off pool lands at 5,239, just **over** it. That one-generation difference in *whether the cull
fires at all* is the entire story: the flag-off run collapses its pool promptly, at a modest size
(5,239 → 144), while the flag-on run defers the collapse a full generation, during which the
uncollapsed pool more than doubles (4,948 → 10,801) before finally being forced through a much larger,
far more collision-prone cull (→ 169). That larger collapse is where the winning lineage's specific
candidate meets, and loses to, a competitor it would never have had to compete against had the cull
landed a generation earlier, as in the flag-off run.

**This is not a soundness bug in `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`.** The flag's own direct effect
(rejecting a few axis-exhausted revisits) is small and correct. The regression is an **emergent
property of the beam search's fixed-threshold dedup/cull timing**: any small perturbation to
candidate counts — from this flag, or in principle from *any* other pruning/scoring change — can push
a depth's pool to the wrong side of the `beamWidth` cutoff, deferring a collapse and making it larger
and more collision-prone when it finally happens. This directly explains why the effect isn't uniform
across the corpus: `R03248` (Priority 0 above) is very likely the same phenomenon landing the
*opposite* way — a perturbation that pushes some depth's pool onto the side that collapses *earlier*
or *more favorably* for its own winning lineage. Population impact is fundamentally scattered by
construction, not because the flag interacts inconsistently with different level geometries, but
because whether a given level's real winning lineage happens to be a casualty of a deferred,
larger-than-necessary collapse is close to a coin flip once a threshold-crossing perturbation happens
at all. Most of the 195 mined candidates likely show no effect (16/20 in the tested sample) simply
because their pool sizes at the relevant depths don't happen to straddle the threshold.

## A fix attempt, tried and reverted: unconditional dedup is not a clean win

The natural fix implied by the mechanism above: decouple state deduplication from the width-based
cull, so dedup runs every generation (not just when `cands.length > beamWidth`) — removing
functionally-redundant candidates before they can compound into a later generation's pool size and
cause the threshold-crossing timing artifact in the first place. Implemented in
`beamSearchFromGate` (`modules/solver/search.ts`), tested, and **reverted** — kept here as a
recorded negative result, not shipped.

**It does not recover the regression.** Re-testing `R02248` with the fix applied (flag still ON):
the search now exhausts far more cheaply (**39,653 nodes, down from 205,351** — confirming dedup
was indeed doing less total wasted work) but still does **not** find a solution. Tracing it with the
same beam-frontier instrumentation shows why: with dedup now running every generation, the winning
lineage collides with a genuinely higher-scoring competitor at **depth 12** — much earlier than the
depth-17 threshold-crossing event — and **loses identically in both the flag-on and flag-off runs**
(scores 462.0591 vs. 462.3672, byte-identical in both arms). This is not a threshold artifact at
all: it's dedup's own greedy "keep only the highest scorer per `(cell, constraint-state)`" heuristic
making a locally-correct, globally-wrong call — discarding the lineage that actually reaches the
goal in favor of one that scores higher at that specific cell/state but does not.

That reframes the finding: **the old, threshold-gated dedup behavior was, for this specific level,
accidentally protective.** Under the original code, this depth-12 collision was simply never
evaluated in the 11 historically-successful runs and in the flag-off comparison throughout this
report — the candidate pool never happened to exceed `beamWidth` at that generation, so dedup was
skipped there entirely, and the winning lineage survived undisturbed past the one comparison that
would have killed it. That's not a designed protection — it's a lucky avoidance, contingent on pool
size at one specific depth, which is exactly the same kind of threshold-sensitivity this whole report
is about, just cutting in the *level's* favor this time instead of against it.

**The fix also has a real cost.** `npm run solver:bench -- --check` on the published corpus: **no
solved/failed regression** (160/160, matching baseline), but a genuine **cost regression** — **+13.4%
nodes, +47.5% wall time** for zero solve-count benefit there. Per this repo's own testing discipline,
a change is not verified by the solved-set check alone; this one fails the cost half outright, on top
of not achieving its intended purpose.

**Conclusion: reverted, not merged.** The width-threshold-timing mechanism traced above is confirmed
correct as an explanation of *why* the flag's small, legitimate pruning difference flips `R02248`'s
outcome — but "always dedup" is not the fix, because the deeper problem is dedup's greedy heuristic
itself sometimes discarding the true winner, which the old threshold-gating was accidentally (not
robustly) shielding this level from. A durable fix needs to address *that* — e.g. retaining more than
one candidate per collision when scores are close, or some other softening of the "keep only the
single best scorer" rule — not just when dedup runs. Not attempted here; this is now the concrete
next research question, not a solved problem.

## This is not isolated to `R02248` — population scale via provenance mining

Mined `data/stress/hints-random/*.json` (all 1700 corpus-2 levels) for `(level, technique, profile,
template, beamWidth, diverseBeam)` configs that were: cold (`hintGuided: false`,
`usedExistingHints: false`, no forcing), deterministic (`randomSeed: null` — excludes `repair`'s
stochastic search), found **≥3 times independently**, with **tight node-count agreement**
(spread ≤5% of median — ruling out noisy/lucky one-off finds), and whose **last recorded find
predates 2026-08-01** (the day after the bisected regression commit). **195 such configs found**,
across 973 distinct cold configs total in the corpus.

Restricting to the tier structurally comparable to `R02248` (median ≥50,000 nodes — the trivial
2–30-node tier is a different, earlier phenomenon: `beam=None` DFS-adjacent finds all dated
2026-07-16–22, a full week before the bisected regression window, and not tested here) leaves 20
candidates. Directly verified each with the same method as `R02248` (`runAttempt` with the flag on
vs. off, referee-validating any flag-off solve):

| level | config | historical (cold, ×N, median nodes) | flag ON | flag OFF | referee (OFF) |
|---|---|---:|---|---|---|
| `R02248` | `intersectionHarvest@5000` | 11× / 182,923 | exhausted (205,351) | **success (184,005)** | **valid** |
| `R02114` | `objectiveFirst@2000` | 11× / 205,174 | exhausted (204,086) | **success (204,993)** | **valid** |
| `R00592` | `objectiveFirst@2000` | 10× / 220,714 | exhausted (206,155) | **success (220,726)** | **valid** |
| `R03248` | `perimeterSweep@2000` | 11× / 170,965 | **success (163,903)** | exhausted (168,113) | — |
| (16 others) | various | — | exhausted or success in **both** arms | — | — |

**3/20 tested confirm the same regression shape** (fails ON, referee-valid solve OFF) — not a
one-off. **1/20 (`R03248`) goes the *other* direction** — the flag's default-ON state is what
succeeds there, and disabling it causes the *opposite* failure. The other 16 show no difference in
this single-attempt test (both exhaust, or both succeed) — meaning **whatever changed after
2026-07-31 that stopped these from being found again is not explained by this flag alone** for that
majority; either a different, unrelated change from the same period is responsible for those, or the
full production ladder (not tested here per-level) still finds them via a different technique/config
and their absence from recent provenance just reflects normal hint-discovery-run sampling variance
rather than an actual regression. **Not disambiguated here.**

## The population-level full-ladder A/B was inconclusive by construction, not by result

A matched A/B (`level-blind-capability-sweep.mjs`, `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` on vs. off,
112 badness-stratified hard Corpus-2 levels from `reports/stress/dev-benchmark-corpus2.json`, full
production ladder, 10M node budget, 2 workers) found **2/112 solved in both arms — no aggregate
difference.** This does not contradict the confirmed regressions above: the full ladder tries many
techniques per level (a single-config regression can be masked by a different technique still
solving), and 10M nodes is a fifth of the 50M budget `R02248` actually needed to expose its own
regression at full-ladder scale. **This instrument is too coarse for this question** — the
single-attempt-config comparison above is the decisive one. A real population-scale A/B would need
to isolate the exact attempt configs at risk (or at minimum use the full 50M production budget) —
not attempted here.

## What this does and does not establish

- **Does establish**: a real, causally-confirmed, referee-validated regression exists on at least 3
  Corpus-2 levels, traceable to a specific commit (`80a5706`); the exact mechanism on `R02248` is
  fully traced (beam-width-threshold timing artifact interacting with state dedup, not a soundness
  bug); and the mechanism generalizes to explain the scattered, non-uniform population signature
  (including `R03248`'s opposite-direction case) as the same phenomenon rather than a separate one.
- **Does not establish**: the true population-wide scale (only 20 of 195 mined candidates were
  individually tested, only in a single-attempt-config probe, not the full ladder); whether `R03248`'s
  own trace shows the identical threshold-crossing pattern in the opposite direction (plausible from
  the mechanism, not directly traced); or that disabling the flag is a net-positive fix (`R03248` is a
  direct counterexample, and the mechanism explains *why* a blanket disable can't be — it would just
  move the threshold-crossing lottery to different levels, not eliminate it).
- **Does not itself justify** any production change. Per this repo's promotion contract
  (`docs/solver-optimization-current-queue.md`), any actual fix needs a matched full-corpus A/B at
  equal node/work budget with lifecycle telemetry and explicit reporting of both gains and losses —
  and given the mechanism is a generic width-threshold fragility rather than a defect specific to one
  flag, the more valuable fix target may be the dedup/cull triggering condition itself (e.g. hysteresis
  around the width threshold, or triggering cull on total candidates generated rather than the
  post-hard-prune survivor count) rather than anything about `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`.

## Recommended next steps (not done here)

1. **Investigate a softer dedup retention policy** (e.g. keep the top 2–3 scorers per
   `(cell, constraint-state)` key instead of only 1, or widen retention specifically near a close
   score margin) — targets the *actual* problem the fix attempt surfaced (dedup's greedy heuristic
   discarding a true winner) rather than the threshold-timing symptom. Needs its own cost/solve
   tradeoff study — widening retention has an obvious cost (larger pools, more work per generation)
   that must be measured, not assumed acceptable.
2. **Verify `R03248` shows the threshold-crossing signature** (in the opposite direction) using the
   identical instrumentation, and check whether its own depth-of-divergence is a genuine flag-vs-flag
   score difference (like `R02248`'s depth-12 finding) or an actual threshold-timing effect — the two
   are not the same question, and this report only fully traced one of the two directions.
3. **Verify the remaining 175 unverified provenance-mining candidates** (the 2–30-node trivial tier
   plus the >50,000-node tier beyond the 20 already tested) — establishes the real population scale.
4. **A full-corpus matched A/B at the flag's actual production node budget (50M)**, not 10M, once (1)
   gives a concrete, cost-validated candidate fix to test — not before, given the first fix attempt's
   cost regression on the published corpus.

## Evidence artifacts (not committed — scratchpad only, regenerable)

- `stale-cold-solve-candidates.json`: all 195 mined candidates.
- `stale-candidates-verified.json`: the 20-candidate verification run's full per-level detail.
- `trace-r02248-beam.mjs` / `trace-competitor.mjs` / `trace-scores2.mjs` / `trace-pool-growth.mjs`:
  the beam-frontier instrumentation scripts used to trace the mechanism above (`prep._beamResearchObserver`
  driving stage-by-stage diffing of flag-on vs. flag-off runs).
- Mining/tracing script logic is described in full above; not committed as scripts since this was a
  one-shot investigation, not a reusable tool — a future session picking up the next steps above
  should decide whether to promote any of them to `scripts/stress/` first (the pool-growth tracer in
  particular is directly reusable for verifying `R03248` and any of the remaining 175 candidates).
