# Pathfinder Security Model

> **Status:** current-state reference + known gaps. The remaining hardening items (custom-claim
> admin auth cutover, emulator-backed rule tests) are tracked in `docs/future-work.md`.
> Detailed sub-references: `docs/firestore-security-model.md`,
> `docs/firebase-config-and-secret-hygiene.md`, `docs/third-party-dependencies.md`.

Pathfinder is a static-hosted browser game with a Firebase (Firestore + Auth) backend. There
is no private application server; all backend authorization is enforced by Firestore security
rules.

## Data classification

| Class | Location | Readers | Writers |
|---|---|---|---|
| Bundled levels/themes | repo (`data/*.json`) | everyone (static) | committers |
| Published levels | `published_levels` | public-read | admin-write |
| Level ratings/tags | `level_ratings` | public-read | admin-write |
| Player progress/session | `/artifacts/{appId}/users/{uid}/data/{doc}` | that `uid` only | that `uid` only |
| Pending submissions | submissions collection | any authenticated user (duplicate detection) | creator (`submittedBy == uid`); no updates; admin delete |
| Local debug/audit artifacts | `audits/` (repo) | committers | tooling |

See `docs/firestore-security-model.md` for the authoritative rule-by-rule model and
`scripts/firestore-rules-test.mjs` for the characterization tests.

## Firebase config is public, not secret

`firebase-config.js` holds the public Firebase web config. It is **safe to commit** — it is
client configuration, not a credential. Authorization is enforced by Firestore rules, never by
the config. See `docs/firebase-config-and-secret-hygiene.md`. `check:secret-hygiene` scans for
genuinely-secret material.

## Admin authorization (current + gap)

Admin access (Dev Mode, Review/Publish, rating writes) is gated by an authenticated Google
sign-in whose token email matches the admin email in `firestore.rules`, and the same popup
gates the in-app admin UI.

Admin authorization in the rules now accepts a Firebase **custom claim** (`admin: true`) **or** the
legacy admin email as a transitional fallback — a no-lockout migration toward claim-based admin.

> **Remaining (tracked in `docs/future-work.md`):** provision the custom claim in production, then
> delete the email fallback from the rules and migrate the client-side email check
> (`review-repository.js`, UX-only) to read the claim. Full procedure + cutover checklist:
> `docs/firestore-security-model.md` ("Admin custom-claim migration"). Emulator-backed behavioral
> rule tests are **deliberately deferred** — they need the Firebase emulator suite + CI wiring, and
> the payoff only lands when the rules change, so revisit alongside any Firestore-rules edit. The
> current suite is source-level characterization + negative-case guards in
> `scripts/firestore-rules-test.mjs`.

## Debug surface policy

`bootstrapApp()` exposes diagnostics with a **read-only-by-default** posture:
- **Default:** `window.PATHFINDER` — read-only. Getters return `deepClone`d snapshots
  (`getStateSnapshot`, `getCurrentLevel`, `getCurrentLevelIndex`, `getMode`); no live
  references, no mutators.
- **Opt-in:** the full mutable `window.APP` facade (live `State.ENGINE`, engine, editor, …) is
  exposed whenever `shouldExposeMutableFacade()` sees a `?debug` query param — on any host,
  including production. There is no additional host check or persisted opt-in step: the
  documented debugging workflow is simply "load the live site with `?debug`".

This invariant is regression-guarded at boot by `tests/security.spec.mjs` (default boot exposes no
`window.APP`; frozen `window.PATHFINDER` with no live refs; clone-only snapshot; `?debug` opts into
the mutable facade). The pure predicate itself is unit-tested in `scripts/app-module-unit-tests.mjs`
via the injectable `shouldExposeMutableFacade({ search })`.

> **Production debugging:** just load the live site with `?debug`. The read-only
> `window.PATHFINDER` needs no opt-in either way.

## Content Security Policy

The CSP is **enforced in production** via an enforcing `<meta http-equiv>` in `index.html` (GitHub
Pages can't set response headers) and was verified live on 2026-06-26 — boot, Tone.js audio, and the
Google `signInWithPopup` admin sign-in all confirmed working on the deployed site.

- Source of truth: `security/csp-policy.json` (directives + per-directive rationale +
  required-runtime-origins). Render the string with `npm run check:csp -- --print`.
- `check:csp` (in the default `check` group) fails the build if `index.html` loads an external
  origin no directive covers, if a documented runtime origin (Firestore/Auth/sign-in) isn't
  covered, or if the enforcing `<meta>` CSP drifts from the policy file. So the enforced policy
  can't rot relative to the app's real dependencies.
- `tests/csp.spec.mjs` (e2e) asserts no CSP violations at boot/worker/interaction against the
  production build. Full rationale + the post-change checklist: `docs/content-security-policy.md`.

> **Note:** `signInWithPopup` needs `script-src https://apis.google.com` (the gapi iframe loader
> Firebase injects) — omitting it fails sign-in with `auth/internal-error`. `signInWithRedirect` is
> the documented fallback if the popup ever regresses.

## Third-party dependencies

Firebase and Tone.js are **bundled by Vite** (npm deps), not loaded from CDNs. The only
remaining external browser origin is Google Fonts, restricted by an allowlist enforced by
`check:third-party`. Rationale/risk is in `docs/third-party-dependencies.md`.

## Credential rotation
The Firebase web config is public (no confidentiality rotation needed) but should be **restricted at
the source** (Cloud Console HTTP-referrer + API restrictions). Actually-secret material
(service-account/Admin-SDK keys) must never be committed; rotate immediately if exposed. Full
procedures: `docs/firebase-config-and-secret-hygiene.md` ("Credential rotation procedures").

## Contributor security workflow
- `check:secret-hygiene`, `check:third-party`, and `check:csp` run in `npm run ci`.
- Changing Firestore access? Update `firestore.rules` **and** `scripts/firestore-rules-test.mjs`
  **and** `docs/firestore-security-model.md`. Rules deploy only via
  `.github/workflows/deploy-firestore-rules.yml` (push to `main` or manual dispatch).
- Adding an external script/asset? Update the allowlist + `docs/third-party-dependencies.md` **and**
  `security/csp-policy.json` (so `check:csp` keeps the CSP in sync), then re-run `check:csp`.
