# Confirmation and common-mode audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — audited recent D1, work-ladder, Lane-A and F3 confirmation/replication language against the repository's multidimensional independence model.
> **Decision:** preserve role labels such as confirmation, but qualify exactly which independence dimensions they establish; correct same-artifact recombination language and add explicit common-mode disclosures where “independent” could be over-read.
> **Remaining gate:** apply the same dimension-specific language prospectively to confirmation/replication reports; require a machine independence vector only when the study already has a decision-bearing machine contract.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"treat independence as a vector of ancestry/common-mode dimensions, not a scalar adjective attached to confirmation","remainingGate":"use explicit dimension-specific disclosures prospectively; no scalar confidence or mandatory historical migration","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"recent D1, work-ladder, Lane-A and F3 confirmation/replication reports","inferenceScope":"evidence ancestry/common-mode semantics only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","scripts/research-independence-vector-lib.mjs","reports/2026-09-18-d1-stage2-independent-pilot-capture-result-001.md","reports/2026-09-18-ws2-post-d1-work-ladder-reuse-and-confirmation-preflight-001.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","reports/2026-09-17-lane-f3-topology-fork-population-expansion-result-001.md"],"prospective":{"expectation":"recent reports will usually have independent parents but shared source construction, implementation, ontology and authority context","surprise":"Lane A used “independently reconfirmed” for a second recombination of the same shard artifacts, which is reproducibility rather than evidence independence","anomaly":null}} -->

## Finding 1: reproducibility is not evidence independence

Lane A C0 had two successful post-fix recombinations of the same 20 shard artifacts.

That is useful evidence:

- deterministic combine/reducer stability;
- recovery-path correctness;
- result reproducibility from frozen source artifacts.

It is **not** a second evidence sample.

The report now says “separately recombined/reconfirmed from the same frozen shard artifacts” and explicitly states that the second recombination is not an independent evidence replication.

This distinction matters because repeated execution of one deterministic reducer should increase confidence in implementation stability, not silently multiply the scientific denominator.

## Finding 2: D1 independence is strong but narrow

The D1 Stage-2 confirmation genuinely earns:

- fresh parents relative to D1 development parents;
- outcome-blind seeded selection;
- parent-level independence for the recurrence claim;
- full coverage of the precommitted annotated slice.

It does not independently vary:

- Corpus-2/Class-5 source construction;
- production beam-retention seam;
- Pathfinder capture implementation;
- CP-SAT reference implementation;
- D1 eligibility/query conversion;
- analysis/reconciliation code;
- D1 ontology/framing;
- current authority context.

The report now contains an explicit independence-dimensions section. Its “independent confirmation” language should be read as **independent-parent confirmation at the same decision seam**, not independent implementation or distributional replication.

## Finding 3: work-ladder confirmation removes named confounds, not all ancestry

The work-ladder slice is legitimately confirmation-role evidence because current-run outcomes were collected after population, budget tiers and decision rules were frozen.

But the population is not pristine:

- eligibility itself uses a historical 1.2B-unsolved snapshot;
- all rows come from the same heavily mined Corpus-2 laboratory;
- the maintained solver/workflow stack is shared;
- work/node accounting and underdose framing are shared.

The confirmation is therefore best described as a **fresh precommitted current execution that removes the identified commit/history-aware-execution confounds**.

That is exactly what the report now says.

## Finding 4: F3 uses the right independence noun

F3's population expansion mostly says “independent parent families,” which is appropriately scoped to the actual independent unit. It does not generally claim independent implementation or a new distribution.

No correction was needed.

This is a useful wording pattern:

> independent parent/family units

is safer and more informative than:

> independently confirmed

when only sample ancestry changed.

## Taxonomy of repeated confirmation

The audit suggests four distinct benefits that are often collapsed into “replication”:

1. **rerun/recombination reproducibility** — same evidence, same pipeline;
2. **sample replication** — new independent units, same source/instrument;
3. **method replication** — different implementation/analysis path;
4. **transport replication** — different source construction/population regime.

A study can have more than one, but none implies the others.

The existing `research-independence-vector-lib.mjs` already provides the machine vocabulary for decision-bearing contracts. Reports should use plain language that names the same dimensions rather than inventing a scalar “independence strength.”

## Common-mode failure implications

Shared code and ontology are not automatically defects. They change which failures a confirmation can detect.

For example:

- fresh parents can falsify overfitting to the original parent population;
- the same CP-SAT implementation cannot independently detect a systematic CP-SAT modelling defect;
- the same eligibility implementation cannot detect a bug that excludes the same scientific counterexamples in both development and confirmation;
- the same ontology cannot reveal a missing category that neither pass knows how to represent.

Therefore a confirmation report should state not only what is independent, but which plausible common-mode failures remain shared.

## Promotion rule

Do not require a machine independence vector in every historical report.

Require it when:

- a decision-bearing machine experiment/analysis contract already exists;
- “independent confirmation/replication” materially affects promotion/closure;
- multiple evidence channels are being combined as if they provide separate support.

For ordinary narrative reports, dimension-specific prose is enough.

## Changes from this audit

- corrected Lane-A same-artifact “independently reconfirmed” wording;
- added D1 independence/common-mode disclosure;
- added work-ladder confirmation independence/common-mode disclosure;
- left F3's already-scoped independent-parent language unchanged.
