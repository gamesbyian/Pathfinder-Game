# Required-length solver sweep

`solver:req-length-sweep` is an offline research tool that holds geometry, objects, `reqInt`, gates, and goal fixed while varying exact `reqLen`. It never edits source corpora/hints or runs in the game.

Use it to find reachable tested lengths, parity-proven impossibilities, work/runtime cliffs, winning-technique transitions, and solved intervals/islands.

## Quick start

```bash
npm run solver:req-length-sweep -- \
  --levels=pos:1-10 \
  --min=10 --max=80 --step=2 \
  --repeats=3 \
  --budget-ms=5000 \
  --node-budget=5000000 \
  --repair-budget-fraction=0 \
  --output=logs/req-length-sweep/published-1-10.json
```

Defaults: `data/levels.json`, `pos:1`, authored `reqLen ± 10` clamped to ≥1. `--levels-json=<path>` selects another corpus. This tool uses position-only selectors: `pos:7`, `pos:1-20`, or `all`; no `id:`.

## Options

| Option | Default | Meaning |
|---|---:|---|
| `--levels=<spec>` | `pos:1` | `parseLevelPositions` position selection |
| `--levels-json=<path>` | `data/levels.json` | Bare-array or `{levels:[...]}` corpus |
| `--min=<n>` / `--max=<n>` | authored ±10 | Inclusive positive bounds |
| `--step=<n>` | `1` | Positive increment |
| `--repeats=<n>` | `1` | Stability repeats; does not deliberately vary seed |
| `--budget-ms=<n>` | `1000` | Wall-time budget/run |
| `--work-budget=<n>` | unlimited | Preferred machine-independent work cap; see [`solver-budget-determinism.md`](solver-budget-determinism.md) |
| `--node-budget=<n>` | unlimited | Legacy/technique-specific cap; not cross-technique comparable |
| `--repair-budget-fraction=<n>` | solver default | Use `0` for bounded testing rather than discovery |
| `--scheduler-mode=<mode>` | `legacy` | `legacy` or opt-in `portfolio-experiment` |
| `--output=<path>` | `logs/req-length-sweep/latest.json` | JSON output |

## Report semantics

Each point records schema validity, parity, valid stored witnesses, `feasibility`, solve rate, median elapsed/nodes, winning techniques, independently refereed output, and full attempt telemetry. Per-level summaries include solved ranges, unknown/proven-infeasible lengths, technique transitions, open area, endpoint Manhattan distance, authored density, and detour factor.

Keep cold-solver outcome separate from feasibility:

| Cold classification | Meaning |
|---|---|
| `observed-solved` | At least one cold run found/referee-validated a path. |
| `statically-infeasible` | Every gate has wrong endpoint/length parity on a portal-free board; proof for that point. |
| `unknown-within-budget` | No path found under budget; **not** evidence of unsatisfiability. |

`validKnownWitnesses > 0` separately proves the modified level solvable even if cold search times out. `feasibility` is therefore `solver-witnessed`, `stored-witnessed`, `proven-infeasible`, or `unknown`.

Repair can extend wall time beyond `--budget-ms`; use `--repair-budget-fraction=0` for bounded tests. Prefer `--work-budget` for machine-independent comparisons. Wall time remains useful for speed but load-sensitive.

## Experimental discipline

First sweeps change **only `reqLen`**. Fixed `reqInt` isolates length pressure but also requires longer paths to avoid extra intersections; `reqLen × reqInt` is a different experiment.

For decision-bearing comparisons:

1. pin commit, corpus, scheduler, work/budgets, range, step;
2. prefer `workBudget` across commits/machines;
3. keep parity proof, stored witness, cold solve, and budget-limited unknown distinct;
4. inspect work/nodes and attempt telemetry, not wall time alone;
5. confirm cliffs with larger budget and nearby lengths;
6. use ablation afterward for causal heuristic tests; this sweep observes normal portfolio behavior only.

Points run sequentially to avoid cross-run CPU contention. Explore narrow ranges/populations before large sweeps.
