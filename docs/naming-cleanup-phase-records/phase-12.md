# Phase 12 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 12 — runtime command/event vocabulary |
| Batch | single row-bearing implementation PR; separate merged-tree closeout required |
| Status | implementation validated; merge pending |
| Base `main` SHA | `9b9eaa5c329b2f01f4db0a93116577577db96d63` |
| Branch | `chatgpt/phase12-runtime-events-2026-08-31` |
| PR | #1617 |
| Current PR head SHA | behavior-bearing head `9be07095039b2ca5b80c89b81bf687b3f09c9adf`; final evidence-only head requires fresh CI |
| Completed GitHub CI run / conclusion | CI `33365919597` / success; conservatively triggered Chromium gate `33365919537` / success on behavior-bearing head |
| Tested PR merge/ref SHA | GitHub PR merge ref for the behavior-bearing revision; final evidence-only head is re-tested before merge |
| Selected ledger row IDs | NC-P12-001 through NC-P12-004 |
| Reconciliation mode | delta from the Phase-12 preparation census, with current-main producer/consumer confirmation |
| Highest risk in batch | medium |
| Primary compatibility owner | none; no command transport, persistence boundary, or external owner found |
| Canonical mapping | live `ActionType.WIN` / `ActionType.LOGIC_STATE_CHANGE` -> `GameEventType.WIN` / `GameEventType.LOGIC_STATE_CHANGE`; superseded definition-only members removed |
| Implementation agent/session | ChatGPT GitHub session, 2026-08-31 |
| Closeout auditor | implementation session for PR closeout; merged-tree closeout must be a distinct pass |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs;
- [x] searched similarly named Phase-12 branches;
- [x] no plausible predecessor/sibling Phase-12 branch contained unique work;
- [x] no recovery work was needed;
- [x] confirmed the ledger was idle and Phase 12 was the next incomplete phase;
- [x] confirmed the branch starts from the recorded current-`main` SHA.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| open PR search for “phase 12 naming cleanup” | none | no competing Phase-12 PR |
| branch search for “phase12” | none | no competing Phase-12 branch |

## 1. Scope, change envelope, and stop conditions

Phase 12 corrects the runtime vocabulary without creating architecture that does not exist. The current
`ActionType` object mixes two live emitted step events with command-shaped and outcome-shaped
definition-only constants. The preparation audit proved that gameplay/navigation requests call engine,
controller, and state-action ports directly and that there is deliberately no universal command bus.

### Change envelope

**Intended observable deltas**

- NC-P12-001: remove command-shaped `MOVE`, `UNDO`, `RESET`, and `LEVEL_*` constants because the
  current-main census still finds no production/external owner; do not create `GameCommandType`.
- NC-P12-002: replace the two live event discriminators with `GameEventType.WIN` and
  `GameEventType.LOGIC_STATE_CHANGE`; remove definition-only `BACKTRACK`, `PORTAL_TRAVERSE`,
  `GOOSE_TRIGGERED`, and `FALSE_GOAL_DETONATED`.
- NC-P12-003: classify as not-applicable after current-main confirmation that no command-typed
  transport/variable exists; do not manufacture one.
- NC-P12-004: keep the live producer/consumer variable named `event` and type it to the real step-event
  union rather than `any`.
- update current tests, command glossary, and ADR prose that presents `ActionType` as a command/event
  umbrella.

**Invariant observables**

- `computeStep` event array contents, ordering, payloads, outcomes, and mutations are unchanged.
- the step dispatcher still applies `LOGIC_STATE_CHANGE` synchronously, invokes `onWin` for
  `WIN`, and delegates `EffectType` descriptors to `runEffects` in array order.
- movement, undo, reset, and level navigation continue to use their existing direct engine/controller
  and state-action paths.
- no gameplay command bus, reducer, persistence schema, worker transport, or public protocol is added.
- state mutation helpers remain “state actions”.

**Out of scope / separate authorization**

- introducing a command transport or stable `GameCommandType` API without a concrete owner;
- changing effect identities or step outcomes;
- changing runtime behavior, event order, state mutation semantics, or persistence.

Stop if a real external/API owner for the definition-only constants is discovered, because that would
change the NC-P12-001/002 disposition and require compatibility ownership to be specified first.

## 2. Pre-edit impact map

The Phase-12 preparation audit was merged in PR #1591 (`360f9dabe7a64362a63c95a4012f3772117d7ded`).
It traced `computeStep` as the only production `ActionType` producer and
`createStepDispatcher` as the only production consumer.

Entry reconciliation compared that preparation point forward in bounded ranges through the Phase 8F,
8G, 8H, 9, 10, and 11 merge history. No later range introduced an `ActionType` production consumer,
command transport, or `GameCommandType`/`GameEventType` occupancy. The runtime definition itself
has not changed since 2026-07-02; `step-processor.ts` and `step-dispatcher.ts` have not changed
since 2026-07-10. The 2026-08-30 preparation change to `actions.test.ts` is the expected
definition-only/member-set ratchet.

### Current member disposition

| Current member(s) | Production producer | Production consumer | Phase-12 disposition |
| --- | --- | --- | --- |
| `MOVE`, `UNDO`, `RESET` | none | none | remove superseded definition-only vocabulary |
| `LEVEL_LOAD`, `LEVEL_ADVANCE`, `LEVEL_PREV`, `LEVEL_RESTART` | none | none | remove superseded definition-only vocabulary |
| `BACKTRACK`, `PORTAL_TRAVERSE` | none | none | remove; live semantics are `computeStep` outcomes/mutations |
| `GOOSE_TRIGGERED`, `FALSE_GOAL_DETONATED` | none | none | remove; live semantics are `EffectType` plus outcomes/mutations |
| `LOGIC_STATE_CHANGE` | `computeStep` | `dispatchStepEvent` | migrate to `GameEventType` |
| `WIN` | `computeStep` | `dispatchStepEvent` | migrate to `GameEventType` |

### Target occupancy / collision check

| Canonical target | Existing live use? | Classification | Disposition |
| --- | --- | --- | --- |
| `GameEventType` | no | unoccupied target | create for the two live step events |
| `GameCommandType` | no | unoccupied, but no owned live concept | do not create |

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `modules/runtime/actions.ts`, `step-processor.ts` | actions + step-processor unit tests |
| Internal direct consumer | migrate | `modules/engine/step-dispatcher.ts` | type-check + step behavior tests |
| Canonical parser / normalizer | not applicable | no parser | no persisted/transported identifier |
| Sequential transport | not applicable | no command/event bus | current-main census |
| Alternate worker/race transport | not applicable | none | current-main census |
| Serialized writer | not applicable | none | preparation/current-main census |
| Historical reader / fixture | retained | historical docs/commits only | no historical rewrite |
| Report/export projection | not applicable | none | census |
| Analyzer/grouping consumers | not applicable | none | census |
| CLI / package alias | not applicable | none | census |
| Workflow command/inputs/outputs | not applicable | none | census |
| Artifact/concurrency/cache/path identifiers | not applicable | none | census |
| Hint/provenance storage | not applicable | none | census |
| Application/UI/editor consumer | retained direct ports | input/engine/state-action paths | existing unit/full CI |
| Current docs/examples | migrate | `docs/command-glossary.md`, ADR 0006 | documentation-link check/manual audit |
| Frozen historical evidence | retained | reports/history/old commits | untouched |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| event vocabulary object | native TypeScript/Vitest | `modules/runtime/actions.test.ts` | direct | update exact member-set assertions |
| event production/order | pure runtime computation | `modules/runtime/step-processor.test.ts` | direct | preserve pre-existing event-shape/order assertions under new discriminator |
| dispatcher | engine adapter | unit coverage + type checker | indirect/direct typing | replace `any` event parameter with exported step-event type |
| direct command-shaped flows | input/controller/state action | existing application/unit coverage | direct/indirect | no transport change; full CI regression check |
| docs | current docs | documentation-link checker + manual review | structural/manual | update glossary/ADR current-state claims |

Targeted validation after implementation:

```sh
npx vitest run modules/runtime/actions.test.ts modules/runtime/step-processor.test.ts
npm run check:types
npm run check:types:tests
npm run check:documentation-links
npm run ci
```

GitHub PR CI on the exact final head is required before merge.

## 4. Compatibility and frozen-history ownership

All four Phase-12 rows have `persistence: none`. No legacy reader, wire value, session field,
external environment variable, workflow protocol, or public command bus owns `ActionType`.
Historical material that describes the old umbrella remains historical; current authoritative docs
are updated.

## 5. Before-change baseline

The preparation audit and the current source establish the behavior baseline:

| Observable | Before-change result |
| --- | --- |
| live gameplay event discriminators | exactly `LOGIC_STATE_CHANGE`, `WIN` |
| goose event order | jump-scare effect -> logic-state event -> sound effect |
| portal event order | sound effect -> logic-state event -> optional win event |
| plain winning move | sound effect -> win event |
| dispatcher semantics | logic state locally handled; win locally handled; effects delegated |
| command-shaped requests | direct engine/controller/state-action calls; no `ActionType` transport |

The existing step-processor tests are the executable behavioral baseline and must pass unchanged in
meaning after the vocabulary switch.

## 6. Implementation log

PR #1617 implements the reconciled disposition without adding a command transport:

- `modules/runtime/actions.ts` now exports `GameEventType` with exactly `WIN` and
  `LOGIC_STATE_CHANGE`; the seven command-shaped and four definition-only outcome/hazard members
  were removed.
- `computeStep` emits the same event/effect sequence under `GameEventType`; its exported
  `StepEvent` union now distinguishes the two gameplay events from `EffectType` descriptors.
- `createStepDispatcher` consumes `StepEvent` instead of `any`, handles the two
  `GameEventType` cases in the same order/branches as before, then delegates effects unchanged.
- runtime tests were migrated and strengthened to assert the exact two-member event vocabulary and
  explicit absence of the superseded members.
- `docs/command-glossary.md` now distinguishes direct controller requests, core outcomes,
  `GameEventType` events, `EffectType` effects, and state actions; ADR 0006 terminology was
  reconciled accordingly.
- `scripts/naming-cleanup-phase12-closeout.mjs` scans maintained modules/scripts/docs/workflows for
  retired `ActionType` or unowned `GameCommandType`, excluding only naming-migration/history
  authorities that must describe the legacy term. Its negative-fixture test is enrolled in
  `test:node`, and the guard itself is enrolled in `check:validators`.

No event value, payload, ordering branch, controller route, persistence boundary, worker protocol,
solver policy, or resource policy was changed.

## 7. Targeted contract validation

The first validation head exposed only test-type fallout from strengthening `StepEvent`: the test
suite deliberately compared typed discriminators against impossible raw strings, and one payload
assertion did not narrow the new union. Production `check:types`, build, lint, deep proofs, and
coverage were otherwise healthy. The tests were repaired without loosening the production type:
negative raw-string assertions now compare through `String(event.type)`, while the sound-payload
assertion keeps its runtime check explicitly.

On behavior-bearing head `9be07095039b2ca5b80c89b81bf687b3f09c9adf`:

| Validation | Boundary proved | Result |
| --- | --- | --- |
| GitHub CI run `33365919597` — checks | TypeScript source/tests, docs links, ledger, Phase-12 residue ratchet and other validators | success |
| same run — node-tests | enrolled Phase-12 negative-fixture guard plus repository Node tests | success |
| same run — deep-verification / coverage | complete Vitest coverage suite including actions + step processor behavior | success |
| same run — build | production compilation/bundle | success |
| same run — checks-lint | lint/style | success |
| same run — deep-proofs | heavyweight implementation proofs | success |
| Chromium gate `33365919537` | package-triggered Phase-11 orientation safety graph | success |

The Phase-12 closeout guard reported **691 maintained text surfaces** with no retired `ActionType`
umbrella or unowned `GameCommandType`. `check:types` and `check:types:tests` both passed on the
behavior-bearing head after the test repair.

## 8. Consumer-inward closeout audit

Implementation-branch consumer-inward pass completed before merge:

- `modules/engine/step-dispatcher.ts` consumes only `GameEventType.LOGIC_STATE_CHANGE` and
  `GameEventType.WIN`, with a typed `StepEvent` parameter; all other descriptors still flow to
  `runEffects`.
- `modules/runtime/step-processor.ts` is the only gameplay-event producer and emits exactly those
  two values. Their string values remain `LOGIC_STATE_CHANGE` and `WIN`, so the runtime payload
  shape is byte-for-byte compatible at the discriminator level.
- `modules/input/navigation-controller.ts` still handles previous/next level and undo through
  direct engine/state-action calls; it imports no runtime event vocabulary.
- `modules/engine/level-flow.ts` still owns load/reset directly and imports state actions rather
  than an event/command transport.
- `modules/engine.ts` still wires `processStep` directly to the step dispatcher and exposes the
  existing engine ports; no command bus was added.
- the repository-wide Phase-12 guard scanned 691 maintained code/script/doc/workflow text surfaces
  and found no live `ActionType` or `GameCommandType`.
- the updated command glossary describes controller requests, pure outcomes, gameplay events,
  effects, and state actions separately. Naming-plan/ledger/history files remain intentional legacy
  mentions because they document the migration.
- `EffectType.SCHEDULE_TIMER` retains its generic continuation payload; its factory has no current
  producer and is not a `GameCommandType` transport. A test-only timer fixture was changed from a
  fake `WIN` event to a neutral continuation object so the tests do not imply otherwise.

No unclassified consumer or compatibility owner was found. The required **merged-tree** consumer
audit remains a separate post-merge pass and therefore row `closeoutAudit` stays pending here.

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| live gameplay discriminator strings | `LOGIC_STATE_CHANGE`, `WIN` | same strings under `GameEventType` | exact |
| goose order | jump-scare -> logic-state -> sound | unchanged | exact by step-processor coverage |
| portal order | sound -> logic-state -> optional win | unchanged | exact by source diff + coverage |
| plain win order | sound -> win | unchanged | exact by step-processor coverage |
| dispatcher semantics | logic-state local; win local; effects delegated | unchanged with typed parameter | exact |
| move/undo/reset/level navigation | direct engine/controller/state-action paths | same paths | exact; no touched controller implementation |
| persistence/worker/protocol surface | none | none introduced | exact |

The canonical constant object changed, but the two live emitted string values and their payload/order
did not. Full coverage, build, Node tests, and deep verification are green on the behavior-bearing
head.

## 10. Residue and authority reconciliation

- delta reconciliation base: Phase-12 preparation merge `360f9dab...`, then bounded comparisons
  through Phase 8F/8G/8H, Phase 9, Phase 10, and Phase 11 to implementation base
  `9b9eaa5c329b2f01f4db0a93116577577db96d63`; no later production owner appeared.
- target occupancy: `GameEventType` was unoccupied before the change and is now occupied only by
  the intended definition/producer/consumer/tests/current docs. `GameCommandType` remains
  deliberately absent because no owner exists.
- `check:naming-cleanup-phase12-closeout`: pass, 691 maintained surfaces, zero live
  `ActionType`/`GameCommandType` residue.
- `check:documentation-links`: pass in CI run `33365919597`.
- current-main comparison immediately before the evidence update: base remained
  `9b9eaa5c329b2f01f4db0a93116577577db96d63`; behavior head was 17 commits ahead, 0 behind,
  with exactly the 12 Phase-12 implementation/evidence files.
- intentional legacy mentions are confined to naming plan/ledger/execution/history authorities that
  must describe the old spelling. Frozen artifacts were not rewritten.
- no new ledger row or specification amendment was required.

## 11. Pre-merge barrier

- [x] no predecessor Phase-12 branch/PR or duplicate work exists;
- [x] branch started from and remains reconciled with current `main` at the behavior checkpoint;
- [x] intended diff is non-empty and scoped to Phase 12;
- [x] no next-phase implementation is stacked;
- [x] behavior-bearing head passed ordinary GitHub CI `33365919597`;
- [x] behavior-bearing head passed the conservatively triggered Chromium gate `33365919537`;
- [x] all changed surfaced identities are owned by NC-P12-001–004 or explicitly not-applicable;
- [x] implementation, targeted validation, consumer audit, and behavioral parity evidence are recorded;
- [ ] final evidence-only PR head must complete fresh exact-head CI before merge;
- [ ] merged-tree closeout remains mandatory after #1617 merges.

Rows remain `in-progress` and `activeExecution` remains on #1617 because the established Phase
10/11 completion model keeps `closeoutAudit` pending until the separate merged-tree pass. The final
CI run for this evidence-only head is intentionally backfilled during merged-tree closeout rather
than creating a self-invalidating evidence loop.

## 12. Closure and merge handoff

Phase 12 does not advance `lastCompletedPhase` in implementation PR #1617. After its final
evidence-only head completes fresh exact-head CI and merges, a new closeout branch must start from
that merge commit, transfer `activeExecution` to the merged-tree pass, rerun the residue/consumer
audit and ordinary CI, and only then mark row `closeoutAudit` complete. A final evidence PR may
backfill the closeout merge commit/run before `phaseClosures["12"]` becomes `closed` and
`lastCompletedPhase` advances to 12.

| Item | Value |
| --- | --- |
| Implementation PR | #1617 |
| Behavior-bearing head | `9be07095039b2ca5b80c89b81bf687b3f09c9adf` |
| Behavior-head CI | `33365919597` / success |
| Behavior-head browser gate | `33365919537` / success |
| Implementation merged? | pending final evidence-head CI |
| Ledger rows closed | no; NC-P12-001–004 remain in-progress pending merged-tree closeout |
| Deferred/superseded rows | NC-P12-003 implementation is not-applicable because no command transport exists |
| Known structural-only surfaces | none in the live gameplay event path |
