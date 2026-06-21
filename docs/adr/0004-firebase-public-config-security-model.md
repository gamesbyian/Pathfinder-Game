# ADR 0004: Firebase public config; authorization in Firestore rules

**Status:** Accepted, with known hardening gaps (modernization-plan §4).

## Context
The app has no private backend server. Firebase web config is necessarily shipped to the
browser. There must be a clear, written stance on what is secret, where authorization lives,
and how admin identity is determined.

## Decision
- The Firebase web config (`firebase-config.js`) is treated as **public client configuration**,
  safe to commit. It is never an authorization mechanism. `check:secret-hygiene` guards against
  committing genuinely-secret material.
- **All authorization is enforced by Firestore security rules** (`firestore.rules`), tested by
  `scripts/firestore-rules-test.mjs`. Per-user progress is `uid`-scoped; published levels and
  level ratings are public-read/admin-write; pending submissions are creator-write/admin-delete
  with authenticated reads for duplicate detection.
- Production diagnostics are **safe-by-default**: `window.PATHFINDER` (read-only, cloned
  snapshots) is always exposed; the mutable `window.APP` facade is opt-in via `?debug`.

## Consequences
- The full model and rule-by-rule rationale live in `docs/security.md` +
  `docs/firestore-security-model.md`.
- **Open gaps** (tracked in modernization-plan §4): admin identity is a hard-coded email in the
  rules (should move to custom claims / managed allowlist); the mutable debug facade is reachable
  via `?debug` in production (should require explicit dev config); `index.html` ships without a
  CSP (removed while debugging the Google sign-in popup — should be reintroduced via deployment
  headers).
