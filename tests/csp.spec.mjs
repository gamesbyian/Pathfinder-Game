import { test, expect } from 'playwright/test';

// Content-Security-Policy regression guard.
//
// The CSP ships as an enforcing <meta http-equiv> (GitHub Pages can't set response headers).
// Because a <meta> CSP is always enforcing (never report-only), a regression — e.g. someone
// re-introduces an inline <script> or on*= handler — would silently break production. This test
// boots the real app under the enforcing policy and asserts zero CSP violations across boot,
// the same-origin module Web Worker (worker-src), and basic interaction.
//
// NOTE: Tone.js (cdnjs) and the Firebase compat SDK (gstatic) are allowlisted in script-src but
// may be unreachable in CI sandboxes; a *network* failure is not a CSP violation, so it won't
// false-positive here. The two flows this test cannot exercise — Tone's audio graph and the
// Google signInWithPopup auth flow — must be smoke-tested post-deploy (see
// docs/content-security-policy.md).

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

        // Exercise the same-origin module Web Worker — worker-src 'self' must allow it.
        const workerResult = await page.evaluate(async () => {
            try {
                const w = new Worker(new URL('/modules/solver/worker.js', location.href), { type: 'module' });
                await new Promise((resolve) => setTimeout(resolve, 600));
                w.terminate();
                return 'ok';
            } catch (e) {
                return 'error: ' + (e && e.message);
            }
        });
        expect(workerResult).toBe('ok');

        // A bit of interaction to surface any lazily-triggered inline/eval usage.
        await page.locator('#gameCanvas').click({ position: { x: 40, y: 40 } }).catch(() => {});
        await page.waitForTimeout(300);

        const pageViolations = await page.evaluate(() => window.__cspViolations || []);
        expect(pageViolations, 'page securitypolicyviolation events: ' + JSON.stringify(pageViolations, null, 2)).toEqual([]);
        expect(consoleViolations, 'console CSP messages:\n' + consoleViolations.join('\n')).toEqual([]);
    });
});
