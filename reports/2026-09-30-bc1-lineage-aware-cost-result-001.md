# BC1 lineage-aware (first-flag) cost result

> **Status:** inconclusive
> **Last evidence:** 2026-09-30 — frozen Stage-B 24-parent lineage-aware rerun (first-flag cost model).
> **Decision:** the prior 1.55x "unconditional per-candidate" figure was inflated by lineage: the shadow prunes nothing, so it re-checked descendants of already-flagged (provably dead) nodes. Under a first-flag-pruning cost model, shadow cost is **4,534,704 units = 63.3% of campaign `workSpent` (7,160,719)**, down from 154.6%. Still not economical unconditionally; a pre-filter is still the gate, but the target is now clear-check cost, not flagged cost.
> **Remaining gate:** pre-filter for clear checks, then behavioral consumer at matched work (see fresh-only result).
> **Evidence role:** development.
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`.

Same frozen Stage-B 24 parents (width 500, 3M nodes), `--lineage-aware=true`; behaviorIdentical 24/24, safety alarms 0.

| Check class | Count |
|---|---:|
| inherited-dead (skipped, free; sound since BC1 proves the parent has no completion) | 598,767 |
| first-flag (distinct dead roots a consumer would prune) | 19,427 (was 415,273 incl. descendants) |
| clear (checked, not flagged) | 465,019 |

First-flag dispositions: 15,215 later-lossy-cull, 4,212 later-deterministic-rejection (overlap with existing prunes ~22%).

## Caveats
- Cost is an upper-bound model: a real consumer changes the beam (freed slots), so counts would differ. Not a behavioral test.
- Removable work per root is NOT measured here; the collector's `workDistance` is global work-clock distance, not descendant work, and must not be read as savings.

## Next gate
Pre-filter for the 465k clear checks (~9.4 units each, ~4.4M of the 4.53M): a cheap necessary condition that skips checks unlikely to flag (flag rate among live-lineage checks is 19.4k/484k = 4.0%). Then measure descendant-subtree work per first-flag root (lineage-attributed), matched work.

Artifact: `reports/stress/bc1-shadow-disposition-stageb24-lineage-2026-09-30.json`.
