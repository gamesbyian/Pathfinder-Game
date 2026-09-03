# Beam-to-DFS handoff pilot (rung 4)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — the same two independent 30-level uniform corpus2 samples used for rungs 2–3 (60 levels total), current HEAD
> **Decision:** Handing a beam's exact residual search state directly to DFS (rung 4 of `docs/solver-search-resumability.md`'s research ladder: "bounded beam → DFS handoff from selected frontier states") solves fewer levels (1/60) than either DFS started fresh from the gate (4/60) or DFS started fresh after beam's work is discarded (4/60), with three clean losses (levels DFS-from-gate solves that the handoff does not) and zero clean wins (the one level the handoff solves, beam alone also solves independently). Inheriting beam's specific residual state actively hurts DFS here, unlike the positive same-family beam→beam handoff in rung 2.
> **Remaining gate:** none for this exact form (single inherited residual state, no selection strategy, this profile pair/width/budget). A materially different form — selecting a residual state specifically suited to depth-first continuation, or handing off several candidate states rather than one — would be a new premise, not a resumption of this one.
> **Evidence role:** development — a first, bounded cross-method handoff check, not a confirmation-grade sweep.
> **Selection:** prespecified (same two populations/seeds as rungs 2–3, reused for direct comparability; profile pair, width, and the two work budgets — 20,000 for the beam stage, 10,000,000 total — fixed before dispatch; 10,000,000 was chosen after a small calibration finding plain best-first DFS solved nothing even at 20,000,000 work and needed an LDS wrapper to be a real technique at all — see Finding 1 — a methods calibration, not outcome selection).

## Why this check

Rungs 1–3 (2026-09-03) all tested same-search-family handoffs: beam pausing and resuming itself (rung 1), inheriting another beam policy's frontier (rung 2, small positive signal), and multiple beam policies sharing one frontier (rung 3, negative). `docs/solver-search-resumability.md`'s research ladder step 4, gated on rung 2's positive result ("only if that succeeds, test bounded beam → DFS state handoff"), asks a structurally different question: can a fundamentally different search algorithm (DFS) productively inherit a state a beam search produced, rather than just another beam?

The doc's own "Cross-method state handoff" section flags this as "more demanding" and requires a typed contract: which state is handed off, how producer work is charged, whether the consumer can reconstruct state cheaply, and whether the handoff is genuinely novel rather than something the consumer could cheaply rediscover. This pilot's design answers each explicitly (see Method).

## Method

**The handoff mechanism.** `dfsFromGate` and `beamSearchFromGate` already share one underlying state representation (`SolverSearchState`, built via `createState`/`applyMove` in `modules/solver/search-state.ts`) — they differ only in search *strategy* (stack-based depth-first vs. frontier-based breadth), not in how a position is represented. This means beam's own live `ws` object (captured via rung 2's `captureContinuationOnBudgetExit`) can be handed directly to a DFS loop with **zero extra work charged for the handoff itself** — no path replay, no re-derivation. This directly answers the doc's "can the consumer reconstruct state cheaply and exactly" (yes, for free) and "how is producer work charged" (the same `prep._workMeter.units`, shared by reusing one `prep` across both stages, exactly as in rungs 1–3).

**The external DFS.** Rather than modify `dfsFromGate` itself to accept a resume state — the doc's "do not build a general blackboard or universal shared-state substrate from this possibility alone" argues against touching the hot, heavily-tuned production DFS loop for a first bounded pilot — `scripts/beam-to-dfs-handoff-pilot.mjs` reimplements a minimal DFS loop from `SOLVER_TESTING_API`'s exposed primitives (`getNeighbors`, `applyMove`, `scoreAndSort`, `evaluatePrunedMove`, `getRealLengthFromState`, plus `undoMove`, newly exposed this session specifically for this pilot — small and safe, mirroring the existing `applyMove` export). The root stack frame's `undoInfo` is null, matching `dfsFromGate`'s own root-frame convention: once every child of the inherited position is exhausted, the search stops rather than backtracking into beam's own prefix — "DFS pays only for drilling deeper from the inherited state," per the doc.

**Populations, profiles, budgets.** Same two independent 30-level uniform corpus2 samples as rungs 2–3, `beamSearchFromGate(intersectionHarvest)` at `beamWidth=200` (required for `captureContinuationOnBudgetExit`'s top-of-loop capture — see rung 2's Finding 1), `objectiveFirst` for DFS. Beam stage capped at `W1=20,000` (same calibration as rungs 2–3); total envelope `W=10,000,000` (see Finding 1 for why this is far larger than rungs 2–3's own `W=300,000`).

**Four arms per level:**
- **beam-only@W** / **dfs-only@W** — each technique alone, full `W`.
- **fresh DFS-after-beam** — beam for `W1` (paid, then discarded), DFS started FRESH FROM THE GATE for the remaining `W-W1`. Isolates "does DFS need beam's specific residual state, or would it do just as well with a smaller total budget."
- **handoff** (the treatment) — beam for `W1`, then DFS continues from beam's exact residual state for the remaining `W-W1`.

## Finding 1: plain best-first DFS could not solve anything even at 20,000,000 work — LDS is required

An initial calibration at `W=300,000` (rungs 2–3's own envelope) found beam, DFS, and both handoff variants solving **0/30** levels — completely uninformative. Raising `W` to 5,000,000 and then 20,000,000 still found DFS solving nothing. Root cause: `dfsFromGate` is never called directly in production — every real caller reaches it through `dfsFromGateLDS`'s limited-discrepancy-search ladder (cheap bounded-discrepancy probes before an unbounded best-first fallback), and plain best-first alone is measurably far weaker on this corpus. The pilot script's DFS was rewritten to a minimal LDS wrapper (`dfsFromStateLDS`, discrepancy bounds `[0,1,2,4,8]` then unbounded, a work-based ladder mirroring `dfsFromGateLDS`'s own shape) before any result was trusted. This also surfaced a real composability requirement: `dfsFromStateOnce` must fully unwind its stack on a mid-search timeout (not just on natural exhaustion) so that a later wave in the ladder resumes from the true shared root rather than wherever the previous wave's timeout happened to land — `dfsFromGate` itself never needs this because every LDS probe wave gets its own fresh `createState`, but reusing one live inherited `ws` across waves is this pilot's whole point. Both fixes are documented inline in the script.

## Finding 2: two work-accounting bugs, found and fixed before trusting results

(1) The beam stage's own `prep._workCap` was never set in the first script draft, so `captureContinuationOnBudgetExit` never had a budget to fire against — beam ran uncapped and only ever returned via natural exhaustion, which carries no continuation. `liveHandoff` was false on every row until fixed. (2) The handoff arm's DFS call initially passed the full total budget `W` rather than the remaining budget `W - workSpentA`, on a `prep` that already carried the beam stage's spend — silently letting that one arm's total exceed `W` by ~20,000 every time. Both are fixed and documented in the script; see its own comments for the exact reasoning, written so a future reader hits neither mistake again.

## Result

10,000,000 work, `beamWidth=200`, `W1=20,000`:

| Sample | beam-only | dfs-only | fresh DFS-after-beam | handoff |
|---|---:|---:|---:|---:|
| 1 | 0/30 | 1/30 | 1/30 | 0/30 |
| 2 | 2/30 | 3/30 | 3/30 | 1/30 |
| **Combined** | 2/60 | **4/60** | **4/60** | **1/60** |

All 4 non-trivial solves, by level:

| Level | beam | dfs-only | fresh DFS-after-beam | handoff |
|---|:-:|:-:|:-:|:-:|
| R02124 | — | ✓ | ✓ | — |
| R02477 | ✓ | ✓ | ✓ | — |
| R02968 | ✓ | — | — | ✓ |
| R03307 | — | ✓ | ✓ | — |
| R03344 | — | ✓ | ✓ | — |

`dfs-only` and `fresh DFS-after-beam` agree on every level (unsurprising: fresh DFS's budget, `W - workSpentA ≈ 9,980,000`, differs from `dfs-only`'s full `10,000,000` by only 0.2%). The handoff arm loses on 3 of those 4 levels (`R02124`, `R03307`, `R03344`) — cases where DFS-from-gate succeeds but DFS-from-beam's-residual-state does not. Its one solve (`R02968`) is confounded: `beam-only` independently solves that level too, so it does not cleanly demonstrate the handoff's DFS portion needed beam's specific prefix — it may simply have inherited a state already on beam's own winning trajectory.

## Interpretation

This is a clean negative for the tested form: **inheriting beam's specific residual state hurts DFS relative to letting DFS choose its own path from the gate**, with 60 levels total, 0 confounding-free wins for the handoff, and 3 clean losses. This contrasts with rung 2's positive same-family (beam→beam) handoff and is a plausible, not merely a null, result: beam (`intersectionHarvest`, width-culled breadth search) and DFS (`objectiveFirst`, single-path best-first descent with LDS) optimize for different things at each step. A position beam considers good enough to survive its coarse-state-merge/width cull may be a poor commitment for a method that, from that point on, must resolve every remaining choice through one continuous depth-first path — DFS starting its OWN path from the gate can choose a self-consistent sequence throughout; DFS inheriting beam's prefix is stuck with whatever partial commitments beam's different optimization criteria already made. This is exactly the doc's own warning about cross-method handoff being "more demanding": producer and consumer here have compatible state *representations* but evidently incompatible search *shapes*.

## Scope and what this does not show

- One profile pair (`intersectionHarvest` beam → `objectiveFirst` DFS/LDS), one direction (beam→DFS, not DFS→beam), one width/work-split/population pair.
- No selection strategy: the handoff always uses whichever single frontier node beam's `ws` happened to be positioned at when the cap fired, never "the best of several candidates" or a state chosen for DFS-friendliness specifically. The doc's own phrasing ("select one or a bounded number of frontier states") anticipates a real selection step this pilot did not attempt.
- The reimplemented LDS wrapper is a simplified, uncalibrated approximation of `dfsFromGateLDS` (a 30%/70% probe/final split chosen for this pilot, not the production 0.6 constant, which is sized for wall-clock budgets at a different scale) — absolute solve rates here should not be read as DFS/LDS's real production strength, only as a fair, matched basis for comparing the four arms against each other.
- Same corpus2-only scope as rungs 2–3; not cross-generator-confirmed.

## Follow-on

This closes the simplest rung-4 form (single inherited state, no selection). Per the research ladder's "a failure at an earlier rung does not prove later handoff impossible, but it removes the main architectural justification for generalizing the resumable-state abstraction" — this result removes that justification for naive beam→DFS handoff specifically; it does not by itself rule out cross-method handoff in general. If rung 4 is revisited, the most informative next candidate is a genuine *selection* step — e.g., preferring a frontier state whose residual structure looks more DFS-friendly (closer to the goal, fewer outstanding must-pass/must-cross obligations) over an arbitrary one — rather than another blind single-state handoff of this same pair. Per the research ladder's own step 5 ("only after repeated positives, consider a generalized shared search-state/operator architecture"), a second, unrelated negative result (after rung 3's) is reason for caution before investing further in a general cross-method handoff architecture, not reason to abandon the narrower selection-strategy question.
