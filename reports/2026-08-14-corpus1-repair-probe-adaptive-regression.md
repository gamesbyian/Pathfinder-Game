# Corpus-1 capability regression: the repair-probe adaptive shrink starves its own winner

> **Status:** confirmed single-level regression on a promoted production default; no revert made
> **Mechanism:** `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` (production default-ON since 2026-08-13)
> **Level:** `R00408` (Corpus 1)
> **Evidence:** matched level-blind A/B at one SHA (`c7bd734c3`, `modules/` identical to `main` `d425532ba`)

## What prompted this

Level-blind capability sweep #39 (2026-08-14, `d425532ba`) recorded Corpus 1 at **94/102**, down from
sweep #38's **95/102** (2026-08-12, `ba5630978`). Corpus 1's node budget did not change between the
two runs (50,000,000 in both) and both ran with a non-binding 24h deadline, so ordinary contention
effects were not a plausible explanation.

## Narrowing

`modules/solver/` gained ~1,300 lines across 17 commits between the two runs. All but two are
inert at production defaults:

- the four new strategy flags (`STRATEGY_REPAIR_FALLBACK_NODE_RESERVE`,
  `STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE`, `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE`,
  `STRATEGY_REPAIR_BEAM_SEED`) all use the opt-in read-site convention `cfg && cfg.FLAG === true`
  **and** appear in `OPT_IN_FEATURES` — checked explicitly, because shipping the wrong convention
  is a repeat failure in this repository;
- the `SolveOpts` gate/min-scale overrides default to the production constants via `??`;
- the debug diagnostics are env-gated on `PF_*_DEBUG === '1'`;
- `__closeLengthGapForTests` is a test-only export.

That leaves exactly two production-default changes, both on the same mechanism: the promotion of
`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` to default-ON (`002b634fc`) and
`REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE` 10 → 6 (`ef0e509f5`).

## The A/B

Full Corpus 1 (102 levels), 50,000,000 node budget, 86,400,000 ms non-binding deadline, 2 workers,
one SHA, arms differing only by `--disable-flags=STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`.

The sparse ablation object is safe here: all three recently promoted flags
(`PRUNE_MC_NEIGHBOR_BUDGET`, `STRATEGY_MAIN_LOOP_LATE_RESERVE`, and this one) now read via the
standard `!cfg || cfg.FLAG` convention and none remain in `OPT_IN_FEATURES`, so disabling one does
not silently disable the others — the exact confound that invalidated the late-reserve population
A/B (`reports/2026-08-12-main-loop-late-reserve-population-ab.md`).

| arm | solved | nodes | canonical work |
|---|---:|---:|---:|
| flag ON (production) | 93/102 | 980,064,610 | 1,940,297,268 |
| flag OFF | **94/102** | 944,637,352 | 1,945,590,381 |

**Solved only with the flag OFF: `R00408`. Solved only with it ON: none.** Zero deadline-truncated
rows in either arm.

## Mechanism: the shrink starves the attempt that wins

`R00408`'s ordinary repair-probe tier reports `bestBadness = 13`. The adaptive controller therefore
scales the biased tier's budget by `max(0.35, 6/13) = 0.46`, cutting it from
`REPAIR_PROBE_BIASED_NODE_BUDGET = 6,000,000` to ~2,769,231 nodes.

| | flag ON | flag OFF |
|---|---|---|
| outcome | FAILED (`node-budget-reached`) | **SOLVED** |
| total nodes | 50,000,171 | 9,965,523 |
| attempts | 15 | 3 |
| biased-tier nodes | 2,769,260 (the shrunken cap) | 5,965,490 |
| biased-tier `bestBadness` | 15 | — (solved) |
| winning config | — | `dfs:repair:repair(mustTurnBiased)` |

The winning configuration **is** the must-turn-biased repair attempt. The controller cut precisely
that attempt's budget by 54%, to below what it needed, and the level then exhausted the full 50M
ceiling without solving. The heuristic's prediction — "high ordinary badness means the biased tier
will not help" — is self-fulfilling here, because acting on it removes the budget that would have
disproved it. The flag also costs 5x the nodes on this level (50.0M vs 9.97M) as a direct
consequence of turning a cheap solve into a budget exhaustion.

Determinism was verified in both directions: isolated single-level reruns (`--levels=pos:37`,
`--workers=1`) reproduced the full-sweep results **bit-identically** — the ON arm at `50,000,171`
nodes failed, the OFF arm at `9,965,523` nodes solved with the same winning config. The flip is
therefore not stochastic.

## Why this was not caught at promotion time

Neither change was ever evaluated on Corpus 1:

- `.github/workflows/solver-repair-probe-adaptive-sample-ab.yml` hardcodes
  `--corpus=data/stress/stress-levels-random.json`, and `select-repair-probe-adaptive-sample.mjs`
  defaults to the same file — the gate 10→6 sweep was Corpus-2 only;
- the flag's own promotion evidence was a local n=12 pilot plus a 300-level stratified **Corpus-2**
  A/B (net +1, `R02719` gained);
- `solver:bench --check` covers the published corpus, where the ledger records **0 eligible
  levels** (none are both repair-gated and must-turn-carrying).

Corpus 1 has **12 eligible levels**, and none appeared in any arm of either change. The opt-in
ledger already flags the promotion as "a deliberate deviation from this ledger's usual bar" and
notes the constants are "still derived from the original n=12, not re-derived at the larger sample
size." A Corpus-1 regression is exactly the shape of miss that evidence base permits.

## Corpus-1 eligible population, at the real gate

Produced with `repair-probe-badness-report.mjs` after fixing its hardcoded `CURRENT_GATE = 10`
(it had been reporting against the pre-promotion gate on every capability refresh since 08-13):
**5 of 12 shrink at gate 6**, not the 4 the stale constant reported.

| level | ordinary badness | outcome | scale @10 → @6 |
|---|---:|---|---|
| S00030, R01075, R01696 | 2 | solved | 1.00 → 1.00 |
| R00197, R00581 | 3 | solved | 1.00 → 1.00 |
| R01830 | 4 | solved | 1.00 → 1.00 |
| R01620 | 6 | failed | 1.00 → 1.00 |
| R01271 | 7 | solved | 1.00 → 0.86 |
| **R00408** | 13 | **failed** | 0.77 → **0.46** |
| R00526 | 15 | failed | 0.67 → 0.40 |
| R00771 | 16 | solved | 0.63 → 0.38 |
| R01195 | 27 | failed | 0.37 → 0.35 |

`R01271` is the only level whose shrink *status* changed with the gate promotion, and it still
solves — so the 10→6 change alone did not cause this. `R01620`'s scale is 1.00 at both gates, so the
mechanism is inert for it. `R00526` is one of the four ETT-013 pathology parents, confirmed unsolved
at 50M independently of this flag.

## What this does and does not establish

It establishes that the flag costs one real Corpus-1 solve, through a fully traced mechanism, at
production settings, reproducibly.

It does **not** establish that the flag is net-negative overall. Its Corpus-2 evidence is a genuine
+1 on a 300-level stratified sample, and no full-population Corpus-2 A/B of the flag has ever run.
The population picture is now mixed: +1 on 300 sampled Corpus-2 levels, −1 on all 102 of Corpus 1.

Both arms were run once each over the full corpus (deterministic mode, non-binding deadline, zero
truncated rows), and both directions of the `R00408` flip reproduced bit-identically in isolated
single-level reruns, so the flip is not stochastic — but the corpus-wide totals come from a single
pass per arm.

One measurement caveat: this local ON arm scored 93/102 where CI sweep #39 scored 94/102. The
Corpus-1 badness distribution matched CI exactly (12 eligible; buckets 6/2/2/1/1; biased-solved
3/0/0/0/0), so the eligible population behaved identically and the extra local failure is on a
non-eligible level — a host artifact, not this regression. The **delta** attributable to the flag is
−1 in both settings, which is what reconciles #38's 95 with #39's 94.

## Suggested follow-ups

1. **A full-population Corpus-2 A/B of the flag at the real gate 6.** It has never run; the
   promotion rests on 300/1700 stratified plus n=12. Run #39's Corpus-2 diagnostic already lists 10
   levels that were shrunk, failed, and finished within `biasedBestBadness <= 3` — candidate
   `R00408`s, and that list was itself computed against the stale gate.
2. ~~**Make the shrink recoverable rather than terminal.**~~ **Built and confirmed on this level
   (2026-08-14)** as `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY`, opt-in and default OFF — see the
   section below.
3. **Add Corpus 1 to the repair-probe A/B workflows.** A mechanism whose whole eligible population
   is "repair-gated and must-turn-carrying" cannot be validated on a corpus chosen without regard to
   that predicate, and the published corpus has zero eligible levels.

---

## Follow-up: `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY` (built 2026-08-14, opt-in, default OFF)

The recovery tier re-runs each shrunk biased config at its full probe budget, but only after the
main loop, repair fallback and attraction-diversity pass have all failed.

**Placement is the design.** An immediate retry inside the probe would cost `granted + full` on
every level whose shrink was *correct* — strictly worse than never shrinking, destroying the
mechanism's entire reason to exist. Running last inverts that: levels that go on to solve elsewhere
keep the full saving (the recovery never runs), and the recovery's cost lands only on levels already
burning their whole ceiling.

### Confirmed on `R00408`

| arm | outcome | total nodes | recovery-tier nodes |
|---|---|---:|---:|
| flag OFF (production today) | FAILED (`node-budget-reached`) | 50,000,171 | — |
| recovery, reserve = withheld difference | FAILED | 50,000,224 | 2,812,495 |
| recovery, reserve = full debt | FAILED | 50,000,224 | 5,624,791 |
| **recovery, reserve honored as a floor** | **SOLVED** | **37,840,699** | **5,965,490** |

The final run's recovery attempt consumed **5,965,490** nodes — byte-identical to the winning
attempt's node count in the flag-OFF A/B arm — and won with `dfs:repair:repair(mustTurnBiased)`.
That exact match is the trajectory-extension property holding in practice: the re-run replays the
granted prefix and continues into precisely the search the shrink cut off. The level also stops
~12.2M nodes short of its ceiling instead of exhausting it, so the admissible-order tier never runs.

### Two corrections found only by end-to-end testing

Both were invisible to unit tests and to reasoning, and both made the tier fire and still fail:

1. **The reserve must fund the FULL budget, not the withheld difference.** `repairSearchFromGate`
   has no resume API, so the re-run replays from scratch; repaying `full - granted` left the tier
   2,812,495 nodes against the 5,965,490 needed. It is now sized to the actual debt and carved as a
   peer of `admissibleOrderNodeReserve` rather than nested inside `mainLoopLateReserve`, which at
   6,000,000 nodes per tier is structurally too small to fund it.
2. **The reserve must be a floor, not a derived remainder.** Node checks here are round-granular and
   may overshoot by up to one attempt's own cost; a single main-loop attempt on this level is 24.4M
   nodes and overshot its reduced ceiling by ~375,000, taking that straight out of the reserve and
   leaving 5,624,791 — a failure by ~340,000 nodes. The tier now takes
   `max(plain remainder, reserve)`, still hard-bounded by the true external `nodeBudget`.

A third, unrelated gap surfaced on the way: the new `repairProbeShrinkRecovery` attempt flag was
being dropped before it reached persisted reports, because `portfolio-solve-sweep-lib.mjs` projects
an explicit field list — the same drop-before-persist shape CLAUDE.md documents for `admissibleOrder`.

### Verified, and not

Verified: the mechanism recovers `R00408`; the default-OFF path is byte-identical to the pre-change
baseline (FAILED at exactly 50,000,171 nodes), so the budget-arithmetic restructure is a strict
no-op for every production path and existing A/B arm; 6 unit tests plus the 77-test orchestration
suite pass.

Not verified: anything at population scale. This is n=1 — the level the mechanism was designed
against — so it demonstrates the mechanism works, not that it is net-positive. It stays opt-in and
default OFF until a dedicated A/B on **both** corpora, and Corpus 1 must be in an arm this time. Run
#40's corrected Corpus-2 diagnostic supplies a natural candidate population: 13 levels that were
shrunk, failed, and finished within `biasedBestBadness <= 3` (`R01063`, `R01485`, `R01822`, `R02112`,
`R02170`, `R02327`, `R02360`, `R02611`, `R02643`, `R02963`, `R02979`, `R03136`, `R03153`).
