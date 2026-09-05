# Routing-regime composition is itself a real confound behind corpus1's ease

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `features.routingRegime` tabulated separately for `corpus1` (n=102) and `corpus2` (n=1,700) in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** the two corpora have materially different routing-regime mixes. Corpus1 has much less of the hardest regime (`intersection-heavy`: 56.9% vs. corpus2's 76.6%) and much more of the easier ones (`must-cross-heavy` 24.5% vs. 10.2%; `general`+`sparse-low-intersection` combined 10.8% vs. 3.8%). Since `2026-09-04-routing-regime-multiplicity-and-difficulty-001.md` already showed `intersection-heavy` has the lowest multiplicity/production-solved rate of any regime and `general`/`sparse-low-intersection` the highest, this composition difference is itself a partial, independent explanation for corpus1's much higher solve rate (96.1% vs. corpus2's 57.4%, per `2026-09-04-corpus1-corpus2-stage-share-comparison-001.md`) — not just a coincidental correlation.
> **Remaining gate:** none — descriptive cross-tabulation using already-collected data.
> **Evidence role:** discovery — a confound check connecting two previously-separate findings (corpus1-vs-corpus2 difficulty, and routing-regime-vs-difficulty)
> **Selection:** whole population of both corpora, not a sample

## Method

Tabulated `features.routingRegime` separately within `corpus==='corpus1'` and `corpus==='corpus2'`.

## Result

| `routingRegime` | corpus1 (n=102) | corpus2 (n=1,700) |
|---|---:|---:|
| `intersection-heavy` | 58 (56.9%) | 1,302 (76.6%) |
| `must-cross-heavy` | 25 (24.5%) | 174 (10.2%) |
| `general` | 10 (9.8%) | 65 (3.8%) |
| `multi-portal` | 8 (7.8%) | 159 (9.4%) |
| `sparse-low-intersection` | 1 (1.0%) | 0 (0%) |

## Interpretation

This does not fully explain corpus1's ease — corpus1 solves 96.1% overall, well above even the easiest single regime's rate (`sparse-low-intersection`'s 100% is based on n=46 in the combined census, and corpus1 only contributes 1 level to that regime) — but it does show the two corpora are not directly comparable random samples from the same regime distribution, and some of the corpus1-vs-corpus2 difficulty gap is attributable to corpus1 simply containing proportionally fewer of the structurally hardest (`intersection-heavy`) levels and more of the easier (`must-cross-heavy`, `general`) ones. Any future work treating "corpus1 vs corpus2" as a clean proxy for a generator/editor-envelope effect should account for this regime-composition confound rather than attributing the full gap to corpus identity alone.

## What this does not establish

- Does not decompose how much of the corpus1-vs-corpus2 gap is regime-composition vs. other corpus-specific factors — a stratified (regime-controlled) comparison would be needed for that, not attempted here.
- Does not explain *why* the two corpora differ in regime composition — no generator/editor field exists in the census to investigate that directly (per the standing caveat in `solver-future-work.md`).
- Single census snapshot (2026-09-03).
