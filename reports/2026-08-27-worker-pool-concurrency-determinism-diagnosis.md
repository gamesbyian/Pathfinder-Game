# Does real worker-pool concurrency change a level's deterministic node/work trajectory?

> **Status:** concluded-negative
> **Last evidence:** 2026-08-27 — GitHub Actions one-shot diagnostic run [`33050431506`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33050431506) (`worker-pool-concurrency-determinism-diag-one-shot.yml`, since deleted per one-shot retention convention), plus local sandbox reproduction on this branch
> **Decision:** Real `--workers=4` worker-pool concurrency, tested directly on the exact production runner class (`ubuntu-latest`, 4 vCPU) with the exact tool (`level-blind-capability-sweep.mjs`) confirm-residual-002 used, produces **byte-identical** `nodesExpanded`/`workSpent`/`allocatedNodeCeiling`/`allocatedWorkCeiling`/`outcome` for every one of 258 attempts across 4 repair-probe- and `dfs:objectiveFirst`/`dfs:intersectionHarvest`-heavy levels, compared to isolated `--workers=1` dispatch of the identical levels/budgets. The same holds locally, including under deliberately induced CPU oversubscription that reproduces the exact ~37,000-43,000 nodes/sec contended throughput [`reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`](2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md) measured as dangerous. **The general hypothesis — that real worker-pool concurrency is a live threat to the solver's deterministic node/work model — is not supported by this evidence and should be treated as closed** for the currently-shipped code (post the 2026-08-12 `REPAIR_PROBE_ATTEMPT_MS_CAP` fix and the `dfsFromGateLDS` probe-cap redesign already on `main`). confirm-residual-002's specific `K00131` discrepancy (concurrent 16,013,766/11,371,082 nodes vs. two isolated 9,291,718/9,730,890-node reproductions) was **not** reproduced by this investigation at a comparable scale/hardware and remains an unresolved, lower-priority anomaly — see "What this does not settle" below.
> **Remaining gate:** none for the general hypothesis. For the specific `K00131`/confirm-residual-002 anomaly: none currently planned — see disposition.
> **Evidence role:** forensic (diagnosing a historical discrepancy) for the `K00131` anomaly; confirmation (of a negative) for the general worker-pool-concurrency-determinism hypothesis.
> **Selection:** levels were selected by a scripted scan of the existing local `data/stress/stress-levels-random.json` corpus for ones producing heavy (multi-second, multi-million-node) `dfs:objectiveFirst`/`dfs:intersectionHarvest`/repair-probe attempts at a moderate node budget — a discovery pass, not cherry-picked after seeing contended-vs-isolated results. The candidate/protocol (workers=1 vs workers=4, `--attempt-budget-telemetry`, byte-for-byte per-attempt diff) was fixed before any contended run was dispatched, locally or on GitHub Actions.

## Background

[`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #1 records that `confirm-residual-002` (a confirmation cohort for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`) came back with zero candidate participation for a **fourth** distinct reason: not a scheduler-logic bug (verified correct via live instrumentation), but a real, reproducible difference in how many nodes the level `K00131`'s own preceding, unprotected `dfs:objectiveFirst`/`dfs:intersectionHarvest` configs consumed under the standard `--workers=4` production dispatch (16,013,766 / 11,371,082 nodes) versus two independent `--workers=1` reproductions of the identical level+options (9,291,718 / 9,730,890 nodes each). [`2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md`](2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md) left this as an open question for a future investigation, naming two candidate mechanisms: (a) a wall-clock-gated search stop condition binding under real contention despite a nominally non-binding deadline, or (b) a cross-level state/timing effect from the long-lived forked worker process `scripts/solver-worker-pool.mjs` reuses across many sequentially-dispatched levels. That report explicitly flagged this as broader than the one candidate: "if real, it would mean ANY development/confirmation A/B run at `--workers>1`... is not perfectly reproducible against a `--workers=1`... sanity check."

This report picks up that open question directly.

## Method

### Code audit first

`modules/solver/search.ts`'s `dfsFromGate` (the primitive underlying both plain DFS and the LDS-wrapped `dfsFromGateLDS` main-loop configs) has exactly one stop condition, checked every 256 nodes:

```js
if (now - levelStartTime > levelBudgetMs || nodesExpanded >= nodeBudget || prep._workMeter.units >= (prep._workCap ?? Infinity)) { ... }
```

The `levelBudgetMs` leg is wall-clock. Reading `modules/solver/orchestration.ts` end to end for every wall-clock-derived value that reaches this check found:

- `dfsFromGateLDS`'s own probe-wave escalation (the mechanism that decides how much of a level's node budget goes to cheap low-discrepancy probes before falling through to the unbounded final wave) was **already redesigned** before this investigation started: `probeCapMs = levelBudgetMs` (the full outer deadline, not a proportionally-shrunk value), with the comment explicitly stating the escalation decision used to be wall-clock-derived and was moved to a feature-scaled, deterministic node budget (`getLdsProbeNodeBudget`) specifically to close this determinism risk. Confirmed unchanged and in force on this branch.
- `runRepairProbe`'s per-attempt cap (`REPAIR_PROBE_ATTEMPT_MS_CAP = 1_200_000`, `orchestration.ts:1043`) was fixed from a hardcoded 30-second constant to 20 minutes on 2026-08-12 ([`2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`](2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md)), specifically because the old value bound under measured CPU contention (~37,000-43,000 nodes/sec) before its 2,000,000/6,000,000-node budget was reached. The fix's own margin analysis assumes contended throughput never drops below ~5,000 nodes/sec, a ~7-8x safety factor over the measured contended rate.
- `runGateSerialAttempts`/`runInterleavedAttempts` deliberately time the main loop's own wall-clock budget from a **fresh** `mainLoopStartTime` (taken right after the repair probe returns), not the original `levelStartTime` — specifically so a wall-clock-expensive repair probe cannot silently shrink the main loop's own `timeBudgetMs` window (a regression this codebase already found and fixed once, S017, referenced in the comment at `orchestration.ts:1886-1895`).
- `runRepairProbe`'s per-round node budget (`gateNodeBudget`, derived from `REPAIR_PROBE_ORDINARY_NODE_BUDGET`/`REPAIR_PROBE_BIASED_NODE_BUDGET`, 2,000,000/6,000,000) is a **fixed constant independent of the caller's overall `nodeBudget`** — confirmed by reading `biasedNodeBudgetForTier` and the round-budget derivation at `orchestration.ts:1272-1327`. So `confirm-residual-002`'s much larger `node_budget=50,000,000` does not inflate the repair probe's own wall-clock exposure; the 20-minute cap's margin analysis applies unchanged regardless of the overall solve's node budget.

So every wall-clock leg currently in the ladder either has a large, already-validated margin, or was already redesigned specifically to remove this determinism risk. The open question was whether that margin actually holds under real contention (measured only in a different sandbox on 2026-08-12, never on the exact production runner class, and never for the `dfs:objectiveFirst`/`dfs:intersectionHarvest` main-loop configs specifically).

### Local sandbox reproduction

Using this session's 4-core sandbox (matching the "4 cross-level worker processes per runner" scheduling default in [`.github/workflows/README.md`](../.github/workflows/README.md)):

1. **Small scale** (`--node-budget=2,000,000`, 10 levels from `data/stress/stress-levels-random.json`, `level-blind-capability-sweep.mjs --attempt-budget-telemetry`): `--workers=1` vs `--workers=4` produced byte-identical `nodesExpanded` for all 10 levels, including one (`R00080`) with two `dfs:objectiveFirst`/`dfs:intersectionHarvest` attempts hitting real (non-trivial) WORK ceilings. Plain `--workers=4` on this sandbox creates essentially no measurable contention — individual attempt `elapsedMs` values were sub-second even for node-budget-reached levels, so this comparison alone is not decisive.
2. **Larger scale** (`--node-budget=8,000,000`, 6 levels including 4 repair-probe-eligible ones — `R00044`, `R00046`, `R00073`, `R00082`, individually confirmed to run 15-32-second repair-probe attempts even uncontended): still byte-identical across all 6 levels and every attempt at plain `--workers=4`.
3. **Deliberately induced contention**: 12 pure-CPU busy-loop processes (3x oversubscription of the sandbox's 4 cores) run concurrently with an isolated `--workers=1` solve of `R00044`. This measurably degraded repair-probe throughput from ~127,000 nodes/sec (uncontended) to **37,800-39,550 nodes/sec** — closely matching the 2026-08-12 report's independently-measured "dangerous" contended rate on a different host. Even so, **every one of R00044's 45 attempts (`actionKey`/`nodesExpanded`/`outcome`) was byte-identical** to the uncontended run; repair-probe attempts that took 52.9s/50.6s under this contention (vs. 15.8s/15.3s uncontended) still finished at their intended 2,000,000-node ceiling, nowhere near the 1,200,000ms cap.

This established that the sandbox's own plain `--workers=4` doesn't create real contention (likely more CPU headroom than a standard GH Actions runner provides), but that even reproducing the *specific* contended throughput previously found dangerous does not, on the current code, change any attempt's outcome.

### Real production hardware (GitHub Actions)

Since the sandbox's un-oversubscribed concurrency is evidently not representative of the actual `ubuntu-latest` 4-vCPU runner GH Actions dispatches confirm-residual-002 on ([`.github/workflows/README.md`](../.github/workflows/README.md): "4 cross-level worker processes per runner, matching the current 4-vCPU standard public runner" — i.e., production `--workers=4` is not oversubscribed headroom, it's an exact 1:1 match), a temporary one-shot workflow (`worker-pool-concurrency-determinism-diag-one-shot.yml`, merged to `main` via PR #1515 to make it dispatchable, deleted after use per [`.github/workflows/README.md`](../.github/workflows/README.md)'s one-shot convention) ran `level-blind-capability-sweep.mjs --attempt-budget-telemetry` on the same 4 levels (`pos:3,4,7,9` = `R00044`/`R00046`/`R00073`/`R00082`, `--node-budget=8,000,000`) at `--workers=1` and `--workers=4` as two matrix jobs of the same GitHub Actions run (`33050431506`), both confirmed `cpus: 4`.

Result: **all 258 recorded attempts, across all 4 levels, were byte-identical on `actionKey`, `nodesExpanded`, `workSpent`, `allocatedNodeCeiling`, `allocatedWorkCeiling`, and `outcome`** between the two arms (diffed programmatically; the only fields that differed at all were `elapsedMs`/`allocatedBudgetMs`, which are diagnostic wall-clock readings that legitimately vary with real timing and never bound a decision in this run). Per-level totals:

| level | nodesExpanded (workers=1) | nodesExpanded (workers=4) | totalMs (workers=1) | totalMs (workers=4) |
|---|---:|---:|---:|---:|
| R00044 | 36,000,130 | 36,000,130 | 72,743 | 77,755 |
| R00046 | 78,500,007 | 78,500,007 | 144,175 | 127,944 |
| R00073 | 36,000,013 | 36,000,013 | 118,225 | 114,804 |
| R00082 | 36,000,076 | 36,000,076 | 123,554 | 122,452 |

No systematic slowdown pattern in `totalMs` either (two levels were marginally slower under `--workers=4`, two were marginally faster — consistent with ordinary run-to-run noise, not contention).

## What this does not settle

This investigation used levels `R00044`/`R00046`/`R00073`/`R00082` at `--node-budget=8,000,000` (36-78.5M total nodes per level across the full ladder) — not `K00131` at confirm-residual-002's actual `--node-budget=50,000,000`, and not the exact `must-cross+flipper-heavy` archetype/rule path `K00131` routed through. The repair-probe's own per-round budget is a fixed constant regardless of overall `nodeBudget` (confirmed above), so the margin analysis should generalize, but this was not verified by directly re-running `K00131` itself at 50,000,000 nodes under real `--workers=4` (that would require access to the sealed `confirm-residual-002` pool artifact and materially more GitHub Actions compute than this diagnostic used). The clean byte-for-byte match found here, on the same hardware class and the same tool, across a materially large (258-attempt, ~186M-node) sample, is strong evidence against a *general* concurrency-determinism defect, but does not itself explain what actually happened to `K00131`.

## Disposition

- **The general hypothesis — that real worker-pool concurrency threatens the solver's deterministic node/work model — is closed negative** for the current codebase. Do not reopen this exact form without new evidence that specifically implicates concurrency again (not just "a `--workers=4` run gave an unexpected result," which by itself now has no more prior probability of being a concurrency effect than any other explanation).
- **The narrower `K00131`/`confirm-residual-002` anomaly stays unresolved** but is now better characterized: it is very likely *not* an instance of the two candidate mechanisms named in the originating report. Hypothesis (a) (wall-clock truncation under contention) is directly contradicted by this report's evidence at comparable hardware/scale. Hypothesis (b) (persistent-worker cross-level state leak) was not re-tested here with a dedicated queue-position experiment, but is already weakened by the 2026-08-12 report's code audit (every module-level mutable buffer/cache found delta-based or explicitly cleared per solve) and is not supported by this report's own evidence either (this diagnostic's `--workers=4` arm dispatches 4 levels through 4 persistent forked workers exactly as production does, with zero divergence from the `--workers=1` isolated arm).
- **No code change is made by this report.** No new bug was found; the existing 2026-08-12 `REPAIR_PROBE_ATTEMPT_MS_CAP` fix and the already-redesigned `dfsFromGateLDS` probe-cap logic are validated, not modified.
- **Practical consequence for the queue**: `docs/solver-optimization-current-queue.md`'s standing caution — "do not dispatch a fifth confirmation cohort under standard `--workers=4` concurrency until this is separately understood" — was written when concurrency-sensitivity was the leading, un-investigated explanation for `confirm-residual-002`'s result. That investigation is now done and came back negative at meaningful scale on real production hardware. A fifth confirmation cohort under standard `--workers=4` is no longer expected to repeat the same non-participation artifact for a *concurrency* reason; if it does, that would itself be new, more surprising evidence worth investigating on its own (not a repeat of an already-understood cause). This report does not itself commission a fifth cohort — that remains a separate decision for whoever next picks up `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`.
- The temporary one-shot workflow and its PR are already reconciled: `worker-pool-concurrency-determinism-diag-one-shot.yml` is deleted from `main` in the same change that lands this report, per the one-shot retention convention.

## Reproducing

```bash
# Local, moderate scale, matched levels/budgets:
node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="pos:3,4,7,9" \
  --budget-ms=1800000 --node-budget=8000000 --work-budget=10720000 --workers=1 \
  --attempt-budget-telemetry --out=<file-w1> --summary-out=<summary-w1>
# then --workers=4 --out=<file-w4> --summary-out=<summary-w4>, and diff levels[].attempts[]
# (actionKey/nodesExpanded/workSpent/allocatedNodeCeiling/allocatedWorkCeiling/outcome).
```
