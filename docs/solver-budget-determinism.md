# Solver budgets: why there are two currencies, and what shape would be better

Status: **Phase 0 (measure) and Phase 1 (single allocation point) done; Phase 2 (the currency
switch, which changes behaviour) not started.** Written 2026-07-30 after the hot-path speed
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

3. **Turn `targetMs` into a node budget from COMMITTED calibration data, not a live measurement.**
   See "Phase 0 result" below: a single global nodes/sec constant does not work, because nodes/sec
   varies 12–20x *across levels on one machine*. But that variance is a property of the level, and it
   is knowable offline. So: a generated per-level (or per-archetype) nodes/sec table, committed like
   `level-heatmaps.json`, gives `nodeBudget = targetMs × calibratedRate(level)`. That keeps the
   budget **deterministic** (it is data, not a live clock reading) while still landing near the
   intended wall time. A live warm-up measurement would reintroduce exactly the machine dependence
   this is trying to remove, and must not be used.

4. **Keep the deadline generous** relative to the calibrated node budget (~1.5x), so it fires only on
   genuine pathology rather than routinely.

### Phase 0 result — measured, and it changes the proposal

Nodes/sec per level, from the speed-probe runs on this branch (levels with >100ms and >10k nodes, so
timing noise is not the story), same machine throughout:

| corpus | p10 | p50 | p90 | p90/p10 |
|---|---|---|---|---|
| published | 0.18M/s | 0.30M/s | 2.12M/s | **11.9x** |
| corpus-2 | 0.10M/s | 0.17M/s | 1.95M/s | **19.6x** |

So the "calibrate once per process" idea in the first draft of this document was wrong. A single
global constant would make wall time vary by an order of magnitude across levels — far worse than
today's behaviour for the in-game hint button. The variance is dominated by *which level* is being
solved (grid density, portals, landmark constraints all change the per-node cost), not by the host.

That is why step 3 above calls for committed per-level/per-archetype calibration data rather than a
constant or a live measurement.

### The honest tradeoff

There is a genuine tension, and it cannot be fully resolved:

- **Deterministic results** need a budget that does not depend on how fast the machine is.
- **Predictable latency** needs a budget that does.

You can have one or the other for a given call. The resolution is to pick per context rather than
pretend a single answer exists:

- **Offline: CI, `solver:bench`, corpus refreshes, hint discovery, any A/B.** Reproducibility is the
  entire point and wall time is nobody's promise. Pin the node budget; results become exactly
  reproducible across machines and runners.
- **In-game hint button / Review Mode.** The latency promise is real and per-device reproducibility
  is not actually a product requirement. Calibrated node budget (step 3) for the typical case, with
  the wall-clock deadline as the backstop.

Note also that calibration data goes stale when the solver's speed changes — this branch alone moved
nodes/sec by 20–30%. That is tolerable because the budget only needs to be approximately right (the
deadline covers the error), and staleness is a checkable condition rather than a silent one.

Flipping the allocator **will** change which levels solve — some up, some down. That is a one-time
re-baseline, and it should be evaluated as a trade with the same paired-population discipline the
speed work used, not waved through.

### Migration path

Incremental, because this touches every search entry point.

- **Phase 0 — measure. DONE** (see "Phase 0 result" above). Outcome: a global constant is not
  viable; per-level/per-archetype calibration data is required. Recording `nodesPerSec` in
  provenance is still worth doing to build that table from real runs.
- **Phase 1 — collapse the allocation arithmetic to one currency-agnostic function. DONE.**
  `attemptBudgetShare` (`orchestration.ts`) is now the solver's single attempt-budget allocation
  point; both attempt loops route through it, and the two formulas — which differed only in the
  floor base — are no longer duplicated inline. Strict no-op: unit-tested against the pre-extraction
  inline formulas over 5,000 randomised inputs, plus `solver:bench --check` 160/160. Phase 2 now
  changes that function's two call sites, not the arithmetic.
- **Phase 2 — flip the default to nodes** behind an ablation flag, A/B across all three corpora.
  Expect solve-set churn; evaluate it as a trade.
- **Phase 3 — delete the ms allocator**, keep the deadline, and drop the now-redundant node caps that
  were retrofitted onto `runRepairProbe` / `dfsFromGateLDS`.

### What not to do

Do not keep converting individual ms-gated decisions to node budgets one incident at a time. That is
what has happened twice already; each fix was right and each left the top-level allocator — the
dominant source — in place. The next such fix should be Phase 1, not a third local patch.
