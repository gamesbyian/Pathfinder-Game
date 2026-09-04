# late-repair-multiseed-retry tail audit: does the 7th seed earn its keep?

> **Status:** active
> **Last evidence:** 2026-09-04 — local re-analysis of `reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json` (the same 40-level production A/B lifecycle data `2026-09-04-production-ladder-marginal-value-tail-audit-001.md` used), no new dispatch
> **Decision:** on the 9/40 levels this population reaches this stage, **seed 1 alone never reaches any level's eventual best-badness result, and seed 7 (the last of seven) reaches zero additional levels' eventual best beyond what seeds 1-6 already found** — every one of the 9 reached levels has its best observed `bestBadness` first achieved by seed 6 at the latest. This is a proxy-based (badness, not solve) signal on a small population, but it is directionally clean and nominates dropping the 7th seed (`REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS`'s last entry) as a repricing candidate worth a population-scale confirmation, not an immediate change.
> **Remaining gate:** a population-scale fixed-work A/B (6 seeds vs. the current 7) on an independently drawn population, following the same promotion-path discipline as `admissible-order-alternate-tiebreak-retry`'s repricing line — not run here.
> **Evidence role:** discovery — a single already-collected 40-level population, re-analyzed for a pattern not previously reported; selection is observational, not prespecified
> **Selection:** the 40-level population is the existing disjoint draw from `2026-09-04-static-portfolio-entrypoint-production-ab-001.md` (prespecified there, reused here per this research line's "existing evidence first" rule, not selected for this report's outcome); the seed-7 finding itself is exploratory — the population was not chosen or filtered to produce it

## Why this stage, why now

`docs/solver-opt-in-experiment-ledger.md`'s `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` row states: "Default-ON after five additive rescues without measured losses; can buy substantial failed-tail work, so seed/budget expansion requires fixed-work repricing" — an explicit, standing call for exactly this kind of tail-audit that has not yet been done. `2026-09-04-production-ladder-marginal-value-tail-audit-001.md`'s own marginal-value table already measured this stage (`late-repair-multiseed-retry`) at 6.4% of total production `workSpent` on the same 40-level population for 0 conditional solves — the third-largest cost center in that table after the two `admissible-order` stages, and not yet investigated the way those two were. This report does that investigation using only already-committed local data, while the `admissible-order-alternate-tiebreak-retry` repricing confirmation runs on GHA in parallel.

## Mechanism

`late-repair-multiseed-retry` is a dead-last additive extension of `late-repair-search`/`STRATEGY_REPAIR_LATE_PROBE`: it reruns the same `repair|score=repair|guidance=standard` config across `REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS = [1, 2, 3, 4, 5, 6, 7]` (`modules/solver/stage-budget.ts`), each seed getting its **own full** `REPAIR_LATE_PROBE_NODE_BUDGET` (5,000,000 nodes) — a flat additive reserve, not a fraction split across seeds (the code's own comment: "diluting an already-calibrated per-seed budget would confound 'does more seeds help' with 'does less budget per seed hurt'"). Unlike `admissible-order-alternate-tiebreak-retry`, this tier has no existing fraction-of-`workBudget` override; its only current lever is the seed list itself. This is a genuinely different repricing shape — **how many seeds**, not **how large a shared pool**.

## Method

1. Estimated per-attempt `workSpent` for `late-repair-multiseed-retry`'s attempts the same way the marginal-value-tail-audit did: derived a median `workSpent`/`nodesExpanded` ratio (3.6323) for the exact config `repair|score=repair|guidance=standard` from `static-portfolio-arm.json`'s 40 real per-attempt `workSpent` samples for that config, then applied it to `production-arm.json`'s `late-repair-multiseed-retry` attempts (which carry `nodesExpanded` but not per-attempt `workSpent`).
2. **Sanity check:** summed estimated work across all 63 attempts (226,246,391 total nodes × 3.6323) = 821,805,726 — within 0.1% of the marginal-value-tail-audit's independently-reported ~822.4M for this exact stage on this exact population. The estimation method reproduces the prior report's own aggregate almost exactly.
3. For each of the 9 levels this stage reaches (all 9 get exactly 7 attempts — one per seed, none skipped, none naturally exhausted, matching the tail-audit's "0 naturally exhausted / 63 censored" finding), tracked each seed's `bestBadness` (lower is better; 0 attempts in this population reached `ok: true`) and computed the running best-so-far as seeds are tried in order 1→7.

## Result

### Per-seed reach, cost, and badness

| seed | n (of 9 reached levels) | badness min / median / max | mean `nodesExpanded` | est. `workSpent` |
|---:|---:|---|---:|---:|
| 1 | 9 | 9 / 18 / 29 | 3,228,176 | ~11.7M |
| 2 | 9 | 6 / 13 / 22 | 3,785,605 | ~13.8M |
| 3 | 9 | 8 / 17 / 32 | 3,270,187 | ~11.9M |
| 4 | 9 | 8 / 19 / 27 | 3,605,666 | ~13.1M |
| 5 | 9 | 4 / 15 / 23 | 3,909,419 | ~14.2M |
| 6 | 9 | 7 / 14 / 27 | 3,644,868 | ~13.2M |
| 7 | 9 | 6 / 15 / 32 | 3,694,567 | ~13.4M |

No seed is dramatically cheaper or more expensive than another (all within ~11.7M-14.2M estimated work) — cost is not the axis that distinguishes seeds; badness-improvement is.

### Which seed first reaches each level's eventual best badness

| id | badness sequence (seed 1→7) | eventual best | first seed to reach it |
|---|---|---:|---:|
| R00046 | 14, 6, 14, 12, 6, 11, 9 | 6 | 2 |
| R01000 | 19, 12, 8, 20, 20, 8, 8 | 8 | 3 |
| R01428 | 9, 13, 10, 8, 14, 7, 8 | 7 | 6 |
| R02334 | 16, 12, 18, 26, 5, 7, 16 | 5 | 5 |
| R02486 | 26, 12, 32, 27, 18, 27, 32 | 12 | 2 |
| R02818 | 29, 21, 24, 17, 23, 19, 30 | 17 | 4 |
| R02839 | 18, 16, 9, 19, 15, 14, 15 | 9 | 3 |
| R02986 | 16, 15, 17, 15, 16, 14, 17 | 14 | 6 |
| R03093 | 20, 22, 19, 19, 4, 22, 6 | 4 | 5 |

### Cumulative coverage: how many levels have reached their eventual best by seed K

| seeds tried | levels at their eventual best |
|---:|---:|
| 1 | 0/9 |
| 1-2 | 2/9 |
| 1-3 | 4/9 |
| 1-4 | 5/9 |
| 1-5 | 7/9 |
| 1-6 | **9/9** |
| 1-7 | 9/9 |

**Seed 1 alone never uniquely produces a level's best result. Seed 7 never uniquely produces one either** — every level's eventual best is already reached by seed 6. On this population, seed 7 is the one seed whose removal would have changed nothing about the best badness this stage found on any of the 9 reached levels, while still costing ~13.4M of estimated work when it runs (≈1/7 of this stage's 6.4%-of-total-work share, or roughly 0.9% of total production `workSpent` on this population).

## Interpretation

This is a **badness-based proxy signal**, not a solve-count signal — 0/9 reached levels solved in either direction, so this cannot show gains/losses the way the `admissible-order-alternate-tiebreak-retry` pilot could. What it can show is whether the tier's internal seed diversity is still producing new information as more seeds run, and on this population, seeds 2 through 6 each independently contribute at least one level's best result, while seed 1 and seed 7 do not. That seed 1 alone is uninformative is expected (first attempt, no prior comparison point). That **seed 7 specifically adds nothing new** is the actionable finding — it is not that late seeds in general stop mattering (seed 6 is still load-bearing, contributing R01428's and R02986's bests), only that the list currently runs one seed past the point this population's evidence supports.

This is meaningfully different in shape from the `admissible-order-alternate-tiebreak-retry` finding: there, an entire dead-last tier bought 0 solves for 27.5% of total work and disabling it entirely was zero-cost on the tested population, while census evidence still argued for retention at a smaller size. Here, the tier's aggregate cost is smaller (6.4% vs. 27.5%), the internal seed diversity is largely earning its keep (5 of 7 seeds are each uniquely load-bearing on this population), and only the single most expensive/last seed shows no measured value. A full removal of this tier is not supported by this evidence and was not the question; a one-seed reduction (7 → 6) is what this population's evidence actually points to.

## What this does not establish

- **Small population.** 9 levels reached this stage at all; the seed-7-null finding rests on that same 9, not an independently drawn confirmation set.
- **Proxy, not outcome.** `bestBadness` is a search-quality diagnostic, not a solve. A level whose badness improved at seed 5 might still never have solved at any seed on this budget; this report cannot show seed 7 costs a real solve or saves one, only that it did not change the best diagnostic result reached on this specific population.
- **No census cross-check possible.** Unlike `admissible-order-alternate-tiebreak-retry`'s four named tie-break profiles, the frozen technique census does not track solver seed as a distinct action identity — `repair|score=repair|guidance=standard` is one census row regardless of which seed solved it, so there is no equivalent of the admissible-order rare-capability check available here. A seed-count reduction could in principle cost a rare, census-invisible win this population's 9 reached levels simply didn't happen to exercise; that risk cannot be bounded from this evidence alone, which is exactly why this report nominates a confirmation rather than recommending the code change directly.
- **Single population, development-tier only.** No independent draw, no held-out confirmation. Per this repo's own evidence-role convention, this is discovery evidence and should not be read as more than a candidate nomination.

## If pursued

The natural next step, following the same shape as the `admissible-order-alternate-tiebreak-retry` line: draw a fresh, independently-selected population disjoint from this one and every other population this research line has touched, dispatch a fixed-work A/B (`REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS` truncated to `[1, 2, 3, 4, 5, 6]` vs. the current `[1, 2, 3, 4, 5, 6, 7]`), and report paired gains/losses (not just badness) plus total `workSpent`. This is not queued as an immediate priority — `admissible-order-alternate-tiebreak-retry`'s own confirmation remains the current Workstream-2 gate — but it is now a concretely evidenced, bounded candidate rather than an untested assumption the ledger merely flagged.
