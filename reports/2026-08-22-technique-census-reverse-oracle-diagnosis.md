# Technique census reverse-oracle diagnosis

> **Status:** active
> **Last evidence:** 2026-08-24 — cardinality check against the authoritative eight historical admissible rows rules out the fixed 24-bit must-pass memo-key collision as their enabling mechanism; earlier evidence includes current-code sequential provenance, fresh-prep repair replay, bounded repair-salt controls, a current admissible-order screen, and exact-production-commit fresh controls at `e5034e8`
> **Decision:** `R01936` is causally explained by the production repair probe's second seed; the other five historical repair-probe wins do not reproduce on current code at salt 1 or 2 within 2M nodes; all eight beam-labelled historical rows were actually admissible-order wins and remain genuinely predecessor-dependent at the exact historical commit; the later-discovered must-pass memo-key collision cannot cause those eight because none has enough passable objectives to set bit 24
> **Remaining gate:** reproduce an unmodified historical full-ladder winner locally, then clear the must-pass/must-cross memo tables immediately before the admissible tier and progressively shorten/prime predecessor prefixes; if cache clearing is inert, snapshot the remaining prepared/config/accounting state around the minimal enabling prefix

## Why the original category was misleading

The frozen census has 14 levels solved by production but by no T1 isolated technique at 50M nodes. Joining production run `32459711208` only through its `winningConfig` field made six wins look like plain repair and eight like diverse beams. The same run's lifecycle telemetry gives the canonical stage attribution instead:

- six wins occurred in `repair-probe`;
- eight wins occurred in `admissible-order`;
- none of the eight beam-labelled rows was actually won in the main beam stage.

`winningConfig` therefore identifies a collapsed/reused config label, not the winning stage. The 14 rows remain real production-only capabilities, but they are not evidence that a plain T1 beam or repair configuration becomes stronger merely by running after another technique.

## Current-code provenance pilot

Measured command:

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json \
  --levels=R01936,R02493 --engine=sequential --budget-ms=600000 \
  --work-budget=200000000 \
  --out=logs/technique-census-reverse-oracle-provenance-pilot.json
```

The run was sequential, level-blind, complete, and non-truncated on commit `e60a846`. The raw local log was intentionally not committed; the command, commit, and projected attempt fields below are the durable interpreted evidence.

### `R01936`: second repair seed is causal

Current production solved in `3,791,533` nodes / `14,116,917` work:

| attempt | stage | gate | seed salt | random seed | nodes | result |
|---:|---|---:|---:|---:|---:|---|
| 1 | `repair-probe` | 720901 | 0 (implicit) | 1370513525 | 2,000,023 | timed out |
| 2 | `repair-probe` | 720901 | 1 | 3481737668 | 1,791,510 | success |

The census cell runner calls `runAttempt` without a seed-salt argument, so its isolated repair attempt uses the default salt 0. Its frozen T1 plain-repair cell reached 50,000,003 nodes without solving. The production probe's salt-1 retry is thus not state carryover or extra budget for the same randomized stream: it is a distinct deterministic seed, and it solves after the salt-0 probe fails. This explains at least one reverse-oracle mechanism and supports treating generic multi-seed repair probing as genuine stage capability.

An independent direct replay then bypassed the ladder and created a fresh prepared level:

```sh
node scripts/run-bundled.mjs scripts/repair-direct-probe.mjs -- \
  --corpus=data/stress/stress-levels-random.json --level=322 --gate-index=0 \
  --budget-ms=600000 --node-budget=2000023 --races=2
```

Seed salt 1 reproduced the identical success at 1,791,510 nodes. The worker is a fresh process and invokes `repairSearchFromGate` directly, so no earlier production attempt, shared preparation state, or ladder allocation can cause this win. This closes carryover as the mechanism for `R01936`; seed diversification alone is sufficient.

### Remaining historical repair-probe rows do not transfer to current code

Fresh-process direct probes tested salts 1 and 2 for each of the other five repair-probe rows with a 2,000,025-node ceiling. The five level probes ran concurrently for iteration speed; each salt ran in its own process, used deterministic node accounting, and completed its node ceiling without a deadline. Wall times are intentionally not compared.

| level | salt 1 | salt 2 | best badness (salt 1 / 2) |
|---|---|---|---:|
| `R02655` | failed at 2,000,049 nodes | failed at 2,000,028 nodes | 15 / 12 |
| `R02842` | failed at 2,000,027 nodes | failed at 2,000,037 nodes | 19 / 17 |
| `R02452` | failed at 2,000,025 nodes | failed at 2,000,025 nodes | 6 / 5 |
| `R02887` | failed at 2,000,046 nodes | failed at 2,000,028 nodes | 21 / 5 |
| `R01086` | failed at 2,000,025 nodes | failed at 2,000,032 nodes | 2 / 15 |

These null results do not invalidate the historical production wins: repair search ordering changed between commits, and the current capability run already loses several of these rows. They do show that “salt 1 explains all six” is false on current code. Spending larger current budgets would answer a different question; exact historical mechanism requires a pinned historical replay, while current capability work should wait for a current production win to diagnose.

### `R02493`: historical attribution does not transfer unchanged

Current production solved in `6,332,402` nodes / `16,951,083` work. Three `repair-probe` attempts failed (2,000,000, 2,000,006, and 2,100,000 nodes), then a `main-loop` `intersectionHarvest` diverse beam at width 5,000 solved in 232,396 nodes.

The frozen census's same-label beam exhausted after 201,555 nodes, but it ran older solver code. The same-commit current beam win therefore disproves neither census validity nor establishes carryover; search order, routing config, and implementation changed between the artifacts. This row needs a same-commit isolated replay of the exact winning attempt before assigning a mechanism.

### Current canonical admissible profiles do not reproduce any of the eight historical wins

A direct current-code screen bypassed the ladder and tested each canonical admissible-order profile independently on each level's current first selected gate:

```sh
node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=<level-id> \
  --only=ida:<profile> --budget-ms=600000 --node-budget=12500000
```

`default`, `none`, `mustCrossFirst`, `intersectionHarvest`, and `nearClosureRescue` each reached `12,500,224` nodes without solving on every level:

| level | current selected gate | profiles tested | result per profile |
|---|---:|---:|---|
| `R02493` | 851979 | 5 | failed at 12,500,224 nodes |
| `R02088` | 655369 | 5 | failed at 12,500,224 nodes |
| `R02536` | 196614 | 5 | failed at 12,500,224 nodes |
| `R01356` | 655362 | 5 | failed at 12,500,224 nodes |
| `R03195` | 131075 | 5 | failed at 12,500,224 nodes |
| `R02690` | 1 | 5 | failed at 12,500,224 nodes |
| `R03230` | 655363 | 5 | failed at 12,500,224 nodes |
| `R03238` | 589827 | 5 | failed at 12,500,224 nodes |

The 40 attempts consumed 500,008,960 deterministic nodes. Profiles ran in separate processes with at most four concurrent workers for iteration speed, so wall time is not compared. A preceding five-profile 2M-node screen on `R02088` had the same null result.

This is a bounded current-code non-reproduction, not the requested same-commit historical control: the frozen production artifact does not retain the exact admissible profile/config/gate/ceiling, and both gate selection and solver ordering may have changed. It does rule out an immediate current-code reproduction by any canonical profile at the ordinary 12.5M reserve scale. The remaining gate for all eight is now narrower: recover the historical winning-attempt identities or replay the historical commit, rather than increase unidentified current profiles' budgets.

### Exact-commit fresh controls establish attempt-history dependence

The frozen per-level row identifies production commit `e5034e8c433eb32ab6d1882d80271dc277b91b0f` and records 17 failed strategies before the successful eighteenth attempt. The last recorded failure is `ida:none`. At that exact commit, `ADMISSIBLE_ORDER_PROFILES` is ordered `default`, `none`, `mustCrossFirst`, `intersectionHarvest`, `nearClosureRescue`, and the lifecycle map assigns the winner to `admissible-order`. The missing eighteenth config is therefore inferentially `ida:mustCrossFirst`; this is code-and-order reconstruction, not directly retained attempt telemetry.

A detached worktree at the exact production commit then ran fresh-preparation direct controls on gate `655369`. All five canonical profiles failed at 12,500,224 nodes. More importantly, each also failed independently at 50,000,128 nodes, including inferred winner `mustCrossFirst`:

```sh
git worktree add --detach /tmp/pathfinder-e503 \
  e5034e8c433eb32ab6d1882d80271dc277b91b0f
node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=R02088 \
  --only=ida:mustCrossFirst --budget-ms=600000 --node-budget=50000000
```

The same exact-commit control was then extended to the other seven rows. Failed-strategy order reconstructs the next admissible profile as `none` for five rows and `mustCrossFirst` for `R03195`; `R02690` crosses an intervening dedup-retry attempt, so all five profiles were screened rather than assigning an uncertain identity.

| level | inferred/plausible profile controls | fresh result at exact commit |
|---|---|---|
| `R02493` | `none` | failed at 50,000,128 nodes |
| `R02088` | all five; inferred `mustCrossFirst` | all failed at 50,000,128 nodes |
| `R02536` | `none` | failed at 50,000,128 nodes |
| `R01356` | `none` | failed at 50,000,128 nodes |
| `R03195` | `mustCrossFirst` | failed at 50,000,128 nodes |
| `R02690` | all five (identity ambiguous) | all failed at 50,000,128 nodes |
| `R03230` | `none` | failed at 50,000,128 nodes |
| `R03238` | `none` | failed at 50,000,128 nodes |

Together the exact-commit 50M controls consumed 800,002,048 deterministic nodes. Admissible-order search is deterministic; unlike repair, it has no seed input. The same implementation/config/gate can therefore solve only after preceding production attempts have run, while failing from a fresh prepared level with a ceiling far above the ordinary reserve. This is population-wide causal evidence of attempt-history-dependent mutable preparation/search state (or equivalent unprojected ladder context), not random restart value or a larger standalone budget. It validates real ladder-only capability across all eight rows and changes the next measurement from profile sweeps to state-diff/prefix/prime-attempt replays.

## Mutable-state surface audit

A source audit at the exact production commit narrows the prefix experiment further. `admissibleOrderSearch` creates a new logical search state for every invocation and does not read prior paths, beam frontiers, repair elites, or a seed. Its inherited mutable reads are limited to cumulative accounting (`_metrics`, `_workMeter`, and the experiment-only strict cap), the fixed configuration/forced-step fields, and the must-pass/must-cross lower-bound memo tables reached through the bound functions. Cumulative counters can stop a search but cannot change child ordering; the admissible tier at this commit also deliberately did not enforce the ordinary inherited per-attempt work cap. The reusable DFS/beam/repair backing buffers are not used by admissible-order search, because it calls `createState` without a buffer slot.

The two lower-bound memo tables are therefore the only obvious persistent *value-bearing* search inputs populated by earlier attempts. Their documented contract says they are exact pure memoization, so warm-versus-empty behavior should be identical. That makes the first discriminating prefix control precise: reproduce a historical full-ladder winner while clearing `_mpLowerBoundCache` and `_mcLowerBoundCache` immediately before the admissible tier. A loss would localize the mechanism to memo-key/value behavior; a preserved win would rule out the caches and require snapshotting configuration/forced-step/static-preparation identity plus the exact successful attempt rather than broadly diffing every `PrepLevel` field. This is a code-derived hypothesis and proposed control, not measured causal evidence yet.

### Later must-pass cache bug is not the historical mechanism

The 2026-08-24 packing audit found a genuine, independent defect in current/historical `mustPassLowerBound` memoization: the composite cache key reserved only 24 bits for `mpVisitedMask` even though normalized must-pass plus must-turn objectives are schema-valid through 30. That defect requires bit 24 to be reachable, therefore at least **25** normalized passable objectives.

The authoritative eight historical admissible-order rows have normalized passable-objective counts of only:

| level | normalized must-pass + must-turn objectives |
|---|---:|
| `R02493` | 5 |
| `R02088` | 6 |
| `R02536` | 12 |
| `R01356` | 7 |
| `R03195` | 14 |
| `R02690` | 13 |
| `R03230` | 11 |
| `R03238` | 13 |

The cohort maximum is 14. None can set mask bit 24, so the former `(pos, mask)` alias is unreachable on every one of these levels. The bug was worth fixing on its own, but it **cannot** explain the P0 predecessor dependence. Do not interpret the correctness fix as having resolved or even weakened the need for the historical cache-clear/prefix experiment.

The sibling must-cross memo packing was also re-audited against its supported boundary. It caches only when `mustCrossKeys.length <= 8`; its key allocates 16 base-4 bits for per-cell first-cross axis state plus 8 pending-mask bits below a `2^25` position radix, and 9+ cells bypass memoization. Boundary tests now compare warm-vs-fresh values with opposite first-cross axes at `n=8` and verify the `n=9` uncached fallback. This makes must-cross key collision less plausible, but it does not substitute for the historical warm-cache control.

The audit also identifies a necessary baseline check omitted by the earlier fresh controls: replay the unmodified historical full ladder locally under the preserved 100M-node protocol before interpreting any patched prefix arm. The committed production artifact is valid historical evidence, but an environment-local baseline is needed to distinguish a treatment effect from build/runtime or deadline drift.

## Decision and next measurement

The 14-level question is no longer a single mystery:

1. **Confirmed seed diversification:** `R01936` is solved by salt 1 after salt 0 fails, and the salt-1 win reproduces directly from fresh preparation.
2. **Historical stage-attribution defect:** all eight beam-labelled frozen wins belong to `admissible-order` lifecycle, not the beam stage.
3. **Non-transferring historical repair rows:** the remaining five fail with salts 1 and 2 on current code at 2M nodes; no current mechanism claim is warranted.
4. **Confirmed attempt-history dependence:** every inferred or plausible admissible winner fails fresh at the exact production commit/config/gate even at 50M nodes; preceding ladder activity is necessary across all eight rows.
5. **Specific current cache collision eliminated as cause:** the fixed must-pass key bug needs 25+ passable objectives; the eight historical rows have 5–14.
6. **Still unresolved:** which mutable state and minimal preceding attempt prefix enables each historical admissible win.

The next run should first reproduce an unmodified historical full-ladder winner under the preserved protocol. Then clear the two lower-bound memo tables immediately before the inferred winning admissible action; if the win survives, progressively prime the action after longer predecessor prefixes while snapshotting the remaining mutable prepared/config/accounting state. Retain `stageId`, `gateKey`, canonical `configKey`, canonical `actionKey` where available, seed, node/work ceilings, and outcome so the enabling prefix and state mutation are attributable rather than merely reproduced.
