# A modest but real fraction of stored hints were themselves found using existing hints as a guide

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `provenance[0].context.hintGuided`/`usedExistingHints` flags across all 172,604 hints in `data/stress/hints-random/`, no new dispatch
> **Decision:** 11,402/172,604 (6.6%) of stored hints were found with `hintGuided===true`, and 21,457/172,604 (12.4%) with `usedExistingHints===true`. Most of the hint stash (87.6%+) was discovered without leaning on prior hints for that level.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a hint-corpus provenance/methodology characterization not previously computed this session
> **Selection:** whole hint population (172,604 hints), not a sample

## Method

Counted hints where `provenance[0].context.hintGuided` or `.usedExistingHints` is `true`, across the full corpus2 hint stash.

## Result

| flag | count | share |
|---|---:|---:|
| `hintGuided` | 11,402 | 6.6% |
| `usedExistingHints` | 21,457 | 12.4% |

## Interpretation

This confirms the hint corpus is predominantly built from independent solves rather than a bootstrapping loop where each new hint leans heavily on prior ones for the same level — a healthy property for using hint-pool size as evidence of genuinely independent solvability, distinct from the `variant-parent-replay` finding (`2026-09-05-variant-parent-replay-dominance-001.md`), which showed a much larger share (79.7%) of hints originate from a *different* level (a variant sibling) replayed onto the parent. Together the two findings characterize the hint stash's two distinct bootstrapping mechanisms: cross-level replay is common (79.7%), while within-level hint-guidance is comparatively rare (6.6-12.4%).

## What this does not establish

- Does not test whether `hintGuided`/`usedExistingHints` hints are less informative or lower-quality than independently-found ones.
- Does not decompose these rates by technique family or corpus.
- Single hint-stash snapshot, corpus2 only.
