# Agent-context authority audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — PR #1923 CI exposed the solver-research route at 54,812/55,000 required bytes and `solver-future-work.md` above its own hard authority budget; traced the required route and live-authority payload rather than raising ceilings.
> **Decision:** retain the current three-authority solver-research route, compress concluded chronology out of the live workstream authority, and keep deferred/future-work routing compact.
> **Remaining gate:** use future budget pressure as an ownership/chronology smell; change route membership only when another authority demonstrably replaces a required semantic role.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"preserve solver-research route semantics while removing historical payload from live authorities instead of raising context ceilings","remainingGate":"audit future route pressure by semantic role and duplicated chronology; do not tune limits around bloat","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"agent-context solver-research route and authorities implicated by PR 1923 CI","inferenceScope":"agent context routing and documentation authority only"},"claimRefs":[],"sourceArtifacts":["docs/agent-context-routes.json","AGENTS.md","docs/solver-optimization-workstreams.md","docs/solver-research-operating-model.md","docs/solver-future-work.md","reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md"],"prospective":{"expectation":"the route will be semantically justified but near its limit because a current authority retained completed chronology","surprise":"the live workstream authority repeated a concluded post-mining handoff plus D1/work-ladder history already owned by reports and question relations","anomaly":null}} -->

## Trigger

Fast CI reported the solver-research route at **54,812 bytes** against a 55,000-byte hard maximum, leaving 188 bytes of headroom. It also reported `solver-future-work.md` at 10,675 bytes against its 10,000-byte file maximum.

The budgets exist to expose this kind of authority drift. Raising them would have hidden the problem.

## Route semantics

The required solver-research route remains semantically sound:

- `AGENTS.md`: repository-wide routing and durable invariants;
- `docs/solver-optimization-workstreams.md`: current priority, state and next gates;
- `docs/solver-research-operating-model.md`: durable research method, evidence and stop rules.

Removing the operating model would save bytes by weakening the default method contract. Removing workstreams would separate method from current priority. Neither is justified.

## Actual bloat source

The live workstream authority contained a large completed `Post-mining premise-map handoff closeout` section repeating D1/work-ladder execution history and already-closed common-interface conclusions. Those details remain useful, but dated reports and structured question state already own them.

That contradicts the workstream file's own scope: current priority/state/gates belong there; chronology belongs in reports/archive.

## Repair

The completed block is now compressed to only the current consequences: mining is complete, P201-P206 remain evidence/method premises, current Lane A/D1/F3 dispositions, no shared runtime subsystem is earned, and the current WS2 failure-response/Class-3/reserve-starvation gates.

This removed roughly 1.4 KB from the live authority and restores meaningful route headroom without changing route membership.

`solver-future-work.md` was similarly compressed: it now owns only the cheap-join reopen rule and evidence boundary, while `reports/2026-09-20-latent-join-readiness-audit-001.md` owns the explanation.

## Distributed-knowledge side finding

The operating model's shared-primitives list had not yet learned about two owners created in this continuation: `research-unit-topology-lib.mjs` and `research-repository-ref-lib.mjs`. They are now routed from the method authority with their narrow ownership boundaries.

## Prospective heuristic

When a route approaches its limit, inspect historical chronology, duplicated measurement detail, completed closeouts and repeated explanations inside current authorities before changing route membership or raising limits.

The current route shape remains: **router + current priority + durable method**. The budget mechanism did its job.

## Not earned

No generated brief replaces the three required authorities, no second compact operating-model document is added, and no context-compression framework is needed.
