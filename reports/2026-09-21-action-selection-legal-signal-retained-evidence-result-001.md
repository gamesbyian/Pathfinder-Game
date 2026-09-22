# Action-selection legal-signal retained-evidence result 001

> **Status:** narrowed-positive
> **Last evidence:** 2026-09-21 — offline analysis of retained production-boundary run `35066677597`, solver ref `16114b80e54233910f34ec2ea8e2c1a41a859eb4`.
> **Decision:** simple runtime-legal action-boundary context has real held-out C2 signal. Freeze the conservative `prior-response+work+next-stage` rule family at minimum development support 100 for sample-independent confirmation. Do not change production scheduling.
> **Remaining gate:** confirm the frozen rule family on sample-independent/current production evidence, reporting rare-winner protection and signature concentration. The current validation set has now been used for family selection and is not confirmation.
> **Evidence role:** development
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Machine result:** `reports/stress/action-selection-legal-signal-shadow-production-boundary-2026-09-21.json`

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"narrowed-positive","lastEvidenceDate":"2026-09-21","decision":"A coarse runtime-legal prior-response+work+next-stage signature captures about 10% of C2 validation pre-winner work with zero observed validation winner loss at the conservative prespecified support floor; freeze this form for independent confirmation, not live scheduling.","remainingGate":"Confirm the frozen prior-response+work+next-stage family at minDevelopmentSupport=100 on sample-independent/current production evidence, reporting concentration and rare-winner protection separately.","joins":{"researchQuestion":"WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"GitHub Actions run 35066677597; C1 102 rows + C2 1,700 rows; deterministic level-held-out split","selection":"four prespecified signature families x support floors 10/50/100; validation inspected for narrowing, therefore no longer confirmation","inferenceScope":"retained-evidence shadow predictability only; no live scheduler or causal savings claim"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-21-prewinner-work-oracle-census-001.md","reports/2026-09-21-action-selection-legal-signal-capture-preflight-001.md","scripts/analyze-action-selection-legal-signals.mjs","reports/stress/action-selection-legal-signal-shadow-production-boundary-2026-09-21.json"],"successors":{"questions":["WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE"],"artifacts":[]},"prospective":{"expectation":"simple current-boundary response context might recover some oracle headroom more safely than historical action identity","surprise":"work-band-conditioned prior response retains roughly 10% C2 capture with zero observed validation winner loss, while coarse config-family context reaches roughly 20% but loses a winner; C1 has no captured work","anomaly":"signal is concentrated: the leading signature supplies about 46% and the top three about 72% of nominated work"}} -->

## Question

Can cheap information legally available immediately before the next action capture a material fraction of the enormous pre-winner work reservoir without repeating the rare-capability failure of historical action-identity rules?

## Data and split

No solver was executed.

The analysis reused the exact retained production-boundary artifacts from run `35066677597`:

- C1: 102 levels;
- C2: 1,700 levels;
- solver ref: `16114b80e54233910f34ec2ea8e2c1a41a859eb4`.

The existing deterministic split was preserved:

- SHA-256(level ID), first 32 bits mod 10;
- 0–6 development;
- 7–9 validation.

Action-boundary rows stop at the recorded winning attempt. Any hypothetical trailing attempt is excluded as unreachable future information.

The combined retained population contains 56,906 reachable action boundaries:
- 39,450 development;
- 17,456 validation.

## Prespecified signature families

The first pass intentionally stayed below a learned model.

1. next stage only;
2. prior stage/outcome + next stage;
3. prior stage/outcome + prior-work band + cumulative-work band + next stage;
4. prior stage/outcome + next stage + coarse next config family.

For each family, development signatures with **zero development winners** were evaluated at minimum support floors 10, 50, and 100.

A validation attempt is only *nominated* as skippable/delayable in shadow. The recorded downstream outcome is observational and cannot establish counterfactual scheduler safety.

## C2 result

C2 validation contains 356 solved levels and 21.174B canonical pre-winner work.

| family | min dev support | captured pre-winner work | validation winners endangered |
|---|---:|---:|---:|
| next stage | 100 | 0.00% | 0/356 |
| prior response + next stage | 100 | 2.72% | 0/356 |
| prior response + work + next stage | 10 | 10.63% | 0/356 |
| prior response + work + next stage | 50 | 10.56% | 0/356 |
| **prior response + work + next stage** | **100** | **9.91%** | **0/356** |
| prior response + next config family | 100 | 20.20% | 1/356 |

The result answers the first discriminator positively: coarse current-boundary context contains more useful information than stage identity alone.

The config-family result also reproduces the rare-capability warning in a softer form. More detailed identity can capture substantially more hindsight work, but even at the conservative support floor it suppresses one held-out winner.

## Why freeze the 100-support work-band form

The 10/50/100 support floors all show the same qualitative C2 result for `prior-response+work+next-stage`:

- 10: 10.63%, 0 observed winner losses;
- 50: 10.56%, 0 losses;
- 100: 9.91%, 0 losses.

The 100-support form is the most conservative prespecified point and sacrifices little capture. Freeze that exact form for the next independent confirmation rather than optimizing another threshold on this validation set.

## Concentration

The nominated work is not uniform.

At support 50, the top signature contributes **46.3%** of nominated work and the top three contribute **72.0%**.

The leading signatures are repeated same-stage continuation after substantial prior work:

1. `guidance-goal-distance-retry` after a censored 1M–10M attempt, cumulative work >=10M: 1.035B nominated pre-winner work;
2. `connectivity-axis-prune-disabled-retry` after censored 1M–10M, cumulative >=10M: 378.8M;
3. `must-cross-neighbor-prune-disabled-retry` after censored >=10M, cumulative >=10M: 195.9M.

This looks more like a **late continuation-value** question than a universal dynamic scheduler.

That is useful narrowing. Confirmation should preserve these strata rather than reporting one pooled headline.

## C1 result

C1 validation contains 35 solved levels and 334.1M pre-winner work.

All tested signature families capture **0%** of C1 validation pre-winner work under the zero-development-win rule.

Therefore:

> the current result is C2-development-population signal, not cross-corpus generalization.

The pooled analysis remains zero-loss because C1 contributes no nominated captured work; it does not convert the result into C1 transfer evidence.

## Relation to the old action-identity baseline

The parent oracle report found that exact historical action identity could capture work, but every nonzero-capture tested threshold endangered held-out winners.

The new coarse work-band/context family shows a materially better first-pass tradeoff:

- less capture than the aggressive identity/config-family forms;
- zero observed validation winner losses in this selected development pass.

This supports the original hypothesis that **current-context response** is a better direction than global “this action never wins” deletion.

It does not prove safe live skipping.

## Selection boundary

This result inspected:

- four signature families;
- three support floors.

The validation set has therefore been used for model-family narrowing.

Do **not** call the 0/356 result confirmation and do not tune more bins/families on the same validation population.

The next production-facing claim requires sample-independent evidence proportional to this selection pressure.

## Decision

`WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` remains active but is now narrowed.

**Freeze for confirmation:**
- family: `prior-response+work+next-stage`;
- minimum development support: 100;
- exact current work-band definitions from the analyzer;
- no new feature engineering before confirmation.

**Confirmation must report:**
- captured pre-winner canonical work;
- winner endangerment;
- C1/C2/source identity separately;
- top-signature concentration;
- whether value remains concentrated in repeated late retries;
- fixed/static baseline comparison.

Only a confirmed rule with material capture and protected rare capability may earn a matched-work live scheduler treatment.

## Research-system lesson

This is a direct demonstration of the newer research architecture paying back old compute.

The solver run happened on September 16. The research question, legal-signal framing, action-boundary reducer, and result came later.

No solver execution was required to turn that retained attempt history into a new narrowed-positive finding.
