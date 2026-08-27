# Solver confirmation/transfer cohort reservation

> **Status:** concluded-positive
> **Last evidence:** 2026-08-27 — `confirm-transfer-topology-001` (1,000-level unconditioned topology-composition sample, run [`33108351046`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33108351046)), the candidate's first cross-generator transfer/challenge attempt: control 997/1000, treatment 997/1000, work +0.42%, gained none, lost none — a **clean null, ceiling-limited** by the population's own 99.7% control solve rate (see this report's `confirm-transfer-topology-001` section for why that's not evidence against the mechanism).
> **Decision:** `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` has passed same-generator broad/residual confirmation with a clean gain matching the shape of its original 486-level development A/B (`confirm-residual-003`: control 0/516, treatment 3/516, +3/-0). All four prior confirmation attempts (`confirm-broad-003`/`004`, `confirm-residual-001`/`002`) were void control-vs-control non-results caused by the `matrix.arm` wiring bug documented in [`2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md`](2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md). Its cross-generator transfer attempt found zero losses (no-harm signal) but zero incremental gains — inconclusive rather than a genuine test of generalization, since the sampled population left almost no room to show a gain either way. Current promotion/generalization policy is owned by [`../docs/solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md), which permits a narrow default-on promotion after confirmation alone (without transfer success) for a modest-scope, little-tuned candidate like this one. `transfer-envelope-001` remains pristine and is a same-generator in-envelope challenge/confirmation stratum, not cross-generator transfer.
> **Remaining gate:** none. **Promoted 2026-08-27:** `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` is now default-ON in `modules/solver/attempts.ts` — removed from `OPT_IN_FEATURES` in `ablation-config.ts`, and the flag's own application check changed from `cfg && cfg.FLAG === true` to `!cfg || cfg.FLAG` (the pattern every other default-ON gate uses; the OPT_IN_FEATURES change alone would not have been enough, since production calls `getAttemptConfigs` with a null ablation config, not a resolved `defaultConfig()` object). See this report's "Promoted" section below.
> **Evidence role:** discovery
> **Selection:** prespecified cohort lifecycle; each confirmation candidate, work envelope, and acceptance rule was frozen before its cohort was materialized
> **Manifest:** [`stress/managed-evaluation-populations-2026-08-24.json`](stress/managed-evaluation-populations-2026-08-24.json)
> **Protocol:** [`2026-08-23-solver-confirmation-transfer-protocol-design.md`](2026-08-23-solver-confirmation-transfer-protocol-design.md)
>
> **Correction (2026-08-27):** `confirm-broad-003`, `confirm-broad-004`, and `confirm-residual-001` (and `confirm-residual-002`, added below) were **all control-vs-control**, not control-vs-treatment — both confirmation workflows referenced `matrix.arm` (nonexistent) instead of `matrix.shard.arm` in the step that adds the candidate's ablation flags, so no dispatch of either workflow ever actually enabled a treatment arm. See [`2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md`](2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md) for the full correction — now fixed and hardened. The "different instrument mechanism each time" framing below (repair-fallback saturation, then a late-reserve scheduling gap, then a concurrency variance) was a reasonable read of results that all shared one real root cause. `confirm-broad-001`/`confirm-broad-002` predate both confirmation workflows (dispatched via direct sweep invocation, not this matrix pattern) and are **not** affected. `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` has zero valid confirmation evidence as of this correction — not four inconclusive attempts.

## Methodology note (2026-08-27)

The historical one-fresh-cohort-per-candidate lifecycle in this report is no longer the default
framework. Its evidence remains valid, including the +3/-0 `confirm-residual-003` verdict and the
void status of the four miswired control-vs-control runs. For future work, consume untouched blocks
from a locked pool when repeated confirmation is expected, and reserve the term **transfer** for a
materially different source/generator. See
[`../docs/solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md).

`transfer-envelope-001` is therefore retained untouched for player-envelope challenge/confirmation
value. Its recipe shares `generate-random.mjs` with Corpus 2 and does not, by itself, test
distributional transfer.

## Lifecycle now exercised

The reservation mechanism has moved from paper design to working evidence discipline.

### `confirm-broad-001` — SPENT

- 256 ordinary raised-cap generated levels;
- generator revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- master seed `2026082417`, IDs `C00001` onward;
- candidate: global suppression of ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest`;
- final valid run `32908734154`;
- result: **140/256 → 141/256**, **+3/-2**, work -0.22%;
- verdict: failed frozen zero-loss gate.

The first attempts exposed an infrastructure lesson: independently invoking the pinned generator with the same seed did not guarantee byte-identical cohort wrappers, and deeper generation behavior could not safely be assumed reproducible across separate jobs. The valid workflow therefore materialized the cohort **once**, sealed the `levels` hash, and made every arm download and verify the same artifact before search. That single-specimen pattern is now the required confirmation contract.

### `confirm-broad-002` — SPENT

Reserved fresh before materialization because `confirm-broad-001` was already spent:

- 256 ordinary raised-cap generated levels;
- same pinned generator revision;
- master seed `2026082517`, IDs `D00001` onward;
- candidate: selective exposure of `beam:intersectionHarvest@beam5000(diverse)` in the two existing very-high-intersection policy bundles when `mustCross < 2`;
- final run `32912881453`;
- result: **126/256 → 126/256**, **0 gains / 0 losses**, treatment work about +0.01%;
- verdict: failed frozen gate as a clean null.

See [`2026-08-25-diverse-ih-confirm-broad-002-freeze.md`](2026-08-25-diverse-ih-confirm-broad-002-freeze.md).

### `confirm-broad-003` — SPENT, INCONCLUSIVE (not a negative)

Reserved fresh before materialization because `confirm-broad-001`/`002` were already spent:

- 256 uniform-random raised-cap generated levels;
- generator revision `36c0744a3eaa6cd2ff787e8221032062ebd85f9d` (current, not the older pinned `4f2b2b14...` revision `confirm-broad-001`/`002` used — the generator itself was unchanged in between, verified by diffing `scripts/stress/generate-random.mjs` and `modules/domain` across the two revisions before reuse);
- master seed `2026082601`, IDs `G00001` onward;
- candidate: append plain `beam:intersectionHarvest@beam5000` + `beam:objectiveFirst@beam5000` to `attempts.ts`'s must-cross+flipper-heavy rule only (`STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`);
- final run [`32940910715`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32940910715);
- result: **159/256 → 159/256**, **0 gains / 0 losses**, aggregate `workSpent` **byte-identical** (`29,676,406,171` both arms) — not merely a null, but zero measurable execution of the new configs anywhere in the cohort;
- verdict: **inconclusive / non-participating**, not confirmation-fail.

See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)'s "Confirmation attempt" section for the full diagnosis.

#### Repair-saturation gap

`isMustCrossFlipperHeavy`'s eligibility gate (`mustCross≥2`, `mustPass≥3`) is a strict superset of `needsRepairFallback`'s gate (`REPAIR_MC_MIN=2`, `REPAIR_MP_MIN=3`), so every level eligible for this candidate's new configs is also eligible for the early repair probe that runs before the main loop. That rule's own code comment already documents that repair "now solves nearly everything in this archetype via its own early probe." The development population that produced `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`'s +3/-0 result was mined from Corpus 2's *current production misses* — levels the whole ladder, repair included, already fails on — so every development-eligible row was, by construction, repair-resistant. A fresh uniform-random cohort's eligible rows overwhelmingly are not: the early repair probe solves them first, and this candidate's new trailing configs never run.

This generalizes: **any candidate mined from a residual-miss analysis (the dominant source of Priority 1's candidates) risks the identical wall in confirmation**, because "helps solve levels that survive the whole current ladder" is exactly the premise that makes a candidate invisible to a plain fresh cohort. Two candidate fixes, neither built yet:

1. a much larger fresh cohort, sized so the *repair-resistant* eligible tail (not just the archetype-eligible population) is expected to appear in adequate numbers — the post-976 rejoin already measures this rate directly for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` (30/1,700 ≈ 1.76% of Corpus 2 are current-production misses matching its rule), so `count≈1,200` (expected ≈21 participating rows, the same order as development's own 30-row population) is now a costed, specific estimate rather than an open question — see `confirm-broad-004` below;
2. a two-phase "control-failure residual" cohort: generate a large fresh pool, run the *control* ladder alone across it, freeze the subset it fails to solve, then run both arms only on that frozen residual. This mirrors exactly how Corpus 2's own 724-level residual population is defined (mining current misses), just applied to fresh generated levels instead of the existing corpus. Filtering by whether *control* solves a fresh level, decided before the real A/B ever runs, is a pre-outcome-neutral selection rule, not the same as selecting by whether *treatment* succeeds — but this needs a fresh committed cohort per candidate (the control-failure step still can't be reused across candidates once its exact composition has influenced a decision), and roughly doubles the compute cost of a confirmation run.

Neither option is implemented. Until one is, a `confirm-broad-*`-style plain broad cohort is the wrong instrument for any candidate this narrowly repair-gated, and a byte-identical-work result like this one should read as "wrong instrument," not "no effect."

### `confirm-broad-004` — SPENT, INCONCLUSIVE (option 1 tested, decisively insufficient)

Reserved fresh before materialization as the sized retest of `confirm-broad-003`'s candidate:

- 1,200 uniform-random raised-cap generated levels (≈4.7x `confirm-broad-003`'s size, sized so the measured 1.76% repair-resistant-eligible rate implies ≈21 expected participating rows);
- generator revision `7fb675bcbf1e6ca1d36a0bb02a53c1560df83f25`;
- master seed `2026082602`, IDs `H00001` onward;
- candidate: identical to `confirm-broad-003`'s;
- final run [`32955491247`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32955491247);
- result: **674/1,200 → 674/1,200**, **0 gains / 0 losses**, aggregate `workSpent` **byte-identical** (`149,686,882,168` both arms) — the same non-participation signature as `confirm-broad-003`, at 4.7x the scale;
- verdict: **inconclusive / non-participating**, not confirmation-fail.

At this size, `P(zero participating rows | n=1,200, p=0.0176) ≈ 7×10⁻¹⁰` — decisively ruling out an unlucky draw, unlike `confirm-broad-003`'s own ≈1.1% figure. Rather than accept "the rate is even lower than measured" without first ruling out a wiring regression, a local control-vs-treatment run directly against the three known development-positive levels (`R00817`/`R02010`/`R02151`) reproduced the original development +3/-0 result exactly (0/3 solved control, 3/3 solved treatment). The candidate mechanism is confirmed intact — the gap is real and structural: Corpus 2's naturally-accumulated repair-resistant population and this generator's raised-cap output are not the same population for this candidate's purposes, and scaling `count` further stops being a practical answer (reaching the same ≈21-expected-participant bar the third time would need `count≈12,000`).

See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)'s "Confirmation attempts" section for the full detail, including the sanity-check methodology.

#### Escalating to option 2

Both `confirm-broad-003` and `confirm-broad-004` point the same direction: option 1 (scale `count`) is exhausted for this candidate. `confirm-residual-001` is reserved for option 2 (the two-phase control-failure-residual design) instead:

- **Phase 1:** generate a fresh 1,200-level pool (master seed `2026082701`, id prefix `J` — both never used by a prior cohort), run the *control* ladder alone across it at the same `node_budget=50,000,000` envelope, and freeze the subset it fails to solve. This directly mirrors how the original 724-level Corpus-2 residual (the source of this candidate in the first place) was defined — mining current production misses — just applied to a fresh generated pool instead of the existing corpus. No archetype-rate guess is needed this time: the control-failure population *is* the fresh-generated analogue of "repair-resistant," by the same construction that made the development population participate.
- **Phase 2:** run both control and treatment (`enable_flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`) on the frozen phase-1 residual only, same envelope. Filtering by whether *control* solves a level, decided before phase 2's real comparison ever runs, remains a pre-outcome-neutral selection rule — not the same as selecting by whether *treatment* succeeds.
- Phase 1's residual size cannot be known before it runs; at `confirm-broad-004`'s own observed 43.8% control-failure rate (526/1,200), a 1,200-level phase-1 pool is expected to freeze roughly 500+ residual rows for phase 2 — comparable in scale to `confirm-broad-004` itself, so this design's total compute cost is closer to parity with a repeated broad run than the earlier "roughly doubles" estimate assumed, once phase 1 only needs a single arm.
- Built as `.github/workflows/solver-residual-confirmation.yml`: a single workflow run that generates the phase-1 pool, sweeps it control-only, freezes the control-failure residual as a new sealed corpus (computing the phase-2 shard count from the residual's actual size, which cannot be known before phase 1 completes), then runs the real control/treatment A/B on that frozen residual — validated locally end-to-end (generation, control-only sweep, residual-freeze filtering/sealing, phase-2 sweep, combine) before dispatch, the same discipline used for `solver-broad-confirmation.yml`.

### `confirm-residual-001` — SPENT, INCONCLUSIVE (a second, distinct instrument failure)

Result (run [`32979222722`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32979222722)): control 0/520, treatment 0/520, aggregate `workSpent` byte-identical again (`123,835,203,269` both arms).

Unlike the first two attempts, this population genuinely contains eligible participants: a purpose-built audit script (`scripts/stress/confirm-residual-001-archetype-audit.mjs`) found 25 of the 520 residual rows are archetype-eligible for this candidate (60/1,200 = 5.00% of the whole pool, 35 solved by control, 25 in the residual) — a real, substantial population on the same order as the original 30-row development population. Yet none of those 25 rows show any attempt of the new candidate configs. Calling the real `getConfiguredAttemptConfigs` directly for one such row confirmed the generated config list correctly includes both new configs — the bug is downstream in scheduling, not in classification or config generation: the real solve's main loop stopped after only 4 of the rule's 6 configs on every one of the 25 rows, never reaching the two new ones, despite `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` nominally protecting the trailing 5. Each row's actual `nodesExpanded` (~225,000,000) overshoots the nominal `node_budget` (50,000,000) by ~4.5x under this run's default non-strict budget semantics — the working hypothesis is that the late-reserve guarantee does not hold under overshoot this large.

This rules out `confirm-broad-003`/`004`'s repair-fallback-saturation mechanism by construction (every residual row is a control-failure, so repair genuinely cannot solve it) and surfaces a **second, independently discovered** confirmation-instrument gap instead. See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)'s "Confirmation attempts" section for the full diagnosis, including the direct code-level verification steps. Three consecutive confirmation attempts against this one candidate have now each failed by a different mechanism — not three negative results. Do not commission a fourth cohort against the current scheduling behavior; it would very likely repeat this same truncation pattern.

### `transfer-envelope-001` — LOCKED / UNTOUCHED

- role: transfer/challenge;
- size: 256 independent generated levels;
- generator revision: `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- mode: `--envelope-caps`;
- master seed: `2026082429`;
- IDs on materialization: `T00001` onward;
- outcome conditioning: none.

It remains unmaterialized because neither broad-confirmation candidate passed. Do not spend it merely because it exists.

From the pinned generator checkout, its reserved recipe remains:

```bash
node scripts/run-bundled.mjs scripts/stress/generate-random.mjs \
  --envelope-caps \
  --count=256 \
  --master-seed=2026082429 \
  --id-prefix=T \
  --out=tmp/managed-evaluation/transfer-envelope-001.json
```

## Durable confirmation contract

Before any future decision-bearing confirmation:

1. select/tune only on development evidence;
2. freeze solver revision, exact treatment, total work envelope, primary outcome, correctness rule, gains/loss rule, and pass/fail criterion;
3. reserve a fresh cohort identity before materialization or inspection;
4. generate the cohort exactly once from its pinned source revision;
5. seal the generated `levels` content and give every arm that exact artifact;
6. verify cohort seal and treatment provenance before search;
7. record the aggregate verdict before inspecting changed IDs or traces;
8. mark the cohort spent after that one decision-bearing use;
9. if exact failures influence redesign, treat them as development evidence and reserve another successor.

Seeds and recipes may remain public for reproducibility. Freshness comes from non-use and non-inspection for candidate design, not secrecy.

## Relationship to existing corpora

Corpus 2, technique census, variant families, and spent confirmation cohorts are all development evidence for future hypothesis generation once they have influenced design. Level-blindness within those populations does not restore holdout status.

The two failed confirmations are themselves valuable evidence: both treatments looked positive on repeatedly studied development data, and neither survived a fresh broad cohort. Independent confirmation is therefore a demonstrated requirement for broad promotion claims in this project.

## Next reservation

No new cohort is reserved for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` yet, but the blocker is cleared. All three tested confirmation designs (`confirm-broad-003`, `confirm-broad-004`, `confirm-residual-001`) failed by a genuine instrument problem, not a candidate problem — most recently a main-loop late-reserve mechanism that only protected the NODE-budget dimension, with no equivalent WORK-budget carve-out, letting a work-expensive early population exhaust `workBudget` while `nodeBudget` still had headroom. **That gap is now fixed (2026-08-26)**: `orchestration.ts`'s `runInterleavedAttempts`/`runGateSerialAttempts` now derive a mirrored `mainLoopEarlyWorkBudget`/per-gate `earlyGateWorkBudget` reserve, verified by two new regression tests that reproduce `confirm-residual-001`'s exact starvation mechanism against the pre-fix code (red) and pass against the fix (green) — no `--strict-total-work-budget` workaround needed.

A fourth cohort against the fixed scheduler is a reasonable next step and would no longer be expected to repeat `confirm-residual-001`'s exact truncation pattern. If dispatched, re-verify participation with the same `scripts/stress/confirm-residual-001-archetype-audit.mjs` audit script (durable, not one-off — kept specifically for this) before drawing conclusions from the aggregate numbers alone. `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` remains closed negative in development and needs no confirmation cohort at all.

**Spent (2026-08-27), CORRECTED same day:** this cohort was control-vs-control (the `matrix.arm` wiring bug — see [`2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md`](2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md)); the "concurrency-correlated variance" diagnosis below compared control against explicitly-forced-treatment reproductions and is explained by that config-count difference, not concurrency. Original entry preserved for provenance: `confirm-residual-002` — the fourth confirmation attempt for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, identical in design and envelope to `confirm-residual-001` (two-phase control-failure residual, `pool_count=1200`, `node_budget=50000000`) except for the fixed scheduler and a fresh identity never used by a prior cohort (master seed `2026082702`, id prefix `K`). **Result: byte-identical to `confirm-residual-001` — still zero participation on all 26 archetype-eligible-and-residual rows.** Live instrumentation (temporary, reverted after use) proved the scheduler fix's logic is not at fault: a single-worker (`--workers=1`) re-solve of the real row `K00131` through the real worker-pool dispatch path shows both new beam configs dispatching correctly with a genuine `exhausted` outcome. But the row's real sealed report (built under the standard `--workers=4` concurrent production dispatch) shows the SAME two preceding unprotected DFS configs consuming measurably more nodes under real concurrency (16,013,766 / 11,371,082) than in two independently-reproduced single-worker runs of the identical level+options (9,291,718 / 9,730,890 each time) — enough to exhaust the gate's work budget before the protected window is reached. The barrier has shifted from a fixable scheduling-logic gap to an unexplained, concurrency-correlated variance in the search's own node/work consumption. **Do not dispatch a fifth confirmation cohort under standard `--workers=4` concurrency until that variance is separately understood** (see [`2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md`](2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md) for the full diagnosis); a fifth cohort run the same way would very likely repeat the same result for the same unresolved reason.

**Reserved (2026-08-27):** `confirm-residual-003` — the fifth confirmation attempt for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, identical design/envelope to `confirm-residual-001`/`002` (two-phase control-failure residual, `pool_count=1200`, `node_budget=50000000`, `--workers=4`) with a fresh identity never used by a prior cohort (master seed `2026082703`, id prefix `L`). ~~Dispatched only after [`2026-08-27-worker-pool-concurrency-determinism-diagnosis.md`](2026-08-27-worker-pool-concurrency-determinism-diagnosis.md) closed the blocking concurrency-sensitivity hypothesis negative... `confirm-residual-002`'s standing caution against a standard-concurrency fifth cohort no longer applies.~~ **Superseded same-day**: run `33053110418` (dispatched against the *unfixed* `solver-residual-confirmation.yml`) was cancelled before phase 1 completed upon finding the real cause of every prior non-participation result — see [`2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md`](2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md). The concurrency investigation's own conclusion (real `--workers=4` concurrency does not change node/work trajectories) still stands on its own evidence, but it was never the reason any prior cohort showed zero participation. The reserved identity (`2026082703`/`L`) was redispatched against the fixed, hardened workflow as run [`33054538000`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33054538000) (2026-08-27, `main` commit `38493a5a`). All 64 phase-2 solve shards (32 control, 32 treatment) completed successfully — directly verified via job logs that treatment shards genuinely carried `--enable-flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` (e.g. `treatment-07`'s log) and control shards genuinely carried none (e.g. `control-22`'s log), confirming the wiring fix works correctly on real production infrastructure.

**Spent (2026-08-27) — CONFIRMED, first genuine result for this candidate:** the run's own `combine-phase2` job then failed on a second, unrelated bug: the new `*-flags.json` per-shard provenance file matches the same glob (`phase2-batch-*.json`) the combine step uses to find sweep reports, and got fed into `solver:combine-corpus2-batches` as a malformed report (`does not look like a portfolio-solve-sweep report`). All 64 shard artifacts were already complete and intact (90-day retention), so rather than re-running the entire multi-hour two-phase sweep, the glob was fixed in both `solver-broad-confirmation.yml` and `solver-residual-confirmation.yml`, and a one-shot workflow (`confirm-residual-003-recombine-one-shot.yml`, deleted after use) downloaded the existing shard artifacts and reran just the fixed combine/verify/verdict logic as run [`33083577386`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33083577386).

**Result: control 0/516, treatment 3/516, work 124,739,052,106 → 124,924,680,731 (+0.15%). Gained (3): `L00278`, `L00831`, `L00933`. Lost (0): none.** A clean confirmed gain — the same shape as the original 486-level development A/B (+3/-0) — and the first time this candidate has ever produced a real confirmation result; all four prior attempts (`confirm-broad-003`/`004`, `confirm-residual-001`/`002`) were control-vs-control non-results caused by the `matrix.arm` wiring bug.

**Next step, not taken here:** `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` is currently an opt-in ablation flag, not default-on in production. Per this report's "Durable confirmation contract" and the broader project convention that a confirmed treatment still needs independent transfer evidence before a broad promotion claim, the recommended next step is materializing `transfer-envelope-001` (still LOCKED/UNTOUCHED, reserved specifically for "the first locked transfer/challenge population after a treatment survives broad confirmation") against this candidate, before flipping it to default-on in `modules/solver/attempts.ts`. This report does not itself materialize that cohort or change the flag's default — it only records that confirmation has, for the first time, actually been earned.

The workflow that materializes these cohorts, `.github/workflows/solver-broad-confirmation.yml`, remains durable, checked-in plumbing (documented in `.github/workflows/README.md`) rather than bespoke one-shot YAML deleted after use — a third confirmation was enough repeated value to keep it (see that workflow's own header comment).

**Correction (2026-08-27, later same day):** [`docs/solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md) revised the evidence framework after this section was written. `transfer-envelope-001` uses `generate-random.mjs --envelope-caps` — the same witness-first construction family as Corpus 2, just a different seed/envelope — so it is now classified as a same-generator **in-envelope challenge/confirmation** stratum, not cross-generator transfer. It remains LOCKED/untouched and useful, but is no longer this candidate's promotion gate. The revised framework designates `scripts/stress/generate-topology.mjs` (macro-maze/module construction, does not call `generateWitness()`) as the standing cross-generator transfer/challenge source, and scales evidence intensity to selection pressure rather than mandating transfer for every candidate — see [`solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #1's revised "Next gate" for why this specific candidate (a rare +3/-0 gain selected from mined residual/portfolio evidence) still warrants that distributional challenge.

### `confirm-transfer-topology-001` — RESERVED (2026-08-27)

Reserves the candidate's first cross-generator transfer/challenge cohort, following `docs/solver-evaluation-evidence.md`'s "Before generating evaluation data" checklist:

- **Suitability check:** `isMustCrossFlipperHeavy` requires the `must-cross-heavy` archetype (`mustCrossKeys.length>=2`, `reqInt>=2`) plus `mustPass>=3` and `flippers>=2` — all mechanics `generate-topology.mjs` v0.1 explicitly supports (MustCross, MustPass, flipping filters). Per the suitability/expansion gate, this candidate depends only on mechanics already represented, so the generator is used as-is with no expansion.
- **Feature-only sizing pilot:** a separate, non-decision-bearing 300-level topology batch (`master_seed=2026082801`, `id_prefix=T`, generated and inspected locally, never solved) measured `must-cross-heavy` incidence at 56/300 (18.7%) and full `isMustCrossFlipperHeavy` eligibility at 8/300 (2.7%), via the new `scripts/stress/query-mustcross-flipper-eligibility.mjs` (structural-feature-only: `normalizeRawLevel()` + `detectArchetype()`, never runs the solver).
- **Sample size:** `count=1000`, sized from that 2.7% yield to target an expected ~27 eligible-participating rows — the same order of magnitude as `confirm-broad-004`'s `count=1200` sizing off its own measured 1.76% eligible rate.
- **Reserved identity:** `master_seed=2026082802` (fresh, distinct from the feature-only pilot's seed), `id_prefix=U` (`T` stays reserved for `transfer-envelope-001`, a different generator).
- **Mechanism:** `.github/workflows/solver-broad-confirmation.yml` gained a `generator` input (`random` default / `topology`) rather than a bespoke workflow, since it already implements the single-materialization-then-both-arms-verify-the-hash contract this needs; only the `generate` job's command differs. `envelope_caps` is ignored when `generator=topology`.
- **Envelope:** `enable_flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, `node_budget=50000000`, `--workers=4`, `shard_count=60`, `deterministic=true` — identical to the same-generator confirmation runs, so only the level-construction family differs between this and `confirm-residual-003`.
- **Ledger entry:** `confirm-transfer-topology-001` in `reports/stress/managed-evaluation-populations-2026-08-24.json`, `role: challenge-cross-generator`, `status: reserved`.

**Spent (2026-08-27) — clean null, ceiling-limited:** dispatched as run [`33108351046`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33108351046) against `main` commit `04bdac75` (the merge that adds `generator=topology`). Completed in ~29 minutes — all 120 solve shards (60 control, 60 treatment) succeeded. Directly verified via job logs that provenance held: treatment shard `treatment-59` genuinely resolved `extra=(--enable-flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE)` (16/16 solved), and control shard `control-01` genuinely resolved `extra=()` (17/17 solved).

**Result: control 997/1000, treatment 997/1000, work 5,526,984,362 → 5,550,082,141 (+0.42%). Gained (0): none. Lost (0): none** — both arms failed the exact same 3 levels.

This is a **clean null, not a confirmation failure**. The feature-only sizing pilot measured `isMustCrossFlipperHeavy` eligibility at 2.7% of topology levels, but did not (and could not, without solving) measure how many of those eligible levels control would actually fail — that number turned out to be at or near zero: this unconditioned 1,000-level sample was 99.7% solvable by control alone, leaving almost no room for any candidate to show an incremental gain, independent of whether the underlying mechanism generalizes to this distribution. This is the same structural risk `confirm-broad-003`/`004` hit for a different reason (repair-fallback saturation) before `confirm-residual-003`'s residual-conditioned design fixed it for same-generator confirmation — an unconditioned topology sample inherits the analogous ceiling problem. The +0.42% work movement with **zero losses** is at least a no-harm signal on a materially different level-construction family, which is worth something even without a positive transfer result.

**What this does and does not settle:** it does not provide positive cross-generator transfer evidence (no gains were possible to observe in this population). It also found no evidence of harm on that distribution. Per `docs/solver-evaluation-evidence.md`'s promotion rules, this candidate is a "one prespecified narrow treatment with little/no tuning" that has already passed independent same-generator confirmation (`confirm-residual-003`, +3/-0) — the framework explicitly allows "a narrow default-on promotion... after confirmation without cross-generator transfer when selection pressure and claim scope are modest," which describes this candidate. A higher-power topology transfer test, if wanted before promotion, would need a residual-conditioned design (freeze topology-generated control failures first, mirroring `confirm-residual-003`'s two-phase pattern) rather than an unconditioned broad sample — not attempted here.

**Promoted (2026-08-27):** the evidence chain (development A/B +3/-0 → same-generator confirmation +3/-0 → cross-generator transfer clean null with zero losses) was put to the user, who asked for the promotion. `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` is now default-ON in production:

- Removed from `OPT_IN_FEATURES` in `modules/solver/ablation-config.ts`, and its `FEATURES` description updated from "Production default-OFF" to "Production default-ON" (the latter is load-bearing: `orchestration.test.ts` asserts `FEATURES` descriptions and `OPT_IN_FEATURES` membership cannot drift apart).
- The flag's own application check in `attempts.ts` changed from `cfg && cfg.STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE === true` to `!cfg || cfg.STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` — the pattern every other default-ON gate in that file uses (e.g. `STRATEGY_ADMISSIBLE_ORDER`). This was not optional: real production solving calls `getConfiguredAttemptConfigs`/`getAttemptConfigs` with a **null** ablation config when no override is requested (`normalizeAblationConfig(opts.ablation)` returns `null` for `opts.ablation == null`), so the `cfg && cfg.FLAG === true` pattern would have stayed permanently off in true production regardless of `OPT_IN_FEATURES` membership — only a resolved `defaultConfig()`-based `AblationConfig` (used by tooling/tests, and by the `normalizeAblationConfig` Proxy whenever a non-null override object is supplied) would ever see the new default. Verified with a rewritten `attempts.test.ts` case asserting `getAttemptConfigs(level, null)` now includes the plain WIDE beams for an eligible level.
- `docs/solver-opt-in-experiment-ledger.md`: entry moved from "Current production-default-OFF flags" to "Recently promoted/default-ON mechanisms."
- Full targeted test suite (`attempts.test.ts`, `orchestration.test.ts`, `stage-executors.test.ts`) re-run and green after the change.

This candidate's queue item is now closed as promoted; see `docs/solver-optimization-current-queue.md` Priority 1 for the final state.
