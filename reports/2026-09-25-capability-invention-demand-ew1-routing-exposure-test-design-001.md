# Capability-invention demand: EW1 routing-gap exposure test design 001

> **Status:** active
> **Last evidence:** 2026-09-25 — matched-work pilot A/B dispatched for both flags via `solver-level-blind-targeted-sweep.yml` on commit `b70fac12` (13-level sample per branch: target row + 12 same-branch solved controls, `--node-budget=50000000` production default; runs 36177860900/36177853014 (CID-0027 control/treatment) and 36177843641/36177869048 (CID-0028 control/treatment); results pending.
> **Decision:** design and implement (not dispatch) the smallest matched-work routing-exposure test for `CID-0027`/`CID-0028`, per each row's `smallestProbe` and the register's own "design (not dispatch)" gate. This report locates the exact `attempts.ts` rule each level's feature profile resolves to, and adds two new opt-in ablation exposure flags following this file's own established convention.
> **Remaining gate:** combine and interpret the four dispatched runs per each row's own `advanceIf`/`stopIf` (target-row gain, zero same-branch solved-level regressions in the sample).
> **Evidence role:** design + implementation
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`
> **Production effect:** none. Both flags default OFF (`OPT_IN_FEATURES`); no production default changed.

## Correction (2026-09-25, same day)

The original version of this report misattributed `R00118`'s matched rule to the catch-all
`when: isHighInt` rule (`attempts.ts`'s "medium-high requiredIntersections" rule). Implementing the
exposure flag there and testing it directly against `getAttemptConfigs(R00118, cfg)` found the flag's
beam never appeared — R00118 does not match that rule at all. Walking `ATTEMPT_POLICY` in order,
R00118 actually matches the **near-Hamiltonian** rule (`f.requiredPathCoverageRatio >=
POLICY.NEAR_HAMILTONIAN_COVERAGE_THRESHOLD`), positioned earlier in the list and more specific than
the catch-all. The flag was moved there and re-verified empirically (see "Verification" below). CID-
0028's attribution (the very-high-requiredIntersections non-portal rule) was independently verified
and is correct.

## Locating the exact branch each level resolves to

Both `R00118` (CID-0027) and `R02696` (CID-0028) classify as `routingRegime: 'intersection-heavy'`,
zero portals (confirmed via `SOLVER_TESTING_API.classifyRoutingRegime` against each level's
normalized form).

- **R02696**: matches the rule at `attempts.ts:341-368` (`why: 'very-high requiredIntersections,
  non-portal: intersectionHarvest beam wins directly, DFS fallbacks follow'`, gated on
  `requiredIntersections >= POLICY.VERY_HIGH_REQINT = 7`). Its `build()` offers `intersectionHarvest`
  (WIDE, optionally STANDARD behind two existing exposure flags), `objectiveFirst` WIDE,
  `intersectionHarvest`/`objectiveFirst` DFS, and `perimeterSweep` STANDARD (both directions) — never
  `harvestThenFinish`, `knotBuilder`, or `mustCrossFirst` at any width, matching CID-0028's
  `getAttemptConfigs` dump exactly.
- **R00118**: matches the **near-Hamiltonian** rule (`why: 'near-Hamiltonian: beams collapse over the
  long dense walk — DFS perimeter (both directions) leads'`, gated on `requiredPathCoverageRatio >=
  POLICY.NEAR_HAMILTONIAN_COVERAGE_THRESHOLD`). Its `build()` offers `intersectionHarvest` in DFS form
  and WIDE beam form, both **plain retention** — never the `mechanicBucketRetention: true` variant,
  matching CID-0027's dump exactly. Confirmed empirically:
  `getAttemptConfigs(R00118, null)` returns 17 configs with `intersectionHarvest@5000` present at
  `mechanicBucketRetention: undefined` (plain); enabling the new flag adds an 18th config with
  `mechanicBucketRetention: true`.

## Implemented: two new opt-in exposure flags

Following this file's own established convention (`STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_*_EXPOSURE`,
`attempts.ts:335-338`, `364-367`) — each new flag gates one additional config behind
`cfg && cfg.<FLAG> === true`, defaults OFF (`OPT_IN_FEATURES` in `ablation-config.ts`, so production
behavior is byte-identical unless a caller explicitly enables it via `--enable-flags`), and is placed
in a **reserve-preserving** position (before each rule's protected trailing-window configs, not
appended after — per `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE`'s own
closed-negative append-last result, appending after the protected suffix risks starving an existing
winner):

- **`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`**: in the
  near-Hamiltonian rule's `build()`, adds `beam('intersectionHarvest', BEAM.WIDE, null,
  { mechanicBucketRetention: true })` before the rule's protected trailing-5 window (the two
  perimeter STANDARD beams through the trailing `sideCommitment` DFS).
- **`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`**: in the very-high
  non-portal rule's `build()`, adds `beam('harvestThenFinish', BEAM.STANDARD)`,
  `beam('knotBuilder', BEAM.STANDARD)`, `beam('mustCrossFirst', BEAM.STANDARD)` (all three together —
  CID-0028's own `minimalCounterfactual` treats them as three independent candidate rescuers for the
  same single row, not a bundle to split across separate flags) immediately before the rule's own
  protected trailing suffix (`objectiveFirst` WIDE onward).

## Verification

Direct `getAttemptConfigs` calls (via `SOLVER_TESTING_API`, bypassing the solve loop entirely):

| Level | Flag | Configs without | Configs with | New config present |
|---|---|---:|---:|---|
| R00118 | `STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE` | 17 | 18 | yes |
| R02696 | `STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE` | 12 | 15 | yes (all 3) |

`npx tsc --noEmit`, `modules/solver/ablation-config.test.ts`, and `modules/solver/attempts.test.ts`
all pass unchanged. Production behavior (`cfg == null`) is untouched — both flags are opt-in only.

## Same-branch population for the pilot

Per the `smallestProbe`'s own "without regressing other same-branch production-solved levels" clause,
the regression-control population is every Corpus 2 level whose actual first-match `ATTEMPT_POLICY`
rule is the SAME rule. Measured the only way that's actually correct — per each level, diff
`getAttemptConfigs(level, null)` against `getAttemptConfigs(level, cfg-with-that-flag-only)`; a level
is "in the branch" iff the diff is non-empty, since that is precisely the condition under which the
flag can do anything for that level. (An earlier draft of this table instead walked the near-
Hamiltonian rule's raw `when` predicate, `isHighInt(f) && f.requiredPathCoverageRatio >=
POLICY.NEAR_HAMILTONIAN_COVERAGE_THRESHOLD`, by only the coverage-ratio half — omitting the
`isHighInt(f)` conjunct — which overcounted the branch by ~4.8x. Corrected below; the very-high-int
branch figure was already computed via the same `getAttemptConfigs`-diff method and is unchanged,
which independently confirms the method itself, not just this one number.):

| Branch | Levels in Corpus 2 |
|---|---:|
| Very-high `requiredIntersections>=7`, non-portal, intersection-heavy (CID-0028's rule) | 335 |
| Near-Hamiltonian, intersection-heavy (CID-0027's rule — corrected from the original catch-all misattribution) | 196 |

Both are far larger than a "smallest falsifying pilot" needs — this is base-rate context, not the
pilot population itself. Per this workstream's standing rules ("prefer cheapest information-value
test... hold out independent units"), the next step should draw a **small, stratified sample** from
each branch using the already-committed `35687363645` production boundary (solved vs. residual), not
sweep either branch in full:

1. the two target rows themselves (`R00118`, `R02696`) — the only known gain candidates so far;
2. a fixed, small number (e.g. 10-15) of already-solved same-branch levels, sampled from the existing
   boundary/solved-set data, as the regression-risk control — matching this workstream's own "no
   single parent should account for most of the treatment's added cost" concentration discipline by
   drawing from multiple parents rather than one;
3. explicitly NOT the full 335/196 branch population — that scale of dispatch would need its own
   separately-justified design (this report does not authorize it), and the two-row evidence base is
   far too thin to justify it yet.

## Protocol (dispatched)

Matched production budget, both arms: `scripts/level-blind-capability-sweep.mjs` production defaults,
`--node-budget=50000000`, derived `--work-budget=67000000`, generous non-binding `--budget-ms`,
level-blind, via `solver-level-blind-targeted-sweep.yml` (`enable_flags` input). Control: no enable
flags (production default routing). Treatment: `--enable-flags=` the one relevant new flag (test each
flag's branch independently — CID-0027's sample never touches CID-0028's flag and vice versa, since
they gate disjoint rules).

Dispatched 2026-09-25 on commit `b70fac12`, population per branch = target row + the 12-level
stratified solved-control sample listed above:

- CID-0027 control: [run 36177860900](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177860900)
- CID-0027 treatment (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`): [run 36177853014](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177853014)
- CID-0028 control: [run 36177843641](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177843641)
- CID-0028 treatment (`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`): [run 36177869048](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177869048)

Decision, per each row's own `advanceIf`/`stopIf`: advance only on a referee-valid gain on the target
row with zero same-branch solved-level regressions in the sample; any regression or zero gain stops
this exposure attempt on that row without escalating to the full branch population.

## What this does not authorize

- No production default change for either flag (both remain `OPT_IN_FEATURES`, default OFF) — the
  pilot dispatch above is evidence-gathering only, not a promotion.
- No claim about the 335/196 branch populations' general recoverability — only base-rate context for
  sizing a pilot smaller than either full branch.
- No progress toward the separately-blocked 83/47 fresh-census cohort.

## Artifacts

- `modules/solver/attempts.ts` — very-high rule at lines 348-380 (CID-0028); near-Hamiltonian rule at
  lines 383-419 (CID-0027, corrected); existing exposure-flag precedent at lines 342-345, 371-374.
- `modules/solver/ablation-config.ts` — both new flags registered in `FEATURES` and `OPT_IN_FEATURES`.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-gap-sample-001.md` — the originating
  sample (`CID-0027`, `CID-0028`).
- `data/stress/capability-invention-demand.json` — each row's `smallestProbe`.
