# Content Security Policy

Production CSP is enforced through `<meta http-equiv="Content-Security-Policy">` in `index.html`. Source of truth: [`security/csp-policy.json`](../security/csp-policy.json). `npm run check:csp` verifies the rendered meta exactly matches it; `tests/csp.spec.mjs` browser-tests the same-origin surface.

GitHub Pages cannot set response headers, so meta delivery is required. Meta CSP is enforcing only; there is no report-only staging mode on this host.

## Current policy

```text
default-src 'self';
script-src 'self' https://apis.google.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com;
frame-src https://accounts.google.com https://*.firebaseapp.com https://*.google.com;
worker-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self'
```

Directive rationale is maintained in `security/csp-policy.json`. Important current constraints:

- Firebase and Tone are bundled, so normal runtime scripts come from `'self'`.
- `https://apis.google.com` remains required by Firebase `signInWithPopup`.
- `connect-src` covers Firestore/Auth/token endpoints.
- `frame-src` covers Google/Firebase sign-in frames.
- `style-src 'unsafe-inline'` remains because `index.html` has inline `style=` attributes. Theme CSSOM `setProperty` writes are not governed by this directive.
- `worker-src 'self' blob:` permits the solver Web Worker.

Strict `script-src` is possible because `index.html` contains no inline JavaScript; boot logic lives in `modules/boot-entry.ts`.

## Verification

`check:csp` fails if:

1. an external markup origin is not covered;
2. a declared runtime origin is not covered;
3. the enforcing meta differs from the policy file.

`tests/csp.spec.mjs` covers boot, Worker construction, and basic interaction. It intentionally ignores Firebase's blocked `www.google.com/images/cleardot.gif` connectivity pixel because the app does not depend on it.

After changing `script-src`, `frame-src`, `connect-src`, Firebase, or Tone, also smoke-test live GitHub Pages for:

- audio playback;
- admin Google sign-in.

These network/account flows are not fully exercised by CI.

## Changing the policy

Edit `security/csp-policy.json`, then:

```bash
npm run check:csp -- --print
npm run test:e2e
```

Copy the rendered policy into the `index.html` meta. Do not edit the meta as an independent source of truth.

If hosting later supports response headers, the same policy can move to a `Content-Security-Policy` header, enabling report-only staging and header-only directives such as `frame-ancestors`.
