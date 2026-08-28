# Pathfinder coding-agent instructions

Use [`../AGENTS.md`](../AGENTS.md) as the canonical compact guide. Route by task, load current topic docs selectively, and do not preload [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md).

Before adding tooling, query the concept with `node scripts/tooling-census.mjs --compact --query=<term>` first; use [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md), `package.json`, `scripts/`, or workflows only when the compact lookup is insufficient. Solver optimization follows the current workstream execution priority and level-blindness contract. Validate with [`../docs/testing.md`](../docs/testing.md) and never claim an unrun check passed.
