# portfolio-18-specialists rare-capability retention audit against the frozen technique-niches census

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — join of `reports/stress/technique-niches/2026-09-01/level-capability.json` (already-collected, no new dispatch) against `data/stress/static-portfolio-confirmation-003-arms.json`'s `full-menu`/`portfolio-18-specialists` composition
> **Decision:** on the 1,962-level frozen technique-niches census, `portfolio-18-specialists` retains 144/151 (95.4%) of all census-measured singleton (sole-rescuer) exclusive capability across the full 34-technique menu. The 16 dropped techniques carry only 7 exclusive wins between them, spread across 7 different techniques (never more than 1 each) — no single dropped technique is a concentrated rare-capability loss. This is a large-scale, quantified answer to Workstream 2's item (c) guardrail ("audit singleton/doubleton and specialist-only cohorts so a cheaper portfolio does not silently erase distinct capability") for this specific candidate, using evidence that already existed and required no new dispatch.
> **Remaining gate:** this audits the frozen census population (broad, cross-corpus, node-budget, oracle-style), not the same populations `static-portfolio-confirmation-001/002/003` drew from (corpus2-only, work-budget, per-technique-capped). It does not by itself confirm retention under the production-envelope confirmation item (b) still needs. See "What this does not establish."
> **Evidence role:** development — a join/analysis of two already-published evidence artifacts (both themselves `observational-development`/research-harness evidence), not a new experiment.

## Why this join

`docs/solver-scheduling-policy.md`'s workstream-wide rules require scheduler/repricing candidates to "report rare-capability retention, not only aggregate solves/work... audit singleton/doubleton and specialist-only cohorts so a cheaper portfolio does not silently erase distinct capability." Until now, `portfolio-18-specialists`'s only rare-capability evidence was anecdotal: two single-level losses, one per confirmation population (`R03132` to a rank-21 `dfs|score=portalCommitted|bias=none`, `R03261` to a rank-31 `beam|score=knotBuilder|bias=none|width=2000|retention=plain`), each attributed by a local exact-commit reproduction after the fact. That is real evidence but not the population-scale "audit singleton/doubleton... cohorts" the guardrail asks for.

Separately, `reports/2026-09-01-technique-niches-and-unsupported-level-anatomy.md` already built exactly this: a per-action capability matrix over a 1,962-level frozen census (`reports/stress/technique-niches/2026-09-01/level-capability.json`), reporting each of 41 action identities' `exclusiveLevels` (sole isolated-oracle rescuer) and `thinBoundaryLevels` (one of exactly two winners) counts. This report joins that already-published matrix against `portfolio-18-specialists`'s own composition — no new dispatch, no new solver evidence, purely a cross-reference of two things this session already had.

## Method

1. Loaded `level-capability.json`'s 41 `actions` rows (legacy compact identity keys, e.g. `beam:intersectionHarvest@beam5000(diverse)`).
2. Canonicalized every key with `modules/solver/attempt-identity.mjs`'s `normalizeAttemptIdentityKey` (the same production join function this repo's own `test:solver-research-resumption` gate already exercises for exactly this legacy→canonical mapping). 35 of 41 keys map to a current canonical identity; the other 6 are ablation-flag variants (`+connectivity-axis-exhausted-off`, `+dedup-near-tie-retention-off`, `+mc-neighbor-budget-off`) outside the 34-technique menu and correctly excluded.
3. Confirmed all 34 `full-menu` canonical keys (`data/stress/static-portfolio-confirmation-003-arms.json`) match a niches row — 34/34, no gaps.
4. Split `full-menu` into the 18 `portfolio-18-specialists` keeps and 16 drops, and summed each group's `exclusiveLevels`/`thinBoundaryLevels`/`solvedLevels`.

Full reproduction is a ~50-line script joining the two already-committed JSON files; not committed here since it has no other use, but every number below is directly re-derivable from the two cited artifacts.

## Result

| | techniques | Σ exclusiveLevels | Σ thinBoundaryLevels | Σ solvedLevels |
|---|---:|---:|---:|---:|
| `portfolio-18-specialists` (kept) | 18 | **144** | 297 | 9,177 |
| dropped (in `full-menu`, not in `portfolio-18-specialists`) | 16 | **7** | 20 | 6,251 |
| all `full-menu` | 34 | 151 | — | — |

`portfolio-18-specialists` retains **144/151 = 95.4%** of every singleton exclusive win the full 34-technique menu has across this 1,962-level census. (`Σ thinBoundaryLevels`/`Σ solvedLevels` are reported for context only — a doubleton level is counted once per each of its two winning techniques, so these sums are technique-participations, not distinct-level counts, and should not be read as a second retention percentage the way the exclusiveLevels sum can be.)

**Dropped techniques, by exclusiveLevels (all 16, none above 1):**

| exclusive | thinBoundary | solved | technique |
|---:|---:|---:|---|
| 1 | 4 | 400 | `dfs\|score=perimeterSweep\|bias=perimeterCW` |
| 1 | 2 | 384 | `dfs\|score=perimeterSweep\|bias=cornerHarvest` |
| 1 | 1 | 379 | `dfs\|score=knotBuilder\|bias=none` |
| 1 | 1 | 398 | `dfs\|score=default\|bias=none` |
| 1 | 4 | 439 | `admissible-order\|tieBreak=intersectionHarvest\|lds=off` |
| 1 | 1 | 507 | `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` |
| 1 | 2 | 343 | `dfs\|score=finishFirst\|bias=none` |
| 0 | 1-2 | — | the remaining 9 dropped techniques (0 exclusive each) |

No dropped technique is a concentrated rare-capability loss — the worst case is 7 different techniques each solely responsible for exactly one census level, not one technique quietly holding a large exclusive block. For comparison, the largest *kept* specialists dwarf this: `repair|score=repair|guidance=standard` alone carries 59 exclusive wins, `admissible-order|tieBreak=none|lds=off` 15, `repair|score=repair|guidance=must-turn-biased` 14 — confirming the curation in `static-portfolio-confirmation-002`'s own design (adding back exactly the specialists that rescued `portfolio-11`'s losses) captured the technique universe's real concentration of rare capability, not just its aggregate win-count ranking.

One cross-check against the anecdotal evidence: `beam|score=knotBuilder|bias=none|width=2000|retention=plain` (rank 31, the technique that rescued `R03261` in `confirmation-003`) shows `exclusiveLevels: 1` in this census — consistent with, not contradicted by, the single-level finding, even though it's a different population. `dfs|score=portalCommitted|bias=none` (the `R03132` rescuer in `confirmation-002`) shows `exclusiveLevels: 0` here — not a contradiction either: `R03132`/`R03261` are corpus2 confirmation-population levels, not necessarily members of this 1,962-level frozen census, so the two evidence sources are complementary (broad census vs. specific fresh samples), not measuring the same thing twice. See "What this does not establish."

Also notable, though not this report's main finding: `admissible-order|tieBreak=mustCrossFirst|lds=off` — the profile `2026-09-03-admissible-order-profile-cost-probe-001-preflight.md` measured real solve cost for — shows `exclusiveLevels: 0` / `thinBoundaryLevels: 5` in this census (it is *kept* in `portfolio-18-specialists`, so this doesn't affect the retention numbers above; it's simply this profile's own rare-capability footprint on this particular population).

## What this does not establish

- **Different population than the work-budget confirmations.** This census spans corpus1 + corpus2 + published (1,962 levels) at a uniform 50M-node isolated-oracle cap (`reports/2026-09-01-technique-niches-and-unsupported-level-anatomy.md`'s own framing: "development/oracle bounds, not cold routing results"), not the corpus2-only 150-level draws with a shared work-capped, per-technique-capped budget that `static-portfolio-confirmation-001/002/003` used. Node vs. work currency affects aggregate cost comparisons more than binary singleton/non-singleton status, but this is still a materially different evidence base, not a replication.
- **Does not confirm production-envelope retention.** This is retention against an isolated-oracle census, not against item (b)'s still-open real production-envelope confirmation. A technique that is a census singleton is not automatically reachable/competitive at whatever real per-technique cap (b) eventually specifies.
- **Does not extend to `full-menu`'s own zero-exclusive techniques' *combined* value.** Nine of the 16 dropped techniques show 0 exclusive AND minimal thinBoundary participation — this report does not separately argue they are worthless (their `solvedLevels` counts, in the hundreds each, show real broad-population contribution); it only establishes they are not carrying rare/singleton capability specifically.
- **Is one candidate, one census.** This does not generalize to future portfolio candidates or a materially larger/different corpus without its own fresh join.

## Disposition

This substantially answers Workstream 2's item (c) for the one candidate this research line has actually validated (`portfolio-18-specialists`): rare-capability retention is high (95.4% of measured singleton exclusive wins) and the loss is diffuse, not concentrated. Updates `docs/solver-optimization-workstreams.md`'s (c) note to record this and to scope what (c) still needs (a same-population/same-budget-currency retention check, ideally alongside whatever (b) confirmation eventually runs, rather than a second census join).
