# Phase 3 hostile self-audit

Date: 2026-09-17
Branch: `chatgpt/phase3-premise-map-reconciliation-2026-09-17`
PR: #1852

## Audit posture

Assume Phase 3 is wrong until the repository proves otherwise. In particular, do not treat `new-looking` synthesis language as semantic novelty, do not reward repeated mining-lens appearances as replication, and do not let queue hunger convert methodological premises into solver projects.

## 1. Did Phase 3 invent duplicate premise IDs from Phase 2?

**Attack:** S2-C01..C13 were written in candidate language and several survived the Phase-2 hostile audit. A mechanical Phase 3 could have assigned P201+ to all of them.

**Result:** no. Every S2 candidate was compared against P001-P200 and PV1-001..008. All thirteen were disposed as already represented territory, relation/scope synthesis, ontology/interface consequence, or experimental/audit primitive. None received a separate ID.

**Important examples:**

- S2-C02 is already P181/P182.
- S2-C06 is already P148/P180/P194/P200 territory.
- S2-C08 is explicitly P136/P142/P185 territory.
- S2-C09 is already P020/P024/P135/P195.
- S2-C05 is retained as a falsifiable integration hypothesis across P193/P197/P198/P200, not promoted into a fictitious universal mechanism.

Disposition: **passes**.

## 2. Did admission merely rubber-stamp the post-v1 register?

**Attack:** eight PV1 candidates existed before mining. Phase 3 could have admitted all eight by inertia.

**Result:** no.

- PV1-002 is kept as a scope relation rather than given an umbrella ID because P201/P199/P158/P190/P191 already separate the relevant independence questions.
- PV1-007 remains deferred because its own admission gate requires recurring harmful transformation first-divergence evidence that the mining round did not supply.
- Six candidates survive semantic reconciliation as P201-P206.

Disposition: **passes**.

## 3. Are P201-P206 actually semantically distinct from v1?

### P201 causal-ancestry support

Closest v1 territory is P199 generalization unit plus P188 observer conditioning and P002 population relevance. None says that multiple descendant reports/rows from one causal observation count as one support lineage. This is not a rewording of `independent unit`; it governs how evidence volume changes confidence.

### P202 consumable evidence role

P005 handles temporal/architecture portability and P198 maturity. Neither represents the state transition in which formerly untouched confirmation evidence becomes development evidence for descendants after adaptive use.

### P203 claim propagation

P197 names authority classes and P198 maturity stages. Neither states that a correct source claim can become broader/stronger while moving through downstream repository consumers. S2-C01 independently surfaced this gap.

### P204 causal discriminability

P003/P137 constrain negative inference and P183 specializes counterfactual first-loss. No parent says an observation earns a causal conclusion only insofar as rival explanations would have produced different observations.

### P205 reciprocal map coverage

P196 concerns ontology-edge blindness. Reciprocal source coverage asks a different direction: whether premise-bearing source regions were sampled at all. H16 deliberately kept this outside v1 until after frozen mining.

### P206 causal opportunity population

P002 says population relevance matters and P151 says treatment participation must be verified. Neither defines decision-bearing sample size as the intersection on which treatment can causally change the outcome.

Disposition: **passes**, with the caveat that these are methodological/epistemic premises and must not be mistaken for solve mechanisms.

## 4. Did Phase 3 mistake correlated Phase-1 lenses for empirical replication?

**Attack:** P201/P203/P204/P206 are reinforced by Phase 2, but Phase 2 itself inherited correlated lens/source material.

**Result:** admission arguments do not count lens frequency as independent empirical support. They use Phase 2 primarily as independent semantic rediscovery after the candidates were quarantined from v1 mining, and they retain the causal-ancestry warning as part of P201 itself. Source authority and direct operating contracts remain distinct from mining recurrence.

Disposition: **passes**.

## 5. Did Phase 3 overwrite the frozen mining input?

**Attack:** candidate admission belongs after mining, but directly editing v1 would corrupt provenance and make Phase-1 findings appear to have mined facts inserted by Phase 3.

**Result:** v1 files are not edited. P201-P206 live in `solver-premise-space-extension-2026-09-17d.csv`; new relations live in `solver-premise-space-relations-v4.json`; `solver-premise-map-snapshot-v2.json` explicitly names v1 as parent and records the original v1 commit/counts. The v2 auditor also asserts those frozen parent values.

Disposition: **passes**.

## 6. Did the new map version have an integrity blind spot?

**Finding discovered during audit:** yes, initially. The existing `scripts/audit-solver-premise-map.mjs` is intentionally hard-coded to the frozen v1 canonical files/overlay. It would therefore pass without inspecting the new `17d` extension or `relations-v4`.

**Repair:** added `scripts/audit-solver-premise-map-v2.mjs` and wired it into `.github/workflows/premise-map-hardening.yml` while leaving the v1 auditor untouched. The v2 audit verifies:

- v1 snapshot ID, commit and counts are preserved;
- v2 contains every v1 premise/relation file plus the new layers;
- proposition/relation counts match the v2 manifest;
- IDs are unique and relation premise endpoints resolve;
- P201-P206 are exactly the admitted extension IDs and each has a v4 relation;
- PV1-002 remains scope-only and PV1-007 remains deferred;
- machine-readable admission provenance exists and agrees proposition-for-proposition with the canonical extension.

Disposition: **found and repaired before closeout**.

## 7. Did admitted IDs become provenance/maturity orphans?

**Finding discovered during audit:** the first canonical extension/report pair was human-reviewable but did not encode the full addition-template metadata mechanically.

**Repair:** added `docs/solver-premise-map-v2-admissions.json`, recording semantic novelty class, parent/siblings, locus, claim type, scope/lifetime, evidence state, population, epoch, sources, discovery lineages, authority, maturity, confidence-changing observations, production permission, temporal dependencies, relations, tensions, affected research functions, information lifetime/transfer radius, and generalization unit for every admitted premise. The v2 auditor checks required fields and proposition equality.

Disposition: **found and repaired before closeout**.

## 8. Did Phase 3 silently turn methodological premises into solver recommendations?

**Attack:** P201-P206 sound important. Queue pressure could make `important` become `build something`.

**Result:** the execution handoff explicitly gives P201-P206 no immediate solver task. They govern evidence interpretation. The live queue update is instead anchored to already-positive solver phenomena plus existing P193/P197/P198/P200.

Disposition: **passes**.

## 9. Is the queue handoff precise enough to belong in live authority?

The handoff is not `investigate consumer contracts` generically. It names:

- population/source positives: Lane A, D1, F3;
- exact fields to inventory: producer, authority, independent unit, lifetime, existing consumer, available/missing state, counterfactual action, abstention, cost/displaced-work bound, replay fidelity;
- pass condition: at least two technically unrelated positives map to existing decisions using the same contract fields without a new subsystem;
- fail condition: each needs materially unrelated architecture/state/consumer;
- split condition: shared description but only one economical local consumer;
- first descendant if locally positive: D1 retained-evidence consumer/economics falsifier;
- explicit stop conditions before implementation;
- no authorization for a new solver sweep or production treatment.

It therefore satisfies the execution-plan requirement for a precise gate, stop condition, evidence contract and correct owner. `solver-future-work.md` remains untouched.

Disposition: **passes**.

## 10. Is D1 being over-promoted because its exact-labelled separation looks strong?

No. The handoff preserves the distinction between a diagnostic/observer result and consumer authority. A prune/forced-move use would require soundness; rank/retain use cannot inherit prune authority from exact-labelled correlation. The next descendant is only an offline consumer/economics falsifier, and even that requires the consumer census to pass locally.

Disposition: **passes**.

## 11. Did Phase 3 collapse architecture epochs or historical negatives?

No new historical mechanism verdict was made. P201-P206 are research-method premises whose concrete applications still carry architecture/population/work-contract conditions. The Phase-2 rename-aware historical caveats remain intact. No old negative was reopened or broadened merely because a new premise was admitted.

Disposition: **passes**.

## 12. Did Phase 3 begin the handed-off research itself?

No. The consumer-contract census is placed into WS2 as the next gate; it is not executed in Phase 3. No D1 replay, live prototype, exact-query production path, solver implementation, production promotion or new solver sweep was started.

Disposition: **passes**.

## 13. Did Phase 3 mutate unrelated authorities or Phase-1/2 evidence?

Repository diff from the Phase-2 head is limited to:

- new Phase-3 reports;
- new post-v1 premise extension/relations/snapshot/admission record;
- versioned v2 auditor plus hardening-workflow wiring;
- one bounded update to canonical `solver-optimization-workstreams.md`.

No Phase-1 or Phase-2 artifact was edited. No frozen v1 snapshot/overlay/preregistration file was edited. No solver source, test behavior, runtime configuration, production policy, corpus, dataset or experiment result was changed.

Disposition: **passes**.

## 14. CI/review state at audit time

PR #1852 is open and mergeable. Final-head CI and premise-map hardening have been triggered after the last validation/provenance changes; at the opportunistic checkpoint they were pending/queued. Per the execution instruction, they are not being repeatedly polled. Review-thread state is checked once more at closeout rather than used as a substitute for this repository audit.

## Audit conclusion

Two real Phase-3 integrity weaknesses were found and repaired: v2 was initially invisible to the frozen-v1 validator, and admitted-premise metadata was initially human-only rather than fully machine-readable. After those repairs, the phase boundary is coherent:

- semantic reconciliation precedes IDs;
- six post-v1 premises are admitted, two are not;
- no Phase-2 candidate is double-counted;
- v1 remains frozen;
- v2 is explicit and auditable;
- queue handoff is one bounded falsifier path, not a speculative backlog;
- production remains unearned.
