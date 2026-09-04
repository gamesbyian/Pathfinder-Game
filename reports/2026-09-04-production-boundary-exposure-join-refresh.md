# Production-boundary/exposure join, refreshed: not-offered vs. offered-but-fails

> **Status:** superseded
> **Last evidence:** 2026-09-04 — superseded by `2026-09-04-census-cross-evidence-production-boundary-join.md` (Gate 0D), an independent pass at the same question that reaches the same headline numbers (45/122=36.9% not-offered, 77/122=63.1% offered-but-fails) but on a more rigorously verified-comparable production run: Gate 0D explicitly checked this report's source run (`33588487486`) and found its recorded commit does not resolve in local git history, so its code-comparability to the census could not be verified, and used `33824275953` instead (verified via `git merge-base --is-ancestor` to be a strict descendant of the census commit, with only an opt-in/default-off feature touching `modules/solver/` in between). The two source runs' corpus-2 solved sets turned out to be byte-identical, which is why the numbers match, but Gate 0D's evidence-comparability check is the better-supported version going forward.
> **Decision:** superseded — see the canonical report for the current authoritative version of this join.
> **Remaining gate:** none — use `2026-09-04-census-cross-evidence-production-boundary-join.md` going forward.
> **Evidence role:** development — a join of two already-collected evidence artifacts, no new dispatch (superseded)

## Why this refresh, and a real methodological change from the original

`2026-08-25-post-976-portfolio-exposure-rejoin.md` classified the "known isolated winner" residual on 724 current misses into three buckets — not-offered, offered-but-starved (attempted, but shallower than the isolated solve's own depth), and offered-adequately-but-non-reproducing — using per-attempt `nodesExpanded` depth comparison against the frozen census. The freshest lifecycle-telemetry production run available (`33588487486`, 2026-09-02) records, per level, an aggregate `failedStrategies` list of every distinct config identity attempted, but **not** per-attempt depth at this population scale (unlike the 40-level static-portfolio A/B this session ran earlier, which does carry that granularity but only for 40 levels — far too small for a population-wide exposure audit). This report therefore uses a **two-way** classification — offered (the isolated winning config identity appears somewhere in the level's `failedStrategies`) vs. not-offered (it never does) — collapsing the original "starved" and "offered-adequately" buckets into one "offered-but-fails" bucket. This is a real scope reduction from the original three-way split, stated explicitly rather than silently narrowed.

## Method

1. Production misses: `ok: false` rows from `reports/stress/capability-runs/33588487486/per-level-corpus1.json` and `per-level-corpus2.json` (729/1,802 levels, both corpora).
2. Isolated winners: each miss's `solvingActions` from `reports/stress/technique-niches/2026-09-03/level-capability.json`, restricted to levels with `isolatedOracleSolved: true` (122/729 — the comparable population; the other 607 have no isolated T1 winner at all and cannot support this classification, matching the original report's own "no observed base winner" exclusion).
3. For each comparable miss, checked whether any isolated winning config identity string appears verbatim in that level's `failedStrategies` array (both use the same canonical attempt-identity-key format, so no legacy-name translation was needed, unlike the relative-advantage rejoin earlier this session).
4. Classified: **not-offered** (no isolated winner ever attempted) vs. **offered-but-fails** (at least one isolated winner attempted, still failed).

## Result

| | 2026-08-25 (`32835403128`×`32240161854`) | 2026-09-04 (`33588487486`×`33717910218`) |
|---|---:|---:|
| total misses | 724 | 729 |
| comparable (has ≥1 isolated winner) | 139 (19.2%) | 122 (16.7%) |
| not-offered | 73 (52.5% of comparable) | **45 (36.9% of comparable)** |
| offered (starved + adequate, or offered-but-fails) | 66 (47.5% of comparable) | **77 (63.1% of comparable)** |

The comparable-population share (16.7% vs. 19.2%) is close, consistent with the general churn the census refresh already introduced elsewhere. The internal split within that comparable population moved substantially: **not-offered fell from a majority (52.5%) to a minority (36.9%)**, while offered-but-fails grew from under half to nearly two-thirds. Missing exposure remains a real, actionable seam — 45 levels still have a known-winning config production never tries — but it is no longer the dominant story in the comparable residual the way it was at the 976-era snapshot.

**Top not-offered configs** (by level count, i.e. how many not-offered levels list this exact config as an unoffered known winner):

| levels | config |
|---:|---|
| 13 | `repair\|score=repair\|guidance=turn-biased` |
| 6 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` |
| 6 | `repair\|score=repair\|guidance=must-turn-biased` |
| 5 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain+coarse-state-near-tie-retention-off` |
| 5 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain+coarse-state-near-tie-retention-off` |
| 4 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=mechanic-buckets` |
| 4 | `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` |
| 4 | `admissible-order\|tieBreak=mustCrossFirst\|lds=off` |
| 4 | `admissible-order\|tieBreak=nearClosureRescue\|lds=off` |

The single largest not-offered config, `repair|score=repair|guidance=turn-biased` (13 levels), is notable: this is a distinct repair guidance variant from the `must-turn-biased`/`standard` guidances the current production ladder's `early-repair-search`/`repair-fallback` tiers actually run — a genuine menu gap, not a starvation or context artifact. The rest of the list is dominated by wide `beam` variants (`mechanic-buckets` retention, `coarse-state-near-tie-retention-off` ablation combination) and the two non-default `admissible-order` tie-break profiles this session's `2026-09-04-production-ladder-marginal-value-tail-audit-001.md` already examined in detail — consistent with, not contradicted by, that report's finding that these tie-break profiles carry real but expensive/rare value.

## Interpretation

The 2026-08-25 rejoin's headline ("missing exposure is still real after the 976 routing gains... a measurable capability seam") remains true in direction but weaker in magnitude: the comparable-population's own composition has shifted meaningfully toward "offered but still fails," which this data source cannot further decompose into starvation vs. genuine non-reproduction without per-attempt depth telemetry at population scale. If missing exposure is pursued as a scheduler intervention target, `repair|score=repair|guidance=turn-biased` is now the single largest concrete candidate (13 levels), a genuinely different nomination from the 2026-08-25 report's own top candidate (`beam:intersectionHarvest@beam5000(diverse)`, now largely folded into the `retention=mechanic-buckets` naming and already a kept specialist in `portfolio-18-specialists`).

## Caveats

- Two-way, not three-way: this cannot separate "attempted at 10% of the isolated depth" from "attempted at 99% of the isolated depth and still failed" — both land in "offered-but-fails." The original starvation finding (median depth ratio 0.30, with a near-boundary 21-cell subset within 10% of historical depth) is neither confirmed nor refuted here.
- `33588487486` is 2026-09-02, one day before the 2026-09-03 census (`33717910218`) this report joins it against — a smaller cross-revision gap than the original report's (production `32835403128` vs. census `32240161854`, roughly a 5-day gap and, separately, the census's own later-recognized two-week staleness).
- Development join across two already-collected artifacts, not independent confirmation; do not treat exact per-level classification as routing-ready.
