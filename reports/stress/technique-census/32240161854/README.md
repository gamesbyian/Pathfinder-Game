# Technique capability census — run summary

Total cells: 78553 (missing shards: none; still-partial shards: technique-census-shard-85)
Solved: 18860
**Oracle union**: of 879 levels currently unsolved by the production ladder at the frozen baseline, 246 (28.0%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.
**Regression check**: of 1083 levels the production ladder currently solves, 16 have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).
Variant/flag regressions on a previously-solved level (default arm solves it, variant/flag-arm doesn't): 0 — see flag-sensitivity.md's "regressed on solved level" column for which variant.
Previously-unsolved levels with zero isolated-technique solves anywhere: 633
Hint files changed: 231

Plan: `plan/technique-census-plan.json`
