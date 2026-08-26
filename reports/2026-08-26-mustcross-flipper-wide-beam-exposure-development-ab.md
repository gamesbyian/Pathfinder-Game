# must-cross+flipper-heavy plain WIDE beam exposure: development A/B

> **Status:** active
> **Last evidence:** 2026-08-26 — control run [`32931244624`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32931244624), treatment run [`32931246526`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32931246526), both at solver revision `dc781d371ba3d083948e97644e76d5b63f8768de`
> **Decision:** `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` is +3/-0 on the frozen must-cross-heavy archetype-sample population at a fixed 67,000,000 canonical-work / 50,000,000 node envelope. Zero losses plus gained solves earns independent confirmation before any promotion claim.
> **Remaining gate:** a fresh confirmation cohort (neither `confirm-broad-001` nor `confirm-broad-002` — both already spent on the unrelated diverse-IH candidate) must be reserved and run with this exact frozen candidate before promoting the flag to default-on.
> **Evidence role:** tuning
> **Selection:** candidate (which rule, which two beams) was selected from the mined 2026-08-25 post-976 rejoin plus a 2026-08-26 archetype/rule classification (both discovery evidence, disclosed in `modules/solver/attempts.ts`'s `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` comment); the 486-level archetype-sample population itself was prespecified (deterministic seed, fixed `--eligible-sample=250 --control-sample=50` plus the workflow's fixed corpus1/published rows) before this A/B ran, and was not touched or re-selected afterward.

## Background

[`2026-08-25-post-976-portfolio-exposure-rejoin.md`](2026-08-25-post-976-portfolio-exposure-rejoin.md) found `beam:intersectionHarvest@beam5000` and `beam:objectiveFirst@beam5000` (plain, not their `(diverse)` siblings) each absent from production main-loop routing on the same 62 current Corpus-2 misses, with the cheapest observed census nodes/solve of any beam identity in that report's exposure-economics table. That report's own "Priority consequences" called for exactly one narrow missing-exposure pilot next, since the previously tested `(diverse)` sibling of this same beam family (selective diverse-IH exposure, [`2026-08-25-selective-diverse-ih-exposure-development-ab.md`](2026-08-25-selective-diverse-ih-exposure-development-ab.md)) was independently closed after a null fresh `confirm-broad-002` ([`2026-08-25-diverse-ih-confirm-broad-002-freeze.md`](2026-08-25-diverse-ih-confirm-broad-002-freeze.md)). [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) Priority 1 accordingly required any next portfolio pilot to be "newly prespecified, one-dimensional, fixed-envelope, and independently confirmed."

A follow-up classification (2026-08-26, not separately reported — summarized here and in the flag's own code comment) joined the same census/production data and found all 62 affected levels are `must-cross-heavy` (`modules/solver/archetype.ts`), split across three `ATTEMPT_POLICY` rules in `modules/solver/attempts.ts`:

| rule (`why`) | affected levels | plain WIDE IH/OF already offered? | trailing-reserve window room? |
|---|---:|---|---|
| must-cross + flipper-heavy with many objectives (`isMustCrossFlipperHeavy`) | 30/62 | neither (diverse IH only) | **yes** — 4 existing configs, room for 2 more inside `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`=5 |
| must-cross, must-pass-heavy | 28/62 | neither (diverse OF only) | no — already 11 configs, window full |
| must-cross default | 4/62 | neither (diverse IH only) | no — already 10 configs, window full |

Only the flipper-heavy rule can gain the two missing plain WIDE beams without evicting an already-validated protected config from another rule's trailing window (the same window that needed the validated 4→5 `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` increase to fit the *other* two rules' diverse-beam fixes — see that constant's own comment in `modules/solver/stage-budget.ts`). This pilot therefore targets exactly that one rule, leaving the other two rules' exposure gaps (32/62 of the original 62) untouched and unclaimed by this candidate.

## Frozen candidate

`STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` (default-OFF; see `modules/solver/ablation-config.ts` and `modules/solver/attempts.ts`):

- appends exactly `beam:intersectionHarvest@beam5000` then `beam:objectiveFirst@beam5000` (both plain, no `diverseBeam`) to the end of the must-cross+flipper-heavy rule's config list, applied centrally in `getAttemptConfigs` guarded by `isMustCrossFlipperHeavy(f)` (the same predicate the rule's own `when` uses, factored into one shared function so the two can never drift);
- no beam width/score/retry/repair/DFS change, no change to any other archetype or rule, no minimum-budget floor;
- solver revision `dc781d371ba3d083948e97644e76d5b63f8768de` for both arms;
- `solver-archetype-sample-ab.yml`, `archetypes=must-cross-heavy`, `eligible-sample=250`, `control-sample=50`, seed `mustcross-flipper-wide-beam-2026-08-26`, `node_budget=50,000,000` (→ 67,000,000 canonical-work envelope, `node_budget*134/100`, matching the prior diverse-IH pilot's envelope), `deterministic=true` (non-binding 24h wall deadline);
- acceptance rule fixed before dispatch: zero lost solves AND (≥1 gained solve OR ≥10% aggregate-work reduction) → earns confirmation.

Both arms ran at the identical commit (`dc781d371ba3d083948e97644e76d5b63f8768de`) on branch `claude/solver-development-queue-g86seo`; only `enable_flags` differed (control: none; treatment: `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`).

## Population

The workflow's fixed corpus invariant applies both arms to the same 486 rows: all 160 published levels, all Corpus 1, and a deterministic seeded Corpus-2 sample (250 `must-cross-heavy`-eligible + 50 control-sample from every other archetype, same seed both arms). Materialization was identical across arms (both combined reports report `Combined 62 report(s), 486 level(s)`).

## Result

| metric | control (`32931244624`) | treatment (`32931246526`) |
|---|---:|---:|
| solved | 396/486 | **399/486** |
| gained solves | — | **3** |
| lost solves | — | **0** |
| aggregate `workSpent` | 25,580,291,939 | 25,844,458,365 (+1.03%) |
| aggregate `nodesExpanded` | 24,281,359,445 | 23,827,038,179 (−1.87%) |

Gained levels: `R00817`, `R02010`, `R02151`. No losses anywhere in the 486-row population, including the 50-level non-eligible control sample and all of Corpus 1/published — consistent with the flag's implementation, which can only ever change `getAttemptConfigs`'s output when `isMustCrossFlipperHeavy(f)` holds (unit-tested in `modules/solver/attempts.test.ts`), so a scope leak outside that predicate is not just unobserved but structurally excluded by the code path itself.

`R02010` matches one of the two isolated census wins (`beam:intersectionHarvest@beam5000`, `beam:objectiveFirst@beam5000`) that motivated this pilot. `R03357`, the census's other isolated plain-IH win, remains unsolved in both arms — expected, since it falls under the "must-cross default" sibling rule this flag deliberately does not touch (window already full there; see Background table). `R00817` and `R02151` are additional gains not predicted by the narrow isolated-census list; the isolated census used a different (lower, single-technique) work budget than this live full-ladder run, so it is expected to undercount what the two new configs can contribute once several earlier ladder attempts have already run against the same gates.

Aggregate `workSpent` rose modestly (+1.03%) rather than fell — the acceptance rule's work-reduction clause was not needed and was not met; the gained-solve clause alone satisfies the prespecified gate. Per the research operating model's stop rule 1, this additive work is charged, not treated as free because earlier winners cannot regress.

## Disposition

Gate met: zero losses AND ≥1 gained solve → this development result earns confirmation. It does **not** yet license default-on promotion. Per the confirmation-cohort protocol ([`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](2026-08-24-solver-confirmation-transfer-cohort-reservation.md)), `confirm-broad-001` and `confirm-broad-002` are both already spent (on the unrelated diverse-IH candidate) and must not be reused or reasoned about with this candidate's development rows in mind. A fresh confirmation cohort must be reserved and run with this exact frozen candidate — same flag, same two configs, same rule gate, same envelope — before any promotion claim. `transfer-envelope-001` remains reserved for transfer/generalization evidence after confirmation, not as a substitute for it.

The other two must-cross-heavy sibling rules' identical exposure gap (32/62 of the original mined population) remains open and unclaimed by this candidate; reopening it needs either accepting displacement of an already-validated protected config or a further `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` increase, which this pilot deliberately did not test (a second, un-prespecified dimension).
