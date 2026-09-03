# STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: independent confirmation preflight

> **Status:** inconclusive
> **Last evidence:** 2026-09-02 — control run [`33692825450`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33692825450) and treatment run [`33692832891`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33692832891): **identical 84/150 solved sets in both arms** — zero gains, zero losses, every solved id the same. Work moved +0.76% (treatment slightly higher) and nodes −0.17% (treatment slightly lower); both differences are noise-level, not a directional signal.
> **Decision:** per the frozen acceptance rule below (zero losses + zero gain), do **not** promote. `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` stays ACTIVE/opt-in. This does not contradict or reopen the development A/B's clean positive (`R00355`) — it means this independently-drawn population simply never gave the mechanism a level where it was the deciding factor, a legitimate and pre-anticipated outcome (see this report's own "Population" section below), not evidence the mechanism doesn't work.
> **Remaining gate:** a second fresh cohort (or a reach-characterized one, mirroring the development population's own selection logic but on still-unmined ids) before promotion is revisited. Not scheduled as of this writing — no standing rule requires immediate pursuit of a third population, and the mechanism's zero live-play risk when off means there is no urgency.
> **Evidence role:** confirmation (population independently drawn, excluding every id this session has previously mined for this mechanism or any nearby one) — concluded null
> **Selection:** 150-level Corpus-2 sample, drawn by `select-random-sample.mjs` with a fresh seed, excluding the union of every id this session already touched for this line of work (EW1's 60-level sample, `static-portfolio-confirmation-001/002/003`'s 450 combined ids, and the development A/B's own positions-1-150 range — 617 ids total, 0 overlap with the new draw). This is a genuine independent test, not development evidence with a new label.

## Why now

[`The development A/B`](2026-09-02-goal-attraction-disabled-retry-fresh-work-pool-development-ab-preflight.md) found a clean, mechanism-confirmed positive result (+1/-0, `R00355` gained on a local reproduction that showed the tier going from zero dispatches to a winning dispatch), but that population (Corpus-2 positions 1-150) was explicitly chosen for likely reach — this session's own `additive-tier-participation-audit.mjs` had already characterized that exact range as reaching most late-ladder additive tiers. Per that report's own pre-declared acceptance framing and `docs/solver-opt-in-experiment-ledger.md`'s entry for this flag, a positive development result nominates the mechanism for independent confirmation; it does not itself promote anything. This report is that confirmation.

## Candidate arms

Identical to the development A/B, unchanged (not re-tuned after seeing the development outcome):

| arm | flags |
|---|---|
| control | `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` |
| treatment | `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE,STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` |

Both arms enable the tier's existing closed node reserve for the same reason the development A/B did: without it the tier is essentially never eligible at all, so testing the fresh work pool's own marginal value requires the node dimension already fixed.

## Population

150 levels, Corpus 2 (`data/stress/stress-levels-random.json`), independently drawn (`data/stress/goal-attraction-fresh-work-pool-confirmation-001-population.json`, ids in `data/stress/goal-attraction-fresh-work-pool-confirmation-001-ids.txt`, both committed for reproducibility):

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=150 --seed=goal-attraction-fresh-work-pool-confirmation-001 \
  --exclude-ids-from=data/stress/goal-attraction-fresh-work-pool-confirmation-001-exclude-ids.json \
  --out=data/stress/goal-attraction-fresh-work-pool-confirmation-001-population.json
```

The exclude list (`data/stress/goal-attraction-fresh-work-pool-confirmation-001-exclude-ids.json`, 617 ids) is the union of every id this session drew for this line of work or the adjacent static-portfolio program that ran in parallel on the same corpus: EW1's 60-level sample (`reports/stress/ew1/33156541827-pricing-snapshot.json`), `static-portfolio-confirmation-001/002/003`'s three 150-level populations (450 ids, already mutually disjoint), and the development A/B's own 150-level positions-1-150 range. This is deliberately broader than strictly necessary (the static-portfolio ids were never used to test this mechanism) to avoid any risk of a level this session has already looked at closely enough to have opinions about its behavior. No population-size risk from the exclusion: 1700 total in Corpus 2, 617 excluded, 150 drawn from the remaining 1083 with zero overlap (verified programmatically).

Unlike the development A/B, this range was **not** chosen for likely reach of `goal-attraction-disabled-retry`'s own gate — it is an ordinary random draw. A null result here is a legitimate possible outcome (this population might simply not reach the tier's gate often, or reach it but not have this tier's own beam action be the rescuer), and per the acceptance rule below is not automatically a mechanism-level negative.

## Envelope

Identical to the development A/B: `node_budget=50,000,000`, `strict_total_work_budget=false` (ordinary additive-tier semantics — a strict cap would change the mechanism under test), all other workflow inputs left at default.

## Acceptance rule (frozen before either arm runs)

Per `docs/solver-evaluation-evidence.md`'s promotion table ("one prespecified narrow treatment with little/no tuning" may promote after confirmation alone, without a further cross-generator transfer step, given the mechanism's own zero live-play risk when off and the development A/B's own clean mechanism-level attribution):

- **Zero losses AND at least one gain:** promote — remove `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` from `OPT_IN_FEATURES` in `ablation-config.ts`, flip its application check from `cfg && cfg.FLAG === true` to `!cfg || cfg.FLAG`, matching every other default-ON gate (the same promotion mechanics `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` used).
- **Zero losses AND zero gain (clean null):** do not promote yet. This does not itself reopen or contradict the development A/B's clean positive (a random population may simply not reach the tier's own winning gate on any level), but it means the mechanism's real-world value is population-dependent and not yet broad enough to promote on the strength of one development result alone. Leave the flag ACTIVE/opt-in, update the ledger to record both results, and require a second fresh cohort (or a targeted reach-characterized one, mirroring the development population's own selection logic but on unmined ids) before revisiting promotion.
- **Any loss:** stop. Root-cause the loss before any further step, per this program's own standing rule that a clear negative closes the tested form absent a materially new premise. Do not promote.

## Reproduction

Workflow: `solver-level-blind-targeted-sweep.yml`, `ids_file=data/stress/goal-attraction-fresh-work-pool-confirmation-001-ids.txt`, `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=false`.

- Control dispatch: `enable_flags=STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`
- Treatment dispatch: `enable_flags=STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE,STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`

Both dispatches share `solver-level-blind-targeted-sweep.yml`'s own concurrency group, so they run sequentially (control first), same as the development A/B.

Dispatched: control run [`33692825450`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33692825450), treatment run [`33692832891`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33692832891), both at commit `a91ee876`.

## Result

Both arms ran to completion, all 38/38 shards succeeding in each, recovered from the "Combine shard results" job's own console log (raw artifact blob-storage download remains blocked by this session's egress policy):

| arm | solved | work | nodes |
|---|---:|---:|---:|
| control (node reserve only) | 84/150 | 17,663,608,300 | 14,522,972,548 |
| treatment (node reserve + fresh work pool) | 84/150 | 17,797,383,944 | 14,498,883,356 |
| delta | **0** | +0.76% | −0.17% |

**Gained:** none. **Lost:** none. The two 84-id solved lists are identical — verified programmatically by set difference on the full solved-level lists from each arm's job log (both directions empty, both sets exactly 84 members with no internal duplicates). Work moved slightly higher in treatment, nodes slightly lower; both are noise-level (well under 1%) and don't form a directional pattern the way the development A/B's own small movement did.

### Interpretation

This is a **clean null**, not a contradiction of the development A/B. The two results are answering different questions on different populations:

- The development A/B's population (Corpus-2 positions 1-150) was deliberately chosen because this session's own `additive-tier-participation-audit.mjs` had already characterized that exact range as reaching most late-ladder additive tiers — i.e., a population selected for likely mechanism engagement.
- This confirmation's population was an ordinary independent draw, with no such selection. It is entirely possible — and, per this report's own pre-declared "Population" section, explicitly anticipated — that a plain random 150-level sample simply doesn't reach `goal-attraction-disabled-retry`'s own gate often enough, or reach it in a state where the fresh work pool specifically (as opposed to the already-closed node reserve, which both arms share) is the deciding factor for any level in this particular draw.

Per the frozen acceptance rule, a null here does **not** retroactively invalidate the development A/B's own mechanism-level attribution (the local `R00355` reproduction that showed the tier going from zero dispatches under the shared pool to a winning dispatch under the fresh pool) — that was a direct, code-level demonstration of the mechanism working when engaged, not a population-scale coverage claim. What this null establishes is only that the mechanism's *population-level* value is not broad enough to show up on every 150-level draw, which is exactly why the acceptance rule required confirmation before promotion rather than promoting off the development result alone.

### Disposition

**Do not promote.** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` remains ACTIVE/opt-in, default OFF, zero live-play risk. Record both results (development: +1/-0 mechanism-confirmed positive; confirmation: clean null) in the ledger. A third population is the natural next step if this line is picked up again, but is not itself urgently required — the flag's real interactive callers already zero `diversityBudgetFraction`, so leaving it opt-in costs nothing today.
