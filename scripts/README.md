# Scripts and local tooling

> **Historical path note:** `scripts/stress/` is the historical directory name for the current solver-research toolset. Treat its maintained contents as **solver research scripts**; the directory is intentionally not being moved during the naming cleanup because that would create needless path and provenance churn.

For a named concept, start with `node scripts/tooling-census.mjs --compact --query=<term>` rather than opening the full `package.json` or listing every script. Use [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) when the task is broader or the query does not resolve the right tool family. `package.json` remains the exhaustive npm-alias list; it is not an exhaustive inventory of executable-looking files.

## Cheap discovery first

Before opening large evidence/data files:

- research/experiment status: `node scripts/research-status-index.mjs --compact`, optionally `--query=...`, `--status=...`, or `--kind=queue|experiment|evidence`;
- level corpora: `node scripts/corpus-query.mjs --corpus=stress2` for a summary; add filters, `--list`, or deterministic `--sample=N`; use `--full` only when exact level payloads are needed;
- hint/provenance evidence: `npx tsx scripts/hint-query.mjs --id=<ID> [--levels=<corpus>]`; filter by cold-evidence class, source, solver, technique, or retry tier; use `--full` only for exact paths/provenance;
- tracked raw artifacts: `node scripts/artifact-query.mjs`, optionally `--query=...` or `--role=...`;
- completed GHA solver/research runs: `npm run gha:result -- --run=<run-id>`; use `--workflow=<name>` when the run id is unknown, `--json` for the manifest, or `--out=<dir>` to retain the standard result. Do not enumerate shards for a normal successful run.
- script/tool lookup: `node scripts/tooling-census.mjs --compact --query=<term>` returns matching files, npm aliases, lifecycle labels, and compact reference counts without dumping the full census;
- lifecycle review: `node scripts/tooling-census.mjs --orphans` lists executable-looking files with no package alias, workflow/doc surface, or script caller; use `--json` only when machine-readable detail is actually needed.

These are derived views, not new authorities. Raw reports, corpora, hints, and logs remain canonical evidence. The tooling census is observational: an orphan candidate may be a useful specialist, a completed migration, or a historical research tool rather than something to delete.

## Solver research specialists

For a matched deterministic DFS/admissible causal comparison, use the bounded paired decision trace rather than dumping full trees:

```text
node scripts/run-bundled.mjs scripts/paired-deterministic-trace.mjs -- \
  --corpus=data/stress/stress-levels-random.json --level=<ID> \
  --left=<attempt-config-key> --right=<attempt-config-key> \
  --node-budget=200000 --trace-limit=4096 --out=/tmp/paired-trace.json
```

It runs each arm from a fresh prepared level under matched bounds and reports the common retained multi-child decision prefix, first actual candidate/order/traversal divergence, and bounded post-divergence signature overlap. It intentionally rejects beam and repair; use their existing frontier/retention and restart-native instrumentation instead. Because the observer records multi-child decision events, absence of a divergence is not proof that every one-child/prune state was identical.

Operational interpretation and stop rules: [`../docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md).

## Directory map

- `stress/`: corpus generation, benchmarks, diagnostics, reducers, profiles, provenance, oracle/research tools. `npm run stress:generate-topology` is the alternative macro-maze/module generator for cross-generator challenge evidence; see [`../docs/solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md).
- `solver-parallel/`: parallel solver infrastructure.
- `solver-oracle/`: independent oracle/fuzz support.
- top-level `hint-*`: hint discovery/enumeration/provenance.
- top-level `family-*`: variant/family generation and analysis.
- `check-*`: repository/data/documentation invariants.
- `current-level-facts.mjs`: derives the current level/count/maxima snapshot; `--check` guards the generated developer-reference block and `--write` refreshes it.
- `*-unit-tests.mjs`: Vitest-owned unit suites.
- `*-node-test.mjs`: standalone Node/CLI-driving harnesses owned by `npm run test:node` aliases.

## Before adding a script

1. Run `node scripts/tooling-census.mjs --compact --query=<concept>`; use [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) if the result does not identify the right tool family. Open the full alias list or scan filenames only after those cheaper front doors.
2. Run `node scripts/tooling-census.mjs --orphans` so an unindexed specialist is not accidentally rebuilt under a new name.
3. Search existing scripts and relevant reports for the concept.
4. Check [`.github/workflows/`](../.github/workflows/README.md) for remote/sharded machinery.
5. Extend shared loaders/parsers/workers/report shapes when they already model the operation.
6. For a change that crosses telemetry, provenance, persistence, state, or worker boundaries, use [`../docs/change-recipes.md`](../docs/change-recipes.md).

Research code presence does not imply an active hypothesis; reconcile with the current solver queue and dated evidence.

## Common rules

- Use the cheapest sufficient population/tool.
- Persist long-run progress incrementally.
- Use shared explicit level selectors (`pos:` / `id:`) where required.
- Preserve level-blindness for cold capability experiments.
- Respect provenance classes when mining stored hints.

Solver CLI semantics: [`../docs/solver-architecture.md`](../docs/solver-architecture.md). Validation: [`../docs/testing.md`](../docs/testing.md).
