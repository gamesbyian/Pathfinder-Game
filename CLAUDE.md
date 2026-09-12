# Pathfinder AI entry point

Read [`AGENTS.md`](AGENTS.md); it is the canonical compact coding/research-agent guide.

Load [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) only for rare game-rule, solver-gotcha, provenance, or level-fact context. Use current topic docs for behavior/decisions. For prior evidence use `node scripts/research-status-index.mjs --compact --query=<term>` before opening reports; for a named tool use `node scripts/tooling-census.mjs --compact --query=<term>`; for solver evidence assets/joins use `node scripts/research-asset-query.mjs --query=<term>`. Open broad catalogs/indexes only when those compact views are insufficient.

When a file exceeds a hard size limit, do not shave toward the boundary. Make one coherent reduction with margin (default: remove at least `max(2 × excess, 1 KB)`), then re-measure.
