# Portal restoration evidence hardening 001

> **Status:** active preflight; derivation gates closed for must-cross neighbour-budget propagation and ordinary connectivity volume, with implementation/A-B gates still open
> **Last evidence:** 2026-09-09 — current solver semantics at `08bb5c6c` plus the committed 975/1,700 Corpus-2 production boundary and portal-carveout census
> **Decision:** the blanket portal exclusions on must-cross neighbour-budget propagation and the ordinary connectivity volume check are not required by their current soundness arguments. Keep production behaviour unchanged until the remaining differential/atlas and matched-work gates run. Same-parity-only portal levels also preserve the ordinary parity invariant and are a bounded cleanup candidate.
> **Evidence role:** derivation / experiment preflight
> **Selection:** no outcome-selected sample; proposed populations are deterministic structural predicates over the frozen Corpus-2 source identified below

## Scope

This report closes the analysis work that can be completed without changing production search policy or buying a large solver run. It audits the actual current move semantics rather than inheriting the historical reasons for the portal carve-outs, repairs one research-helper representation drift, and freezes the next experiment contracts.

No production prune, beam, gate-selection, or scheduler behaviour is changed here.

Primary population evidence remains [`2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md`](2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md). The frozen production/capability artifact is [`stress/portal-carveout-exposure-2026-09-09.json`](stress/portal-carveout-exposure-2026-09-09.json).

## 1. Must-cross neighbour-budget propagation: portal derivation closes

The production predicate reserves one future intersection for every pending must-cross cell, then asks whether already-visited cells required by still-open must-cross axes force more revisits than the remaining *unreserved* intersection budget permits:

```text
freeInt = requiredIntersections - state.ints - popcount(state.mustCrossMask)
reject when distinctForcedVisitedNeighbors > freeInt
```

The portal carve-out was introduced because portal forced-move semantics had not been derived. Current source makes the remaining obligations explicit enough to close that derivation.

### 1.1 A still-open must-cross axis still requires both cardinal neighbours

A must-cross pass is a straight cardinal traversal. A portal can change what happens immediately before or after occupying an adjacent cell, but it cannot make the must-cross pass skip that adjacent cardinal cell.

An **unvisited** portal terminal adjacent to the must-cross cell is therefore not inherently unusable. It may serve as the exit neighbour before its forced jump, or as the entry neighbour when the path has just arrived there through the paired portal. This corrects the stronger wording in the initial catalog preflight that suggested a portal terminal could never serve as the straight-pass neighbour.

The neighbour-budget predicate does not count unvisited neighbours, so this correction does not weaken its lower-bound argument.

### 1.2 A visited portal-terminal neighbour is stricter than the bound assumes

Current ordinary move validation categorically rejects entry into a portal terminal whose `visited` count is already nonzero. Therefore, if a still-required must-cross neighbour is a **visited portal terminal** and is not the current position, future cardinal re-entry is impossible.

The neighbour-budget predicate merely counts such a cell as costing one additional future intersection. That understates the real obstruction. Understatement can miss a dead state, but cannot manufacture a false rejection.

The existing `nk === pos` exemption is also conservative. If the current portal terminal can serve the pending interface, excluding it is necessary. If forced-jump state means it cannot, excluding it only under-prunes.

### 1.3 Portal jumps do not create an uncharged revisit

`applyMove` increments the target's visit count for every move, including a portal jump. The intersection increment is based on `prevVisited > 0` with only goal/gate exemptions; it is independent of whether the move was a portal jump. A portal transition therefore cannot consume an already-visited cell while evading the intersection accounting used by `freeInt`.

In normal legal search, portal terminals additionally cannot be re-entered after a prior visit, so this is a belt-and-suspenders property rather than a route to extra permissiveness.

### 1.4 Existing exclusions remain conservative

The proof still deliberately avoids charging:

- pending must-cross neighbours, whose own second crossing is already represented by `popcount(mustCrossMask)`;
- flipper neighbours, whose dynamic orientation/state requires a separate argument;
- hard-wall neighbours already owned by `PRUNE_MC_FORCED_NEIGHBOR`;
- duplicate forced cells, which are charged once through set de-duplication.

None of those exclusions becomes less safe on portal levels.

### 1.5 Conclusion

The blanket `level.portalMap.size > 0` escape hatch is not required by the current lower-bound proof. The remaining promotion work is empirical/correctness-hardening, not an unresolved mathematical portal exception.

Production should nevertheless remain unchanged until the branch-atlas refresh and matched-work A/B below complete because a sound prune can still perturb a budget-limited search and lose solves through survivor/order effects.

## 2. Shadow helper representation drift found and repaired

The shadow/oracle helper in `scripts/stress/lib/mc-neighbor-budget.mjs` still addressed `prep.staticNeighborKeys` as `mcKey * 4`. Production migrated that table away from packed-key indexing on 2026-08-23 and then to direct row-major dense indexing on 2026-08-25. Current production correctly uses:

```text
denseIndex(mcKey, prep.gridW) * 4
```

For a must-cross cell below row zero, the stale helper could otherwise index far outside the dense adjacency array and silently inspect `undefined` slots.

The helper is repaired in this branch and receives targeted tests covering:

- a must-cross cell away from row zero, so packed-key indexing cannot accidentally pass;
- portal-bearing evaluation, removing the old blanket abstention;
- the current-position exemption on a portal-terminal neighbour.

The historical 5,518-branch atlas result in [`2026-08-08-mc-neighbor-budget-propagation.md`](2026-08-08-mc-neighbor-budget-propagation.md) predates the dense migration and is therefore not invalidated. The defect matters for **new reruns after the representation change**, exactly the refresh now required by the portal gate.

## 3. Ordinary connectivity volume: portal derivation closes

The volume rejection is:

```text
freshVolume + intNeeded < rSteps
```

where `rSteps = requiredLength - getRealLengthFromState(state)` and counted real length is `path.length - 1 - portalJumps`.

For any valid continuation:

1. exactly `rSteps` additional counted/cardinal moves must occur;
2. at most `intNeeded` of those counted moves can land on previously visited non-exempt cells without exceeding the required intersection total;
3. therefore at least `rSteps - intNeeded` counted-move landings must be fresh cells;
4. every such landing must lie in the flood fill's reachable fresh set.

Portal jumps do not invalidate the inequality. A jump spends zero counted length but may occupy an additional fresh cell. Ignoring that extra consumption makes `freshVolume` more generous relative to the counted steps still required. The flood fill also traverses portal edges as reachability edges and otherwise deliberately over-approximates legal continuation. Both effects weaken the prune rather than make it unsound.

The current implementation counts `pos` in `freshVolume` even when it is not fresh; that is another one-cell relaxation in the safe direction.

This derivation agrees with the already-completed stored-solution screen: 266,320 valid paths and 21.8M prefix states with zero rejections when the ordinary portal gate was removed.

### False-goal trigger-search mirror

`isConnectedForFalseGoalTriggerSearch` uses the same volume inequality but a stricter `maxVisit=1` reachability fill and omits goal reachability because any valid endpoint is being enumerated.

The portal part of the volume proof carries over unchanged. The stricter visit threshold does not depend on portals: a non-current ordinary cell already visited twice has consumed both entry axes under current move validation and cannot be entered again; a visited portal terminal is also non-reenterable; the current position is seeded into the flood fill unconditionally. The flood fill still over-approximates forced portal movement rather than under-approximating it.

Because a completed false-goal enumeration can turn *absence* into an editor-facing `untriggerable` conclusion, keep the mirror's empirical gate separate despite the derivation. Before enabling its portal volume rejection, replay known triggerable portal endpoints / retained valid paths or run a control-vs-treatment enumeration differential and require zero lost triggerable cells on every completed comparison.

## 4. Same-parity portal levels preserve ordinary parity

Every counted cardinal step flips cell parity. A portal jump contributes zero counted length and changes parity exactly when its two terminals have opposite cell parity. Consequently, if **every portal pair is same-parity**, portal jumps add zero parity flips and the ordinary invariant survives unchanged:

```text
currentParity XOR goalParity XOR (remainingCountedSteps & 1) == 0
```

This is not a new theory in the repository. `isParityCompatibleEndpoint` already ships the same argument for false-goal triggerability: it treats any opposite-parity portal pair as making both endpoint parities possible, and otherwise applies the ordinary gate/length parity invariant.

The current whole-population census finds 21 of 954 portal-bearing Corpus-2 levels with zero twist pairs, 9 currently production-solved. This remains a bounded correctness/coverage cleanup, not a standalone solve-rate experiment.

Recommended implementation gate:

- reuse `prep.parityPortalDistMaps.length === 0` as the O(1) search-time proof that no twist pair exists; `prepLevel` always initializes this list and records only opposite-parity pairs;
- allow ordinary `PRUNE_PARITY` on those levels;
- allow `getActiveGates` to parity-filter gates when all portal pairs are same-parity;
- add unit cases for same-parity portals (filter/reject exactly as portal-free) and a twist portal (retain current conservative behaviour);
- run published regression plus stored valid-path differential. A separate 21-level solve-rate A/B is not justified.

## 5. Frozen experiment contracts

The next large runs should not choose populations after seeing treatment results. Use deterministic structural predicates over the frozen source rather than hand-selected ID lists.

Frozen Corpus-2 source:

- `data/stress/stress-levels-random.json`
- source hash already recorded by the portal exposure artifact: `sha256:89cd0b6380a6d585e43411139a0805078e78f883d02f37e7ae3513f4be55b414`
- baseline production boundary: 975/1,700, solver commit `045bbe904a567929ef4ed3aeeded110bd13b5491`, `workBudget=67,000,000`

### 5.1 Must-cross neighbour-budget portal A/B

Population predicate: `portalPairs > 0 && mustCross.length > 0` over the frozen corpus. Expected size from the committed census: **530**.

Control: current production portal carve-out.

Treatment: identical solver except `PRUNE_MC_NEIGHBOR_BUDGET` may evaluate on portal levels; preserve the stochastic-repair caller opt-out already required by the 2026-08-11 integration.

Before the population run:

1. rerun the corrected shadow/oracle branch atlas with portal cases included;
2. require zero alive-labelled false rejections;
3. run the stored-solution/differential suite with the portal treatment.

Population gate:

- identical total `workBudget` and scheduler envelope;
- no attempt errors/deadline censoring imbalance;
- referee-valid treatment gains;
- enumerate every gain and loss;
- published-corpus regression unchanged;
- prefer promotion only on positive net solves, or a material work reduction with zero solve loss. If churn exists, diagnose it as search/allocation coupling rather than weakening the soundness conclusion without a counterexample.

### 5.2 Connectivity-volume portal A/B

Population predicate: `portalPairs > 0`. Expected size: **954**.

Control: current volume carve-out.

Treatment: ordinary `isConnected` volume inequality enabled on portals; do **not** silently include the false-goal mirror in the same treatment.

Gate:

- same total `workBudget`;
- zero stored-path/differential soundness failures;
- gains/losses and aggregate `workSpent` reported;
- published regression unchanged;
- positive net solves or material work saving with zero solve loss.

The false-goal mirror is a separate correctness treatment and should be merged only after its triggerable-endpoint differential is clean.

### 5.3 Portal-aware coarse-state merge A/B

Population predicate: `portalPairs > 0`. Expected size: **954**.

Control: current no-merge portal behaviour.

Treatment: portal-aware coarse-state tuple as specified by the portal catalog, under exactly the same total work envelope.

Because this deliberately changes survivor identity, not merely pruning, the report must include per-level gains/losses, stage/work participation, rare/specialist retention, and referee validation. Do not combine it with either prune restoration.

### 5.4 Same-parity parity cleanup

Population predicate: `portalPairs > 0 && twistPairs === 0`. Expected size: **21**.

Use this population for differential/regression checking, not for a stand-alone solve-rate claim.

## 6. Post-restoration refresh contract

If either must-cross portal propagation or portal-aware coarse-state merge lands, the current ladder attribution becomes stale because two named retry tiers cease to be flag-inert on portal levels. Before WS2B repricing or interpreting the triple-overlap residue:

1. rerun the production Corpus-2 boundary with lifecycle telemetry;
2. rebuild the portal-carveout exposure artifact;
3. regenerate the level-capability/isolated-technique map if search-policy changes alter the relevant technique configurations;
4. recompute portal vs portal-free solve/miss counts and isolated multiplicity;
5. recompute the intersection + must-cross + multi-portal cohort and classify its remaining misses;
6. recompute stage `workSpent`, stage participation, and winning-action attribution before pricing any additive tier;
7. recompute the 122-miss isolated-winner residue rather than carrying forward its old 45/77 exposure split.

Only after that refresh should new joint-obligation propagation or broad scheduler repricing be interpreted against the new production boundary.

## Disposition

Direct analysis has reduced the first restoration tranche to narrower implementation/measurement jobs:

- **MC neighbour budget:** derivation closed; shadow helper repaired; corrected portal atlas + differential + matched-work A/B remain.
- **Ordinary connectivity volume:** derivation and large stored-path first screen closed; matched-work portal A/B remains.
- **False-goal connectivity mirror:** derivation supports restoration, but a separate triggerability differential remains because completed enumeration certifies absence.
- **Same-parity parity:** derivation closed and independently mirrored by shipped false-goal parity logic; small implementation/regression task remains.
- **Portal-aware beam coarse-state merge:** still requires source implementation and fixed-work measurement; no further paper analysis is blocking it.
