# Cross-level residual-interface signature inspection

> **Status:** bounded offline inspection; no online operator  
> **Emitter commit:** `7330f3ca411a9dce14b2c9c81965ee7800d51a27`  
> **Artifact:** `reports/stress/residual-interface-signature-census-2026-08-11.json`

## Reproduction and validation design

The clean-commit run used the first 20 solution-rich levels in `data/stress/stress-levels-random.json`, up to 20 canonical-valid solutions per level, and span ≤12. It exactly reproduced 20 levels / 288 solutions, **31,351 exact occurrences, 845 unique signatures, 459 multi-solution, 201 cross-structural-family, and 14 cross-level**.

For a deliberately simple held-out check, signatures were defined from levels 1–10 in the already-fixed corpus order, then matched byte-for-byte against levels 11–20; held-out rows did not participate in definition. Ten of 14 cross-level signatures crossed that split. Translation invariance is intrinsic to the signature; direction/reflection is not normalized, so recurrence is not manufactured by a symmetry canonicalizer.

All supporting levels have distinct procedural `levelSeed` values. They share the `stress-corpus-random-generator`/random-uniform-v1 source, and provenance provides nearest-neighbor descriptors rather than parent-child generation links. Therefore the evidence supports **different generated instances**, not a claim of fully independent real-world provenance. None of the 14 has a named-obligation token in its local effect string; all trade a short segment for a rectangular four-step excursion while the matched full future state absorbs a one-intersection local delta. Global supporting levels contain mixtures of portals, must-pass/must-cross, must-turn, and flippers, but those mechanics are not what defines these local recurrences.

## Per-signature inspection

`effects` is `segment length:intersection delta:ordered obligations`. Shapes are translation-normalized directed coordinates. Every row has exact represented-state equality at the endpoint; “families” uses structural-solution-family-v1.

| id | levels | solutions | families | occurrences | normalized shapes | length Δ | intersection Δ | obligation effects/order | held-out | classification |
|---|---|---:|---:|---:|---|---:|---|---|:---:|---|
| X01 | R00050, R00080 | 5 | 3 | 17 | `0:0;-1:0;-1:1`<br>`0:0;0:1;1:1;1:0;0:0;-1:0;-1:1` | +4 | 0→1 | `2:0:`<br>`6:1:` | no | insufficient evidence |
| X02 | R00050, R00112 | 6 | 4 | 18 | `0:0;0:-1;0:-2`<br>`0:0;1:0;2:0;2:1;1:1;0:1;0:0;0:-1;0:-2` | +6 | 0→1 | `2:0:`<br>`8:1:` | yes | geometry coincidence |
| X03 | R00050, R00112 | 5 | 3 | 17 | `0:0;0:-1;0:-2;-1:-2`<br>`0:0;1:0;2:0;2:1;1:1;0:1;0:0;0:-1;0:-2;-1:-2` | +6 | 0→1 | `3:0:`<br>`9:1:` | yes | geometry coincidence |
| X04 | R00059, R00153 | 5 | 3 | 11 | `0:0;-1:0;-1:1`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-1:1` | +4 | 0→1 | `2:0:`<br>`6:1:` | yes | geometry coincidence |
| X05 | R00059, R00153 | 4 | 2 | 10 | `0:0;-1:0;-1:1;-2:1`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-1:1;-2:1` | +4 | 0→1 | `3:0:`<br>`7:1:` | yes | geometry coincidence |
| X06 | R00059, R00153 | 2 | 2 | 2 | `0:0;-1:0;-2:0;-2:1`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-2:0;-2:1` | +4 | 0→1 | `3:0:`<br>`7:1:` | yes | geometry coincidence |
| X07 | R00059, R00153 | 4 | 2 | 10 | `0:0;-1:0;-1:1;-2:1;-2:2`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-1:1;-2:1;-2:2` | +4 | 0→1 | `4:0:`<br>`8:1:` | yes | geometry coincidence |
| X08 | R00059, R00153 | 2 | 2 | 2 | `0:0;-1:0;-2:0;-2:1;-2:2`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-2:0;-2:1;-2:2` | +4 | 0→1 | `4:0:`<br>`8:1:` | yes | geometry coincidence |
| X09 | R00059, R00153 | 3 | 2 | 5 | `0:0;-1:0;-1:1;-2:1;-2:2;-3:2`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-1:1;-2:1;-2:2;-3:2` | +4 | 0→1 | `5:0:`<br>`9:1:` | yes | geometry coincidence |
| X10 | R00059, R00112, R00137, R00153 | 5 | 5 | 5 | `0:0;-1:0;-2:0`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-2:0` | +4 | 0→1 | `2:0:`<br>`6:1:` | yes | recurring independent motif (weak) |
| X11 | R00080, R00137 | 18 | 6 | 290 | `0:0;-1:0;-1:-1;0:-1;0:0;0:1;1:1`<br>`0:0;0:1;1:1` | -4 | 0→1 | `2:0:`<br>`6:1:` | yes | geometry coincidence |
| X12 | R00112, R00137 | 3 | 3 | 3 | `0:0;-1:0;-2:0;-2:-1`<br>`0:0;0:-1;1:-1;1:0;0:0;-1:0;-2:0;-2:-1` | +4 | 0→1 | `3:0:`<br>`7:1:` | no | insufficient evidence |
| X13 | R00137, R00143 | 3 | 2 | 5 | `0:0;0:1;1:1;1:2`<br>`0:0;1:0;1:-1;0:-1;0:0;0:1;1:1;1:2` | +4 | 0→1 | `3:0:`<br>`7:1:` | no | insufficient evidence |
| X14 | R00137, R00143 | 4 | 3 | 6 | `0:0;0:1;1:1`<br>`0:0;1:0;1:-1;0:-1;0:0;0:1;1:1` | +4 | 0→1 | `2:0:`<br>`6:1:` | no | insufficient evidence |

## What survives scrutiny

The 14 are not 14 distinct high-level mechanisms. They are coordinate/direction variants and endpoint extensions of the same elementary motif: substitute a direct/short segment with a four-edge rectangular loop that revisits its start and changes where an intersection is accrued, while arriving at an identical serialized future state at the compared full-path depth. X04–X09 form a particularly correlated ladder on the same R00059/R00153 level pair. X11's 290 occurrences are candidate-weighted multiplicity from only two levels and six structural families, not broad population support.

X10 is the only cautiously retained motif: it occurs once per solution across **four levels / five solutions / five structural families**, crosses the held-out split, and uses four distinct generation seeds/nearest-neighbor descriptors. Even X10 is a generic empty-obligation rectangle and may be a geometry inevitability rather than a useful repair primitive. The remaining held-out matches confirm recurrence but add no mechanic-specific predictive content; they are classified as geometry coincidences. Four signatures confined to one half are insufficient evidence.

No signature demonstrates that an online search can recognize a safe interface cheaply, find the alternate segment, or improve solve/work. Consequently none justifies residual-interface substitution. If X10 is revisited, the next evidence purchase is another corpus/provenance-held-out occurrence test with mechanic-conditioned success—not an operator.
