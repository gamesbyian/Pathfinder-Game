# must-cross reserve-widen + sibling-rule plain WIDE beam exposure: development A/B

> **Status:** concluded-negative
> **Last evidence:** 2026-08-26 — control run [`32946074849`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32946074849), treatment run [`32946077662`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32946077662), both at solver revision `4ded0f57df9200d62e7f0964153d4e64bd29667b`
> **Decision:** `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` is 0 gains / 0 losses on the frozen must-cross-heavy archetype-sample population, with real (nonzero) treatment engagement — not a non-participation result like `confirm-broad-003`. Close this exact candidate; the missing-beam exposure this flag adds to the two remaining must-cross-heavy sibling rules does not help on this development population.
> **Remaining gate:** none. Do not reopen this exact form (same reserve widen + same two beam additions to the same two rules) without materially new evidence.
> **Evidence role:** tuning
> **Selection:** candidate (reserve-count widen + which two beams, which two rules) was selected from the same 2026-08-25 post-976 rejoin plus 2026-08-26 archetype/rule classification that produced `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` (both discovery evidence, disclosed in `modules/solver/ablation-config.ts`'s and `modules/solver/attempts.ts`'s comments for this flag); the 486-level archetype-sample population was prespecified (deterministic seed, fixed `--eligible-sample=250 --control-sample=50` plus the workflow's fixed corpus1/published rows) before this A/B ran, and was not touched or re-selected afterward.

## Background

See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)'s Background for the full post-976 rejoin/classification context. That candidate targeted only the "must-cross + flipper-heavy" sibling rule (30/62 of the mined not-offered population), the one rule with room in its trailing `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` window. This candidate targets the other two:

| rule (`why`) | affected levels | missing beam added here |
|---|---:|---|
| must-cross, must-pass-heavy | 28/62 | plain `beam:intersectionHarvest@beam5000` |
| must-cross default | 4/62 | plain `beam:objectiveFirst@beam5000` |

Both rules' trailing-reserve windows were already full (11 and 10 existing configs respectively), so this candidate also widens `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` by one (5→6) — mirroring the validated 2026-08-22 4→5 precedent — bundled as a single flag rather than three separate dimensions, since the reserve widen and both beam additions are only meaningful together (see `modules/solver/ablation-config.ts`'s `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` entry).

Prior to dispatch, a local published-corpus check (160 levels, matched envelope) found 157/160 rows byte-identical and 3 rows (`P00140`, `P00154`, `P00157` — all routing through the modified rules) with small `nodesExpanded`/`workSpent` perturbation and no solve-status change, confirming the change is correctly scoped before spending any GHA A/B budget.

## Frozen candidate

`STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` (default-OFF; see `modules/solver/ablation-config.ts` and `modules/solver/attempts.ts`):

- widens `stage-budget.ts`'s effective `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` from 5 to 6 when the flag is on and no explicit `mainLoopLateReserveConfigCountOverride` is set;
- appends `beam:intersectionHarvest@beam5000` (plain) to the "must-cross, must-pass-heavy" rule's config list;
- appends `beam:objectiveFirst@beam5000` (plain) to the "must-cross default" rule's config list;
- no other beam width/score/retry/repair/DFS change, no change to any other rule;
- solver revision `4ded0f57df9200d62e7f0964153d4e64bd29667b` for both arms;
- `solver-archetype-sample-ab.yml`, `archetypes=must-cross-heavy`, `eligible-sample=250`, `control-sample=50`, seed `mustcross-reserve-widen-2026-08-26`, `node_budget=50,000,000` (same envelope as the sibling candidate), `deterministic=true`;
- acceptance rule fixed before dispatch: zero lost solves AND (≥1 gained solve OR ≥10% aggregate-work reduction) → earns confirmation.

Both arms ran at the identical commit on `main`; only `enable_flags` differed (control: none; treatment: `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE`).

## Population

Same fixed corpus invariant as the sibling candidate: 486 rows total (160 published, all Corpus 1, 250 must-cross-heavy-eligible + 50 control-sample Corpus-2 rows, same seed both arms — a *different* seed from the sibling candidate's `mustcross-flipper-wide-beam-2026-08-26`, since that seed is spent). Materialization was identical across arms (both combined reports report `Combined 88 report(s), 486 level(s)`).

## Result

| metric | control (`32946074849`) | treatment (`32946077662`) |
|---|---:|---:|
| solved | 389/486 | **389/486** |
| gained solves | — | **0** |
| lost solves | — | **0** |
| aggregate `workSpent` | 27,714,357,459 | 27,857,228,135 (+0.52%) |
| aggregate `nodesExpanded` | 25,953,772,669 | 25,850,301,736 (−0.40%) |

Solved-id sets are exactly identical between arms (verified by full set comparison, not just equal counts). Unlike `confirm-broad-003`'s byte-identical-work non-participation, here aggregate `workSpent` and `nodesExpanded` both changed measurably — the widened reserve window and the two new configs did execute on some rows of this population — but with zero effect on any outcome. This is a genuine clean null with real engagement, the same shape as `confirm-broad-002`'s result, not evidence of a wrong instrument.

## Disposition

Gate not met: 0 gained solves and no aggregate-work reduction (work rose slightly instead). Close this exact candidate — the missing plain-beam exposure for must-cross-heavy's "must-pass-heavy" and "default" sibling rules, at this envelope and via this reserve-widen mechanism, does not help on the same kind of archetype-enriched development population that produced a real +3/-0 gain for the sibling "flipper-heavy" rule. Do not reopen this exact form (same two rules, same two beams, same reserve-widen mechanism) without materially new evidence; a descendant would need either a different technique, a different envelope, or evidence that the reserve-widen itself (rather than the beam choice) was the limiting factor.

No confirmation cohort is needed or was reserved for this candidate — it does not clear the development gate that would make confirmation meaningful.
