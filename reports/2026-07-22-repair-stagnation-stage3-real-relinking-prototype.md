# Repair-stagnation escape plan, Stage 3-real: reversible-operator path relinking (2026-07-22)

## What this is

The genuine reversible-operator path relinking the plan repeatedly flags as "a real, separate piece
of work" beyond Stage 3's soft recombination approximation. **Verdict: built, verified sound, and
measured — it does NOT help on the sample (zero solves, zero bestBadness change), for a clean,
diagnosed reason. Notably it *underperforms* the soft approximation it was meant to improve on.**
Kept default-off. A well-supported negative result, plus a non-obvious finding about why exact
segment transplantation fails on this problem.

## The operator (and why it's sound)

`relinkPaths(base, guide)` — an **anchor-splice** reversible operator. For a cell shared by both
paths (`base[i] == guide[j]`, the anchor), it builds `base[0..i]` and then **copies the guide's exact
suffix** `guide[j+1..end]` move by move. The set of anchors is the relinking trajectory between the
two elites; the caller runs it **bidirectionally** (base→guide and guide→base) on each stagnation
trigger, pairing the best elite with its most-**complementary** partner (complementarity over the
pending mp/mc/surround/mustTurn/adjTurn masks, structural distance as tiebreak).

Soundness is by construction, not by a new proof: every copied guide move is re-applied through the
**same `getNeighbors`/`applyMove`/`evaluatePrunedMove` gauntlet** the rest of the search uses, so a
recombination that would be illegal under the base's (different) prefix state simply dead-ends at the
first illegal move, and only an `isSolutionState` verdict is ever returned as solved. This is exactly
the plan's "verify no illegal intermediate that only isSolutionState would catch" requirement. A
direct unit test confirms both halves: it reconstructs a valid recombined solution at a shared
anchor, and returns unsolved (never a false positive) when no anchor recombination completes. The
recombined *intermediates* (the trajectory) are fed back into the elite pool as new search material —
the actual point of relinking, not a single lucky full copy.

Gated by an opt-in `enableRelink` param, default off ⇒ byte-identical to the pre-Stage-3-real path
(unit-tested), same rationale as the other prototypes.

## Result: zero effect, and the instrumented reason

Equal-work A/B (deterministic 3,000,000-node budget, gate 0, OFF vs ON) over the Stage 1 sample:
**every level identical — solved 1/16 both, bestBadness Δ0 on all 16.** Both with and without
feeding intermediates back into the pool.

This is not a wiring no-op — `PF_RELINK_DEBUG=1` on R02279 shows relink firing on every stagnation
(20 times/run), each call spending ~800 nodes across its anchors. The diagnosis is in the numbers:

```
[relink] nodes=794 bestIntermediate=19 poolWorst=20 poolBest=19 beatsPool=true
[relink] nodes=806 bestIntermediate=19 poolWorst=20 poolBest=19 beatsPool=true   (×20)
```

**The best recombined intermediate is badness 19 — exactly tying the pool's best, never beating it.**
`beatsPool=true` only means it beats the *worst* elite (20), so it displaces a 20 with a 19 — but the
pool already holds a 19, so `bestBadnessEver` never moves. Relinking reconstructs base-quality
fragments and cannot exceed the base it started from.

## Why exact segment transplantation fails here (the real finding)

The append-only legality constraint is not just a *construction* limitation (which the plan already
named) — it actively defeats *exact copying*:

- The guide's suffix `guide[j+1..end]` was legal under the **guide's** prefix state (its own visited
  cells, intersection count, portal usage, mask state). Spliced onto the **base's** prefix, that
  suffix hits a different state almost immediately — a cell the base already visited (illegal revisit
  / wrong intersection count), a portal the base already consumed, a length/parity mismatch — and the
  gauntlet correctly dead-ends the copy within a few moves. So the "good part" of the guide, the
  reason it was chosen, becomes illegal before it can contribute.
- Because the base is `elites[0]` (already the pool's best), and the recombination can only *degrade*
  from there (a truncated guide suffix on a good prefix), the intermediates inherit the base's
  badness as a floor and never improve on it.

**The non-obvious consequence: the "weaker approximation" beats the "real operator."** Stage 3's soft
recombination (guide-biased *random* construction) solved R02239; this exact-copy operator solves
nothing. Randomness is precisely what lets the soft version escape the legality trap — it explores
*new legal paths near* the guide's structure, while rigid copying is confined to legal *prefixes of
the guide's actual suffix*, which collapse. On this problem, a soft attraction toward good structure
is more useful than the ability to transplant it verbatim.

## Verification

- Unit tests (`repair-search.test.ts`, 28/28): direct `relinkPaths` operator (reconstructs a valid
  recombined solution at a shared anchor; no false positive when none completes), soundness
  (`enableRelink=true` returns only `isSolutionState`-valid paths), determinism, and
  `enableRelink=false` byte-identical to omitting it.
- `npm run solver:bench -- --check`: 160/160, no regressions (production default = flag off = inert,
  despite the `considerElite` refactor and elite-object changes).
- `tsc`/`eslint` clean.

## Recommendation

Reversible-operator relinking via **exact** segment copy is a dead end for this problem, for the
structural reason above — not a tuning gap. Do not pursue exact-copy variants (more anchors, more
pairs, worse-base selection all inherit the same legality-collapse floor). The two directions that
remain live are unchanged from the Stage 3 report, and this result sharpens the first:

1. **Selective, turn-aware cell biasing shared by Stage 2 and Stage 3-soft** is now the single most
   promising lever: the soft mechanisms are the ones that actually move the needle (Stage 3-soft
   solved a level), and their one weakness is cell-identity bluntness, which Stage 1's richer
   features address. The exact operator's failure is evidence *for* softness, not against it.
2. If a structural (non-soft) recombination is still wanted, it must **re-repair after the copy
   collapses** rather than stop — i.e. splice base prefix, copy the guide suffix as far as it stays
   legal, then hand off to ordinary guide-biased repair construction for the rest. But that is just
   Stage 3-soft with a warm start, so it should be built as an extension of the soft path, not a
   separate exact operator.

## Caveats

16 levels, single gate, one node budget, endpoint bestBadness. The `PF_RELINK_DEBUG` trace is one
level (R02279) but the A/B's uniform Δ0 across all 16 shows the "intermediates can't beat the base"
behavior is not level-specific. `RELINK_MAX_ANCHORS`/`RELINK_NODE_BUDGET` and the stagnation trigger
are unmeasured starting values, but the failure is structural (legality collapse of exact copies),
not a budget/frequency artifact — more anchors or a bigger budget copy the same illegal suffixes.
