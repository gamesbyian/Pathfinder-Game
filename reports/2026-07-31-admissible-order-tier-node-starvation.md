# 185 proven solves are being lost to ladder budget allocation, 100 of them to one starved tier (2026-07-31)

Read-only measurement. No solver code changed. This is a sizing exercise for "where do the next 100
solves come from," and the answer it returns is not a new search capability.

**Headline**: 215 of the 1,266 corpus-2 levels counted unsolved at typical budget carry a cold,
referee-validated solution that was *originally found in fewer nodes than the typical budget's own
cap* — 185 of them with no gate/first-step forcing at all. The largest single block, **100 levels,
belongs to `admissible-order-search`, whose production tier is measured to never run at all on 140
of its own 141 levels.** The cause is a budget-accounting mismatch: the tier is provisioned in
*time* and starved in *nodes*.

---

## The gap

The 2026-07-30T114427Z typical-budget baseline solves 434/1700. 791 levels carry at least one stored
hint, so **357 levels have a stored solution the typical-budget solver does not rediscover**. Every
one of those 357 has a hint from a *cold* technique (`dfs`/`beam`/`repair`/`admissible-order`) — none
are hint-guided-only, so `prefix-anchored`/`enumerate-targeted` provenance is not propping this number
up (the exclusion CLAUDE.md's provenance section requires for any solver-capability claim). The other
203 hint files belonging to unsolved levels are empty, not unprovenanced.

Taking each level's **cheapest** cold discovery, by the `nodesExpanded` its provenance recorded at
find time, against the baseline's own 20,000,000-node cap:

| cheapest cold find | levels |
|---|---|
| ≤ 1M nodes | 86 |
| ≤ 3M | 121 |
| ≤ 5M | 140 |
| ≤ 10M | 171 |
| **≤ 20M (the cap the run itself used)** | **215** |
| > 20M | 142 |

Of the 215, 30 carried a non-empty `solver.forcing` object and are conservatively excluded, leaving
**185 unforced**. Which technique found each most cheaply:

| technique | levels (of the 215) |
|---|---|
| **admissible-order** | **100** |
| repair | 61 |
| dfs | 31 |
| beam | 23 |

## Why the admissible-order block is lost: time-provisioned, node-starved

141 of the 357 carry an `admissible-order` hint. At typical budget **10 solve and 131 do not**, and
the reason is not that the technique stopped working:

- The production tier is last in line — `orchestration.ts` runs it only after the main ladder, the
  6× repair fallback, and the attraction-diversity pass have all failed on every gate.
- Its budget is a **time** fraction: `ADMISSIBLE_ORDER_BUDGET_FRACTION = 1.0` per profile, five
  sequential sub-passes, each with its own full `timeBudgetMs`.
- The batch runner's ceiling is a **cumulative node count**. `solver-typical-budget-baseline.yml`
  says so in its own comment: *"--node-budget is the cumulative ceiling that actually stops a level."*

So the earlier tiers consume the entire 20M cumulative node ceiling and the tier that was given
plenty of *clock* never gets a single *node*. Measured directly on those 141 levels: the ladder ran a
mean of 14.4 attempts, every level terminated at `nodesExpanded` ≈ 20,000,0xx (i.e. exactly the cap),
and an admissible-order sub-pass was recorded on **1 of 141** (the tier's `'none'` profile is
exclusive to it, so it is unambiguous in the attempt log).

Median discovery cost for those finds was **3.0M nodes** — 15% of the cap. This is not a technique
that needs more budget than the run has; it is a technique that receives none of it.

**This is the same bug shape as `2026-07-17-repair-probe-node-budget-starvation.md`**, where the early
repair probe ignored the caller's external `nodeBudget` entirely and ran its own internal worst case.
That fix was part of a change set worth +28 solves. The difference here is that the starved tier
already has 100–141 independently validated solutions behind it, so the size of the prize is measured
rather than hoped for.

## What this does and does not claim

- **Not** that all 185 will solve once budget is reallocated. Reallocation is zero-sum against a fixed
  cap, and reordering a budget-limited heuristic search has come up a coin flip three times in this
  repo (MST tightening −12, archetype routing −4/−8, dead-flipper move-gen exclusion −1).
- **Not** that `nodesExpanded` is a fair cross-technique currency. It counts 11–17× different real work
  in dfs/beam/repair (`docs/solver-budget-determinism.md`), so the band table is a filter for "was this
  find cheap," not a budget calculation. `workSpent` is the comparable unit and provenance does not
  always carry it; re-deriving the bands in work units is the first refinement this analysis needs.
- **Not** a claim about corpus-1 or published levels, which were not examined here.

What it does claim, and what is directly measured: a tier holding 141 validated solves executes on 1
of them, because two parts of the budget system are denominated in different units.

## The favourable asymmetry

Reallocation looks cheaper here than the coin-flip precedents, for a reason that is already in the
data: solved levels finish in a mean of **5.0** ladder attempts against **15.4** for unsolved ones
(`reports/stress/corpus2-failure-categorization-2026-07-29.md`). A node slice reserved for a
late tier is therefore drawn overwhelmingly from levels that are *already failing* by the time it
would be taken. That is an argument for measuring, not a substitute for it — and the measurement must
cover the already-solved population, which is the one lesson of the MST revert.

## Cheapest decisive next steps

1. **Reproduce the ceiling before changing any scheduling.** Run the 141 standalone via
   `scripts/method-probe.mjs --only=ida:<profile>` at exactly the baseline's budget (8000 ms /
   20,000,000 nodes, pinned `--work-budget`). This separates "the tier is starved" from "these finds
   no longer reproduce," and it costs one sweep. Expected: a large majority reproduce, since that is
   the budget most were originally validated at.
2. **Reserve nodes rather than reorder tiers.** Give the admissible-order tier a floor — a fixed slice
   of the external node budget withheld from the earlier tiers — instead of promoting it up the ladder.
   A floor is a smaller behavioural change than a reorder, and it is the change the diagnosis actually
   implies.
3. **Add the missing override.** `portfolio-solve-sweep.mjs` exposes `--repair-budget-fraction` and
   `--attraction-diversity-budget-fraction` but has no `--admissible-order-budget-fraction` and no
   `disableExtraBudgetPasses` switch, so no batch tool can currently isolate this tier's contribution.
   CLAUDE.md already warns that all three fractions must be set together; the third one is unreachable
   from the batch entrypoint.
4. **Then A/B at typical budget** over a stratified sample containing the 141 *and* a control group of
   currently-solved levels, pinned work budget, both directions reported.

## Reproducing

All figures come from committed artifacts — `reports/stress/typical-budget-corpus2.json`,
`data/stress/hints-random/*.json` provenance, and the attempt logs in the same report. No solving was
performed. The per-level joins are small enough to reconstruct inline; the cold-technique filter is
`technique.startsWith()` over `dfs`/`beam`/`repair`/`admissible-order`/`enumerate-complete`, and the
hint-guided exclusion is `prefix-anchored`/`enumerate-targeted`, matching
`docs/solution-profile.md`'s `classifyProvenanceSource` split.
