# ADR 0007: UI component layer = boot builders + semantic CSS + centralized modal behavior

**Status:** Accepted (modernization-plan §3 realized).

## Context
§3 asks for a "real UI and component layer": repeated modal/overlay/button/field/toolbar
structures built from shared primitives, accessibility implemented once, `index.html` reduced to a
shell, and no raw HTML injection. But ADR 0001 (static hosting, **no build step**) rules out a
JSX/vnode runtime component framework. So the "component layer" must be expressible in plain ES
modules + hand-maintained CSS, loaded directly by the browser.

## Decision
The component layer is three cooperating mechanisms, not a runtime framework:

1. **Boot-time data-driven builders** (`modules/ui/*.js`): repeated *patterned* markup is a data
   array + a `render…()`/`inject…()` function that constructs nodes with `createElement[NS]`
   (never `innerHTML` — `check:raw-inner-html`), called in `bootstrapApp()` **before**
   `createApp()` so controllers find the elements. Today: `svg-defs` (icon sprite),
   `editor-palette` (12 object tools), `guide-cards` (8 guide cards), `submit-steps` (4 submit
   steps), `modal-icons` (close-X). Shared contracts live in the builder module
   (e.g. `SUBMIT_STEP_IDS`, imported by `ui.js` so the id list isn't duplicated).
2. **Semantic CSS component classes** (`styles/components.css`): `.card`, `.modal-titlebar`,
   `.overlay-panel`, `.btn-*`, `.panel-*`, `.badge`, `.tag`, … — repeated styling, theme-driven via
   `--theme-*`. `check:css-class-coverage` (used→defined) and `check:css-dead-components`
   (defined→used for component families) keep it honest.
3. **Centralized modal behavior** (`modules/ui/modal-ui.js` + `focus-trap.js`): dialog semantics,
   focus trap, Escape-to-dismiss, focus restore — implemented once at the open/close choke point,
   applied to every modal; enforced by `check:modal-a11y` and `tests/a11y.spec.mjs`.

**Non-goal:** a runtime component/vnode framework or a build step. `index.html` stays the static
shell — document/dependency setup, root containers, accessibility landmarks (modal containers with
their `role="dialog"` semantics), and *empty* mount points for the builders.

## Consequences
- Adding repeated UI: leave an empty mount container with a stable id, add a
  `modules/ui/<thing>.js` data array + builder, call it in `bootstrapApp()`. The contract is the
  builder's exported data; controllers bind to that, not to scattered ad hoc markup. Documented in
  `docs/ui-accessibility.md` (static-shell contract + checklist).
- Accessibility (dialog/focus/keyboard) is defined once and test-covered; new modals inherit it for
  free via the choke point.
- Layout safety for markup refactors comes from `tests/visual.spec.mjs` (pixel baselines), since the
  colour-only `theme-coverage` test can't see a layout shift.
- **Trade-off (deliberate):** modal *container* markup still lives in `index.html`. Under the
  static-shell contract that is correct (containers are landmarks); migrating a container's inner
  layout to a builder is optional, incremental work with diminishing returns — done where a pattern
  repeats and pays off (cards, steps, palette, icons), not as a blanket rule. This is the plan's
  "migrate in low-risk chunks" guidance, not an unbounded mandate to empty `index.html`.
