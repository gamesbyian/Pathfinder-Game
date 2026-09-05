# Capability multiplicity predicts production success within each corpus separately, not just in aggregate

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `solverCount` vs. `productionSolved`, computed separately within `corpus1` (n=102) and `corpus2` (n=1,700) in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** the monotonic relationship `2026-09-04-census-multiplicity-predicts-production-success-001.md` reported on the combined population holds within each corpus independently — corpus2 rises cleanly from 5.4% (`solverCount=0`) to 94.5% (`solverCount=11+`); corpus1's smaller sample is directionally consistent (0%→100%→...→98.7%) despite noisier low-count buckets. This confirms the relationship is not an artifact of pooling two structurally different corpora (which `2026-09-05-routing-regime-composition-by-corpus-001.md` shows do differ in regime composition) — multiplicity predicts production success on its own terms within each corpus.
> **Remaining gate:** none — a robustness check on an existing finding using already-collected data.
> **Evidence role:** confirmatory — strengthens an existing report against a specific, plausible confound (corpus-composition pooling)
> **Selection:** whole population of both corpora, not a sample

## Method

Bucketed `solverCount` (0, 1, 2, 3-5, 6-10, 11+) and computed `productionSolved` rate within each bucket, separately for corpus1 and corpus2.

## Result

| `solverCount` bucket | corpus1 | corpus2 |
|---|---|---|
| 0 | 0/3 (0.0%) | 35/643 (5.4%) |
| 1 | 0/1 (0.0%) | 70/174 (40.2%) |
| 2 | 2/2 (100.0%) | 47/92 (51.1%) |
| 3-5 | 4/5 (80.0%) | 139/208 (66.8%) |
| 6-10 | 11/12 (91.7%) | 148/181 (81.8%) |
| 11+ | 78/79 (98.7%) | 380/402 (94.5%) |

## Interpretation

Corpus1's low-`solverCount` buckets are too thin (n=1-5) to weigh heavily on their own, but the overall shape — near-zero success at multiplicity 0-1, rising steadily thereafter — matches corpus2's much better-powered curve closely enough to rule out the concern that the combined-population finding was driven entirely by corpus2 or was an artifact of corpus1's generally higher baseline solve rate. Multiplicity's predictive value for production success is a within-corpus phenomenon, not merely a between-corpus one, which strengthens its case as a genuine, portable signal for Workstream 1/2 risk framing rather than a correlate of which corpus a level happens to come from.

## What this does not establish

- Corpus1's small per-bucket sample sizes mean this is a directional confirmation, not independent statistical power equal to corpus2's.
- Does not control for the routing-regime composition difference between corpora within this check — that remains a separate, adjacent finding.
- Single census/production snapshot pairing (2026-09-03 census, the 1,700+102-level production run).
