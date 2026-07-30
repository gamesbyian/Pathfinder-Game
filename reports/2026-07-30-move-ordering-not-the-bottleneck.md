# Move ordering is not what separates solved from unsolved (2026-07-30)

Negative result. Killing a plausible idea before it became a training pipeline.

## The idea being tested

Every stress-corpus level ships a known-good solution (`stressMeta.witnessSolution`), and hundreds
of currently-unsolved levels also carry saved hints — roughly 2,750 correct trajectories through
levels the solver cannot rediscover. `scoreMove` already computes the right features; only its
*weights* are hand-tuned (`POLICY_PROFILES` in `solver/policy.ts`), and CLAUDE.md already documents
that several of those terms become actively self-defeating on near-Hamiltonian, high-`reqInt`
levels — which is roughly the unsolved population.

So: learn the weights from the known solutions, offline, and let better move ordering multiply the
existing budget instead of adding to it. Ordering is the exponent in tree search, the training data
was already on disk, and it is a "soft" mechanism (ordering only, win-check untouched), so it could
not produce a wrong answer.

Before training anything, one measurement had to come back positive.

## The measurement

`scripts/stress/witness-rank-diagnostic.mjs`. Replays every known solution through the real search
state and, at each distinct prefix, asks `scoreAndSort` — the exact function the search uses — to
order the real candidate list from `getNeighbors`. It records the rank of the **best acceptable
continuation**: the minimum rank across every known solution sharing that prefix. Solutions are
merged into a prefix trie so each state is scored once, and walked with `applyMove`/`undoMove`.

Minimum rank, not the rank of one arbitrary witness move, because at most states several moves are
genuinely fine and the solver only has to like one of them.

If the right move were routinely ranked last, ordering would be the bottleneck and its size would be
quantified. If it were ranked first or second, there would be nothing to learn.

## The confound, which carried the entire first result

The first run compared 25 unsolved against 25 solved levels using witnesses **and** hints:

| population | rank 0 | decisions/level |
|---|---|---|
| unsolved | 71.3% | 142 |
| solved | **78.4%** | **1,318** |

A 7-point gap in favour of the solved levels — exactly the lever the hypothesis predicted.

It was an artifact. Solved levels carry far more hints, so their tries hold far more acceptable
moves per state, and a **minimum** rank falls mechanically as the number of acceptable moves rises.
The gap measured hint abundance, not scoring quality.

## The controlled result

One solution per level (`--sources=witness`), 60 levels per population, matched decision counts:

| population | decisions | rank 0 | rank 1 | rank 2 | rank 3+ | absent |
|---|---|---|---|---|---|---|
| **unsolved** | 6,201 | **68.1%** | 24.1% | 7.5% | 0.3% | **0%** |
| **solved** | 5,762 | **65.1%** | 25.8% | 8.7% | 0.3% | **0%** |

The solver's ordering is **not worse on the levels it fails** — marginally better, if anything.
There is no ordering deficit on the failing population to close, so learned weights cannot
preferentially rescue it. Hypothesis rejected.

## Second negative, worth having on its own

`absent` — a move on a valid solution that `getNeighbors` does not offer — is **0% across ~12,000
decisions in both populations**. No prune is illegally rejecting a reachable move, at any point on
any known solution. That rules out a class of correctness bug that would have been invisible to
`check:hint-validity` (which proves stored hints are PLAY-valid, never that the search can reach
them).

## What separates the populations instead

Barely anything structural (corpus-2, 434 solved vs 1,266 unsolved):

| | solved (median) | unsolved (median) |
|---|---|---|
| `reqLen` | 90 | 99 |
| `reqInt` | 5 | 6 |
| grid cells | 144 | 169 |
| `reqLen` / navigable cells | 0.64 | 0.68 |

Small shifts, no cliff, no distinct family. Difficulty is not concentrated in ordering, not in
pruning, and not in a structural niche — it is spread thin across raw search-space size.

## The implication for where effort goes

At median length ~99 with ~68% first-choice accuracy in both groups, the expected cost of walking a
full solution is astronomically small either way; the solved 434 are the tail where budget and luck
sufficed. Anything that improves a **constant factor** — better weights, better tie-breaks, faster
nodes — is multiplying against an exponential. That is the likeliest explanation for why a
fortnight of hot-path and heuristic work moved the solved count so little.

The levers with the right shape change the exponent:

- **Bidirectional / meet-in-the-middle search.** Grow from the gate and backward from the goal,
  meet at `reqLen/2`. At median length 99 that is the difference between `0.68^99` and `0.68^50`.
  The difficulty is merging halves under the global `reqInt` and must-pass constraints, not the
  search. Composes with everything already built; needs no extra budget.
- **Exact methods (CP-SAT) offline**, for the rare-solution regime where heuristic search is
  structurally the wrong tool. The corpora never ship, so an offline exact solver carries no
  CSP/bundle cost, and the hint corpus explicitly accepts valid solutions found by any means.

## Reproducing

```
node scripts/run-bundled.mjs scripts/stress/witness-rank-diagnostic.mjs -- \
  --corpus=corpus2 --report=reports/stress/typical-budget-corpus2.json \
  --unsolved-only --sources=witness --limit=60
```

Swap `--unsolved-only` for `--solved-only` for the contrast group. **Always compare like with like
on `--sources`** — mixing hint-rich and hint-poor populations reproduces the confound above.
