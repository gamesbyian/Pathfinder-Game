# Residual-interface segment-mining pilot

> **Status:** inconclusive  
> **Scope:** bounded offline discovery; no solver algorithm or repair operator  
> **Date:** 2026-08-11

## Method

The miner uses endpoint-pair `(entryKey, exitKey)` as its deliberately cheap first interface and
compares non-identical bounded segments across canonical-valid known solutions. Each solution is
replayed through the authoritative solver transitions. At every endpoint it serializes the complete
future-relevant state currently represented by the solver: start/current/previous cell, path length, visit counts and
axis usage on visited cells, intersection count, all objective/mechanic masks and substate, portal
jumps/parity state, and must-cross counts. Exact substitution is claimed only when those serialized
states are identical; endpoint equality alone stays `approximate-interface`.

Pairs separately record different length/intersection delta (detour-like) and different ordering of
the same observed obligation multiset (commuting candidate). Full pair output is opt-in
`--include-pairs`; summaries are bounded by default.

## Pilot

```text
npm run solver:residual-interface-pilot -- --limit-levels=5 --limit-solutions=10 \
  --max-span=12 --out=reports/stress/residual-interface-mining-pilot-2026-08-11.json
```

The sample covered 45 canonical-valid solutions from five solution-rich Corpus-2 levels. It found
2,133 repeated endpoint interfaces, 33,264 non-identical candidate pairs, 23,936 detour-like pairs,
100 obligation-order commuting candidates, and 2,825 exact-state-preserving endpoint substitutions.
Exact substitutions appeared on four of five levels; one level produced none.

## Interpretation and limitations

This is a positive premise check for deeper residual-interface work: alternate bounded segments can
reach the same exact represented solver state, and detour-like variants are common in this
solution-rich sample. It does not show that search can discover or profitably apply a substitution,
that endpoint pairs are a sufficient compact interface, or that raw pair frequency generalizes—the
pair count is highly correlated within solutions and is not a population estimate. The simple
commuting label sees only named-objective order and misses unlabelled excursion permutations; exact
state equality is the stronger result where it occurs.

The next justified experiment is to reduce exact pairs to unique interface/state signatures, measure
support across independent levels/families, and test whether a compact interface predicts the exact
label out of sample. Do not implement state-preserving repair substitution, separator DP, or a new
search algorithm from this pilot alone.

## Unique-signature follow-up census

The miner now separates raw pair multiplicity from a conservative, translation-invariant substitution signature. A signature requires both complete directed local segment shapes, their length/intersection deltas, and ordered obligation effects to match; exact represented-state equality is still required before a pair contributes. Level identity is support metadata, not part of the signature, so cross-level recurrence remains detectable. Structural solution-family support uses the same portal/crossing/must-cross-order identity as winning lineage.

```text
npm run solver:residual-interface-pilot -- --limit-levels=20 --limit-solutions=20 \
  --max-span=12 --out=reports/stress/residual-interface-signature-census-2026-08-11.json
```

The bounded census covered 288 canonical-valid solutions across 20 solution-rich Corpus-2 levels. It reduced 31,351 exact represented-state-preserving pair occurrences to **845 unique signatures**. Of these, 459 had support from multiple solutions, 201 crossed structural solution families, but only **14 recurred across multiple levels**. Thus most of the earlier thousands-of-pairs signal is correlated within-level multiplicity, while a small but real reusable cross-level residue survives the stricter definition.

Detour-like raw pairs remain abundant (277,445/364,578 candidates), but this raw frequency is not itself evidence that a reusable detour operator will help. Commuting candidates also remain present (4,310 raw pairs), but were not promoted to a separate algorithm because ordered-obligation equality is only one conservative aspect of commutation. The next justified work is forensic inspection and held-out validation of the 14 cross-level signatures, not repair substitution, separator DP, partial-order search, or CEGAR.

## Supersession note (2026-08-11 follow-up)

The raw-pair pilot is historical. The unique-signature census and subsequent 14-signature inspection
have completed the reduction/inspection steps; active status is in [`../docs/future-work.md`](../docs/future-work.md).
This note does not rewrite the dated pilot's original conclusion.
