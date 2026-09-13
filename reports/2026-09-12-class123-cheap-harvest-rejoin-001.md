# Class-1/2/3 cheap harvest rejoin 001

> **Status:** cheap existing-data harvest closed; one narrower implementation nomination preserved
> **Boundary:** corrected post-1048 atlas, 98 residual rows: class1 22, class2 39, class3 37.
> **Decision:** there is no already-legal, no-contention batch to collect directly from classes 1-3. Class 1 is blocked by known menu-allocation contention; class 3 is already exposed-and-failed; class 2 is dominated by already-priced policies/tier starvation. One specific seven-level must-turn-biased exposure seam is not answered by those closures and is retained as a new treatment nomination, not counted as harvested capability.

## Class 1: 22 not-offered rows

The previous compact-beam-menu reconciliation covered 17/25 then-current class-1 rows. On the corrected post-1048 boundary, **15/22** remain in those same very-high-intersection (`intersection-heavy`, `reqInt>=7`) rules. The strict-work append and reserve-preserving descendants already established that adding attempts there dilutes protected suffix winners; that form remains closed.

The remaining **7/22** are the previously unresolved headroom cases:

`R00118`, `R01080`, `R01504`, `R01613`, `R02615`, `R02896`, `R03261`.

Current policy reconstruction answers the old reopen gate: **all seven have zero protected-suffix headroom**. Their current main-menu sizes are 10, 6, 20, 11, 10, 11 and 20 respectively against `MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT=5`. Their isolated winners are genuinely cheap, mostly 0.12-0.39M-node beams, but none is already present in the current main menu.

This is useful capability evidence, not a free dispatch opportunity. Naively exposing any of those winners inside the current fixed-work main menu would knowingly re-enter the same attempt-count/resource-contention problem the August/September exposure experiments established. Reopen class-1 exposure only with a materially different work/allocation contract, not another append/insert recipe.

## Class 2: 39 offered-family / exact-action-unreached rows

The decision-bearing winners separate into three known shapes.

### Turn-biased repair

The dominant group is `repair|score=repair|guidance=turn-biased`. This policy is deliberately absent from current defaults and has already been population-priced negative under its later integration forms. Reclassification into class 2 does not reopen it.

### Admissible-order non-default profiles

`mustCrossFirst`, `intersectionHarvest`, and `nearClosureRescue` winners are members of the current admissible-order policy family but can be starved before the exact profile is dispatched. The retained non-default retry has its own matched-work/deferred disposition. These rows are allocation evidence, not a free new action.

### Must-turn-biased repair: narrower unresolved seam

Seven current rows have an isolated `repair|score=repair|guidance=must-turn-biased` winner while current policy reaches repair/late-repair context but does **not** include that exact guidance on the level:

- `R02180` - 6,206,072 isolated nodes
- `R02367` - 32,182,920
- `R02459` - 16,268,287
- `R02768` - 1,179,294
- `R02849` - 12,955,651
- `R03049` - 12,345,609
- `R03056` - 23,299,834

This is not answered by the closed broad `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN` form. The current late-repair-search tier exists specifically on `repairConfigs.length===0` levels, but it constructs only `repairAttempt()` (plain guidance). A changed treatment could ask whether a **bounded additive late must-turn-biased repair probe** on already-must-turn levels recovers this seam without widening the full repair-fallback gate or stealing work from plain repair.

That is a mechanism-specific implementation nomination, not an earned promotion and not part of this cheap harvest. Start with the smallest targeted pilot, especially the cheap `R02768`/`R02180` end, and require matched total-work/collateral accounting before any population-scale run.

## Class 3: 37 reached/comparable-work-failed rows

By construction these rows already reached the exact winning-action family at comparable production work and still failed. They contain no cheap exposure harvest. They remain failure-mechanism/acquisition evidence.

## Reproducibility

`scripts/stress/class123-cheap-harvest-rejoin.mjs` rebuilds current policy membership and protected-suffix headroom without solving. It deliberately distinguishes:

- winner absent from the current policy menu;
- winner in the policy family but not dispatched/reached;
- class-1 menu absence with/without reserve-window headroom.

The analysis never treats T1 isolation as production entitlement. It only answers whether the corrected residual contains an already-legal, low-cost batch that can be exposed without reopening a measured contention mechanism.

## Disposition

The September 12 **98-row cheap harvest gate is closed**. No direct solve batch was earned. Carry only the seven-level late must-turn-biased nomination forward as a changed-treatment candidate. Everything else rejoins its existing closed/deferred disposition.