# ADR 0004: Firebase public config; authorization in Firestore rules

**Status:** Accepted. Hardening largely implemented (modernization-plan §4); the residual items are
ops/hosting tasks not runnable from this repo (see "Consequences").

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
- **Implemented (§4):**
  - *Admin auth* — `isAdmin()` accepts a Firebase **custom claim** (`admin: true`) or the legacy
    email (transitional, no-lockout); rule tests updated + negative-case guards added.
  - *Debug surface* — `window.PATHFINDER` (read-only, cloned diagnostics) is always exposed; the
    mutable `window.APP` facade is opt-in via `shouldExposeMutableFacade()`, which gates on the
    `?debug` query param alone, on any host including production — no dev-host check or persisted
    opt-in. (A 2026-06-22 revision briefly required both; reverted as a regression against the
    documented production-debugging workflow with no real security gain over the always-safe
    read-only default.) Unit-tested.
  - *CSP* — defined in `security/csp-policy.json` and drift-checked by `check:csp` (in the default
    `check` group) against the app's real external + runtime origins; full doc in
    `docs/content-security-policy.md`.
- **Residual ops/hosting items (not runnable from this repo):** provision the admin custom claim in
  production + drop the email fallback; stand up emulator-backed behavioral rule tests
  (`@firebase/rules-unit-testing`); actually *enforce* the CSP (response headers report-only-first,
  or a sign-in-verified enforcing `<meta>`). Each has a documented procedure in `docs/security.md`
  and the linked sub-docs.
