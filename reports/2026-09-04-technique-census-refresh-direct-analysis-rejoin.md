# Technique census refresh: direct analytical rejoin and remaining parity work

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — Gates 0A-0F of `reports/2026-09-04-census-cross-evidence-coding-handoff.md` complete; the bounded Gate-1 Corpus-1 pilot also ran and returned inconclusive (`2026-09-04-census-cross-evidence-gate1-corpus1-pilot.md`)
> **Decision:** the refreshed census materially changes individual support identities and thin-boundary membership, but the broad structural unsupported-risk picture survives. More strongly, the old/new pair shows that aggregate capability can remain almost flat while **capability ownership churns substantially**; future niche/portfolio claims should therefore report temporal stability where possible. See "Gate 0F — conclusion delta" below for the full scored comparison against the September-1 synthesis.
> **Remaining gate:** none from Gate 0/1. See "Newly earned next steps" below for what a future session should pick up, none of which is forced by this report alone.
> **Evidence role:** observational-development re-analysis of already-collected census evidence

## Why this report exists

Run `33717910218` refreshed the expensive technique × level matrix and `2026-09-03-technique-census-refresh-001-rejoin.md` rebuilt the basic capability map and old-vs-new class delta. That refresh did not automatically regenerate every analytical layer later built around the August census. This report records what can already be refreshed directly from the current capability artifact and identifies the remaining derived outputs that should be rebuilt from the fresh cells.

The broader ranked research program that now joins census evidence to solution-space fingerprints, production response, variants and mechanism traces is in `2026-09-04-census-cross-evidence-research-plan.md`.

## Current top line

The current `level-capability.json` covers 1,962 levels:

| metric | current |
|---|---:|
| production solved | 1,074 |
| production unsolved | 888 |
| isolated-oracle solved | 1,316 |
| no isolated T1 winner | 646 |
| production miss + no isolated T1 winner | 611 |
| production solved + no isolated T1 winner | 35 |
| production miss + isolated T1 winner | 277 |
| singleton | 175 |
| doubleton | 94 |

The refresh report already records the important historical delta: 229 levels changed support class, 25 newly entered the production-solved/no-isolated-winner class, 81 production misses gained isolated support, singleton count moved 181→175, and doubleton 96→94.

## Temporal holdout: stable totals, unstable ownership

The old and refreshed censuses use the same 1,962-level universe and the same broad isolated-T1 question at different solver revisions. That makes their disagreement useful evidence rather than merely staleness to erase.

- isolated-oracle union moved only **1,313 → 1,316**, a +3-level / ~0.23% change;
- nevertheless **229/1,962 = 11.7%** of levels changed support class;
- 81 production misses gained isolated support while 25 production-solved rows newly lost all isolated support;
- singleton membership churned 94 gains / 100 losses despite a net count change of only -6.

The practical lesson is that an aggregate union or singleton count can look stable while the identities supplying that capability move considerably. Future technique-niche, rare-capability and portfolio analyses should therefore distinguish:

1. aggregate capability stability;
2. per-level support-class stability;
3. per-technique capability ownership stability.

Selected action rows show the same pattern:

| action | old solved → new solved | old exclusive → new exclusive | old thin → new thin | reading |
|---|---:|---:|---:|---|
| IH beam 5K mechanic-buckets | 713 → 713 | 9 → 11 | 25 → 22 | total unchanged, ownership moved |
| objective beam 5K mechanic-buckets | 712 → 705 | 11 → 14 | 25 → 21 | modest solve drift, stronger singleton role |
| perimeter beam 2K CW | 504 → 499 | 11 → 15 | 23 → 30 | fewer solves, more rare-boundary ownership |
| perimeter beam 2K CCW | 502 → 506 | 13 → 10 | 21 → 27 | opposite-direction ownership movement |
| repair standard | 787 → 770 | 59 → 50 | 101 → 91 | broad specialist weakened but remains dominant |
| repair must-turn-biased | 174 → 187 | 14 → 19 | 30 → 29 | sibling repair mode gained capability |
| admissible-order no tie-break | 458 → 490 | 15 → 17 | 28 → 24 | meaningful broad gain |
| DFS default | 398 → 385 | 1 → 0 | 1 → 2 | broad count drift without rare-role growth |

These examples are descriptive, not a substitute for the full action-stability/Jaccard rebuild. They are enough to show why the new research plan treats temporal technique stability as a first-class output.

A particularly clean candidate-level holdout is now complete: `2026-09-04-portfolio-18-fresh-census-temporal-holdout.md` finds the already-fixed `portfolio-18-specialists` composition retained **147/155 (94.8%)** of refreshed full-menu singleton exclusives, versus **144/151 (95.4%)** on the old census. The rare-capability curation principle survived the temporal shift almost unchanged even though the portfolio's real production replacement A/B remains closed for separate dose/context reasons.

## Structural unsupported-risk signal: refreshed

The strongest current standardized differences between T1-supported and no-T1-winner levels are:

| feature | current standardized difference | Sep-1 synthesis | reading |
|---|---:|---:|---|
| constrained objects | 1.276 | 1.23 | stable / slightly stronger |
| turn-constraint load | 0.971 | 0.92 | stable / slightly stronger |
| constrained-object density | 0.838 | 0.79 | stable / slightly stronger |
| required path length | 0.828 | 0.84 | essentially unchanged |
| portals | 0.789 | 0.76 | stable |
| required-path coverage | 0.760 | 0.75 | essentially unchanged |
| must-turn count | 0.656 | 0.70 | modestly weaker, still material |
| surround count | 0.603 | 0.55 | modestly stronger |
| blocks | 0.577 | 0.55 | stable |

This is a useful survival result: the September-1 conclusion that unsupported-risk is associated with **combined obligation/load/topology burden rather than one mechanic** remains supported after substantial solver drift. The refreshed census changed many exact winners but did not erase the coarse structural anatomy.

Routing-regime enrichment is also broadly stable:

- `intersection-heavy`: 528/1,371 no-winner, enrichment **1.170x**;
- `multi-portal`: 63/174, enrichment **1.100x**;
- `must-cross-heavy`: 49/222, enrichment **0.670x**;
- `general`: 6/149, enrichment **0.122x**;
- `sparse-low-intersection`: 0/46.

The one directional change worth noting is `multi-portal`: the September-1 synthesis called it nearly neutral (~1.03x), whereas the fresh map puts it at ~1.10x. That is still a weak enrichment compared with combined constraint/load effects and does not by itself earn a portal-specific intervention.

## Admissible-order rare capability: refreshed

Current per-profile rows are:

| profile | solved | singleton exclusive | doubleton participation | production-miss wins | successful-node median | successful-node p90 |
|---|---:|---:|---:|---:|---:|---:|
| `tieBreak=default` | 456 | 1 | 6 | 31 | 429,071 | 19,076,423 |
| `tieBreak=intersectionHarvest` | 454 | 1 | 4 | 30 | 427,598 | 19,818,742 |
| `tieBreak=mustCrossFirst` | 452 | 1 | 4 | 35 | 434,524 | 20,077,843 |
| `tieBreak=nearClosureRescue` | 444 | 2 | 4 | 34 | 412,234 | 20,077,843 |
| `tieBreak=none` | 490 | **17** | **24** | **38** | 365,381 | 21,785,688 |

The scheduler-facing conclusion survives the refresh: the alternate admissible-order profiles are not interchangeable dead weight. `tieBreak=none` in particular still owns a large rare-capability footprint, while the three named non-default profiles each retain smaller but non-zero singleton capability. This reinforces the current `admissible-order-alternate-tiebreak-retry` disposition: large repricing headroom is plausible, but wholesale suppression would need a stronger rare-capability argument than the 40-level zero-hit pilot.

## Selected beam capability rows relevant to current scheduler work

The refreshed map also preserves the importance of the intersection-harvest beam family:

| action | solved | singleton exclusive | doubleton participation | production-miss wins |
|---|---:|---:|---:|---:|
| intersectionHarvest, width 2K, plain | 499 | 4 | 5 | 19 |
| intersectionHarvest, width 5K, plain | 614 | 2 | 5 | 26 |
| intersectionHarvest, width 5K, mechanic-buckets | 713 | **11** | **22** | **51** |

This is consistent with the production-vs-static-portfolio A/B attribution: the 5K intersection-harvest searches are not generic redundant tail; they carry substantial demonstrated capability and some of the static portfolio's production losses were dose truncations of these exact configurations.

## What is already refreshed versus still stale

All six Gate 0 items are now complete:

- raw combined census cells and level-technique coverage from run `33717910218`;
- first-order capability summary / pair-synergy / flag-sensitivity outputs emitted with that run;
- `reports/stress/technique-niches/2026-09-03/level-capability.json`;
- old-vs-new support-class/singleton/doubleton delta digest;
- direct structural-risk and selected current action summaries in this report;
- refreshed `portfolio-18-specialists` singleton-retention temporal holdout (`2026-09-04-portfolio-18-fresh-census-temporal-holdout.md`);
- **Gate 0A** — full second-order census analysis regenerated: `reports/stress/technique-census/33717910218/second-order-analysis.{json,md}`;
- **Gate 0B** — fixed eight relative-advantage pairs regenerated (after fixing `DEFAULT_PAIRS`' stale pre-naming-cleanup key spellings, which silently matched zero rows against any current data): `reports/stress/technique-niches/2026-09-03/relative-advantage-summary.json`;
- **Gate 0C** — reusable old->new action/level temporal-stability tool built and run: `scripts/analyze-technique-census-temporal-stability.mjs`, output at `reports/stress/technique-niches/2026-09-03/temporal-stability.{json,md}`;
- **Gate 0D** — production-boundary/exposure join refreshed with an explicit evidence-comparability check: `2026-09-04-census-cross-evidence-production-boundary-join.md`;
- **Gate 0E** — 35-cohort classified against the coding handoff's taxonomy: `2026-09-04-census-cross-evidence-35-cohort-anatomy.md`.

## Gate 0F — conclusion delta

Four rows (thin-boundary share of the gap population, thin-boundary share of all oracle-solved, the perfect-router bound, and the CW/CCW orientation pair) were folded in from an independent parallel pass on this same September-1-vs-refresh comparison (`claude/scheduler-evidence-model-v1nnyv`'s `2026-09-04-technique-niches-delta-of-conclusions.md`, now superseded by this table) to keep one canonical scored comparison rather than two partially-overlapping ones.

| September-1 / 976-era conclusion | Fresh (2026-09-03/04) equivalent | Verdict |
|---|---|---|
| Isolated oracle union 1,313/1,962 (66.9%); singleton 181, doubleton 96 | 1,316/1,962 (67.1%); singleton 175, doubleton 94 | **Survived** — aggregate shape essentially unchanged despite 229 underlying support-class changes (per-level) |
| Production-miss isolated-solvable 253/888 (28.5%) | 277/888 (31.2%) | **Strengthened slightly** |
| Thin-boundary share of the oracle-solved gap population: 161/253 (63.6%) | 150/277 (54.2%) | **Weakened** — still a majority, but a real ~9.4pp drop; the gap population is less dominated by singleton/doubleton "thin" solves than before |
| Thin-boundary share of all oracle-solved levels: 277/1,313 (21.1%) | 269/1,316 (20.4%) | **Survived** — close, small movement |
| Perfect-router bound on the production-unsolved population: 24 solves @100K work, 108 @500K, 171 @10M, 253 @50M | 31 @100K, 146 @500K, 212 @10M, 277 @50M | **Strengthened at every threshold** — the isolated technique menu demonstrates materially more oracle capability at every matched work budget than the August census showed |
| Repair largest deep specialist: 59 canonical-repair singleton wins | 50 (`repair\|score=repair\|guidance=standard`); solve-set Jaccard only **0.713** (122 gained, 139 lost) despite solved count moving only 787->770 | **Weakened in magnitude, and Gate 0C adds a new finding this report's own old-vs-new table did not have**: aggregate solved-count stability conceals substantial capability-ownership churn — the must-turn-biased/turn-biased repair guidance variants show even sharper churn (Jaccard ~0.44-0.46) |
| `admissible-order\|tieBreak=none` 15 singleton wins | 17 | **Strengthened** |
| `portfolio-18-specialists` retains 144/151 (95.4%) of full-menu singleton exclusives | 147/155 (94.8%) | **Survived** (`2026-09-04-portfolio-18-fresh-census-temporal-holdout.md`) |
| Close-substitute Jaccard: `ida:default`/`ida:mustCrossFirst` .936; `dfs:harvestThenFinish`/`dfs:portalFirstTransfer` .932 | `admissible-order` default/mustCrossFirst 0.924; `dfs` harvestThenFinish/portalFirstTransfer 0.941 (Gate 0B, outcome-similarity view) — Gate 0C's independent solve-set Jaccard for the same two pairs: 0.768 and 0.835 respectively | **Survived** on the outcome-similarity metric; the two Jaccard formulations (Gate 0B's disagreement-population view vs. Gate 0C's raw solve-set view) are not the same statistic and should not be conflated — both still support "highly substitutable, not identical" |
| Structural no-T1-winner risk factors: constrained objects 1.23, turn-constraint load .92, portals .76 | 1.276, 0.971, 0.789 | **Survived** — combined obligation/load/topology burden remains the dominant structural signal |
| Routing-regime enrichment: multi-portal "nearly neutral" ~1.03x | 1.100x | **Partially reversed** — real, if still weak, enrichment |
| Objective/intersection-harvest beam plain-vs-mechanic-buckets: portals -1.06 / +0.655 requiredIntersections | portals -0.677 (weaker, same direction) / +0.903 requiredIntersections (stronger, same direction) | **Survived**, one weaker one stronger in magnitude |
| Objective beam 2K-vs-5K: 2K-only wins explained by larger navigable area/scale (std diff ~0.66) | Top effects now turnConstraintLoad/coverage/density; scale features no longer in the top 3 | **Reversed** — the width-inversion phenomenon itself still holds; its September-1 explanation does not |
| CW/CCW beam and DFS orientation pairs: large disagreement populations, weak coarse-feature separation (~0.22-0.34); "orientation sensitivity is real but largely invisible to counts/densities" | Beam CW/CCW 0.247 (was 0.215); DFS CW/CCW top effect now portals 0.620 (was mustCross 0.344) | **Survived for beam** (still weak, same conclusion); **strengthened for DFS** (materially larger top effect, though the leading feature identity changed from mustCross to portals) — orientation sensitivity remains poorly explained by coarse features either way |
| 14 anomalous production-solved/no-T1-winner levels; 7/8 later-solved cases were diverse 5K beams "usually in retry stages" | Cohort grew to 35; Gate 0E finds 25/35 are census coverage gaps (not genuine anomalies) and, of the genuine 10, 7/10 attributable and **100%** are whole-ladder ablation-disabled retry / biased-repair contexts | **Strengthened and reframed** — the "usually in retry stages" nomination is confirmed at much larger scale and sharper mechanism, but the raw 35-count overstates the phenomenon by roughly 2.5x |
| 976-era production-boundary decomposition: 139/724 comparable, 73 not-offered (52.5%), 66 offered (47.5%) | 122/729 comparable (16.7%, close), **45 rescuer-never-offered (36.9%)**, 77 offered-but-outcome-unresolved (63.1%) | **Reframed** — comparable-population share survived; the internal split flipped which bucket is the majority. `repair\|guidance=turn-biased` is now the single largest concrete never-offered config (13 levels), a genuinely different nomination from the 2026-08-25 report's own top candidate |

## Newly earned next steps

1. **The missing-exposure priority needs re-weighing, not automatic re-prioritization.** The 976-era "prioritize one cheap missing-exposure beam pilot" recommendation assumed missing exposure was the majority (52.5%) of the comparable residual; it is now the minority (36.9%). `repair|score=repair|guidance=turn-biased` (13 levels, never offered in production at all) is now the single most concrete candidate if this line is pursued, but weigh it against the now-larger offered-but-unresolved bucket.
2. **Repair's capability-ownership churn (Jaccard 0.71, and ~0.44-0.46 for the biased guidance variants) is a genuinely new finding**, not present in either the September-1 synthesis or the 2026-09-04 direct-rejoin's earlier selected-row table. It does not by itself justify a repair-policy change, but any future repair repricing/routing claim should report temporal stability alongside aggregate solve counts, per this report's own standing lesson.
3. **The 2K/5K objective-beam width-inversion mechanism needs a fresh explanation.** Its September-1 "larger navigable area" framing no longer holds; do not reuse it if this inversion becomes decision-relevant.
4. **Gate 1's bounded Corpus-1 pilot ran and returned inconclusive** (`2026-09-04-census-cross-evidence-gate1-corpus1-pilot.md`). One signal is worth naming as a hypothesis for a future, properly powered pass: portal-use-**signature** diversity (distinct portal-use modes, not raw portal count) separated the diverse/mechanic-buckets-only disagreement population from the plain-only population in both prespecified beam pairs (2.9x and a 0-to-4.5 gap respectively) — directionally consistent with, and mechanistically sharper than, the September-1 portal-count finding. Corpus 1 alone (disagreement populations of n=2-16 per side) cannot confirm it, and generating a Corpus-2 profile library to chase it now is out of this handoff's scope. Per Gate 1's own stop rule, this pilot stopped rather than escalating.

None of Gate 0 required another expensive census. It was extraction, joining, and interpretation of evidence already collected.
