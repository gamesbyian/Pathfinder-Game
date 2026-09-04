# Gate 1 pilot: solution-space fingerprints vs technique response, Corpus-1

> **Status:** inconclusive
> **Last evidence:** 2026-09-04 — join of `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `corpus1` population (102 levels) against `reports/stress/solution-profile-corpus1.json`, restricted to the four prespecified questions in `reports/2026-09-04-census-cross-evidence-coding-handoff.md`'s Gate 1
> **Decision:** one directionally consistent, cross-validated signal (portal-use-signature diversity separates diverse/mechanic-buckets-only wins from plain-only wins in both prespecified beam pairs) survives at pilot scale, but every disagreement population on Corpus 1 alone is too small (n=2 to n=16 per side) to promote past nomination. Per Gate 1's own stop rule, this pilot stops here rather than escalating to source-bucket sensitivity or a larger population.
> **Remaining gate:** none from this pilot alone. If the portal-signature-diversity nomination is pursued further, the next step would be a properly scoped population expansion (which corpus, how large, held-out split) as its own decision, not an automatic continuation.
> **Evidence role:** discovery — outcome-selected-population comparisons at small sample size; a nomination, not confirmation

## Population reconciliation (worth recording)

Before joining, this pilot found that `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `corpus1` tag (102 levels) and `reports/stress/solution-profile-corpus1.json`'s profiled population (also `data/stress/stress-levels.json`, 102 levels) are the **same** 102 levels, confirmed by exact `levelId` match after mapping the profile library's 1-based `level` position field through `stress-levels.json`'s own array order. `data/stress/stress-levels.json` itself is a mixed-prefix corpus (24 `S`-prefixed + 78 `R`-prefixed levels) — a genuine surprise worth noting for future joins assuming ID prefix implies corpus, since it does not here.

## Method

For each prespecified question, disagreement/cohort populations were computed directly from `level-capability.json`'s `solvingActions` (normalized via `modules/solver/attempt-identity.mjs`, the same normalizer Gate 0C uses) restricted to `corpus === 'corpus1'`, then joined to each level's `combined` solution-profile bucket. No new profile data was generated; no other corpus was touched.

## Q1 — multiplicity/basin-width

| group | n | mean pairwise distinctiveness | mean prefix diversity | median portal signatures | fraction rigid MustCross |
|---|---:|---:|---:|---:|---:|
| singleton (solverCount=1) | 4 | 0.110 | 0.831 | 1 | 1.00 |
| doubleton (solverCount=2) | 2 | 0.463 | 0.721 | 2.5 | n/a (no MustCross-order rows) |
| multi (solverCount≥3) | 96 | 0.332 | 0.755 | 0 | 0.80 |

**Inconclusive.** Corpus 1's own singleton/doubleton population is tiny (4 and 2 levels respectively — consistent with the corpus-wide 175/1,962 singleton rate applied to a 102-level slice, but too few to compare group means meaningfully). The singleton group's low pairwise distinctiveness and high MustCross rigidity point in the direction the multiplicity/basin-width hypothesis predicts (fewer solvers -> narrower/more rigid basin), but n=4 cannot support this beyond a nomination.

## Q2 — diverse-beam (mechanic-buckets) mechanism

| pair | plain-only n | mechanic-buckets-only n | plain mean portal signatures | mechanic-buckets mean portal signatures |
|---|---:|---:|---:|---:|
| `objectiveFirst`, width 5K | 5 | 4 | 2.00 | **5.75** |
| `intersectionHarvest`, width 5K | 2 | 4 | 0.00 | **4.50** |

**The one signal worth flagging.** Both prespecified pairs independently show the mechanic-buckets-only disagreement population using **more distinct portal-use signatures** than the plain-only population, at a materially large ratio (2.9x and infinite/4.5x respectively) — directionally consistent with, and a sharper mechanistic reading of, the September-1 relative-advantage finding that mechanic-buckets-only wins have higher portal *count*. A signature-diversity measure (how many distinct ways portals are actually used across solutions) is a more specific claim than raw portal count, and it agrees in direction on both independently-tested pairs. Still: n=4-5 per side, on one corpus, one snapshot. This is discovery evidence, not confirmation — the same population that nominated it cannot also confirm it.

## Q3 — width inversion (2K vs 5K)

| pair | 2K-only n | 5K-only n | 2K mean pairwise distinctiveness | 5K mean pairwise distinctiveness |
|---|---:|---:|---:|---:|
| `objectiveFirst`, 2K vs 5K | 3 | 16 | 0.374 | 0.234 |

**Inconclusive, n=3 too small to interpret.** The 2K-only group shows higher solution distinctiveness than the 5K-only group, which if anything runs opposite to a naive "wider beam finds more diverse solutions" prior — but three levels cannot distinguish a real effect from noise. This neither confirms nor refutes September-1's now-abandoned "larger navigable area" explanation; it simply does not have the population to test a replacement explanation either.

## Q4 — orientation control (CW vs CCW)

| pair | CW-only n | CCW-only n | CW mean pairwise distinctiveness | CCW mean pairwise distinctiveness | CW mean portal sigs | CCW mean portal sigs |
|---|---:|---:|---:|---:|---:|---:|
| `perimeterSweep` beam, 2K | 7 | 6 | 0.333 | 0.353 | 1.71 | 3.17 |

**Consistent with the expected negative-control shape, but not decisively.** Pairwise distinctiveness and prefix diversity are close between the two groups, matching the handoff's own prior that scalar solution-profile axes should not trivially explain orientation sensitivity. The portal-signature gap (1.71 vs 3.17) is the one axis with real separation, which is a mild surprise worth a footnote rather than a reversal of the "orientation is not explained by coarse features" conclusion — n=6/7 is too small to call this decisive either way.

## Disposition and stop rule

Per Gate 1's own stop rule ("Stop before variants/traces if no compact descriptor survives Corpus-1 and source-bucket sensitivity. Do not respond by profiling Corpus 2 or scanning dozens more axes."): this pilot stops here. The portal-signature-diversity nomination (Q2) is the one candidate worth carrying forward as a named hypothesis, but Corpus 1 alone cannot supply the population to confirm it, and generating a Corpus-2 profile library to chase it is explicitly out of this handoff's scope (no new bulk variant generation, no new solver dispatch). This is a clean, honest **inconclusive** disposition, not a negative — the signal may be real; Corpus 1 alone is simply too small a population to tell.

## What this pilot does not establish

- Not a controlled/held-out confirmation; every number above is outcome-selected from the same pass that inspected it.
- Corpus-1-only; no claim about Corpus 2 or published-corpus behavior.
- `pairwiseDistinctiveness`/`prefixDiversity`/portal-signature counts are themselves derived from a small number of stored hints per level (median 14.6 on Corpus 1) — see `docs/solver-solution-profile.md`'s own caution that "saturation is not completeness."
