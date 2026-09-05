# Production's real per-level budget/wall-time scale, and why it exposed a design flaw in the admissible-order confirmation

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `elapsedMs`/`workSpent` distributions across all 40 levels of the existing production A/B (`reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json`), cross-referenced against the 5th/6th admissible-order-alternate-tiebreak-retry confirmation dispatches' actual budget settings, no new dispatch for this specific report (the local reproduction that motivated it is documented in the confirmation reports themselves)
> **Decision:** real production (the offline/batch whole-ladder path — the actual regime `admissible-order-alternate-tiebreak-retry` runs in) spends, across a 40-level sample including deliberately hard cases: `elapsedMs` median 586,820ms (9.78 min), p90 855,954ms (14.27 min), **max 908,092ms (15.13 min)**; `workSpent` median 343,145,827, p90 605,078,613, **max 842,267,705**. Not one level in this sample takes anywhere near an hour, let alone the 24-hour wall-clock allowance or the effectively-unbounded search the 5th confirmation attempt's settings (`node_budget_advisory_only=true`, non-strict `work_budget`) permitted. This directly explains why that attempt's 58/76 hard shards ran past a 70-minute timeout with zero output: the confirmation's search conditions had drifted arbitrarily far from anything production actually does, once the one real stopping mechanism (`node_budget` as a hard cap) was turned off without a replacement.
> **Remaining gate:** none — a retrospective quantification using already-collected data, motivating (but not itself constituting) the 6th attempt's `strict_total_work_budget=true` fix.
> **Evidence role:** forensic/methodological — supplies the concrete "how much does production actually spend" baseline that was missing when the confirmation workflow's budget parameters were originally chosen
> **Selection:** whole 40-level production-arm population, not a sample

## Method

Computed the full distribution of `elapsedMs` and `workSpent` across all 40 levels in the existing production A/B's `production-arm.json` (real `Solver.solve()` calls, the same offline/batch code path `admissible-order-alternate-tiebreak-retry` actually runs in), then compared these figures directly against the confirmation workflow's budget inputs across its attempts: the 5th attempt's `work_budget=67,000,000` (non-strict, `node_budget_advisory_only=true`, `budget_ms=86,400,000`) and the 6th attempt's `work_budget≈1,005,000,000` (`strict_total_work_budget=true`).

## Result

| metric | production (40-level real A/B) | 5th confirmation attempt setting | 6th confirmation attempt setting |
|---|---:|---:|---:|
| wall-clock per level | median 9.78 min, p90 14.27 min, max **15.13 min** | up to 24h allowed, no real stop → observed >70 min and still incomplete | strict cap forces a stop; one sample took 12.1 min |
| work-unit cost per level | median 343.1M, p90 605.1M, max **842.3M** | `work_budget=67M` nominal, but non-strict (unenforced) | `work_budget≈1.005B`, strict (enforced) |

## Interpretation

This quantifies, with real numbers, exactly what the user's live pushback ("2-4 hours per level is insane, is this experiment even designed correctly?") identified qualitatively: the 5th confirmation attempt's effective search conditions (no node cap, non-strict work cap, 24h wall clock) had no relationship to what production ever actually does — not "somewhat more generous," but operating in a regime 5-100x beyond production's own observed maximum on every axis. The root cause was `node_budget_advisory_only=true` disabling the one mechanism (`node_budget` as a hard, enforced stop) that the codebase's own documentation identifies as "the real ceiling" for this call shape, without substituting another real ceiling in its place — non-strict `work_budget` is documented elsewhere this session as tolerating a 1.5x-467x overrun, which is exactly consistent with search runs that exceed even a 70-minute allowance without completing.

The 6th attempt's fix (`strict_total_work_budget=true`, `work_budget≈1.005B` — comfortably above production's real 842.3M observed max, so the confirmation doesn't artificially starve genuinely hard cases relative to what production would tolerate) restores a real, enforced ceiling while keeping the cap's *scale* anchored to production reality rather than to an arbitrary, much larger number. This is the concrete numeric justification for why 1.005B (not, say, 10B or an even larger guess) was the chosen cap: it is sized to production's own observed ceiling, not to an unconstrained "give it enough time to maybe finish" guess.

## What this does not establish

- Does not establish that 842.3M (this 40-level sample's max) is production's true worst-case across the full corpus — a larger population might show a higher outlier, though the sample was deliberately curated to include hard cases per earlier session context.
- Does not test whether the 6th attempt's `target_wall_minutes=60` (100-minute shard timeout) is itself sufficient for every one of the 58 previously-stranded hard ids — that is the 6th attempt's own open question, tracked in its own confirmation report.
- Single production A/B sample (40 levels); does not test whether this budget/wall-time relationship holds at full census scale (1,700+ levels).
