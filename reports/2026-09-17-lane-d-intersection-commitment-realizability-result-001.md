# Lane D intersection-commitment realizability result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — 107-query CP-SAT batch across 2 independent parents' matched same-parent LIVE/DEAD B2 states, current HEAD.
> **Decision:** on both tested parents, every exact-DEAD state has **zero** confirmed-feasible future-intersection commitments among its candidate cells, while every exact-LIVE sibling has **at least one**, even though DEAD and LIVE were selected to share the identical remaining intersection deficit and remaining length — a pair of scalars the production solver's own bounds already track and cannot distinguish between. This is a genuine, referee-validated (0 correctness alarms) demonstration that a bounded per-instance relational query exposes information invisible to current scalar/local machinery. The population is small (2 independent parents) and exhausts the currently available matched B2 population; it earns a documented positive nomination and a specific next-gate design, not a production prototype.
> **Remaining gate:** expanding this population needs matched same-parent LIVE/DEAD Class-5 siblings, which is the exact same construction-method gap blocking Lane B (`solver-fresh-dead-sibling-harvest-preflight.md`) — a production-search-quality sibling constructor. Economics (query cost vs. displaced search work) and a concrete cheapest consumer (prune vs. scoring signal) remain untested.
> **Evidence role:** confirmation of a fully prespecified query, per `docs/solver-per-instance-relational-feasibility-preflight.md`'s question 1.
> **Population identity:** the only 2 parents in the already-committed B2 exact-label set (`reports/stress/h1-event-feasibility-queries-2026-09-16.json`, 28 states/14 parents) with a same-parent exact-DEAD/exact-LIVE pair sharing identical remaining-intersection-deficit AND remaining-length: `S00030` (1 dead, 2 live) and `R00104` (1 dead, 1 live). No new labelling.

## Why this ran

Per `docs/solver-optimization-workstreams.md`'s reconciled queue ordering ("D (existing exact-labelled states, not the blocked Class-5 asset) -> C -> ..."), Lane D is the recommended next single-agent step after Lanes A/B/Class-3 concluded. Its preflight's first bounded question is: "On matched LIVE/DEAD states with the same scalar intersection deficit, enumerate or decide a small bounded family of future crossing commitments/interfaces. Ask whether DEAD states lose all realizable commitments while LIVE siblings retain at least one."

## Selection (frozen before any query ran)

Computed each B2 state's `remainingIntersections` (`level.requiredIntersections - state.ints`) and `remainingLength` by replaying its committed prefix through the native solver (`scripts/stress/tmp-b2-int-deficit.mjs`, a one-off diagnostic, not committed). Selected every parent with a same-parent exact-DEAD/exact-LIVE pair matched on **both** scalars simultaneously — the strictest possible control, since it means the production solver's own remaining-length and remaining-intersection bounds are identical between the DEAD and LIVE state and therefore cannot be the explanation for their different fate. Exactly two of B2's 14 parents qualify: `S00030` (dead top-rank1, live witness-culled, live cutoff-survivor — all `remInt=8, remLen=74`) and `R00104` (dead top-rank1, live witness-culled — both `remInt=1, remLen=38`).

## What was implemented

- **`--pin-revisit=<json [[x,y],...]>`** added to `scripts/stress/cpsat-reference-probe.py`: adds `visits[c] >= 2` for each named cell to the already-built full-mechanic model — an *additive* hypothetical commitment (distinct from must-cross's own `visits[c]==2` requirement), usable on any current-input already-visited cell.
- **`scripts/stress/lane-d-intersection-commitment-realizability.mjs`**: for each selected state, enumerates candidate commitment cells as every unique already-visited cell in that state's own prefix (excluding gate, goal, and any portal/flip cell — cap-1 cells are trivially infeasible to revisit by construction and uninteresting for this question), then runs one `--pin-revisit` query per candidate. Every claimed-feasible witness is referee-validated via `Solver.validateCandidatePath` before being counted.

## Result

| Parent | Role | Label | Candidates | Feasible | Infeasible | Indeterminate (timeout) |
|---|---|---:|---:|---:|---:|---:|
| S00030 | top-rank1 | dead | 13 | **0** | 6 | 7 |
| S00030 | witness-culled | live | 13 | **1** | 3 | 9 |
| S00030 | cutoff-survivor | live | 13 | **1** | 5 | 7 |
| R00104 | top-rank1 | dead | 34 | **0** | 34 | 0 |
| R00104 | witness-culled | live | 34 | **2** | 32 | 0 |

107 total queries, 0 correctness alarms (every feasible claim referee-valid). `R00104` fully resolved (0 unknowns): the DEAD state has all 34 candidates *proven* infeasible; the LIVE sibling has 2 *proven* feasible. `S00030` has real timeout noise (7-9/13 unresolved per state at the 30s cap used here) but the resolved subset shows the identical pattern: 0 confirmed-feasible for DEAD, >=1 confirmed-feasible for each LIVE sibling.

## Interpretation

Both DEAD states have **zero** confirmed-realizable future-intersection commitments; all three LIVE siblings have **at least one**. This holds despite DEAD and LIVE sharing an identical scalar intersection deficit and remaining length — precisely the pair of facts the production solver's own necessary-condition machinery (`docs/solver-reasoning-capability-atlas.md`'s "scalar resource bounds" primitive) already computes and cannot use to distinguish them. The relational query — "can the same numeric deficit still be realized through *this specific* already-visited cell" — recovers information the scalar summary discards.

This is exactly the atlas's named gap 1 ("joint future-feasibility reasoning": INFERENCE + COMPOSITION) manifesting concretely, and it survives H1's closure cleanly: H1 tested a fixed low-cardinality event vocabulary (`cross-via`/`pass-via`/`flip-order`/`portal-pair`) for cross-parent recurrence and found no compact universal relation; this query is a different, per-instance formulation (a generic current-input procedure whose feasible-cell *set* is expected to be board-specific) and does not need to recur in any fixed form across parents to be legitimate, per `solver-capability-gap-stop-condition-reconciliation.md`'s "procedure generalization vs. output recurrence" distinction.

## What this does and does not earn

Earned:
- a documented, referee-sound positive nomination for Lane D's question 1;
- confidence that the *procedure* (enumerate already-visited cells, query one additive revisit commitment at a time) is well-defined, cheap to implement, and produces sound, non-trivial, decision-relevant answers.

Not earned:
- a production prototype. The preflight's advancement gates require economics (is this cheaper than the search work it would displace?) and a concrete cheapest consumer (prune vs. lower bound vs. scoring signal) — neither was tested. A per-candidate CP-SAT query costing seconds is obviously not viable as a per-node production check; any production-shaped descendant would need either a much cheaper sufficient/relaxed check or restriction to a rare, high-value decision point (e.g., once per stalled attempt, not per node).
- population-level confidence beyond "premise earned." Two independent parents is the same order of evidence as the original controlled topology-fork pilot (which also used 2 parents) — real, but small.

## Next gate

The matched-scalar B2 population is now exhausted (only 2 qualifying parents existed; both tested). Expanding this line needs fresh matched same-parent LIVE/DEAD Class-5 pairs — but that is exactly the population Lane B's fresh sibling harvest could not supply: its naive goal-distance-greedy constructor produced 0/75 LIVE siblings (`reports/2026-09-17-fresh-dead-sibling-harvest-result-001.md`). Lane D's question 1 is therefore blocked on the **same production-search-quality sibling constructor handoff** as Lane B, not a new or different gate. Lane D's questions 2 (constrained-event feasibility) and 3 (residual-interface commutativity) do not share this dependency and remain open as the next cheap steps on existing data.

## Artifacts

- `reports/stress/lane-d-intersection-commitment-realizability-2026-09-17.json` — full per-state, per-cell results
- `scripts/stress/cpsat-reference-probe.py` (`--pin-revisit` hook)
- `scripts/stress/lane-d-intersection-commitment-realizability.mjs`
