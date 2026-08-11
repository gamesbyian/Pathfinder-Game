# Repair rollback / causal-window pilot

> **Status:** inconclusive  
> **Scope:** conservative known-trajectory proxy; not a repair operator or minimum-edit proof  
> **Date:** 2026-08-11

## Method

The default-OFF repair elite observer captures retained near-misses with arrival nodes and badness.
For each selected elite, the census finds the longest exact prefix shared with any canonical-valid
known solution from the same gate. Removing the elite suffix back to that point exposes a demonstrated
valid alternative trajectory, so the reported rollback is an upper-bound witness for this particular
known continuation. It does not prove the minimum causal edit window, and a different valid unknown
continuation may diverge later.

## Pilot

```text
npm run solver:repair-rollback-pilot -- --limit-levels=3 --node-budget=30000 \
  --limit-elites=5 --out=reports/stress/repair-rollback-census-pilot-2026-08-11.json
```

The sample used three repair-relevant, solution-bearing Corpus-2 levels, all canonical-valid known
solutions from the selected gate, and the five best distinct observed elites per level (15 total).
The median demonstrated rollback was 63 steps or 0.815 of `reqLen`; the range was 0.738–0.890.
R00001 elites shared 16 prefix cells with a known trajectory, while R00039 and R00044 elites shared
only the gate. These near-misses were long (53–81 moves) and low-badness relative to their populations,
yet their demonstrated known alternatives generally required discarding most of the path.

## Interpretation

This small proxy argues against assuming these failures are suffix-local. It is preliminary support
for measuring early structural divergence before investing in another short rollback/suffix surgery
operator. It does not establish that every viable repair requires a 74–89% rollback: the known set is
incomplete, longest common prefix is not edit distance, and no exact continuation oracle was queried
from intermediate elite states.

The next justified measurement is bounded exact/reference continuation checking while retreating from
these same elites, which can tighten the upper-bound witness without inventing a new solver. Until
then, broad suffix-regeneration work is lower priority than the already-observed early lineage and
producer/interface experiments.
