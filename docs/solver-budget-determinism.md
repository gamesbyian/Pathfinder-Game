# Solver budgets: why there are two currencies, and what shape would be better

Status: **analysis + proposal, nothing implemented.** Written 2026-07-30 after the hot-path speed
work ([`reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md))
kept running into the same obstacle: you cannot A/B the solver without first building a
deterministic harness, because the production solver's *behaviour* depends on how fast the machine
running it happens to be.

## The finding

Hint provenance already records the answer. Scanning all three corpora (49,890 hints, 115,139
provenance entries) for groups of entries identical in **every** recorded field — same
`solver.version`, technique, profile, template, beam width, gate, budget, seed, termination reason —
i.e. genuine repeat runs of the same computation:

| repeat-run groups (same code, config, budget, seed) | 3,713 |
|---|---|
| reproduced `nodesExpanded` exactly | 587 (**15.8%**) |
| did **not** reproduce | 3,126 (**84.2%**) |

Within a non-reproducing group, the max/min `nodesExpanded` ratio is **median 3.18x, p90 855x, max
~99,822x**. These are not marginal wobbles; the same solve is routinely doing 3x — sometimes orders
of magnitude — more or less work run to run.

(Reproduce: the scan is a few dozen lines over `data/hints/`, `data/stress/hints/`,
`data/stress/hints-random/`. This is the same data `scripts/stress/hint-cost-drift.mjs` mines for
cross-commit cost drift — and it explains why that tool's own doc has to warn that a drift row is
"a lead, not a verdict". Most of its signal is machine noise, not code change.)

## Why there are two currencies

Not a design decision — an accretion, and the history is legible in the code.

**Wall clock started as a product constraint.** Play-mode's "Find a Hint" shows a progress bar scaled
to ~30s; Review Mode the same. `timeBudgetMs` is a *latency promise to a human*, and as such it is
completely legitimate.

**Then it became the allocator.** `orchestration.ts` divides that same latency promise among gate ×
config pairs:

```js
const pairShare = Math.floor((timeBudgetMs - elapsed) / pairsLeft);
...
let attBudget = minFrac > 0 ? Math.max(Math.floor(gateShare * minFrac), pairShare) : pairShare;
if (attBudget < 50) return { solution: null, attempts };
```

`elapsed` is wall clock. So **how much search each attempt gets is a function of how fast the machine
is**, and it compounds: a slow first attempt shrinks every later one, and once `attBudget` drops
below 50ms the entire remaining ladder is abandoned. Machine speed does not perturb one decision — it
reshapes the whole attempt schedule. That is the dominant source of the 84.2%.

**Node budgets were retrofitted, twice, both times as incident response.** `runRepairProbe` and
`dfsFromGateLDS` each had a wall-clock-gated *decision* traced to a specific reproducibility bug (see
`docs/solver-architecture.md`'s "Wall-clock-gated search probes" and
`reports/solver-determinism/determinism-report.md`), and each was fixed by adding a node cap
**alongside** the existing ms cap — explicitly "in ADDITION to, never a substitute for". Both fixes
were correct and both were local. Nobody has touched the top-level allocator, which is where most of
the non-determinism lives.

So `SolveOpts.nodeBudget` exists, and the ladder already knows how to divide a *node* remainder
(`remainingNodeBudget = nodeBudget - nodesExpanded`, recomputed before each attempt, right next to the
ms division). The machinery is there; ms is simply the currency that drives allocation and nodes is
an optional external cap used only by offline tooling.

## What it costs

- **Every solver A/B needs a bespoke deterministic harness** or it measures the host. Half the
  verification effort in the speed work was building and validating that harness.
- **`logs/solver-baseline.json`'s recorded totals are not comparable to a local run** — different
  machine, different commit. `solver:bench --check` prints a cost delta against them anyway.
- **Corpus refreshes shard across 20 GitHub Actions runners.** Which levels solve depends partly on
  which runner drew which slice, and how loaded it was.
- **Provenance's cost signal is mostly noise**, per the numbers above.
- **Players get different solvers.** A phone and a desktop run materially different searches for the
  same "30 seconds".
- **Bugs hide.** The flood-fill staleness bug in the speed work produced a 39-node divergence in
  4.4M. Against a 3.18x median run-to-run spread, that signal is invisible without a node-budgeted
  harness — and 6.6M differential comparisons had already missed it.

## The better shape

**One currency for allocation (nodes). Wall clock demoted to a deadline that never sizes anything.**

1. **The ladder allocates nodes.** `solveLevel` divides a *node* remainder among gate × config pairs
   exactly as it now divides a ms remainder. Everything structural carries over untouched, because
   it is all ratios and is currency-agnostic already: `minBudgetFraction`, `adaptiveGateWeight`,
   `REPAIR_EXTRA_BUDGET_FRACTION`, `ATTRACTION_DIVERSITY_BUDGET_FRACTION`,
   `ADMISSIBLE_ORDER_BUDGET_FRACTION`.

2. **Wall clock becomes a single outer deadline.** One check: past the deadline, abort. It never
   computes a share. Machine speed can then only *truncate* a run, never reshape it — and truncation
   becomes one observable event to record in provenance (`haltedByDeadline`), instead of silently
   resizing every attempt.

3. **Calibrate nodes↔ms once per process, not per decision.** Measure nodes/sec during prep (or use a
   stored constant), set `nodeBudget = targetMs × nodesPerSec`. The UI still gets its ~30s promise;
   the *result* depends only on the node budget. Same-machine reproducibility becomes exact.
   Cross-machine reproducibility becomes exact whenever the node budget is pinned — which CI, the
   regression gate, and corpus refreshes should all do.

4. **Keep the deadline generous** relative to the calibrated node budget (~1.5x), so it fires only on
   genuine pathology rather than routinely.

### The honest tradeoff

A node is not a constant amount of time — a node on a portal-heavy 15×15 costs more than on a sparse
grid, and this branch's own speed work changed nodes-per-second by ~20-30%. So a fixed node budget
gives *variable wall time*. This proposal deliberately trades latency predictability for result
reproducibility, with the deadline as the backstop on the tail. For an offline corpus tool that is
obviously right. For the in-game hint button it is a real product decision, which is why the
calibration step (3) matters: it keeps the *typical* case on its latency promise.

Flipping the allocator **will** change which levels solve — some up, some down. That is a one-time
re-baseline, and it should be evaluated as a trade with the same paired-population discipline the
speed work used, not waved through.

### Migration path

Incremental, because this touches every search entry point.

- **Phase 0 — measure.** Record `nodesPerSec` in provenance. Confirm the calibration constant is
  stable enough per level archetype to be usable.
- **Phase 1 — make the allocator currency-parametric.** It already divides a remainder; make
  "remainder" pluggable. Ship with ms still selected, so behaviour is unchanged — and *verify* that
  with the node-identity harness (`npm run solver:speed-probe`, `--node-budget` with a non-binding
  `--budget-ms`, `nodesExpanded` bit-identical).
- **Phase 2 — flip the default to nodes** behind an ablation flag, A/B across all three corpora.
  Expect solve-set churn; evaluate it as a trade.
- **Phase 3 — delete the ms allocator**, keep the deadline, and drop the now-redundant node caps that
  were retrofitted onto `runRepairProbe` / `dfsFromGateLDS`.

### What not to do

Do not keep converting individual ms-gated decisions to node budgets one incident at a time. That is
what has happened twice already; each fix was right and each left the top-level allocator — the
dominant source — in place. The next such fix should be Phase 1, not a third local patch.
