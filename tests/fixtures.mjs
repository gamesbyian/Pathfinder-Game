import { test as base, expect } from 'playwright/test';

// Shared e2e fixture: abort all third-party network requests.
//
// The functional suite tests the app's own UI/logic, not third parties. The app loads Tone.js,
// the Firebase compat SDK, Google Fonts, and the gapi loader from CDNs and contacts Firestore/Auth
// at runtime — none of which a functional test needs (the app degrades to its offline/local
// fallback, which is exactly what these tests already exercised when the CDNs were merely
// network-blocked). Aborting them makes every `page.goto` resolve the `load` event immediately
// instead of waiting on unreachable/slow third-party resources, and removes third-party
// uptime/latency as a source of e2e flakiness.
//
// Aborting a request is NOT a CSP violation, so csp.spec.mjs stays valid. The visual-baseline
// spec deliberately does NOT use this fixture (it needs real fonts for pixel-accurate snapshots).
const THIRD_PARTY = /(?:cdnjs\.cloudflare\.com|gstatic\.com|apis\.google\.com|fonts\.googleapis\.com|googleapis\.com|firebaseio\.com|firebaseapp\.com|accounts\.google\.com)/;

/** Abort all third-party requests on a page. Exported so tests that open extra pages
 *  (e.g. parallel theme collection) get the same fast/deterministic boot as the fixture. */
export async function blockThirdParty(page) {
    await page.route(THIRD_PARTY, (route) => route.abort());
}

export const test = base.extend({
    page: async ({ page }, use) => {
        await blockThirdParty(page);
        await use(page);
    },
});

export { expect };
