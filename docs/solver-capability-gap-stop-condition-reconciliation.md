# Solver capability-gap stop-condition reconciliation

> **Status:** current supporting research map; not a priority authority.
> **Purpose:** distinguish historical experiment stop conditions that genuinely close a semantic capability premise from stop conditions that only close one reusable descriptor, implementation, population, or cross-level generalization form.
> **Priority owner:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). Capability model: [`solver-reasoning-capability-atlas.md`](solver-reasoning-capability-atlas.md).

## Why this layer is needed

The reasoning-capability atlas asks what semantic operations the solver lacks or realizes weakly. Historical experiments often asked narrower questions: whether one fixed descriptor recurred across parents, whether one implementation won at matched work, whether one routing treatment participated, or whether one cross-level abstraction generalized.

Those are legitimate experiment gates, but they are not interchangeable with capability-premise closure.

The 2026-09-16 level-blindness correction makes the distinction especially important:

> A generic current-input procedure may derive a board-specific proof, conflict, topology relation, decomposition, exact answer, or search plan. The procedure must generalize; its individual outputs need not recur across unrelated levels.

Therefore every inherited negative should be classified by **what exactly stopped**.

## Stop-condition taxonomy

Use these labels when reconciling old evidence.

- **FORM-CLOSED** — the tested implementation/formulation is cleanly negative.
- **DESCRIPTOR-CLOSED** — one fixed reusable feature/signature failed recurrence, invariance, prediction, or economics.
- **CROSS-LEVEL-CLOSED** — a shared abstraction/reason did not transfer across levels; per-instance derivation may remain open.
- **PARTICIPATION-INVALID** — intended treatment did not actually execute or receive interpretable dose/work.
- **DIRTY-REVERT** — implementation disappeared without a causal experiment strong enough to close the premise.
- **POPULATION-LIMITED** — evidence ran out before premise closure.
- **ECONOMICS-CLOSED** — semantic capability exists but tested use costs more than it returns.
- **SEMANTIC-CLOSED** — evidence directly falsifies the underlying semantic premise in the tested scope.
- **OPEN-PER-INSTANCE** — a generic current-input derivation procedure remains conceptually and legally open even if reusable cross-level descriptors failed.

A historical line can carry several labels. Prefer the narrowest defensible closure.

## Reconciliation matrix

| Historical line | What old work actually established | Stop-condition reading now | Atlas gap affected | Smallest surviving question |
|---|---|---|---|---|
| Connectivity-derived learned failure certificates | Boundary/reached-set recurrence materially exceeded literal exact-state recurrence, but overwhelmingly within a single level; cross-level reason checker was stopped | **CROSS-LEVEL-CLOSED + OPEN-PER-INSTANCE**. Cross-level clause/reason reuse stays closed. A solve-local current-instance certificate/memo remains separately untested | INFERENCE + PERSISTENCE + COMMUNICATION | Can a sound certificate be matched *before* another flood fill, from cheaper monotone blocker/resource facts, often enough within one invocation to repay derivation/lookup? |
| H1 compact event-feasibility vocabulary | Frozen event relations failed to produce one compact recurring universal relation | **DESCRIPTOR-CLOSED + OPEN-PER-INSTANCE** | INFERENCE + COMPOSITION | Can a bounded current-state feasibility procedure answer a decision-bearing joint-realizability question even when each level's answer/structure is unique? |
| Open-path topology / fixed-endpoint homotopy | Fixed-endpoint coverage weak/null; controlled open-path forks later proved topology can change LIVE/DEAD fate | fixed descriptor/form partly closed; broader topology premise **earned** | REPRESENTATION + INFERENCE | What smallest sound current-input topology consequence changes pruning, equivalence, decomposition, or search action? |
| Residual-interface gadget mining / commutativity | Cross-level reusable detour motifs were sparse and mostly trivial; actual swap/commutativity test was never completed | **DESCRIPTOR-CLOSED** for generic gadget library; per-instance commutativity **unresolved** | COMPOSITION + REPRESENTATION | For two candidate excursions/obligation orders in one current state, can a bounded exact/replay query prove interchangeability or incompatibility without full search? |
| Future intersection commitments / blueprint planning | Early bundle had unsound/dirty components; later blueprint mechanism suffered option-transport nonparticipation and bundled runtime blow-up; no clean matched-work enabled A/B | **PARTICIPATION-INVALID / FORM-CLOSED**, premise unresolved | REPRESENTATION + COMPOSITION | Do LIVE/DEAD siblings with the same scalar intersection deficit differ in realizable future crossing assignments, and can a bounded current-input query expose that? |
| Arbitrary-target constrained feasibility | Generalized target-relative search merged then rapidly reverted without a causal behavioral verdict | **DIRTY-REVERT**, instrumentation premise unresolved | INFERENCE + ARCHITECTURAL | Can the smallest read-only constrained-event query answer an already-earned microscope question more cheaply than broad search? |
| Cross-attempt basin overlap / anti-redundancy | Early telemetry was invalid because identity/root-move transport broke; later controls had their own delivery failures; no clean general verdict | **PARTICIPATION-INVALID**, observer question unresolved | PERSISTENCE + COMMUNICATION + EXPOSURE | Are nominally different current actions recomputing the same states, expensive sound facts, or failure structures within one invocation? |
| Repair positional rollback / elite-prefix DFS | Broad prefix-local repair lost at shared budget and displaced a control solve | **FORM-CLOSED** for positional/prefix locality | REVISION + ACTION | Is dependency-defined causal locality substantially smaller and more stable than path-distance rollback, enough to support selective revision? |
| DEAD-core minimum relaxation | Tiny exact population showed small cores on most available DEAD states, then population exhausted | **POPULATION-LIMITED + OPEN-PER-INSTANCE** | INFERENCE + REVISION + PERSISTENCE | On the fresh sibling asset, do bounded causal cores remain small/useful even if the literal core differs on every level? |
| Exact identity / generic transposition / full MITM | Sound exact recurrence low; exact frontiers explode | **ECONOMICS-CLOSED** for naive exact identity/global MITM in tested forms | REPRESENTATION | Is there a problem-derived quotient/interface equivalence cheaper and stronger than full future-complete identity? |
| Forced-chain traversal | Historical specialized implementation positive; current 64-parent residual census finds 25.33% of measured beam parent-expansion work at one-successor states | **HEADROOM POSITIVE; capture fraction unresolved** | POWER / ACTION | Measure what share of the 25.33% oracle ceiling is actually removable while preserving transition semantics/safety; no production contraction yet. [`result`](../reports/2026-09-21-forced-work-prevalence-result-001.md) |

## The key correction: procedure generalization vs output recurrence

For a **fixed reusable descriptor**, cross-parent recurrence is evidence that the descriptor is not merely a selected-family artifact.

For a **generic current-input procedure**, the relevant generalization test is different:

1. the same procedure is applied to unseen levels/states without historical lookup;
2. its output is sound for its declared consumer;
3. its output changes a decision or avoids work often enough across independent evaluation units;
4. construction and maintenance cost are economical.

The output may be unique on every level.

This distinction should be made explicitly in every future preflight that uses recurrence as a gate.

## Reopened premise family: solve-local derivation and reuse

The strongest newly clarified family is not “learn clauses across puzzles.” It is:

> **Within one cold invocation, does the solver repeatedly pay to derive the same or stronger current-instance fact, and can a typed sound summary be reused by another branch, attempt, or stage more cheaply than re-derivation?**

This includes but is not limited to connectivity facts. Candidate fact classes are:

- residual component/reachability certificates;
- lower-bound or tiny exact subproblem answers whose dependency key is sound;
- separator/interface contracts;
- per-instance obligation-order or crossing-feasibility facts;
- topology relations;
- causal DEAD cores/conflicts.

Do **not** build a general blackboard first. Measure rediscovery and consumer value first.

## Reopened premise family: per-instance relational queries

Several historical lines reduce to the same missing operation:

> **Given the current prefix/state, answer one bounded relational question about future completion rather than search the entire remaining path.**

Examples:

- can completion still pass through target/interface X?
- can obligations A and B both be realized, in either order?
- can these two excursions commute without changing future-relevant state?
- does any valid future crossing assignment realize the remaining intersection deficit?
- can this separator side still satisfy the obligations trapped behind it?

This family is broader than H1's frozen vocabulary and narrower than “run another solver.” The query contract should be typed as `YES / NO / UNKNOWN` (or witness / proof / unknown), with bounded work and no historical lookup.

## What remains genuinely closed

This reconciliation is not a mass reopening.

Keep closed unless a materially changed premise appears:

- the exact tested H1 universal descriptor vocabulary;
- generic cross-level connectivity boundary-shape reason reuse;
- generic detour-gadget libraries from sparse cross-level motifs;
- broad positional elite-prefix repair;
- naive full-state transposition as a general cure;
- generic full MITM frontier construction in the measured regime;
- unchanged global scorer proliferation, width expansion, and retry fan-out already closed elsewhere.

## Research-control rule

When an old negative intersects a current atlas gap, record four separate statements:

1. **semantic premise:** what reasoning operation would matter if it existed?
2. **tested form:** what exact implementation/descriptor/population was evaluated?
3. **stop condition:** what fact actually caused closure?
4. **surviving route:** does a materially different per-instance, causal, or exposure formulation remain?

Never inherit “negative” as a scalar label.

## Queue relationship

This document does not reorder the live queue. It supplies premise lineage and guards against false closure. Active work should still follow `solver-optimization-workstreams.md`.

The most direct current hooks are:

- the fresh exact sibling asset can test DEAD-core size/usefulness and per-instance relational queries;
- topology/separator work can expose board-specific contracts without requiring one universal descriptor;
- cross-attempt/fact rediscovery can be measured cheaply before any shared-memory architecture;
- complete-path LNS remains an independent search-object falsifier, not a consequence of this reconciliation.
