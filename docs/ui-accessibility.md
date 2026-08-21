# Pathfinder UI and accessibility conventions

Current shared UI rules. ADR 0007 covers the component model.

## Styling

Semantic CSS only: `styles/app.css` imports `reset.css` → `tokens.css` → `components.css`.

- Every used class must exist (`check:css-class-coverage`).
- `.modal-*` / `.overlay-*` component classes must be used (`check:css-dead-components`).
- Theme-varying colors come from theme tokens; theme coverage is browser-tested.

## Modals and overlays

Both `.screen-modal` and `.modal-overlay` families are managed by `modules/ui/modal-ui.js`.

Every modal container requires `role="dialog"`, `aria-modal="true"`, and a non-empty `aria-label`; `check:modal-a11y` enforces this.

Open/close through `ui.openModal(id)` / `ui.closeModal(id)` / `toggleModal`, never by directly toggling visibility. Use `ui.confirmDialog(...)` instead of `window.confirm`.

The central focus trap provides:

- initial focus inside the modal;
- Tab/Shift+Tab cycling;
- Escape through the modal's dismiss control;
- focus restoration on close.

Dismiss controls use `.modal-close-btn` or `[data-modal-dismiss]`. Behavior is covered by `tests/a11y.spec.mjs`; modal layout by `tests/visual.spec.mjs`.

## Controls and markup

- Icon-only buttons need `aria-label`; decorative SVGs use `aria-hidden`.
- `innerHTML`/raw HTML injection is banned by lint. Repeated structural markup is created with DOM APIs at boot.
- Boot builders include `svg-defs.js`, `editor-palette.js`, `guide-cards.js`, `submit-steps.js`, and `modal-icons.js`.
- `index.html` owns the static shell and empty mount points. New repeated UI should add a stable mount point plus a boot builder, called before `createApp()`.

## Keyboard interaction

With `#gameCanvas` focused, arrow keys move the path and Backspace/Delete undo through the same navigation paths used by other controls. Native Tab moves among real controls.

`:focus-visible` supplies the themed keyboard focus ring. Do not add blanket `:focus { outline: none }`.

Prefer native `<button>` elements. Pointer drag sources such as editor palette items may remain `<div role="button" tabindex="0">` with Enter/Space handling when native button click behavior would double-trigger the drag interaction.

## New modal checklist

1. Add dialog semantics and `.screen-modal` or `.modal-overlay`.
2. Use central open/close APIs.
3. Add `.modal-close-btn` or `[data-modal-dismiss]`.
4. Build repeated markup through DOM construction.
5. Update visual baselines when layout matters.
6. Run the accessibility/static checks and relevant e2e tests.
