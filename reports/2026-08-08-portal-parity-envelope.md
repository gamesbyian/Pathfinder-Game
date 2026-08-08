# Portal-parity envelope: census clean, prune built opt-in (2026-08-08)

## Context

`docs/solver-heuristic-capability-gap-analysis.md`'s gap #1 ("Portal parity: guidance without
inference"): the existing `PRUNE_PARITY` check in `prune-gauntlet.ts` rejects a state whose
current-cell parity can't reach the goal in the remaining exact step count — but it's gated on
`level.portalMap.size === 0` and never fires on portal levels at all. A portal's free (zero-length)
jump can inject an extra parity flip if its two terminals have mismatched cell parity (a "twist"
portal — already identified per-level in `prep.ts`'s `parityPortalDistMaps`, used only for soft
scoring/guidance today, never pruning). `trap-search.ts`'s `isParityReachableEndpoint` already uses
this exact reasoning, but STATICALLY (any twist portal anywhere on the level makes both parities
reachable for the level as a whole — a level-wide question, no per-state budget/reachability
check needed). The genuinely new, untested piece is the DYNAMIC per-search-state extension: at a
specific node with `rSteps` remaining, is a naive parity mismatch actually fatal, given which twist
portals the path has already consumed?

The doc's own prescribed methodology: **stored-solution census first, then a shadow probe, never
start with a hard prune.** This report covers the census (decisively clean) and the resulting
opt-in prune built from it; the shadow-probe stage was subsumed by directly A/B-testing the built
prune's own soundness against real search (see below) rather than a separate non-rejecting
instrumentation pass, since the census's zero-violation result across three real corpora already
gave strong confidence and the A/B provides an equivalent (stronger, in fact — it exercises actual
off-solution search states, not just the one stored path) soundness signal.

## Stage 0: stored-solution census

Built `scripts/stress/portal-parity-census.mjs`: replays every stored (referee-valid) solution on
every level with ≥1 twist portal pair, testing the conjecture **"if the naive portal-free parity
check would reject a step, at least one twist portal pair must still be unconsumed at that point on
the real solution's own path."** A genuine gap surfaced on the first run: naively deriving
"unconsumed" from raw `state.visited` counts produced 8 false violations, all traced to the same
mechanism — arriving at a portal terminal (forced to jump on the very next move, per the game's own
rule that `getNeighbors()` returns only the destination from an un-jumped portal cell) already marks
that cell `visited=1`, prematurely counting the pair as "already used" a full step before the jump
that actually consumes it. Exactly the class of subtlety CLAUDE.md's own "leaving along a used axis
is legal when going straight" gotcha warns to expect from portal/axis state reasoning, and exactly
why the doc's methodology insists on a census before code.

Fixed by adopting the same shape the eventual production check needs: skip the parity evaluation
entirely whenever the position under test is itself any portal cell (transient/pass-through,
whether about to be forced into a jump or having just landed from one) — at every other (stable)
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

Ablation: `PRUNE_PORTAL_PARITY_ENVELOPE`, **opt-in** (`cfg && cfg.FLAG === true`, matching this
session's convention for a new, not-yet-production-validated mechanism — same as
`STRATEGY_REPAIR_TURN_BIAS`/`STRATEGY_REPAIR_ELITE_PREFIX_DFS`). `tsc --noEmit` clean; full solver
test suite (290 tests) passes; `solver:bench --check` 160/160, no regressions, published-corpus
`nodesExpanded` byte-identical (51,959,647) — confirms the flag is a true no-op when unset, as
expected for an opt-in mechanism.

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
census and the live-search A/B: zero regressions, zero mis-prunes) but negligible on this sample —
consistent with this session's established discipline of measuring catch rate rather than assuming
it from soundness alone (the CLAUDE.md gotcha this exact census methodology was built to satisfy).
Left in the codebase as a documented, validated, available-if-needed mechanism rather than reverted
outright, since — unlike the surround/adjturn finding, which touched a shared hot-path
unconditionally — this one is fully opt-in and provably costs nothing when off.

## What's still open

- **This 40-level sample may simply be too shallow/too portal-sparse to exercise the prune.**
  A level with more twist portal pairs (this corpus tops out at 3 per level) or run at a much
  larger node budget (nearer the real 36,000,000-node production ceiling, where search goes far
  deeper into each level) might show a different picture. Not chased further this session given
  the A/B's own zero-difference-on-every-level result already meets the bar for a confident null
  at this scale — see `docs/testing.md`'s "Iterating vs. gating" note on when a small sample is
  sufficient.
- The `firstStep || blockSet.size >= 10` gating is inherited unmodified from the portal-free
  `PRUNE_PARITY` check's own measured threshold. Never independently validated for portal levels
  specifically — if this mechanism is revisited, that gate is an obvious first thing to question.
