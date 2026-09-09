# STRATEGY_PORTAL_COARSE_STATE_MERGE: frozen matched-work population A/B preflight

> **Status:** active
> **Last evidence:** 2026-09-09 — implementation complete and unit-verified (`modules/solver/search.ts`); see [`aliasing measurement`](2026-09-09-portal-beam-used-pair-aliasing-measurement-001.md) and [`beam preflight`](2026-09-09-portal-beam-state-identity-preflight-001.md).
> **Decision:** pending — this report freezes the population, envelope, and acceptance rule before either arm runs.
> **Remaining gate:** dispatch control then treatment, combine, and apply the frozen acceptance rule below.
> **Evidence role:** population-scale promotion gate for `STRATEGY_PORTAL_COARSE_STATE_MERGE` (see [`opt-in ledger`](../docs/solver-opt-in-experiment-ledger.md))
> **Selection:** deterministic structural predicate over the frozen Corpus-2 source, not outcome-selected

## Why now

Beam coarse-state merge (`search.ts`'s `useCoarseStateMerge`) is unconditionally disabled on portal-bearing levels because the historical merge key (7 constraint scalars) does not capture which portal pairs a candidate consumed, so two candidates at the same cell with the same scalar tuple could be silently collapsed even when they have genuinely different remaining forced-transition sets (a visited portal terminal can never be re-entered). [`The beam preflight`](2026-09-09-portal-beam-state-identity-preflight-001.md) froze a measurement of that aliasing risk before choosing a treatment; [`the aliasing measurement`](2026-09-09-portal-beam-used-pair-aliasing-measurement-001.md) found it material (1.7% of merge-candidate groups, 2.2% of grouped candidates, 80/80 sampled levels), which per the preflight's own decision rule means the treatment must preserve exact used-pair identity rather than using the cheaper count/transient tuple.

Implementation: `BeamNode` gained a `usedPortalPairs` bitset field (bit *i* = "portal pair *i* has been jumped at least once by this path"), built from a per-level pair-index table and inherited/extended at each candidate the same way the existing 7 scalar fields already are. The merge key folds this field in via the existing string-key path (`beamStateKey`); portal levels always use that path rather than the numeric mixed-radix one, since `usedPortalPairs` is not bounded the same way the other fields are. A level whose portal-pair count would make even a 32-bit bitmask unsafe (schema allows this in principle, though the largest observed on Corpus 2 is 7) abstains — `usedPortalPairs` stays 0 for every candidate on such a level, which is exactly the pre-restoration (merge-disabled) safe default, not a silent miscount.

Gated behind a new opt-in flag, `STRATEGY_PORTAL_COARSE_STATE_MERGE` (default OFF). Unit tests prove the mechanism directly: two routes reaching the same cell with identical scalar masks but different consumed portal pairs both survive coarse merge with the flag on (`modules/solver/search.test.ts`), and merge does not run at all without it (matching the pre-restoration behavior exactly). `npm run solver:regression -- --check` (160/160, no regressions) and full `npm run ci` are both green.

## Population

Deterministic structural predicate over frozen Corpus 2 (`data/stress/stress-levels-random.json`, `sha256:89cd0b6380a6d585e43411139a0805078e78f883d02f37e7ae3513f4be55b414`): `portalPairs > 0` — the same predicate and resolved 954-level population used by the connectivity-volume A/B (see [`that preflight`](2026-09-09-connectivity-volume-portal-ab-001-preflight.md)), per the evidence-hardening report's own section 5.3. IDs committed separately for this experiment's own provenance: [`data/stress/portal-coarse-state-merge-ab-001-ids.txt`](../data/stress/portal-coarse-state-merge-ab-001-ids.txt) (verified byte-identical to the connectivity-volume population file).

## Envelope

Same envelope as the other portal-restoration A/Bs: `node_budget=50,000,000` (→ `workBudget=67,000,000`), `strict_total_work_budget=false`. All other workflow inputs left at default.

## Candidate arms

| arm | flags |
|---|---|
| control | (none — production default; coarse merge stays disabled on portal levels) |
| treatment | `STRATEGY_PORTAL_COARSE_STATE_MERGE` |

Because this deliberately changes survivor identity (not merely pruning a dead branch), the evidence-hardening report requires per-level gains/losses, stage/work participation, and rare/specialist retention — not just aggregate solves. Do not combine this A/B with either prune-restoration A/B (must-cross neighbour-budget, connectivity volume) in the same dispatch.

## Acceptance rule (frozen before either arm runs)

- identical total `workBudget` and scheduler envelope (guaranteed by both arms sharing this dispatch's inputs);
- referee-valid treatment gains (every claimed new solve replayed/validated);
- enumerate every gain and loss, not just the net — merge changes which candidate survives per collision, so churn (gains AND losses with a flat or positive net) is an expected possible outcome, not evidence of a defect, per this program's own standing rule that a sound change can still lose solves through survivor/order effects;
- rare/specialist retention: confirm no isolated-technique winner exclusive to a portal level regresses;
- published-corpus regression unchanged (checked separately via `npm run solver:regression`; already clean pre-population);
- **promote** (remove `STRATEGY_PORTAL_COARSE_STATE_MERGE` from `OPT_IN_FEATURES` and flip `useCoarseStateMerge`'s portal branch to the same unconditional-default-ON form as the portal-free branch) only on **positive net solves**, or a **material work reduction with zero solve loss**;
- **any net solve loss** with no offsetting material work reduction: do not promote; keep `STRATEGY_PORTAL_COARSE_STATE_MERGE` ACTIVE/opt-in and record the loss set for follow-up.

## Reproduction

Workflow: `solver-level-blind-targeted-sweep.yml`, `ids_file=data/stress/portal-coarse-state-merge-ab-001-ids.txt`, `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=false`.

- Control dispatch: no `enable_flags`/`disable_flags`.
- Treatment dispatch: `enable_flags=STRATEGY_PORTAL_COARSE_STATE_MERGE`.

Both dispatches share the workflow's own default concurrency group, so they queue behind the already-dispatched must-cross-neighbour-budget and connectivity-volume A/Bs.

**Status as of 2026-09-09 ~15:40 UTC:** the must-cross-neighbour-budget A/B reached a promotion decision (concluded-positive, 52 gains / 0 losses, promoted) and released the concurrency this pair was waiting on.

### Control arm — COMPLETE (954/954, 455 solved)

- Main body: run [`34360379709`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34360379709) (`target_wall_minutes=5`), 8/78 shards cancelled, 889/954 reported, 444 solved. The workflow's `if:always()` print-step fix (see the mc-neighbor-budget-portal A/B's dispatch history) meant the full 889-row per-level table was directly recoverable from this run's own "Combine shard results" job log — no per-shard scraping needed this time.
- Gap-fill (65 missing ids): run [`34369713040`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34369713040) (`target_wall_minutes=1`), clean (0 cancellations), 65/65 resolved, 11 solved.
- **Combined control: 444 + 11 = 455/954 solved.**

### Treatment arm

- Dispatched: run [`34371613615`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34371613615) (`enable_flags=STRATEGY_PORTAL_COARSE_STATE_MERGE`, `target_wall_minutes=5`), in progress as of this writing.
