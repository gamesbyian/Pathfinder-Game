# Portfolio scheduler decision note

Date: 2026-07-12

## Current status

The opt-in portfolio scheduler experiment is implemented and reportable. Legacy remains the default scheduler, and portfolio mode is used only when requested via `schedulerMode: "portfolio-experiment"`.

> **Closure note (2026-08-07):** this decision is final for the measured experiment. The broader
> stress validation proposed below was not completed and is now cancelled rather than left as an
> active gate: every globally applicable measured variant was slower on the published corpus, the
> feature-gated form never became a production candidate, and later legacy-ladder changes make these
> historical timing comparisons stale. Reopen only with a new scheduler design and fresh baselines;
> do not resume the old 4/17 checkpoint just to fill coverage.

## Published corpus findings

| Variant | Portfolio before fallback | Portfolio + fallback | Fallback-only | Portfolio / legacy runtime | Read |
| --- | ---: | ---: | ---: | ---: | --- |
| 1000 / 2000 / 5000 | 156 / 156 | 156 / 156 | 0 | 1.97x | Retains solves, too slow. |
| 250 / 1000 / 3000 | 154 / 156 | 156 / 156 | 2 | 1.31x | Faster, but loses pre-fallback retention. |
| 500 / 2000 / 5000 | 156 / 156 | 156 / 156 | 0 | 1.51x | Best published-only non-specialist sweep so far. |
| promoted diverse beams, 500 / 2000 / 5000 | 156 / 156 | 156 / 156 | 0 | 1.58x | Helps stress smoke, small published runtime cost. |
| repair-specialist, 500 / 2000 / 10000 | 155 / 156 | 156 / 156 | 1 | 1.63x | Useful stress probe, not a global default. |
| feature-gated repair specialists, 500 / 2000 / 5000 + conditional repair | 156 / 156 | 156 / 156 | 0 | 1.54x | Current best feature-aware candidate; conditional repair tiers do not fire on published corpus. |

Published-corpus conclusion: the portfolio can retain solves, but every measured global/static variant is slower than legacy on published levels. The best published-only candidate is still `500 / 2000 / 5000`, but it is not production-ready.

## Stress evidence

| Variant | Stress subset | Portfolio before fallback | Portfolio + fallback | Fallback-only | Portfolio / legacy runtime | Read |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 500 / 2000 / 5000 | corpus1 levels 1-4 | 1 / 4 | 4 / 4 | 3 | 1.45x | Published candidate does not generalize. |
| promoted diverse beams, 500 / 2000 / 5000 | corpus1 levels 1-4 | 3 / 4 | 4 / 4 | 1 | 0.69x | First faster stress-smoke variant. |
| repair-specialist, 500 / 2000 / 10000 | corpus1 levels 1-4 | 4 / 4 | 4 / 4 | 0 | 0.61x | Strongest stress smoke, but too broad for published global default. |
| feature-gated repair specialists, 500 / 2000 / 5000 + conditional repair | corpus1 levels 1-4 | 4 / 4 | 4 / 4 | 0 | 0.60x | Current best feature-aware smoke result. |
| feature-gated repair specialists, 500 / 2000 / 5000 + conditional repair | corpus1 levels 1-8 | 8 / 8 | 8 / 8 | 0 | 0.62x | Broader smoke keeps pre-fallback retention and catches the ordinary-repair cluster without published conditional fires. |
| feature-gated repair specialists, 500 / 2000 / 5000 + conditional repair | corpus1 levels 1-12 | 12 / 12 | 12 / 12 | 0 | 0.63x | Larger smoke keeps pre-fallback retention; adds a high-reqInt ordinary-repair conditional win. |
| feature-gated repair specialists, 500 / 2000 / 5000 + conditional repair | corpus1 levels 1-20 | 20 / 20 | 20 / 20 | 0 | 0.57x | First larger stress smoke with full pre-fallback retention and material runtime win. |

Stress conclusion: the stress levels need specialist behavior promoted earlier, but broad global promotion is too expensive or harms published pre-fallback retention. The next production-shaped experiment should be feature-gated rather than a single global tier set.

## Recommendation

Choose **Option B: adjust tier config**. The next implementation step has been taken by adding a feature-aware conditional specialist pass:

1. Keep `500 / 2000 / 5000` as the current best published-safe timing envelope.
2. Keep diverse beams in Pass 3 for must-cross/high-intersection stress-like levels.
3. Add a feature-gated repair-specialist tier only for levels that match the repair/must-turn feature cluster, not as a global default. This is now encoded as feature-gated Pass 4 repair specialists: ordinary repair for the high-flipper and high-reqInt ordinary-repair clusters, and must-turn-biased repair for the high-intersection/must-cross/must-pass/must-turn cluster.
4. Validate the feature-gated candidate on a broader stress subset before considering any production scheduler change.

## Historical validation target (cancelled with the experiment)

Run a live comparison on an even larger stress subset (for example corpus1 levels 1-50 or a curated dev benchmark slice beyond the first 20 levels) with feature-gated specialist promotion. Acceptance for the next step should require:

- portfolio + fallback retains all legacy solves on the subset,
- fallback-only wins are rare and explained; the current 1-8 smoke has no fallback-only wins,
- runtime is not worse than legacy on stress levels,
- published-corpus pre-fallback retention remains 156 / 156.
