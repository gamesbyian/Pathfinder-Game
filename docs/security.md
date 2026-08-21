# Pathfinder security model

> **Read for:** Firestore authorization, Firebase config/secrets, debug exposure, and security-change workflow.
> **Separate contract:** [`content-security-policy.md`](content-security-policy.md) for CSP; [`third-party-dependencies.md`](third-party-dependencies.md) for allowed browser dependencies/origins.

Pathfinder is a static browser app with Firebase Auth/Firestore and no private application server. Firestore rules are the backend authorization boundary; client-side checks are UX only.

## Firestore access

| Data | Read | Write |
|---|---|---|
| `/artifacts/{appId}/users/{uid}/data/{doc}` | matching authenticated `uid` | matching authenticated `uid` |
| Pending submissions | authenticated | creator may create when `submittedBy == request.auth.uid`; no update; admin delete |
| Published levels | public | admin |
| `level_ratings/{fingerprint}` | public | admin |
| `local_level_hints/{fingerprint}/entries/{entryId}` | public | authenticated create only; immutable |

Every player gets an anonymous Firebase UID at boot, so ordinary players are authenticated for hint creation. Bundled levels/themes/hints are public static assets; stress corpora and logs/reports are repository/tooling data, not player-app data.

## Supplemental published-level hints

`local_level_hints` stores solutions found after a level reaches `levels.json`. Writes come from approved hints-only resubmissions (`approveLocalHintAddition`) or Play-mode wins (`win-controller.ts` -> `saveWinAsHintIfNovel`); the latter is fire-and-forget so Firestore failure cannot affect the win.

`entryId` is a deterministic client-side hash of the path signature. Rules do not verify the hash; immutability prevents overwrite. The 5,000-hints-per-level limit is a client-side soft cap, not a security boundary.

`modules/data.ts` merges local and Firestore supplemental hints through `mergeHints` only for the published corpus. Stress corpora never use Firestore hints. Fetch failure falls back to local hints, so Firestore availability does not block play.

## Admin authorization

`firestore.rules` currently accepts custom claim `admin: true` plus a temporary legacy admin-email fallback. To finish the cutover:

1. Set `{ admin: true }` on the admin Firebase Auth UID with the Admin SDK and refresh the ID token.
2. Verify an admin action.
3. Remove the legacy email clause from `firestore.rules` and update `scripts/firestore-rules-test.mjs`.
4. Optionally replace the client-side email UX gate with a claim check.

Rules deploy through `.github/workflows/deploy-firestore-rules.yml`; repository edits do not affect production until deployed. Broad authenticated reads of pending submissions should be reconsidered before richer submission metadata is added.

Current rules tests are source-level characterization. Emulator-backed behavioral tests remain deferred until a rules change justifies the Firebase emulator/tooling cost; see [`testing.md`](testing.md).

## Firebase config and secrets

`firebase-config.js` contains public Firebase web configuration (`apiKey`, `authDomain`, `projectId`, etc.), not secrets. Authorization depends on Firestore rules, authentication/claims, backend controls, and provider-side API restrictions.

Never commit service-account JSON, private keys, bearer/refresh tokens, deployment credentials, or custom-claim provisioning credentials. Restrict the public Firebase Web API key by allowed referrer/API where practical. Rotating that web key is operational hygiene, not secret recovery; actual secret exposure requires immediate revoke/rotation and update of the out-of-git secret store.

`check:secret-hygiene` is a repository backstop, not the primary secret-management system. Any future server-side secret must use provider secret management/environment variables; commit only non-secret templates. Firestore integrity depends on rules/admin authorization, not hiding web config.

## Debug surfaces

`bootstrapApp()` exposes:

- `window.PATHFINDER` by default: frozen/read-only diagnostics returning cloned snapshots;
- full mutable `window.APP` with `?debug`, including on production hosts.

`tests/security.spec.mjs` guards both. Production debugging therefore requires only `?debug`; there is no host restriction or persisted opt-in.

## Browser security and contributor workflow

CSP is enforced through `index.html` from `security/csp-policy.json`; `check:csp` and `tests/csp.spec.mjs` guard drift/behavior. Firebase and Tone are bundled by Vite; Google Fonts and Firebase/Google runtime origins are explicitly allowlisted. See [`content-security-policy.md`](content-security-policy.md).

- `check:secret-hygiene`, `check:third-party`, and `check:csp` run in `npm run ci`.
- Firestore access changes must keep `firestore.rules`, `scripts/firestore-rules-test.mjs`, and this document aligned.
- New external browser origins require both the dependency allowlist and `security/csp-policy.json` to change.

Remaining security work is tracked in [`future-work.md`](future-work.md).
