# Broad solver-evidence reconciliation consumer 001

> **Status:** active
> **Last evidence:** 2026-09-21 — current broad-run closeout contract after PRs #1977–#1978.
> **Decision:** use one derived reconciliation artifact to join canonical production participation, EW1 equal-work pricing, deep T1 capability, and the frozen WS1 continuation challenge after the next stress refresh + technique census. Do not make agents reconstruct these relationships manually from raw shards.
> **Remaining gate:** run the consumer after both broad workflows complete and use its nominations as question-intake inputs, not automatic solver-policy decisions.
> **Evidence role:** method / derived reconciliation

## Why this exists

The current broad acquisition is intentionally split across two workflows:

- stress refresh owns the current production boundary, lifecycle/failure evidence, production participation and frozen WS1 replay;
- technique census owns deep isolated T1 capability and the bounded EW1 equal-work pricing tranche.

The individual analyzers are already strong. The remaining weak seam was **post-run composition**: the required closeout asked an agent to manually join those derived artifacts before deciding whether a discrepancy means cheap missed capability, deep-only evidence, continuation underdose, possible production redundancy, or simple protocol/population mismatch.

That is exactly the kind of repeated research plumbing that should be deterministic.

## Consumer

`scripts/reconcile-broad-solver-evidence.mjs`

Required inputs:

- canonical equal-work production-reach result;
- canonical technique-census analysis.

Optional but expected for the broad closeout:

- production run summary;
- frozen WS1 challenge result.

The consumer does not reread raw shards or rerun solver analysis already owned elsewhere.

## Output contract

The result preserves four meanings separately.

### Production participation

For each normalized attempt-config identity:

- reached levels;
- winning levels;
- attempts;
- canonical work.

Stage-level aggregation records attempts, wins and work without claiming causal marginal value.

### EW1 shallow pricing

For the frozen equal-work sample:

- eligible cells;
- solved levels;
- mean canonical work;
- work-budget reaches;
- natural exhaustion.

A solve here is evidence of cheap isolated capability on the EW1 sample.

### Deep T1 capability

From the maintained census analysis:

- full-budget solves;
- observed node spend/termination shape where available;
- cheaper-technique substitution summaries.

These remain isolated-node capability evidence. They are not converted into production work economics.

### WS1 continuation result

When present, the exact frozen challenge result is carried into the same artifact:

- action-boundary evidence digest;
- captured pre-winner work share;
- winner endangerment;
- same-stage continuation composition.

No refit occurs.

## Nominations

The consumer emits mechanically reproducible nomination sets:

- **cheap isolated capability + zero recorded production wins**;
- **production participation + zero recorded wins**;
- **deep capability + no EW1 sample win**.

These are question generators, not conclusions.

In particular:

> zero recorded production wins is not stage obsolescence.

A stage can be prerequisite, information-producing, capability-protecting, or displaced by ordering. Removal requires explicit substitutability and removable-work evidence.

Likewise:

> no EW1 sample win is not absence of cheap capability globally.

EW1 is a bounded 60-level sample.

## Protocol checks

The artifact surfaces the equal-work producer's own decision-bearing state, blockers, production commit(s), current-head identity and missing matched-work count.

This keeps protocol mismatch visible before any cross-source interpretation.

## Intended broad-run flow

After stress refresh + census:

1. run the existing canonical component analyzers;
2. run `research:reconcile-broad-solver-evidence`;
3. inspect the single derived artifact for mismatches/nominations;
4. route only decision-changing nominations through ordinary question intake;
5. record the dated scientific closeout;
6. only then change scheduler policy, census depth, or active gates.

## Example

```bash
npm run research:reconcile-broad-solver-evidence -- \
  --production-summary=<fresh-capability-run>/summary.json \
  --equal-work-reach=<fresh-capability-run>/equal-work-production-reach.json \
  --census-analysis=<fresh-technique-census>/second-order-analysis.json \
  --ws1-challenge=<fresh-capability-run>/action-selection-legal-signal-challenge.json \
  --out=<fresh-reconciliation>/broad-evidence-reconciliation.json
```

Exact output paths are supplied by the completed broad runs; the consumer does not own run discovery or queryability.

## Boundaries

This consumer may:

- expose cross-source mismatches;
- nominate allocation/continuation/obsolescence questions;
- reduce manual agent archaeology;
- make the mandatory broad-run reconciliation reproducible.

It may not:

- declare a production stage removable;
- equate T1 nodes with canonical production work;
- treat a bounded EW1 negative as a global capability negative;
- refit the frozen WS1 model;
- promote any scheduler/budget change automatically.

## Research-system implication

The current research system has enough retained semantic structure that the next major efficiency gain is increasingly **composition of already-owned analyzers**, not another data lake or another query framework.

The broad-run closeout should therefore arrive as a deterministic derived research object first, with prose interpretation downstream.
