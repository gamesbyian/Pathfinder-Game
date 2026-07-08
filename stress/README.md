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

## Open investigation threads (2026-07-08)

Root-caused but deliberately **not** patched this session — each needs a larger, riskier
change than a narrow policy/pruning tweak, and shipping one without the same deterministic
evidence bar the accepted fix cleared (see below) risks another silent no-op:

- **S093/S099 (batch D, topology-only high-intersection levels).** `PF_BEAM_DEBUG` traced
  these to a real over-conservative gate: `PRUNE_PARITY` in `modules/solver/search.ts` is
  disabled for the *whole search* whenever a level merely contains a portal
  (`level.portalMap.size === 0`), even when the true solution never touches it (S093's
  witness makes zero portal jumps). A per-branch fix was built — precompute a BFS
  distance array per portal terminal (`prep.portalTerminalDistArrs`) and only suppress the
  prune while an *unused* terminal is still reachable within the remaining step budget —
  and it's provably safe (strictly tightens an existing prune, can't regress). But a
  deterministic node-count A/B (same profile/beam width, run to actual completion, not
  wall-clock — see the Fix 1 lesson below) showed **zero difference: 126 nodes expanded,
  identical, with or without it.** The portal terminal stays "reachable within remaining
  budget" for nearly the whole 60–100-step path on these grids, so the finer gate only
  diverges from today's blanket-disable in the last ~20 steps — not enough to matter. It
  was reverted. Cracking this needs a bound that reasons jointly about "portal available
  vs not" rather than gating a single-mode check — a heavier redesign.
- **S118 (batch E, 4-gate budget starvation).** Checked whether the 3 decoy gates could be
  cheaply eliminated before the interleaved attempt ladder runs: all 4 gates pass both the
  admissible goal-distance bound (`prep.goalDistArr`, portal-aware) and the parity filter
  (`getActiveGates` in `orchestration.ts`) — the generator deliberately built them that
  way. The 4-way budget dilution across ~16 configs × 4 gates is genuine contention, not a
  bug; fixing it means an adaptive budget-allocation redesign (e.g. giving early signal
  from one gate more of the remaining budget), which is a materially bigger change than
  this session's fixes.
- **Batch B's remaining 9 (of 13 originally) unsolved interaction levels.** Per-level
  ingredient ablation (remove one mechanic, re-solve) found a *different* binding
  constraint per level — no single shared culprit — confirming the batch's own thesis that
  the failure is emergent interaction, not any one mechanic. Worth re-running this same
  ablation sweep after any future fix to see which of the 9 move.

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
