# The real turn-bias confound: a sparse-ablation-config bug, not a nogood-cache interaction

## Summary

`reports/2026-08-07-turnbias-corpus2-validation.md` concluded that `STRATEGY_REPAIR_TURN_BIAS`
nets **-7/1700** on corpus-2 against current defaults, with a "plausible-but-unconfirmed"
hypothesis that `STRATEGY_REPAIR_NOGOOD_CACHE`'s dead-state short-circuiting was undermining turn
bias's exploration. **That hypothesis is wrong, and has been directly falsified.** The real cause
is a genuine bug in `normalizeAblationConfig` (`modules/solver/orchestration.ts`): any sparse
ablation object naming one opt-in-only flag silently activated every *other* opt-in-only flag too
— meaning every GitHub Actions dispatch with `enable_flags=STRATEGY_REPAIR_TURN_BIAS` was secretly
also running with `STRATEGY_REPAIR_ELITE_PREFIX_DFS` enabled, a mechanism independently validated
as net-negative the same day (`reports/2026-08-07-repair-elite-prefix-dfs.md`, 4/20 vs 5/20 solved
on its own 20-level A/B). Turn bias's true disposition is **still unknown** — the -7 number is
retracted, not confirmed.

## How this was found

Investigating why disabling `STRATEGY_REPAIR_NOGOOD_CACHE` (via the newly-added `disable_flags`
workflow input) failed to recover turn bias's earlier +3 reading — it gave -8 instead, nearly
identical to the -7 with the cache left on (same 5 gained, 12 vs 13 lost, differing by exactly one
level) — ruled out the cache as the cause. Re-checking the original +3 run's own job log confirmed
it used `enable_flags=STRATEGY_REPAIR_TURN_BIAS` on a commit (`8ce42ba8`) that predates
`STRATEGY_REPAIR_ELITE_PREFIX_DFS`'s existence entirely — so that run genuinely could not have run
elite-prefix-dfs. The -7/-8 runs, by contrast, ran on commits that included it. A direct check
confirmed the mechanism:

```
normalizeAblationConfig({ STRATEGY_REPAIR_TURN_BIAS: true }).STRATEGY_REPAIR_ELITE_PREFIX_DFS
// => true  (should be false — this flag was never named in the input object)
```

This is the exact same bug independently caught and fixed earlier the same session in
`scripts/stress/portal-parity-envelope-ab.mjs` (see its own commit message) — but that fix only
addressed the LOCAL script; the root cause in `normalizeAblationConfig` itself, which every GHA
dispatch and every other ablation-consuming tool also goes through, was never touched. This should
have been the first place checked once the local script's version of the same symptom appeared;
recorded here as the lesson for next time.

## Root cause

`normalizeAblationConfig`'s Proxy `get` trap fell back to `true` for ANY unset flag not in a
small `ABLATION_NON_FLAG_KEYS` exclusion set — correct for the ~30 standard flags (whose real
production default genuinely is "on"), but wrong for the (as of this session) three opt-in-only
flags (`STRATEGY_REPAIR_TURN_BIAS`, `STRATEGY_REPAIR_ELITE_PREFIX_DFS`,
`PRUNE_PORTAL_PARITY_ENVELOPE` — all gated at their own read sites via `cfg && cfg.FLAG === true`
specifically because their real default is off). The function's own design comment explains it
deliberately avoids importing `scripts/ablation-config.mjs`'s full `FEATURES` registry to sidestep
a "second list to keep in sync" — reasonable when every flag shared one default, but incomplete
once a flag's default could be `false`. `--enable-flags`/`--disable-flags` on
`portfolio-solve-sweep.mjs` (and therefore `solver-stress-refresh.yml`'s `enable_flags`/
`disable_flags` inputs) always build a **sparse** ablation object — naming only the flags a
dispatch cares about — so this bug fired on every single ablation-flag GHA dispatch this session
that ran on a commit where more than one opt-in flag existed simultaneously.

## Fix

Added `ABLATION_OPT_IN_KEYS` (`orchestration.ts`), a short explicit set of the flags whose real
default is off. The Proxy's fallback now checks it: `!ABLATION_OPT_IN_KEYS.has(prop)` instead of
a blanket `true`. This is the "second list to keep in sync" the original design wanted to avoid —
now unavoidable once any opt-in flag exists — with a comment pointing at exactly why. Verified:
`normalizeAblationConfig({ STRATEGY_REPAIR_TURN_BIAS: true })` now correctly gives
`STRATEGY_REPAIR_ELITE_PREFIX_DFS: false` and `PRUNE_PORTAL_PARITY_ENVELOPE: false`, while standard
flags (`STRATEGY_REPAIR_NOGOOD_CACHE`, `PRUNE_PARITY`, …) are unaffected. Two new regression tests
in `orchestration.test.ts` lock this in. `tsc --noEmit` clean, full solver suite (292 tests)
passes, `solver:bench --check` 160/160 with byte-identical `nodesExpanded` (this only changes
behavior for non-null sparse ablation configs missing an opt-in flag — the production `cfg: null`
path, and every already-complete config, are untouched).

## What this means for every ablation-flag GHA dispatch this session

Any `solver-stress-refresh.yml` run with a non-empty `enable_flags`/`disable_flags`, dispatched on
a commit after `STRATEGY_REPAIR_ELITE_PREFIX_DFS` existed (2026-08-07 07:40 UTC onward) and before
this fix, was silently also running with elite-prefix-dfs enabled. That's specifically runs #20
and #21 (both turn-bias isolation attempts) — no other `enable_flags` GHA dispatch this session
used a non-empty value on an affected commit. Turn bias's real disposition needs re-measurement
against the fixed code; see the follow-up dispatch below.

## Disposition

`STRATEGY_REPAIR_TURN_BIAS` reverts to **genuinely undetermined pending a clean re-run** — not
"confirmed net-negative" as the retracted report claimed, and not the earlier "+3" either, since
that number's own sample size (one run) was never independently confirmed clean in the first
place. `reports/2026-08-07-turnbias-corpus2-validation.md` and the escape-plan doc's addendum
citing it are corrected to point here.
