# Connectivity cut-certificate unscheduled caller attribution preflight 005

> **Status:** active
> **Last evidence:** 2026-09-21 — result 004 found 49,270 theorem-backed cut hits at production candidates where connectivity was skipped, but the aggregate mixes search families with materially different connectivity schedules.
> **Decision:** run one bounded production-inert attribution pass on the frozen 24-parent development population before building subtree/lineage accounting.
> **Remaining gate:** identify the search family and schedule phase owning the dominant unscheduled cut opportunity; only that family may advance to downstream-work economics.
> **Evidence role:** development.
> **Parent result:** [unscheduled applicability result 004](2026-09-21-connectivity-cut-certificate-unscheduled-applicability-result-004.md).
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).

## Ambiguity

004 establishes substantial earlier applicability but mixes distinct consumers:

- ordinary DFS: connectivity every 64 expansions until the final 10 steps;
- beam: connectivity every eighth real-length layer until the final 20 steps;
- admissible-order DFS: 64-expansion cadence;
- repair random walk: deliberately omits connectivity entirely;
- repair deterministic completion / bounded DFS / relink: 64-node cadence near the same final-step rule.

These imply different treatments.

A repair-walk hit has no “next scheduled fill” to beat. A DFS hit may dominate an exact subtree. A beam hit can interact with culling/retention.

## Frozen population and execution

Reuse result 004 exactly:

- Corpus 2 random stress positions 81-104;
- 24 parents;
- strict base work budget 500,000;
- wall safety 30 s;
- unique certificate cap 64;
- cut proof construction, deduplication and current-position indexing unchanged;
- unscheduled probing remains production-inert.

No parent is selected from 004's hit outcome.

## New observation only

Every unscheduled probe record adds:

- caller family:
  - `dfs`;
  - `beam`;
  - `admissible-order`;
  - `repair-random-walk`;
  - `repair-completion-dfs`;
  - `repair-bounded-dfs`;
  - `repair-relink`;
- caller-local connectivity schedule phase when defined;
- remaining counted steps at the candidate.

The observer still does not prune.

The attribution must be carried by caller context already known to the search loop. It must not infer technique from path shape, timing, level identity or historical outcomes.

## Primary decision table

For each caller family report:

- unscheduled probe count;
- cut-hit count and hit rate;
- independent parents with hits;
- indexed certificate candidates;
- boundary-cell validations;
- median proof age;
- remaining-step distribution;
- schedule-phase distribution where the caller has a periodic connectivity cadence.

## Decision rule

Advance **one** downstream-work microscope only if a caller family has:

1. material cut-hit incidence;
2. multiple independent parents;
3. a coherent dominated-work interpretation;
4. enough concentration to justify method-specific instrumentation;
5. no need for a generic cross-technique tracing framework.

If repair random walk dominates, next work is a repair-specific exact-dead-candidate economics study and eventual matched-work capability A/B, not DFS subtree accounting.

If DFS/admissible-order dominates, add bounded subtree entry/exit work accounting around proof-hit prefixes.

If beam dominates, reuse BeamResearch lineage/disposition to estimate work until deterministic rejection or lossy cull.

If no family survives independently, close the early-consumer line despite aggregate 004 incidence.

## Contamination boundary

This is a development attribution pass on the already-spent 004 population.

It may choose the next mechanism-specific microscope. It may not establish production benefit or broad prevalence.
