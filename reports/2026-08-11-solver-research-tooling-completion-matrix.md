# Solver-research tooling completion matrix

> **Status:** active  
> **Scope:** handoff/status synthesis; pilot evidence only, not production policy  
> **Date:** 2026-08-11

## Implemented and validated

| Research objective | Reused foundation | Added observation/tooling | Small validation | Current evidence status |
|---|---|---|---|---|
| Symmetry controls | family manifests, canonical transforms, `family-pair-divergence`, real prune/lower-bound/scoring primitives | mapped semantic-prefix comparison, dual-stream research seed, survivor-order/draw records | 202 mapped R02248 prefixes plus 100k-node matched-seed repair pair | no semantic alarm; controlled deterministic-order → stochastic-trajectory interaction |
| Winning-lineage survival | real production beam, stored canonical/variant-replayed hints, canonical referee | provenance/family prefix index; incoming/generated/prune/dedup/width/diversity boundaries; bounded supported-removal context | first 8-level smoke and 4 cold-solved + 4 cold-unsolved controls | controls retained known support deeper (mean 0.212 vs 0.068); five width and three dedup final losses; zero hard-prune alarms |
| Contrastive branch atlas | `SOLVER_TESTING_API`, authoritative state replay/neighbors, existing CP-SAT atlas workflow | coalesced known prefixes, known continuation children, child-state neutral facts, explicit abstention | 3 levels / 19 prefixes / 31 siblings | 19 known continuations, 12 oracle abstentions; local `ortools` unavailable |
| Beam/repair producer premise | real beam boundaries and real repair elite pool | bounded replay-complete population samples, arrival work, shared neutral projection | 3 hard levels; 107 beam / 191 repair artifacts | zero exact/full-projection overlap; preliminary non-redundancy, no receptor verdict |
| Residual interfaces | canonical-valid solution corpus and real state transitions | endpoint interface miner, detour/commuting labels, exact represented-state equality | 45 solutions / 5 levels, span ≤12 | 2,825 exact-state substitutions among correlated pairs; signature reduction warranted, no online operator |
| Repair causal window | real retained repair elites and known-valid trajectories | conservative longest-known-prefix rollback witness | 15 elites / 3 levels | median demonstrated rollback 63 steps / 0.815 `reqLen`; suffix-local premise weakened, exact retreat oracle pending |
| Existing read-only tools | existing crossing-slack analyzer and family-boundary library/CLI | no duplicate implementation | 10-level crossing smoke; family-boundary tests/CLI smoke | 7,957 valid prefixes, zero negative-slack alarms; wide runs deliberately not performed |
| Differential reducer | existing single-level reducer/predicate seam | none | limitation inspected | trigger not met; do not build relational reducer yet |

## Normal-behavior evidence

Observation fields are absent by default. Focused OFF/ON fixtures assert identical returned solution or
failure and identical canonical nodes for beam and repair. `npm run solver:bench -- --check` solved
160/160 at 51,959,647 canonical nodes, and `npm run test:unit` passed 82 files / 1,091 tests. Wall time
is not used as behavior evidence.

## Correctness alarms

No valid known prefix was observed failing a hard prune in the bounded lineage runs. No mapped semantic
mismatch was observed in the 202-prefix symmetry pilot. The crossing-slack valid-path smoke reported
zero negative-slack alarms. These are sample statements, not global proofs.

## Exact larger workflows now enabled but not run

These remain evidence-lane commands, not production experiments:

```text
# Larger stratified lineage sample; retain all removal rows only for a deliberately small forensic run.
npm run solver:winning-lineage-pilot -- \
  --metadata=logs/winning-path-archaeology/corpus2-sample.json \
  --limit-levels=40 --beam-width=100 --node-budget=50000 \
  --out=reports/stress/winning-lineage-expanded.json

# For a tiny forensic subset only, add --include-stages --retain-all-removal-details.

# Persist complete producer witnesses for offline receptor work (still no consumption).
npm run solver:producer-population-pilot -- \
  --limit-levels=20 --node-budget=30000 --beam-width=100 --include-artifacts \
  --out=reports/stress/producer-population-expanded.json

# Emit exact residual-interface pairs for unique-signature reduction.
npm run solver:residual-interface-pilot -- \
  --limit-levels=20 --limit-solutions=20 --max-span=12 --include-pairs \
  --out=reports/stress/residual-interface-expanded.json

# Grow contrastive rows. After installing the repository's CP-SAT dependency, send only
# `oracle-abstain` prefix+child rows through the existing bounded cpsat-full-probe/atlas workflow.
npm run solver:winning-prefix-atlas-pilot -- \
  --limit-levels=10 --limit-solutions=5 \
  --out=reports/stress/winning-prefix-atlas-expanded.json
```

Not run and not authorized by this tooling evidence: the full-population
`PRUNE_MC_NEIGHBOR_BUDGET` A/B, main-loop late-reserve A/B, wide family-trove sweep, any opt-in
promotion, live cross-technique handoff, rotate/mirror retry, differential reducer, or new search
algorithm.

## Queue implications

The full interoperability blackboard remains lower priority than a bounded counterfactual receptor
probe. Another suffix-local repair operator is lower priority until exact retreat checks contradict the
large rollback proxy. Generic differential reduction remains unnecessary until several independent
families share one relational signature. Winning-lineage expansion and CP-SAT labelling are the most
direct next evidence purchases; none imply a production score, prune, width, dedup, seed, scheduler,
or budget change.
