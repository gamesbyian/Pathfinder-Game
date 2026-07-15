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

**Second update (same day, cross-corpus follow-up):** having exhausted the published corpus's
repair-gated levels, a further follow-up tests the same "does variant 1 defeat the repair probe"
question against 4 already-solved repair-gated levels from the stress corpora (2 from each) — an
independent population from the published corpus (different generation process, never touched by
the earlier runs). Result: **it does not replicate.** In the two stress families where the repair
probe's outcome varies by orientation at all, variant 1 is on the *repair-succeeds* side both
times — the opposite of its 4/4 fail rate in the published corpus. See "Cross-corpus check: does
variant 1 replicate outside the published corpus?".

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

### Cross-corpus follow-up: 4 already-solved repair-gated stress-corpus levels

Having exhausted the published corpus, the next check for whether "variant 1 defeats repair"
generalizes uses **already-solved** repair-gated levels from both stress corpora — genuinely
independent data (procedurally generated, different provenance, never touched by the density-sweep
or local-mutant runs either). Found the same way as the published-corpus search, but against
`logs/stress-corpus1-baseline.json` / `logs/stress-corpus2-baseline.json` (each level's own
`attempts[]`/`winningStrategy`/`failedStrategies` fields, which — unlike the published analysis
file — are recorded per corpus): any `ok:true` level whose attempt list includes a `profile:
"repair"` entry (whether it won or not) is repair-gated. That turns up 35 in stress-corpus-1 and 53
in stress-corpus-2 — a much larger pool than the published corpus's 4, so this pass picks 4 as a
deliberately small, targeted sample (not another census), split 2-per-corpus and, mirroring the
earlier design, 1 identity-cheap ("repair already wins at identity") + 1 identity-expensive
("repair already fails at identity, beam/dfs wins") per corpus:

| Parent | Corpus | Grid | mustCross | mustPass | portals | flipFilters | reqInt | Identity-orientation outcome |
|---|---|---|---|---|---|---|---|---|
| S00107 | stress-1 | 10×10 | 0 | 2 | 0 | 0 | 8 | repair succeeds, cheap (11,530 nodes, 68 ms) |
| S00120 | stress-1 | 10×10 | 0 | 2 | 0 | 0 | 7 | repair fails, beam wins (2,000,013 nodes, 1613 ms) |
| R02563 | stress-2 | 11×11 | 4 | 5 | 5 | 0 | 4 | repair succeeds, moderate (1,477,120 nodes, 2570 ms) |
| R02465 | stress-2 | 11×11 | 4 | 7 | 0 | 7 | 4 | repair fails, beam wins (8,904,993 nodes, 38,086 ms) |

S00107/S00120 qualify for the repair gate via the `reqInt ≥ POLICY.VERY_HIGH_REQINT (7)`
archetype clause (same as P00136/P00144/P00146); R02563/R02465 qualify via the separate
`mustCross ≥ 2 && mustPass ≥ 3` clause (same as P00145) — so this pass also covers both gate
clauses, not just one. Generated with `--parent-corpus=data/stress/stress-levels.json` /
`data/stress/stress-levels-random.json` (witness sourced from the stored `data/stress/hints/`
file for the stress-corpus-1 pair, and from `stressMeta.witnessSolution` for the stress-corpus-2
pair, which has no stored hint file — both are `family-generate.mjs`'s documented witness-source
fallback order). Solved with a larger `--budget-ms=45000` (vs. the published-corpus runs' 20000) —
the stress corpora's known-hardest repair-gated levels run measurably more expensive than any
published-corpus repair-gated level (R02465's parent alone took 38 s; one sibling, F02563-sym-03,
took 53 s — over the nominal 45 s budget, consistent with `orchestration.ts`'s documented repair
fallback getting its own extra budget multiplier on top of the main loop's share, not a bug). All
28 siblings (4 × 7) generated cleanly; all 32 solves (4 parents + 28 siblings) succeeded, no
timeouts, though R02465's family took roughly 4 minutes total wall time and was run as a background
job for that reason.

For each parent: `node scripts/run-bundled.mjs scripts/family-generate.mjs --parent-corpus=<levels.json|stress-levels.json|stress-levels-random.json> --parent=<id> --mode=symmetry --out=data/families/family-<id>-symmetry.json --manifest-out=data/families/family-<id>-symmetry-manifest.json`.
Symmetry mode always applies all 7 non-identity variants (3 rotations + 4 reflections); all 70
siblings (10 parents × 7, across all three runs) were accepted on the first attempt — expected,
since a symmetry transform is a coordinate relabeling, not a placement search, so referee rejection
isn't a live failure mode here the way it is for local-mutant/shuffle modes. Family + manifest +
hint files committed at `data/families/family-{P,S,R}*-symmetry*.json` /
`data/families/hints/F*-sym-*.json`.

Solved via `portfolio-solve-sweep.mjs --scheduler-mode=legacy` (the density-sweep report's
methodology lesson: the tool's own default `portfolio-experiment` scheduler mode gives messier,
non-production-representative results — `legacy` is what Play/Editor/Review and hint discovery
actually run), `--budget-ms=20000` for the published-corpus parents and `--budget-ms=45000` for the
stress-corpus parents (see above for why). Parent solves used `--corpus=<source-corpus>
--levels=<pos>`; family solves used `--corpus=data/families/family-<id>-symmetry.json
--levels=1-7`. Raw solve-result JSON for all 20 runs (10 parents + 10 families) committed alongside
this report (`reports/families/2026-07-15-{P,S,R}*-symmetry-{parent,family}-solve.json`);
reproduce each with the commands above (initial published-corpus passes at commit `0f0a951`; the
stress-corpus follow-up at the same repo state — no source changed across any of the three runs),
then
`node scripts/family-analyze.mjs --manifest=data/families/family-<id>-symmetry-manifest.json --solve-result=<family-solve-json> --parent-solve-result=<parent-solve-json>`.

All 80 solves (10 parents + 70 siblings) succeeded; no unsolved levels, no scoping-down needed. The
6 published-corpus parents/families finished in well under their 20 s budget (worst case 13.6 s);
the 4 stress-corpus ones ran within their 45 s budget except one individual sibling solve
(F02563-sym-03, 53 s — the documented repair-fallback extra-budget behavior noted above, not a
timeout).

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

### S00107 *(stress-1, cross-corpus follow-up)* — repair-gated, parent itself cheap

Parent: nodes=11,530 ms=68 config=`dfs:repair:repair`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 1,128,126 | 845 | dfs:repair:repair |
| 2 (rot) | 839,104 | 714 | dfs:repair:repair |
| 3 (rot) | 401,008 | 326 | dfs:repair:repair |
| 4 (refl) | 919,641 | 695 | dfs:repair:repair |
| 5 (refl) | 1,176,174 | 887 | dfs:repair:repair |
| **6 (refl)** | **2,000,018** | **2002** | **beam:intersectionHarvest@beam5000** |
| 7 (refl) | 1,635,573 | 1236 | dfs:repair:repair |

Repair succeeds for 6 of 7 orientations — including **variant 1**, which is ~100× more expensive
than the parent (1.13M vs. 11.5K nodes) but still resolves *within* the repair probe's budget,
not past it. **Variant 6 is the one that flips to beam here, not variant 1** — the first direct
counter-example to "variant 1 defeats the repair probe" found this session.

### S00120 *(stress-1, cross-corpus follow-up)* — repair-gated, parent itself expensive

Parent: nodes=2,000,013 ms=1613 config=`beam:intersectionHarvest@beam5000`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,013 | 1625 | beam:intersectionHarvest@beam5000 |
| 2 (rot) | 2,000,010 | 1511 | beam:intersectionHarvest@beam5000 |
| 3 (rot) | 2,000,015 | 1586 | beam:intersectionHarvest@beam5000 |
| 4 (refl) | 2,000,015 | 1526 | beam:intersectionHarvest@beam5000 |
| 5 (refl) | 2,000,016 | 1719 | beam:intersectionHarvest@beam5000 |
| 6 (refl) | 2,000,006 | 1604 | beam:intersectionHarvest@beam5000 |
| 7 (refl) | 2,000,021 | 1567 | beam:intersectionHarvest@beam5000 |

Uniform, like P00145: repair fails at every orientation including identity, all 7 variants land
within 0.001% of each other. No index — including variant 1 — is distinguishable from any other.

### R02563 *(stress-2, cross-corpus follow-up)* — repair-gated, parent itself moderate

Parent: nodes=1,477,120 ms=2570 config=`dfs:repair:repair`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 860,105 | 1447 | dfs:repair:repair |
| 2 (rot) | 784,530 | 1334 | dfs:repair:repair |
| 3 (rot) | 5,193,558 | 53,153 | dfs:repair:repair |
| 4 (refl) | 1,201,543 | 1991 | dfs:repair:repair |
| 5 (refl) | 1,796,539 | 2841 | dfs:repair:repair |
| 6 (refl) | 1,236,371 | 2114 | dfs:repair:repair |
| 7 (refl) | 88,991 | 185 | dfs:repair:repair |

**All 7 orientations solve via repair — none fail.** Variant 1 is not just a repair success here,
it's *cheaper* than the parent (860K vs. 1.48M nodes). Variant 3 gets dramatically more expensive
(5.19M nodes, 53 s — the run that exceeded the nominal 45 s budget) while still resolving inside
the repair path rather than falling through to beam; variant 7 is the cheapest orientation by far.
A second direct counter-example: no orientation defeats repair in this family at all.

### R02465 *(stress-2, cross-corpus follow-up)* — repair-gated, parent itself expensive

Parent: nodes=8,904,993 ms=38,086 config=`beam:perimeterSweep/perimeterCCW@beam2000`

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 9,199,788 | 38,172 | beam:perimeterSweep/perimeterCCW@beam2000 |
| 2 (rot) | 8,906,789 | 37,902 | beam:perimeterSweep/perimeterCCW@beam2000 |
| 3 (rot) | 9,198,480 | 37,708 | beam:perimeterSweep/perimeterCCW@beam2000 |
| 4 (refl) | 8,905,252 | 36,873 | beam:perimeterSweep/perimeterCW@beam2000 |
| 5 (refl) | 8,906,525 | 37,174 | beam:perimeterSweep/perimeterCW@beam2000 |
| 6 (refl) | 9,198,225 | 37,106 | beam:perimeterSweep/perimeterCW@beam2000 |
| 7 (refl) | 9,200,055 | 36,922 | beam:perimeterSweep/perimeterCW@beam2000 |

Uniform again, like P00145 and S00120: repair fails everywhere (this level's already-expensive
identity solve never touches repair at all — `perimeterSweep` beam wins throughout), all 7
variants land within ~3% of each other and of the parent. No discriminating signal.

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

## Cross-family consistency check, revisited (published corpus only)

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

## Cross-corpus check: does variant 1 replicate outside the published corpus?

Extending the same fail/succeed table to the 4 stress-corpus families — again, "fails" means the
repair probe did *not* solve that orientation and the ladder fell through to beam/dfs:

| variant | P00144 | P00146 | P00136 | P00145 | S00107 | S00120 | R02563 | R02465 | fails in |
|---|---|---|---|---|---|---|---|---|---|
| 1 (rot) | fails | fails | fails | fails | succeeds | fails | succeeds | fails | 6 / 8 |
| 2 (rot) | fails | succeeds | succeeds | fails | succeeds | fails | succeeds | fails | 4 / 8 |
| 3 (rot) | fails | fails | succeeds | fails | succeeds | fails | succeeds | fails | 5 / 8 |
| 4 (refl) | fails | succeeds | succeeds | fails | succeeds | fails | succeeds | fails | 4 / 8 |
| 5 (refl) | fails | succeeds | fails | fails | succeeds | fails | succeeds | fails | 5 / 8 |
| 6 (refl) | fails | fails | succeeds | fails | **fails** | fails | succeeds | fails | 6 / 8 |
| 7 (refl) | succeeds | succeeds | fails | fails | succeeds | fails | succeeds | fails | 4 / 8 |

**Variant 1's clean 4/4 published-corpus fail-rate does not hold up.** In the two stress families
where the repair probe's outcome actually varies by orientation (S00107, R02563 — S00120 and
R02465 are uniform fails across every index, same as P00145, and contribute no information either
way), **variant 1 is a repair success both times** — the exact opposite of every published-corpus
informative family. Restricting to only the families where an index-level effect is even
observable (i.e. excluding the three uniform-fail families P00145, S00120, R02465, which cannot
distinguish any variant from any other): variant 1 fails in all 3 published-corpus informative
families (P00144, P00146, P00136) and succeeds in both stress-corpus informative families
(S00107, R02563) — a perfect split *by corpus*, not a single mixed pattern. Variant 6, not variant
1, is the one that fails in the stress corpus's only other informative family (S00107) — a
different index than the one that looked strongest in the published corpus.

**Conclusion: "variant 1 defeats the repair probe" is falsified as a general finding.** It was a
real, consistent pattern *within the published corpus's 4 repair-gated levels specifically*, but
it does not extend to procedurally-generated stress-corpus levels that clear the same feature gate
through the same mechanism. Two threads worth flagging without asserting an unverified conclusion
either way: (1) the published corpus is disproportionately AI-generated/hand-authored (CLAUDE.md's
own provenance backfill notes most pre-131 published levels are "likely AI" with no per-model
attribution), and if whatever generation process produced these 4 specific levels shared some
structural convention (e.g. a directional bias in how paths or gates were typically laid out) that
happens to interact badly with a 90° rotation, that would be a property of *this small, non-random
level population*, not of "rotation" as an operation on arbitrary Pathfinder levels; (2)
conversely, it's equally possible the published-corpus n=4 pattern was itself sampling noise (a
smaller population than the stress corpora's 35+53 repair-gated candidates), and a larger published
sample would look more like the stress corpora once one exists. This session's data cannot
distinguish between those two explanations — only that the specific claim doesn't survive contact
with an independent population, which is itself the useful, reportable result.

## Caveats

- **The headline result of this whole investigation is a negative one, and that's the point**:
  neither variant 1 nor variant 7 (nor any other single orientation index) is a validated,
  general-purpose "watch out for this rotation" rule. Variant 1's clean 4/4 published-corpus
  fail-rate looked like a strong finding after the first follow-up, but fell apart the moment it
  was checked against an independent population (2/2 stress-corpus informative families went the
  other way). The task guardrail that pushed for checking a second, then a third source of
  families before trusting an index-level pattern was directly vindicated — a 2-family, then a
  4-family same-corpus replication both looked clean and both turned out to be corpus-specific
  artifacts, not general solver behavior.
- **Small samples throughout, explicitly**: 4 repair-gated published-corpus families (a full
  census of that corpus, not a sample — see "Exhausting the corpus" above) and 4 hand-picked
  stress-corpus families (a small sample out of 35+53 available candidates, not a census). A
  larger stress-corpus sample could still turn up a real, different index-level pattern specific
  to that corpus — this session's 4-family stress pass is enough to falsify the *published-corpus*
  variant-1 claim as general, not enough to positively characterize what (if anything) the stress
  corpora's own orientation sensitivity looks like at scale.
- **A genuine negative result for the non-repair-gated half of the pilot, unchanged by this
  follow-up**: for levels outside the repair-fallback feature gate (low reqInt, below the
  must-cross/must-pass repair threshold), symmetry siblings show no meaningful config or
  node-count sensitivity to orientation at all, regardless of whether the level carries
  must-cross/filter/portal mechanics (P00097 has all three and is still orientation-stable).
  Axis-sensitive *mechanics* alone don't predict orientation sensitivity in this sample —
  proximity to the repair-probe feature gate does.
- **Three of the eight repair-gated families (P00145, S00120, R02465) show total, uniform
  instability** — every non-identity orientation fails the repair probe, with no variation between
  rotations and reflections at all. These contribute no information about *which* index matters
  (nothing to discriminate), but are themselves a real, recurring pattern (3/8, not a one-off)
  worth investigating separately: what do these levels have in common that the partial-flip
  families (P00144, P00146, P00136, S00107, R02563) don't? Not investigated this session.
- **Per CLAUDE.md's own guidance**, `nodesExpanded` is treated as the primary signal here (more
  stable than wall-clock); the two agree in direction throughout this run.
- This finding is scoped to the `legacy` scheduler mode and the repair-probe mechanism as it exists
  today (commit `0f0a951`, unchanged through all three runs) — it is a data-collection result, not
  a proposed solver change (none was made this session).
