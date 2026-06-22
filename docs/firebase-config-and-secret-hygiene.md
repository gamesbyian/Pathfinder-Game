# Firebase Config and Secret Hygiene

## Public Firebase web config

`firebase-config.js` contains the Firebase **web app configuration** consumed by the browser app. Values such as `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId` identify the Firebase project to client-side SDKs; they are not sufficient by themselves to authorize privileged access.

The security boundary for client-side Firebase access is:

- Firestore Security Rules in `firestore.rules`.
- Authentication state and claims.
- Any backend/API controls used by administrative tooling.
- Restrictions configured in the Google/Firebase console, such as API key restrictions where applicable.

Because the app is a static browser app, client-visible Firebase web config should be treated as **public configuration**, not as a private server secret. Do not put service account JSON, private keys, bearer tokens, refresh tokens, or deployment credentials in `firebase-config.js`.

## Removed `includes/secret.php`

The repository previously contained `includes/secret.php`, which returned an API-key-like string and was not referenced by the application code. That file has been removed to avoid implying that a secret is safely stored in the public repo.

If a future deployment needs server-side secrets, store them outside git using the hosting provider's secret manager or environment variables. Add only a documented template file, for example `includes/secret.example.php`, if the runtime genuinely needs a PHP include in a private deployment.

## Admin authorization

`firestore.rules`'s `isAdmin()` now prefers a Firebase **custom claim** (`admin: true`) with the
legacy hard-coded email kept as a transitional fallback (no-lockout migration). The full migration
procedure + cutover checklist is in `docs/firestore-security-model.md` ("Admin custom-claim
migration"). Any `window.__admin_uid` / client-side email check is **UX gating only** — Firestore
rules are the real enforcement — and is the last duplication to remove once the claim is live.

Before changing admin rules, update `scripts/firestore-rules-test.mjs` (which locks the rule text +
negative cases). Rules deploy only via `.github/workflows/deploy-firestore-rules.yml`.

## Credential rotation procedures

The Firebase web config (`firebase-config.js`) is **public configuration, not a secret** — it does
not need rotation for confidentiality. It should, however, be **restricted at the source** so a
leaked-but-public key can't be abused:

- **Firebase Web API key** — restrict in the Google Cloud Console → *APIs & Services → Credentials*:
  set HTTP-referrer restrictions (the GitHub Pages origin) and limit to the APIs actually used
  (Identity Toolkit, Firestore). To rotate: create a new restricted key, swap it into
  `firebase-config.js`, deploy, then delete the old key. No user impact (it's not an auth secret).
- **Actually-secret material** (service-account JSON, Admin SDK keys, any token used to provision
  custom claims) must **never** be committed. If one is exposed: revoke/rotate it immediately in the
  Cloud Console (delete the key, generate a new one, update the out-of-git secret store), and audit
  access logs. `check:secret-hygiene` scans for committed secret-shaped material as a backstop.
- **Firestore data integrity** is protected by rules + the admin gate, not by config secrecy.

## Contributor checklist

- Do not commit service account keys or private credentials.
- Do not reintroduce `includes/secret.php` with real values.
- Keep public Firebase web config documented as public.
- Add or update Firestore rules tests before changing read/write authorization.
- Rotate any credential that was accidentally committed and is actually secret.
