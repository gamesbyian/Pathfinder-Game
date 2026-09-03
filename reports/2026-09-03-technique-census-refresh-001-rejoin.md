# Technique census refresh 001: completion and technique-niches rejoin

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — GHA run [`33717910218`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33717910218) completed (120/120 shards, no gaps), auto-committed to this branch as `b6fdec11`; technique-niches map rejoined against the fresh cells and diffed against the frozen 2026-09-01 snapshot.
> **Decision:** the refresh confirms and quantifies the drift `2026-09-03-frozen-technique-census-staleness-spotcheck.md` found on a 12-cell sample: real, bidirectional heuristic drift over the two weeks since the 2026-08-20 census (some levels gained isolated-technique support, some lost it), not a correctness bug. `reports/stress/technique-niches/2026-09-03/level-capability.json` is now the current capability-map snapshot; `2026-09-01`'s snapshot and any conclusion drawn from it (`frozenT1SupportClass`, singleton/doubleton counts, the post-976 rejoin's specific residual counts) should be treated as superseded, per the workstream-wide rules' own instruction.
> **Remaining gate:** none for this refresh/rejoin cycle itself. Future capability-dependent work should read from the 2026-09-03 snapshot, not 2026-09-01.
> **Evidence role:** infrastructure/evidence-refresh — rebuilding the frozen capability-map input, not itself an experiment.

## Census refresh completion

Run `33717910218` (dispatched in `2026-09-03-technique-census-refresh-001-preflight.md`) completed with all 120/120 shards present, no missing or partial shards. Auto-committed via the workflow's own `git push` to `claude/solver-dev-queue-wmrxlo` (commit `b6fdec11`), later merged to `main` along with 16 unrelated commits from other sessions active during the ~2-hour dispatch window (see `reports/stress/technique-census/33717910218/README.md`/`gha-source-run.json` for full provenance).

Top-line numbers from the run's own summary (`reports/stress/technique-census/33717910218/README.md`):

- 78,505 unique cells (0 duplicates, no missing/partial shards).
- 18,820 solved cells.
- Oracle union: of 888 levels currently unsolved by the production ladder, **277 (31.2%)** are solved by at least one T1 isolated technique at the full 50,000,000-node budget (up from 253 at the 2026-08-20 census).
- Regression check: of 1,074 levels the production ladder currently solves, **35** have literally zero T1 isolated-technique solvers at the full budget (up from 14) — this is the same drift direction the 12-cell spot-check already flagged, now measured at full population scale.
- 233 variant/flag regressions on a previously-solved level (see `flag-sensitivity.md`).
- 611 previously-unsolved levels still have zero isolated-technique solves anywhere.

## Technique-niches rejoin

Per the preflight report's own "What happens after" plan and `scripts/analyze-technique-niches.mjs`'s own footgun-avoidance comment (added earlier this session), rejoined the capability map into a **new** dated directory rather than overwriting the frozen 2026-09-01 snapshot:

```
node scripts/analyze-technique-niches.mjs \
  --cells=reports/stress/technique-census/33717910218/combined-cells.json \
  --coverage=reports/stress/technique-census/33717910218/level-technique-coverage.json \
  --out=reports/stress/technique-niches/2026-09-03/level-capability.json
```

Wrote `reports/stress/technique-niches/2026-09-03/level-capability.json`: 1,962 levels, 646 without a frozen T1 winner.

### Summary comparison

| metric | 2026-09-01 (frozen) | 2026-09-03 (fresh) | delta |
|---|---:|---:|---:|
| `productionSolved` | 1,074 | 1,074 | 0 (production ladder itself unchanged by this refresh) |
| `isolatedOracleSolved` | 1,313 | 1,316 | +3 |
| `productionMissIsolatedSolvable` | 253 | 277 | +24 |
| `productionSolvedNoFrozenT1Winner` | 14 | 35 | +21 |
| `noFrozenT1Winner` | 649 | 646 | -3 |
| `singleton` | 181 | 175 | -6 |
| `doubleton` | 96 | 94 | -2 |

## Delta digest (per workstream-wide rules: gain/loss IDs, not just aggregate counts)

Joined both snapshots by `levelId` and diffed each level's `frozenT1SupportClass`/`singleton`/`doubleton` fields directly (script not committed — a one-off local join, same convention as this session's other ad hoc joins).

- **229 levels** changed `frozenT1SupportClass` between the two snapshots (out of 1,962) — real, broad churn, not a handful of edge cases.
- **25 levels newly regressed** to `production-solved-without-frozen-t1-winner` (a production-solved level with zero isolated T1 solvers) from some other class — a strict subset of the 35-level total in that class at 2026-09-03 (the other 10 were already in that state at 2026-09-01; separately, 4 levels *left* that state by gaining a new isolated solver, reconciling `14 + 25 - 4 = 35`). Spot-checked three directly: `R03137` (`frozen-t1-thin-boundary`, sole solver `beam:intersectionHarvest@beam5000(diverse)` → zero solvers), `R03101` (sole solver `dfs:repair:repair` → zero), and `R02718` (`frozen-t1-broadly-supported`, **14 different solving actions** spanning beam/repair → zero) — the same kind of broad, technique-family-spanning drift the 12-cell spot-check already found, confirmed here at full scale and with an even more striking individual case (`R02718`'s 14-solver collapse). Full 25-ID list: `R03137, R03101, R03022, R02168, R00143, R02718, R01571, R03281, R02631, R01489, R02337, R02537, R02173, R02877, R02890, R02302, R02474, R02438, R02500, R01124, R02227, R02038, R00440, R02798, R03357`.
- **81 levels** newly gained isolated-technique support (`production-miss-without-frozen-t1-winner` → `production-miss-frozen-t1-solvable`) — real new oracle-union capability discovered at this HEAD that wasn't visible in the frozen snapshot. (First 10 of 81: `R01875, R02403, R01642, R02586, R03056, R02844, R02768, R03323, R02081, R03077` — full list retained in the local join output, not reproduced here in full given its length.)
- **Singleton churn:** 94 gained, 100 lost (net -6, matching the summary table). A level losing its singleton status either gained a second solver (broader support, generally good) or lost its sole solver entirely (a regression — check against the regression list above for overlap, e.g. `R02718` and several other regression IDs also appear in the singleton-lost list, meaning some of these were previously *exclusively* held together by one technique this refresh shows no longer works).
- **Doubleton churn:** 60 gained, 62 lost (net -2).

## Interpretation

This is exactly the outcome the preflight report's own calibration predicted: a real, bidirectional capability-map shift over two weeks of intervening solver work, not a one-directional regression and not noise. The oracle-union side is a genuine net positive (+24 previously-unsolved levels now have a known isolated-technique rescuer). The regression side is real and should not be waved away: 25 production-solved levels — including at least one (`R02718`) that used to have 14 independent solving actions — now have zero isolated T1 winners at the same budget, meaning any future work that reads `frozenT1SupportClass`/singleton-doubleton status for those specific levels from the 2026-09-01 snapshot would be reasoning from stale, now-contradicted evidence.

This does not, by itself, diagnose *why* any individual technique regressed on any individual level — that would be its own fresh-vs-preceded-style investigation per level if a specific regression ever becomes decision-relevant (e.g. if a future scheduler candidate's rare-capability retention audit leans on one of these specific IDs). This report's job is narrower: confirm the refresh is real, complete, and usable, and hand off a dated, diffable successor snapshot.

**What this changes going forward:** any session doing rare-capability retention auditing, niche/specialist-technique analysis, or citing `frozenT1SupportClass`/singleton/doubleton counts should read `reports/stress/technique-niches/2026-09-03/level-capability.json`, not `2026-09-01`'s. The 2026-09-01 snapshot remains valid *historical* evidence for anything already concluded from it (e.g. `portfolio-18-specialists`' own 144/151 rare-capability retention audit, which was explicitly scoped and disclosed as using that population/budget) — this refresh does not retroactively invalidate a conclusion that already disclosed its snapshot's age, it just means a *new* claim should use current evidence.

## Cross-reference

The other pending GHA work from this research line — `portfolio-18-tranche-v2`'s cross-generator transfer check — completed in the same window; see `2026-09-03-portfolio-18-tranche-v2-cross-generator-001-preflight.md`'s own Result section (tranche-v2 ties `full-menu` on Corpus 1, unlike its outright wins on both Corpus-2 confirmations — a weaker-magnitude but still non-regressing transfer result).

## Reproduction

```
node scripts/analyze-technique-niches.mjs \
  --cells=reports/stress/technique-census/33717910218/combined-cells.json \
  --coverage=reports/stress/technique-census/33717910218/level-technique-coverage.json \
  --out=reports/stress/technique-niches/2026-09-03/level-capability.json
```

Delta digest: join `reports/stress/technique-niches/2026-09-01/level-capability.json` and the 2026-09-03 output above by `levelId`, diff `frozenT1SupportClass`/`singleton`/`doubleton` per level (not committed as a script — a one-off local join).
