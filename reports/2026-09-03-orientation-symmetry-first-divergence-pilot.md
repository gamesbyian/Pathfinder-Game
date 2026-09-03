# Orientation/symmetry first-divergence pilot

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — six mapped parent/transform traces across three unrelated families with 124×–722× historical within-family node-cost cliffs.
> **Decision:** mapped legal moves, mechanics, lower bounds, prune verdicts, neutral metrics, and scores remained equivariant in every trace. Rank differences arose only after equal mapped scores reached deterministic tie/enumeration order, but their direction did not distinguish expensive from cheap transforms. No recurring harmful mechanism earned correction.
> **Remaining gate:** none for this tested known-solution-path/default-score form. Treat orientation diversity as a finite-budget complement unless current matched-search traces identify a materially new non-equivariant mechanism.
> **Evidence role:** local mechanistic development diagnosis over historical family outcomes.

## Prespecification and sample

The smallest existing tool capable of mapping states through a recorded transform was
`scripts/stress/family-pair-divergence.mjs`. The pilot selected three unrelated symmetry parents with
large historical within-family node-cost ratios, then traced each family's cheapest and most
expensive successful transform against the mapped parent path:

| parent | historical max/min nodes | expensive transform | cheap transform |
|---|---:|---|---|
| `P00146` | 124× | `F00146-sym-01` | `F00146-sym-05` |
| `R00541` | 188× | `F00541-sym-05` | `F00541-sym-02` |
| `R03341` | 722× | `F03341-sym-03` | `F03341-sym-05` |

Success required the same first semantic non-equivariance (legal successors, prune, lower bound, or
score) to recur in multiple parents and point toward the expensive transform. The stop rule was
equivariant semantics, heterogeneous causes, or rank differences balanced across cheap/expensive
transforms. These old node outcomes select the diagnostic cases but are not current `workSpent`
allocation evidence.

## Result

All six traces had **zero semantic-equivariance mismatches**. Their first rank differences occurred
at steps 61/91 (`P00146`), 49/26 (`R00541`), and 1/36 (`R03341`). At every such point the mapped
candidate count agreed and the semantic snapshot—including total score by mapped candidate—agreed.
The remaining rank difference is therefore deterministic ordering among equivalent-score
successors, not a coordinate-dependent score, prune, lower-bound, portal, Goal, or Gate calculation.

Tie-order direction did not track the cost cliff. `P00146`'s expensive and cheap transforms favored
opposite sides; both `R00541` traces favored the transform by one rank; both `R03341` traces did too,
despite one being cheapest and one most expensive. Goal-attraction ablation differential was likewise
heterogeneous (`-12` to `+1`) rather than recurrent.

The tested form meets the stop rule. A deterministic tie-order difference is real orientation
diversity, but this sample does not support calling it a canonicalization bug or changing successor
order. Broad rotate/mirror retries remain unjustified. A materially new reopening premise would need
current matched-search traces showing the same tie choice causes an actual retained-frontier or
solve/work cliff, rather than known-solution ranking differences alone.

## Reproduction shape

For each row, run the following with its manifest, variant-level file, historical family result, and
variant id (both named transforms per parent):

```bash
node scripts/run-bundled.mjs scripts/stress/family-pair-divergence.mjs -- \
  --parent-levels=<manifest.parentCorpus> --variant-levels=data/families/family-<parent>-symmetry.json \
  --manifest=data/families/family-<parent>-symmetry-manifest.json --variant-id=<variant> \
  --result=reports/families/2026-07-15-<parent>-symmetry-family-solve.json --out=<output.json>
```
