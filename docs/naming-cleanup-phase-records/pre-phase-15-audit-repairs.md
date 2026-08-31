# Pre-Phase-15 audit repairs after Phases 1-14

> **Status:** implementation on a dedicated post-closeout repair branch; Phase 15 remains unstarted.
>
> **Base main:** `9d065e42b43a23381ecc40949fb996bc2a03da2b` (merge of PR #1635).
>
> **Branch:** `chatgpt/pre-phase15-audit-repairs-2026-08-31`.
>
> **PR:** pending at record creation.
>
> **Scope:** confirmed Phase-1-14 research-continuity/current-authority defects found by the 2026-08-31 forensic audit. No NC-P15 row is implemented here.

## Why this repair exists

Two independent post-closeout reviews converged on a healthy runtime/application migration but a weaker historical-evidence/current-authority boundary. A deeper follow-through then confirmed three current research consumers could fail to treat pre-rename and canonical evidence as one identity:

1. `scripts/analyze-technique-census.mjs` canonicalized census technique keys but looked up frozen production `winningConfig` values raw.
2. `scripts/family-boundary-lib.mjs` grouped/compared persisted `winningConfig` and `configKey` values raw while the current variant-research contract explicitly reuses historical family data.
3. `research-status-index` performed literal substring search, so a canonical stage query could miss a frozen report written only with the historical stage vocabulary.

The same audit also confirmed that the primary naming route still described Phase 8 as active, and that `docs/solver-architecture.md` incorrectly said race pools require the legacy scheduler.

## Change envelope

This repair may:

- canonicalize historical attempt/action identity at current analysis read boundaries;
- expose search-equivalence terms from the owning stage/routing normalizers;
- strengthen the solver-research resumption smoke with representative mixed-era composite identities;
- repair current naming-agent/document routing;
- add a semantic current-authority guard;
- correct current solver documentation;
- record the repair and its evidence.

This repair must not:

- implement NC-P15-001 through NC-P15-007;
- rewrite frozen historical reports/artifacts;
- change solver policy, budgets, scoring, attempt order, mechanics, or Firestore identity;
- invent compatibility readers for Phase-15 rows.

## Implemented repairs

### Mixed-era technique-census join

`analyze-technique-census.mjs` now normalizes the frozen production `winningConfig` before querying its canonical `byTechnique` index. Its regression fixture deliberately pairs a real historical compact form (`beam:perimeterSweep/perimeterCW@beam2000`) with the equivalent structured current identity.

Historical provenance remains historical in output; only the comparison key is canonicalized.

### Mixed-era family config joins

`family-boundary-lib.mjs` now routes existing row/attempt config strings through `normalizeAttemptIdentityKey()` before grouping or comparing them. Unknown synthetic/forward values remain readable via the existing safe raw fallback instead of crashing read-only analysis.

The regression fixture proves a historical compact parent attempt and canonical sibling winner are recognized as the same action.

### Research-status discovery across renamed stages/routing regimes

The owning stage/routing normalizer modules now expose identity-equivalence terms derived directly from their private compatibility maps. `research-status-index` consumes those functions rather than maintaining a second rename table.

A canonical `early-repair-search` or `main-search` query therefore finds a legacy report whose headings contain only `repair-probe` / `main-loop`.

### Composite action identity

`modules/solver/attempt-identity.mjs` now owns `normalizeAttemptActionKey()`, which canonicalizes the stage and attempt portions of persisted compound keys such as historical `main-loop|beam:...` and `repair-probe|dfs:repair:repair|seedSalt=0`.

The resumption smoke covers both shapes and its success message is narrowed to the sampled guarantees it actually executes.

### Current authority repair

`AGENTS.md` now starts from `npm run naming:status` and follows the next phase returned by that machine state. While Phase 15 is pending it points to `phase-15-preparation.md`.

`docs/README.md` labels the Phase-8 record as completed implementation evidence and lists the Phase-15 preparation authority.

`scripts/check-naming-current-authorities.mjs`, enrolled in `check:validators`, prevents the completed Phase-8 route from silently becoming current again and requires the Phase-15 preparation route while the ledger says Phase 15 is next.

### Solver architecture correction

The portfolio/race-pool documentation now matches the live CLI: race pools require `--scheduler-mode=production`; the legacy latency scheduler has no race-pool implementation.

## Explicitly not expanded in this repair

The audit also identified a derived `repairLateProbe` / `REPAIR_LATE_PROBE` vocabulary family around the canonical `late-repair-search` stage. That family spans feature/config, budget, CLI, and workflow-input surfaces and is not a demonstrated behavior defect. It is therefore recorded for final semantic review rather than opportunistically mass-renamed inside this bounded evidence repair. Any later rename must first classify persisted/external compatibility and workflow-dispatch semantics.

## Validation gate

Before merge, this branch should pass at minimum:

- `npm run test:analyze-technique-census`;
- `npm run test:family-boundary`;
- `npm run test:research-index`;
- `npm run test:solver-research-resumption`;
- `npm run check:naming-current-authorities`;
- `npm run check:naming-cleanup-ledger`;
- `npm run check:documentation-links`;
- ordinary exact-head CI.

Phase 15 remains pending after this repair. Its implementation must start from the repaired merged `main`.
