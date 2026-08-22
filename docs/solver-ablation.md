# Ablation Laboratory

Solver-analysis tooling: `scripts/run-ablation.mjs`, `scripts/analyze-ablation.mjs`, `modules/solver/ablation-config.ts`, npm `ablation:*`.

Features toggle through `opts.ablation`: production-default features default on, experimental opt-ins off, so baseline matches production. Commands use `scripts/run-bundled.mjs`, not raw `tsx`, because the hot path is ~5× slower under `tsx`.

## Feature flags (76)

| Group | Count | Controls |
|---|---:|---|
| scoring | 18 | `SCORE_*` terms in `scoreMove` |
| pruning | 15 | `PRUNE_*` dead-branch checks |
| strategy | 23 | `STRATEGY_*` search/orchestration mechanisms |
| templates | 8 | structural traversal templates |
| profiles | 12 | `PROFILE_<name>` attempt eligibility |

Exact names/defaults: `modules/solver/ablation-config.ts`.

Important distinctions:
- `STRATEGY_REPAIR_FALLBACK`: removes repair configs and early probe.
- `STRATEGY_REPAIR_PROBE`: disables only early probe; fallback remains.
- `STRATEGY_REPAIR_MUSTTURN_BIAS`: only biased repair attempt.
- `STRATEGY_LOWER_BOUND_MEMO`: exact MP/MC bounds without memoization.
- `STRATEGY_ARCHETYPE_ROUTING`: catch-all rule instead of feature/archetype routing.
- `STRATEGY_MIN_BUDGET_FLOOR`: disables `minBudgetFraction` floors.
- `STRATEGY_REPAIR_ELITE_SPLICE`, `STRATEGY_REPAIR_STAGNATION_BURST`, `STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST`: repair exploration mechanisms.
- `SCORE_MUST_TURN_EXIT_GUIDANCE`: exit guidance separate from must-turn urgency.
- `STRATEGY_REPAIR_LENGTH_GAP_CLOSE`: bounded exact-length/intersection close operator.
- `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS`: allows it with one structural deficit (`LENGTH_GAP_CLOSE_STRUCTURAL_SLACK`, default 1).

History/results belong in dated reports and current queue/ledger. `ATTEMPT_ORDER`: `'reverse'`, `'random'` (with `_randomSeed`), or `'profile-grouped'`.

## Commands

```bash
npm run ablation:baseline -- --budget-ms=15000 --output=logs/ablation/baseline.json
npm run ablation:single -- --budget-ms=10000 --output=logs/ablation/single.json
npm run ablation:profiles -- --budget-ms=10000 --output=logs/ablation/profiles.json
npm run ablation:templates -- --budget-ms=10000 --output=logs/ablation/templates.json
npm run ablation:order -- --budget-ms=10000 --output=logs/ablation/order.json
npm run ablation:pairs -- --budget-ms=10000 --output=logs/ablation/pairs.json
npm run ablation:full -- --budget-ms=5000 --output=logs/ablation/lab-full.json
npm run ablation:analyze -- --input=logs/ablation/lab-full.json --text
```

Targeted:

```bash
node scripts/run-bundled.mjs scripts/run-ablation.mjs \
  --experiment=single-feature \
  --levels=pos:74,pos:129,pos:130,pos:140,pos:145,pos:146,pos:147 \
  --filter=PRUNE \
  --budget-ms=30000
```

Reuse a baseline with `--baseline=logs/ablation/baseline.json`.

## `run-ablation.mjs` flags

| Flag | Default | Description |
|---|---|---|
| `--experiment=<phase>` | `full` | `baseline`, `single-feature`, `profiles`, `templates`, `order`, `pairs`, `full` |
| `--corpus=<path>` | `data/levels.json` | Corpus; stress witness metadata stripped before solving |
| `--levels=<spec>` | `all` | `pos:`, `id:`, or full ID; bare numbers rejected |
| `--budget-ms=<n>` | `10000` | Per-level time budget |
| `--output=<path>` | timestamped | JSON output |
| `--baseline=<path>` | — | Reuse baseline |
| `--filter=<substr>` | — | Filter experiment names |
| `--concise` | off | Omit per-level attempt lists |

## JSON format

```js
{
  name, label, config,
  summary: {
    solved, failed, errors, total, solveRate,
    totalMs, avgMs, medianMs, p95Ms,
    nodesExpanded, nodesPerSolved, nodesPerFailed
  },
  solvedLevels,
  failedLevels,
  levels: [{ level, status, ok, elapsedMs, nodesExpanded, solvedBy, attempts? }]
}
```

## Analysis

`analyze-ablation.mjs` emits `featureRanking[]`, `tierSummary`, `profileRanking[]`, `templateRanking[]`, `attemptOrderSensitivity[]`, `redundancyAnalysis[]`, `recommendations[]`.

```text
score = (baselineSolved - ablationSolved) * 100
      + max(0, (ablationMs - baselineMs) / baselineMs) * 50
      + max(0, (ablationNodes - baselineNodes) / baselineNodes) * 20
      - (ablationSolved - baselineSolved) * 20
```

| Tier | Condition |
|---|---|
| `critical` | any solve loss |
| `strong` | score ≥15, no solve loss |
| `helpful` | 5 ≤ score <15 |
| `neutral` | -5 ≤ score <5 |
| `negative` | score < -5 |

## Programmatic use

```js
import { withFeatureDisabled, withFeaturesDisabled, soloConfig } from './modules/solver/ablation-config.ts';

const result = await Solver.solve(level, {
  timeBudgetMs: 15000,
  ablation: withFeatureDisabled('SCORE_GOAL_ATTRACTION'),
});

const noPrune = withFeaturesDisabled(['PRUNE_DISTANCE_BOUND', 'PRUNE_CONNECTIVITY', ...]);
const singleProfile = soloConfig(['PROFILE_perimeterSweep']);
```
