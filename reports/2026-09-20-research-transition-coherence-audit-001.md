# Research transition-coherence audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — traced several recent result/preflight/registry transitions across question state, report status/gate, workstream authority and successor handoff.
> **Decision:** no generic transition engine is earned, but current transition integrity must include both lifecycle state and successor-gate retirement; four concrete stale transitions were repaired.
> **Remaining gate:** continue opportunistically on real result/preflight pairs; promote a shared transition checker only if the same transition law recurs across multiple machine state systems.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"repair concrete half-applied transitions and treat stale successor gates as transition defects alongside stale lifecycle states","remainingGate":"audit future completed transitions opportunistically; no universal transition engine yet","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"recent result/preflight/question transitions around Lane A, hint/failure integration, WS2 work-ladder economics and search-loss implementation","inferenceScope":"research-control-plane coherence only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","docs/solver-research-question-relations.json","docs/solver-separator-dynamic-interface-contract-preflight.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","reports/2026-09-19-hint-failure-cross-pollination-continuation-001.md","reports/2026-09-19-hint-failure-cross-pollination-implementation-001.md","reports/2026-09-18-ws2-work-ladder-economics-preflight-001.md","reports/2026-09-19-ws2-work-ladder-4x-only-matched-work-costing-result-001.md","reports/2026-09-18-search-loss-evidence-phase0-implementation-record-001.md"],"prospective":{"expectation":"half-applied transitions will now appear more often as stale successor gates than completely wrong top-level status","surprise":"the Lane-A question registry remained deferred after its exact-label reopen condition had already been satisfied and C0 completed","anomaly":null}} -->

## Transition model used

For a concrete research transition, inspect the affected surfaces separately:

1. **historical design/result report** — did the experiment itself conclude?
2. **question lifecycle** — did the scientific question reopen, close, or advance?
3. **live gate** — is the next named action still real?
4. **workstream authority** — does current priority/gate agree?
5. **promotion/runtime state** — when applicable, did production disposition change?
6. **successor ownership** — once a child question/report owns the next gate, did the parent stop advertising it as unfinished work?

These states are related but not interchangeable. A report can remain concluded-positive while its old “remaining gate” becomes stale because a successor completed later.

## Repairs

### 1. Lane A C0 -> C1

Before this audit:

- C0 result was concluded and explicitly said proceed to C1;
- workstream authority said C0 mixed and C1 next;
- the C0 preflight had only just been repaired from stale `active` to `superseded`;
- **but** `WS2-SEPARATOR-DYNAMIC-INTERFACE` remained `deferred-reopen`;
- its reopen condition was “obtain a frozen exact-labelled population,” which had already happened;
- its result/constraints still said to run the C0 falsifier.

Repair:

- question state -> `active-candidate`;
- C0 result added to `answeredBy`;
- machine result text now records the exact C0 falsification;
- stale “first run C0” constraint replaced by “C0 closed insufficient; proceed C1 on same 581 cases”;
- fulfilled reopen trigger and acquisition need retired;
- dynamic-interface preflight now records C0 completion and C1 as the live gate.

This is the clearest example of a **reopen-condition transition**: acquisition did not answer the whole question, but it did change the question from deferred to active.

### 2. Hint/failure implementation -> integrated continuation

The original implementation report still said `active` and waited for PR #1912 even though the continuation report records #1912/#1913 reconciliation, merge, integration and durable handoff.

Repair:

- original report -> `superseded`;
- old PR gate retired;
- continuation/current authorities named as owners.

### 3. Work-ladder shape preflight -> 4x economics result

The intermediate-tier preflight was correctly `concluded-positive`, but its `Remaining gate` still requested the full 4x costing after that costing had already run and closed the successor question negative.

Repair:

- historical positive result retained;
- last-evidence line acknowledges successor completion;
- remaining gate retired and points to the concluded-negative successor.

### 4. Search-loss Phase 0 -> later implemented phases

The Phase-0 implementation record correctly described its own PR-A slice, but still stated Phase 3 was unimplemented.

Repair:

- historical Phase-0 conclusion retained;
- stale “Phase 3 unimplemented” successor gate retired;
- current implementation plan/later phase reports own surviving work.

## Important distinction: state transition vs gate transition

The audit found that top-level statuses are now relatively well hardened. The more common residual failure is **gate drift**:

- report remains correctly concluded;
- successor work happens;
- parent report's “Remaining gate” still describes the old future.

That stale gate is still harmful because agents and indexes use it as routing context even when lifecycle state is technically correct.

A transition audit should therefore compare at least:

`(state, decision, remaining gate, successor owner)`

rather than state alone.

## Why no transition engine yet

The four repairs do not share one state machine:

- Lane A: `deferred-reopen -> active-candidate`;
- implementation report: `active -> superseded`;
- work-ladder preflight: state unchanged, successor gate retired;
- Phase-0 record: state unchanged, successor gate retired.

The recurring invariant is **coherence**, not a universal transition law.

A generic engine would either encode domain-specific successor semantics or become a bag of nullable transition fields. Current explicit validators/inventory plus targeted audits are the better fit.

## Candidate future shared check

A narrower automatic check may become earned if more structured reports carry machine successor refs:

> a concluded/superseded report must not advertise a successor gate as still pending when the explicitly identified successor is itself concluded.

That requires authored successor identity first. Filename/prose inference is not strong enough to enforce it globally.

## Follow-on

The next useful transition work is not another lifecycle abstraction. It is to improve authored successor/dependency edges where real handoffs are repeatedly difficult to reconcile, then let existing relation/invalidation machinery expose stale transitions from those edges.
