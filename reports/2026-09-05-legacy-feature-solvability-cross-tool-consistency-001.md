# A month-old, differently-built solvability analysis agrees directionally with the current structural risk ranking on every overlapping feature — but doesn't measure the single strongest one

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — compared `reports/stress/corpus2-feature-solvability-2026-08-06.json`'s Cohen's-d separation ranking (a different tool, different baseline solver run, generated a month before the current census) against the current `productionSolved`-based standardized-difference ranking, no new dispatch
> **Decision:** `corpus2-feature-solvability-2026-08-06.json` (684 solved/1,016 unsolved against `logs/stress-corpus2-baseline.json`, a legacy baseline) ranks its own feature set by Cohen's d: `turnLoad` (0.732), `mustTurn` (0.595), `portalPairs` (0.584), `navDensity` (0.506), `blocks` (0.408), `surround` (0.400), `reqLen` (0.315) lead. Every one of these has a same-direction, broadly comparable-magnitude analog in the current census's structural risk ranking (`turnConstraintLoad`, `mustTurn`, `portals`, `nonNavigableDensity`, `blocks`, `surround`, `requiredPathLength`) — a genuine cross-tool, cross-time (nearly a month apart), cross-baseline agreement on which features separate solved from unsolved. The one gap: this older tool never computed `constrainedObjects`/`constrainedObjectDensity` at all, so the single strongest predictor in the current ranking cannot be cross-checked against this older evidence — this is an absence, not a contradiction.
> **Remaining gate:** none — a cross-tool consistency check using two already-collected artifacts.
> **Evidence role:** discovery/forensic — a previously-unused legacy artifact (`corpus2-feature-solvability-2026-08-06.json`) cross-checked against this session's independently-built ranking
> **Selection:** whole legacy-analysis population (1,700 levels), not a sample; feature comparison limited to the overlapping subset (see caveats)

## Method

`reports/stress/corpus2-feature-solvability-2026-08-06.json` (and its earlier `-2026-07-29.json` sibling) is a legacy solvability-separation analysis never referenced in any report this session, built by a different tool against a different baseline (`logs/stress-corpus2-baseline.json`, an older solver run/budget model — see `docs/solver-research-data-assets.json`'s `raw-logs-and-baselines` caveats: not decision-bearing evidence without reconciliation to current code). Matched its `separation` array's named features to the closest analog in the current census's `features` schema by name/semantics, and compared rank order and direction (not exact magnitude, since the two analyses use different populations, baselines, and possibly different feature definitions).

## Result

| legacy feature (2026-08-06, Cohen's d) | current analog (2026-09-03, standardized diff) |
|---|---|
| `turnLoad` (0.732) | `turnConstraintLoad` (0.578–0.724 across splits) — both lead or near-lead |
| `mustTurn` (0.595) | `mustTurn` (0.501–0.632) — consistent mid-table |
| `portalPairs` (0.584) | `portals` (0.666–1.462) — consistent, current ranking shows it even stronger |
| `navDensity` (0.506) | `nonNavigableDensity` (0.233–0.248) — same direction, weaker in current |
| `blocks` (0.408) | `blocks` (0.266–0.565) — consistent |
| `surround` (0.400) | `surround` (0.079–0.688) — consistent, wide range |
| `reqLen` (0.315) | `requiredPathLength` (0.360–0.849) — same direction, stronger in current |
| — (not measured) | `constrainedObjects` (0.436–2.096, current #1 predictor) |

## Interpretation

No feature reverses direction or drops out of relevance between the two analyses — every legacy feature that had a meaningful separation a month ago still shows meaningful (often stronger) separation now, across a completely different generation pipeline and baseline solver. This is useful corroborating evidence that the structural risk block identified this session (`2026-09-04-production-structural-risk-factors-full-replication-001.md`, holdout-validated in `2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md`) is not an artifact specific to the current census tool, budget model, or solver version — the qualitative pattern (turn-constraint load, portal usage, path length, and block count all separating solved from unsolved, in that rough order of importance) predates this session's work by weeks and under different measurement machinery.

The absence of `constrainedObjects`/`constrainedObjectDensity` from the legacy tool's feature set is a genuine limitation rather than a contradiction — it simply means the single strongest predictor in the current ranking has no independent cross-time confirmation available from this particular artifact. A future feature-solvability-analysis run (if `scripts/stress/feature-solvability-analysis.mjs` is later extended to compute `constrainedObjects`) would close this gap.

## What this does not establish

- Does not establish that the current census and the 2026-08-06 legacy baseline measure "solved" identically — different solver version/budget model per `raw-logs-and-baselines`' documented caveats, so this is a directional/qualitative cross-check, not a quantitative confirmation.
- Does not cross-check `constrainedObjects`/`constrainedObjectDensity` at all (not present in the legacy tool's output) — the single strongest current predictor remains unconfirmed against this specific older evidence.
- Does not examine the even-older `-2026-07-29.json` sibling snapshot for a three-point-in-time comparison.
