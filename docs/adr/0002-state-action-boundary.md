# ADR 0002: engineState mutations go through state-action helpers

**Status:** Accepted (enforced).

## Context
Runtime state lives in one mutable `EngineState` stored at `AppState.engineState`. Historically,
controllers mutated that state directly and recomputed derived fields ad hoc, making correctness
depend on every caller's discipline and making state changes hard to find and test.

## Decision
All `engineState` mutations route through helper functions in `modules/state-actions.ts` (a
re-export barrel over per-slice modules in `modules/state/actions/*.ts`). Consumer layers
(`modules/engine.ts`, `modules/engine/`, `modules/input/`, `modules/ui/`) may **not** write
`state.engineState` directly; the implementation layers that legitimately own raw mutation
(`modules/state/actions/`, `modules/runtime/`, editor history) are exempt.

## Consequences
- `check:engine-state-boundary` (CI) scans the consumer layers and fails on direct writes or
  collection mutations of `state.engineState`.
- State changes are greppable to a small set of named helpers; each slice module documents its
  owner and authoritative-vs-derived fields.
- This is a stepping stone, not the end state: modernization-plan §2 evolves the most
  correctness-sensitive flows from mutation helpers into named event/effect transitions that
  are testable without the DOM.
