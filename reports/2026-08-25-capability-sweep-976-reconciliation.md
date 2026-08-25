# Capability sweep 976 reconciliation

> **Status:** concluded-positive
> **Last evidence:** 2026-08-25 — level-blind capability run `32835403128` (`976/1700` Corpus 2), clean predecessor `32526927206` (`880/1700`), fixed-work scheduler A/B `32901181013`
> **Decision:** recent capability growth strengthens the case for portfolio exposure, routing, fixed-work allocation, and equal-work restart/continuation tests before inventing new broad search machinery. Keep the closed beam-quota and broad repair-expansion forms closed.
> **Remaining gate:** independently confirm the exact two-action scheduler suppression; refresh the current-policy/isolated-capability join against the 976 baseline; run the prespecified equal-work continuation-versus-fresh-seed test.
> **Evidence role:** queue reconciliation / discovery

## Result shape

The latest clean level-blind Corpus-2 comparison is unusually strong:

- run `32526927206`: **880/1700**;
- run `32835403128`: **976/1700**;
- delta: **+96 solves, 0 losses**.

This differs from the preceding capability transitions, which had substantial gain/loss churn. The new 976 solved set strictly contains the prior 880 solved set.

The 96 newly solved levels break down by winning family:

| family | new solves |
|---|---:|
| `dfs:repair:repair` | 45 |
| beam | 41 |
| ordinary DFS | 10 |
| admissible/IDA | 0 |

This is descriptive across revisions, not a same-revision causal A/B. Its value is in identifying where current production capability has appeared and which already-ranked questions now have more evidence behind them.

## Beam gains mostly validate routing/exposure work, not survivor-selection work

Thirty-five of the 41 new beam wins use the four beam identities that the August 22 census-to-policy audit had already identified as missing from relevant production policy rules:

- `beam:objectiveFirst@beam5000`;
- `beam:intersectionHarvest@beam5000`;
- `beam:perimeterSweep/perimeterCW@beam2000`;
- `beam:perimeterSweep/perimeterCCW@beam2000`.

Commit `7ad7cd2e351025a9d8810bd3828bbb70caaabc69` recorded the precursor diagnosis: among 46 examined cheap residual gaps, 35 had a winning beam configuration that the applicable `ATTEMPT_POLICY` rule never generated. The later routing additions exposed those existing techniques through trailing protected reserve.

Therefore the 41 beam gains do **not** reopen the negative fixed-width quota/bucketing result. The stronger lesson is that existing search families still have capability hidden behind whether they are offered and whether they receive useful work.

## Repair gains elevate allocation and restart questions, not broad new repair machinery

Repair accounts for 45 of the 96 new wins, but current evidence does not justify a new large repair operator:

- broad repair-fallback gate widening is already population-negative;
- generic extra repair reserve has already failed to solve its target population economically;
- the exact-live reconstructability audit remains heterogeneous and has only one confirmed native-hard case (`R00648`);
- multi-seed repair-late-probe work already showed real additive seed-diversity value (+5, 0 losses in its validation population).

The new sweep therefore increases the value of two narrower questions:

1. **access/allocation:** which levels fail because repair is not offered or is reached with too little fixed work?
2. **continuation value:** at equal total work, when is a fresh repair seed better than continuing the current seed?

Keep repair-search invention secondary until those cheaper explanations are separated.

## Fixed-work scheduler A/B now provides causal support

The prespecified same-revision A/B `32901181013` suppresses only ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest` while preserving the strict 67M total-work envelope and all later retry uses of those configurations.

Result on the frozen 60-level development sample:

| metric | control | treatment |
|---|---:|---:|
| solved | 40/60 | **41/60** |
| aggregate `workSpent` | 2,040,402,024 | **2,022,204,454** |
| work reduction | — | **0.89%** |
| gained | — | **R02966** |
| lost | — | **none** |

The treatment passes the frozen gate because it loses no solve and gains one.

`R02966` is especially diagnostic. The frozen census had independently nominated ordinary repair as its conservative isolated solver. Under control, the two suppressed DFS actions consume about 12.38M main-loop work and repair fallback gets about 9.05M before failure. Under treatment, those ordinary main-loop actions are absent and repair fallback receives about 18.91M; `dfs:repair:repair` then solves the level. This is direct evidence that **repricing existing work can create capability**, not merely reduce runtime.

Freeze this exact treatment and the existing acceptance rule before using reserved confirmation evidence. Do not tune it on `confirm-broad-001`.

## Priority consequences

1. **Scheduler/fixed-work repricing remains #0 and advances to independent confirmation.** Dynamic scheduling remains closed until this exact static treatment confirms.
2. **Generalization/holdout becomes immediately active.** The exact treatment and acceptance rule are now frozen, so `confirm-broad-001` has an earned use.
3. **Portfolio construction remains #2 but gets a concrete next analysis.** Rejoin current production policy to isolated capability on the 976 baseline and classify each residual opportunity as: **not offered**, **offered but starved**, or **offered adequately but fails**. Race/prune actions before tuning scores, widths, or thresholds.
4. **Restart/randomization moves ahead of inactive beam/exact-model lanes.** Run the existing equal-work seed-0 continuation versus seed-0/seed-1 split gate. Additive multi-seed gains are motivation, not proof.
5. **Beam quota/bucketing stays closed.** The new beam evidence is primarily routing/exposure evidence.
6. **Repair reconstructability remains secondary.** Allocation/access/seed questions are elevated under scheduler/restart work; large destroy/reconstruct work still needs recurrent structural evidence.

## Capability-refresh evidence hygiene

A major capability refresh should produce a compact delta digest against the latest comparable refresh. At minimum report:

- gained and lost level IDs;
- winning stage and stable action/config identity for changed solves;
- per-level `workSpent` and attempt-count deltas;
- aggregate work split across previously solved, newly solved, and still-unsolved levels;
- revision, budgets, deterministic/deadline mode, and relevant flags.

This digest is output-only research evidence. It must never feed exact-level history back into a cold level-blind solve.
