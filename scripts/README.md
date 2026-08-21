# Scripts and local tooling

Use [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) before scanning filenames or adding a script. `package.json` is the exhaustive npm-alias list.

## Directory map

- `stress/`: corpus generation, benchmarks, diagnostics, reducers, profiles, provenance, oracle/research tools.
- `solver-parallel/`: parallel solver infrastructure.
- `solver-oracle/`: independent oracle/fuzz support.
- top-level `hint-*`: hint discovery/enumeration/provenance.
- top-level `family-*`: variant/family generation and analysis.
- `check-*`: repository/data/documentation invariants.
- `*-unit-tests.mjs`: script/adapter harnesses that intentionally remain outside colocated module tests.

## Before adding a script

1. Check [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) and `package.json`.
2. Search existing scripts and relevant reports for the concept.
3. Check [`.github/workflows/`](../.github/workflows/README.md) for remote/sharded machinery.
4. Extend shared loaders/parsers/workers/report shapes when they already model the operation.

Research code presence does not imply an active hypothesis; reconcile with the current solver queue and dated evidence.

## Common rules

- Use the cheapest sufficient population/tool.
- Persist long-run progress incrementally.
- Use shared explicit level selectors (`pos:` / `id:`) where required.
- Preserve level-blindness for cold capability experiments.
- Respect provenance classes when mining stored hints.

Solver CLI semantics: [`../docs/solver-architecture.md`](../docs/solver-architecture.md). Validation: [`../docs/testing.md`](../docs/testing.md).
