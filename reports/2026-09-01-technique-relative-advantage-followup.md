# Technique relative-advantage follow-up

> **Status:** development evidence; compact offline follow-up to the 2026-09-01 technique-capability synthesis.
> **Question:** do coarse legal static descriptors distinguish levels where one closely related solver action succeeds and its sibling fails?
> **Source:** `reports/stress/technique-niches/2026-09-01/level-capability.json` (schema v2).
> **Decision:** some beam configuration inversions show substantial structural separation worth deeper testing; direction flips mostly do not. This strengthens the case for selective relative-advantage analysis before a static selector experiment and for geometry/topology diagnostics on orientation-sensitive failures.

## Method

Eight prespecified close-action pairs from the existing synthesis were compared using four mutually exclusive outcome cells: left-only, right-only, both, neither. For the left-only and right-only populations, the analyzer reports standardized mean differences over the existing legal numeric level descriptors.

This is outcome-selected development evidence. The comparisons are not confirmation, do not control every correlated feature, and do not establish causality. They are useful for deciding which hypotheses deserve a stronger held-out or mechanistic follow-up.

Machine-readable output: `reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json`.

## Results

### Wide objective beam: plain vs diverse

`beam:objectiveFirst@beam5000` has 48 plain-only wins; the diverse sibling has 128 diverse-only wins; 584 levels are solved by both.

The largest separation is portal count: plain-only mean **1.06** versus diverse-only **3.55**, standardized difference **-1.06**. Diverse-only wins also have lower required intersections (4.87 vs 6.71), lower turn-constraint load, and slightly lower required-path coverage.

This is the strongest current static relative-advantage nomination in the tested pairs. It suggests that the diverse-retention form may have a real portal-heavy niche rather than merely being a uniformly stronger sibling. It is not yet a routing rule: portal count may proxy for geometry or other correlated difficulty.

### Wide intersection-harvest beam: plain vs diverse

`beam:intersectionHarvest@beam5000` has 40 plain-only wins; the diverse sibling has 135 diverse-only wins; 578 are solved by both.

The strongest differences are required intersections (6.58 plain-only vs 5.00 diverse-only; standardized difference **0.66**) and portals (1.65 vs 3.07; **-0.54**). Diverse-only wins are also somewhat more constrained by density.

This independently points in the same direction as the objective-beam comparison: diverse retention appears disproportionately useful on more portal-heavy levels, while the plain form retains some higher-intersection-only capability. That repeated cross-score-profile pattern is more interesting than either inversion table alone.

### Objective beam width 2K vs 5K

The 2K objective beam has 33 2K-only wins; 5K has 163 5K-only wins; 469 are shared.

The largest current coarse differences are scale: 2K-only levels have larger navigable area (**150.6 vs 127.2**, standardized difference **0.66**) and larger total area. The 5K-only group is more constrained by density and coverage.

This is a useful warning against interpreting width as monotonic strength. The inversion is real, and the smaller beam's exclusive wins are not simply the smallest/easiest levels. A plausible mechanism remains survivor-selection/search-order differences rather than raw capacity alone.

### Intersection beam width 2K vs 5K

The 2K intersection beam has 37 2K-only wins; 5K has 147 5K-only wins; 471 are shared.

The coarse separation is weaker than for objective beam width. The 5K-only group has somewhat higher constrained density, coverage, flipper count, and total constraints. No single descriptor strongly explains the reverse 2K-only cohort.

This pair remains a candidate for bounded trace diagnosis if width behavior becomes decision-relevant.

### DFS harvestThenFinish vs portalFirstTransfer

Despite a very high historical outcome overlap, the disagreement population is structurally separated: 12 harvest-only versus 15 portalFirst-only.

PortalFirst-only levels are longer (**106.4 vs 84.8**) and require more intersections (**6.73 vs 4.08**), while harvest-only levels have more constrained objects, higher constrained density, and more flippers.

The important interpretation is not that the names describe bespoke algorithms. The operational taxonomy already warns that these are mostly scoring profiles. The result shows that even highly substitutable score profiles can retain small, structured edge populations.

### IDA default vs mustCrossFirst

Only 16 default-only and 13 mustCrossFirst-only levels separate these highly overlapping profiles.

The largest coarse difference is must-turn count (1.13 vs 3.00; standardized difference **-0.64**), with smaller differences in MustCross count and required intersections.

The populations are small and mined. This is a nomination only, not enough evidence for static IDA routing.

### CW vs CCW perimeter beam

The direction pair has a large disagreement population: 115 CW-only and 113 CCW-only, with 389 shared.

Yet the largest standardized difference among the current coarse descriptors is only about **0.22**. Width/height/area/path length shift slightly, but nothing remotely explains the near-symmetric direction split.

This is strong evidence about the *limits of the current feature set*: orientation sensitivity is real but is largely invisible to counts/densities. If direction-specific capability matters, the next useful variables are spatial placement, symmetry/asymmetry, Gate/Goal relation, obstacle/obligation geometry, or selected operational traces, not more count-only modeling.

### CW vs CCW perimeter DFS

The DFS direction pair similarly has 47 CW-only and 50 CCW-only wins, with 353 shared.

Current coarse descriptors again separate the sides weakly (largest absolute standardized difference about **0.34**). MustCross, portals, flippers, and constrained density move modestly.

This reinforces the beam-direction result: geometry/topology is the obvious missing explanatory class.

## Cross-pair conclusions

Three useful distinctions emerge.

1. **Some relative advantage appears statically legible.** The repeated portal-heavy advantage of diverse 5K beams across both objective and intersection-harvest scoring profiles is a concrete candidate for stronger controlled analysis.
2. **Some apparent "stronger setting" relationships are not monotonic.** The 2K/5K inversions persist, and 2K-only objective-beam wins skew larger rather than trivially easier.
3. **Orientation sensitivity is not explained by current coarse features.** Large CW/CCW disagreement populations coexist with tiny descriptor differences. This is a strong value-of-information argument for a small geometry/topology feature bundle or selected traces.

## Queue implications

This does not change execution priority.

For **Workstream 2**, retain the current exact-head canonical-work join as the immediate gate. Relative-advantage populations become additional rare/specialist cohorts to protect during repricing.

For **Workstream 1**, do not jump directly from this mined result to a portal rule. The diverse-beam portal pattern deserves held-out or grouped testing after the work model is coherent. More generally, route on evidence of relative advantage, not generic difficulty.

For **Workstream 4**, the result does not reopen the closed quota/bucketing form. Direction and width inversions are evidence of survivor/search-order sensitivity, but not evidence for the previously tested retention intervention.

For deeper analysis, the highest-value static extension is now clearer: prioritize spatial/geometry descriptors that can explain CW/CCW and other orientation-sensitive inversions, while testing whether portal placement explains the repeated diverse-beam signal better than portal count alone.

## Reproduction

```bash
npm run test:analyze-technique-relative-advantage
node scripts/analyze-technique-relative-advantage.mjs
```

No production solver behavior changed.
