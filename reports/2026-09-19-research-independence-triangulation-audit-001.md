# Research independence / triangulation audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — D1 forensic replication plus independent Stage-2 production-boundary confirmation
> **Decision:** preserve the D1 channel disagreement rather than collapsing it: the exact relational discriminator is real in the forensic development setting but does not recur at the tested production beam-retention boundary.
> **Remaining gate:** none for this tested D1 consumer path; reopen only on a materially different decision seam/eligibility predicate/population.
<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"preserve the D1 channel disagreement rather than collapsing it: the exact relational discriminator is real in the forensic development setting but does not recur at the tested production beam-retention boundary","remainingGate":"none for this tested D1 consumer path; reopen only on a materially different decision seam/eligibility predicate/population","joins":{"researchQuestion":"WS2-D1-PRODUCTION-INERT-OBSERVATION","premiseRefs":["P091","P065","P206"],"measurementOpportunity":"MO-002"},"evidenceRole":"forensic","scope":{"populationIdentity":"reports/2026-09-18-d1-stage2-independent-pilot-capture-result-001.md","selection":"audit of the already-recorded D1 forensic-development and independent confirmation channels","inferenceScope":"independence/dependence structure of the D1 conclusion; not a new D1 effect estimate"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-18-d1-stage2-independent-pilot-capture-result-001.md","docs/solver-d1-production-inert-evidence-preflight.md"],"prospective":{"expectation":"nominally corroborating D1 channels may differ materially in population/decision seam and should not be averaged into one confidence judgment","surprise":"the exact forensic discriminator remains real while production-boundary disagreement is zero on the frozen independent slice","anomaly":null}} -->

## Why D1 is a useful audit specimen

D1 is exactly the kind of result a scalar “replicated / not replicated” label would damage.

The development/forensic line established a real exact relational distinction on selected matched LIVE/DEAD states.

The later production-inert confirmation asked a different, decision-relevant question:

> does that distinction recur on real production beam-cull candidates often enough to matter to the ranking consumer?

On a prespecified eight-parent confirmation population, the answer was no:

- 24 real cull decisions;
- 120 eligible candidates;
- 1,960 exact per-cell queries;
- 84% definitive support;
- 0 LIVE/NONZERO results;
- therefore 0 cutoff-crossing production disagreements.

The right synthesis is not “one study was wrong.” The channels measured related but non-identical constructs at different decision boundaries.

## Independence vector

| Axis | Relationship |
|---|---|
| Sample/data | **independent for confirmation**: eight Stage-2 parents were sampled excluding the three D1 development parents; the bounded 24-decision slice was frozen before outcomes |
| Parent/family | independent at parent level for the confirmation slice |
| Source/construction | partially shared: both arise from Pathfinder Class-5 search states, but forensic states and production beam-cull candidates are selected by different procedures |
| Instrument implementation | substantially shared: both depend on the Pathfinder exact/reference machinery and related normalization code |
| Analysis method | partially shared semantics, different aggregation/decision question |
| Analyst/model | no independence claim |
| Task framing/prompt | no independence claim |
| Authority/context exposure | no independence claim |
| Ontology/vocabulary | shared D1 relational-feasibility vocabulary |
| Critical code/library | exact/reference support and repository research libraries are shared common-mode dependencies |

The confirmation is therefore strong on **sample/parent and decision-seam independence**, not on implementation, analyst, framing or ontology independence.

That is enough for its scoped purpose: asking whether a forensic discriminator recurs at the production ranking seam.

It is not evidence that two independently implemented theories converged.

## Preserved disagreement

The synthesis should retain both statements:

1. **Forensic/mechanistic positive:** exact future-intersection commitment realizability can separate selected matched LIVE/DEAD states.
2. **Production-consumer negative:** under the frozen production-retention eligibility predicate, the same family of exact query produced no ranking disagreement on the independent confirmation slice.

The second narrows the first. It does not erase it.

This is precisely why the plan forbids forced consensus.

## Shared failure modes

The architecture inventory should be consulted before treating multiple D1 artifacts as independent confirmations:

`npm run research:system-inventory -- --view=architecture`

Important common-mode dependencies include:

- the exact/reference probe semantics;
- D1 case conversion/reconciliation code;
- shared identity and population-integrity owners;
- common solver state encodings.

A defect in those owners could affect both development and confirmation artifacts.

The sample-independence claim survives that observation; implementation-independence does not arise merely because separate workflow artifacts exist.

## Disposition

Part VIII's independence/triangulation requirement is satisfied by a real conclusion whose channels disagree in a scientifically meaningful way.

The useful output is the vector and scoped synthesis, not a score.
