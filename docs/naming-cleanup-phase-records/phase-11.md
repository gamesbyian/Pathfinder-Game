# Phase 11 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 11 — application orientation versus level variant |
| Current batch | 11A coverage/impact preparation |
| Status | 11A complete and merged; 11B not started |
| Base `main` SHA | `21cde93a05b251a4682f4aa09f88703d3d9a4d67` |
| Branch | `chatgpt/phase11a-coverage-preparation-2026-08-30` |
| Rows | NC-P11-001 through NC-P11-005 |
| Compatibility owner | engine-state and level-transform runtime/debug boundary |
| Research terminology | level/search/generator/editor-palette variants are retained and out of scope |

## 1. 11A change envelope

Phase 11 is application-wide and high risk because the same runtime transform selector crosses state,
geometry, inverse pointer input, layout, render, engine facade, and level-flow reset/load behavior.
11A is deliberately rename-neutral. It may add tests, execution evidence, and impact-map documentation,
but it must not introduce `EngineState.orientation`, `setOrientation`, compatibility aliases, dual
runtime fields, or other pieces of the 11B switch.

The behavior invariants locked before 11B are:

1. all eight runtime transforms map base cells to rendered cells and invert back exactly;
2. swapped viewport geometry agrees with transforms 1, 3, 6, and 7;
3. the real perspective control cycles the runtime selector through all eight values;
4. render projection and pointer inverse mapping read the same selector;
5. reset preserves the current runtime transform;
6. editor entry/load uses canonical transform zero;
7. editor rotate + mirror mutates level coordinates rather than the runtime view and preserves path,
   portal, directional-filter, and landmark-chirality behavior;
8. session persistence does not write or restore runtime transform state.

## 2. Consumer-inward impact map

| Boundary | Current owner / consumer | 11A evidence |
| --- | --- | --- |
| state definition/default | `modules/state-slices.ts` | default/state-action tests plus level-flow characterization |
| mutation/facade | `state/actions/core-actions.ts`, `engine.ts` | state-action tests; browser perspective control exercises real facade |
| level load/reset | `engine/level-flow.ts` | existing controller test proves randomized play load, reset preservation, editor zero |
| geometry | `domain/geometry.ts` | exhaustive all-cell/all-eight forward+inverse tests on non-square grid |
| pointer inverse mapping | `level-utils.ts#getGridCoord` | exhaustive unit parity plus new real-browser render/input round trip |
| viewport swap | `ui/layout-ui.ts` | browser gate asserts swap set is exactly 1/3/6/7 |
| render-model projection | `render/create-render-model.ts` | new snapshot assertion pins selector projection |
| renderer positions/path | `renderer.ts` | existing all-eight renderer helper test |
| perspective UI | `input/options-controller.ts` | new Playwright perspective-cycle flow |
| editor rotate/mirror | editor coordinate-transform orchestration + browser buttons | existing unit and browser tests |
| session persistence | `persistence/local-session-store.ts` | new test proves transform is neither serialized nor restored |
| debug facade | `window.APP.State.ENGINE` | browser characterization reads current live-reference debug state; not a persisted/versioned API |

## 3. Persistence and compatibility conclusion

No raw level schema, Firestore level document, local session payload, or cloud session payload has a
stable runtime-transform field named `variant`. The current session serializer writes only level
index, theme, and timestamp. 11A adds an executable characterization proving that both `variant`
and the future canonical word `orientation` are excluded from session writes and ignored if they
appear as extra session keys.

Therefore NC-P11-001's `runtime-compatibility-transition` ownership is a live runtime/debug boundary,
not a raw-level or session-schema migration. 11B should switch the runtime graph atomically rather than
creating a persisted compatibility field or a long-lived second runtime spelling.

The public debug object `window.APP.State.ENGINE` is a live reference used by browser tests and dev
inspection. No stable public version contract was found. 11B should migrate its visible state shape as
part of the same atomic switch; it should not preserve `.variant` as a compatibility alias unless a
new external consumer is discovered during the required current-main census.

## 4. Retained and excluded uses

The following remain correctly named **variant** and must not be swept into 11B:

- generated/research level relatives and family variant IDs;
- solver/search/configuration variants;
- hint provenance variants;
- editor palette object variants and `computeVariantPopupPosition`;
- CSS/object-style variants;
- frozen reports, archives, and historical evidence.

NC-P11-005 applies only to current runtime explanatory prose that calls the eight view transforms
"variants"; it does not authorize rewriting research history.

## 5. Validation topology

11A relies on distinct layers rather than treating aggregate CI as universal evidence:

- `modules/domain/geometry.test.ts`: exhaustive pure forward/inverse/axis/chirality behavior;
- `modules/level-utils.test.ts`: non-square rendered-cell -> pointer -> inverse mapping for all cells
  under all eight transforms;
- `modules/engine/engine-controllers.test.ts`: play load chooses transform, reset preserves it,
  editor load resets to zero;
- `modules/input/editor-coordinate-transform.test.ts`: editor coordinate remap, path, portal, axis,
  chirality, stale-result clearing, and side effects;
- `modules/renderer.test.ts`: path and screen-position geometry agree for all eight transforms;
- `modules/render/create-render-model.test.ts`: render model snapshots the runtime selector;
- `modules/persistence/local-session-store.test.ts`: runtime transform is not a session field;
- `tests/editor.spec.mjs`: real editor rotate/mirror buttons and pointer mapping;
- `tests/orientation.spec.mjs`: real perspective button, all-eight cycle, viewport swapping,
  render/input agreement, and reset preservation;
- `.github/workflows/naming-cleanup-phase11-orientation.yml`: installs Chromium and executes the two
  focused browser files when Phase-11 runtime surfaces change.

## 6. 11A completion rule

11A is complete only after:

- ordinary repository CI is green on the exact final prep head;
- the dedicated Phase-11 orientation browser gate is green on that same head;
- no runtime canonical rename has entered the diff;
- the final current-main comparison still shows 11B unstarted and no competing Phase-11 branch/PR;
- this record is updated with the exact PR/head/run evidence after the checks complete.

11B must branch from merged post-11A `main`, rerun the old/canonical term census, and perform
NC-P11-001 through NC-P11-004 atomically across state/action/geometry/level-utils/engine/render/input/UI.
NC-P11-005 follows in current runtime prose. 11C remains a separate merged-tree closeout.

## 7. Executed 11A evidence

PR #1610 established the first maintained GitHub browser gate for this boundary. The first workflow
attempt failed before tests because the new workflow incorrectly referenced a nonexistent `.nvmrc`;
that harness defect was corrected to the repository's existing Node 20 convention rather than
weakening or bypassing browser execution. Repository documentation discovery also correctly rejected
the initially unregistered workflow, and `.github/workflows/README.md` was updated.

On behavior-bearing head `db3970c4c54b7853db20da885d42023b27071025`:

- ordinary CI run #3410 / `33360366828`: **success** across checks, lint, Node tests, build, deep proofs,
  and deep verification;
- Phase 11 orientation browser gate run #3 / `33360366839`: **success** after installing Chromium and
  executing `tests/orientation.spec.mjs` plus `tests/editor.spec.mjs` against the production Vite build.

This closes the preparation gap recorded in `naming-cleanup-future-phase-preparation.md`: the focused
browser flow has now actually executed in a real maintained environment. This evidence-only record
update moves the PR head once more, so both workflows must rerun green on the final PR head before
merge. No runtime rename may be added while doing so.

## 8. 11B handoff

After #1610 merges green, 11A is complete. Phase 11 rows remain pending because preparation gates are
rowless and do not pretend the canonical migration has happened. The 11B implementation branch must
start from the resulting current `main`, set the Phase-11 execution lock at that point, rerun the
runtime-versus-retained variant census, and then migrate NC-P11-001 through NC-P11-004 atomically.
NC-P11-005 changes current runtime prose only. The dedicated browser gate is intentionally retained so
the 11B switch cannot pass merely because TypeScript and unit tests accept a half-migrated graph.

## 9. 11A merged completion

PR #1610's exact final head `31ce45812569f3184f9f9e63f691c4745f6ec82f` completed ordinary CI run #3412 / `33360515431` successfully and the Phase 11 orientation browser gate run #5 / `33360515437` successfully. The PR then merged as `7789fa0260ad44442f078a596812adcc87864dfb`.

11A is therefore complete on merged `main`. No Phase-11 runtime naming row has been implemented yet. The next authorized work is 11B: branch from current `main`, rerun the target/retained census, acquire the execution lock, and perform the atomic runtime rename without splitting state from geometry/render/input.
