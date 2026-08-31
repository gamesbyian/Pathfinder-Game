# Phase 11 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 11 — application orientation versus level variant |
| Current batch | post-closeout audit repair (merged) |
| Status | closed after post-closeout audit repair PR #1615 merged green |
| Base `main` SHA | `8c2f3d4f2f23f9fc0a31afb30096ee0ed3aa3e60` |
| Branch | `chatgpt/phase11-audit-repairs-2026-08-31` |
| Rows | NC-P11-001 compatibility classification; NC-P11-005 prose residue; Phase-11 evidence guardrails |
| Compatibility owner | none; 11A proved no persisted/stable external orientation compatibility boundary |
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

## 10. 11B entry reconciliation

11B starts from current `main` `53c32911e840a342c9eb6d90ecd0d26fd59052ae`, after 11A and its evidence hygiene are merged. The current runtime target remains the graph documented in Sections 2-5: engine state/default, state action and engine facade, level-flow load/reset preservation, geometry transform parameters, inverse pointer adapter, viewport swapping, render-model projection, renderer position/path reads, and perspective UI. No competing Phase-11 PR is active at entry.

Canonical-target occupancy remains compatible: `orientation` is already vocabulary for this concept, but `EngineState.orientation`, `setOrientation`, and the runtime render-model field are unoccupied. Retained research/generator/solver/editor-palette uses of `variant` are explicitly outside the switch.

## 11. 11B implementation and parity evidence

PR #1612 performs the runtime switch atomically across the reviewed application graph. The implementation uses one canonical runtime spelling only: state/defaults, state action, engine facade, level-flow keep/reset semantics, geometry parameters, inverse pointer mapping, render-model projection, render layers, renderer, viewport/layout, and perspective control all use `orientation` / `setOrientation`. No dual runtime field or persistence alias was introduced.

A post-switch consumer census covered all non-solver application modules, with every surviving `variant` use classified. Retained survivors are research/solver/provenance terminology, editor palette object variants, and unrelated descriptive variants; stale runtime findings were repaired, including the render-layer projection consumer, geometry port parameter names, and a play-mode landmark comment. A durable `scripts/naming-cleanup-phase11-closeout.mjs` ratchet now scans 21 exact runtime surfaces and rejects `setVariant`, `.variant`, or runtime/geometry `variant` residue; its negative fixtures are enrolled in the maintained Node-test graph.

On behavior-bearing head `e1090eed361fed37def0d1b574d954cc5575025b`:

- ordinary CI run #3416 / `33361495965`: **success** across checks, lint, Node tests, build, deep proofs, and deep verification;
- Phase 11 orientation browser gate run #8 / `33361495896`: **success**, including real Chromium execution of the all-eight perspective cycle, render/input agreement, viewport swapping, reset preservation, and editor rotate/mirror flow.

This is before/after observable parity evidence for the behavior-preserving rename. The 11A characterization passed before the switch and the same maintained browser characterization passes after it. This evidence update itself moves the PR head, so both gates must rerun green on the exact final head before merge. Phase 11 remains incomplete until the separate 11C merged-tree closeout.

## 12. 11C merged-tree closeout entry

Phase 11B PR #1612 merged exact green head `eca9887937f27fb68c0d75b71f25468bbbf65dc3` as `b2ee0d74cab245c042555516474e1492975b4fd6`. 11C starts directly from that merge commit and is evidence/closure-only.

The merged-tree audit must rerun the Phase-11 runtime residue ratchet, ordinary CI, and the maintained Chromium orientation characterization against what actually landed on `main`. It must also confirm retained research/editor-palette `variant` terminology remains intentionally untouched, no dual runtime compatibility alias was introduced, and the public debug state exposes the canonical runtime field. Only after this closeout head is green may NC-P11-001 through NC-P11-005 be marked done, `lastCompletedPhase` advance to 11, and `activeExecution` return to idle.

## 13. 11C closure state

PR #1613 is the Phase-11 merged-tree closeout and is based directly on the Phase-11B merge `b2ee0d74cab245c042555516474e1492975b4fd6`. The branch contains no runtime behavior or canonical-name changes. Its final intended ledger state marks NC-P11-001 through NC-P11-005 done, records the structured Phase-11 implementation/closeout evidence, advances `lastCompletedPhase` to 11, and returns `activeExecution` to idle.

That state is deliberately validated before it becomes authoritative: ordinary CI and the dedicated Chromium orientation gate must both pass on the exact final PR head. The browser workflow's path filter now includes this Phase-11 record and the naming ledger, so a pure evidence closeout actually reruns the browser characterization rather than relying on the older 11B run or fabricating a runtime change. If either gate fails, Phase 11 remains open and this closure state must be repaired before merge.

## 14. Phase 11 merged completion

Phase 11C PR #1613 completed ordinary CI run #3421 / `33362227488` successfully and the maintained Chromium orientation gate run #13 / `33362227473` successfully on exact final head `4d95efd0d0501174c13e95a3c7c3507cfb6393d1`. It then merged as `994fa8cebaf5faafd5304026584acde25560e0d2`.

Phase 11 is therefore closed on merged `main`: NC-P11-001 through NC-P11-005 are done, `lastCompletedPhase` is 11, and `activeExecution` is idle. Runtime rotation/reflection state uses the canonical `orientation` vocabulary throughout the reviewed application graph, while research/solver/generated/editor-palette meanings of `variant` remain intentionally retained. Phase 12 is the next incomplete phase.

## 15. Post-closeout suspicious-audit correction

Post-closeout audit-repair PR #1615, based on `main` `8c2f3d4f2f23f9fc0a31afb30096ee0ed3aa3e60`, addresses a suspicious audit finding that the runtime implementation itself remained behaviorally sound but the closure evidence overstated completeness in four ways.

1. NC-P11-005 still had plural runtime-transform prose (`transposing variants`, `swapping variants`, and `reflecting variants`) in `modules/domain/geometry.test.ts`. The Phase-11 residue ratchet matched singular `variant` only, so it could not detect those hits. The repair changes that prose to `orientations`, expands the ratchet to reject both `variant` and `variants`, and adds a negative fixture for the plural form.
2. NC-P11-001 remained classified in the ledger as `dual-read` / `runtime-compatibility-transition` even though Sections 3 and 11 proved and implemented a single canonical runtime field with no persisted or stable external legacy boundary. The plan and ledger are amended to `persistence: none` / direct current-surface rename; no Phase-15 orientation compatibility retirement remains.
3. The dedicated Chromium gate did not trigger for every source that can change the characterized behavior. Its path filter now includes the chirality helper, level remapping helper, editor transform controller/test, and geometry test surface, so isolated changes to those owners cannot bypass the real-browser gate.
4. The structured ledger checker previously required only an implementation CI result plus a closeout policy string. The repair requires complete Phase-10+ merged-tree closeout evidence (final head, successful CI, and merge commit) and requires both implementation and closeout browser evidence for Phase 11. The existing exact-head Phase-11 implementation browser run `33361621888` is now recorded structurally.

The original implementation/merge ancestry also resolves the missing pre-merge comparison record without inventing history: #1612's merge commit `b2ee0d74cab245c042555516474e1492975b4fd6` has first parent `53c32911e840a342c9eb6d90ecd0d26fd59052ae`, exactly the 11B entry-main SHA, and #1613's merge commit `994fa8cebaf5faafd5304026584acde25560e0d2` has first parent `b2ee0d74cab245c042555516474e1492975b4fd6`, exactly the 11B merge used as the 11C base. The required comparison was not durably recorded at the time, which remains a process-evidence defect, but the merge graph proves neither PR actually landed over intervening main drift.

This repair changes no runtime orientation semantics, transform math, persistence behavior, solver behavior, or editor transform behavior.

### 15.1 Merged audit-repair completion

PR #1615 completed ordinary CI run `33364132333` and the widened Phase 11 Chromium orientation gate run `33364131978` successfully on exact final head `7125e50859fab3430e04ebbb3e38c9de600d6b38`. It merged as `a042e6d877278923c1234e51bce124c606ccaa4b`.

Phase 11 is therefore closed again with the audit findings repaired: NC-P11-005 has no live runtime-transform `variant`/`variants` prose in the guarded graph; NC-P11-001 no longer advertises a nonexistent dual-read boundary; the browser gate covers the behavior owners identified by the audit; and the structured closure checker rejects missing Phase-11 browser evidence and incomplete Phase-10+ merged-tree closeout evidence.
