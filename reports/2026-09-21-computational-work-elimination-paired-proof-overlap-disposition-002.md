# Paired beam connectivity-proof overlap disposition 002

> **Status:** cancelled
> **Last evidence:** 2026-09-21 — the connectivity-cut proof family failed its downstream-work economics gate in [DFS dominated-work result 006](2026-09-21-connectivity-cut-dfs-dominated-work-result-006.md).
> **Decision:** do not execute the preregistered 2K/5K connectivity-cut proof-overlap studies. Their result can no longer change a reuse decision.
> **Remaining gate:** reopen W2 with a proof family only after that family independently clears solve-local recurrence, consumer soundness, and removable-work economics.
> **Evidence role:** development.
> **Parent:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Superseded preflights:** [paired proof-overlap execution preflight 001](2026-09-21-computational-work-elimination-paired-proof-overlap-preflight-001.md) and [paired beam proof-overlap development preflight 001](2026-09-21-paired-beam-proof-overlap-development-preflight-001.md).

## Why the planned run is no longer decision-bearing

The W2 preflights asked whether isolated 2K and 5K beam searches derive the same exact portal-free connectivity cut proofs even when frontier-prefix support differs.

At preregistration time this could have nominated a cross-query reusable computation unit.

Later W1 evidence changed the premise.

The complete connectivity-cut chain now says:

- exact proof recurrence is real;
- cross-exact-state implication reuse is real;
- exact proof-template duplication is substantial;
- earlier applicability is real;
- ordinary DFS owns the largest early-use reservoir;
- but non-overlapping downstream work below the first applicable proof is only ~0.40% of whole-solve canonical work;
- proof-root boundary validation alone is much larger in operation count than that removable-work numerator.

Therefore even a hypothetical W2 result of 100% exact cut-proof overlap would not earn shared proof execution for this proof family.

It could establish structural redundancy, but not a plausible economic consumer.

## Stop-rule application

The original preflight advance condition required:

1. shared exact proof identities across multiple independent parents;
2. non-trivial derivation or downstream work;
3. a plausible consumer that validates/reuses the proof more cheaply than recomputation.

Result 006 invalidates conditions 2/3 for the current connectivity-cut consumer.

Under the audit's own rules, continuing acquisition after that decision is locked would be waste.

## What is not being claimed

This does **not** establish that:

- multi-query searches never repeat useful exact reasoning;
- proof objects are never useful below path-prefix identity;
- BC1 or another exact projection will have poor cross-query reuse;
- shared execution is generally bad.

It closes only:

> connectivity-cut proof sharing as the first W2 multi-query reuse candidate under current economics.

## W2 reopen rule

A new proof family may enter W2 only after it independently demonstrates:

- sound identity/equivalence/implication semantics;
- solve-local or within-query recurrence;
- a material consumer/removable-work numerator;
- lookup/validation materially cheaper than the avoided reasoning.

Only then ask whether separate query configurations repurchase the same fact.

BC1 is the natural contingent candidate, but it must first clear its existing WS2-CUT-BALANCE-PROJECTION downstream-work gate.

## Architectural lesson

Multi-query overlap is **downstream** of single-query economics.

A proof family does not earn cross-query overlap measurement merely because it has a normalized identity. First show that consuming that proof is worth anything.

That ordering prevents elegant overlap metrics from becoming architecture by momentum.
