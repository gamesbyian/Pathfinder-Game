# Corpus1's hint pool is over 3x richer per level than corpus2's, extending its already-established ease to solution multiplicity

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — mean hint count per level, `data/stress/hints/` (corpus1, 102 files) vs. `data/stress/hints-random/` (corpus2, 1,700 files), no new dispatch
> **Decision:** corpus1 averages 331.4 hints per level; corpus2 averages 101.5 — corpus1's hint pool is roughly 3.3x richer per level despite corpus1 being the much smaller corpus.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — extends the corpus1-vs-corpus2 ease finding to a solution-multiplicity dimension not previously checked
> **Selection:** whole population of both corpora (102 + 1,700 levels), not a sample

## Method

Summed and averaged `hints.length` across every file in each corpus's hint directory.

## Result

| | n levels | total hints | mean hints/level |
|---|---:|---:|---:|
| corpus1 (`data/stress/hints/`) | 102 | 33,805 | 331.4 |
| corpus2 (`data/stress/hints-random/`) | 1,700 | 172,604 | 101.5 |

## Interpretation

This is another independent axis on which corpus1 is a structurally easier, more redundant population than corpus2 — joining the already-established stage-share concentration (96.1% solved via just two ladder stages), config-level concentration (fewer distinct winning techniques, higher top-3 share), and routing-regime composition (less of the hardest regime) findings from this session. A level with a richer historical hint pool has, definitionally, had more alternative solutions discovered across all the runs that have ever touched it — consistent with corpus1 levels being easier to find solutions for by a wide margin, not just more likely to be solved by any one technique.

## What this does not establish

- Does not decompose the richness gap by hint source (production/replay/exact-probe) — a full breakdown could reveal whether this is driven by more runs having been performed on corpus1, or by corpus1 levels being intrinsically easier to find many distinct solutions for even under equal attention.
- Correlational; consistent with, but does not independently prove, corpus1's overall ease.
- Single hint-stash snapshot.
