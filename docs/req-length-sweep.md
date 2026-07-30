# Required-length solver sweep

`solver:req-length-sweep` is an **offline research tool** for holding a level's geometry,
objects, `reqInt`, gates, and goal fixed while varying its exact required path length (`reqLen`).
It does not edit the source corpus or hint artifacts and is never used by the game runtime.

Use it to investigate questions such as:

- which tested lengths the current solver can reach;
- where parity produces provably impossible points;
- where runtime or node-count cliffs appear as length slack changes;
- which solver technique wins at different lengths; and
- whether observed solved lengths form one interval or disconnected islands.

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

The default corpus is `data/levels.json`, the default selection is `pos:1`, and the default range
is the authored `reqLen ± 10` (clamped to the schema-valid minimum of 1). Use
`--levels-json=<path>` for a stress or generated corpus. This tool uses the **position-only** level
selector, so write `pos:7`, `pos:1-20`, or `all`; it does not accept `id:` selectors.

## Options

| Option | Default | Meaning |
|---|---:|---|
| `--levels=<spec>` | `pos:1` | Position selection accepted by `parseLevelPositions` |
| `--levels-json=<path>` | `data/levels.json` | Bare-array or `{levels:[...]}` corpus |
| `--min=<n>` / `--max=<n>` | authored length ±10 | Inclusive positive-integer sweep bounds |
| `--step=<n>` | `1` | Positive integer increment |
| `--repeats=<n>` | `1` | Re-run each point for timing/stochastic stability |
| `--budget-ms=<n>` | `1000` | Solver wall-time budget per run |
| `--work-budget=<n>` | unlimited | **Preferred.** Machine-independent cap in work units (`modules/solver/work-meter.ts`); pin it and a run is reproducible on any host under any load |
| `--node-budget=<n>` | unlimited | Legacy per-technique cap. `nodesExpanded` counts a different primitive in dfs/beam/repair (11-17x different real work per "node"), so it is not comparable across techniques — see `docs/solver-budget-determinism.md` |
| `--repair-budget-fraction=<n>` | solver default | Repair extension override; use `0` for bounded testing rather than discovery |
| `--scheduler-mode=<mode>` | `legacy` | `legacy` or opt-in `portfolio-experiment` |
| `--output=<path>` | `logs/req-length-sweep/latest.json` | JSON report destination |

`repeats` does not deliberately vary a random seed. It measures run stability under the selected
solver mode and environment; deterministic techniques will normally repeat the same result.

## Reading the report

Every point includes schema validity, the static parity result, valid stored-witness count, a
separate `feasibility` evidence classification, solve
rate, median elapsed time, median nodes, winning techniques, independently-refereed solver output,
and the complete attempt telemetry. The per-level summary lists observed solved ranges, unknown
lengths, statically infeasible lengths, and winning-technique transitions. Level metrics include
open area, endpoint Manhattan distance, authored length density, and authored detour factor.

The classifications have deliberately narrow meanings:

- **`observed-solved`** — at least one cold solver run found and independently validated a path.
- **`statically-infeasible`** — every gate has the wrong endpoint/length parity on a portal-free
  board. This is a proof for that point, not a timeout inference.
- **`unknown-within-budget`** — the solver did not find a path under these budgets. It is **not**
  evidence that no path exists.

`validKnownWitnesses > 0` is separate evidence that the modified level is solvable, even if the
cold solver times out. Stored hints normally match only the authored length, but retaining this
field prevents a known solution from being mislabeled as an unknown solver failure.

Accordingly, `feasibility` is one of `solver-witnessed`, `stored-witnessed`, `proven-infeasible`,
or `unknown`. Keep this axis separate from `classification`, which describes how the cold solver
performed under the requested budget.

The solver's time budget is not always a hard wall-clock ceiling: repair-gated levels can receive
an additional repair allowance. For bounded testing, pass `--repair-budget-fraction=0`; for more
machine-independent comparisons, pass a `--work-budget` (or, legacy, `--node-budget`). Wall time remains useful but is
sensitive to CPU contention.

## Experimental discipline

Change **only `reqLen`** for the first sweep. Holding `reqInt` fixed isolates length pressure, but
it also means longer paths must avoid creating extra intersections. A later two-dimensional
`reqLen × reqInt` experiment answers a different question.

For credible comparisons:

1. Pin the commit, corpus, scheduler mode, budgets, range, and step. The report records all of
   these settings plus the Git commit.
2. Prefer a node budget when comparing commits or machines.
3. Treat parity-proven points, stored-witness points, cold solves, and budget-limited unknowns as
   distinct evidence classes.
4. Inspect node curves and attempt telemetry, not wall time alone.
5. Confirm interesting cliffs with a larger budget and nearby lengths.
6. Use ablation tooling afterward to test a specific heuristic hypothesis; this sweep observes the
   normal attempt portfolio and does not, by itself, establish causality.

The tool runs points sequentially. That avoids cross-run CPU contention and keeps timing easier to
interpret; use a narrow level/range sample while exploring before committing to a large sweep.
