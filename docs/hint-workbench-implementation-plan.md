# Hint Workbench Implementation Plan

## Purpose

This plan tracks the work required to turn the current hint workbench prototype into the unified,
auditable hint-generation/diversification tool originally proposed. It includes work already completed
in the prototype and the remaining work needed to cover the practical cross-product of known methods
without attempting infeasible exhaustive Cartesian products by default.

The desired end state is a shared pipeline:

```text
candidate generators -> validation -> exact dedupe -> acceptance policy -> report/write layer
```

The tool should let callers combine enumeration, anchored completion, solver ablation, reverse solving,
portal-exit forcing, and evidence-bounded combined forcing while preserving provenance and producing
safe, reviewable reports.

## Design principles

1. **Read-only by default.** No level or hint artifact is changed unless the caller explicitly passes a
   write flag.
2. **One acceptance pipeline.** Candidate generators should not each implement their own validation,
   duplicate handling, novelty scoring, write logic, or reporting format.
3. **Rich provenance.** Every generated candidate should retain enough metadata to explain which
   generator, axis values, solver profile/template, ablation settings, seed, and/or prefix produced it.
4. **Evidence-bounded cross-product.** Expensive combined portal/gate forcing should use evidence from
   real known/generated paths to bound feasible combinations unless the caller explicitly requests a
   dangerous exhaustive mode.
5. **Preserve existing tools.** Current scripts should continue to work, but shared internals should be
   factored out so new behavior does not fork logic.
6. **Deterministic batch runs.** Given the same level data, preset, seed, and budgets, the tool should
   produce stable reports independent of level scheduling or parallelism.


## Fresh-coder context

A future coder should be able to continue from this document without this conversation. The current
repository state has three relevant classes of tools:

1. **Enumeration generators**
   - `modules/solver/hint-enumeration.ts` contains the shared DFS primitives:
     `completeFromState()`, `enumerateFromGate()`, and `anchoredFromSeed()`.
   - `modules/solver/variety-search.ts` wraps those primitives for in-editor targeted search and
     complete search.
   - `scripts/hint-corpus-expand.mjs` is the batch corpus-expansion script that uses Systems A/B and
     `decideCandidateAcceptance()`.
2. **Ablation/diversification generators**
   - `modules/solver/diversification.ts` is the browser-safe subset used by the current workbench
     `ablation-ui` preset. It intentionally omits reverse and combined phases.
   - `scripts/hint-diversification.mjs` is the richer standalone CLI containing reverse solving,
     portal-exit forcing, evidence-bounded combined forcing, and combined-only support. This is the
     logic that must be modularized before the workbench can honestly claim full practical coverage.
3. **Acceptance, validation, and display selection**
   - `modules/domain/path-validator.ts` is the play-referee validation path used to confirm a candidate
     is a legal solution.
   - `modules/domain/hint-novelty.ts` contains `decideCandidateAcceptance()` and the novelty/coverage
     scoring policy used by batch discovery.
   - `modules/domain/hint-selection.ts` contains `selectDisplayHints()`, the player-facing display
     curation layer. Display curation is not the same as candidate generation or corpus acceptance.

The current prototype added:

- `scripts/hint-workbench.mjs` — a thin orchestration CLI.
- `npm run hints:workbench` — a package script that runs the workbench through
  `scripts/run-bundled.mjs`.
- this plan document.

## Scope and non-goals

### In scope

- A CLI-oriented workbench for discovering, auditing, and optionally appending hint candidates.
- Shared generator adapters for enumeration, anchored completion, browser-safe ablation, and full
  ablation once modularized.
- A single candidate validation/deduplication/acceptance/reporting pipeline.
- Safe defaults suitable for repository data: read-only unless explicitly writing.
- Deterministic reports suitable for comparing runs.

### Out of scope unless explicitly requested later

- Changing player-facing hint display behavior. That remains owned by `selectDisplayHints()`.
- Changing solver correctness rules or level mechanics. Candidate paths must continue to be validated by
  the existing play referee.
- Making dangerous full Cartesian products the default. Full products may be exposed only behind explicit
  opt-in flags with finite budgets.
- Replacing existing scripts in one large rewrite. Existing scripts should be preserved and migrated to
  shared internals incrementally.

## Baseline commands for future work

Use these commands while evolving the workbench:

```bash
# Fast smoke: read-only, small budget, should write only the report path.
npm run hints:workbench -- --levels=1 --preset=enumerate-targeted --policy=audit-only --restarts=1 --node-budget=100 --wall-ms=1000 --max-accepted=1 --output=tmp/hint-workbench-smoke.json

# Lint touched JS/MJS/TS files.
npm run check:lint -- scripts/hint-workbench.mjs scripts/hint-diversification.mjs

# Verify package script entrypoints after package.json changes.
npm run check:dead-scripts

# After any write-capable hint-corpus run, regenerate derived artifacts and validate hints.
npm run levels:generate-heatmaps
npm run check:hint-validity
npm run test:hint-path-oracle
```

Any future implementation PR should document which of these were run and why any were skipped.

## Current prototype limitations to keep in mind

- `audit-only` currently means “do not accept/write” rather than “evaluate what would happen under a
  selected policy.” Component 6 fixes that.
- `all-practical` currently does not include the full practical ablation phases. Component 2 should
  rename it or Component 4/5 should make it accurate.
- Provenance from the current workbench is shallow. Component 3 must preserve axis-level provenance.
- Reports are not schema-versioned. Component 7 fixes that.
- Complete enumeration is not sharded or parallelized. Component 8 fixes that.

## Component 1 — Current thin workbench CLI

**Status: Complete.**

### What has been done

- Added `scripts/hint-workbench.mjs` as a CLI entry point.
- Added `npm run hints:workbench` in `package.json`.
- Added level selection parsing for `all`, comma lists, and numeric ranges.
- Added read-only default behavior with optional `--write-levels`.
- Added atomic JSON report writing.
- Added presets:
  - `enumerate-targeted`
  - `enumerate-complete`
  - `ablation-ui`
  - `all-practical`
- Wired enumeration through `Solver.createVarietySearch()`.
- Wired browser-safe ablation through `createDiversificationSession()`.
- Added acceptance policies:
  - `save-all`
  - `novelty-gated`
  - `audit-only`
- Added basic report fields for per-level runs, produced counts, accepted counts, rejection counts,
  accepted paths, and accepted metadata.

### Invariants when satisfied

- Running `npm run hints:workbench -- --levels=1 --policy=audit-only` must not modify `data/levels.json`
  or `data/hints/**`.
- The npm script must resolve to the workbench entry point through the bundled solver runner.
- Unknown presets or policies must fail fast with a clear error.
- A successful run must always write a JSON report to `--output`.
- `--write-levels` must be the only path that persists accepted candidates into hint artifacts.

## Component 2 — Rename or clarify current presets

**Status: Complete.**

### Rationale

The current `all-practical` preset name overpromises. It currently runs targeted enumeration,
browser-safe ablation, and targeted enumeration again, but it does not include full reverse-solving or
combined portal/gate forcing. That is useful, but not the broad practical cross-product implied by the
name.

### What has been done

- Renamed the default practical prototype preset to `ui-plus`, which accurately describes targeted
  enumeration plus browser-safe UI ablation.
- Kept `all-practical` as a deprecated alias for backwards compatibility and print a warning when it is
  used.
- Added `--help` preset descriptions that list every preset and its expanded step sequence.
- Added a top-level `preset` report object recording the requested preset, resolved preset, description,
  and expanded steps.

### Tasks

1. [x] Rename current `all-practical` to a more accurate name such as `ui-plus` or `enumerate-and-ui-ablate`,
   or update the implementation so the name becomes accurate after Components 4 and 5 are complete.
2. [x] Add help text or documented preset descriptions.
3. [x] Preserve backwards compatibility if the old name remains accepted:
   - either treat it as an alias with a warning, or
   - keep it but document exactly what it does.

### Invariants when satisfied

- Preset names must describe the actual generators and axes used.
- No preset may imply full ablation/reversal/combined coverage unless it actually includes those axes.
- Reports must record the expanded step list for every preset so users can audit what ran.

## Component 3 — Candidate stream abstraction

**Status: Complete.**

### Rationale

The workbench currently consumes ad hoc arrays returned by enumeration or ablation wrappers. A shared
candidate stream abstraction will make all generators plug into one validation/reporting path.

### What has been done

- Added `modules/solver/hint-candidate-events.ts` with `HintCandidateEvent`,
  `HintCandidateProvenance`, and `makeCandidateEvents()` to normalize generator output into candidate
  events with `path`, `generator`, `sequence`, `provenance`, and `diagnostics` fields.
- Updated targeted/complete enumeration and browser-safe ablation wrappers to emit candidate events
  instead of ad hoc `{ path, provenance }` objects.
- Added level number, mode/budget/seed fields, and ablation budget fields to provenance so accepted
  candidates can be traced back to the generator settings that produced them.
- Updated the acceptance pipeline to consume candidate events without branching on generator type and
  to preserve generator, sequence, provenance, and diagnostics in accepted metadata.

### Tasks

1. [x] Define a candidate event shape, for example:

   ```ts
   interface HintCandidateEvent {
     path: number[];
     provenance: HintCandidateProvenance;
     generator: string;
     sequence: number;
     exhausted?: boolean;
     diagnostics?: Record<string, unknown>;
   }
   ```

2. [x] Define a provenance schema that can represent:
   - generator kind;
   - level number;
   - gate key;
   - first-step key;
   - portal destination key;
   - portal exit key;
   - forward vs reverse direction;
   - flipper variant;
   - disabled templates/profiles/features;
   - seed hint index;
   - anchor depth;
   - RNG seed/restart index;
   - budget/cancel/exhaustion state.
3. [x] Make enumeration and browser-safe ablation wrappers emit this shared shape.
4. [x] Ensure generator adapters never validate, accept, reject, or write candidates directly.

### Invariants when satisfied

- Every candidate entering the acceptance pipeline must have a non-empty provenance object.
- The acceptance pipeline must not need to know which generator produced a candidate to validate,
  dedupe, score, accept, reject, report, or write it.
- Reported candidates must be traceable back to a generator and axis values without reading logs.

## Component 4 — Modularize full ablation/diversification phases

**Status: Not started.**

### Rationale

The richest solver-ablation logic lives in `scripts/hint-diversification.mjs`, but it is currently a
standalone script rather than a reusable generator. The workbench only uses the browser-safe
`createDiversificationSession()` subset, which intentionally excludes expensive phases.

### Tasks

1. Extract the full diversification phase engine from `scripts/hint-diversification.mjs` into a reusable
   module, for example `modules/solver/hint-ablation-generator.ts` or `scripts/hint-ablation-engine.mjs`.
2. Preserve the existing `scripts/hint-diversification.mjs` CLI behavior by making it call the extracted
   engine.
3. Expose generator options for:
   - baseline;
   - gate × first-step forcing;
   - cascade profile/template disables;
   - strategy-flag disables;
   - gate/goal swap reversal;
   - forward portal-exit forcing;
   - reverse portal-exit forcing;
   - evidence-bounded combined first-step + portal-exit forcing;
   - reverse combined forcing;
   - flipper-axis variants for reversed solving.
4. Make full ablation emit shared candidate events from Component 3.
5. Add workbench presets:
   - `ablation-full`
   - `ablation-combined-only`
   - `ablation-reverse-only` if useful for targeted debugging.

### Invariants when satisfied

- `scripts/hint-diversification.mjs` and `scripts/hint-workbench.mjs` must not maintain separate copies
  of full ablation phase logic.
- Full ablation candidates emitted through the workbench must match the candidates emitted by the legacy
  script for the same levels, seed, budgets, and phase selection, modulo report formatting.
- Reverse-solving candidates must always be validated against the original forward level before being
  accepted or written.
- Evidence-bounded combined phases must only try jointly proven `(gate, first step, portal destination)`
  triples unless an explicit exhaustive option is passed.

## Component 5 — Declarative axis planner

**Status: Partially complete.**

### Rationale

The workbench currently has hard-coded preset arrays. It needs a declarative planner so users can ask
for specific axes and so reports can explain what portion of the practical cross-product was attempted.

### What has been done

- Added a resolved `axisPlan` report object with source, preset, include axes, directions, portal/combined
  settings, flipper/strategy/cascade settings, and expanded steps.
- Added limited `--include=enumeration,complete-enumeration,ablation` overrides for the currently available
  generators.
- Added fail-fast validation for unsupported reverse directions and combined forcing until Components 4/5
  expose those generators safely.

### Tasks

1. Introduce axis options such as:
   - `--include=enumeration,anchored,ablation,portal,combined`
   - `--directions=forward,reverse`
   - `--portal-dests=evidence,all`
   - `--combined=evidence,full,off`
   - `--flipper-variants=auto,on,off`
   - `--strategy-flags=all,none,<list>`
   - `--cascade=on,off`
2. [x] Translate presets into explicit axis plans.
3. [x] Record the resolved axis plan in every report.
4. [x] Add safety warnings or hard errors for dangerous combinations such as full combined portal/gate
   Cartesian products without a wall-clock or candidate cap.

### Invariants when satisfied

- Every preset must expand to a concrete, serializable axis plan.
- The report must contain the exact axis plan used for the run.
- Dangerous full-cross-product options must require explicit opt-in and finite budgets.
- Evidence-bounded modes must document which evidence set was used: existing hints only, existing plus
  newly generated, or an externally supplied hint set.

## Component 6 — Acceptance policy audit modes

**Status: Partially complete.**

### What has been done

- The prototype has three policy names: `save-all`, `novelty-gated`, and `audit-only`.
- `novelty-gated` uses `decideCandidateAcceptance()`.
- `save-all` accepts valid exact-deduped candidates.
- `audit-only` now evaluates candidates with `--audit-policy=novelty-gated` by default, or
  `--audit-policy=save-all`, while keeping accepted write paths empty.
- Policy evaluation is split into `evaluatePolicy()`, and audit mode suppresses level writes even if
  `--write-levels` is accidentally passed.
- Audit reports include `wouldAcceptPaths` and mark accepted metadata entries with `auditOnly: true`.
- Added `--policy-report=summary,full,rejections-only` for optional per-candidate policy reports.
- Rejection counts now distinguish `exact-duplicate` from `canonical-duplicate`, and full policy
  reports include invalid-path reasons as `wouldRejectReason`.

### Remaining tasks

1. [x] Change `audit-only` into a true audit mode that still evaluates each candidate under a selected
   policy and reports `wouldAccept`, `wouldRejectReason`, and novelty metrics without appending to the
   accepted write set.
2. [x] Split policy evaluation from write decisions:
   - evaluation answers “is this candidate worthy?”;
   - write mode answers “should worthy candidates be persisted?”
3. [x] Add optional `--policy-report=summary,full,rejections-only`.
4. [x] Include exact duplicate and canonical duplicate distinctions in reports.
5. [x] Include invalid path reasons per candidate when full reporting is requested.

### Invariants when satisfied

- Audit mode must never write level or hint artifacts.
- Audit mode must still compute the same accept/reject decision that a write-capable run would compute.
- The same candidate under the same pool and policy must receive the same decision in audit and write
  modes.
- Acceptance policy logic must not live inside individual generator implementations.

## Component 7 — Rich report schema

**Status: Partially complete.**

### What has been done

- The prototype writes a top-level JSON report with timestamp, total runtime, total accepted count,
  options, and per-level results.
- Per-level results include run summaries, accepted paths, accepted metadata, and rejection counts.
- Reports now include `schemaVersion: 1`.
- Generator run summaries now include stable `status` and `exhaustion` fields derived from enumeration
  outcomes and ablation halt flags.
- Compact reports can omit full accepted path arrays with `--include-paths=false` while retaining path
  signatures for accepted and would-accept candidates.
- Per-level reports now include `axisCoverage` summaries for attempted/completed/budgeted/capped/cancelled
  steps and produced/accepted counts by step.

### Remaining tasks

1. Define a versioned report schema, for example:

   ```json
   {
     "schemaVersion": 1,
     "options": {},
     "axisPlan": {},
     "levels": [
       {
         "level": 145,
         "status": "done",
         "generated": [],
         "validated": [],
         "accepted": [],
         "rejected": [],
         "exhaustion": {},
         "axisCoverage": {}
       }
     ]
   }
   ```

2. [x] Add `schemaVersion` and stable status enums.
3. [x] Add generator-level exhaustion/budget/cancel fields.
4. Add per-axis coverage counts:
   - gates tried;
   - first-step directions tried;
   - portal destinations tried;
   - portal exit directions tried;
   - reverse variants tried;
   - combined triples tried;
   - completed vs skipped vs budgeted combos.
   - Partially done: current generator-step coverage is reported; future portal/reverse/combined axis
     counters should be added when those axes are implemented.
5. [x] Add an option to omit full path arrays for compact reports.

### Invariants when satisfied

- Reports must be machine-readable and versioned.
- A report must state whether each generator exhausted, capped, cancelled, budgeted, or saturated.
- A user must be able to answer “which axes were attempted?” and “which axes produced accepted hints?”
  from the report alone.
- Compact reports must still include enough IDs/provenance to reproduce or investigate candidates.

## Component 8 — Complete enumeration sharding and parallelism

**Status: Not started.**

### Rationale

The shared enumeration engine already supports root-child sharding for complete traversal, but the
workbench does not expose or use it. This is needed for scalable `enumerate-complete` and future
parallel exhaustive audits.

### Tasks

1. Add a complete-enumeration generator that can partition each gate by root child.
2. Add `--parallel=N|auto` for shard-level or level-level parallelism.
3. Ensure worker results merge deterministically.
4. Ensure exact dedupe happens after merging shard streams.
5. Add checkpoint/resume support for long complete runs.

### Invariants when satisfied

- Shards for a single gate must be disjoint by first real move.
- Merging all shards for a gate must produce the same solution set as unsharded complete enumeration.
- Parallel and sequential runs with the same seed/options must produce byte-stable reports, except for
  explicitly recorded timing fields.
- A cancelled or interrupted sharded run must be resumable without duplicating accepted candidates.

## Component 9 — Write safety and artifact hygiene

**Status: Partially complete.**

### What has been done

- The prototype only writes hints when `--write-levels --yes=true` is passed.
- The prototype uses `readLevelsWithHints()` and `writeLevelsWithHints()`.
- Reports are written atomically.
- Report output now refuses to target source-controlled artifact paths under `data/` unless
  `--allow-artifact-output=true` is passed.
- Write-capable reports include a `writes` summary with requested/skipped state, changed files, raw
  `writeLevelsWithHints()` result, and post-write reminder commands.
- Write-capable runs print the recommended post-write heatmap/hint/oracle checks when candidates are
  accepted.
- `--write-patch=<path>` writes accepted candidates to a reviewable JSON patch file instead of mutating
  level or hint artifacts.
- `--write-levels` now requires `--yes=true` in the non-interactive CLI.

### Remaining tasks

1. [x] Add a dry-run/write summary before mutation when running interactively is possible, or an explicit
   `--yes` flag if destructive modes are introduced.
2. [x] Add output checks that refuse to write reports inside source-controlled artifact paths unless
   explicitly allowed.
3. [x] Ensure `--write-levels` reports which hint files changed.
4. [x] Automatically remind users to run heatmap generation and hint validity checks after writes.
5. [x] Consider an option to write accepted hints to a patch file instead of mutating hint artifacts.

### Invariants when satisfied

- Without `--write-levels`, no level or hint artifact may change.
- With `--write-levels`, only accepted candidates may be appended.
- Every write-capable run must report the files it changed or state that no files changed.
- Report writes must be atomic.

## Component 10 — Tests and verification

**Status: Partially complete.**

### What has been done

- Added `scripts/hint-workbench-unit-tests.mjs` and `npm run test:hint-workbench`.
- Wired the workbench unit test into `npm run test:node` so it runs with the existing Node smoke suite.
- Covered help text, deprecated preset alias resolution, compact report schema fields, audit policy
  evaluation metadata, run exhaustion fields, the read-only no-mutation guarantee for
  `data/levels.json`, write behavior against a temporary fixture levels/hints directory, patch-file output without fixture mutation, and
  fail-fast validation for unknown presets/policies/report modes and unsupported axis options, and
  comma/range level spec parsing.

### Tasks

1. Add unit tests for:
   - argument parsing;
   - [x] level spec parsing;
   - [x] preset expansion;
   - [x] policy validation;
   - [x] audit vs write behavior;
   - [x] report schema shape.
2. Add smoke tests using a tiny fixture level.
3. [x] Add a no-mutation test for read-only runs.
4. [x] Add a write test against a temporary fixture directory.
5. Add compatibility tests comparing extracted full ablation output to the legacy script on a small
   level subset after Component 4.
6. [x] Add package-script entrypoint validation coverage if needed.

### Invariants when satisfied

- A default workbench invocation in tests must leave repository data files unchanged.
- Unknown preset/policy tests must fail with clear messages.
- Fixture write tests must mutate only temporary fixture artifacts.
- Full ablation refactor tests must prove no candidate-generation regression for covered fixtures.

## Component 11 — Documentation

**Status: Partially complete.**

### What has been done

- Added `docs/hint-workbench.md` with user-facing guidance for presets, policies, audit mode, report
  fields, read-only audits, write-capable runs, and post-write validation.
- Documented that `ui-plus` is the current practical prototype preset and that full reverse/portal/combined
  phases are still planned rather than default behavior.

### Tasks

1. [x] Add user-facing documentation for the workbench, either in `docs/hint-workbench.md` or inside the
   existing hint curation/discovery docs.
2. Document all presets, policies, and dangerous options.
   - Partially done: current presets/policies and non-default full Cartesian-product warning are documented;
     future dangerous options should be added when Component 5 exposes them.
3. [x] Explain when to use:
   - `enumerate-targeted`;
   - `enumerate-complete`;
   - `ablation-ui`;
   - `ablation-full`;
   - the eventual practical combined preset.
4. [x] Document the recommended post-write workflow:
   - regenerate heatmaps;
   - run hint validity checks;
   - run hint path oracle;
   - review report.
5. [x] Include example commands for read-only audits and write-capable corpus expansion.

### Invariants when satisfied

- A developer should be able to choose a preset and policy from documentation without reading the script.
- Documentation must distinguish generation, acceptance, writing, and display curation.
- Documentation must warn that full Cartesian products are not the default and explain evidence-bounded
  combined forcing.

## Recommended implementation order

1. Component 2 — clarify preset names before users depend on misleading semantics.
2. Component 3 — introduce shared candidate stream shape.
3. Component 7 — version report schema early so subsequent changes have a stable target.
4. Component 6 — fix audit mode semantics.
5. Component 4 — modularize full ablation phases.
6. Component 5 — add declarative axis planner and real practical cross-product presets.
7. Component 10 — add tests around each completed layer.
8. Component 8 — add sharded complete enumeration/parallelism.
9. Component 9 — harden write safety further.
10. Component 11 — finish documentation.

## Definition of done for the overall proposal

The full proposal is complete when all of the following are true:

- Existing hint generation/diversification scripts and the workbench share generator internals rather
  than duplicating phase logic.
- The workbench can run targeted enumeration, complete enumeration, browser-safe ablation, full ablation,
  reverse solving, portal-exit forcing, and evidence-bounded combined forcing from one CLI.
- Every candidate flows through one validation/dedupe/acceptance/reporting pipeline.
- Every accepted or rejected candidate can be traced to rich provenance.
- Reports are versioned, deterministic, and sufficient to audit axis coverage.
- Read-only runs never mutate level or hint artifacts.
- Write-capable runs mutate only accepted hint artifacts and report exactly what changed.
- Tests cover parsing, preset expansion, policy behavior, report shape, no-mutation guarantees, fixture
  writes, and full-ablation compatibility.
