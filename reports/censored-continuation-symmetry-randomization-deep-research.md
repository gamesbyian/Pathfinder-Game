# Censored Continuation Value and Symmetry-Aware Randomized Search

## Scope

Two issues meet here:

1. **Sequential allocation under censoring:** after a solver has already consumed work without solving, what is the value of continuing that run versus restarting or switching?
2. **Randomized equivariance:** when two instances/states are related by an exact symmetry, how should the distribution of randomized search behavior transform?

These topics interact because orientation/order variants can behave like correlated portfolio members.

## Runtime distributions and censoring

Let `T_A` be work-to-solution for algorithm/run A.

The survival function is

`S_A(t) = P(T_A > t)`.

The next-tranche success probability after surviving unsolved to `t` is

`P(t < T_A <= t+Δ | T_A > t) = 1 - S_A(t+Δ)/S_A(t)`

when the required conditional distribution is well defined.

The hazard summarizes instantaneous event rate, but hazard alone is not a generally optimal scheduling objective.

A budget stop is **right censoring**: it establishes `T > cutoff`, not an exact runtime and not permanent failure. Natural search exhaustion is different: for that fixed deterministic search action there is no further continuation state unless it is restarted or changed.

Kaplan-Meier and related nonparametric survival estimators require appropriate censoring assumptions. They do not magically remove bias from informative/selected censoring.

Beyond the last observed event time, the runtime tail is not nonparametrically identifiable. Parametric extrapolation adds modeling assumptions.

## Continue, restart, or switch

These are different actions.

### Continue current run
Uses the residual-life distribution conditional on the exact run having survived to its current internal state/work.

### Restart same algorithm
Starts a new randomized trajectory. Classical restart theory compares the remaining prospects of the current run with a fresh draw, including restart overhead.

Universal restart sequences such as Luby-style schedules provide distribution-robust guarantees under their assumptions; they are not universally optimal for all heavy-tailed solvers.

### Switch algorithm
Starts or resumes a different search process whose outcome may be correlated with A through instance structure.

The optimal finite-budget decision generally depends on remaining horizon, switching/restart cost, correlations, internal progress state, and future action opportunities. “Run the largest current hazard” is only justified in restricted models.

## Latent instance hardness and correlated algorithms

Failure of A is information about the instance, not merely about A.

Let latent variable `z` represent unobserved instance structure/difficulty. Then

`P(B succeeds | A survived to t, x)`

can be written schematically as

`∫ P(B succeeds | z,x) p(z | A survived to t,x) dz`.

Thus observing A fail updates the posterior over `z`, which can change expectations for B even if B has not run yet.

Shared-frailty, latent-class, hierarchical, copula and multivariate-survival models provide formal precedents for correlated event times. They require paired/repeated data and assumptions; latent dependence is not identifiable from one censored observation per unrelated instance.

Simple empirical conditional tables are appropriate when cohorts are large, sequence/provenance is controlled, and the conditioning variables define comparable risk sets. Sparse late tranches, changing predecessor sequences, hidden state, and selected reach make naive `P(B solves | A failed)` fragile.

## Estimation hierarchy

A sensible complexity ladder from the literature is:

1. empirical tranche success/work tables;
2. Kaplan-Meier / nonparametric survival summaries when censoring is material;
3. stratified or covariate survival models;
4. hierarchical/frailty models for repeated correlated algorithms/instances;
5. dynamic allocation/bandit/metareasoning models only when repeated decisions and enough data justify them.

Cox proportional hazards is useful only if proportional-hazard assumptions are adequate. AFT or flexible/nonparametric models may fit nonproportional solver hazards better.

Tail estimates should report uncertainty, cluster by independent instance where appropriate, and avoid treating repeated runs on one instance as independent population evidence.

## Bandits and algorithm scheduling

Resource-censored bandit and semi-bandit work shows that learning with budget-dependent censored feedback is theoretically possible. However, these models do not automatically match solver scheduling: their reward/censoring process, arm independence, repeated rounds, and stationarity assumptions may differ substantially.

Bandits become relevant when the system repeatedly chooses among uncertain actions and online exploration itself has value. If offline data already estimates action/tranche values well and instances are one-shot, a static or contextual policy may be simpler and better identified.

Metareasoning/value-of-computation formulations are the most general but can become POMDP-like when latent instance state and solver-internal progress matter.

## Randomized symmetry equivariance

Let group element `g` transform instances, states, actions and traces.

### Deterministic equivariance

`A(gx) = g A(x)`.

### Distributional equivariance

`Law[A(gx)] = g_* Law[A(x)]`,

where `g_*` is the pushforward of the output/trace distribution.

This is weaker than pathwise equality under one coupled random stream but much stronger than merely having equal mean runtime.

A randomized search is distributionally equivariant only if its whole transition kernel respects the group action. It is not enough for the scalar heuristic or random tie-breaker alone to be invariant.

Potential symmetry leaks include:
- successor enumeration;
- coordinate-dependent features;
- deterministic tie fallback;
- truncation/culling order;
- hash/ID ordering;
- dedup representatives;
- randomness keyed to execution order rather than semantic choices.

## Randomness coupling across transformed runs

Three designs answer different questions.

### Independent randomness
Tests equality of performance distributions under the transform. It does not align individual traces.

### Same raw PRNG seed/stream
Provides common random numbers only to the extent corresponding semantic decisions consume corresponding draws. If branch/order divergence changes draw consumption, identical seeds do **not** create semantic coupling.

### Equivariant coupling
Corresponding abstract state/action events receive corresponding random variates under the group action. This can be implemented conceptually with random keys indexed by semantic/canonical identities, stateless/counter-based RNGs, or another explicitly equivariant coupling.

This is the right design for asking whether deterministic search logic commutes with the transform once randomness is controlled at corresponding decisions.

Canonical/state hashing alone does not guarantee identical traces: canonicalization must itself be symmetry-consistent, stabilizers/ties require care, and all nonrandom transitions must also be equivariant.

## Common random numbers and antithetic methods

Common random numbers are a paired-design/variance-reduction technique. They reduce variance when paired outputs are positively correlated under the coupling; they do **not** strictly reduce variance in every problem.

Antithetic variates rely on a useful negative-correlation construction and monotonic structure. An “opposite symmetric choice” is not automatically a valid antithetic estimator and can increase variance or alter the estimand.

These are experimental-design tools, not correctness mechanisms.

## Representation bias versus useful diversification

Two objectives can conflict:

1. **Equivariant robustness:** arbitrary representation should not change the search distribution.
2. **Diversification:** deliberately varied orderings/frames can produce complementary trajectories.

A clean way to distinguish them conceptually is to start from an equivariant base distribution, then intentionally sample a symmetry-breaking choice from a group-invariant distribution. For example, choosing a uniformly random group frame and running a deterministic frame-dependent procedure can yield an invariant aggregate distribution if the construction is genuinely group-consistent.

This creates controlled diversification rather than accidental coordinate bias.

Whether such diversification is valuable is empirical. If an exactly equivariant randomized policy has the same trace distribution under all orientations, transformed copies add no special portfolio diversity beyond independent random draws from that policy, assuming the symmetry maps the full problem and RNG law exactly.

If orientation variants remain complementary, that signals either intentional coupling differences, representation-sensitive search, or differing random trajectories; it does not by itself establish a defect.

## Symmetry-aware statistics

Mean solve rate alone can hide large within-instance inversions.

Relevant summaries include:
- paired solve/work differences within each symmetry orbit;
- worst/best orientation range;
- pairwise discordance;
- within-parent/orbit variance;
- paired survival/RMST differences;
- randomization/permutation tests under the group action;
- mixed/random-effects models separating base-instance difficulty from orientation interaction.

Repeated transformations of one base instance are correlated and should not be treated as independent levels.

## Corrections to tempting simplifications

- Heavy-tailed runtime does not by itself prove a monotonically decreasing hazard.
- Censoring methods require assumptions; timeout rows are not automatically unbiased observations.
- Failure of A can update expectations for B through shared instance hardness.
- Highest empirical hazard is not generally an optimal finite-horizon scheduler.
- Censored-bandit regret results do not transfer automatically to arbitrary solver portfolios.
- Same seed is not semantic common randomness when random-call order diverges.
- Common random numbers do not always reduce variance.
- Counter-based RNG gives reproducible addressable randomness, not automatic symmetry equivariance.
- Canonicalization may be expensive and does not cure representation-sensitive scoring by itself.

## Bottom line

For scheduling, the correct primitive is **conditional marginal continuation value in a well-defined risk set**, with right censoring, natural exhaustion, latent instance hardness, overlap and remaining horizon kept explicit.

For randomized symmetry, the clean notion is **equivariance in distribution**. Independent runs test distributional robustness; an equivariant coupling tests pathwise correspondence. Same raw seeds generally do neither reliably once execution order diverges.

Survival models, frailty models, bandits and symmetry-aware RNG are escalation tools. The simplest empirical conditional/tranche model and the simplest group-consistent randomization should remain the baseline until more complexity demonstrably buys information or performance.