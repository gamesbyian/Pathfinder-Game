# Variant trove branch notice

> **Status:** historical data branch, not a current coding or research-instruction environment.

This branch exists to retain the large generated Pathfinder family/variant trove. Its source code, documentation, root prompts, counts, solver behavior, and investigation state predate current `main` and must not be treated as current authority.

For any new coding or solver-research work:

1. Use current `main` as the working checkout and read its `AGENTS.md` plus the current topic docs.
2. Mount this branch through a separate worktree or other read-only path when its `data/families/`, `logs/family-census/`, or `reports/families/` artifacts are needed.
3. Run current tooling from `main`. If current tooling cannot consume an external family-data root, improve that tooling on `main` rather than running this branch's historical code.
4. Treat results stored here as historical evidence. Re-test decision-bearing solver claims on current code.
5. Preserve full parent/variant identity and artifact provenance when extracting evidence.

Recommended setup from a current `main` checkout:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
```

The current authority for how to use this resource is `docs/variant-level-research.md` on `main`, not the historical documents on this branch.
