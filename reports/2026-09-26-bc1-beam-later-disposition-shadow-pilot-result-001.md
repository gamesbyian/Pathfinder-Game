# BC1 beam later-disposition shadow pilot result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-26 — live production-configured beam shadow across the frozen Stage-B 24-parent sample (`ws2-cut-balance-bc1-stageb-v1`), width 500, node budget 3,000,000 (never bound; every run reached exhaustion or a solve).
> **Decision:** BC1's production-inert beam later-disposition shadow (nominated by [the removable-work economics seam audit](2026-09-21-bc1-removable-work-economics-seam-audit-001.md)) clears every item on that audit's Phase-1 advance-gate checklist except aggregate per-check construction economics, which is qualified: excellent per-catch (12 canonical work units to expose a median 2,800-17,600 units of later work), but a naive unconditional per-candidate deployment would cost roughly as much as the rest of the search, mostly from redundant connectivity recomputation. The next gate is a cheap architecture fix (reuse the already-computed reached-relation instead of re-running `isConnected()`), not yet a behavioral hard-prune A/B.
> **Remaining gate:** reduce shadow construction cost by reusing the ordinary gauntlet's already-computed connectivity result when available, re-measure aggregate cost against dominated work, then implement the smallest behavioral BC1 consumer and test at matched work.
> **Evidence role:** development.
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`.

## Question

The seam audit found that the frozen frontier-prefix incidence artifact cannot honestly price BC1's saved work, and nominated a production-inert beam later-disposition shadow as the smallest honest next microscope:

> When BC1 proves a state impossible, how much later production search would an actual safe consumer remove, net of proof construction cost and overlap with existing pruning?

## What was built

`modules/solver/bc1-shadow-disposition.ts` + a new `observeBc1Candidate` hook on `BeamResearchObserver` (`modules/solver/types.ts`), wired at the exact seam the seam audit specified: `modules/solver/search.ts`'s beam candidate loop, only for candidates that already survived the ordinary hard-prune/connectivity gauntlet (`ok === true`), and only when the attached observer opts in. It:

1. Computes the bridge-excursion theorem (ported to TypeScript in `modules/solver/topology.ts` as `findMultigraphBridges`/`findBridgeExcursionConflicts`, cross-validated against the existing offline `scripts/stress/cut-bridge-excursion-lib.mjs` counterexample suite in `modules/solver/bridge-excursion.test.ts`) via the same real `connectivityResearchSnapshot()`/`isConnected()` the ordinary gauntlet uses.
2. Snapshots and restores `prep._workMeter.units`/the module-global `workMeter.units` around that recomputation, so the shadow's own cost is measured (`constructionWorkUnits`) but never leaks into the canonical work meter the search itself budgets/scores against — this is what makes the shadow production-inert, not merely low-effect.
3. Hands flagged candidates to `Bc1ShadowDispositionObserver`, which tracks each one's later fate by incremental prefix matching against the beam's own existing stage broadcasts (no new instrumentation surface): `later-deterministic-rejection` (an ordinary hard-prune rule later independently proves the same branch dead), `later-lossy-cull` (removed for width/merge/bucket reasons instead), or `survived-observation-window` (never resolved before the run ended).
4. Exposes `checkSolutionSafety(solutionPath)`: a correctness alarm if a referee-valid solution ever passes through a state BC1 flagged as dead.

`scripts/stress/collect-bc1-shadow-disposition.mjs` runs real production-configured beam twice per level (once with no observer, once with the shadow attached) and asserts the returned path, `nodesExpanded`, and canonical `workSpent` are byte-identical between the two runs — the production-inertness proof, mirroring the existing `collect-known-solution-prefix-survival.mjs` pattern.

## Population

Reused the frozen Stage-B 24-parent sample (`seed=ws2-cut-balance-bc1-stageb-v1`, the same population the [cut/region-flow Stage-0 audit](2026-09-21-cut-region-flow-stage0-audit-001.md) drew its 22/24-parent incidence screen from) instead of generating new levels, per the standing "prefer retained exact matched pairs/populations" rule. Unlike that prior screen (12 sampled frontier states per parent at a fixed depth fraction), this pilot ran each parent from its own gate through a real, width-500, unbounded-in-practice beam search — every one of the 24 runs reached full exhaustion or a solve well under the 3,000,000-node budget (701,229 total nodes expanded across all 24), so this is a live full-population census per parent, not a further sample.

Artifacts: `reports/stress/bc1-shadow-disposition-stageb24-2026-09-26.json` (per-level aggregates + a bounded 25-candidate reproducibility sample per level; the full per-candidate population is not retained — see "Construction/output note" below).

## Result

| Metric | Value |
|---|---:|
| Parents | 24 |
| Parents with >=1 BC1 conflict | 24/24 (100%) |
| Solved | 3/24 (`R02548`, `R02729`, `R02851`) |
| Behavior-identical (production-inertness proof) | 24/24 |
| Solution-safety alarms | 0/24 |
| Total flagged candidates | 415,273 |
| Total nodes expanded (both arms, canonical) | 701,229 |
| `later-deterministic-rejection` | 99,568 (24.0%) |
| `later-lossy-cull` | 315,705 (76.0%) |
| `survived-observation-window` | 0 (0.0%) |
| Per-parent median work-distance (proof -> disposition) | 2,803 - 17,601 canonical work units |
| Total shadow construction cost (flagged candidates only) | 4,983,276 canonical work units |
| Total canonical `workSpent`, whole 24-level campaign | 7,160,719 (identical on/off) |

Full per-level breakdown is in the JSON artifact; every parent showed material incidence, including `R00786` and `R02902` — the two parents the earlier 12-state-per-parent Stage-B sample found *zero* conflict on — which flagged 34,061 and 9,876 candidates respectively once checked exhaustively. That earlier screen's negative on those two parents was a sampling artifact, not an absence of the phenomenon.

### Safety

Zero production-inertness violations and zero solution-safety alarms across all 24 parents, including the 3 that solved for real: each winning path was independently checked against every BC1-flagged prefix from that same run, and none matched. Combined with the theorem's existing proof and exhaustive tiny-instance counterexample suite (both untouched), this is strong evidence the *integration* (which live state gets checked, at which seam) is correct, not just the theorem itself.

### Disposition and saved-work interpretation

0% of flagged candidates survived to the end of their run unresolved — full closure, no dangling ambiguity about denominator. Of the resolved population:

- **24.0% (`later-deterministic-rejection`)** is the strongest saved-work evidence: production's own ordinary hard-prune rules independently reached the same dead verdict, but only after a median of thousands of additional canonical work units of further expansion. A concrete example from `R00142`: BC1 flags a move into a small 5-cell pocket (containing the goal) at depth 1, cut off from the rest of the level -- including all 6 pending must-pass cells -- by a single bridge; production's own hard-prune machinery does not independently confirm this branch dead until depth 9, after 10,023 more canonical work units.
- **76.0% (`later-lossy-cull`)** means beam removed the candidate for width/merge/bucket-quota reasons rather than an ordinary hard-prune rule. BC1's proof is equally sound here (the branch was genuinely infeasible; the theorem does not depend on which existing mechanism eventually noticed), so this is not a weaker safety claim -- only a weaker "would definitely have kept costing work anyway" claim, since a lossy cull is policy-dependent rather than deterministic.

**Caveat -- summed work-distance is not an additive savings estimate.** Beam expands every surviving frontier member together each phase, so many flagged candidates' proof-to-disposition windows overlap in canonical work terms (a naive sum of all 415,273 windows, ~7.7 billion work units, exceeds the entire campaign's own `workSpent` of 7.16 million by three orders of magnitude). The **median per-parent work-distance** (2,803-17,601 units) is the honest per-catch statistic; it is not additive across simultaneously-flagged candidates.

### Construction-cost economics: qualified

Per catch, the economics are excellent: 12 canonical work units (one connectivity recomputation) to expose a median several-thousand-unit-distant disposition -- multiple orders of magnitude favorable, exactly the seam audit's "construction cost materially below the dominated work" criterion, read per candidate.

Read in aggregate, the picture is more cautionary. `computeBc1ShadowConflicts` ran on **every** candidate that survived the ordinary gauntlet in this pilot (not just the ones that turned out flagged, to get an honest incidence census), and even counting *only* the 415,273 flagged candidates' own recomputation cost, that alone totals 4,983,276 canonical work units -- **69.6% of the entire campaign's real `workSpent` (7,160,719)**. The unflagged-but-checked candidates (a materially larger population than the flagged one, since flagged candidates are 59% of `nodesExpanded` and every raw candidate move, not just expanded frontier nodes, was checked) each paid the same 12-unit cost with zero recorded benefit. An unconditional-per-candidate deployment of this shadow would likely come close to doubling total canonical work.

The dominant cost is not the theorem itself (the bridge-finding graph algorithm on an already-built multigraph is cheap) but `connectivityResearchSnapshot`'s own recomputation of `isConnected()` from scratch. Production's ordinary hard-prune gauntlet already computes this exact same flood-fill for many candidates (whenever `runConnectivity` was true that phase); the shadow currently pays for it again unconditionally rather than reusing the already-computed reached-relation. This is precisely the seam audit's own anticipated finding (section 5): *"If most BC1 cost is rebuilding information production already computed but discarded, that itself is a work-elimination architecture finding: expose/reuse the existing reached relation rather than recompute it."*

## What this earns

- BC1's beam later-disposition shadow is production-inert (proven, not merely argued) and sound in this integration (zero safety alarms across a real, exhaustive, multi-parent live-search population).
- The safety, distinctiveness (only fires on gauntlet survivors, by construction), and disposition-closure legs of the Phase-1 advance gate are cleared cleanly.
- The construction-cost leg is cleared per-catch but not yet in aggregate for an unconditional-check deployment.

## What this does not earn

- A behavioral BC1 hard-prune. The aggregate cost caveat above means an unconditional-check consumer risks giving back a large share of its own savings in shadow overhead; the theorem's soundness is not in question, but a naive implementation's economics are.
- A saved-work estimate. The summed work-distance figure is explicitly not that (see caveat above); only the median per-catch statistic is defensible as-is.
- Any claim about DFS or repair. This pilot, like the seam audit's own reasoning, is beam-only.

## Next gate

Before any behavioral A/B: reuse the ordinary gauntlet's already-computed connectivity result (when `runConnectivity` was true that phase) instead of having `computeBc1ShadowConflicts` unconditionally re-run `isConnected()`, then re-measure aggregate shadow cost against dominated work under the same population. Only after that (or a demonstration that the current cost is already acceptable at a cheaper checking cadence -- e.g. gating the shadow to fire only when `pendingMandatory` is non-empty and a bridge is plausible, rather than every candidate) does this earn the seam audit's final step: implement the smallest BC1 consumer and test it at matched work on a disjoint population.

## Artifacts

- `modules/solver/bc1-shadow-disposition.ts`, `modules/solver/bc1-shadow-disposition.test.ts`
- `modules/solver/bridge-excursion.test.ts` (TS port cross-validation against the offline theorem's own counterexample suite)
- `scripts/stress/collect-bc1-shadow-disposition.mjs`
- `reports/stress/bc1-shadow-disposition-stageb24-2026-09-26.json`
