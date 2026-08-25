# Repair restart versus continuation audit

> **Status:** concluded-positive premise / open matched-work decision
> **Last evidence:** 2026-08-24 — current repair implementation, Aug-23 cap/census evidence, Aug-23 multi-seed promotion, scheduler policy
> **Decision:** seed diversity is real capability, and same-seed deep continuation is also real capability. The remaining restart question is therefore **allocation**, not whether restarts work: on runs still unsolved at work `t`, is the next fixed work quantum better spent continuing the same repair call or starting a fresh seed?
> **Remaining gate:** one prespecified equal-aggregate-work continuation-vs-fresh-seed comparison, initially isolated/forensic; production scheduling remains blocked on the general predecessor-state/accounting issue and current fixed-work scheduler program.
> **Evidence role:** forensic / experiment-design
> **Selection:** observational synthesis of current code and already-run experiments; no new outcome data generated here

This report audits queue item #6's **restart/randomization** half. It is intentionally separate from [`2026-08-24-learned-failure-reason-language-audit.md`](2026-08-24-learned-failure-reason-language-audit.md), because the two halves now point toward different experiments.

Current allocation policy remains [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md). This report does not grant repair more budget and does not change solver behavior.

## Executive result

The repo already contains decisive evidence against both simple extremes:

- **“Just keep continuing the same repair trajectory.”** False as a general rule. Different deterministic PRNG seeds produce real exclusive rescues. The newly promoted late-probe multi-seed retry gained five levels on its measured 73-level loss population, and earlier repair-probe calibration also found salt-specific rescues.
- **“If repair has not solved quickly, restart instead of continuing.”** Also false as a general rule. The isolated census shows plain repair continues producing substantial unique hard-gap wins throughout the 50M-node range; 37/121 measured repair wins occur only after 20M, and 57/121 only after 10M.

Those facts make the real decision a classic continuation-value comparison:

> Conditional on a repair action having consumed `t` work without solving, which use of the next `Δ` work has greater marginal value: preserve the current call's search history and continue it, or reset the call and spend `Δ` on a different seed?

I found no current Pathfinder experiment that answers that question directly under an equal aggregate work envelope.

## 1. “Restart” has three different meanings in the current system

Conflating these would create an invalid experiment.

### 1.1 Internal repair restart

[`../modules/solver/repair-search.ts`](../modules/solver/repair-search.ts) is already an iterated-local-search/restart algorithm. One `repairSearchFromGate` call performs many restart iterations. Across those iterations it retains call-local search state including:

- an 8-entry elite near-miss pool;
- splice history/opportunity;
- best-badness and stagnation state;
- forced fresh-restart bursts;
- epsilon cycling;
- the repair-local dead-end cache when enabled;
- other opt-in/research state when relevant.

The search deliberately alternates fresh-from-gate exploration and elite-spliced restarts. A “continue repair” action therefore already contains many internal restarts. It is not a single random walk being prolonged.

### 1.2 Fresh `seedSalt` repair call

`repairSearchFromGate(..., seedSalt)` deterministically derives a different primary PRNG stream from `(startKey, seedSalt)`. A new call also constructs a new work state, elite pool, stagnation history, and repair-local cache.

This is the meaningful **fresh restart** for scheduler research: same level/gate/config and search algorithm, but a genuinely independent deterministic trajectory with no inherited call-local repair experience.

The 2026-08-24 canonical scheduler identity change correctly treats repair seed salt as part of action identity while leaving gate and budget as separate dimensions. That is exactly the right representation for this experiment.

### 1.3 Different deterministic config/tie-break action

Changing profile/template/beam/admissible ordering is not a repair seed restart. It is a different portfolio action. Its value belongs in queue #1/#3 action scheduling/configuration analysis even if the motivating intuition is “diversify search.”

Queue #6's cleanest restart test should therefore begin with **repair seed restart**, where independent trajectories are already an explicit supported concept.

## 2. Fresh seeds have demonstrated exclusive capability

### Early repair probe

The repair probe originally expanded to multiple seed salts after direct races showed a parent level plus three rotated siblings could all be rescued by a different seed within the standard node budget.

That first wide version was not free. Five salts made the published corpus roughly 14% slower because one unrescued repair-gated level burned every added seed before falling through. It was narrowed to `[0,1,2]`, then after the elite-splice repair changed the calibration, narrowed again to `[0,1]`: only P00145 still needed salt 1, while the other recalibration levels solved cheaply on salt 0.

This is useful evidence for both sides of the current question:

- independent seeds can rescue deterministic misses;
- seed width has a real failed-work tax;
- the optimal width depends on the behavior of the underlying repair call, so old seed-count constants are not timeless entitlements.

### Late repair probe

The current late-probe result is stronger and much fresher.

`STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` extends the late repair probe from salt 0 to salts `[1,2,3,4,5,6,7]`. In the Aug-23 population-scale targeted A/B:

- measured 73-level loss population: **18/73 -> 23/73**, five gains, zero losses;
- 90-level gain population: **90/90 -> 90/90**;
- published corpus: **160/160 unchanged**.

This proves that fresh repair seeds are not decorative randomness. They expose capability the salt-0 call does not reach under its allocated budget.

However, the treatment is deliberately **additive and dead-last**. Each extra seed receives its own full late-probe budget. Current stage-budget code reserves `7 * REPAIR_LATE_PROBE_NODE_BUDGET`; after the Aug-23 cap promotion that is potentially a very large hard-failure tail. The opt-in ledger explicitly says scheduler repricing is mandatory before further seed/budget expansion.

Thus the promotion establishes **marginal capability**, not efficient allocation at fixed total work.

## 3. Same-seed continuation also has demonstrated deep capability

The Aug-23 technique budget/cap analysis gives the opposite half of the equation.

Among the 888 frozen production-unsolved levels in the isolated technique census, plain repair has 121 full-budget gap solves distributed across the whole 50M-node range:

| cumulative cap | repair solves retained |
|---:|---:|
| 2M | 27 |
| 5M | 42 |
| 10M | 64 |
| 20M | 84 |
| 30M | 97 |
| 40M | 113 |
| 50M | 121 |

So:

- **57/121 (47.1%)** of those repair wins occur after 10M nodes;
- **37/121 (30.6%)** occur after 20M;
- the measured 20M-50M conditional yield is **37/804 = 4.6%** on the reported risk set.

The late tail is expensive, but it is real. Repair is the strongest current counterexample to “wins early or never.”

This curve is especially relevant to restart research because a larger cap on the same deterministic seed represents a continuation of the same repair process: the call retains elites, stagnation state and call-local dead-end memory while executing additional internal restarts. Under a node/work cap with the wall clock made a nonbinding safety net, the smaller-cap execution is a deterministic prefix of the larger-cap execution for that fixed action.

The existing census therefore already tells us that **continuing** can work. It simply does not tell us whether a fresh seed would have bought more solves with those same late nodes.

## 4. Why the existing positive restart result cannot answer the continuation question

The late multi-seed tier gives seven extra 5M-class opportunities after the ordinary late probe and every predecessor have failed. That changes total available tail work.

Suppose a level fails salt 0 after 5M and salt 1 solves after 3M. The current result proves salt 1 can rescue it. But it does not reveal whether salt 0 would also have solved between 5M and 8M, or whether some entirely different action would have done so more cheaply.

Likewise, the isolated 50M repair curve proves many salt-0 continuations eventually solve. It does not reveal whether restarting at 5M, 10M or 20M would have reached those solutions sooner or traded them for other exclusive wins.

The two existing result families are therefore complementary observations, not competing verdicts.

## 5. The correct risk-set framing

A restart comparison must be conditional on having survived unsolved to the decision point.

For a checkpoint `t` and extra quantum `Δ`, define the risk set as levels/gates/actions for which the fixed seed-0 repair call is still unsolved at `t` and has not naturally exhausted. Repair has no natural exhaustion state in current telemetry; failure is a budget/work stop, so every unsolved call is censored rather than exhausted.

Then compare two counterfactual uses of the **same next `Δ` work**:

- **Continue:** same seed/action, cap raised from `t` to `t+Δ`. Count only solves whose first solution occurs in `(t, t+Δ]` and charge only incremental work beyond the `t` prefix.
- **Restart:** preserve the already-spent `t` as sunk history, then run a new seed (for example salt 1) from scratch for at most `Δ`. Count its solves and actual capped work.

The scheduler decision is between these next quanta. Do not compare `seed0@10M` to `seed1@5M` as if the first five million nodes had never been spent.

## 6. Smallest value-of-information experiment

The repo does not need another restart mechanism to answer the premise. It needs a controlled table.

### Freeze the action

Hold constant:

- current code/commit;
- level and gate;
- repair profile/template and all feature flags;
- work/node accounting semantics;
- no historical hint/winner steering;
- wall clock high enough to be a safety deadline rather than the allocator.

Use deterministic node/work checkpoints so the same-seed executions are comparable.

### Start with checkpoints already meaningful in current evidence

A minimal first pass can use the existing late-probe scale rather than inventing a new constant:

- decision at `t = 5M`, `Δ = 5M`;
- optionally a second prespecified band at `t = 10M`, `Δ = 10M` if the first comparison has enough risk-set support.

These are **analysis checkpoints**, not proposed production caps.

At 5M, for every seed-0 survivor compare:

1. seed 0 through 10M, scoring only its 5M-10M incremental result;
2. fresh salt 1 through 5M.

If the action can be measured cheaply enough, salts 2+ may be treated as separate restart actions, but do not search many salts and report only the best without selection correction. Current salts 1-7 are already development-selected production arms and should be treated as such in any broad claim.

### Required output

For each checkpoint/arm report:

- risk-set size;
- incremental solves;
- paired continue-only / restart-only / both / neither counts;
- actual incremental `workSpent` and nodes;
- solve depth within the quantum;
- parent/family clustering where applicable;
- seed identity;
- baseline plateau telemetry if already available, but **not** as a steering rule in the first test.

The paired table is more informative than two aggregate solve rates. A 10-vs-10 tie with ten disjoint solve sets means something completely different from ten identical wins.

## 7. First decision rule should be static, not adaptive

There is tempting evidence for adaptive restart timing. Repair-stagnation studies found some hard levels improve quickly and then spend 85-99% of the remaining budget on a plateau; other experiments found repeated near-miss shapes across many internal restarts. A fresh seed is an obvious escape mechanism for such a basin.

Do **not** begin by learning a “restart when plateau telemetry says X” rule. That multiplies threshold and feature-selection surface before the basic economic premise is established.

First establish whether one fixed continuation/restart split has positive marginal value at equal work. Only then ask whether existing cheap telemetry such as:

- restarts since best improvement;
- best-badness slope;
- repeated plateau-shape concentration;
- elite-pool diversity;
- repair-local dead-end hit rate;

predicts which arm wins. Such a dynamic rule belongs in scheduler Generation B and requires untouched confirmation after tuning.

## 8. Interaction with repair-local memory

The comparison has a useful interpretation beyond PRNG diversity.

Continuing the same call retains:

- useful elites and splice opportunities;
- the call-local dead-end cache;
- stagnation history and fresh-burst schedule;
- exact PRNG continuation.

A fresh seed deliberately throws all of that away in exchange for a different basin of attraction.

So restart-vs-continuation measures a genuine exploration-memory tradeoff, not merely two integer seed values. If continuation wins late, that may be because accumulated repair experience matters. If restart wins, that is direct evidence that basin diversity outweighs the lost local learning at that checkpoint.

This also explains why “run more internal restarts” is not equivalent to a fresh seed. Internal restarts mostly operate inside an accumulated elite/cache ecosystem and use the same deterministic PRNG stream.

## 9. Production inference remains downstream of queue #0 and #1

An isolated direct-repair comparison is the cheapest clean premise test, but it is **nomination evidence** for production scheduling.

Two existing guardrails still matter:

1. The queue's unresolved cross-stage dependence means an action can behave differently fresh versus after predecessors because of resource/accounting context. Do not infer a live-ladder scheduler rule until that P0 issue is resolved or the production-shaped comparison explicitly controls the inherited context.
2. Restart allocation is a special case of the scheduler's fixed-envelope continuation-value problem. Even if fresh repair salt beats same-seed continuation, it must still compete against cheap beam screens, other repair configurations, admissible-order actions and rare specialists for the same next quantum.

Thus a positive isolated result should add **fresh repair seed** as a properly valued scheduler action, not automatically create another additive retry tier.

## 10. Existing evidence already constrains plausible outcomes

The likely answer is not a universal restart cutoff.

- Early-probe history shows extra seeds can be valuable but can also impose a large failed-work tax.
- Late-probe history shows seven additional seeds contain real residual capability.
- The census shows same-seed repair has unusually strong deep continuation value compared with most families.
- Repair plateau studies show some individual trajectories become structurally repetitive despite many internal restarts.

That combination predicts heterogeneous continuation value: some levels benefit from persistence, some from a fresh basin. The experiment should therefore preserve paired per-level outcomes even if the first production candidate is a simple static split.

## 11. Stop/go gates

**STOP the standalone restart lane** if a fixed-work comparison shows fresh seeds mostly reproduce same-seed continuation wins while adding no meaningful exclusive residual solves, or if their incremental solve/work is clearly dominated by other already-measured scheduler actions. Keep seed diversity only where already justified by production history and let queue #1 reprice it.

**GO to a simple scheduler action** if fresh restart shows reproducible exclusive value at competitive incremental work. Represent each bounded seed tranche as an action; do not grant an unbounded sequence of salts.

**GO to telemetry-conditioned restart timing only later** if both arms have meaningful, complementary wins and cheap pre-decision telemetry predicts that split on untouched confirmation data.

Do not build a general restart controller merely because heterogeneous outcomes exist. A fixed two-stage split may capture most of the value.

## Bottom line

Pathfinder no longer needs to ask whether repair restarts are useful. The answer is **yes**, in two opposite senses:

- preserving one repair call and letting it run deeply keeps finding hard solutions;
- resetting to a different seed also finds solutions the first trajectory misses.

The unresolved question is which one deserves the **next** unit of computation after failure so far.

That makes restart/randomization a narrow continuation-value experiment inside the scheduler program, not an independent mandate to add more random retries. The current seven-seed late tail is particularly valuable evidence and particularly important to reprice, because it proves diversity capability while also creating exactly the additive hard-failure budget that the new fixed-envelope scheduling rules are meant to discipline.
