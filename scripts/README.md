# Scripts and local tooling

This directory contains Pathfinder's local developer, validation, solver, corpus, hint, family, and research tools. Because the toolset is large, do not discover it by scanning filenames and guessing.

Start with [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md). `package.json` is the exhaustive list of npm aliases and should be preferred when a stable alias exists.

## Directory map

- `stress/`: stress-corpus generation, benchmarking, diagnostics, reducers, profiles, provenance analysis, CP-SAT/oracle probes, and solver-research pilots.
- `solver-parallel/`: parallel solver execution infrastructure.
- `solver-oracle/`: oracle/fuzz support.
- top-level `hint-*`: hint generation, workbench, diversification, enumeration, and provenance-related tooling.
- top-level `family-*`: sibling/cousin family generation and analysis.
- `check-*`: repository/data/documentation invariants.
- `*-unit-tests.mjs` and similar harnesses: residual script/adapter tests that intentionally live outside the colocated Vitest suites.

## Before adding a script

1. Search [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) by the question you need to answer.
2. Search `package.json` for an existing command family.
3. Search this directory for the relevant concept and read its current documentation/report before assuming a similarly named script is obsolete.
4. Check [`.github/workflows/`](../.github/workflows/README.md) for a sharded/remote version of the operation.
5. Prefer extending a shared loader/parser/worker/report shape over creating a near-duplicate tool when the existing abstraction already represents the same experiment.

Research code being present does not mean the hypothesis remains active. Reconcile against [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md), [`../docs/future-work.md`](../docs/future-work.md), and the relevant dated report.

## Selection rules worth remembering

- Use the smallest population and cheapest tool that can decide the next gate before launching a large sweep.
- Batch tools must persist/report results incrementally rather than only at process end.
- Level selection uses the shared explicit selector convention where applicable: use `pos:` or `id:` for bare numbers/ranges rather than relying on ambiguous numeric interpretation.
- Cold solver capability experiments must preserve the level-blindness contract and may not silently prime from exact-level hints/history.
- Provenance classes matter when mining stored hints; valid solution data is broader than cold production-solver evidence.

See [`../docs/solver-architecture.md`](../docs/solver-architecture.md) for solver CLI semantics and [`../docs/testing.md`](../docs/testing.md) for validation commands.
