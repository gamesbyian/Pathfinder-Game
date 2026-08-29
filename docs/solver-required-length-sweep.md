# Required-length solver sweep

`solver:req-length-sweep` is an offline research tool that holds geometry, objects, `reqInt`, gates, and goal fixed while varying exact `reqLen`. It never edits source corpora/hints or runs in the game.

Use it to map tested length sensitivity, parity-proven impossibilities, work/runtime cliffs, winning-technique transitions, and solved intervals/islands. It is primarily a **controlled within-level diagnostic**, not a population-generalization test.

## Quick start

```bash
npm run solver:req-length-sweep -- \
  --levels=pos:1-10 \
  --min=10 --max=80 --step=2 \
  --repeats=3 \
  --work-budget=5000000 \
  --budget-ms=60000 \
  --repair-budget-fraction=0 \
  --output=logs/req-length-sweep/published-1-10.json
```

Use a non-binding wall deadline when the question is deterministic search work. Defaults remain `data/levels.json`, `pos:1`, authored `reqLen ± 10` clamped to ≥1. `--levels-json=<path>` selects another corpus. This tool uses position-only selectors: `pos:7`, `pos:1-20`, or `all`; no `id:`.

## Options

| Option | Default | Meaning |
|---|---:|---|
| `--levels=<spec>` | `pos:1` | `parseLevelPositions` position selection |
| `--levels-json=<path>` | `data/levels.json` | Bare-array or `{levels:[...]}` corpus |
| `--min=<n>` / `--max=<n>` | authored ±10 | Inclusive positive bounds |
| `--step=<n>` | `1` | Positive increment |
| `--repeats=<n>` | `1` | Stability repeats; does not deliberately vary seed |
| `--budget-ms=<n>` | `1000` | Wall-time deadline/run; make non-binding for deterministic capability comparisons |
| `--work-budget=<n>` | unlimited | Preferred machine-independent work cap; see [`solver-budget-determinism.md`](solver-budget-determinism.md) |
| `--node-budget=<n>` | unlimited | Legacy/technique-specific cap; not cross-technique comparable |
| `--repair-budget-fraction=<n>` | solver default | Use `0` for a bounded diagnostic when repair overrun would confound the question |
| `--scheduler-mode=<mode>` | `production` | `production` or opt-in `legacy-latency-portfolio-experiment` (legacy aliases `legacy`/`portfolio-experiment` accepted, normalized internally) |
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

Repair can extend wall time beyond `--budget-ms`; use `--repair-budget-fraction=0` when repair participation is not part of the experiment. Prefer `--work-budget` for machine-independent comparisons. Wall time remains useful for speed but load-sensitive.

## Experimental discipline

First sweeps change **only `reqLen`**. Fixed `reqInt` isolates one axis of puzzle input, but changing length can still alter the feasible solution topology drastically. Do not interpret a smooth or jagged solve curve as a direct causal law of “length difficulty” without checking actual feasibility/solution structure.

Points from one base level are **paired/correlated variants**, not independent samples. Twenty lengths from one geometry do not equal twenty independent levels. For cross-level inference, summarize effects by parent/base level and confirm across unrelated geometries.

For decision-bearing comparisons:

1. pin commit, corpus, scheduler, work/budgets, range, step, and evidence role;
2. prefer `workBudget` across commits/machines and make wall deadlines non-binding;
3. keep parity proof, stored witness, cold solve, and budget-limited unknown distinct;
4. inspect `workSpent`, within-technique nodes, and attempt telemetry, not wall time alone;
5. distinguish a **search cliff** from a **feasibility cliff** with stored/exact/reference evidence where possible;
6. if a surprising length was selected because the sweep made it look extreme, use it for diagnosis but do not call a follow-up on the same curve independent confirmation;
7. if several ranges/steps/metrics were inspected before choosing a pattern, report that selection;
8. use ablation/shadow/divergence tooling only to test a concrete mechanism nominated by the sweep;
9. confirm any production-facing rule on unrelated levels/parents and at matched total work.

A larger budget can convert `unknown-within-budget` to solved, but that does not prove the original cliff was “just starvation”; compare search state/technique progression before prescribing more budget.

## Scaling campaigns

Do not expand immediately to `reqLen × reqInt × density × objects`. Multi-axis sweeps grow combinatorially and make retrospective pattern finding easy.

Prefer:

1. narrow one-axis pilot;
2. identify a specific hypothesis and summary statistic;
3. choose a small factorial/controlled follow-up that separates competing explanations;
4. group by original parent level;
5. stop when the result no longer changes a live research decision.

Points run sequentially to avoid cross-run CPU contention. Explore narrow ranges/populations before large sweeps, and query existing sweep artifacts before generating replacements.