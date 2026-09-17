# Pass A — failure-form compression

## Scope

This pass applies the frozen `assumed condition → failure mode → consequence` transformation to the 142 frozen propositions. The aim is compression, not priority ranking.

## A1 — irreversible information loss is a cross-cutting failure form

**Compressed form:** a representation or handoff discards a distinction/artifact before a later stage can use it → downstream search cannot reconstruct capability merely by improving ranking or spending more work.

Primary evidence:

- **P010**: normalized input may erase completion-relevant distinctions; its solve-count link explicitly says no later ranker or budget can recover erased information.
- **P020**: a needed target absent from the candidate graph is categorically unavailable to downstream ordering.
- **P177**: useful information can disappear specifically at search-stage handoffs even when local components are adequate.
- **P178**: a work cap can destroy capability by discarding a live frontier rather than merely limiting work.
- **P193**: stage interfaces may need contracts for state/frontier/budget/knowledge transfer.
- **P200**: facts and search artifacts can die too early or be transferred too broadly.

The important compression is that these are not six unrelated "representation", "candidate generation", "handoff", "budget", "interface", and "knowledge" problems. They instantiate one causal shape: **capability is bounded by information that survives to the point where a decision can exploit it**.

Alternative interpretation: P020 concerns action availability rather than information persistence, so grouping it with transfer loss may be too broad. The common consequence nevertheless survives: once the relevant option is absent from the decision substrate, downstream sophistication cannot restore it.

Classification: conceptual compression, robust across map domains but partly dependent on proposition wording.

## A2 — state identity repeatedly fails when future policy/history is omitted

**Compressed form:** two situations look equivalent under the currently encoded state → different continuation rights, budget, predecessor sequence, or work history make their future values diverge.

Evidence:

- **P011** questions residual-state equality as future behavioral equivalence.
- **P154** says isolated action identity is insufficient because predecessor/execution context changes value.
- **P167** says operational similarity is policy-conditioned and trace-censored.
- **P179** explicitly makes future-state equivalence relative to remaining policy/work.
- **P180** asks dominance to include remaining work, continuation rights, and acquired knowledge.
- **P194** says the same puzzle state may warrant a different next action after different failed-work histories.

This compresses several map regions into a deeper claim: **the solver's effective decision state is partly counterfactual and historical, not merely puzzle-local**.

Alternative interpretation: P167 is an observability claim, not a runtime state claim. Its inclusion is therefore weaker; it shows the same conditioning issue in measurement rather than in control.

Classification: conceptual, with one epistemic analogue.

## A3 — observed populations are products of the process that generated them

**Compressed form:** execution/generation policy selects which examples become observable → apparent prevalence, capability, or causal explanation reflects the selection process as well as the underlying phenomenon.

Evidence:

- **P002** questions benchmark representativeness.
- **P112** says solved traces are a censored sample.
- **P150** warns that one accepted witness can induce a different failure story from another.
- **P172** identifies early-success censoring of later actions.
- **P181** treats the residual as an endogenous survivor population.
- **P182** makes technique value predecessor-conditioned through portfolio order.
- **P188** adds instrumentation reach/cost as another missing-data mechanism.
- **P191** says construction-witness solvability induces a selection distribution over solution topology.

The compression is stronger than a generic "selection bias" label because the selected object changes at several levels: traces, witnesses, action opportunities, residual populations, instrumentation-visible states, and generated corpora. **The map repeatedly describes research evidence as an output of the solver/research policy, not a neutral sample from a fixed world.**

Alternative interpretation: these mechanisms are causally distinct and should not be treated as interchangeable corrections. Compression is useful only at the level of epistemic failure form.

Classification: epistemic/conceptual; high confidence.

## A4 — immediate outcome is an unreliable carrier of latent capability

**Compressed form:** a capability can exist, participate, or create useful intermediate structure without immediately adding a unique solve → outcome-only evaluation can discard components needed for later composition.

Evidence:

- **P003** explicitly weakens zero-unique-solve as a uselessness verdict.
- **P004** says sparse solve count may have insufficient resolution before a mechanism is production-ready.
- **P084** allows a failed technique to be useful as an information probe.
- **P151** requires participation verification before causal verdict.
- **P187** says added precision/work/treatments can reduce solves under a fixed envelope through displacement.
- **P192** questions single-technique credit for compositional solves.
- **P198** separates phenomenon, representation, soundness, participation, useful work, matched-cost complementarity, schedulability, and promotion.

This is one repeated failure form: **using terminal solve delta as a universal proxy for mechanism state collapses several causally different stages into one number**.

Alternative interpretation: P187 concerns economic displacement after capability already exists, not early capability detection. It still belongs to the compression because it breaks monotonic mapping from "more capability" to "more observed solves".

Classification: epistemic/conceptual; high confidence.

## A5 — scalar/local progress repeatedly conflicts with preservation of future option sets

**Compressed form:** select the locally strongest-looking continuation → destroy a strategically distinct future regime whose value is not represented by the scalar/local score.

Evidence:

- **P043** questions scalar aggregation for strategically different regimes.
- **P045** allows temporarily worse-looking states on successful trajectories.
- **P050** links structural diversity to survival of the only live basin.
- **P053** proposes retaining incomparable regimes rather than scalar top-k only.
- **P140** frames optionality preservation as a first-class need.
- **P141** asks the solver to reason over sets of futures.
- **P184** names option value for rare completion regimes even at low immediate score/probability.

These propositions compress into a single architectural pressure: **search may need to represent future option sets as decision objects, not merely attach better scalar scores to individual prefixes**.

Alternative interpretation: diversity can be used as a crude scalarized proxy, so this need does not imply any particular representation or algorithm.

Classification: conceptual; very strong within the frozen map.

## A6 — fixed architecture choices recur as unexamined hypotheses

**Compressed form:** an upstream choice is treated as setup rather than as a revisable decision → downstream adaptation cannot escape mistakes made before or outside its control loop.

Evidence:

- **P063** questions a mostly fixed execution pipeline.
- **P070** treats forward valid-prefix search as a dominant incumbent premise.
- **P075** asks for per-level search-plan compilation.
- **P173** treats hand-tuned routing thresholds as hypotheses about regime boundaries.
- **P186** elevates deciding when to abandon a search hypothesis/architecture.
- **P195** explicitly makes preprocessing, gate choice, and action grammar revisable during a solve.

The deeper structure is **where the solver draws the line between "problem state" and "solver configuration"**. Several rows imply that configuration may itself belong inside the adaptive state/action space.

Alternative interpretation: some configuration choices are deliberately frozen to control complexity and reproducibility. The compression identifies a shared premise, not evidence that every fixed choice should become dynamic.

Classification: conceptual/architectural; medium-high confidence.

## Negative results

1. Not every proposition compresses productively. Referee correctness (P001/P006), exact support coverage (P158), and some generator-coverage questions (P114/P190) retain distinct semantics after compression.
2. Compression beyond the six families above began to produce generic categories such as "insufficient observability" or "insufficient expressivity" that erased useful causal differences. Those were rejected rather than reported as findings.
3. No credible claim emerged that the 142 rows reduce to a tiny universal basis. The map contains several recurrent failure forms, but substantial irreducible specificity remains.

## Pass-A takeaway

The strongest independent compression is not a new individual premise. It is a recurring architecture of failure:

> **what the solver/research process can do depends on what distinctions, options, evidence, and continuation rights survive long enough to become part of a decision.**

That pattern appears in representation, candidate availability, frontier persistence, policy-conditioned state identity, evaluation, and option preservation. It will not be elevated to an overall synthesis claim until the other passes are complete.
