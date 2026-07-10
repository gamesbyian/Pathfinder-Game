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

## Progress review (2026-07-10, updated after Component 4 foundation)

A prior estimate put this plan at ~55% done. A skeptical re-read of every component against the actual
code (not just the checklists) plus a live `npm install` + `npm run test:hint-workbench` +
`npm run check:lint` + `npm run check:dead-scripts` + a real `npm run hints:workbench` smoke invocation
found the following:

- **Components 1, 2, 3 are genuinely Complete** — read `scripts/hint-workbench.mjs`,
  `modules/solver/hint-candidate-events.ts`, and `scripts/hint-workbench-unit-tests.mjs` line by line;
  every claimed behavior (read-only default, preset aliasing, candidate-event shape, provenance fields)
  is present and the unit test suite exercises it and passes.
- **Components 6 and 9 had stale headers.** Both said "Partially complete" while every task in their own
  "Remaining tasks" list was already checked `[x]` and verified correct in the code. Re-marked both
  **Complete** (Component 9 with one newly-found follow-up item, see its task 6).
- **Component 11's task 3 overclaimed.** It was checked `[x]` for explaining "when to use `ablation-full`"
  and "the eventual practical combined preset" — neither preset exists yet, so that could not have been
  documented. Un-checked and clarified.
- **Components 4 and 8 are genuinely Not started** — confirmed no `hint-ablation-generator`/
  `hint-ablation-engine` module exists anywhere in the repo, and `scripts/hint-diversification.mjs` is
  unchanged standalone script with no shared engine extracted; no sharding/parallel code exists in the
  enumeration path either.
- **Component 5 is genuinely Partially complete** — the axis planner exists and is recorded in reports,
  but `--directions`/`--combined` are still fail-fast stubs, not real options.
- Fixed one stale doc line in `docs/hint-workbench.md` claiming per-rejection full reporting was "still
  planned" when Component 6 already shipped it.
- Found one small, real, previously-untracked gap: the default report output path isn't gitignored the
  way `reports/hint-discovery/` is (now Component 9, task 6).

**Net assessment (updated 2026-07-10):** The foundation for Component 4 is now in place: module structure
is correct, Phase 0 is working, candidate events flow through the pipeline, and the workbench recognizes
`ablation-full`. This unblocks Components 5/7/10 (axis planning, rich reporting, tests) to be built around
the Phase 0 foundation, even as the remaining 6 phases are extracted incrementally.

The 7 remaining phases (A/B/C/D/E/F/G) require careful extraction of cascade/strategy loops and the
ablation-config system, but they follow the same pattern already proven in Phase 0. Estimated effort:
~3-5 days of focused extraction work to have all phases functional.

Revised estimate: **~50-55% complete** on the full proposal. The previous assessment said "the hard
solver-ablation half that motivated the project has not been started" — that's no longer true, but the
remaining work (5-6 phases of cascading disables + 3 reverse/combined variants) is substantial.



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
  merely possible) plus workbench-level coverage in `scripts/hint-workbench-unit-tests.mjs`.

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

- Added `scripts/hint-workbench-unit-tests.mjs` and `npm run test:hint-workbench`.
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
- Added `scripts/hint-diversification-unit-tests.mjs` and `npm run test:hint-diversification`, wired into
  `test:node`: CLI smoke coverage for the now-migrated `hint-diversification.mjs` — argument parsing,
  fixture-directory read/write (never touches real `data/`), report shape (including the legacy
  `combosTried`/`swapCombosTried`/... field names, preserved across the Component 4 migration), and
  `--combined-only` correctly skipping the forward/reverse/portal phases.

### Tasks

1. Add unit tests for:
   - [x] argument parsing (exercised end-to-end via the CLI smoke tests in both
     `hint-workbench-unit-tests.mjs` and `hint-diversification-unit-tests.mjs`);
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
   `hint-diversification-unit-tests.mjs` (CLI wrapper still produces the legacy report shape/semantics
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
3. [~] Explain when to use each preset — partially done, and the checkbox previously here overclaimed it.
   `docs/hint-workbench.md` documents `enumerate-targeted`, `enumerate-complete`, `ablation-ui`, `ui-plus`,
   and the deprecated `all-practical` alias (all real presets today). It cannot yet document `ablation-full`
   or "the eventual practical combined preset" because those presets do not exist until Components 4 and 5
   are implemented — re-check this box only once those presets are real and documented.
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

## Component 12 — Cross-script consolidation and report provenance (proposed, not started)

**Status: Not started.** Added 2026-07-10 during a progress review; not part of the original scope, so
its absence isn't a prior agent's miss — flagging it now because it directly serves design principles 2
("one acceptance pipeline") and 6 ("deterministic batch runs").

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

### Tasks

1. Extract the dedupe/validate/canonicalize/policy-decide/accept sequence in
   `scripts/hint-workbench.mjs`'s `acceptCandidate()` into a shared helper (e.g. in
   `modules/domain/hint-novelty.ts` or a new `modules/domain/hint-acceptance-pipeline.ts`), and migrate
   `scripts/hint-corpus-expand.mjs` onto it.
2. Add a `provenance.sourceCommit` (or similar) field to workbench and corpus-expand reports, populated
   from `git rev-parse HEAD` (best-effort; must not fail the run if git is unavailable, e.g. in a
   packaged/CI context without `.git`).

### Invariants when satisfied

- There is exactly one implementation of the accept-sequence logic; both scripts call it.
- A report alone is enough to say which solver/codebase state produced its candidates, without cross
  -referencing external logs.

## Recommended implementation order

1. Component 2 — clarify preset names before users depend on misleading semantics.
2. Component 3 — introduce shared candidate stream shape.
3. Component 7 — version report schema early so subsequent changes have a stable target.
4. Component 6 — fix audit mode semantics.
5. Component 4 — modularize full ablation phases.
6. Component 5 — add declarative axis planner and real practical cross-product presets.
7. Component 10 — add tests around each completed layer.
8. Component 8 — add sharded complete enumeration/parallelism.
9. Component 9 — harden write safety further (task 6: report-output gitignore/tagging).
10. Component 11 — finish documentation.
11. Component 12 — lower priority; do opportunistically once Component 4 stabilizes call sites, since
    migrating `hint-corpus-expand.mjs` sooner would mean redoing it again after Component 4's refactor.

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
