# Pathfinder Visual Design Direction

*Adopted June 2026. Companion to `design_bible.txt` (see §17 "Visual Design
Principles" and §21 priority five, "visual grammar pass" — this document is
that pass.)*

This document has three parts: the audit findings that motivated the change,
the chosen direction, and the concrete visual grammar rules that all future
UI work should follow.

---

## Part 1 — Audit findings (June 2026)

### The problem

Pathfinder did not speak one visual language. The audit found **six**:

1. **Geometric instrument language** (the board): stroke-drawn gate chevrons,
   the bullseye goal, dashed portal rings, translucent filter lanes,
   corner-bracket must-cross marks. Theme-colored, round-capped, consistent
   line weight. This is the game's true voice.
2. **Cartoon prop language**: the illustrated goose on a black octagon, the
   fuse-and-spark bomb, the radial-gradient scorch, the tilting pushpin —
   all with hardcoded palettes that ignored the theme system (the black
   goose octagon was nearly invisible on the dark/tron themes).
3. **Hand-drawn carnival language**: Permanent Marker with four-direction
   text-shadow outlines on the jumpscares.
4. **Editorial serif language**: Merriweather italic for guide text — the
   "whimsical bureaucrat" voice.
5. **SaaS dashboard language**: the review/submit/loading modals hardcoded
   Tailwind slate and bypassed the theme system entirely.
6. **Dev-console language**: monospace JSON dumps, plus a native
   `window.confirm()` in the review tools.

Category findings, abbreviated:

- **Typography**: five typefaces, no type scale (13+ arbitrary sizes found),
  nearly every label set in black-weight uppercase tracking-widest — chrome
  shouting over content.
- **Color**: three regimes — theme variables, vestigial Tailwind utility
  classes overridden by ID selectors, and theme-blind canvas hardcodes
  (`#22c55e` hints, `#fbbf24` caution tape, `#94a3b8` inactive gates,
  `#ef4444` prohibition marks, the entire goose and bomb).
- **Iconography**: four sources (custom defs, Feather strokes, a filled
  clipart pencil, raw text glyphs `◄ ► › ○ ↺ 🗑`).
- **Buttons**: nineteen per-button color tokens and a collision-avoidance
  algorithm instead of semantic roles; some "buttons" were `<div>`s.
- **Modals**: four systems (fixed slate dashboards, themed screen-modals,
  the loading overlay, `window.confirm`), none with entrance motion.
- **Theme picker**: raw object keys shown to players (`HELLO_KITTY`,
  `PADDYS_DAY`), swatch previews showing only one color.
- **Board vocabulary**: the core five (gate, goal, portal, filter,
  must-cross) shared one language; must-pass (office pushpin), geese and
  false goals (cartoon props), prohibition marks (road signage), and the
  hint path (construction tape) each came from a different artistic world.

### Verdict

Several tools stitched together: an elegant puzzle instrument administered
through a SaaS dashboard with a dev console taped underneath and a carnival
barker bursting in occasionally. Production-grade engineering presenting as
an advanced internal build.

### What must be preserved

- The geometric object vocabulary — this *is* Pathfinder.
- The logo (a theme-aware mini-level) and the header color blocking.
- The rainbow path; the theme system's breadth, including chaos.
- The comedic apparatus: goose jumpscare, "Bamboozled!", "Whoa",
  "Rest Here", the Caveat "well done".
- The serif rulebook voice (Merriweather).
- The submit step checklist and the solver overlay (already good UX).

---

## Part 2 — The chosen direction

**The Drafting Table, with Bureau stamps reserved for moments of
consequence.**

Pathfinder is a precision drawing instrument. The geometric-ink language of
the board governs *everything*: panels are sheets, buttons are instrument
controls, metrics are readouts, and every object on the board is drawn in
the same ink. Exactness is the aesthetic.

The one sanctioned interruption is the **stamp**: when something of
consequence happens — a goose is disturbed, a trap detonates, a path is
found, a level is approved or rejected — the whimsical bureaucrat reaches
for a rubber stamp. Permanent Marker survives *only* inside `.stamp`
treatment (bordered, rotated, single ink color). It never sets body text.

### Voice assignments

| Voice | Typeface | Where it may speak |
|---|---|---|
| Interface | Inter, 3 weights on the type scale | All chrome, labels, buttons |
| Readout | `--font-mono` stack | All live metrics: length, crosses, timer, percentages, level data |
| Rulebook | Merriweather italic | Guide and editor-help explanations only |
| Stamp | Permanent Marker via `.stamp` | Jumpscares, win moment, future approve/reject moments |
| Signature | Caveat | The win sub-message ("well done") only |

---

## Part 3 — Visual grammar rules

### Typography

A four-step scale, defined as CSS custom properties in `index.html`:

- `--type-caption` (0.62rem): micro-labels, button labels, table headers.
- `--type-label` (0.72rem): secondary copy, descriptions, toggles.
- `--type-body` (0.85rem): body copy in modals.
- `--type-title` (1.05rem): modal and section titles.

Display sizes (level number, win title, solver timer) may exceed the scale
but must use the Readout or Stamp voice. Do not introduce new arbitrary
`text-[...]` sizes; pick the nearest step.

Uppercase + tracking-widest is reserved for `--type-caption` labels.

### Buttons

Three roles, defined in `index.html` styles, colored by theme tokens:

- **`.btn-ink`** — the one primary action of a row (Play: Hint;
  Editor: Submit; Review: Approve, with Submit as a second affirmative).
  Filled with `--theme-btn-ink`, text `--theme-btn-ink-text`.
- **`.btn-outline`** — every supporting action. Transparent fill, 1.5px
  `--theme-btn-outline-border`, text `--theme-btn-outline-text`.
- **`.btn-danger`** — destructive/caution actions (Reset, Clear, Reject,
  Leave, Delete). "Red pencil": outlined in `--theme-btn-danger`, fills on
  hover.

All three share `.btn-role` (radius, caption type, transition). Do not add
new per-button color tokens; the legacy `--theme-btn-*` variables remain
for compatibility but new UI must use roles.

### Modals — sheets

One presentation system: a sheet that fades/slides in with `sheet-in`
(180ms ease-out). All overlays use theme tokens (`--theme-modal-*`) —
no surface may hardcode a palette. Native `window.confirm` is tolerated
only where it already exists and must not spread.

### The board — one ink

Every object is drawn from theme tokens. New derived tokens:

- `colors.hint` / `--theme-hint-ink`: the **red pencil** — hint paths are
  single-color dashed strokes in this ink (the amber/black caution tape is
  retired).
- `colors.prohibit`: parity/dead-gate cross-outs, same red-pencil family.
- `colors.inactive`: unselected gates (was hardcoded gray).
- `colors.hazardInk` / `hazardSurface` / `hazardAccent`: the goose and the
  bomb are drawn as ink illustrations — ink silhouette, paper cutout face,
  one warm accent — guaranteed legible on every theme surface.
- `colors.scorch`: detonation residue, in ink rather than pure black.

Object grammar:

- **Must-pass** is a *survey marker*: a ring with four crosshair ticks;
  satisfied = filled center. (The office pushpin is retired.)
- **Flipping filters** carry a *drawn* rotation arrow (arc + arrowhead),
  not a typeset `↺` glyph.
- **Geese and bombs** keep their silhouettes and their jokes, redrawn in
  theme ink. The goose octagon is `hazardInk`, the goose is `hazardSurface`,
  beak and feet are `hazardAccent`.
- The path remains the star: nothing may exceed its visual weight except a
  triggered hazard.

### Stamps

`.stamp` = Permanent Marker, uppercase, `0.14em` border in `currentColor`,
slight rotation. Used for: GOOSE/BOOBY-TRAP jumpscare verdicts, the
PATH FOUND win title. Candidates for future use: APPROVED/REJECTED feedback
in review mode. Never for instructions, never for body text, never more
than one stamp per moment.

### Themes

Theme keys are data; players see **display names** ("Paddy's Day", not
`PADDYS_DAY`). The picker shows a mini-board swatch (paper, grid, a path
stroke, gate and goal dots) so a theme can be judged before applying it.
The seed-derivation engine is the single source of truth for color; canvas
code must read `model.theme`, never literals. (Fixed multi-portal pairing
colors in `portal-utils.js` are an allowed exception: they are identity
labels, not styling.)

### Motion

Three durations: 120ms (hover/press), 180ms (sheets, reveals), 300ms
(celebrations). The jumpscares keep their full-screen drama. Animations
must never slow repeated attempts (design bible §19).

---

## Implementation map (first pass, this branch)

| Area | Files |
|---|---|
| Derived tokens (hint/prohibit/inactive/hazard/scorch, button roles) | `modules/theme-engine.js`, `modules/theme/theme-normalizer.js`, `modules/theme/css-variable-applier.js` |
| Canvas ink pass (survey marker, themed goose/bomb/scorch, drawn flip arrow, red-pencil hints, inactive gates) | `modules/render/draw-assets.js`, `modules/render/draw-path.js`, `modules/render/render-layers.js` |
| Type scale, button roles, sheet motion, stamps, themed review/submit modals, SVG def updates, nav chevrons, guide copy | `index.html` |
| Submit-step theming, alert class cleanup | `modules/ui.js`, `modules/ui/toast-ui.js` |
| Theme picker display names + board swatches | `modules/theme/theme-picker-renderer.js` |
| Review modal inline colors | `modules/input/review-controller.js` |

Deliberately deferred (follow-ups): converting `<div>` controls to
`<button>` elements (touch/drag handlers need regression care), 44px tap
targets for palette cells, retiring the runtime Tailwind CDN in favor of a
build step, replacing the clipart pencil icon, exit animations for sheets.
