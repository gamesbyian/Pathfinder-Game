# Naming-cleanup Phases 9–14 preparation audit

Status: **research handoff only**. This document does not claim a batch, change a mapping, add a
compatibility alias, or authorize implementation ahead of the serialized Phase-8 stream. The plan,
vocabulary authority, ledger, and (once created) phase execution records remain authoritative.

> **Phase-9 disposition (2026-08-31):** Phase 9 has since been implemented. Its current evidence is
> [`naming-cleanup-phase-records/phase-09.md`](naming-cleanup-phase-records/phase-09.md); the Phase-9
> inventories below are preserved as pre-implementation audit evidence, not current-state claims.

Audit base: `30cff381` (2026-08-30, current `main` at the start of this audit). Re-run delta
reconciliation when each batch starts. The census searched both sides of every Phase 9–14 ledger
mapping across current source, scripts, package commands, workflows, current documentation, tests,
and data references. Dated reports, archives, baseline logs, and committed corpus payloads were
classified as frozen/history unless a current reader consumes their spelling.

## How to use this handoff

1. Start only after the preceding serialized batch has merged and its ledger completion is recorded.
2. Run `npm run naming:status`, reconcile the selected rows against new `main`, and create the
   checked-in phase/batch execution record before implementation.
3. Treat the inventories below as starting maps, not exhaustive proof: raw-string and structural
   searches cannot establish runtime execution.
4. Preserve the classifications: **target** means implementation work; **compatibility owner** is
   the one permitted legacy boundary; **retained** is semantically correct; **frozen** must not be
   rewritten; **superseded** must not be recreated; **ambiguous** must be resolved before editing.

### Reproducible census commands

The audit used fixed-string searches for every ledger `old` and `new` value, followed by narrower
symbol/property searches because phrases such as “runtime variant” and “normalized reqLen” are ledger
descriptions rather than literal source tokens. Implementers can reproduce the starting point with:

```sh
jq -r '.entries[] | select(.phase >= 9 and .phase <= 14) |
  [.id, .phase, .old, .new, .kind, .risk, .persistence,
   (.compatibility.mode // "-"), (.compatibility.owner // "-")] | @tsv' \
  docs/naming-cleanup-ledger.json
rg -n -F '<legacy-or-canonical-term>' modules scripts tests package.json .github docs \
  --glob '!docs/archive/**' --glob '!reports/**'
rg -n '\breqLen\b|\breqInt\b|requiredLength|requiredIntersections' modules scripts tests
rg -n '\bvariant\b|setVariant|\.variant\b|orientation|setOrientation|\.orientation\b' modules tests
rg -n 'ActionType|GameCommandType|GameEventType' modules tests
```

Search exclusions only make the live-code pass readable. A second pass must inspect excluded
archives/reports/logs as frozen evidence and identify any *current* parser that consumes them. On this
base, representative non-history file counts were: `closeLengthGap` 8,
`REPAIR_EXTRA_BUDGET_FRACTION` 11, `repairBudgetFractionOverride` 12, `setVariant` 5,
`ActionType` 6, `reqLen` 175, `reqInt` 158, `SOUND_BUS` 11, `createCore` 4,
`HinterState` 1, `pendingAction` 5, and `publicDrawPath` 1. Counts are discovery aids, not completion
criteria, and are expected to move before the owning batch starts.

### Row-level reconciliation summary

This table prevents grouped prose from hiding a ledger row. “Live” means the underlying current-main
concept exists; it does not mean implementation is authorized.

| Row(s) | Current disposition | Collision / compatibility note |
| --- | --- | --- |
| NC-P09-001 | live package alias and broad current-doc/comment consumer set | canonical alias unoccupied; temporary old alias owned by `package.json` |
| NC-P09-002 | live package alias | canonical alias unoccupied; no compatibility owner |
| NC-P09-003 | live package alias; related `stress:benchmark:raced` needs explicit classification | canonical alias unoccupied; temporary old alias owned by `package.json` |
| NC-P09-004 | live file, package entrypoint, and two manual bundled invocations | canonical path unoccupied |
| NC-P09-005/006 | live combiner, Node test, package alias, and many direct workflow calls | canonical file/alias unoccupied; only package alias owns temporary compatibility |
| NC-P09-007/008 | live stress-refresh outputs with workflow/script readers | canonical paths unoccupied; historical old-path artifacts frozen |
| NC-P10-001/002 | live helper and current terminology; dated result language frozen | canonical symbol unoccupied |
| NC-P10-003/004 | live solver module/import graph and current prose/output labels | canonical path unoccupied; archives frozen |
| NC-P10-005/006/007 | live constant, public solve option, resolved local, and duplicated transports | canonical targets unoccupied; no compatibility alias authorized |
| NC-P10-008 | runtime definition already canonical; historical-read obligation still open | canonical value occupied by same concept; never recreate the old definition |
| NC-P11-001/002/003/004 | live state/action/geometry/render/input concept | canonical words exist descriptively, but target fields/symbol are unoccupied; compatibility owner needs a concrete surface |
| NC-P11-005 | live current-doc terminology only | historical descriptions frozen |
| NC-P12-001 | underlying constants exist, but every command member is definition/test-only | canonical object unoccupied; planned command transport is architecture-stale/ambiguous |
| NC-P12-002 | only `WIN` and `LOGIC_STATE_CHANGE` are live event transports; other members definition/test-only | canonical object unoccupied; dead-member disposition unresolved |
| NC-P12-003/004 | only gameplay-discriminator variables are targets; generic DOM/solver/effect terms retained | raw word search is non-actionable without type/dataflow classification |
| NC-P13-001/002 | live normalized fields across codec, domain, solver, state, editor, render, and scripts | canonical runtime fields unoccupied; parser/serializer is sole intended compatibility owner |
| NC-P13-003/004 | live and permanently retained raw wire fields | old equals new by design; raw producers/fixtures are not migration residue |
| NC-P14-001/002/003 | live mixed core bag, audio service, constants, composition root | targets describe extraction rather than one mechanical rename; no forwarding facade authorized at closeout |
| NC-P14-004 | live facade with many domain owners and injected state/renderer access | direct imports must preserve architecture; qualified `*-core.ts` names are unrelated |
| NC-P14-005 | live type in `state-slices.ts` | canonical type unoccupied |
| NC-P14-006 | live top-level mutable state across app, controllers, actions, render, tests, lint, and debug facade | canonical property unoccupied; public `window.APP.State.ENGINE` compatibility is unspecified |
| NC-P14-007 | live renderer-local helper | canonical helper unoccupied; exported renderer port remains `drawPath` unless separately authorized |
| NC-P14-008 | live runtime confirmation callback field/action/controller graph | canonical field unoccupied; actual persistence statement needs verification |
| NC-P14-009/010 | live, intentional retained ADR/core-slice terminology | old equals new; never include in facade/core residue replacement |

## Validation reality on this base

| Gate | What it really exercises | Important non-coverage |
| --- | --- | --- |
| `npm run check` | static entrypoint/path checks, lint, types, architecture/security/data/docs validators | does not dispatch workflows or run most research CLIs |
| `npm run ci:fast` | `check`, non-`deepTest` Vitest, and the explicit Node-harness graph | no coverage instrumentation, deep solver proofs, or browser |
| `npm run ci` | `check`, covered Vitest including deep tests, and the Node-harness graph | still browser-free and does not dispatch GHA |
| `npm run test:node` | only the explicit `run-scripts-parallel` list in `package.json` | an `.mjs` file merely existing, parsing, or being referenced does not enroll it |
| Vitest | `modules/**/*.test.ts` plus the script suites selected in `vitest.config.mjs` | package aliases, shell quoting, workflow expressions, and real corpus runs are generally outside it |
| workflow validators | action versions, literal path existence/case, local `node`/`tsx` entrypoints, and selected artifact contracts | shell branches, inputs, environment propagation, commands hidden in variables, and actual jobs remain structural-only |
| Playwright | production bundle gameplay/editor/browser scenarios | it currently does not cover all orientation buttons, inverse pointer mapping, confirmation state, or the full public debug facade |

Native Node `.mjs` entrypoints must continue to use `scripts/run-bundled.mjs` when importing the
TypeScript module graph. `check:plain-node-import-boundaries` is structural protection, not a real
execution substitute. This audit adds rename-neutral transform/input and level-codec boundary tests
using only the current API. The former proves the browser-facing `getGridCoord` adapter maps every
rendered cell back to its base coordinate for all eight transforms on a non-square level; the latter
locks current raw -> runtime clone -> wire challenge-metric transport. Remaining gaps need phase-owned
fixtures whose assertions must be chosen with the implementation owner to avoid accidentally encoding
a future spelling.

## Phase 9 — regression/performance CLI vocabulary

**Rows:** NC-P09-001 through NC-P09-009. NC-P09-009 was added by the Phase-9 post-merge repair
after the preparation warning about the distinct raced package identity was not converted into an
implementation ledger row before PR #1599.

### Contract and consumer map

| Rows | Classification and graph |
| --- | --- |
| NC-P09-001 | **Target:** `package.json` alias `solver:bench` -> `scripts/run-bundled.mjs scripts/solver-bench.mjs`. Current consumers include `AGENTS.md`, `docs/testing.md`, solver architecture/budget/workstream docs, module comments, browser stubs, stress scripts, and workflow comments. **Compatibility owner:** temporary package alias only. The script filename is not itself authorized to change. |
| NC-P09-002 | **Target:** package alias for `scripts/solver-speed-probe.mjs`. Current live documentation is concentrated in `docs/tooling-catalog.md`. No compatibility alias is authorized. The canonical target has no unrelated package-script collision. |
| NC-P09-003 | **Target:** package alias for `scripts/stress/benchmark.mjs`. Current consumers include `data/stress/README.md`, solver docs, baseline compilers/curators, and script prose. **Compatibility owner:** package alias. Archived batch JSON names are frozen. |
| NC-P09-009 | **Target:** distinct raced package identity `stress:benchmark:raced` -> `stress:measure-solver:raced`. Preparation identified it as separately owned; PR #1599 changed it without a row, so the post-merge repair added explicit accounting rather than treating it as implied by NC-P09-003. |
| NC-P09-004 | **Target:** direct-runner filename, while `solver:direct` remains retained. Consumers are `package.json`, `scripts/run-audit-export.mjs`, and `scripts/portfolio-solve-sweep.mjs`; the audit exporter reconstructs the bundled invocation manually and is the missed-consumer hazard. No target collision found. |
| NC-P09-005/006 | **Targets:** combiner file and package alias. Producers are portfolio sweep shard reports; the combiner parses flat/wrapped reports and writes a merged stress-benchmark-shaped report. Direct workflow consumers exist in residual confirmation, routing-regime sample, repair-reserve sample, broad confirmation, level-blind targeted sweep, high-budget sweep, stress refresh, and typical-budget baseline. The synthetic CLI harness is enrolled in `test:node`. **Compatibility owner:** package alias for NC-P09-006 only; direct old filenames in workflows cannot rely on it. |
| NC-P09-007/008 | **Targets:** maintained live corpus-output paths. The stress-refresh workflow writes them; typical-budget baseline copies/compares them; rank, stability, curation, baseline compilation, badness analysis, feature analysis, patching, clustering, and report-combination tools read them. `logs/stress-corpus{1,2}-baseline.json` contain current provenance/path strings and are current-reader inputs, not automatically frozen. Historical archive payload names stay frozen. No canonical-path collision exists on this base. |

### Coverage, gaps, and hazards

- The combiner has **representative synthetic real execution** through
  `portfolio-sweep-reports-to-benchmark-node-test.mjs`; this is the strongest Phase-9 boundary.
- Package and workflow entrypoint references have **structural validation only**. No current test
  invokes the three old package aliases through `npm run`, verifies temporary alias parity/conflict
  behavior, or dispatches the stress-refresh/typical-budget workflows.
- `solver:bench` logic has real use in development but is not part of ordinary `ci`; comments saying
  CI is green must not be treated as solved-set-regression execution.
- The maintained-output writer/reader chain is effectively **synthetic/structural**, not an actual
  end-to-end refresh in CI. Inline workflow JavaScript contains raw paths that the current workflow
  validator does not semantically classify.
- `solver:bench` appears as descriptive terminology inside module comments. Those are current docs,
  not executable consumers, but leaving them creates misleading residue.

### Batch design and order

The single Phase-9 PR remains feasible, but use consumer-inward substeps: (1) baseline the combiner
fixture and both live output shapes; (2) change workflow/direct consumers and current docs; (3)
atomically switch files and canonical package aliases; (4) exercise canonical commands; (5) remove
temporary aliases only at owning-phase closeout; (6) census frozen paths separately. Do not split
NC-P09-005 from NC-P09-006, or NC-P09-007/008 from their stress-refresh writers/readers. NC-P09-004
is independently switchable but too small to justify a separate compatibility owner.

**Still recommended before/same batch:** a rename-neutral package-command smoke helper, an exact
workflow inline-path inventory for the two maintained outputs, and a temporary-directory stress
report writer -> combiner -> current-reader smoke. **Plan/ledger amendment:** none. **Readiness:**
**ready after Phase 8**, subject to a new-main delta census.

## Phase 10 — repair/prune/budget terminology

**Rows:** NC-P10-001 through NC-P10-008. NC-P10-001–007 remain live. NC-P10-008's definition is
already superseded by the canonical `StageBudgetPolicyId` value; only its permanent historical-read
audit remains.

### 10A repair/prune graph

- NC-P10-001 is defined and called in `modules/solver/repair-search.ts`. It crosses ablation config,
  repair orchestration, result/status text, the classifier CLI, five focused repair tests, and a
  provisional deep enabled/disabled witness. This is a search helper rename, not permission to
  alter completion eligibility, bounds, reconstruction, or attempt ordering.
- NC-P10-003 is the central `modules/solver/prune-gauntlet.ts` module. Import consumers include
  solver search/repair code and multiple stress probes (portal parity, must-cross structure,
  prune-gap and offline replay). Term consumers also include hint enumeration, future-work docs,
  archaeology/probe output, and comments.
- The canonical helper/file names have no same-concept implementation collision. Incidental words
  such as generic “completion” and “pipeline” are unrelated retained vocabulary.
- Coverage is strong for repair behavior (**real Vitest execution**, including deep proofs) and
  prune functions (**real unit/proof execution**), but several stress probe imports are only
  structural/type/lint covered and are not in `test:node`. A file rename can therefore pass solver
  tests while breaking a bundled probe.

### 10B budget graph

- NC-P10-005 remains the `6.0` constant in `stage-budget.ts`; it is consumed in orchestration and
  referenced by tests, benchmark/direct repair tooling, parallel race transport, and budget docs.
- NC-P10-006 is a high-risk `SolveOpts`-family option. The option is manually forwarded through
  `req-length-sweep`, `portfolio-solve-sweep` parent/worker, stress benchmark/reducer, and
  `solver-parallel/race`; orchestration/stage-budget resolve the local NC-P10-007 value. Any one
  reconstructed object dropping the field silently changes resource allocation.
- Existing `check:solveopts-transport-parity` is **structural parity validation** and the portfolio
  worker/race tests provide **representative synthetic execution**. Orchestration and stage-budget
  tests provide real resolution/amount assertions. Real CLI paths and GHA configurations remain
  uneven: no aggregate gate proves every explicit override reaches the solve unchanged.
- This audit extends the existing forked-worker Node harness with a **structural reconstruction
  ratchet** for the current repair override: it proves the portfolio parent, forked worker, and race
  pool all name the same option at their manual object boundaries. It deliberately does not claim
  behavioral execution of a repair-eligible raced fixture; that remains the stronger recommended
  follow-up.
- The newer budget architecture has not removed these symbols. It has changed their context:
  `repair-fallback` now derives its additive work dose from resolved base work via
  `scaledStageWorkBudget`; Phase 10 must preserve that architecture and must not reintroduce an
  ms-derived allocation or reinterpret the value as a whole-solve fraction.
- NC-P10-008 is **superseded definition work**: `stage-policy.ts` already declares
  `additive-wall-multiplier`. Legacy `additive-fraction` occurs only in naming authorities/process
  history on this base; no live historical parser hit was found. Because absence by search is not
  proof, the implementation record should inspect historical report readers before closing the
  permanent-read obligation, but must not recreate a legacy runtime value.

### Batch design and order

Keep 10A and 10B separate. Within 10A, the repair helper and prune module are behaviorally
independent and could be 10A1/10A2 if the import census grows; they do not need atomic switching
with each other. Within 10B, NC-P10-005/006/007 must switch together from the option definition
outward through every transport. NC-P10-008 is a closeout audit, not an implementation switch, and
may close with 10B only after its owner is identified.

Recommended order: 10A prune imported probes baseline -> prune file/import switch -> real bundled
probe smoke; 10A repair test baselines -> helper/status switch -> deep repair parity; then 10B
transport-shape baseline -> consumer updates -> option/local/constant atomic switch -> transport
parity and full solver CI -> historical policy reader audit. **Still recommended:** add a
rename-neutral end-to-end explicit repair-override sentinel through portfolio parent/worker and race
transport using a repair-eligible fixture, and bundle-smoke one prune probe. **Preparatory check
added:** the parent -> worker -> race repair-option reconstruction ratchet described above.
**Proposed amendment:** clarify NC-P10-008 as
“verification-only unless a historical reader is found”; do not change its mapping. **Readiness:**
10A **ready with probe smoke**; 10B **not ready** until coordinated against the budget workstream's
then-current `main` and explicit override transport is proven.

## Phase 11 — application orientation versus level variant

**Rows:** NC-P11-001 through NC-P11-005. All concepts are live, and `orientation` already has many
unrelated/same-domain uses. This is target occupancy, not proof that the migration happened.

### Runtime contract graph and classification

- **Definition/state:** `EngineState.variant` and `createEngineState`; state action `setVariant`;
  engine facade exposure; level-flow reset/load paths; options controller orientation selection.
- **Geometry:** `modules/domain/geometry.ts` transform/inverse-transform functions accept the runtime
  transform selector. `level-utils.ts` re-exports/wraps them. Geometry tests exercise all transforms.
- **Input:** pointer coordinates flow through `levelUtils.getGridCoord`, whose inverse transform must
  agree with render orientation. Options controls call the setter. Editor grid rotate/mirror is a
  different operation: it mutates level coordinates rather than changing the runtime view, but its
  parity is required because it shares transform concepts.
- **Render/UI:** `create-render-model.ts`, `render-layers.ts`, `renderer.ts`, and `layout-ui.ts` read
  `eng.variant`; guide cards/debug/UI labels include transform wording.
- **Persistence/reset:** runtime orientation is reset/set by level flow and state actions. No stable
  serialized raw-level field named `variant` was found, so the ledger's compatibility transition
  appears to concern runtime/debug-state consumers rather than raw level data. Confirm browser
  session storage and external `window.APP.State.ENGINE` users at batch entry.
- **Retained:** solver/research “level variant”, family variant IDs, hint provenance variants,
  editor palette object variants, CSS palette variants, and generator variants. These are not
  orientation and must remain unchanged.
- **Ambiguous:** `computeVariantPopupPosition` is an editor palette popup, not a geometry
  orientation; retain it. Solver `variant` hits are level/search variants; retain them.
- **Collision:** `orientation` is already correctly used in geometry docs/types and research prose.
  Most are same-concept footholds or unrelated descriptive uses; there is no conflicting
  `EngineState.orientation`/`setOrientation` implementation on this base.

### Coverage and batch design

Geometry transforms have **real exhaustive unit execution**. State actions, level flow, render-model
creation, and editor transform cores have real unit coverage. Browser coverage proves basic editor
palette/grid sizing and gameplay reset, but runtime orientation control, inverse pointer mapping,
rotate+mirror composition, orientation reset across level navigation, and render/input agreement are
**effectively uncovered in browser execution**. Typecheck alone will not catch `any`-typed manual
objects or raw property reads in renderer/controller tests.

Keep 11A/11B/11C. 11A should add only current-name behavior tests: eight-way render/input round-trip,
pointer inverse transform at corners/non-square viewport, level load/reset orientation, and editor
rotate/mirror path + directional-landmark preservation. 11B must atomically migrate NC-P11-001–004
across state/action/geometry/level-utils/engine/render/input/UI; NC-P11-005 follows in current docs.
Do not split state from render/input or forward from inverse transforms. 11C must run on merged
`main`, separate retained research variants from runtime residue, and inspect the public debug facade.

**Preparatory tests added:** `modules/level-utils.test.ts` now exercises render-transform -> canvas
pointer -> inverse-transform parity for every cell under all eight transforms, including swapped
viewport dimensions. **Still recommended:** level load/reset orientation, editor rotate/mirror path
and directional-landmark preservation, and at least one focused Playwright flow. **Proposed
amendment:** clarify the compatibility owner's exact
surface (public debug facade/session state versus no raw persistence) after a storage trace; no
mapping change. **Readiness:** **not ready** until 11A lands and the compatibility surface is named.

## Phase 12 — command/event split

**Rows:** NC-P12-001 through NC-P12-004. All remain live.

### Graph and semantics

`modules/runtime/actions.ts` is the definition and syntactically mixes input commands (`MOVE`,
`UNDO`, `RESET`, level lifecycle/navigation) with step outcomes (`BACKTRACK`, `PORTAL_TRAVERSE`,
hazards, `WIN`, `LOGIC_STATE_CHANGE`). Current-main dataflow is narrower than the plan implies:

| Member family | Current producer/consumer classification |
| --- | --- |
| `MOVE`, `UNDO`, `RESET` | **Definition/test only.** No production `ActionType.<member>` consumer exists. Input controllers call engine/state APIs directly. |
| `LEVEL_LOAD`, `LEVEL_ADVANCE`, `LEVEL_PREV`, `LEVEL_RESTART` | **Definition/test only.** Level flow/navigation do not dispatch these constants. |
| `BACKTRACK`, `PORTAL_TRAVERSE`, `GOOSE_TRIGGERED`, `FALSE_GOAL_DETONATED` | **Definition/test only on this base.** Runtime step processing represents these outcomes through returned status/effects rather than these `ActionType` members. |
| `WIN`, `LOGIC_STATE_CHANGE` | **Live events.** `step-processor.ts` produces them and `engine/step-dispatcher.ts` consumes them in order. |

This is a specification-reconciliation issue, not permission to delete constants or invent new
dispatch. The Phase-12 record must decide whether NC-P12-001 means renaming intentionally retained
but currently unused command vocabulary, whether the dead members are removed as superseded
architecture, or whether the plan incorrectly assumes a command transport that no longer exists.
Likewise, four nominal event members are not live event transports. ADR 0006 explicitly says there
is no central reducer, and the naming phase must not create one merely to make the planned split look
architecturally symmetric.

`runtime/actions.test.ts` pins exact string values, including the definition-only members;
`step-processor.test.ts` pins emitted order and
payloads; engine dispatcher/controller tests exercise applied outcomes; gameplay Playwright covers
real move/reset/win flows. This is **real execution**, stronger than compile coverage. The weak point
is membership completeness: there is no single test proving every member belongs to exactly one new
set while preserving all stable discriminator strings, nor an explicit dispatcher trace proving the
same ordered event sequence reaches the same adapters.

Canonical `GameCommandType`/`GameEventType` do not collide. Generic `command`/`event` hits across
scripts, workflows, DOM events, solver dispatch, and effect dispatch are mostly unrelated retained
terms; only variables typed from the gameplay discriminator are targets. `EffectType` and runtime
effects are a distinct retained side-effect vocabulary.

### Batch design and order

Do **not** start the previously described atomic implementation until the dead-member disposition is
amended into the plan/ledger or explicitly confirmed as retained API. Once resolved, one Phase-12
batch is still preferable: first lock the current member set and the two live event paths; split the
definitions without changing string values; migrate the live event producer and consumer together;
then migrate only genuine command consumers (if any exist on then-current `main`) and update role
wording/glossary. Do not manufacture command initiators or an event bus. Do not split a live
definition change from `step-processor`/`step-dispatcher`, because temporary mixed imports would
conceal semantic half-migration.

**Still recommended:** a table-driven test that records the current member set, proves only `WIN` and
`LOGIC_STATE_CHANGE` traverse the event boundary, and pins their ordering/payloads/resulting
mutations. **Proposed plan/ledger amendment:** reconcile NC-P12-001 and the definition-only portion of
NC-P12-002 with the no-command-dispatch architecture; record each dead member as retained API or
superseded rather than pretending it has a producer/consumer. The canonical mappings themselves need
not change unless that reconciliation proves the split concept obsolete. **Readiness:** **not ready**
until this specification question is resolved; the two live events are otherwise well covered.

## Phase 13 — normalized level metric fields

**Rows:** NC-P13-001 through NC-P13-004. All remain live. Raw NC-P13-003/004 are permanent retained
wire fields; normalized NC-P13-001/002 are the implementation targets.

### Producer / parser / transport / consumer map

- **Raw producers:** committed level/corpus JSON, random/topology/family generators, published-level
  importer, editor export/submission, Firestore data, fixtures, oracle/reference tools, and stress
  reducers. Their serialized keys remain `reqLen`/`reqInt`.
- **Boundary owner:** `modules/domain/level-codec.ts`. `parseRawLevel` currently copies raw keys onto
  `EngineLevel`; `denormalizeLevel`/`buildWireLevelData` write them; `canonicalCloneLevel` also copies
  the normalized object using the raw spellings. `level-schema.ts` currently gives both `RawLevel`
  and `EngineLevel` the same field names, which is the central leakage Phase 13 must separate.
- **Normalized transports:** engine state/current level/editor working clone, render model, review and
  submission objects, solver `NormalizedLevel`, worker payloads, portfolio/parallel solve calls, hint
  tooling, and manually built test levels. Many are structurally typed or `any`, so a missed property
  can become `undefined` without a type failure.
- **Runtime consumers:** game rules/win checks, path validation, renderer/UI/editor previews, level
  rating/review/submission, false-goal scans, domain fingerprints, novelty and provenance, solver prep,
  bounds, scoring, topology, attempts, search/repair, and hint enumeration.
- **Script consumers:** corpus query/family analysis/generation, req-length sweeps, portfolio worker,
  reference/oracle tools, technique census, stress analyses/probes/generators. Several scripts parse
  raw JSON directly and should retain raw names; others receive normalized levels and must migrate.
  Classification must be dataflow-based, never directory- or extension-based.
- **Fingerprint:** `level-fingerprint.ts` and script identity/grouping consumers are behavior-critical;
  the canonical fingerprint bytes must remain identical even though the in-memory property names
  change.
- **Compatibility:** exactly one raw-to-normalized/read and normalized-to-raw/write owner. Raw names
  in downstream normalized consumers are defects after 13B; raw generators and frozen fixtures are
  retained, not residue.
- **Target occupancy:** expanded names appear only in naming authorities/current vocabulary prose on
  this base; no conflicting runtime fields were found.

### Coverage and gaps

The codec, schema validation, round trip, fingerprint, editor export, domain validation, solver, and
many generators have **real Vitest or Node synthetic execution**. `check:level-data-validity` and the
data-asset runtime smoke parse real shipped data. This is broad but not complete: the census found
well over one hundred source/script files with raw spellings, many research probes not enrolled in
`test:node`; worker/manual-object paths frequently use loose typing; Firestore/editor browser
round-trip coverage is partial; and no current invariant rejects raw-field access outside explicitly
raw types/boundaries.

### Batch design and order

Keep 13A/13B/13C and do not split the two normalized fields: they travel together in every level
shape and splitting doubles mixed-shape risk. 13A should lock (a) byte/semantic wire round trip,
(b) canonical fingerprint parity, (c) real samples from published/stress corpora, (d) editor export,
(e) worker/manual-object transport, and (f) an allowlisted architecture check identifying where raw
field access is legal. 13B should update types/parser first in one atomic branch, then domain,
solver/workers, state/editor/render/UI, scripts classified as normalized, and finally denormalization
writers. 13C should audit consumers inward on merged `main`, prove raw fixtures still read/write, and
require zero non-allowlisted raw leakage.

**Preparatory tests added:** `modules/domain/level-codec-roundtrip.test.ts` now pins the complete raw
parse -> canonical runtime clone -> wire serialization transport for both challenge metrics and
asserts that the current wire output contains exactly its two established metric keys. This is a
before-change boundary baseline, not authorization for a future field. **Still recommended:** a
fingerprint golden based on semantic content, representative corpus parsing, and an
allowlist-capable raw-field-boundary checker (initially checking current behavior, not future names).
**Proposed amendment:** none to mappings; the eventual phase record should explicitly classify
every script hit as raw or normalized before 13B. **Readiness:** **not ready** until 13A and the
raw-access ownership inventory exist. This is the highest-risk remaining migration.

## Phase 14 — application facade/state cleanup

**Rows:** NC-P14-001 through NC-P14-010. NC-P14-001–008 are live targets. NC-P14-009/010 are
intentional retained terms and must not be “cleaned up.”

### 14A core extraction

`modules/core.ts` produces DOM lookup, mode/axis/status constants, `deepClone`, and the mutable sound
bus; `createCore` assembles and returns the bag. `app.ts` is the composition root and wires the muted
provider. Engine level/hazard/step/win controllers, options, renderer/UI, editor, tests, and app
facade consume subsets, often by passing the whole bag. `SOUND_BUS` has real controller/app tests,
but browser audio unlock/mute behavior is weaker and environment-dependent. Extract constants and
audio by ownership, migrate consumers inward, and delete `core.ts` only after direct-import and
composition-root censuses are empty. NC-P14-001/002/003 must remain one architectural sequence;
deleting the bag before direct dependencies exist is unsafe, while leaving a forwarding facade after
closeout defeats the row.

### 14B level-utils facade

`modules/level-utils.ts` composes cell-key, geometry, codec, validation, fingerprint, game rules,
portal/landmark helpers, and mutable current-level access. `app.ts` constructs it and passes it across
engine/input/editor/render/UI; domain and facade tests import it directly. This is not a simple file
rename. Direct imports must follow domain ownership and injected current-level access must be replaced
without introducing browser dependencies into domain/runtime/solver. Existing domain/level-utils
tests execute behavior, and architecture/type checks validate imports, but many consumers are typed
through `RequireDeps<'levelUtils'>`; compilation will not by itself prove equivalent composition.
Keep this separate from 14A and delete only after an exact import/constructor/dependency census.

The current facade member groups already reveal the safe ownership direction:

| Facade members | Intended existing owner / special constraint |
| --- | --- |
| `PACK`, `UNPACK`, `inBounds` | `domain/cell-key.ts` direct pure imports |
| `transformPoint`, `inverseTransformPoint`, `transformAxis` | `domain/geometry.ts`; coordinate and inverse-coordinate consumers switch together with Phase 11 |
| codec/clone/bounds/remap helpers | `domain/level-codec.ts`; do not collapse Phase-13 raw/normalized ownership into 14B |
| `validateRawLevel` | `domain/level-schema.ts` at the raw-input boundary |
| portal helpers | `domain/portal-utils.ts` |
| `isValidMove` | `domain/move-rules.ts` |
| `getGridCoord` | browser/input adapter that combines canvas, viewport, active state, and inverse geometry; it cannot move into browser-free domain code |
| `normalizeLevel` / `getRawLevels` | application data adapter around `data.getLevels()`, validation reporting, parsing, and shallow freezing; direct domain imports alone do not replace it |
| `shiftLevelCoords` / `applyCoordMapToLevel` | editor/application orchestration over domain remapping; preserve hint clearing and directional reflection behavior |

Therefore “direct domain imports” is sufficient for the pure facade members but not a complete design
for the five application adapters above. The 14B preparation record must name their new direct owner
before deleting the facade; otherwise implementers may push DOM/state access into `domain/` merely to
make the file disappear.

### 14C state/UI names

- `HinterState` is defined in `state-slices.ts` and referenced by editor history/state creation;
  runtime reads flow through overlay/render/solver/UI controllers. This is low semantic risk but shares
  state fixtures with NC-P14-006.
- Mutable `state.ENGINE` is the top-level `AppState` property and crosses virtually every controller,
  state action, renderer, editor, app facade/debug API, tests, browser assertions, ESLint architecture
  rule fixtures, startup smoke, typing/ADR docs, and comments. The public `window.APP.State.ENGINE`
  getter is an external/debug compatibility risk not explicitly granted a compatibility alias.
- `publicDrawPath` is internal to renderer construction and exposed as `drawPath`; distinguish the
  internal helper target from the retained renderer-port method name unless the phase record proves
  both are authorized.
- `pendingAction` is `RuntimeState`'s queued confirmation callback; navigation controller produces/
  consumes it and runtime actions mutate it. It is described as session-persisted, but a callback
  cannot be serialized normally; trace the actual session persistence selector before calling this
  a persisted key.
- Existing state-action, engine-controller, render and app tests are **real unit execution**; startup
  smoke executes a representative app graph; Playwright reads the public `ENGINE` facade and covers
  some reset/editor behavior. Confirmation-flow state and full browser facade behavior remain weak.
- This audit adds a rename-neutral renderer contract test that exercises the existing public
  `drawPath` port and `getScreenPos` across all eight transforms, proving both use identical current
  state and pixel projection. This directly protects NC-P14-007's behavior while leaving its future
  spelling untouched.
- A second rename-neutral facade test locks NC-P14-008's actual callback lifecycle: set preserves
  callback identity, execute invokes without implicitly clearing, explicit clear removes it, and
  execute after clear is a no-op. Future implementation must preserve those semantics unless a
  separately authorized behavior change says otherwise.

NC-P14-006 is large enough to deserve 14C2 after 14C1 (`HinterState`, renderer helper, confirmation
field), unless the execution-record impact map proves shared atomic ownership. These symbols do not
need to switch together semantically. Splitting reduces the largest cross-domain batch without
changing ledger mappings. However, all `ENGINE` state/action/controller/render/debug consumers must
switch atomically within 14C2; do not retain an unowned alias.

### 14D closeout, coverage, and order

Recommended order: 14A extract/test audio and constants -> migrate composition/consumers -> delete
core facade; 14B inventory facade member owners -> direct imports/dependencies -> delete facade;
14C1 rename the three independent local state/render helpers with focused tests; 14C2 baseline public
facade/state behavior -> atomically migrate AppState/actions/controllers/render/tests/lint rule/docs;
14D merged-tree architecture, startup, browser, and residue audit. Keep ADR-qualified `*-core.ts`
modules and `state/actions/core-actions.ts` exactly as retained NC-P14-009/010.

**Preparatory tests added:** `modules/renderer.test.ts` locks path-helper/screen-position transform
parity for all eight current transforms, and `modules/engine-facade.test.ts` locks queued-confirmation
callback lifecycle through the real engine facade. **Still recommended:** audio mute/unlock adapter
unit test and browser debug-facade/reset smoke. **Proposed amendment:** split
14C into 14C1/14C2 in the future phase record; clarify whether
the public debug `State.ENGINE` spelling is intentionally part of NC-P14-006 or needs an explicit
compatibility policy. **Readiness:** 14A/14B **ready after member inventories**; 14C **not ready**
until public-facade and persistence ownership are resolved.

## Cross-phase handoff

| Question | Finding |
| --- | --- |
| Highest risk | Phase 13: the same two raw spellings are intentionally permanent on wire data but must disappear from a very broad, loosely typed normalized graph. Phase 11 is next because render and inverse input transforms must switch together. |
| Weakest validation boundary | Actual GitHub workflow execution and inline shell/JavaScript path/config propagation. Current checks prove selected paths exist, not that dispatch inputs and output consumers agree. |
| Be most conservative | Phase-10 explicit budget override transports; Phase-11 state/render/input atomicity; Phase-13 raw-versus-normalized classification; Phase-14 public mutable-state facade. |
| Straightforward after reconciliation | Phase-9 direct runner/package aliases, Phase-10 prune module imports, Phase-12 discriminator split, Phase-14 local type/helper names. |
| Largest time reducer | Land rename-neutral boundary fixtures before each atomic switch, then use allowlisted residue checks generated from the phase impact map. Phase 13 especially benefits from mechanically classifying each hit as raw or normalized before editing. |
| Superseded work | NC-P10-008's runtime definition is already canonical; only historical-reader verification remains. No other Phase 9–14 ledger target was found already implemented. |
| Frozen/retained discipline | Do not rewrite archive/report/log/corpus history merely to clear search. Retain research level variants, raw level wire keys, qualified ADR `*-core.ts` modules, and `state/actions/core-actions.ts`. |

Before any implementation, rerun both old and target searches against the selected batch, inspect
changes since this audit base, resolve target occupancy, and record every newly added consumer in the
batch execution record. This audit intentionally leaves the ledger and `activeExecution` untouched.

# Narrow support-gap closure pass (2026-08-30)

This section is the second preparation pass on merge `360f9dab` (PR #1591). It does not supersede
or repeat the broad census above. No future row was claimed or renamed, and the ledger execution
state remains unchanged.

## Phase 12 specification amendment and complete member disposition

The runtime trace confirmed that input controllers call grouped engine ports (movement, undo, reset,
level navigation), which in turn call controllers and state actions directly. `computeStep` is the
only production `ActionType` producer and `createStepDispatcher` is the only production consumer.
The dispatcher preserves array order: it applies `LOGIC_STATE_CHANGE` through `setLogicState`, calls
`onWin` for `WIN`, and delegates `EffectType` descriptors to the effect runner. Browser movement and
reset therefore exercise the direct controller path, not an `ActionType` command transport.

| Current member | Production producer | Production consumer | Honest disposition before Phase 12 |
| --- | --- | --- | --- |
| `MOVE`, `UNDO`, `RESET` | none | none | definition/test-only command-shaped API vocabulary; superseded by engine/controller ports unless an external owner is identified |
| `LEVEL_LOAD`, `LEVEL_ADVANCE`, `LEVEL_PREV`, `LEVEL_RESTART` | none | none | definition/test-only lifecycle vocabulary; superseded by level/navigation controllers unless an external owner is identified |
| `BACKTRACK`, `PORTAL_TRAVERSE` | none | none | definition/test-only event-shaped vocabulary; live behavior is a `computeStep` outcome/mutation |
| `GOOSE_TRIGGERED`, `FALSE_GOAL_DETONATED` | none | none | definition/test-only event-shaped vocabulary; live behavior uses `EffectType` plus outcome/mutation |
| `LOGIC_STATE_CHANGE` | `computeStep` | step dispatcher | live event; payload-bearing and order-sensitive |
| `WIN` | `computeStep` | step dispatcher | live event; order-sensitive |

This materially contradicted the old implication that all named commands and events had symmetric
transports. Section 4.12 and ledger rows NC-P12-001–004 now state the conditional disposition: migrate
the two live events, and retain definition-only names only if implementation-time current main finds
a concrete external API owner; otherwise remove superseded definitions. The amendment preserves the
command/event semantic distinction without inventing a bus. `runtime/actions.test.ts` now pins the
complete current member set and explicitly identifies the two live step-event discriminators.
Phase 12 is **specification-ready**, but its execution record must repeat the narrow producer/consumer
census and record the disposition of each definition-only member before editing.

## Phase 13 boundary evidence

The codec golden now compares canonical fingerprint source across raw input, parsed runtime data
(re-serialized at the boundary), canonical clone, and wire output. A second test reads one real
representative from each maintained source (`data/levels.json`, corpus1, corpus2), parses and clones
it, and verifies both challenge metrics and fingerprint semantics survive. This closes the semantic
golden and representative-data gaps without introducing future fields.

`npm run check:level-metric-boundaries` now provides the mechanical raw-access inventory. The
reviewed manifest `docs/naming-cleanup-level-metric-boundaries.json` explicitly lists every current
non-frozen file as raw/wire boundary, normalized consumer, or `ambiguous/unclassified`; the checker
rejects new unclassified hits, duplicate ownership, and stale entries. Frozen evidence is counted
separately rather than copied into the mutable manifest. Script/workflow hits remain explicitly
ambiguous rather than pretending directory location proves dataflow. Its deliberately failing future mode,
`node scripts/audit-level-metric-boundaries.mjs --require-normalized-clean`, is the 13B gate: raw
boundary and frozen hits remain legal while any normalized-runtime raw spelling fails. The exact
ownership map is allowlist-capable through reviewed manifest entries; 13B must refine the printed
script list at file-and-context granularity before switching fields. Current ambiguous owners remain
manual worker/test objects and scripts that alternately consume raw corpus documents and parsed
levels. The portfolio worker fixture now also sends three otherwise-identical manual raw objects
through the real parent -> forked worker -> nested race path: the valid metric pair solves, while
changing only `reqLen` or only `reqInt` makes the same adjacent-goal topology unsatisfiable. This
behaviorally proves both challenge metrics survive the real transport and constrain the downstream
solver. Phase 13A is **ready**; refining ambiguous script ownership remains the first 13B execution-
record task before the atomic switch.

## Phase 11A compatibility and persistence conclusion

The narrowed live search separates runtime orientation targets (`state.ENGINE.variant`, its state
action, geometry, renderer, input option, level-flow reset/load consumers) from retained terms:
research level variants, solver technique variants, editor palette variants, and frozen history.
No persistence repository or session serializer writes runtime `variant`; it is authoritative only
for the live level-flow state and is reinitialized by state construction. `window.APP.State.ENGINE`
is intentionally a live-reference debug facade today (`app.test.ts` pins identity), but no published
compatibility/version contract was found. Phase 11B must migrate that debug exposure atomically with
the runtime state rather than add a second spelling; documentation should continue to call it debug,
not persisted API.

Existing geometry and PR-1591 transform/input parity cover the eight transforms. The level-flow
characterization proves a play load selects the runtime transform, reset preserves it, and editor
load returns to canonical transform zero. `editor-coordinate-transform.test.ts` now exercises the
real editor orchestration seam for rotation followed by reflection: navigation path and pending
portal keys follow the map, portal endpoints remain paired, filter axes rotate, landmark chirality
is preserved by rotation and reversed by reflection, stale hints/false-goal results clear, and the
editor/viewport side effects run. `tests/editor.spec.mjs` adds the focused browser flow: it activates
the real rotate/mirror buttons, checks the transformed goal and portal pair through the debug facade,
then projects the goal to canvas coordinates and confirms `getGridCoord` maps the pointer back to the
same cell. Phase 11A is **prepared pending browser execution**; the flow could not execute in this
container because the Playwright Chromium binary was absent and the browser CDN returned HTTP 403.

## Phase 10B transport conclusion

The current budget model has not superseded the Phase-10 repair/prune mappings. The portfolio worker
test now supplies a repair-eligible raw fixture and an explicit `repairBudgetFractionOverride` through
the real parent process -> forked portfolio worker -> nested race worker path. It proves a
`repair-fallback` attempt is reached and that its reported `allocatedBudgetMs` reflects the supplied
fraction after dispatch elapsed time. The input object contains neither an alternate sibling nor a
fabricated legacy field, while the earlier structural assertions still pin both manual reconstruction
sites. This closes the prior structurally-only limitation without changing allocation policy.

Batch structure should refine 10A into **10A1 repair terminology** and **10A2 prune terminology**:
they have independent owners and correctness gates. This is a rowless execution-record subdivision,
not new ledger rows. Keep 10B separate.

## Phase 14 complete facade ownership map

Every `core.ts` return member has an explicit destination:

| Members | Post-facade owner |
| --- | --- |
| `$` | browser/UI consumer-local DOM lookup adapter |
| `AXIS`, `H`, `V`, `NONE`; `MODES`, `PLAY`, `EDITOR`, `REVIEW`; `LogicStatus` and destructured statuses; `OverlayStatus` and destructured statuses | direct application constants import |
| `DEV` | application/composition-root configuration; delete if the closeout census confirms no consumer |
| `SOUND_BUS` | composition-root audio service dependency; mute provider and unlock/error behavior remain adapter contracts |
| `deepClone` | direct pure helper import or native clone at the owning application consumer; not an audio/constants concern |

Every `level-utils.ts` return member is classified below:

| Members | Post-facade owner |
| --- | --- |
| `PACK`, `UNPACK`, `inBounds` | direct `domain/cell-key` import |
| `expCoords`, `resolvePortal`, `getPortalDisplayColor`, `hasParitySwitchingPortal`, `getParityInvalidKeys` | direct `domain/portal-utils` import |
| `transformPoint`, `inverseTransformPoint`, `transformAxis` | direct `domain/geometry` import, atomically coordinated with Phase 11 |
| `canonicalCloneLevel`, `deepCloneLevel`, `cloneLevelWithReq`, `denormalizeLevel`, `getLevelBounds`, `assertLevelShape`, `normalizeMetadata`, `processRawLevel` | direct `domain/level-codec` import, coordinated with Phase 13 boundary ownership |
| `isValidMove` | direct `domain/move-rules` import |
| `getGridCoord` | browser/input adapter (canvas + viewport + active-state + inverse-transform dependency) |
| `normalizeLevel`, `getRawLevels` | application data-loading service (data port, validation reporting, parsing/freezing policy) |
| `shiftLevelCoords`, `applyCoordMapToLevel` | editor application adapter over domain remapping; preserves hint clearing, axes, and chirality |

`activeLevel`/mutable current-level access is a state/controller concern and must not be pushed into
browser-free domain code. `pendingAction` is not persisted: it stores a callback in runtime memory,
and the real facade test pins set/execute/explicit-clear identity and lifecycle. `publicDrawPath` is
the renderer's state-bound adapter around the separate pure `render/draw-path.ts` function; the
public port remains `drawPath`, so the two are distinct contracts. `window.APP.State.ENGINE` is a
live debug convenience intentionally exposed by current code/tests, not a serialized compatibility
surface; Phase 14 still needs an explicit remove-or-migrate decision rather than an alias.

Split 14C as **14C1** (local `HinterState`, renderer adapter helper, pending callback) and **14C2**
(the atomic `ENGINE` state/action/controller/render/debug surface). Keep 14A and 14B separate because
the latter is blocked on application-adapter destinations, and keep 14D rowless closeout. Phase 14A
and pure portions of 14B are ownership-ready. `core.test.ts` now pins the current audio adapter's
mute-before-synth behavior and its one-shot pointer/keyboard/touch unlock registration without
changing audio ownership. `tests/security.spec.mjs` adds the public debug-facade reset smoke: the
live `ENGINE` object retains identity, the level reloads, runtime transform is preserved, reset
streak advances, and navigation is cleared. Like the Phase-11 browser flow, it awaits execution in
an environment with the Playwright Chromium binary.

## Phase 9 workflow conclusion

Phase 9 preparation correctly identified `stress:benchmark:raced` as a distinct package identity,
but the implementation did not convert that warning into a ledger row before renaming it. The
post-merge repair owns that mapping as NC-P09-009 and preserves this as a worked example of why
related surfaced identities cannot inherit authorization from a parent row.

The enrolled `naming-cleanup-phase9-command-smoke-node-test.mjs` pins the canonical package
identities and invokes the real speed-measurement npm alias with a zero-work temporary report. The
combiner node test provides synthetic shard writer -> combiner -> report-reader execution. The
post-merge repair additionally tests sparse large-blob repository reads and corpus-aware default
output naming. Structural workflow checks still do not prove remote semantic argument/output
agreement, so workflow-local inline shell/JavaScript paths remain part of consumer-inward closeout.

## Updated cross-phase status

| Phase | Readiness | Remaining blocker | New guardrail | Risk after prep |
| --- | --- | --- | --- | --- |
| 9 | mechanically prepared | implementation-time inline workflow reconciliation | real npm invocation, distinct-identity ratchet, synthetic combiner flow | low |
| 10 | 10A ownership-ready; 10B behaviorally prepared | implementation-time current-main reconciliation | real worker-hop allocation proof; recommend 10A1 repair / 10A2 prune separation | medium-low |
| 11 | prepared pending browser execution | run the checked-in focused flow where Chromium is available | load/reset, editor path/portal/axis/chirality, and render/input browser flow | medium |
| 12 | specification-ready | implementation-time dead-member API-owner census | amended plan/ledger plus exact member-set ratchet | medium-low |
| 13 | 13A ready, not switch-ready | script-hit refinement before atomic 13B | fingerprint golden, three real-data families, raw-access checker, real worker metric fixture | highest |
| 14 | ownership-ready pending browser execution | application-adapter extraction design and run checked-in debug smoke | facade maps, audio behavior, debug reset flow, 14C1/14C2 split | medium-high |

Preparation gates remain rowless: they are prerequisites and execution-record evidence, not fake
implementation ledger rows. None forces an atomic grouping beyond Phase 11 runtime state/render/input,
Phase 13's two normalized metrics, and Phase 14C2's `ENGINE` graph. At implementation time every
batch must rerun target occupancy and consumer searches, cite its immutable row IDs, and preserve the
serialization state reported by `npm run naming:status`.
