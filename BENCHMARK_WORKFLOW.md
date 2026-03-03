# Dev Benchmark Workflow (Hard Set)

This project now includes a **dev-only benchmark runner** under `APP.Solver.Benchmark`.

## 1) Enable dev mode

In the app UI, enable **Dev** mode first. The benchmark runner throws if dev mode is off.

## 2) Run the fixed hard set

Open browser devtools console and run:

```js
const result = await APP.Solver.Benchmark.runHardSet({
  timeBudgetMs: 20000,
  trapBudgetMs: 7000
});
console.log(result.summary);
```

Hard-set families included:
- `timeout`
- `zeroBomb`
- `stackedConstraint`

## 3) Inspect per-run metrics

Each run row includes:
- `elapsedMs`
- `normalizedOutcome` (`solved`, `timeout`, `inconclusive`)
- `outcome` (raw status)
- `pruneReasons` and `pruneTotal`
- `stageReached` and `stageResult`
- trap summary (`trapOutcome`, `trapCount`, `trapTimedOut`)

## 4) Parameter sweep key knobs

You can sweep:
- portal bias mode/weight
- fallback prune toggles
- stage budget split

```js
const sweep = await APP.Solver.Benchmark.sweepHardSet({
  portalBiasModes: ['adaptiveMustCross', 'off'],
  portalBiasWeights: [150, 240],
  pruneSets: [
    { key: 'fallback-default', fallbackDisabledPrunes: ['mustPassBound', 'mustCrossBound', 'connectivity', 'distance', 'parity'] },
    { key: 'fallback-relaxed', fallbackDisabledPrunes: ['connectivity', 'distance', 'parity'] }
  ],
  stageSplits: [
    { key: 'balanced', stageBudgetSplit: { stage0: 2, stage1: 4, stage2: 2, stage3: 2 } },
    { key: 'fallback-heavy', stageBudgetSplit: { stage0: 1, stage1: 2, stage2: 2, stage3: 5 } }
  ],
  timeBudgetMs: 20000,
  trapBudgetMs: 7000
});
console.log(sweep.runsByConfig);
```

## 5) Export machine-readable JSON/CSV

```js
const hardSetRun = await APP.Solver.Benchmark.runHardSet();
const json = APP.Solver.Benchmark.toJson(hardSetRun);
const csv = APP.Solver.Benchmark.toCsv(hardSetRun);

// Example: copy to clipboard
await navigator.clipboard.writeText(json);
await navigator.clipboard.writeText(csv);
```

For sweeps:

```js
const sweep = await APP.Solver.Benchmark.sweepHardSet();
// sweep.json and sweep.csv are prebuilt export strings
console.log(sweep.json);
console.log(sweep.csv);
```

Use these outputs to compare configurations and track regressions over time in CI artifacts/spreadsheets.
