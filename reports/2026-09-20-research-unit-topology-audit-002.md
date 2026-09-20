# Research unit-topology audit 002: non-WS2 completion

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — reopened audit 001 because its stated cross-domain scope had actually concentrated on WS2/Class-3; checked family/variant, hint/provenance, exact/reference and repeated-technique evidence.
> **Decision:** one additional live seam required hardening: family-boundary mutation rates are row-weighted descriptive summaries over correlated sibling variants. Current family-boundary output now carries explicit unit topology and names parent family as the dependence/generalization unit. Hint and exact/reference paths already preserve the relevant separation.
> **Remaining gate:** use the shared unit-topology shape prospectively when a current study has multiple scientifically distinct units; no historical mass migration.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"complete the non-WS2 unit audit and harden family-boundary output where sibling-row counts could be over-read as independent evidence","remainingGate":"prospective adoption only where live studies have distinct observation/opportunity/dependence/generalization units","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"family/variant, hint/provenance, exact/reference and repeated-technique research tooling","inferenceScope":"research unit topology and dependence semantics"},"claimRefs":[],"sourceArtifacts":["docs/variant-level-research.md","scripts/family-boundary-lib.mjs","scripts/hint-discovery-process-evidence-lib.mjs","scripts/hint-failure-process-join-lib.mjs","scripts/stress/cpsat-explicit-prefix-reference-lib.mjs","scripts/research-unit-topology-lib.mjs","reports/2026-09-20-research-unit-topology-audit-001.md"],"prospective":{"expectation":"family/variant research is the highest-risk non-WS2 pseudoreplication surface because many siblings share one parent","surprise":"the current doctrine already states parent-family independence strongly, but the boundary-report machine artifact did not carry that semantics alongside row-weighted mutation rates","anomaly":null}} -->

## Why this pass exists

Audit 001 introduced the shared six-field unit-topology shape, but its concrete inspection centered on WS2 failure-response and Class-3 dose. The session taxonomy had explicitly called for a broader non-WS2 pass.

This report closes that scope gap.

## Family / variant research

`docs/variant-level-research.md` is scientifically clear:

- sibling variants are correlated;
- row count is not independent evidence;
- parent family is the generalization unit;
- held-out splits should occur by whole parent family;
- inferential summaries should use parent weighting/clustering where appropriate.

The live `family-boundary-lib.mjs` nevertheless produced mutation-conditioned rescue/flip/config-switch rates as raw variant-row summaries without carrying those unit semantics in the output.

Those rates are useful for triage, but an artifact consumer could over-read `N` as independent support.

### Repair

Family-boundary output now carries the shared `unitTopology`:

- observation: generated variant solver-result row;
- opportunity: parent + controlled transformation;
- assignment: none for this retrospective diagnostic;
- dependence cluster: parent family;
- analysis: family findings plus row-weighted descriptive mutation summaries;
- generalization: independent parent family.

It also emits a machine/human warning that mutation-summary rates are row-weighted descriptive statistics and sibling variants are not independent generalization units.

No existing row summary was deleted because it remains useful descriptive telemetry.

## Hint provenance / failure joins

Current hint-discovery evidence already carries the experiment contract's independent unit. The failure-process join further states that:

- comparison keys require parent + exact protocol hash + immutable solver ref;
- repeated runs may differ by run ID but remain dependent observations within one parent;
- independent matched support is counted in parents.

No additional shared-unit wiring is needed there.

## Exact/reference queries

The generic explicit-prefix reference library normalizes query cases. A case row is a query/observation, not automatically an independent scientific unit.

That is the correct layer boundary. D1 and H1 consumers own their actual candidate/state/parent denominators and already distinguish query counts from parent/candidate support where the claim depends on that distinction.

Adding a universal `parentId` or generalization rule to the generic exact-query library would be wrong because one level can legitimately host multiple different study units.

## Repeated technique evidence

Technique-census comparisons are primarily level-matched: technique rows are joined by level and pairwise/incremental effects count shared level identities rather than treating attempts as independent samples.

The current risk there is exposure/work comparability, handled by the resolution/work-dose machinery, rather than attempt-row pseudoreplication.

## Conclusion

The shared unit-topology abstraction remains appropriately small. This second pass found one concrete propagation gap, in family-boundary artifacts, and no evidence for expanding the primitive into a universal sampling ontology.
