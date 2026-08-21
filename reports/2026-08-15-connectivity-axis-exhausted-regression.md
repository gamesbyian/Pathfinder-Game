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
> **First fix attempt (unconditional dedup) was implemented, tested, and reverted** — see "A fix
> attempt, tried and reverted" below.
> **Second fix attempt (near-tie dedup retention) was implemented and SHIPPED, then CORRECTED by a
> full-corpus GHA A/B at the real 50M production node budget** (not just a 112-level sample) — see
> "Second fix attempt: near-tie dedup retention" and "The full-corpus GHA A/B: a net -7, not a narrow
> fix" below. The 112-level sample's "zero regressions" was an artifact of that sample being
> badness-stratified toward hard levels; the real population effect is **net -7 on Corpus 2
> (731 → 724): 27 gained (`R02248` among them) / 34 lost**, every single flip in either direction
> sharing the same signature (a level that used to solve cheaply via `beam:intersectionHarvest@
> beam5000`/`beam:objectiveFirst@beam5000` now exhausts the full 50M budget, or vice versa). Kept
> default-ON anyway (reverting would give back the 27 gains for no improvement on the loss side
> either) — see "A recovery mechanism: STRATEGY_DEDUP_NEAR_TIE_RETRY" below for the last-resort
> retry pass built to recover the 34 losses without touching the 27 gains.
> **CORRECTION (2026-08-15, same day, population-scale GHA validation): the retry pass's FIRST shipped
> design worked exactly as intended on its target (33/34 recovered, 0/27 gains broken) but was NOT a
> net win** — it cost 65 previously-unrelated Corpus-2 levels via an unconditional node-reserve tax on
> the whole corpus, netting **707/1700 (down from 724)**. **Two follow-up fixes the same day — an
> additive (not subtractive) reserve, then reordering the tier to run dead last after the
> admissible-order tier — fully resolved this**, confirmed by a second full-corpus GHA run: **764/1700,
> +40 vs. the 724 baseline, with ZERO levels lost relative to baseline** (33/34 target losses
> recovered, all 27 gains intact, +7 bonus solves, 0 collateral damage). See "Population-scale
> confirmation: net +40, zero regressions" below.
> **PROMOTED to production default-ON (2026-08-15, same day)** — see "Promoted to default-ON" below
> for the promotion commit, the ripple-effect fix to 11 pre-existing tests whose exact node-budget
> arithmetic assumed no other default-on last-resort tier fires without explicit opt-in, and the full
> verification (`tsc`, 381/381 solver unit tests, `npm run check`, `npm run test:node`,
> `npm run test:coverage`, and `solver:bench --check` — 160/160 published levels, no regressions,
> +0.3% nodes).
> **The same "run dead last, additive budget" pattern was then applied to a SECOND double-edged
> mechanism, `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`** (2026-08-15/16, same investigation) —
> built, locally validated (recovering `R03148`, confirmed zero effect on `R02644`), population-
> validated (**809/1700, +45 vs. the 764 baseline, ZERO levels lost**, on the FIRST population attempt
> — no revision cycle needed), and **PROMOTED to production default-ON**. See "Applying the pattern
> elsewhere" and "Promoted to default-ON (STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY)" below.
> **Applied a THIRD time (2026-08-16) directly to `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` itself — the
> root flag this whole investigation started from** — as `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`,
> targeting `R02114`/`R00592` (the two originally-confirmed regressions `STRATEGY_DEDUP_NEAR_TIE_
> RETRY` doesn't reach). Locally validated (both recovered referee-valid; `R03248`/`R02248` confirmed
> unaffected) after finding and fixing a NEW variant of the same starvation bug class — this tier's
> ceiling, as a third stacked retry tier, needs to build on the PRECEDING tier's own ceiling, not
> restart from `nodeBudget`, or two tiers at the same fraction land on the identical absolute ceiling
> and the later one gets zero real headroom. **Population-validated (2026-08-16, run 31918095910) and
> PROMOTED to production default-ON**: corpus1 95/95 — identical solved-ID set, zero change; corpus2
> 809 → 819, **+10 solves, ZERO regressions** (`R02114`/`R00592` both recovered as predicted, plus 8
> more; `R03248` confirmed unaffected). Unlike the two prior tiers this one showed a real, larger cost
> increase — corpus1 nodes +18.7%/work +12.2%, corpus2 nodes +28.2%/work +22.1% — reflecting that
> `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` gates a much hotter code path than either prior tier's own
> target; promoted anyway since the ladder's bar is solved-count gain plus zero regressions, not cost
> neutrality. See "A third application" and "Population-scale confirmation and promotion
> (`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`)" below.
> **Scope:** `modules/solver/search.ts` (`beamSearchFromGate`'s state-dedup block +
> `STRATEGY_DEDUP_NEAR_TIE_RETENTION` gating), `modules/solver/orchestration.ts` (the new
> `STRATEGY_DEDUP_NEAR_TIE_RETRY` last-resort tier), `scripts/ablation-config.mjs` (both new flags),
> `.github/workflows/solver-stress-refresh.yml` + `README-solver-stress-refresh.md` (push-race fix +
> always-persisted per-run analysis summary — see "Infrastructure fixes surfaced by this
> investigation" below), and `scripts/solver-bench.mjs` (baseline-staleness warning).
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

## A costly detour: a stale regression baseline

Before landing on the working fix below, the first attempt to *measure* any dedup change's cost
produced a wall of misleading numbers: every variant tried — unconditional dedup, top-2/top-3
retention at various margins, even a version whose retention logic was proven (by direct code
inspection) to be a complete no-op at its disabled setting — reported the *same* suspicious
published-corpus cost regression, +30% to +50% wall time, -8% nodes, regardless of what the code
actually did. That inconsistency (a genuine no-op showing a "cost") was the tell. `git stash`-ing
every local change and re-running `solver:bench --check` against bare `HEAD` reproduced the *exact
same* anomalous numbers — proving the cost had nothing to do with this investigation's code at all.

Root cause: `logs/solver-baseline.json` was **16 days and 537 commits stale** (generated
2026-07-30, its recorded commit not even resolving without deepening the shallow clone first) —
comparisons against it were silently attributing two weeks of unrelated, legitimate solver evolution
(including the very `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` commit this whole report is about) to
whatever change happened to be under test that day. Once the baseline was refreshed against a clean
tree, the true cost of the dedup fix below dropped to a mundane +0.3% nodes / +1.8% wall time.

Fixed at the tooling level, separately from this report's own solver change: `scripts/solver-bench.mjs`
now prints a loud `[!!] STALE BASELINE` warning in `--check`'s output whenever the baseline is more
than 3 days old, more than 20 commits behind `HEAD`, or its recorded commit doesn't resolve locally at
all — naming the refresh command directly — plus promotes `deadlineTruncated` (proof a run was
wall-clock-bound, not purely work-budget-shaped) from an easy-to-miss per-level line to an unmissable
end-of-run summary. Committed separately (`bfadbcae`) with the baseline refreshed alongside it. See
that commit for the full detail; not repeated here since it's tooling, not solver behavior.

## Second fix attempt: near-tie dedup retention — validated and shipped

The first fix attempt (above) correctly diagnosed that `R02248`'s true blocker is dedup's own
"keep only the single best scorer per collision key" heuristic discarding a genuinely-winning
lineage after a close call — but "always dedup, keep only the best" (still top-1) doesn't touch that
at all, and "keep top-K unconditionally" (K=2 or 3) is expensive and non-monotonic (K=2 fixed
`R02248`; K=3, tested next, *broke* it again — a red flag for any "durable" claim on its own).

**Design**: keep dedup's existing single-winner behavior untouched for the overwhelming majority of
collisions (a clear-cut winner), and *only* retain a **runner-up** when it scores within a small
relative margin of the winner (`DEDUP_NEAR_TIE_MARGIN`, shipped at `0.01` — 1% of the winner's
score) — hedging specifically the case dedup's own heuristic is actually uncertain, not touching the
cases it's confident about. Implemented as a second, separate `Map<string, BeamNode>` (`dm2`) that
only ever holds a key's current runner-up, populated lazily — **never** a `Map<string, BeamNode |
BeamNode[]>` union type, which an earlier version of this same idea used and which alone (even with
retention *disabled*, i.e. a should-be-total-no-op setting) reproduced a ~30% per-run cost regression
purely from V8 losing the primary dedup map's monomorphic shape. Keeping the two maps separate, and
only ever allocating the second one at all when the feature is configured on, avoids that entirely —
confirmed by the margin-0 "disabled" setting coming out **exactly** node-for-node identical to
unmodified `HEAD` (51,789,137 nodes both ways) once measured against the correct baseline.

**Validation**:
- **Recovers `R02248`**: `success` at 250,617 nodes (was `exhausted` at 205,351), emitted path
  independently referee-validated (`ok: true`).
- **Published corpus** (`solver:bench --check`, correct fresh baseline): **160/160, no solved/failed
  change**; cost **+0.3% nodes, +1.8% wall time** — genuinely small, not the +30-50% the stale
  baseline had suggested.
- **20-candidate mined-regression sample** (same population as the earlier verification): exactly
  **one** outcome changes across all 20 — `R02248` flips `exhausted` → `success`. The other 19,
  including `R03248` (the confirmed opposite-direction case), are byte-identical to their pre-fix
  outcome. No new failures introduced anywhere in the sample.
- **112-level Corpus-2 full-ladder population sample** (badness-stratified hard levels,
  `level-blind-capability-sweep.mjs`, 10M node budget): identical solved set (2/112 both arms —
  this sample doesn't happen to include `R02248` itself) and negligible cost delta (+0.0001% nodes).
  This is a "no harm at full-ladder scale" check, not a "recovers more solves" one — that's already
  covered by the 20-candidate direct test above.
- `npx vitest run modules/solver`: 373/373 passing. `npm run test:node`: exit 0, all suites passing.

**Does not fix `R02114` or `R00592`** — both still `exhausted`, unchanged from baseline, at every
margin tested. Their own blocking collision is evidently a different depth/shape that a single
runner-up slot per key doesn't reach. This is a genuine, validated, low-risk **partial** fix for one
confirmed instance of the regression class, not a complete resolution — the other two confirmed
cases and the ~175 unverified provenance-mining candidates remain open.

> **CORRECTION (2026-08-15, same day): the validation above was NOT a population-scale check, and a
> real full-corpus GHA A/B overturned its headline "zero regressions" conclusion.** The 112-level
> sample's "identical solved set" held only because that sample is badness-stratified toward HARD
> levels (`dev-benchmark-corpus2.json`'s own construction) — every level this margin actually flips
> turns out to be an easy/medium one (control-arm cost 261K–35M of the 50M ceiling, nowhere near
> `node-budget-reached` on its own). See "The full-corpus GHA A/B: a net -7, not a narrow fix" below
> for the real population effect (net -7, 34 lost / 27 gained) and "A recovery mechanism:
> STRATEGY_DEDUP_NEAR_TIE_RETRY" for what was built in response. The fix is still shipped
> (`DEDUP_NEAR_TIE_MARGIN = 0.01`, default-on) — reverting would forfeit the 27 gains for no
> improvement on the loss side either — but "validated" above should be read as "validated against
> the wrong instrument," not as a closed question.

## The full-corpus GHA A/B: a net -7, not a narrow fix

Two infrastructure gaps (see "Infrastructure fixes surfaced by this investigation" below) initially
blocked this from being measured at all: `solver-stress-refresh.yml`'s persist step silently failed
whenever another commit landed on `main` mid-run, and even when it succeeded, `deterministic=true` +
`persist_hints=false` (the documented matched-A/B setting) meant no per-level result ever reached a
form fetchable outside the run's own uploaded Actions artifact — which this session's sandbox could
not download (Azure blob storage, 403). Once both were fixed, two full 1700-level Corpus-2 runs (same
commit modulo the fix itself, `deterministic=true`, `persist_hints=true`, 50M node budget, 2 workers)
gave a clean, directly comparable pair:

| | run #41 baseline (no fix, `8865365`) | with-fix (`1fcccd47`/`7d2b0f7a`) | delta |
|---|---:|---:|---:|
| Corpus 2 | 731/1700 | 724/1700 | **-7** |
| Corpus 1 | 94/102 | 95/102 | **+1** |

Both with-fix runs (one before, one after the infrastructure fix — zero solver-code difference
between them) agree **exactly**: 724/1700, 95/102, identical `nodesExpanded`/`workSpent` totals to
the last digit. This rules out run-to-run noise as the explanation for the delta.

Diffing the two runs' `solvedIds` (via the newly-persisted `reports/stress/capability-runs/<run_id>/
per-level-corpus2.json`) gives the exact flip set: **34 lost, 27 gained**. Every single flip, in
either direction, shares the identical signature: the level's winning technique is `beam:
intersectionHarvest@beam5000` or `beam:objectiveFirst@beam5000` (frequently `(diverse)`), and it
either solves cheaply (4–35M nodes, well under the 50M ceiling) in one arm while hitting
`node-budget-reached` at ~50,000,0xx in the other, or vice versa. This is the *same* beam-width-
threshold-timing mechanism traced for `R02248` specifically above, but firing across a much wider
population than "R02248-shaped regressions" — any level whose winning config is in that technique
family is at risk, in either direction, essentially as a coin-flip. `R02248` itself is in the
27-gained set.

Cost distribution of the 34 losses' own control-arm (no-fix) node counts: min 261,132, p25 4,487,950,
p50 6,482,497, p75 7,096,719, p90 8,194,518, max 34,800,048 (one outlier, `R02110`, a
`perimeterSweep@beam2000` winner — not this population's dominant shape).

## A recovery mechanism: `STRATEGY_DEDUP_NEAR_TIE_RETRY`

Rather than revert (forfeiting the 27 gains) or leave the net -7 unaddressed, the fix follows this
repo's own established playbook for exactly this shape of problem — the 2026-07-16 attraction-
diversity last-resort pass (`SCORE_GOAL_ATTRACTION`, see `docs/solver-architecture.md`): keep the
default-on behavior for the main ladder (so the 27 gains keep solving normally), and add a bounded,
opt-out **last-resort retry pass** that reruns the same `mainConfigs` ladder once more, with
retention disabled, only after the main loop and repair fallback have already failed. Since every one
of the 27 gains solves via the main loop (never reaching this tier) and every one of the 34 losses
solves cheaply without retention, this should recover the losses without touching the gains.

**Implementation** (`modules/solver/search.ts`, `modules/solver/orchestration.ts`,
`scripts/ablation-config.mjs`):
- `STRATEGY_DEDUP_NEAR_TIE_RETENTION` (production default-ON): gates `search.ts`'s `dm2` retention
  logic behind the standard `(!cfg || cfg.FLAG)` convention, so a caller can toggle it per-solve —
  previously a bare, unconditional module constant.
- `STRATEGY_DEDUP_NEAR_TIE_RETRY` (opt-in, default OFF — new/unvalidated, matching every other
  first-cut mechanism's convention in this codebase): the last-resort tier itself, in
  `orchestration.ts`'s `solveLevel()`, structurally identical to the attraction-diversity pass's own
  Proxy-override rerun, just toggling a different flag.
- `DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION = 1.0` and `DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION =
  0.25` (sized from the 34-loss population's own p90/max, matching `ADMISSIBLE_ORDER_NODE_RESERVE_
  FRACTION`'s own starting fraction) — a node reserve withheld up front from every earlier tier,
  sibling to (not nested inside) the admissible-order tier's own reserve.
- Wired into `disableExtraBudgetPasses` (the "suppress every extra-budget pass" convenience) and
  given its own `dedupNearTieRetryBudgetFractionOverride`/`dedupNearTieRetryNodeReserveFractionOverride`
  `SolveOpts` fields, matching every sibling last-resort tier's own escape-hatch shape.
- Six new orchestration.test.ts unit tests (inertness under cfg=null/explicit-false/sparse-ablation,
  `disableExtraBudgetPasses` suppression + override precedence, a mocked-dispatch rescue test) — all
  passing, plus the full existing 379-test solver suite unaffected.

**Two real bugs found and fixed before any GHA spend**, both by testing against an actual level
locally rather than trusting the design on paper:

1. **A floor-at-call-site reserve is a no-op when earlier tiers already spend the entire budget.**
   The first implementation deliberately avoided touching the intricate nested
   `mainLoopNodeBudget`/`repairFallbackNodeCeiling`/`earlyTierNodeBudget`/
   `admissibleOrderDefaultProfileCeiling` reserve chain (which has already shipped two documented
   regressions from exactly that kind of edit — see `REPAIR_FALLBACK_NODE_RESERVE_FRACTION`'s own
   "REVISION 1"/"REVISION 2" history) by computing the retry tier's ceiling as a **floor** at its own
   call site: `max(earlyTierNodeBudget's remainder, nodeBudget * fraction)`, capped by
   `nodeBudget - nodesExpanded`. This is a no-op precisely when an earlier tier has already spent the
   *entire* `nodeBudget` — which is exactly what every one of the 34 target levels does under the
   shipped default (`node-budget-reached` at ~50,000,0xx). Caught directly: `R00180` reproduced its
   exact GHA node count (50,000,148) locally, then the retry pass received 0 nodes and could not run.
   Fixed by reverting to the withheld-up-front design after all — `dedupRetryNodeReserve` is now
   computed early (alongside `admissibleOrderNodeReserve`) and subtracted from `earlyTierNodeBudget`
   directly, protecting the tier from every earlier one by construction, the same way
   `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` protects its own tier. There is no way to protect a tier
   from tiers that ran *before* it without shrinking what those earlier tiers could see.
2. **The node reserve alone was not sufficient — a separate work-budget starvation.** With the node
   reserve fixed, `R00180` still failed, now spending nodes 25M→50M during the retry pass without
   solving. Debug instrumentation traced this to `runGateSerialAttempts`'s WORK-based
   `attemptBudgetShare` split: the retry pass shared the solve's single `(workBudget, workStart)`
   pair with every earlier tier, and by the time it ran, ~66% of that pool (44.1M of 67M) was already
   spent — R00180's actual winning config (`objectiveFirst@beam5000(diverse)`) got only 3.7M work
   units in the retry pass vs. 10.9M when the ordinary main loop tries the identical config with a
   full pool, and a beam-search node costs meaningfully more than 1 work unit (`CONNECTIVITY_WORK_
   UNITS = 12` per `isConnected` call alone). Fixed by giving the retry pass a genuinely FRESH,
   ADDITIVE work allocation — a new `workMeter.units` mark plus a work budget derived from this
   tier's own ms allocation via `DEFAULT_WORK_PER_MS` (the same conversion `solveLevel`'s own
   top-level `workBudget` uses when a caller omits it) — rather than sharing the already-depleted
   pool. Same "extend, don't carve from the existing pool" philosophy `REPAIR_EXTRA_BUDGET_FRACTION`
   already documents for wall time, applied here to work.

**Local validation** (real `solveLevel()` through the full production ladder, `nodeBudget=50,000,000`,
non-binding wall clock, referee-validated via `Solver.validateCandidatePath`):

| level | control-arm cost | with retry pass |
|---|---:|---|
| `R00180` | 5,148,930 nodes | **solved**, 26,148,946 nodes total, referee-valid |
| `R00901` | 4,329,619 nodes | **solved**, 25,329,695 nodes total, referee-valid |
| `R02110` (34.8M outlier) | 34,800,048 nodes | still fails — `node-budget-reached`, exactly as predicted (12.5M reserve < 34.8M need) |

2 of 3 spot-checked losses recovered exactly as the reserve's own sizing predicted; the one known
outlier fails exactly as predicted too (the reserve was explicitly sized to cover p90, not the max).
**Not yet validated at population scale** — this 3-level local sample is evidence the mechanism
works as designed, not a population-level recovery count. The natural next step is a full-corpus GHA
run with `enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY` against the same `724/1700` baseline, now that
the infrastructure exists to actually analyze the result.

## The retry pass at population scale: a net -17, not a recovery

Dispatched `solver-stress-refresh.yml` on `main` @ `a7aa4ba4` (the merged retry-pass commit) with
`enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY`, `deterministic=true`, `persist_hints=true` — run
`31895631847`, completed and persisted cleanly (commit `ace78434`, confirming the push-race fix holds
even with a same-window `chore(audit)` commit landing first). Result: **Corpus 2 707/1700, Corpus 1
93/102** — down from the `724/1700`/`95/102` with-fix-no-retry baseline, and below even the original
`731/1700`/`94/102` no-fix baseline. Diffing `solvedIds` against both prior runs' committed
`per-level-corpus2.json`:

| category | count | detail |
|---|---:|---|
| of the 34 original losses: recovered | **33** | works exactly as designed |
| of the 34 original losses: still lost | 1 | `R02110` — fails exactly as its own reserve sizing predicted (needs 34.8M, reserve covers 12.5M) |
| of the 27 original gains: broken | **0** | fully intact, as guaranteed by construction (gains solve via the main loop, never reach this tier) |
| genuinely new solves (not in either prior run) | +15 | bonus, unexplained — plausibly the retry ladder's rerun getting lucky on an unrelated near-miss |
| **previously-stable levels now lost** | **65** | solved in *both* the no-fix and with-fix runs — i.e. completely unconnected to near-tie dedup — now fail |

Net: `+33 +15 -65 = -17` against the `724` baseline (`707` measured, matches exactly). The 65
collateral losses all terminate at `node-budget-reached` (~50,000,0xx nodes, spanning both DFS- and
beam-heavy `failedStrategies` lists), the same signature as the original 34 — consistent with a single
root cause: **`dedupRetryNodeReserve` is withheld from `earlyTierNodeBudget` for every Corpus-2 level
the instant the ablation flag is globally on** (`dedupRetryTierWillRun` reads only the flag, not
anything about the specific level or its main-loop attempt), so all 1700 levels' main-loop ceiling
shrinks by 25%, not just the 34 that actually need the rescue. Any level whose real winning solve
needed more than ~75% of the full 50M budget in the main loop now gets cut off before finding it, and
the retry pass — which reruns the *same* config ladder with retention merely disabled — evidently does
not rediscover most of those 65 solutions (it is not designed to; it targets a specific failure
signature, not "ran out of nodes for any reason").

**This mechanism, as currently sized, should not ship default-on** — it remains opt-in/default-OFF
exactly as it shipped, so this finding changes no production behavior, but it does mean the "recovery
mechanism" is not yet a usable fix for the original -7. The reserve design needs to change from
"unconditional tax on every level" to something that only costs nodes on levels that plausibly need
the retry tier — this is a real design decision, not a fraction-tuning knob, and is called out as an
open decision point rather than acted on unilaterally (see "Recommended next steps" below).

## Two more fixes: additive reserve, then reorder to run last

Redesigned in two steps, both committed to `modules/solver/orchestration.ts`, each independently
type-checked and full-suite-tested (`tsc --noEmit`, 379/379 solver unit tests) before any GHA spend:

1. **REVISION 2 — make the reserve additive, not subtractive.** `nodeBudget` is only ever finite on
   offline batch/validation paths — every production caller (Play/Editor/Review/hint-discovery) uses
   `Infinity`, where this reserve was already forced to 0 regardless of design. So instead of
   withholding `dedupRetryNodeReserve` from `earlyTierNodeBudget` (shrinking every level's main-loop
   ceiling by 25% the instant the flag is on — the actual root cause above), `earlyTierNodeBudget` no
   longer references this reserve at all, and the retry tier alone gets an EXTENDED ceiling,
   `dedupRetryNodeCeiling = nodeBudget + dedupRetryNodeReserve` — genuine additive room past the
   unshrunk budget every earlier tier still sees, mirroring the "extend, don't carve from the existing
   pool" philosophy already used for this same tier's WORK budget.
2. **REVISION 3 — move the tier to run dead last.** REVISION 2 alone was tested locally against 3 of
   the 65 collateral-loss levels (`R00050`/`R00059`/`R00238`, all solved via `ida:default` — the
   admissible-order tier — in the with-fix baseline, needing 37.6M–48.4M of the 50M ceiling) and all
   three *still failed*. Cause: the retry tier ran BEFORE the admissible-order tier, and its own
   extended ceiling let it burn `prep._metrics.nodesExpanded` well past the original `nodeBudget` on
   every level that doesn't need it (~1666 of 1700) — the admissible-order tier's own entry guard
   checks `nodesExpanded` against plain, unextended `nodeBudget`, so by the time its turn came the
   guard was already tripped and it never ran at all. Extending one tier's ceiling doesn't help when a
   *later* tier's own guard still checks the unextended budget — both draw from the same cumulative
   counter. Fixed by moving this tier to run after repair-probe-shrink-recovery AND the admissible-
   order tier, so no earlier tier's own ceiling references it at all, and its extension only ever
   spends room past every other tier's full-strength attempt.

**Local re-validation after REVISION 3** (same 6-level sample, real `solveLevel()`, `nodeBudget=
50,000,000`, referee-validated):

| level | result | detail |
|---|---|---|
| `R00180` | **solved**, referee-valid | via retry pass, 51.1M nodes total |
| `R00901` | **solved**, referee-valid | via retry pass, 50.3M nodes total |
| `R02110` | still fails | `node-budget-reached` at 62.5M — exactly as predicted (needs 34.8M, reserve gives 12.5M) |
| `R00050` | **solved**, referee-valid | via `ida:default` (retry never fires) — **47,495,401 nodes, bit-identical to the with-fix baseline** |
| `R00059` | **solved**, referee-valid | via `ida:default` (retry never fires) — **48,423,724 nodes, bit-identical to the with-fix baseline** |
| `R00238` | **solved**, referee-valid | via `ida:default` (retry never fires) — **37,634,713 nodes, bit-identical to the with-fix baseline** |

The 3 collateral levels are now solved at node counts identical to the original with-fix-no-retry
baseline, confirming the admissible-order tier is completely unaffected by this tier's existence — the
starvation is gone. Target recovery is unchanged (2 of the 3 spot-checked target levels recover,
`R02110` fails exactly as its reserve sizing predicts).

## Population-scale confirmation: net +40, zero regressions

Dispatched `solver-stress-refresh.yml` on `main` @ `c79180ef` (the merged REVISION 2 + REVISION 3
fix) with the same `enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY`, `deterministic=true`,
`persist_hints=true` as the broken first attempt — run `31902837955`, completed and persisted cleanly
(commit `afbf87a2`). Result: **Corpus 2 764/1700, Corpus 1 95/102** (Corpus 1 exactly matches the
with-fix baseline's 95). Diffing `solvedIds` against the `724/1700` with-fix-no-retry baseline:

| category | count | detail |
|---|---:|---|
| of the 34 original losses: recovered | **33** | same as the broken first attempt — unaffected by either fix |
| of the 34 original losses: still lost | 1 | `R02110`, exactly as its reserve sizing predicts |
| of the 27 original gains: broken | **0** | fully intact |
| genuinely new bonus solves | +7 | down from the broken attempt's +15 — plausibly some of those 15 were themselves collateral-damage artifacts of the old ordering, not real bonus finds |
| **previously-stable levels now lost** | **0** | zero collateral damage, down from 65 in the broken first attempt |

Net: `+33 +7 -0 = +40` against the `724` baseline (`764` measured, matches exactly) — and critically,
**zero levels lost relative to baseline at all** (`lost_vs_withfix` is the empty set). This is a clean
population-scale confirmation that both fixes (additive reserve; reorder to run after the
admissible-order tier) together eliminate the collateral damage while fully preserving the target
recovery. `STRATEGY_DEDUP_NEAR_TIE_RETRY` is now a genuinely usable recovery mechanism for the
`DEDUP_NEAR_TIE_MARGIN` regression.

## Promoted to default-ON

Promoted the same day, on the strength of the population result above: a strict superset of the
with-fix baseline's solved set (zero levels lost, not merely a positive net count) is about as clean
as a promotion case gets. Changed `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s run-condition from the opt-in
`cfg && cfg.FLAG === true` convention to the standard default-on `!cfg || cfg.FLAG` convention (same
as `admissibleOrderTierWillRun`), and removed it from `scripts/ablation-config.mjs`'s
`OPT_IN_FEATURES`. Both interactive solve UIs (`solver-controller.ts`, `review-controller.ts`) are
unaffected — they already set `disableExtraBudgetPasses: true`, which zeroes this tier's budget
fraction regardless of the ablation flag's default, exactly as it already does for the
attraction-diversity and admissible-order tiers. The practical effect of promotion is scoped to
callers that solve *without* that flag (offline batch tooling, hint-discovery) — the same population
this session's own validation A/Bs actually exercised.

**Ripple effect on 11 pre-existing tests.** Promoting a default-on last-resort tier means it now runs
in every `orchestration.test.ts` test that sets a finite `nodeBudget` and doesn't explicitly suppress
it — the same maintenance burden this file's own tests already document for the admissible-order
tier's introduction (`admissibleOrderBudgetFractionOverride: 0` sprinkled through the older
attraction-diversity tests). 11 tests with exact node-count arithmetic broke (the promoted tier now
spends additional nodes past what their totals expected); fixed by adding
`dedupNearTieRetryBudgetFractionOverride: 0` to each, isolating them from the newly-promoted sibling.
Two of the dedup-retry suite's own tests were rewritten to assert the new default-ON behavior instead
of the old opt-in one (`cfg=null` now runs the tier; a sparse ablation object touching only
`STRATEGY_DEDUP_NEAR_TIE_RETENTION` now leaves this flag active rather than off).

**Verification before merge**: `npx tsc --noEmit` clean; `npx vitest run modules/solver` 381/381
passing; `npm run check` clean (all static checks, including `check:no-solver-level-numbers` and
`check:hint-validity`); `npm run test:node` clean; `npm run test:coverage` 1163/1164 (the one failure,
a property-based test in `lower-bounds.test.ts` unrelated to this change, reproduced as passing in
~30s standalone — a resource-contention timeout under coverage instrumentation, not a regression);
`npm run solver:bench -- --check` — **160/160 published-corpus levels solved, no regressions, +0.3%
nodes** (wall-time increase is sandbox CPU-throttling noise per this repo's own documented caveat, not
a real cost regression, given node count barely moved).

## Applying the pattern elsewhere: `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`

The "run dead last, additive-only budget" pattern validated above generalizes directly to a SECOND
known double-edged mechanism in this file: `ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION`
(`reports/2026-07-30-admissible-order-node-reserve.md`). That reserve withholds a slice of the
admissible-order tier's own node budget from `'default'` (the dominant profile, which runs first) to
give the other profiles (`'none'`/`'mustCrossFirst'`/`'intersectionHarvest'`/`'nearClosureRescue'`) a
genuine chance — recovering `R03148` (`'none'` solves it cheaply when the reserve is off, never runs
at all when it's on) but turning `R02644` from SOLVED to unsolved at the same fraction, because
`'default'` there genuinely needed the room the reserve shrinks. Real gain, real loss, same knob —
exactly the shape a bounded last-resort retry is suited to instead.

**Design**: rather than shrinking `'default'`'s ceiling in the tier's own (unchanged, unreserved) pass
— so `R02644`-shaped levels keep their full, already-validated chance — a new tier
(`STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`, opt-in/default-OFF) reruns ONLY the non-`'default'`
profiles afterward, dead last (after even the now-promoted dedup-retry tier), with a fresh additive
node ceiling and a fresh additive `prep._workCap` override. The `prep._workCap` override is necessary
even though this tier calls `runAttempt` directly — the same way the admissible-order tier's own
per-profile loop does, not through the shared-pool `runInterleavedAttempts`/`runGateSerialAttempts`
machinery dedup-retry's own work-starvation bug came from — because `prep._workCap` is a single
mutable field on `prep`, last written by whichever of those two functions most recently dispatched an
attempt (ordinarily the main loop), and nothing resets it fresh for a `runAttempt`-direct caller
positioned this late in the ladder either.

**A real, unrelated finding surfaced during local validation: baseline drift since 2026-07-30.** The
initial reserve fraction (0.25, mirrored from `DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION`) was tried
first and found completely useless — `R03148` still failed to recover at `nodeBudget=50M`. Tracing why
found that the 2026-07-30 report's own numbers no longer reproduce on the current codebase: at every
scale tested (20M, 100M nodes), the earlier tiers now exhaust their full `earlyTierNodeBudget` share
and `'default'` then exhausts its own full remaining share too, **without either solving** —
`'default'`'s own historical 6.87M-node need has grown to ~12.5–25M depending on scale, byte-identical
whether `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` is on or off (confirming the drift is unrelated
to this change — 16+ days and many intervening solver commits, not a bug introduced here). A
diagnostic run with an artificially large reserve override DID recover `R03148` — `'none'` still only
needs **1,914,111 nodes**, essentially unchanged from the historical 1.97M figure, referee-valid —
confirming the double-edged shape and the mechanism itself are both still real; only the reserve
needed to actually REACH that cheap solve had grown, because the ladder now spends far more before
this tier's turn ever comes. The shipped default was doubled to 0.5 in response (still a first cut,
not a rigorous derivation — see the constant's own comment).

**Local validation at the shipped 0.5 default** (real `solveLevel()`, `nodeBudget=50,000,000`,
referee-validated):

| level | result | detail |
|---|---|---|
| `R03148` | **solved**, referee-valid | via `'none'` in the new retry tier, 1,914,111 nodes for that profile — target recovery confirmed |
| `R02644` @ 60M (a budget where `'default'` solves) | **solved**, byte-identical in both arms | `'default'` = 13,207,464 nodes either way; this tier never runs (`!result.solution` guard) — confirmed zero effect |
| `R02644` @ 50M (a budget where `'default'` itself already fails) | fails identically in both arms | `'default'` = 12,499,968 nodes either way, unsolved with or without this tier; the tier's own attempt at `'none'` also fails there but changes nothing about the outcome — confirmed no NEW regression, only a pre-existing budget-insufficiency at that specific scale |

Zero regression confirmed at both a solving and a non-solving budget for the counterexample level, and
the target recovery confirmed at the shipped default fraction (not just the artificially large
diagnostic override). `npm run solver:bench -- --check`: 160/160 published-corpus levels, byte-identical
node count to before this change (strict no-op, as expected for an opt-in/default-OFF flag). 5 new
`orchestration.test.ts` tests (inertness, explicit enable, budget-fraction-0 suppression,
`disableExtraBudgetPasses` suppression + override precedence, a mocked-dispatch rescue test
confirming `'default'` is never retried) — full solver suite 386/386 passing.

**Population-scale confirmation: net +45, zero regressions.** Dispatched `solver-stress-refresh.yml`
on `main` @ `6e835ff0` with `enable_flags=STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`,
`deterministic=true`, `persist_hints=true` — run `31910836458`, completed and persisted cleanly
(commit `6ad4320a`). Diffed against the `764/1700` baseline (run `31902837955` — a directly reusable,
confound-free "before" arm: the only functional difference between that run's commit and this one's is
the promotion of `STRATEGY_DEDUP_NEAR_TIE_RETRY`, itself a no-op for this comparison since that tier
was already explicitly active in the baseline run via its own `enable_flags`, plus the new opt-in
flag under test here).

| category | count | detail |
|---|---:|---|
| gained | **45** | every sampled winner solves via `ida:none` — exactly the target profile |
| lost (regressions) | **0** | strict superset of the baseline's solved set |
| `R03148` | recovered | confirms local validation at population scale |
| `R02644` | unsolved in BOTH arms | this run's node budget is below what `R02644` needs regardless of this flag (consistent with the local 50M-vs-60M finding above, not a new issue) |

Net: **809/1700, up from 764, with zero levels lost relative to baseline** — a strict superset, the
same clean shape `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own final (REVISION 2+3) population result had.
Corpus 1 exactly matches its own baseline (95/102). The 0.5 reserve fraction, corrected from an
initial useless 0.25 during local validation, held up cleanly at population scale on the first
attempt — unlike `STRATEGY_DEDUP_NEAR_TIE_RETRY`, which needed a full extra revision cycle (subtractive
→ additive → reorder) after its own first population run.

## Promoted to default-ON (`STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`)

Promoted the same day the population result landed in, on the user's explicit instruction, on the
strength of the same clean shape that justified promoting `STRATEGY_DEDUP_NEAR_TIE_RETRY`: a strict
superset of the baseline's solved set (zero levels lost, +45 gained), and — unlike that tier —
achieved on the FIRST population attempt with no revision cycle needed after the initial local-testing
fraction correction (0.25 → 0.5). Changed the run-condition from the opt-in `cfg && cfg.FLAG === true`
convention to the standard default-on `!cfg || cfg.FLAG` convention (same as
`admissibleOrderTierWillRun`/`dedupRetryTierWillRun`), and removed it from `scripts/ablation-config.mjs`'s
`OPT_IN_FEATURES`. Both interactive solve UIs are unaffected for the same reason as the first
promotion — `disableExtraBudgetPasses: true` already zeroes this tier's budget fraction regardless of
the ablation default.

**Ripple effect on pre-existing tests, same pattern as the first promotion.** 14 tests broke: the same
11 reserve-arithmetic tests from the first promotion (now needing a SECOND isolation override,
`admissibleOrderNonDefaultRetryBudgetFractionOverride: 0`, alongside the first), plus one further
pre-existing test (`admissible-order profile reserve is inert by default`) that hadn't needed
isolation before either promotion, plus the dedup-retry suite's own "reruns the main ladder" test
(16 vs. 20 attempts, needing the same new isolation), plus this mechanism's own "inert by default"
test needing the same active-by-default rewrite the dedup-retry suite went through. A bulk
`replace_all` fix for the 11 shared tests briefly over-applied to this mechanism's own "can solve"
test too (accidentally zeroing the very tier under test via the sibling override it shares a line
with) — caught by the immediate test run, not shipped; fixed by removing that one line from that one
test. Final state: 388/388 solver tests passing.

**Verification before merge**: `npx tsc --noEmit` clean; `npx vitest run modules/solver` 388/388
passing; `npm run check` clean; `npm run test:node` clean; `npm run solver:bench -- --check`:
160/160 published levels, no regressions, byte-identical node count to before this change (this
default-on tier essentially never fires on the well-tuned published corpus, same as the first
promotion).

## A third application: `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`, for `R02114`/`R00592`

Applied the same pattern a third time, directly to the ROOT flag this whole investigation started
from: `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` itself. The report's own single-attempt-config comparison
(above, "This is not isolated to `R02248`") already showed disabling this flag entirely recovers
`R02114` and `R00592` (referee-valid) — the two originally-confirmed regressions
`STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own near-tie retention doesn't reach, because their blocking
collision is a different depth/shape a single runner-up slot doesn't cover — but the same test found
`R03248` goes the OTHER way (solves flag-on, fails flag-off). Real gain, real loss, same knob, for
the third time in this file.

**Mechanism**: structurally identical to `STRATEGY_DEDUP_NEAR_TIE_RETRY` (not the admissible-order
tier's own per-profile shape) — reruns the SAME `mainConfigs` ladder with
`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` disabled via a Proxy override, a fresh additive node ceiling, and
a fresh additive work allocation. `R03248` is structurally protected the same way `R02644` was: it
already solves via the normal flag-on ladder, so `!result.solution` skips this tier entirely.

**A new bug, a new variant of the same starvation class.** Local testing at the initial 0.25 reserve
(mirroring `DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION`'s own original value) found `R02114`/`R00592`
still failing at `node-budget-reached`. Doubling to 0.5 (matching `ADMISSIBLE_ORDER_NON_DEFAULT_
RETRY_NODE_RESERVE_FRACTION`'s own final value) made **no difference at all** — both landed at the
identical node count either way. Root cause: this is now the THIRD retry tier in the ladder, and its
ceiling (`nodeBudget + 0.5×nodeBudget`) computed to the exact same absolute value as the tier
immediately before it (`STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`'s own ceiling, also `nodeBudget
+ 0.5×nodeBudget`) — so the instant that tier maxed out on a failing attempt, this tier's entry guard
was already false, giving it zero real headroom regardless of its own fraction. Fixed by stacking
this tier's ceiling on the PRECEDING tier's own ceiling (`nonDefaultRetryNodeCeiling +
connectivityRetryNodeReserve`) instead of restarting from `nodeBudget` — guaranteeing genuine
additive headroom regardless of what fraction the tier before it happens to use, rather than relying
on the two fractions coincidentally differing (which is what let the SECOND tier avoid this exact bug
by accident when it was built, not by design). The two already-promoted tiers were not retroactively
changed — both are already population-validated and shipped as-is.

**Local validation after the fix** (real `solveLevel()`, `nodeBudget=50,000,000`, referee-validated):

| level | result | detail |
|---|---|---|
| `R02114` | **solved**, referee-valid | via retry, 75,843,583 nodes total; winning attempt (`objectiveFirst@2000`) needs 204,993 nodes — essentially identical to the original single-attempt-config figure |
| `R00592` | **solved**, referee-valid | via retry, 75,896,832 nodes total; winning attempt needs 220,726 nodes — same match |
| `R03248` | unaffected | solves normally (340,928 nodes), retry never fires |
| `R02248` | unaffected | solves via its own existing near-tie-retention fix (4,250,643 nodes), retry never fires |

Both targets recovered with node counts for the winning attempt matching the original evidence almost
exactly — confirming the technique itself is exactly as cheap as that evidence suggested; the only
real cost is reaching the tier's own turn at all, now that it stacks correctly. 6 new
`orchestration.test.ts` tests (reruns-the-ladder, inert-by-default, explicit-false + sparse-object,
budget-fraction-0, `disableExtraBudgetPasses` + override, mocked-dispatch rescue) — one initial test
failure (32 vs. 16 attempts) traced to a missing isolation override in the test itself (the
also-default-on dedup-retry tier's own attempts weren't suppressed), not a mechanism bug; fixed before
commit. Full solver suite: 394/394 passing. `npm run solver:bench -- --check`: 160/160 published
levels, no regressions, byte-identical node count (opt-in/default-OFF, strict no-op as expected).

Population-scale validation (dispatched next) — see the following section for the result.

## Population-scale confirmation and promotion (`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`)

Dispatched `solver-stress-refresh.yml` (`deterministic=true`, `persist_hints=true`,
`enable_flags=STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`) on `main` @
`fc3040cb3959e499a9a8df56348e43cb4300b077`, run `31918095910`, reusing the 809-baseline run
(`31910836458`) since the only functional difference between the two commits is this one flag. The
persist step landed cleanly on `main` (commit `c2ddd3764175266b098c946fc5ba33f21c3a4067`).

**Solved-count result — a clean superset, exactly the promotion bar:**

| corpus | baseline | new | delta |
|---|---|---|---|
| corpus 1 | 95/102 | 95/102 | **identical solved-ID set — zero change** |
| corpus 2 | 809/1700 | 819/1700 | **+10, ZERO regressions** |

Exact corpus-2 diff: gained `R00296`, `R00592`, `R02068`, `R02088`, `R02114`, `R02491`, `R02690`,
`R02878`, `R03195`, `R03357` (10 levels); lost: none. Both originally-targeted levels (`R02114`,
`R00592`) recovered exactly as the local validation predicted, plus 8 more the local spot-check never
tested for. `R03248` — the local single-attempt-config counter-example that solves flag-on and fails
flag-off — was NOT lost, confirming the `!result.solution` skip-guard protected it at population scale
the same way it protected `R02644`/`R02248` for the two prior tiers.

**Cost result — the largest increase of the three tiers, as flagged before dispatch:**

| corpus | metric | baseline | new | delta |
|---|---|---|---|---|
| corpus 1 | nodes | 936,819,573 | 1,111,819,565 | **+18.7%** |
| corpus 1 | work | 1,415,794,400 | 1,588,279,948 | **+12.2%** |
| corpus 2 | nodes | 78,500,720,005 | 100,607,325,929 | **+28.2%** |
| corpus 2 | work | 97,229,415,622 | 118,724,006,397 | **+22.1%** |

This is materially larger than either prior promoted tier's own cost delta, and is exactly what was
predicted before dispatch: `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` gates a much hotter, more
frequently-hit code path (every connectivity flood-fill across every search technique, via
`prune-gauntlet.ts`'s shared move-pruning gauntlet) than either a single dedup collision
(`STRATEGY_DEDUP_NEAR_TIE_RETRY`) or one tier's own profile choice
(`STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`), so a full ladder rerun without it is genuinely more
expensive per-attempt, not just occasionally triggered.

**Promoted anyway.** The explicit promotion bar for this ladder, applied consistently across all
three tiers, is solved-count gain plus zero regressions — not cost neutrality; every tier in this
ladder is inherently a cost/coverage trade by construction (it exists to search more when the cheaper
path already failed). Given a clean +10/-0 population result on top of an already-validated local
mechanism, promoted `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` to production default-ON
(`!cfg || cfg.STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`, removed from `OPT_IN_FEATURES` in
`scripts/ablation-config.mjs`). The cost increase is recorded here as the first data point worth
watching if a fourth tier is ever stacked on top of this one: the ladder's worst-case multiplier on
`nodeBudget` is now higher, and any new tier's own headroom has to be judged against an
already-more-expensive baseline than the one the first two tiers were validated against.

**Ripple-effect test fixes**: promoting a third default-ON tier broke 14 pre-existing
`orchestration.test.ts` tests whose finite-`nodeBudget` arithmetic didn't isolate this newly-active
tier (the same class of fix both prior promotions needed, at larger scale since three tiers now
overlap in every such test) — fixed by adding `connectivityAxisExhaustedRetryBudgetFractionOverride: 0`
alongside the existing isolation overrides, and rewriting the tier's own two "default-OFF" tests
(`... is inert by default`, `... stays off under an explicit false / sparse object`) into the
promoted-tier shape the other two tiers' suites already establish (`... is ACTIVE by default`, a
`disableExtraBudgetPasses` suppression test, an explicit-false test, and a sparse-unrelated-object
test). Full suite: 100/100 passing (`modules/solver/orchestration.test.ts`).

**Verification before merge**: `npx tsc --noEmit` clean; `npx vitest run` 1179/1179 passing; `npm run
check` clean; `npm run test:node` clean; `npm run solver:bench -- --check`: 160/160 published levels,
no regressions, -24.1% wall time / +0.3% nodes vs. the (stale, 38-commits-behind) committed baseline —
consistent with this tier essentially never firing on the well-tuned published corpus, same as both
prior promotions.

## Infrastructure fixes surfaced by this investigation

Two real, independent infrastructure bugs were found and fixed while trying to analyze the full-corpus
A/B above — see `.github/workflows/solver-stress-refresh.yml` and `README-solver-stress-refresh.md`
for the full detail; summarized here since they were a direct precondition for the population-scale
finding above:

1. **The persist step's push-retry logic failed whenever another commit landed on the branch
   mid-run.** `reports/stress/benchmark-*.json` are tracked files the sweep always overwrites on
   disk, but the persist step only staged them for commit when `deterministic != true` — leaving
   them as unstaged modifications that made the retry's `git rebase` fail with "You have unstaged
   changes" the moment anything else pushed first (an unrelated automated `chore(audit)` commit, in
   the case that surfaced this). Fixed by discarding those deliberately-unstaged changes before
   rebasing.
2. **Under `deterministic=true` + `persist_hints=false` (the documented matched-A/B setting), no
   per-level result was ever committed anywhere reachable outside the run's own uploaded Actions
   artifact.** That artifact lives on Azure blob storage, whose download this session's egress policy
   blocks (403) — so a run could complete and still be unanalyzable. Fixed by making a compact
   per-run analysis summary (`reports/stress/capability-runs/<run_id>/summary.json` +
   `per-level-corpus{1,2}.json`) unconditional, regardless of `persist_hints`/`deterministic` — it is
   namespaced by run id and never read back into any solve, so it cannot let one A/B arm mutate what
   a queued arm measures, the actual property `persist_hints=false` protects.

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
- **This report's production status**: the near-tie dedup retention fix (`DEDUP_NEAR_TIE_MARGIN`) IS
  shipped and stays shipped — but its actual population-scale effect is **net -7 on Corpus 2** (34
  lost / 27 gained), not the "zero regressions" the 112-level sample (badness-stratified toward hard
  levels, which none of the 61 flipped levels belong to) originally suggested. A recovery mechanism
  (`STRATEGY_DEDUP_NEAR_TIE_RETRY`) was built and went through three design revisions the same day:
  the first shipped design recovered 33/34 target losses (0/27 gains broken) but cost 65 unrelated
  levels via an unconditional node-reserve tax, netting -17 (707 vs. 724); an additive-reserve fix
  (REVISION 2) plus reordering the tier to run after the admissible-order tier (REVISION 3) together
  **fully resolved this, confirmed at population scale: 764/1700, +40 vs. baseline, with ZERO levels
  lost relative to baseline** (33/34 recovered, all 27 gains intact, +7 bonus, 0 collateral damage) —
  see "Population-scale confirmation" above. **Promoted to production default-ON the same day** (see
  "Promoted to default-ON" above) on the strength of that clean result. It remains a partial fix
  regardless of its promotion status: `R02248` is the only one of the 3 originally-confirmed
  regressions it addresses even in principle (`R02114`/`R00592` remain open, as do ~175 unverified
  provenance-mining candidates).

## Recommended next steps (not done here)

1. **Investigate why `R02114`/`R00592` don't respond to the same fix** — trace their own critical
   collision with the same beam-frontier instrumentation used on `R02248`. Their blocking collision
   is evidently a different depth/shape a single runner-up slot doesn't reach.
2. **Verify `R03248` shows the threshold-crossing signature** (in the opposite direction) using the
   identical instrumentation, and check whether its own depth-of-divergence is a genuine flag-vs-flag
   score difference (like `R02248`'s depth-12 finding) or an actual threshold-timing effect — the two
   are not the same question, and this report only fully traced one of the two directions.
3. **Verify the remaining 175 unverified provenance-mining candidates** (the 2–30-node trivial tier
   plus the >50,000-node tier beyond the 20 already tested) — establishes the real population scale.

## Evidence artifacts

**The fix and the recovery mechanism are both committed**, not evidence-only: `DEDUP_NEAR_TIE_MARGIN`,
`STRATEGY_DEDUP_NEAR_TIE_RETENTION` gating, and the `dm`/`dm2` near-tie retention block in
`beamSearchFromGate`'s state-dedup path (`modules/solver/search.ts`); the `STRATEGY_DEDUP_NEAR_TIE_
RETRY` last-resort tier, its two budget-fraction/node-reserve constants, and the `SolveOpts`
overrides (`modules/solver/orchestration.ts`); both flags' registry entries (`scripts/ablation-
config.mjs`). Regression baseline refresh and the `solver:bench` staleness warning/`deadlineTruncated`
summary line are committed in `scripts/solver-bench.mjs` and `logs/solver-baseline.json`. The
push-race fix and always-persisted per-run analysis summary are committed in
`.github/workflows/solver-stress-refresh.yml` and its README.

**Durable, git-fetchable population data** (via `reports/stress/capability-runs/<run_id>/`, not
scratchpad):
- `31874764534/`: the with-fix full-corpus run (724/1700 C2, 95/102 C1), committed to `main`.
- `31877433629/`: the control-arm (no-fix, `DEDUP_NEAR_TIE_MARGIN=0`) full-corpus run (731/1700 C2,
  94/102 C1, bit-identical to run #41), committed to the throwaway `claude/nofix-control-arm` branch.
- `31895631847/`: the FIRST `STRATEGY_DEDUP_NEAR_TIE_RETRY` full-corpus run, broken/subtractive-reserve
  design (707/1700 C2, 93/102 C1), committed to `main`.
- `31902837955/`: the SECOND `STRATEGY_DEDUP_NEAR_TIE_RETRY` full-corpus run, additive-reserve +
  run-last design (764/1700 C2, 95/102 C1), committed to `main`.
- Diffing these four runs' `per-level-corpus2.json` `solvedIds` is the source of the exact 34-lost/
  27-gained flip set in "The full-corpus GHA A/B" above, the 33-recovered/65-collateral-loss breakdown
  in "The retry pass at population scale" above, and the 33-recovered/0-collateral-loss confirmation in
  "Population-scale confirmation" above.

Everything below is scratchpad-only (not committed) and regenerable:

- `/tmp/verify-retry-pass.mjs` (session scratchpad): the local spot-check driver used to validate
  `STRATEGY_DEDUP_NEAR_TIE_RETRY` against real levels (`R00180`/`R00901`/`R02110`) through the full
  production ladder — the source of the "2/3 recovered, outlier fails as predicted" result above, and
  of the two budget bugs found and fixed (floor-vs-withheld-reserve neutralization; work-budget
  starvation).

- `stale-cold-solve-candidates.json`: all 195 mined candidates.
- `stale-candidates-verified.json`: the 20-candidate verification run's full per-level detail,
  captured *before* the fix (i.e. the pre-fix failure baseline for that sample).
- `/tmp/verify-fix.mjs`: targeted re-check of `R02248`/`R02114`/`R00592`/`R03248` against the current
  code state via `runAttempt` — used repeatedly across every fix iteration (union-type map, K=2, K=3,
  each margin value) to confirm which levels flipped.
- `/tmp/verify-fix-full20.mjs`: re-runs all 20 mined-and-verified candidates against the shipped fix;
  this is the source of the "1 fixed / 19 unchanged" result recorded above.
- `trace-r02248-beam.mjs` / `trace-competitor.mjs` / `trace-scores2.mjs` / `trace-pool-growth.mjs`:
  the beam-frontier instrumentation scripts used to trace the mechanism above (`prep._beamResearchObserver`
  driving stage-by-stage diffing of flag-on vs. flag-off runs).
- `withfix-112.json`/`withfix-112.log` and `axisexh-on.json`/`axisexh-on.log`: the 112-level
  Corpus-2 sample sweep with vs. without the fix (identical solved set, +0.0001% nodes).
- Mining/tracing script logic is described in full above; not committed as scripts since this was a
  one-shot investigation, not a reusable tool — a future session picking up the next steps above
  should decide whether to promote any of them to `scripts/stress/` first (the pool-growth tracer in
  particular is directly reusable for verifying `R03248` and any of the remaining 175 candidates).
