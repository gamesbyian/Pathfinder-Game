# Beam alternating-policy-schedule pilot (rung 3)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — the same two independent 30-level uniform corpus2 samples used for rung 2 (60 levels), plus a segment-size sweep (5,000/10,000/40,000/60,000-work segments on both) and a third, fresh, disjoint 30-level confirmation sample at the sweep's most promising size — 90 additional level-runs total. See "Addendum" below. Current HEAD.
> **Decision:** Repeatedly alternating `intersectionHarvest`/`objectiveFirst` on one continuously-shared beam frontier (rung 3 of `docs/solver-search-resumability.md`'s research ladder, in its simplest 2-policy cyclic form) solves no more levels than a single one-time switch (rung 2's own treatment) at segment sizes 20,000/40,000/60,000 (exact match, 0 net difference each time), despite the arms' search trajectories genuinely diverging (45% of levels reach natural exhaustion at a different segment count). A segment-size sweep found a small suggestive edge for alternating at finer sizes (5,000/10,000), but this did not replicate on an independent confirmation sample at the same size (0/0 net wins) — net across all three `segment=5,000` samples (90 levels) is 2 alternating-only wins to 0 switch-only wins, consistent with noise. A single handoff already captures all the value this profile pair/budget/width offers; repeated alternation adds nothing reliable at any tested segment size.
> **Remaining gate:** none for cyclic alternation at this profile pair/width/budget, across a 12x segment-size range (5,000–60,000). A materially different schedule shape (staged/non-cyclic, 3+ policies, or adaptive) would be a new premise, not a resumption of this one.
> **Evidence role:** development — a direct generalization check of rung 2's own treatment plus an exploratory segment-size sweep with its own confirmation attempt, not a confirmation-grade sweep of the whole design space.
> **Selection:** the main result is prespecified (same populations/seeds as rung 2, reused verbatim for direct comparability; segment size/profiles/width/work fixed to rung 2's own calibrated values before dispatch). The segment-size sweep in the Addendum is explicitly disclosed as selected-after-inspection (4 sizes swept, the most promising highlighted) and was then tested with one prespecified, independently-drawn confirmation sample before being reported as non-replicating — see the Addendum for the full disclosure.

## Why this check

`2026-09-03-beam-policy-switch-complementarity-pilot-001.md` (rung 2) found a real, if small, one-directional benefit from ONE `intersectionHarvest`→`objectiveFirst` frontier handoff (2/60 sampled levels solved only by the resumed switch). `docs/solver-search-resumability.md` frames exactly what a positive rung-2 result could support next:

> "It could support staged beam policies such as broad early exploration followed by specialist exploitation, or **alternating operators within one fixed work envelope**."

Rung 3 ("shared beam frontier among multiple beam policies") tests that generalization directly: does repeating the handoff — alternating back and forth on one continuously-evolving frontier — add more value than the single one-time switch rung 2 already validated?

## Method

Reused rung 2's exact calibrated setup for direct comparability: `SCORING_PROFILES.intersectionHarvest`/`.objectiveFirst`, `beamWidth=200` (required for `captureContinuationOnBudgetExit`'s top-of-loop capture to be reachable at all — see rung 2's Finding 1 and `search.ts`'s own "CAVEAT" comment), `orderingBias=null`, `mechanicBucketRetention=false`, and the same two independent 30-level uniform corpus2 samples (seeds `beam-resumability-rung2-2026-09-03` and `...-confirm-2026-09-03`) — reused verbatim rather than redrawn, so every level's outcome is directly comparable to its own rung-2 result.

Generalized rung 2's single switch into a segment-based scheduler (`scripts/beam-alternating-policy-schedule-pilot.mjs`'s `runSchedule`): the total work envelope `W=300,000` is sliced into segments of `S=20,000` (rung 2's own `W1`), and a caller-supplied policy list is cycled one policy per segment on ONE continuously-shared `prep`/frontier, via repeated `resumeFrom`/`captureContinuationOnBudgetExit` calls, stopping at the first solve, the first natural exhaustion (no continuation to carry forward), or once `W` is spent. Four arms per level:

- **A-only@W** / **B-only@W** — identical to rung 2's own control arms.
- **single switch** — schedule `[A, B, B, B, ...]` (only ever switches once, at segment 1→2, then stays on B) — this is rung 2's own treatment, recomputed here from scratch rather than cross-referenced, both to build one internally-consistent table and as a validity check (same-policy repeated resumption is exactly rung 1's own proven equivalence, so slicing B's remaining execution into many same-policy segments should reproduce rung 2's single continuous B call exactly).
- **alternating** (the rung-3 treatment) — schedule `[A, B]` cycled every segment (A, B, A, B, A, B, ...) for as many segments as fit before solving, naturally exhausting, or exhausting the envelope.

## Result

| Sample | armA | armB | single switch | alternating | alternating-only wins | switch-only wins |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 0/30 | 0/30 | 2/30 | 2/30 | 0 | 0 |
| 2 | 2/30 | 2/30 | 2/30 | 2/30 | 0 | 0 |
| **Combined** | 2/60 | 2/60 | **4/60** | **4/60** | **0** | **0** |

The single-switch arm reproduced rung 2's own result exactly — the same 4 levels (`R02124`, `R02714`, and sample 2's two trivial co-solves `R02477`/`R02968`) — confirming the re-derivation is sound. The alternating arm solved precisely the same 4 levels, no more and no fewer, on both samples.

This is not because the two arms compute the same thing: **13/30 (sample 1) and 14/30 (sample 2) levels reached natural exhaustion at a different segment count** between the single-switch and alternating schedules (e.g. one sample-1 level exhausts at segment 5 under single-switch but segment 9 under alternating). The two arms genuinely explore different search trajectories — alternating is not a no-op — it simply lands on the identical final solved/unsolved outcome set on this population.

## Interpretation

For this specific tested form — two policies, 20,000-work segments, this profile pair, `beamWidth=200`, this budget — repeated alternation adds no value beyond a single one-time handoff: whatever complementarity rung 2 found is fully captured by ONE switch, and further switching back and forth neither rescues additional levels nor loses any. This is a clean, non-marginal null result (identical outcome sets across two independent samples, not merely "similar magnitude"), closed for this exact form per the operating model's "close a falsified form rather than indefinitely rescuing it with nearby thresholds" rule.

This does not mean rung 3 is closed as a whole. It means the *simplest* 2-policy, fixed-cadence alternation schedule shows no incremental benefit here. Plausible reasons this specific form might be too weak to show anything (untested, not claimed): a 20,000-work segment may be too coarse or too fine to expose any real alternation benefit; two policies this similar (`intersectionHarvest`/`objectiveFirst` share most of the same weight structure, differing mainly in magnitude — see `modules/solver/policy.ts`) may not diverge enough in behavior for repeated switching to matter; or a fixed alternating cadence may simply be the wrong schedule shape (staged broad-then-specialist, as the doc also suggests, is a different shape entirely from cyclic alternation and was not tested here).

## Scope and what this does not show

- Only the cyclic `[A, B, A, B, ...]` schedule shape was tested — not a staged (broad-then-specialist) schedule, not an adaptive/data-driven schedule, not 3+ policies.
- Segment size was swept across a 12x range (5,000–60,000, see Addendum) with no reliable effect found at any size, but not exhaustively (e.g., no size below 5,000 or above 60,000 was tried).
- Same corpus2-only, `beamWidth=200`-only, single profile-pair scope as rung 2 — none of rung 2's own scope caveats are resolved by this pilot either.

## Addendum (2026-09-03): segment-size sweep — a suggestive pattern that did not replicate

The main result above used one segment size (20,000, rung 2's own `W1`). To check whether that specific size masked a real effect, the same two populations were re-run at four more segment sizes (5,000; 10,000; 40,000; 60,000), all other parameters unchanged:

| segment | sample 1: switch / alternating (alt-only / switch-only) | sample 2: switch / alternating (alt-only / switch-only) |
|---:|---|---|
| 5,000 | 0 / 1 (+1 / 0) | 2 / 3 (+1 / 0) |
| 10,000 | 1 / 1 (0 / 0) | 3 / 3 (+1 / +1) |
| 20,000 (main result) | 2 / 2 (0 / 0) | 2 / 2 (0 / 0) |
| 40,000 | 2 / 2 (0 / 0) | 2 / 2 (0 / 0) |
| 60,000 | 0 / 0 (0 / 0) | 2 / 2 (0 / 0) |

At the two finer segment sizes (5,000 and 10,000), alternating showed a small net edge over the single switch (combined across those 4 sub-runs: 3 alternating-only wins, 1 switch-only win) — a pattern absent at 20,000/40,000/60,000. This looked like it might be a real, segment-size-dependent effect worth reporting on its own.

**It was selected after inspecting results (sweeping 4 sizes × 2 samples and then highlighting the sizes that showed something), so it was tested properly rather than reported as-is:** a fresh, independently-drawn, disjoint 30-level population (seed `beam-resumability-rung3-seg5000-confirm-2026-09-03`, excluding all 60 levels used elsewhere in rungs 2–3) was run at the single most promising size, `segment=5,000`, prespecified before looking at its outcome. Result: **0 alternating-only wins, 0 switch-only wins** — the apparent edge did not replicate.

Combined across all three `segment=5,000` samples (90 levels): 2 net alternating-only wins, 0 switch-only wins — a difference this small, on a pattern that failed its own confirmation, is consistent with sampling noise rather than a real segment-size-dependent effect. This reinforces rather than overturns the main result: cyclic alternation does not show a reliable benefit over a single switch at any segment size tested.

## Follow-on

Per the research ladder's "do not skip rungs" rule, this negative result for the simplest rung-3 form does not license skipping to rung 4 (bounded beam → DFS handoff) — that rung is a different mechanism (cross-method state handoff) with its own prerequisites, not gated on this result at all. If rung 3 itself is revisited, the most informative remaining candidate is a staged (non-cyclic) schedule — broad-exploration policy first, specialist policy for the remainder, no further switching, closer to the doc's other suggested shape than cyclic alternation — rather than another segment-size variant, which this addendum now covers reasonably well across a 12x range (5,000–60,000).
