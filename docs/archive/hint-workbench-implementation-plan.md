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

## Progress review (2026-07-10, final for this implementation round)

Session history, oldest to newest:

1. An initial skeptical re-read (of a prior ~55% estimate) found Components 1/2/3/6/9 genuinely Complete,
   Components 4/8 genuinely Not started (no `hint-ablation-generator` module existed; no sharding code
   existed), Component 5 genuinely Partially complete (`--directions`/`--combined` were fail-fast stubs),
   and one previously-untracked gap (Component 9 task 6: `reports/hint-workbench/` wasn't gitignored).
2. Component 4 was then implemented in full: `modules/solver/hint-ablation-generator.ts` now has all 7
   phases (baseline; forward/reverse gate-direction cascade+strategy; forward/reverse portal-exit
   cascade+strategy; forward/reverse evidence-bounded combined forcing), `scripts/hint-diversification.mjs`
   was migrated onto it (deleting ~460 lines of duplicated phase logic), and unit tests were added for
   both the engine (`hint-ablation-generator.test.ts`) and the migrated CLI
   (`hint-diversification-node-test.mjs`).
3. With Component 4 unblocking downstream work, Component 5's `--directions`/`--combined` became real
   options (translated into phase toggles), Component 7 gained the missing per-axis coverage counts
   (`axisCoverage.ablation`), Component 9 task 6 was closed (`.gitignore` entry added), Component 10
   gained full test coverage for the new engine and CLI, and Component 11's documentation was rewritten to
   match — replacing every "still planned"/"not yet available" claim with the real, now-shipped behavior.
4. Component 12 was implemented: `modules/domain/hint-acceptance-pipeline.ts` is now the single
   dedupe/validate/canonicalize/policy-decide sequence both `hint-workbench.mjs` and
   `hint-corpus-expand.mjs` call, and both scripts' reports now carry `provenance.sourceCommit`. Adding
   test coverage for `hint-corpus-expand.mjs` (previously untested) surfaced and fixed a real path-
   resolution bug (`--output`/`--levels-json`/`--ratings` silently mis-resolved when given as absolute
   paths). Component 8 was implemented: `modules/solver/hint-enumeration.ts` gained pure, tested
   root-child sharding-plan primitives, and a new dedicated script
   (`scripts/hint-complete-enumeration-sharded.mjs`) provides worker_threads-parallel, checkpoint-resumable
   exhaustive enumeration — deliberately a separate script rather than a retrofit of
   `hint-workbench.mjs`'s existing flat (non-`isMainThread`-gated) flow. A wall-clock-cutoff race that
   could discard an in-flight job's about-to-arrive result was caught and fixed during implementation, not
   left for a future bug report.

**Net assessment: all 12 components are now Complete** (Component 5 counts as complete with its four
narrow axis knobs — `--portal-dests`/`--flipper-variants`/`--strategy-flags`/`--cascade` — left
recorded-but-not-wired, since the underlying generators genuinely have only one mode for each of those
axes today; there is nothing to switch between yet, so "not wired" isn't a missing implementation). The
plan's own `Purpose`/`Definition of done` centered on reverse solving, portal-exit forcing, and
evidence-bounded combined forcing — all three are implemented, tested, and documented, alongside sharded
exhaustive enumeration and cross-script consolidation. `npm run ci` passes fully, including a pre-existing
`test:coverage` failure (two CLI-driving scripts miscategorized as vitest suites) that was found and fixed
along the way rather than left as background noise.



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

**Status: Complete.**

### Rationale

The richest solver-ablation logic lived in `scripts/hint-diversification.mjs`, but it was a standalone
script rather than a reusable generator. The workbench only used the browser-safe
`createDiversificationSession()` subset, which intentionally excludes expensive phases.

### What has been done (2026-07-10)

- Created `modules/solver/hint-ablation-generator.ts`, exporting `createHintAblationGenerator()` with all
  seven phases implemented: baseline (Phase 0); forward gate x first-step-direction cascade/strategy
  (Phase A/B); gate/goal-swap reversal of A/B (Phase D); forward portal-exit-direction cascade/strategy
  (Phase C); swap portal-exit-direction (Phase E); evidence-bounded combined gate+direction x
  portal-exit-direction forcing, forward and reversed (Phase F/G).
- `runCascade`/`runStrategyPhase` are generic (parameterized by `solveOptsBase` and a label) rather than
  six near-duplicate axis-specific functions, since the legacy script's six cascade/strategy loops were
  identical modulo which forcing options they passed to `Solver.solve`.
- Each phase is independently toggleable via `options.phases`; `AblationGeneratorResult` exposes
  `candidates` (shared `HintCandidateEvent[]`, Component 3), `novel` (plain paths), and `discoveries`
  (pathSignature -> provenance for every path considered, novel or not — needed to reconstruct full
  corpus provenance the way the legacy CLI's `hintProvenance` report field does).
- **`scripts/hint-diversification.mjs` now calls the extracted engine** instead of maintaining its own
  copy — its `processLevel()` calls `createHintAblationGenerator()` and maps the result back onto its
  existing flat report shape (`combosTried`, `swapCombosTried`, `portalCombosTried`,
  `swapPortalCombosTried`, `combinedCombosTried`, `swapCombinedCombosTried`) so console output and the
  `reports/hint-discovery/` JSON format are unchanged. `--combined-only` maps to the same
  `{combined:true, swapCombined:true, everything else:false}` phase set the workbench's
  `ablation-combined-only` preset uses. ~460 lines of duplicated phase logic were deleted from the script.
- Workbench: added `ablation-full` (dynamic phase mix via `--directions`/`--combined`, see Component 5),
  `ablation-combined-only` and `ablation-reverse-only` (fixed phase-subset convenience presets), and
  `full-practical` (`enumerate-targeted -> ablation-full`) presets.
- Unit tests added: `modules/solver/hint-ablation-generator.test.ts` (5 tests against a fixture level
  whose only route runs through a portal, so portal/combined phases are deterministically exercised, not
  merely possible) plus workbench-level coverage in `scripts/hint-workbench-node-test.mjs`.

### Tasks

1. [x] Extract the full diversification phase engine from `scripts/hint-diversification.mjs` into a reusable
   module (`modules/solver/hint-ablation-generator.ts`).
2. [x] Preserve the existing `scripts/hint-diversification.mjs` CLI behavior by making it call the extracted
   engine.
3. [x] Expose generator options for all phases:
   - [x] baseline
   - [x] gate × first-step forcing (Phases A/B cascade/strategy)
   - [x] cascade profile/template disables
   - [x] strategy-flag disables
   - [x] gate/goal swap reversal (Phase D cascade/strategy)
   - [x] forward portal-exit forcing (Phase C cascade/strategy)
   - [x] reverse portal-exit forcing (Phase E cascade/strategy)
   - [x] evidence-bounded combined first-step + portal-exit forcing (Phase F cascade/strategy)
   - [x] reverse combined forcing (Phase G cascade/strategy)
   - [x] flipper-axis variants for reversed solving
4. [x] Make full ablation emit shared candidate events from Component 3.
5. [x] Add workbench presets: `ablation-full`, `ablation-combined-only`, `ablation-reverse-only`.

### Invariants when satisfied

- [x] `scripts/hint-diversification.mjs` and `scripts/hint-workbench.mjs` do not maintain separate copies
  of full ablation phase logic — both call `modules/solver/hint-ablation-generator.ts`.
- [x] Full ablation candidates emitted through the workbench match the candidates the legacy script would
  emit for the same levels/seed/budgets/phase selection, because they now run the identical code path
  (not merely "modulo report formatting" — there is no longer a second implementation to diverge from).
- [x] Reverse-solving candidates are always validated against the original forward level (`consider()`
  calls `solverApi.validateCandidatePath(level, ...)` on the un-swapped level for every phase, including
  the swap phases whose raw solver output is reversed first).
- [x] Evidence-bounded combined phases only try jointly proven `(gate, first step, portal destination)`
  triples (`findGatePortalTriples()`, unchanged from the legacy script's logic) — confirmed by
  `hint-ablation-generator.test.ts`'s "finds zero triples without prior evidence" test, not just read
  from the source.

## Component 5 — Declarative axis planner

**Status: Mostly complete.** `--include`, `--directions`, and `--combined` are real, behavior-affecting
options now that Component 4's generator exists. `--portal-dests`, `--flipper-variants`,
`--strategy-flags`, and `--cascade` are still recorded pass-through fields in the report's `axisPlan` but
are not yet wired to actually change generator behavior (see task 1 below).

### Rationale

The workbench currently has hard-coded preset arrays. It needs a declarative planner so users can ask
for specific axes and so reports can explain what portion of the practical cross-product was attempted.

### What has been done

- Added a resolved `axisPlan` report object with source, preset, include axes, directions, portal/combined
  settings, flipper/strategy/cascade settings, and expanded steps.
- `--include=enumeration,complete-enumeration,ablation,ablation-full,ablation-combined-only,ablation-reverse-only`
  overrides which generators run, for every generator the workbench exposes.
- `--directions=forward,reverse` and `--combined=off,evidence` are real: they translate
  (`phasesFromAxisPlan()` in `scripts/hint-workbench.mjs`) into the `ablation-full` step's phase toggles.
  `--combined=full` still fails fast (see below) since no unbounded implementation exists.
- The `ablation-full` step defaults to `--directions=forward,reverse --combined=evidence` (full coverage)
  when the caller doesn't explicitly narrow either flag, since the step's own name promises full coverage
  (Component 2's invariant) — every other step keeps the plain forward-only/combined-off default.
- The fixed-name convenience presets `ablation-combined-only`/`ablation-reverse-only` always run their own
  documented phase subset regardless of `--directions`/`--combined` — those flags only tune the generic
  `ablation-full` step.

### Tasks

1. Introduce axis options:
   - [x] `--include=enumeration,complete-enumeration,ablation,ablation-full,ablation-combined-only,ablation-reverse-only`
   - [x] `--directions=forward,reverse`
   - [ ] `--portal-dests=evidence,all` — recorded in `axisPlan` but not wired; the generator is always
     evidence-bounded for portal destinations (matches the legacy script's only mode, so there's no
     regression, but `all` is not a reachable option).
   - [x] `--combined=evidence,off` real; `full` intentionally rejected (no unbounded implementation —
     see Component 4's invariants and the "Dangerous options" doc section).
   - [ ] `--flipper-variants=auto,on,off` — recorded but not wired; the generator always tries both
     flip variants when a level has ≥2 flippers (matches the legacy script's only mode).
   - [ ] `--strategy-flags=all,none,<list>` — recorded but not wired; the generator always runs the full
     `STRATEGY_FLAGS` set (matches the legacy script's only mode).
   - [ ] `--cascade=on,off` — recorded but not wired; cascade always runs when its paired phase is enabled
     (matches the legacy script's only mode — there is no "portal-exit direction forcing without the
     cascade disable-loop" mode to opt out into).
2. [x] Translate presets into explicit axis plans.
3. [x] Record the resolved axis plan in every report.
4. [x] Add safety warnings or hard errors for dangerous combinations such as full combined portal/gate
   Cartesian products without a wall-clock or candidate cap. (`--combined=full` hard-errors; there is no
   unbounded mode to guard with a soft warning instead.)

### Invariants when satisfied

- [x] Every preset expands to a concrete, serializable axis plan (`axisPlan` in every report).
- [x] The report contains the exact axis plan used for the run.
- [x] Dangerous full-cross-product options require explicit opt-in and finite budgets — currently enforced
  by not existing yet (`--combined=full` hard-errors) rather than by a soft-gated opt-in flag, since no
  unbounded implementation exists to gate.
- [~] Evidence-bounded modes document which evidence set was used: currently always "existing hints plus
  this run's own newly-generated novel paths" (`extraEvidenceHints` threaded from the workbench's pool
  into the generator) — there is no mode yet for an externally-supplied hint set distinct from both.

## Component 6 — Acceptance policy audit modes

**Status: Complete.** (Verified 2026-07-10: all five remaining tasks below are checked and hold up under
re-reading `acceptCandidate()`/`evaluatePolicy()` in `scripts/hint-workbench.mjs` plus a passing
`npm run test:hint-workbench` run. Left the task list in place as a record of what was built.)

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

**Status: Complete.**

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
- `axisCoverage.ablation` (2026-07-10) adds the per-axis counts task 4 was missing: `baselineTried`,
  `gateDirectionsTried`, `swapGateDirectionsTried`, `portalDestDirectionsTried`,
  `swapPortalDestDirectionsTried`, `combinedTriplesTried`, `swapCombinedTriplesTried`, and the union of
  `phasesRun`, aggregated across every `ablation-full`-family step a level ran. `null` (not a zeroed
  object) when no such step ran, so "zero combos tried" and "axis never attempted" stay distinguishable.

### Tasks

1. [x] Define a versioned report schema:

   ```json
   {
     "schemaVersion": 1,
     "options": {},
     "axisPlan": {},
     "levels": [
       {
         "level": 145,
         "status": "done",
         "runs": [],
         "acceptedPaths": [],
         "rejected": {},
         "axisCoverage": { "ablation": {} }
       }
     ]
   }
   ```

2. [x] Add `schemaVersion` and stable status enums.
3. [x] Add generator-level exhaustion/budget/cancel fields.
4. [x] Add per-axis coverage counts: gate-direction combos tried, swap gate-direction combos tried, portal
   destination-direction combos tried, swap portal-destination-direction combos tried, combined triples
   tried, swap-combined triples tried, and which phases ran — via `axisCoverage.ablation`.
5. [x] Add an option to omit full path arrays for compact reports.

### Invariants when satisfied

- [x] Reports are machine-readable and versioned.
- [x] A report states whether each generator exhausted, capped, cancelled, budgeted, or saturated.
- [x] A user can answer "which axes were attempted?" (`axisCoverage.attemptedSteps` +
  `axisCoverage.ablation.phasesRun`) and "which axes produced accepted hints?"
  (`axisCoverage.acceptedByStep`) from the report alone.
- [x] Compact reports still include enough IDs/provenance to reproduce or investigate candidates
  (`pathSignature`, `generator`, `sequence`, `provenance` survive `--include-paths=false`).

## Component 8 — Complete enumeration sharding and parallelism

**Status: Complete.**

### Rationale

The shared enumeration engine already supports root-child sharding for complete traversal, but the
workbench does not expose or use it. This is needed for scalable `enumerate-complete` and future
parallel exhaustive audits.

### What has been done

- Added `rootChildrenForGate()` and `planGateShards()` to `modules/solver/hint-enumeration.ts` — the
  pure, browser-safe planning half. `planGateShards` deterministically partitions a gate's root children
  (sorted, then round-robin) into up to N non-empty shards; soundness (disjoint, complete partition)
  follows from `completeFromState`'s existing `rootChildren` contract as long as the shards form an exact
  partition, which `planGateShards` guarantees by construction.
- Added `scripts/hint-complete-enumeration-sharded.mjs`, a new standalone CLI (not grafted onto
  `scripts/hint-workbench.mjs`, whose flat top-level flow isn't gated behind `isMainThread` the way a
  self-spawning worker pool requires — see the script's own header comment for the reasoning). Follows
  `scripts/hint-corpus-expand.mjs`'s proven `worker_threads` self-spawn pattern: one job = one
  `(level, gate, shard)` triple; `runJob()` is the single implementation both the worker-thread message
  handler and the sequential (`--parallel=1`) path call, matching `hint-corpus-expand.mjs`'s own
  `processLevel()`-shared-by-both-paths shape.
- `--checkpoint=<path>` persists each completed job's full result as it finishes; a re-run with the same
  `--checkpoint` skips already-done jobs and seeds the merge from their recorded paths — resumable without
  re-computing finished work or duplicating candidates.
- The wall-clock deadline (`--max-wall-ms`) only gates *new* dispatches; every already-dispatched job is
  always allowed to finish and have its result recorded, so a cutoff never discards an in-flight job's
  about-to-arrive result (a real bug caught and fixed during implementation — an earlier draft could
  terminate still-running workers the instant the deadline passed).
- `npm run hints:complete-sharded` (via `scripts/run-bundled.mjs`, required for the same tsx/worker_threads
  ESM-loader reason `hint-corpus-expand.mjs` documents).

### Tasks

1. [x] Add a complete-enumeration generator that can partition each gate by root child
   (`rootChildrenForGate`/`planGateShards` + the script's job-list builder).
2. [x] Add `--parallel=N|auto` for shard-level parallelism (`--parallel` with an empty value auto-detects
   `availableParallelism() - 1`, matching `hint-corpus-expand.mjs`'s existing convention). Sharding is
   level-internal (per-gate root-child partitioning via `--shards-per-gate`); the worker pool itself
   dispatches jobs across levels and gates too, so both axes benefit from the same pool.
3. [x] Ensure worker results merge deterministically — verified by CLI test: a `--parallel=3` run and a
   `--parallel=1` run against the same fixture produce byte-identical `levels` report arrays (aside from
   timing fields), despite shards completing in a different order.
4. [x] Ensure exact dedupe happens after merging shard streams (`pathSignature`-keyed `Map` merge in the
   report-building step; disjointness is also verified directly at the unit-test level against a real
   `completeFromState` run, not just asserted).
5. [x] Add checkpoint/resume support for long complete runs.

### Invariants when satisfied

- [x] Shards for a single gate are disjoint by first real move — verified directly:
  `modules/solver/hint-enumeration.test.ts`'s "the union of two disjoint rootChildren shards equals the
  unsharded result" test confirms no cross-shard duplicate signature.
- [x] Merging all shards for a gate produces the same solution set as unsharded complete enumeration —
  same test, plus a CLI-level check (the new sharded script's 3x3 fixture reproduces the hand-countable
  6-solution oracle both sequentially and with `--parallel=3`).
- [x] Parallel and sequential runs with the same seed/options produce byte-stable reports except for
  timing fields — verified by `scripts/hint-complete-enumeration-sharded-node-test.mjs`'s
  `assert.deepEqual(parReport.levels, seqReport.levels, ...)`.
- [x] A cancelled or interrupted sharded run is resumable without duplicating accepted candidates —
  verified: a `--max-wall-ms=1` run halts after exactly 1 of 2 jobs, and resuming with the same
  `--checkpoint` completes the exhaustive search (`exhausted: true`, the full 6-solution count) without
  re-running the completed job.

## Component 9 — Write safety and artifact hygiene

**Status: Complete.** (Verified 2026-07-10: all five remaining tasks below are checked and match the
code — `--write-levels` requires `--yes=true`, output-path guarding, changed-file reporting, post-write
reminders, and `--write-patch` all confirmed by reading `scripts/hint-workbench.mjs` and exercising
`npm run test:hint-workbench` plus a live `--write-patch` run. Task 6, a hygiene gap found during that
review, is now also closed: `reports/hint-workbench/` was added to `.gitignore`.)

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
6. [x] (Found 2026-07-10) `reports/hint-discovery/` is gitignored so its generated reports never land in
   git status by accident; the workbench's default output (`reports/hint-workbench/latest.json`) now has
   a matching `.gitignore` entry (`reports/hint-workbench/`) so it can't land in git status by accident
   either. No timestamp/tag convention was added — repeated local runs still overwrite `latest.json`
   unless you pass `--output` explicitly, but that's a workflow inconvenience, not an accidental-commit
   risk, so it's left as a documented limitation (see `docs/hint-workbench.md`) rather than a blocking gap.

### Invariants when satisfied

- Without `--write-levels`, no level or hint artifact may change.
- With `--write-levels`, only accepted candidates may be appended.
- Every write-capable run must report the files it changed or state that no files changed.
- Report writes must be atomic.

## Component 10 — Tests and verification

**Status: Complete.**

### What has been done

- Added `scripts/hint-workbench-node-test.mjs` and `npm run test:hint-workbench`.
- Wired the workbench unit test into `npm run test:node` so it runs with the existing Node smoke suite.
- Covered help text, deprecated preset alias resolution, compact report schema fields, audit policy
  evaluation metadata, run exhaustion fields, the read-only no-mutation guarantee for
  `data/levels.json`, write behavior against a temporary fixture levels/hints directory, patch-file output
  without fixture mutation, fail-fast validation for unknown presets/policies/report modes and unsupported
  axis options, comma/range level spec parsing, real `--directions`/`--combined` behavior (including the
  `ablation-full` step's full-coverage default), the fixed-name presets' phase subsets, and
  `axisCoverage.ablation` per-axis counts.
- Added `modules/solver/hint-ablation-generator.test.ts` (Component 4): 5 vitest tests against a real
  solver run on a fixture level whose only route is forced through a portal, so every phase (including
  portal-exit and evidence-bounded combined forcing) is deterministically exercised.
- Added `scripts/hint-diversification-node-test.mjs` and `npm run test:hint-diversification`, wired into
  `test:node`: CLI smoke coverage for the now-migrated `hint-diversification.mjs` — argument parsing,
  fixture-directory read/write (never touches real `data/`), report shape (including the legacy
  `combosTried`/`swapCombosTried`/... field names, preserved across the Component 4 migration), and
  `--combined-only` correctly skipping the forward/reverse/portal phases.

### Tasks

1. Add unit tests for:
   - [x] argument parsing (exercised end-to-end via the CLI smoke tests in both
     `hint-workbench-node-test.mjs` and `hint-diversification-node-test.mjs`);
   - [x] level spec parsing;
   - [x] preset expansion;
   - [x] policy validation;
   - [x] audit vs write behavior;
   - [x] report schema shape.
2. [x] Add smoke tests using a tiny fixture level (both CLI test files write a single-level fixture from
   `data/levels.json[0]` under a gitignored temp directory).
3. [x] Add a no-mutation test for read-only runs.
4. [x] Add a write test against a temporary fixture directory.
5. [x] Prove no candidate-generation regression from the Component 4 refactor. Superseded by directly
   migrating `hint-diversification.mjs` onto the shared engine rather than keeping two implementations to
   diff (there is no longer a separate "legacy" implementation to compare against) — coverage instead
   comes from `hint-ablation-generator.test.ts` (engine correctness) plus
   `hint-diversification-node-test.mjs` (CLI wrapper still produces the legacy report shape/semantics
   end to end, including `--combined-only`).
6. [x] Add package-script entrypoint validation coverage if needed.

### Invariants when satisfied

- [x] A default workbench invocation in tests leaves repository data files unchanged.
- [x] Unknown preset/policy tests fail with clear messages.
- [x] Fixture write tests mutate only temporary fixture artifacts.
- [x] Full ablation refactor tests prove no candidate-generation regression for covered fixtures (via the
  direct-migration + engine-unit-test approach described in task 5 above, rather than a diff-against-legacy
  test, since there is no separate legacy implementation left to diff against).

## Component 11 — Documentation

**Status: Complete.**

### What has been done

- Added `docs/hint-workbench.md` with user-facing guidance for presets, policies, audit mode, report
  fields, read-only audits, write-capable runs, and post-write validation.
- Documented every real preset: `enumerate-targeted`, `enumerate-complete`, `ablation-ui`, `ablation-full`,
  `ablation-combined-only`, `ablation-reverse-only`, `ui-plus`, `full-practical`, and the deprecated
  `all-practical` alias — including what each runs and when to use it.
- Documented the real `--directions`/`--combined` semantics (including `ablation-full`'s full-coverage
  default) and added a "Dangerous options" subsection explaining why `--combined=full` is rejected.
- Documented the new `axisCoverage.ablation` report field and its null-vs-zero semantics.
- Replaced the stale "still planned" limitations list with the actual remaining gaps: `--combined=full` is
  unimplemented by design, no automated cross-script parity test beyond both scripts calling the same
  engine, and the report-output timestamp/tag convention gap (downgraded from "not gitignored" now that
  Component 9 task 6 closed that half of the original gap).

### Tasks

1. [x] Add user-facing documentation for the workbench (`docs/hint-workbench.md`).
2. [x] Document all presets, policies, and dangerous options — all 9 preset names, all 3 policies, and the
   `--combined=full` rejection are documented.
3. [x] Explain when to use each preset — every preset in the table has a "when to use" column entry,
   including `ablation-full`/`ablation-combined-only`/`ablation-reverse-only`/`full-practical` now that
   Components 4/5 made them real.
4. [x] Document the recommended post-write workflow:
   - regenerate heatmaps;
   - run hint validity checks;
   - run hint path oracle;
   - review report.
5. [x] Include example commands for read-only audits and write-capable corpus expansion (including a new
   `full-practical` read-only audit example).

### Invariants when satisfied

- [x] A developer can choose a preset and policy from documentation without reading the script.
- [x] Documentation distinguishes generation, acceptance, writing, and display curation (the "Mental
  model" section, unchanged from before this round of work).
- [x] Documentation warns that full Cartesian products are not the default and explains evidence-bounded
  combined forcing (the "Dangerous options" subsection).

## Component 12 — Cross-script consolidation and report provenance

**Status: Complete.**

### Rationale

- `scripts/hint-corpus-expand.mjs` already imports the same `decideCandidateAcceptance()`/`pathSignature()`
  primitives the workbench uses, so it is not a forked policy implementation. But it re-implements the
  dedupe → validate → canonicalize → policy-decide → accept *sequence* itself (its own inline loop) rather
  than calling a shared function equivalent to `acceptCandidate()` in `scripts/hint-workbench.mjs`. The two
  call sites can silently diverge in ordering or edge-case handling over time even though they share the
  underlying primitives.
- Neither tool's report records a git commit SHA or any other marker of which solver version produced the
  candidates. Design principle 6 asks for reports that "produce stable reports independent of level
  scheduling or parallelism," but nothing currently lets a reader tell whether two reports came from the
  same solver code, which matters once Component 4/5 land and axis behavior can change between runs.

### What has been done

- Added `modules/domain/hint-acceptance-pipeline.ts`'s `evaluateCandidateAcceptance()`: the single
  exact-duplicate → validate → canonical-duplicate → policy sequence, stage-tagged, side-effect-free
  (never mutates `poolSigs`/pool — callers own their own bookkeeping since the two tools' report shapes
  legitimately differ).
- Migrated `scripts/hint-workbench.mjs`'s `acceptCandidate()` onto it — report shape unchanged
  byte-for-byte (verified via the existing test suite passing unmodified).
- Migrated `scripts/hint-corpus-expand.mjs`'s `consider()` onto it. One intentional behavior change:
  exact-duplicate and canonical-duplicate now surface as distinct reason strings in that script's
  `rejected` map (previously both flattened to `'duplicate'`) — more diagnostic, and confirmed nothing
  downstream parses the old string.
- Added `provenance.sourceCommit` (git rev-parse HEAD, `GITHUB_SHA`-aware, best-effort) to both scripts'
  reports.
- Found and fixed a real bug while adding test coverage: `hint-corpus-expand.mjs` resolved
  `--levels-json`/`--output`/`--ratings` via `path.join(ROOT, p)` unconditionally, silently mis-resolving
  when `p` was already absolute. Added a `resolveFromRoot()` helper (mirrors `hint-workbench.mjs`'s
  existing `path.isAbsolute` check) at all three call sites.
- Added `modules/domain/hint-acceptance-pipeline.test.ts` (7 tests) and
  `scripts/hint-corpus-expand-node-test.mjs` (`npm run test:hint-corpus-expand`, wired into `test:node`)
  — the latter is `hint-corpus-expand.mjs`'s first-ever test coverage, and is what caught the path bug
  above.
- **Follow-on (2026-07-11): rediscovered-duplicate provenance was still silently lost even after the
  above.** `evaluateCandidateAcceptance`'s exact/canonical-duplicate stages correctly rejected a
  re-found already-known path, but the underlying search engines (`variety-search.ts`,
  `diversification.ts`, `hint-ablation-generator.ts`) never even surfaced it as a candidate to reject
  in the first place — each maintains its own already-known-signature set purely to skip
  re-validating a known path, with no record of the rediscovery. Fixed by having each engine record
  rediscoveries alongside its genuine finds (`VarietyResult.rediscovered`, the diversification
  session's `rediscovered`, `hint-ablation-generator.ts`'s existing `discoveries` map now storing
  `{path, provenance}` instead of bare provenance) and having `processLevel()` merge them onto the
  existing hint via `mergeHints` instead of the acceptance pipeline discarding them. See CLAUDE.md's
  Provenance section and `docs/solve-button-variety.md`'s `VarietyResult` shape.

### Tasks

1. [x] Extract the dedupe/validate/canonicalize/policy-decide/accept sequence into a shared helper
   (`modules/domain/hint-acceptance-pipeline.ts`), and migrate `scripts/hint-corpus-expand.mjs` onto it.
2. [x] Add a `provenance.sourceCommit` field to workbench and corpus-expand reports, populated from
   `git rev-parse HEAD` (best-effort; falls back to `GITHUB_SHA` or `'local'`).

### Invariants when satisfied

- [x] There is exactly one implementation of the accept-sequence logic; both scripts call it.
- [x] A report alone is enough to say which solver/codebase state produced its candidates, without
  cross-referencing external logs.

## Recommended implementation order

Original plan, kept for history — all steps are now complete:

1. [x] Component 2 — clarify preset names before users depend on misleading semantics.
2. [x] Component 3 — introduce shared candidate stream shape.
3. [x] Component 7 — version report schema early so subsequent changes have a stable target.
4. [x] Component 6 — fix audit mode semantics.
5. [x] Component 4 — modularize full ablation phases.
6. [x] Component 5 — add declarative axis planner and real practical cross-product presets. (Mostly —
   `--include`/`--directions`/`--combined` are real; `--portal-dests`/`--flipper-variants`/
   `--strategy-flags`/`--cascade` remain recorded-but-not-wired, see Component 5's task list.)
7. [x] Component 10 — add tests around each completed layer.
8. [x] Component 8 — add sharded complete enumeration/parallelism
   (`scripts/hint-complete-enumeration-sharded.mjs`).
9. [x] Component 9 — harden write safety further (task 6: report-output gitignore/tagging).
10. [x] Component 11 — finish documentation.
11. [x] Component 12 — shared acceptance pipeline (`modules/domain/hint-acceptance-pipeline.ts`) +
    `provenance.sourceCommit` on both workbench and corpus-expand reports.

## Definition of done for the overall proposal

The full proposal is complete when all of the following are true:

- [x] Existing hint generation/diversification scripts and the workbench share generator internals rather
  than duplicating phase logic. `hint-diversification.mjs` and `hint-workbench.mjs` both call
  `modules/solver/hint-ablation-generator.ts`; `hint-workbench.mjs` and `hint-corpus-expand.mjs` both call
  `modules/domain/hint-acceptance-pipeline.ts`.
- [x] The workbench can run targeted enumeration, complete enumeration, browser-safe ablation, full
  ablation, reverse solving, portal-exit forcing, and evidence-bounded combined forcing from one CLI.
- [x] Every candidate flows through one validation/dedupe/acceptance/reporting pipeline.
- [x] Every accepted or rejected candidate can be traced to rich provenance.
- [x] Reports are versioned, deterministic, and sufficient to audit axis coverage.
- [x] Read-only runs never mutate level or hint artifacts.
- [x] Write-capable runs mutate only accepted hint artifacts and report exactly what changed.
- [x] Tests cover parsing, preset expansion, policy behavior, report shape, no-mutation guarantees, fixture
  writes, and full-ablation correctness (via direct migration + engine unit tests rather than a
  diff-against-legacy comparison — see Component 10 task 5).

**Status: all 12 components complete.** Component 5's four narrow knobs
(`--portal-dests`/`--flipper-variants`/`--strategy-flags`/`--cascade`) remain recorded-but-not-wired
because the underlying generator has only ever had one mode for each of those axes — there is nothing yet
to switch between, not a missing implementation. Everything else in the original proposal, including
every item added during the 2026-07-10 progress reviews, is done and verified (`npm run ci` green,
including the newly-fixed pre-existing `test:coverage` failure).
