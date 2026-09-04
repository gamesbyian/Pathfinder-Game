# Scripts and local tooling

> **Historical path note:** `scripts/stress/` is the historical directory name for the current solver-research toolset. Maintained contents are current tools; the directory is not being renamed merely to modernize provenance.

For a named concept, use compact/queryable front doors before `package.json` or directory listings. [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) is the broader tool-choice reference; `package.json` is the npm-alias list, not the executable-file inventory.

## Cheap discovery first

- solver priority/state: [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md);
- research status: `node scripts/research-status-index.mjs --compact [--query=...] [--status=...] [--kind=...]`;
- solver evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`; add `--id=<asset-id>` or `--full` only when needed;
- agent-context size: `node scripts/agent-context-budget.mjs [--route=<id>]`; `--check` fails missing/over-max required routes;
- naming-cleanup history: `npm run naming:status`; use phase/batch/json options instead of reopening the frozen plan;
- corpora: `node scripts/corpus-query.mjs --corpus=stress2`; filters/list/sample stay compact, `--full` emits exact levels;
- hint/provenance: `npx tsx scripts/hint-query.mjs --id=<ID> [--levels=<corpus>]`; use `--full` only for exact paths/provenance;
- tracked raw artifacts: `node scripts/artifact-query.mjs [--query=...] [--role=...]`;
- completed GHA runs: `npm run gha:fetch-result -- --run=<run-id>` or `--workflow=<name>`; enumerate shards only when standard retrieval is incomplete;
- tool lookup: `node scripts/tooling-census.mjs --compact --query=<term>`;
- lifecycle/orphan review: `node scripts/tooling-census.mjs --orphans`.

These are discovery views, not replacement authorities. Open raw reports/data/logs or specialist docs only when relevant.

## Solver research specialists

For a matched deterministic DFS/admissible causal comparison, use the bounded paired decision trace rather than full-tree dumps:

```text
node scripts/run-bundled.mjs scripts/paired-deterministic-trace.mjs -- \
  --corpus=data/stress/stress-levels-random.json --level=<ID> \
  --left=<attempt-config-key> --right=<attempt-config-key> \
  --node-budget=200000 --trace-limit=4096 --out=/tmp/paired-trace.json
```

It runs fresh matched arms and reports retained multi-child decision-prefix agreement, first candidate/order/traversal divergence, and bounded post-divergence overlap. It rejects beam/repair; use their frontier/retention and restart-native instrumentation. No observed divergence does not prove every one-child/prune state matched. See [`../docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md).

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

1. Query `node scripts/tooling-census.mjs --compact --query=<concept>`; use the tooling catalog if the family is unclear.
2. Run `node scripts/tooling-census.mjs --orphans` so an unindexed specialist is not rebuilt under a new name.
3. For solver research, query existing assets and research status before generating evidence.
4. Check [`.github/workflows/`](../.github/workflows/README.md) for remote/sharded machinery.
5. Extend shared loaders/parsers/workers/report shapes when they already model the operation.
6. For telemetry/provenance/persistence/state/worker crossings, use [`../docs/change-recipes.md`](../docs/change-recipes.md).

Research-code presence does not imply an active hypothesis. Reconcile with [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) and dated evidence.

## Common rules

- Use the cheapest sufficient population/tool and persist long-run progress incrementally.
- Use shared explicit level selectors where required.
- Preserve level-blindness for cold capability experiments.
- Respect provenance classes when mining stored hints.
- Prefer compact query/summary views before large files.

Solver CLI semantics: [`../docs/solver-architecture.md`](../docs/solver-architecture.md). Validation: [`../docs/testing.md`](../docs/testing.md).
