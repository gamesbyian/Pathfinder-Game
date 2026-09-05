# Within a single level's hint pool, the cheapest and most expensive recorded solutions can differ by orders of magnitude

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `search.cumulativeNodesExpanded` max/min ratio within each level's hint pool, sampled 400 files from `data/stress/hints-random/`, no new dispatch
> **Decision:** among 231 sampled levels with at least 2 costed hints, the median within-level max/min cost ratio is 186.7x, but the distribution is heavily right-skewed — the mean is 353,467x, driven by extreme outliers (max observed 18,778,075x for one level). Even the median alone (186.7x) shows real, substantial cost heterogeneity within a single level's stored alternative solutions.
> **Remaining gate:** none — descriptive characterization using already-collected data; the extreme mean is flagged explicitly as outlier-driven rather than a representative "typical" value.
> **Evidence role:** discovery — a within-level cost-heterogeneity characterization not previously computed this session
> **Selection:** 400 of 1,700 corpus2 files (a computational-speed sample, not the full population) — see limitations

## Method

For a sample of 400 hint files, computed `max(cumulativeNodesExpanded) / min(cumulativeNodesExpanded)` across each level's own stored hints (restricted to levels with ≥2 hints carrying a valid cost figure).

## Result

| | value |
|---|---:|
| levels analyzed (≥2 costed hints) | 231 |
| median max/min cost ratio | 186.7x |
| mean max/min cost ratio | 353,467x (outlier-driven) |
| max observed ratio | 18,778,075x |

## Interpretation

Even setting aside the extreme outliers, a median 186.7x spread between a level's cheapest and priciest recorded solution is a large heterogeneity — consistent with the hint pool mixing genuinely different search paradigms (a fast beam solve vs. an expensive `cpsat-full-probe` exhaustive search, or a lucky low-node repair attempt vs. a very deep one) for the same level. This reinforces a caution already implicit elsewhere this session: "a level has N stored hints" says little about how *comparable* those hints are in cost or technique, and any future work using hint-pool size as a simple richness/robustness proxy should be aware the underlying costs are far from uniform.

## What this does not establish

- Sampled 400/1,700 files for computational speed, not the full population — the median figure is likely representative but was not confirmed against the full corpus.
- Does not decompose the ratio by which specific technique pair drives the extreme outliers (plausibly `cpsat-full-probe` vs. a cheap heuristic, but not confirmed).
- Correlational; does not test whether high within-level cost spread predicts anything else (difficulty, multiplicity, etc.).
