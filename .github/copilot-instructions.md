# Pathfinder coding-agent instructions

Use [`../AGENTS.md`](../AGENTS.md) as the canonical compact guide. Route by task, load current topic docs selectively, and do not preload [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md).

Use compact discovery before broad catalogs: `node scripts/tooling-census.mjs --compact --query=<term>` for tools, `node scripts/research-status-index.mjs --compact --query=<term>` for prior evidence, and `node scripts/research-asset-query.mjs --query=<term>` for solver evidence assets/joins. Solver optimization starts at [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md). Validate with [`../docs/testing.md`](../docs/testing.md) and never claim an unrun check passed.
