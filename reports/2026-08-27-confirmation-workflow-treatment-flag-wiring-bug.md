# Confirmation workflows never actually enabled the treatment flag

> **Status:** concluded-positive
> **Last evidence:** 2026-08-27 — direct code read of `.github/workflows/solver-broad-confirmation.yml` and `.github/workflows/solver-residual-confirmation.yml` at commit `8d37103e` (pre-fix), confirming the bug; fixed in the same commit.
> **Decision:** Both confirmation workflows referenced `matrix.arm` in the one step that decides whether a "treatment" shard actually passes `--enable-flags`/`--disable-flags` to the solver. The shard-planning step that builds the matrix emits `{ shard: [{ idx, arm, levels }, ...] }` — every other reference in both workflows correctly uses `matrix.shard.idx`/`matrix.shard.levels`, but this one site used the wrong path. `matrix.arm` does not exist, so the GitHub Actions expression evaluates to an empty string, the `if [ "" = "treatment" ]` branch never executes, and **every "treatment" shard of every dispatch of either workflow ran with zero ablation flags — identical to the control arm.** Fixed by changing `matrix.arm` to `matrix.shard.arm` in both workflows, plus two hardening additions: (1) every shard now writes a `*-flags.json` artifact recording its resolved `arm`/flag set, and (2) a fail-fast check aborts a shard (surfaced through the existing `exit_code`/"Fail on unexpected sweep error" mechanism) if a treatment shard resolves no flags while flags were requested, or a control shard resolves any.
> **Remaining gate:** none for the bug itself (fixed and hardened). For `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`'s actual confirmation status, see "What this means for the candidate" below — it needs a fresh cohort run against the fixed workflow before any promotion/closure decision.
> **Evidence role:** forensic (diagnosing a historical instrument defect across five prior confirmation runs).
> **Selection:** not applicable — this is a direct code-correctness finding (a nonexistent GitHub Actions expression path), not a sampled or selected result.

## The bug

Both workflows plan their shards in a `plan`/`plan-phase2` job, in JavaScript embedded in a `run:` step:

```js
for (const arm of ['control', 'treatment']) {
  for (let i = 0; i < shardCount; i++) {
    const slice = positions.filter((_, index) => index % shardCount === i);
    if (slice.length) shards.push({ idx: `${arm}-${String(i + 1).padStart(2, '0')}`, arm, levels: `pos:${slice.join(',')}` });
  }
}
console.log('shards=' + JSON.stringify({ shard: shards }));
```

The emitted matrix strategy is `matrix: ${{ fromJson(...) }}` over `{ shard: shards }` — meaning each matrix combination has exactly one top-level key, `shard`, whose value is the `{ idx, arm, levels }` object. Every other reference to a shard field in both workflows correctly goes through that key: `matrix.shard.idx` (job name, output paths, artifact names — 8 call sites across the two files) and `matrix.shard.levels` (the `--levels` argument). But the one site that decides whether to actually pass the candidate's ablation flags read `matrix.arm` instead:

```bash
if [ "${{ matrix.arm }}" = "treatment" ]; then
  [ -n "${{ inputs.enable_flags }}" ] && extra+=("--enable-flags=${{ inputs.enable_flags }}")
  [ -n "${{ inputs.disable_flags }}" ] && extra+=("--disable-flags=${{ inputs.disable_flags }}")
fi
```

`matrix.arm` is not a valid path into the matrix context (there is no top-level `arm` field — it is nested under `shard`). GitHub Actions does not error on a expression that resolves to nothing meaningful here; `${{ matrix.arm }}` simply expands to an empty string, so the condition is always `if [ "" = "treatment" ]` — always false. `extra` stays empty. The subsequent `level-blind-capability-sweep.mjs` invocation runs with no `--enable-flags`/`--disable-flags` argument at all, **for every shard, in every dispatch, of both workflows, regardless of which arm it was supposed to be.**

This was directly confirmed for `confirm-residual-002` from its own Actions log: a job named "Phase 2 solve shard treatment-01" printed the resolved shell as `if [ "" = "treatment" ]; then`, immediately above the (dead) line that would have added `--enable-flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`.

## How long this has been broken

`git log` on both workflow files shows the `matrix.arm` reference was present in their initial commits (`solver-broad-confirmation.yml`'s original add, and `solver-residual-confirmation.yml`'s original add per its own header comment referencing the broad workflow as its template) and was never touched by any subsequent edit to either file until this fix. Every dispatch of either workflow is affected:

| cohort | workflow | previously believed result | actual result |
|---|---|---|---|
| `confirm-broad-003` | `solver-broad-confirmation.yml` | control 159/256, treatment 159/256, "repair-fallback saturation" (candidate's eligible population overwhelmingly repair-resistant-negative in a fresh cohort) | control vs. **control** — the "treatment" arm never carried the candidate flag |
| `confirm-broad-004` | `solver-broad-confirmation.yml` | control 674/1200, treatment 674/1200, same saturation mechanism at 4.7x scale, `P≈7×10⁻¹⁰` against chance | control vs. **control** |
| `confirm-residual-001` | `solver-residual-confirmation.yml` | control 0/520, treatment 0/520; a real archetype-eligible population (25/520) found zero candidate-config attempts, diagnosed as a `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` scheduling gap under budget overshoot | control vs. **control** — the 25 "eligible" rows never had a treatment arm to participate in |
| `confirm-residual-002` | `solver-residual-confirmation.yml` | control 0/26, treatment 0/26 (after the 2026-08-26 WORK-budget reserve fix); diagnosed as a worker-concurrency-correlated node/work variance for `K00131`'s preceding configs | control vs. **control** |
| `confirm-residual-003` | `solver-residual-confirmation.yml` | (in flight when this bug was found) | **cancelled** before phase 1 completed (see below) |

## What this means for each prior diagnosis

None of the four completed cohorts above ever ran a real control-vs-treatment comparison. Each one's "zero participation" / "byte-identical work" signature is exactly what a correctly-functioning control-vs-control run should look like — both arms executed the identical ladder, so of course the aggregate work matched byte-for-byte and the candidate's two new configs never appeared in either arm's attempts (they were never enabled in either arm). This was previously read as a sequence of four different, increasingly exotic instrument failures, each independently diagnosed and partly "fixed":

- **`confirm-broad-003`/`004`'s "repair-fallback saturation"** (`reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`'s "Confirmation attempts" section): the reasoning that a fresh cohort's eligible population is overwhelmingly repair-resistant-negative may still be *true* as a general phenomenon (it is a plausible, independently reasonable claim about the difference between mined-residual and fresh-generated populations), but **these two runs did not demonstrate it**, because the treatment configuration was never active to be saturated-around in the first place.
- **`confirm-residual-001`'s scheduling-gap diagnosis** (same report): the investigation compared the real run's attempts (4 main-loop configs — correct, since it was actually control both arms) against a *separate* call to `getConfiguredAttemptConfigs` with the ablation flag explicitly forced on (6 configs), then concluded configs 5–6 were present but starved by `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`. In fact configs 5–6 were never configured for the real run at all — there was nothing to starve. **The 2026-08-26 WORK-budget reserve fix (PR #1506) may still be a legitimate, independently-motivated scheduler-correctness improvement** — it closes a real asymmetry (the NODE-dimension reserve had a WORK-dimension carve-out gap) and its own regression tests reproduce that asymmetry directly against synthetic budgets, with no dependency on any confirmation cohort's result. But it was not actually responsible for `confirm-residual-001`'s outcome, and does not need to have been.
- **`confirm-residual-002`'s "worker-concurrency-correlated variance"** (`reports/2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md`, and this session's own follow-up `reports/2026-08-27-worker-pool-concurrency-determinism-diagnosis.md`): the comparison that motivated this whole line of investigation was between the sealed `confirm-residual-002` report's `K00131` row (actually **control**, 4 main-loop configs) and two "isolated reproductions" that explicitly passed `ablation: { STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: true }` (genuinely **treatment**, 6 main-loop configs). Those are not the same configuration. `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`'s reserve carve-out is sized as a function of the *total* main-loop config count (`lateConfigStart`/`lateConfigCount`/`latePairCount` in `runGateSerialAttempts`/`runInterleavedAttempts`, `modules/solver/orchestration.ts`): a run with only 4 configs (control) carves no reserve for two nonexistent trailing configs and gives its early configs (`dfs:objectiveFirst`/`dfs:intersectionHarvest`) the *entire* pool; a run with 6 configs (treatment) reserves a slice for the two real trailing configs, leaving the same early configs a smaller pool. That is a complete, mundane, purely deterministic explanation for the reported discrepancy (16,013,766/11,371,082 nodes in the "sealed treatment" — actually control — vs. 9,291,718/9,730,890 in the explicitly-forced-treatment reproductions) requiring no concurrency effect whatsoever. **This was not independently re-verified against the original sealed `confirm-residual-002` artifacts here** (they were produced by a since-deleted one-shot diagnostic workflow and were not re-downloaded for this report) — it is the most parsimonious explanation consistent with every fact the original reports documented, not a fresh direct measurement.

## What does NOT need correction

- **This session's `reports/2026-08-27-worker-pool-concurrency-determinism-diagnosis.md`** (the `--workers=1` vs. `--workers=4` diagnostic that closed the general concurrency-determinism hypothesis negative) used a purpose-built one-shot workflow that never referenced `matrix.arm`/`enable_flags` at all — it compared the *same* configuration (no ablation flags either way) under different worker counts. That report's own conclusion (real worker-pool concurrency does not change a level's deterministic node/work trajectory, validated on the actual GitHub Actions production runner class) is unaffected by this bug. What that report got wrong was accepting the *premise* handed to it — that `confirm-residual-002`'s discrepancy was a genuine same-configuration, different-concurrency comparison — without first checking whether the two sides of that comparison were actually running the same configuration. They were not: see above.
- **`STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE`'s closed-negative development A/B** (`reports/2026-08-26-mustcross-reserve-widen-beam-exposure-development-ab.md`) did not use either confirmation workflow and is unaffected.

## What this means for the candidate

`STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` has, as of this report, **zero valid confirmation evidence** — not four inconclusive attempts, zero. Its only real evidence remains the original development A/B (+3/-0 on a 486-level `must-cross-heavy` archetype sample). `docs/solver-optimization-current-queue.md` item #1 is updated accordingly: this is not a promotion case and not a closed-negative case; it is exactly where it stood after development, with an unusually long and misleading paper trail of instrument failures that turned out to be one single wiring bug wearing four different diagnostic costumes.

`confirm-residual-003` (reserved in `reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md`, master seed `2026082703`, id prefix `L`) was dispatched once (run `33053110418`) and **cancelled immediately** upon finding this bug, before phase 1 completed — no pool was generated, no compute was wasted beyond a few minutes of a cancelled `generate-pool` job, and the reserved identity is unspent. It is being redispatched against the fixed workflow; its shard `*-flags.json` artifacts will be checked directly (not just the aggregate solved counts) before trusting the result this time.

## Hardening

Both workflows now:

1. Persist a `*-flags.json` artifact per shard (`{"idx", "arm", "resolvedFlags"}`) recording exactly what was resolved, alongside the existing batch/summary output — auditable directly from the run's artifacts without re-deriving it from logs.
2. Fail the shard (via the existing `exit_code`-based "Fail on unexpected sweep error" mechanism, no new failure path to maintain) if a treatment shard resolves an empty flag set while flags were requested, or a control shard resolves a non-empty one.

This closes the exact failure mode this report documents: a future reintroduction of the same class of bug (or a different wiring mistake with the same symptom) will fail the run loudly on its very first shard, rather than producing a plausible-looking null result that takes five cohorts and a multi-day investigation to unwind.
