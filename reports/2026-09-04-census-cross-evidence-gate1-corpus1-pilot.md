# Gate 1 pilot: solution-space fingerprints vs technique response, Corpus-1

> **Status:** superseded-for-reuse; historically inconclusive
> **Last evidence:** 2026-09-13 re-evaluation against the stress-corpus selection-history audit and solution-profile resource audit; original measurements were 2026-09-04.
> **Decision:** preserve the original tiny-cohort tables as historical observations of the then-current stored sample, but do **not** reuse them as current mechanism evidence without recomputation. Whole Corpus 1 is selection-conditioned and ancestry-mixed, while several legacy profile axes treated unsupported sparse observations as measurements and `rigid` as a puzzle property rather than sampled agreement.
> **Remaining gate:** none from this historical pilot. If any nominated descriptor becomes relevant to a live question, recompute it with schema-v3 support-aware profiles, explicit population-selection/ancestry strata, and an independent confirmation population before escalation.
> **Evidence role:** historical discovery/forensic evidence only; not confirmation and not current profile-mechanism evidence.

## 2026-09-13 re-evaluation

The original stop decision was correct: this pilot did not earn escalation. Two later audits further weaken its analytical interpretation without turning its measurements into a negative result.

1. Current Corpus 1 is 23 surviving A-F generator-1.0 rows plus 79 random-generator rows that entered Corpus 1 because the then-current solver solved them before later square-grid retention. A 102-row `corpus1` join is therefore not one clean source population.
2. The solution-profile audit showed that sparse `pairwiseDistinctiveness`/prefix-diversity comparisons could manufacture evidence on unsupported axes, and that sampled MustCross agreement was mislabeled as structural `rigid`. Current schema-v3 comparison exposes support explicitly and treats rigidity as observed sample homogeneity.
3. The Q2 portal-signature direction repeated across two tiny disagreement sets, so it remains a nomination in the literal sense. It is not current mechanism evidence and does not justify new compute by itself.

See `reports/2026-09-13-historical-evidence-reevaluation-ledger.md`, `reports/2026-09-13-solution-profile-resource-audit-001.md`, and `docs/solver-corpus-selection-provenance.md`.

## Original 2026-09-04 population reconciliation

Before joining, this pilot found that `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `corpus1` tag (102 levels) and `reports/stress/solution-profile-corpus1.json`'s profiled population (also `data/stress/stress-levels.json`, 102 levels) are the **same** 102 levels, confirmed by exact `levelId` match after mapping the profile library's 1-based `level` position field through `stress-levels.json`'s own array order. `data/stress/stress-levels.json` itself is a mixed-prefix corpus (24 `S`-prefixed + 78 `R`-prefixed levels). The later selection-history reconstruction established that this mixture is also selection-conditioned, not merely a naming surprise.

## Original method

For each prespecified question, disagreement/cohort populations were computed directly from `level-capability.json`'s `solvingActions` (normalized via `modules/solver/attempt-identity.mjs`, the same normalizer Gate 0C uses) restricted to `corpus === 'corpus1'`, then joined to each level's `combined` solution-profile bucket. No new profile data was generated; no other corpus was touched.

## Q1 — multiplicity/basin-width

| group | n | mean pairwise distinctiveness | mean prefix diversity | median portal signatures | fraction rigid MustCross |
|---|---:|---:|---:|---:|---:|
| singleton (solverCount=1) | 4 | 0.110 | 0.831 | 1 | 1.00 |
| doubleton (solverCount=2) | 2 | 0.463 | 0.721 | 2.5 | n/a (no MustCross-order rows) |
| multi (solverCount≥3) | 96 | 0.332 | 0.755 | 0 | 0.80 |

**Historical interpretation:** inconclusive. Corpus 1's singleton/doubleton population was tiny (4 and 2 levels). The old text treated low pairwise distinctiveness and high MustCross `rigid` as directionally supportive of a narrower/more-rigid basin. Under current semantics, `rigid` here means only observed single-order agreement in the stored sample, and the diversity comparison requires support-aware recomputation before reuse.

## Q2 — diverse-beam (mechanic-buckets) mechanism

| pair | plain-only n | mechanic-buckets-only n | plain mean portal signatures | mechanic-buckets mean portal signatures |
|---|---:|---:|---:|---:|
| `objectiveFirst`, width 5K | 5 | 4 | 2.00 | **5.75** |
| `intersectionHarvest`, width 5K | 2 | 4 | 0.00 | **4.50** |

**Historical observation:** both prespecified pairs showed the mechanic-buckets-only disagreement population with more distinct portal-use signatures than the plain-only population. This remains a small-sample nomination, not confirmation. The 2026-09-13 re-evaluation removes any temptation to treat it as a current mechanism result without schema-v3 recomputation and population-role control.

## Q3 — width inversion (2K vs 5K)

| pair | 2K-only n | 5K-only n | 2K mean pairwise distinctiveness | 5K mean pairwise distinctiveness |
|---|---:|---:|---:|---:|
| `objectiveFirst`, 2K vs 5K | 3 | 16 | 0.374 | 0.234 |

**Historical interpretation:** inconclusive, n=3 too small to interpret. The old pairwise-distinctiveness comparison is additionally not reusable without support-aware recomputation.

## Q4 — orientation control (CW vs CCW)

| pair | CW-only n | CCW-only n | CW mean pairwise distinctiveness | CCW mean pairwise distinctiveness | CW mean portal sigs | CCW mean portal sigs |
|---|---:|---:|---:|---:|---:|---:|
| `perimeterSweep` beam, 2K | 7 | 6 | 0.333 | 0.353 | 1.71 | 3.17 |

**Historical interpretation:** the scalar profile comparison was not decisive, and n=6/7 was too small to support an orientation explanation. Nothing in the later audits turns this into positive or negative orientation evidence.

## Disposition and stop rule

The original pilot stopped rather than profiling Corpus 2 or scanning additional axes. That remains the right disposition. The portal-signature-diversity observation is retained only as a named historical nomination. If it becomes relevant to current WS1 work, start from current profile semantics and a population chosen for the new claim rather than continuing this old sequence automatically.

## What this pilot does not establish

- Not a controlled/held-out confirmation.
- Not evidence that whole Corpus 1 is an independent or cross-generator population.
- Not evidence that sampled MustCross agreement proves structural rigidity.
- Not a reusable sparse-profile similarity result under current schema-v3 semantics.
- Not a claim about Corpus 2 or published-corpus behavior.
