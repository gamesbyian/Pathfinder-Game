# Ablation laboratory

Solver-analysis tooling: `scripts/run-ablation.mjs`, `scripts/analyze-ablation.mjs`, `modules/solver/ablation-config.ts`, npm `ablation:*`.

Features toggle through `opts.ablation`: production-default features default on, experimental opt-ins off, so baseline matches production. Commands use `scripts/run-bundled.mjs`, not raw `tsx`, because the hot path is much slower under `tsx`.

> **Evidence role:** primarily exploratory/discovery. The standard CLI is wall-budgeted and the analyzer ranks many arms on one population. Do not promote policy from an ablation ranking alone. Re-test selected candidates through the current level-blind deterministic/matched-work path and independently confirm candidates selected from the same data.

## Feature registry

Exact flags, groups, descriptions, and defaults live in `modules/solver/ablation-config.ts`; exact scoring-profile weights live in `modules/solver/policy.ts`. Do not duplicate changing feature counts here.

`PROFILE_<name>` flags enable/disable scoring weight vectors, not independent algorithms. Ordinary DFS/beam profiles share `scoreMove()` and differ mainly in weights; templates, beam retention, admissible-order, repair, pruning, retry context, and budget depth are separate operational layers. See [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).

Important distinctions:

- `STRATEGY_REPAIR_FALLBACK`: removes repair configs and early probe.
- `STRATEGY_REPAIR_PROBE`: disables only early probe; fallback remains.
- `STRATEGY_REPAIR_MUSTTURN_BIAS`: only biased repair attempt.
- `STRATEGY_LOWER_BOUND_MEMO`: exact MP/MC bounds without memoization.
- `STRATEGY_ROUTING_REGIME_SELECTION`: catch-all rule instead of feature/routing-regime selection.
- `STRATEGY_MIN_BUDGET_FLOOR`: disables `minBudgetFraction` floors.
- `STRATEGY_REPAIR_ELITE_SPLICE`, `STRATEGY_REPAIR_STAGNATION_BURST`, `STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST`: repair exploration mechanisms.
- `SCORE_MUST_TURN_EXIT_GUIDANCE`: exit guidance separate from must-turn urgency.
- `STRATEGY_REPAIR_LENGTH_GAP_CLOSE`: bounded exact-length/intersection close operator.
- `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS`: permits close attempts with one structural deficit (`LENGTH_GAP_CLOSE_STRUCTURAL_SLACK`, default 1).

History/results belong in dated reports and the current queue/ledger. `ATTEMPT_ORDER`: `'reverse'`, `'random'` (with `_randomSeed`), or `'profile-grouped'`.

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

Reuse a baseline with `--baseline=logs/ablation/baseline.json` only when code/corpus/protocol remain comparable.

## `run-ablation.mjs` flags

| Flag | Default | Description |
|---|---:|---|
| `--experiment=<phase>` | `full` | `baseline`, `single-feature`, `profiles`, `templates`, `order`, `pairs`, `full` |
| `--corpus=<path>` | `data/levels.json` | Corpus; stress witness metadata stripped before solving |
| `--levels=<spec>` | `all` | `pos:`, `id:`, or full ID; bare numbers rejected |
| `--budget-ms=<n>` | `10000` | Per-level wall budget; host/load-sensitive, not portable allocation currency |
| `--output=<path>` | timestamped | JSON output |
| `--baseline=<path>` | — | Reuse only when code/corpus/protocol are comparable |
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

## Interpretation

`analyze-ablation.mjs` emits `featureRanking[]`, `tierSummary`, `profileRanking[]`, `templateRanking[]`, `attemptOrderSensitivity[]`, `redundancyAnalysis[]`, and `recommendations[]`. Treat them as descriptive rankings on the measured run, not promotion verdicts.

- The analyzer score is a convenience heuristic, not a statistical test or solver objective.
- Broad sweeps create many opportunities for an apparently strong arm by chance or corpus specificity; record the search space when selecting a follow-up.
- A population chosen because a feature looked important there is targeted discovery/forensic evidence, not an unbiased effect estimate.
- Wall-bounded comparisons can change effective search work with host load. Policy decisions use deterministic `workSpent` and non-binding deadlines; see [`solver-budget-determinism.md`](solver-budget-determinism.md).
- Equal nodes do not equalize heterogeneous technique cost.
- Ablating one feature measures its effect inside the surrounding policy, not intrinsic standalone value.
- Feature interactions make single ablations non-additive.

`redundancyAnalysis[]` compares outcomes/effects. It does not prove operational redundancy, shared traversal, or equivalent move ordering; use [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) for those claims.

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

Tiers are triage labels only. A `critical` arm may reveal a negative interaction rather than an indispensable mechanism; a `strong` arm still needs a current matched-work causal test before changing production.

## Promotion path

1. nominate a concrete mechanism/interaction with the ablation lab;
2. reproduce on current code with participation/attempt telemetry;
3. make the treatment as narrow as possible;
4. compare at deterministic matched work where allocation/search policy changes;
5. report gains, losses, work, errors/truncation, and reached population;
6. independently confirm if treatment/profile/threshold was selected from the discovery sweep;
7. update the queue/ledger rather than treating analyzer recommendations as authority.

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

Programmatic use does not change the evidence rules. For promotion-quality work, prefer current experiment manifests/workflows in [`tooling-catalog.md`](tooling-catalog.md) over a bespoke runner.