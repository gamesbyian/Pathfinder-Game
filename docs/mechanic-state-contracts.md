# Mechanic state contracts

Every Pathfinder mechanic whose behavior depends on path history is documented here as a
`MechanicStateContract` (the shape proposed in
[`solver-aware-game-architecture.md`](solver-aware-game-architecture.md)'s "Opportunity: first-class
dynamic mechanic contracts"). This is documentation, not runtime machinery — no new types or code
ship with it. Its job is to make the tribal knowledge explicit *before* the next cross-file
assumption mismatch, in the spirit of the incident that motivated it: the beam-dedup bit-packing
overflow, where a mechanic's assumed cardinality (≤4) was silently raised elsewhere (to 8) with no
single place recording that the raise invalidated a downstream assumption (see
`docs/solver-aware-game-architecture.md`'s own writeup of that bug).

```ts
interface MechanicStateContract {
  stateShape: 'none' | 'per-cell' | 'per-object' | 'per-object+substate' | 'global';
  stateCardinality: number | 'unbounded';
  monotonic: boolean;
  affectsMoveLegality: boolean;
  affectsConnectivity: boolean;
  affectsWinState: boolean;
  requiresIncomingDirection: boolean;
  externalModelSupport: 'exact' | 'relaxed' | 'unsupported';
}
```

Field definitions, since several are easy to read as something narrower than intended:

- **`affectsMoveLegality`** — does the mechanic ever make an otherwise-geometrically-legal move
  illegal (a hard, hot-path rule, checked as the move is proposed)? A mechanic can be pruning-only
  (rejects a move as *provably leading to failure*, e.g. `mustTurnDeadlocked`) without being a hard
  legality rule — both are called out separately below where the distinction matters.
- **`affectsConnectivity`** — does satisfying/updating the mechanic ever remove a graph edge that
  was available a moment earlier (as opposed to only gating whether the *current* move is legal)?
- **`requiresIncomingDirection`** — does correctly updating or checking the mechanic's state need
  more than the current move's own axis — specifically, does it need to know how the path *arrived*
  at the current cell (the entry axis, or whether the arriving move was a portal jump)?
- **`externalModelSupport`** — can an external model (CP-SAT, the shadow-eval harness's reasoners,
  a future oracle) encode this mechanic exactly with a straightforward per-node/per-edge variable,
  or does exactness require extra machinery (`relaxed` = a naive encoding is unsound unless that
  extra machinery is added; `unsupported` = no known straightforward encoding)?

## Summary table

| Mechanic | State shape | Cardinality (bound, where assumed) | Monotonic | Affects move legality | Affects connectivity | Affects win state | Needs incoming direction | External model support |
|---|---|---|---|---|---|---|---|---|
| **Edge-usage** (per-cell-per-axis single use) | per-cell (2 bits: H used, V used) | grid size, up to 15×15 = 225 cells (`Uint8Array(KEY_SPACE)`, no `(1<<n)-1`-style mask risk — one byte per cell, not one bit per mechanic instance) | yes (bits only set) | **yes** — hard rule, an axis already used at a cell can't be re-entered/re-exited on that axis | yes | no directly (feeds must-cross/must-turn checks, not itself checked at goal) | yes (need entry axis to know if you're "turning") | exact (standard edge-disjointness-per-axis constraint) |
| **Visited-count / intersection** | per-cell (count) | grid size | yes (count-only-increases) | no (visiting twice is legal; it's *counted*, not blocked) | no | yes (`reqInt` exact match) | no | exact |
| **Must-pass** | per-object (1 bit: visited-at-least-once) | **4** (`data/levels.json`'s documented max; `mpVisitedMask`/`initialMustMask` use `(1 << mpN) - 1`, structurally safe only through 30 objects — the formula itself misfires starting at 31, not 32, since `1 << 31` is JS's int32 sign bit, not +2^31 — see Cardinality risk below) | yes | no | no | yes | no | exact — safely memoizable on `(pos, mpVisitedMask)` alone (CLAUDE.md's memoization gotcha confirms this is sound, unlike must-cross below) |
| **Must-cross** | per-object **with substate** (visit count 0/1/2+, *and which axis the 1st crossing used*) | **4** (documented max; `initialMustCrossMask` uses the same `(1 << mcN) - 1`, same n=31 breaking point) | mostly (count only increases) but the *lock* state is not collapsible to a count — see below | **yes** — the must-cross lock (turning at a 1st-pass cell would spend both axis bits, permanently blocking the required 2nd crossing) | yes (post-lock, some exits become illegal) | yes (≥2 visits) | **yes** (lock depends on 1st-crossing axis, not just count) | **relaxed by default** — a CP-SAT model encoding only "visited ≥ 2 times" is unsound (silently permits the game rejects); the lock needs its own per-visit-axis auxiliary constraint. This is exactly the mechanic that shipped **unenforced in live play** until 2026-08-06 (Section 1/1b of `reports/2026-08-06-game-rules-solver-alignment-plan.md`) — a real instance of "relaxed" reaching production by accident, not hypothetically |
| **Regular filter** | none (fully static) | n/a — precomputed into `staticNeighborKeys`, never touches dynamic state | n/a | yes, but statically (precompiled, not a per-move check) | yes, statically | no | no (checked from the move's own axis, no path history) | exact (structural: remove wrong-axis edges from the graph up front) |
| **Flipping filter** | **global** (shared crossing-order parity) + per-object (1 bit: used-once) | **4** (documented max flipping filters; `flipperIndexMap` is `Int8Array` "index+1, 0=absent"; `flipperUsedMask` uses `1 << _fi`, same n=31 breaking point) | used-bits monotonic; the *parity* is not "monotonic" in the usual sense — it's `popcount(flipperUsedMask) % 2`, i.e. fully **derived** from the used-mask, not independent state (worth noting: nothing needs to track it separately) | **yes** — current legal axis of every still-unused flipper depends on this one shared counter | yes, dynamically, board-wide (crossing filter A can change what's legal at not-yet-visited filter B) | no (crossing is optional, not a win requirement — unlike must-cross) | yes (can't turn while ON a flipper; single-use also needs entry-axis tracking) | **unsupported/relaxed for naive encodings** — the effective axis of an unused flipper is a function of *global path history across every flipper on the board*, not of anything local to that cell; an external model needs an explicit ordering/parity variable shared across all flipper terminals to stay exact. See CLAUDE.md's flipping-filter table row for the full mechanic description and the design-owner's confirmation (2026-08-06) that this global coupling is intentional, not incidental complexity |
| **Portal** | per-object (per terminal: used-once bit) + 1 global-ish bit (`lastWasPortalJump`, to prevent instant bounce-back) | **3 pairs / 6 keys** (documented max) | yes (terminal used-once is monotonic) | **yes** — forces the move, bypassing static adjacency entirely | yes (zero-cost edge; one-time-use) | no direct win check, but portal jumps subtract from counted length (`reqLen` accounting) | yes (needs to know whether the *arriving* move was itself a portal jump, to avoid infinite forced bounce) | exact (paired zero-cost edges + a visited-once constraint per terminal is a standard shortest-path formulation) |
| **Gate** (re-entry ban) | none (fully static) | n/a — every gate, not just the active one, is excluded from `staticNeighborKeys`' TARGET side unconditionally | n/a | yes, but statically (no per-path tracking needed — a gate cell can never legally be a move target, full stop) | yes, statically | no | no | exact (structural: remove gate cells from valid targets up front) |
| **Goose / false goal** | none (fully static, for the solver) | n/a — solver treats both as structurally impassable, same bucket as blocks (`isStructurallyImpassable`); PLAY mode's hazard-trigger behavior is a separate, solver-irrelevant concern (`MoveContext.SOLVER` skips it) | n/a | no *(for the solver's search space — never a candidate move at all, not a rule that rejects one)* | yes, statically (excluded from the graph) | no (never on an accepted path) | no | exact for the solver's own scope; PLAY's hazard-trigger semantics are out of scope for any solver-facing model by design |
| **Surround** | per-object **with substate** (remaining-unvisited bitmask over up to 8 neighbor slots) | **undocumented** — no stated design maximum on surround-landmark *count* (unlike must-pass/must-cross's documented 4); `initialSurroundMask` uses the same `(1 << snN) - 1` 31-cap. See Cardinality risk below | yes (remaining-neighbor bits only clear) | no (the landmark cell itself is statically impassable; visiting its neighbors is unrestricted) | no | yes (`surroundMask === 0`) | no | exact, modulo needing one boolean-visited variable per (landmark, neighbor) pair rather than per landmark |
| **Must-turn** | per-object (1 bit: turned-in-required-direction-at-some-visit) | **undocumented count max** (same n=31 breaking-point risk as surround) | yes | soft — `mustTurnDeadlocked` prunes a move that would provably foreclose ever satisfying it (both axes already used at the cell), but does not hard-block moves the way must-cross-lock does | no directly (the deadlock check is a forward-looking prune, not an edge removal) | yes | **yes** (turn direction is a 3-point geometry test: entry axis vs. exit axis) | relaxed — needs a per-visit turn-chirality variable, not just a visited flag; straightforward once modeled but not a bare "visited" indicator |
| **Adjacent-turn** | per-object (1 bit: satisfied by a turn at ANY of up to 8 neighbor cells) | **undocumented count max** (same n=31 breaking-point risk) | yes | no (the landmark itself is impassable/static; its neighbor cells carry no extra movement restriction) | no | yes | yes (same turn-chirality test, evaluated at each neighbor) | relaxed, same reason as must-turn, plus an OR across up to 8 candidate cells |
| **Decorative landmark** | none (fully static) | n/a — folds straight into the block set at parse time | n/a | yes, statically | yes, statically | no | no | exact (it's just a block) |

## Cardinality risk: the `(1 << n) - 1` pattern

`prep.ts` builds five different initial bitmasks the same way — `initialMustMask`,
`initialMustCrossMask`, `initialSurroundMask`, `initialAdjTurnMask`, `initialMustTurnMask` — all
`(1 << n) - 1` where `n` is that mechanic's object count on the level. This is **not** a `n = 32`
wraparound story: `<<`'s shift amount is mod 32, but the break happens one object earlier, at
`n = 31`, because `1 << 31` is JS's int32 *sign bit* (`-2147483648`), not `+2^31` — the intended
all-ones value only comes out right if `1 << n` stays a positive, ordinary-arithmetic number, which
requires `n ≤ 30`. Verified directly: `(1 << 30) - 1 === 2**30 - 1` (true), `(1 << 31) - 1 ===
2**31 - 1` (**false** — evaluates to `-2147483649`). So the real safe bound is **30 objects**, one
lower than the "31-bit mask" intuition suggests. The comment on `flipperUsedMask` in
`search-state.ts` and the `Int8Array` "index+1, 0=absent" encoding on `mustPassIndex`/
`mustCrossIndex`/`flipperIndexMap` (see CLAUDE.md's "index + 1, 0 = absent" gotcha) are the same
family of bound-encoding assumption, just for a different axis of the same problem (element
*identity* rather than element *count*).

This was not a hypothetical: must-pass and must-cross were safe only because a **documented**
design maximum (4 each, from `data/levels.json`'s own authored corpus and the in-envelope stratum's
caps) sits far under 30, and both stress-corpus generators respect it. **Surround, must-turn, and
adjacent-turn had no equivalent documented maximum anywhere** — nothing stopped a procedurally-
generated or hand-authored level from placing, say, 40 surround landmarks, at which point
`initialSurroundMask` would have silently miscomputed and every downstream `surroundMask`-gated
check (win condition, `surroundLowerBound` pruning, scoring) would have operated on a wrong initial
value. No generator produced landmark-heavy levels at that scale — this was a **latent** gap, not a
reproduced bug — but it was exactly the shape of gap the beam-dedup incident already demonstrated
turns into a real one when a generator's cap changes without a corresponding cap check elsewhere.

**Fixed (2026-08-06):** `validateRawLevel` (`modules/domain/level-schema.ts`) now rejects any raw
level whose `mustPass`, `mustCross`, or landmark-derived surround/mustTurn/adjacentTurn count
exceeds 30 — the hard schema gate every level passes through regardless of authoring path (editor
export, hand-written JSON, stress-test generation, Firestore import), the same enforcement point
already used for the square-grid and cell-occupancy invariants. This closes the gap at the level of
"can a bad level ever reach `prep.ts`" rather than patching `prep.ts` itself, matching how the
other absolute invariants in this codebase are enforced. A level legitimately needing more than 30
of one mechanic would require migrating that mechanic's mask to a `bigint` or a typed-array-backed
bitset — not attempted, since no real level or generator needs it; the schema check exists so that
day arrives as a loud validation error instead of a silent wrong answer.

## Why this exists instead of a runtime `MechanicStateContract[]`

Every fact above is already true of the code; formalizing it as a running type would mean keeping a
second source of truth in sync with `prep.ts`/`search-state.ts`/`lower-bounds.ts` by hand, with no
compiler check that the two agree — the same failure shape as the doc comment that was wrong for
years about `mustPassIndex`'s "-1 if absent" encoding (CLAUDE.md's own gotcha entry). A markdown
table can be wrong too, but it doesn't pretend to be enforced, so nobody mistakes "documented" for
"guaranteed." If a future change wants machine enforcement of a specific row (most plausibly the
cardinality risk above), add a targeted assertion at the one or two real read sites — not a
parallel declarative schema for all thirteen mechanics at once.
