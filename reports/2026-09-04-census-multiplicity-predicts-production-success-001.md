# Isolated-census multiplicity also predicts real production success, not just isolated-oracle temporal stability

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — join of `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `solverCount` against `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s per-level production `status` (1,700-level population), no new dispatch
> **Decision:** a level's isolated-census multiplicity strongly and monotonically predicts whether the *real production ladder* (a different search process entirely from the isolated T1 census) solves it: production success rate rises from **6.1% at solverCount=0** to **58.6% at singleton, 72.8% at doubleton, 90.4% at 3-5, 98.9% at 6-10, and 99.5% at 11+**. This extends `2026-09-04-capability-multiplicity-temporal-robustness-001.md`'s and `2026-09-04-capability-multiplicity-budget-edge-robustness-001.md`'s isolated-census-internal findings to a genuinely different, practically important question: census multiplicity is not just self-referential (predicting whether the *census itself* stays consistent) — it is also a real predictor of the production ladder's own success, a system built independently of the isolated T1 census's own search process.
> **Remaining gate:** none for corpus2. A thin corpus1 check (below) is directionally consistent but too small to independently confirm.
> **Evidence role:** discovery — a natural extension of the already-established multiplicity-robustness theme, tested against a data source (production) not used by the prior two reports
> **Selection:** whole comparable population (1,700 corpus2 levels with a census entry), not a sample

## Result (corpus2, n=1,700)

| `solverCount` | n | production success rate |
|---:|---:|---:|
| 0 | 643 | 6.1% |
| 1 | 174 | 58.6% |
| 2 | 92 | 72.8% |
| 3-5 | 208 | 90.4% |
| 6-10 | 181 | 98.9% |
| 11+ | 402 | 99.5% |

## Generalization check (corpus1, n=102 — thin at low multiplicity)

| `solverCount` | n | production success rate |
|---:|---:|---:|
| 0 | 3 | 0.0% |
| 1-2 | 3 | 66.7% |
| 3-10 | 17 | 100.0% |
| 11+ | 79 | 100.0% |

Corpus1's shape (98/102 = 96% overall solve rate) is directionally consistent with corpus2's monotonic pattern but the low-multiplicity buckets are too thin (n=3, n=3) to independently confirm anything — corpus1 is a much smaller, structurally easier population (see `2026-09-04-corpus1-corpus2-stage-share-comparison-001.md` for why) that happens not to offer many low-multiplicity cases to test against.

## Interpretation

`solverCount=0` levels (no isolated T1 winner at all) still show a real 6.1% production success rate — consistent with this session's own earlier "production-solved, no isolated winner" cohort analyses (the 35-cohort work), confirming again that production genuinely finds some capability the isolated census's own action universe does not represent, at a modest but nonzero rate. Every multiplicity band above that shows a steep, clean climb to near-ceiling reliability. Practically, this means the isolated census's own `solverCount` field is a legitimate, already-available proxy for "how likely is production to solve this level," useful for anything that needs to stratify or weight a level population by expected production difficulty without re-running production itself.

## What this does not establish

- Correlation, not a claim that isolated multiplicity *causes* production robustness — both plausibly share a common cause (the level is simply easier along whatever dimension the structural risk factors already measure).
- Single production run (33841017634); not independently replicated, though its corpus-2 solved set is already documented byte-identical to a separate nearby dispatch.
