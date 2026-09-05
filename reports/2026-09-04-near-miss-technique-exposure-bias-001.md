# `early-repair-search` is the recorded near-miss on 70.5% of unsolved levels, but this is plausibly exposure, not technique quality

> **Status:** concluded-negative
> **Last evidence:** 2026-09-04 — `bestBadnessTechnique` across all 729 unsolved levels (corpus1 + corpus2 combined) in `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus{1,2}.json`, cross-checked against each technique's `reached`/`attempts` counts in the same files' `techniques` block, no new dispatch
> **Decision:** `early-repair-search` is the `bestBadnessTechnique` (closest recorded near-miss) on 514/729 (70.5%) of unsolved levels, far ahead of `late-repair-multiseed-retry` (156/729, 21.4%) and everything else combined (8.1%). But `early-repair-search` is also the ladder's first, cheapest, near-universally-reached stage (corpus2: `reached: 538` out of every level where it was instantiated, `attempts: 1445` — it gets far more shots than any single late-ladder retry tier). The near-miss ranking is confounded with opportunity to try at all, so it should **not** be read as "early-repair-search is disproportionately good at getting close" without controlling for exposure.
> **Remaining gate:** none for this framing. A genuine quality comparison would need to condition on levels where multiple techniques were actually `reached` and compare `bestBadness` head-to-head only among those — not attempted here.
> **Evidence role:** discovery, explicitly self-limiting — reported as a caution against over-reading a raw distribution rather than a promoted mechanism
> **Selection:** whole comparable population (729 unsolved, both corpora), not a sample

## Method

Tabulated `bestBadnessTechnique` across every unsolved level in both corpus files. Cross-checked against each technique's `reached` count (how many levels the ladder actually got to that stage on) from the same files' `techniques` summary block, to check whether the ranking could simply reflect which technique got the most chances.

## Result

| technique | near-miss count | share | corpus2 `reached` (of 1700) |
|---|---:|---:|---:|
| `early-repair-search` | 514 | 70.5% | 538 (instantiated only where reachable; effectively near-universal early stage) |
| `late-repair-multiseed-retry` | 156 | 21.4% | (late-ladder stage, reached on a fraction of levels) |
| `late-repair-search` | 30 | 4.1% | — |
| `repair-fallback` | 24 | 3.3% | — |
| `guidance-goal-distance-retry` | 4 | 0.5% | — |
| `goal-attraction-disabled-retry` | 1 | 0.1% | — |

For comparison, on **solved** levels the actual *winning* technique is much more evenly spread across the ladder (`main-ladder` 672, `early-repair-search` only 192, plus meaningful counts for `admissible-order-fallback`, `coarse-state-near-tie-retention-disabled-retry`, `late-repair-multiseed-retry`, `admissible-order-alternate-tiebreak-retry`, etc.) — `early-repair-search` is not similarly dominant there.

## Interpretation

The lopsided near-miss distribution is real but is the expected shape for an *exposure*-driven ranking, not a *quality* one: `early-repair-search` runs on essentially every level that reaches it (it is near the front of the ladder), so it has by far the most opportunities to be recorded as the best-so-far attempt, especially on `starved` levels where later stages never get a real shot (consistent with `2026-09-04-starved-vs-capped-structural-signature-001.md`'s finding that 84.3% of `starved` levels' near-miss is `early-repair-search`). This report is written specifically to prevent that distribution from being mistaken for evidence that `early-repair-search` deserves more investment or is an under-recognized specialist — the raw numbers alone cannot separate "gets closest because it's good" from "gets closest because it's the only one that got a real look." Any future work wanting to use near-miss technique identity as a Workstream 1 action-selection signal should condition on `reached`/opportunity first, not use the raw distribution directly.

## What this does not establish

- Does not compute the exposure-controlled comparison itself (bestBadness head-to-head only among levels where multiple techniques were both `reached`) — flagged as the correct next step if this line is pursued, not done here.
- Does not claim `early-repair-search` is *not* useful — only that this particular metric cannot support a claim either way.
- Single run, both corpora combined for statistical power; not re-split by corpus here (see the starved/capped and corpus1-starvation reports for corpus-specific detail).
