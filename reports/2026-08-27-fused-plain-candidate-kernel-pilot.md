# Fused plain-candidate move/state kernel pilot

> **Status:** concluded-negative
> **Last evidence:** 2026-08-27 — 5-repetition interleaved fixed-work A/B on every level actually eligible for the fused path in both the published and Corpus-2 corpora, with byte-identical solve/node traces between control and treatment
> **Decision:** close the tested fused-JS move/state kernel form. It was +3.13% slower (geometric mean, slower in every one of 5 reps) on the 24 published levels that engage it, and effectively flat/noisy (-0.11%) on the 4 Corpus-2 levels that do.
> **Remaining gate:** none for this exact form. A materially different fused-kernel candidate would need a different mechanism (see "What this does and does not establish" below), not a wider eligibility gate or more tuning of this same branch-inlining approach.
> **Evidence role:** bounded pure-speed development pilot
> **Queue item:** #7, architectural speed and execution substrate

## Question

The [2026-08-27 beam cost breakdown](2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md) found candidate generation/apply/undo dominating `beamSearchFromGate`'s self-time (46.5-55.3% across four independent workloads) and, per the pre-declared decision rule in [`solver-architectural-speed-opportunities.md`](../solver-architectural-speed-opportunities.md), nominated the documented "fused move/state kernel" idea as the next bounded pilot: does replacing the generic `applyMove`/`evaluatePrunedMove`/`undoMove` dispatch with direct state mutation and non-allocating undo storage — for levels where every guarded mechanic branch inside that dispatch is provably dead code — produce a measurable representative wall-time win while preserving exact search decisions?

No production policy, budget, ordering, eligibility, score weight, prune rule, or solver source changed for this experiment (the tested code was never merged — see Disposition).

## Treatment

A narrow eligibility gate, computed once per `beamSearchFromGate` call:

```
cfg == null && !research
  && level.mustPassKeys.length === 0
  && level.mustCrossKeys.length === 0
  && level.portalMap.size === 0
  && level.flippingFilterMap.size === 0
  && !prep.hasLandmarkConstraints
```

`cfg == null` restricts the fast path to the ordinary production path (no ablation-config override can be silently ignored, since every prune rule the fast path hard-codes as "on" — `PRUNE_DISTANCE_BOUND`, `PRUNE_PARITY`, `PRUNE_INTERSECTION_DEFICIT`, `PRUNE_CONNECTIVITY` — is exactly what `cfg == null` already means throughout this file). `!research` keeps every research/diagnostic observation hook (hint-enumeration/diversification instrumentation sharing this same function) on its unmodified path. The five mechanic/landmark predicates are exactly the guards that make every must-pass/must-cross/flipper/landmark/portal branch inside `applyMove`, `undoMove`, and `evaluatePrunedMove` unreachable for such a level — verified by reading `prep.ts`'s `buildIndexArr`/`hasLandmarkConstraints` construction, not assumed.

Within that shape, a new candidate-loop branch in `beamSearchFromGate`:

- inlined `applyMove`'s live subset (visit-count, path push, edge-usage, intersection-add — skipping the must-pass/must-cross/flipper/landmark fields, which are dead for an eligible level) directly against `ws`, with no `UndoToken` object ever constructed;
- inlined `evaluatePrunedMove`'s live rule subset in the same order (fundamental length/intersection caps → goal-state check → distance-bound → parity → intersection-deficit → connectivity), calling the same shared `getDistanceFromArray`/`keyParity`/`isConnected`/`isSolutionState` helpers the generic path already uses, skipping only the rules `evaluatePrunedMove` itself already guards behind an always-false predicate for this level shape;
- undid the move via a new top-level (non-closure) `undoFusedPlainMove(ws, from, target, prevVisited, prevEdgeFrom, prevEdgeTarget, wasIntAdded)` taking scalar arguments, so nothing is allocated to represent "how to undo this candidate" between apply and undo — the entire point of the pilot, per `solver-architectural-speed-opportunities.md`'s "primitive undo storage" framing, as distinct from the already-closed `UndoToken`-pooling form (which still allocated/reused an object).

Every other code path (any mechanic present, any ablation override, research mode) fell through to the exact unmodified generic path.

## Participation audit

An eligibility census over both corpora (`SOLVER_TESTING_API.prepLevel`, checking the same five predicates) found:

| Corpus | Eligible | Total |
|---|---:|---:|
| Published | 24 | 160 |
| Corpus-2 | 4 | 1,700 |

This is a narrow population — the fused path only ever fires on levels with zero must-pass/must-cross/portal/flipper/landmark mechanics, which is a small minority of both corpora (15% of published, 0.24% of Corpus-2). An initial pass that checked only the four non-landmark mechanic counts (skipping `hasLandmarkConstraints`) over-counted 27 published and 25 Corpus-2 levels as eligible; 3 and 21 of those, respectively, actually carry landmark constraints and never engage the fused branch. All A/B numbers below use the corrected 24/4 eligible sets specifically, not the over-counted ones, so the measured effect is not diluted by non-participating levels.

## A/B protocol

Control and treatment were materialized as detached git worktrees from the same commit (`426d4cf2`, current `main` at pilot time — the same commit this report and its predecessor breakdown report land on); the treatment patch was applied only inside the working tree, never committed. Both bundles were warmed once before timing. Five repetitions, alternating control-then-treatment each rep, `--budget-ms=600000 --node-budget=250000` (non-binding wall deadline, deterministic node cap — same protocol as the closed scorer pilot), run via `--ids=<comma-separated>` against exactly the 24 published and 4 Corpus-2 eligible levels.

## Result

Deterministic parity passed completely on every rep, both workloads: `id:solved:nodes` signatures were byte-identical between control and treatment in all 10 runs (5 published + 5 Corpus-2).

### Published (24 eligible levels)

| Rep | Control | Treatment | Delta |
|---:|---:|---:|---:|
| 1 | 626.3 ms | 638.7 ms | +1.99% |
| 2 | 557.8 ms | 562.4 ms | +0.83% |
| 3 | 573.7 ms | 601.1 ms | +4.78% |
| 4 | 588.6 ms | 631.8 ms | +7.34% |
| 5 | 559.9 ms | 564.9 ms | +0.89% |

Geometric-mean treatment delta: **+3.13% slower**, slower in every single rep.

### Corpus-2 (4 eligible levels)

| Rep | Control | Treatment | Delta |
|---:|---:|---:|---:|
| 1 | 1,440.3 ms | 1,452.2 ms | +0.82% |
| 2 | 1,453.9 ms | 1,489.8 ms | +2.47% |
| 3 | 1,468.9 ms | 1,538.4 ms | +4.73% |
| 4 | 1,541.1 ms | 1,430.7 ms | -7.16% |
| 5 | 1,460.8 ms | 1,445.9 ms | -1.02% |

Geometric-mean treatment delta: **-0.11%**, effectively flat/noisy (3 of 5 reps slower, 2 faster) — not distinguishable from run-to-run noise on this 4-level sample.

A separate full-corpus sanity check (`solver:bench --check`, all 160 published levels, 100,000,000 work budget) confirmed zero decision drift beyond the eligible subset too: 68,562,085 nodes and 160/160 solved, byte-identical between the treatment working tree and unmodified HEAD (the printed "vs baseline" cost delta is an unrelated stale-baseline artifact — reproduced identically with the treatment reverted). All 465 targeted `modules/solver` vitest tests pass.

## Interpretation

The published workload gives a clean, consistently-signed result: slower in 5/5 reps, by a geometric mean of +3.13% — this meets the same "faster (here, slower) in every single round measured" bar the 2026-08-23 report used to accept a *positive* order-preserving change, just in the wrong direction. The Corpus-2 result, on only 4 levels, is too small and noisy to add an independent directional claim, but it gives no positive signal either.

This closely mirrors the closed scorer pilot's own conclusion: **V8 already handles the generic `applyMove`/`evaluatePrunedMove`/`undoMove` dispatch — including its per-candidate `UndoToken` allocation — well enough that hand-inlining a "dead branches removed" specialization does not recoup its own added dispatch/branch-computation cost.** It also reinforces the already-closed `UndoToken`-pooling precedent from a different angle: that prior work found *reusing* an UndoToken object measured slower than V8's nursery allocator; this pilot finds that *eliminating* the allocation entirely (not merely pooling it) still does not pay for itself once the replacement code has to re-implement the gauntlet's rule dispatch inline. V8's monomorphic inline caching on the stable-shape `UndoToken` object and its generational-GC nursery allocation are evidently cheaper than the branch/verdict-computation overhead this pilot's hand-written replacement adds.

## What this does and does not establish

This closes the specific tested form: a per-call eligibility-gated inline replacement of `applyMove`/`evaluatePrunedMove`/`undoMove` for mechanics-free levels, built as a discrete `if (_fusedPlainEligible) { ... }` branch inside the existing candidate loop. It does not establish that no representation change to the candidate loop could ever help, and it does not touch:

- **fixed neighbor slots** (avoiding `getNeighbors`'s per-node array allocation) — untested here; this pilot only fused the per-candidate apply/evaluate/undo cycle, not neighbor generation itself;
- **connectivity** (16.6-27.2% of instrumented beam time per the breakdown report) — deliberately left as the exact unmodified `isConnected` call in both paths;
- **replay** (12.3-16.2%) — already separately measured and closed (see the breakdown report and `solver-architectural-speed-opportunities.md`'s "Beam state materialization" entry).

A materially different fused-kernel candidate would need a different mechanism than "delete/inline the same dead branches a different way" — for example, actually eliminating a currently-unavoidable computation (not just its dispatch overhead), or restructuring the loop to batch work across candidates rather than fusing one candidate's apply/evaluate/undo cycle at a time. Absent such a mechanism, do not retest this exact branch-inlining form.

## Disposition

Close the tested fused-plain-candidate-kernel form as **negative**. The code was developed and measured only inside disposable git worktrees (per [`solver-research-operating-model.md`](../solver-research-operating-model.md)'s "do not preserve failed code for posterity") and was never committed to any branch; nothing needs reverting. Candidate generation/apply/undo remains the largest named self-time bucket per the breakdown report, but this specific mitigation is closed. See `solver-optimization-current-queue.md` (item #7) and `solver-architectural-speed-opportunities.md`'s "Closed unchanged forms" for the updated disposition.
