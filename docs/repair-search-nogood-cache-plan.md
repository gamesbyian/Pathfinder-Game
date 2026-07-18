# Plan: CDCL-inspired nogood cache for `repair-search.ts`

> **Status: proposed plan, not started.** Written 2026-07-18, saved as a design record for a
> future session to pick up. **Stage 0 has not been run** — the number that would justify or kill
> Stage 1 does not exist yet. Do not skip straight to Stage 1's engineering.

## Context

This week's solver work (documented across `docs/solver-development-roadmap.md`'s Campaigns 1-2)
diagnosed a specific, sharp failure mode in `repair-search.ts`'s iterated-local-search fallback:
independent restarts converge fast to a near-miss and then **plateau for 85-99% of the entire
budget** — tens of thousands of further restarts, zero improvement
(`reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md`,
`reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md`). Three independent
constant-tuning fixes for this exact plateau (burst length, elite-pool diversification,
stagnation threshold) were tried and failed — one made things measurably worse. A targeted patch
(`closeLengthGap` + its near-miss extension, shipped this week) rescues a real but small slice
(~5%, then a further few percent) of the affected population.

Separately, an externally-sourced research survey reviewed this session converged — independently
of this week's own diagnosis — on the same underlying idea as the next lever: **give the search
memory of its own failures** (nogood/conflict-clause learning, the mechanism CDCL SAT solvers are
built on), rather than more restart-tuning or more hand-derived static pruning rules. Three
hand-derived static rules were already tried this week and all failed to generalize
(MST-style joint lower bound for `adjacentTurn`, a deadlock-feasibility check, articulation-point
pocket detection — see the roadmap's Campaign 2 section) — none of them gave the search *memory*,
they were all analytically-derived rules checked fresh at every node. This plan is the first
attempt at the genuinely different thing: a cache that remembers a state was proven dead and
prunes matching future states without re-deriving that conclusion from scratch.

**Honest framing**: this is a real research bet, not a scoped feature. This week's base rate for
"promising generalization idea, tested rigorously" is 0/3 (all three hand-derived rules above
failed once actually measured against the corpus). This plan is designed so the premise gets
tested for a few hours' cost *before* any real engineering investment, specifically to avoid
repeating that pattern a fourth time with a much more expensive build.

## Prior art this plan must not re-break

- **CLAUDE.md's memoization-soundness gotcha** (the real MST-scratch-buffer bug precedent): a
  cache key that omits any state variable the cached value actually depends on is a *correctness*
  bug, not a missed optimization — it can silently prune a reachable solution. Every claim of
  "sound" below must survive the same differential-testing rigor that incident established as the
  bar, not just "tests still pass."
- **This week's own sound-signature investigation was itself incomplete.** It measured a
  duplicate-state signature (`pos` + visited-cell-key set + `edgeUsage` per visited cell +
  `portalJumps` + 5 aggregate masks) and got 0.5-16% duplicate rates — but the signature omitted
  `crossCounts` (per-must-cross-cell counts, not just the aggregate `mustCrossMask` bit),
  `surroundNeighborRemainingMasks` (per-surround-object remaining-neighbor state, not just the
  aggregate `surroundMask` bit), `flipperUsedMask`, and `lastWasPortalJump`. Two states can share
  the old signature and still have genuinely different future feasibility because of these gaps —
  don't repeat that gap here.
- **Critical correction found during this plan's own design review**: that prior investigation
  measured duplicates *inside `dfsFromGate`'s own backtracking* — one search tree revisiting
  itself — not inside `repairSearchFromGate`'s restart loop, which does independent *random*
  restarts (fresh-from-gate or elite-spliced). These are mechanically different populations. The
  frozen-signature diagnosis found many **distinct** states sharing one **deficit shape** across
  restarts — not necessarily the same exact state — so an exact-state nogood cache could plausibly
  see near-zero hits between independent fresh restarts, and only real hits between elite-splice
  restarts that share a prefix. **Stage 0 below exists specifically to test this directly**,
  rather than reusing the old (differently-scoped) DFS number as if it answered the same question.

## Stage 0 — Cheap premise check (do this first, before writing any cache code)

Goal: find out, cheaply, whether repair-search's own restarts actually revisit the same dead
states often enough for a cache to matter, before investing in Stage 1's engineering.

1. Write the **corrected, complete** signature function (not yet as production code — a temporary
   instrumentation pass, same convention as this week's `PF_REPAIR_DEBUG`/`PF_LENGTH_GAP_DEBUG`
   env-gated additions to `repair-search.ts`): `pos`, the full visited-cell-key set, `edgeUsage`
   per visited cell, `portalJumps`, `mpVisitedMask`, `mustCrossMask` **and** `crossCounts`,
   `surroundMask` **and** `surroundNeighborRemainingMasks`, `mustTurnMask`, `adjTurnMask`,
   `flipperUsedMask`, `lastWasPortalJump`.
2. Instrument `repairSearchFromGate`/`takePly` to compute this signature at every genuine dead end
   (`takePly`'s two `'deadend'` returns — `neighbors.length===0`, and `survivors.length===0`
   after the gauntlet) within a **single** `repairSearchFromGate` call, track a running `Set` of
   seen dead signatures for that call only, and log: how many dead-ends are exact repeats,
   broken out by whether the restart was fresh-from-gate vs. elite-spliced
   (`spliceFromElite`/`SPLICE_PROBABILITY`).
3. Run on the same ~15-20 level `repair-close` sample used throughout this week's investigations
   (reuse the seeded-sample methodology from `reports/2026-07-18-length-gap-close-invocation-rate.md`
   for a fresh, non-overlapping draw) — apples-to-apples with everything else measured this week.
4. **Falsification criterion**: if the exact-repeat rate is near-zero (<1%) even among
   elite-splice restarts, stop here. Write up the negative result (this repo's standing rule:
   negative results get documented, not discarded) and do not build Stage 1 — the honest
   conclusion would be that state *shape* recurs but state *identity* doesn't, which an
   exact-match cache structurally cannot exploit; the next idea to try would be the fallback this
   plan's own design review flagged: extending `closeLengthGap`-style targeted repair to other
   deficit-shape interactions, not generic memoization.
5. If the repeat rate is meaningfully above noise (low single digits or higher, especially
   concentrated in elite-splice restarts, which is the mechanistically plausible place for real
   hits), proceed to Stage 1.

## Stage 1 — The nogood cache (only if Stage 0 shows real signal)

### Design

- New module `modules/solver/nogood-cache.ts`. Not a general-purpose cache — scoped and owned
  entirely by `repair-search.ts`.
- **Incremental Zobrist-style hashing**, not recompute-from-scratch: maintain a running hash value
  that gets XORed incrementally as moves are applied/undone (a random value keyed by
  `(cell, axis)` XORed in when `edgeUsage` sets that bit, a random value keyed by `cell` XORed in
  on first visit, random values XORed in/out as each mask bit flips, etc.) — O(1) amortized per
  move instead of O(path length) per check. This directly resolves the "a full sound signature is
  too expensive to compute fresh every node" finding from this week's transposition-table
  measurement (5-6x fewer nodes explored from hashing overhead alone).
- **Scoped to `repair-search.ts` only — do not modify `search-state.ts`'s shared `applyMove`/
  `undoMove` bodies or add hash fields to `SolverSearchState`** (confirmed feasible: `UndoToken`
  already exposes every "prev" value those functions mutate, so a caller-side wrapper can diff
  old-vs-new and XOR incrementally without touching the shared primitives). This keeps the change
  at zero cost to DFS/beam, which don't use it. **Real risk to manage**: `takePly`,
  `closeLengthGap`, and `replayToPrefix` all call `applyMove`/`undoMove` directly today (3 call
  sites) — every one must route through the tracked wrapper consistently or the incremental hash
  silently desyncs from the real state. Enumerate and convert all 3 explicitly; a unit test should
  assert the incremental hash matches a from-scratch recomputation after a sequence of
  apply/undo/splice/backtrack operations, not just after straight-line applies.
- **Cache structure**: a new, lean `IntHashSet`-style structure (not `IntHashMap` — that's a
  key→value map with a value slot this doesn't need). Single primary hash value (fits JS's 53-bit
  safe integer range) plus a **cheap secondary verification key** (the mask values — cheap because
  they're already being tracked) checked on every hit before trusting it, rather than a second
  independent Zobrist stream — collision-safe without the complexity of true 64-bit hashing, and
  reuses state already being maintained instead of inventing more.
- **Lifecycle**: scoped **per `repairSearchFromGate` call**, not per-`prep` like the existing
  `_mpLowerBoundCache`/`_mcLowerBoundCache` (those are gate-independent; this cache's key
  (visited-set/`edgeUsage`-based) is gate-specific, so sharing it across gates would be wrong, not
  just wasteful). Hard capacity cap (e.g. 500k entries), refuse-insert past cap. State this
  invariant explicitly and rely on it: **dropping an entry past the cap costs opportunity, never
  soundness** — a false negative (cache says "not known dead" for something that actually is) just
  means normal search proceeds as if the cache didn't exist; only a false positive would be a
  correctness bug, and the design must make false positives structurally impossible (via the
  secondary verification key), not just rare.
- **Insertion points** (both inside `repair-search.ts`, not the shared `prune-gauntlet.ts` —
  wiring into the shared `evaluatePrunedMove` gauntlet would leak this to `dfsFromGate` too,
  breaking the scoping goal above):
  - **Record as dead**: `takePly`'s two `'deadend'` returns.
  - **Fast-check**: inlined directly in `takePly`'s per-candidate loop, immediately after
    `applyMove`, **before** calling `evaluatePrunedMove` — a hit skips the entire gauntlet
    (cheapest possible rejection), a miss falls through to the existing gauntlet unchanged.
- New ablation flag: `STRATEGY_REPAIR_NOGOOD_CACHE` in `scripts/ablation-config.mjs` (matching the
  existing `STRATEGY_REPAIR_*` naming convention for repair-search-specific mechanisms), default
  enabled once shipped, default **disabled** during development/testing so every measurement below
  can be a clean A/B.
- Explicitly deferred, not part of this first cut: extending the cache to DFS/beam or the shared
  `search-state.ts` primitives; `closeLengthGap`'s own internal exhaustion path as a second
  insertion point; automatic **clause generalization** (deriving a minimal sub-condition
  responsible for a failure, rather than exact-state matching — the harder, more powerful
  CDCL-proper direction, only worth attempting if this exact-match version shows real measured
  value first).

### Verification (all required before this is considered done — mirrors this repo's standing bar)

1. **Unit tests** (model on `repair-search.test.ts`'s existing determinism test and
   `replayAndValidate` helper):
   - Signature completeness: construct paired states differing *only* in the previously-missing
     fields (`crossCounts`, `surroundNeighborRemainingMasks`, `flipperUsedMask`) and assert the
     corrected signature distinguishes them — proves this closes the exact gap this week's
     investigation left open, not just "looks more thorough."
   - Incremental-hash correctness: assert the running hash after a sequence of apply/undo/
     splice/backtrack operations matches an independent from-scratch computation over the final
     state, on several different operation sequences (not just straight-line applies).
   - Collision safety: hash a large sample of real repair-search states from an actual run;
     confirm the secondary verification key catches every case where two different states would
     otherwise hash-collide (or confirm zero collisions occur in the sample, and document the
     verification key as the real safety net regardless).
   - Determinism: cache-enabled repair runs stay bit-identical given the same seed, matching the
     file's existing determinism test.
2. **Differential soundness test (new, the sharpest check available)**: replay every stress-corpus
   level's withheld witness path through repair-search's own state machinery (reuse
   `witness-divergence.mjs`'s replay harness) and assert the witness path **never** matches a
   signature the cache recorded as dead in an independent repair-search run on the same level. Any
   hit here is a smoking-gun unsoundness bug — a witness-passed-through state that reachable, sound
   search shouldn't be able to prune as dead — not a tuning issue to shrug off.
3. `npm run solver:bench -- --check`: 160/160, no regressions. Non-negotiable per this repo's
   standing rule; run it locally (no CI needed).
4. **Cost sweep**: repair-search wall-time/node-throughput with the cache ON vs. OFF (ablation
   flag), on the same repair-close sample used in Stage 0 — the Zobrist-maintenance write cost is
   paid on every node even when the read-side check never fires, so this needs its own
   before/after number, not just a solved-count comparison (per CLAUDE.md's "solver:bench --check
   only verifies solvability, always pair with a cost sweep" rule).
5. **Effectiveness measurement**: on the same repair-close sample used for `closeLengthGap`'s and
   the near-miss extension's own A/B tests this week, measure the solved-count delta with the
   cache ON vs. OFF — directly comparable to those two prior interventions' own measured rescue
   rates (~5%, then a further few percent), so "did this work" has an honest, calibrated bar
   instead of an arbitrary one.
6. **Full corpus-2 refresh** (GitHub Actions, `solver-stress-refresh.yml` — now validated
   end-to-end this session) only after everything above passes locally. This is real CI cost;
   spend it last, once the change is already known-safe and known-not-obviously-worthless.

## Where to start (for whoever picks this up)

1. Read this plan in full, then `reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md`
   and `reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md` for the exact
   prior measurements this plan builds on and corrects.
2. Execute Stage 0 exactly as specified. **Do not start Stage 1's engineering without a real,
   positive Stage 0 result** — that number does not exist yet; this plan does not assume an
   answer.
3. Critical files: `modules/solver/repair-search.ts` (all the real work happens here),
   `modules/solver/search-state.ts` (read-only reference for `UndoToken`/`applyMove`/`undoMove`
   shapes — not to be modified), `modules/solver/int-hash-map.ts` (reference for the existing
   cache-structure convention in this codebase, not directly reused), `modules/solver/
   prune-gauntlet.ts` (reference only — the new check must NOT be wired in here),
   `scripts/ablation-config.mjs` (new flag registration), `modules/solver/repair-search.test.ts`
   (existing test patterns to extend).
