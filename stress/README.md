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

### Root-caused, concrete next step, not yet attempted

3. **Flippers have no hard lower-bound prune — only a soft scoring nudge.**
   `must-pass`/`must-cross` both get admissible lower bounds (`mustPassLowerBound`,
   `mustCrossLowerBound` in `lower-bounds.ts`) that let DFS/beam abandon infeasible
   branches early. Flippers get only `SCORE_FLIPPER_URGENCY` (`scoring.ts`) — a heuristic
   nudge, not a prune — despite the exact infrastructure a hard bound would need already
   existing: `prep.flipperApproachEven`/`flipperApproachOdd` (approach-distance maps,
   built at prep time for the scoring nudge). S042 ablation isolates this precisely:
   removing its single flipping filter drops the solve time from a 20s timeout to 5.9s,
   nothing else changed. **Next step:** mirror `mustCrossLowerBound`'s perpendicular-
   approach-axis logic into a new `flipperLowerBound`, using the maps that already exist;
   gate it behind a new ablation flag; verify with node-count A/B (not wall-clock) on
   S042/S044/S047/S048 (the flipper-tagged unsolved set) before shipping.
4. **S017: the winning search already exists in the policy — it's starved of budget.**
   Calling `beamSearchFromGate` directly with `intersectionHarvest@beamWidth=5000,
   diverseBeam=true` solves S017 in 2797ms. Through the real orchestration it still times
   out — instrumented via `Solver.solve(...).attempts` (exact per-attempt elapsed ms, no
   estimation): S017 is `reqInt=12, gates=2`, routes through the very-high-reqInt policy
   rule, and the diverse-beam attempts (added by `HIGHINT_MC_DIVERSE`) run **3rd/4th** in
   the ladder, receiving only **1924–2331ms** each — because the two non-diverse
   `@5000` beam attempts ahead of them each consume their *full* 1664ms allotment
   (they don't exhaust early on this level, unlike the S093/S099 case), shrinking the
   per-gate share the 0.35/0.25 `minBudgetFraction` floor is computed against. 2331ms is
   short of the ~2800ms actually needed by a decisive, precisely-measured margin — this
   isn't a hypothesis, it's a budget-arithmetic gap you can reproduce exactly with the
   instrumentation above. **Next step:** raise the floor fraction for this rule, and/or
   move the diverse-beam attempts ahead of the two non-diverse `@5000` beams (which the
   same attempt log shows never solve this archetype anyway); re-verify with the same
   per-attempt-ms instrumentation that the diverse beam now clears ~2800ms before shipping.
5. **S118 (4-gate budget starvation, batch E).** All 4 gates pass both admissible tests the
   solver has before running any search — the goal-distance bound (`prep.goalDistArr`,
   portal-aware) and the parity filter (`getActiveGates` in `orchestration.ts`) — so none
   can be cheaply excluded; the generator built the decoys specifically to clear both.
   The 4-way dilution across ~16 configs × 4 gates is genuine contention, not a bug.
   Fixing it needs an adaptive budget-allocation redesign (e.g. reallocating from gates
   that show zero progress signal early) — a materially bigger change than a policy tweak.
6. **Batch B's remaining unsolved levels beyond S027/S033/S042** (S028, S030, S031, S036,
   S039, S043, S044, S047, S048) — not individually ablated. The quantitative
   witness-contrast pass across all 17 originally-unsolved levels found must-cross
   threading gap (`mcGap`, effect size d≈-0.38) and perimeter usage (d≈-0.46) as the
   largest population-level differences from solved levels — consistent with, but not
   proof of, the same must-cross/interior-routing mechanism as S033/S042. Worth re-running
   the same per-level ingredient ablation on these nine once #3/#4 above are resolved, to
   see which move and which don't.

**Methodological note for whoever picks these up:** the accepted fix in this session
(`HIGHINT_MC_DIVERSE`) and the rejected one (portal-aware parity) were built with equal
care and initially looked similarly promising in noisy wall-clock runs. The
differentiator was a **deterministic node-count comparison** (fixed profile/beam width,
run to completion, compare `nodesExpanded` — not elapsed ms) run *before* committing to
ship. Wall-clock deltas of 5–10% on this corpus are consistent with plain run-to-run
noise (see the `stress:regression` "held" baselines drifting run over run); don't trust
them alone to justify a fix.

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
