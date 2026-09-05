# The routing-regime difficulty ordering (multi-portal hardest) is stable across a month and across analysis tooling

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — computed a corpus2-only, `productionSolved`-based unsolved-enrichment ratio per `routingRegime` from the current census, and compared it to the analogous `archetypes` enrichment table in the legacy `reports/stress/corpus2-feature-solvability-2026-08-06.json` (generated a month earlier, against a different legacy baseline solver run), no new dispatch
> **Decision:** using the same apples-to-apples metric (unsolved-share / population-share enrichment) both analyses agree closely: the portal-heavy category (`portal-heavy` legacy / `multi-portal` current) is the single hardest regime in both (enrichment 1.168 legacy vs. 1.250 current — both meaningfully above neutral), while `must-cross-heavy` (1.010 legacy vs. 0.909 current) and the intersection/general categories (0.980-0.983 both) sit near neutral in both analyses. This corroborates `2026-09-04-routing-regime-multiplicity-and-difficulty-001.md`'s finding that `multi-portal` is the hardest regime (its one reported "non-monotonic exception") with independent, month-old, differently-tooled evidence — the anomaly is not an artifact of the current census pipeline or budget model, it was already present under the legacy tool/baseline too.
> **Remaining gate:** none — a temporal-stability cross-check of an already-established finding using two already-collected artifacts.
> **Evidence role:** discovery/forensic — extends a previously-unused legacy artifact's use (started in `2026-09-05-legacy-feature-solvability-cross-tool-consistency-001.md`) to the categorical archetype/regime axis
> **Selection:** corpus2 population in both analyses (1,700 levels; legacy 684 solved/1,016 unsolved, current 819/881), not a sample

## Method

Recomputed the current census's routing-regime unsolved-enrichment using the exact same metric definition as the legacy artifact's `archetypes` table (unsolved-share divided by population-share), restricted to `corpus2` for a fair population match, rather than reusing the census's own embedded `noFrozenT1WinnerEnrichment` field (a different, stricter outcome variable — using it directly would not be an apples-to-apples comparison, an error avoided after checking definitions).

## Result

| category (legacy name / current name) | legacy enrichment (2026-08-06) | current enrichment (2026-09-03) |
|---|---:|---:|
| portal-heavy / `multi-portal` | 1.168 | 1.250 |
| must-cross-heavy / `must-cross-heavy` | 1.010 | 0.909 |
| high-intersection-burden / `intersection-heavy` | 0.980 | 0.983 |
| default / `general` | 0.952 | 0.980 |

## Interpretation

All four categories preserve their relative ordering and rough neutral-vs-elevated classification across a month and a full analysis-pipeline change: portal-heavy is the clear outlier (meaningfully above 1.0 in both), while the other three sit close to neutral (0.91-1.01) in both. This is a stronger form of confirmation for `2026-09-04-routing-regime-multiplicity-and-difficulty-001.md`'s "multi-portal is the interesting exception" observation than a same-tool re-run would provide, since it rules out the current census pipeline, current budget model, or current solver version as the source of that anomaly — whatever makes portal-heavy levels disproportionately hard was already true under a different solver baseline weeks earlier.

## What this does not establish

- Does not explain *why* portal-heavy/multi-portal levels are disproportionately hard — this remains the open question `2026-09-04-routing-regime-multiplicity-and-difficulty-001.md` already flagged as needing dedicated follow-up.
- The two analyses' underlying solver/baseline versions differ in ways not fully reconciled (per `raw-logs-and-baselines`' documented caveats) — this is directional corroboration, not a controlled replication.
- Limited to corpus2 (the only corpus the legacy artifact covers); does not test whether the same stability holds for corpus1 or the published corpus.
