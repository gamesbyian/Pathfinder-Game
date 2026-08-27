# Beam cost breakdown: candidate generation/apply/undo dominates, not connectivity or replay

> **Status:** concluded-positive
> **Last evidence:** 2026-08-27 — four independent `PF_BEAM_DEBUG=1` runs on current HEAD (`b97358a1`)
> **Decision:** candidate generation/apply/undo/scoring (excluding connectivity) is the largest disjoint component of `beamSearchFromGate`'s instrumented self-time on every workload tested, by a wide and reproducible margin. Per the pre-declared decision rule in [`solver-architectural-speed-opportunities.md`](../solver-architectural-speed-opportunities.md#execution-order) and queue item #7, this nominates the documented fused-JS move/state kernel as the next bounded pilot; connectivity and replay are each real but clearly secondary.
> **Remaining gate:** design and run one bounded fused-JS move/state-kernel pilot against current `applyMove`/`undoMove`/candidate-loop code, with the same deterministic node-budget + interleaved-wall-time + byte-identical-trace protocol used for the closed scorer pilot.
> **Evidence role:** discovery
> **Selection:** prespecified — this is queue item #7's own predeclared next gate ([`2026-08-26-current-head-specialized-scorer-pilot.md`](2026-08-26-current-head-specialized-scorer-pilot.md)'s "remaining gate"), not a threshold or workload chosen after seeing results. No parameter/workload was retried or dropped after inspection.

## Question

`beamSearchFromGate` owns ~21-30% self-time on recent profiles (see the scorer pilot), but a CPU self-time profile does not say *which part* of the function is expensive. The solver already carries debug-only, env-gated (`PF_BEAM_DEBUG=1`) `hrtime` accumulators for five phases of its per-node candidate loop: path **replay** (undo/redo to the target parent), **candGen** (the whole per-candidate loop: `getNeighbors`, `pruneFirstStepNeighbors`, `buildCurUrgencyContext`, `applyMove`/`undoMove`, `scoreMove`, array push), **conn** (`evaluatePrunedMove`'s connectivity/flood-fill check, timed as a nested sub-span *inside* the candGen window), **dedup** (post-loop beam state-key dedup), and **sort** (post-loop score sort). No production code, budget, ordering, or policy changed for this measurement — same premise class as the scorer pilot's fresh profile step.

## Method

Ran `scripts/solver-speed-probe.mjs` (bundled, not plain `tsx`) with `PF_BEAM_DEBUG=1`, a 250,000-node cap and a 600,000 ms non-binding wall allowance — identical protocol to the closed scorer pilot — on four independent workloads:

- three disjoint 24-level Corpus-2 stride samples (`--corpus=corpus2 --count=24 --stride={70,43,113}`, different `--start` offsets so the three samples do not overlap);
- the full 160-level published corpus.

Each `[beam]` debug line emitted per `beamSearchFromGate` invocation was parsed and its five ms buckets summed across the whole run. `candGen`'s accumulator window strictly encloses `conn`'s (the connectivity timer starts/stops inside the same per-candidate loop iteration `candGen` times as a whole — see `search.ts`'s `_t1`/`_tc` gating), so the disjoint, non-overlapping breakdown reported below is `replay`, `candGenExcl = candGen − conn`, `conn`, `dedup`, `sort`. Reporting raw `candGen` without subtracting `conn` would double-count connectivity time and is not used here.

Commit: current HEAD, `b97358a1` (same commit this report is added on; no solver source changed).

## Result

| Workload | Beam calls | Disjoint instrumented total | replay | candGenExcl (apply/undo/score/getNeighbors) | conn | dedup | sort |
|---|---:|---:|---:|---:|---:|---:|---:|
| Corpus-2, stride 70 (24 levels) | 90 | 21,644 ms | 14.7% | **55.3%** | 19.8% | 2.4% | 7.7% |
| Corpus-2, stride 43 (24 levels) | 87 | 17,526 ms | 16.2% | **53.8%** | 18.3% | 4.3% | 7.4% |
| Corpus-2, stride 113 (24 levels) | 57 | 12,227 ms | 16.0% | **53.1%** | 19.1% | 2.7% | 9.1% |
| Published, all 160 | 91 | 6,524 ms | 16.2% | **46.5%** | 27.2% | 2.4% | 7.7% |

`candGenExcl` is the largest single bucket on every one of the four independent workloads, at roughly **2-3x** `conn` and **3-4x** `replay`, and is stable in the 46.5-55.3% range across three non-overlapping hard-corpus samples plus the full published corpus. `conn` (16.6-27.2%) and `replay` (12.3-16.2%, using the raw, non-recomputed percentages from each run) are each real but consistently second- and third-place. `dedup` and `sort` are minor (2-4% and 6.5-9.1%).

The disjoint instrumented total covers 60-73% of each workload's overall wall time (the remainder is DFS/LDS technique time, non-beam solver dispatch, and setup — beam is one technique among several the portfolio runs per level, and `beamSearchFromGate` itself was previously profiled at ~21-30% self-time, consistent with these shares of a further-restricted beam-only window).

## Interpretation against the pre-declared decision rule

[`solver-architectural-speed-opportunities.md`](../solver-architectural-speed-opportunities.md)'s execution order (step 3) and the closed scorer pilot's own "remaining gate" both state the same three-way branch in advance:

> If candidate generation/apply/undo dominates, run one bounded fused-JS move/state-kernel pilot; if replay is material, revisit state materialization; if neither is material, close those forms rather than guessing.

Candidate generation/apply/undo dominates on every workload measured, so this closes the "guess" branch and the "replay-primary" branch, and opens the fused-JS move/state-kernel pilot as the next step. This does **not** reopen the closed scorer pilot: that pilot already covered `scoreMove` specifically (one sub-part of `candGenExcl`) and found no static-branch-deletion win; the new evidence here is about the *loop as a whole* (`getNeighbors`, `pruneFirstStepNeighbors`, `buildCurUrgencyContext`, `applyMove`, `undoMove`, plus `scoreMove`), which is what the documented "fused move/state kernel" idea (fixed neighbor slots, dense mechanic metadata, direct legality/state updates, primitive undo storage) already targets.

Connectivity (`conn`, 16.6-27.2%) and replay (12.3-16.2%) are real costs but are each roughly half of `candGenExcl` or less on every workload; per the same execution order, neither earns its own pilot ahead of the fused-kernel candidate. Beam state materialization (replay) stays closed per its own doc entry ("measure replay share on current HEAD... if replay is no longer material, close this direction") — replay is present but clearly not the largest bucket, so that direction remains closed rather than reopened.

## What this does not establish

This is a discovery/diagnosis measurement, not a promotion claim: it identifies where wall time goes, not that a fused kernel will recover it net of implementation/dispatch overhead — the closed scorer pilot is the concrete precedent that a materially-hot bucket does not automatically yield end-to-end wall-time recovery once V8's own optimization is accounted for. Any fused-kernel pilot still needs its own bounded implementation, byte-identical solve/node-trace verification, and interleaved wall-time A/B on both a short-solve (published) and long-hard (Corpus-2) workload before any claim of net speedup.

## Disposition

Close queue item #7's "run the existing debug-only beam breakdown" gate. Next gate: design and run one bounded fused-JS move/state-kernel pilot per `solver-architectural-speed-opportunities.md`'s "Fused move/state kernel" entry, using the same evaluation protocol as the closed scorer pilot (deterministic node budget, non-binding wall deadline, byte-identical `id:solved:nodes` signatures required before timing is interpreted, interleaved reps on both published and hard-Corpus-2 workloads).
