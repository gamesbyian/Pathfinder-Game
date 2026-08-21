# AI-assisted manual solving as a heuristic-discovery method

**Status: proposed methodology + one worked demonstration (2026-07-17), not yet validated against a
genuinely unsolved level.** This doc exists so a future coder considering "have an AI agent reason
out a level by hand and see what it teaches us" doesn't have to re-derive the tradeoffs from
scratch — they were worked out once, concretely, and are recorded here.

## The question this answers

Could asking an AI agent to solve a Pathfinder level the way a player would — reasoning directly
about the grid and win metrics, with no solver invocation and no access to stored hints — surface
techniques or blind spots useful for solver development? Or does an AI's manual reasoning just
reconstruct what the solver already does, more slowly and less reliably?

**Short answer: mostly the latter, with one specific exception that's worth pursuing.** The
combinatorial structure that makes a Pathfinder solution "clever" (parity-matched slack absorption
via loops, corner-attachment at degree-4 cells, exact-length/exact-intersection budgeting) is a
property of the puzzle's math, not of who or what is reasoning about it. An AI narrating its own
strategy is not drawing on a different well of insight than the solver's scoring/attempt-policy
code — both are independent rediscoveries of the same graph theory. Mining the AI's self-described
"technique" for new heuristics is mining vibes, not evidence.

The one place this is genuinely useful is **differential diagnosis on levels the solver currently
fails on** — see "Recommended method" below. That mechanism doesn't rely on the AI's narration at
all; it relies on having a second, independently-constructed *accepted path* to diff against the
solver's own search trace.

## Worked demonstration: level P00002 (2026-07-17)

An AI assistant (Claude Sonnet 5, this session) was given level `P00002` (`data/levels.json`) —
grid 8×8, two gates `(3,7)`/`(7,2)`, goal `(7,6)`, a 2×2 block cluster, `reqLen: 21`, `reqInt: 1`,
no other mechanics — with no solver access and no prior look at its hints file. It reasoned by
hand: pick a gate, run a short direct segment to an interior (degree-4) cell, attach a small
even-perimeter loop there to absorb exactly the needed extra length while creating exactly the one
required self-intersection, then run a fresh route to the goal.

**First attempt was invalid.** The fresh route to the goal walked through `(7,2)` — the level's
*other*, unchosen gate. The assistant's reasoning had correctly tracked blocks, bounds, edge
adjacency, and the intersection count, but missed that every gate cell (not just the chosen one)
is unenterable once the path leaves the start (`modules/domain/move-rules.ts:72`,
`level.gateKeys.includes(targetKey)`). This is exactly the class of mistake a careless human player
makes — a forgotten object-specific rule, not a different kind of failure than what already happens
during ordinary manual play-testing.

**The catch mechanism, not introspection, is what matters here.** The mistake was found by running
the candidate path through `validateCandidatePath` (`modules/domain/path-validator.ts`) — the
actual rule-checker, not by re-deriving the rule from memory a second time. The corrected path
validated (`{ ok: true, ... }`), was checked for novelty against all 62 hints already stored for
this level (no exact match — see `hintPathSignature`-style comparison), and was then persisted as a
new hint entry.

The takeaway generalizes: **never trust a manually-constructed "solution" without running it
through `validateCandidatePath`.** Treat every such claim — from an AI or a human — as unverified
until the rule-checker says otherwise.

## Recommended method: differential diagnosis, not narrative-mining

The two real solver fixes this session found for hard levels
([`reports/2026-07-16-r02248-orientation-scoring-interaction.md`](../reports/2026-07-16-r02248-orientation-scoring-interaction.md),
[`reports/2026-07-16-r02248-pattern-scan.md`](../reports/2026-07-16-r02248-pattern-scan.md)) came
from **instrumented ablation sweeps** — turning scoring terms on/off across a level's symmetry
orientations and measuring which one actively sabotages the search — not from anyone introspecting
on why a hand-found path worked. That's the model to follow here too:

1. Pick a level the production solver currently fails to solve (the stress-corpus-2 `dfs-plain` /
   `repair-close` / `repair-far` populations in `reports/stress/unsolved-failure-clusters.json` are
   the standing target — see `docs/solver-improvement-research-notes.md`).
2. Have an AI agent construct an accepted path by hand, blind to existing hints, verified through
   `validateCandidatePath` per the protocol below.
3. **Diff the accepted path's move sequence against what the solver's own search actually explored
   and rejected at each point of divergence** — using existing instrumentation (the `_BEAM_DEBUG`
   introspection counters mentioned in CLAUDE.md's beam-nodesExpanded gotcha, or a direct
   `solver:direct --verbose` trace) rather than the AI's self-reported strategy. At each divergence
   point, ask: which scoring term or pruning bound made the solver's search de-prioritize or reject
   the move the manual path took? That's a checkable, actionable question with a code-level answer
   — not a narrative one.
4. Only treat a finding as real once it's been ablation-tested across a symmetry family (rotations/
   reflections) the way the R02248/R01465 investigations were — a single level's divergence can be
   coincidental; a consistent pattern across a family is evidence.

This has **not yet been executed** as of this writing — step 2 (P00002) was a mechanics
demonstration on an already-well-solved level (62 prior hints), not a genuinely hard one. The
natural next step for whoever picks this up is running steps 1–4 against a real unsolved
stress-corpus-2 level.

## What NOT to do

- **Don't mine the AI's self-reported reasoning as if it were evidence of a new heuristic.** An
  AI's post-hoc account of "why" it chose a move is exactly as unreliable as a human's — it's a
  retrospective narrative, not a causal trace. Use the diffing method above instead.
- **Don't skip verification.** An AI "solving" a level by reasoning about it produces a claim, not
  a fact, until `validateCandidatePath` confirms it.
- **Don't assume manual solving will find something the solver structurally can't reach on
  already-solvable levels.** The value case is specifically *currently-unsolved* levels, where a
  hand-built solution is at minimum a real existence-proof the automated search never produced.

## Protocol for recording a manually-found hint

If a manually-constructed path validates and is worth keeping (as a hint-corpus contribution, a
witness for the differential-diagnosis method above, or both), persist it correctly:

1. **Verify first.** Run it through `validateCandidatePath` (normalize the raw level via
   `createSolver().prepareLevelForSolver(rawLevel, { source: 'raw' })` first — the validator expects
   a `NormalizedLevel`, not the raw wire-format object).
2. **Check novelty honestly.** Decode the candidate to the same 0-indexed packed-key format
   (`PACK(x-1, y-1)` per cell, from `modules/domain/cell-key.ts`) and compare against every existing
   hint for the level (`readLevelHints`/`readLevelsWithHints` in `scripts/level-data-io.mjs`) before
   claiming it's new.
3. **Attribute provenance honestly — mint a distinct `solver.id`, don't reuse an existing one.**
   `modules/domain/hint-types.ts` already defines `SOLVER_ID` (the production automated solver) and
   `HUMAN_PLAYER_ID` (real player wins, auto-saved by `win-controller.ts`). Neither is accurate for
   an AI's manual reasoning — using either would corrupt downstream provenance-classification
   tooling (`classifyProvenanceSource` in `scripts/stress/solution-profile-lib.mjs`), which buckets
   hints by exactly these ids to build solution-space fingerprints. This session used
   `solver.id: 'ai-assistant-manual'`, `technique: 'manual-reasoning'` — an unrecognized id falls
   through to that tooling's `'other'` bucket, which is the honest answer (neither the solver nor a
   real human player). Reuse this exact id for consistency if you add more hints this way, so a
   future corpus scan can find them all under one label.
4. **Use `getLevelFingerprint` (async, hashed), not `getLevelFingerprintSource` (the raw JSON
   payload), for `context.levelRevision`.** This is an easy mixup — the source function's name
   sounds like the right one, and both live in `modules/domain/level-fingerprint.ts`, but
   `getLevelFingerprintSource` returns the *pre-hash* canonical JSON payload (a large object), while
   `getLevelFingerprint` (async, requires `await`) returns the actual compact
   `v${LEVEL_FINGERPRINT_VERSION}:<sha256 hex>` string every other `levelRevision` caller in the
   codebase uses (see `modules/input/submission-controller.ts`). Using the wrong one bloats the
   hint file with an embedded JSON blob instead of a hash. (Caught and fixed during the P00002
   demonstration — the first write used the wrong function; see this doc's own git history.)
5. **Persist only through the sanctioned helpers** — `readLevelsWithHints` → mutate
   `level.hintRecords` via `mergeHints(level.hintRecords, [toHint(keys, [makeProvenanceEntry(...)])])`
   → `level.hints = hintPaths(level.hintRecords)` → `writeLevelsWithHints`. Never hand-edit a
   `data/hints/<id>.json` file directly — this preserves the one-record-per-line diff discipline
   (`stringifyCorpusJson`) every other writer of these files follows.

## Open questions / follow-ups

- The differential-diagnosis method (the actual recommended use of this technique) has not been run
  against a real unsolved level yet — this doc's worked example was a mechanics dry-run on an
  already-solved level.
- Whether an AI's *blind* construction (no hints, no solver) meaningfully differs in practice from
  an AI given the solver's own failed search trace and asked to find a legal alternative move at the
  first divergence point is untested — the latter might be a cheaper, more targeted variant of the
  same idea worth trying first.
- No claim is made here about whether this scales past a handful of hand-picked levels — the manual
  reasoning process is slow (see the P00002 walkthrough) and doesn't obviously batch the way the
  solver's own automated tooling does.

## Related reading

- [`solver-architecture.md`](solver-architecture.md) — the solver's own architecture; read this
  first if you're not already familiar with the attempt-policy/scoring system.
- [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) — the standing
  target list of unsolved-level populations and prior research avenues.
- [`solution-profile.md`](solution-profile.md) — how hint provenance already feeds solution-space
  fingerprinting; `classifyProvenanceSource`'s bucketing is exactly what a new `solver.id` needs to
  interact correctly with.
- [`../reports/2026-07-16-r02248-orientation-scoring-interaction.md`](../reports/2026-07-16-r02248-orientation-scoring-interaction.md)
  and
  [`../reports/2026-07-16-r02248-pattern-scan.md`](../reports/2026-07-16-r02248-pattern-scan.md) —
  the actual precedent for how a real heuristic finding was extracted from a hard level, via
  ablation, not narration.
- CLAUDE.md's "Provenance" → "Hint provenance" section — the schema this doc's protocol builds on.
