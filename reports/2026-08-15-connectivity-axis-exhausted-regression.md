# A confirmed, population-scale regression from `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`

> **Status:** confirmed, causally isolated regression on at least 3 levels (`R02248`, `R02114`,
> `R00592`), with 195 further candidates from provenance mining not yet individually verified.
> **NOT a production fix** — the flag is not uniformly harmful (one tested case, `R03248`, goes the
> other way), and the exact mechanism is not yet root-caused. This report is scoped to establishing
> that the regression is real and population-relevant, not to shipping a change.
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

That means the regression runs through a **downstream** mechanism, not a direct false-reject: most
plausibly the interaction between `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`'s extra rejections **elsewhere
in the search tree** (candidates genuinely unrelated to the eventual winning path) and beam-width
competition or state deduplication (`useStateDedup` in `beamSearchFromGate`) — pruning a sibling
candidate could plausibly change which of two dedup-equivalent states (same cell/visited-set, 
different `edgeUsage` history) survives, in a way that doesn't reject the winning path directly but
still causes it to fall out of the beam's top-5000 width at some depth. **This is a hypothesis, not
confirmed** — tracing it further would need per-depth beam-frontier instrumentation
(`prep._beamResearchObserver`, already used elsewhere in this codebase for exactly this kind of
trace) comparing flag-on vs flag-off frontiers depth by depth. Not done here.

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
  Corpus-2 levels, traceable to a specific commit (`80a5706`) and a specific ablation flag
  (`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`), whose own soundness validation at introduction had a real
  coverage gap (only checks previously-stored witnesses, not newly-recovered ones).
- **Does not establish**: the true population-wide scale (only 20 of 195 mined candidates were
  individually tested, only in a single-attempt-config probe, not the full ladder); the exact
  mechanism (isConnected is sound on the winning path itself — the effect is downstream, most likely
  beam-width competition or state dedup, not confirmed); or that disabling the flag is a net-positive
  fix (`R03248` is a direct counterexample).
- **Does not itself justify** any production change. Per this repo's promotion contract
  (`docs/solver-optimization-current-queue.md`), any actual fix needs: the real mechanism traced (not
  just the symptom), a matched full-corpus A/B at equal node/work budget with lifecycle telemetry,
  and explicit reporting of both gains and losses — `R03248`'s opposite-direction result makes clear
  a blanket revert would trade some solves for others, not a pure win.

## Recommended next steps (not done here)

1. **Trace the actual mechanism** on `R02248` using `prep._beamResearchObserver` to diff the flag-on
   vs. flag-off beam frontier depth-by-depth — find the exact depth/candidate where the winning
   lineage's survival diverges, and confirm whether dedup or width competition is the proximate cause.
2. **Verify the remaining 175 unverified provenance-mining candidates** (the 2–30-node trivial tier
   plus the >50,000-node tier beyond the 20 already tested) — establishes the real population scale.
3. **Investigate `R03248`'s opposite-direction case** with the same rigor — understanding why the
   flag *helps* there is necessary to design any fix that doesn't trade wins for losses.
4. **A full-corpus matched A/B at the flag's actual production node budget (50M)**, not 10M, once (1)
   and (3) give enough understanding to propose a specific, narrower fix rather than a blanket
   ablation flip.

## Evidence artifacts (not committed — scratchpad only, regenerable)

- `stale-cold-solve-candidates.json`: all 195 mined candidates.
- `stale-candidates-verified.json`: the 20-candidate verification run's full per-level detail.
- Mining script logic is described in full above; not committed as a script since it was a one-shot
  investigation, not a reusable tool — a future session picking up step 2 above should decide whether
  to promote it to `scripts/stress/` first.
