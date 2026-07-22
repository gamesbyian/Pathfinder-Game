# Plan: escaping `repair-search.ts`'s stagnation plateau

> **Status: Stage 1 executed + Stage 2 prototype built & measured (both 2026-07-22); Stages 3-4 not
> started.** Written 2026-07-18, revised
> the same day after external literature research. Supersedes an earlier draft of this plan
> (originally titled "CDCL-inspired nogood cache for repair-search.ts") whose core Stage 1 design —
> an exact-state dead-state cache — two independent research passes concluded is a poor match for
> this search's actual paradigm (see "Why the original design changed" below). That original design
> is kept in full as an appendix, not discarded, per this repo's standing rule that
> negative/superseded results get documented rather than silently rewritten.
>
> **Stage 1 results:** [`reports/2026-07-22-repair-stagnation-stage1-signed-signature-features.md`](../reports/2026-07-22-repair-stagnation-stage1-signed-signature-features.md).
> Instrumentation shipped (env-gated `PF_REPAIR_SIGNATURE_DEBUG=1` in `repair-search.ts`; bench
> 160/160, no regressions). Four findings feed Stage 2, summarized inline at the head of Stage 2
> below; the two that change what a later stage should do: **(1) every plateau is length-*short*,
> never long — re-scopes Stage 4 (see its note); (3) key Stage 2's table on plateau *shape* (residual
> signs + structural masks), not the exact length residual.**
>
> **Stage 2 results:** [`reports/2026-07-22-repair-stagnation-stage2-plateau-penalty-prototype.md`](../reports/2026-07-22-repair-stagnation-stage2-plateau-penalty-prototype.md).
> Prototype built (opt-in `enablePlateauPenalty` param in `repair-search.ts`; bench 160/160, no
> regressions; 19/19 unit tests). **Verdict: real, working, sound — but not a win as built.** No
> solved-count gain on the Stage 1 sample (1/16 both ways) and a roughly symmetric bestBadness effect:
> large improvements on some levels (R02279 17→5, R02654 12→6) but a severe regression on a
> near-solved one (R02859 3→18), the classic "blunt penalty can't tell a trap cell from a
> load-bearing one" failure. Kept default-off; see the report's "next steps" (protect near-solved
> states; discriminate attractor cells with richer features; equal-work A/B) before any Stage 3.

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
(~5%, then a further few percent) of the affected population. Deeper instrumentation found:
restarts that plateau converge on the same **badness-term breakdown** (e.g. "length off by 1,
one specific `mustTurn` cell still unsatisfied") without being the same **exact state**
(different actual paths/visited-cells reach that same breakdown).

## Why the original design changed

The first draft of this plan proposed an exact-state "nogood cache" (CDCL/SAT-style dead-state
memoization, keyed by an incrementally-maintained Zobrist-style hash of the full search state),
gated by a Stage 0 premise check measuring how often `repairSearchFromGate`'s own restarts
revisit an *identical* dead state.

Two independent research passes (external literature review, full reports kept in this session's
history) were run against that design **before executing Stage 0**, specifically to sanity-check
whether the technique itself was well-matched to this search's actual mechanism (a randomized
iterated local search with elite-pool splicing — not a systematic/deterministic search like
`dfsFromGate`, where exact-state recurrence is common because the search order is deterministic).
Both passes independently reached the same conclusion, from different angles:

- **Exact-state nogood/dead-state caching has a strong track record specifically in systematic,
  deterministic search (CDCL, branch-and-bound, backtracking, dynamic programming)** — contexts
  where the same subproblem is genuinely re-encountered because the search order repeats itself.
  In a randomized-restart ILS, independently generated paths are different by construction; the
  repeated object here is an *outcome signature*, not a *state*. One report found "no published
  work where a randomized multi-restart local search routinely records all visited states or
  learned clauses like a CDCL solver." The other: "a failed randomized construction establishes
  only that this particular sequence of choices failed under this budget and subsequent random
  decisions — not that every completion from this state is impossible." Neither found this
  technique meaningfully validated for this search paradigm, independent of what a recurrence
  measurement would show.
- **A generalized/abstracted cache (memoizing on the badness-term *shape* rather than exact
  state) is explicitly flagged as dangerous, not just unproven.** This was the natural next idea
  once "exact state rarely repeats, but the deficit shape does" was diagnosed — and both reports
  warn hard against it. The sharpest formulation (from the more rigorous of the two reports): a
  hard abstraction is only sound if it satisfies one of three formal conditions — **future
  equivalence** (every state sharing the key has the same completion possibilities), a **monotone
  impossibility certificate** (the key encodes an actual proof, e.g. an admissible bound or a
  parity argument), or a **valid dominance relation**. The badness-term vector satisfies none of
  these: "two paths with the same residuals can partition the remaining grid into radically
  different reachable regions." Critically: **"Running a million probes without finding a
  successful member of an abstract class does not prove the class dead. It can justify a bias,
  never a hard prune."** — i.e. no amount of empirical measurement (which is what Stage 0 would
  have produced) can retroactively make a shape-keyed hard cache sound. This directly parallels
  CLAUDE.md's own memoization-soundness gotcha and the real MST-scratch-buffer bug it documents —
  same failure class, independently rediscovered from the outside.
- **Concrete, codebase-specific confirmation the concern is real, not just theoretical**: both
  reports flag that any signature must preserve the *sign* of a residual ("being two steps short
  and two steps long should not be collapsed into the same bucket"). Checked against the actual
  code: `modules/solver/solution.ts`'s `computeBadness` computes `lenDeficit` and `intDeficit` via
  `Math.abs(...)` — sign is already lost in the metric this whole diagnosis was built on. Any
  future signature-based mechanism (soft or hard) must use signed residuals, not reuse
  `computeBadness`'s existing absolute-value terms directly.

**What both reports recommend instead** — converging independently on the same priority order —
is the basis for the revised plan below: soft, decaying, signature-*conditioned* feature memory
(not a hard cache) as the first experiment; bounded path relinking between elite-pool members as
the second; strategic oscillation across one exact-count boundary as a third, more exploratory,
option.

## Stage 1 — Instrumentation: capture signed signatures + structural features ✅ DONE (2026-07-22)

**Executed.** Instrumentation shipped as `deadEndSignatureRecord`/`emitSignatureSummary` in
`repair-search.ts`, env-gated `PF_REPAIR_SIGNATURE_DEBUG=1`. Ran on a fresh 16-level `repair-close`
sample (15 plateaued, 1 solved by the single-gate probe). Full write-up:
[`reports/2026-07-22-repair-stagnation-stage1-signed-signature-features.md`](../reports/2026-07-22-repair-stagnation-stage1-signed-signature-features.md).
Findings: **(1)** all 15 plateaus are length-*short*, none long (only signed capture reveals this);
**(2)** pending must-turn dominates the plateau shape (13/15), generalizing the 2-level frozen-
signature diagnosis; **(3)** exact signatures are diffuse (median top-signature share 6.5%) but the
*shape* (residual signs + structural masks) is highly concentrated — so Stage 2 must key on shape,
not the exact length residual; **(4)** conditional on the plateau signature, a fixed set of
`revisit`/`tip` cells plus the reached-but-unturned must-turn move are the overrepresented features
(log-odds 7–11). The original Stage 1 spec that produced this:

Cheap, no solver behavior change — same convention as this week's `PF_REPAIR_DEBUG`/
`PF_LENGTH_GAP_DEBUG` env-gated instrumentation additions to `repair-search.ts`.

1. Compute a **signed** residual vector at every restart's dead end / budget exhaustion:
   `(realLen - reqLen, ints - reqInt)` (not `Math.abs`'d — a genuinely new field this
   instrumentation needs that `computeBadness` doesn't currently expose), plus the existing
   structural masks (`mpVisitedMask`, `mustCrossMask`, `surroundMask`, `mustTurnMask`,
   `adjTurnMask`).
2. Alongside the signature, log a set of candidate **structural features** for that dead-end path:
   per-cell visit multiplicities, `edgeUsage`/axis at each visited cell, turn events (cell +
   incoming/outgoing direction) at `mustTurn`/`adjTurn` cells specifically, and each
   self-intersection's cell + traversal order. (This reuses the same field list the original
   nogood-cache appendix already scoped as "the complete signature" — the earlier
   completeness analysis wasn't wasted, it just now feeds a frequency table instead of a cache
   key.)
3. Run on the same ~15-20 level `repair-close` sample used throughout this week's investigations
   (fresh, non-overlapping seeded draw from `reports/2026-07-18-length-gap-close-invocation-rate.md`'s
   methodology).
4. Report, purely as diagnostic context (not a hard gate this time — the recommended next stage
   doesn't depend on a specific recurrence rate the way the original nogood-cache design did):
   how concentrated the signed signatures are during a plateau, and which structural features are
   measurably overrepresented among restarts sharing a plateaued signature vs. the global baseline
   rate for that feature.

## Stage 2 — Signature-conditioned soft feature memory (recommended primary experiment) ⚠️ PROTOTYPE BUILT (2026-07-22), mixed result

**Built and measured.** Prototype shipped as `computePlateauPenaltyCells`/`plateauShapeAndCells` +
the `enablePlateauPenalty` opt-in in `repair-search.ts`. Full write-up + A/B:
[`reports/2026-07-22-repair-stagnation-stage2-plateau-penalty-prototype.md`](../reports/2026-07-22-repair-stagnation-stage2-plateau-penalty-prototype.md).
Two deliberate deviations from the design below, both toward the plan's own "scoped to repair,
lower-risk" goal: it is gated by an **opt-in parameter, not an ablation flag** (the ablation
framework's Proxy defaults unset flags to `true`, so it cannot express a default-*off* experiment
flag — an unproven prototype must never ship on), and the penalty is applied in `takePly` on
`scoreMove`'s **return value**, not threaded through the shared `scoreMove` (which DFS/beam also
call). Verdict: sound and genuinely effective at reshaping the search, but no solved-count gain and a
double-edged bestBadness effect (one severe regression on a near-solved level) — kept default-off,
refinements listed in the report. The design as originally specified:

The literature-aligned mechanism for "many restarts keep landing in the same abstract failure
shape without being identical states": bias move selection away from structural features
statistically overrepresented in that shape, via a **finite, decaying penalty** — never a hard
prune. This is a scoring adjustment, not a cache; it cannot make a legal move illegal, only less
preferred, which sidesteps the whole soundness class of problem the exact/abstracted cache
designs ran into.

### Design

- New scoring input, likely living alongside `scoring.ts`'s existing `SCORE_*` terms rather than
  as a separate module — same integration shape as the existing `SCORE_MUST_TURN_EXIT_GUIDANCE`/
  `SCORE_ADJ_TURN_URGENCY` terms, since this is fundamentally "one more term in `scoreMove`,"
  gated by its own ablation flag (`SCORE_PLATEAU_FEATURE_PENALTY`, matching the `SCORE_*` naming
  convention).
- **Signature `s` is the plateau *shape*, not the exact signed signature** (Stage 1 finding 3):
  the sign of each residual (crucially the length sign — finding 1) plus which structural masks are
  pending, with the exact length *magnitude* bucketed or dropped. Keying on the raw signed length
  value scatters the table across thousands of near-empty buckets (Stage 1 saw 1k–22k distinct exact
  signatures per level) and dilutes the signal. This is the concrete shape Stage 1's
  `emitSignatureSummary` already collapses toward when it groups by min-badness signature.
- Maintain, per `repairSearchFromGate` call, a conditional-frequency table:
  `F_s(feature)` = how often each structural feature (from Stage 1's candidate list) appears among
  restarts that reach the *current* plateau signature `s`, vs. a running global baseline `F(feature)`
  across all restarts regardless of signature. The useful signal is **overrepresentation
  conditional on the plateau signature** (e.g. a smoothed log-odds ratio), not raw frequency —
  a feature that's common everywhere shouldn't be penalized just because it also shows up in the
  stuck restarts.
- When the stagnation-burst mechanism (`STAGNATION_THRESHOLD`) detects a plateau, activate a
  **finite** penalty in `scoreMove` for candidate moves that would introduce an overrepresented
  feature, applied during both fresh and elite-spliced restarts for the duration of that plateau.
  Decay/reset the penalty once the signature changes (a genuine best-ever improvement) or after a
  fixed compute budget — never let it become permanent.
- **Explicitly preserve a memory-blind fraction of restarts** (pure epsilon-greedy, no penalty
  applied) — mirrors this file's own existing `EPSILON_LADDER` cycling-exploration-levels pattern,
  and is the concrete mechanism that keeps this "soft," i.e. every originally-reachable
  construction stays reachable via at least one search mode.
- **Aspiration override is automatic by construction**: because this is a scoring nudge, not a
  filter, a move that actually leads to a new best-ever badness was never made illegal — it just
  had to overcome a lower initial ranking.

### Why this is architecturally lower-risk than the original nogood-cache design

- No new cache data structure, no incremental-hash bookkeeping, no `UndoToken`/`applyMove`/
  `undoMove` call-site auditing.
- Fits an existing, well-understood extension point (`scoring.ts`'s `SCORE_*` terms + ablation
  flags) instead of a new module with new soundness obligations.
- A penalty that's wrong (mis-scores a feature) costs *search efficiency*, not *correctness* — the
  win-condition check (`isSolutionState`) is completely untouched, so there is no path by which
  this mechanism could cause an incorrect "solved" or silently drop a reachable solution the way
  an under-keyed cache could.

### Verification

- Unit tests: the frequency table and log-odds computation are pure functions over recorded
  restart data — test them directly against constructed feature-count fixtures, no solver
  integration needed for correctness of the arithmetic itself.
- Determinism: cache-enabled (flag-on) repair runs stay bit-identical given the same seed, matching
  `repair-search.test.ts`'s existing determinism test.
- `npm run solver:bench -- --check`: 160/160, no regressions.
- Cost sweep + effectiveness measurement on the same `repair-close` sample used for
  `closeLengthGap`'s and the near-miss extension's own A/B tests — same bar, same comparability,
  as described in the original nogood-cache appendix's verification section (that part of the
  methodology is unaffected by the design change; only *what* is being measured changed).
- The decisive metric per the research: **the plateau's own survival curve** — probability of no
  best-ever-badness improvement after *n* further restarts / *t* further seconds — not just raw
  solved-count, since the mechanism's whole point is shortening plateaus, which a solved-count
  delta alone can under-report if it only occasionally tips a level all the way to solved.

## Stage 3 — Bounded, bidirectional path relinking (secondary experiment)

Both research passes independently rank this second, with real competition-grade precedent (a
tabu-search + path-relinking system solved a job-shop scheduling instance that had been open for
over 20 years; an adaptive-ILS-with-path-relinking variant reported state-of-the-art vehicle-
routing results). The mechanism: instead of purely random elite-splice restarts, deliberately
construct a *trajectory* of intermediate solutions between two elite near-misses (a "base" and a
"guide"), picked for large structural distance and — ideally — complementary satisfied
constraints (e.g. elite A hits `reqLen` but misses a `mustCross`; elite B satisfies that
`mustCross` but is two steps long).

**Real prerequisite gap, flagged by both reports**: classical path relinking assumes reversible
edit operators (replace a segment between two shared anchor cells, insert/remove a loop, reroute
a suffix) that let a solution move incrementally toward another. `repairSearchFromGate`'s current
restarts are **append-only** — a restart extends a spliced prefix forward until it dead-ends; it
cannot edit an already-constructed path. Building genuine path relinking therefore requires
designing and implementing new reversible path-edit primitives first — a real, separate piece of
work, not a parameter change to the existing splice mechanism. Without those operators, the
closest available approximation is closer to scatter-search recombination (re-synthesizing a
differing region between two elites via guide-biased construction) than strict path relinking —
worth attempting, but should be labeled honestly as the weaker approximation it is, not oversold
as "path relinking" in any report on it.

Scope this as its own sub-investigation (design the edit operators, verify they can't produce an
illegal intermediate that only `isSolutionState` would catch) before committing to a full
implementation — not part of this plan's first cut.

## Stage 4 — One-dimensional strategic oscillation (tertiary, most exploratory)

> **Stage 1 re-scope (2026-07-22):** all 15 measured plateaus are length-*short*, never long — the
> repair walk dead-ends before reaching `reqLen` and never overshoots it (Stage 1 finding 1). So
> the "let the path overshoot `reqLen`, then come back" framing below has no overshoot to oscillate
> back from in this population; the real deficit is an inability to *extend* a short dead end. If
> Stage 4 is pursued for this cluster, frame it as "reach a length the random walk can't extend to
> on its own" (an extend/detour operator), not oscillation around a boundary the search only ever
> approaches from below. The append-only-construction prerequisite gap below applies either way.

Real precedent exists for oscillating across an *exact-cardinality* boundary specifically (not
just a capacity/inequality limit) — a balanced-clustering solver that deliberately alternates
feasible and infeasible exact-cluster-size solutions outperformed prior state-of-the-art. No
precedent was found combining exact path length + exact self-intersection count + several exact
must-cross/must-turn counts + revisitation + history-sensitive topology all at once — this would
be a genuinely exploratory adaptation, not a transplant of an established combined technique.

Same append-only-construction gap as Stage 3: oscillating "let the path overshoot `reqLen`, then
come back" requires an operator that can *shorten* an already-built path, which doesn't exist
today. If attempted, start with a single exact-count dimension (length is the most natural
candidate — it already has a clean signed residual) rather than oscillating multiple constraints
at once, per both reports' caution that oscillating everything simultaneously "creates a fog bank
of infeasibility with little directional information."

## Soundness rules for any mechanism built from this plan

Synthesized from the research (the more rigorous of the two reports states these explicitly;
they're also a direct extension of CLAUDE.md's own memoization-soundness gotcha):

1. Learned/adaptive memory never participates in final validity checking — `isSolutionState`
   stays the sole authority on what counts as solved, unchanged by any of this.
2. Empirical failure never creates a permanent hard prune. No amount of "we tried this shape a
   million times and it never worked" is a soundness proof (see "Why the original design
   changed" above) — at most it justifies a *bias*.
3. Any hard prune (as opposed to a soft bias) must name its certificate: an admissible bound, a
   reachability proof, an invariant, or a proven dominance relation — not an empirical
   observation, however strong.
4. An approximate key or probabilistic structure (e.g. a hash with nonzero collision chance) may
   affect *ranking*, never *legality*. A false positive from something like that is an acceptable
   cost for a slightly-off soft penalty; it is never acceptable as grounds to exclude a move
   outright.
5. Any modified move-selection policy must preserve **support**: every construction that was
   reachable under the original unmodified epsilon-greedy policy must remain reachable in at
   least one search mode (the "memory-blind fraction of restarts" in Stage 2's design is the
   concrete mechanism satisfying this).
6. Any abstraction/signature used for more than soft scoring must be actively collision-tested —
   deliberately search for two states sharing a key but genuinely differing in completion outcome
   (one such witness disqualifies the abstraction as a hard-prune key, full stop).
7. Prefer shadow instrumentation before enforcement: log what a mechanism *would* have suppressed
   before letting it actually suppress anything, so a design mistake shows up as a diagnostic
   number, not a silently-missed solution.

## Where to start (for whoever picks this up)

1. Read this plan in full, then `reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md`
   and `reports/2026-07-17-repair-stagnation-frozen-signature-generalization.md` for the exact
   prior measurements this plan builds on, and the appendix below for the original (deprioritized)
   design and why it changed.
2. Stage 1's instrumentation is already done (2026-07-22) — read its report
   ([`reports/2026-07-22-repair-stagnation-stage1-signed-signature-features.md`](../reports/2026-07-22-repair-stagnation-stage1-signed-signature-features.md))
   before Stage 2; it changes two design choices (shape-keyed signature, Stage 4 re-scope). The
   `PF_REPAIR_SIGNATURE_DEBUG=1` instrumentation is kept in `repair-search.ts` for re-running on a
   wider/different sample if Stage 2 needs it.
3. Stage 2 (signature-conditioned soft feature memory) is prototyped (2026-07-22, default-off
   `enablePlateauPenalty` in `repair-search.ts`) with a mixed result — read its report before
   extending it. The recommended continuation is the report's own next steps (protect near-solved
   states from the penalty; discriminate attractor cells with Stage 1's richer deferred features;
   equal-work node-budget A/B + the plateau-survival-curve metric), not Stage 3 yet — Stage 3 has a
   real prerequisite (reversible edit operators) that still doesn't exist.
4. Critical files: `modules/solver/repair-search.ts` (restart loop, stagnation-burst mechanism),
   `modules/solver/scoring.ts` (where Stage 2's new `SCORE_*` term belongs), `modules/solver/
   solution.ts` (`computeBadness`/`structuralDeficit` — note the `Math.abs` sign-loss issue found
   above; Stage 1's signed-residual capture must not reuse these functions as-is),
   `scripts/ablation-config.mjs` (new flag registration), `modules/solver/repair-search.test.ts`
   and `modules/solver/scoring.test.ts` if it exists (test patterns to extend).

---

## Appendix: original exact-state nogood-cache design (deprioritized, kept for reference)

The following is the plan's original content, preserved verbatim from before the 2026-07-18
research pass. **Not recommended given the research above** — kept in case circumstances change
(e.g. a future architectural shift toward more systematic/deterministic search, where this
technique's actual track record lies) rather than deleted outright, per this repo's standing rule
that superseded designs get documented, not silently erased.

### Prior art this design must not re-break

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
  restarts that share a prefix. A Stage 0 premise check was designed specifically to test this
  directly, rather than reusing the old (differently-scoped) DFS number as if it answered the same
  question — **but the 2026-07-18 research above found the technique itself is a poor match for
  this search paradigm independent of that number**, so this premise check was never actually run.

### Stage 0 — Cheap premise check (as originally designed)

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
   elite-splice restarts, stop here.
5. If the repeat rate is meaningfully above noise (low single digits or higher, especially
   concentrated in elite-splice restarts), proceed to Stage 1.

### Stage 1 — The nogood cache (as originally designed)

#### Design

- New module `modules/solver/nogood-cache.ts`. Not a general-purpose cache — scoped and owned
  entirely by `repair-search.ts`.
- **Incremental Zobrist-style hashing**, not recompute-from-scratch: maintain a running hash value
  that gets XORed incrementally as moves are applied/undone (a random value keyed by
  `(cell, axis)` XORed in when `edgeUsage` sets that bit, a random value keyed by `cell` XORed in
  on first visit, random values XORed in/out as each mask bit flips, etc.) — O(1) amortized per
  move instead of O(path length) per check.
- **Scoped to `repair-search.ts` only — do not modify `search-state.ts`'s shared `applyMove`/
  `undoMove` bodies or add hash fields to `SolverSearchState`** (confirmed feasible: `UndoToken`
  already exposes every "prev" value those functions mutate, so a caller-side wrapper can diff
  old-vs-new and XOR incrementally without touching the shared primitives). **Real risk to
  manage**: `takePly`, `closeLengthGap`, and `replayToPrefix` all call `applyMove`/`undoMove`
  directly today (3 call sites) — every one must route through the tracked wrapper consistently
  or the incremental hash silently desyncs from the real state.
- **Cache structure**: a new, lean `IntHashSet`-style structure (not `IntHashMap`). Single primary
  hash value (fits JS's 53-bit safe integer range) plus a **cheap secondary verification key**
  (the mask values) checked on every hit before trusting it.
- **Lifecycle**: scoped **per `repairSearchFromGate` call**. Hard capacity cap (e.g. 500k
  entries), refuse-insert past cap. **Dropping an entry past the cap costs opportunity, never
  soundness.**
- **Insertion points** (both inside `repair-search.ts`, not the shared `prune-gauntlet.ts`):
  record-as-dead at `takePly`'s two `'deadend'` returns; fast-check inlined directly in `takePly`'s
  per-candidate loop, immediately after `applyMove`, before calling `evaluatePrunedMove`.
- New ablation flag: `STRATEGY_REPAIR_NOGOOD_CACHE` in `scripts/ablation-config.mjs`.
- Explicitly deferred: extending to DFS/beam or shared `search-state.ts`; `closeLengthGap`'s own
  exhaustion path as a second insertion point; automatic clause *generalization* (the harder,
  more powerful CDCL-proper direction).

#### Verification

1. Unit tests: signature completeness (paired states differing only in previously-missing fields
   distinguish correctly); incremental-hash correctness (matches from-scratch recomputation after
   apply/undo/splice/backtrack sequences); collision safety (secondary verification key catches
   every case two different states would otherwise hash-collide); determinism.
2. Differential soundness test: replay every stress-corpus level's withheld witness path through
   repair-search's own state machinery and assert it never matches a signature the cache recorded
   as dead in an independent run on the same level.
3. `npm run solver:bench -- --check`: 160/160, no regressions.
4. Cost sweep: repair-search wall-time/node-throughput with the cache ON vs. OFF.
5. Effectiveness measurement: solved-count delta on the same `repair-close` sample used for
   `closeLengthGap`'s own A/B tests.
6. Full corpus-2 refresh (GitHub Actions) only after everything above passes locally.
