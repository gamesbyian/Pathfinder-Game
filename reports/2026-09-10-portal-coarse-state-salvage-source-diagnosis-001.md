# Portal coarse-state salvage source diagnosis 001

> **Status:** active
> **Last evidence:** 2026-09-10 — source review reconciled with the later 2026-09-09 local `R01273` root-cause commit and the frozen 954-level portal A/B.
> **Decision:** pursue salvage by locating the first harmful coarse-merge collision with the existing beam research observer, then test the smallest state-local retention distinction that preserves the control-live path; do not reopen the already-fixed portal-pair aliasing theory or add new instrumentation before using the observer already present in `search.ts`.
> **Remaining gate:** reproduce the exact control-winning `must-cross-neighbor-prune-disabled-retry` attempt for `R01273`, capture its treatment-side coarse-merge removals, and identify the first collision that eliminates every known-live continuation before implementing a candidate retention rule.
> **Evidence role:** source-level forensic handoff; no new solver result is claimed here.

## Correction to the original specialist story

The frozen portal A/B remains decisive on the promotion decision: control 455/954, treatment 601/954, **158 gains / 12 losses, net +146**, with all gains referee-valid. `R01273` remains a genuine treatment regression and therefore blocks unconditional promotion.

However, the original causal description of `R01273` as a sole isolated-beam winner is stale. A later local reproduction established that the census-named isolated beam configuration solves nothing for `R01273` under either flag state. The actual control solve comes from the **`must-cross-neighbor-prune-disabled-retry`** stage: its second attempt succeeds under control at 404,434 nodes, while the same stage's treatment attempts run to comparable node counts and all fail before the ladder exhausts its budget. This is still strong evidence that the portal coarse merge deletes a needed survivor, but it is not evidence that the current isolated-census beam cell itself is load-bearing.

Accordingly, retain the frozen **12-loss cohort** as the regression set, but do not freeze the formerly reported six IDs as a current "specialist" cohort. Specialist status must be recomputed against current evidence during the post-1,029 residual/capability join.

## What the source actually does

`beamSearchFromGate` enables coarse-state merge on portal levels only behind `STRATEGY_PORTAL_COARSE_STATE_MERGE`. Portal-pair aliasing is already addressed: `BeamNode.usedPortalPairs` is folded into the portal string key, so paths that consumed different portal pairs cannot collide merely because their older seven scalar fields match.

The merge remains intentionally approximate. A candidate key consists of its current cell plus intersection count, must-pass/must-cross/flipper/surround/must-turn/adjacent-turn masks, and used-portal-pair identity. The source explicitly documents that this is **not a fully sound future-state signature**. In particular it omits visited-cell identity and per-cell edge usage; the full mutable search state also carries finer fields such as crossing counts and surround-neighbour remaining masks that are not independently represented in `BeamNode`.

On a collision, the merge keeps the higher-scoring candidate. The only existing second-survivor escape hatch is coarse-state near-tie retention: one runner-up may survive when its score is within the fixed 1% margin. A needed path more than that margin below its competitor is discarded even when the two paths have materially different future reachability because of omitted path/edge state.

That is a much narrower hypothesis than "portals are still represented incorrectly": the portal-specific identity defect is fixed; the remaining issue is the ordinary approximate-dominance assumption becoming harmful on some newly eligible portal searches.

## Existing instrumentation is already sufficient for the first diagnosis

When a beam research observer is installed, `search.ts` emits `coarse-state-merge-removed` observations. For every removed candidate it already records:

- the removed path;
- the competing kept path;
- removed and kept scores;
- the exact coarse-state key;
- the phase/depth/work context carried by the observer event.

It also emits the surrounding `generated`, `post-hard-prune`, `post-production-coarse-state-merge`, and final width-selection stages. Do not add another collision logger before proving this retained observer cannot answer the question.

## Smallest diagnostic sequence

1. Reproduce the **exact control-winning attempt**, not merely the whole ladder: `R01273`, `must-cross-neighbor-prune-disabled-retry`, the second control attempt, preserving its gate/config/seed and matched-work envelope.
2. Confirm the attempt solves with portal coarse merge off and fails with it on.
3. In the treatment run, use the existing beam research observer to enumerate coarse-merge removals in chronological order.
4. Use the known-valid control solution(s) only as an offline oracle. Locate the earliest merge event after which every known-live solution basin/prefix represented before the merge has disappeared. This is a diagnosis input, never a production routing input.
5. For that collision, reconstruct the full `SolverSearchState` for the removed and kept paths and diff **only the state omitted by the coarse key** first: visited-cell identity, per-cell `edgeUsage`, crossing-count detail, surround-neighbour remaining masks, and any other non-keyed state that the move/prune pipeline subsequently reads. Do not spend time rediscovering differences already encoded in the key.
6. Repeat the same collision-state diff on the other 11 frozen losses where a deterministic reproduction is cheap enough. Look for a repeated low-cardinality distinction before designing a new field or retention rule.
7. Cross-check the proposed distinction against a sample of the 158 frozen gains. The target is not merely to explain a loss; it must preserve enough merging to keep material upside.

## Candidate salvage shapes, in order of preference

These are implementation hypotheses, not endorsed changes until the diagnostic above identifies the causal distinction.

1. **Targeted second-survivor retention on a measured omitted-state distinction.** Keep the ordinary highest scorer, plus at most one candidate whose measured future-relevant state differs in the specific way seen on the loss cohort. This preserves most merge compression and avoids pretending the lower scorer dominates globally.
2. **Portal-only adaptive runner-up retention.** If harmful losses consistently have score gaps outside the existing 1% near-tie window but within a compact empirically bounded range, test a separate portal salvage margin behind an opt-in flag. Do not change the production near-tie margin globally; its history is strongly double-edged.
3. **Small exact subkey extension.** Add a cheap state component to the portal merge key only if the diagnostic shows that component repeatedly distinguishes the live and dead futures while retaining substantial collision volume. A full visited/edge-state signature is a last resort because the existing source evidence says true duplicates are too rare to retain the merge's useful compression.

Avoid a blanket "keep two for every coarse key" as the first implementation. It spends beam width everywhere and may simply recreate the previously measured churn in another form. Likewise, do not route by `R01273`, family ID, stored hint, or census label.

## Validation ladder

A candidate salvage should climb the cheapest gates first:

1. deterministic unit/forensic reproduction showing the causal collision and the proposed rule retaining the needed path;
2. the frozen 12-loss cohort at the matched envelope, requiring **12/12 control solves retained** before spending on the full portal population;
3. the frozen 158-gain cohort or a representative cheap subset to reject rules that erase the original upside;
4. only then the full frozen 954 portal population, with exact gain/loss enumeration, referee validation, `workSpent`, and specialist/low-multiplicity retention refreshed against current evidence.

The acceptance target for salvage is stricter than the original net-positive screen: zero regression against the 12 known control solves, no newly identified current specialist loss, and retention of a material fraction of the original 158 gains at acceptable work cost. If every safe rule collapses to effectively disabling merge on portal levels, close the salvage line rather than laundering the original +146 net through a more complicated no-op.
