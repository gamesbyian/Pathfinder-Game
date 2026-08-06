# How common are exact level automorphisms, really? (2026-08-06)

`docs/solver-aware-game-architecture.md`'s ranked programme lists "audit symmetry prevalence —
measure exact automorphisms and duplicated root branches before implementing canonicalization" as
an open item. This is that measurement — a pure, read-only analysis, no solver or production code
touched.

## Method

Reuses the exact 8-element dihedral-group transform already used in production for the Play-mode
"Whoa" display-variant feature (`modules/domain/geometry.ts`'s `transformPoint`/`transformAxis`/
`transformTurnDir`) — the same 4 rotations + 4 reflections, applied here to check whether
transforming a level's *entire* object layout reproduces itself, rather than to remap a display.

For each level and each of the 7 non-identity variants: transform every coordinate-bearing object
(gates, goal, blocks, mustPass, mustCross, filters and their axis, flipping filters and their axis,
portals with endpoint-pair canonicalization, landmarks with turn direction, geese, false goals) and
compare the transformed multiset per category against the original. A variant is a genuine
automorphism only if *every* category matches exactly (`reqLen`/`reqInt` are automorphism-invariant
by construction — intrinsic to the whole level, not spatial — so they're not part of the check).

**Scope note**: this measures whole-level automorphisms and, specifically, whether one maps a gate
onto a *different* gate — the concrete, directly-actionable form of "duplicated root branch"
(the solver's per-gate ladder, `orchestration.ts`'s `activeGates`, would then provably explore two
structurally-identical subproblems as independent). It does **not** attempt the deeper question of
symmetric first-move branches below a single fixed-point gate (a level with 4-fold symmetry and one
centrally-placed gate could still have symmetric sub-branches within its own search tree) — that
would require walking solver internals rather than level data, and is a separate, harder-to-measure
question left open.

## Verification before trusting the result

Hand-checked two flagged levels before trusting the aggregate numbers:

- **P00001** (order 2): gates at (5,1)/(1,5), goal at (9,9), no other objects (1-indexed). The
  diagonal reflection swaps the two gates exactly and fixes the goal (on the diagonal) — a real,
  verifiable symmetry, not a false positive.
- **P00068** (order 4): gates at (3,5)/(7,5) on the horizontal midline, blocks at (5,3)/(5,7) on the
  vertical midline, goal at the exact grid center (5,5). The automorphism group found —
  {identity, horizontal mirror, vertical mirror, 180° rotation} (a Klein four-group) — is exactly
  right: the horizontal mirror swaps the two gates while fixing each block individually (and vice
  versa for the vertical mirror), and 90°/diagonal transforms are correctly excluded since they'd
  map a gate position onto a block position, breaking the invariance. This confirms the check
  correctly requires *every* object category to independently match, not just gates.

## Results

| corpus | levels | multi-gate | automorphism order distribution | levels with duplicated gate orbit |
|---|---|---|---|---|
| published | 160 | 54 (33.8%) | 1: 140, 2: 19, 4: 1 | **4 (2.5%)** |
| stress-corpus-1 | 102 | 2 | 1: 102 | 0 |
| stress-corpus-2 | 1,700 | 0 | 1: 1,700 | 0 |
| in-envelope | 200 | 0 | 1: 200 | 0 |

## Interpretation

Exact symmetry is essentially a **published-corpus-only phenomenon**. All three procedurally
generated populations (2,002 levels combined) have zero multi-gate levels at all in two of the
three, and *zero instances of any nontrivial automorphism* across all 2,002 — unsurprising, since
nothing about `generate.mjs`'s hypothesis-driven witness construction or `generate-random.mjs`'s
uniform-random witness walk has any reason to produce an exactly-symmetric layout by chance, and
`generate-random.mjs` never creates multi-gate levels at all (documented in its own file header).

Even within the one corpus where symmetry exists, it's rare: 20/160 published levels (12.5%) have
*any* nontrivial automorphism, and only 4/160 (2.5%) manifest it as the one concretely-actionable
shape — a duplicated gate root branch the solver's ladder would provably explore twice for no
reason. The other 16 symmetric levels have the symmetry present in their layout but either a single
gate (order-2/4 symmetry with the gate as a fixed point — not exploitable via this specific
mechanism) or the symmetry doesn't relate distinct gates to each other.

**The premise doesn't hold at solver-research scale.** Canonicalization machinery built to exploit
this would help at most 4 levels total, all in the published corpus (already human-curated,
presumably already solved), and provide zero benefit to either stress corpus or the in-envelope
stratum — the populations actually used to measure and improve solver capability. This is the same
shape of result as the forced-chain-length measurement and the region/separator shadow-mode
campaign: a real, verified, non-hypothetical phenomenon that exists, but too rare to be worth the
engineering investment its exploitation would require.

## Recommendation

**Deprioritize symmetry-based canonicalization.** Recorded as a settled negative result, in the
same class as this project's other closed research questions (transposition caching, static
forced-sequence macro transitions, the single-articulation pendant-chamber shape). Not re-proposed
without materially new evidence — and if it ever is, the open scope question above (symmetric
first-move branches below a single fixed-point gate, not just duplicated gates) is the more
promising angle to check first, since the duplicated-gate shape measured here is now closed.
