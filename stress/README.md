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
6. **Batch B's remaining unsolved levels beyond S027/S033/S042** (S028, S030, S031, S036,
   S039, S043, S044, S047, S048) — not individually ablated. The quantitative
   witness-contrast pass across all 17 originally-unsolved levels found must-cross
   threading gap (`mcGap`, effect size d≈-0.38) and perimeter usage (d≈-0.46) as the
   largest population-level differences from solved levels — consistent with, but not
   proof of, the same must-cross/interior-routing mechanism as S033/S042. Worth re-running
   the same per-level ingredient ablation on these nine once #5 above is resolved, to
   see which move and which don't. **Confirmed still a hard wall, not a budget artifact**:
   S042 and S047 (representative of this cluster) were re-probed at 90s (4.5× the 20s
   budget) after the S017 fix shipped — both still time out. More budget alone does not
   solve this cluster; it needs either the same policy-level breakthrough that solved
   S027/S029, or the (currently unsound — see item 3) flipper interaction understood
   some other, safe way.
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
