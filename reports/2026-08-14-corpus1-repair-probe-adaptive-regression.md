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
#40's corrected Corpus-2 diagnostic nominates 13 levels where the shrink fired and the biased tier
then missed within `biasedBestBadness <= 3` (`R01063`, `R01485`, `R01822`, `R02112`, `R02170`,
`R02327`, `R02360`, `R02611`, `R02643`, `R02963`, `R02979`, `R03136`, `R03153`).

**Read that list carefully**: the report's "failed" means the *biased tier* did not itself win, NOT
that the level failed. Measured directly at 50M nodes with the recovery off, **7 of the 13 already
solve** by other tiers (`R01063`, `R01822`, `R02112`, `R02327`, `R02360`, `R02611`, `R03136`), so the
recovery can only possibly gain on the 6 that do fail (`R01485`, `R02170`, `R02643`, `R02963`,
`R02979`, `R03153`) — and the 7 solvers are regression candidates, since the reserve shrinks the main
loop's ceiling on every eligible level. The sample is also selected for near-misses, so it is biased
toward showing benefit and cannot detect losses among the other 1,687 Corpus-2 levels.


## A/B result: Corpus-2 selected population (2026-08-14) — negative

Matched level-blind A/B at one SHA over the 13 nominated Corpus-2 levels, 50,000,000 node budget,
86,400,000 ms non-binding deadline, 2 workers, arms differing only by
`--enable-flags=STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY`.

| arm | solved | nodes | canonical work |
|---|---:|---:|---:|
| control | 7/13 | 354,745,610 | 655,020,227 |
| treatment | 7/13 | 354,745,718 | 779,086,308 |
| delta | **0 gained, 0 lost** | +108 (+0.0%) | **+18.9%** |

**The mechanism worked exactly as designed and gained nothing.** The recovery tier fired on precisely
the 6 failing levels — one attempt each, every one granted the full `REPAIR_PROBE_BIASED_NODE_BUDGET`
of 6,000,000 nodes (`R01485` 6,000,013, `R02170` 6,000,003, `R02643` 6,000,003, `R02963` 6,000,000,
`R02979` 6,000,002, `R03153` 6,000,000) — and correctly did not fire on any of the 7 that already
solve. None of the six solved with the restored budget.

Total nodes are effectively unchanged (+108) because these levels are node-capped either way: the
reserve *reallocated* ~36M nodes from earlier tiers into the recovery tier rather than adding any,
which is the reserve design behaving correctly. The +18.9% canonical work at flat nodes is the
work-meter distinction CLAUDE.md documents — repair search charges far more work per node than the
tiers it displaced.

### Interpretation

On the population most favorable to it — levels selected precisely because the shrink fired and the
biased tier then came within `biasedBestBadness <= 3` — restoring the full budget gains nothing and
costs ~19% more work. `R00408` remains the only known level this mechanism rescues.

This is consistent with the plateau finding already recorded for
`STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` in the opt-in ledger: 26/26 fallback attempts burned their
entire allotted ceiling while stalled at `bestBadness` 10-43, because `repairSearchFromGate`
converges fast and then plateaus for most of any budget it is given. These six levels look like the
same shape — reaching a near-miss badness and then not closing, whether the tier holds 2.8M nodes or
6M. The shrink was not what stopped them.

**Standing: sound, correctly targeted, n=1 evidence of benefit, measured cost.** That is not a
promotion case. The mechanism remains opt-in and default OFF.


## A/B result: Corpus-1 full population (2026-08-14) — +1, no losses

Same protocol, all 102 Corpus-1 levels.

| arm | solved | nodes | canonical work |
|---|---:|---:|---:|
| control | 93/102 | 980,064,610 | 1,940,297,268 |
| treatment | **94/102** | 967,905,406 | 1,979,044,792 |
| delta | **+1 gained, 0 lost** | −1.24% | +2.00% |

**Gained: `R00408`. Lost: none.** The recovery tier fired on 3 levels — `R00408` (5,965,490 nodes,
solved), `R00526` (6,000,011, still failed) and `R01195` (6,000,032, still failed). `R00526` is a
known ETT-013 pathology parent that fails at 50M independently of this flag.

Node count *fell* 1.24% because `R00408` now finishes at 37.8M instead of exhausting 50M — the gain
pays for itself in nodes on that level. Work still rises 2.00%, since the two non-gaining recovery
attempts spend 12M repair nodes at repair's higher work-per-node.

The control arm reproduced the pre-change run byte-identically across all 102 levels (93/102,
980,064,610 nodes, 1,940,297,268 work, same nine unsolved ids), which is a considerably stronger
statement of the default-OFF no-op than the earlier single-level check.

## Combined verdict: do not promote

| population | control | treatment | gained | lost | work |
|---|---:|---:|---|---|---:|
| Corpus 1 (102) | 93 | 94 | `R00408` | none | +2.00% |
| Corpus 2 (13 selected) | 7 | 7 | none | none | +18.9% |

The mechanism is **safe** — zero losses across 115 levels — and **correctly targeted**: it fires only
on shrunk tiers, always at the full restored budget, and never on levels that already solve. But it
gains exactly one level: the one it was designed against. On the Corpus-2 population chosen to be
maximally favourable to it, it gains nothing and costs ~19% more work.

Against this repo's own promotion rules, two are unmet: the motivating effect has not survived a
held-out family test (rule 2), and full-corpus gained/lost IDs are not reported for Corpus 2 — 13 of
1,700 is not a population (rule 6). Rule 4 is arguable at best: work rose in both populations, bought
by a single solve.

**A simpler alternative achieves the same Corpus-1 result.** `R00408` is lost because
`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` was promoted; turning that flag back off also yields
94/102 (measured, same day, same protocol) with no new mechanism, no new reserve tier and no added
work. The recovery's advantage over that revert is narrow and unmeasured: it preserves the adaptive
budget's own Corpus-2 gain (`R02719`, from a 300-level sample) while adding work everywhere the
recovery fires. Neither option has full-population Corpus-2 evidence.

The decision that would settle it is a full 1,700-level Corpus-2 A/B of three arms — adaptive budget
ON (today), ON + recovery, and OFF — which is the only way to compare the work cost against the real
gain count. Until then the recovery stays opt-in and default OFF, and the underlying question of
whether the adaptive budget should keep its default-ON status remains open.


---

## Three-arm Corpus-2 A/B (2026-08-14) — decisive; recovery closed, adaptive budget vindicated

Run on the **entire eligible population** rather than a sample: all 512 Corpus-2 levels that are
repair-gated AND carry a must-turn cell, plus a 50-level control stratum from the ineligible
remainder. 562/562 coverage in every arm, 22/22 jobs green, `deterministic=true`, 50M node budget,
one SHA (`c5d804cfc`), seed `three-arm-2026-08-14`. **492 of the 562 actually produced a biased
tier** — so these gained/lost sets are the complete ones for the affected population, not estimates.

| arm | solved | nodes | canonical work |
|---|---:|---:|---:|
| 1. baseline (adaptive budget ON — today's production) | **192**/562 | 20,163,998,248 | 31,053,096,575 |
| 2. + `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY` | 191/562 | +0.07% | **+13.14%** |
| 3. `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` OFF | 190/562 | +2.07% | **+15.02%** |

| comparison | net | gained | lost |
|---|---:|---|---|
| arm 2 vs baseline | **−1** | none | `R00094` |
| arm 3 vs baseline | **−2** | `R02961` | `R02258`, `R02663`, `R02719` |

### The recovery mechanism is closed

On the population it was built for, the recovery gains **nothing** and **loses `R00094`**, at +13.14%
work. That loss is the predicted failure mode arriving: the reserve withholds nodes from the main
loop on every eligible level, and on `R00094` the main loop needed them. The mechanism is not merely
ineffective here — it is net-negative.

Across both corpora it nets to zero solves: +1 on Corpus 1 (`R00408`) and −1 on Corpus 2 (`R00094`),
for +2.00% and +13.14% work respectively. **Do not promote.** The single Corpus-1 gain does not
survive contact with the wider eligible population, which is precisely the check that n=1 evidence
could not provide.

### The adaptive budget is vindicated, and my earlier recommendation was wrong

Arm 3 falsifies the "simpler alternative" this report previously recommended. Turning
`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` back off does reach 94/102 on Corpus 1, but at
population scale on Corpus 2 it costs a net **2 levels** and **15% more work**. Three levels depend
on the flag — `R02719` (the original 300-level A/B's claimed gain), `R02663` (the gate 10→6 sweep's
gain), and `R02258`, which no prior evidence had identified — all now confirmed over essentially the
whole eligible population rather than a 300-level subsample.

So the flag's default-ON status is considerably better evidenced than it was before this
investigation, and the right disposition is to **keep it and accept `R00408` as a known cost**. The
earlier framing — "+1 on 300 sampled Corpus-2 levels, −1 on all of Corpus 1, so the picture is
mixed" — is superseded: it is +3/−1 on the full eligible Corpus-2 population against −1 on Corpus 1.

### What remains open

`R00408` is still a real, fully-traced loss, and the 10 near-miss levels in the RISK list still show
the shrink cutting tiers that finish within `biasedBestBadness <= 3`. What this A/B establishes is
that *restoring the budget* is not the fix — consistent with the `repairSearchFromGate` plateau that
closed `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE`. Any future attempt should target the plateau itself,
not the allocation.
