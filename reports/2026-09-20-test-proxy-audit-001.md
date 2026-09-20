# Research test-proxy audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — inspected the red CI failure set and adjacent research-system tests for assertions that encode wording/count/order proxies rather than the intended invariant.
> **Decision:** replace only demonstrated brittle proxies where a stable semantic owner exists; preserve exact snapshots/counts when they intentionally freeze a derived research artifact or architecture contract.
> **Remaining gate:** continue opportunistically when a test fails because implementation prose changes while the underlying invariant remains satisfied.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"repair demonstrated proxy assertions without weakening intentional frozen-artifact and architecture invariants","remainingGate":"apply opportunistically to future false-positive CI failures; no mass test rewrite","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"research-system tests implicated by the 2026-09-20 PR #1923 fast-gate failure plus adjacent assertions","inferenceScope":"test semantics only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","scripts/research-status-index-check.mjs","scripts/research-portfolio-retrospective-node-test.mjs","scripts/research-integration-audit-node-test.mjs","scripts/research-system-inventory-node-test.mjs"],"prospective":{"expectation":"some red tests will prove proxy failures rather than product failures","surprise":"the strengthened repository-ref validator broke one test solely because the exact error sentence changed; other exact snapshots examined were intentional scientific freezes, not brittle proxies","anomaly":null}} -->

## Trigger

The machine repository-ref audit strengthened `answeredBy` validation from a broad “repository-shaped path” check to an exact repository-ref contract.

The implementation behaved correctly, but `research-status-index-check.mjs` failed because it expected this exact sentence:

`questions[0].answeredBy must contain repository paths`

The new validator instead emitted a more specific root-policy message.

Nothing scientifically or structurally regressed. The test had accidentally frozen validator prose.

## Repair

The test now requires:

- exactly one validation error for the malformed `answeredBy`;
- the error identifies `questions[0].answeredBy`;
- the error clearly belongs to repository-reference validation.

It does **not** require one exact English sentence.

This preserves the semantic invariant while allowing the shared validator to improve its diagnostics.

## Exact assertions that remain justified

The audit deliberately did not weaken several nearby exact checks.

### Frozen portfolio retrospective

`research-portfolio-retrospective-node-test.mjs` requires the checked-in retrospective JSON to exactly reproduce from current authorities.

That is not a wording proxy. The JSON is explicitly a frozen derived research asset. When question authority changes materially, the correct response is to refresh the artifact, as this session did after Lane A C0 advanced.

### Relation and lifecycle counts

The system-inventory tests often compare a derived count against the length of the exact source collection that defines it.

Those are equivalence assertions, not arbitrary “count should equal 17” proxies.

### Architecture ownership assertions

Tests such as:

- every current deferred question has an acquisition relation;
- workstream 2's queue ref resolves to the intended scientific question;
- retired workflows do not reappear;
- structured workstream rows all carry execution state;

are direct architecture contracts.

They should stay strict.

## Proxy smells

A test deserves review when its scientific intent is expressed only through:

- an exact human-facing error sentence;
- Markdown prose;
- incidental array order when the domain is a set;
- elapsed time for deterministic behavior;
- raw count where named membership/equivalence is the real invariant;
- filename spelling when content/semantic identity owns the relation.

This does not mean those forms are always wrong. A parser test may correctly freeze syntax, and a snapshot may correctly freeze a derived artifact.

## Decision rule

Before replacing an assertion, ask:

1. What real invariant would be violated if this test failed?
2. Is there a stable semantic owner for that invariant?
3. Can the test assert that owner directly?
4. Is the existing exact value itself part of a preregistered/frozen contract?

Only replace the proxy when #2/#3 are yes and #4 is no.

## Red-CI lesson

The same CI run also contained genuine failures:

- Lane A machine lifecycle/queue coherence;
- stale retrospective derivation;
- a real JavaScript regex syntax error;
- a context-budget hard limit;
- a test initialization-order bug.

Those should not be waved away as “brittle tests.”

The useful discipline is to classify each red independently rather than treating all red tests as either product defects or test defects.
