# Portal beam state-identity preflight 001

> **Status:** active
> **Last evidence:** 2026-09-09 — current beam parent-pointer/coarse-merge implementation and portal move semantics at `08bb5c6c`
> **Decision:** `portalJumps + lastWasPortalJump` is sufficient to recover counted-length/transient portal state, but it does **not** distinguish which portal pairs were consumed. Do not describe that two-field tuple as capturing portal usage. Measure pair-identity aliasing before choosing the first portal coarse-merge treatment; prefer an explicit used-pair signature if aliasing is material.
> **Remaining gate:** run the prespecified aliasing observer, then choose count/transient or pair-aware coarse identity before a fixed-work portal merge A/B.
> **Evidence role:** mechanism design / representation audit

## Why this matters

The current non-portal coarse merge deliberately collapses paths that share position and seven constraint scalars while ignoring ordinary visited-cell identity. Its value is survivor compression/diversity management, not exact future-state equivalence.

The historical portal exclusion is nevertheless more specific: two paths at the same cell can have consumed **different portal pairs**, changing which non-local forced transitions remain available. The initial restoration catalog proposed adding two search-state scalars already available in production:

- `portalJumps`;
- `lastWasPortalJump`.

Those fields solve two real representation gaps, but not the one named by the original exclusion.

## What the two fields capture

`portalJumps` fixes counted-length ambiguity. Beam `depth` counts every path edge, including free portal jumps, while the actual required-length metric is:

```text
realLength = path.length - 1 - portalJumps
```

Two same-depth paths with different numbers of portal traversals therefore have different remaining counted length. Adding `portalJumps` keeps those states out of the same coarse bucket.

`lastWasPortalJump` fixes transient terminal semantics. When the current cell is a portal terminal:

- arriving cardinally leaves `lastWasPortalJump=false`, so the next move is the forced paired jump;
- arriving through the portal leaves `lastWasPortalJump=true`, so ordinary cardinal exits are available.

The current cell key alone cannot distinguish those cases.

## What the two fields do not capture

Consider two candidates with the same:

- current cell;
- current seven coarse constraint fields;
- `portalJumps = 1`;
- `lastWasPortalJump = false`.

Path A may already have consumed portal pair 0 while path B consumed pair 1. Current move generation forbids re-entry into any visited portal terminal. Therefore A and B have different remaining non-local transition sets even though the proposed two-field coarse key is identical.

This is not a formal correctness defect by itself because coarse merge already ignores ordinary visited-set differences and is intentionally a search policy. It is, however, exactly the portal-specific diversity loss that motivated disabling the merge in the first place. Re-enabling it with only a traversal count should be evaluated as a deliberately coarse retention policy, not as a representation repair that makes portal states equivalent.

## Recommended cheapest measurement before implementation

Use the existing beam research observer on a prespecified portal-bearing sample with production coarse merge still disabled. For generated candidates at phases where `cands.length > beamWidth` would have invoked merging:

1. reconstruct each candidate path, which the observer already supports;
2. derive the set of portal pairs traversed by that path;
3. group candidates by the proposed key:
   `(key, ints, mpVisitedMask, mustCrossMask, flipperUsedMask, surroundMask, mustTurnMask, adjTurnMask, portalJumps, lastWasPortalJump)`;
4. for every group of size >1, count how many distinct used-pair sets occur;
5. report:
   - candidate share in aliased groups;
   - groups with >1 used-pair identity;
   - score gap between the best candidate and the best candidate from each alternate portal identity;
   - whether near-tie retention would preserve any alternate identity anyway;
   - downstream branch divergence/work if the observer can cheaply follow a bounded sample.

If pair-identity aliasing is negligible, the two-field treatment earns the right to be the cheapest first A/B. If it is material, skip that avoidable compression hazard and preserve used-pair identity in the treatment.

This measurement is outcome-independent and should be selected before looking at treatment solves.

## Representation options if used-pair identity is needed

### Do not use one fixed int32 mask without a schema decision

The shipped design guidance documents three portal pairs and Corpus 2 generates at most seven, but `validateRawLevel` does not currently impose a portal-pair cardinality cap. The grid validator permits up to 15x15 cells, so a theoretically schema-valid level can exceed 32 portal pairs. A fixed `1 << pairIndex` representation would therefore recreate the same class of silent cardinality bug previously found in beam mechanic masks.

### Low-coupling beam-only signature

The used-pair signature is needed only for beam retention identity, not for move legality. It can therefore be carried by the parent-pointer `BeamNode` rather than added to the mutable `SolverSearchState` if that proves cheaper.

At candidate generation:

- inherit the parent's used-pair signature;
- when `isJump` is true, add the current portal pair;
- ordinary moves inherit it unchanged.

A per-level endpoint-to-pair-index table makes the update O(1). Because use is monotone and a pair cannot be legally re-entered, undo support is unnecessary if the signature lives on immutable beam nodes.

For collision-free cardinality beyond 32 pairs, reasonable forms include:

- a `bigint` pair bitset on portal beam nodes, converted to a string/hex component only when a coarse key is actually built;
- a fixed multiword bitset sized from the enforced 15x15 grid ceiling;
- a schema cap, **only if** the game/editor contract genuinely intends one and validation is updated everywhere accordingly.

Benchmark representation cost. The restoration exists to improve portal search efficiency, so a theoretically elegant identity field that dominates candidate allocation would defeat the purpose.

## A/B interpretation

Two useful treatments may remain worth distinguishing:

1. **count/transient merge:** current seven fields + `portalJumps` + `lastWasPortalJump`; maximum compression, known to merge different used-pair identities;
2. **pair-aware merge:** the above plus exact used-pair identity; less compression, better preservation of portal-route diversity.

Do not bundle them. If the aliasing observer shows a meaningful difference, compare each against the same current no-portal-merge control under equal work, or test pair-aware first and only buy the coarser variant if more compression is still needed.

Both remain search-policy experiments. Gains and losses, rare/specialist retention, and referee validity matter more than raw node reduction.

## Disposition

No production implementation is blocked on further conceptual work after the aliasing measurement. The key design choice is now explicit:

- count + transient state fixes length/forced-exit ambiguity;
- used-pair identity fixes the non-local portal-consumption ambiguity named by the original carve-out.

The coding/experiment handoff should choose between those on measured aliasing rather than assuming the cheaper tuple fully represents portal usage.
