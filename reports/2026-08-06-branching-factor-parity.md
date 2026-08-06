# Branching factor after admissible pruning: the unsolved population isn't locally bushier (2026-08-06)

Follow-up to `reports/2026-08-06-real-attempt-population-diagnosis.md`, which ruled out scoring-order
sabotage and false dynamic pruning for the 36-level near-twin population and landed on "genuine
combinatorial search-tree size" as the remaining explanation, pointing at a tighter admissible bound
as the next lever worth pulling. This sharpens that conclusion: is the unsolved population's tree
actually *bushier* than its cheaply-solved twins', or is something else going on?

## Method

For each level's own withheld witness, replayed it move-by-move as before, but at every step with
more than one legal candidate, applied **every** legal neighbor (not just the one the witness takes)
through `evaluatePrunedMove` (with `runConnectivity: true`, same maximal-thoroughness choice as the
pruning-gauntlet check) and counted how many survive — i.e. the REAL effective branching factor DFS/
beam would face at that node after every currently-enabled admissible prune has already run, not just
raw move-legality. Each candidate was applied via `applyMove`'s own `UndoToken` and reverted via
`undoMove` (the exact mechanism `dfsFromGate` itself uses), so this measures the genuine post-prune
branching factor, not an approximation.

Run over all 36 near-twin unsolved levels **and** their 35 unique solved twins (two unsolved levels,
`R01009`/`R02249`, happen to share the same twin, `R01211`) for a direct, paired comparison.

## Result

```
unsolved population:  meanPrunedBranch  mean=2.100  (range 1.81-2.46, n=36)
solved twins:          meanPrunedBranch  mean=2.082  (range 1.81-2.34, n=35)

per-pair delta (unsolved − its own solved twin): mean=+0.018, range [-0.21, +0.30]
pairs where the unsolved level has HIGHER branching than its twin: 19/36 (a coin flip)
```

**No systematic difference.** The population-level means differ by 0.018 — noise, not signal — and
the per-pair deltas straddle zero with the unsolved level on the higher side barely more than half
the time. Whatever separates a level that solves in under 1,000 nodes from its near-identical twin
that exhausts 200,000,000, it is **not** that the harder one offers more real, pruning-survived
choices at each step along a known-good path.

## Interpretation

This sharpens (not just repeats) the prior report's conclusion. "Genuine combinatorial search-tree
size" was correct but under-specified — it left open whether the tree is bigger because each node has
more live children (a *branching-factor* problem, which a tighter per-step bound would directly
attack) or because a wrong branch, despite looking exactly as locally constrained as a right one, only
reveals itself as dead much *deeper* in (a *backtracking-depth-to-detection* problem, which a
per-step bound doesn't help with — the existing bounds already prove every wrong step invalid
eventually, just too late to matter within budget). This result rules out the first shape directly:
local branching is statistically identical between the two populations. The second shape — how many
steps a dead branch survives before any existing bound (mustPass/mustCross/distance/parity/
connectivity) can prove it dead — is the more likely remaining explanation, and is **not** measured
here; it would need real search instrumentation (tracking each DFS backtrack's depth from its own
commitment point to the node where a prune finally fires), not a witness replay, since a replay only
ever walks the *correct* path and has no wrong branches to measure backtrack depth on.

## Part 2 (same day): a first, weak look at that depth-to-detection question

Real per-backtrack instrumentation would mean touching `dfsFromGate` itself — hot-path solver code,
which needs the full `solver:bench --check` + before/after cost-comparison rigor CLAUDE.md requires
for that file, not a same-day exploratory pass. As a cheaper first look that changes no solver source
at all: at sampled multi-candidate witness steps, every non-witness candidate that survives
`evaluatePrunedMove` was followed by a **pure greedy line** (repeatedly taking the single top-scored
survivor via `scoreAndSort`, own `applyMove`/`undoMove` bookkeeping, no backtracking) up to a 60-step
cap, measuring how many steps it survives before every option is pruned. This is a cruder proxy than
real backtrack-depth — a single greedy line is not what DFS actually explores at a branch (DFS tries
every surviving candidate, not just the top-scored one) — so treat this as suggestive, not decisive.

10 paired levels (the same shape as the branching-factor comparison, a subset of the 36/35):

```
mean survival depth, unsolved:  13.02  (range 5.4-18.1)
mean survival depth, solved:    10.97  (range 4.2-19.0)
per-pair delta (unsolved − twin): mean=+1.75, stdev=6.17, 8/10 pairs positive
```

Unlike the branching-factor result, this is **not a clean null** — the mean delta leans in the
expected direction (wrong branches surviving a bit longer on the harder population) — but it is not a
clean confirmation either: a standard deviation of 6.17 against a mean of 1.75 (one pair, `R02666`,
swings −13.5 the other way) means this signal cannot be distinguished from noise at n=10 without a
much larger sample or the real (non-greedy) backtrack-depth measurement. Recorded honestly as
**inconclusive, mildly suggestive** — the next legitimate step, if this is worth pursuing further, is
either a larger sample at the same (cheap, safe) greedy-survival proxy, or the real instrumented
`dfsFromGate` backtrack-depth measurement this was standing in for.

**Update (same day, `reports/2026-08-06-backtrack-depth-instrumentation.md`):** that real
instrumentation was built and run. It gives the same shape of answer as this proxy did, more
decisively — a clean null (mean delta +2.99, stdev 14.12, t≈0.67, not significant) — confirming DFS's
real backtracking cost is not the differentiator either, with the important caveat that it only
measures DFS's own behavior, not why the twins' actual winning technique (usually beam) solves them
fast. See that report for the full result and what it leaves open.

## What this means for "pull the admissible-bound lever"

A *new per-step* bound (one more `PRUNE_*` check added to `evaluatePrunedMove`'s existing list, in
the shape of `mustPassLowerBound`/`mustCrossLowerBound`) is not obviously the right shape of fix if
this finding holds — it would need to cut branching at nodes that are already statistically
indistinguishable from a twin's genuinely-good nodes, which is a much harder bar to clear without
also risking false rejections (exactly the soundness risk CLAUDE.md's MST-scratch-buffer/
`mustCrossForcedNeighborDeadlocked` gotchas warn is easy to get wrong). The more promising lever
implied by this result is instead something that shortens backtracking on wrong branches specifically
— e.g. a bound that fires *earlier* on an already-existing, already-sound check (tightening WHEN an
existing prune is evaluated or how far ahead it looks, not adding a new one), or a search-order change
that makes wrong branches get abandoned sooner rather than making them fewer. Neither is validated
here — this report only narrows which shape of intervention is worth investigating next, consistent
with this session's own measure-before-build discipline.

## Reproduce

Run via a scratch script (not committed — same shape as `witness-divergence.mjs`'s replay loop, with
`evaluatePrunedMove` applied to every candidate via `applyMove`/`undoMove` instead of just the
witness's own choice; a committed version would be a reasonable follow-up if this measurement is
used again). The 36 unsolved ids and their 35 solved-twin ids are listed in
`reports/2026-08-06-real-attempt-population-diagnosis.md` and
`reports/2026-08-06-near-twin-solver-response-comparison.md` respectively.
