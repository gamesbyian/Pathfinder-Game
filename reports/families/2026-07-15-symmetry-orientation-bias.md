# Symmetry-sibling finding: solver orientation bias (2026-07-15)

First real use of `scripts/family-generate.mjs --mode=symmetry` (previously built and unit-tested
per `docs/sibling-cousin-system.md`'s "Implementation status" section, but never run through an
actual solve until this session). Tests whether the solver treats a rotated/reflected copy of a
level identically to the original — it should, since a symmetry sibling is the same abstract
puzzle by construction (CLAUDE.md: `grid.w === grid.h` always, so the transform never changes grid
shape; `modules/domain/geometry.ts`'s `transformPoint`/`transformAxis`/`transformTurnDir` are the
same primitives the play-mode display variant and the editor's Rotate/Mirror already use, applied
here to the canonical level the solver actually sees, not just the screen).

**Update (same day, follow-up run):** the initial 4-parent pass surfaced a repair-probe-driven
orientation effect (see below) and a tentative "variant 1 / variant 7 replicate" observation from
2 repair-gated families. A follow-up run adds the *only two remaining* repair-gated levels in the
published corpus (P00136, P00145 — see "Exhausting the corpus" below) specifically to stress-test
that observation. Result: variant 1 replicates 4/4; variant 7 does not (see "Cross-family
consistency check, revisited").

## Setup

Six parents total, chosen per `docs/sibling-cousin-system.md` section 24's stratified-pilot
criteria (varying solve speed, single- vs multi-config win history, and including axis-sensitive
mechanics), deliberately distinct from the parents already used by the prior local-mutant and
density-sweep runs (P00086, P00110, P00161). The first four were the initial pass; P00136 and
P00145 were added in a same-day follow-up specifically to test replication of the repair-gated
orientation effect (see below):

| Parent | Grid | mustCross | mustPass | filters | portals | blocks | reqInt | Prior solve-history profile |
|---|---|---|---|---|---|---|---|---|
| P00097 | 10×10 | 1 | 0 | 2 | 1 | 0 | 2 | fast (12 ms), single winning config across all stored hints |
| P00010 | 8×8 | 1 | 1 | 0 | 0 | 4 | 1 | fast (50 ms), 3 distinct winning configs across stored hints (high provenance diversity, 393 entries) |
| P00144 | 11×11 | 4 | 0 | 0 | 0 | 60 | 11 | slow (3.7 s), 2 gates, 2 distinct winning configs |
| P00146 | 12×12 | 2 | 2 | 2 | 2 | 9 | 8 | slowest (12.1 s), single winning config historically, the must-cross/filter/portal-bearing, dense/high-reqInt pick |
| P00136 *(follow-up)* | 10×10 | 0 | 2 | 0 | 0 | 3 | 8 | fast at identity (269 ms), **already wins via `repair` at identity orientation** |
| P00145 *(follow-up)* | 14×14 | 2 | 4 | 0 | 0 (4 flipping filters) | 25 | 5 | fast at identity (460 ms), **already wins via `repair` at identity orientation** |

Source data for this table: `data/levels.json` (mechanic counts) cross-referenced with
`logs/Solver/winning-attempt-analysis-published.json` (elapsed time) and each level's own
`data/hints/<id>.json` provenance (distinct `(technique, profile, template)` tuples across all
stored hints, as a proxy for "single- vs multi-configuration win").

### Exhausting the corpus for the follow-up

The follow-up needed more *repair-gated* parents (see "Why P00144/P00146 are orientation-sensitive"
below) distinct from every parent already used across all three symmetry/density-sweep/local-mutant
runs. Scanning `logs/Solver/winning-attempt-analysis-published.json` for `solvedBy` containing
`"repair"` at identity orientation — the closest direct evidence a level actually exercises the
repair path, rather than the `reqInt`/`mustCross`+`mustPass` proxy thresholds used to pick P00144/
P00146 originally — turns up exactly four levels in the whole 156-level published corpus: P00136,
P00144, P00145, P00146. The first two were free; **P00136 and P00145 are literally the only
unused repair-gated parents left in the published corpus.** Any further replication check needs
either the stress corpora (unpublished, different provenance) or a purpose-built density/mutation
mode to manufacture new repair-gated candidates — noted as a scope boundary, not pursued this
session.

For each parent: `node scripts/run-bundled.mjs scripts/family-generate.mjs --parent-corpus=data/levels.json --parent=<id> --mode=symmetry --out=data/families/family-<id>-symmetry.json --manifest-out=data/families/family-<id>-symmetry-manifest.json`.
Symmetry mode always applies all 7 non-identity variants (3 rotations + 4 reflections); all 42
siblings (6 parents × 7, across both runs) were accepted on the first attempt — expected, since a
symmetry transform is a coordinate relabeling, not a placement search, so referee rejection isn't a
live failure mode here the way it is for local-mutant/shuffle modes. Family + manifest + hint files
committed at `data/families/family-P*-symmetry*.json` / `data/families/hints/F*-sym-*.json`.

Solved via `portfolio-solve-sweep.mjs --scheduler-mode=legacy --budget-ms=20000` (the
density-sweep report's methodology lesson: the tool's own default `portfolio-experiment` scheduler
mode gives messier, non-production-representative results — `legacy` is what Play/Editor/Review
and hint discovery actually run). Parent solves used `--corpus=data/levels.json --levels=<pos>`;
family solves used `--corpus=data/families/family-<id>-symmetry.json --levels=1-7`. Raw solve-result
JSON for all 12 runs (6 parents + 6 families) committed alongside this report
(`reports/families/2026-07-15-P*-symmetry-{parent,family}-solve.json`); reproduce each with
the commands above (initial 4-parent pass at commit `0f0a951`; the P00136/P00145 follow-up at the
same repo state — no source changed between the two runs), then
`node scripts/family-analyze.mjs --manifest=data/families/family-<id>-symmetry-manifest.json --solve-result=<family-solve-json> --parent-solve-result=<parent-solve-json>`.

All 48 solves (6 parents + 42 siblings) succeeded and finished in well under the 20 s budget (worst
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

### P00136 *(follow-up)* — repair-gated, parent itself cheap

Parent: nodes=277,365 ms=269 config=`dfs:repair:repair`

| variant | nodes | ms | config |
|---|---|---|---|
| **1 (rot)** | **2,000,031** | **1854** | **beam:intersectionHarvest@beam5000** |
| 2 (rot) | 1,906,069 | 1583 | dfs:repair:repair |
| 3 (rot) | 213,497 | 193 | dfs:repair:repair |
| 4 (refl) | 1,569,192 | 1261 | dfs:repair:repair |
| **5 (refl)** | **2,000,019** | **1912** | **beam:intersectionHarvest@beam5000** |
| 6 (refl) | 1,607,603 | 1326 | dfs:repair:repair |
| **7 (refl)** | **2,000,023** | **1909** | **beam:intersectionHarvest@beam5000** |

The parent itself is *cheap* here (repair succeeds at identity orientation in 277K nodes) — the
opposite starting point from P00144/P00146, where the parent was already in the expensive regime.
Despite that, orientation still swings this level between "repair succeeds" (variants 2, 3, 4, 6 —
even variant 2 at 1.91M nodes is a genuine repair success, just close to the probe's 2,000,000-node
ceiling) and "repair fails, beam takes over" (variants 1, 5, 7 — all landing just above 2,000,000
nodes). Notably, **variant 1 flips this level from cheap to expensive**, even though the parent
itself was cheap — a stronger claim than "variant 1 preserves the parent's own difficulty."

### P00145 *(follow-up)* — repair-gated, parent itself cheap, every transform fails

Parent: nodes=242,827 ms=460 config=`dfs:repair:repair`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,011 | 4433 | beam:intersectionHarvest@beam5000(diverse) |
| 2 (rot) | 2,000,023 | 4329 | beam:intersectionHarvest@beam5000(diverse) |
| 3 (rot) | 2,000,013 | 4474 | beam:intersectionHarvest@beam5000(diverse) |
| 4 (refl) | 2,000,012 | 4200 | beam:intersectionHarvest@beam5000(diverse) |
| 5 (refl) | 2,000,014 | 4177 | beam:intersectionHarvest@beam5000(diverse) |
| 6 (refl) | 2,000,006 | 4152 | beam:intersectionHarvest@beam5000(diverse) |
| 7 (refl) | 2,000,007 | 4319 | beam:intersectionHarvest@beam5000(diverse) |

A different, more extreme pattern: the parent solves cheaply via repair (242,827 nodes), but
**every single one of the 7 transformed orientations** fails the repair probe and falls through to
beam — all 7 land in the same ~2,000,010-node band, roughly an order of magnitude more expensive
than the parent, with no variation among rotations vs. reflections at all. This isn't a partial
flip like P00136/P00144/P00146 — it's total instability specific to this level's arrangement, and
by itself doesn't distinguish variant 1 or variant 7 from any other index (everything is equally
"expensive" here).

## Why P00144 and P00146 are orientation-sensitive and P00097/P00010 are not

The mechanism is identifiable, not just a numerical coincidence. `modules/solver/orchestration.ts`
runs an early, strictly-additive **repair probe** (`runRepairProbe`, `REPAIR_PROBE_ORDINARY_NODE_BUDGET
= 2_000_000`) *before* the main DFS/beam ladder, but only when `attempts.ts`'s `needsRepairFallback`
gate is active for the level's features. Of the four families that clear this gate: P00144
(reqInt 11) and P00146 (reqInt 8) qualify via the `high-intersection-burden` archetype clause
(`POLICY.VERY_HIGH_REQINT`, 7) — neither meets the separate must-cross/must-pass clause (P00144 has
0 must-pass, P00146 only 2 against a required 3). P00136 (reqInt 8) also qualifies via the
archetype clause. P00145 (reqInt 5, below the archetype threshold) instead qualifies via the
must-cross/must-pass clause (`mustCross ≥ 2 && mustPass ≥ 3`; P00145 has 2 and 4). P00097 (reqInt 2)
and P00010 (reqInt 1) never reach either clause — `repairConfigs` is empty for them, so their
attempt ladder is the same fixed sequence regardless of orientation, which is exactly what the
flat, config-stable tables above show.

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
already cites P00146's and P00144's identity-orientation repair costs (172,978 and 41,446 nodes
respectively) as historical data points used to set that 2,000,000 ceiling with headroom — this
run is the first time those two levels' (and, in the follow-up, P00136's and P00145's)
*rotated/reflected* siblings have been measured against that same ceiling.

## Cross-family consistency check, revisited (the actual ask: is there a universal bad orientation?)

The initial pass (P00144, P00146 only) suggested two candidate patterns: "variant 1 stays in the
parent's own difficulty regime" and "variant 7 is never the worst." The follow-up (P00136, P00145)
was run specifically to stress-test both against 2 more repair-gated families. Framing "stays in
the parent's regime" turned out to be the wrong test once a *cheap* parent was available (P00136
and P00145 both solve cheaply at identity, unlike P00144/P00146) — the sharper, level-independent
question is simply: **does this orientation index make the repair probe fail (→ expensive,
beam-wins) or succeed (→ cheap, repair-wins)?**, checked across all 4 repair-gated families
regardless of what the parent itself did:

| variant | P00144 | P00146 | P00136 | P00145 | repair-probe fails in |
|---|---|---|---|---|---|
| 1 (rot) | fails | fails | **fails** | fails | **4 / 4** |
| 2 (rot) | fails | succeeds | succeeds | fails | 2 / 4 |
| 3 (rot) | fails | fails | succeeds | fails | 3 / 4 |
| 4 (refl) | fails | succeeds | succeeds | fails | 2 / 4 |
| 5 (refl) | fails | succeeds | **fails** | fails | 3 / 4 |
| 6 (refl) | fails | fails | succeeds | fails | 3 / 4 |
| 7 (refl) | **succeeds** | succeeds | **fails** | fails | 2 / 4 |

("fails/succeeds" = whether `dfs:repair:repair` won for that variant; "fails" includes P00145's
uniform case, where every variant fails.)

**Variant 1 (90° rotation) replicates cleanly: 4/4.** It is the only index that made the repair
probe fail in *every* repair-gated family tested, including both new ones — and notably including
P00136, where the *parent itself* solves cheaply via repair (277K nodes) but variant 1 alone among
the "moderate" variants (2, 3, 4, 6, all repair-successes) flips to the expensive beam regime. That
strengthens the claim from "variant 1 preserves the parent's difficulty" (which only made sense
when both known families happened to have expensive parents) to the more general "variant 1 is
disproportionately likely to defeat the repair heuristic, independent of the parent's own
difficulty."

**Variant 7 does not replicate — it is falsified as "never the worst."** It was the strict outlier
(cheapest) in P00144 and one of four cheap variants in P00146, but in P00136 it is tied for the
*most* expensive (2,000,023 nodes, alongside variants 1 and 5) — directly contradicting the
"never the worst" pattern. (P00145's uniform all-fail result doesn't help distinguish variant 7
either way, since every variant is equally expensive there.) The original 2-family observation for
variant 7 was a coincidence of that particular 2-family sample, not a real effect — exactly the
outcome the task guardrail anticipated by insisting on more than one family before trusting an
index-level pattern.

No other variant reaches better than 3/4 fail-rate, and none reaches 4/4 succeed either — there is
no "always-safe" orientation in this sample, only variant 1 as an "often-unsafe" one.

## Caveats

- **Small sample, explicitly, even after the follow-up**: 4 repair-gated families total, which is
  every repair-gated level in the published corpus not already used by another sibling/cousin
  experiment (see "Exhausting the corpus" above) — this is not a 4-of-many sample, it's 4-of-4
  available. The variant-1 finding (4/4 fail-rate) is a full census of the currently-reachable
  published-corpus evidence, not a random sample projected to a larger population; a genuinely
  independent replication would need repair-gated levels from the stress corpora or a
  purpose-built generation mode, out of scope this session.
- **A genuine negative result for the other half of the pilot**: for levels outside the
  repair-fallback feature gate (low reqInt, below the must-cross/must-pass repair threshold),
  symmetry siblings show no meaningful config or node-count sensitivity to orientation at all,
  regardless of whether the level carries must-cross/filter/portal mechanics (P00097 has all
  three and is still orientation-stable). Axis-sensitive *mechanics* alone don't predict
  orientation sensitivity in this sample — proximity to the repair-probe feature gate does.
- **A genuine negative result within the repair-gated half, too**: variant 7's apparent
  "never worst" pattern from the first 2 families didn't survive a 3rd — a useful reminder that
  even a clean-looking 2-family replication can be sample noise, and that the variant-1 finding
  above should itself be treated as provisional until checked against non-published-corpus
  repair-gated levels.
- One family (P00145) showed *every* non-identity orientation failing the repair probe uniformly —
  a stronger, more totalizing instability than the partial flips seen elsewhere. This is reported
  as an observation, not explained mechanistically; it doesn't change the variant-1/variant-7
  conclusions above (a uniform-fail family can't distinguish any index from any other) but is worth
  noting as its own distinct pattern worth investigating separately.
- **Per CLAUDE.md's own guidance**, `nodesExpanded` is treated as the primary signal here (more
  stable than wall-clock); the two agree in direction throughout this run.
- This finding is scoped to the `legacy` scheduler mode and the repair-probe mechanism as it exists
  today (commit `0f0a951`, unchanged through the follow-up run) — it is a data-collection result,
  not a proposed solver change (none was made this session).
