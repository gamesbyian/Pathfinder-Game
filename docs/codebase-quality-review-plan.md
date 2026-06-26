# Codebase Quality Review — Remediation Plan (7 issues)

Status: ready (2026-06-26, branch `claude/codebase-quality-review-5orvi5`) — owner decisions resolved (see "Decisions").

This plan covers the "top big changes a diligent developer would make" from the codebase quality
review, **excluding** the styling/Tailwind issue (completed on a separate branch). Per the owner's
decisions, the typing issue is a **full TypeScript migration** (not the current check-only JSDoc),
and hosting stays on **GitHub Pages**.

The seven issues:

| # | Issue | Priority | Depends on | Status |
|---|---|---|---|---|
| 1 | Reintroduce a build step (Vite) | **Foundational** | — | **✅ Done** — ADR 0010; Pages deploy verified live |
| 5 | Restore a working Content-Security-Policy | High (live security gap) | — | **✅ Done** — enforced `<meta>`, verified live (incl. sign-in) |
| 7 | Full TypeScript migration | High | #1 | **🚧 In progress** — toolchain (tsx) + first `domain/` leaves on `.ts`; ADR 0011 |
| 6 | Adopt a standard test runner (Vitest) | Medium | #1 | **✅ Done** — 33 suites/~440 tests on Vitest; `test:unit` |
| 2 | Get game data out of the critical path | Medium | #1 (eases it) | Not started |
| 3 | Collapse CLAUDE.md to a true reference | Low/ongoing | lands last | **✅ Done** — split to `docs/history/development-journal.md` |
| 8 | Prune architecture indirection | Low/optional | #7 (safer) | Not started (lowest ROI) |

> **Progress (2026-06-26):** #1, #3, #5, #6 complete on branch
> `claude/codebase-quality-review-plan-c8g9fw` (#1/#3/#5 verified on the live GitHub Pages deploy).
> #7 (full TS) **in progress** — toolchain landed (tsx for node tooling; `tsconfig` checks all
> `.ts`; ADR 0011) and the first `domain/` leaves converted; continuing leaf-first
> (domain → runtime → solver → state → adapters). Remaining: #2 (data split, independent); #8
> (indirection pruning, optional/last). Tracked follow-up within #7: typescript-eslint to lint `.ts`.

> **Two ADRs get superseded.** Committing to a build step overturns **ADR 0001**
> (static-hosting-no-build-step); committing to full TypeScript overturns **ADR 0009**
> (check-only static typing). Both should be re-issued as superseding ADRs (0010, 0011) with the
> new rationale, not silently edited.

---

## Recommended sequencing

```
Phase A (unblockers, can run in parallel):
  ┌─ #1 Build step (Vite)  ──────────────► enables #7, #6, eases #2
  └─ #5 CSP restoration    (independent; live security gap — don't wait)

Phase B (after #1):
  ┌─ #7 Full TypeScript  ─┐  (co-evolve: tests become .ts as modules do)
  └─ #6 Vitest runner    ─┘
  └─ #2 Data split        (independent of B, but wants Vite's asset pipeline)

Phase C (last):
  ┌─ #3 CLAUDE.md collapse  (reflects the final state, so do it last / ongoing)
  └─ #8 Architecture pruning (optional; lowest ROI — see caveat)
```

#1 is the keystone: full TypeScript (#7) **cannot** ship `.ts` to the browser without compilation,
so adopting full TS *is* adopting a build step. #5 (CSP) is the exception — it's a live security
hole and needs no build step, so start it immediately and in parallel.

---

## Issue 1 — Reintroduce a build step (Vite)

**Why.** No-build (ADR 0001) is the root constraint forcing most other pain: no
bundling/minification/tree-shaking (28 KLOC of raw ES modules + a 2 MB JSON ship as-is), no real
CSS tooling, and — decisively — no way to run real TypeScript. The owner's commitment to full TS
makes a build step non-optional.

**Approach.** Adopt **Vite** (dev server + Rollup production build). Output to `dist/`, deploy
`dist/` to GitHub Pages via a build-and-deploy Action (today Pages serves the repo root directly).

**Steps.**
1. Add `vite` (dev dep) + `vite.config.ts`; `index.html` becomes the Vite entry. Set `base` for
   the Pages path (repo subpath or custom domain).
2. CDN scripts (Tone.js, Firebase compat, Google Fonts): keep as external `<script>`/`<link>`
   through the initial cutover (simplest, preserves current loading), then migrate Firebase to the
   **modular npm SDK** as a dedicated follow-up (decision 3 above). Keep `firebase-config.js` as an
   injected global or import it.
3. Wire `data/` and `styles/` as assets; let Vite hash/emit them (sets up #2's code-splitting).
4. Add `.github/workflows/deploy-pages.yml`: `npm ci → vite build → upload-pages-artifact →
   deploy-pages`. Remove/replace any direct-static-serve assumption. Keep
   `deploy-firestore-rules.yml` as-is.
5. Local dev: `npm run dev` (vite), `npm run build`, `npm run preview`. Playwright `webServer`
   switches from `serve .` to `vite preview` (or `vite dev`).
6. Write **ADR 0010 — build step adopted (supersedes 0001)**: rationale (TS + bundling +
   CSP-via-headers options), the cost accepted (a build, a deploy pipeline), and what stays static.

**Risks.** Deployment pipeline change is the biggest; verify Firebase auth + Firestore still work
from the built bundle; asset/base-path correctness on Pages; the inline `bootstrapApp()` module
script. Mitigate by shipping the Vite build to a **preview Pages environment** first and smoke-testing
auth/solve/load before cutting over `main`.

---

## Issue 5 — Restore a working Content-Security-Policy

**Why.** The CSP was removed wholesale ("temporarily, for Firebase `signInWithPopup` debugging")
on a live, public, Firebase-connected site — an open security gap left indefinitely. There's already
`scripts/check-csp.mjs` and `docs/content-security-policy.md` scaffolding to build on.

**Approach.** Reintroduce a CSP that allows exactly the third parties in use, and resolve the popup
blocker (the original reason it was removed).

**Steps.**
1. Enumerate required directives from the actual third parties:
   - `script-src`: `'self'`, `https://www.gstatic.com` (Firebase compat), `https://cdnjs.cloudflare.com` (Tone.js).
   - `connect-src`: `'self'`, `https://*.googleapis.com`, `https://*.firebaseio.com`, `https://firestore.googleapis.com`, identitytoolkit.
   - `frame-src`: `https://accounts.google.com`, the Firebase `authDomain` (for the popup) — **this is the piece the popup needs**.
   - `style-src`: `'self'` + `https://fonts.googleapis.com` (+ `'unsafe-inline'` if inline styles remain — audit first).
   - `font-src`: `https://fonts.gstatic.com`; `img-src`: `'self' data:`.
2. If the popup still fights the CSP, fall back to `signInWithRedirect` (no cross-origin frame).
3. Ship the policy. With the build step (#1), prefer real **HTTP headers** if hosting allows;
   GitHub Pages can't set headers, so use a `<meta http-equiv>` CSP (or move hosting). Roll out
   **`Content-Security-Policy-Report-Only` first** to catch violations without breaking users.
4. Re-enable `check:csp` as an enforced gate (assert the policy is present + covers the allowlist),
   and update `docs/content-security-policy.md`.

**Risks.** Breaking Firebase auth is the real risk — the popup-vs-redirect decision is the crux.
Report-only mode + a staging deploy de-risk it. Independent of #1; can start now.

---

## Issue 7 — Full TypeScript migration

**Why.** The current check-only JSDoc on a 22-module allowlist (ADR 0009) is a half-measure that
can only grow bottom-up and never types the DOM/adapter boundaries well. Owner commits to full TS.

**Approach.** Convert `modules/**/*.js` → `.ts`, compiled by Vite (#1), `strict` mode. The existing
typed surface and the `NormalizedLevel`/solver typedefs are a strong head start — promote them from
JSDoc to real `.ts` interfaces.

**Steps.**
1. Land #1 first (Vite compiles `.ts`). Keep `tsc --noEmit` (`check:types`) as the CI type gate.
2. Convert **leaf-first**, mirroring the existing allowlist growth order: `domain/` → `runtime/` →
   `solver/` (primitives → hot core → orchestration) → `state/` → adapters (`render`, `persistence`,
   `input`, `ui`) → `engine`, `app`, `boot`.
3. Replace JSDoc `@typedef`s with exported `interface`/`type`; centralize the shared contracts
   (`NormalizedLevel`, `SolverSearchState`, `PrepLevel`, `Action`/`Effect`, the `EditorRuntimePort`).
4. Turn on `strict` (incl. `noImplicitAny`); resolve `any`s at the browser-host boundary with typed
   wrappers (the DOM helpers in `ui/dom.js`).
5. `scripts/**/*.mjs` tooling: either keep as `.mjs` (Node-run) or convert to `.ts` run via `tsx`.
6. Tests move to `.ts` as part of #6.
7. Write **ADR 0011 — full TypeScript (supersedes 0009)**.

**Risks.** Large surface. The solver hot paths (`search.js`, `prep.js`) are object-construction
heavy and were deliberately left untyped in the check-only pass — budget extra time for beam-node
typedefs and the dynamic `prep` builder. Because `checkJs`/strict type-checks the whole import
graph, convert **leaves first** so each module's dependencies are already typed. Keep PRs small and
green at each step.

---

## Issue 6 — Adopt a standard test runner (Vitest)

**Why.** ~39 hand-rolled `*-unit-tests.mjs`, each its own npm script, plus a homegrown `test-lib`
assertion harness and ~12 bespoke `check-*.mjs` gates. The homegrown harness existed *because* of
no-build; once Vite + TS land (#1, #7), the natural choice is **Vitest** (TS-native, fast, watch,
coverage, auto-discovery, parallel).

**Approach.** Migrate the homegrown suites to Vitest; collapse the per-file npm scripts into Vitest
projects/tiers; fold convention-checking `check-*.mjs` into ESLint rules where feasible.

**Steps.**
1. Add `vitest` + config; environments per area (`node` for domain/solver, `jsdom`/`happy-dom` for
   DOM/ui/state tests).
2. Port `test-lib` assertions → Vitest `expect`; convert `*-unit-tests.mjs` → `*.test.ts`
   incrementally (co-migrate with #7).
3. Replace the `test:core`/`test:app`/`test:solver` chains with Vitest **projects** or tag filters;
   `npm run ci` runs them in one parallel pass.
4. Convert the *behavioral-convention* gates to ESLint custom rules where natural
   (`check:engine-state-boundary`, `check:domain-purity`, `check:raw-inner-html`). Keep the
   genuinely-structural ones that don't fit ESLint (`check:modal-a11y`, the CSS coverage checks) as
   scripts or dedicated Vitest tests.
5. Keep **Playwright** for e2e (already the standard) — out of scope for this swap.

**Risks.** Migration volume; risk of losing a subtle assertion during port — migrate suite-by-suite,
keeping the old harness until each is green under Vitest, then delete. Do after #1, alongside #7.

---

## Issue 2 — Get game data out of the critical path

**Why.** `data/levels.json` is 2.18 MB / 8,309 hint paths — precomputed solver output every player
downloads on load, regardless of level. `data/level-heatmaps.json` is a *generated* artifact also
committed. And level identity is array-index-based, which is fragile under the active
reordering/removal of levels (ratings already escaped this via fingerprints).

**Approach** (the level set is in continuous flux — reorder/change/delete at any time — so
churn-safety is the governing constraint): **split the generated bulk (hints) from the hand-edited
definitions**, key the hint store by **fingerprint** (not index), and lazy-load.

**Churn-safety invariant (must hold):** no artifact may be keyed by array position. A reorder is a
one-line edit to the ordering in the definitions file; a deletion simply orphans that fingerprint's
hints/heatmap entry (the loader ignores orphans — never a cascade of renumbered files); an edit
that changes a level's structure yields a new fingerprint (old entry orphaned, regenerated on next
solve). This is the same identity model the ratings collection already uses successfully.

**Steps.**
1. New layout: `levels.json` = definitions + ordering only (small, human-edited, merge-friendly);
   hints move to a fingerprint-keyed store (`hints/<fingerprint>.json` or a chunked manifest)
   fetched on demand.
2. Move level identity off array index → `getLevelFingerprint()` (already used by ratings); extend
   to heatmaps so a reorder/removal doesn't force a full regenerate.
3. Loader fetches definitions upfront, **hints lazily** — note the in-game Hint button currently
   reads `level.hints` synchronously; it becomes an async fetch (with a loading state).
4. Stop committing `level-heatmaps.json`; generate it at build/deploy (#1) or fetch lazily.
5. Update tooling for the new layout: `generate-level-heatmaps`, `import-published-levels`,
   `hint-path-oracle`, `validate-bundled-levels`, `solver:direct`.
6. With Vite (#1), enable per-level code/asset-splitting and hashing for cache-busting.

**Risks.** Tooling churn (several scripts assume the single array); the synchronous Hint read must
become async; offline/caching behavior. **Lower-risk first slice:** just split hints↔definitions and
key by fingerprint — that alone removes the 2 MB eager payload and makes every future level reorder
a smaller diff. Per-level decomposition + a formal ordering manifest can wait until the content
stabilizes.

---

## Issue 3 — Collapse CLAUDE.md to a true reference

**Why.** CLAUDE.md is a 195 KB / 2,775-line session *diary* (dated entries, corrections of
corrections, retracted-experiment writeups, 60 commits). A reference should describe the *current*
system, not narrate how it was built.

**Approach.** Extract a concise current-state reference (~300 lines); move the chronological
narrative to history; keep the `docs/` ADR set as the decision record.

**Steps.**
1. Separate durable "current state" facts from historical narrative.
2. Move dated entries to `docs/history/` (or a `CHANGELOG.md`); delete retracted-experiment
   writeups from the live doc (keep in history only).
3. Rewrite CLAUDE.md as: project overview, architecture pointer, **build/test/deploy commands**
   (updated for #1/#6), key invariants/gotchas, and links into `docs/`.
4. Reconcile with the existing `docs/modernization-plan.md` and ADRs (avoid duplication).

**Risks.** Low (docs only). The one caveat: agents and contributors rely on CLAUDE.md, so the
slimmed reference must stay *accurate* — do this **last**, after #1/#2/#5/#6/#7 land, so it
describes the new reality rather than needing another rewrite.

---

## Issue 8 — Prune architecture indirection

**Why.** A browser puzzle game carries a grouped engine facade whose entries are asserted (by a
dedicated test) to be the *identical references* as a parallel flat facade, plus dual debug surfaces
(`window.APP` vs `window.PATHFINDER`) and narrow ports — indirection beyond the problem size.

**Honest caveat.** A prior pass already analyzed removing the flat facade and **deliberately
declined**: the grouped namespaces are *built from* the flat methods, and `createEditorEnginePort`
plus the `window.APP` debug surface consume them directly — so the flat methods are load-bearing,
not dead shims, and removing them is a risky `engine.js` restructure for cosmetic gain. The
achievable, valuable part (migrating callers to the grouped namespaces) is **already done**.

**Approach (scoped, optional, last).**
1. Don't churn the facade for its own sake. If pursued, *invert* ownership: define each method once
   on its grouped namespace and let the flat surface be a thin (or removed) projection — but only
   once #7 (TS) makes the refactor type-safe.
2. Consolidate the debug surface: confirm whether both `window.PATHFINDER` (read-only) and
   `?debug → window.APP` (mutable) are needed, or whether one entry point suffices.
3. **Keep the ADRs** — they're good practice; the "indirection" to trim is the facade duplication,
   not the decision records.

**Risks.** Low value, non-trivial risk — explicitly the **last and most skippable** item. Best done
after #7 so the compiler backs the refactor.

---

## Decisions (resolved)

1. **Hosting — stay on GitHub Pages** (owner). Consequence: the build (#1) deploys via a
   Pages-build Action, and the CSP (#5) ships as a `<meta http-equiv>` policy (Pages can't set
   HTTP response headers). This rules out header-only CSP directives (`frame-ancestors`,
   `report-uri`/`report-to` won't work from `<meta>`) and HTTP cache-control tuning — acceptable
   tradeoffs noted in #1/#5.
2. **Firebase auth under CSP — keep `signInWithPopup`** (recommendation; owner deferred to us).
   Rationale: the sign-in is **admin-only and rare** (Dev/Review mode gate), and
   `signInWithRedirect` has known third-party-storage/cookie failures when the app and the Firebase
   `authDomain` are on **different domains** — which is exactly the GitHub Pages situation. The popup
   is a separate browsing context, so the main page's `<meta>` CSP mainly needs the right
   `script-src`/`connect-src` plus `frame-src` for the gapi/auth iframe; the original "popup breaks
   under any CSP" was a too-strict policy, not a popup-vs-CSP impossibility. We validate it in
   report-only mode first; `signInWithRedirect` stays the documented fallback if the popup proves
   intractable.
3. **Firebase SDK — migrate to the modular npm SDK** (recommendation; owner deferred to us). Once
   we have Vite + TS, the modular SDK (`firebase/app`, `/firestore`, `/auth`) is tree-shakeable,
   TS-typed, and removes three CDN `<script>` tags (shrinking `script-src` and helping #5). **But
   sequence it as a dedicated sub-task *after* the initial Vite cutover** — don't change the SDK and
   the build system in the same step. Keep the compat CDN scripts working through the first green
   Vite build, then migrate `persistence/firebase-client.js` + the persistence layer from the
   compat global API to the modular API as its own verified change.
4. **Data layout — optimize for continuous churn** (owner: levels may be reordered, changed, or
   deleted at any time). The design must therefore never use array index as identity. See #2:
   fingerprint-keyed hint + heatmap stores, ordering held in one small file, **per-level file
   decomposition and a formal ordering manifest are explicitly deferred** until the content
   stabilizes. The only near-term change is the churn-*safe* hints↔definitions split.

---

## Note: the CSS/Tailwind issue (excluded here)

The styling/Tailwind migration (issue #4 from the review) is **out of scope for this plan** and has
been **completed on a separate branch**. It is not addressed here.
