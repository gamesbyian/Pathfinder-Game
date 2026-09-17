# Solver premise-map mining execution plan

> **Status:** execution plan for the frozen v1 premise-map mining program.
> **Authority boundary:** `solver-premise-map-mining-preregistration.md` owns the first-round lenses and stop rule. This document sequences execution and defines later synthesis; it must not alter the preregistered lens definitions after results are seen.

## Goal

Use the hardened premise map to expose genuinely new solver-research premises, especially ones that could eventually increase cold level-blind solve count, without collapsing descriptive mining into premature prioritization or speculative queue inflation.

## Phase 1 — execute the frozen twelve-lens round

Run M1-M12 exactly as preregistered against the frozen `solver-premise-map-v1-2026-09-17` snapshot. Keep each lens's observations separately attributable before cross-lens reconciliation. Do not mutate the frozen map or admit post-v1 candidates during this round.

For each lens preserve: findings, supporting premise IDs/relations/sources, alternative interpretations, confidence/conditioning, and whether the observation is descriptive, candidate-new-premise, relation-only, scope split, stale-authority issue, or ontology issue.

Close Phase 1 only after all twelve lenses have produced bounded outputs from the same snapshot and the preregistered no-recursive-mining stop rule is satisfied.

## Phase 2 — second-order synthesis

Only after Phase 1 closes, mine the *relationships among its findings*. Explicitly inspect:

1. **Orphan positives:** demonstrated useful structure that has no concrete consumer or dies between observation and action.
2. **Latent parents:** apparently separate positive/negative findings that may be projections of one stronger hidden variable, operation, or abstraction.
3. **Evidence-generation dependencies:** conclusions sharing constructors, observers, populations, labels, instrumentation, work contracts, or causal ancestry; identify research monocultures/pseudoreplication.
4. **Observer-shaped phenomena:** apparent solver/level properties that may actually arise from sampling, construction, reachability, participation, censoring, residual formation, or measurement.
5. **Residual-as-negative-image:** traits enriched because earlier solver capabilities already removed their opposites; distinguish Pathfinder properties from this solver lineage's complement.
6. **Missing decision state / representation:** valid decision-bearing facts the architecture cannot retain, transfer, authorize, or consume.
7. **Missing experimental primitives:** smallest tooling/telemetry/constructor/query/intervention needed to turn important speculation into a cheap discriminating test.
8. **Information-valued actions:** operations whose primary value is reducing future uncertainty rather than immediate path progress.
9. **Generation vs selection:** assumptions that the needed future is already in the candidate set versus premises about changing the successor/action grammar itself.
10. **Decision impact:** for each strong candidate, record what becomes worth testing if true and what can be retired if false. Do not reduce this to one score.

Pay special attention to the current live-state anomaly: several bounded/replicated/qualified positive phenomena exist while no new production treatment is earned. Ask whether one common missing interface, state concept, consumer, or architectural assumption explains that pattern.

## Phase 3 — candidate admission and queue handoff

Reconcile Phase-2 candidates against the frozen map and the post-v1 candidate register. Classify semantic novelty before assigning any new premise ID. Preserve rival explanations and historical scope.

Only then hand genuinely surviving premises toward execution planning using the repository's existing progression:

`semantic premise -> cheapest falsifier -> smallest concrete consumer -> matched-work economics -> production only if earned`

Do not dump speculative ideas into `solver-future-work.md`. Update live/future authorities only when a candidate has a precise gate, stop condition, evidence contract, and correct ownership.

## Execution discipline

- Open a PR at the start of each major execution chunk and commit frequently.
- Prefer several reviewable reports/artifacts over one giant final document.
- Preserve the frozen v1 snapshot and preregistration unchanged during Phase 1.
- Use retained evidence and existing research tooling before launching new compute.
- Treat nulls, method limits, population limits, participation failures, and semantic negatives as distinct outcomes.
- Stop each phase at its declared boundary before recursively mining its own discoveries.
