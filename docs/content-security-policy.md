# Content Security Policy

> **Status:** **ENFORCED in production and verified live** (boot, audio, and Google sign-in all
> confirmed on GitHub Pages, 2026-06-26) via an enforcing
> `<meta http-equiv="Content-Security-Policy">` in [`index.html`](../index.html).
> Source of truth:
> [`security/csp-policy.json`](../security/csp-policy.json), validated by `npm run check:csp` (in the
> default `check` CI group); browser-verified by [`tests/csp.spec.mjs`](../tests/csp.spec.mjs).

## How it's delivered
GitHub Pages can't set response headers, so the policy ships as an enforcing `<meta>` in
`index.html`. `check:csp` fails the build if that meta string doesn't exactly equal the policy
rendered from `security/csp-policy.json`, so the enforced policy can't drift from its source.

**A `<meta>` CSP is always enforcing** (the spec ignores `Content-Security-Policy-Report-Only` in
`<meta>`), so there is no report-only staging stage on this host. To compensate, the same-origin
surface is browser-verified before shipping and two third-party flows are flagged for a post-deploy
smoke test (below).

### What made enforcing safe
Enabling a strict `script-src` (no `'unsafe-inline'`) required removing all inline JS from
`index.html`:
- the bottom inline `<script type="module">` moved to [`modules/boot-entry.js`](../modules/boot-entry.js)
  (loaded via `<script type="module" src>`);
- the three lazy-font `onload="this.media='all'"` handlers became `data-lazy-font` attributes,
  flipped to `media="all"` by `boot-entry.js`.

Inline `style=` attributes remain (a handful in `index.html`), which is why `style-src` keeps
`'unsafe-inline'`. The theme engine writes CSS variables via CSSOM `setProperty`, which CSP does
**not** govern.

### Production verification
`tests/csp.spec.mjs` proves no CSP violations at boot, Web Worker construction (`worker-src`), and
basic interaction (CI-runnable). Firebase + Tone are now **bundled** (Vite npm deps), so bundled
Firebase Auth actually initializes at boot in e2e; it requests Google's connectivity pixel
`www.google.com/images/cleardot.gif`, which `img-src 'self' data:` intentionally blocks — a
deliberate, app-irrelevant block the spec filters out (sign-in does not depend on it). Two flows
still depend on third parties CI can't exercise (Firestore/Auth are network-blocked in the sandbox;
there's no real Google account) and were the historical meta-CSP failure point — **re-verify them
on the live GitHub Pages deploy after this migration** (the prior 2026-06-26 verification was for the
CDN compat setup):
1. **Audio** — Tone.js plays, no `script-src` violation.
2. **Admin sign-in** — the Google `signInWithPopup` flow completes (this drove the
   `script-src https://apis.google.com` addition, which the bundled modular SDK still needs; see the
   `script-src` highlight below). Documented fallback if it ever regresses: `signInWithRedirect`.

Re-run these two after any change to `script-src`/`frame-src`/`connect-src` or the Firebase SDK.

## The policy
Rendered from `security/csp-policy.json` via `npm run check:csp -- --print`:

```
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

Per-directive rationale lives in `security/csp-policy.json`'s `rationale` block. Highlights:
- **`script-src`** — `'self'` (Firebase + Tone are now bundled, so cdnjs/gstatic are gone) +
  `apis.google.com` (the gapi iframe loader Firebase Auth injects for `signInWithPopup` — still
  required with the bundled modular SDK; **omitting it fails sign-in with `auth/internal-error`**,
  the cause of the initial post-enforce breakage).
- **`connect-src`** — Firestore + Firebase Auth token endpoints.
- **`frame-src`** — the `signInWithPopup` popup (`accounts.google.com`) + Firebase auth handler
  (`*.firebaseapp.com`) + the gapi iframe (`apis.google.com`, covered by `*.google.com`).
- **`style-src 'unsafe-inline'`** — a few inline `style=` attributes in `index.html`. (The theme
  engine writes CSS variables via CSSOM `setProperty`, which CSP does **not** govern.)
- **`worker-src 'self' blob:`** — the off-thread solver Web Worker.

## How drift is prevented (`check:csp`)
`scripts/check-csp.mjs` fails the build if:
1. `index.html` references an external `src`/`href` origin no directive covers (same external set
   `check:third-party` allowlists — the two checks stay consistent).
2. A documented `requiredRuntimeOrigins` entry (Firestore/Auth/sign-in — origins the SDK contacts
   that never appear as a URL in markup) isn't covered.
3. An *enforcing* `<meta>` CSP is added to `index.html` but doesn't match the policy file exactly.

So whether or not the CSP is enforced, the policy definition cannot rot relative to the app's
real dependencies.

## Changing the policy
Edit `security/csp-policy.json` (never the rendered copy in `index.html`'s `<meta>`), then run
`npm run check:csp -- --print` and paste the new rendered string into the `<meta>`. `check:csp` will
fail until the two match exactly. Re-run `npm run test:e2e` (includes `csp.spec.mjs`) to confirm the
same-origin surface still produces no violations.

## Future option: response-header delivery
If hosting ever moves to a provider that supports response headers (Netlify/Cloudflare Pages
`_headers`, or a Pages action that sets them), the same rendered policy can be delivered as a
`Content-Security-Policy` header instead — which additionally unlocks a `Content-Security-Policy-Report-Only`
staging stage and header-only directives (`frame-ancestors`, `report-to`) that `<meta>` ignores.
Not pursued now: the owner's decision is to stay on GitHub Pages (codebase-quality-review-plan
Decision 1).
