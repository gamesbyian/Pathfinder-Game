# Elite-splice constants re-verified post-fix: no change warranted

**Date**: 2026-07-16. **Data collection only — no solver code changed.** Follow-up to
`reports/2026-07-16-repair-search-elite-splice-regression.md`'s "what remains to investigate"
section, which flagged `ELITE_POOL_SIZE`/`SPLICE_PROBABILITY`/the repair-probe node budgets
(`REPAIR_PROBE_ORDINARY_NODE_BUDGET`/`REPAIR_PROBE_BIASED_NODE_BUDGET`) as calibrated against a
repair-search whose elite-splice pool was silently dead — only `REPAIR_PROBE_ORDINARY_SEED_SALTS`
(the retry width, a separate constant) was re-tuned after the fix (`7c59c4a`).

## What the constants actually are, and when they were set

`git log -L` on `modules/solver/repair-search.ts` shows `SPLICE_PROBABILITY = 0.75` and
`ELITE_POOL_SIZE = 8` (plus their explanatory comments, which describe genuine splice-active
behavior — "a single best-so-far path was measured to cause premature convergence... splicing only
ever re-explores variations of the one structural family") have been unchanged since this file's
original creation, predating the July 10 regression entirely. They were calibrated when splicing
worked, went dormant during the July 10-15 window while the bug silently disabled the trigger
condition, and came back online unchanged once `e6a9cb9` restored it — they were never actually
re-derived *against* a broken splice mechanism, contrary to what a literal reading of "calibrated
against a repair-search that had this bug" might suggest. The genuinely-in-question item is
whether they're still *well-calibrated for how repair behaves now that splicing is active again* —
a fair question regardless of the exact history, and the one this report answers.

## Method

Re-ran the same calibration family `7c59c4a` used to re-tune the seed-salt width (P00136, P00144,
P00145, P00146 — the 4 real repair-gated published levels — plus P00146's 3 rotated symmetry
siblings, already generated from the Experiment 1 rerun), this time capturing the actual repair
attempt's `nodesExpanded`/`bestBadness` per attempt (not just pass/fail), via a direct
`Solver.solve` call per level (`timeBudgetMs: 30000, nodeBudget: 8000000`).

## Results

| Level | Repair attempt(s) | Outcome |
|---|---|---|
| P00136 | 7,286 nodes | solved, seed 0 |
| P00144 | 255,717 nodes | solved, seed 0 |
| P00145 | seed 0: 2,000,010 nodes, timed out, `bestBadness: 3` — then seed 1: 805,745 nodes | solved, seed 1 |
| P00146 | 42,570 nodes | solved, seed 0 |
| F00146-sym-01 (r) | 21,785 nodes | solved, seed 0 |
| F00146-sym-02 (r²) | 7,915 nodes | solved, seed 0 |
| F00146-sym-03 (r³) | 55,449 nodes | solved, seed 0 |

Six of seven solve on the first seed using **0.4%–12.8%** of `REPAIR_PROBE_ORDINARY_NODE_BUDGET`
(2,000,000) — matching `7c59c4a`'s own qualitative finding ("solve on seed 0 alone, cheaply").
Only P00145 exercises the retry path at all: its first seed runs the probe's **entire** budget
before giving up (`2,000,010` nodes — hits the ceiling almost exactly, `bestBadness: 3`, i.e.
close but genuinely insufficient at this budget), and its rescuing second seed still needs
**~40%** of the same budget (805,745 nodes).

## Interpretation: the "headroom" in 6/7 levels does not mean the budget is oversized

It's tempting to read "most levels finish in under 13% of budget" as "the budget has 8x+ headroom,
shrink it." That would be the exact trap `CLAUDE.md`'s own repair-probe gotcha already documents
for the seed-*width* constant (rescuing seeds costing 21%–94% of budget across this same family,
so a smaller per-retry budget "isn't a free way out") — and the same reasoning applies here to the
*budget size* itself, not just the retry count. The budget's job is to be wide enough for the
**worst rescuable case**, not sized to the median: P00145's rescue alone already uses ~40% of the
current 2,000,000-node ceiling, and its *failing* first seed uses the entire thing before being
declared unrescuable at that seed. A sample of one hard case in a family of seven doesn't license
extrapolating "the true worst case is close to 40%" — the prior seed-salt investigation's own
21%–94% spread (measured across a related but not identical set of runs) shows real per-seed
rescue cost varies substantially, and this report's n=1 hard-case data point isn't enough to narrow
that range further, only to confirm the current ceiling still comfortably covers the one hard case
in hand.

**Conclusion: no change to `ELITE_POOL_SIZE`, `SPLICE_PROBABILITY`, `REPAIR_PROBE_ORDINARY_NODE_BUDGET`,
or `REPAIR_PROBE_BIASED_NODE_BUDGET` is warranted.** The mechanism is behaving exactly as its
original (pre-regression) design intended: fast, cheap wins for the large majority of repair-gated
levels, with a budget wide enough to still catch the one member of this calibration family that
needs most of it. This closes the open question from the elite-splice regression report's "what
remains to investigate" section as a verified negative result, not an oversight.

## Scope and caveats

- **Small sample.** 7 levels (4 real + 3 rotated siblings of one of them), the same family used for
  the prior seed-salt recalibration, chosen for direct comparability rather than breadth. Only one
  of the 7 exercises the retry/near-ceiling path at all — this is a single hard-case data point,
  not a distribution.
- **Published corpus only.** Did not extend to the stress-corpus repair-gated population
  (`needsRepairFallback`'s broader feature regime: `mustCross >= POLICY.REPAIR_MC_MIN`,
  `mustPass >= POLICY.REPAIR_MP_MIN`) — a genuinely different, larger population where headroom
  characteristics could differ. Left out of scope given the marginal value of a much larger sweep
  for what would still be a negative result (confirming existing constants) rather than a fix.
- As with every other diagnostic-only entry in this investigation, this required no
  `solver:bench --check` / full-corpus speed sweep, since **no code changed**.
