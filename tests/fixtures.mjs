import { test as base, expect } from 'playwright/test';

// Shared e2e fixture: abort all third-party network requests.
//
// The functional suite tests the app's own UI/logic, not third parties. Firebase and Tone are now
// bundled (Vite npm deps), so the app no longer fetches them from CDNs — but bundled Firebase Auth
// still initializes at boot and contacts Firestore/Auth plus a Google connectivity pixel
// (www.google.com/images/cleardot.gif), and Google Fonts still load from gstatic. None of that is
// needed by a functional test (the app degrades to its offline/local fallback). Aborting these
// makes every `page.goto` resolve the `load` event immediately instead of waiting on unreachable/
// slow third-party resources, and removes third-party uptime/latency as a source of e2e flakiness.
//
// Aborting an ALLOWED request is not a CSP violation. (The Firebase Auth connectivity pixel
// www.google.com/images/cleardot.gif is a separate case: the production CSP intentionally blocks
// it via img-src — that block fires at CSP-check time, before routing, so csp.spec.mjs filters it
// explicitly rather than relying on the abort here.) The visual-baseline spec deliberately does
// NOT use this fixture (it needs real fonts for pixel-accurate snapshots).
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
