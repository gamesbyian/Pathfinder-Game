# PR #1356 solver-research review follow-up

> **Status:** correctness fix and lineage-control extension complete; population/oracle work remains pending
> **Commit under test:** working tree descended from `b956cf29` (final commit recorded by Git history)
> **Date:** 2026-08-11

## Neighbor-budget correctness

Review confirmed a real regression: the diagnostics parameter had replaced the historical caller-participation boolean, while repair's stochastic `takePly` comment still described an opt-out that the call no longer made. `evaluatePrunedMove` now accepts a named `PruneEvaluationOptions` object with independent `allowNeighborBudgetPrune` and `diagnostics` fields. The stochastic survivor loop passes `{ allowNeighborBudgetPrune: false }`; deterministic DFS, beam, admissible order, hint enumeration, and deterministic repair subsearches retain the default `true` participation.

A property fixture reaches a real neighbor-budget deadlock and proves all four relevant cases: allowed ON rejects, diagnostics name/count the rule, stochastic-policy suppression passes without falsely counting the rule, and explicit/default-OFF passes. In addition, a replay-complete repair fixture invokes the actual `takePly` loop, asserts that the candidate remains in its emitted survivor array, then proves that the equivalent deterministic shared-gauntlet call rejects and attributes it to `PRUNE_MC_NEIGHBOR_BUDGET`. The repair call site is named rather than positional, preventing a diagnostics refactor from changing its meaning.

### Promotion A/B status

The required fresh 1,700-level Corpus-2 A/B was **not run locally**. Its canonical protocol is 36,000,000 nodes per level, a non-binding 86,400,000 ms deadline, deterministic mode, all 1,700 levels, fresh OFF and ON arms from one exact SHA. That is roughly 122.4 billion arm-level node budget and the supported implementation is the 20-shard GitHub workflow. This environment has no authenticated GitHub CLI, so dispatching and retrieving both full-population arms was impossible. No partial/local sweep is presented as the promotion verdict. The flag remains default-OFF and the old 725→739 result remains historical original-wiring evidence only.

Required dispatch inputs after this commit is available remotely:

- control: `deterministic=true`, `persist_hints=false`, `prime_winner=true`, `corpus2_node_budget=36000000`, `corpus2_budget_ms=86400000`, blank `enable_flags`;
- treatment: identical, except `enable_flags=PRUNE_MC_NEIGHBOR_BUDGET`;
- require 1,700/1,700 coverage in both artifacts and compare exact attempt/config/seed metadata before accepting.

## Structural winning families

The previous pilot indeed assigned `candidate.join(',')` as `family`, duplicating exact-path identity. The pilot now reuses the established hint-diversity dimensions from `path-features.ts`: directed portal use, crossing placement, and must-cross first-entry/completion order. Local edge detours are intentionally ignored. This is a documented research equivalence key, not a learned cluster, homotopy proof, or claim of a mathematically minimal family.

Exact paths remain separately deduplicated by `WinningPrefixIndex`; all provenance records for a duplicate path remain retained. Tests cover duplicate collapse/provenance union, distinct paths in one structural family, and a genuinely different crossing family.

## Same-configuration lineage cohort

Command:

```text
npm run solver:winning-lineage-pilot -- --levels=data/stress/stress-levels.json \
  --limit-levels=30 --beam-width=100 --node-budget=100000 \
  --run-id=same-config-corpus1-width100-100k-2026-08-11 \
  --out=reports/stress/winning-lineage-same-config-2026-08-11.json
```

This deterministic first-30 solution-bearing Corpus-1 cohort produced 13 solves and 17 failures under the exact same isolated beam/profile/width/work budget. Observation OFF/ON matched outcome/path and canonical nodes for 30/30; there were zero hard-prune correctness alarms.

| cohort | n | mean normalized last known-support depth | range | final loss distribution | mean work after last known support |
|---|---:|---:|---:|---|---:|
| same-config solved | 13 | 0.505 | 0.108–0.970 | 7 dedup, 4 score/width, 2 no observed extinction | 3,096 |
| same-config failed | 17 | 0.239 | 0.090–0.593 | 15 score/width, 2 dedup | 5,516 |

The initial separation persists under the stronger control. Score/width retention is the strongest recurring *observed known-support loss stage* in failures (15/17), while solved runs more often tolerate or recover beyond labelled-family loss. This does not prove true solution extinction and does not authorize a score term or wider beam. The next narrow intervention should first explain score-cutoff margins/equal-score populations in the 15 failures, level-balanced, before changing retention.

## Metadata hardening

The lineage artifact schema is version 2 and now carries run ID and solver ref at document and row level plus producer, profile, seed, control/treatment, level, gate, work budget, and width as row-like fields. Structural-family definition is explicit rather than hidden in prose or raw path identity. The JSON remains an appendable analytical artifact; DuckDB is not made source of truth.

## Work deliberately not claimed

The CP-SAT atlas labels and exact repair-retreat census remain blocked by the already-recorded missing local `ortools` environment and unavailable authenticated Actions dispatch. Consequently oracle abstentions remain abstentions. Residual-interface unique-signature census and beam→repair receptor probe were not run: doing them without the prerequisite oracle/population infrastructure in this bounded session would manufacture incomplete evidence. The late-reserve A/B remains frozen and independent; it was not intermingled with neighbor-budget.

No new prune, score, width, dedup policy, repair operator, oracle, or production default was introduced.
