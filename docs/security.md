# Pathfinder security model

Pathfinder is a static browser app with Firebase Auth/Firestore and no private application server. Firestore rules are the backend authorization boundary.

Detailed contracts:

- [`firestore-security-model.md`](firestore-security-model.md): collection access and admin/hint rules.
- [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md): public web config vs real secrets.
- [`content-security-policy.md`](content-security-policy.md): production CSP.
- [`third-party-dependencies.md`](third-party-dependencies.md): browser dependency/origin allowlist.

## Data/access summary

| Data | Access |
|---|---|
| Bundled levels/themes/hints | public static assets; repository writers change them |
| Stress corpora | repository/tooling only; not bundled into the player app |
| Published levels / ratings | public read, admin write |
| Player progress/session | matching authenticated UID only |
| Pending submissions | authenticated read; creator can create; no update; admin delete |
| Supplemental published-level hints | public read; authenticated create; immutable |
| Logs/reports | repository/tooling artifacts |

## Admin

Firestore admin authorization accepts custom claim `admin: true` plus a temporary legacy-email fallback. The claim cutover is tracked in [`firestore-security-model.md`](firestore-security-model.md). Client-side admin checks are UX gates, not authorization.

## Debug surfaces

`bootstrapApp()` exposes:

- `window.PATHFINDER` by default: frozen/read-only diagnostics returning cloned snapshots, not live mutable state;
- full mutable `window.APP` when the URL contains `?debug`, including on production hosts.

`tests/security.spec.mjs` guards both modes. Production debugging therefore requires only `?debug`; there is no separate host restriction or persisted opt-in.

## Browser security

The CSP is enforced through `index.html` from source policy `security/csp-policy.json`; `check:csp` and `tests/csp.spec.mjs` guard drift and browser behavior. Firebase and Tone are bundled by Vite; Google Fonts and Firebase/Google runtime origins are explicitly allowlisted. See [`content-security-policy.md`](content-security-policy.md).

`firebase-config.js` is public client configuration. Service-account/Admin SDK keys and tokens are secrets and must remain outside git. See [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md).

## Contributor workflow

- `check:secret-hygiene`, `check:third-party`, and `check:csp` run in `npm run ci`.
- Firestore access changes require `firestore.rules`, `scripts/firestore-rules-test.mjs`, and [`firestore-security-model.md`](firestore-security-model.md) to agree. Rules deploy through `.github/workflows/deploy-firestore-rules.yml`.
- New external browser origins require the dependency allowlist and `security/csp-policy.json` to be updated together.

Remaining security work, including claim cutover and deferred emulator-backed rule tests, is tracked in [`future-work.md`](future-work.md).
