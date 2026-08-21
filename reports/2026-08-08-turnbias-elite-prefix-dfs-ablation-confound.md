# A real ablation-confound bug, found chasing turn bias — but turn bias's -7 holds anyway

## Summary

`reports/2026-08-07-turnbias-corpus2-validation.md` concluded that `STRATEGY_REPAIR_TURN_BIAS`
nets **-7/1700** on corpus-2 against current defaults, with a "plausible-but-unconfirmed"
hypothesis that `STRATEGY_REPAIR_NOGOOD_CACHE`'s dead-state short-circuiting was undermining turn
bias's exploration. **That specific hypothesis is wrong, and has been directly falsified**
(disabling the cache gave -8, not a recovery). While investigating an alternative explanation, a
genuine, independent bug was found and fixed in `normalizeAblationConfig`
(`modules/solver/orchestration.ts`): any sparse ablation object naming one opt-in-only flag
silently activated every *other* opt-in-only flag too — meaning every GitHub Actions dispatch with
`enable_flags=STRATEGY_REPAIR_TURN_BIAS` was secretly also running with
`STRATEGY_REPAIR_ELITE_PREFIX_DFS` enabled, a mechanism independently validated as net-negative the
same day (`reports/2026-08-07-repair-elite-prefix-dfs.md`, 4/20 vs 5/20 solved on its own 20-level
A/B). **This bug is real and the fix is correct and worth keeping** — but a clean re-run after
fixing it reproduced the exact same -7 result, byte-for-byte (see "Follow-up" below). Elite-
prefix-dfs's accidental activation turned out not to have flipped a single level on this
population. Turn bias's net -7/1700 against current defaults is confirmed via two independent,
byte-identical measurements.

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
used a non-empty value on an affected commit. See the follow-up dispatch below for whether this
actually changed anything (it didn't, but that had to be checked, not assumed).

## Follow-up: the clean re-run confirms -7 anyway

Two more `deterministic:true` dispatches against the fixed code (commit `05e3711`): a no-flags
baseline (725/1700, matching the committed baseline exactly) and a properly-isolated
`enable_flags=STRATEGY_REPAIR_TURN_BIAS` run — this time with `STRATEGY_REPAIR_ELITE_PREFIX_DFS`
correctly defaulting to `false` per the fix above. Result: **718/1700, net -7 — byte-identical**
to the confounded run's own gained/lost sets (same 5 gained: R00306, R00500, R00632, R02934,
R03368; same 12 lost: R01849, R01969, R02153, R02436, R02447, R02655, R02765, R02862, R02875,
R03196, R03211, R03350). Elite-prefix-dfs's accidental activation in the earlier confounded run
turned out to flip **zero** levels on this population — the ablation bug was real and the fix is
correct and worth keeping, but it was not, in the end, the explanation for this particular
discrepancy. It's a coincidence only in the sense that elite-prefix-dfs's own 20-level A/B
(`reports/2026-08-07-repair-elite-prefix-dfs.md`) already showed it rarely flips outcomes (1/20)
— unsurprising in hindsight that it added no visible churn across two runs of the same corpus.

This means turn bias's net -7/1700 against current defaults is now **confirmed via two
independent, byte-identical measurements** — genuinely reproducible, not a measurement artifact.
The nogood-cache-interaction hypothesis stays falsified (ruled out separately, see the original
investigation). What remains unexplained is the *original* "+3" reading from `8ce42ba8` (predating
both the nogood cache and elite-prefix-dfs) — with every candidate confound now ruled out, the
most likely explanation is that the single old measurement was itself the anomaly, though this
was never independently re-confirmed and isn't worth further chasing given how solid -7 now is.

## Disposition

`STRATEGY_REPAIR_TURN_BIAS` **stays opt-in — net -7/1700 confirmed**, not undetermined. The
ablation-confound bug fixed above is real, valuable, and permanent (it would have silently
corrupted any future multi-opt-in-flag experiment), but turn bias's own disposition turned out
unaffected by it. `reports/2026-08-07-turnbias-corpus2-validation.md`'s retraction notice and the
escape-plan doc's addendum are updated to reflect this final, confirmed state.
