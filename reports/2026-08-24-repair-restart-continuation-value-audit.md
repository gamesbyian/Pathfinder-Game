# Repair restart / continuation-value audit (2026-08-24)

## Decision

Pathfinder has strong evidence that **repair seed diversity contains real capability**, but it does **not** yet have evidence that restarting on a fresh seed is better than continuing an existing repair trajectory at the same aggregate work.

The next restart experiment should therefore be a fixed-work **restart-versus-continuation** comparison, not another additive seed tier and not another proof that “different seeds sometimes solve different levels.” That premise is already established.

This report is the restart/randomization half of queue item #6. The learned-failure half is `reports/2026-08-24-learned-failure-certificate-audit.md`.

## What is already established

### Early repair-probe seed diversity

On 2026-07-15, the ordinary repair probe was extended across additional PRNG seeds after `repair-direct-probe.mjs --races` showed that a parent level and three rotated siblings could all be rescued by a different seed within the standard node budget. That is direct evidence that one deterministic seed is only one sample from a high-variance repair distribution.

The first broad version used more seeds and made the published corpus about 14% slower because a repair-gated level burned every retry seed without being rescued. The seed list was then narrowed from five total seeds to three (`[0,1,2]`), preserving three of the four calibration rescues while bringing the full-corpus speed effect back to roughly a wash.

Relevant commits:

- `37dab58735a43eb62d91e452419e4bdcd73b4744` — extra repair-probe seeds after direct seed-race evidence;
- `699bb6538969525a9412b50192f0e11d1ac5db7b` — narrow the seed width after the full-corpus cost regression.

This is an important precedent: **seed diversity can add solves and can also impose a substantial failed-work tax**. Seed-count tuning is therefore an allocation problem, not a monotone capability knob.

### Late repair-probe multi-seed retry

On 2026-08-23, `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` added seed salts `[1..7]` after the original late probe's seed 0, with each extra seed receiving its own full `REPAIR_LATE_PROBE_NODE_BUDGET` reserve. The implementation note explicitly described this as up to roughly **35M additional node reserve per reached level**.

Population A/B at the production 50M work/node budget reported:

- 73-level loss population: **18/73 -> 23/73**, +5 gains, 0 losses;
- 90-level gain population: 90/90 -> 90/90;
- published corpus: 160/160 unchanged because the dead-last tier was not reached there.

Relevant commits:

- `6406ea92e987bb08665dccaa73b7a1d9ae81f7e3` — build the seven-extra-seed late tier;
- `fb8c628ca7429af6aa69952f6deda8b8a68801fb` — promote after the population A/B.

The +5 is genuine capability evidence for alternate repair trajectories. It is **not** fixed-work evidence. The treatment enlarged the action menu and the amount of work available after prior failure. Zero losses on already-solved populations prove dead-last placement safety, not zero cost on the hard residual population.

The current opt-in ledger has already been reconciled to state this correctly: the multi-seed treatment can buy substantial additive tail work, and scheduler repricing is mandatory before further expansion.

## The missing causal question

The central unanswered question is:

> After repair has consumed W work without solving, what is the value of giving the same repair call another ΔW versus starting a fresh macro-seed and giving that new trajectory ΔW?

This is not answered by the additive experiments above.

A fresh macro-seed changes more than the next random number:

- it changes the complete deterministic PRNG trajectory;
- it restarts the repair call's elite pool and stagnation history;
- it restarts the repair-local experience/nogood cache;
- it restarts any plateau/relink/reconstruction state scoped to that call;
- it may therefore gain basin diversity while discarding useful accumulated search state.

A continuation retains all of those learned/accumulated structures but follows the same macro-seed's future random stream.

So “new seed” and “continue” are genuinely different actions, not merely two budget slices of one homogeneous runtime distribution.

## Two restart scales must be kept separate

Repair already contains **internal restarts** inside one `repairSearchFromGate` call. The multi-seed tiers add a second, coarser restart scale: a brand-new repair call with a different `seedSalt`.

Therefore the scheduling vocabulary should distinguish:

1. **intra-call continuation** — more work under the same macro-seed, retaining elites/cache/stagnation state;
2. **intra-call restart events** — repair's own existing randomized restart mechanism, part of that continuation policy;
3. **macro-seed restart** — start a new repair call from scratch with a new seed salt;
4. **fresh alternative action** — leave repair entirely and start another solver family/config.

Historical “restart” language is ambiguous unless it identifies which scale is being discussed.

## Smallest value-of-information pilot

Use existing repair-late-probe-eligible development levels and a **fixed aggregate work envelope**. Do not choose the cohort from which seed happened to win after inspecting the new arms.

For each level, compare a small prespecified set of policies such as:

- **continue-1:** one seed gets the entire envelope W;
- **split-2:** two macro-seeds get W/2 each;
- **split-4:** four macro-seeds get W/4 each;
- **split-8:** eight macro-seeds get W/8 each;
- optionally one geometrically staged policy such as `W/4 + W/4 + W/2`, where later work is assigned only if earlier seeds fail.

The exact W should be chosen from an existing production-relevant repair tranche, not tuned on the same comparison population.

Every arm receives the same total `workSpent` ceiling. Record whether a seed/call naturally exhausts, although repair is expected to be predominantly budget-censored rather than naturally exhaustive.

Do **not** compare current production's seed0 + seven full extra reserves against seed0 alone and call that restart efficiency. That reproduces the already-known additive-capability question.

## Required outputs

For each arm report:

- cold solves;
- paired gains/losses relative to continue-1;
- total and per-level `workSpent`;
- solve-work distribution / work to first solve;
- which solutions are exclusive to higher seed counts;
- fraction of levels solved by seed index / tranche;
- uncertainty across independent levels/parents;
- if feasible, a few independent research seeds for the *policy experiment itself* so one lucky fixed list of seed salts is not mistaken for a robust policy.

For continuation-value interpretation, construct a risk set at each tranche boundary: only levels still unsolved and still eligible for more repair work belong in the denominator for the next tranche.

## What would support more restarting

Macro-seed restart earns more production share if, at equal total work:

- split policies solve materially more levels than continue-1;
- the benefit recurs across unrelated parents rather than a few selected seed-sensitive cases;
- gains are not purchased by losing a similarly valuable long-tail continuation population;
- extra seed arms retain non-trivial conditional solve yield after earlier seeds fail;
- the effect survives untouched confirmation.

If split-2 captures essentially all restart benefit, do not retain eight macro-seeds merely because seeds 6 or 7 once produced an additive winner under a much larger total budget.

## What would support continuation

Continuation deserves more work if:

- solve hazard remains meaningful at later same-seed tranches;
- splitting the envelope causes losses because each seed is starved before repair's elite/stagnation machinery becomes useful;
- seed diversity helps only when total work is enlarged;
- later seed indices mostly burn work on the same residual levels without unique wins.

That result would not invalidate the +5 additive multi-seed evidence. It would say those five solves are expensive tail capability whose production inclusion must be judged against other uses of the same 35M work.

## Interaction with the repair experience cache

The shipped repair-local failed-state cache makes the comparison especially informative.

Within one call, continuation retains a cache whose measured terminal-signature recurrence was 53.65%-98.09% on the targeted hard sample. A macro-seed restart discards that cache and starts fresh. Thus a continuation can exploit accumulated duplicate-work suppression while a new seed deliberately buys diversity at the cost of relearning prior failed signatures.

This creates a natural empirical tradeoff:

> basin diversification versus retained local search memory.

Do not disable the cache for the primary production-policy comparison. The question is which action is better under the current solver. A secondary mechanistic arm may disable it if needed to explain an observed interaction, but that is diagnosis after the primary fixed-work result, not the main comparison.

## Interaction with the scheduler

Treat each macro-seed tranche as an action identity plus execution context, for example:

- `repair-late seed0 0-5M`;
- `repair-late seed0 5-10M` continuation;
- `repair-late seed1 0-5M` fresh macro-seed;
- `repair-late seed2 0-5M` fresh macro-seed.

The scheduler can then compare “continue seed0” with “start seed1” and with “start a different solver action” on the same residual risk set.

This is a cleaner formulation than a permanent hard-coded seed count.

## Disposition

- **Seed diversity premise:** established; do not re-prove generically.
- **Current seven-extra-seed late tier:** valid production baseline, but historically additive and expensive in the tail; mandatory scheduler repricing.
- **Restart-vs-continuation value:** still open.
- **Next experiment:** fixed aggregate work, prespecified seed-split arms, development population first, untouched confirmation for the selected policy.
- **Stop condition:** if no seed-split arm materially beats simple continuation at equal work, close macro-seed scheduling as a major capability lane and keep only whatever small static seed diversity survives fixed-work repricing.
