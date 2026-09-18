# Solver research integration fresh-start bootstrap 001

> **Status:** active implementation bootstrap
> **Date:** 2026-09-17
> **Base:** current `main` after PR #1863
> **Scope:** integrate the recent premise-map, measurement, evidence, sampling, and queue lessons through existing repository authorities before the next broad solver-development round.

## Initial contract

This pass starts from current repository state rather than treating prior synthesis prose as an implementation specification.

The first tranche will:

1. build a read-only Node-native research relation/query substrate over existing structured authorities, without creating a new source of truth;
2. use that substrate to identify stale blockers, satisfied reopen conditions, incompatible evidence, and cross-workstream consequences;
3. reuse existing experiment/population/evidence semantics instead of inventing parallel schemas;
4. generalize research-state sampling only where the current production-search machinery supports a reusable contract;
5. update live solver authorities only when repository evidence earns a changed gate.

No production solver behavior change is authorized by this bootstrap.
