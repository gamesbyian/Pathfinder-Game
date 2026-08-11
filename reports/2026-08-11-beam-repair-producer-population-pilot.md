# Beam-survivor versus repair-elite producer pilot

> **Status:** inconclusive  
> **Scope:** first producer-premise observation; no artifact consumption  
> **Date:** 2026-08-11

## Implementation

A default-absent repair elite observer now emits a copied, replay-complete retained elite with its
badness, restart number, and arrival nodes. Beam artifacts reuse the real beam-boundary observer at
actual post-width/post-diversity survivor boundaries. The offline pilot projects both producers onto
the same deliberately small structural facts: normalized depth bucket, unique/revisited cells, turns,
and observed must-pass/must-cross/must-turn order. Exact prefix and exact metric-projection equality
remain separate claims. No technique reads the other's records.

The repair unit test runs the same seeded search with observation absent/present and verifies identical
returned path and canonical `nodesExpanded`; emitted paths, when present, begin at the gate.

## Pilot

```text
npm run solver:producer-population-pilot -- --limit-levels=3 --node-budget=30000 \
  --beam-width=100 --out=reports/stress/producer-population-pilot-2026-08-11.json
```

The deterministic sample was the first three solution-bearing Corpus-2 levels (R00001, R00039,
R00044), one known-solution gate each. Beam exhausted its frontier after 3,605–6,048 nodes; repair used
approximately the 30,000-node cap. Bounded sampling retained 107 beam artifacts and observed 191
repair-elite arrivals.

There was zero exact-prefix overlap and zero equality under the full common metric projection on all
three levels. This is a preliminary non-redundancy signal: beam reached replayable prefixes not
independently reproduced by repair in the observed window. It does **not** yet show those artifacts
would help repair, nor that approximate region/interface families differ—projection equality is a
strict coarse fingerprint, while inequality is not proof of useful novelty. Arrival-time persistence
also needs a larger time-bucketed sample.

## Disposition

The first producer premise survives as a reason for one bounded, stratified follow-up with richer
region/interface descriptors and counterfactual receptor evaluation. A live handoff or blackboard is
not justified. The negative alternative—complete producer redundancy—was not observed in this small
sample, but cannot be ruled out population-wide.
