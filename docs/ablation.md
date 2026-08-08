# Ablation Laboratory

> Specialized solver-analysis tool (not part of core gameplay or CI gates), so its full reference
> lives here rather than in CLAUDE.md. Entry points: `scripts/run-ablation.mjs`,
> `scripts/analyze-ablation.mjs`, `scripts/ablation-config.mjs`; npm scripts `ablation:*`.

The ablation framework measures what each solver feature actually contributes. Every major capability is independently togglable via an ablation config passed through `opts.ablation`. Most features default on; experimental opt-ins default off. The baseline uses those production defaults and is identical to the unmodified solver.

The `ablation:*` npm scripts run through `scripts/run-bundled.mjs` (not `tsx`) for the same
reason `solver:bench`/`stress:benchmark` do: the solver's hot path is ~5× slower under `tsx`'s
per-module transform, which would make every wall-clock number the lab reports incomparable to
production/benchmark timings.

### Feature flags (76 total)

| Group | Flags | Controls |
|---|---|---|
| **scoring** (18) | `SCORE_GOAL_ATTRACTION`, `SCORE_FINISH_COMMITMENT`, `SCORE_OBJECTIVE_ATTRACTION`, `SCORE_MUST_PASS_URGENCY`, `SCORE_MUST_CROSS_URGENCY`, `SCORE_MC_APPROACH_GUIDANCE`, `SCORE_FLIPPER_URGENCY`, `SCORE_INTERSECTION_SETUP`, `SCORE_PERIMETER_BIAS`, `SCORE_PHASE_SCALING`, `SCORE_ANTI_DITHER`, `SCORE_REVISIT_PENALTY`, `SCORE_TEMPLATE_BONUS`, `SCORE_SURROUND_URGENCY`, `SCORE_ADJ_TURN_URGENCY`, `SCORE_MUST_TURN_URGENCY`, `SCORE_MUST_TURN_EXIT_GUIDANCE`, `SCORE_PORTAL_PARITY_GUIDANCE` | Move scoring terms in `scoreMove` |
| **pruning** (15) | Every `PRUNE_*` entry in `scripts/ablation-config.mjs` | Dead-branch pruning in DFS + beam + repair |
| **strategy** (23) | Every `STRATEGY_*` entry in `scripts/ablation-config.mjs` | Search-level optimisations + orchestration machinery |
| **templates** (8) | `TEMPLATE_CORNER_HARVEST`, `TEMPLATE_PERIMETER_CW`, `TEMPLATE_PERIMETER_CCW`, `TEMPLATE_SIDE_COMMITMENT`, `TEMPLATE_SIDE_X_LOW/HIGH`, `TEMPLATE_SIDE_Y_LOW/HIGH` | Structural traversal templates |
| **profiles** (12) | `PROFILE_<name>` for every policy profile | Attempt config eligibility |

Notes on the repair/orchestration strategy flags: `STRATEGY_REPAIR_FALLBACK` removes both repair
attempt configs entirely (which also removes the early probe — it iterates the same configs);
`STRATEGY_REPAIR_PROBE` skips only the early probe while keeping the full-budget fallback loop,
isolating the probe's scheduling contribution; `STRATEGY_REPAIR_MUSTTURN_BIAS` removes only the
biased second repair attempt; `STRATEGY_LOWER_BOUND_MEMO` bypasses the exact must-pass/must-cross
lower-bound caches (identical values, fresh compute) to measure the memoization's pure-speed win.

Five flags added in a later audit pass to close ablation-coverage gaps that predated them (real
solver mechanisms with no corresponding toggle — see the audit's own findings for the full
before/after): `STRATEGY_ARCHETYPE_ROUTING` disables `ATTEMPT_POLICY`'s feature/archetype-based
rule selection, forcing every level through the catch-all default rule regardless of detected
archetype — the only lever that isolates how much the routing itself contributes, as opposed to
the config bundles it selects among (previously invisible to this tooling entirely, since
`getAttemptConfigs` ran before any ablation config was applied). `STRATEGY_MIN_BUDGET_FLOOR` gates
the `minBudgetFraction` budget-share floor (documented above but previously unconditional — no
flag). `STRATEGY_REPAIR_ELITE_SPLICE`, `STRATEGY_REPAIR_STAGNATION_BURST`, and
`STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST` gate three independently-tuned `repair-search.ts` exploration
heuristics (elite-pool splicing, stagnation-triggered fresh-restart bursts, and the must-turn-biased
attempt's exit-guidance nudge respectively) that previously only existed as unconditional constants
inside the repair loop, with no ablation surface at all — `STRATEGY_REPAIR_FALLBACK`/
`STRATEGY_REPAIR_MUSTTURN_BIAS` could only turn whole attempts on/off, not these finer-grained
mechanisms within them. `SCORE_MUST_TURN_EXIT_GUIDANCE` similarly splits what was previously a
single shared flag (`SCORE_MUST_TURN_URGENCY` gated both the distance-to-cell urgency term AND the
exit-direction guidance term in `scoring.ts`, despite them having independent profile weights
already) so the two can be ablated independently.

`STRATEGY_REPAIR_LENGTH_GAP_CLOSE` (added 2026-07-17, see
[`docs/solver-development-roadmap.md`](solver-development-roadmap.md)'s Campaign 1) gates
`repair-search.ts`'s `closeLengthGap` operator: on a restart dead end where every non-length/
intersection objective is already satisfied (`structuralDeficit(ws, level) === 0`), it tries a
small bounded backtracking search — within that restart's own suffix only, never re-opening the
elite-splice/fresh-start prefix — to close the exact `reqLen`/`reqInt` gap instead of discarding
the restart. Diagnosed and proposed in
[`reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md`](../reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md);
see that campaign's addenda for whether it shipped and what it measured.

`STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS` (added 2026-07-18) widens `closeLengthGap`'s trigger
from `structuralDeficit(ws, level) === 0` to `<= LENGTH_GAP_CLOSE_STRUCTURAL_SLACK` (default 1) —
i.e. it also attempts the close when exactly one non-length objective is still pending, not only
when every one already is. Diagnosed and measured in
[`reports/2026-07-18-length-gap-close-invocation-rate.md`](../reports/2026-07-18-length-gap-close-invocation-rate.md).
Correctness is unaffected by the wider trigger (a returned solve still only ever comes from the
same `evaluatePrunedMove`/`isSolutionState` gate as every other success path in this file) — the
flag only changes when the (cheap, bounded) attempt is made.

Additionally, `ATTEMPT_ORDER` can be set to `'reverse'`, `'random'` (with `_randomSeed`), or `'profile-grouped'` to test ordering sensitivity.

### Ablation commands

```bash
# One-shot baseline (fast — just measures solve rate + nodes at default settings)
npm run ablation:baseline -- --budget-ms=15000 --output=logs/ablation/baseline.json

# Single-feature experiments (default-on features off; opt-in features on; all 76 features)
npm run ablation:single -- --budget-ms=10000 --output=logs/ablation/single.json

# Profile ablations (each profile off + solo)
npm run ablation:profiles -- --budget-ms=10000 --output=logs/ablation/profiles.json

# Template ablations
npm run ablation:templates -- --budget-ms=10000 --output=logs/ablation/templates.json

# Attempt order sensitivity
npm run ablation:order -- --budget-ms=10000 --output=logs/ablation/order.json

# Pairwise combination testing
npm run ablation:pairs -- --budget-ms=10000 --output=logs/ablation/pairs.json

# Full lab (all 132 experiments — runs in background, takes ~1-3h depending on budget)
npm run ablation:full -- --budget-ms=5000 --output=logs/ablation/lab-full.json

# Analyse results and print ranked report
npm run ablation:analyze -- --input=logs/ablation/lab-full.json --text

# Targeted: only pruning rules on hard levels
node scripts/run-bundled.mjs scripts/run-ablation.mjs \
  --experiment=single-feature \
  --levels=pos:74,pos:129,pos:130,pos:140,pos:145,pos:146,pos:147 \
  --filter=PRUNE \
  --budget-ms=30000

# Reuse a saved baseline to skip re-running it
node scripts/run-bundled.mjs scripts/run-ablation.mjs \
  --experiment=single-feature \
  --baseline=logs/ablation/baseline.json \
  --budget-ms=10000 \
  --output=logs/ablation/single.json
```

### run-ablation.mjs flags

| Flag | Default | Description |
|---|---|---|
| `--experiment=<phase>` | `full` | `baseline`, `single-feature`, `profiles`, `templates`, `order`, `pairs`, `full` |
| `--corpus=<path>` | `data/levels.json` | Level corpus; pass `data/stress/stress-levels.json` to target the stress corpus (witness `stressMeta` is stripped before solving, same as `stress:benchmark`) |
| `--levels=<spec>` | `all` | Level filter, explicit-prefix only (see CLAUDE.md's "--levels selector semantics" note): published corpus `pos:1-10`/`pos:74,pos:129`; stress corpus `id:1-20` → every id-shape match (e.g. `S00001`–`S00020`), or a full id string (`S00028`, `R00042`) verbatim, no prefix needed. Bare numbers are rejected. |
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
const result = await Solver.solve(level, {
  timeBudgetMs: 15000,
  ablation: withFeatureDisabled('SCORE_GOAL_ATTRACTION'),
});
console.log(result.nodesExpanded); // now available on every solve result

// Disable all pruning (WARNING: very slow)
const noPrune = withFeaturesDisabled(['PRUNE_DISTANCE_BOUND', 'PRUNE_CONNECTIVITY', ...]);

// Only one profile active
const singleProfile = soloConfig(['PROFILE_perimeterSweep']);
```
