# Corpus1 and corpus2 are structurally different populations: corpus1 barely touches the late ladder

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus{1,2}.json`'s already-computed `winningTechnique`/`population` aggregates, no new dispatch
> **Decision:** corpus1 (102 levels) and corpus2 (1,700 levels) show materially different production-difficulty profiles from the same production dispatch. Corpus1 solves **98/102 (96.1%)** overall, with **95/98 (97%)** of its solves coming from just `main-ladder` (61) and `early-repair-search` (34) — only 3 solves reach any later stage. Corpus2 solves **975/1,700 (57.4%)**, with `main-ladder`+`early-repair-search` accounting for only **769/975 (78.9%)** of solves — a full **21.1%** of corpus2's solves depend on the late-ladder retry tiers this session has spent most of its research effort auditing. This is a real, already-available "generator-envelope" comparison (`solver-future-work.md`'s deferred "generator- and editor-envelope-specific technique niches" item, addressed for the corpus1-vs-corpus2 axis specifically, using data already on disk).
> **Remaining gate:** none for this specific corpus1-vs-corpus2 comparison. The future-work bullet's broader ambition (generator/editor-specific niches beyond corpus1-vs-corpus2) remains open — this census does not carry a generator/editor field, only a `corpus` label.
> **Evidence role:** discovery — whole-population aggregates already computed, read directly
> **Selection:** whole population of both corpora, not a sample

## Result

| | corpus1 (n=102) | corpus2 (n=1,700) |
|---|---:|---:|
| solved | 98 (96.1%) | 975 (57.4%) |
| `main-ladder` + `early-repair-search` share of solves | 95/98 (97.0%) | 769/975 (78.9%) |
| late-ladder retry-tier share of solves | 3/98 (3.1%) | 206/975 (21.1%) |

Corpus1's only late-ladder wins: `admissible-order-alternate-tiebreak-retry` (1), `coarse-state-near-tie-retention-disabled-retry` (1), `admissible-order-fallback` (1, counted here as "late" relative to main-ladder though it is an earlier-ranked fallback tier than the true dead-last retries).

## Interpretation

This is a genuine, measurable difference in what kind of population each corpus represents: corpus1 is overwhelmingly solvable by cheap early stages, while corpus2 relies materially more on the expensive late-ladder machinery this session's admissible-order/DFS-monopolization/repricing research has focused on. Any research conclusion drawn primarily from corpus2 (which is most of this session's evidence, including the marginal-value-tail-audit's own 40-level population, itself a corpus2 subset) should not be assumed to transfer to corpus1's much easier population without checking — and conversely, corpus1 is a poor population to test any late-ladder-stage hypothesis on, since it offers almost no cases (see the low-multiplicity thinness already noted in the companion multiplicity-vs-production-success report).

## What this does not establish

- Does not identify *why* corpus1 is structurally easier (level generation parameters, size distribution, etc. are not examined here).
- Single production run.
