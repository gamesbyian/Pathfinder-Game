# Codebase Strengthening Plan

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

## Initiative A — Make the type system actually enforce (type the ENGINE/state core)

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

**Risks.** Medium. The state factories use `new Map()`/`new Set()`/`[]` that infer loose generics;
promoting them surfaces real mismatches (this is the point, but it's work). Mitigation: do it
slice-by-slice behind green `check:types` + `test:unit`; the state-action unit suites
(`state-unit-tests`, `state-actions-unit-tests`) already exercise these paths.

**Effort:** Medium–Large. **Leverage:** Highest. **Do first.**

---

## Initiative B — Test (and measure) the interaction layer

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

**Risks.** Low. Extraction is mechanical and behavior-preserving; e2e remains the backstop while
cores are pulled out. Enabled and de-risked by Initiative A (typed state makes the extracted cores'
signatures real, not `any`).

**Effort:** Medium. **Leverage:** High. **Can run in parallel with A; cores benefit from A landing first.**

---

## Initiative C — Modernize the Firebase + Tone dependency story (CDN compat → bundled modular)

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

**Risks.** Medium — it changes a working integration on a live game; sign-in and Firestore writes
must be re-verified. Mitigation: the wrapper seam contains the blast radius; do it as one dedicated,
separately-verified change (do **not** combine with A or B).

**Effort:** Medium. **Leverage:** Medium–High. **Independent — schedule after A is underway.**

---

## Initiative D — Make CLAUDE.md maintainable (trim + reduce hand-sync)

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
