# Portal-parity envelope: census clean, prune built opt-in (2026-08-08)

> **Status:** concluded-negative
> **Last evidence:** 2026-08-11 — cross-link reconciliation with the dynamic must-cross frontier
> **Decision:** keep `PRUNE_PORTAL_PARITY_ENVELOPE` opt-in/default-off; the existence-only parity condition is sound but negligible on the measured population
> **Remaining gate:** none for this parity shape; reopen only with a materially tighter parity argument or new population evidence

## Context

`docs/solver-heuristic-capability-gap-analysis.md`'s former gap #1 ("Portal parity: guidance without
inference"): the existing `PRUNE_PARITY` check in `prune-gauntlet.ts` rejects a state whose
current-cell parity can't reach the goal in the remaining exact step count — but it's gated on
`level.portalMap.size === 0` and never fires on portal levels at all. A portal's free (zero-length)
jump can inject an extra parity flip if its two terminals have mismatched cell parity (a "twist"
portal — already identified per-level in `prep.ts`'s `parityPortalDistMaps`, used only for soft
scoring/guidance today, never pruning). `trap-search.ts`'s `isParityReachableEndpoint` already uses
this exact reasoning, but STATICALLY (any twist portal anywhere on the level makes both parities
reachable for the level as a whole — a level-wide question, no per-state budget/reachability
check needed). The genuinely new piece tested here was the DYNAMIC per-search-state extension: at a
specific node with `rSteps` remaining, is a naive parity mismatch actually fatal, given which twist
portals the path has already consumed?

The capability doc's prescribed methodology was **stored-solution census first, then a shadow
probe, never start with a hard prune.** This report covers the census (decisively clean) and the
resulting opt-in prune built from it; the shadow-probe stage was subsumed by directly A/B-testing
the built prune's own soundness against real search, since the census's zero-violation result across
three real corpora already gave strong confidence and the A/B exercises actual off-solution search
states.

## Stage 0: stored-solution census

Built `scripts/stress/portal-parity-census.mjs`: replays every stored (referee-valid) solution on
every level with ≥1 twist portal pair, testing the conjecture **"if the naive portal-free parity
check would reject a step, at least one twist portal pair must still be unconsumed at that point on
the real solution's own path."** A genuine gap surfaced on the first run: naively deriving
"unconsumed" from raw `state.visited` counts produced 8 false violations, all traced to the same
mechanism — arriving at a portal terminal (forced to jump on the very next move, per the game's own
rule that `getNeighbors()` returns only the destination from an un-jumped portal cell) already marks
that cell `visited=1`, prematurely counting the pair as "already used" a full step before the jump
that actually consumes it. Exactly why portal/state reasoning must replay real solver semantics
rather than infer use from coordinates alone.

Fixed by adopting the same shape the eventual production check needs: skip the parity evaluation
entirely whenever the position under test is itself any portal cell (transient/pass-through,
whether about to be forced into a jump or having just landed from one). At every other stable
position, both a pair's terminals are guaranteed `visited > 0` if it was ever actually used, since
entering either terminal forces landing at the other. With this fix:

| Corpus | Twist-portal levels checked | Mismatch checkpoints | Violations |
|---|---:|---:|---:|
| Published (`data/levels.json`) | 24 | 133 | **0** |
| Stress corpus-1 | 38 | 1,060 | **0** |
| Stress corpus-2 | 417 | 14,401 | **0** |
| **Total** | **479** | **15,594** | **0** |

Zero violations across all three real corpora, ~15,600 test points. Decisive confirmation of the
existence-only conjecture (ignoring reachability/budget entirely — a strictly safe, conservative
choice: skipping the reachability check can only under-prune, never mis-prune).

## Stage 1: the prune, built exactly as validated

`prune-gauntlet.ts`'s new `PRUNE_PORTAL_PARITY_ENVELOPE` block, immediately following the existing
`PRUNE_PARITY` check: on a portal level with ≥1 twist pair, skip whenever `next` is itself a portal
cell; otherwise reject a naive mismatch only if every twist pair already has both terminals visited.
Same `firstStep || blockSet.size >= 10` search-order gating as the existing portal-free check —
reusing the one already measured rather than inventing an independent threshold for portal levels,
since there's no evidence yet either way.

Ablation: `PRUNE_PORTAL_PARITY_ENVELOPE`, **opt-in** (`cfg && cfg.FLAG === true`, matching the
convention for a new, not-yet-production-validated mechanism). `tsc --noEmit` clean; full solver
test suite (290 tests) passes; `solver:bench --check` 160/160, no regressions, published-corpus
`nodesExpanded` byte-identical (51,959,647) — confirms the flag is a true no-op when unset.

## Validation: A/B against real search

`scripts/stress/portal-parity-envelope-ab.mjs`: full `Solver.solve()` ladder (not an isolated
attempt config, since this prune is shared by both `dfsFromGate` and repair's `takePly`), node-
budget-pinned at 6,000,000 nodes, non-binding wall clock, `disableExtraBudgetPasses: true`. Sample:
25 currently-unsolved + 15 currently-solved corpus-2 twist-portal levels (stratified sample from
the 417-level census population). **Caught and fixed a real methodology bug mid-run**: a sparse
`{PRUNE_PORTAL_PARITY_ENVELOPE: true/false}` ablation object made `normalizeAblationConfig`'s Proxy
read every *other* unset flag as `true` too — including the two other opt-in-only flags
(`STRATEGY_REPAIR_TURN_BIAS`, `STRATEGY_REPAIR_ELITE_PREFIX_DFS`), silently activating both in
every run regardless of their own default-off convention. Exactly the trap
`turnbias-churn-check.mjs`'s own header comment already documents; caught only because a known-
solved level (R02655) came back unsolved in both arms. Fixed by explicitly neutralizing both flags
in the ablation object, then re-ran clean.

**Result: 40/40 levels, zero flips, zero regressions — and zero node-count difference on every
single level, not just zero solved-count change.** Solved ON 7/40, solved OFF 7/40 (the gap
against the census's 15-solved stratification is a budget artifact: this A/B's 6,000,000-node
budget is far below the committed baseline's production 36,000,000-node ceiling, so several
levels that solve at the real budget don't at this one — expected and irrelevant to the A/B's own
internal comparison, which stays apples-to-apples on the same budget in both arms).

This is a stronger and cleaner null than the earlier surround/adjacent-turn reachability finding
(`reports/2026-08-07-surround-adjturn-reachability-null-result.md`), which at least moved
`nodesExpanded` by a tiny 0.0008%. Here, the prune's own reject condition (naive parity mismatch
AND every twist portal pair already consumed) simply never arose anywhere in this sample's search
trees — not on the 40 solution paths (expected, matches the census's 100% "twist portal always
available on-solution" finding) and, more informatively, not on any of the dead/off-solution
branches either, across roughly 240,000,000 total nodes searched (40 levels × 2 arms × up to
6,000,000 nodes). The scenario this prune targets — a state deep enough into a portal level that
every twist pair is already spent, with a parity mismatch still outstanding — is evidently rare
enough at this corpus's typical twist-pair counts (1-3 per level) that a state usually resolves,
gets pruned by an earlier check, or reaches the goal before ever exhausting every twist portal.

## Disposition

`PRUNE_PORTAL_PARITY_ENVELOPE` ships **opt-in, not promoted**. Sound (confirmed by both the
census and the live-search A/B: zero regressions, zero mis-prunes) but negligible on this sample.
Left in the codebase as a documented, validated, available-if-needed mechanism rather than reverted
outright, since it is fully opt-in and costs nothing when off.

This specific thread is **closed**. Do not repeat the same existence-only "mismatch + all twist
pairs consumed" experiment unless new evidence changes the population or supplies a materially
tighter necessary condition.

## Related but distinct: portal-local must-cross resource reasoning

The 2026-08-11 dynamic-resource work proposes a portal-related experiment that is **not a reopening
of portal parity**. `PRUNE_MC_NEIGHBOR_BUDGET` currently abstains on an entire level whenever any
portal exists. Its proof concerns forced revisits of required must-cross neighbours, not parity.
The open proposal is to re-derive whether that already-productive must-cross proof can abstain
**locally** around portal-affected required neighbours instead of globally because an unrelated
portal exists elsewhere.

Do not infer soundness from this parity report, and do not implement that proposal by simply
removing the neighbor-budget portal guard. It needs its own derivation, stored-solution replay,
shadow-harness score, and live A/B. See:

- [`2026-08-11-dynamic-resource-frontier-synthesis.md`](2026-08-11-dynamic-resource-frontier-synthesis.md)
  for the rationale and ordered gate;
- [`2026-08-08-mc-neighbor-budget-propagation.md`](2026-08-08-mc-neighbor-budget-propagation.md)
  for the proof whose coverage might be extended; and
- [`../docs/future-work.md`](../docs/future-work.md) for whether that experiment remains in the live
  queue.

## Historical reopen conditions for this parity shape

- A substantially denser twist-portal population or much deeper search could justify re-measuring
  the existence-only reject frequency, but the prior A/B's zero-difference-on-every-level result
  already meets the bar for a confident null at its measured scale.
- The `firstStep || blockSet.size >= 10` gating is inherited unmodified from the portal-free
  `PRUNE_PARITY` check's measured threshold. It was never independently validated for portal levels,
  but changing that gate is not worth pursuing unless a stronger parity condition first creates a
  material reject population.
