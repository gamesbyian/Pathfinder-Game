# Capability-invention beam freshness preflight 001

> **Status:** dispatch-ready
> **Date:** 2026-09-20
> **Population:** R02196, R02206, R02258
> **Frozen input:** `reports/stress/capability-invention/beam-freshness-probe-2026-09-20.json`
> **Decision:** run a current-head isolated freshness replay before treating these Class-3 exposed-and-negative rows as capability-acquisition demand.
> **Production authorization:** none.

## Why this probe exists

The Class-3 dose resolution found three rows where the exact historically successful beam rescuer genuinely participates under shared production, reaches real exhaustion near its historical isolated solve cost, and still fails.

Those rows are tempting invention targets. They are not ready for that interpretation.

Their isolated success comes from the historical technique census. The first unresolved question is therefore whether the current solver still possesses the isolated capability at all.

## Frozen cells

### Mechanic-buckets beam

- Levels: R02196, R02206
- Action: `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets`
- Historical isolated costs: 293,389 and 257,117 nodes

### Plain-retention beam

- Level: R02258
- Action: `beam|score=objectiveFirst|bias=none|width=5000|retention=plain`
- Historical isolated cost: 578,195 nodes

## Execution contract

Use `.github/workflows/method-probe-sweep.yml` against `data/stress/stress-levels-random.json`.

Frozen ceiling:
- node budget: 1,500,000
- wall safety deadline: 120,000 ms
- no canonical work ceiling
- one worker per row is sufficient

The node ceiling is more than 2.5x the largest historical isolated solve cost. If a row still binds on node or wall limit, the freshness result is blocked rather than negative.

Two workflow dispatches are required because the exact action differs by retention mode:
1. R02196,R02206 with mechanic-buckets retention.
2. R02258 with plain retention.

## Decision rule

- **3/3 fresh isolated solves:** current capability survives. Keep the rows unresolved and compare fresh isolated-success against shared-production exhausted-negative execution to find the earliest context-sensitive loss.
- **0/3 fresh isolated solves:** historical capability evidence is stale on current head. Reclassify the rows; do not invent a production consumer to recover stale capability.
- **Mixed:** split the cohort by freshness. Do not force one explanation.
- **Censored:** increase only enough ceiling to obtain a natural solve/exhaustion verdict.

Any solved candidate must be canonically referee-valid.

## What comes after a positive freshness result

Do not jump to a new beam feature.

The next discriminator is the earliest difference between:
- the fresh isolated successful execution, and
- the shared-production exhausted-negative execution.

Potential classes include action input/config drift, inherited state or prep differences, candidate-generation changes, ranking/retention divergence, or stage-local context. Only after that localization should the demand row become HARVEST, EXTENSION, or INVENTION.

This is a capability-freshness probe, not a production treatment.
