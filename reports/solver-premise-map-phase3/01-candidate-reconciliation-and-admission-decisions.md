# Phase 3 candidate reconciliation and admission decisions

Date: 2026-09-17
Branch: `chatgpt/phase3-premise-map-reconciliation-2026-09-17`
Base: Phase-2 head / PR #1851
Execution guidance: `docs/solver-premise-map-mining-execution-plan.md` from still-open PR #1849

## Method

Phase 3 treats the Phase-2 `S2-Cxx` handles as hypotheses to reconcile, not as a new-ID backlog. Each item was compared semantically against the frozen v1 inventory P001-P200 (including the three extension files), the pre-mining post-v1 candidate register `docs/solver-premise-space-post-v1-candidates-2026-09-17.csv`, the hardening/addition rules, and current live research authority.

The admission question is semantic: does the candidate add a materially new parent, a necessary scope split, a new evidence-state transition, a meaningful specialization, or a relation that cannot be represented by existing premises? Vocabulary novelty, repeated appearance across correlated mining lenses, and usefulness as a checklist are insufficient.

The frozen v1 snapshot is not edited. Any admitted inventory belongs to a separately versioned post-v1 map.

## Phase-2 candidate dispositions

| Phase-2 handle | Closest existing/post-v1 territory | Phase-3 disposition | Reason |
| --- | --- | --- | --- |
| S2-C01 evidence authority must travel with evidence | P197, P198; PV1-004 | **merge into PV1-004 / relation+interface insight; no separate ID** | P197 already distinguishes authority classes and P198 distinguishes maturity gates. The genuinely new part is downstream claim propagation preserving scope/authority/ancestry, already proposed by PV1-004. |
| S2-C02 residual as predecessor-portfolio negative image | P181, P182 | **already represented; no new ID** | P181 explicitly defines the residual as an endogenous survivor population; P182 makes predecessor order/value conditioning explicit. Phase 2 strengthens their use, not their semantics. |
| S2-C03 constructor and observer jointly shape visible phenomenon | P188, P190, P191, P158 | **relation/scope synthesis; no new ID** | Observer missingness/perturbation and constructor/generator selection effects already have separate canonical parents. The useful result is to analyze them jointly for a study, not to invent another umbrella premise. |
| S2-C04 independent unit is decision-bearing | P199; PV1-001, PV1-002, PV1-008 | **split across existing/post-v1 candidates; no separate ID** | P199 owns identity-free generalization unit; PV1-001 owns causal ancestry for support volume; PV1-008 owns opportunity population. One `independent unit` premise would re-conflate distinct questions. |
| S2-C05 observation-to-decision contract | P193, P197, P198, P200 | **ontology/interface synthesis; no new premise ID** | The producer/authority/lifetime/consumer schema is a useful contract vocabulary. Its semantic pieces are already represented. Treat it as an integration test over existing premises, not a universal runtime mechanism. |
| S2-C06 non-puzzle decision state | P148, P180, P194, P200 | **already represented; no new ID** | Search-process knowledge, work-history state, contextual dominance, and artifact lifetime already express the proposed semantic territory. A decision-state census remains a useful audit primitive. |
| S2-C07 counterfactual consumer test | P183, P198, P175 | **experimental primitive; no premise ID** | `decision replay` is a method for cheaply falsifying consumer value. It does not by itself assert a new solver-world proposition. |
| S2-C08 information value differs from path progress | P136, P142, P185 | **already represented; no new ID** | P185 explicitly states that some actions may be valuable primarily for information rather than final-path membership; P136/P142 cover epistemic-action choice. |
| S2-C09 generation versus selection | P020, P024, P135, P195 | **relation/scope clarification; no new ID** | The candidate-generation/reachability/first-loss partition is already canonical. Phase 2 correctly restores it as a prerequisite for selector claims. |
| S2-C10 derived facts need an explicit consumer class | P193, P197, P162, P200 | **interface consequence; no new ID** | This is the consumer side of existing handoff, authority, knowledge-sharing, and lifetime premises. |
| S2-C11 reusable consumer/economics envelope | P187, P198 plus scheduling/evaluation authority | **research-method primitive; no premise ID** | The proposed envelope operationalizes existing matched-work and promotion rules. It is useful precisely because it is not another semantic premise. |
| S2-C12 current decision-state/consumer census | P148, P193, P197, P200 | **audit primitive; no premise ID** | A census tests whether a state/consumer gap actually exists. Its output may nominate a premise later; the census itself is not one. |
| S2-C13 action/artifact values have different half-lives | P200, P177, P193 | **special case already contained by P200; no new ID** | P200 explicitly asks the useful information half-life and transfer radius of every expensive fact or search artifact, independent of the action that produced it. |

### Phase-2 conclusion

None of S2-C01..C13 earns a *separate* canonical premise ID. This is a positive reconciliation result rather than a null mining result: Phase 2 independently rediscovered and connected several young P177-P200 premises, exposed missing relations among them, and supplied concrete audit/consumer primitives. Assigning new IDs would double-count the map's newest territory.

## Post-v1 candidate dispositions

The pre-mining post-v1 register exists specifically because the source-coverage hardening pass found new material after the v1 freeze. Phase 3 can now compare those candidates against the completed independent mining round without contaminating Phase 1.

| Candidate | Phase-3 disposition | Canonical action | Admission-gate reasoning |
| --- | --- | --- | --- |
| PV1-001 causal-ancestry / clustered independent support | **ADMIT** | P201 | No v1 parent cleanly entails causal-ancestry accounting for support volume. P199 asks the generalization unit, not how correlated evidence should contribute confidence. Phase-1/2 pseudoreplication analysis independently made this distinction decision-bearing. |
| PV1-002 independence dimensions are not substitutes | **DO NOT ADMIT SEPARATELY** | relation/scope note under P201 + P199/P158/P190/P191 | The distinction is correct, but a separate node would mostly enumerate scopes already divided among P201 (evidence independence), P199 (generalization unit), P158 (label-support selection), and P190/P191 (generator/distribution selection). Preserve the split in prose/relations rather than add an umbrella ID. |
| PV1-003 evidence is consumable/path-dependent | **ADMIT** | P202 | P005 handles architecture/population freshness; P198 handles maturity gates. Neither says that observing confirmation evidence changes its future epistemic role for descendants. The transition is explicit in evaluation authority and cannot be represented as timestamp metadata alone. |
| PV1-004 downstream belief/claim propagation can broaden authority | **ADMIT** | P203 | P197 and P198 define valid authority/maturity at a point. They do not represent semantic drift while a conclusion propagates through reports, memory, future-work, and priority authority. S2-C01 independently rediscovered the need for carried authority/scope context. |
| PV1-005 causal conclusions require discriminability against rivals | **ADMIT** | P204 | P003/P137 guard against overbroad negative closure and P183 specializes counterfactual causality. No existing parent states the general discriminability requirement. Phase-2 rival-interpretation and hostile-audit work repeatedly required it. |
| PV1-006 map completeness needs reciprocal source coverage + independent saturation | **ADMIT** | P205 | P196 attacks ontology-edge blindness but not reverse source coverage. H16 deliberately kept this discovery outside v1. The execution boundary that blocked admission during frozen mining has now expired; Phase 3 is the intended admission point. |
| PV1-007 full finite-budget search equivariance under isomorphic transformation | **DEFER / GATE UNMET** | retain as post-v1 candidate, no P-ID | Semantic novelty is plausible, but its own gate requires recurring harmful first-divergence evidence that cannot be reduced to ordinary ordering/retention. Phase 2 did not supply that evidence. |
| PV1-008 opportunity population, not nominal N, governs decision-bearing detectability | **ADMIT** | P206 | P002 covers population relevance and P151 treatment participation, but their intersection does not explicitly define causal opportunity N. S2-C04/C11 and the live research operating model repeatedly depend on this distinction. |

## Admitted post-v1 propositions

The admitted propositions are deliberately epistemic/methodological. They do not authorize solver behavior or claim solve gain.

- **P201 — evidence support must be ancestry-aware.** Apparent support volume must be reduced to independent causal ancestry or the appropriate clustered independent unit before it increases confidence in a premise.
- **P202 — evidence role is consumable/path-dependent.** Once an evaluation block or population outcome influences descendant design, it becomes development evidence for those descendants even if it was originally untouched confirmation evidence.
- **P203 — downstream claims must preserve semantic authority.** As a result propagates across repository consumers, its scope, conditioning, authority, ancestry, and maturity must not silently broaden.
- **P204 — causal evidence requires discriminability.** An observation supports a causal research conclusion only to the extent that it could discriminate that conclusion from materially different rival explanations.
- **P205 — map completeness requires reciprocal coverage and independent saturation evidence.** Proposition provenance/internal graph coverage alone cannot establish that premise-bearing source regions were sampled.
- **P206 — causal opportunity population governs detectability.** Decision-bearing experiment size is the population on which the treatment can causally change the tested outcome, not raw row count or feature eligibility alone.

## Why the live-state anomaly does not itself become P207

S2-C05 is useful, but it is better modeled as a cross-premise integration test over P193/P197/P198/P200 than as a new claim. The anomaly can arise under three rival explanations that remain live: a genuine shared interface gap; unrelated missing local prototypes; or healthy research gating. A new parent ID would suggest more unification than the evidence earns.

The proper Phase-3 action is therefore a bounded consumer-contract handoff that can *falsify the unification*. If technically unrelated positives cannot be expressed against the same existing decision-contract fields, retire the cross-cutting interpretation and keep the positives local.

## Boundary

This report assigns admission decisions but does not modify the frozen v1 snapshot. The admitted inventory will be written as a new post-v1 extension and separately versioned snapshot. Solver queue changes, if any, must be justified from explicit falsifiers/consumers after this semantic reconciliation rather than from candidate count.
