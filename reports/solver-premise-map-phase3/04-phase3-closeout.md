# Phase 3 premise-map reconciliation closeout

Date: 2026-09-17
Branch: `chatgpt/phase3-premise-map-reconciliation-2026-09-17`
PR: #1852
Base: Phase-2 branch / PR #1851
Execution guidance: `docs/solver-premise-map-mining-execution-plan.md` from still-open PR #1849

## Status

Phase 3 is complete. It stops after candidate reconciliation, post-v1 map admission, validation hardening, and bounded queue handoff. It does not execute the handed-off consumer census, build a solver treatment, begin a live experiment, or promote anything to production.

## Completed work

1. Re-verified Phase 2 before beginning Phase 3: final-head CI successful, PR mergeable, no review threads/submitted reviews, and Phase-2 diff confined to its intended reports.
2. Created the Phase-3 branch and PR before substantive work.
3. Reconciled all Phase-2 `S2-C01..S2-C13` candidates against P001-P200 and the post-v1 candidate register.
4. Reconciled all eight `PV1-001..PV1-008` candidates against the frozen map and completed mining evidence.
5. Classified semantic novelty before allocating any new premise ID.
6. Admitted six genuinely distinct post-v1 premises as P201-P206.
7. Preserved PV1-002 as a scope relation with no new ID and PV1-007 as deferred with its evidence gate unmet.
8. Created a new post-v1 premise extension, relation layer, machine-readable admission record, and frozen v2 manifest without editing v1.
9. Added a separate v2 structural auditor and wired it into the premise-map hardening workflow while preserving the v1 auditor.
10. Converted the Phase-2 live-state anomaly into one bounded read-only WS2 handoff with explicit pass/fail/split rules and a locally gated D1 descendant.
11. Performed a hostile self-audit; found and repaired two real integrity gaps before closeout.

## Canonical admission result

### Admitted

- **P201 — ancestry-aware evidence support.** Confidence should count causally independent support/appropriate clustered units rather than raw descendant rows/reports.
- **P202 — consumable/path-dependent evidence role.** Confirmation evidence becomes development evidence for descendants once its outcomes influence redesign.
- **P203 — claim-propagation fidelity.** Scope, conditioning, authority, ancestry and maturity must travel with a result through downstream repository consumers.
- **P204 — causal discriminability.** Causal support requires an observation capable of discriminating the claimed cause from material rivals.
- **P205 — reciprocal map coverage.** Premise-map completeness confidence requires source-to-map coverage and independent saturation evidence, not only map-to-source provenance/internal graph density.
- **P206 — causal opportunity population.** Detectability/sample-size authority comes from rows where treatment can causally change outcome, not nominal N or feature eligibility alone.

These are epistemic/methodological premises. None grants runtime or production authority.

### Not separately admitted

- **PV1-002:** valid independence-axis scope split, but better represented across P201/P199/P158/P190/P191 than by a new umbrella node.
- **PV1-007:** plausible transformation-equivariance specialization, but its own recurring harmful first-divergence gate remains unmet.
- **S2-C01..C13:** no separate IDs. They reconcile to existing P136/P142/P148/P175/P181-P200, the new P201/P203/P206, relation/interface insights, or experimental/audit primitives.

## New map version

`docs/solver-premise-map-snapshot-v2.json` defines `solver-premise-map-v2-2026-09-17` as a child of the immutable v1 snapshot.

Inventory:

- v1: 142 propositions / 166 relations;
- v2: 148 propositions / 184 relations;
- additions: P201-P206 in `solver-premise-space-extension-2026-09-17d.csv`;
- relation delta: `solver-premise-space-relations-v4.json`;
- admission metadata: `solver-premise-map-v2-admissions.json`.

The v2 manifest freezes the canonical inventory at commit `ce080356a0946e1a3259168a5a4a5d403da83b22`, after the new premise and relation layers existed. Later Phase-3 reports, handoff authority and validators are not retroactively treated as part of that proposition/relation inventory.

## Validation hardening

The hostile audit caught that the original hardening script is correctly frozen to the v1 file set and therefore could not validate v2. Rather than mutate v1 assumptions, Phase 3 added `scripts/audit-solver-premise-map-v2.mjs`.

The v2 audit verifies:

- original v1 ID/commit/counts remain unchanged;
- v2 contains the complete v1 file set plus the new premise/relation layers;
- v2 counts agree with actual parsed inventory;
- premise IDs are unique and relation premise endpoints resolve;
- the new extension contains exactly P201-P206;
- every admitted premise participates in v4 relations;
- machine-readable admission records exist, use allowed novelty classes, contain required provenance/maturity/falsification fields, and match canonical proposition text;
- PV1-002/PV1-007 dispositions remain explicit.

The existing hardening workflow now runs both v1 and v2 audits plus reciprocal source coverage.

## Queue handoff

The canonical WS2 authority now contains one post-mining active cheap gate: a **read-only consumer-contract census** over Lane A, D1 and F3.

It asks whether at least two technically unrelated positives can map to existing decision boundaries using the same producer/authority/unit/lifetime/consumer/state/counterfactual/abstention/economics contract without requiring a new subsystem.

- **Pass:** at least two map cleanly and uncertainty reduces to concrete soundness/participation/economics.
- **Fail:** each requires unrelated architecture/state/consumer; retire the cross-cutting interpretation.
- **Split:** shared vocabulary is useful but only one positive has an economical existing consumer; advance only that local line.

If D1 passes locally, the only earned descendant is a retained-evidence consumer/economics falsifier. No production exact query or live solver treatment is authorized by Phase 3.

`solver-future-work.md` was not used as a speculative dumping ground.

## Hostile-audit findings

Two material issues were found and fixed:

1. **v2 validation invisibility:** the frozen-v1 auditor did not and should not know about post-v1 files. Fixed with a versioned v2 audit path.
2. **human-only admission provenance:** the first extension/report state lacked full machine-readable addition-template metadata. Fixed with `solver-premise-map-v2-admissions.json` plus validation.

The audit found no reason to add more premise IDs, broaden the queue handoff, reopen historical negatives, or grant production authority.

## Explicit boundary confirmation

At Phase-3 closeout:

- frozen `docs/solver-premise-map-snapshot-v1.json`: **not modified**;
- v1 hardening overlay: **not modified**;
- mining preregistration: **not modified**;
- Phase-1 reports: **not modified**;
- Phase-2 reports: **not modified**;
- post-v1 candidate register: **not rewritten to manufacture admission history**;
- new v2 inventory: **created separately**;
- solver source/runtime behavior: **not modified**;
- corpus/datasets: **not modified**;
- production policy: **not modified**;
- `solver-future-work.md`: **not modified**;
- WS2 live queue: **updated only with the bounded read-only handoff**;
- handed-off consumer census: **not executed**;
- D1 consumer replay/prototype: **not executed**;
- production treatment: **not earned or begun**.

## Deferred work

A later session may execute the WS2 consumer-contract census. Only its result can decide whether D1 earns a retained-evidence consumer/economics falsifier or whether the cross-cutting observation-to-decision hypothesis should be retired/split.

PV1-007 remains a post-v1 deferred premise candidate. It should not receive an ID unless recurring transformation first-divergence evidence satisfies its existing gate.

Any future recursive mining of v2 requires its own declared/preregistered input boundary; Phase-1 lens outputs must not be recycled as though they were independent fresh evidence about v2.

## Final repository-state check

A final diff/review/CI status check follows this closeout. CI is checked opportunistically only; Phase 3 does not wait by repeatedly polling GitHub Actions.
