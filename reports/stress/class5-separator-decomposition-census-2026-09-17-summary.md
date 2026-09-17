# Separator/decomposition census — summary

Population: current Class-5 residual, 390 levels (production run 35066677597).
Construction cost: 12179ms total (31.23ms/level avg).

## Family 1 — static (exhaustive width-1 articulation census)
Levels with >=1 non-trivial (both sides >=2 cells) articulation cut: 252/390 (64.6%).

## Bounded width-k probes (gate -> goal / must-pass / must-cross, capped)
Total interfaces measured: 4862.
Zero-width (no static route at all — mechanic/portal-dependent): 3.
Directly-adjacent (uncuttable by any finite vertex set): 110.
Width histogram (finite, >0): {"1":330,"2":1726,"3":2029,"4":664}

## Family 2 — mechanic-aware
Interfaces whose min-cut set includes a mechanic cell (mustCross/mustPass/portal/filter/flippingFilter/gate/goal): 1677/4862 (34.5%).

## Family 4 — portal-mediated
Interfaces where portal edges materially change reachability or narrow the cut: 3/4862 (0.1%).

## Family 3 — path-history-conditioned
DEFERRED — requires the fresh exact LIVE/DEAD sibling harvest's frozen legal prefixes; not computed by this pass.
