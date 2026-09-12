# Solver planning authority consistency audit 001

> **Status:** concluded / remediated
> **Date:** 2026-09-12
> **Scope:** current solver workstream authority, deferred/future-work authority, current planning/method routes, specialist plans/handoffs, and nearby disposition/reference docs that can accidentally carry stale queue state.
> **Decision:** preserve one live mutable queue (`solver-optimization-workstreams.md`), keep `solver-future-work.md` deferred/reopen-only, and mark completed specialist programs as historical. Several real staleness/ownership defects were corrected on the audit branch; one cheap live WS2 action remains due.

## Authority model

- `docs/solver-optimization-workstreams.md` owns current research priority, live population state, active next gates, and supporting/closed workstream state.
- `docs/solver-future-work.md` owns deferred questions and reopen conditions only. It may retain dated evidence needed to explain a reopen gate, but should not become a second live queue.
- method/policy docs (`solver-research-operating-model.md`, `solver-evaluation-evidence.md`, `solver-scheduling-policy.md`) own durable rules, not current prioritization.
- specialist active handoffs/reports refine a gate without reprioritizing the program.
- completed plans/handoffs are historical contracts and must say so explicitly.
- disposition/reference docs may record current polarity or reopen conditions but defer execution priority to workstreams.

## Findings corrected

### 1. Completed workflow remediation was still routed as active work

`docs/README.md` and `AGENTS.md` still routed workflow/evidence tasks through the September 11 remediation plan even though the plan and hostile-review handoff say PR #1740 completed the program. `solver-workflow-remediation-implementation-handoff.md` also still read as a live implementation handoff.

Corrected all three routes. New workflow/evidence maintenance starts from the ordinary current evidence/method authorities and changed workflow/scripts; the remediation plan and implementation handoff are explicitly historical, while the review handoff owns closeout conclusions.

### 2. A live trigger had been filed as future work

The standing rule says material production-boundary or provenance reinterpretation should rejoin the residual and cheaply check classes 1-3 for already-legal capability. September 12's T1/provenance reinterpretation is exactly such a trigger, but the check had only been documented as periodic/future.

Moved the current action into WS2: inspect the corrected atlas's 98 class-1/2/3 rows (`22+39+37`) as an existing-data composition/exposure pass before new acquisition compute. It may run alongside read-only future-feasibility analysis. Future work now retains only the next trigger after this one closes.

Class 4 is explicitly excluded from the cheap current-capability pass: its 123 rows have historical production-context candidates rather than current base-T1 winners and require freshness/current-protocol reconciliation first.

### 3. Future-work duplicated mutable current-state ownership

`solver-future-work.md` opened with current residual counts and a live-sounding secondary solve-harvest section despite declaring itself deferred/reopen-only.

Retained the September 12 431/123 counts only as a dated evidence join needed to explain reopen boundaries and pointed live truth back to workstreams. The currently due class-1/2/3 check is no longer presented as deferred.

### 4. Opt-in ledger retained an obsolete post-1,029 gate

The `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` row still conditioned follow-up on the post-1,029 residual atlas. Current state is post-1,048 with corrected residual classification and class-5 acquisition first priority.

Refreshed the row: the matched-work retry test is technically meaningful but deferred while the current WS2 gates run; reopen only when current residual evidence again isolates ordered-systemic loss and the test guarantees nonzero target-stage work under matched aggregate work.

### 5. Current-plan docs needed a clean historical/current boundary

`solver-optimization-current-queue.md` is already a correct compatibility pointer and contains no mutable queue state. `solver-research-post-naming-resumption.md` is already explicitly conditional historical translation, not a current queue. Both were left unchanged.

`solver-architectural-speed-opportunities.md` is consistent with WS7's SUPPORTING state: it explicitly says no current candidate is nominated and defers priority to workstreams. `solver-scheduling-policy.md`, `solver-research-data-assets.md`, and residual-state representation likewise behave as policy/reference docs rather than competing priority authorities.

## Current live state after remediation

- **WS2 first priority:** due class-1/2/3 existing-data harvest check; in parallel, bounded read-only future-feasibility rejoin on B1/B2 + R03229, at most 2-4 descriptors.
- **WS1 parallel:** exact cross-hint provenance collision audit.
- **WS4:** closed in tested generic width/bucket/scorer forms; only a surviving future-feasibility descriptor may nominate a new mechanism-specific axis.
- **WS5:** exact/reference support on demand; use existing labels before expanding.
- **WS7:** supporting, no speed candidate currently nominated.

## Remaining action

The planning docs are now internally consistent about the cheap 98-row class-1/2/3 check being due. This audit does not execute that analysis because it requires running the repository's current-data tooling; it should be completed before new acquisition compute and its result fed back into WS2.

No solver behavior or promotion disposition was changed by this audit.