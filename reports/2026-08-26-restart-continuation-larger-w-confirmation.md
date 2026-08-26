# Restart-vs-continuation larger-`W` pilot: confirmation on the disjoint remainder

> **Status:** concluded-positive
> **Last evidence:** 2026-08-26 — single run of the frozen design completed on all 23 disjoint remainder levels (`tmp/restart-continuation-pilot-badness6-w64m-split50-confirm.json`)
> **Decision:** the signal replicates and strengthens. Fresh 23: **continuation solved 2/23, restart solved 5/23**, 3 clean restart-only gains (`R02655`, `R03059`, `R03234`), 0 losses. Pooled across both pilots (43 levels total): **continuation 3/43 (7.0%), restart 8/43 (18.6%)**, 5 clean gains, 0 losses anywhere in either draw. The badness-among-failures diagnostic that slightly favored continuation in the first pilot (mean +0.176) reverses direction in this fresh sample (mean −0.056 over 18 mutually-unsolved rows), so pooled it is close to flat (+0.057) — that earlier softer signal looks like noise, while the solved-count effect has now replicated cleanly on an independent draw with zero losses across both. This is a real, reproduced development-stage finding, not yet a promotion case.
> **Remaining gate:** design an actual production candidate (which archetype/rule would route through it, budget/envelope, how it composes with the existing repair-probe/late-probe tiers) before any development A/B on production wiring; independent confirmation (in the `confirm-broad-*`/sealed-cohort sense) still applies once that wiring exists, per the standard pipeline.
> **Evidence role:** discovery (development-stage confirmation on a disjoint sample; not a production-promotion-grade confirmation cohort — restart-vs-continuation is not yet wired as a production ablation flag, so the heavier `confirm-broad-*`/sealed-cohort protocol in [`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](2026-08-24-solver-confirmation-transfer-cohort-reservation.md) does not yet apply to it)
> **Selection:** prespecified before execution; frozen at commit `5030f861e150e87e6079defcc42c281872ebb49c` (the same commit that adds the `--offset` flag this design depends on)

## Motivation

[`2026-08-26-restart-continuation-larger-w-pilot.md`](2026-08-26-restart-continuation-larger-w-pilot.md) found, on the first 20 of a 43-level census-unsolved (`bestBadness<=6`) near-miss residual stratum at `W=64,000,000`, that restart clearly beat continuation on solved count (3/20 vs 1/20, 2 clean gains, 0 losses) — the first non-tied result in this whole line of work. That report's own disposition named the concrete next step: independent confirmation on a fresh sample not reusing the 20 rows that already influenced the conclusion. This stratum's full candidate population is exactly 43 levels (all census-unsolved rows with a genuine repair-probe attempt at `bestBadness<=6`); the 20 already used are `positions 1-20` in fixed census order, leaving exactly 23 disjoint, never-inspected candidates (`positions 21-43`) — the entire remainder of the stratum as currently defined, not an arbitrarily chosen subsample.

## Frozen design (prespecified before running)

- **Population:** the disjoint remainder of the same stratum — `--max-badness=6 --offset=20` (skips the 20 already-inspected candidates in fixed census order) `--sample-every=1` (no further subsampling) with no `--limit` cap, so all 23 remaining candidates run. `--offset` is a new, minimal, additive flag added to `scripts/stress/restart-continuation-population-pilot.mjs` for exactly this purpose (skip a prefix in the same fixed census order; not outcome-based) — verified with a throwaway `--limit=1 --work-budget=1000` dry run to confirm it selects `R02533` (position 21, the first row after the prior pilot's last), not a repeat of the prior 20.
- **Comparator:** identical to the prior pilot — continuation (one `repairSearchFromGate` call at seed 0, full `W`) vs. restart-0.5 (seed 0 to `W/2`, then on failure fresh seed 1 to the remainder). No schedule variant swept.
- **Independent variable:** none — `W=64,000,000` held fixed at the value that produced the detected signal. This pilot tests whether that signal replicates on fresh rows, not whether a different `W` does better.
- **Tool:** `scripts/stress/restart-continuation-population-pilot.mjs` (plus the new `--offset` flag), no other code changes.
- **Command (exact, run once):**
  ```bash
  node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
    --max-badness=6 --offset=20 --sample-every=1 --work-budget=64000000 --restart-split=0.5 \
    --out=tmp/restart-continuation-pilot-badness6-w64m-split50-confirm.json
  ```

## Success/stop gates (fixed before running)

1. **Primary outcome:** solved-count comparison (restart vs. continuation) on these 23 fresh levels. A result consistent with the first pilot's ~10% gain rate (roughly 1-3 restart-only gains, 0 or few losses) replicates the signal. Zero gains here would not by itself prove the first pilot's result was noise (23 rows is still small), but combined with the first pilot it would materially weaken confidence in the effect.
2. **Losses matter as much as gains.** Any restart-only loss (continuation solves, restart does not) on these fresh rows is a real negative data point the first pilot did not have (it saw 0 losses in 20 rows) — report it plainly regardless of the gain count.
3. **Pooled analysis:** report the combined 43-level result (20 + 23) alongside the fresh-23 result alone, since the two pilots share an identical design and W, and pooling is legitimate once both are complete (unlike pooling a confirmation cohort with the development population that nominated it, pooling here is combining two draws from the *same* prespecified stratum under the *same* frozen design — not reusing an outcome-inspected population to re-select a treatment).
4. **No promotion or closure claim follows from this pilot alone.** Even a clean replication (gains, no losses) on 43 total levels remains development-stage evidence for a scheduling mechanism with no production wiring yet; it would upgrade "worth a real confirmation cohort/promotion design" from a hypothesis to a much better-supported one, not skip that step.

## Result

All 23 disjoint remainder levels (`positions 21-43` of the 43-level stratum), same `W=64,000,000`, same 0.5 split:

| level | census badness | continuation solved | continuation bestBadness | continuation work | restart solved | restart bestBadness | restart work | restart seeds |
|---|---:|---|---:|---:|---|---:|---:|---|
| R02533 | 2 | false | 2 | 64,000,490 | false | 2 | 64,000,047 | [0,1] |
| R02552 | 6 | **true** | — | 30,199,459 | **true** | — | 30,199,459 | [0] |
| R02558 | 4 | false | 4 | 64,000,627 | false | 4 | 64,000,052 | [0,1] |
| R02567 | 5 | false | 4 | 64,000,053 | false | 4 | 64,000,004 | [0,1] |
| R02586 | 2 | false | 2 | 64,000,023 | false | 2 | 64,000,110 | [0,1] |
| R02654 | 6 | false | 6 | 64,000,153 | false | 6 | 64,000,070 | [0,1] |
| R02655 | 4 | false | 1 | 60,043,380 | **true** | 4 | 56,915,315 | [0,1] |
| R02656 | 4 | false | 4 | 64,005,140 | false | 4 | 64,000,430 | [0,1] |
| R02661 | 3 | false | 3 | 64,000,013 | false | 3 | 64,000,070 | [0,1] |
| R02758 | 6 | false | 5 | 64,002,848 | false | 5 | 64,004,719 | [0,1] |
| R02765 | 3 | false | 3 | 57,247,033 | false | 3 | 64,000,044 | [0,1] |
| R02770 | 5 | false | 5 | 64,000,078 | false | 5 | 64,000,071 | [0,1] |
| R02951 | 5 | false | 5 | 59,270,948 | false | 5 | 64,002,718 | [0,1] |
| R02997 | 5 | false | 5 | 52,670,449 | false | 5 | 64,002,460 | [0,1] |
| R03059 | 5 | false | 5 | 64,000,400 | **true** | 5 | 61,335,697 | [0,1] |
| R03071 | 3 | false | 3 | 62,624,920 | false | 2 | 64,010,910 | [0,1] |
| R03101 | 5 | false | 5 | 64,000,912 | false | 5 | 64,009,992 | [0,1] |
| R03130 | 4 | false | 4 | 50,037,356 | false | 4 | 64,000,006 | [0,1] |
| R03152 | 6 | false | 6 | 52,254,643 | false | 6 | 64,000,000 | [0,1] |
| R03183 | 5 | false | 5 | 58,962,838 | false | 5 | 64,000,101 | [0,1] |
| R03234 | 4 | false | 4 | 64,002,443 | **true** | 4 | 47,161,555 | [0,1] |
| R03241 | 5 | **true** | — | 15,885,982 | **true** | — | 15,885,982 | [0] |
| R03368 | 5 | false | 5 | 64,000,557 | false | 5 | 64,006,239 | [0,1] |

**Summary:** continuation solved 2/23, restart solved 5/23. Both solved: 2 (`R02552`, `R03241` — both trivial, restart's seed 0 alone solved before the split boundary, identical to continuation). Neither solved: 18. Restart-only gains: 3 (`R02655`, `R03059`, `R03234`). Restart-only losses: 0.

`R02655` is the most dramatic single row across both pilots: continuation's badness (1) is *better* than restart's (4) — continuation got numerically closer without solving — yet restart still solved it and continuation did not. This is a clean illustration of why solved count and best-badness-among-failures are genuinely different metrics: a fresh trajectory can find a qualitatively different (successful) path even from a numerically worse-looking search state, and a single long trajectory getting closer by one measure is not the same as being closer to an actual solution.

### Pooled analysis (43 levels, both pilots combined)

| | continuation | restart |
|---|---:|---:|
| solved | 3/43 (7.0%) | 8/43 (18.6%) |
| restart-only gains | — | 5 (`R00565`, `R02077`, `R02655`, `R03059`, `R03234`) |
| restart-only losses | — | 0 |

Zero losses in 43 independent levels across two separate draws from the same stratum is itself notable: if restart's seed-diversity mechanism carried a meaningful risk of actively hurting a level continuation would otherwise solve, 43 rows gave it two full opportunities to show that risk and it did not appear once.

Best-badness among mutually-unsolved rows, pooled: 18 rows had a nonzero delta or were compared across the two pilots — pilot 1 (17 comparable rows): mean +0.176 (4 restart-worse, 1 restart-better, 12 tied). Pilot 2 (18 comparable rows): mean −0.056 (0 restart-worse, 1 restart-better [`R03071`, delta −1], 17 tied). Pooled (35 comparable rows): mean +0.057, close to flat. The apparent restart-worse tilt in pilot 1 alone does not replicate — pooled, the softer diagnostic is essentially neutral, while the solved-count effect (the outcome that actually matters) has strengthened on an independent draw.

## Gates evaluated

1. **Primary outcome replication:** met, and stronger than the first pilot alone (13.0% gain rate here vs. 10.0% in the first pilot; pooled 11.6%).
2. **Losses:** zero in this fresh sample, same as the first. 0/43 pooled.
3. **Pooled analysis:** reported above.
4. **No promotion/closure claim:** holds. This is now two independent, zero-loss, positive-gain draws from the same prespecified stratum under an identical frozen design — meaningfully stronger development evidence than either pilot alone, but restart-vs-continuation still has no production wiring to promote. The next step is designing that wiring (which archetype/population it would target, what budget envelope, how it interacts with the existing repair-probe/late-probe multi-seed tiers already in production), not skipping straight to a `confirm-broad-*`-style cohort for a mechanism that does not exist in shippable form yet.

## Disposition

- Restart-vs-continuation is no longer an open, unresolved question on this stratum/budget: two independent samples agree that restart's seed-diversity mechanism finds solves continuation's single long trajectory misses, at this `W`, on this near-miss population, with no observed downside.
- This remains **development evidence for a research mechanism, not a production candidate**. The concrete next step this pilot family recommends: design a production-shaped candidate (a specific archetype/rule gate, a specific work-budget source — likely drawing from the existing `REPAIR_LATE_PROBE_NODE_BUDGET`/multi-seed retry machinery already in production rather than a new standalone budget), implement it behind a new ablation flag, then run the standard development A/B → confirmation → promotion pipeline used for every other candidate in `solver-opt-in-experiment-ledger.md`.
- Both pilots' populations (all 43 stratum levels) are now inspected development evidence and must not be treated as a fresh holdout for whatever production candidate follows.
