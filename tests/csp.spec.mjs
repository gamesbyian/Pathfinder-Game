import { test, expect } from './fixtures.mjs';

// Content-Security-Policy regression guard.
//
// The CSP ships as an enforcing <meta http-equiv> (GitHub Pages can't set response headers).
// Because a <meta> CSP is always enforcing (never report-only), a regression — e.g. someone
// re-introduces an inline <script> or on*= handler — would silently break production. This test
// boots the real app under the enforcing policy and asserts zero CSP violations across boot,
// a Web Worker (worker-src), and basic interaction. It runs against the production build (the
// Playwright webServer is `vite preview`), so it guards exactly what ships.
//
// NOTE: the shared fixture aborts all third-party requests (fonts, Firestore/Auth, gapi). Aborting
// an allowed request is NOT a CSP violation, so this won't false-positive — and it keeps the test
// fast/deterministic. The two flows it therefore cannot exercise — Tone's audio graph and the
// Google signInWithPopup auth flow — are smoke-tested post-deploy (see
// docs/content-security-policy.md).
//
// Firebase + Tone are now bundled (not CDN), so bundled Firebase Auth actually initializes at boot.
// It requests Google's connectivity pixel www.google.com/images/cleardot.gif, which the production
// CSP intentionally blocks via `img-src 'self' data:` — a deliberate, app-irrelevant block (sign-in
// does not depend on it; the deployed compat setup blocked the same origin and sign-in worked). That
// one intentional block is filtered below; every other violation still fails the test.
const INTENTIONAL_BLOCKS = [
    { directive: 'img-src', uri: /^https:\/\/www\.google\.com\/images\/cleardot\.gif/ },
];
const isIntentionalBlock = (v) =>
    INTENTIONAL_BLOCKS.some((b) => v.directive === b.directive && b.uri.test(v.blockedURI));

const LOAD_TIMEOUT = 15000;

test.describe('Content-Security-Policy', () => {
    test('enforcing meta CSP is present and produces no violations at boot/worker/play', async ({ page }) => {
        const consoleViolations = [];
        await page.addInitScript(() => {
            window.__cspViolations = [];
            document.addEventListener('securitypolicyviolation', (e) => {
                window.__cspViolations.push({
                    directive: e.violatedDirective,
                    blockedURI: e.blockedURI,
                    line: e.lineNumber,
                    source: e.sourceFile,
                });
            });
        });
        page.on('console', (msg) => {
            const t = msg.text();
            // Ignore the intentionally-blocked Firebase Auth connectivity pixel (see note above).
            if (/cleardot\.gif/.test(t)) return;
            if (/content security policy|refused to (?:load|execute|apply|connect)/i.test(t)) {
                consoleViolations.push(t);
            }
        });

        await page.goto('/');

        // The enforcing meta CSP must be present.
        const csp = await page
            .locator('meta[http-equiv="Content-Security-Policy"]')
            .getAttribute('content');
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("object-src 'none'");

        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

        // Exercise a Web Worker so a CSP that forbade workers would surface a worker-src violation.
        // A blob: worker is build-independent (the bundled solver doesn't ship a stable worker URL)
        // and confirms `worker-src 'self' blob:` is honored — it would be blocked under a stricter
        // policy.
        const workerResult = await page.evaluate(async () => {
            try {
                const src = 'self.onmessage = () => self.postMessage("pong"); self.postMessage("ready");';
                const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
                const w = new Worker(url);
                const got = await new Promise((resolve) => {
                    const timer = setTimeout(() => resolve('timeout'), 1500);
                    w.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
                    w.onerror = () => { clearTimeout(timer); resolve('error'); };
                });
                w.terminate();
                URL.revokeObjectURL(url);
                return got;
            } catch (e) {
                return 'throw: ' + (e && e.message);
            }
        });
        expect(['ready', 'pong']).toContain(workerResult);

        // A bit of interaction to surface any lazily-triggered inline/eval usage.
        await page.locator('#gameCanvas').click({ position: { x: 40, y: 40 } }).catch(() => {});
        await page.waitForTimeout(300);

        const allViolations = await page.evaluate(() => window.__cspViolations || []);
        const pageViolations = allViolations.filter((v) => !isIntentionalBlock(v));
        expect(pageViolations, 'page securitypolicyviolation events: ' + JSON.stringify(pageViolations, null, 2)).toEqual([]);
        expect(consoleViolations, 'console CSP messages:\n' + consoleViolations.join('\n')).toEqual([]);
    });
});
