# Hint/failure evidence cross-pollination implementation 001

> **Status:** active
> **Last evidence:** 2026-09-19 — additive cross-pollination tooling implemented on PR #1913 with production behavior and persisted hint schema unchanged.
> **Decision:** retain the derived replayability, known-live support, identity-audit, novelty/frontier, and exact-path discovery-process joins; defer persistence/schema changes until the concurrent failure-evidence producer contracts settle.
> **Remaining gate:** merge/reconcile PR #1912, then audit current compact artifacts and decide whether durable run-linked hint provenance or first-loss/all-known-basin tooling is earned.
> **Branch:** `chatgpt/hint-failure-cross-pollination-2026-09-19`.
> **Concurrency boundary:** intentionally disjoint from open PR #1912 and its active edits to
> `docs/solver-failure-evidence-research-integration-plan.md`, workflow producers, package commands,
> queue/future-work authority, and failure-response acquisition tooling.

## Purpose

Implement the first low-conflict pieces of the two-way audit between accumulated hint provenance and
the newer compact failure/search-loss evidence system.

The branch does not change production solver behavior, routing, budgets, hint persistence schema, or
the concurrent failure-integration plan. It adds derived/read-only evidence tools whose semantics can
survive either order of merge with PR #1912.

## Implemented

### 1. Derived hint-discovery replayability

`scripts/hint-discovery-replayability-lib.mjs` separates path replay from discovery-process
reconstruction.

A stored accepted Hint path remains a positive oracle. The new derived classification instead asks
how much of the historical discovery process can be reconstructed:

- `configuration-reconstructable`
- `identity-only`
- `historical-unverified`

The strongest class is intentionally weaker than search-loss capsule `replayable`: current hint
provenance lacks a complete immutable run/protocol envelope, so this helper does not claim
byte-identical whole-run replay.

`hint-query` now exposes these counts and accepts `--replay-basis=...` as a filter. The
classification is derived at query time rather than persisted into old hint records.

### 2. Search-loss × known-live hint support

`scripts/search-loss-known-support-lib.mjs` and
`scripts/search-loss-known-support.mjs` join an exact replayable search-loss prefix to canonical
stored hint paths.

For each reconstructable prefix the tool records:

- whether at least one stored accepted path shares the prefix;
- number of supporting stored hints;
- number/set of observed next steps;
- number/counts of distinct known structural solution families using the canonical `structuralSolutionFamilySignature` plus level-specific `mustCrossKeysOf`;
- terminal support;
- minimum/maximum remaining path length;
- a bounded preview of matching hint indices.

The semantic asymmetry is explicit:

- `PRESENT` is sound one-sided positive evidence that the prefix has a known accepted continuation;
- `NOT_OBSERVED` is **not** DEAD/UNSAT and is not evidence that all solution basins are extinct.

This is the first executable bridge toward the earlier all-known-basins/known-live-prefix research
idea without creating a new causal label or pretending the sampled hint atlas is complete. The CLI
runs through `scripts/run-bundled.mjs` so the structural-family calculation reuses the TypeScript
canonical helpers rather than duplicating them in plain Node.

### 3. Compact failure identity-granularity audit

`scripts/failure-response-identity-audit-lib.mjs` and
`scripts/failure-response-identity-audit.mjs` port the useful cross-hint identity-collision audit
pattern to compact failure responses.

The audit groups observations by the available run/protocol/solver/parent/cell/action/stage/config
identity and distinguishes:

- exact repeated payloads;
- repeated keys with conflicting compact payloads.

A conflicting key is an investigation lead for duplicate capture or under-resolved identity, not an
automatic corruption verdict. The tool does not change the compact failure schema.

### 4. Failure-information novelty and historical evidence frontier

`scripts/failure-response-novelty-lib.mjs` and `scripts/failure-response-novelty.mjs` add
parent-level longitudinal novelty accounting across explicitly ordered compact failure-response
documents.

The phenotype signature includes categorical outcome, action/stage/config identity, reach/
participation/censoring state, and categorical attempt sequence. It deliberately excludes exact
parent identity, run/protocol/solver identity, work/nodes/badness magnitudes, and timestamps. This
prevents a different dose or rerun from manufacturing a new mechanism phenotype.

The analyzer reports cumulative distinct phenotype count and per-document marginal novelty. Its
frontier mode asks, retrospectively, which target-document phenotypes were already visible before
that evidence frontier. The result is explicitly process-improvement evidence only: earlier
categorical visibility does not prove that a later causal conclusion was already justified.

### 5. Exact-path pre-success discovery-process reconstruction

`scripts/hint-discovery-process-lib.mjs` and `scripts/hint-discovery-process.mjs` import one of
the strongest ideas from compact failure evidence back into hint research without changing the hint
schema.

For solver result rows that retain both the exact winning `solution` and the invocation's
`attempts[]`, the join binds a stored hint only when the complete solution path is exactly equal.
It then exposes:

- the winning attempt index;
- every failed/unsuccessful compact attempt before the winner;
- the compact winning attempt;
- cumulative work/nodes/time when available;
- whether the row lacks a reconstructable winning-attempt sequence.

Attempts after the first winner are excluded from the discovery process. Rows without an exact stored
hint match remain unmatched; no heuristic level/config/path inference is attempted.

This gives hint research access to "what failed before this path was found" now, while leaving a
future stable run/protocol reference as a separate persistence decision.

## Test integration

Focused standalone node tests accompany each new helper.

To avoid conflicting with PR #1912's current `package.json` changes, coverage for the two
cross-system helpers is also folded into existing aggregate entrypoints already exercised by
`test:node`:

- `scripts/hint-query-lib-node-test.mjs`;
- `scripts/solver-search-loss-evidence-lib-node-test.mjs`;
- `scripts/solver-failure-response-lib-node-test.mjs`.

No package-script edit is required on this branch.

## Deliberately deferred

The larger cross-pollination ideas remain useful but should be reconciled against merged #1912/current
authority before implementation:

1. all-known-basin first-loss/autopsy rather than positive-prefix support only; current tooling can
   count known structural families behind a prefix but cannot prove the latent solution space is
   exhausted;
2. a durable stable join from successful hint provenance to an immutable originating run/protocol
   envelope; the exact-path process join is deliberately derived from result artifacts instead;
3. richer hint-discovery process identity with immutable run/protocol/configuration references if
   current evidence shows enough value to justify a persistence migration;
4. failure-evidence purpose/applicability/dependency-stratum semantics where current Resource Contract
   machinery does not already provide them;
5. current-data identity/novelty/frontier audits after PR #1912's producer-identity propagation is
   merged, so the analysis uses the final current compact artifacts rather than a moving branch;
6. any producer/profile-specific novelty attribution that cannot be answered cleanly from the ordered
   document-level analyzer after the merged evidence corpus is inspected.

Those items should not be forced into this PR merely to make it larger. The present slice creates the
lowest-risk executable seams needed by later work.
