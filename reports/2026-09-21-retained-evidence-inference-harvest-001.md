# Retained-evidence inference harvest 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — current `main` after PRs #1954-#1966, live question authority, current workstreams/future-work, pre-winner machine summaries, forced-work result/seam audit, inversion/intake method, and recent closeout reconciliation.
> **Decision:** do not create a standalone “zero-compute harvest” program. The new research-question intake already requires existing-data analysis before acquisition. Apply that rule directly to live questions. `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` is the strongest current existing-data target and now has a dedicated retained-evidence analyzer; most other live questions still require genuinely missing telemetry, current-head replay, exact/reference acquisition, or matched-work execution.
> **Remaining gate:** the retained-evidence development gate has now run. Freeze the selected prior-response+work+next-stage form at min development support 100 for sample-independent/current-production confirmation before any live scheduling treatment.
> **Evidence role:** forensic / research-routing
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-21","decision":"Fold zero-new-solver-compute research into ordinary question intake rather than creating a parallel program; advance WS1 legal-signal capture with a retained-evidence analyzer and preserve acquisition gates where required evidence is genuinely absent.","remainingGate":"Confirm the frozen prior-response+work+next-stage family at minDevelopmentSupport=100 on sample-independent/current production evidence before any live scheduler treatment.","joins":{"researchQuestion":"WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"current retained C1/C2 production-boundary evidence and current solver-research authorities","selection":"all live/deferred solver questions reviewed for cheapest truthful answerability route","inferenceScope":"research routing and retained-evidence answerability; no solver-efficacy or production-savings claim"},"claimRefs":[],"sourceArtifacts":["docs/research-question-intake.md","docs/solver-optimization-workstreams.md","docs/solver-research-question-relations.json","docs/solver-future-work.md","reports/2026-09-21-prewinner-work-oracle-census-001.md","reports/2026-09-21-action-selection-legal-signal-capture-preflight-001.md","reports/2026-09-21-forced-work-prevalence-result-001.md","reports/2026-09-21-forced-work-capture-economics-seam-audit-001.md"],"successors":{"questions":["WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE"],"artifacts":["scripts/analyze-action-selection-legal-signals.mjs"]},"prospective":{"expectation":"recent integration would make at least one live question materially advanceable from retained evidence while also revealing questions that still require acquisition","surprise":"the strongest immediate existing-data opportunity is whole-action selection economics, while the forced-work lane specifically demonstrates why large retrospective reservoirs must not be mistaken for removable work","anomaly":"WS2-PARITY-RESPONSE-SIGNATURE remained active-candidate even though its own result and workstream prose said the tested static form was closed"}} -->

## Question

What can the current research system now answer or advance **without new solver execution**, and where would retrospective analysis be epistemically dishonest because the needed observation was never retained?

This is the practical successor to the broader “what can the smarter research system now ask?” discussion.

## Method

Use the current pre-ID intake rule literally:

`raw question -> answerability -> cheapest discriminator -> route`

For every currently live or materially deferred solver question, distinguish:

1. already answered by current retained evidence;
2. existing-data analysis;
3. instrument-only work;
4. bounded solver/reference acquisition;
5. blocked/unidentifiable until a new seam appears.

Do not reward “zero compute” as an objective in itself. The objective is avoiding acquisition when existing evidence can truthfully decide the next action.

## Finding 1 — a separate zero-compute research program is no longer needed

The repository now already has the correct policy in `docs/research-question-intake.md`: classify answerability before compute and stop when retained evidence resolves the decision-changing ambiguity.

Creating a second “harvest queue” would duplicate authority and tempt agents to generate clever retrospective questions disconnected from current decisions.

The durable lesson is therefore operational:

> every live question should periodically be re-priced against the evidence already retained, especially after a nearby result changes its premise.

This is already demonstrated by the cancelled connectivity-proof overlap work: later single-query economics made the planned overlap acquisition non-decision-bearing.

## Finding 2 — WS1 legal-signal capture is the strongest current existing-data target

The retained production-boundary evidence already establishes:

- 94.74% of C2 solved-row canonical attempt work occurred before the eventual winner;
- 87.58% for C1;
- 961/1,169 C2 wins occur after at least one predecessor attempt;
- exact historical action identity has economic signal but is unsafe as a deletion rule.

The remaining question is explicitly observational first:

> using only information available before the next action, can simple rules capture enough of that hindsight reservoir to justify a live matched-work treatment?

The raw attempt sequence needed for the first shadow exists in the retained sweep documents. A new solver run is therefore not the next truthful step.

This branch adds `scripts/analyze-action-selection-legal-signals.mjs`, which:

- derives one row per recorded action boundary;
- freezes the existing deterministic level-held-out split;
- uses only coarse information available at the boundary plus the identity of the candidate next stage/config family;
- evaluates prespecified signature families:
  - next stage;
  - prior stage/outcome + next stage;
  - prior stage/outcome/work bands + next stage;
  - prior response + next coarse config family;
- fits only development-side zero-win/support summaries;
- reports held-out pre-winner work nominated and held-out eventual winners endangered;
- labels all nominated savings as an observational upper bound, not counterfactual scheduler savings;
- can optionally persist the derived action-boundary dataset for exact reconstruction.

This is intentionally below a learned model. If these cheap contextual signatures cannot separate low-value predecessor work from rare winning capability, the dynamic-selector direction should narrow before more elaborate modeling.

## Finding 3 — parity-response lifecycle had drifted

`WS2-PARITY-RESPONSE-SIGNATURE` remained machine-state `active-candidate` even though its own current result says:

- the static response-guided parity form was executed;
- richer twist/same-parity/gate-demand decomposition did not explain the frozen discordance beyond raw portal count;
- the tested static form is closed;
- only a materially different parity mechanism from success-path or prospective seam evidence should reopen it.

That is a genuine authority mismatch, not an open experiment.

This branch moves the question to `deferred-reopen`, records the dated answer, and makes the workstream row explicitly deferred/static-form-closed.

## Finding 4 — several current questions still genuinely require acquisition

The retained-evidence doctrine does **not** eliminate these gates:

### Forced-work capture economics

The 25.33% one-successor parent-expansion share is a gross prevalence reservoir. The seam audit showed expansion/hard-prune work is already paid before literal forcedness is observable. The missing discriminator is global singleton/singleton->singleton phase telemetry and post-recognition consequences. Those measurements were not retained historically in the required form.

**Route:** instrument/acquire the already-queued frozen rerun. Do not infer savings from the old 25.33%.

### Parity phase distance / checkerboard capacity

The observers exist, but current corpus opportunity/incidence evidence is pending.

**Route:** bounded observer acquisition. Existing static response-signature negatives do not answer these exact necessary-condition questions.

### BC1 cut-balance projection

Incidence is already positive. The missing evidence is later-disposition overlap, reference safety, proof cost, and work after proof at the intended production seam.

**Route:** production-inert consumer measurement. Retrospective incidence cannot supply the missing economics.

### Capability-invention beam UNKNOWN rows

The ambiguity is specifically whether historical isolated beam capability still reproduces on current head.

**Route:** three-row current-head freshness replay. Historical evidence cannot answer a freshness question about current code.

### Repair deadline allocation

Retained evidence strongly nominates censored Class-3 capability, but the causal/economic question is whether more repair deadline recovers solves at matched total work without displacement.

**Route:** bounded treatment experiment after the owned seam/design work.

### WS6 dependency-conditioned repair

One retained parent gave a useful causal-interface microscope. The reusable claim requires independent-parent recurrence.

**Route:** new independent matched-pair evidence when available; do not inflate one parent into a generic repair descriptor.

## Finding 5 — the useful distinction is evidence substitution, not “no compute”

Three different things can avoid a solver sweep:

1. **direct answer:** current retained evidence already resolves the question;
2. **derived answer:** a new reducer/join extracts an unasked quantity from retained evidence;
3. **decision lock:** a newer result makes an older planned experiment unable to change the decision.

These should be sought aggressively.

But a fourth category must stay distinct:

4. **missing observation:** the question asks about a current quantity the retained evidence never captured.

In that case, refusing acquisition would merely convert “unknown” into storytelling.

## Current disposition

### Advanced now from retained evidence

- `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`: development execution completed from retained C1/C2 artifacts. The conservative prior-response + work-band + next-stage form captures 9.91% of C2 validation pre-winner work with 0/356 recorded validation winner losses; C1 capture is 0%. Freeze that exact form for sample-independent confirmation.

### Corrected without acquisition

- `WS2-PARITY-RESPONSE-SIGNATURE`: tested static form moved from active to deferred-reopen.

### Preserve acquisition gates

- `WS2-FORCED-WORK-CAPTURE-ECONOMICS`;
- `WS2-PARITY-PHASE-DISTANCE`;
- `WS2-CHECKERBOARD-CAPACITY`;
- `WS2-CUT-BALANCE-PROJECTION`;
- `WS2-CAPABILITY-INVENTION-DEMAND` freshness rows;
- `WS2-REPAIR-DEADLINE-ALLOCATION`;
- `WS6-DEPENDENCY-CONDITIONED-REPAIR`.

## Reproduction

The development result was reproduced from the exact retained run-35066677597 artifacts. To rerun the reducer once those sweep JSON files are materialized locally:

```bash
npm run research:action-selection-legal-signals -- \
  --inputs=reports/stress/solver-corpus1-latest.json,reports/stress/solver-corpus2-latest.json \
  --dataset-out=tmp/action-boundary-production-boundary-2026-09-21.json \
  --out=tmp/action-selection-legal-signal-shadow-2026-09-21.json
```

The command performs no solver execution.

## Executed retained-evidence result

The new analyzer was run against the exact retained production-boundary artifacts without solver execution. The development result is recorded in `2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md` and its machine summary. It narrows WS1 to a frozen ~10%-capture C2 contextual rule family requiring independent confirmation.

## Result

The research system has indeed become capable of producing new progress from evidence already paid for, but the mature form is **not** a new harvest subsystem.

It is a stronger default question-routing rule:

> Try to answer, derive, or decision-lock from retained evidence first. Acquire only the observation that is still missing.

This branch turns that principle into one concrete WS1 research consumer and one lifecycle correction rather than another layer of research infrastructure.
