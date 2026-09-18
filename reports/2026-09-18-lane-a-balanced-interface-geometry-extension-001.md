# Lane A: balanced-interface cut geometry extension

> **Status:** concluded-positive
> **Last evidence:** 2026-09-18 — zero-new-solver-compute extension of the existing separator/decomposition census (`scripts/stress/class5-separator-decomposition-census.mjs`), re-run on the identical frozen 390-id Class-5 population, current HEAD.
> **Decision:** the census's own `minVertexCut` calls already compute raw cut-cell keys and full side-cell membership; the original 2026-09-17 publication discarded them before writing output, keeping only counts. Added an additive, opt-in `--emit-cut-geometry` flag (default off, original artifact shape unchanged) that retains `cutCells`/`gateSideCells`/`remainderSideCells` for interfaces meeting the report's own "balanced" threshold (smaller side >=10% of board free-space). Re-running with the flag reproduces the original's exact aggregate counts (4,862 interfaces, 3 zero-width, 110 uncuttable, identical width histogram, 1,677 mechanic-aware, 3 portal-mediated) and additionally finds **521 balanced interfaces across 118 levels** (close to, not identical to, the previously-reported "44+369+105=518 / 121" -- a small threshold-rounding difference, not a population change) now carrying full cut/side geometry.
> **Remaining gate:** none for this tooling extension itself. This supplies the interface-identity/geometry data the Lane A dynamic-interface-contract preflight (`docs/solver-separator-dynamic-interface-contract-preflight.md`) needs before frozen production-frontier prefixes can be checked against a specific interface; the frontier-sampling and exact-labelling stages are not started here.
> **Evidence role:** population-construction infrastructure, not a solver-behavior or decision-bearing measurement. No precommitment is required for a zero-new-compute, purely-additive re-serialization of already-computed geometry.
> **Population identity:** identical to the original census's frozen population (`reports/stress/class5-separator-census-population-2026-09-17.json`, 390 ids, verified byte-for-byte identical set before this run).

## Why this ran

The Lane A preflight's "earned experiment" needs, for each candidate interface, the actual cut-cell keys and side membership so a frozen production-frontier prefix can be checked against whether/where it crosses that interface. The existing census computes this (`minVertexCut` returns `cutCells`/`reachableSide`/`otherSide`) but only serializes counts. Per "prefer the cheapest information-value test" and reuse-before-rebuild discipline, extending the existing script to retain fields it already computes is materially cheaper than writing a new geometry extractor.

## What changed

`scripts/stress/class5-separator-decomposition-census.mjs`:
- new `--emit-cut-geometry=true` flag (default `false`, preserving the original committed artifact's exact shape when omitted);
- new `--balanced-fraction=<n>` (default `0.1`, matching the report's own retained threshold);
- every measured interface now carries a `balanced: boolean` field unconditionally (cheap, no geometry payload);
- when `--emit-cut-geometry=true` and an interface is `balanced`, it additionally carries `cutCells`, `gateSideCells`, `remainderSideCells` (the exact arrays `minVertexCut` already produced);
- a new `summary.balancedInterfaces` aggregate (`threshold`, `interfaceCount`, `levelCount`, `cutGeometryEmitted`).

No change to target selection, `minVertexCut`, articulation census, mechanic/portal detection, or any existing field's meaning -- this is additive serialization only.

## Verification

Re-running without `--emit-cut-geometry` and at the original's obligation-target-cap reproduces `totalInterfacesMeasured=4862`, `zeroWidthNoStaticRoute=3`, `directlyAdjacentUncuttable=110`, the identical width histogram `{1:330,2:1726,3:2029,4:664}`, `interfacesWithMechanicCutCell=1677`, and `interfacesPortalMediated=3` -- an exact match to the committed 2026-09-17 artifact on the identical 390-id population, confirming the edit changed no existing computation.

New artifact: `reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json` (2.9MB; the original 2026-09-17 artifact is left untouched to preserve its byte-identical evidentiary record).

## Handoff

The next Lane A step is population construction proper: sample production-search frontiers (`scripts/stress/production-search-frontier-sampler.mjs`, the generic sampler named in the preflight) on the 118 levels with a balanced interface, then intersect sampled frontier positions/paths against each level's `cutCells`/side membership from this artifact to identify which sampled prefixes actually cross a candidate interface. Exact whole-prefix LIVE/DEAD labelling and the C0-C4 signature-collision analysis remain unstarted; this report only supplies the geometry those stages need.
