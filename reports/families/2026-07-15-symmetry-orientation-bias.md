# Symmetry-sibling finding: solver orientation bias (2026-07-15)

First real use of `scripts/family-generate.mjs --mode=symmetry` (previously built and unit-tested
per `docs/sibling-cousin-system.md`'s "Implementation status" section, but never run through an
actual solve until this session). Tests whether the solver treats a rotated/reflected copy of a
level identically to the original — it should, since a symmetry sibling is the same abstract
puzzle by construction (CLAUDE.md: `grid.w === grid.h` always, so the transform never changes grid
shape; `modules/domain/geometry.ts`'s `transformPoint`/`transformAxis`/`transformTurnDir` are the
same primitives the play-mode display variant and the editor's Rotate/Mirror already use, applied
here to the canonical level the solver actually sees, not just the screen).

## Setup

Four parents, chosen per `docs/sibling-cousin-system.md` section 24's stratified-pilot criteria
(varying solve speed, single- vs multi-config win history, and including axis-sensitive
mechanics), deliberately distinct from the parents already used by the prior local-mutant and
density-sweep runs (P00086, P00110, P00161):

| Parent | Grid | mustCross | filters | portals | blocks | reqInt | Prior solve-history profile |
|---|---|---|---|---|---|---|---|
| P00097 | 10×10 | 1 | 2 | 1 | 0 | 2 | fast (12 ms), single winning config across all stored hints |
| P00010 | 8×8 | 1 | 0 | 0 | 4 | 1 | fast (50 ms), 3 distinct winning configs across stored hints (high provenance diversity, 393 entries) |
| P00144 | 11×11 | 4 | 0 | 0 | 60 | 11 | slow (3.7 s), 2 gates, 2 distinct winning configs |
| P00146 | 12×12 | 2 | 2 | 2 | 9 | 8 | slowest (12.1 s), single winning config historically, the must-cross/filter/portal-bearing, dense/high-reqInt pick |

Source data for this table: `data/levels.json` (mechanic counts) cross-referenced with
`logs/Solver/winning-attempt-analysis-published.json` (elapsed time) and each level's own
`data/hints/<id>.json` provenance (distinct `(technique, profile, template)` tuples across all
stored hints, as a proxy for "single- vs multi-configuration win").

For each parent: `node scripts/run-bundled.mjs scripts/family-generate.mjs --parent-corpus=data/levels.json --parent=<id> --mode=symmetry --out=data/families/family-<id>-symmetry.json --manifest-out=data/families/family-<id>-symmetry-manifest.json`.
Symmetry mode always applies all 7 non-identity variants (3 rotations + 4 reflections); all 28
siblings (4 parents × 7) were accepted on the first attempt — expected, since a symmetry transform
is a coordinate relabeling, not a placement search, so referee rejection isn't a live failure mode
here the way it is for local-mutant/shuffle modes. Family + manifest + hint files committed at
`data/families/family-P*-symmetry*.json` / `data/families/hints/F*-sym-*.json`.

Solved via `portfolio-solve-sweep.mjs --scheduler-mode=legacy --budget-ms=20000` (the
density-sweep report's methodology lesson: the tool's own default `portfolio-experiment` scheduler
mode gives messier, non-production-representative results — `legacy` is what Play/Editor/Review
and hint discovery actually run). Parent solves used `--corpus=data/levels.json --levels=<pos>`;
family solves used `--corpus=data/families/family-<id>-symmetry.json --levels=1-7`. Raw solve-result
JSON for all 8 runs (4 parents + 4 families) committed alongside this report
(`reports/families/2026-07-15-P*-symmetry-{parent,family}-solve.json`); reproduce each with
the commands above (commit `0f0a951`), then
`node scripts/family-analyze.mjs --manifest=data/families/family-<id>-symmetry-manifest.json --solve-result=<family-solve-json> --parent-solve-result=<parent-solve-json>`.

All 32 solves (4 parents + 28 siblings) succeeded and finished in well under the 20 s budget (worst
case 13.6 s); no timeouts, no scoping-down needed.

## Results

`nodesExpanded` / `ms` / winning config per variant, vs. the parent (Δ columns from
`family-analyze.mjs`'s own diff; variants 1–3 are rotations, 4–7 are reflections):

### P00097 (fast, single-config history)

Parent: nodes=6054 ms=55 config=`dfs:perimeterSweep/cornerHarvest`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 5887 | 50 | perimeterSweep/cornerHarvest |
| 2 (rot) | 6054 | 46 | perimeterSweep/cornerHarvest |
| 3 (rot) | 5887 | 24 | perimeterSweep/cornerHarvest |
| 4 (refl) | 6054 | 25 | perimeterSweep/cornerHarvest |
| 5 (refl) | 6054 | 16 | perimeterSweep/cornerHarvest |
| 6 (refl) | 5887 | 19 | perimeterSweep/cornerHarvest |
| 7 (refl) | 5887 | 13 | perimeterSweep/cornerHarvest |

Same winning config in all 8 orientations (parent + 7). Node count takes only two values (5887 or
6054, i.e. within 3% of the parent) — no orientation effect beyond noise.

### P00010 (fast, multi-config history)

Parent: nodes=137 ms=43 config=`dfs:perimeterSweep/cornerHarvest`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 267 | 26 | perimeterSweep/cornerHarvest |
| 2 (rot) | 264 | 24 | perimeterSweep/cornerHarvest |
| 3 (rot) | 267 | 21 | perimeterSweep/cornerHarvest |
| 4 (refl) | 264 | 31 | perimeterSweep/cornerHarvest |
| 5 (refl) | 264 | 17 | perimeterSweep/cornerHarvest |
| 6 (refl) | 267 | 20 | perimeterSweep/cornerHarvest |
| 7 (refl) | 267 | 11 | perimeterSweep/cornerHarvest |

Same winning config throughout; node count roughly doubles vs. the parent's 137 uniformly across
all 7 orientations (137→~265), but with no distinction between rotations and reflections and no
config change — reads as a fixed one-time cost of the transformed gate/goal arrangement, not an
orientation-*dependent* effect.

### P00144 (slow, multi-config history, must-cross-heavy, 2 gates)

Parent: nodes=2,000,004 ms=2699 config=`beam:intersectionHarvest@beam5000(diverse)`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,039 | 2739 | beam:intersectionHarvest@beam5000(diverse) |
| 2 (rot) | 2,000,013 | 2631 | beam:intersectionHarvest@beam5000(diverse) |
| 3 (rot) | 2,000,031 | 2578 | beam:intersectionHarvest@beam5000(diverse) |
| 4 (refl) | 2,000,012 | 2556 | beam:intersectionHarvest@beam5000(diverse) |
| 5 (refl) | 2,000,012 | 2517 | beam:intersectionHarvest@beam5000(diverse) |
| 6 (refl) | 2,000,004 | 2470 | beam:intersectionHarvest@beam5000(diverse) |
| **7 (refl)** | **1,224,569** | **1386** | **dfs:repair:repair** |

Six of seven orientations match the parent's config and cost almost exactly; variant 7 is the lone
outlier — cheaper by ~39% and a different winning config entirely.

### P00146 (slowest, must-cross/filter/portal-bearing, high-reqInt)

Parent: nodes=2,000,638 ms=13,625 config=`beam:intersectionHarvest@beam5000`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,428 | 13,441 | beam:intersectionHarvest@beam5000 |
| **2 (rot)** | **1,140,623** | **1257** | **dfs:repair:repair** |
| 3 (rot) | 2,000,398 | 9280 | beam:objectiveFirst@beam5000 |
| **4 (refl)** | **412,286** | **471** | **dfs:repair:repair** |
| **5 (refl)** | **16,091** | **44** | **dfs:repair:repair** |
| 6 (refl) | 2,000,401 | 9512 | beam:objectiveFirst@beam5000 |
| **7 (refl)** | **622,232** | **664** | **dfs:repair:repair** |

Here orientation clearly matters: 4 of 7 variants (2, 4, 5, 7) swap to a cheaper `dfs:repair`
config (16K–1.14M nodes, 44 ms–1.26 s); the other 3 (1, 3, 6) stay in the ~2,000,000-node beam
regime (9.3–13.4 s), though 3 and 6 swap to a *different* beam profile (`objectiveFirst` instead of
the parent's `intersectionHarvest`) at meaningfully lower cost than the parent/variant-1 pair.

## Why P00144 and P00146 are orientation-sensitive and P00097/P00010 are not

The mechanism is identifiable, not just a numerical coincidence. `modules/solver/orchestration.ts`
runs an early, strictly-additive **repair probe** (`runRepairProbe`, `REPAIR_PROBE_ORDINARY_NODE_BUDGET
= 2_000_000`) *before* the main DFS/beam ladder, but only when `attempts.ts`'s `needsRepairFallback`
gate is active for the level's features — here, both P00144 (reqInt 11) and P00146 (reqInt 8) clear
`POLICY.VERY_HIGH_REQINT (7)` under the `high-intersection-burden` archetype clause (neither meets
the separate must-cross/must-pass clause: P00144 has 0 must-pass, P00146 has only 2 against a
required 3). P00097 (reqInt 2) and P00010 (reqInt 1) never reach this gate at all — `repairConfigs`
is empty for them, so their attempt ladder is the same fixed sequence regardless of orientation,
which is exactly what the flat, config-stable tables above show.

For a repair-gated level, the probe either **succeeds** within its fixed 2,000,000-node budget
(cheap: the reported total is whatever the probe itself used, e.g. 16K–1.2M nodes) or **fails**
(the probe burns essentially the full 2,000,000-node budget, then the orchestrator falls through
to the ordinary beam/DFS ladder, adding that ladder's own cost on top — hence totals landing just
above 2,000,000). Which outcome occurs is orientation-dependent: the repair heuristic's search
order interacts with the level's rotated/reflected coordinate layout, so the *same puzzle* can flip
between "repair solves it in under a second" and "repair fails, fall through to a multi-second beam
search" purely from a rigid rotation/reflection that changes nothing about the puzzle's abstract
difficulty. That is precisely the kind of solver-side orientation bias
`docs/sibling-cousin-system.md`'s symmetry-sibling section predicted this mode would be the first
thing to actually exercise (the play-mode display variant never lets the solver see a transformed
level, so this class of bug/behavior was previously untestable).

Incidentally, `orchestration.ts`'s own comment calibrating `REPAIR_PROBE_ORDINARY_NODE_BUDGET`
already cites both parents' identity-orientation repair costs (172,978 and 41,446 nodes
respectively) as historical data points used to set that 2,000,000 ceiling with headroom — this
run is the first time those two levels' *rotated/reflected* siblings have been measured against
that same ceiling.

## Cross-family consistency check (the actual ask: is there a universal bad orientation?)

Looking only within the two repair-gated families (P00144, P00146) — the two that show any
orientation effect at all:

- **Variant 1 (90° rotation)** stayed in the parent's expensive regime in *both* families (same
  winning config as the parent, cost within 1% of it). This is the only orientation index that
  behaved consistently across both hard families in this sample.
- **Variant 7** was the cheapest or only outlier for P00144 (dfs:repair, 1.22M nodes) and one of
  four cheap variants for P00146 (dfs:repair, 622K nodes) — directionally consistent (never
  expensive in either), but P00146 had three *other* cheap variants (2, 4, 5) that were not cheap
  in P00144, where they all matched the parent's expensive beam config.
- **Variants 3 and 6** stayed expensive in both families, but only in P00146 did they additionally
  swap to a different-but-still-expensive beam profile (`objectiveFirst`); in P00144 they matched
  the parent's exact config.

So: variant 1 reproducing the parent's difficulty in both hard families, and variant 7 never being
the worst in either, are the only patterns that survived checking a second family — everything else
(which specific variants are *cheap*, and which beam profile wins when repair fails) differed
between the two families. With n=2 repair-gated families, this is not enough to call variant-1 or
variant-7 a general rule; it is enough to say the repair-probe-outcome mechanism itself (not any
specific index) is the real, reusable finding.

## Caveats

- **Small sample, explicitly**: 4 parents, 2 of which ever exercise the repair-probe gate at all.
  The "variant 1 stays hard / variant 7 never the worst" observation above is a 2-family
  replication, not a validated rule — the honest reading is "worth checking on 3–5 more
  repair-gated parents before treating either as real," not "confirmed."
- **A genuine negative result for the other half of the pilot**: for levels outside the
  repair-fallback feature gate (low reqInt, below the must-cross/must-pass repair threshold),
  symmetry siblings show no meaningful config or node-count sensitivity to orientation at all,
  regardless of whether the level carries must-cross/filter/portal mechanics (P00097 has all
  three and is still orientation-stable). Axis-sensitive *mechanics* alone don't predict
  orientation sensitivity in this sample — proximity to the repair-probe feature gate does.
- **Per CLAUDE.md's own guidance**, `nodesExpanded` is treated as the primary signal here (more
  stable than wall-clock); the two agree in direction throughout this run.
- This finding is scoped to the `legacy` scheduler mode and the repair-probe mechanism as it exists
  today (commit `0f0a951`) — it is a data-collection result, not a proposed solver change (none was
  made this session).
