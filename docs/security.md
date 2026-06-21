# Pathfinder Security Model

> **Status:** current-state reference + known gaps. Hardening this into a production-grade
> posture (custom-claim admin auth, emulator-backed rule tests, CSP, debug-surface policy) is
> modernization-plan §4. Detailed sub-references: `docs/firestore-security-model.md`,
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

> **Known gap (modernization-plan §4):** the admin identity is a hard-coded email in the rules
> (characterized by tests). It should move to Firebase **custom claims** or a
> deployment-managed allowlist so no privileged identity is duplicated in public config.

## Debug surface policy

`bootstrapApp()` exposes diagnostics with a **safe-by-default** posture:
- **Default:** `window.PATHFINDER` — read-only. Getters return `deepClone`d snapshots
  (`getStateSnapshot`, `getCurrentLevel`, `getCurrentLevelIndex`, `getMode`); no live
  references, no mutators.
- **Opt-in:** the full mutable `window.APP` facade (live `State.ENGINE`, engine, editor, …) is
  exposed **only** when the page is loaded with the `?debug` query param.

This invariant is regression-guarded at boot by `tests/security.spec.mjs`: default boot exposes no
`window.APP`, a frozen `window.PATHFINDER` with no live `State`/`Engine` references, and a snapshot
that is a clone (mutating it can't reach live state); `?debug` opts into the mutable facade. Unit
coverage of the underlying surfaces is in `scripts/app-module-unit-tests.mjs`.

> **Known gap (modernization-plan §4):** in production the mutable facade is still reachable by
> appending `?debug`. The target is to require explicit local/dev configuration (not a casual
> URL param) for the mutable surface, while keeping `window.PATHFINDER` read-only and cloned.

## Content Security Policy (gap)

`index.html` currently ships **without** a meta CSP — it was removed while debugging the
Google sign-in popup flow (`signInWithPopup`), which broke under every meta CSP tried so far.

> **Known gap (modernization-plan §4):** reintroduce a CSP (preferably via deployment headers,
> report-only first) with documented directives for Firebase Auth/Firestore, the Google
> sign-in popup, Tone.js, and Google Fonts. Add a check that deployment config keeps the
> expected security headers.

## Third-party dependencies

External assets are restricted to an allowlist enforced by `check:third-party` (Tone.js +
Firebase gstatic compat scripts + Google Fonts). Rationale/risk per dependency is in
`docs/third-party-dependencies.md`. Target: pin/self-host where feasible.

## Contributor security workflow
- `check:secret-hygiene` and `check:third-party` run in `npm run ci`.
- Changing Firestore access? Update `firestore.rules` **and** `scripts/firestore-rules-test.mjs`
  **and** `docs/firestore-security-model.md`. Rules deploy only via
  `.github/workflows/deploy-firestore-rules.yml` (push to `main` or manual dispatch).
- Adding an external script/asset? Update the allowlist + `docs/third-party-dependencies.md`.
