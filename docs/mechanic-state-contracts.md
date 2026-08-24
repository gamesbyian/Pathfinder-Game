# Mechanic state contracts

Reference for mechanics whose behavior depends on path history. This is documentation, not runtime metadata. The beam-dedup cardinality bug that motivated it is covered in [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md).

```ts
interface MechanicStateContract {
  stateShape: 'none' | 'per-cell' | 'per-object' | 'per-object+substate' | 'global';
  stateCardinality: number | 'unbounded';
  monotonic: boolean;
  affectsMoveLegality: boolean;
  affectsConnectivity: boolean;
  affectsWinState: boolean;
  requiresIncomingDirection: boolean;
  externalModelSupport: 'exact' | 'relaxed' | 'unsupported';
}
```

Definitions:
- `affectsMoveLegality`: can reject an otherwise geometric move as illegal; pruning-only checks are distinct.
- `affectsConnectivity`: can remove/change an available graph edge as state changes.
- `requiresIncomingDirection`: needs how the path arrived, not only the proposed move axis.
- `externalModelSupport`: `exact` means the current maintained external model can express the solver/game semantics needed for the mechanic when its stated supporting constraints are enabled; `relaxed` needs extra state/constraints; `unsupported` has no current exact encoding.

## Summary

| Mechanic | State | Bound | Mono. | Move legality | Connectivity | Win | Incoming dir. | External model |
|---|---|---:|---|---|---|---|---|---|
| **Edge usage** | per-cell H/V bits | grid ≤225 | yes | yes: used axis cannot be reused | yes | indirect | yes | exact |
| **Visited/intersection** | per-cell count | grid | yes | no | no | yes: exact `reqInt` | no | exact |
| **Must-pass** | per-object visited bit | published max 4; schema ≤30 | yes | no | no | yes | no | exact; bound memoizable on `(pos, mpVisitedMask)` |
| **Must-cross** | per-object count + first-axis consequence through edge usage | published max 4; schema ≤30 | count yes; axis resource matters | yes: first-pass turn would consume both axes and block required second crossing | yes | yes | yes | exact in current CP-SAT when combined with exact edge-axis-touch reuse and `visits == 2` |
| **Regular filter** | static | n/a | n/a | yes, precompiled | yes, static | no | no | exact |
| **Flipping filter** | global crossing parity + per-object used bit | published max 22; stress max 8; schema ≤32 | used bits yes; parity derived | yes: legal axis depends on global flipper order | yes, dynamic | no | yes | relaxed/unsupported naively; current full CP-SAT has an exact order/parity encoding validated separately |
| **Portal** | per-terminal used bit + `lastWasPortalJump` | published max 3 pairs / 6 keys; stress max 7 pairs | yes | yes: forces destination | yes | affects counted length | yes | exact with paired zero-cost, one-use edges |
| **Gate** | static | n/a | n/a | yes: no re-entry | yes, static | no | no | exact |
| **Goose / false goal** | static for solver | n/a | n/a | excluded from solver graph | yes, static | no | no | exact for solver scope; PLAY hazard effects are separate |
| **Surround** | per-object remaining-neighbor mask | schema ≤30 | yes | no | no | yes | no | exact with per-neighbor visited variables |
| **Must-turn** | per-object satisfied bit | schema ≤30 | yes | hard legality no; `mustTurnDeadlocked` is prune-only | no | yes | yes | relaxed; needs turn-chirality state |
| **Adjacent-turn** | per-object satisfied bit | schema ≤30 | yes | no | no | yes | yes | relaxed; turn chirality + OR across neighbors |
| **Decorative landmark** | static block | n/a | n/a | yes, static | yes, static | no | no | exact |

Notes:
- Must-cross **cannot be represented by visit count alone**. Native legality uses edge-axis state: after the first visit, turning on exit would consume the other axis and permanently prevent the second required crossing, so `isMoveDynamicallyValid` rejects that lock. The current full CP-SAT model can nevertheless encode must-cross exactly without a separate first-axis variable because it combines `visits == 2` with exact per-visit edge-axis-touch reuse: any first-visit turn touches both axes and makes a second visit infeasible, while two legal visits must therefore be straight crossings on opposite axes. Removing/weaking the edge-axis constraints would make the visit-count encoding relaxed/unsound. This contract was reconciled against `search-state.ts` and `cpsat-full-probe.py` on 2026-08-23; see [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md).
- Flipper parity is `popcount(flipperUsedMask) % 2`, derived from the used mask; no separate parity state is needed. Flipper cardinality uses a different representation from the `(1 << n) - 1` initial masks below; do not reuse the ≤30 mask bound for it.
- Portals subtract jumps from counted length and use `lastWasPortalJump` to prevent forced bounce-back.
- Published/stress maxima are measurements, not schema contracts. Regenerate current dataset facts via `npm run facts:levels`; [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md) carries the checked generated snapshot.

## Cardinality bound: `(1 << n) - 1`

`prep.ts` uses `(1 << n) - 1` for `initialMustMask`, `initialMustCrossMask`, `initialSurroundMask`, `initialAdjTurnMask`, and `initialMustTurnMask`.

The safe bound is **n ≤ 30**, not 31 or 32: JS bit shifts use signed int32, so `1 << 31` is negative. `flipperUsedMask` and the `index + 1, 0 = absent` arrays carry related fixed-width assumptions, but not this exact initialization formula/bound.

**Enforced since 2026-08-06:** `validateRawLevel` rejects more than 30 must-pass, must-cross, surround, must-turn, or adjacent-turn objects. This is the hard schema boundary for editor, generated, imported, and hand-written levels. Supporting >30 would require a different mask representation such as `bigint` or a bitset.

The gap was latent for landmark mechanics before this validation; no known corpus had exceeded the limit. The relevant historical failure pattern is the beam-dedup cardinality bug referenced above.

## Why this remains documentation

A runtime `MechanicStateContract[]` would duplicate facts already encoded in `prep.ts`, `search-state.ts`, and `lower-bounds.ts` without compiler-enforced synchronization. Add targeted runtime/schema assertions for enforceable invariants instead of a parallel declarative system.
