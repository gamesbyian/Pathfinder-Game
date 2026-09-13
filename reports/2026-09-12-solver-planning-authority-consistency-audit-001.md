# Solver planning authority consistency audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — current workstream/future-work authorities reconciled after the 98-row harvest, future-feasibility null, provenance closeout, semantic-label repair, backlog excavation and question-relation seeding.
> **Decision:** preserve one live mutable queue (`solver-optimization-workstreams.md`), keep `solver-future-work.md` deferred/reopen-only, and preserve material cross-question relationships in the sparse question registry rather than duplicating queue state in reports.
> **Remaining gate:** none for this authority audit. Re-run after a material planning/compaction change or when two authorities disagree about ownership/state.

## Authority model

- `docs/solver-optimization-workstreams.md` owns current research priority, live population state, active next gates, and supporting/closed workstream state.
- `docs/solver-future-work.md` owns deferred questions and reopen conditions only.
- `docs/solver-research-question-relations.json` owns sparse cross-question edges that would otherwise disappear during compaction; it is not a queue.
- method/policy docs own durable rules, not current prioritization.
- specialist reports refine or close a gate without reprioritizing the program.
- completed plans/handoffs are historical contracts and must say so explicitly.

## Findings corrected

### Completed workflow remediation was still routed as active work

`docs/README.md`, `AGENTS.md`, and the remediation handoff still implied the September 11 workflow-remediation program was active even though PR #1740 completed it. Routes were corrected so new workflow/evidence work starts from current method/evidence authorities.

### A live trigger had been filed as future work

The standing rule says a material production-boundary or provenance reinterpretation should cheaply rejoin classes 1-3. September 12's T1/provenance correction was exactly that trigger, yet the action had remained periodic/future. It was promoted into WS2 and then executed: the 98-row pass found no free harvest and preserved one separate seven-level must-turn-biased changed-treatment nomination.

### Future work duplicated mutable current state

`solver-future-work.md` had begun carrying live residual/harvest language. Current truth is again owned by workstreams; future work retains only deferred questions and reopen conditions.

### Opt-in ledger retained an obsolete post-1,029 gate

The admissible-order matched-work row was refreshed against the post-1,048 boundary. It remains technically meaningful but deferred until current evidence again isolates the relevant ordered-systemic loss under nonzero target-stage work.

### Compaction could erase epistemic state

Backlog excavation found one duplicate future lane and one genuinely orphaned premise. The latter, reason-producing dead-state reuse, had disappeared without a negative result. A sparse stable-question relation registry now preserves material `answeredBy`, `implies`, `triggers`, `constrains`, calibration/negative-control and reopen relationships while leaving priority solely in workstreams.

## Current live state after all follow-through

- **WS2 first priority:** bounded additive late must-turn-biased repair pilot on the seven-row class-2 seam, in parallel with diagnostic recurrence measurement for compact sound dead causes before any local-nogood implementation.
- **WS1:** supporting; exact cross-hint collision audit is closed and no determinism/near-collision continuation is earned.
- **WS4:** closed in tested generic width/bucket/scorer forms.
- **WS5:** exact/reference support on demand.
- **WS7:** supporting; no current speed candidate nominated.

The cheap gates that this audit originally called “due” have therefore been executed, not merely documented. No solver behavior or promotion disposition was changed by the authority audit itself.