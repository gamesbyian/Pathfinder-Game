# Forced-decision provenance is rare (1.57% of stored hints) — too thin for a standalone backdoor-depth analysis

> **Status:** concluded-negative
> **Last evidence:** 2026-09-05 — `provenance[0].solver.forcing` non-null rate across all 172,604 hints in `data/stress/hints-random/`, no new dispatch
> **Decision:** only 2,705/172,604 (1.57%) of stored hints carry a non-null `forcing` object (the field recording forced repair-guidance decisions like `repairMustTurnBiased`/`repairTurnBiased`). This is too thin a base, on its own, to support the "forced-decision/backdoor-depth analysis using existing hint-workbench provenance" question `solver-future-work.md` lists as deferred.
> **Remaining gate:** none for this characterization — closes out the sizing question for that deferred item. It remains deferred; this does not answer the underlying question, it establishes that the raw data volume for an easy answer isn't there.
> **Evidence role:** forensic — a scoping check for an existing deferred future-work item, using already-collected data
> **Selection:** whole hint population (172,604 hints), not a sample

## Method

Counted hints where `provenance[0].solver.forcing` is a non-null object, across the full corpus2 hint stash.

## Result

| | count | share |
|---|---:|---:|
| hints with non-null `forcing` | 2,705 | 1.57% |
| hints with null `forcing` | 169,899 | 98.43% |

## Interpretation

`solver-future-work.md`'s deferred "forced-decision/backdoor-depth analysis" item asks whether existing hint-workbench provenance can answer a concrete question "without a new large data campaign." This checks exactly that precondition: the forcing-decision data that exists is real (2,705 hints, not zero) but thin relative to the full 172,604-hint population, and concentrated in only the `repair` family's guidance sub-flags (`repairMustTurnBiased`/`repairTurnBiased`) based on the sampled structure — not a broad enough base across techniques to support a general backdoor-depth analysis without either a targeted new campaign or accepting a narrow, repair-only scope. This keeps the item correctly deferred rather than promoting it prematurely on thin data.

## What this does not establish

- Does not attempt the backdoor-depth analysis itself, even on the thin available subset — that would be the next step if this item is deliberately narrowed to a repair-only scope.
- Does not check whether other, non-`forcing` provenance fields could support a similar analysis by a different route.
- Single hint-stash snapshot, corpus2 only.
