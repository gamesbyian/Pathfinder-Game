# WS2 reconnaissance + Class-3 shared acquisition freeze 001

> **Status:** active / dispatch-ready
> **Last evidence:** 2026-09-20 — the already-frozen 23-parent Class-3 exact-rescuer population and the already-frozen 30-parent WS2 solved-control sample were reconciled into one disjoint 53-parent acquisition.
> **Decision:** use one maintained production-shaped shared-ladder run with standard compact failure-response publication to feed both `WS2-FAILURE-RESPONSE-RECONNAISSANCE` Stage A and `WS2-CLASS3-DOSE-EXPOSURE`. Keep their scientific analyses and dispositions separate.
> **Remaining gate:** dispatch the exact 53-parent population under one protocol/solver ref, validate complete population identity, then run the two existing frozen reducers/contracts independently.
> **Evidence role:** acquisition precommitment; no solver outcomes were inspected to form this population.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-09-20","decision":"collapse WS2 failure-response Stage-A acquisition and Class-3 exact-action dose acquisition into one disjoint 53-parent production-shaped compact-response run while preserving separate question analyses","remainingGate":"dispatch exact 53-parent population under one maintained shared-ladder producer/protocol and analyze each question with its existing frozen contract","joins":{"researchQuestion":"WS2-FAILURE-RESPONSE-RECONNAISSANCE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"precommitment","scope":{"populationIdentity":"reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json","selection":"union of two already-frozen question-owned populations: 23 Class-3 residual parents + 30 solved controls; zero overlap","inferenceScope":"acquisition composition only; no solver-efficacy or prevalence result"},"claimRefs":[],"sourceArtifacts":["reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json","reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json","reports/stress/failure-evidence/ws2-reconnaissance-solved-control-sample-2026-09-19.json","reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-preflight-001.md","reports/2026-09-19-class3-exact-action-dose-acquisition-preflight-001.md"],"prospective":{"expectation":"one ordinary compact-response acquisition can satisfy the missing telemetry opportunity for both questions without changing either analysis contract","surprise":"the two frozen populations are exactly disjoint and already share the same current production boundary, making a 53-parent union lossless for acquisition purposes","anomaly":"protocol/ref mismatch, population drift, missing parent, or producer semantics that fail exact-action compact telemetry"}} -->

## Why these are one acquisition but not one experiment

The two questions need almost the same raw observation:

- a current production-shaped shared solver ladder;
- exact parent identity;
- exact action/stage attempt identity;
- participation/reach;
- work and node dose;
- censoring/termination;
- known protocol and immutable solver ref;
- standard compact failure-response publication.

They differ in what they infer from those observations.

### WS2 failure-response reconnaissance

Its 23 Class-3 residual parents are a legitimate residual tranche for Stage A, while the separately frozen 30 solved parents provide controls for whether apparent starvation/censoring/non-participation is failure-specific.

The reconnaissance still owns its frozen routing outcomes:

- rejection counterfactual;
- first-loss;
- producer-consumer 2x2;
- allocation-specific follow-up;
- none;
- unresolved-needs-compact-diagnostics.

### Class-3 dose

For the 23 residual parents, the Class-3 reducer asks a narrower question: did each historically implicated **exact rescuer action** actually participate, at what dose, and how did it terminate?

Its parent-by-rescuer expectation map remains authoritative. The 30 solved controls do not change Class-3 membership and do not become extra Class-3 observations.

## Frozen population

Machine authority:

`reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json`

Composition:

- **23** current Class-3 residual parents;
- **30** deterministic solved controls;
- **53** total parents;
- **0** overlap.

Both source tranches were frozen before this composition pass. No row was selected from any new compact-response outcome.

## Execution contract

Use a maintained producer that executes the ordinary production-shaped shared ladder and automatically emits standard compact failure response.

The one acquisition must have:

1. exactly the frozen 53 parents;
2. one known protocol hash;
3. one known solver ref;
4. complete missing/error/deadline accounting;
5. exact attempt action/stage/work/node/censor semantics required by the Class-3 reducer.

Do **not** enable rich search-loss capture or extra diagnostics merely because this run exists. Automatic compact response is the first information rung.

## Analysis after acquisition

Run the existing analyses separately.

For reconnaissance:

```bash
npm run research:ws2-failure-response-reconnaissance -- \
  --in=<compact-response.json> \
  --analysis-contract=reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json
```

For Class-3:

```bash
npm run research:analyze-class3-dose -- \
  --in=<compact-response.json> \
  --expectations=reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json
```

The Class-3 reducer must ignore the 30 control parents except where an explicitly supported solved-control comparison is useful. The WS2 reconnaissance may use both tranches, with residual conditioning stated explicitly.

## Stop boundary

This freeze removes an **acquisition duplication**, not an epistemic boundary.

It does not:

- imply Class-3 is exposed-and-negative;
- nominate a WS2 treatment before Stage-A analysis;
- authorize rich first-loss evidence;
- merge the two question states;
- turn solved controls into independent evidence for Class-3 capability;
- alter production solver behavior.

If the maintained producer cannot emit the required exact-action fields under one protocol, stop at that concrete telemetry mismatch rather than splitting back into two bespoke campaigns.
