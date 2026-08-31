# Phase 12 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 12 — runtime command/event vocabulary |
| Batch | single row-bearing implementation PR; separate merged-tree closeout required |
| Status | entry-mapped |
| Base `main` SHA | `9b9eaa5c329b2f01f4db0a93116577577db96d63` |
| Branch | `chatgpt/phase12-runtime-events-2026-08-31` |
| PR | pending |
| Current PR head SHA | pending |
| Completed GitHub CI run / conclusion | pending |
| Tested PR merge/ref SHA | pending |
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

Pending.

## 7. Targeted contract validation

Pending.

## 8. Consumer-inward closeout audit

Pending after implementation. The pass will start at the dispatcher, tests, current glossary, and
direct controller flows and work inward toward the event definition rather than relying on the diff.

## 9. Behavioral/evidence parity

Pending targeted/full CI.

## 10. Residue and authority reconciliation

Pending post-implementation census. Expected legitimate `ActionType` hits after implementation are
the naming plan/ledger/execution history that describe the migration itself; no current runtime
definition or consumer may retain the umbrella.

## 11. Pre-merge barrier

Pending implementation, evidence, PR comparison, and exact-head GitHub CI.

## 12. Closure and merge handoff

Phase 12 will not advance `lastCompletedPhase` in the implementation PR. After its exact-green head
merges, a fresh branch from merged `main` must perform the distinct consumer-inward merged-tree
closeout, record implementation/closure evidence in `phaseClosures["12"]`, and only then mark the
phase closed and advance `lastCompletedPhase` to 12.
