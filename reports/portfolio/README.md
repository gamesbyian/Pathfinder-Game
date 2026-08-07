# Portfolio scheduler reports

This directory contains generated outputs for `docs/fast-portfolio-scheduler-plan.md`.

See also `2026-07-16-portfolio-scheduler-reverification.md` (relocated here from the top-level
`reports/` directory it was originally filed under) — the re-verification against the
post-elite-splice-fix solver, cited from `docs/solver-architecture.md`'s "Fast portfolio scheduler
experiment" section.

## Solvability probing on unsolved stress levels (cancelled incomplete)

> **Disposition (2026-08-07): cancelled, do not resume unless the portfolio scheduler experiment is
> explicitly reopened.** The 4/17 partial corpus-1 sweep and never-started corpus-2 slice cannot
> change the recorded production decision: portfolio mode remains opt-in/not production-ready, and
> subsequent legacy-ladder changes invalidate direct timing comparison with this experiment's old
> results. The incomplete coverage is preserved below as history, not presented as current work.

Everything below this point is the legacy-vs-portfolio *comparison* tool (`solver:portfolio-report`),
which always solves against a level the legacy ladder already solves — useful for retention/runtime
comparisons, not for asking "does the portfolio scheduler solve something legacy can't." That question
needs `scripts/portfolio-solve-sweep.mjs` instead (see `docs/solver-architecture.md`'s "Fast portfolio
scheduler experiment" section for full usage): it runs portfolio-experiment mode only (no paired legacy
call) against a level range and can persist any solve as a real hint via `--save-hints`.

An initial sweep of corpus 1's 17 known-unsolved levels (`R00408, R00522, R00581, R00600, R00716,
R00855, R01189, R01195, R01271, R01336, R01407, R01620, R01675, R01756, R01844, R01875, R01943` —
positions 37,39,44,45,49,57,65,66,71,73,75,82,87,93,95,96,98 in `data/stress/stress-levels.json`) was
started at `--budget-ms=15000` but stopped after 4/17 levels (all unsolved so far) — deprioritized in
favor of speed on other work, not abandoned due to a problem with the tool. A prior attempt at this same
probe using the paired-comparison tool (`solver:portfolio-report`) at `--budget-ms=30000` was killed
after ~21 minutes on a single level; see the cost-gotcha note in `docs/solver-architecture.md` for why
(the legacy ladder's repair-fallback budget multiplier, paid twice by the paired-comparison design).
Corpus 2's curated 112-level unsolved subset (`reports/stress/dev-benchmark-corpus2.json`'s `levelIds`,
mapped to positions in `data/stress/stress-levels-random.json`) has not been attempted yet.

`portfolio-solve-sweep.mjs` has since grown batch-scale tooling (`docs/solver-architecture.md`'s "Fast
portfolio scheduler experiment" section, "Batch-scale tooling" — `--resume`, `--feature-filter`,
`--priority`/`--baseline`, `--workers`, `--attempt-cache`) built specifically for recurring solver-
feature iteration against these unsolved corpora, plus a companion direct-technique harness
(`scripts/repair-direct-probe.mjs`, with a `--races` parallel-seed mode). If a future decision
explicitly reopens the scheduler experiment, the historical corpus-1 command can resume the old
checkpoint with `--resume` and `--workers`; do not run it merely to complete a stale table:

```
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- --corpus=data/stress/stress-levels.json --levels=37,39,44,45,49,57,65,66,71,73,75,82,87,93,95,96,98 --budget-ms=15000 --workers=4 --resume --checkpoint=reports/portfolio/corpus1-unsolved-17-15000.checkpoint.jsonl --save-hints --out=reports/portfolio/corpus1-unsolved-17-15000.json --summary-out=reports/portfolio/corpus1-unsolved-17-15000-summary.md
```

## Published corpus comparison

### Default static tiers: 1000 / 2000 / 5000 ms

- `published-portfolio-comparison.json` / `published-portfolio-comparison-summary.md`
- Command: `npm run solver:portfolio-report -- --levels=all --budget-ms=30000 --out=reports/portfolio/published-portfolio-comparison.json --summary-out=reports/portfolio/published-portfolio-comparison-summary.md`
- Result: legacy solved 156/156; portfolio before fallback solved 156/156; portfolio + fallback solved 156/156; fallback-only solved 0; unsolved 0.
- Pass distribution: pass 1 solved 155, pass 2 solved 0, pass 3 solved 1.
- Runtime: portfolio total 84.0s vs legacy total 42.6s (1.97x). This retained published-corpus solvability, but was slower because level 147 paid repeated/restarted portfolio work before the pass-3 win.

### Sweep: 250 / 1000 / 3000 ms

- `published-portfolio-250-1000-3000.json` / `published-portfolio-250-1000-3000-summary.md`
- Command: `npm run solver:portfolio-report -- --levels=all --budget-ms=30000 --pass1-ms=250 --pass2-ms=1000 --pass3-ms=3000 --out=reports/portfolio/published-portfolio-250-1000-3000.json --summary-out=reports/portfolio/published-portfolio-250-1000-3000-summary.md`
- Result: legacy solved 156/156; portfolio before fallback solved 154/156; portfolio + fallback solved 156/156; fallback-only solved 2; unsolved 0.
- Runtime: portfolio total 55.6s vs legacy total 42.5s (1.31x). Faster than the default static tiers, but no longer recovers all published solves before fallback.

### Sweep: 500 / 2000 / 5000 ms

- `published-portfolio-500-2000-5000.json` / `published-portfolio-500-2000-5000-summary.md`
- Command: `npm run solver:portfolio-report -- --levels=all --budget-ms=30000 --pass1-ms=500 --pass2-ms=2000 --pass3-ms=5000 --out=reports/portfolio/published-portfolio-500-2000-5000.json --summary-out=reports/portfolio/published-portfolio-500-2000-5000-summary.md`
- Result: legacy solved 156/156; portfolio before fallback solved 156/156; portfolio + fallback solved 156/156; fallback-only solved 0; unsolved 0.
- Runtime: portfolio total 63.9s vs legacy total 42.4s (1.51x). This is a better default candidate than 1000 / 2000 / 5000 on published levels, but still slower than legacy overall.

## Historical replay smoke

- `stress-corpus1-historical-replay.json`
- Command: `npm run solver:portfolio-replay -- --inputs=logs/stress-corpus1-baseline.json --out=reports/portfolio/stress-corpus1-historical-replay.json`
- Result: 63/85 recorded stress-corpus-1 winning attempts would be recovered by the current static tier policy under a historical elapsed-time replay.
- This is only an upper-bound replay of recorded winning-attempt elapsed times; it does not model live scheduler-context effects.

## Current read

The 500 / 2000 / 5000 sweep is the best published-corpus candidate measured so far: it keeps full pre-fallback solve retention while reducing portfolio runtime from 84.0s to 63.9s. However, every measured portfolio variant remains slower than the legacy published baseline, and stress-corpus historical replay suggests the tiers will need feature/config tuning before this can become a production scheduler.

## Live stress-corpus smoke

- `stress-corpus1-live-1-4-500-2000-5000.json` / `stress-corpus1-live-1-4-500-2000-5000-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-4 --budget-ms=30000 --pass1-ms=500 --pass2-ms=2000 --pass3-ms=5000 --out=reports/portfolio/stress-corpus1-live-1-4-500-2000-5000.json --summary-out=reports/portfolio/stress-corpus1-live-1-4-500-2000-5000-summary.md`
- Result: legacy solved 4/4; portfolio before fallback solved 1/4; portfolio + fallback solved 4/4; fallback-only solved 3; unsolved 0.
- Runtime: portfolio total 93.6s vs legacy total 64.4s (1.45x).
- Current read: even the best published-corpus sweep does not generalize to this stress smoke; fallback is preserving solvability, but stress levels need either broader promoted tiers, feature-aware config selection, or a different scheduler strategy.

## Promoted diverse-beam Pass 3 experiment

The live stress smoke showed fallback wins from `beam:intersectionHarvest@beam5000(diverse)` and `beam:objectiveFirst@beam5000(diverse)`, so those configs were promoted into Pass 3 for the next measurement.

### Published corpus, promoted Pass 3, 500 / 2000 / 5000 ms

- `published-portfolio-500-2000-5000-promoted.json` / `published-portfolio-500-2000-5000-promoted-summary.md`
- Command: `npm run solver:portfolio-report -- --levels=all --budget-ms=30000 --pass1-ms=500 --pass2-ms=2000 --pass3-ms=5000 --out=reports/portfolio/published-portfolio-500-2000-5000-promoted.json --summary-out=reports/portfolio/published-portfolio-500-2000-5000-promoted-summary.md`
- Result: legacy solved 156/156; portfolio before fallback solved 156/156; portfolio + fallback solved 156/156; fallback-only solved 0; unsolved 0.
- Runtime: portfolio total 66.4s vs legacy total 42.1s (1.58x). This is a small published-corpus runtime regression compared with the non-promoted 500 / 2000 / 5000 sweep.

### Stress-corpus smoke, promoted Pass 3, 500 / 2000 / 5000 ms

- `stress-corpus1-live-1-4-500-2000-5000-promoted.json` / `stress-corpus1-live-1-4-500-2000-5000-promoted-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-4 --budget-ms=30000 --pass1-ms=500 --pass2-ms=2000 --pass3-ms=5000 --out=reports/portfolio/stress-corpus1-live-1-4-500-2000-5000-promoted.json --summary-out=reports/portfolio/stress-corpus1-live-1-4-500-2000-5000-promoted-summary.md`
- Result: legacy solved 4/4; portfolio before fallback solved 3/4; portfolio + fallback solved 4/4; fallback-only solved 1; unsolved 0.
- Runtime: portfolio total 43.4s vs legacy total 62.9s (0.69x). This is the first measured portfolio variant that is faster than legacy on a stress subset, but it still needs broader stress validation and only covers four stress levels.

## Repair-specialist 10s Pass 3 stress probe

A targeted stress probe added the must-turn-biased repair attempt to Pass 3 and raised Pass 3 to 10s for the same four stress levels.

- `stress-corpus1-live-1-4-500-2000-10000-repair-promoted.json` / `stress-corpus1-live-1-4-500-2000-10000-repair-promoted-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-4 --budget-ms=30000 --pass1-ms=500 --pass2-ms=2000 --pass3-ms=10000 --pass3-configs='beam:intersectionHarvest@beam5000(diverse),beam:objectiveFirst@beam5000(diverse),beam:objectiveFirst@beam5000,beam:perimeterSweep/perimeterCW@beam2000,dfs:repair:repair(mustTurnBiased)' --out=reports/portfolio/stress-corpus1-live-1-4-500-2000-10000-repair-promoted.json --summary-out=reports/portfolio/stress-corpus1-live-1-4-500-2000-10000-repair-promoted-summary.md`
- Result: legacy solved 4/4; portfolio before fallback solved 4/4; portfolio + fallback solved 4/4; fallback-only solved 0; unsolved 0.
- Runtime: portfolio total 38.9s vs legacy total 63.9s (0.61x).
- Current read: this is the strongest stress-smoke result so far, but it is a targeted specialist probe, not a proven general default. The next step should validate this candidate on a broader stress subset and check the published-corpus cost before promoting it into the default experiment definition.

## Repair-specialist published-cost check

The repair-specialist 10s Pass 3 candidate was also checked on the full published corpus before considering it as a default.

- `published-portfolio-500-2000-10000-repair-promoted.json` / `published-portfolio-500-2000-10000-repair-promoted-summary.md`
- Command: `npm run solver:portfolio-report -- --levels=all --budget-ms=30000 --pass1-ms=500 --pass2-ms=2000 --pass3-ms=10000 --pass3-configs='beam:intersectionHarvest@beam5000(diverse),beam:objectiveFirst@beam5000(diverse),beam:objectiveFirst@beam5000,beam:perimeterSweep/perimeterCW@beam2000,dfs:repair:repair(mustTurnBiased)' --out=reports/portfolio/published-portfolio-500-2000-10000-repair-promoted.json --summary-out=reports/portfolio/published-portfolio-500-2000-10000-repair-promoted-summary.md`
- Result: legacy solved 156/156; portfolio before fallback solved 155/156; portfolio + fallback solved 156/156; fallback-only solved 1; unsolved 0.
- Runtime: portfolio total 70.7s vs legacy total 43.3s (1.63x).
- Current read: the repair-specialist 10s Pass 3 probe is promising for the tiny stress smoke but regresses published pre-fallback retention and runtime. Do not promote it as a global default without feature gating.

## Feature-gated repair-specialist conditional pass

The global repair-specialist Pass 3 check was too broad, so the current experiment definition uses the best published-safe 500 / 2000 / 5000 three-pass timing envelope and adds three feature-gated conditional repair Pass 4 entries: a 60s ordinary repair pass for the high-flipper ordinary-repair cluster (`reqInt >= 7`, `mustPass >= 4`, `mustCross >= 4`, `flippingFilters >= 3`), a 2s ordinary repair pass for the high-reqInt cluster (`reqInt >= 9`), and a 10s must-turn-biased repair pass for the repair/must-turn cluster (`reqInt >= 7`, `mustPass >= 3`, `mustCross >= 2`, `mustTurn >= 1`).

### Published corpus, feature-gated specialist

- `published-portfolio-feature-gated-specialist.json` / `published-portfolio-feature-gated-specialist-summary.md`
- Command: `npm run solver:portfolio-report -- --levels=all --budget-ms=30000 --out=reports/portfolio/published-portfolio-feature-gated-specialist.json --summary-out=reports/portfolio/published-portfolio-feature-gated-specialist-summary.md`
- Result: legacy solved 156/156; portfolio before fallback solved 156/156; portfolio + fallback solved 156/156; fallback-only solved 0; unsolved 0.
- Pass distribution: pass 1 solved 155, pass 3 solved 1, conditional solved 0.
- Runtime: portfolio total 64.0s vs legacy total 41.7s (1.54x). The conditional passes do not fire on the published corpus, so published retention is preserved while using the cheaper 500 / 2000 / 5000 timing envelope.

### Stress-corpus smoke, feature-gated specialist

- `stress-corpus1-live-1-4-feature-gated-specialist.json` / `stress-corpus1-live-1-4-feature-gated-specialist-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-4 --budget-ms=30000 --out=reports/portfolio/stress-corpus1-live-1-4-feature-gated-specialist.json --summary-out=reports/portfolio/stress-corpus1-live-1-4-feature-gated-specialist-summary.md`
- Result: legacy solved 4/4; portfolio before fallback solved 4/4; portfolio + fallback solved 4/4; fallback-only solved 0; unsolved 0.
- Pass distribution: pass 2 solved 1, pass 3 solved 2, conditional solved 1.
- Runtime: portfolio total 39.4s vs legacy total 65.4s (0.60x). This confirms the feature-gated specialist keeps the stress-smoke retention benefit without making repair a global unconditional tier.

### Stress-corpus expanded smoke, feature-gated specialist

- `stress-corpus1-live-1-8-feature-gated-specialist.json` / `stress-corpus1-live-1-8-feature-gated-specialist-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-8 --budget-ms=30000 --out=reports/portfolio/stress-corpus1-live-1-8-feature-gated-specialist.json --summary-out=reports/portfolio/stress-corpus1-live-1-8-feature-gated-specialist-summary.md`
- Result: legacy solved 8/8; portfolio before fallback solved 8/8; portfolio + fallback solved 8/8; fallback-only solved 0; unsolved 0.
- Pass distribution: pass 1 solved 3, pass 2 solved 1, pass 3 solved 2, conditional solved 2, fallback solved 0.
- Runtime: portfolio total 78.9s vs legacy total 128.2s (0.62x). The expanded smoke now catches the previous stress level 5 ordinary-repair fallback before legacy fallback, while the published corpus report confirms the ordinary-repair condition did not fire on published levels.


### Stress-corpus expanded smoke, levels 1-12

- `stress-corpus1-live-1-12-feature-gated-specialist.json` / `stress-corpus1-live-1-12-feature-gated-specialist-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-12 --budget-ms=30000 --out=reports/portfolio/stress-corpus1-live-1-12-feature-gated-specialist.json --summary-out=reports/portfolio/stress-corpus1-live-1-12-feature-gated-specialist-summary.md`
- Result: legacy solved 12/12; portfolio before fallback solved 12/12; portfolio + fallback solved 12/12; fallback-only solved 0; unsolved 0.
- Pass distribution: pass 1 solved 6, pass 2 solved 1, pass 3 solved 2, conditional solved 3, fallback solved 0.
- Runtime: portfolio total 86.4s vs legacy total 137.7s (0.63x). This adds a high-reqInt ordinary-repair conditional win on stress level 12 while still retaining all published solves before fallback.

### Stress-corpus expanded smoke, levels 1-20

- `stress-corpus1-live-1-20-feature-gated-specialist.json` / `stress-corpus1-live-1-20-feature-gated-specialist-summary.md`
- Command: `npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-20 --budget-ms=30000 --out=reports/portfolio/stress-corpus1-live-1-20-feature-gated-specialist.json --summary-out=reports/portfolio/stress-corpus1-live-1-20-feature-gated-specialist-summary.md`
- Result: legacy solved 20/20; portfolio before fallback solved 20/20; portfolio + fallback solved 20/20; fallback-only solved 0; unsolved 0.
- Pass distribution: pass 1 solved 13, pass 2 solved 1, pass 3 solved 2, conditional solved 4, fallback solved 0.
- Runtime: portfolio total 99.2s vs legacy total 174.6s (0.57x). This is the first larger stress smoke where the feature-gated candidate keeps full pre-fallback retention and materially beats legacy runtime.
