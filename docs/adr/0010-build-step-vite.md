# ADR 0010: Adopt a Vite build step (supersedes ADR 0001)

**Status:** Accepted (2026-06-26). Supersedes [ADR 0001](0001-static-hosting-no-build-step.md).

## Context
ADR 0001 committed to **no build step**: native ES modules + hand-maintained CSS served directly by
GitHub Pages. That constraint was the root cause of several recurring pains identified in the
codebase-quality review (`docs/codebase-quality-review-plan.md`):

- No bundling/minification/tree-shaking — ~28 KLOC of raw modules ship as-is.
- No real CSS tooling.
- **No way to run real TypeScript** — the owner has committed to a full TypeScript migration
  (issue #7), which *cannot* ship `.ts` to the browser without compilation. Adopting full TS *is*
  adopting a build step.

The owner also decided to **stay on GitHub Pages** (no hosting move).

## Decision
Adopt **Vite** (dev server + Rollup/Rolldown production build) as the build tool.

- `vite.config.ts`: `base: './'` (relative asset URLs, so the build works unchanged at the Pages
  project subpath `/Pathfinder-Game/` *and* at root for `vite preview` / a future custom domain —
  no repo name hardcoded); `modulePreload.polyfill: false` and `cssMinify: 'esbuild'` (see Notes).
- `index.html` is the Vite entry. The CDN `<script>`s (Tone.js, Firebase compat) and Google Fonts
  `<link>`s stay external for this cutover; migrating Firebase to the modular npm SDK is a
  **separate** follow-up (codebase-quality-review-plan Decision 3).
- Files the app fetches at runtime rather than imports — `data/*.json` and `firebase-config.js` —
  stay at the repo root (the Node CLI tools read them there) and are copied into `dist/` by a small
  build plugin.
- New scripts: `npm run dev` / `build` / `preview`. Playwright's `webServer` switched from
  `serve .` to `vite preview`, so e2e now exercises the **built bundle** (what actually ships).
- Deployment: `.github/workflows/deploy-pages.yml` builds and publishes `dist/` via
  `upload-pages-artifact` + `deploy-pages`. Requires the repo Pages source set to **GitHub
  Actions**. `ci.yml`, `audit-export.yml`, and `deploy-firestore-rules.yml` are unchanged.

## Consequences
- A compile/bundle step now exists; `dist/` is the deployed artifact (git-ignored, built in CI).
- Unblocks the full TypeScript migration (#7) and the Vitest runner (#6), and eases the data split
  (#2) via Vite's asset pipeline.
- The enforcing CSP (`docs/content-security-policy.md`) survives the build: the production build
  emits no inline scripts (entry is `<script type="module" crossorigin src="./assets/…">`, a
  same-origin module covered by `script-src 'self'`), and the `<meta>` is preserved verbatim. The
  `check:csp` drift guard still runs against the source `index.html`.
- **The Vite *dev server* (`npm run dev`) is not CSP-clean** — HMR uses inline scripts + eval. That
  is local-only; CI/e2e and the deployed site use the production build, which is clean.
- The deploy pipeline is the biggest operational change. Mitigation: the workflow runs build-only on
  PRs (catches breakage pre-merge) and deploys only from `main`; the first production cutover should
  be smoke-tested live (load + solve + **Google sign-in** + Firestore), since the popup auth flow
  can't be exercised in CI.

## Notes (tooling specifics)
- **`cssMinify: 'esbuild'`** (with `esbuild` as a devDep): Vite 8's default lightningcss minifier is
  stricter than browsers and rejects the hand-authored plain CSS that ships and runs today. esbuild
  (Vite's longtime default) is lenient and matches browser behavior.
- **`modulePreload.polyfill: false`**: the polyfill injects an inline `<script>`, which the strict
  `script-src` would block. Targets are modern browsers with native `modulepreload`.
