# Blind shadow mining — synthesis

## Scope

This synthesis is based only on:

- the frozen repository evidence boundary `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`;
- the six independently designed shadow-mining passes committed on this branch.

No later mining lineage, reconciliation, queue update, downstream experiment, or post-snapshot premise-map work was consulted.

## S1 — the solver's effective decision state is larger than puzzle state

This is the strongest convergent finding.

Independent routes:

- **Pass A** compressed P011/P154/P167/P179/P180/P194 into the failure form “state identity breaks when future policy/history is omitted.”
- **Pass C** combined P178 and P194: reconstructing the same puzzle state does not establish restart equivalence when failed-work history changes the value of future actions.
- **Pass E** showed that equivalence itself changes at boundaries of remaining action rights/work.
- **Pass D** showed that the relation layer separately encodes dependencies between continuation, history, and state-equivalence questions.

The deeper structure is:

> A solver state is decision-equivalent only relative to what it knows, what it has already tried, what it may still do, and what resources/continuation rights remain.

This is broader than “add more fields to state.” It says **equivalence, dominance, restart, routing, and continuation are all policy-relative judgments**.

Robustness: high. The conclusion survives text compression, conjunctive reasoning, and boundary inversion.

Representation dependence: moderate. The exact vocabulary comes from recent extension rows, but the same structure appears across older and newer proposition families.

## S2 — research evidence is endogenous to the process that produces it

Independent routes:

- **Pass A** grouped P002/P112/P150/P172/P181/P182/P188/P191 as selection mechanisms operating on benchmarks, traces, witnesses, action exposure, residuals, instrumentation, and generated corpora.
- **Pass C** found that solver improvement changes the residual population used to value later improvements (P181 + P187).
- **Pass C** also found that generator selection can bias the apparent correct generalization unit (P191 + P199).
- **Pass E** showed first-success stopping creates increasing predecessor-conditioned selection as portfolio length grows, and instrumentation has a no-observer/observer-perturbation boundary.
- **Pass B** found the most decision-ready rows often explicitly name the conditioning variable that changes interpretation.

The deeper structure is:

> Pathfinder solver research does not observe a fixed population through a neutral instrument. Search policy, portfolio order, success stopping, generator grammar, trace budget, and prior capability determine which evidence exists to be measured.

This implies that “what is the residual?” and “what did the treatment do?” are partly questions about the **observation process**, not only the solver mechanism.

Robustness: very high.

Representation dependence: low to moderate. The map states many selection mechanisms independently, so the synthesis is not carried by one schema feature.

## S3 — capability, usefulness, and promotion are different state variables

Independent routes:

- **Pass A** compressed P003/P004/P084/P151/P187/P192/P198 into the failure form “terminal solve delta is not a universal proxy for mechanism state.”
- **Pass C** showed that rare-option preservation can be capability-positive while economically negative under the current envelope.
- **Pass B** found that governing abstractions and treatment verdicts have different reversal semantics.
- **Pass E** found interior tradeoffs for information lifetime and instrumentation where “more” is not monotone.

The deeper structure is:

> A mechanism can be real but not participating, participating but not useful under current work, useful but displaced by portfolio economics, or valuable only in composition.

This is not merely an experimental hygiene point. It affects how research should interpret negative results and how architectural components are credited.

Robustness: high.

Representation dependence: moderate because P198 states a maturity ladder explicitly, but the same distinction appears independently in older outcome/economics premises.

## S4 — preserving option sets is a distinct search objective from maximizing expected immediate progress

Independent routes:

- **Pass A** compressed P043/P045/P050/P053/P140/P141/P184 into “scalar/local progress can destroy strategically distinct futures.”
- **Pass C** showed that option-preservation can consume fixed-envelope resources and temporarily reduce solves.
- **Pass E** showed that future action rights alter behavioral equivalence, linking option preservation to state semantics rather than just ranking.

The deeper structure is not “use diversity.” It is:

> Some search objects have value because they preserve future decision rights or rare completion regimes, even when their current score and current success estimate are poor.

Robustness: high within the map.

Representation dependence: moderate. The map contains unusually explicit option/regime language, so this finding is partly enabled by the representation already having those concepts.

## S5 — information persistence and information authority are orthogonal

This finding emerged primarily from **Pass C** (P197 + P200) and is supported by **Pass E**'s zero/infinite lifetime inversion.

An item can remain informative while losing permission to prune, route, or generalize; conversely a sound proof can retain authority while becoming economically irrelevant to store or transfer.

Thus “how long should this artifact survive?” and “what may this artifact cause?” are separate questions.

Robustness: medium-high.

Representation dependence: moderate-high because the authority taxonomy is a recent explicit map dimension.

## S6 — the map is a layered semantic record, not a homogeneous graph dataset

Convergent evidence:

- **Pass B**: `status` mixes belief state, attention state, and research role.
- **Pass D**: relation vocabularies differ by generation, some endpoints are prose concepts, inverse-like edge pairs can create graph-theoretic artifacts, and generic transitivity is unsafe.
- **Pass F**: proposition schemas change across generations; later relations encode epistemic verbs unavailable earlier; four canonical extension rows are malformed under standard CSV quoting rules.

The practical synthesis is:

> Computational mining that treats all rows, statuses, fields, and edges as one normalized table/graph can manufacture patterns that are properties of representation history rather than the research space.

This is a finding about the mining substrate, not about solver architecture.

Robustness: very high.

## Findings that reduce to one deeper structure

Three initially separate families appear to be variants of **decision-context preservation**:

1. state/history/policy-relative equivalence (S1);
2. option-set preservation (S4);
3. information lifetime/authority (S5).

All three concern what contextual distinctions must survive so that a later decision remains meaningfully different.

They should not be collapsed completely. Puzzle/search state, future option classes, and epistemic authority have different correctness obligations. But they share a parent structure:

> **A solver loses capability when distinctions that matter to future decisions are erased, merged, censored, or stripped of usable authority before those decisions occur.**

## Findings that remain irreducibly distinct

The following do not collapse cleanly into the decision-context parent:

- canonical validation/referee correctness (P001/P006);
- generator adequacy and construction-distribution effects (P114/P190/P191);
- joint obligation/resource feasibility (P032/P157/P163);
- alternative search-object architecture (P070-P077/P143/P149);
- exact support/model coverage (P158).

These involve truth, coverage, or search-object choice rather than primarily persistence of decision context.

## Apparent patterns weakened or destroyed by another pass

1. **Graph-topology importance** is fragile because the relation graph is open, generation-layered, multi-edge, and partly prose-addressed. A raw centrality or connectivity story would be representation-sensitive.
2. **Status-based maturity** is not defensible because status labels mix several dimensions and the CSV schema changes over generations.
3. **More persistence is better** fails under the infinite-retention boundary: stale or over-broad knowledge can mislead or waste work.
4. **More capability means more solves** fails under fixed-envelope displacement and portfolio composition.
5. **Same puzzle state means same continuation value** fails once work history, knowledge, policy, and continuation rights enter the effective state.

## Stubbornly low-yield regions

Repeated interrogation produced comparatively little higher-order structure from:

- individual lexical/candidate-source proposals (P021-P023);
- isolated ranking mechanisms such as contextual reranking/embedding proposals (P041/P042) when considered without broader option/evidence questions;
- several single-mechanism repair or macro-action rows.

This does not mean those regions are unimportant. It means the fixed map provides fewer cross-cutting hooks for higher-order inference there.

## Questions whose importance arises from combinations

The strongest combination-generated questions are:

1. When a capability promotion changes the survivor residual, which previously measured treatment values must be reinterpreted?
2. What constitutes restart equivalence when failed-work history changes future action value even without new puzzle facts?
3. Should transferred knowledge carry separate lifetime and authority metadata?
4. How should option-preserving capability be evaluated when it reduces net solves under the current envelope?
5. If action grammar can revise online, what is the correct attribution identity for a generated action?
6. How can a generalization unit be validated independently of the generator selection process that made that unit appear predictive?

These are synthesis questions only. This branch does not convert them into solver-queue items or production changes.

## Synthesis conclusion

The independent interrogation did not reveal one missing algorithmic silver bullet. It revealed a recurring **context-loss problem** at multiple levels of solver and research reasoning, plus an equally strong **endogenous-observation problem** in the evidence used to decide what matters.

Those two structures are the most credible blind-mining outputs because they emerged through multiple independently motivated passes and survived representation-sensitive checks.
