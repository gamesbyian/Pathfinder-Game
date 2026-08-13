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

## Stratified follow-up (2026-08-13)

The tool now supports a deterministic stratified draw (`--sample=N --seed=X`, same FNV-1a ->
mulberry32 -> Fisher-Yates convention as `scripts/stress/benchmark.mjs`), replacing the original
pilot's first-3-in-file-order selection. Ran at `--sample=25 --seed=beam-repair-followup-2026-08-13
--node-budget=30000 --beam-width=100` (same per-level budget as the original pilot, ~8x the level
count):

```text
npm run solver:producer-population-pilot -- --sample=25 --seed=beam-repair-followup-2026-08-13 \
  --node-budget=30000 --beam-width=100 --out=reports/stress/producer-population-pilot-2026-08-13.json
```

942 beam artifacts vs. 1,657 repair-elite artifacts across the 25 levels. **Zero exact-prefix overlap
and zero metric-projection overlap on every level** — the non-redundancy signal not only survives at
~8x the sample size, it strengthens (the original 3-level pilot's own coarser metric-projection check
was likewise zero, but on a sample small enough that a single coincidental match could have changed
the picture; 25 stratified levels leaves much less room for that). This is now a reasonably solid
population-level non-redundancy result, not just a 3-level observation.

**Still does not answer the harder question the original disposition named**: this shows beam reaches
structural regions repair's own elite pool doesn't reproduce, not that repair would benefit from being
seeded with them. The negative precedent from
[`2026-08-07-repair-elite-prefix-dfs.md`](2026-08-07-repair-elite-prefix-dfs.md) (repair-elites ->
deterministic-DFS seeding, a structurally similar handoff one hop over) is the concrete reason not to
skip straight to a live mechanism: useful, non-redundant information still lost 4/20 vs. 5/20 there
because the extra work displaced the ordinary technique's own eventual win. A counterfactual receptor
evaluation — actually splicing a beam survivor into repair's restart pool at solve time, in shadow/
budget-matched form, and measuring whether repair's own badness/solve outcome improves — remains the
next evidence gate before any promotion decision, exactly as this report's original disposition said.
