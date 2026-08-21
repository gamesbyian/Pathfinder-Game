# Pathfinder AI entry point

Read [`AGENTS.md`](AGENTS.md). It is the canonical compact coding/research-agent guide.

Load [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) only when broad game-rule, solver-gotcha, provenance, or repository-history context is actually needed. Current topic docs and [`reports/README.md`](reports/README.md) provide task-specific guidance and experiment history.

For solver runs over roughly 40–50 levels, especially A/B tests, prefer reusing or creating and dispatching a sharded GitHub Actions workflow rather than running the batch locally; use local runs for smaller samples and iteration.
