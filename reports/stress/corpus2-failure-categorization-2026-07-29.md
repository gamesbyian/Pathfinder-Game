# Corpus-2 remaining failures: what actually separates solved from unsolved (2026-07-29)

**What this is**: the categorization pass called for by
[`reports/2026-07-29-remaining-corpus2-failure-categorization-plan.md`](../2026-07-29-remaining-corpus2-failure-categorization-plan.md),
done corpus-wide (all 1700 levels) rather than on a hand-labeled sample.

**Headline**: the plan's five categories could not be assigned from the available evidence, and the
attempt to do so on a 20-level sample produced conclusions that the corpus-wide data refutes (see
the correction section — this file replaces that attempt). What the data *does* support is
narrower and more actionable: **the solver's archetype routing has collapsed to a single bucket on
this corpus, and the strongest measurable difficulty driver — turn-constraint load — has no
main-loop policy representation at all.**

---

## Correction: what the first version of this report claimed

The first version of this file (commit `53484fe`, same day) categorized 20 stratified levels into
Infeasible / Algorithmically Hard / Heuristic Blind Spot / Archetype edge case / Geometry edge
case, reporting 70% "Algorithmically Hard" and 25% "Heuristic Blind Spot". **Those categories were
assigned by reading mechanic counts, not by measuring anything**, and several of its specific
claims are refuted by the corpus-wide data below. Recording the correction explicitly rather than
quietly revising, per this repo's standard (cf.
[`2026-07-17-witness-divergence-population-calibration-correction.md`](../2026-07-17-witness-divergence-population-calibration-correction.md)).

| Claim in the first version | Status |
|---|---|
| "High must-pass" cited as a blocker on 5 of 20 levels | **Refuted.** `mustPass` d = −0.031; controlled effect is **+9.1 pp / +5.1 pp** (levels with must-pass ≥4 solve *slightly more often*) in the two densest navDensity bands. |
| "High intersection requirement" cited as a blocker on 4 levels | **Refuted.** `high-intersection-burden` enrichment in the unsolved population is **1.020×**; the controlled effect of `reqInt ≥ 6` is −2 to −7 pp, the weakest non-null effect measured. |
| Recommended intersection-urgency, filter-aware turn scoring, constraint-hierarchy scoring | **Contradicted by standing guidance.** [`2026-07-29-highbudget-sweep-lessons.md`](../2026-07-29-highbudget-sweep-lessons.md) lists "tuning scoring weights in isolation" under *Do Not Retry*. |
| "Witness validity" checked per level | **Not performed.** It checked that a witness *existed*. Real validation was already done corpus-wide on 2026-07-11: `witness-divergence-random.json` reports `invalidWitnessSteps: 0`, `nonSolutionFinalStates: 0` across all 1700. The Infeasible category was empty before the sample was drawn. |
| Portal counts ("3.5 pairs", "2.5 pairs") | **Arithmetic error.** Each `portals[]` entry *is* a pair (`x1,y1 ↔ x2,y2`). Every portal count was 2× low, and the impossible fractional values were reported without being noticed. |
| "Landmark-dense" used as a constraint measure | **Conflated.** `decorative` landmarks are **30% of all landmarks** (6124/20211) and carry no path obligation — they are impassable scenery and belong to navDensity, not constraint load. |
| "Archetype metadata isn't available on corpus-2 levels" | **False.** `detectArchetypeFromRaw` (`scripts/stress/features.mjs`) mirrors the solver's own `detectArchetype` and runs on any wire-format level. |
| Per-level "closest attempt config" | **Not extracted**, though the plan asked for it and it is present in the baseline as `levels[].attempts[]` with per-attempt `profile` / `bestBadness` / `nodesExpanded`. |

The one claim that survives is that no sampled level was infeasible — which was already known
corpus-wide and did not need a sample.

---

## Method

Read-only join, no solving. `scripts/stress/feature-solvability-analysis.mjs` (added with this
report) joins the compiled baseline's `ok` labels against `levelFeatures()` — the same extractor
the novelty and clustering tools use, whose `navDensity` and archetype logic mirror
`modules/solver/archetype.ts`. Reproduce with:

```bash
node scripts/stress/feature-solvability-analysis.mjs \
    --baseline=logs/stress-corpus2-baseline.json \
    --corpus=data/stress/stress-levels-random.json \
    --out=reports/stress/corpus2-feature-solvability-2026-07-29.json
```

Every effect below is reported as a **solve rate or enrichment factor**, and separately **controlled
for navDensity**, because navDensity (`reqLen` / navigable area — how much of the free board the
solution must consume) is both the strongest single discriminator and correlated with most mechanic
counts. This is association on observational data: it says which regimes the solver fails in, never
why.

Population: 1700 levels, 605 solved / 1095 unsolved. All 1095 terminate `node-budget-reached`; the
mean unsolved ladder runs **15.4 attempts** vs 5.0 for solved, and **zero** are probe-starved — the
ladder is running to completion and landing far away.

---

## Finding 1 — archetype routing is degenerate on corpus-2, and structurally starves the must-cross ladder

`detectArchetype` drives `ATTEMPT_POLICY` rule selection (`attempts.ts` gates on `f.arch`, rules
evaluated in order). Its distribution:

| Corpus | high-intersection-burden | must-cross-heavy | portal-heavy | default | near-closure |
|---|---|---|---|---|---|
| Published (n=160) | 7% | 14% | 4% | **46%** | 28% |
| Corpus-1 (n=102) | 57% | 25% | 8% | 10% | 1% |
| **Corpus-2 (n=1700)** | **77%** | 10% | 9% | 4% | **0%** |

The classifier is well-spread on the corpus it was calibrated against and collapses to one bucket
on the corpus we are trying to solve. Its solve rates carry almost no signal:

```
high-intersection-burden  n=1302  solved=34.3%  enrichment=1.020x
must-cross-heavy          n= 174  solved=41.4%  enrichment=0.910x   <- under-represented in failures
portal-heavy              n= 159  solved=34.6%  enrichment=1.015x
default                   n=  65  solved=47.7%  enrichment=0.812x
```

**The consequence is concrete.** `mustCross ≥ 4` is a strong raw discriminator (d = 0.540; −31/−26/−18/−12 pp
controlled). But `detectArchetype` tests high-intersection-burden *before* must-cross, and its
predicate (`reqInt ≥ 5 && density ≥ 0.45`) swallows nearly the whole corpus:

> **734 of 736 levels with `mustCross ≥ 4` (99.7%) are labeled `high-intersection-burden`, so the
> must-cross policy rules never fire on them. 569 of those 734 (77.5%) are unsolved.**

The must-cross ladder is well-developed — diverse beam bucketing by `(flipperUsedMask, mustCrossMask)`
so all valid flipper orderings stay alive, `mustCrossFirst` profiles — and it is unreachable for the
population it was built for. That also explains the otherwise-paradoxical `must-cross-heavy`
enrichment of 0.910×: the label only survives on levels whose must-cross burden is *mild* enough to
escape the intersection predicate.

This is a routing hypothesis, not a proven cause — the must-cross rules might not solve those levels
even if reached. **It is cheap to test**: `STRATEGY_ARCHETYPE_ROUTING` already exists as an ablation
flag (`attempts.ts`, forces every level through the catch-all ladder), so the counterfactual is one
ablation sweep, no new code.

---

## Finding 2 — turn-constraint load is the strongest discriminator, and has no main-loop routing

Defining **turn load** = `mustTurn + adjacentTurn + surround` (decorative excluded — no obligation):

```
load  0     n=185   68.6% solved  ###########################
load  1-3   n=142   57.7%         #######################
load  4-7   n=431   39.7%         ################
load  8-11  n=455   29.9%         ############
load 12+    n=487   18.3%         #######
```

A clean monotone dose-response over five well-populated bins, and the largest separation of any
feature measured (**d = 0.750**, ahead of navDensity at 0.574). It survives navDensity control:
`mustTurn ≥ 4` costs **−40.0 / −27.1 / −19.6 / −17.4 pp** across the four navDensity bands.

Against this, `LevelFeatures` (`attempts.ts`) carries `mustTurn` **only** to order repair-bias tiers
(`predictLikelyBiasedRepairTechnique`, and the `STRATEGY_REPAIR_TURN_BIAS` gate). There is no
`adjTurn` or `surround` field at all, no archetype for turn-landmark density, and no main-loop
`ATTEMPT_POLICY` rule keyed on any of them. **942 levels carry turn load ≥ 8; 722 of them (76.6%)
route to the high-intersection ladder**, which is ordered around perimeter sweeps and intersection
harvesting.

### Why the 2026-07-17 turn null-results do not close this

Three turn-landmark mechanisms were implemented and reverted as null:
[adjTurn exit guidance](../2026-07-17-adj-turn-exit-guidance-null-result.md),
[adjTurn deadlock check](../2026-07-17-adjturn-deadlock-check-null-result.md), and an
[adjTurn MST bound](../2026-07-17-adjturn-mst-bound-offline-analysis.md) (offline, not shipped).
All three were scoped to the `default`-archetype R02657 sibling group — **~6 levels out of the 65
that carry the `default` label at all**, selected by archetype rather than by turn load. They are
evidence that *those three specific mechanisms* were not the lever on *that* sample. They are not
evidence about the 942-level turn-load population, which those samples were not drawn from and which
the archetype label cannot even identify.

Note also that turn load predicts *unsolvability* but not *repair closeness* — mean turn load is
flat across badness bands (10.24 / 10.12 / 9.18 / 8.94 / 10.11). It behaves like a global search
difficulty driver, not a repair-specific one, which is consistent with it being a main-loop ordering
problem rather than a repair-mechanism problem.

---

## Finding 3 — three widely-cited signals are null

| Signal | Evidence | Where it is still cited |
|---|---|---|
| **Intersection burden** | enrichment 1.020×; `reqInt ≥ 6` controlled effect −2 to −7 pp; `reqInt`/`reqLen` d = −0.045 | `unsolved-failure-clusters.json`'s `byArchetype` blocks (1078/1396 `dfs-plain`, 692/765 `repair-far`) and the roadmap's "1080 of these are high-intersection-burden" |
| **must-pass** | d = −0.031; controlled effect **+9.1 / +5.1 pp** in the two densest bands | first version of this report |
| **Cumulative witness discrepancy** | solved median 38 vs unsolved 39 (d = 0.039); per-step discrepancy is *lower* in unsolved levels, an artifact of longer paths | [`2026-07-29-highbudget-sweep-lessons.md`](../2026-07-29-highbudget-sweep-lessons.md) §3 — corrected in the same commit as this report |

The intersection-burden case is a **base-rate artifact**, and it is the reason this report exists in
this shape. `cluster-unsolved-failures.mjs` reports `byArchetype` as raw counts over the unsolved
population. When one archetype is 77% of the corpus it will dominate every failure bucket while
carrying no difficulty signal, and reading those tables as a difficulty ranking has plausibly
mis-aimed campaign targeting. The discrepancy claim was already retracted on 2026-07-17 (the earlier
report compared a cherry-picked top-30 tail against two hand-picked levels from a different corpus);
it reappeared in the 07-29 sweep-lessons doc and is corrected there now.

---

## Finding 4 — the remaining population is far, not near

Minimum badness reached over every attempt in each unsolved level's ladder:

```
badness 0-2     33   ##
badness 3-5    119   #######
badness 6-10   193   ###########
badness 11-20  374   ####################
badness 21+    376   #####################
```

**152 of 1095 levels (13.9%) are within badness 5**; 750 (68.5%) are at badness 11 or worse. Any
framing of the remaining corpus as "near misses needing a nudge" is wrong for roughly seven levels in
ten. `repair` is simultaneously the top winner on solved levels (177/605 = 29%, plus 24 more from its
biased variants) and the closest-getter on 738/1095 unsolved — it is the workhorse and it is not
close.

The badness ≤5 band is the natural rescue target, but per the
[2026-07-17 taxonomy correction](../2026-07-17-failure-cluster-taxonomy-stale-after-probe-fix.md),
badness reflects where repair's stochastic search happened to land one sample, not a proven distance
— cross-check any candidate against a family fragile/robust result before treating it as easy.

---

## Recommended next steps

Ordered by evidence strength per unit of cost.

1. **Ablate `STRATEGY_ARCHETYPE_ROUTING` on corpus-2.** Zero new code; directly tests whether the
   77%-single-bucket routing is helping or hurting the population it dominates. Also worth measuring
   the 734-level starvation directly by ordering the must-cross predicate ahead of high-intersection.
2. **Extend `admissible-order-search` to turn constraints.** It is the only technique that has beaten
   the soft-scored ladder recently (+115, [2026-07-24](../2026-07-24-admissible-order-search-corpus2-validation.md)),
   its own report flags it as untuned with "which admissible bounds contribute to the ranking" as the
   first open question, and most-constrained-first ordering is the natural fit for a monotone
   constraint-load dose-response. This is an *ordering* change, not a scoring-weight tune — it does
   not fall under the sweep-lessons prohibition.
3. **Report solve rates, not counts, in `cluster-unsolved-failures.mjs`.** A small change to that
   script's `byArchetype` summary that removes the base-rate distortion from every future campaign
   that reads it.
4. **Run the family fragile/robust split on a turn-load-stratified sample** (load 0-3 vs 12+). The
   roadmap calls this "the single most decision-relevant diagnostic" and it is what actually
   separates "heuristic problem" from "combinatorial problem" — the question the first version of
   this report claimed to answer without measuring.
5. **Drop** intersection burden, must-pass, and discrepancy density as targets.

---

## Limitations

- **Association, not causation.** Every number here is observational. Turn load predicting
  unsolvability does not establish that turn handling is the mechanism; it establishes where to point
  a differential diagnosis.
- **Features are correlated.** navDensity is controlled for throughout because it is the dominant
  confounder, but mechanic counts co-vary with each other and with `reqLen` (navDensity is
  *defined* as `reqLen`/navArea). The controlled deltas are not independent regression coefficients.
- **The corpus is uniform-random.** Feature distributions here are the generator's, not a player's.
  A finding about what is hard *in corpus-2* is a robustness proxy, not a statement about published
  levels — and the archetype distribution table above is the clearest example of the two diverging.
- **No new solving was performed.** Every conclusion is derived from the committed baseline; the
  routing hypothesis in Finding 1 in particular is untested until the ablation in step 1 runs.

---

## Verification

Read-only analysis; no solver code changed. Numbers reproduce from the committed
`logs/stress-corpus2-baseline.json` and `data/stress/stress-levels-random.json` via the command in
Method, with full output in
[`corpus2-feature-solvability-2026-07-29.json`](corpus2-feature-solvability-2026-07-29.json)
(includes the per-level feature/label/badness table). The archetype distribution table was produced
by running `levelFeatures()` over all three corpora; `features.mjs`'s `detectArchetypeFromRaw` was
read against `modules/solver/archetype.ts`'s `detectArchetype` to confirm the thresholds and
evaluation order match. The 734/736 must-cross routing figure and the 942/722 turn-load figure were
computed directly from the same join.
