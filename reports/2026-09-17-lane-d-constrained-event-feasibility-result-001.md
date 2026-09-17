# Lane D constrained-event feasibility result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — per-instance re-analysis of H1's already-committed 449-query CP-SAT result set (0 correctness alarms), current HEAD.
> **Decision:** per-instance constrained-event feasibility is real and non-trivial for LIVE states (13.8% of 392 event queries across 23 live states are individually infeasible despite the state overall being live; 16/23 live states show a mixed feasible/infeasible pattern across their own candidate events), but the query form cannot distinguish DEAD from LIVE at the per-query level, because every query on a DEAD state is infeasible by construction (an already-infeasible base problem stays infeasible under any additional constraint). The earned finding is narrower than the preflight's LIVE/DEAD framing: a within-state candidate-commitment viability signal, not a LIVE/DEAD classifier.
> **Remaining gate:** no production prototype earned; economics and a concrete cheapest consumer (most plausibly a search-time prune/ordering hint over candidate near-term commitments, not a state-level classifier) remain untested. Expanding the population needs either the same blocked sibling constructor (for fresh states) or a materially different already-labelled population with per-query event results.
> **Evidence role:** confirmation of `solver-per-instance-relational-feasibility-preflight.md`'s question 2, reusing question-1-adjacent H1 data at zero new compute.
> **Population identity:** the same 28-state/14-parent B2 exact-labelled population H1 already queried (`reports/stress/h1-event-feasibility-queries-2026-09-16.json`), re-grouped per state from `reports/stress/h1-event-feasibility-results-merged-2026-09-16.json`. No new labelling, no new CP-SAT queries.

## Why this ran

Per the reconciled queue's remaining single-agent order (D2/D3 -> C -> E -> F2/F3), Lane D question 2 ("constrained-event feasibility") is next. Its preflight text: "ask whether completion remains possible through a nominated current-input event/region/interface: a crossing cell/axis, separator side, portal family, chokepoint, or required approach class."

H1 already ran exactly this query shape (cross-via/pass-via: pin a specific crossing or passing event, ask CP-SAT feasibility) against this population, but scored it for **cross-level recurrence of a fixed low-cardinality event vocabulary** — closed negative, no compact universal relation. Per `solver-capability-gap-stop-condition-reconciliation.md`'s "procedure generalization vs. output recurrence" distinction, H1's closure is about *that* claim, not about whether the same already-run queries carry **per-instance** information. This is a different, still-open question answerable from already-committed data with zero new solver compute.

## Method

`scripts/stress/lane-d-constrained-event-feasibility-reanalysis.mjs` re-groups H1's 449 per-query CP-SAT verdicts by `caseId` (one row per state), splitting by the state's own `exactLabel` (dead/live) and counting each state's own feasible/infeasible/unknown query outcomes.

## Result

| | States | Queries | Feasible | Infeasible | Unknown |
|---|---:|---:|---:|---:|---:|
| DEAD | 4 | 57 | 0 | **57 (100.0%)** | 0 |
| LIVE | 23 | 392 | 309 (78.8%) | **54 (13.8%)** | 29 (7.4%) |

Live-state pattern (23 states):
- **5** fully feasible — every nominated event tested is individually feasible.
- **2** fully infeasible (`R00060:18:top-rank1`, `R00060:18:culled-supported-rank124`) — every nominated event is individually infeasible, yet the state's own base problem (no added constraint) is live; the actual completion(s) do not use any of the tested cross-via/pass-via events.
- **16** mixed — some events feasible, some infeasible, within the same already-live state.

## Interpretation

**DEAD states carry zero new information from this query form.** A DEAD state's base problem (no added constraint) is already infeasible; adding any further constraint to an infeasible CP-SAT model stays infeasible by construction. This holds for all 4 DEAD states/57 queries with no exceptions, so constrained-event feasibility cannot be used as a LIVE/DEAD discriminator the way Lane D question 1's revisit-commitment query was — that distinction is already fully captured by the state's own base feasibility, which the production solver's own search already determines by definition of reaching a verdict at all.

**LIVE states carry a real, per-instance, sub-state-level signal.** 13.8% of live-state event queries are individually infeasible even though a completion exists for that state through some other route, and 16/23 live states mix feasible and infeasible outcomes across their own candidate events — proving the per-instance answer is not simply a restatement of the state's own binary label. The two fully-infeasible live states are a clean, stark example: the microscope's frozen event vocabulary can be systematically wrong about which local commitments are viable, even while correctly leaving the state's overall fate untouched.

This reframes the preflight's premise more precisely: the useful discrimination this query form offers is not "LIVE vs. DEAD" (state-level, already known), but "**which of several candidate near-term commitments remain viable within an as-yet-unresolved search**" (commitment-level, not yet known during live search). That framing is arguably more production-relevant than a LIVE/DEAD classifier, since production search does not know the true label in advance — it is choosing among candidate moves.

## What this earns

Earned:
- A concrete, referee-sound (0 correctness alarms, inherited from H1's own audit) per-instance positive: constrained-event feasibility varies meaningfully within single instances and is not reducible to the state's own label.
- A corrected framing of question 2's premise: useful as a candidate-commitment viability hint during search, not a state-level LIVE/DEAD discriminator.
- Zero new solver compute — pure re-analysis of already-committed, already-audited data.

Not earned:
- A production prototype. Advancement gate 4 (a plausible consumer exploits the answer more cheaply than the displaced search work) is untested — the same open point as Lane D question 1.
- Population growth. This is the same 14-parent B2 set already exhausted by question 1; a broader population needs either fresh matched states (blocked on the Lane B sibling-constructor handoff) or a different already-labelled corpus with per-query event results, none of which currently exists.

## Next gate

Question 3 (residual-interface commutativity) does not share this population dependency and remains the next open item. A future production-shaped descendant of this question would need a cheap per-node event-viability check (not a 30-45s CP-SAT query per candidate) and a decision point where knowing "this specific candidate commitment is locally infeasible" is worth more than the work it costs to ask.

## Artifacts

- `scripts/stress/lane-d-constrained-event-feasibility-reanalysis.mjs`
- `reports/stress/lane-d-constrained-event-feasibility-2026-09-17.json` — full per-state breakdown
- Source data (unchanged, cited not duplicated): `reports/stress/h1-event-feasibility-results-merged-2026-09-16.json`
