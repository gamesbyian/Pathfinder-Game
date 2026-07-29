# Disambiguating turn-load from archetype as the robustness driver (2026-07-29)

## What this is

Direct follow-up to `2026-07-29-turn-load-fragile-robust-split.md`, which found all 5 sampled
turn-load-heavy corpus-2 levels fully robust (0/110 family variants solved) but flagged a confound:
all 5 parents independently shared the `high-intersection-burden` archetype, so that result couldn't
separate "turn-load causes robustness" from "this archetype causes robustness regardless of turn-load."
This run resolves the confound with two crossed samples.

## Method

Same family-generation/solve pipeline (15 local-mutant + 7 symmetry variants/level, `--budget-ms=8000
--node-budget=20000000 --workers=4 --scheduler-mode=legacy --save-hints`, matching the corpus-2
baseline node budget), applied to two new groups chosen specifically to break the confound:

- **Group A — high turn-load, NOT high-intersection-burden**: R02118 (must-cross-heavy, turnLoad=19),
  R03180 (portal-heavy, turnLoad=19), R02541 (default, turnLoad=17).
- **Group B — high-intersection-burden, turn-load=0**: R02106 (turnLoad=0, bestBadness=6), R02168
  (turnLoad=0, bestBadness=9), R00050 (turnLoad=0, bestBadness=12).

If turn-load is the operative variable: Group A should stay robust (like the original all-HIB sample)
and Group B should show more fragility (since the archetype that "caused" robustness before is now
paired with zero turn-load). If archetype is the operative variable: Group A should show fragility
(the confounding archetype is gone) and Group B should stay robust (archetype alone reproduces it).

## Result: turn-load is the driver, not archetype

| Group | Levels | Variants solved | Rate |
|---|---|---|---|
| Group A (turnLoad 17–19, non-HIB) | R02118, R03180, R02541 | 0/66 | 0% |
| Group B (HIB, turnLoad=0) | R02106, R02168, R00050 | 4/66 | 6.1% |
| *(reference) original all-HIB, turnLoad 8–17 sample* | 5 levels | 0/110 | 0% |

Per-level breakdown for Group B (the only group with any solves):

| Level | turnLoad | bestBadness | Solved | Winning config (all) |
|---|---|---|---|---|
| R02106 | 0 | 6  | 1/22 (symmetry variant `F02106-sym-04`) | `dfs:repair:repair` |
| R02168 | 0 | 9  | 0/22 | — |
| R00050 | 0 | 12 | 3/22 (`F00050-lm-07`, `F00050-lm-14`, `F00050-sym-05`) | `dfs:repair:repair` (all 3) |

**Group A reproduces the original all-robust result with the confounding archetype removed**: 0/66
across three different archetypes (must-cross-heavy, portal-heavy, default), all at turn-load 17–19.
Combined with the original 5-level sample, that's **0/176 solved across 8 distinct high-turn-load
levels spanning 4 archetype buckets** — turn-load ≥ 8 predicts full robustness regardless of archetype
in every level tested so far.

**Group B breaks the all-robust pattern**: high-intersection-burden alone, at turn-load=0, is *not*
uniformly robust — 2 of 3 levels contributed at least one solved variant, all via the repair-fallback
tier specifically (`dfs:repair:repair` — every solve in this run came from the same winning config,
none from the main attempt ladder). This 6.1% variant-solve rate is the same order of magnitude as the
already-documented ~7% `dfs-plain` fragile-scoring-family rate
(`reports/2026-07-17-dfs-plain-fragile-scoring-census.md`), consistent with these being ordinary
repair-reachable near-misses rather than anything turn-load-specific.

## What this means

The archetype confound is resolved: **turn-load, not `high-intersection-burden` archetype, is what
drives the robust-hard-core classification.** High turn-load levels are robust regardless of archetype
(0/176 across 8 levels, 4 archetypes); the archetype alone does not reproduce robustness once turn-load
is controlled for (Group B shows real, if modest, fragility). This validates the original recommendation
on stronger footing: turn-load-heavy corpus-2 levels are a genuine population needing new
bounds/pruning/technique work, not a byproduct of which archetype bucket they happen to route through.

It also reframes the zero-turn-load `high-intersection-burden` population as a *separate*, smaller
opportunity: ordinary repair-fallback near-misses at a rate roughly matching the known dfs-plain
fragile-scoring rate elsewhere in the corpus — not a new finding, just confirmation that turn-load=0
HIB levels aren't unusually resistant.

## Caveats

- Still a small sample (3 levels/group, 66 variants/group) — the 6.1% Group B rate is 4 events total,
  wide-uncertainty at this n. Treat as "not zero, roughly consistent with the known baseline rate,"
  not a precise estimate.
- Every Group B solve came from the identical winning config (`dfs:repair:repair`) — worth noting as a
  pattern but not yet enough events to generalize about *which* repair variant matters.
- This still doesn't establish *why* turn-load makes the search space robustly hard (the mechanism) —
  only that it does, independent of archetype. That mechanism question is the next real question for
  whoever picks up the bounds/pruning/technique work this justifies.

## Verification

Read-only solver research; no solver code changed. All 132 variant corpora + manifests are committed
under `data/families/` (`8bd43cb3`); the 4 solved hints (with full provenance, `--save-hints` was on
for this entire run) are committed under `data/families/hints/`. Reproducible: rerun
`scripts/portfolio-solve-sweep.mjs` against any `data/families/family-<id>-<mode>.json` with the flags
above.
