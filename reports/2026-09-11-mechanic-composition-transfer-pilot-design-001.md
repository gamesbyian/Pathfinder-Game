# Controlled mechanic-composition transfer pilot: design + first static check 001

> **Status:** design complete; one bounded static (zero-solver-compute) check executed and confirmed; full solver-side pilot not yet run
> **Last evidence:** 2026-09-11 — a concrete worked decoupling example on `R00726` (one of the 21 levels `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` already rescues), using the mechanism's own level-static predicate (`findStaticObligationClusters`, `scripts/stress/lib/joint-obligation-mc-portal.mjs`) with zero search compute.
> **Decision:** the new-premise map's Card A is executable with the existing single-portal-relocation edit primitive. A 1-cell relocation of one portal terminal cleanly removes exactly the targeted obligation cluster while leaving an unrelated second cluster on the same level untouched — confirming the edit is precisely scoped to the intended coupled-obligation boundary, not a confound. This derisks the full solver-side pilot; that pilot itself was not run this session (see "Not yet run" below).
> **Remaining gate:** run the actual solver-side matched-work observer/prune A/B on an original-vs-decoupled sibling pair (and, time permitting, the alternative-interface and slack contrasts) before claiming the premise resolved either way.
> **Evidence role:** design/prespecification, plus one zero-compute static confirmation. No production solver behavior changes; no new production data generated.

## Why now

`docs/solver-future-work.md` and the [`new-premise reopen map`](2026-09-11-new-premise-reopen-map-001.md)'s Card A mark controlled mechanic-composition transfer as the one deferred-generator-expansion question **already earned** by `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s promotion (+21/-0). This session's assignment names it as an active line (D). The map's own instruction: "Design and, if cheap enough, execute a small controlled family/generator pilot... The independent variable should be the semantic coupled-obligation boundary, not generic hardness."

## The mechanism, precisely

From `modules/solver/joint-obligation-propagation.ts` (`findObligationClusters`/`evaluateObligationClusters`) and its offline shadow (`scripts/stress/lib/joint-obligation-mc-portal.mjs`):

- A **candidate cluster** is level-static: a pending must-cross cell `mc` whose forced cardinal neighbor along some still-unused axis is itself a portal terminal. `findStaticObligationClusters(level, prep)` enumerates these with zero dynamic state — pure geometry.
- A cluster only fires (`reject`) dynamically when: the must-cross obligation on that axis is still open, the forced neighbor is not itself another pending must-cross cell (abstain case), and that specific portal terminal has **already been visited** — an unconditional rule (`search-state.ts`'s "each portal cell can only be visited once") that neither of the two older must-cross checks (`mustCrossForcedNeighborDeadlocked`, `mustCrossNeighborBudgetDeadlocked`) models.
- The whole must-cross obligation for a cell is satisfied by **any one successful crossing on any axis** (`state.mustCrossMask` clears per-cell, not per-axis-attempt) — so if a must-cross cell has an alternative, non-portal axis that stays viable, the portal-coupled axis's own fate may not matter in practice.

This gives exactly the new-premise map's four candidate contrasts, now grounded in the actual code:

1. **Forced-neighbor coupling (binary, cheapest to test):** is the must-cross cell's forced neighbor on some axis a portal terminal at all? Controlled by portal/must-cross *placement* — directly editable in level data.
2. **Alternative usable interface:** does the must-cross cell have another axis whose both neighbors stay legally enterable (not blocked, not the same portal), independent of the coupled axis? Controlled by whether the cell's other cardinal neighbors are blocks/walls vs. open.
3. **One unit of obligation slack:** not a per-cluster property in this code — the cluster's own logic has no slack/count parameter (a must-cross cell's crossing is binary: done or not). "Slack" here would have to mean the level's overall solvability margin (`requiredLength`/`requiredIntersections` headroom) rather than a cluster-local knob. Flagged as the weakest-defined of the four dimensions; see "Not yet run" below.
4. **Portal-terminal revisitability:** the single-visit rule is an *unconditional engine rule* (`search-state.ts`), not level data — this dimension cannot be expressed as a level/family transform at all without changing game mechanics. Out of scope for a data-only pilot; the new-premise map's own instruction ("prefer existing transforms... add portal-aware generation only for contrasts that cannot be represented otherwise") suggests this dimension, if it is ever tested, needs an explicit ablation flag rather than a generated variant.

## Static check executed: dimension 1 (decoupling)

Used `R00726` (frozen `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` gain, id from `data/stress/joint-obligation-mc-portal-ab-001-ids.txt`). `findStaticObligationClusters` on the unmodified level reports **two independent clusters**:

- must-cross cell (5,9), forced V-axis neighbor (5,10) — a portal terminal (paired with (5,5));
- must-cross cell (11,3), forced H-axis neighbor (12,3) — a different portal terminal (paired with (7,11)).

Edit: relocate the first cluster's portal terminal from (5,10) to (9,10) — a free cell, not adjacent to any must-cross cell in this level, chosen so the edit touches exactly one obligation cluster and no other object. The level still parses/prepares successfully (no landmark collision, `Solver.prepareLevelForSolver` accepts it).

**Result:** the edited level's cluster list drops to exactly the second, untouched cluster (`(11,3)/(12,3)/H`) — the targeted `(5,9)/(5,10)/V` cluster is gone, and the unrelated cluster is unaffected. This is the predicted flip, and its scoping to exactly the intended semantic boundary (not a confound touching unrelated structure) is itself informative: minimal single-portal-terminal relocation is a clean instrument for this contrast.

This required zero solver search — `findStaticObligationClusters` is a pure geometric function, so this check cost nothing beyond writing ~30 lines against existing plumbing (`scripts/stress/lib/joint-obligation-mc-portal.mjs`, unmodified).

## Prespecification for the full pilot (not yet run)

### Population and independent unit

Use existing `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`-population levels (the 219-level frozen opportunity set, `data/stress/joint-obligation-mc-portal-ab-001-ids.txt`) as base parents — they are already confirmed to carry at least one live cluster. Each edited sibling is a new, generated-identity variant of its parent; **parent is the independent unit**. Generated identity stays entirely outside production routing (per the map's comparator/independence contract).

### Contrasts to run (in order of cost/confidence)

1. **Decoupling (dimension 1):** for a small number of parents (start with 3-5), relocate exactly one cluster's portal terminal to a nearby free, non-adjacent-to-any-must-cross cell (as above). Predict: the joint-obligation observer's reject rate for that specific cluster drops to zero; if `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` was this parent's sole rescuing mechanism, the decoupled sibling should lose that rescue (revert toward the pre-promotion control behavior) under the same matched-work harness used for the original A/B.
2. **Alternative-interface addition/removal (dimension 2):** for a parent whose coupled must-cross cell currently has no other viable axis, open one blocked neighbor on a different axis (predict: cluster becomes moot, rescue effect should shrink or disappear even though the cluster itself still exists); for a parent that already has an alternative axis, block it (predict: the cluster becomes load-bearing, matching the original promotion's own selected population more closely).
3. **Slack (dimension 3):** deferred — needs a clearer operational definition than "obligation slack" gives in this code. Do not fund generation for this contrast until it is redefined as a concrete level-data lever (candidate: vary `requiredIntersections`/`requiredLength` headroom by ±1 on an otherwise-fixed decoupled/coupled pair, to ask whether the joint-obligation rescue's *value* depends on how little slack the rest of the level has).
4. **Portal revisitability (dimension 4):** do not attempt as a family/generator transform (see above). If ever tested, it needs a dedicated engine-level ablation flag, which is a different, larger-scope change than this pilot and is not requested by the current premise.

### Comparator / evidence contract

- Compare each edited sibling against its own unedited parent, not against the aggregate 219-level population.
- Observe first (`_jointObligationObserver`, no pruning) before touching `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s own reject path, mirroring the shadow-first rule.
- A full matched-work A/B (prune on/off) is only warranted if the observer-level applicability flip (cluster present/absent, or reject-rate materially changed) is confirmed first — the same staged discipline the original promotion used.
- Validate every edited level's referee-legality and connectivity did not silently break before drawing any conclusion from a solve/no-solve difference.

### Success / stop gates

- **Success:** the decoupled sibling's own reject rate and/or `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`'s A/B rescue status flips in the predicted direction, and this reproduces across the 3-5 parent sample (not just the single worked example above).
- **Stop:** if edited siblings do not track the coupled-obligation distinction (e.g., relocation changes solvability for unrelated reasons — broken connectivity, a differently-shaped bottleneck), or if the effect is confounded with generic difficulty change, do not escalate to a larger family campaign. This single mechanism-specific premise does not reopen broad generator/topology expansion regardless of outcome.

## What this report does not establish

- Whether the observer/prune-level flip actually changes real-search behavior (solve/no-solve, `workSpent`) — the static check only confirms the *level-static predicate* flips; the dynamic, matched-work solver-side pilot is the next earned step, not run here.
- Anything about dimensions 3 or 4, which remain open design questions rather than executed checks.
- Any production routing change — this entire line stays research/validation-only per the map's own "legal production path" note (a successful family program may eventually justify one generic state-derived propagation/check, not a per-level lookup).

## Artifacts

- No new committed script: reused `scripts/stress/lib/joint-obligation-mc-portal.mjs`'s existing `findStaticObligationClusters` unmodified, via a throwaway scratch driver (not committed — zero production/tooling footprint).
- Worked example: `R00726`, portal-terminal relocation (5,10)→(9,10), cluster count 2→1 (exactly the targeted cluster removed, the unrelated cluster preserved).
