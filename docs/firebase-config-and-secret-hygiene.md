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

`firebase-config.js` currently exposes `window.__admin_uid` as public config, and `firestore.rules` currently hard-codes admin authorization separately. Treat this as a modernization target, not a final authorization design.

Before changing admin rules, add Firestore rules tests that lock current behavior. Then consider moving admin authorization to custom claims or a deployment-controlled allowlist.

## Contributor checklist

- Do not commit service account keys or private credentials.
- Do not reintroduce `includes/secret.php` with real values.
- Keep public Firebase web config documented as public.
- Add or update Firestore rules tests before changing read/write authorization.
- Rotate any credential that was accidentally committed and is actually secret.
