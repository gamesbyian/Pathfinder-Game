# Codebase Strengthening Plan

> **Status: COMPLETE (2026-06-27).** All four initiatives landed on branch
> `claude/codebase-strengthening-plan-fwd31b` and their acceptance invariants hold and are
> demonstrable (see each "Done when" block and the per-initiative status notes below):
> - **A — Type the ENGINE/state core** ✅ `EngineState` + per-slice interfaces; `resolveEngineState`
>   typed; **0** `: any`/`as any` in `modules/state/` + `modules/state/actions/`; compile-time
>   `IsAny` regression guard in `state-slices.ts`.
> - **B — Test + measure the interaction layer** ✅ pure cores extracted from the five logic-heavy
>   input controllers + dedicated unit suites (~100% line/func, ~98% branch); `@vitest/coverage-v8`
>   + `test:coverage` wired into CI with a soft global floor and strict per-file core floors;
>   baseline recorded in [`testing.md`](testing.md).
> - **C — Bundle Firebase + Tone (compat CDN → modular SDK)** ✅ bundled npm deps; `script-src`
>   narrowed to `'self' https://apis.google.com`; persistence SDK-typed (`declare const firebase`
>   deleted). Live `signInWithPopup` / Firestore / audio confirmed working on deploy.
> - **D — Make CLAUDE.md maintainable** ✅ hand-enumerated `modules/**` tree replaced with a pointer
>   to [`architecture.md`](architecture.md)/[`typing.md`](typing.md); 786 → 667 lines.
>
> The detail below is retained as the design record (rationale, invariants, proof obligations).
>
> **Scope & provenance.** This plan comes from a fresh, direct audit of the repository on
> **2026-06-26** — every figure below was measured against the working tree, not carried over from
> any prior plan. It deliberately covers the axes a general "is this code well-built?" review cares
> about — *strong, future-proof, comprehensible, testable, clean* — and targets what is **actually
> still weak now**, after the build/CSP/test-runner/TypeScript/styling work already landed.
>
> **Out of scope (by owner):** the level-data critical-path / hint-payload split (array-index
> identity must not be baked in until the level corpus stabilizes). Tracked elsewhere; not here.

## Current-state baseline (the good news, measured)
The project is no longer "vibe-coded" at the infrastructure level, and a plan should not pretend
otherwise:
- **0** `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`, **0** `eslint-disable`, **0**
  `TODO`/`FIXME`/`HACK` across `modules/` — no suppression or marker debt.
- **No god-files** — largest module is `solver/search.ts` at 466 lines.
- **5** empty `catch` blocks total — disciplined error handling.
- Clean layering (`domain → runtime → solver`), consistent `createX({deps})` dependency injection,
  enforced boundaries (`check:engine-state-boundary`, `check:domain-purity`), enforced `<meta>` CSP,
  a single semantic-CSS system (Tailwind fully removed), 11 ADRs, Vite build, Vitest.

The remaining weaknesses are **deeper and semantic**, not cosmetic. Four initiatives, ranked by
leverage.

---

## How "done" is judged (intent over steps)

Each initiative is complete only when its **acceptance invariants** (the "Done when" block) hold and
are *demonstrable* — **not** when its step list was performed. "Demonstrable" means the
codebase or CI can *show* the intent was realized: the compiler now rejects a mistake it previously
accepted, a test now fails when the behavior breaks, a `grep`/check returns the stated result.

The intent of every phase here is **more enforcement, more safety, more clarity**. Therefore the
following are **never** acceptable ways to satisfy a step, and any of them means the phase is *not*
done even if every step was followed: introducing `any` / `as any` / `@ts-ignore` / `@ts-nocheck` /
`@ts-expect-error`, adding `eslint-disable`, using `.skip` / `.only` or deleting assertions to make a
suite pass, or weakening/disabling an existing check. The repo's current baseline has **zero** of
these (measured above) — that baseline must not regress. If an invariant genuinely cannot be met
without one of these escape hatches, **stop and flag it** rather than paper over it; a surfaced
limitation is a success, a hidden one is a failure.

Each phase below names a **proof obligation**: a concrete thing you can do to demonstrate the
invariant actually bites (e.g. introduce a deliberate fault on a throwaway branch and show CI catches
it). Treat the proof as part of "done."

---

## Initiative A — Make the type system actually enforce (type the ENGINE/state core)

> **✅ Done.** `EngineState` + per-slice interfaces in `state-slices.ts`; `resolveEngineState`
> returns `EngineState`; all 11 state-action modules type-checked against the slice shapes;
> **0** `: any`/`as any` in `modules/state/` + `modules/state/actions/`; `IsAny` compile-time guard
> prevents regression. See [`typing.md`](typing.md).

**This is the highest-leverage change in the repo.** The `.js→.ts` migration is complete in letter
(every file is `.ts`, `tsc --strict` is green) but shallow in force: the central runtime state object
is untyped, and that `any` radiates outward through every layer that touches it.

**Evidence (measured).**
- `modules/state-slices.ts:154` — `createEngineState({ core }): any`. The single mutable runtime
  state tree (`ENGINE`) is typed `any`; `state.ts`'s `createState()` returns `{ ENGINE: any }`.
- Consequence — `: any` annotations across `modules/**/*.ts`: **1,156** total, plus **166** `as any`
  casts. Distribution:
  - logic core (`domain`+`runtime`+`solver`): **147** — mostly legitimate wire-format/untrusted
    boundaries.
  - adapter layer (`engine`+`input`+`ui`+`render`): **502**.
  - top-level glue (`modules/*.ts`): **218**.
  - remainder in `state`/`theme`/`editor`/`persistence`.
- The slice **shapes already exist** as object-literal factories (`createNavigationState`,
  `createHazardState`, `createHinterState`, … in `state-slices.ts`) — TypeScript already infers each
  shape; they just aren't named or composed into an `EngineState`.

**Why it matters (prompt axes: strong, future-proof, comprehensible).** Today a typo'd
`engineState.hinter.pathLst`, a wrong-typed slice write, or a refactor that drops a field type-checks
clean — the compiler catches none of it. Typing the core is what converts the migration from
"renamed files" into "the compiler has your back," and it's the prerequisite that makes tightening
the adapter `any`s worthwhile (until `ENGINE` is real, adapter params *have* to be `any`).

**Approach (incremental, each step green).**
1. Define an `EngineState` interface (and per-slice interfaces) in `state-slices.ts`. Cheapest
   correct start: derive from the factories — `type NavigationState = ReturnType<typeof
   createNavigationState>` — then promote the ones that need precision (e.g. typed `Map`/`Set`
   generics, `path: number[]`) to explicit interfaces. Make `createEngineState` return `EngineState`
   and `createState` return `{ ENGINE: EngineState }`.
2. Fix the fallout **inside the state layer first**: `modules/state/actions/*.ts` resolve and mutate
   `ENGINE` — give `resolveEngineState` a typed return and let the 11 slice-action modules tighten
   from `any` to the real slice type. This is where the compiler starts earning its keep (every
   mutation site is checked against the slice shape).
3. Ripple outward opportunistically: `engine.ts`, `render/create-render-model.ts`, and the
   controllers can drop `state: any` for the real type **where it's low-friction**. Do **not** chase
   100% — DOM element handles and injected sub-system deps stay `any` by design; the target is the
   *state* tree, not every parameter.
4. Add a guard so this can't regress: a `check:types` is already in CI; additionally consider a
   lightweight lint/CI assertion that `createEngineState`'s return type is not `any` (or simply rely
   on the interface being load-bearing once step 2 lands).

**Done when (invariants — all must hold and be demonstrable):**
1. `createEngineState()` returns a named `EngineState` interface and `createState()` returns
   `{ ENGINE: EngineState }` — neither is `any`, directly or transitively.
2. `EngineState` and every slice interface type the **state data** concretely: `Map`/`Set` carry real
   key/value generics, arrays carry element types, scalars are typed. **No bare `any` field** stands
   in for state data. (Injected behavioral fields — timers, queued callbacks — may be typed *function
   signatures*; that is not a bare `any`.)
3. `resolveEngineState` returns `EngineState`, so all 11 `modules/state/actions/*.ts` modules operate
   on the typed tree. A wrong field name or wrong-typed write in a state action **fails
   `check:types`**.
4. `: any` occurrences in `modules/state/` + `modules/state/actions/` reach **0**, or a written,
   justified allowlist (each remaining one has an inline reason). Net **new** `as any` introduced by
   this work = **0** (no papering-over).
5. `npm run ci` and `npm run test:unit` stay green; **no runtime behavior change** (this is a typing
   change only).
6. The adapter layer is *allowed* to keep `any` where it reads DOM handles / injected subsystems —
   but any controller that consumes `state` may now annotate it `EngineState` without a cast. (Full
   adapter tightening is Initiative-B/own-follow-up territory, not required for A to be done.)

**Proof obligation.** On a throwaway branch, rename a slice field in `state-slices.ts` (e.g.
`hinter.pathList` → `hinter.pathLst`) *without* fixing call sites, and show `check:types` now fails at
the consuming action/controller sites. Before this phase it compiled clean; after, it must not. Revert
the branch. (Optionally, fold this into CI as a guard that `EngineState` is not assignable to/from a
bare `any`.)

**Risks.** Medium. The state factories use `new Map()`/`new Set()`/`[]` that infer loose generics;
promoting them surfaces real mismatches (this is the point, but it's work). Mitigation: do it
slice-by-slice behind green `check:types` + `test:unit`; the state-action unit suites
(`state-unit-tests`, `state-actions-unit-tests`) already exercise these paths.

**Effort:** Medium–Large. **Leverage:** Highest. **Do first.**

---

## Initiative B — Test (and measure) the interaction layer

> **✅ Done.** Pure cores extracted from `submission`/`solver`/`review`/`navigation`/`editor-toolbar`
> controllers (`modules/input/*-core.ts`), each with a `scripts/input-*-core-unit-tests.mjs` suite
> (~100% line/func, ~98% branch). `@vitest/coverage-v8` + `test:coverage` enforce a soft global floor
> on the logic surface plus strict per-file floors on the cores; baseline + how-it-bites in
> [`testing.md`](testing.md) §2a. e2e remains the integration backstop (no spec deleted).

The logic core is exemplary; the half of the app that wires it to the DOM is verified only by slow,
coarse end-to-end tests, and **no coverage is measured anywhere**.

**Evidence (measured).**
- Unit suites by tier (`scripts/*-unit-tests.mjs`): `solver` **14**, plus `domain`/`runtime`/`state`/
  `engine`/`ui`/`persistence` suites — but **`input/` has 0** and **`render/` has 0** dedicated unit
  suites.
- The untested controllers are the **logic-heavy** ones: `input/editor-toolbar-controller.ts` (463
  lines), `submission-controller.ts` (330), `solver-controller.ts` (302), `review-controller.ts`
  (300), `navigation-controller.ts` (239). Their branching (portal pairing, hint cycling, submission
  dedupe, gamepad/keyboard routing) is exercised only through `tests/*.spec.mjs` (8 Playwright specs)
  — slow, and only at the happy-path/integration grain.
- **No coverage tooling at all**: `@vitest/coverage-*` is not installed and there is no
  `test:coverage` script — "440 tests" is an unquantified number with an unknown blind spot.

**Why it matters (prompt axes: testable, strong).** A reviewer can't tell what's actually covered,
and the riskiest interaction logic (the parts most likely to break on a refactor) has the weakest,
slowest safety net.

**Approach.**
1. Wire coverage: add `@vitest/coverage-v8` + a `test:coverage` script (`vitest run --coverage`).
   Don't gate CI on a hard threshold yet — first **measure** and publish the baseline so the blind
   spots are visible.
2. Extract pure cores from the heavy input controllers, mirroring the pattern already used on the
   engine controllers (`computeWinEffects`, `computeJumpScareEffects`, `planResetCheat`,
   `planSubmissionAdvance` are DOM-free and unit-tested). Pull the decision logic out of
   `submission-controller` / `editor-toolbar-controller` / `solver-controller` into DOM-free
   functions and unit-test those directly (fast), leaving the controller as thin wiring.
3. Add `input-*-unit-tests.mjs` suites for the extracted cores; keep the Playwright specs for true
   integration only.
4. Once the baseline is known and the cores are covered, consider a *soft* coverage floor in CI for
   `modules/` (excluding the deliberately-thin adapter shells).

**Done when (invariants — all must hold and be demonstrable):**
1. `npm run test:coverage` exists, runs in CI's reach, and emits a coverage report; the **baseline
   numbers are recorded in the repo** (e.g. a table in `docs/testing.md`), so the blind spots are
   visible, not implied.
2. Each logic-heavy input controller — `editor-toolbar`, `submission`, `solver`, `review`,
   `navigation` — has its **decision logic in a DOM-free exported function** (a pure core), and each
   core has a dedicated unit suite under `scripts/`. After extraction the controller file contains
   *wiring only*: no branch that decides game/editor/submission behavior lives in code reachable only
   by Playwright.
3. The enumerated behaviors of those cores are actually covered by assertions — not just imported.
   Concretely: line+branch coverage of the extracted core modules is **≥ 80%** (state a number and
   meet it), and every distinct outcome named in the controller's responsibility (e.g. portal
   pairing states, hint cycling/wrap, submission dedupe, reset-streak) has at least one test.
4. A **soft coverage floor** is wired into CI for the `modules/` logic surface (excluding declared-
   thin adapter shells via an explicit exclude list), so a future regression that drops a core's
   coverage **fails CI**.
5. No e2e spec was deleted to make room; e2e remains the integration backstop.

**Proof obligation.** On a throwaway branch, break one extracted core's logic (e.g. invert a
submission-dedupe condition) and show its **unit suite fails fast** (sub-second), where previously
only a multi-second Playwright run could have caught it (and may not have). Separately, lower a core's
coverage below the floor and show CI rejects it. Revert.

**Risks.** Low. Extraction is mechanical and behavior-preserving; e2e remains the backstop while
cores are pulled out. Enabled and de-risked by Initiative A (typed state makes the extracted cores'
signatures real, not `any`).

**Effort:** Medium. **Leverage:** High. **Can run in parallel with A; cores benefit from A landing first.**

---

## Initiative C — Modernize the Firebase + Tone dependency story (CDN compat → bundled modular)

> **✅ Done.** `firebase` (modular) + `tone` are npm `dependencies` bundled by Vite; the four CDN
> `<script>` tags are removed (only local `firebase-config.js` remains). `firebase-client.ts` is
> rewritten against `firebase/app|auth|firestore` with its public shape preserved; repos/stores use
> the modular free functions; `declare const firebase`/`__initial_auth_token` deleted. `script-src`
> narrowed to `'self' https://apis.google.com` (`check:csp`/`check:third-party` green). The live
> `signInWithPopup` admin sign-in, Firestore reads/writes, and audio were confirmed working on a
> deploy under the tightened CSP. See [`content-security-policy.md`](content-security-policy.md).

The app ships **zero bundled runtime dependencies** and instead pulls Firebase and Tone from CDNs as
global `<script>` tags using Firebase's **deprecated compat API**.

**Evidence (measured).**
- `package.json` `dependencies: {}` — nothing is bundled.
- `index.html` loads four CDN scripts: `firebase-app-compat.js`, `firebase-auth-compat.js`,
  `firebase-firestore-compat.js` (v11.6.1), and `Tone.js` (14.7.77).
- The compat (namespaced/chained) API is used across **7** `modules/persistence/*.ts` files:
  ~25 `.collection(`, ~21 `.doc(`, plus `.firestore()`, `.auth()`, `FieldValue.serverTimestamp()`,
  `GoogleAuthProvider`, `.batch()` (×3), `.onSnapshot()` (×2), `signInWithPopup` /
  `signInAnonymously` / `signInWithCustomToken`. The whole surface is centralized behind
  `createFirebaseClient` — a real asset for this migration.
- Because `firebase` is a CDN global, `firebase-client.ts` carries `declare const firebase: any` —
  the entire Firebase surface is untyped.

**Why it matters (prompt axes: strong, future-proof, clean, secure).**
- *Future-proof:* the compat API is legacy; the modular SDK (`firebase/app`, `firebase/firestore`,
  `firebase/auth`) is the supported path and is fully typed.
- *Clean/strong:* removes 3 CDN origins from `script-src` (tightening CSP #5), removes the untyped
  global, and tree-shakes (compat ships the whole SDK).
- *Supply chain:* fewer third-party `<script>` tags pinned only by URL.

**Approach (sequence carefully — it's an API change, not just a packaging change).**
1. `npm i firebase` (and evaluate `tone` as an npm dep). Confirm the Vite build tree-shakes them.
2. Rewrite `persistence/firebase-client.ts` against the modular API (`initializeApp`, `getFirestore`,
   `getAuth`, `collection`/`doc`/`getDoc`/`getDocs`/`onSnapshot`/`writeBatch`/`serverTimestamp`,
   `signInWithPopup`/`GoogleAuthProvider`). Keep its **public shape identical** so the 6 repo/store
   files barely change — the wrapper is the seam.
3. Migrate the repos/stores' direct compat calls (`.collection().doc()…`) to the modular free
   functions. Drop `declare const firebase: any`; the persistence layer becomes genuinely typed.
4. Remove the four CDN `<script>` tags from `index.html`; narrow `security/csp-policy.json`
   accordingly and re-run `check:csp` + `check:third-party`.
5. Verify: `firestore-rules` tests, `startup-smoke`, and the Dev/Review sign-in flow (the only auth
   path) — manually confirm `signInWithPopup` still works under the tightened CSP.

**Done when (invariants — all must hold and be demonstrable):**
1. `index.html` contains **no** `*-compat.js` and no `Tone.js` CDN `<script>` (`grep` for
   `compat`/`cdnjs`/`gstatic/firebasejs` in `index.html` = **0** lines).
2. `firebase` (and `tone`, if migrated) appear in `package.json` `dependencies` and are **bundled by
   Vite** — verified by the build output containing them and the running app making **no** runtime
   request to the firebase/tone CDNs (check the network panel or the e2e third-party-block fixture).
3. `declare const firebase` and `declare const __initial_auth_token` are **deleted** from
   `firebase-client.ts`; the Firebase surface is typed by the SDK — `: any`/`as any` for the firebase
   API in the persistence layer drops to **0** (the SDK provides the types).
4. `createFirebaseClient`'s **public shape is unchanged**, so the 6 repo/store files needed only
   call-site swaps (compat chains → modular free functions), not signature changes — demonstrable by
   the diff being confined to call syntax in those files.
5. `security/csp-policy.json` no longer lists the firebase gstatic CDN origins (nor the cdnjs Tone
   origin if migrated); `check:csp` and `check:third-party` are **green with the narrower policy**.
6. `test:firestore-rules` and `test:startup-smoke` are green, and the Dev/Review `signInWithPopup`
   path is **manually confirmed working** under the tightened CSP.

**Proof obligation.** Load the built app offline-to-CDN (block the firebase/tone CDN origins) and show
it still boots, themes/audio still work, and sign-in still completes — proving nothing is silently
still fetched from a CDN. Show `script-src` in the shipped `<meta>` CSP is strictly smaller than
before (fewer origins).

**Risks.** Medium — it changes a working integration on a live game; sign-in and Firestore writes
must be re-verified. Mitigation: the wrapper seam contains the blast radius; do it as one dedicated,
separately-verified change (do **not** combine with A or B).

**Effort:** Medium. **Leverage:** Medium–High. **Independent — schedule after A is underway.**

---

## Initiative D — Make CLAUDE.md maintainable (trim + reduce hand-sync)

> **✅ Done (pointer route).** The hand-enumerated `modules/**` file tree is gone — replaced with a
> concise "modules/ source tree" pointer to [`architecture.md`](architecture.md) (layering/ports) and
> [`typing.md`](typing.md) (typed-surface depth) plus the directory itself. 786 → 667 lines, durable
> facts only. (Chose the plan's "pointer" alternative over a generated tree: an auto-generated file
> listing isn't a durable fact and just relocates the rot — pointing at the source of truth, which
> can't drift, is the stronger fit.)

**Evidence (measured).** `CLAUDE.md` is **785 lines** and is the canonical onboarding/reference doc.
A large fraction is a hand-maintained file-by-file repository tree and per-module prose that drifts on
every structural change (it required manual patching three times during the TypeScript migration
alone).

**Why it matters (prompt axes: comprehensible, clean).** A reference that must be hand-edited to stay
truthful is a standing source of staleness; the more it lists *files*, the faster it rots.

**Approach (light, low-risk).**
1. Move the volatile, enumerable content (the full module-by-module file tree) out of the
   hand-written doc — either generate it (a small script that emits the tree from `modules/`) or
   replace it with a short pointer to `docs/architecture.md` + the directory itself.
2. Keep CLAUDE.md to durable, slow-changing facts: project overview, the layering model, the
   build/test/deploy commands, and the load-bearing invariants/gotchas — link into `docs/` for
   detail.
3. De-duplicate against `docs/architecture.md`, `docs/typing.md`, and the ADRs (CLAUDE.md should
   point, not restate).

**Done when (invariants — all must hold and be demonstrable):**
1. CLAUDE.md no longer hand-enumerates individual `modules/**` files (the volatile file-by-file tree
   is gone) — it is either generated or replaced with a pointer to `docs/architecture.md` + the
   directory.
2. If the tree is generated, a `check:` script verifies it matches the real `modules/` layout and is
   wired into `npm run check`, so the doc **cannot silently drift** (a moved/renamed file fails CI
   until the doc is regenerated).
3. CLAUDE.md length is materially reduced (target: well under its current 785 lines) and contains only
   durable facts — overview, layering model, build/test/deploy commands, load-bearing
   invariants/gotchas — with links into `docs/` for detail.
4. No content is duplicated from `docs/architecture.md` / `docs/typing.md` / the ADRs; CLAUDE.md
   points rather than restates (spot-check: no paragraph appears in both).

**Proof obligation.** If generated: rename a module file and show `npm run check` fails until the doc
is regenerated, then passes — proving the anti-drift guard works.

**Risks.** Very low (docs only). **Effort:** Small. **Leverage:** Low–Medium. **Do last / ongoing.**

---

## Sequencing

```
A (type ENGINE/state) ─────────────► unlocks real types in B's extracted cores and C's seam
   │
   ├─ B (test + measure interaction layer)   — parallelizable; cores prefer A first
   ├─ C (Firebase/Tone modular SDK)          — independent; its own verified change, not bundled with A/B
   └─ D (CLAUDE.md trim)                      — anytime, low risk, do last
```

**One-line recommendation:** start with **A** — it is the change that makes "we migrated to
TypeScript" actually mean "the compiler protects us," and it is the prerequisite that makes the rest
(typed controllers in B, a typed persistence layer in C) land cleanly instead of as more `any`.
