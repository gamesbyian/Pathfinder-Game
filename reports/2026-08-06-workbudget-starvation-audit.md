# Audit: every solveLevel() caller for the workBudget-vs-nodeBudget starvation pattern (2026-08-06)

Follow-up to `reports/2026-08-06-near-twin-starvation-fix.md`, which found and fixed one instance
of a specific bug shape in `solver-stress-refresh.yml`: when a caller sets a finite external
`--node-budget` but leaves `workBudget` to its default derivation from `--budget-ms`
(`timeBudgetMs x DEFAULT_WORK_PER_MS`, `orchestration.ts`), and `--budget-ms` is disproportionately
large relative to what the node budget would need, the ladder's own per-attempt fair-division
(`attemptBudgetShare`/`prep._workCap`) never actually binds — so the first attempt tried can run
unchecked until it single-handedly exhausts the node ceiling, starving every attempt after it. This
audit checks every other caller of `Solver.solve()`/`solveLevel()` for the same or a milder version
of the same shape, per the standing request to rule out other affected processes/techniques.

## Method

Enumerated every workflow (`.github/workflows/*.yml`) and script (`scripts/**/*.mjs`) that reaches
`Solver.solve()`/`solveLevel()`, checked whether each passes a finite `nodeBudget` without a
proportionate `workBudget`, and where the combination looked risky, **verified empirically** (not by
formula alone) via a direct `Solver.solve()` call at the caller's own actual defaults on real
still-unsolved corpus-2 levels, checking whether one attempt claims a disproportionate share of the
budget while later attempts get zero nodes.

## Results

### Fixed already (prior session)

- **`solver-stress-refresh.yml`** — the original finding. Derived workBudget was ~500-800x the node
  budget (24h non-binding `--budget-ms`, no `--work-budget`). Fixed; confirmed +41 corpus-2 / +1
  corpus-1 solves at full CI scale.

### Checked and confirmed clean

- **`solver-typical-budget-baseline.yml`** — already passes `--work-budget` explicitly, at exactly
  a 1.34x-of-node-budget ratio (`26,800,000/20,000,000`, `67,000,000/50,000,000`). No exposure.
- **`solver-highbudget-unsolved-sweep.yml`** — omits `--work-budget`, but its `budget_ms` default
  (75,000ms) is realistically scaled, so the derived workBudget (~251M) is only ~2.1x its
  `node_budget` (120M) — close enough to the healthy ratio that fair division still functions.
  Verified directly on 5 real still-unsolved levels: budget genuinely divides across multiple real
  attempts (10–85M nodes each), never one attempt monopolizing it.
- **`method-probe-sweep.yml`** (→ `scripts/method-probe.mjs`) — architecturally immune, not just
  numerically safe. This tool calls `runAttempt` directly per `(gate, config)` pair with an explicit
  node budget already, bypassing `solveLevel()`'s ladder and its `attemptBudgetShare`/`prep._workCap`
  division entirely (confirmed: `prep._workCap` is never set here, so the search loops' own
  `workMeter.units >= (prep._workCap ?? Infinity)` check is always `Infinity`-gated — a no-op).
  There is no "divide one budget fairly across many attempts" step for a disproportionate workBudget
  to defeat.
- **`scripts/hint-workbench.mjs`** — two independent code paths, both clean. Its enumeration path
  uses `Solver.createVarietySearch` (`variety-search.ts`), a completely separate API from
  `solveLevel()`'s ladder, with its **own** dedicated WORK-governed `shouldStop` cancellation
  (`opts.enumWallMs` converted at the same work-per-ms rate) — its own comment shows this was
  already hardened against exactly this class of cross-phase-starvation risk. Its
  `solveGridAttempt` path (candidate-grid/portal-grid probes) never passes a finite `nodeBudget` at
  all, so there's no external ceiling for one attempt to race to exhaust.
- **`scripts/portfolio-solve-sweep.mjs` itself** — `nodeBudget`/`workBudget` both default to
  `undefined` (→ `Infinity` for nodeBudget in `orchestration.ts`) unless a caller explicitly passes
  `--node-budget`. Safe by default; the risk lives entirely in how a *caller* invokes it (which is
  what the two fixes below, and the original stress-refresh fix, actually addressed).
- **Every other script that calls `Solver.solve()`/`solveLevel()`**
  (`hint-candidate-search.mjs`, `portfolio-scheduler-report.mjs`, `run-ablation.mjs`,
  `solver-fingerprint.mjs`, `solver-parallel/benchmark.mjs`, `stress/regression.mjs`,
  `stress/smoke.mjs`, `stress/solve-one.mjs`, `stress/winning-path-archaeology.mjs`,
  `stress/benchmark.mjs`) — none pass `nodeBudget` at all, so none can hit this bug shape by
  construction (an infinite external ceiling can't be "raced to exhaustion" by one greedy attempt;
  workBudget, however large, is the only real ceiling and it's genuinely being spent, not starved
  around).
- **`scripts/solver-parallel/race.mjs`** (the `--race-pool-size` path) — has no `nodeBudget` or
  `workBudget`/`prep._workCap` concept at all; it divides budget purely by `budgetMs` per job. Not
  exposed to *this* bug (nothing to race against), though it carries its own pre-existing,
  already-documented ms-based non-determinism limitation (CLAUDE.md: "race.mjs reimplements the
  ladder and has no admissible-order tier and no nodeBudget handling at all") — a different, already
  known issue, not a new variant of this one, and out of scope here.
- **`atlas-sweep.yml`, `cpsat-hint-harvest-sweep{,-published}.yml`, `mitm-frontier-sweep.yml`** —
  drive an external CP-SAT solver or a from-scratch meet-in-the-middle probe, never
  `orchestration.ts`'s `solveLevel()` ladder. Not applicable.

### Found and fixed: `scripts/stress/reduce-level.mjs`

A real, confirmed instance — milder than the original, but genuine. Its defaults
(`--node-budget=15,000,000`, `--time-budget-ms=30000`, no `--work-budget`) derive a workBudget of
`30,000 x 3,350 = 100,500,000` — a 6.7x ratio to the node budget, far tighter than
`solver-stress-refresh.yml`'s original 500-800x, but still loose enough to matter. Verified directly
on R02657/R00477 (both currently `node-budget-reached`): the first-tried main-loop config claimed
**59–65%** of the node budget on its own, with **14 of 17** later attempts getting exactly 0 nodes —
the identical starvation shape, just less extreme.

This matters specifically for this tool: it's a level-reducer that accepts a shrink candidate only
if the solver "still reproduces the same interestingness signature" — if most of the ladder never
gets a real turn before that verdict is reached, a reduced level's `node-budget-reached` classification
can reflect "most techniques were starved," not "this is a genuinely minimal hard case," undermining
the tool's own stated goal.

**Fix**: same shape as the original — `WORK_BUDGET` now defaults to `Math.round(NODE_BUDGET * 1.34)`
(the same validated ratio, not a new number), with a `--work-budget` override available. Verified
directly: the same two levels now split their budget across 5+ real attempts (1.8M–3.9M nodes each)
instead of one attempt taking 59–65% and 14/17 getting 0.

### Checked, low risk, not changed

- **`scripts/req-length-sweep.mjs`** — `--budget-ms` defaults to 1000 (small, realistic), `--node-
  budget`/`--work-budget` both null unless explicitly passed. The dangerous combination (generous
  ms + finite node budget + no work budget) requires an operator to deliberately construct it; it's
  not this tool's own default behavior, and it already exposes `--work-budget` as an escape hatch.
  Not invoked by any workflow. Left as-is — flagging the risk here as documentation rather than
  changing a tool whose own defaults are already safe.
- **`scripts/solver-speed-probe.mjs`** — `--budget-ms` defaults to 4000 (small, realistic);
  `--work-budget` already supported and CLAUDE.md's own testing guidance explicitly instructs
  pairing it with a generous `--budget-ms` for exactly this reason. Same reasoning as above.

## What this rules out

Per the standing request to confirm no other techniques/processes are affected: **every code path
that reaches `orchestration.ts`'s per-attempt ladder division (`attemptBudgetShare`/
`prep._workCap`) with a finite external `nodeBudget` has now been checked.** Two real instances
existed (`solver-stress-refresh.yml`, now fixed and confirmed at full CI scale; `reduce-level.mjs`,
now fixed and confirmed locally); everything else either never combines a finite node budget with a
disproportionate workBudget, or (method-probe.mjs, hint-workbench.mjs's variety-search path) doesn't
use the vulnerable division mechanism at all. Production Play/Editor/Review paths were never in
scope for this bug shape in the first place (none pass `nodeBudget`) and remain untouched.

## Reproduce

```bash
# reduce-level.mjs, before vs after (add/remove --work-budget to compare):
node scripts/run-bundled.mjs scripts/stress/reduce-level.mjs \
    --corpus=data/stress/stress-levels-random.json --id=R02657 --node-budget=15000000
```
