# Scripts and local tooling

Use [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) before scanning filenames or adding a script. `package.json` is the exhaustive npm-alias list.

## Cheap discovery first

Before opening large evidence/data files:

- research/experiment status: `node scripts/research-status-index.mjs --compact`, optionally `--query=...`, `--status=...`, or `--kind=queue|experiment|evidence`;
- level corpora: `node scripts/corpus-query.mjs --corpus=stress2` for a summary; add filters, `--list`, or deterministic `--sample=N`; use `--full` only when exact level payloads are needed;
- tracked raw artifacts: `node scripts/artifact-query.mjs`, optionally `--query=...` or `--role=...`.

These are derived views, not new authorities. Raw reports, corpora, and logs remain canonical evidence.

## Directory map

- `stress/`: corpus generation, benchmarks, diagnostics, reducers, profiles, provenance, oracle/research tools.
- `solver-parallel/`: parallel solver infrastructure.
- `solver-oracle/`: independent oracle/fuzz support.
- top-level `hint-*`: hint discovery/enumeration/provenance.
- top-level `family-*`: variant/family generation and analysis.
- `check-*`: repository/data/documentation invariants.
- `current-level-facts.mjs`: derives the current level/count/maxima snapshot; `--check` guards the generated developer-reference block and `--write` refreshes it.
- `*-unit-tests.mjs`: Vitest-owned unit suites.
- `*-node-test.mjs`: standalone Node/CLI-driving harnesses owned by `npm run test:node` aliases.

## Before adding a script

1. Check [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) and `package.json`.
2. Search existing scripts and relevant reports for the concept.
3. Check [`.github/workflows/`](../.github/workflows/README.md) for remote/sharded machinery.
4. Extend shared loaders/parsers/workers/report shapes when they already model the operation.
5. For a change that crosses telemetry, provenance, persistence, state, or worker boundaries, use [`../docs/change-recipes.md`](../docs/change-recipes.md).

Research code presence does not imply an active hypothesis; reconcile with the current solver queue and dated evidence.

## Common rules

- Use the cheapest sufficient population/tool.
- Persist long-run progress incrementally.
- Use shared explicit level selectors (`pos:` / `id:`) where required.
- Preserve level-blindness for cold capability experiments.
- Respect provenance classes when mining stored hints.

Solver CLI semantics: [`../docs/solver-architecture.md`](../docs/solver-architecture.md). Validation: [`../docs/testing.md`](../docs/testing.md).
