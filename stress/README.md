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
