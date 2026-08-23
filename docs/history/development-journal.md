# Development Journal (CLAUDE.md history)

> Chronological, dated session narrative extracted from CLAUDE.md when it was collapsed to a
> current-state reference. This is **history**, not current truth — for how the system works
> *now*, read [`CLAUDE.md`](../../CLAUDE.md) and the docs index in [`docs/README.md`](../README.md).
> Retracted experiments (e.g. the Level Boredom Report) are kept here for the record so the same
> dead ends aren't re-attempted; they do **not** describe current behavior. Condensed 2026-07-10 —
> full blow-by-blow detail (before/after code snippets, per-commit breakdowns, per-bug walkthroughs)
> is in git history on this file; what's kept here is outcome + why it mattered. Entries are
> chronological, 2026-06-11 → 2026-07-04.

---

## Solver Performance: 127.7s → 26.8s (2026-06-11/12)

Baseline: 147/147 solved, ~127.7s total, with L145/L129/L130/L140/L74/L146 the slow outliers.
Five successive optimization passes, each re-measured against the full corpus:

1. **P1–P5** (BigInt→Number masks, static-adjacency precomputation, beam parent-pointer nodes
   instead of full path copies, typed-array distance maps, `scoreAndSort` scratch buffers) → ~113s.
2. **Gate interleaving** extended to every multi-gate level (previously only near-closure levels)
   → ~96.6s.
3. **Targeted config-ordering fixes** for specific slow levels (must-cross-first beam, DFS
   perimeter-first on dense levels, objective-first before perimeter-sweep, CCW-before-CW on
   low-reqInt levels) → ~54.3s, then two more level-specific fixes → ~47.3s.
4. **Diverse beam + progressive widening** (bucket candidates by flipper/must-cross state so beam
   search doesn't collapse to one constraint mode) → ~38.1s.
5. **State-based beam dedup** (merge candidates sharing `(position, constraint-state)`, keep only
   the highest-scoring path per tuple; disabled for portal levels) → ~26.8s (**−79% vs. baseline**).

Final state: no single dominant bottleneck, slowest level under 3.6s. The **ablation framework**
(`scripts/ablation-config.mjs`/`run-ablation.mjs`/`analyze-ablation.mjs`) was built in this session
to measure what each search feature contributes — see [`ablation.md`](../ablation.md) for the
current (57-flag) reference.

---

## Hint Weight Calibration & Unmatched-Hint Investigation (2026-06-17)

Built `scripts/hint-weight-calibration.mjs`: replays every verified human hint path through
`scoreMove`, treating each human move as the "expert" label at branch points. A coordinate-descent
search (`--search`) suggested a locally-optimal weight vector (top-1 rate 69.8%→73.0%); the
calibrated vector was applied to the `default` policy profile with zero regressions across 154
levels.

A follow-up investigation asked whether 328 "unmatched" human hint paths (never independently
reproduced by the solver) revealed missing solver behaviors. **Finding: 0 of 328 are fully
explained by any of the 12 policy profiles** — genuinely outside the current scoring vocabulary.
Two candidate fixes emerged (must-cross urgency sequencing; a near-closure first-move pattern), but
**neither was implemented**: the in-game Hint button reads baked-in `hints[]` directly and never
invokes the solver at runtime, so neither fix would change what players see; every sampled
"broken" level already solves fine with the live solver; and the must-cross fix risked regressions
across 154 passing levels for a cosmetic (not functional) gain. Given no actual bug existed, the
fixes were skipped rather than accepting regression risk. Lesson: an "unmatched" solver/human
divergence is not automatically a solver bug — check whether the divergent path is even reachable
by players before spending calibration effort on it.

---

## Heat Maps, Resumable Diverse Search & Submission Fixes (2026-06-19)

- **Per-level hint heat maps** (`data/level-heatmaps.json`, `scripts/generate-level-heatmaps.mjs`)
  — two matrices per level (distinct-path visit count, cumulative visit count incl. revisits),
  regenerated whenever a level's hints change. `scripts/level-heatmap-report.mjs` surfaces dead
  squares (zero-visit, non-object cells) and grid-trim candidates.
- **Resumable diverse-search session** (`modules/solver/diversification.ts`, superseded by the
  hint-enumeration engine — see the 2026-07-03 entry below) — a budget-bounded, incrementally
  resumable port of the CLI diversification script for interactive UI time budgets.
- **Submission duplicate-check fix** — a match against an already-published level now soft-warns
  and defers the verdict until hints are collected (proceeding as a hint-addition if the player's
  hints aren't already saved), while a match against a pending submission still hard-blocks.

---

## Dev Mode & Review Mode Access Gating (2026-06-19)

Dev Mode is no longer freely toggleable — turning it **on** requires the same admin Google
sign-in popup that already gated Review Mode; turning it off needs no auth. A new
**Review/Publish** shell button opens Review Mode directly (no re-prompt) once Dev Mode is on,
visible in both Play and Editor modes.

---

## Dev Mode Level Rating/Tagging Pane (2026-06-19)

A Dev-Mode-only pane for triaging level quality: preset/custom tags plus 1–5 difficulty/fun
ratings, persisted to Firestore keyed by level fingerprint (so ratings survive reordering). State
lives in `state.ENGINE.levelRating`, async load/save in `engine/level-rating-manager.js`
(stale-response-guarded via a request-id counter), persistence in
`persistence/level-rating-repository.js` against `level_ratings` (made public-read the next day —
see below). Retrieval via `npm run levels:ratings-report`. A same-day follow-up fixed three
theming/spacing bugs introduced with the pane (invisible labels on light panels, hardcoded
Tailwind colors on tag/scale buttons, missing sibling-pane gap CSS) — all folded into the broader
theme-coverage work two sections down.

---

## MustCross Diagonal-Trap Validation Fix (2026-06-19)

`validateLevelDetailed()`'s diagonal-trap heuristic (a **local, structural** check — it does not
run a real solve and cannot prove global (un)solvability) had a false positive: it only searched
for alternate turn space by extending *past* the blocked diagonal, never checking the *mirror*
diagonal across the same row/column. Fixed by adding both mirror checks. **Test-fixture lesson**:
the existing test fixtures for this check were confounded by incidental gate/goal placement
(unrelated infeasibilities firing alongside the intended one) — when adding structural-validator
fixtures, place gate/goal far from the cells under test unless adjacency to them is itself what's
being tested.

---

## Level Boredom Report — attempted, deemed unsuccessful (2026-06-19)

**Retracted. Do not re-attempt this approach.** The tool (since deleted) tried to triage all 156
levels for landmark-mechanic redesign candidates via a weighted "boredom score" over structural
signals (hint-path overlap, forced-move ratio, turn density, dead-square ratio, mechanic count).
**It failed against real human judgment twice in a row**: the top-ranked "most boring" levels
(L122, L143, L107) were independently confirmed by the user to be deliberately-designed and
genuinely satisfying. Root cause: almost every signal derived from "how deterministic/narrow is
the solution path" actually measures *constraint tightness*, not boredom — and in this puzzle
genre, tightly-constrained levels read as good, not boring, exactly backwards from what the score
assumed. Only two signals (mechanic count, dead-square ratio) avoid this confound, but weren't
validated alone before the approach was paused in favor of asking a human to identify ground-truth
boring levels directly.

---

## Full Theme Coverage Audit & Regression Test (2026-06-20)

An earlier ad-hoc theming fix (same day, above) caught two gaps by eye; this pass built a
systematic method instead: force every gated modal/overlay into the DOM at once, cycle all 31 real
themes, and flag any element whose computed background/text/border stayed byte-identical across
every theme while having a visible color. Found and fixed **~10 real bugs** — missing
`background-color` on two buttons, a broken fallback-chain ordering in the theme normalizer,
a hardcoded "Google sign-in" button color with no actual brand asset, an entire family of loading
modals wired to zero theme CSS, inline JS hex-literal status colors, a discarded toast-severity
channel, hardcoded submit-step-list colors, unthemed editor number inputs, and a flat jump-scare
text color. The audit method became a permanent Playwright regression test
(`tests/theme-coverage.spec.mjs`), with two deliberate, documented exceptions (theme-picker swatch
labels, palette-group object-identity icons).

---

## Level Ratings Made Public-Read; First Human-Judgment Findings (2026-06-20)

`level_ratings` Firestore rule changed from admin-only to public-read/admin-write (same pattern as
`published_levels`) — the collection holds level triage notes, not personal data, so only write
integrity needed the admin gate. This unblocked pulling real rating data to check the retracted
Boredom Report's conclusion against actual human judgment.

**Findings from the first 34/156 rated levels (small sample, directional not settled):**
mechanical complexity **correlates positively** with positive tags (every `great`/`interesting`/
`fun`-tagged level has ≥1 mechanic and skews must-cross-heavy/high-intersection-burden; every
`garbage`-tagged level has ≤1 mechanic and low reqInt) — **this independently confirms, with real
data, what the Boredom Report retraction already concluded** from three counterexample levels: it
wasn't a coincidence. Separately, the `too big` tag tracks low `navDensity` (path uses little of
the grid), not raw grid dimensions — same-sized grids with different navDensity get different
`too big` verdicts, giving a concrete, already-instrumented lever (trim grid or raise
reqLen/objectives) instead of a vague complaint.

---

## Tailwind CSS Removal (2026-06-20)

Removed the Tailwind build toolchain entirely (generated CSS, config, devDependency). **Method:
mechanical migration, not a markup rewrite** — every Tailwind class actually used anywhere was
reproduced as a hand-written plain-CSS rule under its literal class name, so `index.html` and
every `classList`/`className` call site needed zero changes. Cascade order was preserved exactly
(migrated rules spliced at the top of `app.css`, matching the old two-file load order) so no
specificity regressions. Found and fixed three latent bugs in passing (a button with a Tailwind
class never actually generated by a stale build, a dead unreferenced class, an untested-by-theme
warning color). A same-day follow-up found and fixed a font-weight cascade bug in the toast system
(`.font-bold` declared after `.font-black` in source order was silently winning regardless of
which weight callers intended — the least-urgent messages rendered boldest) by stripping redundant
weight tokens at the source. Also cleaned up 6 genuine duplicate-ID CSS rule blocks (distinct from
16 legitimate shared-group-selector patterns, left alone).

---

## CSS Architectural Refactoring: Layering + Semantic Components (2026-06-20, two sessions)

Moved from a monolithic, utility-heavy CSS file to a layered architecture with automated coverage
checks and semantic component classes (the predecessor to the later full semantic-CSS migration —
see 2026-06-25 below).

- **Coverage check** (`check:css-class-coverage`, new CI gate): every class used in HTML/JS must
  have a CSS definition, catching the most common post-Tailwind-removal regression.
- **File layering**: the monolithic `app.css` split into `reset.css` (Preflight) / `utilities.css`
  (hand-maintained utility classes) / `components.css` (tokens + project CSS) / `app.css`
  (aggregator) — later superseded by the 3-file `reset → tokens → components` chain once
  `utilities.css` was deleted entirely (2026-06-25).
- **Semantic component classes** introduced across two sessions and ~15 commits: buttons
  (`.btn`/`.btn-*` variants), cards, panels, modal titlebars/overlays/close buttons, options-row
  text, metric displays, rating tags, badges, shell buttons, editor grid-control buttons, form
  controls, plus small utility consolidations (`.fill`, `.stack-tight`). Net result: several
  hundred hardcoded Tailwind-derived utility instances collapsed into class families defined once
  in `components.css`, each theme-token-driven instead of hardcoded. Purely additive at the time —
  old utility classes stayed functional alongside the new semantic ones, enabling zero-regression
  incremental adoption (the full removal of the utility layer came later, 2026-06-25).

Every phase verified via full `npm run ci` + `npm run test:e2e` (including `theme-coverage.spec.mjs`
across all 31 themes) with zero regressions.

---

## App Architecture Refactor (2026-06-20, multi-part session)

An architecture review raised 8 proposals. The safe, fully-verifiable subset landed as code
immediately; the rest were captured as planning docs and implemented incrementally across the same
day. Full original account: `docs/refactor-notes/2026-06-20-app-architecture-refactor.md`. Outcomes
(all now current-state, described in `docs/architecture.md`/`docs/ui-accessibility.md`):

- **Debug surface narrowed** — read-only `window.PATHFINDER` (cloned snapshots) exposed by
  default; the mutable `window.APP` facade gated behind `?debug`.
- **Solver testing API** surfaced as a named `SOLVER_TESTING_API` export; five deprecated
  underscore-alias properties were kept temporarily then removed once all consumers migrated.
- **`ci` script grouped** into check and subsystem test stages (later further collapsed — see the
  Modernization Plan entry below).
- **`state-actions.js` split** into one file per state slice under `modules/state/actions/`,
  re-exported through a compatibility barrel.
- **Grouped engine facade** — `createEngine()` returns flat methods plus grouped namespaces
  (`game`/`navigation`/`overlays`/`hints`/`solver`/`review`/`ratings`), each entry the *same
  instance* as its flat counterpart (test-enforced), so the two surfaces can't drift. ~90 call
  sites across `modules/input/` later migrated to the grouped form.
- **Staged, acyclic composition root** — `createApp()` reorganized into pure-services →
  browser-adapters → controllers stages; the `data↔themes` cycle removed by making themes flow
  one-way from the loader. (The remaining `ui↔renderer`/`themes↔persistence`/`editor↔engine`
  cycles were removed in a later pass — see "§1 Architecture boundary work: Done" below.)
- **SVG sprite extraction + ARIA pass** — inline `<defs>` sprite sheet moved to a JS builder;
  ARIA labels added to icon-only controls.
- **Modal focus-trapping** — a central `focus-trap.js` wired into `modal-ui.js`'s open/close, so
  every modal gets Tab-cycling, Escape-to-close, and focus restoration for free.
- **Full keyboard-navigation pass** — arrow-key grid play, Backspace/Delete undo, themed
  `:focus-visible` rings, a shared `moveGridHead()` used by both keyboard and gamepad input.
- **Editor↔engine narrow port** (`createEditorEnginePort`, 9 members) replacing the editor's
  access to the whole engine facade.
- **Editor palette + modal-close-icon extraction** to data-driven JS builders; a new
  `check:modal-a11y` CI gate (every modal must carry dialog role/aria-modal/aria-label).
- **Visual-regression harness** (`tests/visual.spec.mjs`, opt-in `test:visual`) built specifically
  to make further modal-markup consolidation safe (pixel-diff catches layout shifts the
  color-only theme-coverage test can't) — used immediately after to consolidate modal
  header/loading-overlay markup into semantic classes, pixel-stable.
- **Flat engine-method removal was evaluated and declined** — the flat methods are load-bearing
  (the grouped namespaces are built *from* them; several consumers use them directly), so removing
  them would be a risky restructure for cosmetic gain.

Each increment verified independently with full `npm run ci` + `npm run test:e2e`.

---

## Modernization Plan — Working the Plan (2026-06-21)

Executed the (now-archived) staged 7-section modernization roadmap. Per-section outcomes are
current-state facts already captured in `docs/architecture.md`, `docs/typing.md`,
`docs/command-glossary.md`, and the ADRs — not repeated here. Notable incidents from the session:

- **§2's clarification (no central command dispatcher/reducer) was silently reverted on `main`**
  by an unrelated merge that had forked before the clarifying commit landed — caught, restored,
  and re-merged. Lesson: a clarifying commit to a shared planning doc can be silently lost in a
  merge if a stale branch's resolution wins; verify planning-doc content survived a merge, not just
  that the merge succeeded.
- **§2 pure decision cores** extracted for undo restoration, the reset-streak cheat, and
  review-advance navigation — each following the established `computeWinEffects`-style pure-core
  pattern, each backed by new unit tests. Declared **done** (ADR 0006): every correctness-sensitive
  flow now has a pure, tested transition/decision core, deliberately with no central dispatcher.
- **§1 architecture boundary** — a domain-purity check added as a real CI gate (previously
  convention-only); the last three composition-root cycles (`ui↔renderer`, `themes↔persistence`,
  `editor↔engine`) removed, making `createApp()` fully acyclic. Declared **done** (ADR 0008).
- **§3 UI component layer** — two more data-driven builders (guide cards, submit steps). Declared
  **done** (ADR 0007): boot-time builders + semantic CSS + centralized modal behavior, not a
  runtime framework.
- **§5 static typing** — started as check-only JSDoc + `tsc --noEmit` over a curated allowlist
  (later fully superseded by the full TypeScript migration, ADR 0011). Surfaced a real bug in
  passing: `path-validator`'s referee was passing the wrong-shaped map to `isValidMove`, silently
  making its no-edge-reuse check a no-op (fixed the next day — see below).

---

## Post-Plan Cleanup (2026-06-22)

Four fixes surfaced while working the modernization plan:

- **Path-validator no-op fixed** — the solver's independent referee now maintains a real
  per-cell axis-usage map instead of a visit-count map, so its no-edge-reuse rule actually runs.
  Verified all 156 baked hints + solver solutions still validate.
- **Vestigial `antiDeadCorridorWeight`** (defined on every scoring profile, read by nothing)
  removed.
- **MustCross gate/goal opposite-flank validation added** — a must-cross with a gate on one side
  and the goal directly opposite (collinear) can never be solved (the axis through them can't be
  crossed). Empirically validated against the solver across a reqLen/reqInt sweep, with
  gate-alone/goal-alone/perpendicular controls confirmed still solvable, before encoding as a new
  validator reason.
- **Retracted Boredom Report tool deleted** (script, npm entry, audit artifacts) — a disproven
  tool that still ran was a footgun; the retraction write-up above is the historical record.

---

## Semantic-CSS Migration Complete (2026-06-25)

Finished what the 2026-06-20 CSS refactoring started: `styles/utilities.css` deleted entirely, the
app reduced to the current 3-file `reset.css → tokens.css → components.css` chain with no utility
layer and no Tailwind toolchain. Full design record (including the primitive/soup keep-list and the
pixel-stability cascade-order gotchas, since folded into `docs/architecture.md`):
`docs/archive/styling-semantic-migration-plan.md`. One latent bug fixed in passing: the `spin`/
`ping` keyframes were never migrated when Tailwind was first removed, so two CSS animations had
referenced undefined keyframes (silently doing nothing) since that removal.

---

## Hint Corpus, Curation & Solve-Button Variety (2026-07-03)

A connected run of hint-system work, now fully described in current-state docs — this entry is a
pointer, not a duplicate: [`docs/hint-curation.md`](../hint-curation.md) (display curation +
discovery relationship), [`docs/solve-button-variety.md`](../solve-button-variety.md) (the Solve
button's tiered search), `docs/archive/hint-corpus-expansion-plan.md` (the back-end corpus-growth
design record). Headline outcomes: `modules/domain/path-features.ts` became the single
distinctiveness source of truth shared by curation and discovery; `hint-selection.ts`'s
coverage-guaranteed curation shipped; the back-end corpus-expansion run added +1,223 hints across
116 levels; `modules/solver/hint-enumeration.ts` + `variety-search.ts` extracted the enumeration
engine so one implementation now backs the back-end script, the Solve button, submission, and
review-approval flows; and `scripts/import-published-levels.mjs` was fixed to merge hints into
already-present levels (matched by fingerprint) instead of re-appending duplicates.

---

## Codebase Hardening Plan (2026-07-03)

All four sections of the (now-archived) hardening plan landed in four independent commits. Outcomes
(all current-state facts, captured in `CLAUDE.md` and `docs/testing.md`): the `reportError`
error-observability seam threaded through every failure path; `data/levels.json` cut from 2.4 MB to
144 KB by splitting the ~9,600-hint corpus into lazy-loaded per-level `data/hints/<NNN>.json` files;
logic-core coverage raised from ~66%/55% to 86%/75% (statements/branches) via new behavior suites
(PLAY-referee matrix, win-condition clause matrix, prune fire/no-fire tests, a solver
one-tiny-level-per-mechanic matrix); and three more pure controller cores extracted
(`pointer-input-core`, `editor-toolbar-core` additions, `submission-core` additions).

---

## Landmark Submission Serialization Fix (2026-07-03, PRs #1148/#1149)

> Reconstructed from merged PR diffs — implemented by another agent, recorded here for
> completeness. Full design record: `docs/archive/landmark-submission-serialization-plan.md`.

Submitted levels were losing landmark identity: a hand-rolled inline serializer emitted only the
landmark-*derived* generic buckets (`blocks`/`mustPass`), so on review, must-turn cells came back
as plain must-pass and surround/adjacent-turn cells as plain blocks — the level silently played by
weaker rules than authored. Fixed with one canonical `buildWireLevelData()` serializer (now used by
editor export, submission, and review publish alike) and a mechanics-canonical fingerprint v2. See
CLAUDE.md's Landmark Wire Format section for the current-state mechanism and the
fingerprint-version-bump gotcha this fix's follow-up (below) established.

---

## Editor Trap Scan: Live Worker Highlights (2026-07-04)

Reworked the Edit-mode "BOMBS?" trap-spot search around three complaints: a native
`window.confirm` retry prompt, a too-short initial budget, and no visibility into results until the
sweep finished. The solver Web Worker gained a streaming `TRAP` protocol (progress messages as
spots are found, not just a final result); a new `trap-scan-controller.ts` auto-starts a
background, non-blocking scan whenever the bomb tool is selected, painting an instant
"not-ruled-out-yet" candidate layer before confirmed spots stream in. The BOMBS? button's retry
prompt became an in-app toast with escalating search budget instead of a native popup; the one
other native-popup use in the app (published-level delete confirm) was replaced with a generic
in-app confirm modal. Notable finding: full enumeration essentially never completes on open levels
even at the (tripled) budget ceiling — `partial` is the normal terminal state, and the streamed
highlights are the actual product, not a fallback.

---

## Fingerprint Consolidation (2026-07-04)

A follow-up audit after documenting the landmark-fingerprint work above: mapped every place level
fingerprinting happens, looking for drift now that the algorithm is mechanics-aware (v2). Found and
fixed three real issues plus one dead port surface — the general "fingerprint-version-bump ripple
effects" gotcha this established is in CLAUDE.md's Landmark Wire Format section, not repeated here.
Worth keeping as its own anecdote: while developing the fix for `import-published-levels.mjs` (which
had its own diverging fingerprint comparison and, worse, an unconditional `main()` with no
entrypoint guard), running the module for any reason — including a test import — executed the real
network fetch and rewrote `data/levels.json`/`data/level-heatmaps.json` against the **live
production Firestore project**. This happened twice during development, in this sandbox, before the
entrypoint guard was added; both accidental writes were caught via `git status`/`git diff --stat`
before being mistaken for real changes, and reverted. **Lesson: a script with a network-touching
`main()` at module scope (no `import.meta.url` entrypoint guard) is a live-data hazard the moment
anything imports it for a reason other than running it as a CLI** — this is exactly the class of
bug the entrypoint-guard convention (now standard for this repo's network-touching scripts) exists
to prevent.

---

## Cell-occupancy schema gaps (2026-07-11 / 2026-07-15)

Two independent gaps in the "every cell holds at most one object" invariant (see CLAUDE.md's Grid
Objects section for the current-state rule and where it's enforced today):

- **Missed negative (2026-07-11)**: a stress-corpus generator bug (`scripts/stress/witness.mjs`'s
  `chooseEnd`) once let a generated level's goal cell silently coincide with a portal's
  destination, because the witness-path referee only validates move legality along the path, not
  whether the level's object placements are individually well-formed — and the schema layer had no
  general cross-object-overlap check to catch it either. Fixed by adding `validateRawLevel`'s
  cross-object occupancy check and a `terminals.has(path[i])` guard in `chooseEnd`.
- **False positive (2026-07-15)**: `validateRawLevel`'s new occupancy check itself then rejected
  legitimate data — `denormalizeLevel`'s wire output (`buildWireLevelData`, the real
  editor/submission export path) legitimately re-declares an impassable landmark's cell in `blocks`
  (and a mustPass/mustTurn landmark's cell in `mustPass`) alongside its own `landmarks` entry, since
  a landmark and its own derived block/mustPass are the same conceptual object, not two objects
  contending for one cell — the same reasoning `domain/level-fingerprint.ts`'s
  `landmarkDerivedCoordSets` already applied. Undetected until a real player submitted a landmark
  level through the in-game editor and `levels:import-published` tried to pull it in (every
  landmark level in the corpus before that was hand-authored JSON that never introduced the
  redundant entry). Fixed by excluding landmark-derived coordinates from the block/mustPass
  occupancy claims, via the shared `baseLandmarkRole` helper — a block/mustPass at a landmark cell
  with a *mismatched* role is still correctly rejected as a genuine conflict.
