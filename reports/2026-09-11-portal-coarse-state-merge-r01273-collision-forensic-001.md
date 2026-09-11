# Portal coarse-state-merge R01273 collision forensic 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — exact deterministic reproduction of `R01273`'s control-winning `must-cross-neighbor-prune-disabled-retry` attempt, treatment-side first-loss localization, full state diff, and two salvage-shape trials against the same reproduction.
> **Decision:** the portal coarse-state-merge salvage line (docs/solver-optimization-workstreams.md gate 2) is **CLOSED NEGATIVE** for `R01273` at the subkey/bounded-retention discriminator shapes this handoff specified. The omitted state dimension that actually kills the known-live continuation is trailing visited-cell identity at a distance that keeps increasing under every tested fix (1 hop -> 2 hops -> 4 hops of predecessor-cell lookback each only pushed the failure a few phases further, never closing it), which is the report's own predefined closing condition: "if every safe discriminator effectively disables merging, close the salvage line rather than layering complexity onto a failed premise." No code change is shipped from this forensic.
> **Remaining gate:** none for `R01273`/subkey salvage. The frozen 12-loss/158-gain validation ladder is not reached because the cheapest gate (deterministic single-level reproduction) did not close. A different salvage shape (portal-only near-tie margin widening, candidate shape 2 in the source diagnosis) is untested and could be tried independently if a future session has a concrete reason to reopen this line; see "What remains untested" below.
> **Evidence role:** mechanism forensic / negative result

## Method

New reusable tool: [`scripts/stress/portal-coarse-merge-collision-forensic.mjs`](../scripts/stress/portal-coarse-merge-collision-forensic.mjs). For one level, it:

1. Reproduces the **exact** control-winning attempt using the same `buildRetryTierAblationOverride` proxy the orchestration ladder's `runWholeLadderRetryTier` actually installs (`PRUNE_MC_NEIGHBOR_BUDGET: false`, matching the `must-cross-neighbor-prune-disabled-retry` stage), with the attempt's own recorded gate/profile/width/mechanic-bucket-retention from its hint provenance (`data/stress/hints-random/R01273.json`'s `forcing.retryTier === 'must-cross-neighbor-prune-disabled-retry'` entry: gate `524296`, `objectiveFirst`, `beamWidth=5000`, `mechanicBucketRetention=true`). Reproduced at 404,874 nodes (vs. the frozen 404,434 — small solver-version drift since the hint was recorded, not a different mechanism).
2. Repeats the same attempt with `STRATEGY_PORTAL_COARSE_STATE_MERGE: true` added (treatment), using the existing beam research observer already wired into `search.ts` — no new instrumentation, per the source diagnosis's explicit instruction.
3. Locates the **true first-loss depth**: not simply the first `coarse-state-merge-removed` event that matches the control solution's own prefix (a naive first pass that undercounts — see "Correction" below), but the first depth at which that prefix was actually generated this phase (`post-hard-prune`) yet is absent from the phase's real output frontier (`post-mechanic-bucket-selection`/`post-score-width-cull`), correctly accounting for near-tie retention or mechanic-bucket selection re-admitting/re-culling a coarse-merge "removed" candidate later in the same phase.
4. Reconstructs full `SolverSearchState` for the removed and kept paths via `createState`/`applyMove` replay and diffs every field the coarse key omits (`visited`, `edgeUsage`, `crossCounts`, `portalJumps`, `lastWasPortalJump`, `surroundNeighborRemainingMasks`), plus a same-key sanity check on the 7 fields the coarse key does cover (must match by construction).

### Correction during this forensic: naive "first removal" over-counts

An initial version flagged the first `coarse-state-merge-removed` event whose `removedPath` equals the control prefix as the death point (depth 16). Tracing that exact candidate through the subsequent stages showed it was re-admitted by the existing near-tie retention (`COARSE_STATE_NEAR_TIE_RETENTION_MARGIN`) and survived into the depth-17 frontier intact. The true death point (depth 17, below) is one phase later, where the score gap (7.10) narrowly exceeds the 1% near-tie margin (5.38 at that pool's leading score). This distinction matters for anyone reusing this tool: **a coarse-merge "removed" event is not proof of death** — always check the resulting frontier stage, which this tool now does.

## Root-cause collision (depth 17)

```
removed (live control prefix, tail): ...,196612,131076,65540,65539,65538   score=530.68
kept    (competitor,        tail): ...,196612,131076,131075,131074,65538  score=537.78
```

Both candidates reach the identical coarse key (current cell `65538` + all 7 constraint scalars: `ints=1, mp=0, mc=55, flip=0, sur=7, turn=31, adj=0`) — confirmed by the state-diff's sanity check, which found **zero** mismatch on any of those 7 fields. They reached it by different two-cell corridors: the live path via `65540 -> 65539`, the competitor via `131075 -> 131074`. The only state differences are exactly what the coarse key omits:

- `visited`: live path has visited `{65539, 65540}`, not `{131074, 131075}`; competitor the reverse.
- `edgeUsage`: consistent axis-use differences at those same four cells.
- `crossCounts[1]`: live path has already physically crossed must-cross cell #1 once (`count=1`); competitor has not (`count=0`), despite both showing the same `mustCrossMask` *satisfaction* bit — the mask tracks satisfied/not, not how many times a cell was actually crossed.

This is a clean instance of the source diagnosis's predicted failure mode: the coarse key is a real over-approximation, and on this level the discarded path's future reachability genuinely differs from the kept path's, even though their current-position-plus-constraint-summary is identical.

## Two salvage shapes tried against this exact reproduction

Both were implemented as new portal-only, opt-in, default-OFF strategy flags, validated only against this one deterministic reproduction (the cheapest rung of the validation ladder) before deciding whether to proceed to the frozen 12-loss cohort. Neither closed `R01273`, so the ladder was not climbed further and neither is shipped in this branch's final diff.

**Shape 1 — bounded second-survivor retention on a measured state difference** (source diagnosis's preferred option: "keep the ordinary highest scorer, plus at most one candidate whose measured future-relevant state differs in the specific way seen on the loss cohort"). Implemented as a `dm3` map parallel to the existing near-tie `dm2`, retaining the best-scoring competitor per coarse key whose immediate predecessor cell (`BeamNode.prev.key`) differs from the eventual leader's. **Result: did not close the reproduction; it moved the true death depth from 17 to 20**, and inspection of the depth-20 collision showed *why* a single extra retention slot is insufficient: three distinct-predecessor candidates collided at the same key in that phase, and the bounded slot kept the highest-scoring one of the three — which was not the live path. A fixed-capacity "one extra survivor" rule cannot express "keep the best candidate per distinct predecessor" when more than two predecessor groups collide at the same key in one phase.

**Shape 2 — predecessor-identity subkey extension** (source diagnosis's option 3, "small exact subkey extension," tried only after shape 1's capacity failure motivated it): fold the immediate predecessor cell into the coarse key itself (`${key}|${beamStateKey}|${prev.key}`), so predecessor-diverging candidates never collide at all rather than competing for one retention slot. Since `_numericCoarseStateKeySafe` is unconditionally false whenever `level.portalMap.size > 0`, this only ever needed to change the string-key branch that portal levels already exclusively use. **Result: moved the death depth from 17 to 40** — a much bigger jump, confirming predecessor identity is a real, recurring contributor — **but still did not close the reproduction.** Escalating the lookback window (2 hops: death depth 41; 4 hops: death depth 43) showed rapidly diminishing returns with no sign of convergence: the corridor-ambiguity structure this level's constraint geometry produces recurs repeatedly along the path at increasing, apparently unbounded trailing-history distance. This is precisely the source diagnosis's own stated reason to treat a full visited-set key as "a last resort": chasing the discriminating distance with an ever-wider fixed window is the same failure shape as a full visited-set key, just approached incrementally, with no evidence it terminates before reaching one.

| Salvage shape | Reproduction result | True death depth |
|---|---|---|
| none (current production code) | fails | 17 |
| shape 1: bounded 1-extra-survivor by distinct predecessor | fails | 20 |
| shape 2: predecessor subkey, 1-hop | fails | 40 |
| shape 2: predecessor subkey, 2-hop | fails | 41 |
| shape 2: predecessor subkey, 4-hop | fails | 43 |

Per the source diagnosis's own prespecified closing rule, this is now decisive: **close the salvage line rather than layering complexity onto a failed premise.** Neither code change is retained in the repository; this report and its artifact are the durable record.

## What remains untested

**Candidate shape 2 from the source diagnosis — portal-only near-tie margin widening** (as opposed to a bounded extra-retention slot or a key extension) was not tried. It is a different mechanism: instead of retaining an extra candidate keyed on a specific state difference, it simply widens the existing score-proximity window that already exists in production (`COARSE_STATE_NEAR_TIE_RETENTION_MARGIN`) for portal levels specifically. The depth-17 collision's score gap (7.10) is only ~32% above the current 1% margin (5.38), so a modest, portal-scoped widening might close this one collision without the capacity or unbounded-lookback problems shape 1/2 hit — but it was not tried here because it optimizes a different variable (score tolerance, not state identity) and the workstream's own history flags the *global* near-tie margin's effect as "strongly double-edged," so a portal-scoped version would need its own careful bounded trial rather than being folded into this already-negative result. Left as a candidate for a future session with a concrete reason to reopen this line, not queued as active work.

**Side observation, not independently verified — do not treat as a confirmed defect:** while tracing shape-2's depth-40 collision, the removed (live) candidate's score gap (1.48) was well inside even the unwidened 1% near-tie margin (15.84 at that pool's leading score), yet it was still dropped from the frontier. This is consistent with the same "one retention slot per coarse key" capacity limitation shape 1 demonstrated, but this time in the **already-shipped, default-ON** near-tie retention (`dm2`) that portal-free coarse-state merge already uses in production — i.e. a possible latent defect where 3+ near-tie candidates colliding at one key in one phase can cause the existing production mechanism to silently drop a valid, in-margin candidate in favor of a different, unrelated in-margin candidate. This was observed only inside the shape-2 experiment's modified key space, not isolated against stock production code, so it is **not confirmed** — a future session would need its own clean reproduction against unmodified `search.ts` before treating it as a real finding. Recorded here only so it is not silently lost.

## Production boundary

No production strategy flag or default changed. `STRATEGY_PORTAL_COARSE_STATE_MERGE` remains CLOSED NEGATIVE/default-OFF, unconditionally, exactly as before this forensic. This report only adds the tested-negative record for the subkey/bounded-retention salvage forms and the reusable forensic tool.

## Artifacts

- [`scripts/stress/portal-coarse-merge-collision-forensic.mjs`](../scripts/stress/portal-coarse-merge-collision-forensic.mjs) — reusable single-level control/treatment reproduction, true-death-depth localization, and state-diff tool.
- [`reports/stress/portal-coarse-merge-salvage/2026-09-11-r01273-forensic/r01273-forensic.json`](stress/portal-coarse-merge-salvage/2026-09-11-r01273-forensic/r01273-forensic.json) — full machine-readable output of the depth-17 root-cause collision against current (unmodified) production code.
