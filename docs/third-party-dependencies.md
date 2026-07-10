# Third-party browser dependency policy

Pathfinder is built with Vite. Firebase (Firestore + Auth, modular SDK) and Tone.js are **npm
dependencies bundled into the production build** — not loaded from CDNs. Tailwind was removed
entirely (see `docs/archive/styling-semantic-migration-plan.md`). The only remaining external
browser origin is Google Fonts.

## Currently allowed external origins

- `https://fonts.googleapis.com` and `https://fonts.gstatic.com` — Google Fonts.

## Policy

- Add new external browser origins only with a PR explaining why the dependency
  cannot be bundled or self-hosted.
- Prefer bundling (an npm dependency, Vite-built) over a new CDN origin.
- Keep `scripts/check-third-party-dependencies.mjs` and `security/csp-policy.json` updated
  together when the allowlist is intentionally changed — `check:csp` cross-checks both.
