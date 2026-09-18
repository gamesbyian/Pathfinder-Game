# Pass E — boundary-case inversion

## E1 — policy-relative equivalence has informative degenerate limits

Evidence: **P179**, **P180**, **P194**.

If future-state equivalence depends on remaining policy/work, consider two limits:

- with effectively no remaining work/action rights, many otherwise distinct puzzle states become behaviorally indistinguishable because neither can realize a continuation;
- with a much larger continuation set, states that were equivalent under a narrow policy may diverge.

This boundary inversion clarifies that “equivalence” can change because the **observer's future action set** changes, even if the puzzle state does not.

Alternative: zero-work equivalence is operationally trivial and may not deserve runtime representation.

Classification: conceptual; high confidence.

## E2 — unique-solution and many-regime cases bound witness-relative diagnosis

Evidence: **P150**, **P161**, **P183**.

At the unique accepted-solution limit, witness-relative first divergence approaches an unambiguous target-relative diagnosis. As solution multiplicity and regime diversity increase, a divergence from one witness becomes progressively less authoritative because another accepted regime may survive.

The boundary case exposes a hidden variable behind diagnosis quality: **solution-regime multiplicity**, not just trace fidelity.

Alternative: even a unique final solution can admit many equivalent prefixes, so uniqueness does not eliminate all witness sensitivity.

Classification: conceptual/epistemic; high confidence.

## E3 — candidate-space completeness has a hard lower boundary

Evidence: **P020**, **P024**, **P195**.

If a required candidate/action is absent from the search substrate, downstream ranking, retention, and budget changes cannot recover it. At the opposite boundary, if the candidate/action space is complete but enormous, generation ceases to be the bottleneck and selection/economics dominate.

This inversion suggests that candidate generation is not merely another heuristic stage. It defines a **hard capability envelope** at one extreme and a **work-allocation burden** at the other.

Alternative: online action-grammar revision (P195) can move the envelope during a solve, so “candidate space” need not be static.

Classification: conceptual; high confidence.

## E4 — information half-life has symmetric failure modes at zero and infinity

Evidence: **P200**, with authority caution from **P197**.

- Near-zero retention: expensive facts/frontiers are repeatedly repurchased or lost before reuse.
- Near-infinite retention/transfer: stale, policy-conditioned, or weak-authority information can contaminate later decisions and consume memory/work.

The useful regime therefore cannot be inferred from “more persistence is better.” It is an interior optimization problem whose optimum can differ by artifact class and authority.

Alternative: proof-bearing facts may have effectively infinite semantic lifetime even if their economic storage lifetime is finite.

Classification: conceptual; very high confidence.

## E5 — instrumentation has a no-observer / observer-perturbation tradeoff

Evidence: **P188** and **P167**.

At one boundary, no instrumentation yields maximal execution fidelity but no observability. At the other, sufficiently expensive or selective instrumentation can alter work, encounter distribution, or trace censoring enough that the recorded execution no longer represents the uninstrumented process.

This makes observability itself a controlled resource rather than a free add-on.

Alternative: lightweight counters may occupy a broad region where perturbation is negligible.

Classification: epistemic; high confidence.

## E6 — first-success stopping has a clean portfolio boundary

Evidence: **P172**, **P182**.

With a one-action portfolio, first-success stopping creates no cross-action censoring. As portfolio length and overlap increase, later actions are observed on increasingly selected survivor populations. Thus action-value estimates become progressively order-dependent even if each action's intrinsic behavior is unchanged.

This boundary makes predecessor-conditioned evaluation a structural property of portfolios, not an incidental measurement flaw.

Classification: epistemic; very high confidence.

## Negative results

- Many `general` population labels do not define a meaningful ordered boundary and could not be inverted responsibly.
- Several proposed extremes were rejected because they depended on implementation assumptions not encoded in the map.
- Boundary analysis mostly sharpened existing parents rather than generating many wholly new premises. That is a legitimate negative result: the map already contains several strong scope-sensitive abstractions.

## Pass-E takeaway

The most informative boundaries occur where a quantity controls **what futures are possible or observable**: remaining action rights, solution multiplicity, candidate availability, information lifetime, instrumentation cost, and portfolio ordering. These limits repeatedly turn qualitative questions into conditioning problems.
