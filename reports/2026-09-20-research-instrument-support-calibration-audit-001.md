# Research instrument support and calibration audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — compared compact failure response, rich search-loss capture, decision observations, exact/reference prefix probes and hint provenance across support, abstention, parity/calibration and applicability semantics.
> **Decision:** the instruments share a recurring set of questions, but they do not yet share a sufficiently stable machine contract to justify another generic schema. Preserve the checklist as design doctrine and promote a shared owner only when a second live consumer needs the same fields with the same semantics.
> **Remaining gate:** require future instrument-backed research contracts to state support/unknown behavior, censoring/abstention, perturbation evidence and applicability/refresh scope explicitly; revisit extraction after two instruments express the same machine envelope.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"retain an explicit support/calibration checklist but do not extract a generic instrument contract yet","remainingGate":"extract only after at least two live instruments need the same machine support/calibration fields with compatible semantics","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"current compact failure-response, search-loss, decision-observation, exact/reference and hint-provenance instrumentation","inferenceScope":"instrument validity and applicability semantics only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json","scripts/solver-failure-response-lib.mjs","scripts/solver-search-loss-evidence-lib.mjs","scripts/solver-decision-observation-lib.mjs","scripts/stress/cpsat-explicit-prefix-reference-lib.mjs","scripts/hint-capture-lib.mjs","scripts/search-loss-real-canary.mjs"],"prospective":{"expectation":"multiple instruments will share high-level validity questions but differ in the exact support object they need","surprise":"search-loss already carries parity state in the capture artifact while compact failure response carries its richer calibration/applicability envelope in the consuming WS2 contract rather than the instrument document itself","anomaly":null}} -->

## Question

The session taxonomy identified instrument support/calibration as the next likely shared primitive:

- what construct is observed;
- where support exists;
- what unsupported/unknown means;
- what perturbation the observer introduces;
- what calibration establishes semantic parity;
- when the calibration becomes stale.

The comparison confirms these are the right questions. It does **not** yet confirm one common object.

## Compact failure response

The compact failure-response projection is intentionally permissive about support:

- missing producer fields remain `null`, never fabricated zero/false;
- terminal outcomes distinguish exhausted negative, node/work limits, deadline truncation, harness error, malformed/missing/unknown;
- protocol and solver identity can be carried at document/row level;
- externally verified population integrity can establish coverage, otherwise completeness remains unknown.

The strongest current support envelope lives in the **WS2 analysis contract**, not the compact document itself. That contract additionally freezes:

- `supportPolicy = reported-fields-only-missing-remains-unknown`;
- explicit abstention conditions;
- calibration reference and run;
- semantic parity;
- representative compact/rich wall overhead and payload size;
- solver/protocol-relative applicability and refresh triggers.

That separation is currently sensible. The generic compact artifact can serve several producers without pretending every consumer has the same calibration claim.

## Rich search-loss capture

Search-loss has stronger capture-specific semantics:

- bounded per-selector observation/retention counts and truncation;
- replay basis: replayable, identity-only or historical-unverified;
- reconstructability requirements for replayable rows;
- exact population identity and parent count;
- run/configuration/protocol identity;
- `observerParityVerified` persisted in the capture document;
- exact annotations with `SUPPORTED / UNKNOWN / UNSUPPORTED`.

Its representative canary explicitly compares observer-off, compact and rich modes and treats solve/status/node/work/solution drift as a hard parity failure, while wall-time/payload overhead is noisy evidence rather than a hard semantic gate.

This resembles the compact contract at the level of *questions*, but not field semantics. Search-loss support is partly selector/replay/annotation-specific and parity belongs naturally to the capture.

## Decision observations

Decision observations are a narrower primitive:

- candidate universe, ordering and retained subset;
- canonical work before/after;
- optional observer cost;
- optional annotation whose support is `SUPPORTED / UNKNOWN / UNSUPPORTED`.

They intentionally do not own a run-level calibration envelope. The observation can be adapted into search-loss capture, whose producer/canary owns the broader perturbation claim. Adding a generic calibration object here would duplicate the consuming instrument's responsibility.

## Exact/reference prefix probes

The CP-SAT explicit-prefix boundary has a different support surface:

- supported mechanics produce exact feasible/infeasible labels;
- unsupported mechanics, timeout/UNKNOWN, model-invalid, parse failure and nonzero-process failures map to abstention/reason classes rather than false negatives;
- coordinate normalization is a separate fidelity boundary.

Its scientific validity depends more on query semantics/referee support and timeout policy than observer perturbation, because it is an offline reference instrument rather than an in-production observer. Forcing it into an observer-overhead schema would be category error.

## Hint provenance

Hint capture's important validity contracts are again different:

- canonical construction and merge path at the persistence boundary;
- level revision identity;
- solver version and discovery process provenance;
- `isolatedTechnique` explicitly distinguishes isolated capability from ordinary production-ladder discovery;
- event identity excludes host/wall-clock fields that should not make the same semantic discovery distinct.

Hint provenance can record discovery cost and rediscovery, but it is not primarily an abstaining classifier or an observer inserted into the same search seam as search-loss.

## Cross-instrument matrix

| Question | Compact failure response | Search loss | Decision observation | Exact/reference | Hint provenance |
|---|---|---|---|---|---|
| Missing support explicit? | yes, null/unknown | yes, replay/support/truncation | annotation support | yes, abstain reasons | partly via provenance/context |
| Censoring/abstention explicit? | yes | yes | consumer-owned | yes | not the same concept |
| Protocol/run identity? | yes | strong | consumer-owned | case/workflow-owned | solver/revision provenance |
| Observer parity? | calibrated externally | persisted + canary | consumer-owned | not observer-shaped | not generally required |
| Overhead evidence? | WS2 calibration | canary | observerCost optional | compute cost, different role | discovery cost telemetry |
| Applicability/refresh? | WS2 contract | protocol/config identity, mostly consumer interpretation | consumer-owned | query/mechanic support | revision/process provenance |

The matrix is evidence **against** a shared machine envelope today. A generic object broad enough to fit every column would mostly contain nullable fields and vague vocabulary, moving meaning away from the actual owner.

## What is shared now

The useful shared doctrine is a six-question review for any instrument-backed claim:

1. **Construct:** what property does this instrument actually observe?
2. **Support:** on which rows/states/mechanics is that property reportable?
3. **Unknown:** what exact conditions produce unknown, unsupported, truncated or abstain?
4. **Perturbation:** can enabling the instrument change search behavior or only cost/storage?
5. **Calibration:** what evidence establishes semantic parity or reference validity?
6. **Applicability:** which solver/protocol/instrument changes invalidate that calibration?

A live study should answer the relevant subset before a negative result becomes decision-bearing.

## Promotion rule

Promote a shared instrument-support primitive only when at least two live instruments or consuming contracts independently need the same machine-readable fields **and those fields mean the same thing**.

Good future evidence would look like:

- two observer instruments both needing the same parity/calibration/applicability envelope;
- two reference instruments both needing the same support/abstention/referee envelope;
- repeated validators reimplementing identical field shape and failure semantics.

Merely sharing the words “support,” “unknown,” or “calibration” is insufficient.

## Adjacent improvement

This audit suggests one useful conceptual split for future work: **observer calibration** and **reference support** are sibling concerns, not one concern.

Observer calibration asks whether measuring perturbs the phenomenon. Reference support asks whether the oracle/reference model is valid and decisive for the queried case. Both govern inference eligibility, but their evidence and failure modes differ.

That distinction should inform the later confirmation/common-mode audit: two channels are not independent merely because one is “exact” and one is “observational” if both rely on the same upstream selection, semantic projection or unsupported-case filter.
