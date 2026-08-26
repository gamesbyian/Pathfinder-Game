# Restart-vs-continuation larger-`W` pilot: confirmation on the disjoint remainder

> **Status:** active
> **Last evidence:** 2026-08-26 — design frozen below; run dispatched but not yet completed as of this writing
> **Decision:** pending
> **Remaining gate:** run the frozen comparison below and report the outcome per the success/stop gates
> **Evidence role:** discovery (development-stage confirmation on a disjoint sample; not a production-promotion-grade confirmation cohort — restart-vs-continuation is not yet wired as a production ablation flag, so the heavier `confirm-broad-*`/sealed-cohort protocol in [`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](2026-08-24-solver-confirmation-transfer-cohort-reservation.md) does not yet apply to it)
> **Selection:** prespecified before execution; frozen at commit `3bfd14dcf1e75d4518d4c627b87edeb455f6a450`

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

_(to be filled in after the run completes)_
