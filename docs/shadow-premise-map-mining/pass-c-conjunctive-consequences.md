# Pass C — conjunctive consequence mining

This pass records only combinations whose joint consequence is not already stated by either component alone.

## C1 — successful solver improvement can invalidate the research population used to value the next improvement

Components: **P181** + **P187**.

- P181: the unsolved residual is an endogenous survivor population sculpted by prior capabilities and ordering.
- P187: capability is non-monotone under a fixed envelope; adding strength can change solves through displacement/order.

Joint consequence: **promotion changes both the solver and the population on which subsequent marginal-value claims are measured**. Therefore a treatment can alter the apparent prevalence/economics of unrelated future treatments even if their own mechanics are unchanged.

This is stronger than ordinary stale-evidence caution. The research target moves endogenously as capability is added.

Alternative: evaluation can freeze benchmark cohorts, reducing this effect for controlled comparisons, though not for claims about the current production residual.

Classification: conceptual/epistemic; high confidence.

## C2 — restart equivalence can fail even when puzzle state is reconstructible

Components: **P178** + **P194**.

- P178 frames frontier discard as assuming restart/reconstruction can substitute for continuation state.
- P194 says identical puzzle states can warrant different actions after different failed-work histories even without new puzzle facts.

Joint consequence: preserving or reconstructing the same *puzzle state* is insufficient to establish continuation equivalence if search history itself changes action value. A restart can lose epistemic/work-history state even when it perfectly reproduces the puzzle configuration.

Alternative: if failed-work history is proven irrelevant under a particular policy, puzzle-state reconstruction may be enough.

Classification: conceptual; very high confidence.

## C3 — information lifetime and information authority should not be assumed to decay together

Components: **P197** + **P200**.

- P197 separates what different information classes are licensed to do.
- P200 asks for useful information half-life and transfer radius.

Joint consequence: an item can remain *informative* after its *decision authority* should shrink, or retain authority while its economic usefulness decays. Transfer policy therefore has at least two independent dimensions: **persistence radius** and **permission/authority radius**.

The map contains both parents but does not state this two-dimensional interaction directly.

Alternative: authority class may be immutable for some proof-bearing facts; the interaction matters mainly for empirical, diagnostic, or policy-conditioned knowledge.

Classification: conceptual; high confidence.

## C4 — preserving rare option value can look economically harmful before it becomes capability-positive

Components: **P184** + **P187**.

- P184 assigns value to branches preserving rare completion regimes despite low immediate score/probability.
- P187 says extra state/search/treatments can reduce solves by displacement under a fixed envelope.

Joint consequence: a mechanism that correctly preserves rare option classes can initially reduce aggregate solve count by consuming frontier/work capacity. Its value cannot be inferred from local correctness plus immediate net solves alone; the evaluation must distinguish **capability preservation** from **current envelope economics**.

Alternative: this may already be indirectly covered by matched-cost capability doctrine, but the rare-option mechanism creates a particularly sharp case.

Classification: conceptual/economic; high confidence.

## C5 — online revision of the action grammar creates a new attribution unit

Components: **P195** + **P151/P152**.

- P195 allows root preprocessing, gate choice, and action grammar to become revisable hypotheses during a solve.
- P151/P152 require actual participation and winner/action/stage/configuration fidelity.

Joint consequence: if the solver can revise the **space of actions itself**, attribution can no longer identify treatment participation solely by a static configuration plus chosen action. It must preserve which grammar/version generated the action and what evidence caused that grammar revision.

This is a genuine new measurement requirement induced by an architectural idea.

Alternative: an implementation could encode grammar revision as an ordinary named action and reuse existing attribution machinery.

Classification: mixed architecture/epistemic; medium-high confidence.

## C6 — corpus construction can bias the apparent “right” unit of generalization

Components: **P191** + **P199**.

- P191 says construction-witness solvability selects a particular distribution of solution topology.
- P199 asks whether knowledge should generalize over static features, dynamic failure states, trajectories, obligation configurations, causal loss classes, or combinations.

Joint consequence: the unit that appears most predictive on a construction-solvable corpus can be an artifact of the generator's witness grammar. Generalization-unit research therefore cannot be separated cleanly from corpus selection.

Alternative: multi-corpus validation can make the unit robust despite generator bias.

Classification: epistemic/conceptual; high confidence.

## Rejected combinations / negative results

- **P043 + P053 + P184** was rejected as a new conjunctive finding because the map already explicitly connects scalar ranking, regime-aware retention, and option value closely enough that the combination adds little.
- **P177 + P193 + P200** was rejected as novelty because their parent/implementation relationships are explicit.
- Numerous shared-`budget` and shared-`state` pairings were discarded as lexical coincidence without an additional consequence.

## Pass-C takeaway

The most potent conjunctions arise when one proposition changes the **interpretation conditions** of another: residual formation changes economics, work history changes restart equivalence, authority changes persistence, and generator selection changes generalization. The map's richest unrepresented consequences therefore often live one level above pairwise mechanism composition.
