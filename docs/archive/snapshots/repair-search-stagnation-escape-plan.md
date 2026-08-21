# Plan: escaping `repair-search.ts`'s stagnation plateau

> **Related follow-up (2026-08-10):** this investigation produced several of the richest existing
> examples of information a failed technique can leave behind: elite paths, signed residuals,
> plateau shapes, badness histories, complementary-constraint guide evidence, and descent-phase
> failure observations. [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md)
> is now the canonical plan for standardizing those kinds of outputs across repair, DFS, beam,
> admissible-order, and future techniques and testing whether another technique can exploit them.
> Do not revive the negative exact-copy relinking or turn-bias experiments under a new
> "cooperation" name. The new plan begins with shadow-mode artifact emission and replay-safe
> handoff analysis, preserves ordinary repair as an independent fallback, and treats repair's
> plateau/badness language as technique-specific payload rather than a universal cross-technique
> score.

> **Status: Stages 1-3 prototyped & measured (incl. Stage 3's real reversible-operator relinking)
> plus the shared turn-aware selective biasing both reports pointed to (all 2026-07-22); Stage 4 not
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
> large improvements on some levels (R02279 19→5, R02654 12→7) but a severe regression on a
> near-solved one (R02859 3→18), the classic "blunt penalty can't tell a trap cell from a
> load-bearing one" failure. Kept default-off. **Two follow-ups (same day):** an equal-work
> node-budget A/B confirmed the mixed effect is real misdirection (not the recording-cost confound),
> and the first proposed refinement (an arming-time near-solved guard) **failed** — the harm happens
> during the *descent* toward a near-solved state, not at it, so the guard is blind to it (reverted).
>
> **Stage 3 results:** [`reports/2026-07-22-repair-stagnation-stage3-recombination-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-recombination-prototype.md).
> Scatter-search recombination (the append-only approximation; opt-in `enableRecombination`; bench
> 160/160; 23/23 tests). **The most promising prototype — the only one that produced a solved-count
> gain:** complementarity-guided recombination **solves R02239** (Stage 1's pure-length-deficit
> plateau), 2/16 vs OFF's 1/16. Distance-only guide selection was net-harmful (lost a solve), so
> guide selection by *complementary constraints* — the plan's actual criterion — is load-bearing.
> Still net-mixed on near-miss quality with the same near-solved-regression failure as Stage 2, and
> the near-solved regime holds both the gain and the damage (so a "protect near-solved" guard can't
> separate them). Kept default-off.
>
> **Stage 3-real results:** [`reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md).
> The genuine reversible-operator relinking (anchor-splice `relinkPaths`; opt-in `enableRelink`;
> bench 160/160; 28/28 tests) — built, verified sound (copies guide suffixes through the real
> gauntlet; a direct operator unit test confirms it reconstructs a valid recombined solution and
> never false-positives). **Verdict: does NOT help — zero solves, zero bestBadness change — and it
> *underperforms* the soft approximation.** Instrumented reason: exact segment copies collapse under
> append-only legality (the guide's suffix is illegal under the base's different prefix state within a
> few moves), so recombining from the best elite can't exceed it (`bestIntermediate` ties `poolBest`,
> never beats it). Non-obvious finding: soft guide *attraction* beats exact *transplantation* here
> because randomness escapes the legality trap. Exact-copy relinking is a structural dead end; the
> remaining live lever is selective turn-aware cell biasing shared by Stage 2 and Stage 3-soft.
>
> **Shared turn-aware selective biasing:** [`reports/2026-07-22-repair-stagnation-turn-aware-selective-biasing.md`](../reports/2026-07-22-repair-stagnation-turn-aware-selective-biasing.md).
> The selective successor both reports pointed to — bias the one load-bearing move (the exit from a
> pending must-turn cell: reward the required-turn exit, penalize the others), only during a detected
> must-turn plateau (`preferredTurnExit` + opt-in `enableTurnBias`; bench 160/160; 32/32 tests).
> **The best-performing mechanism of the investigation** — confirming turn-awareness is a real
> discriminator the flat-cell biases lacked. On the initial 16-level sample: net-positive bestBadness
> (better 4, worse 3, large wins R02077 13→5, R03280 18→10, R02279 19→11) but no solve. A **broader
> 40-level sample then confirmed it solves levels**: **+1 solve (R02003)**, several driven to badness
> 2 (one step from solved — R01397 39→2, R01860 22→2), net-positive badness (12/8), zero solved-count
> downside. Remaining stalls sit at badness 2-5 (the make-the-turn-AND-hit-length residual), and the descent-phase near-solved
> regression persists — a near-solved arming guard failed a **second** time (harm precedes the
> near-solved state; arming-time guards are confirmed immune on two mechanisms now). Kept default-off.
>
> **Turn-bias × closeLengthGap pairing (tried, diagnosed no-op):** [`reports/2026-07-22-repair-stagnation-turnbias-closelengthgap-pairing.md`](../reports/2026-07-22-repair-stagnation-turnbias-closelengthgap-pairing.md).
> The proposed "first path to a solve." Both-on was already measured (default-on `closeLengthGap`);
> a turn-aware `closeLengthGap` (try the required-turn exit first) was then built and measured — **no
> change, reverted**. Instrumented reason: `closeLengthGap` fires 1659× on R02077's exact residual
> (len 4 + one must-turn) but **exhausts a near-empty suffix** every time — the completion lives in
> the spliced *prefix*, below the floor it can't cross. Ruled out: the badness-4-5 stall is not an
> ordering/budget problem. Third independent hit of the append-only prefix-editing wall (after
> Stage 3-real and the descent-phase regression). The one avenue not yet shown to hit it is a
> **descent-aware** probe (shadow-mode logging, soundness rule 7).

## Investigation outcome (2026-07-22) — read this first

Full synthesis: [`reports/2026-07-22-repair-stagnation-investigation-synthesis.md`](../reports/2026-07-22-repair-stagnation-investigation-synthesis.md).
Eight experiments; all sound, tested, default-off, `solver:bench` 160/160.

- **What works — turn-aware selective biasing (`enableTurnBias`), the find of the investigation.**
  Biases the one load-bearing move (the exit from a pending must-turn cell) only during a detected
  must-turn plateau. Across 56 `repair-close` levels it **solves R02003**, drives several to badness 2
  (one step from solved — R01397 39→2, R01860 22→2, R02220 10→2), is net-positive on badness (16
  better / 11 worse), and has **no solved-count downside** (it only arms on stagnation, so it can't
  touch levels the solver already handles). This is the mechanism to productionize.
- **What doesn't, and the one reason.** Stage 2 penalty and Stage 3-soft reward (flat cell identity
  can't tell a trap cell from a load-bearing one — superseded by turn bias); Stage 3-real exact-copy
  relinking (segment copies collapse under append-only legality); two near-solved arming guards (the
  regression is descent-phase, immune to arming-time guards — confirmed twice); turn-bias ×
  closeLengthGap (the completion lives in the prefix the operator can't cross). Three of these are the
  same **append-only prefix-editing wall**: the terminal residual is a global length↔turn coupling
  no bounded *local* operator can satisfy, which is why turn bias reduces badness impressively but
  stalls at 2–5.
- **Wired + validated, contribution tempered (2026-07-22):** turn bias is now a production repair
  attempt — `STRATEGY_REPAIR_TURN_BIAS`-gated, **default-off** (production `null` cfg never adds it;
  bench 160/160 byte-identical). Through the full `Solver.solve` it **solves R02003**
  (baseline fails) via its own `TURNBIAS` attempt. **But a 10-strong-candidate production A/B tempers
  the earlier optimism: only 1 solve is turn-bias-*attributable* (winner == `TURNBIAS`).** The
  isolation A/B's dramatic reductions (R01397 39→2, R02220 10→2) do NOT convert to production solves,
  and higher-budget baseline (60M vs the cluster's ~8M) already absorbs some cluster levels itself
  (R01860 via ordinary repair, R02894 via main). Load-bearing lesson: turn bias needs the repair
  **fallback** — `disableExtraBudgetPasses` starves it (a false negative that first hid the R02003
  solve). See
  [`reports/2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md`](../reports/2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md).
- **Refresh tooling — now BUILT + validated (2026-07-22):** `portfolio-solve-sweep.mjs` gained
  `--enable-flags=…` (a sparse `SolveOpts.ablation`, threaded through main/worker/race-pool paths) and
  `solver-stress-refresh.yml` a `corpus2_enable_flags` input, so the refresh can now toggle
  `STRATEGY_REPAIR_TURN_BIAS` baseline-vs-on. Validated on the worker path: the sweep with the flag
  solves R02003, without it doesn't.
- **Solve latency fixed (2026-07-22):** turn bias's R02003 solve was ~65 s only because it was wired
  as the *last* repair attempt — the winning attempt itself took just **5.8 s / ~1M nodes**. Placing
  the turn-biased attempt **first** among the repair configs (`attempts.ts`, flag-gated) makes R02003
  solve in **6.3 s at the refresh's default 8000 ms / 20M budget** (well under a 35 s bar; obsoletes
  the earlier "raise the budget" note). Tradeoff: a must-turn level it can't solve pays that attempt's
  budget first, which can displace an ordinary-repair probe solve into the slower fallback — acceptable
  churn under the project's **net-monotonic-after-recovery** bar (retain gains, recover any standing
  regression), not a "never displace a solve" veto; a displaced solve that ends up too slow is a
  regression to recover, which the corpus-2 timing A/B surfaces. Bench 160/160 (flag-gated ⇒ published
  corpus untouched).
- **Population gate closed; default-on promotion rejected (2026-07-23):** the paired corpus-2
  refreshes ran, exposed a probe-budget-stacking bug, and were repeated after that fix. The corrected
  attributable effect was approximately +1 solve, inside the corpus's measured noise floor, while
  the two biased tiers competed for the same scarce budget. That does not justify default-on
  promotion. Exclusive feature-based selection was later tried and rejected (net −2 attributable
  solves on corpus 2). The current flag-gated experiment instead tries both biased tiers, orders them
  with the measured predictor, and weights their shared probe budget 75/25. Its remaining gate is a
  dedicated corpus-2 A/B of that weighted form plus worst-case three-tier fallback latency before
  reconsidering promotion. See
  [`reports/2026-07-23-turnbias-corpus2-ab-validation.md`](../reports/2026-07-23-turnbias-corpus2-ab-validation.md).
- **The dedicated corpus-2 A/B this gate was waiting on: run, and conclusively negative
  (2026-08-07/08, confirmed via two independent byte-identical measurements).** The first
  measurement's own explanation (a `STRATEGY_REPAIR_NOGOOD_CACHE` interaction) was falsified, and
  chasing an alternative explanation surfaced a real, separate bug: `normalizeAblationConfig`
  let `enable_flags=STRATEGY_REPAIR_TURN_BIAS` silently also activate
  `STRATEGY_REPAIR_ELITE_PREFIX_DFS` (independently net-negative) via the Proxy's "unset opt-in
  flag reads as true" gap. Fixed (`ABLATION_OPT_IN_KEYS`, `orchestration.ts`, with regression
  tests) — but a clean re-run against the fix reproduced the **exact same -7/1700**, byte-for-byte
  (same gained/lost level sets): elite-prefix-dfs's accidental presence had flipped zero levels on
  this population. Turn bias's net -7/1700 against current defaults is now confirmed via two
  independent, byte-identical measurements. See
  [`reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md`](../reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md)
  for the full investigation (including the fixed bug, which is real and worth keeping regardless
  of not being the explanation here) and
  [`reports/2026-08-07-turnbias-corpus2-validation.md`](../reports/2026-08-07-turnbias-corpus2-validation.md)
  for the original (partially-superseded, partially-confirmed) reasoning. **`STRATEGY_REPAIR_TURN_BIAS`
  stays opt-in; this gate is now closed, confirmed net-negative** — promotion should not be
  reconsidered without new evidence.
- **Provenance can now help validate this gate too (2026-07-23,
  [`reports/2026-07-23-solver-batch-speed-and-hint-provenance.md`](../reports/2026-07-23-solver-batch-speed-and-hint-provenance.md)):**
  `HintSolverForcing.repairTurnBiased` is now captured on every newly-found/re-solved hint, so "how
  often does `enableTurnBias`'s attempt actually win, corpus-wide" is answerable directly from
  stored hint provenance going forward, alongside the existing sweep-report winner-matching method
  this section already uses. Only useful once a fresh baseline/hint refresh populates it — every
  hint stored before the fix simply lacks the field. **Unrelated but adjacent**: that same session
  used this doc's own "turn-bias was promoted from last-in-ladder to first because it wins fast, so
  burying it wasted that speed" precedent (the "Solve latency fixed" bullet above) as the explicit
  justification for investigating whether the *different*, older `repairMustTurnBiasedAttempt`
  (the must-turn exit-guidance-biased variant, `attempts.ts` — not this plan's `enableTurnBias`)
  deserves the same treatment. That investigation is separate from this plan (a different
  mechanism, no stagnation-escape content of its own) but shares the reasoning — see the linked
  report's Remaining Work section if picking either thread back up.

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

## Stage 3 — Bounded, bidirectional path relinking (secondary experiment) ✅ APPROXIMATION PROTOTYPED (2026-07-22), first solved-count gain

**The append-only approximation is built and measured** — `selectGuideCells`/`GUIDE_REWARD` + the
`enableRecombination` opt-in in `repair-search.ts`. Full write-up:
[`reports/2026-07-22-repair-stagnation-stage3-recombination-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-recombination-prototype.md).
Guide-biased construction (scatter-search recombination), NOT true relinking (no reversible edit
operators — see the prerequisite gap below). Result: **the only prototype to gain a solve** — with
the plan's **complementary-constraints** guide criterion it solves R02239 (2/16 vs 1/16); with a
naïve distance-only guide it instead *lost* a solve, confirming the complementarity criterion is
load-bearing. Still net-mixed on near-miss quality (same near-solved-regression failure as Stage 2),
and the near-solved regime holds both the win and the damage. Default-off. Recommended continuation
(from the report): make the cell bias *selective* via Stage 1's turn-aware features (shared with
Stage 2), or build the real reversible-operator relinking below — this soft nudge is now its on-ramp,
having shown the recombination direction can solve levels. The design as originally specified:

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

> **Done (2026-07-22), negative:** the reversible operator was built and verified sound anyway — an
> anchor-splice (`relinkPaths`) that copies a guide's suffix through the real gauntlet, so it cannot
> return an illegal intermediate by construction (the verification the paragraph above asked for).
> It does not help: exact segment copies collapse under append-only legality (the guide's suffix is
> illegal under the base's different prefix state within a few moves), so the recombination inherits
> the base elite's badness as a floor and never beats it — and it *underperforms* the soft
> approximation, because randomness is what escapes the legality trap that rigid copying falls into.
> Full write-up + instrumented diagnosis: [`reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md).
> Exact-copy relinking is a structural dead end; do not pursue exact-copy variants.

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
   extending it. Two follow-ups already ran: an equal-work A/B (confirms the effect is real
   misdirection) and a near-solved arming guard (failed — the penalty blocks the *descent* to a
   near-solved state, so the guard can't fire in time). The one remaining cheap-ish lever is the
   report's refinement 3 (richer turn-aware attractor features that can distinguish a trap cell from
   a load-bearing one — the exact thing the failed guard proved matters).
4. Stage 3 has BOTH variants prototyped (2026-07-22, both default-off). The **soft** version
   (`enableRecombination`) is **the only prototype that gained a solve** (R02239, via
   complementarity-based guide selection — distance-only *lost* a solve). The **real reversible
   operator** (`enableRelink`, `relinkPaths`) was then built and verified sound but **does not help
   and underperforms the soft version** — exact segment copies collapse under append-only legality;
   it is a structural dead end (read both reports). Net: the **soft, randomized** mechanisms move the
   needle.
5. **Shared turn-aware selective biasing** (`enableTurnBias`, `preferredTurnExit`) is built — the
   selective successor to the flat-cell biases, and **the best-performing mechanism** (net-positive
   bestBadness, large wins; read its report). It confirms turn-awareness is the right discriminator,
   but still doesn't convert to a solve (wins stall at badness 4-5) and still carries the
   descent-phase near-solved regression (a near-solved arming guard failed a second time — now
   confirmed immune on two mechanisms). Pairing it with `closeLengthGap` (the proposed "path to a
   solve") was tried and is a **diagnosed no-op**: `closeLengthGap` already fires on the exact
   residual but exhausts a near-empty suffix, because the completion lives in the spliced prefix it
   can't cross — the same append-only wall Stage 3-real hit. **Where it stands:** turn bias is a
   genuinely effective *bestBadness reducer*, but no mechanism built here converts the stress-corpus
   near-misses to solves — the terminal residual is a global length↔turn coupling that no bounded
   local operator can satisfy. The one avenue not yet shown to hit the wall is a **descent-aware**
   probe (shadow-mode logging of what a bias would change on a would-be-improving restart, per
   soundness rule 7); pursue that over more bounded-operator variants, penalty tuning, or Stage 4.
6. Critical files: `modules/solver/repair-search.ts` (restart loop, stagnation-burst mechanism, and
   now all prototypes' code — Stage 1's `deadEndSignatureRecord` (`PF_REPAIR_SIGNATURE_DEBUG`),
   Stage 2's `computePlateauPenaltyCells` (`enablePlateauPenalty`), Stage 3-soft's `selectGuideCells`
   (`enableRecombination`), Stage 3-real's `relinkPaths` (`enableRelink`, `PF_RELINK_DEBUG`), and the
   turn-aware `preferredTurnExit` (`enableTurnBias`) — each behind its own opt-in param/`PF_*` flag,
   all default-off), `modules/solver/solution.ts`
   (`computeBadness`/
   `structuralDeficit` — note the `Math.abs` sign-loss issue; Stage 1's signed-residual capture does
   not reuse them), `modules/solver/repair-search.test.ts` (the pure-helper + soundness/determinism/
   off-identical test patterns to extend). **Note on gating:** the prototypes use opt-in
   `repairSearchFromGate` params, not `scripts/ablation-config.mjs` flags — the ablation Proxy
   defaults unset flags to `true`, so it cannot express the default-*off* an unproven experiment
   needs (see Stage 2's report). Promote to a real flag only once a mechanism earns default-on.

---

## Appendix: original exact-state nogood-cache design — REVISED 2026-08-07, built and shipped

**Update (2026-08-07): the premise check below was actually run, and reversed this section's own
"not recommended" verdict.** Stage 0's falsification criterion predicted the opposite of what the
data showed: 7 real repair-close levels came back at 53.65%-98.09% exact dead-end repeat rates
(both fresh AND elite-spliced restarts), decisively above the "proceed to Stage 1" bar, not the
"<1%, stop here" one. Built as `modules/solver/nogood-cache.ts` with one deliberate simplification
(a fresh-computed signature instead of an incrementally-maintained one — see the report below for
why) and shipped **default-on** behind `STRATEGY_REPAIR_NOGOOD_CACHE`: a 20-level repair-close/
repair-far A/B showed 5/20 solved vs. 4/20 with it off, zero regressions, and consistent node
reductions (13.7%-40.9%) on every level that solved either way. Full writeup:
[`reports/2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md). The
original deprioritization below was reasonable given the evidence available at the time (a
differently-scoped prior investigation, and the premise check simply never having been run) — kept
verbatim beneath this update per this repo's standing rule that superseded reasoning stays visible,
not silently erased, even when the conclusion it reached turned out to be wrong.

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

### Addendum (2026-08-07): a different bounded operator built and tested — net-negative, kept opt-in

Before attempting the nogood-cache design above (a materially larger undertaking), built and
tested the other half of the synthesis's "genuinely different reversible prefix edits" direction:
`elitePrefixDfsRepair` (`modules/solver/repair-search.ts`) generalizes `closeLengthGap`'s proven
bounded-deterministic-DFS technique from one point (the current restart's own dead end) to several
points scattered across the top elite near-misses. Sound, mechanistically confirmed working (its
badness-improvement feedback loop measurably improved a real gate's best-known state), but a
20-level A/B against the repair-close/repair-far closest-miss population found a net-negative
result (4/20 solved vs. 5/20 with it off, one confirmed node-budget displacement) — the same
scarce-shared-budget zero-sum dynamic documented for turn bias's initial rollout. Shipped
opt-in-only (`STRATEGY_REPAIR_ELITE_PREFIX_DFS`), not default-on. Full writeup:
[`reports/2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md).
This doesn't close off the nogood-cache design above — they attack the same wall from different
angles (this one widens *where* bounded search looks; the cache would stop *re-deriving* the same
failure repeatedly) — but it does confirm the wall is real and that a shared, scarce node budget is
now the binding constraint on any new repair operator, not search creativity alone.


## Rollback-census tooling update (2026-08-11)

A conservative known-trajectory divergence proxy is available for assembling a census, explicitly not a minimum-edit proof or repair operator. Exact continuation labelling remains required before causal interpretation. See [`reports/2026-08-11-solver-research-observation-tooling-pilot.md`](../reports/2026-08-11-solver-research-observation-tooling-pilot.md).

## Rollback causal-window pilot result (2026-08-11)

A conservative 15-elite / three-level known-trajectory census found a median demonstrated rollback of
63 steps (0.815 `reqLen`, range 0.738–0.890). This is not a minimum edit distance, but it argues against
assuming the measured near-misses are suffix-local. Next use bounded exact continuation checks while
retreating through the same elites; do not build another suffix operator yet. See
[`reports/2026-08-11-repair-rollback-causal-window-pilot.md`](../reports/2026-08-11-repair-rollback-causal-window-pilot.md).

> **2026-08-11 review status:** No production policy from this track was changed in the PR #1356 follow-up. Completed lineage/correctness evidence and the explicitly uncompleted oracle/receptor work are recorded in [the review follow-up report](../reports/2026-08-11-pr1356-review-follow-up.md); oracle abstentions remain abstentions.

## Exact repair-retreat CP-SAT: first pass and broadening both complete (2026-08-12/13)

The bounded exact continuation check the rollback pilot called for above is done, in two rounds.
First pass (2026-08-12) on 3 large-demonstrated-rollback elites found **zero exact slack** — the
true minimum rollback matched the demonstrated (known-trajectory) rollback exactly every time, i.e.
the instant a repair elite's trajectory diverges from every known solution, no exact completion
exists even one step later. A broadened sample (2026-08-13), deliberately targeting smaller-
demonstrated-rollback / `reqInt`-`mustCross`-heavy elites the first pass explicitly flagged as
untested, found the **opposite**: 2 of 2 resolved cases had real, large exact slack (true minimum
rollback of 1-2 steps against a demonstrated rollback of 27-29 steps — a ~25-27x overestimate by the
heuristic proxy). **The zero-slack finding does not generalize; whether a stuck elite has real slack
depends on which elite/level you look at, at least at this small n.** See
[`reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md)'s
"Broadened sample" section for the full numbers and the one concrete, not-yet-tried idea it surfaces
(gate `closeLengthGap`/`enableElitePrefixDfs` on small demonstrated rollback specifically, rather than
applying them indiscriminately as both were previously tested).

## CP-SAT-free rollout-escape proxy: closed negative (2026-08-15)

Tried to extend the R00648-vs-R03176 "narrow trap vs. wide plateau" forgivingness finding above to
population scale WITHOUT a CP-SAT oracle (CP-SAT is expensive and abstains on `mustCross >= 2` and
flipping filters, ruling out a real population sweep). `scripts/stress/repair-plateau-rollout-classifier.mjs`
sweeps a backoff ladder of blind rollouts (the real `takePly` primitive) from each level's own
repair-elite dead ends, instead of a CP-SAT-verified feasible point. Sanity check against the same
two levels (6 elites each, 150 trials/backoff) found no reliable discrimination at 4 of 5 tested
depths — at the depth closest to the actual dead end (the one that matters most), both levels show
the identical shape: most elites read near-zero escape, one high-outlier elite each. The signal is
dominated by which specific dead-end trajectory you sample, not by level identity — CP-SAT's
feasibility verification was load-bearing, not an optional refinement a cheap proxy could skip. See
[`reports/2026-08-15-repair-plateau-rollout-proxy-negative.md`](../reports/2026-08-15-repair-plateau-rollout-proxy-negative.md).
**Do not repeat this specific CP-SAT-free approach at population scale.** The tool is kept as
infrastructure for a future version anchored on real CP-SAT-verified prefixes (real cost, not a
shortcut past CP-SAT).
