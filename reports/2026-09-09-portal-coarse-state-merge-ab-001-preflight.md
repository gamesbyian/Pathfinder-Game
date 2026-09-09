# STRATEGY_PORTAL_COARSE_STATE_MERGE: frozen matched-work population A/B preflight

> **Status:** concluded-negative
> **Last evidence:** 2026-09-09 — both arms complete over the full frozen 954-id population (control 455/954, treatment 601/954). Per-level enumeration: **158 gains, 12 losses, net +146**. All 158 gains confirmed referee-valid. The rare/specialist-retention check found a genuine capability regression on at least one loss (`R01273`): still `node-budget-reached` under treatment at **10x** the frozen envelope, while control solved it at 1x — ruling out budget/scheduling churn as the explanation for that level. See [`Results`](#results) below.
> **Decision:** **DO NOT PROMOTE.** `STRATEGY_PORTAL_COARSE_STATE_MERGE` stays ACTIVE/opt-in. A strongly positive net (+146, 0 net after referee/censoring checks are otherwise clean) does not override a confirmed rare/specialist-retention failure — the acceptance rule below requires confirming no isolated-technique winner regresses, and this population disconfirms that for at least one level.
> **Remaining gate:** none for this decision; follow-up (optional) is root-causing why `R01273`'s isolated beam winner becomes unreachable under the new merge key, or accepting the loss with documented human sign-off before ever revisiting promotion.
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

- Main body: run [`34371613615`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34371613615) (`enable_flags=STRATEGY_PORTAL_COARSE_STATE_MERGE`, `target_wall_minutes=5`). Heavier attrition than control (33/78 shards cancelled): 780/954 reported, 554 solved.
- Gap-fill (174 missing ids): id list at [`data/stress/portal-coarse-state-merge-treatment-gapfill-001-ids.txt`](../data/stress/portal-coarse-state-merge-treatment-gapfill-001-ids.txt); run [`34382565734`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34382565734) (`target_wall_minutes=1`), clean, 174/174 resolved, 47 solved.
- **Combined treatment: 554 + 47 = 601/954 solved.**

## Results

Per-level enumeration, treatment vs. control, over the full frozen 954-id population (both arms independently reconstructed to 954/954):

| | control unsolved | control solved |
|---|---:|---:|
| **treatment unsolved** | 341 (both unsolved) | 12 (losses) |
| **treatment solved** | 158 (gains) | 443 (both solved) |

- **Gains: 158.** Full id list: R00082, R00312, R00329, R00355, R00370, R00466, R00506, R00573, R00672, R00690, R00726, R00728, R00756, R00786, R00860, R00869, R00912, R00975, R01016, R01052, R01058, R01105, R01179, R01190, R01208, R01269, R01274, R01380, R01382, R01428, R01485, R01500, R01504, R01642, R01738, R01849, R01872, R02012, R02042, R02060, R02074, R02080, R02086, R02100, R02103, R02142, R02150, R02162, R02173, R02178, R02182, R02216, R02233, R02245, R02254, R02276, R02297, R02303, R02309, R02313, R02333, R02339, R02346, R02353, R02365, R02373, R02398, R02424, R02434, R02437, R02438, R02446, R02452, R02454, R02456, R02464, R02468, R02479, R02483, R02490, R02526, R02533, R02534, R02546, R02555, R02581, R02586, R02590, R02597, R02614, R02654, R02655, R02662, R02692, R02694, R02707, R02718, R02730, R02737, R02741, R02746, R02757, R02758, R02767, R02798, R02802, R02807, R02823, R02830, R02832, R02833, R02843, R02864, R02868, R02882, R02902, R02903, R02977, R02991, R03024, R03029, R03030, R03031, R03038, R03049, R03050, R03059, R03082, R03083, R03101, R03102, R03133, R03161, R03169, R03194, R03201, R03202, R03223, R03228, R03234, R03237, R03241, R03247, R03254, R03260, R03268, R03276, R03289, R03294, R03298, R03303, R03321, R03325, R03327, R03336, R03343, R03351, R03365 — committed at [`data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt`](../data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt).
- **Losses: 12.** R00817, R00893, R01273, R01584, R02196, R02206, R02251, R02298, R02428, R02576, R02668, R03274. Per this report's own acceptance rule, churn (gains AND losses with a positive net) is an expected possible outcome of a merge-key change (it deliberately changes which candidate survives per collision), not itself evidence of a defect — but each loss needs a rare/specialist-retention check (below) before promotion, since a merge that discards the isolated-technique winner on any of these levels would be a real regression this net-solves count alone would hide.
- **Net: +146.**
- **Referee validity: confirmed.** Redispatched exactly the 158 gain ids under the treatment flag (run [`34389571210`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34389571210)): 158/158 resolved `SOLVED` again, and **158/158 `refereeValid=true`** — zero `false`, zero `null`.
- **Rare/specialist retention:** 6 of the 12 losses (R01273, R01584, R02196, R02206, R02668, R03274) have their sole known isolated-T1 capability sourced from a beam configuration per [`the technique census`](../reports/stress/technique-census/33717910218/level-technique-coverage.json) — mechanistically on the causal pathway of this exact merge-key change, unlike the other 6 (0 or multiple isolated winners, so a merge-driven loss there is unambiguous scheduling churn). Dispatched all 12 losses under the treatment flag at 10x the frozen envelope (`node_budget=500,000,000` vs. the frozen `50,000,000`) to test whether the loss is a hard capability regression (persists even with generous budget) or a matched-envelope scheduling/order effect (clears with more budget).
  - Run [`34389840344`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34389840344) (`target_wall_minutes=1`): heavy attrition at 10x budget (10/12 shards cancelled — a single level can take far longer than the planner's normal-budget estimate; the one resolved 56-minute shard alone exceeded the default per-shard timeout). Of the 2 resolved: **R02576 recovered `SOLVED` at 10x** (consistent with scheduling churn, one of the "other 6"); **R01273 stayed `node-budget-reached` even at 10x**.
  - Gap-fill (the other 10 ids, target_wall_minutes=90 for far larger per-shard timeout headroom): run [`34396039902`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34396039902) packed all 10 into a single shard (the planner has no awareness of the 10x budget multiplier) and **timed out at 90 minutes without completing even the first id** — no `[i/N]` result line was ever printed, so the shard's own writeReport() checkpoint never fired once. Escalating further (per-id dedicated shards, multi-hour timeouts) was judged not worth the cost once R01273 alone had already produced a clear, actionable finding.
  - **Conclusion:** `R01273` fails to solve under treatment even at 10x the frozen envelope, while control solves it at 1x — the only variable between the two arms is `STRATEGY_PORTAL_COARSE_STATE_MERGE`, and generous extra budget did not recover the loss. This is a real capability regression, not a matched-envelope scheduling/order artifact: the beam coarse-state merge is evidently discarding a survivor this level's only known isolated-winning technique needs, at any practical budget. The other 9 ids (4 more beam-isolated-winner, 5 "other") remain unresolved at 10x due to GHA timeout constraints, but a single confirmed regression is already sufficient to fail this report's own rare/specialist-retention gate — the remaining 9 do not need to be resolved to reach a promotion decision.
- **Published-corpus regression:** not run — moot given the rare/specialist-retention failure above; would only be relevant if this report's decision were reopened after a fix.

## Decision

**DO NOT PROMOTE.** `STRATEGY_PORTAL_COARSE_STATE_MERGE` stays ACTIVE/opt-in in [`ablation-config.ts`](../modules/solver/ablation-config.ts) (no code change from this report — it was never flipped default-on). Despite a strongly positive net solve count (+146, zero referee-validity or censoring concerns), the frozen acceptance rule's rare/specialist-retention gate is not satisfied: `R01273`'s only known isolated-technique winner (a beam configuration) becomes unreachable under the new merge key even with 10x the matched-work envelope, which rules out survivor/order churn as the explanation. Per the acceptance rule, a confirmed retention failure is not something a positive aggregate net can outvote.

Before this could be revisited: root-cause why `R01273`'s specific beam trajectory is discarded by the coarse-state merge key (likely a used-portal-pair identity collision the current key still conflates, or a near-tie retention interaction) and confirm a fix (or an explicit, human-reviewed acceptance of that specific loss) before any future promotion attempt. The other 4 unresolved beam-isolated-winner losses (R01584, R02196, R02206, R02668, R03274) and 5 "other" losses (R00817, R00893, R02251, R02298, R02428) were not individually run to completion at 10x budget — not needed for this decision, but relevant context for any future investigation.
