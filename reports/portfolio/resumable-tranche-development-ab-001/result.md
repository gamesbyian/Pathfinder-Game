# Resumable-tranche development A/B: result

Population: 120 fresh Corpus-2 levels (seed `resumable-tranche-development-ab-2026-09-11`, disjoint from all prior static-portfolio populations).
Both arms: portfolio-18-tranche-v2 menu, portfolio-18-specialists-tranche-cap-map-v2.json, workBudget=67,000,000.

## Headline result

| | control | treatment |
|---|---:|---:|
| solved | 52/120 | 52/120 |
| aggregate workSpent | 4,560,762,994 | 4,563,768,944 |

**Gains (treatment-exclusive):** 0 — none
**Losses (control-exclusive):** 0 — none
**Both solved:** 52

## Residual-pass participation

- Eligible continuations (capped, not naturally exhausted, beam attempts) across the population: 120
- Residual dispatches actually run: 64
- Naturally-exhausted beam attempts (never eligible): 645
- Levels first solved during the residual pass: 0 — none
- Aggregate residual incremental work: 1,007,215
- Aggregate first-pass bounded-overshoot work (real, honestly counted against the 67M envelope): 2,979,941 (0.065% of control's aggregate work)

## Censoring/integrity

- Errors: 0 
- Deadline truncation: 0 

## Decision (per the preflight's own frozen rule)

**NULL.** Zero credible losses, but treatment-exclusive gains (0) fall short of the >= 2 threshold despite real continuation participation (120 eligible, 64 dispatched). Close this simple salvage form -- do not respond by changing tranche sizes, switching beam policies, or growing the portfolio menu.
