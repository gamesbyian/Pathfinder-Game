# Portfolio solve-only sweep — in-envelope stratum (combined)

Generated: 2026-08-06T05:22:15Z (positions 1-181) + 2026-08-06T05:29:00Z (positions 182-200),
combined via `npm run solver:combine-corpus2-batches`.

Corpus: data/stress/stress-levels-envelope.json (200 levels, `--envelope-caps`)
Scheduler mode: legacy
Budget: 60000ms
Node budget: 20000000
Workers: 4

- Solved: 124/200 (62.0%)
- Unsolved: 76/200
- Hints saved: 124 level(s), data/stress/hints-envelope/

This run was interrupted by its own shell-level `timeout 590` wrapper at 181/200 levels
(111 solved) and completed by a second pass over the remaining positions 182-200 (13 more
solved) — the two partial reports were combined by id, not re-run from scratch. See
reports/2026-08-06-game-rules-solver-alignment-plan.md Section 4 for how this stratum
compares against stress-levels-random.json's own solve rate.
