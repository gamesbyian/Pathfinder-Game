# Class-3 exact-action dose acquisition and analysis preflight 001

> **Status:** active
> **Last evidence:** 2026-09-19 — standard compact failure-response now preserves exact attempt action/stage work and protocol identity; retained current boundary remains 531 residual / 23 primary Class-3 rows.
> **Decision:** freeze the population from the canonical current residual-atlas regeneration, then measure exact known-rescuer participation and dose inside a production-shaped shared-budget run before interpreting any Class-3 row as exposed-and-failed.
> **Remaining gate:** freeze the regenerated 23-row expectation artifact from committed census/boundary assets, then obtain protocol-compatible compact attempt telemetry from a maintained shared-production producer. Population derivation and downstream classification are mechanical and require no solver search.
> **Research question:** `WS2-CLASS3-DOSE-EXPOSURE`.
> **Evidence role:** acquisition/analysis precommitment, not a treatment test.

## Scientific question

Class 3 means a known isolated T1 rescuer was sufficiently visible to the old exposure classifier to avoid Classes 1-2, but the 2026-09-17 reconciliation showed that the retained production artifacts do **not** establish how much shared-budget work the exact winning action received.

The question is therefore:

> For each current Class-3 parent and each known T1 rescuer that contributes to its Class-3 classification, did that exact action actually execute under the shared production protocol, how much work/nodes did it receive, and how did that attempt terminate?

This is an exposure/dose question. It is not a rerun of isolated technique capability.

## Freeze the current population before acquisition

Do not copy the 23 rows from an older atlas. The class membership is derived from the current production boundary plus frozen T1 census and current lifecycle/provenance semantics.

Regenerate the canonical atlas from the current boundary:

```bash
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/35066677597/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/35066677597/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/ws2-class3-current-atlas.json
```

Before any solver acquisition, require:

- `currentResidualLevels === 531`;
- primary Class-3 count === **23**;
- source baseline/lifecycle/census paths match the command above;
- classification schema is current.

Then freeze the sorted `rows.filter(row => row.primaryClass === 3)` IDs and their exact `t1Wins[].identity` rescuer identities into a tracked acquisition artifact. If the count is no longer 23 because the production boundary has moved, stop and update the owning WS2 authority rather than silently using this preflight's historical count.

The atlas regeneration is evidence joining, not solver search.

## Why the exact rescuer identity matters

The existing evidence gap arose because family-level reach is weaker than exact-action dose.

Examples that must remain distinct include:

- `repair|score=repair|guidance=standard`;
- `repair|score=repair|guidance=must-turn-biased`;
- admissible-order tie-break variants;
- individual DFS/beam scoring/bias configurations.

A repair-family stage reaching millions of nodes does not prove that a particular repair guidance configuration received comparable work.

## Eligible acquisition

Use a maintained solver producer that:

- executes the ordinary production-shaped shared ladder rather than isolated method-probe semantics;
- accepts the frozen exact level population without outcome-selected additions;
- automatically publishes the standard compact failure-response document;
- retains compact attempts with exact `actionKey`, `stageId`, `workSpent`, `nodesExpanded`, ceilings and termination outcome;
- publishes known `protocolHash` and `solverRef`;
- verifies the exact expected population.

Prefer piggybacking on an already-justified current-boundary targeted/confirmation run. Do not launch a broad corpus campaign merely to fill the table.

If no maintained producer can satisfy these fields without code changes, this preflight hands off a narrowly specified telemetry gap to the coding agent rather than authorizing a bespoke scientific workaround.

## Zero-compute current-population derivation

The Class-3 population and exact rescuer identities can be rebuilt entirely from already-committed evidence with no solver search:

```bash
npm run research:freeze-current-class3-dose-expectations
```

That command pins the canonical 35066677597 production/lifecycle boundary and 33717910218 technique census, rebuilds the current residual atlas, requires exactly **531 residual / 23 Class-3 parents**, then writes `reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json`.

The derived artifact retains each Class-3 parent, every Class-3 `t1Wins[].identity`, isolated census node cost, winning gate, and historical dispatch/reach/starvation support. Those census fields are acquisition context only; isolated node cost is not shared-production dose.

`test:class3-dose-expectations-current` exercises the same canonical freeze path and fails on boundary or Class-3 count drift.

## Mechanical acquisition artifact and reducer

Freeze the regenerated population before solver acquisition as a tracked JSON document:

```json
{
  "schemaVersion": 1,
  "kind": "pathfinder-class3-dose-expectations",
  "parents": [
    {
      "parentId": "Rxxxxx",
      "rescuers": [
        { "actionKey": "exact canonical attempt identity", "stageId": "optional exact stage" }
      ]
    }
  ]
}
```

Then reduce one or more protocol-compatible compact-response documents with:

```bash
npm run research:analyze-class3-dose -- \
  --in=<compact-failure-response.json>[,<more.json>] \
  --expectations=<frozen-class3-expectations.json> \
  --out=<class3-dose-analysis.json>
```

`scripts/analyze-class3-dose-exposure.mjs` fails closed unless all observed expected-parent rows share one known `protocolHash` and one known `solverRef`. It reports missing parents explicitly, preserves parent as the independent unit, and mechanically classifies every expected exact rescuer as not participated, dose unknown, censored, exhausted-negative, solved, or indeterminate. Error/unknown-only attempts stay indeterminate rather than being converted into negative evidence.

## Independent unit

Parent/level is the independent unit.

A parent can have several known T1 rescuers and several repeated production attempts. Those attempts are dependent exposure observations inside one parent, not extra independent samples.

## Per-rescuer classification

For every frozen parent × known-rescuer identity, classify one of:

### 1. `exact-not-participated`

The exact action is absent from compact attempts.

This is non-exposure, not failure.

### 2. `exact-participated-dose-unknown`

The exact action appears, but work/node dose needed for interpretation is missing.

This remains an evidence gap.

### 3. `exact-participated-censored`

The action received measurable dose but ended because of a node/work/deadline ceiling.

Report:

- work/node ceiling;
- workSpent/nodesExpanded;
- fraction of the reported ceiling consumed where both values are known;
- termination type.

This is exposed-but-censored, not exhausted negative.

### 4. `exact-participated-exhausted-negative`

The action has measurable dose and a genuine exhausted/failed outcome that is not merely a budget/deadline censor.

This is the strongest "exposed-and-negative" form available from compact telemetry.

### 5. `exact-participated-solved`

The exact action solves inside the shared production run.

That is a current capability recovery and must be separated from the Class-3 historical label; refresh the residual/classification authority after validating the solve.

## Primary summaries

Using `failure-response-query.mjs` and the frozen parent/rescuer map, report:

- parents with every known rescuer exactly observed;
- parents with at least one exact rescuer absent;
- parents with any dose-unknown rescuer;
- parents whose exact rescuer attempts are only censored;
- parents with at least one genuine exhausted-negative exact rescuer;
- parents with an exact rescuer solve;
- by exact action identity:
  - parent count;
  - attempt count;
  - median/min/max exact-attempt workSpent;
  - median/min/max nodesExpanded;
  - outcome composition;
- by stage:
  - the same dose/termination support;
- missing/protocol-incompatible rows.

Do not sum repeated attempts into an independent prevalence denominator.

## Interpretation rules

### Exposure-only result

If a material portion of the 23 parents lack exact rescuer participation or exact dose, Class 3 remains primarily an **exposure/allocation** problem. Route any follow-up to the smallest scheduler/action-selection question that explains why those already-known rescuers do not receive interpretable dose.

Do not modify the rescuer implementation merely because production failed without running it fairly.

### Censored-dose result

If exact rescuers repeatedly participate but hit work/node ceilings before exhaustion, the next question is dose-response/allocation economics.

Use their actual shared-production dose distribution to nominate a bounded higher-dose or reallocation experiment. Do not infer the required dose from isolated T1 node cost alone.

### Exposed-and-negative result

Only parents whose exact known rescuer genuinely participates with measurable dose and exhausts/fails without censoring support an "exposed-and-negative" interpretation.

Even then, isolated T1 capability and shared production search are different contexts. This observation nominates a context/order/handoff question; it does not prove the technique has become intrinsically incapable.

### Current rescuer solve

Any exact-rescuer solve under the current shared protocol is a production-boundary freshness event. Validate it, update current residual/class membership, and remove that parent from further Class-3 dose analysis.

## Solved controls

When the acquisition producer naturally includes solved parents with the same exact action identities, retain them as controls for:

- normal dose range;
- normal censoring frequency;
- failed attempts that precede eventual solve.

Do not expand the run solely to manufacture a large solved-control cohort if a smaller existing protocol-compatible control set is already available.

## Stop condition

The Class-3 dose question is answered for the current population when every one of the frozen 23 parents has:

- all known-rescuer identities accounted for;
- exact participation known;
- work/node dose known when participated;
- termination/censoring known;
- one parent-level disposition among exposure-gap, censored-dose, exhausted-negative, refreshed-current-solve, or an explicit unresolved/indeterminate state that blocks closure.

A few missing rows do not become negatives. Recover them under the same protocol or leave them unknown.

## Non-goals

This preflight does not:

- rerun the isolated T1 census;
- assume isolated node counts equal required shared work;
- collapse repair/admissible-order families into exact action identity;
- reopen a broad strategy treatment;
- make a selector from exact historical level IDs;
- require the main WS2 failure-response reconnaissance to wait for this supporting question.
