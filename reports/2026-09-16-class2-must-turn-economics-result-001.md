# Class-2 must-turn-biased late-repair: 60-row economics/collateral result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-16 — matched control/treatment execution of the frozen 60-row participant-aware cohort on GitHub Actions (`solver-level-blind-targeted-sweep.yml`, runs `35054888982` control / `35054892068` treatment), current HEAD
> **Decision:** `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` does not clear the Class-2 economics/collateral gate on its eligible population. Zero net new gains, +~6.5% aggregate `workSpent`. Stays default-OFF.
> **Remaining gate:** none for this population/dose; do not automatically widen. `R02768`/`R02180` (excluded development rows) remain valid positive-control evidence for capability/placement, not economics.
> **Evidence role:** decision-bearing economics/collateral A/B per `reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md`'s Class-2 section. Answers `WS2-MUST-TURN-LATE-ADDITIVE`.

## Question

Does the correctly integrated default-off 7M `late-repair-must-turn-biased-retry` tier improve solve/work economics on its bounded eligible population without material collateral — marginal value under the fixed-work system, not merely whether it can produce a solve?

## Treatment

Unretuned from the dose-pilot/preflight: `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY=true`, stage `late-repair-must-turn-biased-retry`, existing 7,000,000 stage-local node cap, existing placement (after `late-repair-search`, before `guidance-goal-distance-retry`/`late-repair-multiseed-retry`), all other production defaults unchanged. Control: no extra flags.

## Population

Frozen 60-row cohort (`data/stress/ws2-class2-frozen-cohort-001.json`/`-ids.txt`): rows with current-code control-side must-turn structural eligibility (`hasMustTurn && childStructuralEligible && childInsertionPointReached`) and genuine `late-repair-search` participation, drawn from a fresh full-corpus control refresh (`solver-stress-refresh.yml` run `35043165547`). 151 rows were structurally eligible; only 17 had genuine collateral participation (control solves via a stage after `late-repair-search`) — fewer than the nominal 20 — so per the preflight's fallback the shortfall moved to gain: **43 gain + 17 collateral = 60**, ranked-deterministic, `R02768`/`R02180` excluded as development rows, `R03049` excluded from gain accounting. The frozen collateral-stratum id set was independently re-verified against this session's fresh control run and matched exactly (17/17), confirming the materialization is sound.

## Execution

Same shape as the Class-4 population: `solver-level-blind-targeted-sweep.yml`, `node_budget=50000000`/derived `work_budget=67000000`, `workers=4`, `lifecycle_telemetry=true`, `experiment_provenance=ws2-class2-cohort-001|WS2-MUST-TURN-LATE-ADDITIVE|reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md`. Population coverage exact and decision-valid on both arms (`60/60`, zero errors/truncations). Results retrieved from job logs (blob-storage artifact downloads blocked by egress policy, per the Class-4 report's method).

## Referee validity

All 17 control solves and all 17 treatment solves independently referee-valid (34/34, 100% coverage, zero anomalies), confirmed against shard-level job logs the same way as the Class-4 population.

## Result

| | control | treatment |
|---|---:|---:|
| Solved | 17/60 | 17/60 (**same set**) |
| Aggregate `workSpent` | 15,000,033,059 | 15,981,059,876 (**+981,026,817, +6.5%**) |
| `late-repair-must-turn-biased-retry` reach/solves | n/a (stage disabled) | 60/60 reach, **4 solves** (`R02382`, `R02573`, `R01909`, `R01905`) |
| `late-repair-multiseed-retry` solves | 16 | 13 |
| `guidance-goal-distance-retry` solves | 1 (`R02573`) | 0 |

Treatment's 4 target-stage solves are **exactly** the 4 ids that would otherwise have solved via `late-repair-multiseed-retry` (3 of them) or `guidance-goal-distance-retry` (`R02573`) — the same ids, at the same overall count. Comparing the collateral-stratum solved set between arms confirms this precisely: control's solved set (all 17) equals treatment's solved set (all 17), id-for-id. **Zero of the 43 gain-stratum rows were rescued.** The new stage fires with genuine, substantial engagement (60/60 reach, real nonzero aggregate work, 401,598,547 nodes) but only ever intercepts rows that a later stage was already going to solve, sitting earlier in the ladder and taking credit (and cost) without adding capability.

## Interpretation

This is precisely the downstream-displacement risk the preflight's mandatory collateral stratum existed to catch, realized at its most extreme: not partial displacement of some gains by some losses, but **total** displacement — 100% of the treatment's claimed solves are collateral rows solving via a different stage than they would have, zero of the 43 genuinely eligible gain rows were rescued, and the whole-population cost went up for it. The question was marginal value under the fixed-work system, not whether the treatment can solve anything — `R02768`/`R02180` (excluded here as development rows) already answered "can it solve anything" affirmatively at this exact dose in the 2026-09-13 pilot. This population answers the harder, correct question, and the answer is no.

## Disposition: CLOSED NEGATIVE (eligible-population economics)

`STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` stays default-OFF. Per the preflight's explicit stop rule ("zero gains after informative participation on at least 30 gain rows is also a stop: do not automatically widen the dose"), and given 43 gain rows all reached the stage with genuine nonzero work, this is a clean stop rather than a dose-widening trigger. `R02768`/`R02180` remain valid **capability/placement** evidence (the mechanism can solve real levels when nothing else can) but are not, and were never claimed to be, economics evidence — this closeout narrows that distinction to its correct, already-anticipated scope rather than reversing it.

This does **not** close the underlying must-turn-biased repair *capability* — only this specific unconditional-exposure form's economics on this population. A future reopening needs either a materially different placement/selector that avoids intercepting rows other stages already reach, or a changed premise per the standing reopen rules; simply re-running the same form on a different population is a demoted retry shape absent new evidence.

## Validation

- Referee-validity audit: 34/34 solved rows confirmed referee-valid via shard-level job logs (0 anomalies).
- Cohort-freeze internal consistency: this session's fresh control run's solved set exactly matches the frozen collateral stratum (17/17).
- No code change accompanies this closeout; `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` remains exactly as integrated in the 2026-09-13 dose pilot.

## Capability memory

- **Disposition:** CLOSED NEGATIVE (Axis A), economics/collateral form.
- **Capability signature (Axis B):** demonstrated capability to solve `R02768`/`R02180` (2026-09-13 pilot) stands unchanged as a nomination; on this 60-row population the mechanism shows zero unique-capability contribution and 100% downstream displacement of its own claimed solves, a concrete, population-scale example of the "gains with no losses but poor economics... become a WS1/allocation-selection question" case the preflight anticipated in the abstract.

## Next gate

None live for this treatment absent a materially different placement/selector premise. The Class-4 dead-last retry promotion (companion report) changed the production residual/capability-memory boundary this session; refresh those views before drawing further WS2 conclusions from old counts, per standing freshness-reconciliation rules.
