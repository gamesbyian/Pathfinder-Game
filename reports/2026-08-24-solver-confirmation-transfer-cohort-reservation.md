# Solver confirmation/transfer cohort reservation

> **Status:** active
> **Last evidence:** 2026-08-26 — `confirm-residual-001` (520-level control-failure residual, run [`32979222722`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32979222722)) came back byte-identical work in both arms for a third time, but via a **newly-diagnosed, distinct scheduling-starvation mechanism** rather than a repeat of `confirm-broad-003`/`004`'s repair-fallback saturation — see that report's own confirmation-attempts section for the full diagnosis.
> **Decision:** broad/residual confirmation has now completed five real one-use lifecycles. `confirm-broad-001` and `confirm-broad-002` are spent with real (if negative) verdicts. `confirm-broad-003`, `confirm-broad-004`, and `confirm-residual-001` are all spent but **inconclusive**, not negative — three consecutive confirmation attempts against `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` have each failed by a *different* instrument mechanism (repair solving the level first at two scales, then a main-loop late-reserve apparently not holding under large budget overshoot even on a population specifically engineered to rule the first mechanism out). `transfer-envelope-001` remains locked and untouched.
> **Remaining gate:** **fixed 2026-08-26** — the main-loop late-reserve's missing WORK-budget carve-out diagnosed in `confirm-residual-001` is now fixed directly in `orchestration.ts` (see the development A/B report's updated "Remaining gate" and "Recommended next step"); a fourth cohort against the fixed scheduler is viable but not yet dispatched. Materialize `transfer-envelope-001` only after a candidate actually passes broad confirmation.
> **Evidence role:** discovery
> **Selection:** prespecified cohort lifecycle; each confirmation candidate, work envelope, and acceptance rule was frozen before its cohort was materialized
> **Manifest:** [`stress/managed-evaluation-populations-2026-08-24.json`](stress/managed-evaluation-populations-2026-08-24.json)
> **Protocol:** [`2026-08-23-solver-confirmation-transfer-protocol-design.md`](2026-08-23-solver-confirmation-transfer-protocol-design.md)

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

**Reserved:** `confirm-residual-002` — a fourth confirmation attempt for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, identical in design and envelope to `confirm-residual-001` (two-phase control-failure residual, `pool_count=1200`, `node_budget=50000000`) except for the fixed scheduler and a fresh identity never used by a prior cohort: master seed `2026082702`, id prefix `K`. Deliberately isolates the one changed variable (the scheduler fix) against otherwise the same experimental design, so a changed outcome can be attributed to the fix rather than a different cohort shape.

The workflow that materializes these cohorts, `.github/workflows/solver-broad-confirmation.yml`, remains durable, checked-in plumbing (documented in `.github/workflows/README.md`) rather than bespoke one-shot YAML deleted after use — a third confirmation was enough repeated value to keep it (see that workflow's own header comment).
