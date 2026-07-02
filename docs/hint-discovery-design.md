# Hint-Discovery Systems — Design

Back-end tooling to **expand the hint corpus**: find as many genuinely-new valid solutions per level as
possible. This is offline, one-shot, batch machinery — it may be slow, memory-hungry, and brutish. It
does **not** ship to the browser and has no runtime budget. The output is validated paths appended to
`data/levels.json` through the existing pipeline; the in-game curation layer
([`hint-curation.md`](hint-curation.md)) then decides which of them a player ever sees.

> Status: design + measured feasibility prototypes (throwaway). Numbers below are from prototype runs
> on the current corpus; treat them as order-of-magnitude evidence, not committed benchmarks.

---

## 1. The reframing that unlocks everything

**Generation is decoupled from validation.** `modules/domain/path-validator.ts :: validateCandidatePath`
is a complete, pure, standalone referee for the entire win condition — gate start, move legality
(adjacency, portal forced-jumps, filter axes, gate-no-reentry, no edge reuse), goal end, exact length,
exact intersections, must-pass, must-cross, surround, must-turn, adjacent-turn. It accepts **any**
candidate path (keys or coords) and returns `{ok}` / `{reason}`.

So a discovery system does **not** need the production solver. It needs a path *generator* whose output
`validateCandidatePath` filters. The solver is just **one** generator — and a poor one for this purpose:

- `modules/solver/search.ts` is a **satisficing best-first DFS that returns the *first* solution and
  stops** (`return state.path.slice()` the instant it reaches an accepting goal). It is built to answer
  "is this level solvable, quickly," not "enumerate solutions."
- All current diversity (`scripts/hint-diversification.mjs`, `modules/solver/diversification.ts`) comes
  from **re-biasing that one greedy searcher** — forcing the first step per (gate × direction), forcing
  portal-exit directions, and ablating the heuristics/profiles so it converges on a *different* first
  solution. Diversity is therefore bounded by "what greedy DFS reaches first under some forced bias."
  Vast regions of the solution space are never *first* under any tried bias, so they're never found.

**Correctness rule for every system here:** the solver runs in `MoveContext.SOLVER`, which **ignores
geese and false goals**. Hints are played in `MoveContext.PLAY`. A path the solver accepts can walk
through a goose or false-goal cell and be **invalid in play**. Therefore **every candidate must be
gated on `validateCandidatePath` (PLAY context)** before it is accepted — never on the solver's
`isSolutionState` alone. (In prototypes the two agreed with zero disagreements, but only because the
sampled levels had no geese/false-goals; on levels that have them, this rule is load-bearing.)

---

## 2. Two regimes (measured)

A blind randomized enumerator (below) exposes a sharp split:

| Level | Constraints | Corpus | New solutions found (blind, ~1s) |
|---|---|---|---|
| L100 | open, reqInt 2 | 365 | **12,125** |
| L60 | open | 21 | 298 |
| L40 | open | 30 | 117 |
| L124 | 4 must-cross, reqInt 4 | 66 | **0** |
| L56 | portal + must-cross | 24 | **0** |

- **Open / loosely-constrained levels have an enormous untapped supply.** Blind sampling floods them.
- **Tightly-constrained levels yield nothing to blind sampling** — a random walk almost never satisfies
  opposite-side crossings *and* an exact intersection budget from scratch. These need generation that
  is **seeded from, or guided by, structure that already satisfies the hard constraints.**

That split is the design. Build a blind enumerator for the open regime and a seeded/guided generator for
the tight regime; run both on every level and keep whatever validates.

---

## 3. System A — Randomized-restart enumeration (open regime)

**Idea.** Reuse the solver's exact move machinery (`createState` / `getNeighbors` / `applyMove` /
`undoMove` from `modules/solver/search-state.ts` — these already encode portals, filters,
gate-no-reentry, edge-usage, and all the state masks) but change two things: **order children randomly**
and **continue past every solution** instead of returning. Each restart from a gate, with a fresh RNG
seed, walks a different corridor of the tree and yields a different clutch of solutions. Collect distinct
validated paths across many restarts × gates.

**Pruning.** Keep the *sound* prunes so restarts don't drown in dead ends: over-length, over-intersection
(both fundamental), goal-distance bound (`prep.goalDistArr`), and — to reach *moderately* constrained
levels — the same must-pass / must-cross / surround / adj-turn lower bounds and connectivity/parity
checks the production DFS uses (`modules/solver/lower-bounds.ts`, `topology.ts`). These are admissible:
they never prune a reachable solution, only hopeless branches.

**Prototype result.** With only length+distance pruning: L100 → 12,125 new, L60 → 298, L40 → 117 in
<1s each; L124/L56 → 0 (expected — needs System B). Adding the full prune suite raises the reach into
mid-constrained levels and cuts wasted nodes.

**Knobs:** restarts-per-gate, per-restart node budget, RNG seed range, prune set. Embarrassingly
parallel (independent seeds → shard across cores/processes). Deterministic per seed (reproducible).

**Where it stalls:** hard-constraint levels (System B), and near-Hamiltonian levels where almost every
node is forced (few random choices to make — but there the solution count is also tiny, so it matters
less).

---

## 4. System B — Seeded local search / mutation (tight regime, and everywhere)

The corpus we already have (~8,300 valid paths) is scaffolding that *already satisfies the hard
constraints*. Perturb it locally and let the referee accept the perturbations that stay valid.

### B1 — Prefix-anchored completion (proven)
Replay the first `K` moves of a known solution into the search state (so its visited/edge/constraint
masks reflect a real solution's early structure), then randomized-DFS the **remaining suffix** to the
goal at exact length. Sweep `K` across each seed's length, over a sample of seeds.

**Prototype result — exactly the levels blind sampling failed on:**

| Level | Corpus | New via prefix-anchor (~1s, 10 seeds) |
|---|---|---|
| L124 | 66 | **10,576** |
| L56 | 24 | 360 |
| L127 (4 must-cross) | 13 | 152 |
| L138 | 49 | 7,946 |
| L109 | 211 | 10,567 |

Zero validation disagreements (`validateCandidatePath` accepted every `isSolutionState` hit on these
levels). The hard early scaffolding is what makes tight levels tractable.

### B2 — Windowed segment resampling (general form)
Prefix-anchoring keeps a prefix and resamples everything after. The general operator keeps a **prefix and
a suffix** and resamples only a **middle window** `[i, j]`: replace `path[i..j]` with a different walk of
the same span-length from `path[i]` to `path[j]`. This preserves constraint satisfaction on *both* ends
and produces tighter, more local variety (and higher accept rates), because only the window has to
re-satisfy anything. Reconnection is a short bounded randomized DFS from `path[i]` that must land on
`path[j]` at exactly `j−i` steps. Sweep window position/width over seeds. (B1 is the special case
`j = end`.)

### B3 — Symmetry maps (free variety, when applicable)
If a level's grid + *all* constraint placements are invariant under a reflection/rotation, applying that
isometry to a known solution yields another valid solution — usually one that draws a visibly different
line. Detect the symmetry group of the level (cheap: test the 8 dihedral maps against block/gate/goal/
object sets), map every seed, validate, keep. Zero search. Only fires on symmetric levels but is nearly
free when it does.

### B4 — Crossover
Two known solutions that share a common cell `c` can be spliced at `c` (prefix of A + suffix of B). Most
splices break length/intersection budgets, but the referee is cheap and the candidate space is large;
worthwhile as a cheap secondary operator once a seed pool exists.

---

## 5. System C — Constraint-guided construction (order variety)

Targeted at the variety axes the curation layer specifically rewards but greedy search under-produces:
**must-pass / must-cross ordering** (see `hint-curation.md`).

Treat the required cells as **waypoints**. Enumerate orderings of the waypoints (`gate → w_{π(1)} → … →
goal`), and for each ordering stitch sub-walks between consecutive waypoints whose lengths sum to
`reqLen` (distribute the slack `reqLen − minimalTour` as detours/loops among segments, which is also
where intersections get placed). Each *ordering* is a different must-cross/must-pass order — precisely
the axis the curator wants and the greedy solver rarely varies. Meet-in-the-middle (BFS forward `L/2`
from the gate keyed by `(cell, constraint-mask)`, BFS backward from the goal, join on complementary
masks) makes the per-ordering stitch tractable on small grids; it is memory-hungry but "brutish is fine."

This is the least prototyped system; B1/B2 already surface *some* order variety incidentally (they flood
tight must-cross levels). C is the option if a specific level still lacks a particular ordering after
A+B.

---

## 6. The real bottleneck: diversity-directed acceptance

Raw discovery is not the hard part — it is trivially abundant (10k+ validated new paths per level per
second). **Dumping all of them into `levels.json` is the wrong move:** it bloats the file (already the
subject of the split in [`codebase-hardening-plan.md`](codebase-hardening-plan.md) §2) with thousands of
near-duplicates the curation layer will never show.

So the discovery harness must be **steered by the same variety model the curator uses**, keeping a new
path only when it **expands coverage or distinctiveness**, and stopping per level when marginal variety
flattens:

- **Coverage-novelty (highest value):** does the candidate occupy a `(gate, portal-usage-signature)`
  cell, or a must-cross **order**, or a self-crossing placement, not yet in the corpus? These map
  directly onto the curation cells/axes in `modules/domain/hint-selection.ts`. Prioritize and always
  keep these.
- **Distinctiveness:** otherwise keep a candidate only if its edge-set Jaccard distance to the nearest
  kept path clears a threshold (reuse the exact metric from `hint-selection.ts` — factor it into a
  shared pure module so discovery and curation can't drift).
- **Budget:** cap kept-per-level and stop when N consecutive finds add no coverage/distinctiveness. This
  turns "10k lookalikes" into "the few dozen that actually broaden what the player can be shown."

This makes discovery *curation-aware*: it hunts the gaps the player would perceive, not raw count.

---

## 7. Harness & integration

- **Reuse, don't reimplement, move legality.** `createState`/`getNeighbors`/`applyMove`/`undoMove` +
  `prepLevel` give portals/filters/gate-rules/masks for free. Generators differ only in *ordering* and
  *when they stop*.
- **Gate every candidate on `validateCandidatePath` (PLAY).** Non-negotiable (see §1) — it's the same
  referee the editor/submission flow trusts, and it catches geese/false-goal violations the solver's
  own acceptance ignores.
- **De-dupe** by `pathSignature` (`join(',')`) against the corpus and within the run, exactly like
  `mergeUniqueHints` in `modules/solver/diversification.ts`.
- **Append via the existing pipeline:** write through `scripts/level-json-format.mjs`
  (`stringifyLevelsJson`) to keep `levels.json` diffable; then regenerate `data/level-heatmaps.json`
  (`npm run levels:generate-heatmaps`) and run `npm run test:hint-path-oracle`. Preserve the join key
  (1-based level number / array index) — never reorder levels.
- **Batch & resumable:** shard by level range and RNG seed across processes; write atomic per-shard
  audit JSON (mirror `hint-diversification.mjs`'s `atomicWriteJson`), merge at the end. No wall-clock
  limit; run it overnight.

---

## 8. Recommended build order

1. **System A (randomized-restart enumeration) with the full sound-prune suite** — biggest immediate
   yield, smallest new code (a scoring-free variant of the existing DFS loop). Covers the open regime.
2. **System B1→B2 (prefix-anchor → windowed segment resampling)** — covers the tight regime that A can't
   touch; B1 is proven and tiny, B2 generalizes it. Between them, A+B already flood essentially every
   level measured.
3. **§6 diversity-directed acceptance** — build this *alongside* A/B, not after: without it the tools
   generate far more than is useful. Factor the `hint-selection.ts` distance/coverage metric into a
   shared pure module first so discovery and curation share one definition of "different."
4. **System B3 (symmetry) / C (waypoint construction)** — targeted top-ups for specific levels that A+B
   leave with a coverage gap (a missing portal-usage or must-cross order). Only build if such gaps
   remain after 1–3.

**Net:** the corpus is not supply-limited — it is *selection*-limited. These systems make new valid
solutions effectively free; the engineering that matters is keeping only the ones that broaden what a
player can actually be shown.
