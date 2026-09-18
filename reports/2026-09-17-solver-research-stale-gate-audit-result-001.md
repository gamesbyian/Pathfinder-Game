# Solver research stale-gate / reopen audit result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — current `main` after research-integration PRs #1864 and #1865, reconciled against all 27 machine-readable research questions plus the live workstream/future-work authorities.
> **Decision:** four authority drifts were confirmed and repaired: DEAD-core remained falsely population-limited after its fresh matched retest; the topology-descriptor question remained falsely active after F3; the old fixed-endpoint homotopy reopen clause remained live after its semantic successor had already produced controlled same-endpoint topology evidence; and WS6 dependency-conditioned repair was machine-readable but absent from live deferred-work prose. A conservative reusable question-authority audit is now added.
> **Remaining gate:** none for this audit. Future semantic reopen decisions remain human/research judgments; the new tooling hard-fails structural/reference inconsistencies and only warns on discoverability/gate-shape issues.

## What was checked

The pass reviewed every entry in `docs/solver-research-question-relations.json` against:

- its own `state`, `answeredBy`, `constrainedBy`, and `reopensOn` fields;
- later dated evidence that could have satisfied its stated prerequisite;
- `docs/solver-optimization-workstreams.md`;
- `docs/solver-future-work.md`;
- the post-#1864/#1865 research-integration tooling and current queue.

The standard was deliberately asymmetric: later evidence may satisfy a prerequisite, but a keyword/tool match alone cannot reopen a scientific question.

## Confirmed drift 1 — DEAD-core size-1

### Before

`WS2-DEAD-CORE-RELAXATION` was still `deferred-reopen` on the original four-state B2 pilot, with a reopen condition requiring a fresh larger exact-labelled DEAD population.

### What happened later

That prerequisite did occur. The production-search multi-pick program produced a matched real-beam frontier with 23 exact-DEAD and 2 exact-LIVE siblings on `R03147`. The follow-up ran 215 single-commitment relaxation queries with zero flips and zero correctness alarms.

### Reconciliation

The question now records the size-1 form as `closed-tested-form`: clean negative on the strongest available matched population. A size-2 form is not automatically next; it reopens only from evidence specifically justifying the much larger query cost or a materially different core family.

## Confirmed drift 2 — open-path topology descriptor

### Before

`WS2-OPEN-PATH-TOPOLOGY-DESCRIPTOR` remained `active-diagnostic` with no `answeredBy` evidence, describing the post-topology microscope as not yet run.

### What happened later

Lane F3 did run that microscope and expanded it:

- cheap closest-approach side descriptor: 8/8 on untied rows;
- expanded population: 14 pairs / 7 parents;
- every decision-relevant discordant decisive-puncture row is tied;
- tied-case descriptor agreement: 7/9, informative but not sound;
- local tie refinement does not fix the failure mode.

### Reconciliation

The question is now `mixed`, with the F3 reports as evidence. The sound cheap subset currently has zero decision-bearing coverage, while the full topology observer remains research-only. Reopen now requires either sound compact decision-bearing coverage on fresh independent parents or a bounded sound per-instance topology consequence with measured cost.

## Confirmed drift 3 — fixed-endpoint homotopy reopen clause

### Before

`WS2-HOMOTOPY-COMPLETION-CLASSES` correctly recorded its original natural population as coverage-null, but still said to reopen whenever a same-level/same-start/same-endpoint exact LIVE/DEAD population appeared.

### What happened later

The controlled topology-fork program deliberately created exact-labelled same-board/same-endpoint contrasts and established genuine topological completion-feasibility differences through the more defensible open-path formulation. That successor then produced its own F3 microscope.

### Reconciliation

The original fixed-endpoint census remains closed in its tested form. Its old population-trigger reopen clause is cleared because rerunning that historical census would duplicate a semantic question already carried forward and answered more directly by `WS2-OPEN-PATH-TOPOLOGY-SIGNATURE` and F3. The successor is recorded as calibration rather than pretending the original natural-population experiment itself became positive.

## Confirmed drift 4 — WS6 discoverability

`WS6-DEPENDENCY-CONDITIONED-REPAIR` was correctly machine-readable and correctly deferred, but no id or alias appeared in either live workstream/future-work authority. That made it easy for future sessions to rediscover or overlook.

The future-work table now carries the deferred dependency-conditioned repair neighborhood explicitly, and the question has stable aliases for cross-authority discovery.

## Reusable audit

Added:

- `scripts/research-question-authority-audit-lib.mjs`;
- `scripts/research-question-authority-audit.mjs`;
- ordinary Node-test coverage;
- `npm run research:question-authority-audit`.

The audit:

- validates the existing question-relation graph;
- hard-fails missing `docs/`, `reports/`, or `scripts/` evidence references;
- hard-fails a `deferred-reopen` question with no reopen condition;
- warns when an active question still carries a deferred-style reopen condition;
- warns when an active/deferred question cannot be found in either current workstream or future-work authority by id/alias.

It **does not** parse prose and declare a reopen condition satisfied. That remains a scientific judgment, as this audit itself demonstrates.

## Current authority state after repair

The 27-question registry now has:

- one `active-diagnostic` question: D1 production-inert observation;
- six `deferred-reopen` questions;
- two `mixed` questions;
- fourteen `closed-tested-form` questions;
- one `closed-negative`;
- three `concluded-positive`.

The live/deferred discoverability scan produces zero warnings after the WS6 repair.

## Queue consequence

No new broad solver mechanism is opened by this audit.

The active execution order remains D1 production-inert observation. Lane A is contract-falsifier ready but awaits the frozen exact-labelled interface population. F3 is no longer accidentally represented as an unrun active microscope. DEAD-core size-1 is no longer accidentally represented as population-limited. This is exactly the intended role of the integration layer: prevent already-earned evidence from silently falling out of the live research state.
