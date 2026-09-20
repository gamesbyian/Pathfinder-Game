# Synchronous observability-identifiability pilot 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — two materially different live WS2 consumers now emit the same research resolution-envelope shape without delegating their specialist derivation or verdict logic.
> **Decision:** promote the resolution envelope to a shared research-domain primitive for canonical observability axes, required-axis declaration, blocker classification, and resolution readiness. Keep discriminator choice, axis derivation, and scientific outcome interpretation specialist-owned.
> **Remaining gate:** broaden use only when another live consumer benefits from the primitive; do not migrate existing evidence producers merely for uniformity.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"promote the research resolution envelope after two materially different live consumers demonstrated shared observability/readiness semantics","remainingGate":"broaden only on demonstrated consumer benefit","joins":{"researchQuestion":null,"premiseRefs":["P204"],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"two materially different live WS2 resolution consumers","inferenceScope":"research-system observability/discriminability control semantics; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["scripts/research-resolution-envelope-lib.mjs","scripts/ws2-failure-response-reconnaissance.mjs","scripts/analyze-reserve-starvation-probe.mjs","reports/2026-09-19-research-observability-envelope-audit-001.md","reports/2026-09-19-research-identifiability-and-synchronous-resolution-audit-001.md"],"prospective":{"expectation":"the two pilots will share readiness/blocker semantics while requiring materially different observability axes","surprise":"the reserve-starvation integration immediately exposed missing action-identity and solver-identity readiness gaps","anomaly":null}} -->

## Pilot A: failure-response reconnaissance

Question: `WS2-FAILURE-RESPONSE-RECONNAISSANCE`.

Purpose: choose the cheapest next discriminator among rejection counterfactual, first loss, producer-consumer 2x2, allocation-specific follow-up, or no expensive follow-on yet.

The producer now emits a resolution envelope with required axes:

- `eligibility`;
- `measurementSupport`;
- `coverage`.

It deliberately marks:

- `opportunity` as not required because this is a routing reconnaissance screen, not a treatment-effect test;
- `reach` and `participation` as not globally required because those are themselves discriminator observations that may nominate an exposure/allocation route;
- `censoring` as descriptive unless decision-invalid outcomes make interpretation materially weaker.

The existing scientific-eligibility and route-selection logic remains authoritative. The envelope does not infer a route.

A scientifically ineligible population now appears explicitly as `resolutionStatus=observability-blocked`, with the eligibility axis naming the blocker.

## Pilot B: admissible-order reserve-starvation recurrence

Question: `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`.

Purpose: estimate whether R00044-style isolated default-profile finds above the current 75M reserve but within the fixed 300M total-node envelope recur often enough to justify a matched-total-work reserve A/B.

The producer now emits a resolution envelope requiring:

- `eligibility`;
- `opportunity`;
- `participation`;
- `measurementSupport`;
- `fidelity`;
- `coverage`;
- `censoring`.

`reach` is explicitly not required because the isolated method probe has no separate downstream stage-reach gate.

This is materially different from Pilot A: the same envelope structure supports a prospective cost-curve recurrence test rather than an instrumentation/routing screen.

The reserve pilot's frozen sample now carries its `resolutionDesign`, so both pilots obtain rivals/discriminator/interpretation from pre-outcome machine-readable artifacts rather than analyzer-local prose constants.

## Hardening found by the pilot

The reserve-starvation integration found two real readiness holes.

### Missing action identity

The reducer previously rejected a known wrong action identity but accepted a row whose attempt action identity was absent.

That made "unknown" equivalent to "matches the prespecified default admissible-order action."

It now abstains as:

`abstain-action-unknown`.

The participation axis is blocked and the 0/1/>=2 recurrence rule cannot run.

### Missing solver identity

The reducer required a known protocol hash but did not require a known `solverRef` before setting `decisionReady=true`.

The preflight explicitly treats solver/protocol identity as part of the interpretation contract.

A missing solver identity now blocks decision readiness and appears on the envelope's eligibility axis.

## Shared primitive

`scripts/research-resolution-envelope-lib.mjs` now owns only:

- canonical axes:
  - eligibility;
  - opportunity;
  - reach;
  - participation;
  - measurement support;
  - coverage;
  - censoring;
- canonical per-axis status:
  - satisfied;
  - blocked;
  - unknown;
  - not-required;
- required-axis declaration;
- structural validation;
- blocker projection;
- `resolution-ready | observability-blocked` classification.

It does **not** own:

- how an axis is derived;
- which axes a claim requires;
- the live rivals;
- the discriminator;
- the scientific verdict;
- route selection;
- treatment policy;
- evidence applicability.

Those stay with specialist producers.

## What the synchronous method demonstrated

Observability and identifiability really do constrain one another in live code.

The failure-response screen needs no universal "opportunity present" requirement because participation/reach patterns are themselves candidate discriminators.

The reserve-starvation probe, by contrast, cannot interpret zero recurrence unless the current-residual opportunity boundary, exact action participation, measurement support, complete sample, and censoring conditions all hold.

A universal checklist would have been wrong for at least one pilot.

A claim-relative envelope works.

## Historical calibration later added one axis

A targeted retrospective of influential negative results found that the initial seven-axis envelope was still missing one correctness-bearing condition: **execution fidelity/comparability**.

The known historical 0/483 work-ladder false negative had high dose, broad coverage and mostly uncensored rows, but it came from an old solver revision and history-aware execution rather than the current level-blind intervention. The later clean confirmation overturned the apparent absence-of-capability reading.

`fidelity` is now a first-class axis. In the reserve pilot, exact action/config identity belongs to fidelity while actual nonzero work belongs to participation.

## Stop condition

Do not migrate other research producers merely to increase envelope coverage.

A third consumer should adopt the primitive only if it currently rebuilds the same required-axis/blocker/readiness semantics or if a real null/negative interpretation is vulnerable to an observability confusion.

The abstraction has earned existence. It has not earned ubiquity.

## Operational hardening after the first extraction

The first integration pass was then tightened in three ways:

1. specialist decisions are now gated on `resolutionStatus=resolution-ready`, so a blocked required axis cannot coexist with a positive specialist readiness flag;
2. blocker axes project to default remediation classes such as `allocation-or-wiring`, `instrumentation-or-reference`, or `work-envelope-or-recovery`, making unobservability directly actionable without making remediation authoritative;
3. `research:resolution-view` provides a read-only cross-producer summary of validated envelopes, blockers and remediation classes.

The vector semantics also caught an early implementation mistake: "any abstention" had briefly been allowed to contaminate the censoring axis. The reserve producer now keeps participation, measurement support, coverage and censoring blockers orthogonal.
