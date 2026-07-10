# Hint Workbench

The hint workbench is a CLI for discovering and auditing hint candidates without changing level data by default. It runs generator presets, validates/deduplicates candidates through the shared acceptance path, and writes a JSON report for review.

## Mental model

The workbench separates four concerns:

1. **Generation**: presets run one or more candidate generators.
2. **Validation and dedupe**: every generated path is checked before policy evaluation.
3. **Policy evaluation**: `save-all`, `novelty-gated`, or audit evaluation decides whether a candidate is worthy.
4. **Writing**: accepted candidates are appended to hint artifacts only when `--write-levels` is passed, and audit mode never writes.

Player-facing hint display curation is separate and remains owned by `selectDisplayHints()`.

## Presets

| Preset | What it runs | Use when |
| --- | --- | --- |
| `enumerate-targeted` | Targeted System A/B enumeration around existing hint coverage. | You want a fast, focused search for more variety. |
| `enumerate-complete` | Complete variety-search DFS enumeration. | You want exhaustive enumeration within the configured budgets. |
| `ablation-ui` | Browser-safe solver ablation phases exposed by the in-editor diversification UI. | You want ablation-style solver variants without reverse or combined forcing. |
| `ui-plus` | `enumerate-targeted -> ablation-ui -> enumerate-targeted`. | You want the current practical prototype sweep. |
| `all-practical` | Deprecated alias for `ui-plus`. | Use only for backwards compatibility; it does not include full reverse or combined phases. |

`ui-plus` is intentionally not named “all practical” because full reverse solving, portal-exit forcing, and evidence-bounded combined forcing are planned but not yet part of the workbench preset.

Print preset help with:

```bash
npm run hints:workbench -- --help
```

## Axis overrides

Presets expand into a serializable `axisPlan` in the report. You can override the preset steps for current supported axes with `--include`:

```bash
npm run hints:workbench -- \
  --levels=1 \
  --include=enumeration,ablation \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --output=tmp/hint-workbench-axis-audit.json
```

Currently supported `--include` values are `enumeration`, `complete-enumeration`, and `ablation`. Reverse directions and combined portal/gate forcing remain planned work; the workbench fails fast if `--directions` requests anything other than `forward` or if `--combined` is not `off`.

## Policies and audit mode

| Policy | Behavior |
| --- | --- |
| `save-all` | Accept every valid exact-deduped candidate. |
| `novelty-gated` | Accept candidates that pass `decideCandidateAcceptance()` novelty and coverage scoring. |
| `audit-only` | Evaluate a real policy but keep accepted write paths empty and never mutate hint artifacts. |

For audit runs, choose the policy to evaluate with `--audit-policy=save-all` or `--audit-policy=novelty-gated`:

```bash
npm run hints:workbench -- \
  --levels=1 \
  --preset=enumerate-targeted \
  --policy=audit-only \
  --audit-policy=save-all \
  --output=tmp/hint-workbench-audit.json
```

Audit reports use `wouldAcceptPaths` / `wouldAcceptPathSignatures` for candidates that would have been accepted, while `acceptedPaths` remains empty. Use `--policy-report=full` to include per-candidate policy decisions or `--policy-report=rejections-only` to include only rejected candidates with `wouldRejectReason`.

## Report format

Reports are JSON and currently use `schemaVersion: 1`. Each report includes:

- requested and resolved preset metadata;
- resolved `axisPlan` metadata with include axes, directions, combined mode, and expanded steps;
- CLI options, including `auditMode` and `evaluationPolicy`;
- per-level status and hint counts;
- per-generator run summaries with `status` and `exhaustion` fields;
- per-level `axisCoverage` summaries with attempted/completed/budgeted/capped/cancelled steps and produced/accepted counts by step;
- accepted or would-accept candidate metadata with generator provenance;
- rejection counts, including exact versus canonical duplicate buckets;
- optional per-candidate policy reports when `--policy-report=full` or `--policy-report=rejections-only` is used;
- write summaries with changed files and post-write reminders when `--write-levels` is used.

Use `--include-paths=false` for compact reports that omit full path arrays while retaining path signatures:

```bash
npm run hints:workbench -- \
  --levels=1 \
  --preset=enumerate-targeted \
  --policy=audit-only \
  --audit-policy=save-all \
  --include-paths=false \
  --output=tmp/hint-workbench-compact.json
```

## Read-only audit examples

Fast targeted smoke audit:

```bash
npm run hints:workbench -- \
  --levels=1 \
  --preset=enumerate-targeted \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --restarts=1 \
  --node-budget=100 \
  --wall-ms=1000 \
  --max-accepted=1 \
  --output=tmp/hint-workbench-smoke.json
```

Current practical prototype audit:

```bash
npm run hints:workbench -- \
  --levels=1-10 \
  --preset=ui-plus \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --output=reports/hint-workbench/ui-plus-audit.json
```

## Write-capable corpus expansion

Only pass `--write-levels --yes=true` when you intend to append accepted candidates to hint artifacts:

```bash
npm run hints:workbench -- \
  --levels=145 \
  --preset=enumerate-targeted \
  --policy=novelty-gated \
  --write-levels \
  --yes=true \
  --output=reports/hint-workbench/level-145-write.json
```

Write-capable reports include a `writes` summary with changed files and reminders. The workbench refuses to place report output under source-controlled artifact paths such as `data/` unless `--allow-artifact-output=true` is passed.


To review accepted hints without mutating hint artifacts, write them to a patch JSON file instead:

```bash
npm run hints:workbench -- \
  --levels=145 \
  --preset=enumerate-targeted \
  --policy=novelty-gated \
  --write-patch=tmp/level-145-hints.patch.json \
  --output=reports/hint-workbench/level-145-patch.json
```

After applying a patch file or running any write-capable mutation, regenerate and validate derived hint artifacts:

```bash
npm run levels:generate-heatmaps
npm run check:hint-validity
npm run test:hint-path-oracle
```

## Current limitations

- Full ablation, reverse solving, portal-exit forcing, and evidence-bounded combined forcing are still planned work.
- Dangerous full Cartesian products are not exposed as defaults.
- Per-rejection full candidate reporting is still planned for richer audit reports.
