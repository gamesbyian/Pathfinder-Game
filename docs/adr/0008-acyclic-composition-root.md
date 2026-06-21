# ADR 0008: Acyclic composition root — no construction cycles, forward declarations, or late init

**Status:** Accepted (modernization-plan §1 Phase 2 realized).

## Context
`createApp()` (the composition root) historically resolved coupling among ui, renderer, themes,
persistence, editor, and engine with **mutable forward declarations** (`let _renderer`,
`let _persistence`), **lazy getters** that closed over them, and a **post-construction
`editor.init()`** call. §1 Phase 2 calls for removing the remaining construction/runtime cycles so
construction order is acyclic and each controller takes narrow inputs.

Investigation showed two of the three "cycles" were *false* cycles — one side only needed a trivial
capability that is available without the other subsystem:

- **ui ↔ renderer:** ui depended on renderer *only* so `layout-ui.updateViewport` could read the
  canvas via `renderer.getCanvas()`, which just returns `document.getElementById('gameCanvas')`.
- **themes ↔ persistence:** persistence depended on themes *only* to validate stored theme ids
  (`themes.getTheme(id)` ≡ `data.getThemes()[id]`).

The third is a genuine mutual *runtime* collaboration:

- **editor ↔ engine:** the engine wires the editor into its review-mode/level-flow sub-controllers;
  the editor drives the engine through the narrow `EditorRuntimePort` (9 members) — but only at
  runtime, never during construction.

## Decision
Make the composition root acyclic — no mutable forward declarations, no hidden lazy construction
dependencies, no post-construction init:

- **ui → renderer (one-way):** `layout-ui` reads `#gameCanvas` directly. ui no longer takes a
  renderer; renderer is a plain const built after ui.
- **persistence → themes removed:** persistence takes a `themeExists` predicate sourced from the
  leaf `data` service (`(id) => !!data.getThemes()?.[id]`), so it no longer depends on themes and is
  built **before** it; themes takes `persistence` directly.
- **editor ↔ engine:** expressed as one **explicit, construction-time lazy port getter**. The editor
  receives `getEngineRuntime: () => createEditorEnginePort(engine)` (where `engine` is the `const`
  declared on the next line) and memoizes the port on first use. No `let` forward declaration, no
  `init()` — the editor is fully valid at construction; the closure is only dereferenced when an
  editor method runs, long after `engine` is initialized.

## Consequences
- `createApp()` constructs every subsystem in straight-line order with `const`s only. The single
  remaining indirection is the editor's explicit lazy port getter — the minimal, visible mechanism
  for a true 2-party mutual *runtime* dependency (the alternatives — a `let` forward declaration + a
  lazy getter, or a third mediator object — are strictly worse for two collaborators, and the editor
  already depends on the engine only through the narrow `EditorRuntimePort`).
- `app-module-unit-tests` constructs the app with fake factories and asserts the wiring (ui gets no
  renderer; persistence gets a working `themeExists`; persistence is injected into themes; the
  editor's lazy `getEngineRuntime()` yields exactly the 9-member port).
- Verified behavior-preserving via `ci` + e2e (viewport/canvas, theme apply → `persistSessionState`
  across 31 themes, boot session sanitization, editor mode-switch through the lazy port).
