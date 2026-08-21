# Firebase config and secret hygiene

`firebase-config.js` contains client-side Firebase web configuration (`apiKey`, `authDomain`, `projectId`, etc.). In a static browser app these values are **public configuration, not secrets**.

Authorization depends on Firestore rules, authentication/claims, backend controls, and provider-side API restrictions. Never put service-account JSON, private keys, bearer/refresh tokens, deployment credentials, or custom-claim provisioning credentials in `firebase-config.js` or the repository.

## Admin authorization

`firestore.rules` currently accepts Firebase custom claim `admin: true` plus a temporary legacy-email fallback. Rules are the enforcement boundary; client-side admin checks are UX only. Migration/cutover details live in [`firestore-security-model.md`](firestore-security-model.md).

Update `scripts/firestore-rules-test.mjs` with authorization changes. Rules deploy through `.github/workflows/deploy-firestore-rules.yml`.

## Credential handling

- Restrict the public Firebase Web API key by allowed referrer/API in Google Cloud where practical.
- Rotating the web key is operational hygiene, not secret recovery: create/restrict a replacement, deploy it, then remove the old key.
- If actual secret material is exposed, revoke/rotate it immediately and update the out-of-git secret store.
- `check:secret-hygiene` is a repository backstop, not the primary secret-management system.
- Firestore data integrity depends on rules/admin authorization, not hiding the web config.

The former unreferenced `includes/secret.php` was removed because a public repository is not a secret store. Any future server-side secret must use provider secret management/environment variables; commit only non-secret templates when needed.
