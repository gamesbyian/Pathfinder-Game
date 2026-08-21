# Hint Workbench

CLI for discovering/auditing hint candidates. By default it does not mutate level data. Generated paths are validated/deduped through the shared acceptance path, evaluated by policy, and reported as JSON. Player-facing display curation remains `selectDisplayHints()`.

## Presets

| Preset | Runs / purpose |
|---|---|
| `enumerate-targeted` | Targeted System A/B enumeration around existing coverage. |
| `enumerate-complete` | Complete variety-search DFS enumeration within configured bounds. |
| `ablation-ui` | Browser-safe UI ablation phases: baseline, forward gate×direction, forward portal-exit. |
| `ablation-full` | All 7 ablation phases, including reverse and evidence-bounded combined forcing. Defaults to `--directions=forward,reverse --combined=evidence`. |
| `ablation-combined-only` | Evidence-bounded combined phases F/G only; ignores direction/combined flags. |
| `ablation-reverse-only` | Reverse phases D/E/G only; ignores direction/combined flags. |
| `candidate-grid` | Forced-first-step × strategy grid, unforced strategy sweep, and sampled corner-flip mutation. Bounded by `--wall-ms`; no portal-exit forcing. |
| `portal-grid` | Every gate-direction × portal-destination-exit-direction plain solve. Opt-in; capped by `--max-combos` (default 500) and `--wall-ms`; no-op without portals. |
| `ui-plus` | `enumerate-targeted -> ablation-ui -> enumerate-targeted` |
| `full-practical` | `enumerate-targeted -> ablation-full` |
| `full-practical-plus` | `enumerate-targeted -> ablation-full -> candidate-grid`; final mutation can sample finds from earlier steps. |
| `all-practical` | Deprecated alias for `ui-plus`. |

Help: `npm run hints:workbench -- --help`.

## Axis overrides

Supported `--include` values: `enumeration`, `complete-enumeration`, `ablation`, `ablation-full`, `ablation-combined-only`, `ablation-reverse-only`, `candidate-grid`, `portal-grid`.

For `ablation-full`:
- `--directions=forward`: baseline + forward gate×direction + portal-exit;
- `--directions=forward,reverse`: also D/E/G reversal phases;
- `--combined=off`: no combined forcing;
- `--combined=evidence`: only `(gate,direction,portalDest)` triples proven reachable by existing/new hints;
- `--combined=full`: not implemented; fails fast.

Outside `ablation-full`, defaults are forward-only / combined-off. Fixed-name reverse/combined presets ignore these flags.

Example:

```bash
npm run hints:workbench -- \
  --levels=id:1 \
  --include=enumeration,ablation-full \
  --directions=forward,reverse \
  --combined=evidence \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --output=tmp/hint-workbench-axis-audit.json
```

## Policies

| Policy | Behavior |
|---|---|
| `save-all` | Accept every valid exact-deduped candidate. |
| `novelty-gated` | Use `decideCandidateAcceptance()` novelty/coverage scoring. |
| `audit-only` | Evaluate `--audit-policy` but never mutate hint artifacts. |

Audit mode leaves `acceptedPaths` empty and reports `wouldAcceptPaths` / `wouldAcceptPathSignatures`. `--policy-report=full` includes all candidate decisions; `rejections-only` includes rejected candidates with `wouldRejectReason`.

## Report schema

Reports use `schemaVersion: 1` and include:
- requested/resolved preset and `axisPlan`;
- CLI options, `auditMode`, `evaluationPolicy`;
- per-level status/hint counts;
- per-generator `status` / `exhaustion`;
- `axisCoverage` attempted/completed/budgeted/capped/cancelled steps and produced/accepted counts;
- `axisCoverage.ablation` counters (`baselineTried`, gate/swap/portal/combined counts, `phasesRun`) or `null` when never attempted;
- candidate provenance and exact/canonical duplicate rejection counts;
- optional policy detail;
- write summaries when applicable.

Use `--include-paths=false` to retain signatures but omit full path arrays.

## Common read-only runs

```bash
# Fast smoke
npm run hints:workbench -- \
  --levels=id:1 --preset=enumerate-targeted \
  --policy=audit-only --audit-policy=novelty-gated \
  --restarts=1 --node-budget=100 --wall-ms=1000 --max-accepted=1 \
  --output=tmp/hint-workbench-smoke.json

# Browser-safe practical sweep
npm run hints:workbench -- \
  --levels=id:1-10 --preset=ui-plus \
  --policy=audit-only --audit-policy=novelty-gated \
  --output=reports/hint-workbench/ui-plus-audit.json

# Full ablation practical sweep
npm run hints:workbench -- \
  --levels=id:145 --preset=full-practical \
  --policy=audit-only --audit-policy=novelty-gated \
  --wall-ms=600000 \
  --output=reports/hint-workbench/level-145-full-practical-audit.json
```

## Writes and patches

Append accepted candidates only with `--write-levels --yes=true`. The workbench rejects report output under source-controlled artifact paths such as `data/` unless `--allow-artifact-output=true` is explicit.

For review without mutation, use `--write-patch=<path>`.

After applying a patch or mutating hints:

```bash
npm run levels:generate-heatmaps
npm run check:hint-validity
npm run test:hint-path-oracle
```

## Cross-level parallelism

`scripts/hint-workbench-parallel.mjs` / `npm run hints:workbench-parallel` partitions levels round-robin across child processes, runs ordinary workbench invocations, then merges reports and patches.

```bash
npm run hints:workbench-parallel -- \
  --levels=all --parallel=8 \
  --preset=enumerate-targeted \
  --policy=audit-only --audit-policy=novelty-gated \
  --output=reports/hint-discovery/parallel-audit.json
```

All flags except `--levels`, `--output`, `--parallel`, `--allow-artifact-output`, and `--write-patch` pass through to children. Disjoint-level `--write-levels` is safe because `writeLevelsWithHints` writes only each level's own hint file. Patch mode uses per-shard temporary patch paths before merge.

This parallelism is across levels only. Within-level evidence chaining remains inside one child.

## Admissible-slack enumeration

`--enum-order=admissible-slack` reuses `admissible-order-search.ts`'s `rankByAdmissibleSlack` plus the full `evaluatePrunedMove` admissible pruning gauntlet. Ranking without the stronger pruning was measured worse than random because dead low-slack branches were explored deeply.

With both ranking and pruning, the test case used ~10.8× fewer nodes for full exhaustion and solved inside 100 nodes where a fixed random restart did not. On published `P00105`, exhaustive sharded enumeration fell from 353,444 to 28,294 nodes (~12.5×) with the identical 3-solution set.

Options:
- `--enum-order=admissible-slack` (default is `random`);
- `--enum-tie-break=true`: soft scoring tie-break using an empty/default `ScoringProfile`; default false;
- restarts automatically cap at 1 because this ordering is deterministic.

Provenance records `solver.technique` with `:admissible-slack`; `profile: 'flat'` marks tie-break use.

The same flags work in `hint-corpus-expand.mjs` and `hint-complete-enumeration-sharded.mjs` because they share `hint-enumeration.ts`.

A 2026-07-25 audit also fixed `rankByAdmissibleSlack` sorting negative-slack dead candidates first instead of last. Correctness was unchanged because `evaluatePrunedMove` rejects them either way; `solver:bench --check` remained 160/160. See `reports/2026-07-25-hint-tool-comparison.md` for history. Enumeration-scale validation beyond the cited cases remains incomplete.

## Current limitations / retained separate tools

- `--combined=full` is intentionally unavailable; combined forcing is evidence-bounded.
- `hint-diversification.mjs` and the workbench share `hint-ablation-generator.ts`, but there is no byte-for-byte parity test between their outer CLIs.
- Default `reports/hint-workbench/latest.json` overwrites on repeat local runs; pass `--output` when history matters.
- Within-level worker-parallel exhaustive enumeration remains `hint-complete-enumeration-sharded.mjs`; the workbench's `enumerate-complete` is sequential. Cross-level parallelism uses `hint-workbench-parallel.mjs`.
- `hint-candidate-search.mjs` remains supported until a parity/migration check proves every documented use is covered by the workbench (`candidate-grid` overlap alone is insufficient).
