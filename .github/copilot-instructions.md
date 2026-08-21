# Pathfinder coding-agent instructions

Use [`../AGENTS.md`](../AGENTS.md) as the canonical compact agent guide for this repository.

In particular:

- Route by task instead of preloading the full developer reference.
- Read the relevant current `docs/` reference and the implementation before editing.
- Check [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md), `package.json`, `scripts/`, and `workflows/` before creating new tooling.
- Treat [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) as the ranked live entry point for solver optimization work; dated reports are evidence/history, not the current priority list.
- Preserve solver level-blindness and provenance distinctions.
- Keep diffs narrow and run the appropriate validation from [`../docs/testing.md`](../docs/testing.md) before claiming completion.

The large accumulated developer reference is at [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md) and should be loaded selectively when needed.
