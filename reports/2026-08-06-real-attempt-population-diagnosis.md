# The full real-attempt/starved-then-fair near-twin population: uniformly low scoring discrepancy, resists 5.5x budget (2026-08-06)

Follow-up to `reports/2026-08-06-r02751-differential-diagnosis.md` (one level) and
`reports/2026-08-06-near-twin-starvation-fix.md` (the starvation fix). Generalizes the
differential-diagnosis method to the rest of the near-twin population per the standing request:
investigate the 5 levels that are now fairly-budgeted-but-still-unsolved, and the 31-level
`real-attempt` population from `reports/2026-08-06-near-twin-solver-response-comparison.md`.

## Population

36 levels total (5 + 31, with `R02751` counted once — it's in both the original `real-attempt` list
and this report's methodology, already diagnosed individually): all near-twins of a level that solves
cheaply, all still unsolved after the workBudget-starvation fix. Of the original 36 ids, 2
(`R02141`, `R03224`) newly solved as a side effect of the starvation fix itself and are excluded from
what follows (34 remain genuinely unsolved).

## Part 1: witness-divergence, corpus-wide

Same method as the R02751 report — replay each level's own withheld `stressMeta.witnessSolution`
through the real search-core (`getNeighbors`/`scoreAndSort`/`applyMove`), measuring how far the
witness's actual move is from the solver's own greedy top choice at every step.

```
n=36, mean steps=95.5, mean cumulativeDiscrepancy=37.0, mean per-step rank=0.625
maxStepRank across ALL 36 levels, every step: 3   (never worse than the search's 4th-ranked candidate)
```

**Every single level in this population — not just R02751 — shows the same low-discrepancy shape.**
The full range (`R00720` at 19 up to `R02442` at 62) still never approaches the batch-B cluster's
22–35 reference signature for a *self-defeating-scoring-term* level over a comparable step count, and
critically, `maxStepRank` — the single worst move at any point in any of the 36 traces — never
exceeds 3. This rules out, population-wide, "the solver's own move-ordering repeatedly rejects the
correct move" as the shared explanation.

## Part 2: per-flag SCORE_* ablation, corpus-wide

For each of the 36 levels, each of 18 `SCORE_*` flags was disabled independently (via
`normalizeAblationConfig`, the same provably-correct sparse-override mechanism production uses) and
the discrepancy re-measured. **Not one of the 36 levels shows a single-flag swing ≥ 10 points** (the
threshold chosen to comfortably contain noise while still catching an R02248-shaped dramatic
collapse) — the largest swing anywhere in the whole sweep is ±7
(`R02657`/`SCORE_ADJ_TURN_URGENCY`, `R02751`/`SCORE_GOAL_ATTRACTION`,
`R03224`/`SCORE_FLIPPER_URGENCY`). This is a clean, uniform negative result: **no scoring term is
individually responsible for any level in this population.**

## Part 3: does more budget alone solve them?

Fair budget division alone (the starvation fix) didn't solve the 5, and low discrepancy doesn't by
itself prove a pure budget limit rather than some other structural block — so both were tested
directly at **5.5x the original ceiling** (`--node-budget=200,000,000`, `--work-budget` at the same
validated 1.34x ratio): all 5 starved-then-fair levels, plus a spread sample of 5 from the 31
`real-attempt` levels (lowest-discrepancy `R02296`, highest-discrepancy `R02442` and `R01683`, and
two levels named directly in the source reports, `R03148`/`R02548`).

```
R02657   200,000,145 nodes, 53.0s  -> still unsolved
R00477   200,000,053 nodes, 82.5s  -> still unsolved
R02911   200,000,006 nodes, 183.7s -> still unsolved
R00720   200,000,145 nodes, 91.2s  -> still unsolved
R02666   200,000,249 nodes, 136.9s -> still unsolved
R02296   200,000,145 nodes, 47.3s  -> still unsolved
R02442   200,000,224 nodes, 75.9s  -> still unsolved
R01683   200,000,068 nodes, 118.6s -> still unsolved
R03148   200,000,253 nodes, 162.7s -> still unsolved
R02548   200,000,165 nodes, 94.6s  -> still unsolved
```

**10 of 10 sampled levels remain unsolved at 5.5x the node ceiling.** This is not "close, just needs
a bit more" — a modest budget increase would be expected to tip over at least some of a 10-level
sample if the population were merely marginally under-provisioned. None did.

## Part 4: the dynamic pruning gauntlet (closing the gap flagged below)

Both the R02751 report and an earlier draft of this one flagged the same limitation:
`witness-divergence.mjs`'s replay (like `hint-divergence.mjs`'s, by the same established
convention) only exercises `getNeighbors`/`scoreAndSort`/`applyMove` — never the dynamic pruning
gauntlet (`evaluatePrunedMove`, `prune-gauntlet.ts`) that the real `dfsFromGate`/beam/repair search
loops actually run. A low scoring discrepancy rules out "the search's move-*ordering* sabotages
itself" but says nothing about "a lower-bound/connectivity/deadlock check falsely rejects continuing
along this exact path at some intermediate state" — the shape of bug CLAUDE.md's
`mustCrossForcedNeighborDeadlocked` and MST-scratch-buffer gotchas document elsewhere in this
codebase. This was closed directly: each of the 36 witnesses was replayed through
`evaluatePrunedMove` itself at every step, checking the verdict against `'reject'` — with
`runConnectivity: true` forced on **every** step (real DFS only checks connectivity on a throttled
schedule; repair-search never does at all — forcing it on every step here is *more* thorough than
either, since `isConnected` is documented as a sound prune regardless of how often it's actually
invoked, so any misfire it produces here is a real bug, not a throttling artifact).

```
36/36 levels: invalidAtStep=null, falseRejectAt=none, finalIsSolution=true
```

**No false prune anywhere.** The gauntlet never rejects a move that a valid, verified solution
actually takes, on any of the 36 witnesses, even under a stricter connectivity-check schedule than
production ever runs. This rules out the pruning gauntlet as an explanation for this population too
— the same clean, uniform negative result as the scoring-order check in Parts 1–2.

## Interpretation

Combining all three parts: this is a population where (a) the solver's own greedy scoring is, at
worst, one or two ranks off the correct move at literally every step of a real solution, (b) no
individual scoring term is responsible even in principle, and (c) 5.5x more search budget with fair
division doesn't close the gap either. The remaining, best-supported explanation is that **this
population's difficulty is a genuine property of the search-tree size relative to what DFS/beam
backtracking can cover in a bounded budget — not a routing gap, not a scoring bug, and not (simply)
an under-provisioned budget.** The correct path is locally easy to recognize as good at every step,
but the surrounding combinatorial space (73–130+ move solutions, dense must-pass/must-turn/flipper/
portal mechanic counts near this session's stress-corpus maxima) is large enough that even
near-optimal greedy guidance can't prune it down to a size 36M–200M nodes can exhaustively cover.

This matches — and substantially extends — `docs/ai-assisted-manual-solving.md`'s own conclusion
about this kind of level: "the puzzle's cleverness is a property of its combinatorics, not of who's
reasoning about it." A human (or AI) hand-tracing any one of these 36 witnesses would find the same
thing this replay found automatically: the path never looks locally wrong, it's just long and deeply
constrained.

## What this does not test, and what would be the next real lever

- **Not an admissible-bound tightening.** If the population's real bottleneck is that DFS/beam wastes
  most of its budget re-exploring structurally-equivalent dead branches rather than lacking direction,
  a tighter/new admissible lower bound (in the spirit of the mustCross/mustPass bound work already in
  `lower-bounds.ts`) would matter far more than another scoring tweak or a bigger budget — and this
  diagnosis is consistent with, though doesn't prove, that being the actual lever.
- **Not corroborated across a symmetry family.** Per CLAUDE.md's ablation-validation bar, a single
  level's divergence needs family corroboration before a *positive* causal claim is trusted — this is
  a *negative* result reproduced across 36 independent levels instead (a different, arguably stronger
  form of corroboration for "no scoring term is responsible"), but it says nothing about whether e.g.
  R02751's rotated/reflected siblings would show the same shape, which a future investigation of a
  specific mechanism could still check.

## Reproduce

```bash
node scripts/run-bundled.mjs scripts/stress/witness-divergence.mjs \
    --corpus=data/stress/stress-levels-random.json \
    --levels=R02657,R00477,R02911,R00720,R02666,R02363,R02252,R02296,R01009,R03148,R00094,R02442,\
R02063,R02046,R02141,R02751,R02266,R02031,R01487,R02598,R01318,R01325,R01672,R02906,R02365,R02366,\
R02643,R02503,R01683,R02903,R02199,R02734,R02249,R02531,R03224,R02548 \
    --out=<file.json>
```

Per-flag ablation and the 200M-node high-budget test were run via scratch scripts (not committed —
same shape as `hint-divergence.mjs`'s existing per-flag loop and a plain `Solver.solve()` call
respectively; a committed corpus-wide per-flag-ablation tool would be a reasonable follow-up if this
technique is used again at this scale).
