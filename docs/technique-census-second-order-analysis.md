# Technique census: second-order analysis

> **Status:** rebuildable existing-census instrument; not production policy or a priority list.
> **Current scheduler use:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns current execution priority; [`solver-scheduling-policy.md`](solver-scheduling-policy.md) owns allocation policy.
> **Operational interpretation:** [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
> **Current budget interpretation:** [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md).

The committed census under `reports/stress/technique-census/32240161854/` is heavily mined **development evidence**. Use it to nominate actions, inversions, budget tranches, and causal follow-ups; do not turn exact winners/level IDs into production routing or treat row count as fresh confirmation.

Rebuild/check with:

```bash
node scripts/technique-census-second-order.mjs reports/stress/technique-census/32240161854 --check
```

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

Do not rerun the expensive census merely because a live scheduler question exists. The current gap is **materialization/join/valuation**, not another matrix:

1. materialize current per-attempt action identity, `workSpent`, ceilings, reach, and termination outcomes;
2. join current reach to the frozen cap/tranche evidence where comparable;
3. value incremental solves/work, rare exclusives, portfolio cardinality, and fixed-work oracle headroom;
4. test a simple deterministic static policy before dynamic/survival/bandit machinery.

Sequence-dependent actions require controlled current-code execution before causal scheduler use; isolated census curves do not erase predecessor-state effects.

## Interpretation rules

- The census is observational/development evidence unless a specific comparison was independently prespecified.
- Isolated success nominates a production-policy test; it does not grant ladder entitlement.
- A larger width/budget/configuration can lose solves through finite-budget ordering/retention; do not assume monotonicity.
- Final failure status alone is low-information when multiple techniques simply hit caps or exhaust.
- Use parent/family units where family data enters the analysis.
- Report gains, losses, coverage/missing cells, censoring, and cost; do not rank only by average solve rate.
- Historical production joins must be reconciled to current code/protocol before live policy changes.

Detailed findings and dated interpretation belong in the generated census report and [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md), not here.