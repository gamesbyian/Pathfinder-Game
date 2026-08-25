# Sequential algorithm portfolios and continuation value

## Core question

A portfolio contains algorithms/configurations with different runtime distributions, overlap, and rare exclusive capability. Under a fixed total work budget, the key decision is not simply “which algorithm is best?” but:

> **After algorithm A has consumed work without solving, what is the marginal value of giving A more work versus starting or continuing another action?**

This is a continuation-value problem under censoring.

## Static portfolio ideas

### Per-instance selection

Given legal instance features, predict which action or short schedule is best before search begins. SATzilla-style systems learn empirical performance models; Hydra-style portfolio construction adds candidates for their **marginal contribution** to the existing portfolio rather than standalone strength.

Important lessons:

- optimize marginal coverage/work, not isolated solve count;
- rare specialists can be valuable if they solve cases the portfolio otherwise misses;
- large portfolios and rich selectors increase overfitting risk;
- features and configuration choices require held-out validation;
- an offline complex search can still distill to a simple production policy.

### Fixed schedules

A static sequence of `(algorithm, budget tranche)` actions is simple and robust. It is often a strong baseline and may capture most available portfolio headroom.

A fixed schedule should still be repriced by **residual value**: an action that once added solves after earlier stages can become uneconomic as predecessors improve.

## Runtime distributions, censoring, and survival

Let `T` be work-to-solution for an algorithm. The survival function is

`S(t) = P(T > t)`.

A run that has failed through work `t` is a **right-censored observation**: we know `T > t`, not that the run would never solve.

The conditional probability that continued work succeeds in the next tranche is

`P(t < T <= t+Δ | T > t)`.

For small `Δ`, the hazard rate summarizes instantaneous solve propensity among runs that have survived to `t`.

This gives a clean interpretation of late-yield curves: if conditional success remains meaningful at large work, continuation may be valuable; if it collapses, switching becomes more attractive.

### Caution: hazard is not an automatic scheduler

“Run the action with highest current hazard” is a useful heuristic, not a general optimality theorem. Finite-budget scheduling may also depend on:

- remaining global budget;
- whether an action can resume or must restart;
- correlations/overlap among algorithms;
- instance features;
- switching/setup cost;
- uncertainty in the estimated distributions;
- rare exclusive solves;
- future choices after the current tranche.

Use hazard/survival mainly as a language for **conditional marginal value**, then compare candidate policies empirically.

## Restart versus continuation

Heavy-tailed randomized runtimes can make restarts valuable: a fresh run may have better conditional prospects than continuing a long unlucky run. Universal restart schedules provide protection when the runtime distribution is unknown under appropriate repeated-run assumptions.

But restart theory depends on what restarting actually resets. If a solver continues useful accumulated state, or repeated runs are highly correlated, classical i.i.d. restart intuitions may not transfer.

A fair comparison charges all failed restart work and compares restart schedules with simple continuation under the same aggregate work budget.

## Survival-aware selection

Survival models estimate `S_a(t | x)` for action `a`, optionally conditioned on instance features `x`, while using censored observations correctly. Parametric models impose stronger assumptions; survival forests and related nonparametric methods impose fewer.

Their main advantage over naive runtime regression is that timeout observations are not converted into fictional exact runtimes.

Survival modeling can support:

- expected solve probability by a work cutoff;
- conditional solve probability in the next tranche;
- expected remaining runtime under a model;
- risk-aware selection when timeouts are costly.

A model trained across historical instances does **not** magically learn a runtime distribution from one current censored run. Within-instance adaptation still depends on previously learned distributions, repeated randomized trials, or informative current-run telemetry.

## Bandits

Bandit formulations treat algorithms/configurations as arms whose pulls consume budget and produce uncertain rewards. Budgeted or censored bandits extend this to variable costs and timeouts.

They are most natural when there are repeated decisions/instances from which the policy can learn. Pure online bandit theory often assumes stationary/i.i.d. reward processes that do not map cleanly onto one unique combinatorial instance.

Potential value:

- balance exploration of uncertain actions against exploitation of known strong ones;
- learn useful budget/cutoff choices;
- adapt as empirical action value changes.

Risks:

- underexploring rare specialists;
- treating highly correlated configurations as independent arms;
- applying cross-instance regret guarantees to within-instance continuation without justification;
- spending more policy complexity than the measured headroom warrants.

Bandits are downstream of demonstrating that multiple actions have real complementary value and that static allocation leaves material headroom.

## Value of computation / metareasoning

Decision-theoretic metareasoning asks whether one more unit of computation has positive expected value relative to alternatives. In principle, dynamic value-of-computation can include all future choices and remaining budget; exact optimization is generally difficult.

Myopic approximations compare the expected gain from the next work tranche among candidate actions. This is conceptually the purest statement of continuation value:

> choose the computation with the largest expected marginal improvement per relevant cost, given what has already happened.

The framework is useful even when the production scheduler is much simpler.

## Rare specialists and overlap

Average success rate is insufficient for portfolio valuation.

An action with low global yield may deserve a small protected budget if it has reproducible **exclusive capability**. Conversely, two individually strong algorithms may be largely redundant.

Measure:

- residual solves after predecessors fail;
- unique/exclusive solves;
- overlap/substitution;
- value by work tranche;
- uncertainty around rare cohorts;
- whether exclusivity survives independent confirmation.

Hydra's important general lesson is that portfolio members should be judged by what they add **to the portfolio already present**.

## Generalization and overfitting

Algorithm-selection error can grow with:

- portfolio size;
- selector/model complexity;
- number of features and thresholds searched;
- configuration-space size;
- repeated tuning on the same benchmark families.

Therefore:

- group correlated variants by parent;
- separate discovery/tuning from confirmation/transfer;
- report how many candidate policies/configurations were searched;
- compare complicated selectors with simple static baselines;
- prefer the simpler policy when held-out performance is indistinguishable.

A large virtual-best/oracle gap is only an optimistic upper bound. It does not prove that a legal selector can capture the gap.

## What data diagnose continuation value?

The most informative views are **work-to-solution curves and conditional tranche yield**, not only final solve counts.

For each action/configuration, estimate:

- number eligible/reached;
- solves by cumulative work band;
- additional solves in each later tranche among runs unsolved earlier;
- censored failures at every cap;
- overlap with other actions;
- exclusive solves;
- solved/failed work distributions;
- sequence/context dependence;
- uncertainty, especially late in the tail.

If possible, distinguish a run that **exhausted its search space** from one merely stopped at a budget. These are very different censoring states.

Useful empirical patterns:

- strong early yield, near-zero later yield → continuation has low value;
- smooth additional yield with more work → continuation remains plausible;
- heavy variability across seeds → restart questions become relevant;
- different algorithms dominate different work bands/phenotypes → portfolio scheduling has headroom;
- one action's late solves are almost all reproduced cheaply elsewhere → shrink/replace its tail;
- rare action has confirmed exclusive solves → preserve/protect despite low average rate.

## Complexity ladder

Escalate only when simpler policies leave measured headroom:

1. current fixed ladder baseline;
2. repriced static action/tranche schedule under fixed total work;
3. simple legal feature-conditioned static routing;
4. systematic offline configuration/portfolio construction;
5. dynamic re-ranking from current-run telemetry;
6. survival-aware conditional-value models;
7. bandit or explicit value-of-computation control.

The order is not doctrinal; it is a complexity gate. Sophisticated machinery must beat simpler alternatives on held-out solve/work.

## Bottom line

The central quantity is **conditional marginal solve value after observed failure**, not global algorithm strength.

Right-censored outcomes are information. Later work must re-earn its budget. Rare specialists should be judged by marginal exclusive capability. Static policies are strong baselines. Survival, bandit, and metareasoning models become worthwhile only when the data show enough continuation-value structure and residual scheduler headroom to justify them.