# Solver stress corpus

An experimental benchmark corpus whose **sole purpose is to evaluate and challenge the
production solver**. It is *not* player content: nothing in the app references this
directory (only `data/` ships in the build), so these levels can never appear in the
level selector. Do not optimize them for aesthetics, fairness, or fun — they exist to
expose heuristic blind spots, orchestration weaknesses, beam-width sensitivity, and
generalization failures.

## Files

| File | What it is |
|---|---|
| `stress-levels.json` | 150 generated levels in wire format + per-level `stressMeta` (hidden witness solution, batch/theory, complexity/challenge/novelty scores, seeds, generator notes). |
| `reports/novelty-report.json` | Output of the corpus comparison tool (`npm run stress:compare`). |
| `reports/benchmark-latest.json` | Production-solver benchmark results (`npm run stress:benchmark`). |
| `reports/batch-analysis.md` / `.json` | Per-batch analysis + highlights (`npm run stress:analyze`). |

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

## Batches

| Batch | Theory (short) |
|---|---|
| A `historical-solver-pain` | Ridge model fitted on `audits/raw/latest.json` steers generation toward feature regimes that were historically slow. |
| B `structural-complexity` | Ignore history; maximize mechanic interaction (portals × flippers × must-cross × landmarks in tight radii). |
| C `deceptive-simplicity` | Few/no objects; ambiguity from open geometry, route multiplicity, uninformative gradients. |
| D `novel-topology` | Witness geometry selected (best-of-M) for distance from the published solution families. |
| E `anti-heuristic` | Directly oppose `solver/attempts.ts` policy: delayed closure under the near-closure rule, interior routing under perimeter-led orders, multi-gate budget starvation below the reqLen≥90 floor, flipper diverse-beam-ladder bait, navDensity-threshold gaming via hazard padding. |
| F `wild-witness` | Maximally wide parameter draws (extreme aspect ratios, tiny/huge grids, arbitrary mixes) — no hypothesis beyond coverage of un-authored level-space. |

Structural complexity and predicted solver challenge are **independent axes** in the
metadata: the corpus deliberately spans high-complexity/low-challenge,
low-complexity/high-challenge, and unknown-challenge/high-novelty combinations —
`predictionConfidence` says how much the predictor should be trusted per level (lowest
for batches D/F, highest for A).

## Workflow

```bash
npm run stress:generate    # regenerate the corpus (deterministic per --master-seed)
npm run stress:compare     # novelty report; exits 1 on near-duplicates
npm run stress:benchmark   # production solver, witness withheld (-- --budget-ms=20000)
npm run stress:analyze     # per-batch report + highlights + regression recommendations
```

`stress:generate`/`stress:benchmark` run through `scripts/run-bundled.mjs` (they import
TS modules); `stress:compare`/`stress:analyze` are plain node.

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
    real margin against that gap rather than the bare isolated minimum. **The remaining 3
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

5. ~~**S118 (4-gate budget starvation, batch E).**~~ **Fixed** — see the adaptive
   gate-weighting entry in Shipped above. All 4 gates pass both admissible tests the
   solver has before running any search — the goal-distance bound (`prep.goalDistArr`,
   portal-aware) and the parity filter (`getActiveGates` in `orchestration.ts`) — so none
   can be cheaply excluded; the generator built the decoys specifically to clear both. The
   fix doesn't try to exclude a gate; it lets a cheap round-0 nodesExpanded signal bias
   subsequent rounds toward gates with real search activity, which was enough here.
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
