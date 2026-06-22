# Content Security Policy

> **Status:** policy defined + drift-checked; **not yet enforced in production.** modernization-plan
> §4 Phase 3. Source of truth: [`security/csp-policy.json`](../security/csp-policy.json), validated by
> `npm run check:csp` (in the default `check` CI group).

## Why it isn't enforced yet
Two constraints block simply turning it on:

1. **GitHub Pages can't set response headers.** A real CSP is best delivered as a
   `Content-Security-Policy` response header, which the current static host doesn't support.
2. **A `<meta>` CSP can't be report-only.** The spec ignores `Content-Security-Policy-Report-Only`
   in `<meta>`, so a meta CSP is always *enforcing* — and a prior enforcing meta CSP broke the
   Google `signInWithPopup` flow. Enforcing one safely requires verifying it against a real
   sign-in, which can't be exercised in CI (no real Google account).

So the responsible state is: **define the exact policy, keep it from drifting, and document the
two viable enable paths** — rather than ship an untested enforcing CSP that could silently break
production auth.

## The policy
Rendered from `security/csp-policy.json` via `npm run check:csp -- --print`:

```
default-src 'self';
script-src 'self' https://cdnjs.cloudflare.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com;
frame-src https://accounts.google.com https://*.firebaseapp.com https://*.google.com;
worker-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self'
```

Per-directive rationale lives in `security/csp-policy.json`'s `rationale` block. Highlights:
- **`script-src`** — Tone.js (cdnjs) + Firebase compat SDKs (gstatic); app modules are `'self'`.
- **`connect-src`** — Firestore + Firebase Auth token endpoints.
- **`frame-src`** — the `signInWithPopup` popup (`accounts.google.com`) + Firebase auth handler
  (`*.firebaseapp.com`). This is the directive set most likely responsible for the earlier
  sign-in breakage; verify it first when enabling.
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

## Two ways to enable it (pick one when ready)
1. **Response headers (preferred).** Move static hosting to a provider that supports headers
   (Netlify/Cloudflare Pages `_headers`, or a Pages action that sets them). Ship the rendered
   policy **report-only first** (`Content-Security-Policy-Report-Only`), watch violation reports
   through a full sign-in + play + submit + review flow, then promote to enforcing.
2. **Enforcing `<meta>`.** Paste the rendered string into a
   `<meta http-equiv="Content-Security-Policy" content="…">` in `index.html` (the `check:csp`
   meta-match guard will then keep it in sync). **Only after** manually confirming a real
   `signInWithPopup` succeeds under it — start by loosening/zeroing in on `frame-src`.

Either way: update `security/csp-policy.json` (never the rendered copy) and re-run `check:csp`.
