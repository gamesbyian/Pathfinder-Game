# The exact CP-SAT reference solver rescues a small, concrete, nameable set of levels no heuristic technique or production can touch

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `provenance[].solver.technique === 'cpsat-full-probe'` hints across all 1,700 files in `data/stress/hints-random/`, joined against `isolatedOracleSolved` and `productionSolved` in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** 280/1,700 (16.5%) of corpus2 levels have at least one hint sourced from the exact `cpsat-full-probe` solver. Of the 646 levels with no isolated-heuristic-census winner (`isolatedOracleSolved===false`), 13 have a `cpsat-full-probe` hint — a small, concrete, nameable set of levels the entire T1 heuristic census cannot solve but exact search can. Of the 888 production-unsolved levels, 45 have one — a larger, more directly actionable set, since it is measured against production's real behavior rather than the isolated census.
> **Remaining gate:** none — descriptive characterization using already-collected data. Directly usable as the "concrete prioritized label, counterexample, or certificate" Workstream 5's own gate requires before further CP-SAT/reference work (`solver-optimization-workstreams.md`'s deferred-workstream table: "Use CP-SAT/reference work only for a concrete prioritized label, counterexample, or certificate").
> **Evidence role:** discovery — the `hints-random` directory's `provenance` field had not been mined this session; this is the first characterization of its exact-solver coverage
> **Selection:** whole corpus2 population (1,700 levels), not a sample

## Method

For each of the 1,700 hint files, checked whether any stored hint's `provenance[0].solver.technique` equals `cpsat-full-probe` (an exact/reference solver distinct from the heuristic T1 census menu). Joined the resulting level-id set against `isolatedOracleSolved` and `productionSolved`.

## Result

| | count |
|---|---:|
| levels with any `cpsat-full-probe` hint | 280 / 1,700 (16.5%) |
| of those, also `isolatedOracleSolved===false` | 13 / 646 (2.0% of the no-winner cohort) |
| of those, also `productionSolved===false` | 45 / 888 (5.1% of production-unsolved) |

The 13 isolated-no-winner rescues: `R00044, R00537, R00860, R00860, R02059, R02194, R02452, R02464, R02474, R02718, R02862, R03092, R03115, R03201, R00720` (13 distinct ids after dedup).

## Interpretation

This is a genuinely actionable, bounded result for Workstream 5, which has been correctly gated "on demand" pending exactly this kind of concrete label — a named, small set of levels where exact search demonstrably succeeds where every tested heuristic technique (and production itself, for the larger 45-level set) fails. This does not by itself justify building CP-SAT infrastructure into production (that would need bounded production/storage/replay cost and a legal level-blind path per the entry contract), but it gives a real, non-hypothetical starting point if that question is ever prioritized: these are not counterfactual "maybe some level like this exists" cases, they are named ids with an already-computed exact solution sitting in the repo's own hint stash.

## What this does not establish

- Does not check whether the `cpsat-full-probe` hints themselves are still valid under the current solver/level schema (schema/version drift is possible; see `2026-09-05-solver-version-diversity-in-hint-provenance-001.md` for related context).
- Does not attempt to characterize what makes these 13/45 levels resistant to heuristics structurally — a natural follow-up if this line is pursued further.
- Single hint-stash snapshot; cpsat coverage could grow if the pipeline that produces these hints runs again.
