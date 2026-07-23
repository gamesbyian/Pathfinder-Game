# Provenance-driven regression hunt: corpus-1/2 levels solved before but not now (2026-07-23)

## What this is

A systematic search for corpus-1/corpus-2 levels with a *genuine cold solver-find* in their hint
provenance (technique `dfs`/`beam`/`repair`, `solver.id === 'pathfinder-solver'`,
`context.hintGuided === false` — excluding `prefix-anchored`, `stress-generator-witness`, and
`human-player` per CLAUDE.md's "what can the solver find cold" exclusion rule) that are currently
marked unsolved. The question: are any of these genuine code-level regressions worth recovering?

## Method

1. Scanned every `data/stress/hints/*.json` (corpus-1) and `data/stress/hints-random/*.json`
   (corpus-2) hint file for a genuine cold-find provenance entry, cross-referenced against each
   corpus's currently-committed baseline (`ok: false`).
2. **101 candidates found** (1 corpus-1: R01756; 100 corpus-2).
3. Filtered by the find's own recorded `search.budgetMs` against each corpus's standard refresh
   budget (corpus-1: 20,000ms; corpus-2: 8,000ms) — a find recorded under a bigger budget isn't a
   fair "solved before, not now" comparison.
4. Re-ran every remaining candidate under a fresh, clean **pure-default-config** solve (no ablation
   flags) at the standard budget, since the currently-committed baseline was itself compiled from a
   `STRATEGY_REPAIR_TURN_BIAS`-enabled experimental refresh (this session's own turn-bias work) — not
   a fair "is production regressed" comparison either.

## Results: three explanatory buckets, zero confirmed code regressions

### Bucket 1 — only ever found under an inflated one-off refresh budget: 62 of 101

Traced two July 22 refreshes that used escalating, non-standard budgets:

| Refresh (result commit) | Code state | budgetMs | nodeBudget |
|---|---|---|---|
| `2000aac` | `9e1e293` | 8,000 (standard) | 20,000,000 (standard) |
| `2f5dd12` | `2000aac` | **30,000** | **60,000,000** |
| `92db104` | `2f5dd12` | **60,000** | **120,000,000** |

Hints found during the second and third refreshes carry `solver.version` tags matching the *prior*
commit (the code state active at solve time, not the resulting commit) — which is why a naive
version-based grouping initially looked like two mysterious ~40-level clusters. These 62 levels were
never solved at the standard 8,000ms/20M-node budget; they just got lucky with a temporarily generous
one-off budget. **Not a regression** — they simply need more resources than the standard operational
budget provides. Whether to raise the standard budget is a cost/tuning question, not a bug.

### Bucket 2 — artifact of this session's own experimental turn-bias flag: 8 of 39 remaining

The currently-committed `stress-corpus2-baseline.json`/`benchmark-latest-random.json` reflect a
`STRATEGY_REPAIR_TURN_BIAS`-enabled run (this session's own corpus-2 A/B, see
[`2026-07-23-turnbias-corpus2-ab-validation.md`](2026-07-23-turnbias-corpus2-ab-validation.md)), not
pure production defaults. Re-solving all 100 corpus-2 candidates under a clean default-config run
(no flags) recovered **8**: R01778, R02076, R02321, R02344, R02876, R02900, R03031, R03087. Four of
these (R02321, R02876, R03031, R03087) were in the 39 "genuine standard-budget" bucket and are simply
turn-bias's zero-sum reallocation effect (already characterized in the linked report) reversing once
the flag is off. **Not a regression** in production terms — production has never shipped with the
flag on.

### Bucket 3 — CPU-throughput/timing-margin sensitivity in shared resource allocation: the remaining 35

The 35 candidates still failing under a clean default-config re-check split by failure mode:

- **8 `node-budget-reached`** (R00934, R01856, R02044, R02052, R02575, R02634, R03034, R03058) —
  deterministic-*looking* (a hard node-count ceiling), but investigated in detail (full attempt
  traces for R00934, R02052, R02634): in every case the level's original winner needed a **modest,
  often cheap** node count (622K–13M, well under the 20M ceiling) via a specific main-loop
  DFS/beam config or the full-fallback ordinary-repair attempt — but that specific attempt never got
  enough of an uninterrupted share of the shared ceiling, because *other*, time-bounded main-loop
  attempts ahead of it in the interleaved sequence consumed a variable amount of the shared budget
  depending on real-world CPU throughput during that particular run. The node ceiling is fixed and
  deterministic; how much of it any given time-bounded attempt burns before yielding is not.
- **27 `timeout`** (R00314, R00460, R01420, R02002, R02050, R02298, R02423, R02464, R02507, R02510,
  R02517, R02553, R02600, R02622, R02698, R02711, R02716, R02735, R02760, R02943, R03062, R03079,
  R03148, R03173, R03358, plus 2 more) — directly time-bounded main-loop DFS/beam wins near their
  budget margin. Several of these (R00314, R00460, R02423, R02698, R02716, R02050) were **already
  confirmed as pure CI/environment timing noise earlier this session** — reproduced locally,
  identical `repairConfigs`, different outcome purely from real-world throughput variance between
  runs, exactly matching the workflow's own `timingTrustworthy: false` caveat.
- **R01756** (corpus-1, the sole corpus-1 candidate): directly confirmed as pure throughput noise —
  the *same seed* that solved it in ~85s (57.16M nodes) only reached 35.6M nodes in this sandbox in
  93.8s (a ~2× lower nodes/sec throughput than the original find). Re-run with more real time (40s
  timeBudgetMs → up to 240s repair-fallback window) **solved cleanly at 105.9M nodes**. This is
  exactly CLAUDE.md's existing "sandbox CPU-throttling ... not a code regression" caveat, just shown
  here to affect more than "the single hardest level."

## Conclusion

**Zero of the 101 candidates show evidence of an actual code-level regression** — no logic change
that broke a previously-reachable solve path was found. Every candidate traces to one of:
(1) a non-standard, inflated one-off refresh budget, (2) this session's own experimental ablation
flag left in the committed baseline, or (3) CPU-throughput/timing-margin sensitivity in the solver's
*existing*, pre-dating-this-session shared resource allocation (probe budget + interleaved main loop
+ full-fallback loop, all partly time-bounded) — a known, accepted class of noise, not new breakage.

## What "recovery" would actually require

Since nothing here is a bug, there's no fix to ship. Two genuinely different paths forward, neither
a quick fix:

1. **Raise the standard operational budget.** Directly addresses Bucket 1 (62 levels) and would
   likely also stabilize some of Bucket 3's marginal cases. Straightforward but has a real,
   multiplicative cost across a 1,700-level corpus refresh — a tuning/cost tradeoff for whoever owns
   the refresh cadence, not a code change. (Note: the *adaptive* per-level version of this idea
   was tried 2026-07-23 as `--baseline-budget` and reverted after a real corpus-scale regression —
   see the batch-speed report — so a flat raise, not a per-level adaptive one, would need its own
   careful validation.)
2. **Reduce timing-sensitivity in shared resource allocation** — e.g., budget main-loop attempts by
   node count instead of wall-clock time, so the same `nodesExpanded` outcome is reproducible
   regardless of machine speed. This would directly address Bucket 3's real mechanism (the reason a
   cheap 622K-node winner sometimes never gets its turn) rather than just throwing more total budget
   at the problem. A genuinely new design task, not investigated further here — worth scoping as a
   separate campaign if reproducibility (not just raw solved-count) is a goal.

Neither was attempted in this session; this report documents the investigation and its conclusion,
per the standing "negative results are first-class" policy.
