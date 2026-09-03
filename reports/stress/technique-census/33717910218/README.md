# Technique capability census — run summary

Total cells: 78505 unique (0 duplicate result(s) removed; missing shards: none; still-partial shards: none)
Solved: 18820
**Oracle union**: of 888 levels currently unsolved by the production ladder at the frozen baseline, 277 (31.2%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.
**Regression check**: of 1074 levels the production ladder currently solves, 35 have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).
Variant/flag regressions on a previously-solved level: 233 — see flag-sensitivity.md.
Previously-unsolved levels with zero isolated-technique solves anywhere: 611
Hint files changed: 1316

Plan: `plan/technique-census-plan.json`
