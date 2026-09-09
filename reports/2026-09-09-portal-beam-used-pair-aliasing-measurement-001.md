# Portal beam used-pair aliasing measurement 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-09 — `scripts/stress/portal-beam-used-pair-aliasing-observer.mjs` against 80 portal-bearing Corpus-2 levels at current HEAD
> **Decision:** used-portal-pair identity aliasing under the proposed `count/transient` coarse key (current 7 constraint scalars + `portalJumps` + `lastWasPortalJump`) is **material**, not negligible. Per [`the beam preflight`](2026-09-09-portal-beam-state-identity-preflight-001.md)'s own frozen decision rule, skip the two-field treatment as the first A/B and implement a pair-aware coarse-merge key that preserves exact used-pair identity instead.
> **Remaining gate:** implement the smallest sound pair-aware key (preflight's "low-coupling beam-only signature" design) and run its fixed-work A/B against the current no-portal-merge control.
> **Evidence role:** mechanism-design decision gate (outcome-independent, run before any treatment choice, per the preflight's own instruction)
> **Selection:** first 80 portal-bearing levels by corpus position (deterministic, not outcome-selected) — a structural representation measurement, not a solve-rate sample

## Method

Exactly as prescribed by [`the preflight`](2026-09-09-portal-beam-state-identity-preflight-001.md#recommended-cheapest-measurement-before-implementation): production coarse-state merge is already unconditionally disabled for portal levels (`search.ts`'s `useCoarseStateMerge = level.portalMap.size === 0 && ...`), so the `'post-hard-prune'` beam research stage already emits the full uncollapsed candidate pool at every phase for a portal level — exactly the candidates merging would act on if enabled.

For every phase where `paths.length > beamWidth` (the branch that would invoke merging), each candidate's reconstructed path was replayed through the real search-state primitives (`createState`/`applyMove`, the same ones a live search uses) to derive:

- the proposed key's 9 fields: `(cellKey, ints, mpVisitedMask, mustCrossMask, flipperUsedMask, surroundMask, mustTurnMask, adjTurnMask, portalJumps, lastWasPortalJump)`;
- the actual set of portal pairs traversed (a per-level endpoint-to-pair-index table built from `level.portalMap`).

Candidates were grouped by the proposed key within each phase; a group of size >1 is a real merge candidate under that key, and a group is **aliased** when its members' used-pair sets are not all identical.

Population: first 80 portal-bearing Corpus-2 levels by position (`data/stress/stress-levels-random.json`), `beamWidth=200`, `nodeBudget=300,000` per level (deliberately small — a representation measurement needs many merge-eligible phases cheaply, not a realistic production solve). Tool: [`scripts/stress/portal-beam-used-pair-aliasing-observer.mjs`](../scripts/stress/portal-beam-used-pair-aliasing-observer.mjs).

## Result

```
levels sampled: 80, reached >=1 merge-eligible phase: 80
merge-eligible phases observed: 4,426
candidate groups (size>1) at proposed key: 229,992
groups spanning >1 distinct used-pair identity (ALIASED): 4,014 (1.7%)
candidates inside size>1 groups: 1,400,826
candidates inside ALIASED groups: 30,688 (2.2% of grouped candidates)
```

Every one of the 80 sampled levels reached at least one merge-eligible phase (a large, representative base rate, not a sparse/rare-participation artifact). Aliasing is present in the large majority of levels — per-level aliased-group counts range from 0 up to several hundred (e.g. `R00756`: 295/4,979 aliased groups; `R00342`: 348/3,254; `R00537`: 335/3,403), with only a minority of levels showing zero aliased groups in this sample.

## Interpretation

1.7% of merge-candidate groups and 2.2% of candidates sitting in size->1 groups span more than one distinct used-portal-pair identity. This is not a rounding-error-scale rate — it recurs across the large majority of sampled levels and would, under the two-field treatment, silently collapse those candidates down to whichever one path happens to score best, discarding the others' distinct forced-transition sets (which portal terminals remain re-enterable) exactly as [`the preflight`](2026-09-09-portal-beam-state-identity-preflight-001.md) warned.

Per the preflight's own frozen interpretation rule: *"If pair-identity aliasing is negligible, the two-field treatment earns the right to be the cheapest first A/B. If it is material, skip that avoidable compression hazard and preserve used-pair identity in the treatment."* A 1.7–2.2% rate, recurring across 80/80 sampled levels, is material by that bar.

## Disposition

Do not test the plain `count/transient` (`portalJumps` + `lastWasPortalJump`) coarse-merge treatment as a standalone candidate — it would knowingly compress away a non-trivial share of route diversity that the original portal carve-out existed to protect. Proceed directly to the preflight's **pair-aware merge** design: the low-coupling beam-only used-pair signature carried on `BeamNode` (inherited from the parent, extended by the current portal pair on a jump), sized for collision-free cardinality beyond the documented 3-pair guidance (the preflight's own note: `validateRawLevel` permits up to 32+ portal pairs on a schema-valid level). Benchmark representation cost before committing to a specific encoding, per the preflight's own caution against a theoretically elegant field that dominates candidate allocation cost.
