# Styling: Finish the Semantic-CSS Migration (remove Tailwind-derived utilities)

Status: in progress (started 2026-06-25, branch `claude/codebase-quality-review-5orvi5`)

### Progress log
- ✅ **Region 1** (boot loading overlay + 5 loading-family overlays) — committed, pixel-stable
  (visual baselines), coverage + theme-coverage green.
- ✅ **Region 2** (goose/bomb jump-scares, solver search indicator, review-empty) — committed.
  Introduced `.is-shown` as the runtime display hook (see decision below). Coverage, lint,
  ui-dom unit test, theme-coverage (31 themes), and a11y e2e all green.
- ⏳ Remaining markup regions: header/metrics, the 8 `.screen-modal`s, editor palette + grid
  controls, play-controls/buttons/export, rating pane, shell row, `<body>`/`#appLayout`/`#dragGhost`.
- ⏳ JS DOM-builders (Phase 3), `utilities.css` deletion (Phase 4), final full verification (Phase 5).

### Decision: runtime display hook (`dom.js` show/hide)
`dom.js`'s `show()/hide()` added/removed the Tailwind `flex` class at runtime, so `.flex` was a
**runtime hook**, not just static soup — deleting it would break `show()`. Resolved by renaming the
hook to a semantic `.is-shown { display: flex }` (a 2-line `dom.js` change; only the two jump-scares
use `show()/hide()`), so the generic `.flex` utility can still be fully removed in Phase 4. The kept
"primitive" layer is therefore: the type scale (`.type-*`), and the two display-state hooks
`.hidden` / `.is-shown` — everything else is folded into semantic component/id rules.

## Why

The app is stuck mid-migration between two styling systems:

- **Tailwind-derived utility soup** — `styles/utilities.css` hand-maintains **337** utility
  classes with escaped Tailwind names (`.bg-\[var\(--theme-modal-accent\)\]`, `--tw-translate-x`
  composition, `.mb-4`, `.flex`, …). Tailwind the *toolchain* was removed, but the *authoring
  model* survived as a hand-written, ungenerated, unpurged copy. Markup still reads as soup:
  `class="flex justify-between items-center mb-4 shrink-0"`.
- **Semantic component classes** — a parallel, partially-complete effort introduced
  `.btn`/`.shell-btn`/`.panel-base`/`.modal-overlay`/`.options-row`/`.overlay-panel`/… in
  `styles/components.css`.

`index.html` and ~15 JS files mix both. This is the worst maintenance state: two vocabularies,
two CI gates (`check:css-class-coverage`, `check:css-dead-components`) compensating for the lack
of a real CSS pipeline, and no single source of truth for any element's appearance.

**Decision (user, 2026-06-25): commit fully to semantic CSS — not Tailwind.** Finish the
migration so every UI element is described by a semantic class that owns its full appearance, and
delete the Tailwind-derived utility layer.

## Target architecture

```
styles/
  reset.css       (keep — Preflight browser normalization)
  tokens.css      (NEW — :root design tokens + a small, documented design-PRIMITIVE layer)
  components.css   (all semantic component classes; each owns layout + spacing + color)
  app.css          (aggregator: @import reset, tokens, components)
  utilities.css    → DELETED
```

### What is a "primitive" we keep vs. "soup" we delete

Full-semantic does **not** mean zero reusable classes — it means no Tailwind-style soup in
markup. We keep a small, explicitly-documented **design-primitive** layer and fold everything
else into components:

- **KEEP (design tokens / primitives):**
  - `:root` CSS custom properties (the theme system — untouched).
  - The named **type scale** `.type-2xs … .type-xl` (a semantic type system, used in ~50 places +
    JS). This is a design token, not soup. *(If you'd prefer these inlined into each component,
    say so — it's a one-time mechanical change, kept separable for that reason.)*
  - **State / JS-hook classes** already living in `components.css` / the coverage allowlist:
    `.hidden`, `.selected`, `.show`, drag/gamepad hooks, `.palette-tool`, etc.
- **DELETE (fold into the element's semantic class):** every layout/spacing/color/transform
  Tailwind utility used inline — `.flex`, `.mb-4`, `.px-3`, `.rounded-lg`, `.bg-[var(--…)]`,
  `.-rotate-[25deg]`, `.tracking-widest`, `.uppercase`, `.shrink-0`, …

### Method (pixel-stable, per the established technique)

For each region, the new semantic class's declarations must **exactly reproduce** the prior
computed style (same values the utilities resolved to), so the result is visually identical. This
is the same "consolidate → verify no layout regression" technique used for the modal-header and
loading-overlay slices already in `components.css`.

## Verification stack (what gates this work)

Confirmed working in this environment on the clean tree:

| Gate | Catches |
|---|---|
| `npm run check:css-class-coverage` | a class used in HTML/JS with no CSS definition |
| `npm run check:css-dead-components` | a `.modal-*`/`.overlay-*` component class defined but unused |
| `npm run check:lint` / `check:types` | JS/TS regressions |
| `theme-coverage.spec.mjs` (31 themes) | **color correctness** — any element whose color stops varying per theme (hardcoded/flat color or broken token wiring) |
| functional e2e (smoke/gameplay/a11y/editor/security) | behavior regressions |
| session-local visual baselines | **layout** shift (regenerate baselines on clean tree in-env, diff after each phase, then `git checkout` the committed baselines before committing — they are environment-sensitive and must not be overwritten in the repo) |

Run Playwright with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

> Note: the *committed* visual baselines do not reproduce here (≈5% font-rendering diff on an
> unchanged tree), so they can't be a strict gate in this env. The session-local
> regenerate-then-diff approach is the layout safety net instead.

## Phases (each a separate, independently-verified commit)

1. **Scaffold tokens layer.** Create `styles/tokens.css` with `:root` + the type scale + a header
   documenting the keep/delete policy. Update `app.css` to import it. No behavior change yet
   (utilities.css still present). Verify coverage + theme-coverage green.
2. **`index.html` → semantic, region by region.** Order: loading overlay → jumpscares → search
   indicator → header/metrics → each modal body → editor palette/controls → play-controls export
   area → rating pane → misc (dragGhost, alertOverlay). After each region: coverage check +
   session-local visual diff for any open-able modal.
3. **JS DOM-builders → semantic.**
   - `toast-ui.js`: replace the Tailwind color-class severity channel. Callers pass a semantic
     severity token (`alert-error|warning|success|muted`) or none; toast maps it to the existing
     `data-severity` mechanism and applies a single `.alert-message` class. Remove
     `SEVERITY_COLOR_PATTERNS` Tailwind matching + font-weight stripping (no longer needed). Update
     all `showMessage`/`flashMessage` call sites.
   - `review-controller.js` (published-level rows), `theme-picker-renderer.js` (swatches),
     `guide-cards.js`, `submit-steps.js`, `level-rating-ui.js`, `dom.js`, `editor-drag-ghost-ui.js`:
     replace inline utility strings with semantic classes.
4. **Delete `utilities.css`.** Remove the file + its `@import`. Resolve every resulting
   coverage failure (each is a still-unmigrated utility — fix at its source, do not re-add the
   class). Trim the coverage-check allowlist to only genuine hooks. Tighten the
   `class*=[bracket]` "ignored" escape hatch in the coverage checker if feasible so future
   `bg-[var(...)]` soup can't silently slip back in.
5. **Full verification + docs.** `npm run ci` + `npm run test:e2e` + theme-coverage all green.
   Update CLAUDE.md's "Tailwind CSS Removal" / CSS-architecture sections to describe the final
   single-system state. Regenerate + restore committed visual baselines note.

## Out of scope / related

- **#7 TypeScript (recorded decision, user 2026-06-25): the project will commit to TypeScript.**
  Not part of this styling work; tracked separately. The current "check-only JSDoc on an allowlist"
  (`docs/typing.md`, ADR 0009) is the partial state to be superseded by a real TS adoption with a
  build step — that decision interacts with ADR 0001 (no build step) and needs its own plan.
- CSP restoration, levels.json data-splitting (hints-vs-definitions) — separate items from the
  codebase-quality review; not touched here.

## Rollback

Each phase is its own commit. If theme-coverage or a visual diff regresses and can't be quickly
reconciled, revert that phase's commit; the migration is additive-then-subtractive (utilities.css
is only deleted in Phase 4, so Phases 1–3 are always safe to stop at).
