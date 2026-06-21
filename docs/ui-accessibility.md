# Pathfinder UI & Accessibility Conventions

> **Status:** current-state reference. The shared behaviors below are implemented once and
> covered by tests; follow them when adding UI. The component-layer model (boot builders +
> semantic CSS + centralized modal behavior) is modernization-plan §3 / ADR 0007.

## Styling

All CSS is hand-maintained (no build step). `styles/app.css` aggregates, in cascade order:
`reset.css` → `utilities.css` → `components.css`. Colour comes from `--theme-*` CSS variables
(31 themes). Rules:
- A class used in `index.html`/`modules/**` must be defined in CSS (`check:css-class-coverage`).
- A `.modal-*`/`.overlay-*` component class defined in CSS must be applied somewhere
  (`check:css-dead-components` — prevents dead "foundation" classes).
- Don't hardcode colours that should vary by theme; `theme-coverage.spec.mjs` fails any element
  whose computed colours are identical across all themes (with curated exceptions).

## Modals & overlays

Two families, both centrally managed by `modules/ui/modal-ui.js`:
- **Screen modals** — `.screen-modal` (guide, theme/options, win, unsaved, publishedLevels,
  editorHelp, solveOptions, playOptionsBlocked).
- **Loading-family overlays** — `.modal-overlay` (reviewAuth, reviewLoad, reviewApproveConfirm,
  diverseSearchResult, submit).

### Required for every modal container
`role="dialog"` + `aria-modal="true"` + a non-empty `aria-label`. Enforced by
`check:modal-a11y` (CI). Open/close **must** go through `ui.openModal(id)` / `ui.closeModal(id)`
(or `toggleModal`), never by toggling `.hidden` directly — those funnel through the focus-trap.

### Focus management (free via the choke point)
`modules/ui/focus-trap.js` is wired into `openModal`/`closeModal`:
- On open: focus moves into the modal (first focusable, else the container).
- Tab/Shift+Tab cycle within the modal.
- **Escape** closes it by clicking the in-modal dismiss control so its own handler runs —
  `.modal-close-btn` (screen modals) or `[data-modal-dismiss]` (overlay Close/cancel buttons)
  — falling back to hiding if none is visible.
- On close: focus is restored to the element that opened the modal.

Covered by `tests/a11y.spec.mjs`. Modal *layout* is guarded by `tests/visual.spec.mjs`
(`npm run test:visual`).

## Icon-only controls

Every icon-only button needs an `aria-label` (mute, modal close ×s, solver cancel, grid
size/rotate/mirror, level prev/next). Decorative inline SVGs should be `aria-hidden`.

## Boot-time DOM construction (no innerHTML)

Repeated/structural markup is built at boot via DOM construction (`createElement[NS]`), never
`innerHTML` (`check:raw-inner-html`). Injected in `bootstrapApp()` before `createApp()` so
controllers find the elements:
- `modules/ui/svg-defs.js` — the `<defs>` icon sprite (`<use href="#def-*">`).
- `modules/ui/editor-palette.js` — the 12 data-driven editor object tools (`#editorPalette .palette-grid`).
- `modules/ui/guide-cards.js` — the 8 guide-modal object cards (`#guideObjectGrid`).
- `modules/ui/submit-steps.js` — the 4 submit-modal progress steps (`#submitStepList`); exports
  `SUBMIT_STEP_IDS` as the single source of truth (imported by `ui.js`).
- `modules/ui/modal-icons.js` — the shared close-X icon into every `.modal-close-btn`.

**Static-shell contract.** `index.html` holds document/dependency setup, the root app containers,
accessibility landmarks (modal containers with their dialog semantics, the canvas, control panels),
and *empty* mount points for the boot builders above (e.g. `#guideObjectGrid`, `.palette-grid`).
Repeated/structural inner markup that follows one pattern should be data-driven via a boot builder
rather than copy-pasted into the shell. To add such a region: leave an empty mount container with a
stable id in `index.html`, add a `modules/ui/<thing>.js` data array + `render…()` builder
(DOM construction, no `innerHTML`), and call it in `bootstrapApp()` before `createApp()`.

## Keyboard play

The puzzle is keyboard-playable (`modules/input/navigation-controller.js`): while `#gameCanvas`
holds focus, **arrow keys** move the path head from the gate and **Backspace/Delete** undoes the
last step (same path as the undo button). The grid-move logic is shared (`moveGridHead`) with the
gamepad d-pad. Native **Tab** moves between the real `<button>` controls.

## Focus-visible

`:focus-visible` shows a themed outline (`var(--theme-modal-accent)`) on buttons, `[role=button]`,
links, inputs, and `#gameCanvas`. It matches keyboard/programmatic focus only, so mouse clicks
stay ring-free. Do **not** re-add blanket `:focus { outline: none }`.

## Interactive non-buttons

Clickable elements that are also pointer **drag sources** (editor palette items) stay
`<div role="button" tabindex="0">` with an Enter/Space `keydown` handler mirroring the tap — a
native `<button>` would fire a click on pointer-release and double-trigger the drag handler.
Otherwise prefer a real `<button>` (e.g. theme swatches are real buttons).

## Adding a new modal — checklist
1. Container: `role="dialog" aria-modal="true" aria-label="…"` + `.screen-modal`/`.modal-overlay`.
2. Open/close via `ui.openModal`/`ui.closeModal`.
3. Dismiss control: `.modal-close-btn` (icon injected by `modal-icons.js`) or `[data-modal-dismiss]`.
4. Build any repeated inner markup via DOM construction, not `innerHTML`.
5. Add to the visual baselines (`tests/visual.spec.mjs`) if layout matters; run `test:visual:update`.
6. `check:modal-a11y` and the e2e a11y test will enforce the semantics.
