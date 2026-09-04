# Solver optimization: current queue

> **Status:** compact live front door for solver capability and efficiency research.
> **Reconciled:** 2026-09-04.
> **Detailed chronology:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

Use this file to answer **what should happen next**. Open the detailed workstreams file only when the current gate needs its chronology, prior branches, or complete evidence chain. Specialist reports/docs refine the current gate but do not silently reprioritize it.

## Current execution priority

### 1. Workstream 2 - scheduler/allocation repricing

**State:** ACTIVE. The equal-work pilot and static-portfolio composition search are complete. `portfolio-18-tranche-v2` was strongly characterized in the research harness and transferred without regression to Corpus 1, but a real production-entrypoint A/B showed the production ladder still wins extra coverage at much higher work.

**Latest attribution:** on the 40-level production-vs-static-portfolio A/B, the four production-only wins split into three **dose truncations** of already-present `intersectionHarvest` beam configurations and one **missing action** (`goal-attraction-disabled-retry`). The same audit found `admissible-order-fallback` plus `admissible-order-alternate-tiebreak-retry` consuming 61.7% of production work for three realized solves. Disabling the alternate-tiebreak retry on that selected 40-level population lost no solves and saved 58.35% work, but frozen-census evidence shows those tie-break profiles have real rare/exclusive capability, so removal is not justified.

**Next earned gate:** derive a **percentile-based smaller work ceiling** for `admissible-order-alternate-tiebreak-retry` from its own isolated cost-when-solving distribution, then confirm that repricing on an approximately 150-level independent population. Preserve rare-capability retention and compare total `workSpent`, paired gains/losses, and stage reach. Do not use the 40-level zero-loss pilot as the confirmation population.

Primary evidence:
- [`../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md)
- [`solver-scheduling-policy.md`](solver-scheduling-policy.md)
- current capability map: `reports/stress/technique-niches/2026-09-03/level-capability.json`

### 2. Workstream 1 - action selection / routing

**State:** DOWNSTREAM of the current Workstream-2 resource-model gate.

The static-portfolio work exposed real rare-tail rescuers and missing-exposure cases, but isolated identities are not by themselves a new routing premise. Resume Workstream 1 when the current repricing gate is resolved or when new cross-evidence establishes a broader state/mechanics-conditioned action-selection hypothesis.

Before generating new evidence, query the existing data assets and current capability/lifecycle material.

### Supporting workstreams

Workstreams 6 and 7 remain supporting inputs where they can cheaply clarify the active gate. Other workstreams keep their existing dispositions in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); they are not promoted merely because their evidence is newly inspected.

## Standing research rules

- Use `workSpent` for cross-technique allocation comparisons. Raw nodes are within-technique diagnostics.
- Level-blindness is not generalization. Selection/tuning pressure determines the needed confirmation strength.
- New actions/configurations expand the menu, not the total budget.
- Clear negatives close the tested form unless materially new evidence changes the premise.
- After meaningful capability change or census refresh, rebuild/rejoin the capability map before relying on old support classes.
- Scheduler/repricing work must audit singleton/doubleton/specialist retention, not only aggregate solve count.
- Use the smallest evidence that can decide the next gate.

Method authority: [`solver-research-operating-model.md`](solver-research-operating-model.md). Evaluation/holdouts: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Level-blindness: [`solver-level-blindness.md`](solver-level-blindness.md).

## Cheap discovery before opening large files

- Existing evidence: `node scripts/research-status-index.mjs --compact --query=<term>`
- Existing tooling: `node scripts/tooling-census.mjs --compact --query=<term>`
- Existing research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`
- Corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) only when the compact asset query is insufficient or when designing a non-obvious cross-evidence join.

## Conditional post-naming bridge

The naming cleanup is complete. [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) is required when **executing, aggregating, or translating frozen pre-cleanup evidence whose names/contracts may be historical**. It is not mandatory orientation for ordinary current-head solver research.

## Closed / do-not-repeat forms

Do not repeat unchanged versions of already-closed forms simply because their chronology is no longer loaded by default. Use the compact research-status query for the named mechanism first, then inspect the detailed workstream/report if necessary.

## When to open the detailed workstreams file

Open [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) when you need:

- the complete chronology of a workstream;
- old gate transitions and why they closed;
- full report/run provenance;
- historical wording needed to reconcile frozen evidence;
- a disposition not summarized above.

Do not preload it merely to discover the current priority.