# static-portfolio production-entrypoint parity check

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — 15-level local reproduction, current HEAD (commit `b4ecb47a`)
> **Decision:** `solveLevel(level, { schedulerMode: 'static-portfolio', staticPortfolio: {...} })` — the real production entrypoint — produces byte-identical `ok`/`workSpent`/winning-technique results to `technique-census-cell.mjs`'s `runCell` (the research harness every `static-portfolio-confirmation-00N` dispatch has used to date) on 15/15 real corpus levels, spanning solved and unsolved cases and three technique families (repair, beam, DFS). This closes `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md`'s step 2 ("confirm byte-identical results on a small shared population") — previously validated only by synthetic unit tests (`orchestration.test.ts`), not real corpus data.
> **Remaining gate:** none for this specific parity claim. Step 3 of that design (routing an actual confirmation dispatch through the new entrypoint, and/or wiring `static-portfolio-confirmation.yml`/`build-static-portfolio-plan.mjs` with a thin adapter to do so by default) remains open as future infrastructure work, not blocking any current conclusion.
> **Evidence role:** development — a behavior-preservation check (does entrypoint A reproduce entrypoint B on real data), not a scheduler experiment or a new capability claim.

## Why this check

Every `static-portfolio-confirmation-00N` result in this research line — including today's `portfolio-18-tranche-v2` finding (62/150 then 68/150 across two independent populations, beating the uncapped 34-technique `full-menu` both times) — was measured through `technique-census-cell.mjs`'s `runCell`, a purpose-built research harness, never through `solveLevel()`, the entrypoint every real caller (interactive UI, batch corpus solving, hint generation) actually uses. `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md` proposed and (per `docs/solver-optimization-workstreams.md`'s Workstream 2 item (d)) already implemented `schedulerMode: 'static-portfolio'`/`runStaticPortfolio` in `orchestration.ts` as the promotion path, with unit tests proving the mechanics on synthetic fixtures — but nothing had yet verified the two paths agree on real corpus data at the exact configuration this session's confirmations used. Until that's checked, "the confirmed result would hold through the real entrypoint" is an inference from code-reading, not evidence.

## Method

Sampled 15 levels (fixed-seed shuffle, not selected on outcome) from `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-003-preflight.md`'s own 150-level population — the population `portfolio-18-tranche-v2`'s second independent confirmation (68/150) was measured against. For each level, ran the exact same configuration (menu = `portfolio-18-tranche-v2`'s 18 ordered techniques, `workBudget=67,000,000`, `perTechniqueWorkCap=2,000,000` flat fallback, `perTechniqueWorkCapByKey` = `portfolio-18-specialists-tranche-cap-map-v2.json`) through both:

- **Path A (research harness):** `technique-census-cell.mjs`'s `createCellRunner().runCell({ corpus, levelPos, techniqueKeys, workBudget, perTechniqueWorkCap, perTechniqueWorkCapByKey })` — what every confirmation dispatch to date has actually run.
- **Path B (production entrypoint):** `createSolver().solveLevel(preparedLevel, { schedulerMode: 'static-portfolio', staticPortfolio: { techniqueConfigs, workBudget, perTechniqueWorkCap, perTechniqueWorkCapByKey } })` — the real entrypoint every live caller uses, with `techniqueConfigs` parsed from the same canonical technique-key strings via `scripts/attempt-config-key.mjs`'s `makeAttemptConfigKeyParser` (the same parser `technique-census-cell.mjs` itself uses internally).

Compared `ok`, `workSpent`, and winning technique identity (`winningConfigKey` vs. `staticPortfolioWinningConfigKey`) between the two paths for each level.

## Result

15/15 exact matches:

| levelId | outcome | workSpent | winning technique (both paths) |
|---|---|---:|---|
| R02759 | unsolved (both) | 54,288,026 | — |
| R02961 | unsolved (both) | 52,596,251 | — |
| R02824 | solved (both) | 722,951 | `repair\|score=repair\|guidance=standard` |
| R02886 | unsolved (both) | 59,704,181 | — |
| R02688 | solved (both) | 8,729,013 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` |
| R02788 | solved (both) | 31,626,341 | `dfs\|score=perimeterSweep\|bias=perimeterCCW` |
| R02650 | solved (both) | 60,767 | `repair\|score=repair\|guidance=standard` |
| R02536 | unsolved (both) | 59,660,629 | — |
| R02594 | unsolved (both) | 64,259,022 | — |
| R02945 | solved (both) | 5,262,578 | `beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain` |
| R02913 | solved (both) | 10,022,763 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` |
| R02666 | unsolved (both) | 56,453,601 | — |
| R02713 | solved (both) | 4,148,113 | `beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain` |
| R02380 | unsolved (both) | 54,630,558 | — |
| R02950 | unsolved (both) | 59,455,376 | — |

7 solved / 8 unsolved, 3 technique families represented among the wins (repair, beam, DFS — the admissible-order techniques in the menu never won on this small sample, not tested by this check). Every `workSpent` value matches to the exact unit; every winning-technique identity matches exactly.

## Interpretation

This is real, positive evidence — not just a code-reading inference — that the entire `portfolio-18-tranche-v2` evidence chain (cap-map derivation → confirmation-002 → confirmation-003 replication) would reproduce identically if re-run through `solveLevel({ schedulerMode: 'static-portfolio' })` instead of the research harness. Combined with the existing unit-test coverage (`orchestration.test.ts`, synthetic fixtures) and this design's own architectural safety argument (additive opt-in, zero effect on default callers), the production-entrypoint promotion path for this exact policy is now backed by both synthetic and real-data evidence.

**What this does not establish:** whether any real production caller (interactive UI, batch orchestration, hint generation) should actually be switched to use this mode — that remains the separate, larger production-wiring decision `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md` and the confirmation-003 report both explicitly deferred. It also does not run a full confirmation-scale dispatch (150 levels) through the new entrypoint — 15 levels is enough to demonstrate parity, not to re-derive the coverage numbers a full dispatch would need if this ever became the primary measurement method going forward.

## Reproduction

Not committed as a script (a one-off local verification, same convention as other ad hoc joins in this research line). Method: for each sampled `{corpus, levelPos}`, run `technique-census-cell.mjs`'s `runCell` and `modules/solver.js`'s `createSolver().solveLevel` with the parameter mapping described above, and diff `ok`/`workSpent`/winning-technique identity.
