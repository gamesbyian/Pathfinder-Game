# Capability-invention demand: EW1 routing-gap exposure test design 001

> **Status:** active
> **Last evidence:** 2026-09-25 — static code location + routing-regime classification against current `main` (solver ref `c832025df53df2cf4066d2cc82ecfc9229fdd320`); no new solver execution.
> **Decision:** design (not dispatch) the smallest matched-work routing-exposure test for `CID-0027`/`CID-0028`, per each row's `smallestProbe` and the register's own "design (not dispatch)" gate. This report locates the exact `attempts.ts` rule each level's feature profile resolves to, names the exact missing config(s), and proposes two new opt-in ablation exposure flags following this file's own established convention — but implements neither the flags nor a dispatch.
> **Remaining gate:** implement the two exposure flags (small, mechanical additions matching an existing pattern), draw the sampled same-branch pilot population from already-committed data (no new acquisition), then dispatch via `--enable-flags` on `level-blind-capability-sweep.mjs` at matched production budget.
> **Evidence role:** design
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`
> **Production effect:** none. Static analysis only.

## Locating the exact branch each level resolves to

Both `R00118` (CID-0027) and `R02696` (CID-0028) classify as `routingRegime: 'intersection-heavy'`,
zero portals (confirmed via `SOLVER_TESTING_API.classifyRoutingRegime` against each level's
normalized form). `modules/solver/attempts.ts`'s `ATTEMPT_POLICY` is an ordered, first-match-wins
rule list; the two levels resolve to different rules because of `POLICY.VERY_HIGH_REQINT = 7`:

- **R02696** (`requiredIntersections=12 >= 7`): matches the rule at `attempts.ts:341-368`
  (`why: 'very-high requiredIntersections, non-portal: intersectionHarvest beam wins directly, DFS
  fallbacks follow'`). Its `build()` offers `intersectionHarvest` (WIDE, optionally STANDARD behind
  two existing exposure flags), `objectiveFirst` WIDE, `intersectionHarvest`/`objectiveFirst` DFS, and
  `perimeterSweep` STANDARD (both directions) — never `harvestThenFinish`, `knotBuilder`, or
  `mustCrossFirst` at any width, matching CID-0028's `getAttemptConfigs` dump exactly.
- **R00118** (`requiredIntersections=6 < 7`): falls through the very-high and portal-dense rules to
  the catch-all `when: isHighInt` rule at `attempts.ts:397-419` (labeled `'medium-high
  requiredIntersections...'`, but its predicate is unconditional on `isHighInt(f)` alone, so it is the
  catch-all for every non-very-high `intersection-heavy` level). Its `build()` offers
  `intersectionHarvest` at STANDARD and WIDE — both **plain retention** — never the
  `mechanicBucketRetention: true` variant, matching CID-0027's dump exactly.

## Precedent for opt-in exposure flags in this exact file

The very-high rule (and its portal-dense sibling) already carry two opt-in exposure flags added for
an earlier, unrelated question: `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE` and
`STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE`
(`attempts.ts:335-338`, `364-367`) — each gates one additional `beam(...)` call behind
`cfg && cfg.<FLAG> === true`, defaulting to false/absent so production behavior is unchanged, and
each is placed in a trailing, late-reserve-protected position so it costs nothing on levels that
already solve earlier in the list. This is exactly the mechanism `CID-0027`/`CID-0028`'s
`smallestProbe` needs, extended with two new flags for the two new missing configs:

- **`STRATEGY_INTERSECTION_HARVEST_MECHANIC_BUCKET_CATCHALL_EXPOSURE`** (new): in the catch-all
  `isHighInt` rule's `build()`, trailing position, add
  `beam('intersectionHarvest', BEAM.WIDE, null, { mechanicBucketRetention: true })` behind this flag.
- **`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`** (new): in the very-high
  non-portal rule's `build()`, trailing position, add `beam('harvestThenFinish', BEAM.STANDARD)`,
  `beam('knotBuilder', BEAM.STANDARD)`, `beam('mustCrossFirst', BEAM.STANDARD)` behind this flag —
  all three together, since CID-0028's own `minimalCounterfactual` treats them as three independent
  candidate rescuers for the same single row, not a bundle to be split across separate flags.

Both flags need registering in `modules/solver/ablation-config.ts`'s `FEATURES` array (default
`true`, matching every other `STRATEGY_*_EXPOSURE` flag's convention of "on" meaning "ablation
enabled/production behavior," so `--enable-flags` in the research tooling below reads as "turn the
exposure ON" per that CLI's own inverted-name handling — verify against an existing sibling flag's
entry before implementing, do not assume the polarity).

## Same-branch population for the pilot

Per the `smallestProbe`'s own "without regressing other same-branch production-solved levels" clause,
the regression-control population is every Corpus 2 level sharing the SAME resolved rule, not just the
two target rows. Classifying the full corpus (no new acquisition — `classifyRoutingRegime` +
`normalizeRawLevel` against the already-committed `data/stress/stress-levels-random.json`) finds:

| Branch | Levels in Corpus 2 |
|---|---:|
| Very-high `requiredIntersections>=7`, non-portal, intersection-heavy (CID-0028's rule) | 335 |
| Catch-all `isHighInt`, `requiredIntersections<7`, non-portal (CID-0027's rule) | 283 |

Both are far larger than a "smallest falsifying pilot" needs — this is base-rate context, not the
pilot population itself. Per this workstream's standing rules ("prefer cheapest information-value
test... hold out independent units"), the next step should draw a **small, stratified sample** from
each branch using the already-committed `35687363645` production boundary (solved vs. residual), not
sweep either branch in full:

1. the two target rows themselves (`R00118`, `R02696`) — the only known gain candidates so far;
2. a fixed, small number (e.g. 10-15, sized when implemented against how many of each branch are
   currently solved) of already-solved same-branch levels, sampled from the existing boundary/
   solved-set data, as the regression-risk control — matching this workstream's own "no single
   parent should account for most of the treatment's added cost" concentration discipline by drawing
   from multiple parents rather than one;
3. explicitly NOT the full 335/283 branch population — that scale of dispatch would need its own
   separately-justified design (this report does not authorize it), and the two-row evidence base is
   far too thin to justify it yet.

## Protocol (for implementation time, not dispatched here)

Matched production budget, both arms: `scripts/level-blind-capability-sweep.mjs` production defaults,
`--node-budget=50000000`, derived `--work-budget=67000000`, generous non-binding `--budget-ms`,
level-blind. Control: no enable flags (production default routing). Treatment: `--enable-flags=` the
one relevant new flag (test each flag's branch independently — CID-0027's sample never touches
CID-0028's flag and vice versa, since they gate disjoint rules).

Decision, per each row's own `advanceIf`/`stopIf`: advance only on a referee-valid gain on the target
row with zero same-branch solved-level regressions in the sample; any regression or zero gain stops
this exposure attempt on that row without escalating to the full branch population.

## What this does not authorize

- No change to `modules/solver/attempts.ts`, `ablation-config.ts`, or any production routing.
- No dispatch of the sampled pilot above — implementation and dispatch are separate, later gates.
- No claim about the 335/283 branch populations' general recoverability — only base-rate context for
  sizing a pilot smaller than either full branch.
- No progress toward the separately-blocked 83/47 fresh-census cohort.

## Artifacts

- `modules/solver/attempts.ts` — `ATTEMPT_POLICY` rules at lines 341-368 (CID-0028) and 397-419
  (CID-0027); existing exposure-flag precedent at lines 320-321, 335-338, 364-367.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-gap-sample-001.md` — the originating
  sample (`CID-0027`, `CID-0028`).
- `data/stress/capability-invention-demand.json` — each row's `smallestProbe`.
