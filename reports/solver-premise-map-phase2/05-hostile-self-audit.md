# Phase 2 hostile self-audit

Date: 2026-09-17
Phase: 2 only
Scope audited: `reports/solver-premise-map-phase2/00` through `04`
Execution guidance: `docs/solver-premise-map-mining-execution-plan.md` from still-open PR #1849

## Audit posture

This audit assumes the synthesis is wrong until its boundaries and inferences survive specific attacks. It does not add candidates, rank candidates, change Phase-1 outputs, or begin Phase 3.

## 1. Accidental recursive contamination of Phase-1 findings

**Attack:** Did Phase-2 interpretation leak backward into Phase-1 lens findings, or did later Phase-1 findings recursively use earlier lens discoveries?

**Check:** Phase 2 is on a branch stacked on the completed Phase-1 head. Phase-2 commits add only `reports/solver-premise-map-phase2/*`. No Phase-1 report is edited. Phase-1's own method record and replication index state that M1-M12 were run separately and that cross-lens reconciliation occurred only after all twelve were complete.

**Disposition:** survives. Phase 2 consumes finalized Phase-1 artifacts; it does not rewrite them. A final PR-file diff check is still required at closeout.

## 2. Correlation silently promoted to causation

**Attack:** Does repeated co-occurrence of an orphan positive and a missing consumer prove that the missing consumer caused failure to earn production treatment?

**Finding:** no. S2-C05 explicitly retains three rival readings: common missing decision contract, unrelated bespoke prototype gaps, and healthy queue gating. S2-C02 treats residual enrichment as a conditioning mechanism rather than a causal explanation for any particular solve. S2-C03 separates constructor and observer interventions specifically so their causal contribution can be tested.

**Correction applied in interpretation:** `common bottleneck` is a structural hypothesis, not an established cause. Counterfactual or matched-work discriminators are required before causal claims.

**Disposition:** survives with causal status deliberately unresolved.

## 3. Shared evidence mistaken for independent support

**Attack:** Twelve lenses can make one evidence family look twelve times stronger.

**Finding:** this is a major pseudoreplication risk. Phase 1 shares the frozen 142-proposition/166-relation map, hardening overlay, current residual corpus, research-function decomposition, repeated Class-5 survivor population, and repeated exact LIVE/DEAD assets. D1's 18 DEAD rows come from one parent; F3's expanded population covers seven parent families. Raw row count and lens count are not independent-unit counts.

**Guard:** `01-evidence-dependencies-observer-and-residual.md` states lens recurrence is conceptual triangulation, not empirical replication. S2-C04 makes independent unit explicit.

**Disposition:** survives. No candidate confidence is multiplied by lens count.

## 4. Architecture-specific results treated as timeless

**Attack:** Are current decision boundaries, stage names, candidate grammar, scheduler behavior, or telemetry assumed to persist across solver epochs?

**Historical check:** M8 separates portable semantic/inference rules from epoch-bound empirical magnitude and economics. Rename-aware solver archaeology records vocabulary lineages including `archetype -> routing regime`, compact attempt keys -> canonical structured attempt identities, `diverse beam -> mechanic-bucket retention`, `dedup near-tie -> coarse-state near-tie retention`, `atlas/oracle -> labelled branch/reference model`, `trove -> variant family dataset`, and `random/randoms -> corpus2`. The archaeology also documents old tests whose intended mechanism did not participate because of option/result transport failures.

**Guard:** S2-C05's abstract producer/authority/lifetime/consumer schema is proposed as portable vocabulary, while the actual consumer is explicitly architecture-epoch-specific. S2-C06 and S2-C12 require a current decision-point census instead of projecting old architecture forward.

**Disposition:** survives. Historical aliases and retired implementation forms are evidence lineages, not current authority.

## 5. Residual-population effects mistaken for general Pathfinder properties

**Attack:** Does a result on the 390-level current Class-5 residual become a claim about all levels?

**Finding:** this is precisely the risk isolated by S2-C02. Current residuals are endogenous to predecessor capabilities and portfolio order. Lane A's 121/390 separator prevalence, for example, is a prevalence claim on the current survivor population unless separately transferred.

**Guard:** Phase 2 distinguishes `useful complement under current portfolio` from `general property of Pathfinder`. The former may be decision-relevant without the latter.

**Disposition:** survives.

## 6. Instrumentation and observer effects ignored

**Attack:** Are measured phenomena assumed to exist independently of how states were constructed and observed?

**Repository counterexamples:** D1's naive walk and single-pick production-search sampling found no LIVE states, while the later multi-pick constructor did. F3 population expansion changed the decision interpretation because all decision-relevant discordance was tied. The queue also corrected a Class-3 apparent negative to `dose-unverified` when per-technique telemetry was absent.

**Guard:** S2-C01 and S2-C03 distinguish measurement authority, constructor identity, censoring, participation, and observer regime. They propose constructor-swap versus observer-swap discrimination rather than assuming one effect.

**Disposition:** survives.

## 7. Generated-candidate limitations mistaken for selector limitations

**Attack:** Does a failed retained path imply bad ranking/retention even if the useful continuation was never generated?

**Finding:** not established. S2-C09 requires first irreversible loss at the same semantic granularity: `not generated` versus `generated then lost/deprioritized`. Conversely, generation work is not justified if downstream selection would erase the generated continuation.

**Disposition:** survives. No locus is presumed dominant.

## 8. Information production conflated with immediate path progress

**Attack:** Does Phase 2 value only actions that directly extend a path, or conversely assume that information probes are inherently worthwhile?

**Finding:** S2-C08 explicitly separates information value from path-progress value but does not establish runtime value. Its discriminator fully charges the probe under matched total work and requires a downstream action change. S2-C13 separately tests whether an artifact remains useful after spending on the producing action stops.

**Disposition:** survives. Runtime information-valued action remains a hypothesis, not a recommendation.

## 9. Hidden assumptions about state retention, transfer, authority, lifetime, and consumers

**Attack:** Does `use this signal` hide where the signal lives, how long it survives, what authority it has, and who consumes it?

**Finding:** this is the central live-state anomaly exposed by S2-C01/C05/C06/C10/C13. Phase 2 therefore makes producer, identity/generalization unit, authority, lifetime/transfer radius, consumer, counterfactual action, work semantics, and invalidation explicit fields rather than silent assumptions.

**Disposition:** survives as an identified gap; whether the remedy belongs in code, tooling, or documentation remains unresolved.

## 10. Ontology problems mislabeled as solver ideas

**Attack:** Are bookkeeping/interface discoveries being dressed up as solve-count ideas?

**Finding:** the candidate ledger explicitly classifies candidates as ontology/interface, evidence dependency, scope split, experimental primitive, relation insight, lifecycle issue, or plausible new-premise candidate. Several of the strongest survivors are research-governance or interface distinctions, not solver treatments.

**Disposition:** survives. No implementation is implied by classification.

## 11. Broad parent premises preserved merely because child implementations failed

**Attack:** Does a failed child treatment automatically keep its broad parent alive forever?

**Historical evidence:** M8/P137 permits keeping a parent open only when tested form and parent are not semantically equivalent. Rename-aware archaeology contains concrete cases where apparent negative evidence was confounded by disabled participation, transport omissions, bundled treatments, or reverted broad architecture. Those cases justify reopening the evidence question, not presuming the parent true.

**Guard:** Phase 2 requires a smallest discriminator for each candidate. Failure of one child narrows that child unless semantic equivalence to the parent is shown; it does not positively support the parent.

**Disposition:** survives.

## 12. Historical negatives overgeneralized beyond work contract or solver epoch

**Attack:** Are old nulls treated as current closure after architecture, population, work allocation, naming, or telemetry changed?

**Finding:** M8 explicitly rejects this. The archaeology adds concrete participation failures: historical intersection-blueprint planning was omitted from solve-context transport and later incurred unrelated policy sweeps; basin-overlap telemetry initially lost identity fields and mechanically reported trivial overlap; prefix-divergence treatments lost options/history through transport. These are not clean present-tense negatives.

**Guard:** S2-C01 carries work contract, participation/dose, epoch and instrumentation with authority; S2-C02 carries predecessor population; S2-C03 carries constructor/observer.

**Disposition:** survives.

## 13. False unification of technically distinct positives

**Attack:** Is `missing decision contract` an attractive umbrella that erases real mechanism differences?

**Finding:** Lane A decomposition, D1 future-intersection realizability, D3 commutative path transformations, F3 topology descriptors, and H3 allocation evidence have different truth conditions and costs. `02-orphan-positives...` explicitly limits the proposed commonality to the observation-to-decision interface and decision-state layer.

**Discriminator:** attempt to map two technically unrelated positives to a compact existing-consumer contract. If they require unrelated new architectures, retire the broad unification.

**Disposition:** survives only as a bounded latent-parent hypothesis.

## 14. Aggregate ranking or disguised prioritization

**Attack:** Does the ledger's `survived adversarial reinterpretation` grouping secretly rank expected solve value?

**Finding:** no score, ordering, expected solve count, or queue priority is assigned. Robustness to rival explanation is a different property from expected solver value. The ledger says so explicitly.

**Disposition:** survives. Phase 3/queue handoff owns any later prioritization.

## 15. Canonical admission, queue mutation, solver mutation, or Phase-3 leakage

**Attack:** Did local handles `S2-C01` through `S2-C13` become premise IDs, or did synthesis alter production/research authority?

**Check:** the handles are explicitly local Phase-2 report labels. No canonical premise-map, overlay, snapshot, queue, workstream authority, solver source, or production configuration has been intentionally changed. No Phase-3 reconciliation/admission has been performed.

**Disposition:** survives subject to final branch diff verification.

## Audit conclusion

Phase 2 survives the hostile audit with three important constraints retained:

1. the apparent common `positive phenomenon -> no production treatment` seam is a testable interface hypothesis, not a proven root cause;
2. the most durable outputs are several distinctions and missing experimental primitives, not a ranked set of solver features;
3. architecture-, population-, constructor-, work-, and authority-conditioning must remain attached to any Phase-3 reconciliation.

No hostile-audit finding requires modifying Phase-1 evidence or crossing into Phase 3.
