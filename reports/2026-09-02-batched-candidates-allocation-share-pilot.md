# Batched candidates allocation share: value-of-information check, closed negative

> **Status:** concluded-negative
> **Last evidence:** 2026-09-02 — fresh `PF_BEAM_DEBUG=1` runs on current HEAD, exact same protocol/workloads/level selection as the getNeighbors allocation-share pilot this one directly follows
> **Decision:** the per-candidate `BeamNode` object-literal construction (`cands.push({...})`) — the concrete mechanism a "batched candidates" struct-of-arrays redesign would target — is a minority (11.5-12.7%) share of the already-measured `candGenExcl` bucket, comparable in size to `getNeighbors`'s own already-closed 8.3-14.2% share, not an independently dominant cost. Do not build a struct-of-arrays/batched-allocation pilot targeting this candidate; it is closed without an implementation attempt.
> **Remaining gate:** none for this specific candidate. This was the last named "still-untested direction" from the fused-kernel entry in `solver-architectural-speed-opportunities.md`; no further descendant of that pilot is nominated. A future speed candidate needs a materially different mechanism, not another allocation-avoidance variant on this exact hot loop.
> **Evidence role:** discovery/value-of-information pilot (no code shipped as a production result; instrumentation only)
> **Selection:** prespecified — evaluates the exact candidate `2026-09-02-getneighbors-allocation-share-pilot.md`'s own disposition named as the remaining descendant ("batching work across candidates... a structurally different, bigger redesign this measurement does not speak to"), before any implementation, per the doc's own "profile first" rule.

## Why this measurement, and why before any implementation

The getNeighbors pilot closed one candidate (isolating `getNeighbors`'s own allocation) but explicitly left "batching work across candidates rather than fusing one candidate's cycle at a time" as the one still-untested descendant of the closed-negative fused-kernel pilot. `candGenExcl`'s per-candidate loop constructs one 11-field `BeamNode` object literal per surviving candidate (`cands.push({...})` in `beamSearchFromGate`) — the concrete allocation site any struct-of-arrays/batched-candidate redesign would actually target, since that redesign's whole premise is amortizing or eliminating per-candidate object allocation across a batch. Before spending implementation effort on that redesign, this pilot answers the same cheaper prior question the getNeighbors pilot did: how large is this specific allocation's own share of `candGenExcl`, on its own?

There is also a standing prior from four already-closed pilots in this exact program, all targeting variants of "avoid allocation/restructure the hot representation": the static plain/default scorer specialization (+0.91% published, flat on Corpus-2), the fused plain-candidate kernel (+3.13% published, flat/noisy on Corpus-2 — eliminating a *superset* of this candidate's own target, including `UndoToken` allocation), the naive six-array dense `prepLevel()` conversion (-2.82% regression on hard Corpus-2), and the getNeighbors pilot itself (closed by measurement, no implementation). Every one of these found V8's own object/array allocation and JIT to already be well-matched to this hot loop's small, short-lived, fixed-shape allocations. This measurement checks whether the specific mechanism a batched-candidates pilot would target is even large enough to plausibly buck that pattern before investing in a fifth attempt.

## Method

Added a nested `_BEAM_DEBUG`-only sub-timer (`_dbgCandBuildNs`/`_dbgCandBuildCalls`) around the single `cands.push({...})` object-literal construction in `beamSearchFromGate`'s per-candidate loop — the identical pattern the existing `_dbgConnNs` and `_dbgNeighborsNs` sub-timers already use, nested inside the same `candGen` window. Zero production cost (gated behind the same `_BEAM_DEBUG` env check every existing counter uses); appended as a new field to the existing `[beam]` debug log line.

Ran `scripts/solver-speed-probe.mjs` (bundled) with `PF_BEAM_DEBUG=1`, a 250,000-node cap, and a 600,000 ms non-binding wall allowance — the exact protocol, node budget, and level selection the 2026-08-27 breakdown and the getNeighbors pilot both used — on the same two workloads:

- Corpus-2 stride 70, 24 levels (`--corpus=corpus2 --count=24 --stride=70`);
- the full 160-level published corpus.

## Result

| Workload | Beam calls | Reproduced (getNeighbors pilot's own count) | candGenExcl % of disjoint total | candBuild % of disjoint total | **candBuild % of candGenExcl** | (for comparison) neighbors % of candGenExcl |
|---|---:|---:|---:|---:|---:|---:|
| Corpus-2, stride 70 (24 levels) | 90 | 90 ✓ | 58.9% | 7.5% | **12.67%** | 8.3% |
| Published, all 160 | 91 | 91 ✓ | 50.8% | 5.8% | **11.49%** | 14.2% |

Beam call counts match the getNeighbors pilot exactly on both workloads (90 and 91), confirming this run reproduces the same workload/protocol.

`candBuild`'s own share of `candGenExcl` is a **minority** on both workloads — 12.67% hard Corpus-2, 11.49% published — the same order of magnitude as `getNeighbors`'s already-closed 8.3-14.2% share. Combined, `getNeighbors` + `candBuild` together account for only ~20-27% of `candGenExcl` on either workload; the remaining ~73-80% is spread across `applyMove`/`undoMove`/`evaluatePrunedMove`'s non-connectivity share/`scoreMove`/`buildCurUrgencyContext` — exactly the broader set the already-closed fused-kernel pilot targeted in bulk and still lost net wall time on.

## Interpretation

This is a negative value-of-information result for "batched candidates" specifically, decided before any implementation:

- The concrete allocation a batched-candidates redesign would eliminate (`candBuild`) is, on its own, a similarly small minority share as `getNeighbors` — not a newly-discovered dominant cost the closed pilots missed.
- A batched-candidates implementation would need to recover a smaller absolute cost than the fused-kernel pilot's own target (a strict superset including this allocation plus `UndoToken`/`applyMove`/`undoMove`) and still lost wall time on, using the same class of hand-restructuring technique that pilot, the static-scorer pilot, and the six-array dense-conversion pilot all already showed nets flat-to-negative on this codebase's hot paths.
- Building this pilot anyway, absent new evidence that batching's implementation overhead (indexing, bookkeeping, cache-locality bookkeeping across a struct-of-arrays layout) would somehow be smaller here than in any of the four prior closed attempts, would very likely repeat their outcome for an even smaller potential upside than the fused-kernel pilot already lost with.

## What this does not establish

- Does not claim no allocation-reduction idea could ever help this hot loop under a genuinely different mechanism than the five now-measured/closed variants (static specialization, kernel fusion, dense six-array conversion, fixed neighbor slots, per-candidate object batching) — only that this specific, named "still-untested direction" is not independently justified by its own measured footprint.
- Does not reopen or re-measure connectivity, replay, dedup, or sort — unchanged from the 2026-08-27 breakdown and the getNeighbors pilot.
- Ships no production code change; the added debug counter is instrumentation only, silent unless `PF_BEAM_DEBUG=1` is set.

## Disposition

Close "batched candidates" without an implementation pilot; `solver-architectural-speed-opportunities.md` updated accordingly. This was the last named descendant of the fused-kernel entry — Workstream 7 (architectural speed) currently has no further nominated candidate on this hot loop; a future attempt needs a materially different premise (a newly measured hotspot, or a mechanism this exact allocation-avoidance/restructuring class hasn't already covered), not another variant of the same idea.

## Reproduction

```bash
PF_BEAM_DEBUG=1 node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
  --corpus=corpus2 --count=24 --stride=70 --budget-ms=600000 --node-budget=250000 --out=/tmp/c2-70.json 2>/tmp/beam-debug-c2-70.log
PF_BEAM_DEBUG=1 node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
  --corpus=published --count=160 --budget-ms=600000 --node-budget=250000 --out=/tmp/pub.json 2>/tmp/beam-debug-pub.log
# then sum each line's replay/candGen/conn/neighbors/candBuild/coarseMerge/sort ms fields per workload
```
