# Solver archaeology: failure learning and producer/consumer handoff

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — failure-learning and producer/consumer handoff mechanisms were separated into materially distinct historical classes.
> **Decision:** preserve the narrowed premises and distinctions without changing current solver priority or production behavior.
> **Remaining gate:** require a current producer/consumer failure signal before promoting any historical learning-handoff descendant.

## Failure-learning lineage

Pathfinder's history distinguishes three mechanisms that older labels sometimes blur:

1. **Repair-local experience memory**: exact/fine state signatures whose previous randomized repair continuation failed. This can suppress repeated incomplete-search work, but does not prove global deadness.
2. **Sound projected memoization/direct predicates**: admissible lower-bound caches and compact proven prune conditions.
3. **Sound generalized failure certificates**: reasons intended to apply across genuinely distinct exact states.

July's coarse global nogood signature `(mpVisitedMask, mustCrossMask, remaining length)` was directly falsified as a sound key: the same signature occurred on both a dead end and a successful path.

The later repair-local premise check found 53.65%-98.09% recurrence of terminal failed-state signatures on seven hard repair-close levels. This justified an exact repair experience cache and produced work reductions plus a small targeted-sample solve gain. Later documentation correctly narrowed the semantics: these states were not SAT/CP-style proven UNSAT; they had failed under one incomplete randomized continuation policy.

August then ran the genuinely logical learned-certificate programme. The 2026-08-24 audit correctly refused a generic CDCL/LCG build and selected expensive connectivity rejection as the first possible reason source. Stage A found substantial coarse recurrence across distinct exact states. Stage B produced a boundary/blocker sketch with recurrence above literal exact-state recurrence, but 91.2% of that recurrence remained within one level; only 1.9% of distinct shapes crossed levels. That tripped the experiment's prespecified stop condition and closed the **cross-level connectivity-certificate** direction.

A narrower within-solve/within-level boundary-shape reuse candidate was explicitly surfaced but not scoped or recommended. This matters for the current Class-5 compact-dead-cause work: September's one verified repeated minimal dead boundary/corridor across structurally different beam states should be interpreted as evidence for the narrower solve-local scope, not as a reason to reopen the already-negative cross-level generalized-certificate form.

### Archaeological disposition

- broad CDCL/LCG remains unearned;
- cross-level connectivity-derived certificates are closed by Stage B;
- repair experience memory is useful but is not logical deadness;
- solve-local compact sound reasons remain conditionally open only if recurrence and repeated-work materiality are demonstrated.

## Beam -> repair producer/consumer lineage

The August producer-population work first measured whether beam and repair generated genuinely different information. A stratified 25-level follow-up observed 942 beam artifacts and 1,657 repair-elite arrivals with **zero exact-prefix overlap and zero metric-projection overlap on every level**. This strongly established non-redundancy.

The report explicitly warned that non-redundancy was not consumer value and prescribed the correct counterfactual: budget-match a repair run that receives beam survivors against ordinary repair and measure repair's own outcome.

That gate was in fact built immediately afterward under `enableBeamSeed` / `STRATEGY_REPAIR_BEAM_SEED`. A small width-20, 3,000-node beam produced survivors before repair's restart loop; valid survivors entered repair through the ordinary `considerElite()` path. Beam cost was charged against repair's native node budget, so this was a real producer/consumer trade rather than free additive work.

The isolated `repairSearchFromGate` counterfactual initially looked positive: R00701 changed from badness 2 to solved at a matched 2M-node direct-repair budget, with no losses in the n=13 sample. But the required full-ladder retest killed the capability claim. At the production-realistic 25M-node envelope, ordinary repair fallback already solved R00701 with the flag off. Full-ladder result: **2/13 solved in both arms, identical solved IDs, +3.5% total nodes for zero benefit**.

### Archaeological disposition

The tested form `beam survivor -> repair elite pool` is negative at the production envelope. Do not resurrect it merely because producer populations are non-overlapping.

The broader typed producer/consumer premise is not globally falsified. What this experiment proves is stricter:

- information novelty is insufficient;
- a receptor must have an actual capability deficit that the producer artifact repairs;
- isolated receptor tests can manufacture gains by starving the control more than production does;
- every handoff needs full-ladder verification at the shipping resource envelope;
- the artifact and receptor must be complementary in *use*, not merely different in origin.

Any future producer/consumer experiment therefore needs a different causal story than `beam has states repair does not`: it must predict why a specific consumer can exploit a specific artifact better than its own native search under matched full-ladder work.

## Combined implication

The learning and handoff histories point to the same methodological rule: **representation novelty is not value by itself**. A compact reason must recur where it saves material future work; a producer artifact must change the consumer's capability under the real resource envelope. Both should be evaluated first with observer/counterfactual evidence and explicit participation/work accounting.