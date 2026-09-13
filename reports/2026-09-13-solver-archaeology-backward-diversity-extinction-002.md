# Solver archaeology: backward, diversity, and extinction follow-up

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — Historical review closed static exact-k/backward-route forms and identified unfinished overlap and full-pool extinction observer work.
> **Decision:** Keep static exact-k backward and backward-route scoring closed; preserve basin-overlap observation and the August categorical-state full-pool projection as distinct measurement opportunities, not production changes.
> **Remaining gate:** none

This report does not change solver behavior or current workstream priority.

## Backward-search lineage

The broad meet-in-the-middle design remains closed for measured frontier-size reasons. A narrower static exact-k backward oracle was not merely left open: it was built as `scripts/stress/backward-exact-probe.mjs`, scored against the CP-SAT-labelled dead-branch census, and fired on 0/238 dead branches still admitted by the gauntlet. The null has a structural proof: on the static portal-free graph, an available neighbor permits two-step out-and-back padding, so achievable path lengths are exactly `{d, d+2, ...}`. Existing minimum-distance plus parity checks therefore exhaust static exact-length information. Do not reopen this form.

The pre-rewrite monolithic solver did contain a different soft backward-BFS mechanism, `runMitmMeetCheckLocal`: bounded backward BFS from the goal, cell/parity keyed, used only to produce retry-adaptation and route-guidance signals. Its route-guidance half was later ported as `SCORE_BACKWARD_BRIDGE` and tested across several endgame windows. Every tested window increased node cost, monotonically approaching baseline as the term fired less; it also broke a known repair rescue. That scoring form is cleanly negative and was reverted.

The old retry-adaptation half (`feasibleMeetSignal` driving endgame IDA*, budget increase, and root-expansion floor) was explicitly not ported and no later commit-search descendant has yet been found. Treat this as a narrow unresolved historical premise, not license to reconstruct the old adaptation subsystem. Any modern revisit would first need a present-day signal showing that a backward meet/reachability observation predicts when an alternate consumer or added work is useful.

## April portfolio-diversity telemetry

April implemented direct portfolio-diversity instrumentation: `pairwiseStateOverlap`, `branchDecisionCorrelation`, family coverage, distinct attempt/profile counts, frozen attempt identity, and deterministic attempt seeds. The first implementation produced invalidly trivial telemetry because identity fields and root-move scores were stripped by the audit transport. Commit `5f560878...` repaired that path explicitly so later runs could be meaningful.

Repository-wide commit search currently finds the introduction and repair, but no later committed Gate-B verdict or interpretation using the repaired metrics. Current `main` code search also finds no `pairwiseStateOverlap` reference. Therefore the repaired measurement programme appears to have been dropped or superseded without a preserved conclusion.

Archaeological disposition: unresolved measurement thread. The useful object to recover is the observer concept, not the old portfolio design. A modern version should use canonical attempt identities, prove nonzero treatment participation, and measure actual search-region overlap on present residual misses before any anti-redundancy behavior is introduced.

## August exact-extinction descriptor chain

The August 24 descriptor work is a direct ancestor of the current Class-5 problem and is more mature than a simple scalar-feature attempt.

The first pass used four exact A/D dead-top/live-alternative extinction parents and falsified several tempting rules: `(position, remaining length, remaining intersections)` is not a valid future-equivalence signature; more objective progress is not monotone evidence of future feasibility; preserving more unused intersection budget is not necessarily better; and goal proximity is not future opportunity.

A follow-up reconstructed native edge-axis state, must-cross first-pass phase, must-pass/landmark phase, and intersection state. Must-cross first-pass status separated only one of four pairs; a stricter local H/V corridor-availability test separated none. The report therefore explicitly rejected the idea of jumping straight to a must-cross-phase retention quota.

The more interesting result was representational: beam nodes already carried cheap categorical state such as `mpVisitedMask`, `mustCrossMask`, `flipperUsedMask`, `surroundMask`, `mustTurnMask`, `adjTurnMask`, and intersection count, while the diversity survivor selector bucketed only `(mustCrossMask, flipperUsedMask)`. Different selected exact dead/live pairs differed in different already-maintained state phases. This motivated a narrower hypothesis: finite-width diversity may be compressing candidates that occupy distinct residual-state phases even though scoring itself knows some of those distinctions.

Crucially, the next gate was well designed. The work added tooling to retain complete ranked extinction pools and target the four prespecified exact parents directly, then called for a read-only fixed-width projection comparing a tiny key set against random-reserve and width-only controls, with bucket-cardinality/singleton checks. Commit and PR searches currently find the capture-readiness tooling but no committed full-pool artifact or later verdict. This gate therefore appears prepared but not executed.

Archaeological disposition: high-value unfinished experiment. It is closer to the current requirement of changed represented information than another scalar future-feasibility feature. Before resurrecting it, reconcile with the later WS4 closure and current Class-5 exact-labelled corpus: the right first move is still observer/counterfactual analysis, not a production retention change.

## Immediate implications

1. Close the static exact-k backward oracle and backward-route scoring bias firmly; do not let their old "bidirectional" label contaminate the still-distinct retry-adaptation premise.
2. Recover/rebuild basin-overlap observation rather than the old portfolio scheduler.
3. Treat the August full-pool categorical-state projection as an unfinished historical gate worth comparing against today's exact extinction cases and current retention evidence.
4. Preserve the distinction between A/D dead-vs-live extinction and B-class live-vs-live crowding. A descriptor that separates dead futures need not solve finite-width competition among multiple viable futures.
5. Prefer measurements that ask whether the solver preserves qualitatively different future regimes at fixed width/work, rather than retrospective per-pair classification.
