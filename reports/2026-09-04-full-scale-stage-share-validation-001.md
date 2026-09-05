# Full-scale (1,700-level) stage-share validation corrects several 40-level "0 solves" reads

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s already-computed `winningTechnique` aggregate over its 1,700-level population (975 solved), no new dispatch
> **Decision:** `2026-09-04-production-ladder-marginal-value-tail-audit-001.md`'s 40-level sample found **zero** conditional solves for seven of twelve production stages (`admissible-order-alternate-tiebreak-retry`, `repair-fallback`, `late-repair-multiseed-retry`, `connectivity-axis-prune-disabled-retry`, `guidance-goal-distance-retry`, `coarse-state-near-tie-retention-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`). At full 1,700-level scale, **every one of those seven stages has a nonzero, real win count** — the smaller sample's zero-solve reads were a sample-size artifact, not evidence of zero value, exactly as that report's own census-based caution anticipated but could not directly confirm.
> **Remaining gate:** none — this is a straightforward correction to a documented uncertainty, using an already-completed run.
> **Evidence role:** discovery — validates a caution the original report already flagged; not a new hypothesis
> **Selection:** whole population (1,700 levels, 975 solves), not a drawn sample

## Result

| stage | 40-level sample (conditional solves) | 1,700-level sample (real wins) | share of all 975 solves |
|---|---:|---:|---:|
| `main-search` (`main-ladder`) | 9 | 611 | 62.7% |
| `early-repair-search` | 5 | 158 | 16.2% |
| `admissible-order-fallback` | 3 | 47 | 4.8% |
| `admissible-order-alternate-tiebreak-retry` | **0** | **28** | 2.9% |
| `late-repair-multiseed-retry` | **0** | **36** | 3.7% |
| `coarse-state-near-tie-retention-disabled-retry` | **0** | **37** | 3.8% |
| `late-repair-search` | **0** | **21** | 2.2% |
| `goal-attraction-disabled-retry` | 1 | 10 | 1.0% |
| `connectivity-axis-prune-disabled-retry` | **0** | **6** | 0.6% |
| `guidance-goal-distance-retry` | **0** | **6** | 0.6% |
| `repair-fallback` | **0** | **6** | 0.6% |
| `must-cross-neighbor-prune-disabled-retry` | **0** | **9** | 0.9% |

(`main-search`/`main-ladder` and the corpus/population differ slightly in exact naming between the two reports' data sources but refer to the same production stage.)

## Interpretation

Every stage the 40-level population under-sampled to zero has a real, measurable hit rate at scale, ranging from 0.6% (`repair-fallback`, `connectivity-axis-prune-disabled-retry`, `guidance-goal-distance-retry`) to 3.8% (`coarse-state-near-tie-retention-disabled-retry`). None of these are large in absolute terms — this does not overturn the marginal-value-tail-audit's core finding that cost is heavily concentrated in the two admissible-order stages relative to their solve contribution — but it confirms the census-based "a 40-level sample showing zero hits is expected, not disqualifying" reasoning that report already used, with the actual production hit rates rather than an inference from a different evidence source (the frozen technique census). `repair-fallback` in particular — the second-largest cost center in the 40-level tail table (9.6% of work) — turns out to have a real if modest production contribution (0.6% of all solves), information the original report could not establish from its own population.

## What this does not establish

- Does not re-derive the marginal-value-tail-audit's cost-share table at this scale (this run does not carry per-attempt lifecycle telemetry, only stage-level `winningTechnique`) — cost concentration in the admissible-order stages specifically is not re-verified here, only solve counts.
- Single production run; see the companion redundancy-check reports for what these specific wins mean relative to the isolated census.
