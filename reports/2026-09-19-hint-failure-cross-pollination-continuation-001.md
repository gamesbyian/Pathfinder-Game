# Hint/failure evidence cross-pollination continuation 001

> **Status:** active
> **Last evidence:** 2026-09-19 — PRs #1912/#1913 reconciled into main, followed by purpose-aware failure semantics, canonical hint termination semantics, run-linked discovery-process evidence, known-support extinction projection, and harvest-selection provenance on this continuation branch.
> **Decision:** keep success provenance, discovery-process evidence, harvest-selection provenance, compact failure response, and rich search-loss observations as sibling evidence layers joined by canonical path/parent/run/protocol identities; do not expand the persisted Hint schema with a duplicated experiment envelope.
> **Remaining gate:** validate/merge this implementation, then wait for a genuine post-contract compact-response population or an explicitly selected first-loss study before making current prevalence/causal claims from the new joins.

## Reconciliation

Open-PR reconciliation happened before this branch:

- #1912 was repaired at its actual CI boundary: the frozen Class-3 expectation JSON was referenced by authority but omitted from fast-CI sparse checkout. The artifact was added to both sparse-checkout paths; deep verification, evidence-integrity guard and the substantive fast gate cleared; #1912 was squash-merged.
- #1913's report-authority metadata was repaired, its CI passed, and it was squash-merged after #1912.
- #1914 was compared directly with #1912 and closed as superseded. Its Class-3/reserve-starvation/closeout intent was already implemented more completely in #1912; merging both would have created competing scripts, commands, artifact shapes and authority edits.

Continuation starts from merged main `162ce658b701ff6b9daecf37a5b2412017f3869c`.

## Implemented continuation

### 1. Query-dependent compact failure evidence semantics

`scripts/failure-evidence-semantics-lib.mjs` gives compact failure records the same useful epistemic discipline learned from hint provenance without creating a causal failure taxonomy.

Purposes:

- `forensic`;
- `mechanism-nomination`;
- `longitudinal-process`;
- `population-prevalence`.

Applicability is `admissible`, `context-bound`, or `inadmissible`. Longitudinal use requires an explicit comparable protocol/solver regime. Population prevalence requires an explicit sampling declaration plus complete population coverage. Harness/malformed observations cannot masquerade as mechanism evidence.

`failureEvidenceDependencyStratum()` conservatively collapses repeated records/runs to the parent level. Raw row count therefore cannot silently become independent support.

`scripts/failure-evidence-purpose-query.mjs` exposes the contract without changing the older compact-response reducer.

### 2. Canonical derived hint termination/censoring semantics

`scripts/hint-termination-semantics-lib.mjs` maps historical free-form hint termination strings into:

- solved;
- complete enumeration;
- node-limited;
- work-limited;
- deadline-truncated;
- error;
- unknown.

The mapping deliberately does **not** call historical `exhaustive` a negative exhaustion. It remains successful completed-enumeration process evidence.

`hint-query` now reports and filters these derived classes without rewriting historical hint records.

### 3. Run-linked discovery-process evidence without Hint-schema expansion

The existing exact-path discovery-process join now has a sibling evidence envelope in
`scripts/hint-discovery-process-evidence-lib.mjs`.

When a decision-grade experiment contract and run ID are supplied, the document carries one bounded run identity projection:

- run ID;
- contract reference;
- workflow/producer/entrypoint;
- configuration/protocol hash;
- immutable solver ref;
- population identity and independent unit;
- level-blind/history-aware/scheduler semantics;
- research block when declared.

Per-path records retain exact parent/path binding plus the attempt sequence through the first winner. The full experiment contract remains authoritative. It is not copied into every Hint or every row.

This makes “repair found this path” distinguishable from “repair found this path after DFS and beam failed,” while preserving exact-path fail-closed binding.

### 4. Existing all-known-support machinery made joinable

A deeper audit corrected an earlier premise from this session: Pathfinder's
`KnownSolutionPrefixSurvivalObserver` already asks where the **final known support** disappears and already tracks structural-family counts. Building a second first-loss observer would duplicate authority.

`scripts/known-support-extinction.mjs` therefore projects that existing observation into compact parent-level rows containing:

- last known-support stage/depth/work;
- supported paths/families immediately before extinction;
- first/final known-support loss;
- final loss cause;
- work after final known support;
- solved-control and observer-parity status.

The artifact repeats the existing epistemic boundary: zero **known** support does not establish whole-solution-space extinction, DEAD/UNSAT, or a causal first-loss class.

### 5. Hint-harvest selection provenance

`scripts/hint-harvest-selection-manifest-lib.mjs` defines a compact selection manifest for the funnel by which already-solved level-blind report rows become persisted hint/provenance evidence.

The real `harvest-level-blind-report-hints.mjs` now records:

- eligible source reports and source rows seen;
- solved candidate rows seen;
- referee-accepted rows;
- rows that actually changed path/provenance persistence;
- accepted rows whose evidence was already represented;
- weighted quarantined rows and reasons.

The denominator is explicitly **success-selected candidate rows**, not attempted solver population. The manifest cannot establish solve rate or relative technique performance.

`harvest-solver-evidence.yml` persists these manifests under
`reports/stress/hint-harvest-selection/`. Its change gate now uses path-scoped
`git status --porcelain`, rather than `git diff --quiet`, so a brand-new untracked sidecar cannot be silently lost when no Hint file itself changes. That also hardens existing pending/experiment-evidence sidecars.

## Research topology

The structured research-asset registry now contains:

- `hint-discovery-process`;
- `hint-harvest-selection-provenance`;
- purpose-aware compact-failure query entrypoints;
- known-support-extinction as a query surface of known-solution-prefix survival;
- explicit relationships from hint provenance to discovery process and harvest selection.

The human topology guide and evaluation-evidence authority now describe the same boundaries.

## What this closes from the original bidirectional audit

The practical transfers now implemented are:

1. hint-style query-dependent applicability and dependence accounting on compact failure evidence;
2. failure-style censoring semantics on hint provenance, derived rather than migrated;
3. immutable run/protocol/population context for successful discovery processes without duplicating the experiment contract inside Hint;
4. pre-success failed-attempt history for exact stored-path discoveries;
5. harvest/selection denominators around research hint collection;
6. known-live structural-family support joins and compact final-known-support extinction;
7. failure identity-collision auditing;
8. parent-level failure novelty/saturation;
9. retrospective “what was knowable when?” phenotype-frontier audits;
10. explicit discovery-process replayability separate from path replayability.

The result is a joinable success/failure evidence model rather than one provenance mega-schema.

## Remaining evidence-gated work

No implementation should manufacture the following merely to complete a checklist:

- **Current-data identity/novelty/frontier conclusions:** #1912 established that a legitimate accumulated post-contract ordinary compact-response population did not yet exist. Run these audits when real compatible evidence exists.
- **Causal first-loss classification:** known-support extinction and selected search-loss observations nominate a first-loss study; they do not replace one. Execute only when the queue explicitly selects it.
- **Whole-solution-space extinction:** stored hints are sampled positive oracles. Even multiple known structural families reaching zero support cannot establish that every true solution is gone.
- **Persistent Hint run-envelope migration:** the sibling discovery-process resource now supplies the useful run linkage without duplicating experiment-contract semantics. Reopen a Hint-schema migration only if a concrete consumer cannot be served by the sibling join.
- **Recurring rich search-loss promotion:** still waits for a genuine recurring producer/consumer population under the existing Resource Contract gate.

Those are scientific/evidence gates, not unfinished ordinary implementation.
