// Browser entry point, loaded by index.html via <script type="module" src>.
//
// This file exists so index.html carries NO inline JavaScript: an enforcing
// Content-Security-Policy with a strict `script-src` (no 'unsafe-inline') would
// otherwise block both an inline module script and inline `onload=` handlers.
// See security/csp-policy.json and docs/content-security-policy.md.

import { bootstrapApp } from './app.js';

// Activate the deferred (non-render-blocking) display fonts. Each <link> ships with
// media="print" so it doesn't block first paint; flipping media to "all" applies it
// once loaded. This replaces the former inline `onload="this.media='all'"` handlers.
for (const link of (document.querySelectorAll('link[data-lazy-font]') as any)) {
    link.media = 'all';
}

bootstrapApp();
