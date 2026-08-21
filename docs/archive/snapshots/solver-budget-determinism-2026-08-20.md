# Solver budgets: why there are two currencies, and what shape would be better

Status: **DONE for the solver core and for hint discovery.** The attempt ladder and all four search
techniques now budget in one canonical work unit (`modules/solver/work-meter.ts`); the hint-ablation
generator's phase ladder does too. `timeBudgetMs` survives only as an outer deadline that can truncate
a run, never as an input to any allocation or escalation decision. Given an explicit `workBudget`
**and a deadline that never fires**, a solve is bit-identical on any host under any load — verified
below.

> **Correction (2026-07-31).** That sentence used to end at "under any load", and it was wrong in a
> way that mattered. A deadline that *truncates* still selects which attempts run, and therefore the
> result — so "only an outer deadline" is not the same as "does not affect the answer". At the corpus
> refresh's default `--budget-ms=8000` the clock is the **binding** constraint on the slow tail, and
> two refreshes on identical solver code came back with 5 flipped corpus-2 levels. See
> [`reports/2026-07-31-refresh-nondeterminism.md`](../reports/2026-07-31-refresh-nondeterminism.md)
> and "How to get a reproducible run today" below.
Written 2026-07-30 after the hot-path speed
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

### Phase 2 result — determinism confirmed, solvability budget-sensitive

**The determinism claim holds, demonstrated directly.** 40 published levels, run quiet and then under
5 competing CPU hogs:

| allocator | solved-set flips (quiet vs loaded) | levels with different `nodesExpanded` |
|---|---|---|
| `'ms'` (3s wall budget, production-shaped) | **1** | **5 / 40** |
| `'nodes'` (1M node budget) | **0** | **0 / 40** |

The node allocator returned bit-identical results — same solved set, same 2,875,129 total nodes —
while its wall time moved 2.82s → 3.55s under the load. The ms allocator lost a solve and rewrote
five levels' node counts for no reason other than the machine being busy. That is the whole argument
for the migration, and it reproduces on demand.

**Solvability is a different story, and it is budget-sensitive.** Published corpus, same binary, only
the currency changed:

| per-level budget | `'ms'` | `'nodes'` | net |
|---|---|---|---|
| 1M nodes ≈ matched total work vs a 3s wall budget (40-level sample) | 40/40 | 38/40 | **−2** |
| 250k nodes/level (160 levels) | 144/160 | 140/160 | **−4** (13 lost, 9 gained) |
| 3M nodes/level (160 levels) | 151/160 | 157/160 | +6 — **but confounded, see below** |

The 3M row is not evidence for the node allocator. With a 600s wall budget the ms allocator has
nothing meaningful to divide, so it hands the first attempt a giant slice which then eats the entire
node cap and the rest of the ladder never runs. That is the real lesson of these three rows:
**the two allocators are not interchangeable — each only works when its own currency is the binding
constraint.** You cannot flip the currency and keep the existing budgets; the node budget has to
become a properly calibrated primary constraint (step 3), not a cap bolted onto an ms-shaped ladder.

Not yet measured: corpus-1 and corpus-2 under the node allocator, and any calibrated-budget
comparison. Those are the prerequisites for a default flip, alongside step 3.

### Why a node is not yet a currency — the blocker for flipping the default

Node allocation should have been "the same ladder, deterministic". It is not: it loses published
solves at *every* budget tried, including 90M nodes/level with the deadline out of the way
(159/160), which no amount of extra compute fixes. That is not a budget problem, it is a **unit**
problem.

`nodesExpanded` does not mean the same thing in the three techniques. Each counts a different
primitive:

| technique | what one "node" is | inner work per node |
|---|---|---|
| `dfsFromGate` | one loop iteration = one **child edge** considered | ~1 candidate evaluation |
| `beamSearchFromGate` | one **frontier vertex** expanded | path replay + up to 4 candidate evaluations |
| `repairSearchFromGate` | one **walk ply** (`takePly`) | up to 4 candidate evaluations |

Measured on six published levels (per-attempt `nodesExpanded` / `elapsedMs`, already recorded on
every `Attempt`):

| technique | median nodes/sec | median applyMove/sec |
|---|---|---|
| dfs | 2.70M/s | 1.21M/s |
| repair | 0.84M/s | 2.88M/s |
| beam | 0.16M/s | 0.84M/s |
| **spread** | **17.1x** | **3.4x** |

Counting a unit all three genuinely share — `applyMove` calls, the one primitive every technique
funnels its inner loop through — collapses the spread from 17.1x to 3.4x. So **roughly five-sixths
of the divergence is the counter definition, not the algorithms.** Nothing about beam requires its
"node" to be 13x more expensive than DFS's; they are simply counting different things.

Consequences beyond allocation, all of which the project already works around by hand:

- `nodeBudget` is not portable: the same number buys ~17x different work depending on which
  technique consumes it. This is why `REPAIR_PROBE_ORDINARY_NODE_BUDGET` (2M),
  `REPAIR_PROBE_BIASED_NODE_BUDGET` (6M) and `getLdsProbeNodeBudget` (30k–4M) each had to be
  calibrated separately — they are denominated in different units.
- Cross-technique `nodesExpanded` comparisons in provenance, reports and baselines are
  apples-to-oranges.
- Dividing raw nodes among attempts hands a beam attempt ~13x more wall time per allocated node than
  a DFS attempt, which reshapes the ladder — exactly the observed solve loss.

**So the ordering of the remaining work changes: unify the work unit FIRST, then flip the currency.**
Doing it the other way round bakes the inconsistency into the allocator.

The residual 3.4x is genuine, not instrumentation: repair deliberately skips the `isConnected` flood
fill entirely, beam runs it on a wide throttle (`rSteps <= 20 || realLen % 8 === 0`), DFS on a
narrower one. A unit that also counted connectivity checks (or weighted them) would close most of
what is left. That is a calibration question, and a 3.4x-uniform currency is already a far better
allocator input than a 17x-uniform one.

## The root fault, and the fix

Node allocation lost solves at every budget tried, including 90M nodes/level with the deadline out of
the way. That was not a budget problem, it was a **unit** problem: `nodesExpanded` counts a different
primitive in each technique.

| technique | one "node" is | inner work per node |
|---|---|---|
| `dfsFromGate` | one loop iteration ≈ one **child edge** | ~1 candidate evaluation |
| `beamSearchFromGate` | one **frontier vertex** expanded | path replay + up to 4 candidate evaluations |
| `repairSearchFromGate` | one **walk ply** | up to 4 candidate evaluations |

Measured per-attempt (`nodesExpanded`/`elapsedMs`, already on every `Attempt`), the same nominal node
buys **11–17x** different real work depending on which technique spends it. A budget in that unit
cannot be divided fairly: it hands a beam attempt an order of magnitude more wall time per allocated
node than a DFS attempt, which reshapes the ladder instead of merely making it reproducible.

**The fix is a unit every technique shares.** All three funnel their inner loop through `applyMove`
(one candidate evaluated) and `isConnected` (the connectivity flood fill — repair skips it entirely,
beam runs it on a wide throttle, DFS on a narrow one, which is the dominant remaining cost variance).
Counting

```
work = applyMove calls + CONNECTIVITY_WORK_UNITS * isConnected calls
```

and fitting the weight to minimise cross-technique rate spread gives **K = 12** and:

| unit | cross-technique spread |
|---|---|
| `nodesExpanded` (today) | 11.4x |
| applyMove only | 2.7x |
| **applyMove + 12·isConnected** | **1.02x** (dfs 3.34M, repair 3.33M, beam 3.39M work/s) |

One work unit costs the same wherever it is spent. That is what makes a work budget divisible.

### The K=12 weight is calibrated against the fill as it was — a change to the fill's SIZE invalidates it

`CONNECTIVITY_WORK_UNITS = 12` was fitted to the *average* cost of an `isConnected` call across the
corpus. The meter therefore charges every call the same 12 units no matter how much grid that
particular call actually floods. That is fine — and the whole point — for a change that alters how
**often** the fill runs. It is wrong for a change that alters what each call **costs**.

`PRUNE_MC_RESERVED_WALL` (2026-07-31) is the worked example: forcing `maxVisit` to 0 collapses the
fill's reachable region, and `_floodFillBits` grows its row band lazily, so each call gets much
cheaper. The meter could not see it — `workSpent` came out **+11%** on a change that **halved wall
time** (89.4M vs 80.2M units for the same 20,000,000 nodes, 36.0s vs 81.0s, interleaved 3x3 on one
level). Pinning the work budget in that A/B actively *hides* the result, because it holds constant a
quantity that no longer tracks cost.

So: **the work meter is a model of cost, not a measurement of it.** Whenever a change touches the
cost of a metered operation rather than its frequency, the valid instrument is interleaved wall-clock
at pinned `nodesExpanded` — hold the search identical and time it. Full numbers:
[`reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md).

### Measured 2026-07-31: corpus-2 is NOT fully reproducible, and the noise floor is +/-5 solves

Two full typical-budget refreshes were run on solver code that differed by nothing but a test file
(`93162bf5` and `92fdb49a`; the only `modules/` diff between their commits is `search.test.ts`).
Identical budgets, identical corpus, byte-identical solver:

| corpus | solved | flips | `nodesExpanded` identical |
|---|---|---|---|
| corpus-1 | 89 -> 89 | **0** | **102/102** |
| corpus-2 | 506 -> **505** | **5** | 1429/1700 |

Corpus-1 reproduces perfectly. Corpus-2 does not. Breaking down the 271 differing node counts:
**263 involve a level at the 20M cumulative node cap** (benign — the cap bites at a slightly
different point, e.g. 20,000,041 vs 20,000,162), but **8 differ with both runs under the cap**, which
is genuine search nondeterminism, and 5 levels flipped solved/unsolved outright. `deadlineTruncated`
was 0 in both runs, so nothing reported a truncation — consistent with wall-clock *tier* deadlines
changing which attempt wins without setting that flag (the same shape as R00001 running 593s against
a 90,000ms budget and still reporting `deadlineTruncated: false`).

**The workflow header's claim that a run "is a function of (level, budgets) alone on any host under
any load" is therefore false for corpus-2.** Pinning work and node budgets removed most of the
variance — corpus-1 is exact, and 84% of corpus-2 levels are exact — but not all of it.

**Practical consequence, and the reason this is recorded here rather than in a report: a corpus-2
solved-count difference of +/-5 is not distinguishable from run-to-run noise.** Anything at or below
that needs either a larger population, repeated runs, or a matched-nodes A/B on one host — it cannot
be read off a single pair of refreshes. Several 2026-07-31 results sit at or under that floor
(a portal-scope extension measured at +5, and two reverted mechanisms measured at -1 and -2); they
should be described as "no demonstrated effect", not as gains or losses.

### How to get a reproducible run today (the deterministic A/B configuration)

The residual nondeterminism is the wall-clock deadline, not the allocator
([`reports/2026-07-31-refresh-nondeterminism.md`](../reports/2026-07-31-refresh-nondeterminism.md)).
Make the clock non-binding and a run is bit-identical on **nodes and work**; leave it binding and it
is not. Measured on R02374, one host, idle, back to back:

| `--budget-ms` | run 1 | run 2 |
|---|---|---|
| 8000 (binding) | 6,656,794 nodes | 6,371,354 nodes |
| 600000 (non-binding) | 15,006,969 nodes / 15,495,515 work | **identical** |

**Locally** — pass a `--budget-ms` large enough that it cannot fire, alongside the work and node
budgets, which then do all the bounding:

```bash
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
    --corpus=... --levels=... --scheduler-mode=legacy \
    --work-budget=26800000 --node-budget=20000000 --budget-ms=600000
```

**In CI** — dispatch `solver-typical-budget-baseline.yml` with **`deterministic: true`**. That raises
both deadlines until the clock cannot bind and forces `commit_results` off, so a deterministic run
can never overwrite the committed baseline series.

**Why the default stays binding.** The committed typical-budget baselines are a continuity series:
every one of them was produced with the 8s/20s deadlines binding, so switching the default would
introduce a one-time step change in the corpus number that is not attributable to solver quality (and
costs roughly 1.6x runtime on the slow tail). The trade chosen deliberately on 2026-07-31 is
**continuity for the headline number, determinism for A/B work** — hence a separate mode rather than
a new default.

**Every run now reports whether it was affected.** The combine job counts CLOCK-BOUND levels — those
whose elapsed time reached the deadline *without* `deadlineTruncated` being set — and warns. That
distinction matters: the pre-existing check tested only the flag, which is ~always 0, because
`orchestration.ts`'s ladder returns early at its per-gate `gateElapsed >= timeBudgetMs` check without
flagging anything. A level can therefore be decided entirely by the clock and still report
`deadlineTruncated: false`, which is exactly how this went unnoticed.

## Where this stands — DONE

**Landed.** `work-meter.ts` defines the unit; `applyMove` and `isConnected` increment it. The attempt
ladder divides a `workBudget` (`SolveOpts.workBudget`, defaulting to `timeBudgetMs *
DEFAULT_WORK_PER_MS` so existing ms-shaped callers keep roughly their cost). Each attempt gets an
absolute `prep._workCap`, checked by `dfsFromGate`, `beamSearchFromGate`, `repairSearchFromGate` and
`admissibleOrderSearch` in the same place each already checked its own budget. `dfsFromGateLDS`'s
`probeCapMs` — an escalation decision that used to be derived from wall clock — is now just the
deadline. `hint-ablation-generator.ts`'s phase ladder converts its `--wall-ms` into a work ceiling at
the run boundary, so **which hints discovery finds no longer depends on host speed**.

**Verified.**

- `solver:bench --check`: **160/160, no regressions.** Work allocation *preserves* the published
  solved set — raw-node allocation did not, at any budget.
- **Determinism**: 40 published levels with an explicit `workBudget`, quiet vs under 5 competing CPU
  hogs — **0 solved-set flips, 0/40 differing `nodesExpanded`, byte-identical 19,133,985 total**,
  across a 6.2s → 9.2s wall-time swing.
- Full `npm run ci` green, including `test:hint-workbench` — which the raw-node prototype broke. The
  work ceiling **dissolved** that failure at its original 9s budget rather than needing the ceiling
  raised, confirming the diagnosis that it was the same fault one layer up.

**The one remaining non-deterministic exit is the outer deadline**, by construction: if `timeBudgetMs`
expires before the work budget is spent, the run truncates and the result depends on host speed. That
is now a single, named, observable place instead of a property of every allocation decision. Offline
callers (CI, benches, corpus runs, any A/B) should pass `workBudget` explicitly and leave the deadline
generous; then there is no non-determinism at all.

**Also converted:** `diversification.ts`'s `runUntil` now takes an absolute `workMeter.units` ceiling
instead of a `Date.now()` deadline, and `hint-workbench.mjs` converts `--wall-ms`/`--enum-wall-ms` into
work ceilings at the run boundary. `hint-enumeration.ts` needed no change — its only clock reads are
the cooperative-yield cadence and elapsed *reporting*; its bound was always the caller's `shouldStop`,
which is now work-based. So **the whole hint-discovery path is deterministic**, which matters because
the provenance corpus is built from it.

## The remaining exit, and the better approach

A wall-clock deadline is **not needed for termination** — a finite `workBudget` already guarantees it,
since work rises monotonically per candidate and every technique checks the cap every 256 iterations.
The deadline exists purely to keep a latency promise to a human. That reframes the fix:

1. **Offline — remove it.** CI, benches, corpus runs, fingerprinting and any A/B should pass an
   explicit `workBudget` and leave `timeBudgetMs` generous. Then the deadline can never fire and there
   is no non-determinism at all. This is the recommended posture and needs no new mechanism.
2. **Interactive — make it observable instead of silent.** `SolveResult` now carries
   `deadlineTruncated` (and `status: 'deadline-truncated'`), set when the clock cut a run short while
   work budget remained. Such a result is **indeterminate, not a reproducible negative** — no tool
   should ever record it as "this level is unsolved". `workSpent`/`workBudget` are reported alongside,
   so cost is machine-independent even when the outcome is not.

That is the honest ceiling: you cannot make a latency-bounded run reproducible, but you can stop it
from silently contaminating results. The non-determinism is now one named, flagged, excludable state
rather than a property of every allocation decision.

## Tooling: what these changes require

Provenance now records `workSpent`/`workBudget` (`hint-types.ts` → `hint-provenance.ts` →
`makeProvenanceEntry`, traced end-to-end per CLAUDE.md's own lesson about fields that stop one layer
short). These are the fields cost analysis should use: unlike `elapsedMs` they do not depend on host
speed, and unlike `nodesExpanded` they mean the same thing across dfs/beam/repair.

Migrated:

| tool | what it does now |
|---|---|
| `scripts/solver-bench.mjs` | pins `workBudget` (default 100M, `--work-budget` to override) with `--budget-ms` demoted to a 4x deadline; records `workBudget` in `logs/solver-baseline.json`, warns if a run's budget differs from the baseline's, and flags any deadline-truncated level |
| `scripts/solver-fingerprint.mjs` | pins `workBudget` — the determinism checker is now itself deterministic |
| `scripts/stress/hint-cost-drift.mjs` | reads `search.workSpent` when present, falling back to `nodesExpanded` for pre-migration entries and tagging each row's `unit` so the two are never silently mixed |
| `scripts/stress/benchmark.mjs` | accepts `--work-budget`; records `workSpent` and `deadlineTruncated` per level, and prints a warning when any "failure" was actually a truncation |
| `scripts/portfolio-solve-sweep.mjs` | accepts and forwards `--work-budget` |
| `scripts/run-solverv2-direct.mjs`, `scripts/solver-speed-probe.mjs` | accept and forward `--work-budget` |
| `scripts/req-length-sweep.mjs` | accepts `--work-budget`; its doc now marks that as preferred over `--node-budget` for cross-machine/cross-technique comparison |
| CLAUDE.md | the hot-path A/B recipe now prescribes a pinned work budget, prefers `workSpent` for cost, and names `deadlineTruncated` as indeterminate |

Deliberately NOT migrated, and why: `portfolio-solve-sweep.mjs`'s adaptive `--baseline-budget`
machinery still scales off the baseline's recorded `nodesExpanded`, because the stress baselines do
not carry `workSpent` yet. It becomes a one-line change once a corpus refresh has written work costs;
until then the legacy `nodeBudget` path is untouched and still enforced, so nothing breaks.
**Documentation reconciliation (2026-08-07):** the option is now explicitly deprecated for general
regression use. A corpus-scale attempt already disproved its deterministic-replay premise on
stochastic repair winners. Keep it only for historical reproduction; build any future adaptive mode
from recorded `workSpent`, not another exception on top of raw node counts.

The historical `nodeBudget` path is untouched and still enforced, so every existing caller keeps
working while the migration proceeds.

## Historical: where this stood mid-investigation

**Landed:** `work-meter.ts` and its two increment sites. It only measures — nothing reads it yet — so
this is behaviourally inert and CI-green.

**Prototyped and verified, not landed:** routing the attempt ladder and all four techniques' budget
checks onto `prep._workCap`, with `workBudget` replacing the ms remainder as the divided quantity and
`timeBudgetMs` demoted to a pure deadline. Measured on that prototype:

- `solver:bench --check`: **160/160, no regressions** — work allocation preserves the published solved
  set, where raw-node allocation did not — and it was the fastest configuration measured (24.9s,
  −41.1% vs the recorded baseline).
- **Determinism achieved**: 40 published levels with an explicit `workBudget`, quiet vs under 5
  competing CPU hogs — **0 solved-set flips, 0/40 differing `nodesExpanded`, byte-identical 19,133,985
  total**, across a 2.8x wall-time swing (6.8s → 18.9s). With the ms deadline left binding instead,
  1/40 still diverged: the deadline is the single remaining non-deterministic exit, now isolated to
  one place rather than spread through every allocation decision.

**Why it is not landed:** it fails `test:hint-workbench`. The ablation generator's phase ladder is
gated on a wall-clock deadline, and the run now saturates 30s where 9s used to suffice — because the
attempt ladder no longer aborts when the ms remainder runs low, it spends its work budget. Raising the
ceiling and re-calibrating `DEFAULT_WORK_PER_MS` (tried at 1000/1600/2400/3350) did not resolve it, and
the true cost mechanism was not pinned down. Landing a solver change that inflates hint-discovery cost
by an unexplained factor is not acceptable, so the allocator switch waits on that diagnosis.

That test is itself the next piece of the same problem: `hint-ablation-generator.ts`'s `ctx.deadlineAt`
is `Date.now()`-based, so **which hints discovery finds is machine-speed-dependent** — the same fault
one layer up. Converting those deadlines to work budgets is the natural next step and would very likely
dissolve the failure rather than work around it.

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
- **Phase 2 — implement the currency switch. DONE, opt-in, default unchanged.**
  `SolveOpts.allocationCurrency` threads into both attempt loops; the only currency-dependent line
  in each is *which remainder gets divided*. Under `'nodes'` an attempt's own cap is its share and
  wall clock degrades to the outer deadline's remainder — it can truncate an attempt but never sized
  one. Verified the default is a strict no-op (node-identity A/B bit-identical at 7,083,715 nodes,
  zero divergences; `solver:bench --check` 160/160). Requires a finite `nodeBudget`; without one it
  falls back to `'ms'` rather than dividing Infinity. **Flipping the default is NOT done** — see
  "Phase 2 result" for why it should wait on step 3.
- **Phase 3 — delete the ms allocator**, keep the deadline, and drop the now-redundant node caps that
  were retrofitted onto `runRepairProbe` / `dfsFromGateLDS`.

### What not to do

Do not keep converting individual ms-gated decisions to node budgets one incident at a time. That is
what has happened twice already; each fix was right and each left the top-level allocator — the
dominant source — in place. The next such fix should be Phase 1, not a third local patch.
