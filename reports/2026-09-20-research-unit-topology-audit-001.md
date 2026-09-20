# Research unit-topology audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — compared current WS2 failure-response routing and Class-3 exact-action dose acquisition against the session taxonomy's unit-topology questions.
> **Decision:** a small shared structural owner is earned for unit-topology field names/validation; specialist studies continue to own every actual unit meaning, estimand, eligibility rule and causal interpretation.
> **Remaining gate:** apply the shared shape only when another active study already needs to distinguish observation, opportunity, assignment, dependence, analysis and generalization units; do not mass-migrate historical artifacts.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"extract only the recurring six-field unit-topology shape and wire the two live consumers that already express it","remainingGate":"adopt prospectively where a study has a real multi-unit dependence structure; no historical migration campaign","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"current WS2 failure-response and Class-3 dose designs","inferenceScope":"research-design unit semantics only; no solver-efficacy claim"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json","reports/2026-09-19-class3-exact-action-dose-acquisition-preflight-001.md","reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json"],"prospective":{"expectation":"repeated live studies should distinguish observation/opportunity/dependence/analysis units without sharing their specialist meanings","surprise":"Class-3 had the scientific distinction in prose and reducer behavior but omitted it from the frozen machine artifact","anomaly":null}} -->

## Why the primitive is earned

The threshold for another research-domain primitive is repeated independent need, not conceptual neatness.

Two current consumers now meet that threshold:

1. **WS2 failure-response reconnaissance** already freezes a machine `unitTopology` with observation, assignment, opportunity, dependence-cluster, analysis and generalization units.
2. **Class-3 exact-action dose acquisition** independently requires the same structural distinctions. Its preflight says parent is the independent unit while each parent can contain multiple rescuers and repeated attempts, but before this pass the frozen expectation artifact did not encode that topology and the reducer preserved it only as a prose `denominatorNote`.

The shared owner is therefore only `scripts/research-unit-topology-lib.mjs`, which validates the recurring six-field shape. It deliberately contains no Pathfinder mechanism names, no WS2/Class-3 vocabulary, no allowed unit-value enum and no rule that two fields must be equal.

## Class-3 correction

Class-3 now freezes and propagates this topology:

| Role | Unit |
|---|---|
| observation | `compact-failure-response-attempt` |
| opportunity/exposure | `parent-exact-rescuer` |
| assignment | none |
| dependence cluster | `parent` |
| analysis | `parent` |
| generalization | `current-class3-parent-under-compatible-shared-production-protocol` |

This is more precise than saying only “parent is the independent unit.”

A parent with two known rescuers has two exposure opportunities, and each rescuer can have repeated attempt observations, but all of them remain inside one dependence/analysis cluster. That distinction blocks an easy future pseudoreplication error without forcing the Class-3 reducer into a generic experiment framework.

The topology is produced by `build-class3-dose-expectations.mjs`, retained by the committed frozen expectation artifact, validated by `analyze-class3-dose-exposure.mjs`, and copied into the analysis output.

## WS2 integration

The WS2 contract retains its exact specialist assertions:

- observation = failure-response record;
- opportunity/dependence/analysis = parent;
- assignment = none;
- generalization = current residual parent under compatible protocol.

Its validator now first applies the shared structural check, then checks those WS2-specific values. Thus the generic primitive cannot silently weaken the specialist contract.

## Ownership boundary

The shared layer owns:

- the six recurring role names;
- required/non-empty structural validity;
- nullable assignment unit because observational designs legitimately have none.

It does **not** own:

- independent-unit policy;
- effect estimands;
- sampling or assignment rules;
- clustering estimators;
- action/technique semantics;
- population eligibility;
- generalization claims;
- outcome interpretation.

Those remain with the study contract.

## Adjacent findings

The audit sharpened two broader heuristics from the session taxonomy.

First, a denominator note is not a machine contract. If a unit distinction determines whether rows may count independently, preserving it only in prose is too weak once downstream reusable reducers exist.

Second, “opportunity unit” deserves separate treatment from “analysis unit.” In Class-3 the scientifically meaningful opportunity is parent × exact rescuer, while the independent denominator remains parent. Collapsing those concepts would lose useful exposure structure or inflate evidence.

## Deliberate non-changes

No attempt was made to force family-generation, exact-reference, hint-provenance or search-loss artifacts into this shape simply because they also contain repeated rows. They should adopt it only when a live analysis actually needs the distinction.

No common estimand or statistical-analysis object was introduced. The evidence supports a noun owner, not a research framework.

## Files changed by this pass

- `scripts/research-unit-topology-lib.mjs`
- `scripts/research-unit-topology-lib-node-test.mjs`
- `scripts/ws2-failure-response-analysis-contract-lib.mjs`
- `scripts/build-class3-dose-expectations.mjs`
- `scripts/analyze-class3-dose-exposure.mjs`
- `scripts/build-class3-dose-expectations-node-test.mjs`
- `scripts/analyze-class3-dose-exposure-node-test.mjs`
- `scripts/research-domain-ownership-node-test.mjs`
- `reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json`
- `reports/2026-09-19-class3-exact-action-dose-acquisition-preflight-001.md`
- `package.json`
