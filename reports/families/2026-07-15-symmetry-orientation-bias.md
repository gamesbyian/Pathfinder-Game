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

**Third update (same day, sample expansion):** the 4-stress-family sample above was explicitly
flagged as too small to characterize the stress corpora's own orientation behavior (only enough to
falsify the published-corpus claim). This update adds 8 more already-solved repair-gated
stress-corpus families (4 per corpus), bringing the total to 16 repair-gated families across both
populations. The headline finding changes shape: **11 of 16 families (69%) show zero orientation
discrimination at all** — either every non-identity orientation fails the repair probe (7
families) or every one succeeds via repair regardless of cost (4 families, one of which varies in
*cost* by up to 550× across orientations while never actually changing which config wins). Only 5
of 16 show a genuine within-family fail/succeed flip, and — consistent with the second update
above — no single orientation index is uniformly bad across even that smaller, mixed set (variant
1 ties with variant 6 at 4 fails out of 5 informative families; nothing reaches 5/5). See "Second
cross-corpus expansion: what 16 families actually look like".

**Fourth update (same day, testing the "6/6 stress-corpus" lead directly):** the previous update's
own caveats flagged an 8-data-point observation — "every stress-corpus family whose parent already
fails repair at identity (6/6) stayed failing at every orientation, vs. 0/2 for published" — as a
lead, not a conclusion. This update adds 6 more already-solved identity-fails stress-corpus levels
(3 per corpus) specifically to test it at a larger n. **The lead does not hold as a clean 100%/0%
split, but survives directionally as a rate difference**: 1 of these 6 new families (R00631) gets a
genuine repair rescue — the first stress-corpus rescue found this session — bringing the full
stress-corpus tally to 1 rescued / 12 tested (8%), against 2 rescued / 2 tested (100%) for the
published corpus. Still a real, if much less extreme than "never," directional gap, built on a tiny
published-corpus denominator. A second new family, R02248, is *not* a repair rescue (repair never
wins in any of its 7 orientations, same as the other 11 uniform-failure families) but still shows a
striking orientation effect on a different axis: 4 of its 7 orientations did not solve **at all**
within a heavily-extended budget (~424 s each, 170M+ nodes), while the other 3 solve in ~6 s via
beam, same as the parent — reported transparently as "not solved within budget," not retried
indefinitely. See "Testing the 6/6 lead: 6 more identity-fails stress families".

**Fifth update (same day, testing whether R02248's "does not solve at all" pattern generalizes):**
adds 6 more identity-fails stress families (3 per corpus) specifically to check whether R02248's
complete-non-solve behavior was a one-off or a repeatable pattern. **Result: it did not recur** —
all 6 new families' siblings solved within the nominal 60 s budget, no timeouts. One of the six,
R02028, delivered the *second* stress-corpus repair rescue this session (2 of its 7 orientations
flip to `dfs:repair:repair`), moving the stress rescue rate to 2/18 (11%) — still directionally far
below the published corpus's 2/2, and R02248 remains the only non-solve-at-all case found across 18
stress families tested. The variant-1 fail-rate, now measured over 7 mixed families, climbed again
(6/7) — the fourth consecutive round in which it rose rather than settled (4/4 → 4/5 → 5/6 → 6/7),
which is flagged explicitly in "Testing the 6/6 lead" below as worth taking more seriously than a
single round would warrant, without yet calling it confirmed.

**Sixth update (same day, pre-registered variant-1 confirmatory test):** the family list — 10 new
repair-gated stress candidates, 5 per corpus, same unbiased cost-bounded selection method as every
prior round — was fixed and disclosed *before* any solving began, specifically so this round could
serve as a genuine holdout test of the variant-1 hypothesis rather than another round of
after-the-fact pattern-matching. **Result: 2 of the 10 turned out mixed (informative), and variant
1 was among the failing orientations in both** (R00541, R02976) — a clean directional replication
on fresh, held-out data. Folded into the running total, the all-session tally is now 8/9 mixed
families where variant 1 fails (z ≈ 2.0 under a naive per-family-random-failure null, p ≈ 0.05
one-tailed) — but see "Pre-registered result" below for why that combined number overstates the
case: it reuses the same 7 families that generated the hypothesis in the first place, which is not
a valid confirmatory statistic on its own, however suggestive. The clean, uncontaminated read is
narrower and more modest: 2 fresh coin-flips landing the same way (25% likely by chance alone) —
directionally encouraging, not yet decisive.

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

### Second cross-corpus expansion: 8 more stress-corpus families

The 4-family cross-corpus pass above was flagged in its own caveats as too small to positively
characterize the stress corpora's own orientation behavior. This expansion adds 8 more
already-solved repair-gated stress levels — 4 per corpus, again split cheap/expensive at identity,
picked from the remaining pool (33 left in corpus1, 51 in corpus2 after excluding levels already
used anywhere in this session) and filtered to `elapsedMs < 10000` at their originally-recorded
identity solve, specifically to keep the batch's total wall time bounded:

| Parent | Corpus | Grid | mustCross | mustPass | portals | flipFilters | reqInt | Identity-orientation outcome |
|---|---|---|---|---|---|---|---|---|
| S00109 | stress-1 | 9×9 | 2 | 3 | 0 | 2 | 2 | repair succeeds, cheap (202 nodes, 47 ms) |
| S00114 | stress-1 | 8×8 | 2 | 3 | 0 | 2 | 2 | repair succeeds, cheap (14,519 nodes, 287 ms) |
| R00792 | stress-1 | 12×12 | 0 | 0 | 0 | 0 | 8 | repair fails, beam wins (2,000,019 nodes, 2361 ms) |
| R00392 | stress-1 | 13×13 | 0 | 6 | 0 | 6 | 13 | repair fails, beam wins (2,000,004 nodes, 3504 ms) |
| R02909 | stress-2 | 11×11 | 0 | 0 | 0 | 0 | 7 | repair succeeds, moderate (762,697 nodes, 450 ms) |
| R03015 | stress-2 | 12×12 | 2 | 6 | 7 | 8 | 2 | repair succeeds, moderate (493,038 nodes, 1119 ms) |
| R03341 | stress-2 | 13×13 | 0 | 0 | 0 | 0 | 9 | repair fails, beam wins (2,000,051 nodes, 1764 ms) |
| R02714 | stress-2 | 11×11 | 4 | 5 | 0 | 0 | 4 | repair fails, beam wins (2,000,038 nodes, 2275 ms) |

Same generation/solve commands as above, `--budget-ms=30000`. All 56 siblings (8 × 7) generated
cleanly; parent solves and 6 of 8 family solves completed with all 7 siblings solved within budget.
**R03015 is the one exception, handled transparently rather than truncated**: 2 of its 7
orientations (variants 6, 7) did not finish within the 30 s family-solve budget — both were still
climbing past 111M nodes (vs. the parent's 493K) when cut off. Rather than report those as a flat
"unsolved," they were re-solved individually at `--budget-ms=400000`; both completed via
`dfs:repair:repair` at 270.2M and 193.8M nodes respectively (858 s and 728 s wall time) — genuinely
solved, just extraordinarily expensive, not stuck. Raw JSON for both the original attempt and the
retry are committed (`2026-07-15-R03015-symmetry-family-solve.json` /
`-family-solve-retry.json`).

### Testing the 6/6 lead: 6 more identity-fails stress families

Both prior stress-corpus passes only ever added 2 identity-fails families per corpus at a time.
This pass adds 3 more per corpus specifically to put more weight on the "6/6 stress-corpus
identity-fails families stay uniform-fail" observation before treating it as real — all picked from
the remaining pool (identity-fails, `elapsedMs < 10000` at their originally-recorded solve, to keep
the batch bounded), with no other selection criterion this time (no attempt to pre-select for or
against a rescue):

| Parent | Corpus | Grid | mustCross | mustPass | flipFilters | reqInt | Identity-orientation outcome |
|---|---|---|---|---|---|---|---|
| R00631 | stress-1 | 11×11 | 2 | 6 | 8 | 2 | repair fails, beam wins (2,000,010 nodes, 4242 ms) |
| R00789 | stress-1 | 11×11 | 5 | 5 | 6 | 6 | repair fails, beam wins (2,000,038 nodes, 6307 ms) |
| R00920 | stress-1 | 12×12 | 0 | 0 | 6 | 8 | repair fails, beam wins (2,000,020 nodes, 4473 ms) |
| R02208 | stress-2 | 11×11 | 3 | 7 | 0 | 3 | repair fails, beam wins (2,000,015 nodes, 4567 ms) |
| R02248 | stress-2 | 12×12 | 0 | 0 | 0 | 7 | repair fails, beam wins (2,000,009 nodes, 6030 ms) |
| R02841 | stress-2 | 12×12 | 0 | 0 | 6 | 12 | repair fails, beam wins (2,000,032 nodes, 5025 ms) |

Same generation/solve commands, `--budget-ms=60000` (raised again since the previous pass's
`R03015` needed more than 45000 ms). All 42 siblings (6 × 7) generated cleanly. R00631, R00789,
R00920, R02208, and R02841 finished all 7 siblings within budget. **R02248 did not**: 4 of its 7
orientations (variants 2, 3, 5, 6) ran to `status: "timeout"` at ~424,000 ms each (≈7× the nominal
60000 ms budget — the same repair-extra-budget-multiplier behavior noted for R02563/R03015 above,
just this time not ending in a solve) after expanding 169–171 million nodes apiece. Rather than
retry indefinitely chasing an eventual solve, this is reported as-is: **these 4 orientations did not
solve within a heavily-extended, already-generous budget** — itself a legitimate, noteworthy result
(a rotation/reflection can turn a level solvable in 6 seconds into one that doesn't solve in 7
minutes), not a truncated one. Raw JSON committed
(`2026-07-15-R02248-symmetry-family-solve.json`).

### Does R02248's non-solve pattern generalize? 6 more identity-fails families

R02248 was the first (and, until now, only) family where some orientations didn't solve at all
rather than merely being expensive. This pass adds 6 more identity-fails stress families (3 per
corpus, same selection method as before — remaining pool, `elapsedMs < 12000` at identity, no
outcome-based filtering) specifically to see whether that pattern recurs:

| Parent | Corpus | Grid | mustCross | mustPass | portals | flipFilters | reqInt | Identity-orientation outcome |
|---|---|---|---|---|---|---|---|---|
| R00087 | stress-1 | 14×14 | 0 | 7 | 6 | 6 | 7 | repair fails, beam wins (2,000,150 nodes, 6878 ms) |
| R00104 | stress-1 | 11×11 | 2 | 5 | 0 | 0 | 2 | repair fails, beam wins (2,000,041 nodes, 7423 ms) |
| R00134 | stress-1 | 14×14 | 0 | 8 | 0 | 0 | 7 | repair fails, beam wins (2,000,036 nodes, 7800 ms) |
| R02341 | stress-2 | 11×11 | 6 | 5 | 0 | 0 | 8 | repair fails, beam wins (2,000,034 nodes, 6336 ms) |
| R02962 | stress-2 | 11×11 | 3 | 6 | 0 | 0 | 3 | repair fails, beam wins (2,000,049 nodes, 6451 ms) |
| R02028 | stress-2 | 12×12 | 3 | 5 | 0 | 5 | 3 | repair fails, beam wins (2,000,016 nodes, 4332 ms) |

Same `--budget-ms=60000` as the R02248-flagging pass. **All 42 siblings (6 × 7) solved within
budget this time — no timeouts, no non-solves.** R02248's pattern did not recur in this batch.

### Pre-registered variant-1 confirmatory test: 10 more families, fixed in advance

Every prior round picked its next batch of families the same unbiased way (remaining pool, ordered
by identity-orientation `elapsedMs`, no outcome-based filtering) but only *after* seeing how the
previous round turned out — a reasonable way to explore, but not a clean confirmatory test of the
variant-1 hypothesis that exploration had produced. This round fixes that: the following 10
families were selected and locked in — disclosed in full below — **before running a single solve**:

**Pre-registered list**: R01636, R01533, R00432, R00541, R01075 (stress-1); R01644, R03140, R00727,
R02976, R02825 (stress-2). Selection rule (identical to every prior round, stated in advance):
remaining identity-fails candidates from each corpus's baseline, ordered by ascending `elapsedMs`,
first 5 per corpus. **Commitment, stated in advance**: run and report the full result for all 10,
regardless of what it shows — no stopping early if the first few looked favorable or unfavorable,
no discarding any family after the fact.

| Parent | Corpus | Grid | mustCross | mustPass | portals | flipFilters | reqInt | Identity-orientation outcome |
|---|---|---|---|---|---|---|---|---|
| R01636 | stress-1 | 11×11 | 3 | 5 | 4 | 0 | 3 | repair fails, dfs:objectiveFirst wins (4,039,159 nodes, 6990 ms) |
| R01533 | stress-1 | 14×14 | 0 | 7 | 0 | 5 | 9 | repair fails, beam wins (2,000,029 nodes, 6644 ms) |
| R00432 | stress-1 | 13×13 | 5 | 7 | 0 | 0 | 6 | repair fails, beam wins (2,000,070 nodes, 6913 ms) |
| R00541 | stress-1 | 13×13 | 0 | 0 | 7 | 0 | 7 | repair fails, dfs:objectiveFirst wins (2,122,485 nodes, 7698 ms) |
| R01075 | stress-1 | 11×11 | 2 | 0 | 0 | 0 | 2 | repair fails, beam wins (8,000,021 nodes, 8636 ms) |
| R01644 | stress-2 | 12×12 | 0 | 6 | 0 | 0 | 8 | repair fails, beam wins (2,000,016 nodes, 3909 ms) |
| R03140 | stress-2 | 14×14 | 0 | 0 | 0 | 8 | 8 | repair fails, beam wins (2,000,018 nodes, 3283 ms) |
| R00727 | stress-2 | 13×13 | 0 | 5 | 0 | 0 | 14 | repair fails, beam wins (2,000,011 nodes, 3885 ms) |
| R02976 | stress-2 | 12×12 | 3 | 6 | 0 | 5 | 3 | repair fails, beam wins (2,000,003 nodes, 4520 ms) |
| R02825 | stress-2 | 11×11 | 4 | 5 | 7 | 0 | 4 | repair fails, beam wins (2,000,004 nodes, 3421 ms) |

Same generation/solve commands, `--budget-ms=60000`. All 70 siblings (10 × 7) generated cleanly and
all 70 solved within budget — no timeouts, no non-solves (consistent with the "R02248 is rare"
reading from the prior round, now 1/28 stress families overall).

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

### S00109 *(stress-1, sample-expansion)* — uniform repair-success

Parent: nodes=202 ms=47 config=`dfs:repair:repair`. All 7 variants also win via `dfs:repair:repair`
(range 33–1760 nodes, 14–79 ms). Uniform success — no variant flips to beam, cost stays in the same
tiny-cost band as the parent throughout.

### S00114 *(stress-1, sample-expansion)* — uniform repair-success

Parent: nodes=14,519 ms=287 config=`dfs:repair:repair`. All 7 variants also win via
`dfs:repair:repair` (range 584–20,220 nodes, 14–98 ms). Uniform success, same pattern as S00109.

### R00792 *(stress-1, sample-expansion)* — uniform repair-failure

Parent: nodes=2,000,019 ms=2361 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical `beam:intersectionHarvest@beam5000` config, all within 0.001% of the parent's
node count. Uniform failure, same pattern as S00120/R02465.

### R00392 *(stress-1, sample-expansion)* — uniform repair-failure

Parent: nodes=2,000,004 ms=3504 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R02909 *(stress-2, sample-expansion)* — genuine partial flip

Parent: nodes=762,697 ms=450 config=`dfs:repair:repair` (0 movable instances — grid, gates, and
mustPass-free open level; still repair-gated via the `reqInt ≥ 7` archetype clause alone).

| variant | nodes | ms | config |
|---|---|---|---|
| **1 (rot)** | **2,000,005** | **1739** | **beam:intersectionHarvest@beam5000** |
| 2 (rot) | 1,680,650 | 948 | dfs:repair:repair |
| **3 (rot)** | **2,000,025** | **1477** | **beam:intersectionHarvest@beam5000** |
| 4 (refl) | 570,426 | 301 | dfs:repair:repair |
| **5 (refl)** | **2,000,007** | **1517** | **beam:intersectionHarvest@beam5000** |
| **6 (refl)** | **2,000,026** | **1424** | **beam:intersectionHarvest@beam5000** |
| 7 (refl) | 1,007,843 | 505 | dfs:repair:repair |

A real, mixed family: variants 2, 4, 7 stay repair-successes (cheaper than or comparable to the
parent); variants 1, 3, 5, 6 flip to the expensive beam regime. **Variant 1 fails here too** —
consistent with the published-corpus pattern for once, though so do three other indices in this
family (3, 5, 6), so it's not uniquely bad within this family either.

### R03015 *(stress-2, sample-expansion)* — uniform repair-success, but wildly variable cost

Parent: nodes=493,038 ms=1119 config=`dfs:repair:repair`.

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 14,234,811 | 51,645 | dfs:repair:repair |
| 2 (rot) | 108,474,706 | 210,521 | dfs:repair:repair |
| 3 (rot) | 26,797,898 | 70,368 | dfs:repair:repair |
| 4 (refl) | 28,417,135 | 72,930 | dfs:repair:repair |
| 5 (refl) | 10,898,152 | 44,336 | dfs:repair:repair |
| 6 (refl) | 270,200,010 | 858,220 | dfs:repair:repair *(retry budget)* |
| 7 (refl) | 193,825,202 | 727,813 | dfs:repair:repair *(retry budget)* |

Every orientation still resolves via `dfs:repair:repair` — the winning *config* never changes, so
by this report's fail/succeed test this family counts as uniform-success, same bucket as S00109/
S00114/R02563. But the *cost* swings enormously: from 22× the parent's node count (variant 5) up
to 550× (variant 6), a continuous, large-magnitude effect that the earlier discrete "does the probe
survive its 2,000,000-node budget" framing can't capture at all — this level's `mustCross`/
`mustPass`/portal/flipping-filter-heavy structure (2/6/7/8 respectively) apparently makes repair's
own search order, not just whether it clears a fixed budget, highly orientation-sensitive. A
genuinely distinct third pattern from "binary flip" (P00144/P00146/P00136/S00107/R02909) and
"uniform, flat" (the 7 always-fail + 3 other always-succeed families): *uniform outcome, unstable
magnitude*.

### R03341 *(stress-2, sample-expansion)* — uniform repair-failure

Parent: nodes=2,000,051 ms=1764 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.003% of the parent's node count. Uniform failure.

### R02714 *(stress-2, sample-expansion)* — uniform repair-failure

Parent: nodes=2,000,038 ms=2275 config=`beam:perimeterSweep/perimeterCW@beam2000`. All 7 variants
win via `perimeterSweep` too (CW for variants 1–3, CCW for 4–7 — the only family where the winning
*template* varies by rotation vs. reflection even though the *profile* doesn't), all within 0.002%
of the parent's node count. Uniform failure — repair never wins a single orientation despite this
level clearing the must-cross/must-pass repair gate.

### R00631 *(stress-1, 6/6-lead test)* — genuine rescue, low reqInt

Parent: nodes=2,000,010 ms=4242 config=`beam:intersectionHarvest@beam5000(diverse)`.

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,014 | 5521 | beam:intersectionHarvest@beam5000(diverse) |
| 2 (rot) | 2,000,011 | 5768 | beam:intersectionHarvest@beam5000(diverse) |
| **3 (rot)** | **1,696,438** | **3188** | **dfs:repair:repair** |
| 4 (refl) | 2,000,003 | 5014 | beam:intersectionHarvest@beam5000(diverse) |
| **5 (refl)** | **1,672,277** | **3517** | **dfs:repair:repair** |
| **6 (refl)** | **1,162,856** | **2145** | **dfs:repair:repair** |
| 7 (refl) | 2,000,004 | 5148 | beam:intersectionHarvest@beam5000(diverse) |

The first stress-corpus rescue found this session: variants 3, 5, and 6 flip from the parent's
beam-only failure to a genuine, cheaper `dfs:repair:repair` success. Notable because R00631 has
reqInt 2 — well below the archetype threshold, qualifying for the repair gate only via the
must-cross/must-pass clause — showing the "identity-fails-stays-failing" pattern isn't tied to high
reqInt specifically.

### R00789 *(stress-1, 6/6-lead test)* — uniform repair-failure

Parent: nodes=2,000,038 ms=7243 config=`beam:intersectionHarvest@beam5000(diverse)`. All 7 variants
also win via the identical config, within 0.003% of the parent's node count. Uniform failure.

### R00920 *(stress-1, 6/6-lead test)* — uniform repair-failure

Parent: nodes=2,000,020 ms=4506 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R02208 *(stress-2, 6/6-lead test)* — uniform repair-failure, low reqInt

Parent: nodes=2,000,015 ms=4135 config=`beam:perimeterSweep/perimeterCCW@beam2000`. All 7 variants
also win via the identical config, within 0.002% of the parent's node count. Uniform failure —
despite reqInt 3 (as low as R00631's, which *did* get rescued), this family shows no rescue at all.
Low reqInt does not reliably predict rescuability either; it appears to be level-specific.

### R02248 *(stress-2, 6/6-lead test)* — mixed, with a new "does not solve at all" pattern

Parent: nodes=2,000,009 ms=6030 config=`beam:intersectionHarvest@beam5000`.

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,039 | 6476 | beam:intersectionHarvest@beam5000 |
| **2 (rot)** | 169,774,686 | 424,463 | **not solved (timeout)** |
| **3 (rot)** | 171,096,893 | 424,348 | **not solved (timeout)** |
| 4 (refl) | 2,000,034 | 5817 | beam:intersectionHarvest@beam5000 |
| **5 (refl)** | 169,139,519 | 424,337 | **not solved (timeout)** |
| **6 (refl)** | 170,803,626 | 424,339 | **not solved (timeout)** |
| 7 (refl) | 2,000,003 | 6014 | beam:intersectionHarvest@beam5000 |

Qualitatively different from every other family in this report: variants 1, 4, 7 solve just like
the parent (cheap-ish beam success, ~6 s), but variants 2, 3, 5, 6 **do not solve at all** within a
~424 s extended budget, each expanding 169–171 million nodes with nothing to show for it. Every
other "expensive" orientation seen this session — even R03015's 550×, 858-second worst case —
eventually found a solution; this is the first (and, in this sample, only) case of an orientation
apparently pushing a level past practical solvability under the tested budget. A rotation/reflection
that changes nothing about the puzzle's abstract difficulty took this level from "solves in 6
seconds" to "does not solve in 7 minutes," for 4 of its 7 possible transforms.

### R02841 *(stress-2, 6/6-lead test)* — uniform repair-failure

Parent: nodes=2,000,032 ms=4632 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R00087 *(stress-1, non-solve generalization test)* — uniform repair-failure

Parent: nodes=2,000,150 ms=6159 config=`beam:objectiveFirst@beam5000`. All 7 variants also win via
the identical config, within 0.008% of the parent's node count. Uniform failure, no non-solves.

### R00104 *(stress-1, non-solve generalization test)* — uniform repair-failure, config swaps

Parent: nodes=2,000,041 ms=6544 config=`beam:harvestThenFinish@beam2000`. All 7 variants also fail
to repair, but the winning beam *template* alternates between `intersectionHarvest` (variants 1, 3,
6, 7) and `harvestThenFinish` (variants 2, 4, 5, matching the parent) — a config swap without a
repair-succeed/fail flip, similar in kind to R02714's template-only variation earlier in this
report. Uniform failure by the report's primary binary; a mild secondary effect on which beam
template wins.

### R00134 *(stress-1, non-solve generalization test)* — uniform repair-failure

Parent: nodes=2,000,036 ms=5860 config=`beam:objectiveFirst@beam5000`. All 7 variants win via
`beam:intersectionHarvest@beam5000` — same profile family, different template than the parent's,
but no repair success anywhere. Uniform failure.

### R02341 *(stress-2, non-solve generalization test)* — uniform repair-failure

Parent: nodes=2,000,034 ms=3546 config=`beam:intersectionHarvest@beam5000(diverse)`. All 7 variants
also win via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R02962 *(stress-2, non-solve generalization test)* — uniform repair-failure

Parent: nodes=2,000,049 ms=5634 config=`beam:perimeterSweep/perimeterCCW@beam2000`. All 7 variants
also win via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R02028 *(stress-2, non-solve generalization test)* — second stress-corpus repair rescue

Parent: nodes=2,000,016 ms=4332 config=`beam:intersectionHarvest@beam5000(diverse)`.

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,011 | 4250 | beam:intersectionHarvest@beam5000(diverse) |
| 2 (rot) | 2,000,009 | 4378 | beam:intersectionHarvest@beam5000(diverse) |
| 3 (rot) | 2,000,013 | 4129 | beam:intersectionHarvest@beam5000(diverse) |
| 4 (refl) | 2,000,006 | 3967 | beam:intersectionHarvest@beam5000(diverse) |
| **5 (refl)** | **1,861,357** | **3000** | **dfs:repair:repair** |
| 6 (refl) | 2,000,004 | 4034 | beam:intersectionHarvest@beam5000(diverse) |
| **7 (refl)** | **60,935** | **141** | **dfs:repair:repair** |

The second genuine stress-corpus repair rescue this session (after R00631): variants 5 and 7 flip
to `dfs:repair:repair`, with variant 7 dramatically cheaper than the parent (61K vs. 2M nodes).
Note this family also has reqInt 3, mustCross 3 — another low-reqInt rescue, alongside R00631,
reinforcing that low reqInt doesn't predict *non*-rescuability either (R02208 and R02962, both also
reqInt 3, show no rescue at all) — rescue and non-rescue both occur across the low-reqInt range.

### R01636 *(pre-registered)* — uniform repair-failure

Parent: nodes=4,039,159 ms=6990 config=`dfs:objectiveFirst`. All 7 variants also win via the
identical config, within 0.003% of the parent's node count. Uniform failure — the only family in
this session where the fallback winner is a plain DFS technique rather than a beam config, but
repair still never wins any orientation.

### R01533 *(pre-registered)* — uniform repair-failure

Parent: nodes=2,000,029 ms=6644 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.001% of the parent's node count. Uniform failure.

### R00432 *(pre-registered)* — uniform repair-failure, config swaps

Parent: nodes=2,000,070 ms=6913 config=`beam:intersectionHarvest@beam5000(diverse)`. All 7 variants
also fail to repair, with the winning beam config/template varying (`objectiveFirst@beam5000
(diverse)` for 1, 7; `intersectionHarvest@beam5000(diverse)` for 2, 4, 5; `intersectionHarvest
@beam2000` for 3, 6). Uniform failure by the primary binary; secondary variation in which beam
config wins, similar in kind to R00104/R02714 earlier.

### R00541 *(pre-registered)* — mixed: pre-registered variant-1 test point #1

Parent: nodes=2,122,485 ms=7698 config=`dfs:objectiveFirst`.

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,567,906 | 6690 | dfs:objectiveFirst |
| 2 (rot) | 2,105,771 | 7498 | dfs:objectiveFirst |
| 3 (rot) | 5,786,070 | 7160 | dfs:objectiveFirst |
| 4 (refl) | 2,146,172 | 7386 | dfs:objectiveFirst |
| 5 (refl) | 2,093,609 | 7309 | dfs:objectiveFirst |
| 6 (refl) | 2,203,948 | 6190 | dfs:objectiveFirst |
| **7 (refl)** | **944,632** | **785** | **dfs:repair:repair** |

One of the two mixed families in the pre-registered batch: only variant 7 rescues (flips to
repair); **variant 1 stays in the failing `dfs:objectiveFirst` bucket**, matching the hypothesis.
Variant 3 is a notable secondary detail — 5.79M nodes while *still* losing to repair, the most
expensive non-repair-winning orientation seen in this family, on an axis (cost-within-failure)
distinct from the repair-succeed/fail binary.

### R01075 *(pre-registered)* — uniform repair-failure, config swaps

Parent: nodes=8,000,021 ms=8636 config=`beam:objectiveFirst@beam2000`. All 7 variants also fail to
repair, alternating between `objectiveFirst@beam2000` (2, 4, 5, matching the parent) and
`mustCrossFirst@beam2000` (1, 3, 6, 7) — another template/profile swap without a repair-succeed
flip.

### R01644 *(pre-registered)* — uniform repair-failure

Parent: nodes=2,000,016 ms=3909 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R03140 *(pre-registered)* — uniform repair-failure

Parent: nodes=2,000,018 ms=3283 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.002% of the parent's node count. Uniform failure.

### R00727 *(pre-registered)* — uniform repair-failure

Parent: nodes=2,000,011 ms=3885 config=`beam:intersectionHarvest@beam5000`. All 7 variants also win
via the identical config, within 0.001% of the parent's node count. Uniform failure — this family
has the highest reqInt (14) of any family studied this session, and shows the same uniform-failure
pattern as far lower-reqInt families.

### R02976 *(pre-registered)* — mixed: pre-registered variant-1 test point #2

Parent: nodes=2,000,003 ms=4520 config=`beam:intersectionHarvest@beam5000(diverse)`.

| variant | nodes | ms | config |
|---|---|---|---|
| 1 (rot) | 2,000,012 | 4674 | beam:intersectionHarvest@beam5000(diverse) |
| **2 (rot)** | **452,433** | **853** | **dfs:repair:repair** |
| 3 (rot) | 2,000,018 | 4650 | beam:intersectionHarvest@beam5000(diverse) |
| 4 (refl) | 2,000,012 | 4493 | beam:intersectionHarvest@beam5000(diverse) |
| 5 (refl) | 2,000,011 | 4578 | beam:intersectionHarvest@beam5000(diverse) |
| 6 (refl) | 2,000,028 | 4417 | beam:intersectionHarvest@beam5000(diverse) |
| 7 (refl) | 2,000,029 | 4503 | beam:intersectionHarvest@beam5000(diverse) |

The second mixed family in the pre-registered batch: only variant 2 rescues (flips to repair, at
less than a quarter of the parent's cost); **variant 1 again stays in the failing beam bucket**,
matching the hypothesis a second time.

### R02825 *(pre-registered)* — uniform repair-failure, template swaps

Parent: nodes=2,000,004 ms=3421 config=`beam:perimeterSweep/perimeterCW@beam2000`. All 7 variants
win via `perimeterSweep` too, with the template following rotation-vs-reflection exactly (CW for
variants 1–3, CCW for 4–7) — the same clean rotation/reflection split seen once before, in R02714.
Uniform failure on the repair-succeed/fail axis.

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

## Second cross-corpus expansion: what 16 families actually look like

With 8 more stress-corpus families, the total repair-gated sample is 16 (4 published + 12 stress).
The most useful way to read it isn't "which variant is worst" — it's a three-way split by whether
the family discriminates between orientations *at all*:

| Family type | Count | Families |
|---|---|---|
| Uniform failure (repair fails at every non-identity orientation) | 7 | P00145, S00120, R02465, R00792, R00392, R03341, R02714 |
| Uniform success (repair succeeds at every orientation, cost may still vary a lot) | 4 | R02563, S00109, S00114, R03015 |
| Mixed (at least one orientation flips relative to the others) | 5 | P00144, P00146, P00136, S00107, R02909 |

**69% of repair-gated families (11/16) show no orientation-driven fail/succeed discrimination at
all** — the family's identity-orientation outcome (does repair already work at all for this level's
authored layout?) simply persists across every rotation and reflection. Only the remaining 31%
(5/16) show the kind of within-family flip this whole investigation has been chasing an index-level
pattern in. That reframes the earlier findings: "does variant 1 defeat repair" was always a
question that could only be asked of a minority of repair-gated levels to begin with; for most,
*no* variant does anything different from any other.

**Revised variant tally, restricted to the 5 informative (mixed) families only** — P00144, P00146,
P00136, S00107, R02909 (R03015 is uniform-success despite its huge cost swings, so it contributes
no fail/succeed information and is excluded here):

| variant | P00144 | P00146 | P00136 | S00107 | R02909 | fails in |
|---|---|---|---|---|---|---|
| 1 (rot) | fails | fails | fails | succeeds | fails | 4 / 5 |
| 2 (rot) | fails | succeeds | succeeds | succeeds | succeeds | 1 / 5 |
| 3 (rot) | fails | fails | succeeds | succeeds | fails | 3 / 5 |
| 4 (refl) | fails | succeeds | succeeds | succeeds | succeeds | 1 / 5 |
| 5 (refl) | fails | succeeds | fails | succeeds | fails | 3 / 5 |
| 6 (refl) | fails | fails | succeeds | **fails** | fails | 4 / 5 |
| 7 (refl) | succeeds | succeeds | fails | succeeds | succeeds | 1 / 5 |

Variant 1 is tied with variant 6 at 4/5 — the worst fail-rate in this combined set, but no longer
uniquely worst, and nowhere near the earlier 4/4 published-only figure once R02909 (where variant 1
does fail) is added alongside S00107 (where it doesn't). Variants 2, 4, and 7 are the closest thing
to "usually safe" (1/5 each) but none reach 0/5. **The honest summary hasn't changed from the
cross-corpus check above, just gotten better-supported: there is no validated single bad
orientation, in the published corpus, the stress corpora, or the two combined** — only a weak,
noisy tilt where variants 1 and 6 are somewhat more likely than the others to coincide with a
repair-probe failure, in the minority of families where failure is even orientation-dependent.

One more pattern worth flagging without overclaiming a mechanism: of the 7 uniform-failure
families, all but 2 (P00144, P00146) are from the stress corpora — **every stress-corpus family
whose parent already fails repair at its authored orientation (6 of 6: S00120, R02465, R00792,
R00392, R03341, R02714) stayed failing at every single rotation and reflection too**, whereas the
2 published-corpus families in the same starting state (P00144, P00146) each had at least one
orientation that flipped to success. That's a much larger, cleaner split (6/6 vs. 0/2) than
anything found for a specific variant index, but it's drawn from only 8 "identity-fails" families
total (2 published, 6 stress) — worth treating as a lead for a future, larger-sample check on
whether stress-corpus-generated levels are systematically less "rescuable" by rotation than
published ones, not as a conclusion this session's data can support on its own.

## Testing the 6/6 lead: revised picture with 6 more stress families (22 total)

The section above explicitly called its own "6/6 vs. 0/2" observation a lead, not a conclusion, and
flagged it for a larger-sample check. Adding the 6 families from "Testing the 6/6 lead" above
brings the total repair-gated sample to 22 (4 published + 18 stress) and the stress-corpus
identity-fails count to 12 (6 original + 6 new). Restricting strictly to whether **repair itself
ever wins** in a non-identity orientation (the same binary used throughout this report):

| Repair-binary type | Count | Families |
|---|---|---|
| Uniform failure (repair never wins) | 12 | P00145, S00120, R02465, R00792, R00392, R03341, R02714, R00789, R00920, R02208, R02841, **R02248** |
| Uniform success (repair always wins) | 4 | R02563, S00109, S00114, R03015 |
| Mixed (repair wins in some orientations, not others) | 6 | P00144, P00146, P00136, S00107, R02909, **R00631** |

**The lead survives directionally but softens from "never" to "rarely": the stress-corpus rescue
rate is 1/12 (8%), not 0/12** — R00631 is a genuine repair rescue (3 of 7 orientations flip to
`dfs:repair:repair`, none of which win at identity). The published-corpus rescue rate stays 2/2
(100%). The gap is still real and still large, but "sometimes, rarely" is a meaningfully different
and more defensible claim than "never" — exactly the kind of overclaim a larger sample exists to
catch.

**R02248 needs its own callout, because the repair-binary table above hides its real behavior.**
By the literal rule ("does repair ever win"), R02248 is correctly bucketed as uniform-failure —
repair loses in all 7 orientations, same as the parent. But unlike the other 11 uniform-failure
families (where every orientation still solves, just never via repair), **4 of R02248's 7
orientations do not solve at all** within an extended budget, while the other 3 solve fine via beam
just like the parent. This means "uniform failure" (on the repair-succeed/fail axis) is not the
same claim as "orientation has no effect" — R02248 is proof that a family can be perfectly uniform
on the axis this report has used throughout while still being sharply orientation-sensitive on a
different, arguably more practically important axis (does it solve *at all*). Of the 22 families
studied this session, R02248 is the only one where this distinction actually matters — but it's a
reminder that the repair-succeed/fail binary, while a reasonable primary lens (it's what determines
which winning config gets used and is directly tied to a named solver mechanism), is not a complete
description of "does orientation matter for this level."

**A second exploratory pattern, checked opportunistically against this same data and also not
holding up**: across the first 16 families, every uniform-success family had reqInt ≤ 4 while every
mixed family had reqInt ≥ 7 — a clean, non-overlapping split that looked like it might mean "low
reqInt predicts orientation-robust repair success." R00631 (reqInt 2, mixed) breaks it immediately:
the lowest reqInt in the entire 22-family sample belongs to a family that *does* show a fail/succeed
flip, not one of the uniform-success families. Reported here only because it cost nothing extra to
check (no new solves needed) and because a reader re-deriving the same 16-family pattern
independently should know it didn't survive the next round of data before relying on it.

**Revised variant tally**, now over 6 mixed families (P00144, P00146, P00136, S00107, R02909,
R00631 — R02248 excluded, since it never lets repair win in any orientation and so contributes no
information to a repair-succeed/fail comparison):

| variant | P00144 | P00146 | P00136 | S00107 | R02909 | R00631 | fails in |
|---|---|---|---|---|---|---|---|
| 1 (rot) | fails | fails | fails | succeeds | fails | fails | 5 / 6 |
| 2 (rot) | fails | succeeds | succeeds | succeeds | succeeds | fails | 2 / 6 |
| 3 (rot) | fails | fails | succeeds | succeeds | fails | succeeds | 3 / 6 |
| 4 (refl) | fails | succeeds | succeeds | succeeds | succeeds | fails | 2 / 6 |
| 5 (refl) | fails | succeeds | fails | succeeds | fails | succeeds | 3 / 6 |
| 6 (refl) | fails | fails | succeeds | **fails** | fails | succeeds | 4 / 6 |
| 7 (refl) | succeeds | succeeds | fails | succeeds | succeeds | fails | 2 / 6 |

Variant 1 is now uniquely the worst at 5/6 (up from a 4/5 tie with variant 6 in the 5-family
table), which on its face looks like *stronger* evidence for a real effect. **Treat that move with
suspicion, not confidence**: the figure has changed with every family added so far (4/4 → 4/5 →
5/6), which is exactly what an unstable small-sample statistic looks like, not what a converging
one looks like. The right reading is still the one from every prior update: there is no variant
index with a fail rate of 6/6 or 0/6 in this data, at any point this session, across any subset —
only a persistently noisy tilt toward variant 1 being somewhat worse than average, in the small
minority of families where orientation-dependent failure is even possible.

### Round 2 of the same test: does R02248's non-solve pattern recur, and does the tilt keep climbing?

Two more rounds followed this section, both aimed at questions this section's own text raised.
First: does R02248's "some orientations don't solve at all" behavior recur, or was it a one-off?
Six more identity-fails stress families (R00087, R00104, R00134, R02341, R02962, R02028) were run
at the same 60 s budget that originally flagged R02248 — **all 42 siblings solved within budget,
zero non-solves.** Across 18 stress-corpus identity-fails families tested this session, R02248
remains the only one showing this pattern — consistent with it being a real but rare behavior
rather than a common one, though 18 is still a modest sample for a "rare event" claim.

Updated repair-binary type tally, now 28 families total (4 published + 24 stress):

| Repair-binary type | Count | Families added since the 22-family table above |
|---|---|---|
| Uniform failure (repair never wins) | 17 | + R00087, R00104, R00134, R02341, R02962 |
| Uniform success (repair always wins) | 4 | (unchanged) |
| Mixed (repair wins in some orientations, not others) | 7 | + R02028 |

73% → 75% uniform (21/28) — essentially unchanged from the 16- and 22-family readings; adding more
families keeps landing close to the same three-quarters/one-quarter split rather than moving it
substantially, which is itself a small piece of evidence that *this* particular ratio, unlike the
variant-1 tilt below, may already be close to a stable estimate.

Second, R02028 delivered a second genuine repair rescue (2 of 7 orientations flip to
`dfs:repair:repair`), moving the stress-corpus rescue tally to 2/18 (11%, up from 1/12) — still
directionally far below the published corpus's 2/2, and R02028's own reqInt (3) again fails to
distinguish it from non-rescued, similarly-low-reqInt families like R02208 and R02962 (both reqInt
3, neither rescued).

**Revised variant tally, now over 7 mixed families** (adding R02028: fails, succeeds, fails, fails,
succeeds, fails, succeeds for variants 1–7 in order):

| variant | P00144 | P00146 | P00136 | S00107 | R02909 | R00631 | R02028 | fails in |
|---|---|---|---|---|---|---|---|---|
| 1 (rot) | fails | fails | fails | succeeds | fails | fails | fails | **6 / 7** |
| 2 (rot) | fails | succeeds | succeeds | succeeds | succeeds | fails | fails | 3 / 7 |
| 3 (rot) | fails | fails | succeeds | succeeds | fails | succeeds | fails | 4 / 7 |
| 4 (refl) | fails | succeeds | succeeds | succeeds | succeeds | fails | fails | 3 / 7 |
| 5 (refl) | fails | succeeds | fails | succeeds | fails | succeeds | succeeds | 3 / 7 |
| 6 (refl) | fails | fails | succeeds | fails | fails | succeeds | fails | 5 / 7 |
| 7 (refl) | succeeds | succeeds | fails | succeeds | succeeds | fails | succeeds | 2 / 7 |

Variant 1's fail-rate has now risen in every single round it's been re-measured: **4/4 → 4/5 → 5/6
→ 6/7**. A purely-noisy statistic would be expected to wander in both directions as more data
arrives, not climb in the same direction four times running — so this is the point in the
investigation where that dismissal starts to feel too easy. At the same time, 7 is still a small
denominator, every family in it was added by this session's own (cost-bounded, not outcome-based)
selection process rather than a random draw from the full repair-gated population, and a single
future family where variant 1 succeeds would immediately pull the rate back down — a coin that
comes up heads 6 times in 7 flips is unusual (≈5.5% under a fair-coin null) but not yet
extraordinary, and "unusual" is exactly the territory where a real, unnamed structural reason and a
lucky run of small-sample draws are hardest to tell apart. The honest position: **this is the
strongest evidence for a real variant-1 effect found so far, worth a dedicated, larger, ideally
pre-registered follow-up (fix the family list in advance, don't stop once a threshold is crossed)
rather than more of this session's incremental few-at-a-time expansion** — but it is not, on its
own, enough to write into CLAUDE.md or change any solver behavior.

## Pre-registered variant-1 result

The follow-up recommended above ("Setup" section: "Pre-registered variant-1 confirmatory test")
ran 10 more families with the list fixed and disclosed in advance. **2 of the 10 turned out mixed
(R00541, R02976) — the rest were uniform-failure. Variant 1 was among the failing orientations in
both.**

### The clean, uncontaminated test

The methodologically correct way to read this round on its own: two fresh, held-out data points,
neither of which existed when the variant-1 hypothesis was formed, both landed the way the
hypothesis predicted. Under a coin-flip null (no reason to expect variant 1 specifically), 2
matching outcomes in a row happens 25% of the time by chance alone — a real, positive replication,
but on its own nowhere close to strong evidence. This is the number that should anchor how much
this round moved anyone's belief: modestly, not dramatically.

### The combined tally, and why it's not a valid standalone statistic

Folding these 2 new families into the running total across all 9 mixed families found this session
gives variant 1 a fail-rate of **8/9**. Modeling each family's own fixed number of failing
orientations `k` and assuming (null hypothesis) that *which* `k` of the 7 variants fail is
uniformly random within each family, the expected number of families where variant 1 fails by pure
chance is `Σ(k/7) ≈ 5.43` with a standard deviation of `≈1.29` — an observed value of 8 gives
**z ≈ 2.0, p ≈ 0.05 one-tailed**. That crosses the conventional "nominally significant" line, and
it's tempting to report it as confirmation.

**It should not be reported as confirmation, and here's the precise reason why**: 7 of those 9
families (P00144, P00146, P00136, S00107, R02909, R00631, R02028) are exactly the data that
produced the variant-1 hypothesis in the first place, across four prior rounds of "look at the
result, then decide what to check next." Folding them back in to compute a combined significance
figure is using the same data both to generate a hypothesis and to test it — the textbook
non-independence error a genuine pre-registration is supposed to prevent. The z ≈ 2.0 figure is
real arithmetic, but it answers "how surprising is the *entire session's accumulated* pattern under
a naive null," not "how surprising is fresh data under a hypothesis fixed in advance" — and only
the second question is the one this pre-registered round was actually designed to answer.

### What this round actually establishes

- Variant 1 did not stop looking bad the moment the family list was fixed in advance — a real
  finding, since a spurious pattern driven by unconscious cherry-picking in earlier rounds would
  have had a good chance of reverting once that latitude was removed. It didn't revert.
- The magnitude of that finding is "2 more data points landing the predicted way" (p ≈ 0.25 under a
  fair-coin null), not "z ≈ 2.0, p ≈ 0.05" — the latter number describes the whole session's history
  including its hypothesis-generating phase, and should not be quoted as if it were a clean
  confirmatory result.
- A properly powered, genuinely conclusive test would need considerably more than 2 fresh mixed
  families — and since only ~22% of repair-gated families turn out mixed at all (9 of ~40 tested
  across every round this session), reaching even 10 fresh informative data points would likely
  require pre-registering on the order of 40-50 more candidate families, an order of magnitude
  beyond any single round run this session.
- **Overall verdict, unchanged in spirit from every earlier update but now on firmer ground**:
  variant 1 (90° rotation) is the closest thing to a real, reusable orientation-sensitivity signal
  found in this investigation — directionally replicated on fresh, pre-registered data — but the
  evidence remains short of the bar for treating it as an established fact, changing solver
  behavior, or writing into CLAUDE.md. The honest label is "the leading candidate for a real effect,
  meaningfully more credible after this round than before it, still not confirmed."

## Caveats

- **The headline result of this whole investigation is a negative one, and that's the point**:
  neither variant 1 nor variant 7 (nor any other single orientation index) is a validated,
  general-purpose "watch out for this rotation" rule, across 38 repair-gated families and both
  corpora. Variant 1's fail-rate moved from 4/4 (published-only) to 4/5 to 5/6 to 6/7 and then, on
  fresh pre-registered data, to 8/9 — a five-round climb that finally got a genuine holdout test
  (see "Pre-registered variant-1 result" above) rather than another round of after-the-fact
  pattern-matching. **The holdout test itself was modest (2/2 fresh replications, ~25% likely by
  chance) — it is the *combined* 8/9 figure that looks statistically striking (z ≈ 2.0), and that
  combined figure is explicitly not a valid confirmatory statistic**, since 7 of its 9 data points
  are the same evidence that produced the hypothesis. The honest position after 5 rounds and one
  genuine pre-registration: variant 1 is the leading candidate for a real effect, meaningfully more
  credible than at any earlier point in this investigation, and still short of confirmed.
- **The real confound the index-level search was chasing without naming it: most repair-gated
  families don't discriminate between orientations at all.** By the repair-succeed/fail binary used
  throughout, 29 of 38 (76%) are uniform — 25 always fail (repair never wins any orientation) and 4
  always succeed (repair always wins, though cost can still vary up to 550× — R03015). Only 9/38
  show a real fail/succeed flip, and the variant-level tilt above is measured only within those 9.
  This figure has been stable across the 16-, 22-, 28-, and 38-family readings (69% → 73% → 75% →
  76%) — unlike the variant-1 tilt, it looks like a genuinely converged estimate rather than one
  still moving.
- **The repair-succeed/fail binary itself is not a complete description of "does orientation
  matter"** — R02248 is the proof, and remains the only example of it after 16 more families were
  tested specifically to look for a second one (6 in one round, 10 more in the pre-registered
  round). It's correctly bucketed as uniform-failure (repair never wins any of its 7 orientations),
  yet 4 of those 7 don't solve *at all* within an extended budget while the other 3 solve fine via
  beam, same as the parent. A family can look perfectly uniform on this report's primary lens while
  still being sharply orientation-sensitive on a different, arguably more practically important axis
  (solvable vs. not, independent of which technique would do it). At 1/28 stress families tested for
  it directly, this reads as a genuinely rare phenomenon rather than a sampling artifact — though
  "rare" and "zero" remain hard to distinguish at this sample size.
- **The "stress corpus rarely rescues an identity-fails level" lead is now on its firmest footing
  of the session**: with 28 stress-corpus identity-fails families tested (vs. 2 originally), the
  rescue rate is 4/28 (14%, R00631/R02028/R00541/R02976) — still far below the published corpus's
  2/2 (100%), and this round added 2 more rescues while also adding 8 more non-rescues, keeping the
  rate roughly stable (8% → 11% → 14%) rather than drifting toward either extreme.
- **Sample sizes, explicitly, at every level of this analysis**: 4 repair-gated published-corpus
  families (a full census of that corpus — see "Exhausting the corpus" above) and 34 hand-picked
  stress-corpus families (a sample out of 88 available candidates, not a census — 35 in
  stress-corpus-1, 53 in stress-corpus-2, most now excluded only because they were already used, and
  the last 10 of the 34 selected under an explicit, disclosed pre-registration). The uniform/mixed
  split (76%) and the stress rescue rate (14%) both look like converged estimates at this point; the
  variant-1 tilt (8/9, with the important caveat above about what that number can and can't claim)
  is the one still capable of surprising a reader who takes it at face value without the context.
- **A genuine negative result for the non-repair-gated half of the pilot, unchanged by every
  follow-up**: for levels outside the repair-fallback feature gate (low reqInt, below the
  must-cross/must-pass repair threshold), symmetry siblings show no meaningful config or
  node-count sensitivity to orientation at all, regardless of whether the level carries
  must-cross/filter/portal mechanics (P00097 has all three and is still orientation-stable).
  Axis-sensitive *mechanics* alone don't predict orientation sensitivity in this sample —
  proximity to the repair-probe feature gate does, and even then only for a minority of the
  families that clear it.
- **Methodology note on slow/unfinished solves, handled transparently rather than truncated
  throughout**: R03015 had 2 of 7 siblings not finish within the original 30 s budget; both were
  re-solved individually at 400 s and completed (858 s / 728 s wall time, 270M / 194M nodes).
  R02248 had 4 of 7 siblings not finish even after a ~424 s extended budget (169–171M nodes each);
  these were reported as "not solved within budget" rather than retried indefinitely — a judgment
  call that a further 10× budget increase was unlikely to be worth the wall-clock cost versus what
  it would teach, not a claim that they are unsolvable in principle. Both decisions are logged here
  per the task's own guardrail against silently truncating slow solves.
  **Correction, added after Experiment 5** (`2026-07-15-dose-response-mutation-intensity.md`): in
  hindsight, extending the budget for R03015 at all was already the wrong instinct, for the same
  reason Experiment 5 makes explicit — no real deployment of this solver would ever wait 400+
  seconds for one level, so "did it eventually solve at 10× budget" answers a question about
  mathematical solvability, not about the solver's behavior under any condition that matters in
  practice. The R03015/R02248 retries are left in this report as originally recorded (both are
  genuine, reproducible data, just arguably not worth having collected), but this report's own
  precedent should not be read as license to keep extending budgets in future work — "did not solve
  within the realistic, batch-testing-scale budget" is the intended final answer, not a placeholder.
- **Per CLAUDE.md's own guidance**, `nodesExpanded` is treated as the primary signal here (more
  stable than wall-clock); the two agree in direction throughout this run.
- This finding is scoped to the `legacy` scheduler mode and the repair-probe mechanism as it exists
  today (commit `0f0a951` for the first two runs; later commits for the subsequent expansions — no
  source changed across any of them) — it is a data-collection result, not a proposed solver change
  (none was made this session).
