# Technique census analysis

> **Status:** rebuildable existing-census instrument; not production policy or a priority list.
> **Current scheduler use:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns current execution priority; [`solver-scheduling-policy.md`](solver-scheduling-policy.md) owns allocation policy.
> **Operational interpretation:** [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
> **Current budget interpretation:** [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md), pending regeneration against the refreshed census.

The current committed census is `reports/stress/technique-census/33717910218/` (2026-09-03 refresh, 78,505 unique cells). The older `32240161854` census remains historical development evidence, but current capability-dependent claims should use the refreshed run and `reports/stress/technique-niches/2026-09-03/level-capability.json`. See [`../reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md`](../reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md) for the direct rejoin and remaining derived-analysis parity work.

Regenerate the second-order outputs against the current census with:

```bash
node scripts/analyze-technique-census.mjs reports/stress/technique-census/33717910218
```

After those generated outputs are committed, verify freshness with the same command plus `--check`.

Start at [`tooling-catalog.md`](tooling-catalog.md) for current invocation options and related probes.

## What the analyzer answers

It derives, from already-recorded technique × level cells:

- outcome similarity/substitutability and phenotype/multiplicity summaries;
- cover/oracle-frontier views and rare/exclusive capability;
- conditional success/cost nominations;
- budget-cap retention and censored tranche economics;
- parameter inversions where a nominally stronger configuration loses to a weaker one;
- current-production joins when comparable production artifacts are supplied.

Outcome overlap is not operational similarity. Different names can share one engine, while a small ordering/retention change can produce different outcomes. Use bounded operational traces for that question.

## Scheduler-facing `techniqueBudgetCurves`

`second-order-analysis.json.techniqueBudgetCurves` is the rebuildable cap/tranche interface. It has shared checkpoints through the census ceiling and separate production-solved / production-unsolved populations.

Each technique records evaluation/population coverage, full observed solve/spend/termination totals, deepest observed attempt/solve, and:

- `caps`: retained/lost solves, retained fraction, simulated capped spend, observed spend/savings, savings per lost solve, and equal-cap exclusives where full sampling permits them;
- `tranches`: lower/upper cap, risk set, tranche solves/hazard, incremental simulated capped spend, and incremental nodes per solve.

Censoring rules matter:

- naturally exhausted attempts leave the risk set at exhaustion;
- budget-limited attempts are censored at observed depth;
- rows are never projected beyond observation or the census ceiling;
- equal-cap exclusivity uses only fully sampled comparators; partial cells yield `null`, not imaginary losses.

Cap costs are isolated `nodesExpanded` diagnostics. They compare depth **within** one technique. Cross-technique production allocation requires current lifecycle reach plus canonical `workSpent`.

`--check` validates checkpoint ordering, cap/tranche cardinality, monotone retained solves, non-growing risk sets, exact spend reconciliation, exclusivity eligibility, and byte-for-byte freshness.

## Current decision boundary

The expensive matrix is fresh; the current gap is **derived materialization/join/valuation**, not another census:

1. regenerate second-order cap/tranche/substitutability outputs from `33717910218`;
2. join current production reach/work evidence where comparable;
3. value incremental solves/work, rare exclusives, portfolio cardinality, and fixed-work oracle headroom;
4. keep production scheduler experiments tied to current rare-capability evidence rather than the superseded August snapshot.

Sequence-dependent actions require controlled current-code execution before causal scheduler use; isolated census curves do not erase predecessor-state effects.

## Interpretation rules

- The census is observational/development evidence unless a specific comparison was independently prespecified.
- Isolated success nominates a production-policy test; it does not grant ladder entitlement.
- A larger width/budget/configuration can lose solves through finite-budget ordering/retention; do not assume monotonicity.
- Final failure status alone is low-information when multiple techniques simply hit caps or exhaust.
- Use parent/family units where family data enters the analysis.
- Report gains, losses, coverage/missing cells, censoring, and cost; do not rank only by average solve rate.
- Historical production joins must be reconciled to current code/protocol before live policy changes.

Detailed dated interpretation belongs in generated census reports and the direct refresh rejoin linked above, not in this instrument description.
