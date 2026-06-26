# Ablation Laboratory

> Specialized solver-analysis tool (not part of core gameplay or CI gates), so its full reference
> lives here rather than in CLAUDE.md. Entry points: `scripts/run-ablation.mjs`,
> `scripts/analyze-ablation.mjs`, `scripts/ablation-config.mjs`; npm scripts `ablation:*`.

The ablation framework measures what each solver feature actually contributes. Every major capability is independently togglable via an ablation config passed through `opts.ablation`. Defaults are all-enabled; the baseline behaviour is identical to the unmodified solver.

### Feature flags (45 total)

| Group | Flags | Controls |
|---|---|---|
| **scoring** (13) | `SCORE_GOAL_ATTRACTION`, `SCORE_FINISH_COMMITMENT`, `SCORE_OBJECTIVE_ATTRACTION`, `SCORE_MUST_PASS_URGENCY`, `SCORE_MUST_CROSS_URGENCY`, `SCORE_MC_APPROACH_GUIDANCE`, `SCORE_FLIPPER_URGENCY`, `SCORE_INTERSECTION_SETUP`, `SCORE_PERIMETER_BIAS`, `SCORE_PHASE_SCALING`, `SCORE_ANTI_DITHER`, `SCORE_REVISIT_PENALTY`, `SCORE_TEMPLATE_BONUS` | Move scoring terms in `scoreMoveV2` |
| **pruning** (7) | `PRUNE_MC_CEILING`, `PRUNE_DISTANCE_BOUND`, `PRUNE_PARITY`, `PRUNE_MUST_PASS_LB`, `PRUNE_MUST_CROSS_LB`, `PRUNE_INTERSECTION_DEFICIT`, `PRUNE_CONNECTIVITY` | Dead-branch pruning in DFS + beam |
| **strategy** (5) | `STRATEGY_LDS`, `STRATEGY_DIVERSE_BEAM`, `STRATEGY_STATE_DEDUP`, `STRATEGY_GATE_INTERLEAVING`, `STRATEGY_PARITY_GATE_FILTER` | Search-level optimisations |
| **templates** (8) | `TEMPLATE_CORNER_HARVEST`, `TEMPLATE_PERIMETER_CW`, `TEMPLATE_PERIMETER_CCW`, `TEMPLATE_SIDE_COMMITMENT`, `TEMPLATE_SIDE_X_LOW/HIGH`, `TEMPLATE_SIDE_Y_LOW/HIGH` | Structural traversal templates |
| **profiles** (12) | `PROFILE_<name>` for every policy profile | Attempt config eligibility |

Additionally, `ATTEMPT_ORDER` can be set to `'reverse'`, `'random'` (with `_randomSeed`), or `'profile-grouped'` to test ordering sensitivity.

### Ablation commands

```bash
# One-shot baseline (fast — just measures solve rate + nodes at default settings)
npm run ablation:baseline -- --budget-ms=15000 --output=audits/ablation/baseline.json

# Single-feature ablations (one feature off per run, all 45 features)
npm run ablation:single -- --budget-ms=10000 --output=audits/ablation/single.json

# Profile ablations (each profile off + solo)
npm run ablation:profiles -- --budget-ms=10000 --output=audits/ablation/profiles.json

# Template ablations
npm run ablation:templates -- --budget-ms=10000 --output=audits/ablation/templates.json

# Attempt order sensitivity
npm run ablation:order -- --budget-ms=10000 --output=audits/ablation/order.json

# Pairwise combination testing
npm run ablation:pairs -- --budget-ms=10000 --output=audits/ablation/pairs.json

# Full lab (all 101 experiments — runs in background, takes ~1-3h depending on budget)
npm run ablation:full -- --budget-ms=5000 --output=audits/ablation/lab-full.json

# Analyse results and print ranked report
npm run ablation:analyze -- --input=audits/ablation/lab-full.json --text

# Targeted: only pruning rules on hard levels
node scripts/run-ablation.mjs \
  --experiment=single-feature \
  --levels=74,129,130,140,145,146,147 \
  --filter=PRUNE \
  --budget-ms=30000

# Reuse a saved baseline to skip re-running it
node scripts/run-ablation.mjs \
  --experiment=single-feature \
  --baseline=audits/ablation/baseline.json \
  --budget-ms=10000 \
  --output=audits/ablation/single.json
```

### run-ablation.mjs flags

| Flag | Default | Description |
|---|---|---|
| `--experiment=<phase>` | `full` | `baseline`, `single-feature`, `profiles`, `templates`, `order`, `pairs`, `full` |
| `--levels=<spec>` | `all` | Level filter (same syntax as `solver:direct`) |
| `--budget-ms=<n>` | `10000` | Per-level time budget |
| `--output=<path>` | auto-timestamped | Write JSON results |
| `--baseline=<path>` | — | Reuse a saved baseline run (skips re-running it) |
| `--filter=<substr>` | — | Only run experiments whose name contains this substring |
| `--concise` | off | Omit per-level attempt lists to save space |

### Ablation JSON format

Top-level output contains `runs[]`, each with:
```js
{
  name: String,           // e.g. "disable:SCORE_GOAL_ATTRACTION"
  label: String,          // human-readable description
  config: Object|null,    // ablation config (null = baseline)
  summary: {
    solved, failed, errors, total,
    solveRate,            // fraction 0–1
    totalMs, avgMs, medianMs, p95Ms,
    nodesExpanded,        // total across all levels
    nodesPerSolved,       // avg nodes for solved levels
    nodesPerFailed,       // avg nodes for failed levels
  },
  solvedLevels: Number[], // 1-indexed level numbers solved
  failedLevels: Number[],
  levels: [{              // per-level detail
    level, status, ok, elapsedMs, nodesExpanded, solvedBy, attempts?
  }, ...]
}
```

### Analysis output (analyze-ablation.mjs)

Reads the run JSON, computes deltas vs baseline, and emits:
- `featureRanking[]` — all single-feature ablations sorted by importance score
- `tierSummary` — features bucketed as `critical | strong | helpful | neutral | negative`
- `profileRanking[]` — per-profile win count, unique wins, solo solve count
- `templateRanking[]` — per-template win count + unique wins
- `attemptOrderSensitivity[]` — delta per order variant
- `redundancyAnalysis[]` — pairwise redundancy detection with ratio
- `recommendations[]` — machine-readable action items

**Importance score formula:**
```
score = (baselineSolved − ablationSolved) × 100
      + max(0, (ablationMs − baselineMs) / baselineMs) × 50
      + max(0, (ablationNodes − baselineNodes) / baselineNodes) × 20
      − (ablationSolved − baselineSolved) × 20   // bonus for negative features
```

**Tier thresholds:**
| Tier | Condition |
|---|---|
| `critical` | Any solve loss (`solveLoss > 0`) |
| `strong` | `importanceScore ≥ 15`, no solve loss |
| `helpful` | `5 ≤ score < 15` |
| `neutral` | `−5 ≤ score < 5` |
| `negative` | `score < −5` (removing improves results) |

### Using ablation config in code

```js
import { withFeatureDisabled, withFeaturesDisabled, soloConfig } from './scripts/ablation-config.mjs';

// Disable one feature
const result = await SolverV2.solve(level, {
  timeBudgetMs: 15000,
  ablation: withFeatureDisabled('SCORE_GOAL_ATTRACTION'),
});
console.log(result.nodesExpanded); // now available on every solve result

// Disable all pruning (WARNING: very slow)
const noPrune = withFeaturesDisabled(['PRUNE_DISTANCE_BOUND', 'PRUNE_CONNECTIVITY', ...]);

// Only one profile active
const singleProfile = soloConfig(['PROFILE_perimeterSweep']);
```

