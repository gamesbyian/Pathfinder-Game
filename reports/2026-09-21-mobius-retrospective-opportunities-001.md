# Möbius retrospective: parity, exact projections, research algebra, and capability invention

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — response-guided invention, research-algebra hardening, and static parity/portal feature extraction on PR #1938
> **Decision:** preserve the closed-loop invention method and route each remaining opportunity to its owning method/deferred surface rather than creating a new queue
> **Remaining gate:** none
> **Scope:** the parity → exact-projection → research-system-algebra session and its second-order opportunities.
> **Priority authority:** [solver optimization workstreams](../docs/solver-optimization-workstreams.md).
> **Method authorities:** [capability invention](../docs/solver-capability-invention-program.md), [small exact projections](../docs/solver-small-exact-projections-program.md), [response-guided invention](../docs/solver-response-guided-capability-invention.md), and [research operating model](../docs/solver-research-operating-model.md).
> **Research-system hardening:** [research-system algebra audit](../docs/solver-research-system-algebra-audit.md).

## Core retrospective insight

The session began with parity as a Pathfinder-specific invariant and ended with a broader principle:

> **Find the smallest representation that preserves exactly the property needed for the next decision.**

That principle now appears at three layers:

1. **Solver mathematics:** parity, cut/flow balance, capacity, matching, dominance, topology, finite-state residues, symmetry.
2. **Solver invention:** use real technique/decision contrasts to nominate the smallest exact distinction worth deriving.
3. **Research semantics:** make evidence transformations explicit enough that invalid composition, consumption, grouping, or inference is hard.

These are not separate programs. They form a loop:

`response contrast → exact premise → counterexample/novelty → consumer oracle → smallest consumer → evidence → new contrast`.

A negative result can re-enter the loop through a different representation, consumer, or contrast rather than becoming dead history automatically.

## 1. Response-guided theorem discovery — **ACTIVE METHOD + FIRST SLICE IMPLEMENTED**

The old technique relative-advantage analysis already contains strong A-only/B-only populations, but previously collapsed them into counts/effect summaries.

Implemented:
- [response-guided capability invention](../docs/solver-response-guided-capability-invention.md);
- retained contrast IDs in `analyze-technique-relative-advantage.mjs`;
- [first response-guided premise nominations](2026-09-21-response-guided-premise-nominations-001.md).

Highest-value existing contrasts:
- repeated portal-heavy diverse-beam advantage;
- large CW/CCW disagreement with weak coarse descriptors;
- non-monotonic 2K/5K beam inversions.

The next useful question is no longer “which technique wins?” It is “what smallest legal current-input fact explains the disagreement?”

## 2. Theorem-guided response mining — **ACTIVE**

Parity response-signature work is the worked example: start from an exact representation and test whether it explains differential technique/path behavior.

Durable rule:
- track **proof value** and **response value** separately;
- low prune incidence does not kill response value;
- response association never proves sound rejection.

Future exact premises should receive both dispositions where evidence permits.

## 3. Product projections — **DEFERRED SIBLING, GATED BY NOVELTY**

Single projections may miss joint structure. Tiny products are legitimate when each component remains exact/conservative and the product has a novelty witness beyond both inputs.

First candidates:
- parity phase × cut/region side;
- checkerboard capacity × cut/interface capacity;
- portal/twist phase × finite mechanic residue;
- obligation-support matching × separator interface capacity.

No product gets implementation merely because its factors exist.

## 4. Partitioned-capacity theorem schema — **ACTIVE DISCOVERY HEURISTIC**

Checkerboard capacity, cut/interface capacity, and Hall-style obligation/support pressure share one useful pattern:

1. choose a sound partition/subset/neighborhood;
2. derive necessary future demand;
3. derive deliberately generous compatible capacity;
4. reject only when demand exceeds capacity.

This is a theorem-generation heuristic, not one shared implementation.

Candidate partitions:
- checkerboard color;
- cut side / region;
- reachable phase;
- mechanic-state class;
- obligation-support neighborhood;
- path-created enclosure.

## 5. Phase-conditioned checkerboard capacity — **DEFERRED REOPEN**

Current checkerboard capacity abstains where twist portals invalidate fixed-color accounting. The parity-phase representation may support a stronger sibling that conditions capacity on reachable phase.

This is not authorized code. First require:
- an exact phase-conditioned capacity theorem;
- a smallest witness that the existing no-twist rule cannot express;
- a safe treatment of zero-cost twist transitions;
- evidence that the added state remains cheap enough.

Recorded in solver future work as a sibling audit.

## 6. Exact intersection burden × parity/flow — **OPEN THEOREM OPPORTUNITY**

The current checkerboard capacity correction deliberately over-credits `intNeeded` for safety. Exact remaining self-intersection burden may constrain color arrivals, revisit opportunities, and region traffic more tightly.

Potential consequence:
- stronger necessary color/cut demand without full residual search.

Do not tighten the current bound heuristically. Derive an exact arrival/revisit law first.

## 7. Tiny-instance theorem gym — **DEFERRED TOOLING OPPORTUNITY**

Stage-0 exact-premise work repeatedly needs:
- smallest positive witness;
- redundancy witness;
- mechanic interaction that breaks the law;
- valid solution falsely rejected by an incorrect hard interpretation.

The repository already has referee/oracle/fuzz/generation machinery. If at least two premise audits repeat bespoke tiny enumeration, extract a small counterexample-search harness. Do not build it preemptively.

## 8. Metamorphic theorem testing — **METHOD OPPORTUNITY**

Algebraic-law tests in the research system suggest a solver analogue: transformations claimed to preserve or predictably transform a premise should generate paired cases.

Candidates:
- legal reflection/rotation;
- translation where representation permits;
- exact automorphisms;
- mechanic-preserving relabelling;
- controlled obstacle/landmark transforms outside the claimed support.

This is especially relevant to CW/CCW orientation disagreement and exact symmetry as a negative control.

## 9. Scoped confirmation contamination diagnostic — **IMPLEMENTED**

Combining immutable block consumption with canonical population-set relations produces a useful derived diagnostic without a freshness database.

Implemented:
- `summarizeResearchBlockUsageOverlap()`;
- reports proposed-parent overlap, known consumed overlap, apparent untouched parent-scope overlap, and unresolved family-scoped consumption;
- `researchBlockEligibility()` remains authoritative.

Future preflights can consume this diagnostic when a proposed cohort is assembled from known research blocks.

## 10. Scope-sensitive freshness — **PARTLY REALIZED**

The research system already knows that “fresh” is claim/lineage/scope relative. The new overlap diagnostic makes that visible at parent level.

Do not collapse it into one boolean. A useful future rendering could report:
- untouched under this lineage;
- known consumed;
- overlap with development selection;
- unresolved family-scoped ancestry.

That is a view over immutable lineage, not a new mutable state.

## 11. Deferred-abstraction tripwires — **DOCUMENTED**

Several attractive abstractions were correctly rejected because their triggering structures do not yet exist.

Reopen signals:
- first persisted claim→claim identity edge;
- first real same-question multi-envelope composition requirement;
- repeated nested observation→cluster mappings;
- stable repeated ordered categories on an independence axis.

These should eventually become integration-audit signals when the relevant sources are cheap to query. They must never auto-create the deferred framework.

## 12. Genealogy graph vs epistemic graph — **NEW ANALYSIS OPPORTUNITY**

The question registry proved `triggeredBy` and `implies` are different relations:
- some edges mirror;
- implication-only edges exist;
- trigger-only edges exist.

This means the repo has two useful topologies:
- **genealogy:** why research questions were opened;
- **epistemic bearing:** which premise/result bears on which other question.

Their mismatches may be high-value premise-generation zones:
- trigger without implication = strategic/conceptual jump;
- implication without trigger = latent consequence noticed later.

A derived comparison view may be useful if agents repeatedly need this archaeology. Do not infer transitive closure.

## 13. Capability memory as contrast generator — **OPEN METHOD OPPORTUNITY**

Capability memory should not only nominate old treatments. Complementary current-residual signatures can nominate **explanatory contrasts**:

> what legal current-input feature distinguishes where mechanism family A historically helped from where B helped?

This feeds response-guided invention while keeping historical IDs out of runtime policy.

The shared population-set algebra now makes these overlap/contrast populations cheaper to construct safely.

## 14. Search-loss × exact projection — **OPEN METHOD OPPORTUNITY**

Search-loss/first-loss evidence identifies where viable material disappeared. Exact projections can test whether lost and retained material differ on a sound low-dimensional fact.

Potential loop:
`first-loss decision → lost/retained contrast → candidate exact premise → consumer oracle at that same seam`.

This may be especially useful for:
- state dominance;
- cut/capacity pressure;
- finite-state residues;
- regime-coverage distinctions.

Prefer existing selected decision records before adding telemetry.

## 15. Fact production vs fact transport — **OPEN AUDIT**

This session repeatedly reused facts already almost available:
- checkerboard capacity reused connectivity reach;
- parity response reuses phase representation;
- research set algebra replaced private capability-memory operations.

A solve-local audit should ask:
- which exact facts are computed and discarded?
- which consumers recompute weaker approximations?
- which facts could be handed off cheaply without a generic blackboard?

Only recurring expensive/redundant derivation earns persistence or transport.

## 16. Nearest-weaker-baseline accounting — **ACTIVE METHOD REFINEMENT**

Every new exact premise should name the closest existing reasoning it competes with.

Measure the funnel:
`eligible → old rule passes → new premise applies → new differs → difference reaches decision seam`.

Examples:
- phase distance vs scalar goal distance + ordinary parity;
- cut balance vs connectivity/volume;
- Hall pressure vs individual obligation feasibility.

This creates a common incrementality denominator without forcing common implementation.

## 17. Consumer oracle before live treatment — **ACTIVE METHOD**

Incidence is weaker than decision value. Before implementing a prune/scorer/router/repair consumer, use retained decisions where possible:

> If this fact had been available for free at the decision seam, how many real decisions could it possibly have changed?

Applications:
- replay ranking/retention candidate sets;
- compare lost/retained viable material;
- technique discordance for routing nomination;
- repair rescued/unrescued contrasts.

A zero-change upper bound can stop a consumer before implementation while preserving the semantic premise.

## 18. Validator single-fault fixtures — **IMPLEMENTED PROCEDURAL LESSON**

Current CI exposed tests whose fixtures were intercepted by stronger earlier validation.

Updated:
- [CI preflight](../docs/ci-preflight.md);
- [periodic repository hygiene](../docs/periodic-repository-hygiene.md).

Rule:
- start from a known-valid fixture;
- mutate one semantic fault;
- ensure the case reaches the invariant it claims to test;
- prefer stable semantic/machine error identity over incidental first-error prose.

## 19. Context budget as architecture feedback — **ONGOING**

This session itself triggered context-budget pressure. The correct repair was to move detail into specialist documents and compact front-door authorities, not raise limits.

Durable interpretation:
- context budget is an architecture signal;
- new methods should be discoverable without becoming mandatory preload;
- specialist doctrine belongs behind routing links until its use becomes universal.

## 20. Rebirth after negative results — **ACTIVE METHOD**

Before archiving a negative premise/consumer, consider:
1. different consumer;
2. materially different representation;
3. different response contrast / decision seam.

Examples:
- weak prune but strong response signal;
- failed cross-level compact interface but useful board-specific conservation;
- negative treatment but complementary historical capability;
- failed representation that exposes a narrower exact theorem.

This is not permission to evade negatives. The tested form remains closed. “Rebirth” requires a new contract with a specific changed premise.

## Consolidated next priorities

### Live now
1. Complete `WS2-CUT-BALANCE-PROJECTION` Stage-0 theorem/mechanic/novelty audit.
2. Use preserved technique discordance populations as response-guided premise inputs.
3. For portal-heavy beam contrast, test richer portal/parity/region structure before any routing rule.
4. For orientation contrast, prefer transformation-aware geometry and metamorphic checks over more count descriptors.
5. For width inversions, seek a retention/dominance decision-seam explanation before another width experiment.

### Deferred until trigger
- phase-conditioned checkerboard capacity;
- product projections;
- tiny-instance theorem harness;
- claim closure;
- partition refinement;
- envelope composition;
- independence-axis partial orders.

### Explicitly rejected
- generic research algebra framework;
- total ordering of development/confirmation/transfer roles;
- generic transitive closure of research relations;
- static routing from historical level identity/outcomes;
- broad architecture implementation before a decision-bearing premise.

## End state

The most important opportunity is methodological rather than one specific theorem:

> **Use the solver's own differential behavior as a microscope for discovering new exact current-input reasoning capabilities.**

That creates a closed invention loop in which existing evidence nominates mathematics, mathematics is attacked before implementation, existing decisions estimate consumer value, and only survivors buy solver compute.
