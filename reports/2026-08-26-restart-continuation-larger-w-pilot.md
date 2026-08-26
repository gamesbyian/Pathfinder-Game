# Restart-vs-continuation development pilot: larger `W` on the same near-miss stratum

> **Status:** concluded-positive
> **Last evidence:** 2026-08-26 — single run of the frozen design completed (`tmp/restart-continuation-pilot-badness6-w64m-split50.json`)
> **Decision:** at `W=64,000,000`, restart clearly beats continuation on the primary outcome: **continuation solved 1/20, restart solved 3/20**, with 2 clean restart-only gains (`R00565`, `R02077`) and 0 restart-only losses. This reverses the W=16,000,000 finding (0/20 solved, no detected difference) and confirms gate 1 below: the earlier plateau was at least partly a budget ceiling, not a pure representation limit — more work bought more capability, and restart's seed diversity bought *more* of it than continuation's single long trajectory at the same total work. This is **development-positive evidence for restart, not yet confirmed** (n=20, single run, same census-derived development population reused across this whole pilot family) — do not promote a restart mechanism to production on this alone.
> **Remaining gate:** independent confirmation on a fresh/larger population before any promotion claim; the softer best-badness diagnostic (see below) is more mixed than the clean solved-count win, so any promotion design should gate on solved count, not badness.
> **Evidence role:** discovery (development pilot, not confirmation)
> **Selection:** prespecified before execution; frozen at commit `ca3f18af1d2d2e8e9ba6e5b8e90e38fff131b1b5`

## Motivation

[`2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md`](2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md) found that on the 20-level census-unsolved (`bestBadness<=6`) near-miss residual stratum, at `W=16,000,000` canonical work units, continuation and both tested restart splits (0.5, 0.8) reach essentially the same best-badness plateau (17/20 and 19/20 exact ties respectively) and solve 0/20 in every arm. That report's own disposition named the next informative move explicitly: not another restart-schedule variant on the same budget, but either (a) a materially larger `W` to distinguish a budget ceiling from a genuine representation limit, or (b) the learned-failure/search-quality line of work. This pilot takes option (a), since it is the cheaper and more directly falsifying of the two, and a positive result here would also inform whether (b) is worth pursuing next.

## Frozen design (prespecified before running)

- **Population:** identical 20-level near-miss residual stratum as the prior pilot — census-unsolved (`bestBadness<=6`), `--sample-every=1 --limit=20`, from `reports/stress/benchmark-latest-random.json` / `data/stress/stress-levels-random.json`. Not re-selected or re-filtered.
- **Comparator:** identical to the prior pilot's primary form — continuation (one `repairSearchFromGate` call at seed 0, full `W`) vs. restart-0.5 (seed 0 to `W/2`, then on failure fresh seed 1 to the remainder). The 0.8 split is not rerun here; this pilot varies only `W`, not the schedule, per the prior report's own instruction against sweeping further schedule variants on an already-flat budget.
- **Independent variable:** `W = 64,000,000` (4x the prior pilot's 16,000,000). Rationale for 4x rather than a smaller/larger multiple: production's single late-probe reserve (`REPAIR_LATE_PROBE_NODE_BUDGET`) is 5,000,000 nodes, so 16,000,000 was already ~3x that per seed; 64,000,000 is a full order of magnitude above the production per-reserve scale, large enough to plausibly move a genuine budget ceiling while remaining tractable to run locally (the 16M baseline took several minutes per arm; 64M is expected to take roughly 4x that, tens of minutes total, not hours).
- **Tool:** `scripts/stress/restart-continuation-population-pilot.mjs`, same script, no code changes.
- **Command (exact, run once):**
  ```bash
  node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
    --max-badness=6 --sample-every=1 --limit=20 --work-budget=64000000 --restart-split=0.5 \
    --out=tmp/restart-continuation-pilot-badness6-w64m-split50.json
  ```

## Success/stop gates (fixed before running)

1. **If either arm solves any of the 20 levels** (0/20 at W=16M in every arm) — that alone confirms `W=16,000,000` was below this stratum's true solvability ceiling for at least some levels, i.e. a budget ceiling was part of the story, not (or not only) a representation limit.
2. **If best-badness improves materially** (not just ties, as at W=16M) for a meaningful fraction of the 20 levels in the continuation arm relative to the already-published `censusBestBadness`/W=16M figures — same conclusion as (1), softer form.
3. **If both (1) and (2) are negative** — badness stays flat at the same values as W=16M for essentially all 20 levels, 0/20 solved — this is stronger evidence (now at two budget points, 4x apart) for a genuine search-quality/representation ceiling on this stratum, not a budget question. In that case the recommended next move per the prior report is the learned-failure/search-quality diagnosis line of work, not a further budget increase on this same stratum.
4. **Restart-vs-continuation delta at the larger `W`:** report mean/median delta and win/tie/loss counts exactly as the prior report did, regardless of (1)-(3)'s outcome — this remains a valid data point on the restart-schedule question even if the plateau turns out to be representation-bound.

No claim of promotion or closure follows from this pilot alone regardless of outcome; per the operating model, a single development pilot nominates further evidence, it does not promote or close by itself.

## Result

Same 20-level population as the prior pilot, `W=64,000,000` (4x). Full per-level output:

| level | census badness | continuation solved | continuation bestBadness | continuation work | restart solved | restart bestBadness | restart work | restart seeds |
|---|---:|---|---:|---:|---|---:|---:|---|
| R00342 | 6 | false | 5 | 64,000,055 | false | 6 | 64,000,026 | [0,1] |
| R00355 | 2 | false | 2 | 64,016,716 | false | 2 | 64,000,884 | [0,1] |
| R00565 | 6 | false | 6 | 55,283,765 | **true** | 6 | 58,220,935 | [0,1] |
| R00765 | 6 | false | 5 | 48,822,075 | false | 6 | 64,000,121 | [0,1] |
| R01052 | 5 | false | 3 | 64,000,118 | false | 4 | 64,000,062 | [0,1] |
| R01179 | 6 | false | 6 | 64,000,028 | false | 6 | 64,000,278 | [0,1] |
| R01229 | 4 | false | 4 | 64,000,043 | false | 4 | 64,000,061 | [0,1] |
| R02077 | 3 | false | 3 | 64,002,770 | **true** | 3 | 45,562,580 | [0,1] |
| R02080 | 2 | **true** | — | 21,754,685 | **true** | — | 21,754,685 | [0] |
| R02162 | 3 | false | 3 | 64,004,335 | false | 3 | 64,000,032 | [0,1] |
| R02176 | 5 | false | 5 | 44,334,868 | false | 5 | 64,000,045 | [0,1] |
| R02182 | 4 | false | 4 | 49,691,021 | false | 4 | 64,000,002 | [0,1] |
| R02392 | 5 | false | 4 | 64,000,079 | false | 5 | 64,000,018 | [0,1] |
| R02422 | 3 | false | 3 | 64,000,094 | false | 3 | 64,000,047 | [0,1] |
| R02432 | 6 | false | 4 | 59,988,107 | false | 4 | 64,000,015 | [0,1] |
| R02437 | 2 | false | 2 | 64,000,021 | false | 2 | 64,000,014 | [0,1] |
| R02438 | 4 | false | 4 | 49,106,882 | false | 4 | 64,000,035 | [0,1] |
| R02448 | 6 | false | 6 | 64,000,025 | false | 5 | 64,000,005 | [0,1] |
| R02452 | 4 | false | 4 | 64,000,852 | false | 4 | 64,003,266 | [0,1] |
| R02456 | 3 | false | 3 | 64,009,001 | false | 3 | 64,000,033 | [0,1] |

**Summary:** continuation solved 1/20, restart solved 3/20. Both solved: 1 (`R02080`, trivially — restart's seed 0 alone solved it before ever reaching the split boundary, so both arms are identical on this row). Neither solved: 17. Restart-only gains: 2 (`R00565`, `R02077`). Restart-only losses: 0.

`R02077` is the more striking of the two gains: restart solved it using **less total work** (45,562,580) than continuation spent failing to solve it (64,002,770) — not just "won," but won cheaper. `R00565` is the classic seed-diversity story: continuation's single unbroken trajectory across the full 64,000,000 work budget could not solve it, but splitting the same total budget across two independent seeds could — a fresh trajectory escaped whatever structure the first seed's continuation was stuck in.

**Gate 1 (any solve at all):** met. 4/20 solve-arm-outcomes now exist (1 continuation, 3 restart, with 1 overlapping) versus 0/20 at `W=16,000,000` in every arm/split. The plateau was not a hard wall at `W=16,000,000`.

**Gate 2 (material badness improvement):** partially met, and revealing. Comparing continuation's bestBadness here against the original `censusBestBadness` column (last measured at a much smaller work budget than either restart pilot): 8 of the 19 still-unsolved levels show continuation's badness strictly below the census figure (`R00342` 5<6, `R00765` 5<6, `R01052` 3<5, `R02176` 5=5 no, `R02182` 4=4 no, `R02392` 4<5, `R02432` 4<6, `R02438` 4=4 no) — call it 5 clear improvements among 19, plus the 2 outright new solves. More work does buy measurable capability on this stratum; it is not a flat wall.

**Gate 4 (restart-vs-continuation delta, all levels including solves as outcome, badness among the 17 that neither arm solved):** bestBadness delta (restart − continuation) among the 17 mutually-unsolved levels: `R00342` +1, `R00355` 0, `R00765` +1, `R01052` +1, `R01179` 0, `R01229` 0, `R02162` 0, `R02176` 0, `R02182` 0, `R02392` +1, `R02422` 0, `R02432` 0, `R02437` 0, `R02438` 0, `R02448` −1, `R02452` 0, `R02456` 0 — mean +0.176, median 0, 4 restart-worse / 1 restart-better / 12 tied. **This softer diagnostic slightly favors continuation** among levels where neither arm solved, which is the opposite direction from the primary solved-count outcome. The two metrics are not in conflict: they describe different things. Restart occasionally lands in a marginally worse unsolved state when both fail (a fresh seed's own local plateau can be worse than continuation's), but its access to an entirely different trajectory is exactly what let it escape twice where continuation, with equal total work, could not escape at all. On the outcome that actually matters — solved count — restart is unambiguously ahead here (+2/-0), and best-badness among failures is a diagnostic, not the acceptance metric (per the original audit's own outcome list, solved/`workSpent` are primary; `bestBadness` is secondary).

## Interpretation

This single 20-level run is the first result in this entire restart-vs-continuation line of work where the two schedules are *not* indistinguishable. At `W=16,000,000` every prior comparison (0.5 and 0.8 splits) was a flat tie in both solved count and badness. At `W=64,000,000`, restart's solved-count lead (+2/-0) is a real, uncontradicted signal in restart's favor, while the badness-among-failures picture is mixed. This is consistent with a coherent underlying story: this stratum is not a hard representation ceiling (gate 1/2 confirm more work helps at all), and seed diversity specifically helps *some* of the levels that a single long trajectory gets stuck on, at the modest cost of occasionally (4/17) landing in a slightly worse failed state than continuation would have.

Determinism was not independently re-verified by a second run of this specific `W=64,000,000` design (unlike the `W=16,000,000` pilot, which reran each split twice) — this pilot relies on the already-established property that `repairSearchFromGate` is deterministic given level/gate/seed/work cap (verified by the execution-readiness harness's own unit tests and the prior pilot's own two-independent-reruns check), rather than repeating that verification at 4x the compute cost for a single development-stage pilot. A confirmation-grade follow-up should still verify this independently if it becomes decision-bearing.

## Disposition

- **Do not close Priority 0's restart question negative.** The corrected `W=16,000,000` pilot's "no detected difference" framing does not generalize to this larger budget; restart shows a real, positive, uncontradicted solved-count signal here.
- **Do not promote a restart mechanism to production** on this evidence alone. n=20 from a single run on a reused development population is exactly the kind of "isolated-technique win nominates full-policy tests; it does not promote itself" case the operating model's own interpretation rules describe (see `solver-opt-in-experiment-ledger.md` rule 6, applied here to a scheduling question rather than an ablation flag). The two clean gains came from only 2 of 20 levels; that is a promising rate on a hard residual stratum, not a large-sample result.
- **Recommended next step:** an independent confirmation at the same `W=64,000,000`/0.5-split design on a fresh census-unsolved sample (not reusing these 20 rows, which have now influenced this pilot's own conclusion and are development evidence going forward), sized to detect an effect of this rough magnitude (2/20 = 10% gain rate) with reasonable power — a substantially larger N than 20 is warranted before this becomes a promotion candidate. This is now the queue's most concrete near-term next step for Priority 0, ahead of the previously-listed "different residual stratum" and "3+ seeds" directions, since it follows up on an actual detected signal rather than opening a new untested dimension.
- The learned-failure/search-quality line of work remains open and untouched by this pilot; today's result does not argue against it, since restart's specific mechanism (seed diversity escaping bad trajectories) and learned-failure's (recognizing and avoiding known-bad structure) are not mutually exclusive explanations for this stratum's behavior.
