# Codebase Hardening Plan

> **Status:** implemented (2026-07-03, branch `claude/codebase-hardening-plan-ko9vca`). §4 landed as
> the `reportError` seam (`modules/error-reporting.ts`); §2 as the `data/hints/<NNN>.json` split with
> lazy `data.getHints()`; §1 raised the logic-surface floors to 82/72/90/88 (measured 86/75/95/92);
> §3 extended the `*-core.ts` extraction to pointer-input and the trap-report/duplicate-check/popup
> decisions (further extraction in review/solver controllers remains open-ended, per the section's
> "keep pushing" intent). Four independent initiatives a diligent developer would take *now* — after
> the architecture/typing/quality work already landed — to make the codebase more efficient, strong,
> future-proof, comprehensible, testable, and clean. Each section gives **intent** (why it matters,
> for the benefit of an AI coder who lacks the surrounding conversation), **instructions** (concrete
> steps), and **invariants** (falsifiable conditions that hold only when the section's full spirit is
> realized). Sections are independent; do them in any order. The `levels.json` split (§2) is the one
> with a runtime-user-facing payoff; the coverage work (§1) is the highest strength-per-effort.

These are **not** re-litigations of settled decisions. The vanilla-DOM/no-framework model (ADR 0001),
the mutable-ENGINE-tree-without-a-central-dispatcher model (ADR 0006), and the ~700 remaining
adapter-boundary `any`s (ADR 0011 "Scope decisions") are deliberate and coherent — leave them.

---

## §1 — Raise logic-core test coverage (branches first)

### Intent
Correctness in this codebase *is* the pure logic: the win-condition rules, the path-state transition,
and the solver's pruning. Today the enforced coverage floors are weak (**42% branches / 50% statements**
in `vitest.config.mjs`) and the measured logic surface sits near **branches 48.9% / statements 58.9%**
(testing.md §2a baseline). Roughly **half the decision paths in `domain`/`runtime`/`solver` are never
executed by a test.** That is precisely where a subtle rule bug (a mis-scored constraint, an off-by-one
prune, a portal/landmark edge case) survives undetected — the unit suite is fast and green *and* blind.
The goal is to make the core's branches genuinely exercised, then ratchet the floors up so they can't
regress. This is a strengthening pass, not a coverage-theater pass: prefer tests that assert *behavior
that can break* (a win condition that must reject, a prune that must fire) over tests that re-assert a
constructor sets a field.

### Instructions
1. **Measure the real gaps, don't guess.** Run `npm run test:coverage` and read the per-file
   branch report for `modules/domain/`, `modules/runtime/`, `modules/solver/`. Rank files by
   *uncovered branch count*. The rules layer (`domain/move-rules`, `domain/path-validator`,
   `domain/landmark-rules`, `runtime/game-rules`, `runtime/path-state`) and the solver pruning
   (`solver/lower-bounds`, `solver/topology`, `solver/search` guards, `solver/prep`) are the
   expected hot spots.
2. **Write behavior tests against the uncovered branches**, using the shared
   `scripts/test-lib/fixtures.mjs` (`makeRawLevel`) and the colocated `modules/**/*.test.ts`
   convention. For each constraint kind (must-pass, must-cross, portal forced-move, flipping-filter
   parity, surround/turn landmarks, false-goal/goose hazards) assert **both** a satisfying path is
   accepted **and** representative near-miss paths are rejected (wrong length, wrong intersection
   count, unmet obligation). Cover the win-condition matrix in `checkWinCondition`/`game-rules`
   exhaustively — every clause in the 7-part win condition should have a test that fails if that
   clause is deleted.
3. **Add targeted solver-pruning tests** that assert a prune *fires* on an infeasible state
   (e.g. parity mismatch, MST lower bound exceeds remaining budget) and does *not* fire on a
   feasible one — the pruning is the solver's correctness-critical core and is thinly tested.
4. **Ratchet the floors.** Once the core is materially higher, raise the `thresholds` in
   `vitest.config.mjs` to just below the new measured numbers (leave normal solver-suite jitter
   headroom, per the existing note). The floor's job is to prevent regression, so it must track
   reality upward.
5. Keep `npm run ci` green; do not add coverage over the deliberately-excluded DOM/adapter shells
   (that is §3's job, via extraction — not by testing DOM in `node`).

### Invariants
- `vitest.config.mjs` branch threshold is **≥ 70%** (statements ≥ 75%) over the logic-surface
  `include` set, and `npm run test:coverage` passes at those floors.
- **Mutation sanity:** deleting any single clause of the 7-part win condition, or negating any single
  solver prune guard, causes **at least one** unit test to fail. (Spot-check by hand on a sample; the
  intent is that the suite kills real logic mutations, not that a mutation-testing tool is wired up.)
- No new test asserts only construction/trivia; each added test exercises a branch that was
  previously uncovered (verifiable by the before/after coverage delta).
- The DOM/adapter shells remain out of the coverage `include` set — coverage rose because the core
  is better tested, not because the measured surface shrank.

---

## §2 — Split generated hints out of `levels.json` and lazy-load them

### Intent
`data/levels.json` is **~2.4 MB / 21k lines**, and the ~9,600 generated hint paths are *the bulk of its
size* (CLAUDE.md "Level Stats"). Because hints are stored inline, **every player downloads all ~9,600
hint paths at boot** — hints for 156 levels they will mostly never reach and usually never ask to see.
The authored level definitions (grid, gates, goal, objects) are tiny; the generated companion dominates
the payload. This is two problems wearing one coat: a **runtime efficiency** problem (a multi-megabyte
boot download of data used lazily, if ever) and a **cleanliness/future-proofing** problem (authored
source-of-truth entangled with a regenerable artifact, which is also what has made the file unwieldy to
diff and review). Splitting hints into a separate artifact loaded **per level, on demand** cuts the
initial payload by most of that 2 MB and cleanly separates authored data from generated data.

> **Load-bearing constraint:** level identity is currently the **array index** into `levels.json`
> (`data/level-heatmaps.json` and the import pipeline dedupe/join on structural fingerprint + index).
> The split must preserve a stable join key between a level and its hints. Do **not** reorder or renumber
> levels as part of this work; the join key is the 1-based level number / array index as it stands.

### Instructions
1. **Introduce a hints artifact keyed by level number**, e.g. `data/level-hints.json` as
   `{ "<levelNumber>": number[][] }`, or per-level files `data/hints/<NNN>.json`. Keep `hints` out of
   `levels.json` entirely (a level object no longer carries an inline `hints` array at rest).
2. **Loader/data layer:** `modules/data.ts` + `modules/loader.ts` must (a) load `levels.json`
   *without* hints at boot, and (b) expose an async accessor `getHints(levelNumber)` that fetches the
   level's hints lazily and caches them. The hint system (`engine/*` + `state/actions/hint-actions`)
   requests hints only when the player invokes a hint on the current level — never at boot.
3. **The full set feeds two client-side derivations — store it whole, never pre-curated.** Both the
   heat-map and play-mode hint curation are computed from the *complete* hint set at runtime:
   - `data/level-heatmaps.json` is a *generated companion* built from the full hint set; its generator
     (`npm run levels:generate-heatmaps`) must read hints from the new artifact, and the heat-map the
     player sees must keep reflecting **all** hints for the level.
   - Play-mode display curation (`selectDisplayHints`, see [`hint-curation.md`](hint-curation.md)) picks
     its mutually-distinct subset **client-side from the full list** each time a hint is requested.

   So `getHints(levelNumber)` must return the level's **entire** hint array. Do **not** store a
   curated/trimmed subset in the new artifact to save bytes — the heat-map would lose coverage and the
   curation variety guarantees (every gate, every portal-usage, must-cross order) would break.
4. **Preserve every producer/consumer of hints:** the discovery sweeps
   (`scripts/hint-diversification.mjs` and `scripts/hint-corpus-expand.mjs`), the import pipeline
   (`levels:import-published`), the hint-path oracle test (`test:hint-path-oracle`), the PLAY-referee
   corpus guard (`check:hint-validity`), and `scripts/level-json-format.mjs` must all read and write
   hints through the new artifact. Update `check`/validators accordingly.
5. **Vite build:** ensure the new artifact(s) are copied into `dist/` (like the other `data/*.json`)
   and fetched with the same base-relative URL scheme.

### Invariants
- `data/levels.json` contains **no** `hints` arrays; loading it and rendering/playing any level works
  with hints never fetched until first requested (verify: a boot with hint-fetch blocked still plays).
- **Boot payload drops materially:** the bytes fetched before first interaction shrink by approximately
  the former hint volume (order-of-magnitude: MBs → hundreds of KB).
- `npm run test:hint-path-oracle` and `npm run levels:generate-heatmaps` pass against the new artifact,
  and the regenerated `level-heatmaps.json` is **byte-identical** to one generated from the pre-split
  inline hints (proves the join key and hint set are preserved exactly).
- Level identity is unchanged: the same level number maps to the same level and the same hint set as
  before the split (no reorder/renumber).
- No code path reads `level.hints` from a rest-state level object; all hint access goes through the
  async `getHints(levelNumber)` accessor.
- `getHints(levelNumber)` returns the **full, uncurated** hint set; display curation and the heat-map
  remain client-side derivations over it (nothing is curated or trimmed at rest).

---

## §3 — Shrink the e2e-only DOM/controller shell by extracting pure cores

### Intent
About **~6,000 LOC** across `modules/render` (1048), `modules/ui` (868), `modules/input` (2437),
`modules/engine` (977) plus the top-level `engine.ts`/`editor.ts`/`ui.ts` is **excluded from unit
coverage by design** and verified only by **~30 Playwright e2e tests**. That is thin for the amount of
*decision logic* living in those controllers (e.g. `input/editor-toolbar-controller` 460 LOC,
`input/submission-controller` 357). The right pattern is already established — `modules/input/*-core.ts`
(navigation/editor-toolbar/review/solver/submission cores) are pure, unit-tested, and coverage-gated —
but it is **partial**: a lot of branch-heavy logic still lives inside the DOM-coupled controllers, where
it can only be reached through a browser. The intent is to keep pushing the **decision/orchestration**
logic down into pure cores (no DOM, no `document`, injected effects), leaving the controllers as thin
wiring that reads inputs and dispatches effects. This makes the interaction logic testable in `node`,
comprehensible in isolation, and shrinks the browser-only blind spot — without changing behavior.

### Instructions
1. **Pick the fattest controllers first** (by LOC and by branch density): `editor-toolbar-controller`,
   `submission-controller`, `review-controller`, `solver-controller`, `pointer-input-controller`.
2. For each, **identify the pure decision logic** — the parts that compute *what should happen* from
   state + inputs (validation gating, duplicate resolution, step sequencing, selection/cycling math)
   as opposed to *doing* it (DOM reads/writes, `ui.*`, `engine.*` calls). Move the former into the
   colocated `*-core.ts` as pure functions returning **plain data / effect descriptions**; the
   controller becomes a thin adapter that gathers inputs, calls the core, and applies the returned
   effects. Follow the existing `submission-core`/`review-core` shape.
3. **Unit-test the extracted cores** (colocated `*.test.ts`, `node` env, `makeRawLevel` fixtures),
   covering the branches that were previously reachable only via e2e. Add these files to the coverage
   `include` set with the strict per-file floor the other cores already carry.
4. **Do not** try to unit-test the residual DOM shells in `node`; they stay e2e-verified. Success is
   measured by how much logic *left* the shell, not by testing the shell.
5. Keep the AST architecture guards green (the extracted cores are pure → they must not import
   adapter layers; the controllers keep routing ENGINE mutations through `state-actions`).

### Invariants
- Each targeted controller shrinks to predominantly **wiring**: gather inputs → call core → apply
  effects, with the branch-heavy decisions living in its `*-core.ts`.
- Every new `*-core.ts` is pure (no `document`/`window`/DOM types, no adapter imports — enforced by
  the existing `no-restricted-globals`/`no-restricted-imports` scoped rules) and carries the strict
  per-file coverage floor (statements/functions ≥ 95%, branches ≥ 85%).
- Behavior is unchanged: the full Playwright e2e suite (`npm run test:e2e`) passes before and after,
  with no spec edits needed to accommodate the refactor.
- The share of `modules/input` (and the other adapter dirs) that is pure, unit-covered `*-core.ts`
  measurably increases; the residual controller LOC measurably decreases.

---

## §4 — Real error observability

### Intent
This is a **deployed** app (GitHub Pages + Firebase), but failures currently go to **`console` only**
(~37 `console.*` sites in source, plus several `catch` blocks that swallow or only warn). That means
player-side failures — a failed submission save, an auth hiccup, an unexpected `null`, and now the
rejection paths the new promise-safety lint rules guard — are **invisible** to the developer: there is
no signal that anything broke in production. Modern practice for a shipped client app is a single,
minimal **error-reporting seam** so real failures surface somewhere observable, and so the codebase has
one intentional place to route errors instead of scattered `console.warn`s. This is about *visibility*,
not adding a heavy dependency or a paid service.

### Instructions
1. **Add one error-reporting port** (an injected adapter, in keeping with the DI/ports model —
   `modules/ports.ts` + composition root): e.g. `reportError(context: string, err: unknown,
   meta?: object)`. Default implementation logs; it can later be pointed at a real sink (Firestore
   collection, or a lightweight endpoint) without touching call sites. Keep it CSP-clean and bundled
   (no new CDN `<script>`).
2. **Route existing failure sites through it**: replace ad-hoc `console.error`/`console.warn` in
   `catch` blocks and the `.catch(...)` handlers (e.g. the submission/solver flows) with
   `reportError(...)`. **Do not** silently swallow — every `catch` either handles-and-reports or
   rethrows; none should drop an error on the floor.
3. **Wire the top-level boot/runtime error hooks** (`window.onerror` / `unhandledrejection`, which
   `loader.ts` already partially observes) into the same port, so uncaught errors and unhandled
   rejections are captured in one place.
4. Keep it **safe-by-default and privacy-aware**: report diagnostic context (operation, error
   message/stack), never user content or credentials; respect the existing debug-surface conventions.

### Invariants
- There is exactly **one** error-reporting seam (`reportError` port); grep shows `catch` blocks and
  `.catch` handlers route through it rather than calling `console.*` directly (a bare `console.error`
  in a `catch` becomes the exception, not the norm).
- **No swallowed errors:** every `catch` in `modules/` either reports (via the port) or rethrows;
  none is empty or comment-only. (The intentional advisory ones — e.g. "false-goal check is advisory,
  never block submission" — still *report*, they just don't rethrow.)
- Uncaught errors and unhandled promise rejections at runtime reach the port (verifiable by injecting
  a throwing operation in a test/harness and asserting the port received it).
- The default reporter is CSP-clean, bundled by Vite, adds no CDN dependency, and logs no user
  content/credentials.

---

## Sequencing note
§1 (coverage) and §3 (core extraction) reinforce each other — extraction makes more logic unit-testable,
which feeds the coverage goal — so doing §3 in service of §1 is natural. §2 (hint split) is independent
and carries the clearest user-facing win (boot payload). §4 (observability) is independent and small.
None requires an architectural change; all are additive hardening.
