# Phase 14 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 14 — application facade cleanup |
| Current batch | 14A core extraction |
| Status | in progress |
| Base `main` SHA | `8432f175b26934606355b0f4150912fabd84085a` |
| Branch | `chatgpt/phase14a-core-extraction-2026-08-31` |
| PR | #1624 |
| Selected ledger row IDs | NC-P14-001 through NC-P14-003 |
| Phase batch order | 14A -> 14B -> 14C1 -> 14C2 -> 14D |
| Highest phase risk | high (NC-P14-006 in 14C2) |
| 14A risk | medium |
| Implementation agent/session | ChatGPT GitHub session, 2026-08-31 |

### Entry preflight

- [x] Phase 13 is structurally closed and `lastCompletedPhase` is 13.
- [x] `activeExecution` is idle on current main.
- [x] no open Phase-14 naming-cleanup PR was found.
- [x] no Phase-14 branch was found.
- [x] branch starts from current main `8432f175b26934606355b0f4150912fabd84085a`.
- [x] canonical retained terms NC-P14-009/010 remain out of implementation scope.

## 1. Phase partition and merge barriers

Phase 14 is explicitly serial. No batch may be stacked on an unmerged predecessor.

1. **14A core extraction:** NC-P14-001/002/003.
2. **14B level-utils facade removal:** NC-P14-004.
3. **14C1 local state/render names:** NC-P14-005/007/008.
4. **14C2 atomic mutable application state graph:** NC-P14-006.
5. **14D merged-tree closeout:** rowless consumer-inward architecture/browser/residue audit, including
   retained-term proof for NC-P14-009/010.

Rows not owned by the active batch remain pending.

## 2. 14A reconciliation and ownership

Current `modules/core.ts` still constructs a mixed dependency bag containing:

- DOM lookup `$`;
- axis/mode/logic/overlay constants;
- `DEV`;
- mutable audio adapter `SOUND_BUS`;
- generic `deepClone`.

Current `app.ts` still calls `createCore`, passes the bag to state/UI/debug/renderer/LevelUtils/
editor/engine/input/loader/boot, wires the mute provider through `core.SOUND_BUS`, passes
`core.deepClone` into data, exposes `Core` on the opt-in mutable debug facade, and uses
`core.deepClone` for read-only diagnostics.

The future-phase preparation ownership map remains correct:

| Core member group | 14A destination |
| --- | --- |
| axis/mode/logic/overlay constants | direct imports from a dedicated application constants module |
| `DEV` | direct composition/application constant |
| `SOUND_BUS` | `audioService` from `modules/audio-service.ts`, injected only where sound is needed |
| `deepClone` | direct pure helper import |
| `$` | no shared facade; browser/UI consumers own DOM lookup locally |
| `createCore` | removed after all consumers receive direct dependencies |
| `modules/core.ts` | deleted after consumer census reaches zero |

No current consumer found a persistence or externally versioned owner for `createCore` or
`SOUND_BUS`. The mutable `window.APP` facade is debug-only; 14A removes its `Core` member rather
than retaining an unowned compatibility facade.

## 3. 14A behavior invariants

- audio remains muted before synth construction/playback;
- audio unlock listeners remain one-shot pointer/keyboard/touch listeners;
- Tone start/context-resume and first-play-error reporting semantics remain unchanged;
- initial state constants and every mode/logic/overlay comparison keep the same values;
- data cloning and read-only diagnostics preserve current structuredClone-with-JSON-fallback behavior;
- no browser-free domain module gains DOM or Tone dependencies;
- no qualified ADR `*-core.ts` file or `state/actions/core-actions.ts` is renamed or removed.

## 4. 14A validation topology

- dedicated audio service unit tests replace `core.test.ts`;
- application composition tests prove only `audioService` and direct helpers/constants are wired;
- state/engine/input/UI unit suites execute current constant-driven behavior;
- source and test TypeScript checks catch stale constructor signatures;
- architecture/text residue guard must prove `modules/core.ts`, `createCore`, and `SOUND_BUS`
  are gone from maintained current code after 14A;
- full CI and Chromium gate are required on the exact final 14A head.

## 5. 14A implementation log

Initial implementation removes the mixed `core` dependency bag from composition, state, UI,
renderer, editor, engine, input and their controller subgraphs.

New owners:
- `app-constants.ts` for immutable axis/mode/logic/overlay vocabulary and `DEV`;
- `audio-service.ts` for the former sound bus behavior;
- `deep-clone.ts` for the existing structuredClone/JSON fallback helper.

Audio is injected only into engine/input paths that actually play sound. Constants are imported
directly by their consumers. `app.ts` no longer constructs or returns a core facade, and
`createAppFacade` no longer exposes `Core`.

`modules/core.ts` and `modules/core.test.ts` are deleted. The extracted audio behavior has a
dedicated unit test, and `check:naming-cleanup-phase14-core-closeout` is enrolled permanently in
the validator graph. The first exact-head CI pass is expected to identify any remaining stale test
fixtures or indirect consumers; those will be repaired rather than allowlisted.

## 6. 14A validation

Pending.

## 7. 14B LevelUtils facade removal

Not started. Must branch from merged 14A main.

## 8. 14C1 local state/render names

Not started. Must branch from merged 14B main.

## 9. 14C2 atomic ENGINE graph

Not started. Must branch from merged 14C1 main. Public/debug `State.ENGINE` migrates atomically with
the state property; no compatibility alias is authorized.

## 10. 14D merged-tree closeout

Not started. Must branch from merged 14C2 main.

## 11. Final closure

Phase 14 remains incomplete until 14D is merged, NC-P14-001 through NC-P14-010 have complete
verification/disposition evidence, structured closure evidence is recorded, and
`lastCompletedPhase` advances to 14.
