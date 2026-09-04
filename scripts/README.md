# Scripts and local tooling

> **Historical path note:** `scripts/stress/` is the historical directory name for the current solver-research toolset. Maintained contents are current solver-research tools; the directory is not being renamed merely to modernize provenance.

For a named concept, start with compact/queryable front doors rather than opening `package.json` or listing directories. [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) is the broader tool-choice reference; `package.json` is the exhaustive npm-alias list, not the executable-file inventory.

## Cheap discovery first

- current solver priority: [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md);
- research/experiment status: `node scripts/research-status-index.mjs --compact [--query=...] [--status=...] [--kind=...]`;
- solver research evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`; add `--id=<asset-id>` or `--full` only when needed;
- agent-context route size: `node scripts/agent-context-budget.mjs [--route=<id>]`; `--check` fails only missing/over-max required routes;
- completed naming-cleanup status/history: `npm run naming:status`; use phase/batch/json options for targeted history rather than reopening the frozen plan;
- level corpora: `node scripts/corpus-query.mjs --corpus=stress2`; filters/list/sample stay compact, `--full` emits exact level payloads;
- hint/provenance evidence: `npx tsx scripts/hint-query.mjs --id=<ID> [--levels=<corpus>]`; use `--full` only for exact paths/provenance;
- tracked raw artifacts: `node scripts/artifact-query.mjs [--query=...] [--role=...]`;
- completed GHA solver/research runs: `npm run gha:fetch-result -- --run=<run-id>` or `--workflow=<name>`; enumerate shards only when the standard result is incomplete;
- script/tool lookup: `node scripts/tooling-census.mjs --compact --query=<term>`;
- lifecycle/orphan review: `node scripts/tooling-census.mjs --orphans`.

These are derived discovery views, not replacement authorities. Open raw reports, data, logs, or detailed docs when the compact result says they are relevant.

## Solver research specialists

For a matched deterministic DFS/admissible causal comparison, use the bounded paired decision trace rather than dumping full trees:

```text
node scripts/run-bundled.mjs scripts/paired-deterministic-trace.mjs -- \
  --corpus=data/stress/stress-levels-random.json --level=<ID> \
  --left=<attempt-config-key> --right=<attempt-config-key> \
  --node-budget=200000 --trace-limit=4096 --out=/tmp/paired-trace.json
```

It runs fresh matched arms and reports retained multi-child decision-prefix agreement, the first candidate/order/traversal divergence, and bounded post-divergence overlap. It intentionally rejects beam/repair; use their existing frontier/retention and restart-native instrumentation. No observed divergence is not proof every one-child/prune state matched. See [`../docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md).

## Directory map

- `stress/`: corpus generation, benchmarks, diagnostics, reducers, profiles, provenance, oracle/research tools.
- `solver-parallel/`: parallel solver infrastructure.
- `solver-oracle/`: independent oracle/fuzz support.
- top-level `hint-*`: hint discovery/enumeration/provenance.
- top-level `family-*`: variant/family generation and analysis.
- `check-*`: repository/data/documentation invariants.
- `current-level-facts.mjs`: current level/count/maxima snapshot; `--check` guards the generated reference block and `--write` refreshes it.
- `*-unit-tests.mjs`: Vitest-owned suites.
- `*-node-test.mjs`: standalone Node/CLI harnesses normally surfaced through `npm run test:node` aliases.

## Before adding a script

1. Query `node scripts/tooling-census.mjs --compact --query=<concept>`; use the tooling catalog if the family is still unclear.
2. Run `node scripts/tooling-census.mjs --orphans` so an unindexed specialist is not rebuilt under a new name.
3. For solver research, query `node scripts/research-asset-query.mjs --query=<concept>` and the compact research-status index before generating new evidence.
4. Check [`.github/workflows/`](../.github/workflows/README.md) for remote/sharded machinery.
5. Extend shared loaders/parsers/workers/report shapes when they already model the operation.
6. For telemetry/provenance/persistence/state/worker crossings, use [`../docs/change-recipes.md`](../docs/change-recipes.md).

Research-code presence does not imply an active hypothesis. Reconcile with the compact current solver queue and dated evidence.

## Common rules

- Use the cheapest sufficient population/tool and persist long-run progress incrementally.
- Use shared explicit level selectors where required.
- Preserve level-blindness for cold capability experiments.
- Respect provenance classes when mining stored hints.
- Prefer compact query/summary views before opening large files wholesale.

Solver CLI semantics: [`../docs/solver-architecture.md`](../docs/solver-architecture.md). Validation: [`../docs/testing.md`](../docs/testing.md).
