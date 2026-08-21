# Contrastive winning-prefix branch-atlas pilot

> **Status:** inconclusive  
> **Scope:** tooling validation with known-continuation labels; exact oracle not invoked  
> **Date:** 2026-08-11

## Implementation

`enumerateKnownPrefixBranches` now groups identical known prefixes before enumeration, reconstructs
those prefixes through the authoritative solver state transitions, enumerates siblings through
`getNeighbors`, and applies every child to a fresh reconstructed state. Thus neutral facts describe
the child rather than the parent. All known solutions sharing a prefix contribute continuation labels
and provenance. The row schema records the replay-complete prefix, child, default-score rank, mechanic
masks, intersection resources, portal state, and explicit `oracle-abstain` for unknown siblings.

## Pilot

```text
npm run solver:winning-prefix-atlas-pilot -- --limit-levels=3 --limit-solutions=3 \
  --out=reports/stress/winning-prefix-atlas-pilot-2026-08-11.json
```

The deterministic sample used the first three solution-bearing Corpus-2 levels, up to three stored
solutions each, and prefix depths near 20%, 50%, and 80%. Every input solution passed the canonical
referee. The atlas contains 19 unique prefixes and 31 siblings: 19 known-valid continuation children
and 12 oracle abstentions. Shared prefixes were emitted once rather than duplicated per solution.

As a smoke contrast only, known continuations had mean default-score rank 1.37 versus 1.75 for
abstentions, and mean remaining intersection budget 2.74 versus 1.50. Abstention is not a dead label,
so these differences are not live/dead separation and support no heuristic conclusion.

## Limitations and next experiment

The local pilot could not launch CP-SAT: `python3 scripts/stress/cpsat-full-probe.py --help` fails with `ModuleNotFoundError: No module named 'ortools'` in this container. Consequently live/dead balance is unknown: 12/31 rows require labelling by the existing CP-SAT shadow-eval atlas workflow. The exact
later workflow is to generate a slightly larger JSON with the same command and feed its
`oracle-abstain` rows, replay-complete prefix, and child into the existing bounded CP-SAT atlas
labeller; preserve timeout/abstention as a third outcome. Dozens of decisions are already enough for
that validation. This dataset is more locally contrastive than arbitrary atlas branches because every
row is a sibling of a demonstrated winning continuation, but whether it is more informative remains
an experimental question until the 12 unknowns are labelled.

No production score, prune, retention rule, scheduler, or oracle was added.
