# Research-system Bundles A-D closeout audit 001

> **Status:** active
> **Last evidence:** 2026-09-19 — PR #1922 implementation audit through commit `28acf1a1e07d18742009aeac6ace309abb613911`
> **Decision:** the A-D implementation has no remaining known design gap after this audit; keep the bundle boundary open only until the current validation run confirms the repaired seams.
> **Remaining gate:** green current-head CI/targeted validation, then mark A-D substantially complete and begin Bundle E.
<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-09-19","decision":"the A-D implementation has no remaining known design gap after this audit; keep the bundle boundary open only until the current validation run confirms the repaired seams","remainingGate":"green current-head CI/targeted validation, then mark A-D substantially complete and begin Bundle E","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"hostile requirement-by-requirement audit of Bundles A-D against the implementation on PR #1922","inferenceScope":"research-system consolidation implementation completeness for Bundles A-D; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md","scripts/research-system-inventory-lib.mjs","scripts/research-transaction-node-test.mjs","scripts/ws2-failure-response-analysis-contract-lib.mjs","reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json","scripts/investigation-report-metadata.mjs"],"prospective":{"expectation":"the prior A-D implementation is mostly complete but may contain seams satisfied only indirectly","surprise":"three material seams were found and repaired: structured closeout scope, transaction-spine reach, and independence-vector separation; architecture orphan/identity visibility was also strengthened","anomaly":null}} -->

## Purpose

Before moving into Bundle E, this pass re-read the actual A-D bundle requirements and the underlying numbered phases, then checked whether the implementation satisfied them directly rather than relying on optimistic progress prose.

The audit deliberately looked for requirements that existed somewhere in the repository but were not actually connected through the bundle's intended spine.

## Bundle A — derived inventory/current-state views

### Already present

The single `research:system-inventory` path already composes:

- research relation authorities and the existing integration audit;
- explicit documentation current-reference routing;
- plan/preflight/handoff lifecycle classification;
- workflow lifecycle and package research entrypoints;
- shared implementation dependencies and constructor/validator ownership;
- documentation cognitive roles and current-state burden metrics;
- front-door inputs and derived findings.

### Gap found and repaired

The architecture view exposed topology but did not make identity/join domains and one-sided/orphan-like seams explicit enough for Phase 1.

The inventory now records, for every research relation:

- stable identity domain;
- primary join key;
- canonical source.

It also derives explicit architecture findings for:

- current-reference targets that do not exist;
- maintained workflow entries whose workflow file is absent;
- maintained workflows whose invocation cannot be resolved to a recognized research script/npm alias;
- relation surfaces with zero rows.

These remain diagnostics, not authority or automatic deletion rules.

### Disposition

**Substantially complete.** Any future architecture field should be added only when a real consumer needs it; do not turn the inventory into an encyclopedic hand-maintained subsystem catalogue.

## Bundle B — transaction/conformance control-plane hardening

### Already present

The transaction/conformance work already covered:

- delimiter-safe/scoped identities and Lane-A regressions;
- persisted one-ID-per-line parsing;
- constructor/schema hardening;
- partial acquisition and missing shards;
- combine failure followed by recombination without new solver compute;
- typed recovery provenance;
- abstention/unknown/censoring preservation;
- solved controls;
- parent-level dependence;
- selected-development evidence;
- confirmation-block consumption;
- cross-resource enrichment;
- stale evidence-index guard semantics;
- supersession and report status;
- workflow retirement;
- content identity changes.

### Gap found and repaired

The transaction fixture itself stopped before two important later lifecycle boundaries even though specialist tests covered them elsewhere.

It now additionally reaches:

1. a real constructed solver experiment contract carrying the research block, population identity and independent unit through the common contract owner;
2. the frozen WS2 analysis-contract identity;
3. a structured closeout that preserves a claim reference separately from the report decision and ties that closeout back to the population identity/source artifact.

This keeps the general transaction fixture small while allowing the specialist WS2 vertical slice to retain its question-specific analysis/claim semantics.

### Disposition

**Substantially complete.** The specialist WS2 analysis/claim tests remain separate because collapsing those semantics into the generic transaction harness would create the false common abstraction the plan explicitly rejects.

## Bundle C — scientific vertical slice

### Already present

The WS2 failure-response reconnaissance path already supplies:

- a frozen pre-outcome machine analysis contract;
- explicit purpose and target envelope;
- first-eligible/outcome-blind population selection;
- observation/opportunity/dependence/analysis/generalization unit topology;
- compact-instrument support, abstention and calibration;
- deterministic reproducibility semantics;
- solver/protocol-relative freshness triggers;
- primary discriminator and negative-resolution rule;
- adaptive lineage;
- treatment-fidelity applicability;
- separate execution/scientific/observation/decision layers;
- path/order-independent analysis identity;
- claim capsule identity, limitations and routing consequence;
- derivation edges and bounded reverse invalidation;
- tamper rejection and cross-producer semantic-compatibility tests;
- production-conversion fidelity on the promoted Class-4 portal dead-last retry.

No real WS2 scientific result has been fabricated while the eligible post-instrumentation population gate remains closed.

### Gap found and repaired

The frozen independence vector still used one `framingContext` field even though the plan's second-order audit explicitly separated:

- task-framing/prompt independence;
- authority/context-exposure independence.

The contract also omitted critical-library/code independence as an explicit axis.

The machine contract and validator now require those distinct fields, reject the old collapsed field, and explicitly record that this slice does **not** claim those forms of independence. The contract also now carries the live rival set explicitly rather than leaving it implicit in prose/routing options.

### Disposition

**Substantially complete for the available evidence boundary.** The remaining WS2 scientific result is data-gated, not an implementation omission.

## Bundle D — closeout and retrieval

### Already present

The inventory already supplied front-door machine inputs and lifecycle findings. A compact human `--view=brief` now renders:

- current queue/question/evidence state;
- live queue gates;
- recent structured closeouts;
- deferred/reopen questions;
- unfinished active execution references;
- consolidation/integration signals.

`docs/README.md` routes cheap research-system orientation through this derived view without making it a priority authority.

### Gap found and repaired

The first closeout capsule implementation was intentionally narrow, but narrower than Phase 8.5's own required volatile scientific state.

The same existing metadata owner now supports optional:

- population identity;
- selection basis;
- inference scope;
- claim references;
- source/derivation artifacts;
- prospective expectation, surprise and anomaly.

The first real consumer, the research-contract interoperability audit, now supplies its meaningful selection/inference scope and source artifacts, and inventory tests pin that the front door consumes them.

No second closeout registry/database was introduced.

### Disposition

**Substantially complete.** Further composition views should be added only when repeated consumers earn them.

## Cross-bundle conclusion

The hostile re-read found real seams rather than merely wording differences, and those seams are now repaired.

The A-D boundary should not be reopened for speculative completeness. Remaining work belongs in one of three categories:

- validation of the current implementation;
- the data-gated real WS2 reconnaissance result when an eligible population exists;
- later Bundle-E/F/G work that the plan intentionally keeps separate.

If current-head validation is green, begin Bundle E from the existing inventory/closeout substrate rather than adding more A-D infrastructure.
