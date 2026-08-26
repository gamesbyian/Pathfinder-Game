# must-cross+flipper-heavy plain WIDE beam exposure: development A/B

> **Status:** inconclusive
> **Last evidence:** 2026-08-26 — `confirm-broad-003` run [`32940910715`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32940910715) at solver revision `36c0744a3eaa6cd2ff787e8221032062ebd85f9d`; development runs [`32931244624`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32931244624)/[`32931246526`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32931246526) at `dc781d371ba3d083948e97644e76d5b63f8768de`
> **Decision:** `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` was +3/-0 in development (below). Its first confirmation attempt (`confirm-broad-003`, a plain 256-level uniform-random cohort) came back **exactly** 159/256 both arms with 0 gains/0 losses and **byte-identical aggregate `workSpent`** — not a normal clean null but zero measurable participation, diagnosed below as the mechanism structurally not reaching this candidate's new configs on a fresh population. This is **not** confirmation evidence either way: do not promote to default-on, and do not treat it as a closed negative. See "Confirmation attempt" below for the full diagnosis and why a plain broad cohort cannot exercise this candidate.
> **Remaining gate:** a confirmation methodology that can actually exercise this candidate's mechanism is needed before either a promotion or a negative-close claim — see "Confirmation attempt" for why `confirm-broad-003` could not, and the two concrete options (much larger N, or a two-phase control-failure-residual cohort) for what would.
> **Evidence role:** tuning (development); the `confirm-broad-003` attempt is confirmation evidence role in form only — see diagnosis for why it carries no decision weight
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

## Confirmation attempt: `confirm-broad-003` (2026-08-26, inconclusive)

Per the frozen candidate above, `confirm-broad-003` (256 fresh uniform-random raised-cap levels, master seed `2026082601`, id prefix `G`, sha256 `443b05e40809466aea7bd6280664e7b4ebd7cf2cd3283d6bf40970a7519b9c2d`) was generated and sealed via the new [`solver-broad-confirmation.yml`](../.github/workflows/solver-broad-confirmation.yml) workflow, then run control vs. `enable_flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` treatment at the same `node_budget=50,000,000` envelope as development (run [`32940910715`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32940910715), commit `36c0744a`).

**Result:** control 159/256 solved, `workSpent=29,676,406,171`; treatment 159/256 solved, `workSpent=29,676,406,171` — the identical number, not just the identical count. 0 gained, 0 lost (exact solved-id-set equality, not merely equal counts).

**This is not a normal clean null.** `confirm-broad-002`'s clean null (0/0 gains/losses) still showed real participation — treatment `workSpent` differed from control by about +0.01%, meaning the new config actually executed on some levels even though it never changed an outcome. Here, aggregate work is bit-for-bit identical across all 256 rows, which is only possible if the two new trailing configs never executed on a single row of the cohort.

**Diagnosis: repair-fallback saturation, compounding an already-low base rate.** A local calibration run of the same generator (same commit, different independent seed — not the sealed cohort itself, since regenerating with the *same* seed reproducibly does NOT reproduce the sealed artifact byte-for-byte even at the same commit, confirming [`solver-confirmation-transfer-cohort-reservation.md`](2026-08-24-solver-confirmation-transfer-cohort-reservation.md)'s own reproducibility warning — this calibration is illustrative of the generator's typical output, not a stand-in for the actual sealed rows) found `isMustCrossFlipperHeavy` *archetype-eligible* levels at roughly 5.5% prevalence (14/256). That number alone understates how rare a *participating* row is, though: eligibility for this candidate's new configs additionally requires surviving the early repair probe **and** the rule's four existing main-loop configs before ever reaching the two new trailing ones — exactly the compound condition the post-976 rejoin already measured directly, at **30 of the full 1,700-level Corpus 2** (≈1.76%), since that 30 *is* the count of current-production misses matching this rule. At that measured rate, `P(zero participating rows | n=256, p=0.0176) ≈ e^(-256×0.0176) ≈ 1.1%` — unlikely, and consistent with the mechanism below, but not literally impossible by chance alone; this run cannot rule out an unlucky draw on top of the structural effect. The mechanism itself is independently well-supported regardless: `attempts.ts`'s own comment on this rule notes `isMustCrossFlipperHeavy`'s gate (`mustCross≥2`, `mustPass≥OBJECTIVE_HEAVY_MUSTPASS=3`) is a strict superset of `needsRepairFallback`'s gate (`REPAIR_MC_MIN=2`, `REPAIR_MP_MIN=3`) — **every** eligible level also qualifies for the early repair probe, which "now solves nearly everything in this archetype via its own early probe before this main loop even runs."

The development population was not a fresh sample — it was drawn from Corpus 2's **already-known current production misses** (the post-976 rejoin's residual failure set), i.e. exactly that measured ≈1.76% repair-resistant tail. Every development-eligible row was, by construction, a participating row. A fresh uniform-random cohort is not: at ≈1.76% true prevalence, `confirm-broad-003`'s 256 rows were simply not enough to reliably contain any.

**Consequence for the confirmation protocol.** This is a structural gap in using a plain broad/fresh cohort to confirm a candidate whose entire premise is "helps solve levels that already survive the whole current ladder including repair" — which describes essentially every candidate mined from Priority 1's residual-miss analyses, not just this one. `confirm-broad-001` and `confirm-broad-002`'s candidates evidently had reachable participation on fresh cohorts (small but nonzero `workSpent` deltas even in their clean nulls) and so were not affected the same way, but a future residual-mined candidate could hit the identical wall. Two concrete fixes:

1. a much larger fresh cohort, now directly sizeable from the measured ≈1.76% rate rather than guessed — e.g. `count≈1,200` puts the expected participating-row count around 21, the same order as development's own 30-row population; or
2. a two-phase "control-failure residual" cohort: generate a large fresh pool, run the *control* ladder alone across it, freeze the subset it fails to solve (mirroring exactly how the original 724-level Corpus-2 residual population was defined, just on fresh generated levels instead of the existing corpus), then run both arms only on that frozen residual — still a legitimate pre-outcome-neutral selection rule (filtering by whether *control* solves it, decided before either arm's real comparison run, is not the same as selecting by whether *treatment* solves it).

Option 1 is simpler and immediately actionable now that the rate is measured; option 2 remains available if a future candidate's true rate turns out lower still or option 1's cohort proves under-powered in practice.

`confirm-broad-003` is spent (one-use, already inspected) but its verdict is **inconclusive/non-participating**, not a negative confirmation. The candidate remains at "development-positive, awaiting a confirmation design that can actually exercise it." Do not promote `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` to default-on on the strength of this run, and do not close it as a confirmed negative either — per the research operating model's own rule, absence of a solve gain when participation is near zero is not evidence of no mechanism.
