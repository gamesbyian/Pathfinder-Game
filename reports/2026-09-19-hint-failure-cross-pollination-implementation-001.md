# Hint/failure evidence cross-pollination implementation 001

> **Status:** partial implementation; additive tooling only.
> **Date:** 2026-09-19.
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
- terminal support;
- minimum/maximum remaining path length;
- a bounded preview of matching hint indices.

The semantic asymmetry is explicit:

- `PRESENT` is sound one-sided positive evidence that the prefix has a known accepted continuation;
- `NOT_OBSERVED` is **not** DEAD/UNSAT and is not evidence that all solution basins are extinct.

This is the first executable bridge toward the earlier all-known-basins/known-live-prefix research
idea without creating a new causal label or pretending the sampled hint atlas is complete.

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

1. all-known-basin first-loss/autopsy rather than exact-prefix support only;
2. structural-basin rather than exact-path support grouping;
3. marginal failure-information novelty/saturation by producer/profile/revision;
4. historical "what was knowable when?" research-process audits;
5. stable join from a successful hint discovery to its originating compact attempt family/run
   envelope, preserving pre-success failures without bloating each hint event;
6. richer hint-discovery process identity with immutable run/protocol/configuration references;
7. failure-evidence purpose/applicability/dependency-stratum semantics where current Resource Contract
   machinery does not already provide them;
8. current-data audits using the new identity tool once PR #1912's latest compact producer identity
   propagation is merged.

Those items should not be forced into this PR merely to make it larger. The present slice creates the
lowest-risk executable seams needed by later work.
