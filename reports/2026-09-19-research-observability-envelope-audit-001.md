# Research observability-envelope audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — Opportunity sizing, experiment readiness, decision/search-loss observation support, population integrity, failure/hint termination semantics, resource contracts, and the inference-audit framework were compared for repeated observability preconditions.
> **Decision:** observability is now a shared compositional precondition envelope for null/negative interpretation; keep applicability, opportunity, reach, participation, support, fidelity/comparability, coverage, and censoring distinct.
> **Remaining gate:** broaden to another producer only when it benefits from shared blocker/readiness semantics; do not migrate for uniformity alone.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"use the shared observability envelope before negative evidence is interpreted, including execution fidelity/comparability","remainingGate":"broaden only when another live consumer benefits from shared blocker/readiness semantics","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"cross-system observability semantic audit","inferenceScope":"research-system interpretation and capability-discovery semantics; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-inference-audit-framework.md","docs/solver-experiment-opportunity-sizing.md","scripts/experiment-opportunity-audit.mjs","scripts/ws2-experiment-readiness-lib.mjs","scripts/solver-decision-observation-lib.mjs","scripts/research-observation-integrity-lib.mjs","scripts/failure-evidence-semantics-lib.mjs","scripts/hint-termination-semantics-lib.mjs","docs/solver-research-resource-contract.md"],"prospective":{"expectation":"multiple specialist systems will already implement compatible slices of one observability precondition chain","surprise":"the conceptual chain is already explicit in the inference framework, but no shared executable envelope composes the slices","anomaly":null}} -->

## Bottom line

The next useful research-system concept is **observability as an explicit envelope**.

Pathfinder already distinguishes several reasons that a nominal null is not negative evidence, but those distinctions live in separate tools:

- feature/mechanic applicability;
- control-side opportunity/headroom;
- stage or decision-point reach;
- real treatment participation/exposure;
- instrument support/abstention;
- intended-population coverage;
- censoring/truncation/error.

These are not synonyms and should not become one global enum.

They are preconditions that determine whether a claim had a fair chance to be observed.

The repeated failure mode is:

`no observed effect -> treated as no capability`

when the correct interpretation may be:

`effect was not observable under this execution/measurement envelope`.

## Existing evidence that the concept is already real

### Opportunity

`experiment-opportunity-audit.mjs` explicitly sizes from the opportunity population rather than raw N and warns on:

- zero opportunity;
- low participation;
- ceiling;
- underpowered opportunity counts.

The corresponding design guide states that nominal eligibility is often too broad and that a rescue opportunity may require:

`eligible ∩ control fails ∩ treatment can execute`.

### Reach and participation

`ws2-experiment-readiness-lib.mjs` repeatedly distinguishes:

- target stage reached;
- target stage reached with real work/nodes;
- insufficient participation;
- zero observed gains after adequate participation;
- asymmetric censoring.

Several verdicts change solely on this distinction.

### Measurement support

Decision/search-loss observations use:

`SUPPORTED | UNKNOWN | UNSUPPORTED`

for whether an instrument can answer the requested measurement.

This is intentionally different from evidence applicability.

### Coverage and decision validity

`research-observation-integrity-lib.mjs` distinguishes:

- structural coverage completeness;
- decision-valid completeness;
- missing rows;
- malformed rows;
- deadline truncation;
- harness errors;
- unknown terminal outcomes.

A complete-looking population can therefore still be scientifically uninterpretable.

### Censoring / termination

Failure and hint systems separately distinguish:

- exhausted/completed negative;
- node-limited;
- work-limited;
- deadline-truncated;
- error/malformed;
- unknown.

The operating model already forbids timeout/unsupported states from manufacturing dead/negative truth.

### Resource support

The research resource contract explicitly treats missingness semantics, support boundaries, stale context, and information loss as scientific semantics rather than metadata decoration.

### Inference framework

The inference-audit framework already states the strongest conceptual version:

- a null on an unobservable phenomenon is not negative evidence;
- classify deficits as not applicable, not reached, not materially participating, underdosed/right-censored, or comparable-work-still-negative;
- do not say capability absent unless the observation system had a reasonable opportunity to reveal comparable capability.

So this is not a new philosophical idea. It is an under-mechanized existing principle.

## Proposed observability envelope

Do **not** create one universal scalar status.

Use independent axes, with each consumer declaring which axes are required for its claim:

1. **eligibility / applicability**
   - eligible
   - ineligible
   - unknown
   - not-applicable

2. **opportunity / headroom**
   - present
   - absent
   - unknown
   - not-applicable

3. **reach**
   - reached
   - not-reached
   - unknown
   - not-applicable

4. **participation / exposure**
   - participating
   - non-participating
   - unknown
   - not-applicable

5. **measurement support**
   - supported
   - unsupported
   - unknown
   - not-applicable

6. **execution fidelity / comparability**
   - matched
   - mismatched
   - unknown
   - not-applicable

7. **coverage**
   - complete
   - incomplete
   - unknown
   - not-applicable

8. **censoring**
   - uncensored
   - censored
   - unknown
   - not-applicable

A specialist producer should keep owning how it derives each axis.

A shared primitive, if earned, should own only:

- the canonical axis vocabulary;
- validation;
- required-axis declaration;
- blocker classification;
- whether a nominal negative is eligible to be interpreted as negative evidence.

It should **not** decide the scientific outcome itself.

## Why this is likely to harden the system systematically

### 1. It gives every negative a proof obligation

Instead of asking only “what was the result?”, ask:

`what had to be observable for this result to mean what we claim it means?`

This catches:

- null arms that never participated;
- mechanisms tested on populations with no headroom;
- unsupported observer annotations;
- stale/missing dimensions silently coerced to zero;
- censored rows counted as failures;
- incomplete populations described as negative.

### 2. It converts vague caveats into machine-checkable boundaries

The current system already records most of the raw ingredients.

An envelope composes them without forcing producers into one payload schema.

### 3. It makes negative evidence comparable across instruments

A failure-response null, a search-loss null, a routing A/B null, and an exact-reference abstention are different observations.

But they can share one statement:

`the required observability preconditions were / were not satisfied`.

That is a useful cross-system invariant.

## Why this can expand solver capability

The most important consequence is that **unobservability becomes an actionable research deficit rather than a dead end**.

A blocker can route directly to the smallest remediation:

| Observability blocker | Likely next move |
|---|---|
| ineligible / unsupported source | acquire or generate a source representing the mechanic/topology |
| no opportunity/headroom | choose residual/conditioned population |
| not reached | routing/exposure investigation |
| reached but non-participating | budget/allocation/wiring investigation |
| unsupported measurement | improve instrument/exact/reference support |
| solver/config/protocol/intervention mismatch | reconcile execution fidelity before interpreting the comparison |
| incomplete coverage | repair acquisition/harvest/reconciliation |
| censored | fix work/deadline envelope or separate censored analysis |
| all required axes satisfied, still negative | genuine mechanism/search-quality negative |

That table is effectively a capability-expansion router.

It turns “we tried this and nothing happened” into one of several distinct engineering/research tasks.

## Relationship to existing concepts

### Evidence applicability

Applicability asks whether an existing observation may support a stated research purpose.

Observability asks whether the phenomenon had a fair chance to be observed in the first place.

Keep them distinct.

### Measurement support

Support is one axis of observability, not the whole concept.

### Population integrity

Coverage/decision-validity are axes of observability, not a replacement for population identity or integrity.

### Acquisition need

The newly-authored question `acquisitionNeed` relation operates one level above this.

An observability blocker can provide the evidence for choosing or revising that acquisition need.

### Instrument contract

The earlier bones audit proposed a future shared instrument contract once a second reusable instrument converges on support/abstention/calibration semantics.

An observability envelope is broader and lighter: it can compose instrument support with execution opportunity/reach/participation and population/censoring semantics without requiring instruments themselves to share one contract.

## First practical consumers

The strongest candidates for a shared machine primitive are:

1. **experiment opportunity/readiness**
   - already derives opportunity, reach, participation and censoring;

2. **search-loss / decision observation**
   - already derives measurement support and abstention;

3. **failure-response population analysis**
   - already derives coverage, terminal interpretability and protocol-relative applicability.

Do not integrate all three at once.

A sensible proof would make two materially different consumers emit the same envelope shape while leaving their specialist derivation logic untouched.

If that reduces duplicated verdict logic rather than merely adding ceremony, the primitive has earned extraction.

## New audit lens

For every negative/null/closed result, ask:

1. What exact phenomenon would have had to occur for the effect to be observable?
2. Which rows/units were eligible?
3. Which had outcome headroom?
4. Which reached the relevant decision point?
5. Which actually participated?
6. Which were supported by the instrument?
7. Which were completely observed?
8. Which were uncensored?
9. Does the observed execution actually match the solver/config/protocol/intervention named by the claim?
10. What is the denominator after each gate?
11. If the result is still negative after all required gates, what capability claim does that actually close?

This should be applied especially to historical “clean negatives” before they are reused as broad premise failures.

## Promotion trigger

The concept has clearly earned an audit lens now.

That promotion trigger has now been met. `WS2-FAILURE-RESPONSE-RECONNAISSANCE` and `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` both emit the shared `pathfinder-research-resolution-envelope` while retaining different required-axis subsets and specialist verdict logic. The reserve-starvation integration also exposed two concrete false-readiness gaps: missing action identity and missing solver identity.

The shared primitive is now `scripts/research-resolution-envelope-lib.mjs`. It owns canonical axes/statuses, required-axis declaration, blocker projection and resolution readiness only. It does not own specialist derivation or outcome interpretation. See `reports/2026-09-19-synchronous-observability-identifiability-pilot-001.md`.

## Historical calibration

The retrospective in `reports/2026-09-20-historical-negative-resolution-retrospective-001.md` found a known false negative that motivated an eighth axis.

A July high-budget artifact showed 0/483 current-residual overlaps solved, with most rows uncensored and heavily dosed. It nevertheless failed as evidence for the current level-blind solver's 4x-budget capability because the solver revision was seven weeks old and the execution used history-aware `--resume --save-hints`. A clean current-commit, level-blind confirmation later found 3/20 solves at 1.2B.

That failure is neither coverage nor participation nor censoring. It is **execution fidelity/comparability**. The shared envelope therefore now carries a dedicated `fidelity` axis.

## Standing rule

**No observed effect is evidence of no effect only inside a demonstrated observability envelope.**

Outside that envelope, classify the blocker and route the next measurement/acquisition/participation work accordingly.
