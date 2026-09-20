# Proposal-method calibration audit 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-20 — compared question relations, recent portfolio retrospective proposal-provenance fields and report-local nomination histories against the proposed idea-origin categories.
> **Decision:** do not add a question-origin enum or proposal-method registry yet. Existing `triggeredBy`/`constrainedBy` ancestry and report provenance are useful, but method-of-discovery is not prospectively captured consistently enough for fair yield calibration.
> **Remaining gate:** revisit after multiple new questions prospectively record a stable origin method before outcome, without reconstructing origin labels from hindsight.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"inconclusive","lastEvidenceDate":"2026-09-20","decision":"do not structure proposal-method origin until enough prospective non-retrofitted observations exist","remainingGate":"revisit after multiple new questions prospectively record stable origin methods before outcome","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"current question registry plus 2026-09-12..19 portfolio retrospective proposal provenance","inferenceScope":"proposal-generation method calibration only"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-question-relations.json","scripts/research-portfolio-retrospective-lib.mjs","reports/2026-09-19-research-portfolio-retrospective-data-001.json","reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md"],"prospective":{"expectation":"question ancestry will be better captured than origin-method identity","surprise":"the retrospective already exposes trigger/candidate-set visibility, which covers much of the practical anti-rediscovery value without pretending to know how the idea was generated","anomaly":null}} -->

## What is already captured

The question graph records several useful forms of proposal provenance:

- `triggeredBy` successor relationships;
- `constrainedBy` prior questions/reports/contracts;
- `calibrates` / `calibratedBy` relationships;
- aliases that preserve historical vocabulary;
- report-local narrative explaining why a candidate was selected.

The bounded portfolio retrospective also derives two useful signals:

- whether a recent question has an explicit trigger;
- whether the question/result exposes a visible candidate set.

That is enough to ask whether a question appeared as an unexplained singleton or arose from an explicit research transition.

## What is not captured reliably

The repo does not prospectively and consistently encode whether an idea originated from:

- premise-map mining;
- archaeology;
- negative-space audit;
- failure-response nomination;
- capability-memory contrast;
- variant-family microscopy;
- exact/reference disagreement;
- human or agent reconstruction.

Those labels can often be inferred from prose after the fact, but doing so would create exactly the retrospective story-fitting problem this audit is meant to avoid.

## Why backfilling would be weak

A question can have multiple origins: an archaeology result may be noticed because a negative-space audit asked the right question, then become actionable because capability memory supplies a population.

Assigning one retrospective `originMethod` would:

- collapse mixed ancestry;
- reward methods whose vocabulary happens to survive in prose;
- let outcome knowledge influence classification;
- create tiny, selected samples that invite bogus yield rankings.

## What would make calibration real

A future comparison becomes useful when new questions record origin prospectively, before outcome, using a small stable vocabulary only when the origin is genuinely known.

The eventual analysis should compare more than raw positive-result rate. Useful dimensions would include:

- answerability at nomination;
- redundancy with existing questions;
- time/compute to first discriminator;
- rate of clean negative closure;
- rate of new capability or new solver consumer;
- need for new instrumentation;
- independence from the machinery that generated the proposal.

Even then, the goal should be calibration of proposal channels, not ranking them into one universal best method.

## Current rule

Use `triggeredBy` and other stable relations whenever a real question-to-question ancestry exists.

Keep discovery-method history in the report that actually knows it.

Do not create a machine origin label merely because a later reader can tell a plausible story about where the idea came from.

## Promotion trigger

Revisit only after several newly nominated questions carry prospective origin records from more than one method family and enough outcomes exist to compare them without one or two observations dominating the result.
