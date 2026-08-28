# Hint Workbench

> **Budget naming:** `--wall-ms` is retained as a compatibility CLI name, but hint-discovery extent is deterministic work-bounded. The workbench converts the ms-shaped value once using the committed work-per-ms calibration; phase progression does not read elapsed wall time. `elapsedMs` remains telemetry only.

CLI for discovering/auditing hint candidates. Default runs are read-only. Generated paths use shared validation/deduplication and policy evaluation; player display curation remains `selectDisplayHints()`.

## Presets

| Preset | Runs / purpose |
|---|---|
| `enumerate-targeted` | Targeted System A/B enumeration around existing coverage. |
| `enumerate-complete` | Complete variety-search DFS enumeration within bounds. |
| `ablation-ui` | Browser-safe baseline, forward gate×direction, portal-exit phases. |
| `ablation-full` | All 7 phases, including reverse and evidence-bounded combined forcing; defaults `--directions=forward,reverse --combined=evidence`. |
| `ablation-combined-only` | Combined F/G only; ignores direction/combined flags. |
| `ablation-reverse-only` | Reverse D/E/G only; ignores direction/combined flags. |
| `candidate-grid` | Forced-first-step × strategy grid, unforced strategy sweep, sampled corner-flip mutation; bounded by `--wall-ms`, no portal-exit forcing. |
| `portal-grid` | Gate-direction × portal-destination-exit-direction plain solve; opt-in, `--max-combos` default 500, `--wall-ms`, no-op without portals. |
| `ui-plus` | `enumerate-targeted -> ablation-ui -> enumerate-targeted` |
| `full-practical` | `enumerate-targeted -> ablation-full` |
| `full-practical-plus` | `enumerate-targeted -> ablation-full -> candidate-grid`; final mutation may sample earlier finds. |
| `all-practical` | Deprecated alias for `ui-plus`. |

Help: `npm run hints:workbench -- --help`.

## Axis overrides

`--include`: `enumeration`, `complete-enumeration`, `ablation`, `ablation-full`, `ablation-combined-only`, `ablation-reverse-only`, `candidate-grid`, `portal-grid`.

For `ablation-full`:
- `--directions=forward`: baseline + forward gate×direction + portal-exit;
- `--directions=forward,reverse`: adds D/E/G reversal phases;
- `--combined=off`: no combined forcing;
- `--combined=evidence`: only `(gate,direction,portalDest)` triples proven reachable by existing/new hints;
- `--combined=full`: unsupported; fails fast.

Other modes default to forward-only/combined-off; fixed reverse/combined presets ignore these flags.

```bash
npm run hints:workbench -- \
  --levels=id:1 \
  --include=enumeration,ablation-full \
  --directions=forward,reverse \
  --combined=evidence \
  --policy=audit-only --audit-policy=novelty-gated \
  --output=tmp/hint-workbench-axis-audit.json
```

## Policies

| Policy | Behavior |
|---|---|
| `save-all` | Accept every valid exact-deduped candidate. |
| `novelty-gated` | Use `decideCandidateAcceptance()` novelty/coverage scoring. |
| `audit-only` | Evaluate `--audit-policy` without mutating hint artifacts. |

Audit mode leaves `acceptedPaths` empty and reports `wouldAcceptPaths` / `wouldAcceptPathSignatures`. `--policy-report=full` includes every decision; `rejections-only` includes rejected candidates with `wouldRejectReason`.

## Report schema

`schemaVersion: 1` reports include requested/resolved preset and `axisPlan`; CLI/audit/policy settings; per-level status/counts; generator `status`/`exhaustion`; `axisCoverage` step and produced/accepted counts; ablation counters or `null`; provenance and duplicate counts; optional policy detail; and write summaries. Use `--include-paths=false` to retain signatures without full paths.

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

# Full practical ablation
npm run hints:workbench -- \
  --levels=id:145 --preset=full-practical \
  --policy=audit-only --audit-policy=novelty-gated \
  --wall-ms=600000 \
  --output=reports/hint-workbench/level-145-full-practical-audit.json
```

## Writes and patches

Append accepted candidates only with `--write-levels --yes=true`. Source-controlled artifact outputs such as `data/` require `--allow-artifact-output=true`. For review without mutation use `--write-patch=<path>`.

After applying a patch or mutating hints:

```bash
npm run levels:generate-heatmaps
npm run check:level-data-validity
npm run test:hint-path-oracle
```

## Cross-level parallelism

`npm run hints:workbench-parallel` (`scripts/hint-workbench-parallel.mjs`) partitions levels round-robin, runs ordinary workbench children, then merges reports/patches.

```bash
npm run hints:workbench-parallel -- \
  --levels=all --parallel=8 \
  --preset=enumerate-targeted \
  --policy=audit-only --audit-policy=novelty-gated \
  --output=reports/hint-discovery/parallel-audit.json
```

All flags except `--levels`, `--output`, `--parallel`, `--allow-artifact-output`, and `--write-patch` pass through. Disjoint-level `--write-levels` is safe because `writeLevelsWithHints` writes only each level's hint file. Patch mode uses temporary per-shard paths before merge. Parallelism is across levels; within-level evidence chaining stays in one child.

## Admissible-slack enumeration

`--enum-order=admissible-slack` combines `rankByAdmissibleSlack` from `admissible-order-search.ts` with the full `evaluatePrunedMove` admissible gauntlet. Ranking alone was worse than random because dead low-slack branches were explored deeply.

With ranking + pruning, one test used ~10.8× fewer nodes for full exhaustion and solved inside 100 nodes where a fixed random restart did not. Published `P00105` exhaustive sharded enumeration fell from 353,444 to 28,294 nodes (~12.5×) with the same 3-solution set.

Options:
- `--enum-order=admissible-slack` (default `random`);
- `--enum-tie-break=true`: soft empty/default-`ScoringProfile` tie-break; default false;
- deterministic admissible-slack caps restarts at 1.

Provenance adds `:admissible-slack` to `solver.technique`; `profile: 'flat'` marks tie-break use. The flags also work in `hint-corpus-expand.mjs` and `hint-complete-enumeration-sharded.mjs` through shared `hint-enumeration.ts`.

A 2026-07-25 audit fixed `rankByAdmissibleSlack` sorting negative-slack dead candidates first. Correctness was unchanged because `evaluatePrunedMove` rejects them; `solver:bench --check` stayed 160/160. History: `reports/2026-07-25-hint-tool-comparison.md`. Broader enumeration validation remains incomplete.

## Current limitations / retained tools

- `--combined=full` is intentionally unavailable; combined forcing is evidence-bounded.
- `hint-diversification.mjs` and the workbench share `hint-ablation-generator.ts`, but outer-CLI byte parity is untested.
- Default `reports/hint-workbench/latest.json` overwrites; pass `--output` when history matters.
- Within-level worker-parallel exhaustive enumeration remains `hint-complete-enumeration-sharded.mjs`; `enumerate-complete` is sequential.
- `hint-candidate-search.mjs` remains supported for targeted controlled runs. Coexistence with the workbench is intentional and is not itself a migration task; add new orchestration to the workbench and revisit removal only for a concrete maintenance or parity need.